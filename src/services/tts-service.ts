import { KokoroTTS } from 'kokoro-js';
import { env } from '@huggingface/transformers';
import { TTSConfig, TTSResult, TTSOptions } from '../types/tts';
import { KokoroTTSInstance } from '../types/kokoro-tts';
import { isExtensionContextAvailable } from '../utils/extension-utils';
import { ttsDebugger } from '../utils/debug-utils';
import { ttsTimeoutManager } from './tts-timeout-manager';
import { logger } from '../utils/logger';

/**
 * Kokoro TTS Service with WebGPU acceleration and CPU fallback
 */
export class TTSService {
  private tts: KokoroTTSInstance | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Initialize the TTS pipeline with WebGPU detection and CPU fallback
   * Uses promise-based locking to prevent concurrent initialization
   */
  async initialize(config: TTSConfig = {}): Promise<void> {
    // If already initialized, return immediately
    if (this.isInitialized) {
      return;
    }
    
    // If initialization is in progress, wait for it
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    // Start new initialization
    this.initializationPromise = ttsTimeoutManager.withInitializationTimeout(this.doInitialize(config));
    
    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  /**
   * Internal initialization implementation
   */
  private async doInitialize(config: TTSConfig): Promise<void> {
    try {
      logger.info('tts-service', 'Configuring WASM paths for local loading');
      
      // Configure Transformers.js to use local WASM files instead of CDN
      if (env.backends?.onnx?.wasm) {
        if (isExtensionContextAvailable()) {
          env.backends.onnx.wasm.wasmPaths = chrome.runtime.getURL('./');
          // Configure single-threaded execution for Chrome extension compatibility
          env.backends.onnx.wasm.numThreads = 1;
          env.backends.onnx.wasm.proxy = false;
          logger.info('tts-service', 'WASM paths configured for local loading with single-threaded execution');
        } else {
          logger.warn('tts-service', 'Chrome extension context not available, using default WASM paths');
        }
      } else {
        logger.warn('tts-service', 'ONNX WASM backend not available for configuration');
      }
    } catch (envError) {
      logger.error('tts-service', 'Failed to configure WASM environment', envError);
      // Don't throw - attempt to continue with default behavior
    }

    try {
      // Try WebGPU first unless explicitly set to CPU
      const preferredDevice = config.device || 'webgpu';
      
      if (preferredDevice === 'webgpu') {
        logger.info('tts-service', 'Attempting to initialize Kokoro TTS with WebGPU backend');
        
        try {
          this.tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
            device: 'webgpu',
            dtype: 'fp16'
          });
          
          this.isInitialized = true;
          logger.info('tts-service', 'Kokoro TTS initialized successfully on WEBGPU backend');
          return;
        } catch (webgpuError) {
          // Clean up partial initialization
          this.tts = null;
          logger.warn('tts-service', 'WebGPU initialization failed, falling back to CPU', webgpuError);
        }
      }
      
      // Fallback to CPU
      logger.info('tts-service', 'Initializing Kokoro TTS with CPU backend');
      this.tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
        device: 'cpu',
        dtype: 'fp32'
      });
      
      this.isInitialized = true;
      logger.info('tts-service', 'Kokoro TTS initialized successfully on CPU backend');
      
    } catch (error) {
      // Clean up on final failure
      this.tts = null;
      this.isInitialized = false;
      logger.error('tts-service', 'Failed to initialize TTS service', error);
      throw new Error(`TTS initialization failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generate speech from text
   */
  async generateSpeech(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.tts) {
      throw new Error('TTS service not initialized');
    }

    try {
      // Clean and chunk text if necessary
      const cleanText = this.preprocessText(text);
      const chunks = this.chunkText(cleanText, options.maxChunkLength || 500);
      
      if (chunks.length === 1) {
        return await this.generateChunk(chunks[0], options);
      } else {
        return await this.generateMultipleChunks(chunks, options);
      }
    } catch (error) {
      logger.error('tts-service', 'TTS generation error', error);
      throw new Error(`Speech generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generate speech for a single text chunk
   */
  private async generateChunk(text: string, options: TTSOptions): Promise<TTSResult> {
    if (!this.tts) {
      ttsDebugger.log('generateChunk', false, { text: text.substring(0, 50) }, 'TTS service not initialized');
      throw new Error('TTS service not initialized');
    }

    ttsDebugger.log('generateChunk-start', true, { 
      textLength: text.length, 
      options,
      modelReady: !!this.tts 
    });

    try {
      const result = await this.tts.generate(text, {
        speaker_id: options.voice || 0,
        speed: options.speed || 1.0
      });

      ttsDebugger.log('model-generate', true, {
        audioLength: result.audio?.length,
        sampleRate: result.sampling_rate,
        audioType: typeof result.audio,
        hasAudio: !!result.audio
      });

      if (!result.audio || result.audio.length === 0) {
        ttsDebugger.log('audio-validation', false, result, 'Generated audio is empty or null');
        throw new Error('Generated audio is empty');
      }

      const ttsResult = {
        audio: result.audio,
        sampleRate: result.sampling_rate || 24000,
        duration: result.audio.length / (result.sampling_rate || 24000)
      };

      ttsDebugger.log('generateChunk-complete', true, {
        resultAudioLength: ttsResult.audio.length,
        resultSampleRate: ttsResult.sampleRate,
        resultDuration: ttsResult.duration
      });

      return ttsResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      ttsDebugger.log('generateChunk', false, { text: text.substring(0, 50), options }, errorMessage);
      throw new Error(`Speech generation failed: ${errorMessage}`);
    }
  }

  /**
   * Generate and concatenate speech for multiple text chunks
   */
  private async generateMultipleChunks(chunks: string[], options: TTSOptions): Promise<TTSResult> {
    const audioChunks: Float32Array[] = [];
    let totalLength = 0;
    let sampleRate = 24000;

    try {
      for (const chunk of chunks) {
        const result = await this.generateChunk(chunk, options);
        audioChunks.push(result.audio);
        totalLength += result.audio.length;
        sampleRate = result.sampleRate;
      }

      // Concatenate audio chunks
      const concatenatedAudio = new Float32Array(totalLength);
      let offset = 0;
      
      for (const chunk of audioChunks) {
        concatenatedAudio.set(chunk, offset);
        offset += chunk.length;
      }

      return {
        audio: concatenatedAudio,
        sampleRate,
        duration: totalLength / sampleRate
      };
    } finally {
      // Clean up intermediate audio chunks to prevent memory leaks
      audioChunks.length = 0;
    }
  }

  /**
   * Preprocess text for TTS (clean formatting artifacts)
   */
  private preprocessText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
      .replace(/[<>{}[\]\\]/g, '') // Remove problematic markup characters
      .trim();
  }

  /**
   * Split text into manageable chunks
   */
  private chunkText(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) {
      return [text];
    }

    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      const sentenceWithPunctuation = trimmedSentence + '.';
      
      if (currentChunk.length + sentenceWithPunctuation.length <= maxLength) {
        currentChunk += (currentChunk ? ' ' : '') + sentenceWithPunctuation;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = sentenceWithPunctuation;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks.length > 0 ? chunks : [text];
  }

  /**
   * Check if TTS service is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.tts !== null;
  }

  /**
   * Dispose of TTS resources
   */
  dispose(): void {
    this.tts = null;
    this.isInitialized = false;
    this.initializationPromise = null;
  }
}

// Export singleton instance
export const ttsService = new TTSService();

// TypeScript interfaces for KokoroTTS API

/**
 * KokoroTTS instance interface based on actual API usage
 */
export interface KokoroTTSInstance {
  /**
   * Generate speech from text
   */
  generate(text: string, options?: KokoroGenerationOptions): Promise<KokoroTTSResult>;
}

/**
 * Options for TTS generation
 */
export interface KokoroGenerationOptions {
  speaker_id?: number; // 0-9 for available voices
  speed?: number; // 0.5-2.0 for reasonable speed range
}

/**
 * Result from TTS generation
 */
export interface KokoroTTSResult {
  audio: Float32Array;
  sampling_rate?: number;
}

/**
 * Configuration for KokoroTTS initialization
 */
export interface KokoroTTSConfig {
  device?: 'webgpu' | 'cpu';
  dtype?: 'fp16' | 'fp32';
}

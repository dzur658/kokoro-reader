/**
 * Audio utility functions for blob creation and cleanup
 */

import { ttsDebugger } from './debug-utils';
import { logger } from './logger';

/**
 * Validate audio data and log detailed statistics
 * Optimized for large arrays to prevent stack overflow
 */
function validateAudioData(audioData: Float32Array, stage: string): void {
  // Single-pass iteration for optimal performance
  let min = Infinity;
  let max = -Infinity;
  let zeros = 0;
  let clipped = 0;
  
  for (let i = 0; i < audioData.length; i++) {
    const sample = audioData[i];
    
    // Track min/max
    if (sample < min) min = sample;
    if (sample > max) max = sample;
    
    // Count zeros and clipped samples
    if (sample === 0) zeros++;
    if (Math.abs(sample) >= 1.0) clipped++;
  }
  
  logger.debug('audio-validation', `Audio data at ${stage}`, {
    length: audioData.length,
    min,
    max,
    zeros,
    zeroPercent: (zeros / audioData.length * 100).toFixed(2),
    clipped,
    clippedPercent: (clipped / audioData.length * 100).toFixed(2)
  });
}

/**
 * Helper function for writing strings to DataView
 */
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Normalize audio using RMS (Root Mean Square) normalization
 * More gentle than peak normalization, prevents clipping artifacts
 */
function normalizeAudio(audioData: Float32Array, targetRMS: number = 0.15): Float32Array {
  logger.debug('audio-utils', 'Starting RMS normalization', {
    audioLength: audioData.length,
    targetRMS
  });

  validateAudioData(audioData, 'pre-normalization');

  if (!audioData || audioData.length === 0) {
    logger.error('audio-utils', 'Cannot normalize empty audio data');
    throw new Error('Cannot normalize empty audio data');
  }

  // Calculate RMS (Root Mean Square)
  let sumSquares = 0;
  for (let i = 0; i < audioData.length; i++) {
    sumSquares += audioData[i] * audioData[i];
  }
  const rms = Math.sqrt(sumSquares / audioData.length);

  // Handle silent audio
  if (rms === 0) {
    logger.warn('audio-utils', 'Audio is completely silent (RMS = 0)');
    return new Float32Array(audioData);
  }

  // Calculate scale factor based on RMS
  const scaleFactor = targetRMS / rms;
  
  // Apply soft limiting to prevent clipping
  const normalizedAudio = new Float32Array(audioData.length);
  for (let i = 0; i < audioData.length; i++) {
    const scaled = audioData[i] * scaleFactor;
    // Soft clip using tanh for smooth limiting
    normalizedAudio[i] = Math.tanh(scaled * 0.9);
  }

  validateAudioData(normalizedAudio, 'post-normalization');

  logger.debug('audio-utils', 'RMS normalization complete', {
    originalRMS: rms,
    scaleFactor,
    targetRMS
  });

  return normalizedAudio;
}

/**
 * Upsample audio from 24kHz to 48kHz using cubic interpolation
 * Doubles the sample rate by inserting interpolated samples
 */
function upsampleAudio(audioData: Float32Array, inputSampleRate: number, outputSampleRate: number): Float32Array {
  ttsDebugger.log('upsample-audio-start', true, {
    inputLength: audioData.length,
    inputSampleRate,
    outputSampleRate
  });

  validateAudioData(audioData, 'pre-upsampling');

  if (!audioData || audioData.length === 0) {
    ttsDebugger.log('upsample-audio', false, { audioData, inputSampleRate, outputSampleRate }, 'Audio data is empty');
    throw new Error('Cannot upsample empty audio data');
  }

  // Calculate upsampling ratio
  const ratio = outputSampleRate / inputSampleRate;
  const outputLength = Math.floor(audioData.length * ratio);
  const upsampledAudio = new Float32Array(outputLength);

  // Cubic interpolation (Catmull-Rom spline)
  for (let i = 0; i < outputLength; i++) {
    const sourceIndex = i / ratio;
    const index = Math.floor(sourceIndex);
    const fraction = sourceIndex - index;

    // Get 4 surrounding samples for cubic interpolation
    const y0 = audioData[Math.max(0, index - 1)] || 0;
    const y1 = audioData[index] || 0;
    const y2 = audioData[Math.min(index + 1, audioData.length - 1)] || 0;
    const y3 = audioData[Math.min(index + 2, audioData.length - 1)] || 0;

    // Catmull-Rom cubic interpolation
    const a0 = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3;
    const a1 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
    const a2 = -0.5 * y0 + 0.5 * y2;
    const a3 = y1;

    upsampledAudio[i] = a0 * fraction * fraction * fraction +
                        a1 * fraction * fraction +
                        a2 * fraction +
                        a3;
  }

  validateAudioData(upsampledAudio, 'post-upsampling');

  ttsDebugger.log('upsample-audio-complete', true, {
    inputLength: audioData.length,
    outputLength: upsampledAudio.length,
    ratio,
    inputSampleRate,
    outputSampleRate
  });

  return upsampledAudio;
}

/**
 * Create audio blob from Float32Array
 */
export function createAudioBlob(audioData: Float32Array, sampleRate: number): Blob {
  ttsDebugger.log('createAudioBlob-start', true, {
    audioDataLength: audioData?.length,
    sampleRate,
    audioDataType: typeof audioData,
    isFloat32Array: audioData instanceof Float32Array
  });

  if (!audioData || audioData.length === 0) {
    ttsDebugger.log('createAudioBlob', false, { audioData, sampleRate }, 'Audio data is empty or null');
    throw new Error('Cannot create blob from empty audio data');
  }

  if (!sampleRate || sampleRate <= 0) {
    ttsDebugger.log('createAudioBlob', false, { audioData: audioData.length, sampleRate }, 'Invalid sample rate');
    throw new Error('Invalid sample rate for audio blob creation');
  }

  try {
    // Process audio: normalize then upsample
    const normalizedAudio = normalizeAudio(audioData);
    const upsampledAudio = upsampleAudio(normalizedAudio, sampleRate, 48000);
    const processedSampleRate = 48000;

    ttsDebugger.log('audio-processing-complete', true, {
      originalLength: audioData.length,
      processedLength: upsampledAudio.length,
      originalSampleRate: sampleRate,
      processedSampleRate
    });

    // Convert Float32Array to WAV format
    const length = upsampledAudio.length;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    
    // WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, processedSampleRate, true);
    view.setUint32(28, processedSampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, length * 2, true);
    
    // Validate WAV header
    const headerValidation = {
      riffMarker: String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)),
      fileSize: view.getUint32(4, true),
      waveMarker: String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11)),
      fmtMarker: String.fromCharCode(view.getUint8(12), view.getUint8(13), view.getUint8(14), view.getUint8(15)),
      audioFormat: view.getUint16(20, true),
      numChannels: view.getUint16(22, true),
      sampleRate: view.getUint32(24, true),
      bitsPerSample: view.getUint16(34, true)
    };

    logger.debug('audio-utils', 'WAV header validation', headerValidation);

    if (headerValidation.riffMarker !== 'RIFF' || headerValidation.waveMarker !== 'WAVE') {
      logger.error('audio-utils', 'Invalid WAV header markers', headerValidation);
      throw new Error('Invalid WAV header construction');
    }
    
    // Convert float samples to 16-bit PCM with proper clamping
    let offset = 44;
    for (let i = 0; i < length; i++) {
      // Clamp to [-1, 1] range before scaling
      const clampedSample = Math.max(-1, Math.min(1, upsampledAudio[i]));
      // Scale to 16-bit integer range with secure dithering
      const scaled = clampedSample * 0x7FFF;
      
      // Generate cryptographically secure triangular dithering
      const randomArray = new Uint32Array(2);
      crypto.getRandomValues(randomArray);
      const dither = ((randomArray[0] / 0xFFFFFFFF) - (randomArray[1] / 0xFFFFFFFF)) * 0.5;
      
      const dithered = Math.round(scaled + dither);
      // Final clamp to 16-bit range
      const final = Math.max(-0x8000, Math.min(0x7FFF, dithered));
      view.setInt16(offset, final, true);
      offset += 2;
    }

    logger.debug('audio-utils', 'WAV PCM conversion complete', {
      samplesConverted: length,
      blobSize: buffer.byteLength
    });
    
    const blob = new Blob([buffer], { type: 'audio/wav' });
    
    ttsDebugger.log('createAudioBlob-complete', true, {
      blobSize: blob.size,
      blobType: blob.type,
      bufferSize: buffer.byteLength
    });
    
    return blob;
  } catch (error) {
    ttsDebugger.log('createAudioBlob', false, { audioDataLength: audioData?.length, sampleRate }, error instanceof Error ? error.message : 'Blob creation failed');
    throw error;
  }
}

/**
 * Create object URL from audio blob
 */
export function createAudioUrl(audioBlob: Blob): string {
  return URL.createObjectURL(audioBlob);
}

/**
 * Clean up audio object URL to prevent memory leaks
 */
export function cleanupAudioUrl(url: string): void {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

/**
 * Create audio blob and URL in one step
 */
export function createAudioBlobUrl(audioData: Float32Array, sampleRate: number): string {
  const blob = createAudioBlob(audioData, sampleRate);
  return createAudioUrl(blob);
}

// TypeScript interfaces for TTS functionality

/**
 * Audio playback states for TTS player
 */
export type AudioState = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'error';

/**
 * TTS generation options and configuration
 */
export interface TTSOptions {
  voice?: number;
  speed?: number;
  device?: 'webgpu' | 'cpu';
  maxChunkLength?: number;
}

/**
 * TTS service configuration
 */
export interface TTSConfig {
  modelId?: string;
  device?: 'webgpu' | 'cpu';
  maxChunkLength?: number;
}

/**
 * Audio player state interface
 */
export interface AudioPlayerState {
  state: AudioState;
  currentTime?: number;
  duration?: number;
  error?: string;
  isLoading: boolean;
}

/**
 * TTS generation result
 */
export interface TTSResult {
  audio: Float32Array;
  sampleRate: number;
  duration: number;
}

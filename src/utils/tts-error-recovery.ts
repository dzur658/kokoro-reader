/**
 * Error recovery and classification utilities for TTS failures
 */

import { TTSConfig } from '../types/tts';

export enum TTSErrorType {
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  WEBGPU = 'webgpu',
  CONFIGURATION = 'configuration',
  MEMORY = 'memory',
  UNKNOWN = 'unknown'
}

export interface TTSErrorInfo {
  type: TTSErrorType;
  message: string;
  isRetryable: boolean;
  suggestedAction: string;
  fallbackConfig?: TTSConfig;
}

export class TTSErrorRecovery {
  /**
   * Classify TTS error and determine recovery strategy
   */
  static classifyError(error: Error): TTSErrorInfo {
    const message = error.message.toLowerCase();

    // Network-related errors (retryable)
    if (message.includes('network') || message.includes('fetch') || message.includes('download')) {
      return {
        type: TTSErrorType.NETWORK,
        message: 'Network error during model download',
        isRetryable: true,
        suggestedAction: 'Check internet connection and retry',
        fallbackConfig: { device: 'cpu' }
      };
    }

    // Timeout errors (retryable)
    if (message.includes('timeout') || message.includes('timed out')) {
      return {
        type: TTSErrorType.TIMEOUT,
        message: 'TTS initialization timed out',
        isRetryable: true,
        suggestedAction: 'Retry with longer timeout or use CPU mode',
        fallbackConfig: { device: 'cpu' }
      };
    }

    // WebGPU errors (retryable with CPU fallback)
    if (message.includes('webgpu') || message.includes('gpu') || message.includes('device')) {
      return {
        type: TTSErrorType.WEBGPU,
        message: 'WebGPU initialization failed',
        isRetryable: true,
        suggestedAction: 'Falling back to CPU mode',
        fallbackConfig: { device: 'cpu' }
      };
    }

    // Memory errors (retryable)
    if (message.includes('memory') || message.includes('allocation') || message.includes('oom')) {
      return {
        type: TTSErrorType.MEMORY,
        message: 'Insufficient memory for TTS model',
        isRetryable: true,
        suggestedAction: 'Close other tabs and retry',
        fallbackConfig: { device: 'cpu' }
      };
    }

    // Configuration errors (non-retryable)
    if (message.includes('config') || message.includes('manifest') || message.includes('csp')) {
      return {
        type: TTSErrorType.CONFIGURATION,
        message: 'TTS configuration error',
        isRetryable: false,
        suggestedAction: 'Check extension configuration'
      };
    }

    // Unknown errors (retryable once)
    return {
      type: TTSErrorType.UNKNOWN,
      message: error.message || 'Unknown TTS error',
      isRetryable: true,
      suggestedAction: 'Retry once, then check diagnostics',
      fallbackConfig: { device: 'cpu' }
    };
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(errorInfo: TTSErrorInfo): string {
    switch (errorInfo.type) {
      case TTSErrorType.NETWORK:
        return 'Unable to download TTS model. Please check your internet connection.';
      case TTSErrorType.TIMEOUT:
        return 'TTS loading is taking longer than expected. This may be due to slow internet.';
      case TTSErrorType.WEBGPU:
        return 'WebGPU acceleration failed. Switching to CPU mode.';
      case TTSErrorType.MEMORY:
        return 'Not enough memory to load TTS model. Try closing other tabs.';
      case TTSErrorType.CONFIGURATION:
        return 'TTS configuration error. Please reinstall the extension.';
      default:
        return 'TTS initialization failed. Please try again.';
    }
  }

  /**
   * Determine if retry should be attempted
   */
  static shouldRetry(errorInfo: TTSErrorInfo, retryCount: number): boolean {
    if (!errorInfo.isRetryable) {
      return false;
    }

    // Limit retries based on error type
    switch (errorInfo.type) {
      case TTSErrorType.NETWORK:
      case TTSErrorType.TIMEOUT:
        return retryCount < 2;
      case TTSErrorType.WEBGPU:
      case TTSErrorType.MEMORY:
        return retryCount < 1;
      default:
        return retryCount < 1;
    }
  }
}

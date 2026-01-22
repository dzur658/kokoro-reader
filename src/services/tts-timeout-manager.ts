/**
 * Timeout management for TTS operations
 */

export interface TimeoutConfig {
  initializationTimeout: number;
  operationTimeout: number;
}

export class TTSTimeoutManager {
  private static readonly DEFAULT_CONFIG: TimeoutConfig = {
    initializationTimeout: 60000, // 60 seconds for model download
    operationTimeout: 10000       // 10 seconds for operations
  };

  private config: TimeoutConfig;
  private activeTimeouts = new Set<NodeJS.Timeout>();

  constructor(config: Partial<TimeoutConfig> = {}) {
    this.config = { ...TTSTimeoutManager.DEFAULT_CONFIG, ...config };
  }

  /**
   * Wrap a promise with timeout handling
   */
  async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation: string
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.activeTimeouts.add(timeoutId);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      return result;
    } finally {
      if (timeoutId!) {
        clearTimeout(timeoutId);
        this.activeTimeouts.delete(timeoutId);
      }
    }
  }

  /**
   * Wrap TTS initialization with timeout
   */
  async withInitializationTimeout<T>(promise: Promise<T>): Promise<T> {
    return this.withTimeout(
      promise,
      this.config.initializationTimeout,
      'TTS initialization'
    );
  }

  /**
   * Wrap TTS operation with timeout
   */
  async withOperationTimeout<T>(promise: Promise<T>): Promise<T> {
    return this.withTimeout(
      promise,
      this.config.operationTimeout,
      'TTS operation'
    );
  }

  /**
   * Clean up all active timeouts
   */
  cleanup(): void {
    for (const timeoutId of this.activeTimeouts) {
      clearTimeout(timeoutId);
    }
    this.activeTimeouts.clear();
  }
}

// Export singleton instance
export const ttsTimeoutManager = new TTSTimeoutManager();

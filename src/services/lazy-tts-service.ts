import { TTSConfig, TTSResult, TTSOptions } from '../types/tts';
import { TTSService } from './tts-service';
import { ttsTimeoutManager } from './tts-timeout-manager';
import { logger } from '../utils/logger';

/**
 * Lazy-loaded TTS service wrapper
 * Defers heavy TTS initialization until actually needed
 */
class LazyTTSService {
  private ttsService: TTSService | null = null;
  private isLoading = false;
  private isLoaded = false;
  private loadError: string | null = null;

  /**
   * Lazy load the TTS service
   */
  private async loadTTSService() {
    if (this.isLoaded || this.isLoading) {
      return this.ttsService;
    }

    this.isLoading = true;
    this.loadError = null;

    try {
      // Static import to avoid CSP issues
      const { ttsService } = await import('./tts-service');
      this.ttsService = ttsService;
      this.isLoaded = true;
      logger.info('lazy-tts-service', 'TTS service loaded successfully');
      return this.ttsService;
    } catch (error) {
      logger.error('lazy-tts-service', 'Failed to load TTS service', error);
      this.loadError = error instanceof Error ? error.message : 'TTS loading failed';
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Initialize TTS with lazy loading
   */
  async initialize(config: TTSConfig = {}): Promise<void> {
    const service = await this.loadTTSService();
    if (!service) {
      throw new Error('Failed to load TTS service');
    }
    return ttsTimeoutManager.withInitializationTimeout(service.initialize(config));
  }

  /**
   * Generate speech with lazy loading
   */
  async generateSpeech(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    const service = await this.loadTTSService();
    if (!service) {
      throw new Error('Failed to load TTS service');
    }
    return service.generateSpeech(text, options);
  }

  /**
   * Check if TTS service is ready
   */
  isReady(): boolean {
    return this.isLoaded && (this.ttsService?.isReady() ?? false);
  }

  /**
   * Check loading state
   */
  getLoadingState() {
    return {
      isLoading: this.isLoading,
      isLoaded: this.isLoaded,
      error: this.loadError
    };
  }

  /**
   * Dispose of TTS resources
   */
  dispose(): void {
    if (this.ttsService) {
      this.ttsService.dispose();
    }
    this.ttsService = null;
    this.isLoaded = false;
    this.isLoading = false;
    this.loadError = null;
  }
}

// Export singleton instance
export const lazyTTSService = new LazyTTSService();

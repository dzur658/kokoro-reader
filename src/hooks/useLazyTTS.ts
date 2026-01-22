import { useState, useEffect, useCallback } from 'react';
import { lazyTTSService } from '../services/lazy-tts-service';
import { TTSConfig } from '../types/tts';
import { logger } from '../utils/logger';

export interface LazyTTSState {
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  isReady: boolean;
}

/**
 * Hook for managing lazy TTS loading
 */
export const useLazyTTS = (config: TTSConfig = {}) => {
  const [state, setState] = useState<LazyTTSState>({
    isLoading: false,
    isLoaded: false,
    error: null,
    isReady: false
  });

  /**
   * Initialize TTS service
   */
  const initializeTTS = useCallback(async () => {
    // Use functional state update to check current state
    let shouldInitialize = false;
    setState(prev => {
      if (prev.isLoading || prev.isLoaded) {
        return prev;
      }
      shouldInitialize = true;
      return { ...prev, isLoading: true, error: null };
    });

    if (!shouldInitialize) {
      return;
    }

    try {
      await lazyTTSService.initialize(config);
      // Always sync with service state after initialization
      const serviceState = lazyTTSService.getLoadingState();
      setState(prev => ({
        ...prev,
        isLoading: false,
        isLoaded: serviceState.isLoaded,
        error: serviceState.error,
        isReady: lazyTTSService.isReady()
      }));
    } catch (error) {
      logger.error('lazy-tts', 'TTS initialization error', error);
      const errorMessage = error instanceof Error ? error.message : 'TTS initialization failed';
      // Sync with service state on error
      const serviceState = lazyTTSService.getLoadingState();
      setState(prev => ({
        ...prev,
        isLoading: false,
        isLoaded: serviceState.isLoaded,
        error: serviceState.error || errorMessage,
        isReady: false
      }));
    }
  }, [config]);

  /**
   * Get current loading state from service
   */
  const refreshState = useCallback(() => {
    const serviceState = lazyTTSService.getLoadingState();
    setState(prev => ({
      ...prev,
      isLoading: serviceState.isLoading,
      isLoaded: serviceState.isLoaded,
      error: serviceState.error,
      isReady: lazyTTSService.isReady()
    }));
  }, []);

  // Add polling state and configuration
  const POLLING_INTERVAL = 1000; // 1 second polling
  const INITIALIZATION_TIMEOUT = 60000; // 60 second timeout

  // Replace the current useEffect with active polling
  useEffect(() => {
    let ignore = false;
    let timeoutId: NodeJS.Timeout | null = null;
    let intervalId: NodeJS.Timeout | null = null;

    const pollServiceState = () => {
      if (ignore) return;
      
      const serviceState = lazyTTSService.getLoadingState();
      const isServiceReady = lazyTTSService.isReady();
      
      setState(prev => {
        // Only update if state actually changed to prevent unnecessary re-renders
        const hasChanged = prev.isLoading !== serviceState.isLoading || 
                          prev.isLoaded !== serviceState.isLoaded || 
                          prev.error !== serviceState.error || 
                          prev.isReady !== isServiceReady;
        
        if (!hasChanged) {
          return prev;
        }
        
        // Log only actual state changes
        logger.debug('lazy-tts', 'Service state changed', {
          from: { isLoading: prev.isLoading, isLoaded: prev.isLoaded, error: prev.error, isReady: prev.isReady },
          to: { isLoading: serviceState.isLoading, isLoaded: serviceState.isLoaded, error: serviceState.error, isReady: isServiceReady }
        });
        
        return {
          ...prev,
          isLoading: serviceState.isLoading,
          isLoaded: serviceState.isLoaded,
          error: serviceState.error,
          isReady: isServiceReady
        };
      });
    };

    // Initial state check
    pollServiceState();

    // Set up polling interval
    intervalId = setInterval(pollServiceState, POLLING_INTERVAL);

    // Set up timeout for initialization
    timeoutId = setTimeout(() => {
      if (ignore) return;
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'TTS initialization timeout - please retry'
      }));
    }, INITIALIZATION_TIMEOUT);

    return () => {
      ignore = true;
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return {
    ...state,
    initializeTTS,
    refreshState,
    service: lazyTTSService
  };
};

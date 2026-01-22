import { useState, useEffect, useCallback, useRef } from 'react';
import { lazyTTSService } from '../services/lazy-tts-service';
import { logger } from '../utils/logger';

export interface TTSHealthStatus {
  isHealthy: boolean;
  isLoading: boolean;
  lastCheck: number;
  error: string | null;
}

/**
 * Hook for monitoring TTS service health
 */
export const useTTSHealthCheck = (checkInterval: number = 5000) => {
  const [healthStatus, setHealthStatus] = useState<TTSHealthStatus>({
    isHealthy: false,
    isLoading: false,
    lastCheck: 0,
    error: null
  });
  
  const prevHealthy = useRef<boolean>(false);

  /**
   * Check TTS service health
   */
  const checkHealth = useCallback(() => {
    try {
      const serviceState = lazyTTSService.getLoadingState();
      const now = Date.now();
      const isHealthy = serviceState.isLoaded && lazyTTSService.isReady();
      
      // Only log if health status changed
      if (isHealthy !== prevHealthy.current) {
        logger.info('tts-health', `Health status changed to ${isHealthy ? 'healthy' : 'unhealthy'}`);
        prevHealthy.current = isHealthy;
      }
      
      setHealthStatus(prev => ({
        ...prev,
        isHealthy,
        isLoading: serviceState.isLoading,
        lastCheck: now,
        error: serviceState.error
      }));
    } catch (error) {
      logger.error('tts-health', 'Health check failed', error);
    }
  }, []);

  /**
   * Force health check
   */
  const forceHealthCheck = useCallback(() => {
    checkHealth();
  }, [checkHealth]);

  // Initial health check and periodic monitoring
  useEffect(() => {
    // Initial check
    checkHealth();

    // Set up periodic health monitoring
    const intervalId = setInterval(checkHealth, checkInterval);

    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [checkHealth, checkInterval]);

  return {
    healthStatus,
    forceHealthCheck,
    isHealthy: healthStatus.isHealthy,
    isLoading: healthStatus.isLoading,
    error: healthStatus.error
  };
};

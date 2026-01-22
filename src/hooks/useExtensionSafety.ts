import { useState, useEffect, useCallback, useRef } from 'react';
import { isExtensionContextAvailable, checkConnectionHealth } from '../utils/extension-utils';
import { logger } from '../utils/logger';

/**
 * Hook for safe Chrome extension operations with connection health monitoring
 */
export const useExtensionSafety = (healthCheckInterval: number = 5000) => {
  const [isExtensionHealthy, setIsExtensionHealthy] = useState(false);
  
  // Use refs for synchronous access without triggering re-renders
  const isExtensionHealthyRef = useRef(false);
  const lastHealthCheckRef = useRef(0);

  /**
   * Check extension health with caching
   */
  const checkExtensionHealth = useCallback(() => {
    const now = Date.now();
    // Cache health check for 1 second to avoid excessive checks
    // Use ref values for accurate cache check
    if (now - lastHealthCheckRef.current < 1000) {
      return isExtensionHealthyRef.current;
    }

    const healthy = checkConnectionHealth();
    
    // Update both ref (for synchronous access) and state (for UI updates)
    isExtensionHealthyRef.current = healthy;
    setIsExtensionHealthy(healthy);
    lastHealthCheckRef.current = now;
    
    return healthy;
  }, []); // No dependencies needed - refs are always current

  /**
   * Safe wrapper for extension operations
   */
  const safeExtensionOperation = useCallback(<T>(
    operation: () => T,
    fallback?: T,
    skipHealthCheck = false
  ): T | undefined => {
    try {
      if (!skipHealthCheck && !checkExtensionHealth()) {
        logger.warn('extension-safety', 'Extension operation skipped: unhealthy connection');
        return fallback;
      }
      
      return operation();
    } catch (error) {
      logger.error('extension-safety', 'Extension operation failed', error);
      isExtensionHealthyRef.current = false;
      setIsExtensionHealthy(false);
      return fallback;
    }
  }, [checkExtensionHealth]);

  /**
   * Initialize extension health monitoring
   */
  useEffect(() => {
    // Initial health check
    const initialHealth = isExtensionContextAvailable();
    isExtensionHealthyRef.current = initialHealth;
    setIsExtensionHealthy(initialHealth);
    lastHealthCheckRef.current = Date.now();

    // Set up periodic health monitoring with configurable interval
    const healthCheckIntervalId = setInterval(() => {
      checkExtensionHealth();
    }, healthCheckInterval);

    // Cleanup on unmount
    return () => {
      try {
        clearInterval(healthCheckIntervalId);
      } catch (error) {
        logger.error('extension-safety', 'Extension safety cleanup error', error);
      }
    };
  }, [checkExtensionHealth, healthCheckInterval]);

  /**
   * Handle extension context loss gracefully
   */
  const handleExtensionContextLoss = useCallback((callback?: () => void) => {
    logger.warn('extension-safety', 'Extension context lost, switching to degraded mode');
    isExtensionHealthyRef.current = false;
    setIsExtensionHealthy(false);
    
    if (callback) {
      try {
        callback();
      } catch (error) {
        logger.error('extension-safety', 'Context loss callback error', error);
      }
    }
  }, []);

  return {
    isExtensionHealthy,
    checkExtensionHealth,
    safeExtensionOperation,
    handleExtensionContextLoss
  };
};

/**
 * Chrome extension message passing utilities with proper error handling
 */
import { logger } from './logger';

/**
 * Check if Chrome extension context is available
 */
export function isExtensionContextAvailable(): boolean {
  try {
    return !!(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
  } catch (error) {
    return false;
  }
}

/**
 * Safe wrapper for Chrome runtime operations
 */
export function safeRuntimeOperation<T>(
  operation: () => T,
  fallback?: T
): T | undefined {
  try {
    if (!isExtensionContextAvailable()) {
      logger.warn('extension-utils', 'Chrome extension context not available');
      return fallback;
    }
    return operation();
  } catch (error) {
    logger.error('extension-utils', 'Chrome runtime operation failed', error);
    return fallback;
  }
}

/**
 * Safe message passing with proper error handling
 */
export function safeMessagePassing(
  message: any,
  responseCallback?: (response: any) => void
): void {
  try {
    if (!isExtensionContextAvailable()) {
      logger.warn('extension-utils', 'Cannot send message: Extension context not available');
      if (responseCallback) {
        responseCallback({ success: false, error: 'Extension context unavailable' });
      }
      return;
    }

    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        logger.error('extension-utils', 'Runtime error', chrome.runtime.lastError.message);
        if (responseCallback) {
          responseCallback({ 
            success: false, 
            error: chrome.runtime.lastError.message 
          });
        }
        return;
      }
      
      if (responseCallback) {
        responseCallback(response);
      }
    });
  } catch (error) {
    logger.error('extension-utils', 'Message passing failed', error);
    if (responseCallback) {
      responseCallback({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
}

/**
 * Safe tab operations with error handling
 */
export function safeTabOperation(
  operation: () => void,
  errorCallback?: (error: string) => void
): void {
  try {
    if (!isExtensionContextAvailable()) {
      const error = 'Extension context not available for tab operation';
      logger.warn('extension-utils', error);
      if (errorCallback) {
        errorCallback(error);
      }
      return;
    }
    
    operation();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Tab operation failed';
    logger.error('extension-utils', 'Tab operation error', errorMessage);
    if (errorCallback) {
      errorCallback(errorMessage);
    }
  }
}

/**
 * Check connection health before operations
 */
export function checkConnectionHealth(): boolean {
  try {
    if (!isExtensionContextAvailable()) {
      return false;
    }
    
    // Test if we can access chrome.runtime properties
    const testId = chrome.runtime.id;
    return !!testId;
  } catch (error) {
    logger.error('extension-utils', 'Connection health check failed', error);
    return false;
  }
}

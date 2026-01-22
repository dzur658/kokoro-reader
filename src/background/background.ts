// Background service worker for Kokoro Reader extension
import { logger } from '../utils/logger';

// Track active connections to prevent orphaned message handlers
const activeConnections = new Set<chrome.runtime.Port>();

chrome.runtime.onInstalled.addListener(() => {
  logger.info('extension', 'Kokoro Reader extension installed');
});

// Handle long-lived connections for better message passing reliability
chrome.runtime.onConnect.addListener((port) => {
  logger.debug('extension', 'New connection established', { portName: port.name });
  activeConnections.add(port);
  
  port.onDisconnect.addListener(() => {
    logger.debug('extension', 'Connection disconnected', { portName: port.name });
    activeConnections.delete(port);
    
    // Clean up any orphaned listeners
    if (chrome.runtime.lastError) {
      logger.warn('extension', 'Connection cleanup warning', chrome.runtime.lastError.message);
    }
  });
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Validate sender to prevent unauthorized messages
  if (!sender.tab && !sender.url?.startsWith('chrome-extension://')) {
    logger.warn('extension', 'Unauthorized message sender', sender);
    sendResponse({ success: false, error: 'Unauthorized sender' });
    return false;
  }

  if (request.action === 'extractContent') {
    try {
      // Create new tab with extracted content
      chrome.tabs.create({
        url: chrome.runtime.getURL('src/display/index.html')
      }, (tab) => {
        if (chrome.runtime.lastError) {
          logger.error('extension', 'Failed to create tab', chrome.runtime.lastError.message);
          sendResponse({ 
            success: false, 
            error: `Failed to create tab: ${chrome.runtime.lastError.message}` 
          });
          return;
        }
        
        if (!tab?.id) {
          logger.error('extension', 'Created tab has no ID');
          sendResponse({ 
            success: false, 
            error: 'Failed to create tab: No tab ID' 
          });
          return;
        }
        
        // Store content for display page
        chrome.storage.local.set({
          extractedContent: request.content
        }, () => {
          if (chrome.runtime.lastError) {
            logger.error('extension', 'Failed to store content', chrome.runtime.lastError.message);
            sendResponse({ 
              success: false, 
              error: `Failed to store content: ${chrome.runtime.lastError.message}` 
            });
            return;
          }
          
          sendResponse({ success: true, tabId: tab.id });
        });
      });
    } catch (error) {
      logger.error('extension', 'Background script error', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      });
    }
    
    return true; // Keep message channel open for async response
  }
  
  // Handle unknown actions gracefully
  logger.warn('extension', 'Unknown action received', request.action);
  sendResponse({ success: false, error: 'Unknown action' });
  return false;
});

// Cleanup on extension shutdown
chrome.runtime.onSuspend?.addListener(() => {
  logger.info('extension', 'Extension suspending, cleaning up connections');
  activeConnections.clear();
});

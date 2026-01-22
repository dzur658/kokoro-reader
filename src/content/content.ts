// Content script for Kokoro Reader - extracts readable content using @mozilla/readability
import { Readability } from '@mozilla/readability';
import { ExtractedContent } from '../types/content';
import { safeMessagePassing } from '../utils/extension-utils';

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'extractContent') {
    try {
      // Clone document to avoid modifying the original
      const documentClone = document.cloneNode(true) as Document;
      
      // Create Readability instance and parse content
      const reader = new Readability(documentClone, {
        charThreshold: 500,
        classesToPreserve: ['highlight', 'code'],
        keepClasses: false
      });
      
      const article = reader.parse();
      
      if (article) {
        const extractedContent: ExtractedContent = {
          title: article.title || document.title,
          content: article.content,
          textContent: article.textContent,
          length: article.length,
          excerpt: article.excerpt,
          byline: article.byline,
          siteName: article.siteName || window.location.hostname,
          url: window.location.href
        };
        
        // Send extracted content to background script using safe message passing
        safeMessagePassing({
          action: 'extractContent',
          content: extractedContent
        }, (response) => {
          // Clean up document clone to prevent memory leaks
          try {
            // Clear references to help garbage collection
            documentClone.documentElement.innerHTML = '';
          } catch (cleanupError) {
            console.warn('Cleanup warning:', cleanupError);
          }
          
          if (chrome.runtime.lastError) {
            console.error('Runtime error:', chrome.runtime.lastError.message);
            sendResponse({ 
              success: false, 
              error: chrome.runtime.lastError.message 
            });
            return;
          }
          
          if (response && response.success) {
            sendResponse({ success: true });
          } else {
            const errorMsg = response?.error || 'Background processing failed';
            sendResponse({ success: false, error: errorMsg });
          }
        });
      } else {
        sendResponse({ success: false, error: 'Could not extract readable content' });
      }
    } catch (error) {
      console.error('Content extraction error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown extraction error';
      sendResponse({ success: false, error: errorMessage });
    }
    
    return true; // Keep message channel open for async response
  }
});

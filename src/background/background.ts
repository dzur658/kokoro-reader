// Background service worker for Kokoro Reader extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Kokoro Reader extension installed');
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'extractContent') {
    try {
      // Create new tab with extracted content
      chrome.tabs.create({
        url: chrome.runtime.getURL('src/display/display.html')
      }, (tab) => {
        if (chrome.runtime.lastError) {
          console.error('Failed to create tab:', chrome.runtime.lastError.message);
          sendResponse({ 
            success: false, 
            error: `Failed to create tab: ${chrome.runtime.lastError.message}` 
          });
          return;
        }
        
        if (!tab?.id) {
          console.error('Created tab has no ID');
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
            console.error('Failed to store content:', chrome.runtime.lastError.message);
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
      console.error('Background script error:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      });
    }
    
    return true; // Keep message channel open for async response
  }
});

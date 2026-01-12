// Popup functionality for Kokoro Reader
document.addEventListener('DOMContentLoaded', () => {
  const extractBtn = document.getElementById('extractBtn') as HTMLButtonElement;
  const status = document.getElementById('status') as HTMLElement;
  
  if (!extractBtn || !status) {
    console.error('Required popup elements not found');
    return;
  }
  
  const POPUP_CLOSE_DELAY = 1000;
  
  extractBtn.addEventListener('click', async () => {
    try {
      extractBtn.disabled = true;
      status.textContent = 'Extracting content...';
      
      // Get current active tab with validation
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const [tab] = tabs;
      
      if (!tab?.id) {
        throw new Error('No active tab found');
      }
      
      // Check for chrome:// or other restricted URLs
      if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
        throw new Error('Cannot extract content from this page');
      }
      
      // Send message to content script to extract content
      const response = await chrome.tabs.sendMessage(tab.id, { 
        action: 'extractContent' 
      });
      
      if (chrome.runtime.lastError) {
        throw new Error(chrome.runtime.lastError.message);
      }
      
      if (response && response.success) {
        status.textContent = 'Content extracted! Opening in new tab...';
        setTimeout(() => {
          window.close();
        }, POPUP_CLOSE_DELAY);
      } else {
        const errorMsg = response?.error || 'Failed to extract content';
        status.textContent = errorMsg;
        extractBtn.disabled = false;
      }
    } catch (error) {
      console.error('Error extracting content:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      status.textContent = `Error: ${errorMessage}`;
      extractBtn.disabled = false;
    }
  });
});

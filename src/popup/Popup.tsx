import { useState, useEffect } from 'react';
import './Popup.css';

// Delay before closing popup to allow user to see success message
const POPUP_CLOSE_DELAY = 1000;

export const Popup: React.FC = () => {
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleExtractClick = async () => {
    try {
      setIsLoading(true);
      setStatus('Extracting content...');

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

      if (response && response.success) {
        setStatus('Content extracted! Opening in new tab...');
        const id = setTimeout(() => {
          window.close();
        }, POPUP_CLOSE_DELAY);
        setTimeoutId(id);
      } else {
        const errorMsg = response?.error || 'Failed to extract content';
        setStatus(errorMsg);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error extracting content:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setStatus(`Error: ${errorMessage}`);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return (
    <div className="popup-container">
      <div className="header">
        <div className="logo">Kokoro Reader</div>
        <div className="subtitle">Extract readable content</div>
      </div>

      <button
        className="extract-btn"
        onClick={handleExtractClick}
        disabled={isLoading}
      >
        Extract Content
      </button>

      {status && <div className="status">{status}</div>}
    </div>
  );
};

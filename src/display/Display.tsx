import { useState, useEffect } from 'react';
import { sanitizeHtml, escapeHtml } from '../utils/sanitizer';
import { ExtractedContent } from '../types/content';
import './Display.css';

// Delay before cleaning up storage to handle page refresh scenarios
const STORAGE_CLEANUP_DELAY = 5000;

export const Display: React.FC = () => {
  const [content, setContent] = useState<ExtractedContent | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const loadContent = async () => {
      try {
        const result = await chrome.storage.local.get(['extractedContent']);
        const extractedContent: ExtractedContent = result.extractedContent;

        if (!extractedContent) {
          throw new Error('No content found');
        }

        setContent(extractedContent);
        setLoading(false);

        // Update page title
        document.title = `Kokoro Reader - ${extractedContent.title || 'Extracted Content'}`;

        // Delayed cleanup to handle page refresh scenarios
        timeoutId = setTimeout(() => {
          chrome.storage.local.remove(['extractedContent']).catch(console.error);
        }, STORAGE_CLEANUP_DELAY);
      } catch (err) {
        console.error('Error loading content:', err);
        setError((err as Error).message);
        setLoading(false);
      }
    };

    loadContent();

    // Cleanup function to prevent memory leaks
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="container">
        <div className="header">
          <div className="logo">Kokoro Reader</div>
          <div className="meta">Extracted Content</div>
        </div>
        <div className="loading">Loading extracted content...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="header">
          <div className="logo">Kokoro Reader</div>
          <div className="meta">Extracted Content</div>
        </div>
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  if (!content) {
    return null;
  }

  const safeUrl = escapeHtml(content.url || '');
  const safeSiteName = escapeHtml(content.siteName || 'Unknown');
  const isValidUrl = (() => {
    try {
      const url = new URL(content.url || '');
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  })();

  return (
    <div className="container">
      <div className="header">
        <div className="logo">Kokoro Reader</div>
        <div className="meta">Extracted Content</div>
      </div>

      <div className="content-container">
        {/* All text content below is automatically escaped by React, preventing XSS */}
        <h1 className="title">{content.title || 'Untitled'}</h1>

        {content.byline && (
          <div className="byline">By {content.byline}</div>
        )}

        {content.excerpt && (
          <div className="excerpt">{content.excerpt}</div>
        )}

        <div
          className="content"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(content.content || '') }}
        />

        <div className="stats">
          <div className="stats-title">Article Statistics:</div>
          <div className="stats-item">Length: {content.length || 0} characters</div>
          <div className="stats-item">Source: {safeSiteName}</div>
          <div className="stats-item">
            URL: {isValidUrl ? (
              // URL is safe to use in href after http/https validation - only validated schemes allowed
              <a href={content.url} target="_blank" rel="noopener noreferrer">
                {safeUrl}
              </a>
            ) : (
              <span>{safeUrl}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

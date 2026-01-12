import { sanitizeHtml, escapeHtml } from '../utils/sanitizer';

interface ExtractedContent {
  title?: string;
  content?: string;
  textContent?: string;
  length?: number;
  excerpt?: string;
  byline?: string;
  siteName?: string;
  url?: string;
}

// Display page functionality for showing extracted content
document.addEventListener('DOMContentLoaded', async () => {
  const loading = document.getElementById('loading') as HTMLElement;
  const error = document.getElementById('error') as HTMLElement;
  const contentContainer = document.getElementById('content-container') as HTMLElement;
  
  try {
    // Get extracted content from storage
    const result = await chrome.storage.local.get(['extractedContent']);
    const content: ExtractedContent = result.extractedContent;
    
    if (!content) {
      throw new Error('No content found');
    }
    
    // Hide loading, show content
    loading.style.display = 'none';
    contentContainer.style.display = 'block';
    
    // Populate content with safe text insertion
    const titleElement = document.getElementById('article-title') as HTMLElement;
    titleElement.textContent = content.title || 'Untitled';
    
    const bylineElement = document.getElementById('article-byline') as HTMLElement;
    if (content.byline) {
      bylineElement.textContent = `By ${content.byline}`;
    } else {
      bylineElement.style.display = 'none';
    }
    
    const excerptElement = document.getElementById('article-excerpt') as HTMLElement;
    if (content.excerpt) {
      excerptElement.textContent = content.excerpt;
    } else {
      excerptElement.style.display = 'none';
    }
    
    // Set main content with sanitized HTML
    const contentElement = document.getElementById('article-content') as HTMLElement;
    contentElement.innerHTML = sanitizeHtml(content.content || '');
    
    // Show stats with escaped user data
    const stats = document.getElementById('article-stats') as HTMLElement;
    const safeUrl = escapeHtml(content.url || '');
    const safeSiteName = escapeHtml(content.siteName || 'Unknown');
    
    stats.innerHTML = `
      <strong>Article Statistics:</strong><br>
      Length: ${content.length || 0} characters<br>
      Source: ${safeSiteName}<br>
      URL: <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>
    `;
    
    // Update page title with safe text
    document.title = `Kokoro Reader - ${content.title || 'Extracted Content'}`;
    
    // Delayed cleanup to handle page refresh scenarios
    setTimeout(() => {
      chrome.storage.local.remove(['extractedContent']).catch(console.error);
    }, 5000);
    
  } catch (err) {
    console.error('Error loading content:', err);
    loading.style.display = 'none';
    error.style.display = 'block';
    
    const errorElement = error as HTMLElement;
    errorElement.textContent = `Error: ${(err as Error).message}`;
  }
});

// Shared TypeScript interfaces for extracted content

/**
 * Extracted content from web pages using Mozilla Readability.
 * All properties are optional to handle cases where Readability
 * cannot extract certain fields from the source page.
 */
export interface ExtractedContent {
  title?: string;
  content?: string;
  textContent?: string;
  length?: number;
  excerpt?: string;
  byline?: string;
  siteName?: string;
  url?: string;
}

import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content for safe display in the extension
 * Configured with restrictive settings for readable content
 */
export function sanitizeHtml(unsafeHtml: string): string {
  return DOMPurify.sanitize(unsafeHtml, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'b', 'i', 'u', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'a', 'img', 'figure', 'figcaption'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title'],
    ALLOWED_URI_REGEXP: /^https?:\/\//,
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false
  });
}

/**
 * Escapes HTML entities for safe text content insertion
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitizes text content for safe display (removes HTML entirely)
 */
export function sanitizeText(unsafeText: string): string {
  return DOMPurify.sanitize(unsafeText, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
}

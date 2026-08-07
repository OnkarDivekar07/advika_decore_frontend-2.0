// src/utils/sanitizeHtml.js
//
// Any admin-authored rich text (product descriptions, etc.) that gets
// rendered via dangerouslySetInnerHTML is a stored-XSS vector — a
// malicious <script>/onerror payload saved once in the backend would run
// in every visitor's browser. That matters more than usual here because
// the session token lives in localStorage (readable by any script that
// runs on the page), so an XSS hole is also an account-takeover hole.
// DOMPurify strips anything that isn't safe markup before it ever reaches
// the DOM.
import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'b', 'i', 'em', 'strong', 'u', 'p', 'br', 'ul', 'ol', 'li',
  'span', 'div', 'h1', 'h2', 'h3', 'h4', 'a', 'img', 'table',
  'thead', 'tbody', 'tr', 'td', 'th', 'blockquote',
];

export const sanitizeHtml = (dirty) => {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel'],
  });
};

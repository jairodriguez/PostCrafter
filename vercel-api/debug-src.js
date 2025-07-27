const { JSDOM } = require('jsdom');
const DOMPurify = require('dompurify');

const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Test the exact case from the failing test
const content = '<img src="test.jpg" onerror="alert(1)" alt="test">';

console.log('Original content:', content);

// Test 1: Minimal config (working)
const config1 = {
  ALLOWED_TAGS: ['img'],
  ALLOWED_ATTR: ['src', 'alt'],
  FORBID_ATTR: ['onerror']
};
console.log('\nTest 1 - Minimal config:');
const result1 = purify.sanitize(content, config1);
console.log('Result:', result1);

// Test 2: Add more allowed tags
const config2 = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'div', 'span'],
  ALLOWED_ATTR: ['src', 'alt'],
  FORBID_ATTR: ['onerror']
};
console.log('\nTest 2 - Add more allowed tags:');
const result2 = purify.sanitize(content, config2);
console.log('Result:', result2);

// Test 3: Add more allowed attributes
const config3 = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'div', 'span'],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height', 'cite', 'class'],
  FORBID_ATTR: ['onerror']
};
console.log('\nTest 3 - Add more allowed attributes:');
const result3 = purify.sanitize(content, config3);
console.log('Result:', result3);

// Test 4: Add more forbidden attributes
const config4 = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'div', 'span'],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height', 'cite', 'class'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit']
};
console.log('\nTest 4 - Add more forbidden attributes:');
const result4 = purify.sanitize(content, config4);
console.log('Result:', result4);

// Test 5: Add additional options
const config5 = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'div', 'span'],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height', 'cite', 'class'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit'],
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: false,
  FORBID_TAGS: ['script', 'object', 'embed', 'applet', 'meta', 'link', 'style', 'form', 'input', 'button'],
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_TRUSTED_TYPE: false
};
console.log('\nTest 5 - Add additional options:');
const result5 = purify.sanitize(content, config5);
console.log('Result:', result5); 
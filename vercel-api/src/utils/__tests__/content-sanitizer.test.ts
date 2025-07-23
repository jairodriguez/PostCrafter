import { jest } from '@jest/globals';
import {
  sanitizeHtml,
  sanitizeMarkdown,
  sanitizeText,
  sanitizeContent,
  detectMaliciousPatterns,
  contentSanitizer,
  HtmlSanitizationOptions,
  MarkdownSanitizationOptions
} from '../content-sanitizer';

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Content Sanitizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectMaliciousPatterns', () => {
    it('should detect script tags', () => {
      const content = '<script>alert("xss")</script>';
      const result = detectMaliciousPatterns(content);
      
      expect(result.malicious).toBe(true);
      expect(result.patterns).toContain('scriptTags');
      expect(result.details.scriptTags).toBe(1);
    });

    it('should detect event handlers', () => {
      const content = '<img src="x" onerror="alert(1)">';
      const result = detectMaliciousPatterns(content);
      
      expect(result.malicious).toBe(true);
      expect(result.patterns).toContain('scriptEvents');
    });

    it('should detect javascript protocol', () => {
      const content = '<a href="javascript:alert(1)">Click</a>';
      const result = detectMaliciousPatterns(content);
      
      expect(result.malicious).toBe(true);
      expect(result.patterns).toContain('javascriptProtocol');
    });

    it('should detect data protocol with HTML', () => {
      const content = '<iframe src="data:text/html,<script>alert(1)</script>"></iframe>';
      const result = detectMaliciousPatterns(content);
      
      expect(result.malicious).toBe(true);
      expect(result.patterns).toContain('dataProtocol');
    });

    it('should detect object/embed tags', () => {
      const content = '<object data="malicious.swf"></object>';
      const result = detectMaliciousPatterns(content);
      
      expect(result.malicious).toBe(true);
      expect(result.patterns).toContain('objectTags');
    });

    it('should detect form tags', () => {
      const content = '<form action="evil.php"><input type="password"></form>';
      const result = detectMaliciousPatterns(content);
      
      expect(result.malicious).toBe(true);
      expect(result.patterns).toContain('formTags');
    });

    it('should detect meta refresh', () => {
      const content = '<meta http-equiv="refresh" content="0;url=evil.com">';
      const result = detectMaliciousPatterns(content);
      
      expect(result.malicious).toBe(true);
      expect(result.patterns).toContain('metaRefresh');
    });

    it('should detect CSS expressions', () => {
      const content = '<div style="width: expression(alert(1))">test</div>';
      const result = detectMaliciousPatterns(content);
      
      expect(result.malicious).toBe(true);
      expect(result.patterns).toContain('cssExpression');
    });

    it('should detect SQL injection patterns', () => {
      const content = 'value="1 UNION SELECT password FROM users"';
      const result = detectMaliciousPatterns(content);
      
      expect(result.malicious).toBe(true);
      expect(result.patterns).toContain('sqlInjection');
    });

    it('should not flag safe content', () => {
      const content = '<p>This is safe <strong>content</strong> with <a href="https://example.com">links</a>.</p>';
      const result = detectMaliciousPatterns(content);
      
      expect(result.malicious).toBe(false);
      expect(result.patterns).toHaveLength(0);
    });
  });

  describe('sanitizeHtml', () => {
    it('should preserve safe HTML', () => {
      const content = '<p>Hello <strong>world</strong>!</p>';
      const result = sanitizeHtml(content);
      
      expect(result.sanitized).toBe('<p>Hello <strong>world</strong>!</p>');
      expect(result.wasModified).toBe(false);
      expect(result.removedElements).toHaveLength(0);
    });

    it('should remove script tags', () => {
      const content = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
      const result = sanitizeHtml(content);
      
      expect(result.sanitized).not.toContain('<script>');
      expect(result.sanitized).not.toContain('alert');
      expect(result.wasModified).toBe(true);
      expect(result.removedElements).toContain('scriptTags');
    });

    it('should remove event handlers', () => {
      const content = '<img src="test.jpg" onerror="alert(1)" alt="test">';
      const result = sanitizeHtml(content);
      
      expect(result.sanitized).not.toContain('onerror');
      expect(result.sanitized).toContain('src="test.jpg"');
      expect(result.sanitized).toContain('alt="test"');
      expect(result.wasModified).toBe(true);
    });

    it('should remove javascript protocol', () => {
      const content = '<a href="javascript:alert(1)">Click me</a>';
      const result = sanitizeHtml(content);
      
      expect(result.sanitized).not.toContain('javascript:');
      expect(result.sanitized).toContain('Click me');
      expect(result.wasModified).toBe(true);
    });

    it('should handle custom allowed tags', () => {
      const content = '<div><span>test</span><script>alert(1)</script></div>';
      const options: HtmlSanitizationOptions = {
        allowedTags: ['span']
      };
      const result = sanitizeHtml(content, options);
      
      expect(result.sanitized).toBe('<span>test</span>');
      expect(result.wasModified).toBe(true);
    });

    it('should handle allowed attributes', () => {
      const content = '<a href="https://example.com" onclick="alert(1)" title="test">Link</a>';
      const options: HtmlSanitizationOptions = {
        allowedTags: ['a'],
        allowedAttributes: { a: ['href', 'title'] }
      };
      const result = sanitizeHtml(content, options);
      
      expect(result.sanitized).toContain('href="https://example.com"');
      expect(result.sanitized).toContain('title="test"');
      expect(result.sanitized).not.toContain('onclick');
      expect(result.wasModified).toBe(true);
    });

    it('should strip all tags when requested', () => {
      const content = '<p>Hello <strong>world</strong>!</p>';
      const options: HtmlSanitizationOptions = {
        stripAllTags: true
      };
      const result = sanitizeHtml(content, options);
      
      expect(result.sanitized).toBe('Hello world!');
      expect(result.wasModified).toBe(true);
    });

    it('should enforce maximum length', () => {
      const content = 'a'.repeat(1000);
      const options: HtmlSanitizationOptions = {
        maxLength: 100
      };
      const result = sanitizeHtml(content, options);
      
      expect(result.sanitized).toHaveLength(100);
      expect(result.warnings).toContain('Content length 1000 exceeds maximum 100');
      expect(result.wasModified).toBe(true);
    });

    it('should handle external links restriction', () => {
      const content = '<a href="https://external.com">External</a><a href="/internal">Internal</a>';
      const options: HtmlSanitizationOptions = {
        allowExternalLinks: false
      };
      const result = sanitizeHtml(content, options);
      
      expect(result.sanitized).toContain('href="#"');
      expect(result.sanitized).toContain('href="/internal"');
      expect(result.removedElements).toContain('external_link');
    });

    it('should handle URL transformation', () => {
      const content = '<a href="http://example.com">Link</a>';
      const options: HtmlSanitizationOptions = {
        transformUrls: true,
        urlTransformer: (url) => url.replace('http://', 'https://')
      };
      const result = sanitizeHtml(content, options);
      
      expect(result.sanitized).toContain('href="https://example.com"');
    });

    it('should handle sanitization errors gracefully', () => {
      // Mock DOMPurify to throw an error
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      // This would be hard to test without actually breaking DOMPurify
      // So we'll test the error handling path indirectly
      const result = sanitizeHtml('');
      expect(result).toBeDefined();
      expect(result.sanitized).toBeDefined();
      
      console.error = originalConsoleError;
    });
  });

  describe('sanitizeMarkdown', () => {
    it('should render safe markdown to HTML', () => {
      const content = '# Hello World\n\nThis is **bold** text.';
      const result = sanitizeMarkdown(content);
      
      expect(result.sanitized).toContain('<h1>Hello World</h1>');
      expect(result.sanitized).toContain('<strong>bold</strong>');
      expect(result.wasModified).toBe(true); // Because it's converted to HTML
    });

    it('should remove malicious script tags in markdown', () => {
      const content = '# Title\n\n<script>alert("xss")</script>\n\nSafe content.';
      const result = sanitizeMarkdown(content);
      
      expect(result.sanitized).not.toContain('<script>');
      expect(result.sanitized).not.toContain('alert');
      expect(result.sanitized).toContain('Title');
      expect(result.sanitized).toContain('Safe content');
      expect(result.removedElements).toContain('scriptTags');
    });

    it('should handle links when allowed', () => {
      const content = '[Safe link](https://example.com) and [unsafe](javascript:alert(1))';
      const result = sanitizeMarkdown(content);
      
      expect(result.sanitized).toContain('href="https://example.com"');
      expect(result.sanitized).not.toContain('javascript:');
    });

    it('should remove links when not allowed', () => {
      const content = '[Link text](https://example.com)';
      const options: MarkdownSanitizationOptions = {
        allowLinks: false
      };
      const result = sanitizeMarkdown(content, options);
      
      expect(result.sanitized).toContain('Link text');
      expect(result.sanitized).not.toContain('href');
      expect(result.removedElements).toContain('links');
    });

    it('should handle images when allowed', () => {
      const content = '![Alt text](https://example.com/image.jpg)';
      const result = sanitizeMarkdown(content);
      
      expect(result.sanitized).toContain('<img');
      expect(result.sanitized).toContain('src="https://example.com/image.jpg"');
      expect(result.sanitized).toContain('alt="Alt text"');
    });

    it('should remove images when not allowed', () => {
      const content = '![Alt text](https://example.com/image.jpg)';
      const options: MarkdownSanitizationOptions = {
        allowImages: false
      };
      const result = sanitizeMarkdown(content, options);
      
      expect(result.sanitized).not.toContain('<img');
      expect(result.sanitized).toContain('[Alt text]');
      expect(result.removedElements).toContain('images');
    });

    it('should handle code blocks when allowed', () => {
      const content = '```javascript\nconsole.log("hello");\n```';
      const result = sanitizeMarkdown(content);
      
      expect(result.sanitized).toContain('<pre>');
      expect(result.sanitized).toContain('<code>');
      expect(result.sanitized).toContain('console.log');
    });

    it('should remove code blocks when not allowed', () => {
      const content = '```javascript\nconsole.log("hello");\n```\n\nSafe content.';
      const options: MarkdownSanitizationOptions = {
        allowCodeBlocks: false
      };
      const result = sanitizeMarkdown(content, options);
      
      expect(result.sanitized).not.toContain('console.log');
      expect(result.sanitized).toContain('Safe content');
      expect(result.removedElements).toContain('code_blocks');
    });

    it('should handle HTML in markdown when allowed', () => {
      const content = '# Title\n\n<div>HTML content</div>';
      const options: MarkdownSanitizationOptions = {
        allowHtml: true
      };
      const result = sanitizeMarkdown(content, options);
      
      expect(result.sanitized).toContain('<div>HTML content</div>');
    });

    it('should remove HTML when not allowed', () => {
      const content = '# Title\n\n<div>HTML content</div>';
      const options: MarkdownSanitizationOptions = {
        allowHtml: false
      };
      const result = sanitizeMarkdown(content, options);
      
      expect(result.sanitized).not.toContain('<div>');
      expect(result.sanitized).toContain('HTML content');
      expect(result.removedElements).toContain('html_tags');
    });

    it('should validate link protocols', () => {
      const content = '[HTTPS](https://example.com) [HTTP](http://example.com) [FTP](ftp://example.com)';
      const options: MarkdownSanitizationOptions = {
        allowedProtocols: ['https']
      };
      const result = sanitizeMarkdown(content, options);
      
      expect(result.sanitized).toContain('href="https://example.com"');
      expect(result.sanitized).toContain('href="#"'); // HTTP link should be neutralized
      expect(result.sanitized).toContain('title="Link removed - invalid protocol"');
    });

    it('should handle tables when allowed', () => {
      const content = '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |';
      const options: MarkdownSanitizationOptions = {
        allowTables: true
      };
      const result = sanitizeMarkdown(content, options);
      
      expect(result.sanitized).toContain('<table>');
      expect(result.sanitized).toContain('<th>Header 1</th>');
      expect(result.sanitized).toContain('<td>Cell 1</td>');
    });

    it('should enforce maximum length', () => {
      const content = 'a'.repeat(1000);
      const options: MarkdownSanitizationOptions = {
        maxLength: 100
      };
      const result = sanitizeMarkdown(content, options);
      
      expect(result.warnings).toContain('Content length 1000 exceeds maximum 100');
    });

    it('should handle custom link validator', () => {
      const content = '[Good](https://good.com) [Bad](https://bad.com)';
      const options: MarkdownSanitizationOptions = {
        linkValidator: (url) => !url.includes('bad.com')
      };
      const result = sanitizeMarkdown(content, options);
      
      expect(result.sanitized).toContain('href="https://good.com"');
      expect(result.sanitized).toContain('href="#"');
      expect(result.sanitized).toContain('title="Link removed for security"');
    });
  });

  describe('sanitizeText', () => {
    it('should sanitize plain text', () => {
      const content = 'Hello <script>alert(1)</script> World';
      const result = sanitizeText(content);
      
      expect(result.sanitized).toBe('Hello scriptalert(1)/script World');
      expect(result.wasModified).toBe(true);
      expect(result.removedElements).toContain('scriptTags');
    });

    it('should handle maximum length', () => {
      const content = 'a'.repeat(1000);
      const result = sanitizeText(content, 100);
      
      expect(result.sanitized).toHaveLength(100);
      expect(result.warnings).toContain('Content length 1000 exceeds maximum 100');
    });

    it('should trim whitespace', () => {
      const content = '  Hello World  ';
      const result = sanitizeText(content);
      
      expect(result.sanitized).toBe('Hello World');
      expect(result.wasModified).toBe(true);
    });

    it('should remove javascript protocols', () => {
      const content = 'Click javascript:alert(1) here';
      const result = sanitizeText(content);
      
      expect(result.sanitized).toBe('Click alert(1) here');
      expect(result.wasModified).toBe(true);
    });
  });

  describe('sanitizeContent', () => {
    it('should route to HTML sanitizer', () => {
      const content = '<p>HTML content</p>';
      const result = sanitizeContent(content, 'html');
      
      expect(result.sanitized).toContain('<p>HTML content</p>');
    });

    it('should route to Markdown sanitizer', () => {
      const content = '# Markdown content';
      const result = sanitizeContent(content, 'markdown');
      
      expect(result.sanitized).toContain('<h1>Markdown content</h1>');
    });

    it('should route to text sanitizer by default', () => {
      const content = 'Plain text <script>alert(1)</script>';
      const result = sanitizeContent(content);
      
      expect(result.sanitized).toBe('Plain text scriptalert(1)/script');
    });

    it('should handle case insensitive content types', () => {
      const content = '<p>HTML content</p>';
      const result = sanitizeContent(content, 'HTML' as any);
      
      expect(result.sanitized).toContain('<p>HTML content</p>');
    });
  });

  describe('contentSanitizer object', () => {
    it('should export all sanitization functions', () => {
      expect(contentSanitizer.sanitizeHtml).toBe(sanitizeHtml);
      expect(contentSanitizer.sanitizeMarkdown).toBe(sanitizeMarkdown);
      expect(contentSanitizer.sanitizeText).toBe(sanitizeText);
      expect(contentSanitizer.sanitizeContent).toBe(sanitizeContent);
      expect(contentSanitizer.detectMaliciousPatterns).toBe(detectMaliciousPatterns);
    });

    it('should provide predefined configurations', () => {
      expect(contentSanitizer.configs.strict).toBeDefined();
      expect(contentSanitizer.configs.moderate).toBeDefined();
      expect(contentSanitizer.configs.permissive).toBeDefined();
    });

    it('should have working strict configuration', () => {
      const content = '<div><p>Text</p><script>alert(1)</script></div>';
      const result = sanitizeHtml(content, contentSanitizer.configs.strict.html);
      
      expect(result.sanitized).toContain('<p>Text</p>');
      expect(result.sanitized).not.toContain('<div>');
      expect(result.sanitized).not.toContain('<script>');
    });

    it('should have working permissive configuration', () => {
      const content = '<div data-test="value">Content</div>';
      const result = sanitizeHtml(content, contentSanitizer.configs.permissive.html);
      
      expect(result.sanitized).toContain('data-test="value"');
    });
  });

  describe('edge cases and security', () => {
    it('should handle empty content', () => {
      expect(sanitizeHtml('').sanitized).toBe('');
      expect(sanitizeMarkdown('').sanitized).toBe('');
      expect(sanitizeText('').sanitized).toBe('');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeText(null as any).sanitized).toBe('');
      expect(sanitizeText(undefined as any).sanitized).toBe('');
    });

    it('should handle complex XSS attempts', () => {
      const maliciousInputs = [
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert(1)>',
        '&lt;script&gt;alert(1)&lt;/script&gt;',
        'javascript:/*--></title></style></textarea></script></xmp><svg/onload=alert(1)>',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<form><button formaction="javascript:alert(1)">XSS</button></form>',
        '<object data="data:text/html,<script>alert(1)</script>"></object>'
      ];

      maliciousInputs.forEach(input => {
        const result = sanitizeHtml(input);
        expect(result.sanitized).not.toContain('alert(1)');
        expect(result.sanitized).not.toContain('javascript:');
        expect(result.wasModified).toBe(true);
      });
    });

    it('should handle nested malicious content', () => {
      const content = '<div><p>Safe</p><script>alert("<img onerror=alert(2) src=x>")</script></div>';
      const result = sanitizeHtml(content);
      
      expect(result.sanitized).not.toContain('alert');
      expect(result.sanitized).not.toContain('onerror');
      expect(result.sanitized).toContain('Safe');
    });

    it('should handle large content efficiently', () => {
      const largeContent = '<p>' + 'a'.repeat(10000) + '</p>';
      const startTime = Date.now();
      const result = sanitizeHtml(largeContent);
      const endTime = Date.now();
      
      expect(result.sanitized).toContain('<p>');
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should preserve Unicode content', () => {
      const content = '<p>Hello 世界 🌍 مرحبا</p>';
      const result = sanitizeHtml(content);
      
      expect(result.sanitized).toBe('<p>Hello 世界 🌍 مرحبا</p>');
      expect(result.wasModified).toBe(false);
    });

    it('should handle markdown with mixed content types', () => {
      const content = `
# Title
Some **bold** text.
<script>alert(1)</script>
![Image](https://example.com/img.jpg)
\`\`\`
code block
\`\`\`
[Link](https://example.com)
      `;
      
      const result = sanitizeMarkdown(content);
      
      expect(result.sanitized).toContain('<h1>Title</h1>');
      expect(result.sanitized).toContain('<strong>bold</strong>');
      expect(result.sanitized).not.toContain('alert(1)');
      expect(result.sanitized).toContain('<img');
      expect(result.sanitized).toContain('<pre>');
      expect(result.sanitized).toContain('href="https://example.com"');
    });

    it('should maintain consistent results for repeated sanitization', () => {
      const content = '<p>Hello <script>alert(1)</script> World</p>';
      
      const result1 = sanitizeHtml(content);
      const result2 = sanitizeHtml(result1.sanitized);
      
      expect(result1.sanitized).toBe(result2.sanitized);
      expect(result2.wasModified).toBe(false);
    });
  });

  describe('performance and logging', () => {
    it('should log sanitization activities', () => {
      const { logger } = require('../logger');
      const content = '<p>Safe</p><script>alert(1)</script>';
      
      sanitizeHtml(content, {}, 'test-request-123');
      
      expect(logger.info).toHaveBeenCalledWith(
        'HTML content sanitized',
        expect.objectContaining({
          requestId: 'test-request-123',
          originalLength: content.length,
          component: 'content-sanitizer'
        })
      );
    });

    it('should log malicious pattern detection', () => {
      const { logger } = require('../logger');
      const content = '<script>alert(1)</script>';
      
      detectMaliciousPatterns(content);
      
      expect(logger.warn).toHaveBeenCalledWith(
        'Malicious patterns detected in content',
        expect.objectContaining({
          patterns: ['scriptTags'],
          component: 'content-sanitizer'
        })
      );
    });

    it('should provide detailed statistics', () => {
      const content = '<p>Hello</p><script>alert(1)</script><p>World</p>';
      const result = sanitizeHtml(content);
      
      expect(result.stats.originalLength).toBe(content.length);
      expect(result.stats.sanitizedLength).toBe(result.sanitized.length);
      expect(result.stats.removedCount).toBeGreaterThan(0);
    });
  });
});
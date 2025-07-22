import {
  sanitizeHtml,
  sanitizeMarkdown,
  validateAndSanitizeUrl,
  validateImageData,
  detectMaliciousContent,
  validateRequestHeaders,
  validateRequest,
  securePublishRequestSchema,
} from '../validation';

describe('Request Validation and Sanitization', () => {
  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const input = '<p>Hello <script>alert("xss")</script> World</p>';
      const result = sanitizeHtml(input);
      expect(result).toBe('&lt;p&gt;Hello  World&lt;/p&gt;');
    });

    it('should remove event handlers', () => {
      const input = '<img src="test.jpg" onload="alert(\'xss\')" alt="test">';
      const result = sanitizeHtml(input);
      expect(result).toBe('&lt;img src=&quot;test.jpg&quot;  alt=&quot;test&quot;&gt;');
    });

    it('should remove javascript protocol', () => {
      const input = '<a href="javascript:alert(\'xss\')">Click me</a>';
      const result = sanitizeHtml(input);
      expect(result).toBe('&lt;a href=&quot;&quot;&gt;Click me&lt;/a&gt;');
    });

    it('should encode special characters', () => {
      const input = '<script>&</script>';
      const result = sanitizeHtml(input);
      expect(result).toBe('&amp;&lt;&amp;&gt;');
    });

    it('should handle empty input', () => {
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml(null as any)).toBe(null);
    });
  });

  describe('sanitizeMarkdown', () => {
    it('should remove dangerous patterns from markdown', () => {
      const input = '# Title\n\n<script>alert("xss")</script>\n\nNormal content with `eval()` function.';
      const result = sanitizeMarkdown(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('eval()');
      expect(result).toContain('# Title');
      expect(result).toContain('Normal content');
    });

    it('should preserve safe markdown', () => {
      const input = '# Title\n\n**Bold text** and *italic text*.\n\n- List item 1\n- List item 2';
      const result = sanitizeMarkdown(input);
      expect(result).toBe(input);
    });
  });

  describe('validateAndSanitizeUrl', () => {
    it('should validate correct URLs', () => {
      const result = validateAndSanitizeUrl('https://example.com/path');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('https://example.com/path');
    });

    it('should reject suspicious protocols', () => {
      const result = validateAndSanitizeUrl('file:///etc/passwd');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('URL protocol not allowed');
    });

    it('should reject path traversal', () => {
      const result = validateAndSanitizeUrl('https://example.com/../../../etc/passwd');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Path traversal detected in URL');
    });

    it('should reject invalid URLs', () => {
      const result = validateAndSanitizeUrl('not-a-url');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid URL format');
    });

    it('should reject empty URLs', () => {
      const result = validateAndSanitizeUrl('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('URL is required');
    });
  });

  describe('validateImageData', () => {
    it('should validate correct image data with URL', () => {
      const imageData = {
        url: 'https://example.com/image.jpg',
        alt_text: 'Test image',
        caption: 'Test caption',
      };
      const result = validateImageData(imageData);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBeDefined();
    });

    it('should validate correct image data with base64', () => {
      const imageData = {
        base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
        mime_type: 'image/jpeg',
      };
      const result = validateImageData(imageData);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid image URL', () => {
      const imageData = {
        url: 'file:///etc/passwd',
        alt_text: 'Test',
      };
      const result = validateImageData(imageData);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid image URL');
    });

    it('should reject oversized base64 image', () => {
      const largeBase64 = 'data:image/jpeg;base64,' + 'A'.repeat(15 * 1024 * 1024); // ~15MB
      const imageData = { base64: largeBase64 };
      const result = validateImageData(imageData);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Image size exceeds 10MB limit');
    });

    it('should reject invalid MIME type', () => {
      const imageData = {
        url: 'https://example.com/image.jpg',
        mime_type: 'application/pdf',
      };
      const result = validateImageData(imageData);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unsupported image MIME type');
    });

    it('should sanitize text fields', () => {
      const imageData = {
        url: 'https://example.com/image.jpg',
        alt_text: '<script>alert("xss")</script>',
        caption: 'Normal caption',
      };
      const result = validateImageData(imageData);
      expect(result.valid).toBe(true);
      expect(result.sanitized?.alt_text).not.toContain('<script>');
    });
  });

  describe('detectMaliciousContent', () => {
    it('should detect XSS script tags', () => {
      const result = detectMaliciousContent('<script>alert("xss")</script>');
      expect(result.malicious).toBe(true);
      expect(result.patterns).toContain('XSS script tag');
    });

    it('should detect XSS event handlers', () => {
      const result = detectMaliciousContent('<img onload="alert(\'xss\')" src="test.jpg">');
      expect(result.malicious).toBe(true);
      expect(result.patterns).toContain('XSS event handler');
    });

    it('should detect SQL injection attempts', () => {
      const result = detectMaliciousContent("'; DROP TABLE users; --");
      expect(result.malicious).toBe(true);
      expect(result.patterns).toContain('SQL injection attempt');
    });

    it('should detect command injection attempts', () => {
      const result = detectMaliciousContent('$(rm -rf /)');
      expect(result.malicious).toBe(true);
      expect(result.patterns).toContain('Command injection attempt');
    });

    it('should detect path traversal attempts', () => {
      const result = detectMaliciousContent('../../../etc/passwd');
      expect(result.malicious).toBe(true);
      expect(result.patterns).toContain('Path traversal attempt');
    });

    it('should not flag safe content', () => {
      const result = detectMaliciousContent('This is normal content with no malicious patterns.');
      expect(result.malicious).toBe(false);
      expect(result.patterns).toHaveLength(0);
    });

    it('should handle empty content', () => {
      const result = detectMaliciousContent('');
      expect(result.malicious).toBe(false);
      expect(result.patterns).toHaveLength(0);
    });
  });

  describe('validateRequestHeaders', () => {
    it('should validate correct headers', () => {
      const headers = {
        'content-type': 'application/json',
        'content-length': '1024',
        'user-agent': 'PostCrafter/1.0',
      };
      const result = validateRequestHeaders(headers);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing content type', () => {
      const headers = {
        'content-length': '1024',
        'user-agent': 'PostCrafter/1.0',
      };
      const result = validateRequestHeaders(headers);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Content-Type header is required');
    });

    it('should reject wrong content type', () => {
      const headers = {
        'content-type': 'text/plain',
        'user-agent': 'PostCrafter/1.0',
      };
      const result = validateRequestHeaders(headers);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Content-Type must be application/json');
    });

    it('should reject oversized requests', () => {
      const headers = {
        'content-type': 'application/json',
        'content-length': '15000000', // 15MB
        'user-agent': 'PostCrafter/1.0',
      };
      const result = validateRequestHeaders(headers);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Request body too large');
    });

    it('should reject missing user agent', () => {
      const headers = {
        'content-type': 'application/json',
      };
      const result = validateRequestHeaders(headers);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('User-Agent header is required');
    });
  });

  describe('validateRequest', () => {
    it('should validate correct request', () => {
      const body = { test: 'data' };
      const headers = {
        'content-type': 'application/json',
        'user-agent': 'PostCrafter/1.0',
      };
      const result = validateRequest(body, headers);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect malicious content in body', () => {
      const body = { test: '<script>alert("xss")</script>' };
      const headers = {
        'content-type': 'application/json',
        'user-agent': 'PostCrafter/1.0',
      };
      const result = validateRequest(body, headers);
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('Malicious content detected'))).toBe(true);
    });

    it('should reject oversized body', () => {
      const largeBody = 'A'.repeat(15 * 1024 * 1024); // 15MB
      const headers = {
        'content-type': 'application/json',
        'user-agent': 'PostCrafter/1.0',
      };
      const result = validateRequest(largeBody, headers, 10 * 1024 * 1024); // 10MB limit
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('too large'))).toBe(true);
    });
  });

  describe('securePublishRequestSchema', () => {
    it('should validate correct publish request', () => {
      const request = {
        post: {
          title: 'Test Post',
          content: 'This is test content',
          status: 'draft',
        },
        options: {
          publish_status: 'draft',
          include_images: true,
        },
      };
      const result = securePublishRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should sanitize HTML in title', () => {
      const request = {
        post: {
          title: 'Test <script>alert("xss")</script> Post',
          content: 'This is test content',
        },
      };
      const result = securePublishRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.post.title).not.toContain('<script>');
      }
    });

    it('should reject malicious content', () => {
      const request = {
        post: {
          title: 'Test Post',
          content: '<script>alert("xss")</script>',
        },
      };
      const result = securePublishRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should reject too many images', () => {
      const images = Array.from({ length: 11 }, (_, i) => ({
        url: `https://example.com/image${i}.jpg`,
      }));
      const request = {
        post: {
          title: 'Test Post',
          content: 'This is test content',
          images,
        },
      };
      const result = securePublishRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should validate image data in schema', () => {
      const request = {
        post: {
          title: 'Test Post',
          content: 'This is test content',
          images: [
            {
              url: 'https://example.com/image.jpg',
              alt_text: 'Test image',
              mime_type: 'image/jpeg',
            },
          ],
        },
      };
      const result = securePublishRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });
  });
}); 
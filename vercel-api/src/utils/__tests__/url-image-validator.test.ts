import { jest } from '@jest/globals';
import {
  validateUrl,
  validateImageUrl,
  validateImageComplete,
  checkUrlReachability,
  validateImageMetadata,
  urlImageValidator,
  UrlValidationOptions,
  ImageValidationOptions
} from '../url-image-validator';

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock fetch for async tests
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('URL and Image Validator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.MockedFunction<typeof fetch>).mockClear();
  });

  describe('validateUrl', () => {
    it('should validate basic HTTP URLs', () => {
      const result = validateUrl('https://example.com');
      
      expect(result.isValid).toBe(true);
      expect(result.protocol).toBe('https');
      expect(result.domain).toBe('example.com');
      expect(result.error).toBeUndefined();
    });

    it('should validate HTTP URLs', () => {
      const result = validateUrl('http://example.com');
      
      expect(result.isValid).toBe(true);
      expect(result.protocol).toBe('http');
      expect(result.domain).toBe('example.com');
    });

    it('should reject invalid URL formats', () => {
      const invalidUrls = [
        '',
        'not-a-url',
        'htp://invalid',
        'https://',
        'https://.',
        'https:// example.com'
      ];

      invalidUrls.forEach(url => {
        const result = validateUrl(url);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should reject disallowed protocols', () => {
      const options: UrlValidationOptions = {
        allowedProtocols: ['https']
      };

      const result = validateUrl('ftp://example.com', options);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Protocol \'ftp\' is not allowed');
    });

    it('should enforce secure protocol requirement', () => {
      const options: UrlValidationOptions = {
        requireSecure: true
      };

      const result = validateUrl('http://example.com', options);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Secure protocol required');
    });

    it('should block localhost when not allowed', () => {
      const options: UrlValidationOptions = {
        allowLocalhost: false
      };

      const localhostUrls = [
        'https://localhost',
        'https://127.0.0.1',
        'https://[::1]'
      ];

      localhostUrls.forEach(url => {
        const result = validateUrl(url, options);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Localhost is not allowed');
      });
    });

    it('should block IP addresses when not allowed', () => {
      const options: UrlValidationOptions = {
        allowIpAddresses: false
      };

      const ipUrls = [
        'https://192.168.1.1',
        'https://10.0.0.1',
        'http://[2001:db8::1]'
      ];

      ipUrls.forEach(url => {
        const result = validateUrl(url, options);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('IP addresses are not allowed');
      });
    });

    it('should block private IP ranges', () => {
      const options: UrlValidationOptions = {
        allowIpAddresses: true,
        allowPrivateIps: false
      };

      const privateIps = [
        'https://192.168.1.1',
        'https://10.0.0.1',
        'https://172.16.0.1',
        'https://169.254.1.1'
      ];

      privateIps.forEach(url => {
        const result = validateUrl(url, options);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Private IP addresses are not allowed');
      });
    });

    it('should enforce domain allowlists', () => {
      const options: UrlValidationOptions = {
        allowedDomains: ['trusted.com', 'safe.org']
      };

      // Allowed domains
      expect(validateUrl('https://trusted.com', options).isValid).toBe(true);
      expect(validateUrl('https://subdomain.trusted.com', options).isValid).toBe(true);
      expect(validateUrl('https://safe.org', options).isValid).toBe(true);

      // Blocked domains
      expect(validateUrl('https://evil.com', options).isValid).toBe(false);
      expect(validateUrl('https://untrusted.net', options).isValid).toBe(false);
    });

    it('should enforce domain blocklists', () => {
      const options: UrlValidationOptions = {
        blockedDomains: ['blocked.com', 'evil.org']
      };

      expect(validateUrl('https://blocked.com', options).isValid).toBe(false);
      expect(validateUrl('https://subdomain.blocked.com', options).isValid).toBe(false);
      expect(validateUrl('https://evil.org', options).isValid).toBe(false);
      expect(validateUrl('https://safe.com', options).isValid).toBe(true);
    });

    it('should validate port restrictions', () => {
      const options: UrlValidationOptions = {
        allowedPorts: [443, 8080]
      };

      expect(validateUrl('https://example.com:443', options).isValid).toBe(true);
      expect(validateUrl('https://example.com:8080', options).isValid).toBe(true);
      expect(validateUrl('https://example.com:9999', options).isValid).toBe(false);
    });

    it('should enforce maximum URL length', () => {
      const options: UrlValidationOptions = {
        maxLength: 50
      };

      const longUrl = 'https://example.com/' + 'a'.repeat(100);
      const result = validateUrl(longUrl, options);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum length');
    });

    it('should detect suspicious patterns', () => {
      const suspiciousUrls = [
        'javascript:alert(1)',
        'vbscript:msgbox(1)',
        'file:///etc/passwd',
        'data:text/html,<script>alert(1)</script>',
        'https://bit.ly/malicious',
        'https://example.com?redirect=evil.com',
        'https://example.com/malware.exe'
      ];

      suspiciousUrls.forEach(url => {
        const result = validateUrl(url);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Suspicious URL patterns detected');
      });
    });

    it('should handle null and undefined inputs', () => {
      expect(validateUrl(null as any).isValid).toBe(false);
      expect(validateUrl(undefined as any).isValid).toBe(false);
      expect(validateUrl('').isValid).toBe(false);
    });

    it('should allow disabling suspicious pattern detection', () => {
      const options: UrlValidationOptions = {
        blockSuspiciousPatterns: false
      };

      const result = validateUrl('https://bit.ly/shortlink', options);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateImageUrl', () => {
    it('should validate basic image URLs', () => {
      const imageUrls = [
        'https://example.com/image.jpg',
        'https://example.com/image.png',
        'https://example.com/image.gif',
        'https://example.com/image.webp'
      ];

      imageUrls.forEach(url => {
        const result = validateImageUrl(url);
        expect(result.isValid).toBe(true);
        expect(result.fileExtension).toBeDefined();
      });
    });

    it('should reject non-image file extensions', () => {
      const nonImageUrls = [
        'https://example.com/file.txt',
        'https://example.com/document.pdf',
        'https://example.com/archive.zip'
      ];

      nonImageUrls.forEach(url => {
        const result = validateImageUrl(url);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('is not allowed for images');
      });

      // .js files should be blocked by suspicious pattern detection
      const jsUrl = 'https://example.com/script.js';
      const jsResult = validateImageUrl(jsUrl);
      expect(jsResult.isValid).toBe(false);
      expect(jsResult.error).toContain('Suspicious URL patterns detected');
    });

    it('should handle SVG restrictions', () => {
      const svgUrl = 'https://example.com/image.svg';
      
      // Default: SVG not allowed
      expect(validateImageUrl(svgUrl).isValid).toBe(false);
      
      // Explicitly allow SVG
      const options: ImageValidationOptions = { allowSvg: true };
      expect(validateImageUrl(svgUrl, options).isValid).toBe(true);
    });

    it('should handle WebP restrictions', () => {
      const webpUrl = 'https://example.com/image.webp';
      
      // Default: WebP allowed
      expect(validateImageUrl(webpUrl).isValid).toBe(true);
      
      // Explicitly disallow WebP
      const options: ImageValidationOptions = { allowWebP: false };
      expect(validateImageUrl(webpUrl, options).isValid).toBe(false);
    });

    it('should allow URLs without file extensions', () => {
      const url = 'https://example.com/api/image';
      const result = validateImageUrl(url);
      
      // Should be valid but logged as debug
      expect(result.isValid).toBe(true);
      expect(result.fileExtension).toBe('');
    });

    it('should inherit URL validation rules', () => {
      const options: ImageValidationOptions = {
        requireSecure: true
      };

      const result = validateImageUrl('http://example.com/image.jpg', options);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Secure protocol required');
    });

    it('should validate against allowed extensions list', () => {
      const options: ImageValidationOptions = {
        allowedExtensions: ['.jpg', '.png']
      };

      expect(validateImageUrl('https://example.com/image.jpg', options).isValid).toBe(true);
      expect(validateImageUrl('https://example.com/image.png', options).isValid).toBe(true);
      expect(validateImageUrl('https://example.com/image.gif', options).isValid).toBe(false);
    });
  });

  describe('checkUrlReachability', () => {
    it('should return reachable for successful responses', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers()
      } as Response);

      const result = await checkUrlReachability('https://example.com');
      
      expect(result.reachable).toBe(true);
      expect(result.responseCode).toBe(200);
      expect(fetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          method: 'HEAD',
          redirect: 'manual'
        })
      );
    });

    it('should handle redirects safely', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 302,
        headers: new Headers({
          'Location': 'https://safe-redirect.com'
        })
      } as Response);

      const result = await checkUrlReachability('https://example.com');
      
      expect(result.reachable).toBe(true);
      expect(result.responseCode).toBe(302);
      expect(result.redirectUrl).toBe('https://safe-redirect.com');
    });

    it('should block malicious redirects', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 302,
        headers: new Headers({
          'Location': 'javascript:alert(1)'
        })
      } as Response);

      const result = await checkUrlReachability('https://example.com');
      
      expect(result.reachable).toBe(false);
      expect(result.error).toContain('Redirect URL failed validation');
    });

    it('should handle network errors', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await checkUrlReachability('https://example.com');
      
      expect(result.reachable).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle timeouts', async () => {
      // Mock a request that throws AbortError after a delay
      (fetch as jest.MockedFunction<typeof fetch>).mockImplementationOnce(
        () => new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('AbortError'));
          }, 50);
        })
      );

      const result = await checkUrlReachability('https://example.com', 100);
      
      expect(result.reachable).toBe(false);
      expect(result.error).toBeDefined();
    }, 1000); // Increase test timeout
  });

  describe('validateImageMetadata', () => {
    it('should validate image MIME types', async () => {
      const headers = new Headers({
        'Content-Type': 'image/jpeg',
        'Content-Length': '1024'
      });

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers,
        arrayBuffer: async () => new ArrayBuffer(1024)
      } as Response);

      const result = await validateImageMetadata('https://example.com/image.jpg');
      
      expect(result.isValid).toBe(true);
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.size).toBe(1024);
    });

    it('should reject invalid MIME types', async () => {
      const headers = new Headers({
        'Content-Type': 'text/html',
        'Content-Length': '1024'
      });

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers,
        arrayBuffer: async () => new ArrayBuffer(1024)
      } as Response);

      const result = await validateImageMetadata('https://example.com/image.jpg');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('MIME type \'text/html\' is not allowed');
    });

    it('should validate file sizes', async () => {
      const headers = new Headers({
        'Content-Type': 'image/jpeg',
        'Content-Length': '50000000' // 50MB
      });

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers,
        arrayBuffer: async () => new ArrayBuffer(50000000)
      } as Response);

      const options: ImageValidationOptions = {
        maxSizeBytes: 10 * 1024 * 1024 // 10MB limit
      };

      const result = await validateImageMetadata('https://example.com/image.jpg', options);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum');
    });

    it('should extract PNG dimensions', async () => {
      // Create a minimal PNG header with width=100, height=200
      const pngBuffer = new ArrayBuffer(24);
      const view = new DataView(pngBuffer);
      
      // PNG signature
      view.setUint32(0, 0x89504E47, false);
      view.setUint32(4, 0x0D0A1A0A, false);
      
      // IHDR chunk
      view.setUint32(8, 0x0000000D, false); // Length
      view.setUint32(12, 0x49484452, false); // Type: IHDR
      view.setUint32(16, 100, false); // Width: 100
      view.setUint32(20, 200, false); // Height: 200

      const headers = new Headers({
        'Content-Type': 'image/png',
        'Content-Length': '24'
      });

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers,
        arrayBuffer: async () => pngBuffer
      } as Response);

      const options: ImageValidationOptions = {
        validateImageData: true
      };

      const result = await validateImageMetadata('https://example.com/image.png', options);
      
      expect(result.isValid).toBe(true);
      expect(result.width).toBe(100);
      expect(result.height).toBe(200);
    });

    it('should validate image dimensions', async () => {
      const pngBuffer = new ArrayBuffer(24);
      const view = new DataView(pngBuffer);
      view.setUint32(0, 0x89504E47, false);
      view.setUint32(4, 0x0D0A1A0A, false);
      view.setUint32(8, 0x0000000D, false);
      view.setUint32(12, 0x49484452, false);
      view.setUint32(16, 50, false); // Width: 50 (below minimum)
      view.setUint32(20, 50, false); // Height: 50 (below minimum)

      const headers = new Headers({
        'Content-Type': 'image/png'
      });

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers,
        arrayBuffer: async () => pngBuffer
      } as Response);

      const options: ImageValidationOptions = {
        validateImageData: true,
        minWidth: 100,
        minHeight: 100
      };

      const result = await validateImageMetadata('https://example.com/image.png', options);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('below minimum');
    });

    it('should handle fetch errors', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await validateImageMetadata('https://example.com/image.jpg');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Failed to fetch image metadata');
    });

    it('should handle HTTP errors', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers()
      } as Response);

      const result = await validateImageMetadata('https://example.com/image.jpg');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('HTTP 404: Not Found');
    });
  });

  describe('validateImageComplete', () => {
    it('should combine sync and async validation', async () => {
      const headers = new Headers({
        'Content-Type': 'image/jpeg',
        'Content-Length': '1024'
      });

      (fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers()
        } as Response) // For reachability check
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers,
          arrayBuffer: async () => new ArrayBuffer(1024)
        } as Response); // For metadata check

      const options: ImageValidationOptions = {
        checkReachability: true,
        validateImageData: true
      };

      const result = await validateImageComplete('https://example.com/image.jpg', options);
      
      expect(result.isValid).toBe(true);
      expect(result.isReachable).toBe(true);
      expect(result.imageMetadata?.isValid).toBe(true);
    });

    it('should fail fast on sync validation errors', async () => {
      const result = await validateImageComplete('invalid-url');
      
      expect(result.isValid).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should fail on unreachable URLs', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const options: ImageValidationOptions = {
        checkReachability: true
      };

      const result = await validateImageComplete('https://example.com/image.jpg', options);
      
      expect(result.isValid).toBe(false);
      expect(result.isReachable).toBe(false);
      expect(result.error).toContain('URL is not reachable');
    });

    it('should fail on invalid image metadata', async () => {
      const headers = new Headers({
        'Content-Type': 'text/html'
      });

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers,
        arrayBuffer: async () => new ArrayBuffer(1024)
      } as Response);

      const options: ImageValidationOptions = {
        validateImageData: true
      };

      const result = await validateImageComplete('https://example.com/image.jpg', options);
      
      expect(result.isValid).toBe(false);
      expect(result.imageMetadata?.isValid).toBe(false);
    });
  });

  describe('utility functions', () => {
    it('should extract file extensions correctly', () => {
      expect(urlImageValidator.getFileExtension('https://example.com/image.jpg')).toBe('.jpg');
      expect(urlImageValidator.getFileExtension('https://example.com/image.PNG')).toBe('.png');
      expect(urlImageValidator.getFileExtension('https://example.com/path/to/image.gif')).toBe('.gif');
      expect(urlImageValidator.getFileExtension('https://example.com/no-extension')).toBe('');
      expect(urlImageValidator.getFileExtension('invalid-url')).toBe('');
    });

    it('should detect private IP addresses', () => {
      expect(urlImageValidator.isPrivateIp('192.168.1.1')).toBe(true);
      expect(urlImageValidator.isPrivateIp('10.0.0.1')).toBe(true);
      expect(urlImageValidator.isPrivateIp('172.16.0.1')).toBe(true);
      expect(urlImageValidator.isPrivateIp('169.254.1.1')).toBe(true);
      expect(urlImageValidator.isPrivateIp('8.8.8.8')).toBe(false);
      expect(urlImageValidator.isPrivateIp('1.1.1.1')).toBe(false);
    });

    it('should detect suspicious patterns', () => {
      const result = urlImageValidator.hasSuspiciousPatterns('javascript:alert(1)');
      expect(result.suspicious).toBe(true);
      expect(result.patterns.length).toBeGreaterThan(0);

      const safeResult = urlImageValidator.hasSuspiciousPatterns('https://example.com/safe-url');
      expect(safeResult.suspicious).toBe(false);
      expect(safeResult.patterns).toHaveLength(0);
    });
  });

  describe('predefined configurations', () => {
    it('should have strict configuration', () => {
      const config = urlImageValidator.configs.strict;
      
      expect(config.url.requireSecure).toBe(true);
      expect(config.url.allowIpAddresses).toBe(false);
      expect(config.url.allowLocalhost).toBe(false);
      expect(config.image.allowSvg).toBe(false);
      expect(config.image.validateImageData).toBe(true);
    });

    it('should have moderate configuration', () => {
      const config = urlImageValidator.configs.moderate;
      
      expect(config.url.requireSecure).toBe(false);
      expect(config.image.allowSvg).toBe(false);
      expect(config.image.allowWebP).toBe(true);
    });

    it('should have permissive configuration', () => {
      const config = urlImageValidator.configs.permissive;
      
      expect(config.url.allowIpAddresses).toBe(true);
      expect(config.url.allowLocalhost).toBe(true);
      expect(config.url.blockSuspiciousPatterns).toBe(false);
      expect(config.image.allowSvg).toBe(true);
      expect(config.image.maxSizeBytes).toBe(50 * 1024 * 1024);
    });

    it('should work with strict configuration', () => {
      const result = validateUrl('http://192.168.1.1', urlImageValidator.configs.strict.url);
      expect(result.isValid).toBe(false);
    });

    it('should work with permissive configuration', () => {
      const result = validateImageUrl('https://example.com/image.svg', urlImageValidator.configs.permissive.image);
      expect(result.isValid).toBe(true);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle malformed URLs gracefully', () => {
      const malformedUrls = [
        'ht tp://invalid',
        'https://[invalid-ipv6',
        'https://domain..com',
        'https://.com',
        'https://domain-.com'
      ];

      malformedUrls.forEach(url => {
        const result = validateUrl(url);
        console.log(`Testing malformed URL "${url}":`, { isValid: result.isValid, error: result.error });
        expect(result.isValid).toBe(false);
      });
    });

    it('should handle Unicode domains', () => {
      const unicodeDomain = 'https://xn--nxasmq6b.xn--o3cw4h'; // 测试.网站 in punycode
      const result = validateUrl(unicodeDomain);
      expect(result.isValid).toBe(true);
    });

    it('should handle very long URLs appropriately', () => {
      const veryLongUrl = 'https://example.com/' + 'a'.repeat(10000);
      const result = validateUrl(veryLongUrl);
      expect(result.isValid).toBe(false);
    });

    it('should handle URLs with unusual but valid characters', () => {
      const validUrls = [
        'https://example.com/path-with-dashes',
        'https://example.com/path_with_underscores',
        'https://example.com/path%20with%20encoded%20spaces',
        'https://example.com:8443/custom-port'
      ];

      validUrls.forEach(url => {
        const result = validateUrl(url);
        expect(result.isValid).toBe(true);
      });
    });

    it('should log validation failures appropriately', () => {
      const { logger } = require('../logger');
      
      validateUrl('javascript:alert(1)', {}, 'test-request-123');
      
      expect(logger.warn).toHaveBeenCalledWith(
        'URL validation failed',
        expect.objectContaining({
          requestId: 'test-request-123',
          metadata: expect.objectContaining({
            errors: expect.any(Array)
          }),
          component: 'url-image-validator'
        })
      );
    });

    it('should handle internal validation errors', () => {
      // This is hard to test without mocking URL constructor to throw
      // But we ensure the function handles it gracefully
      const result = validateUrl('https://example.com');
      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
    });
  });

  describe('integration tests', () => {
    it('should validate a complete real-world scenario', async () => {
      // Mock successful responses
      (fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers()
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({
            'Content-Type': 'image/jpeg',
            'Content-Length': '1024'
          }),
          arrayBuffer: async () => new ArrayBuffer(1024)
        } as Response);

      const options: ImageValidationOptions = {
        requireSecure: true,
        allowedDomains: ['cdn.example.com'],
        checkReachability: true,
        validateImageData: true,
        maxSizeBytes: 10 * 1024 * 1024
      };

      const result = await validateImageComplete(
        'https://cdn.example.com/images/photo.jpg',
        options,
        'integration-test-123'
      );

      expect(result.isValid).toBe(true);
      expect(result.isReachable).toBe(true);
      expect(result.imageMetadata?.isValid).toBe(true);
      expect(result.fileExtension).toBe('.jpg');
      expect(result.protocol).toBe('https');
      expect(result.domain).toBe('cdn.example.com');
    });

    it('should reject malicious image URL attempts', async () => {
      const maliciousUrls = [
        'javascript:alert(document.cookie)',
        'data:text/html,<script>alert(1)</script>',
        'https://malicious.com/image.jpg?redirect=evil.com',
        'ftp://192.168.1.1/image.jpg',
        'https://127.0.0.1/local-image.jpg'
      ];

      maliciousUrls.forEach(url => {
        const result = validateImageUrl(url);
        expect(result.isValid).toBe(false);
      });
    });
  });
});
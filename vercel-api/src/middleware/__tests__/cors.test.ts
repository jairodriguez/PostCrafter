import { configureCors, setSecurityHeaders, rateLimitByIP, logRequest } from '../cors';

// Mock environment variables
const mockEnvVars = {
  WORDPRESS_URL: 'https://example.com',
  WORDPRESS_USERNAME: 'testuser',
  WORDPRESS_APP_PASSWORD: 'testpass',
  GPT_API_KEY: 'sk-test-api-key-123456789',
  JWT_SECRET: 'test-jwt-secret',
  NODE_ENV: 'test' as const,
  API_RATE_LIMIT_WINDOW_MS: 60000,
  API_RATE_LIMIT_MAX_REQUESTS: 100,
  WORDPRESS_TIMEOUT_MS: 10000,
  LOG_LEVEL: 'info' as const,
  CORS_ORIGINS: ['https://custom-domain.com'],
  MAX_IMAGE_SIZE_MB: 10,
  ENABLE_DEBUG_LOGGING: false,
};

// Mock the env module
jest.mock('../../utils/env', () => ({
  getEnvVars: jest.fn(() => mockEnvVars),
}));

describe('CORS and Security Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      method: 'POST',
      url: '/api/publish',
      headers: {},
      connection: {
        remoteAddress: '127.0.0.1',
      },
    };
    mockRes = {
      setHeader: jest.fn(),
      removeHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      end: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('configureCors', () => {
    it('should allow requests from ChatGPT domains', () => {
      mockReq.headers.origin = 'https://chat.openai.com';

      configureCors(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://chat.openai.com');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Request-ID');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Max-Age', '86400');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow requests from ChatGPT.com domain', () => {
      mockReq.headers.origin = 'https://chatgpt.com';

      configureCors(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://chatgpt.com');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow requests from localhost for development', () => {
      mockReq.headers.origin = 'http://localhost:3000';

      configureCors(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow requests from Vercel preview domains', () => {
      mockReq.headers.origin = 'https://my-app.vercel.app';

      configureCors(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://my-app.vercel.app');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow requests from custom domains in environment', () => {
      mockReq.headers.origin = 'https://custom-domain.com';

      configureCors(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://custom-domain.com');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject requests from unauthorized origins', () => {
      mockReq.headers.origin = 'https://malicious-site.com';

      configureCors(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'null');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle preflight OPTIONS requests', () => {
      mockReq.method = 'OPTIONS';
      mockReq.headers.origin = 'https://chat.openai.com';

      configureCors(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.end).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle requests without origin header', () => {
      configureCors(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'null');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('setSecurityHeaders', () => {
    it('should set all required security headers', () => {
      setSecurityHeaders(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining("default-src 'self'")
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Permissions-Policy',
        expect.stringContaining('geolocation=()')
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Expires', '0');
      expect(mockRes.removeHeader).toHaveBeenCalledWith('X-Powered-By');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('rateLimitByIP', () => {
    it('should log rate limit information', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      rateLimitByIP(mockReq, mockRes, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[RATE_LIMIT\] IP: 127\.0\.0\.1, Endpoint: POST \/api\/publish/)
      );
      expect(mockNext).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle different IP sources', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Test x-forwarded-for header
      mockReq.headers['x-forwarded-for'] = '192.168.1.1';
      rateLimitByIP(mockReq, mockRes, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[RATE_LIMIT\] IP: 192\.168\.1\.1/)
      );

      // Test x-real-ip header
      mockReq.headers['x-real-ip'] = '10.0.0.1';
      delete mockReq.headers['x-forwarded-for'];
      rateLimitByIP(mockReq, mockRes, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[RATE_LIMIT\] IP: 10\.0\.0\.1/)
      );

      consoleSpy.mockRestore();
    });

    it('should handle array of IPs in x-forwarded-for', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockReq.headers['x-forwarded-for'] = ['192.168.1.1', '10.0.0.1'];
      rateLimitByIP(mockReq, mockRes, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[RATE_LIMIT\] IP: 192\.168\.1\.1/)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('logRequest', () => {
    it('should log request information', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const originalEnd = mockRes.end;

      logRequest(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();

      // Simulate response end
      mockRes.end('response data');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[REQUEST\] POST \/api\/publish - IP: 127\.0\.0\.1 - Status: undefined - Duration: \d+ms/)
      );

      consoleSpy.mockRestore();
    });

    it('should handle different user agents', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockReq.headers['user-agent'] = 'Mozilla/5.0 (Test Browser)';
      logRequest(mockReq, mockRes, mockNext);

      // Simulate response end
      mockRes.end();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/UA: Mozilla\/5\.0 \(Test Browser\)/)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Error handling', () => {
    it('should handle CORS configuration errors gracefully', () => {
      const { getEnvVars } = require('../../utils/env');
      getEnvVars.mockImplementation(() => {
        throw new Error('Environment error');
      });

      configureCors(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();

      // Restore mock
      getEnvVars.mockImplementation(() => mockEnvVars);
    });

    it('should handle security headers errors gracefully', () => {
      mockRes.setHeader.mockImplementation(() => {
        throw new Error('Header error');
      });

      setSecurityHeaders(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle rate limiting errors gracefully', () => {
      const { getEnvVars } = require('../../utils/env');
      getEnvVars.mockImplementation(() => {
        throw new Error('Environment error');
      });

      rateLimitByIP(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();

      // Restore mock
      getEnvVars.mockImplementation(() => mockEnvVars);
    });
  });
}); 
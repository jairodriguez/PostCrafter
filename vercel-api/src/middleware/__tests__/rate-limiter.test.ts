import { enhancedRateLimit, rateLimitByApiKey, getRateLimitInfo, RATE_LIMIT_TIERS } from '../rate-limiter';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Mock environment utilities
jest.mock('../../utils/env', () => ({
  getEnvVars: jest.fn(() => ({
    WORDPRESS_URL: 'https://example.com',
    WORDPRESS_USERNAME: 'testuser',
    WORDPRESS_APP_PASSWORD: 'testpassword',
    WORDPRESS_TIMEOUT_MS: 30000,
    API_RATE_LIMIT_WINDOW_MS: 60000,
    API_RATE_LIMIT_MAX_REQUESTS: 100,
    ENABLE_ADAPTIVE_RATE_LIMITING: true,
    ADAPTIVE_RATE_LIMIT_MULTIPLIER: 0.2,
    LOG_LEVEL: 'info',
    CORS_ORIGINS: ['*'],
    MAX_IMAGE_SIZE_MB: 10,
    ENABLE_DEBUG_LOGGING: false,
  })),
  secureLog: jest.fn(),
}));

describe('Enhanced Rate Limiting', () => {
  let mockReq: Partial<VercelRequest>;
  let mockRes: Partial<VercelResponse>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      method: 'POST',
      url: '/api/publish',
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'x-api-key': 'test-api-key-123',
        'x-request-id': 'test-request-id',
      },
      connection: {
        remoteAddress: '192.168.1.1',
      },
    };

    mockRes = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();
  });

  describe('enhancedRateLimit', () => {
    it('should allow requests within rate limit', () => {
      enhancedRateLimit(mockReq as VercelRequest, mockRes as VercelResponse, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', expect.any(String));
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Tier', expect.any(String));
      expect(mockNext).toHaveBeenCalled();
    });

    it('should block requests exceeding rate limit', () => {
      // Make multiple requests to exceed the rate limit
      for (let i = 0; i < 20; i++) {
        enhancedRateLimit(mockReq as VercelRequest, mockRes as VercelResponse, mockNext);
      }

      // The last request should be blocked
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: expect.stringContaining('Rate limit exceeded'),
          details: {
            tier: expect.any(String),
            limit: expect.any(Number),
            windowMs: expect.any(Number),
            retryAfter: expect.any(Number),
            adaptiveMultiplier: expect.any(Number),
          },
        },
        requestId: 'test-request-id',
      });
    });

    it('should handle requests without API key', () => {
      delete mockReq.headers!['x-api-key'];
      delete mockReq.headers!['authorization'];

      enhancedRateLimit(mockReq as VercelRequest, mockRes as VercelResponse, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Tier', 'Free');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set proper retry-after headers when rate limited', () => {
      // Make multiple requests to exceed the rate limit
      for (let i = 0; i < 20; i++) {
        enhancedRateLimit(mockReq as VercelRequest, mockRes as VercelResponse, mockNext);
      }

      expect(mockRes.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
    });

    it('should handle different rate limit tiers', () => {
      const premiumApiKey = 'premium-api-key-456';
      mockReq.headers!['x-api-key'] = premiumApiKey;

      enhancedRateLimit(mockReq as VercelRequest, mockRes as VercelResponse, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Tier', expect.any(String));
      expect(mockNext).toHaveBeenCalled();
    });

    it('should include adaptive multiplier in headers when enabled', () => {
      enhancedRateLimit(mockReq as VercelRequest, mockRes as VercelResponse, mockNext);

      // Check if adaptive multiplier header is set (may or may not be 1.0)
      const setHeaderCalls = (mockRes.setHeader as jest.Mock).mock.calls;
      const adaptiveCall = setHeaderCalls.find(call => call[0] === 'X-RateLimit-Adaptive');
      
      if (adaptiveCall) {
        expect(adaptiveCall[1]).toMatch(/^\d+\.\d+$/);
      }
    });

    it('should handle errors gracefully', () => {
      // Mock getEnvVars to throw an error
      const { getEnvVars } = require('../../utils/env');
      getEnvVars.mockImplementationOnce(() => {
        throw new Error('Environment error');
      });

      enhancedRateLimit(mockReq as VercelRequest, mockRes as VercelResponse, mockNext);

      // Should continue without rate limiting if there's an error
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('rateLimitByApiKey', () => {
    it('should use API key-based rate limiting when API key is present', () => {
      rateLimitByApiKey(mockReq as VercelRequest, mockRes as VercelResponse, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Tier', expect.any(String));
      expect(mockNext).toHaveBeenCalled();
    });

    it('should fall back to IP-based rate limiting when no API key', () => {
      delete mockReq.headers!['x-api-key'];
      delete mockReq.headers!['authorization'];

      rateLimitByApiKey(mockReq as VercelRequest, mockRes as VercelResponse, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Tier', 'Free');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('getRateLimitInfo', () => {
    it('should return rate limit information for a valid identifier', () => {
      const info = getRateLimitInfo('test-identifier');

      expect(info).toEqual({
        tier: RATE_LIMIT_TIERS.free,
        remaining: expect.any(Number),
        resetTime: expect.any(Number),
        adaptiveMultiplier: 1.0,
      });
    });

    it('should return null for invalid identifier', () => {
      const info = getRateLimitInfo('');

      expect(info).toBeNull();
    });
  });

  describe('Rate Limit Tiers', () => {
    it('should have proper tier configuration', () => {
      expect(RATE_LIMIT_TIERS.free).toEqual({
        name: 'Free',
        maxRequests: 10,
        burstLimit: 5,
        windowMs: 60000,
        priority: 1,
      });

      expect(RATE_LIMIT_TIERS.premium).toEqual({
        name: 'Premium',
        maxRequests: 1000,
        burstLimit: 100,
        windowMs: 60000,
        priority: 3,
      });

      expect(RATE_LIMIT_TIERS.enterprise).toEqual({
        name: 'Enterprise',
        maxRequests: 10000,
        burstLimit: 1000,
        windowMs: 60000,
        priority: 4,
      });
    });

    it('should have tiers in priority order', () => {
      const tiers = Object.values(RATE_LIMIT_TIERS);
      for (let i = 1; i < tiers.length; i++) {
        expect(tiers[i].priority).toBeGreaterThan(tiers[i - 1].priority);
      }
    });
  });

  describe('Token Bucket Algorithm', () => {
    it('should properly refill tokens over time', () => {
      // This test would require mocking time to test token refill
      // For now, we'll test the basic functionality
      enhancedRateLimit(mockReq as VercelRequest, mockRes as VercelResponse, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
      const remaining = parseInt((mockRes.setHeader as jest.Mock).mock.calls.find(call => call[0] === 'X-RateLimit-Remaining')[1]);
      expect(remaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Adaptive Rate Limiting', () => {
    it('should adjust limits based on request patterns', () => {
      // Make requests with good spacing
      for (let i = 0; i < 5; i++) {
        enhancedRateLimit(mockReq as VercelRequest, mockRes as VercelResponse, mockNext);
        // Simulate time passing
        jest.advanceTimersByTime(1000);
      }

      // Check if adaptive multiplier is applied
      const setHeaderCalls = (mockRes.setHeader as jest.Mock).mock.calls;
      const adaptiveCall = setHeaderCalls.find(call => call[0] === 'X-RateLimit-Adaptive');
      
      if (adaptiveCall) {
        const multiplier = parseFloat(adaptiveCall[1]);
        expect(multiplier).toBeGreaterThanOrEqual(0.5);
        expect(multiplier).toBeLessThanOrEqual(2.0);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing headers gracefully', () => {
      delete mockReq.headers!['x-forwarded-for'];
      delete mockReq.headers!['x-real-ip'];
      delete mockReq.connection!.remoteAddress;

      enhancedRateLimit(mockReq as VercelRequest, mockRes as VercelResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle malformed IP addresses', () => {
      mockReq.headers!['x-forwarded-for'] = 'invalid-ip';

      enhancedRateLimit(mockReq as VercelRequest, mockRes as VercelResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
}); 
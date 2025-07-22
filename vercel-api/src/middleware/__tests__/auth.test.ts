import { authenticateApiKey, AuthenticatedRequest } from '../auth';
import { AuthenticationError } from '../../types';

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
  CORS_ORIGINS: ['*'],
  MAX_IMAGE_SIZE_MB: 10,
  ENABLE_DEBUG_LOGGING: false,
};

// Mock the env module
jest.mock('../../utils/env', () => ({
  getEnvVars: jest.fn(() => mockEnvVars),
}));

describe('Authentication Middleware', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      headers: {},
      method: 'POST',
      url: '/api/publish',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('authenticateApiKey', () => {
    it('should authenticate with valid API key in x-api-key header', () => {
      mockReq.headers = {
        'x-api-key': mockEnvVars.GPT_API_KEY,
      };

      authenticateApiKey(mockReq as AuthenticatedRequest, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toEqual({
        apiKey: mockEnvVars.GPT_API_KEY,
        timestamp: expect.any(Number),
      });
    });

    it('should authenticate with valid API key in Authorization header', () => {
      mockReq.headers = {
        authorization: `Bearer ${mockEnvVars.GPT_API_KEY}`,
      };

      authenticateApiKey(mockReq as AuthenticatedRequest, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toEqual({
        apiKey: mockEnvVars.GPT_API_KEY,
        timestamp: expect.any(Number),
      });
    });

    it('should reject request without API key', () => {
      authenticateApiKey(mockReq as AuthenticatedRequest, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'API key is required',
          details: 'Missing API key in request headers',
          timestamp: expect.any(String),
        },
      });
    });

    it('should reject request with empty API key', () => {
      mockReq.headers = {
        'x-api-key': '',
      };

      authenticateApiKey(mockReq as AuthenticatedRequest, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Invalid API key format',
          details: 'API key cannot be empty',
          timestamp: expect.any(String),
        },
      });
    });

    it('should reject request with short API key', () => {
      mockReq.headers = {
        'x-api-key': 'short',
      };

      authenticateApiKey(mockReq as AuthenticatedRequest, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Invalid API key format',
          details: 'API key is too short',
          timestamp: expect.any(String),
        },
      });
    });

    it('should reject request with invalid API key', () => {
      mockReq.headers = {
        'x-api-key': 'invalid-api-key',
      };

      authenticateApiKey(mockReq as AuthenticatedRequest, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Invalid API key',
          details: 'API key does not match expected value',
          timestamp: expect.any(String),
        },
      });
    });

    it('should handle array of API keys in headers', () => {
      mockReq.headers = {
        'x-api-key': [mockEnvVars.GPT_API_KEY],
      };

      authenticateApiKey(mockReq as AuthenticatedRequest, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toEqual({
        apiKey: mockEnvVars.GPT_API_KEY,
        timestamp: expect.any(Number),
      });
    });

    it('should handle Bearer token format', () => {
      mockReq.headers = {
        authorization: `Bearer ${mockEnvVars.GPT_API_KEY}`,
      };

      authenticateApiKey(mockReq as AuthenticatedRequest, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toEqual({
        apiKey: mockEnvVars.GPT_API_KEY,
        timestamp: expect.any(Number),
      });
    });

    it('should handle Bearer token with extra spaces', () => {
      mockReq.headers = {
        authorization: `  Bearer   ${mockEnvVars.GPT_API_KEY}  `,
      };

      authenticateApiKey(mockReq as AuthenticatedRequest, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toEqual({
        apiKey: mockEnvVars.GPT_API_KEY,
        timestamp: expect.any(Number),
      });
    });

    it('should handle case-insensitive Bearer prefix', () => {
      mockReq.headers = {
        authorization: `bearer ${mockEnvVars.GPT_API_KEY}`,
      };

      authenticateApiKey(mockReq as AuthenticatedRequest, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toEqual({
        apiKey: mockEnvVars.GPT_API_KEY,
        timestamp: expect.any(Number),
      });
    });
  });

  describe('Error handling', () => {
    it('should handle unexpected errors gracefully', () => {
      // Mock getEnvVars to throw an error
      const { getEnvVars } = require('../../utils/env');
      getEnvVars.mockImplementation(() => {
        throw new Error('Environment error');
      });

      mockReq.headers = {
        'x-api-key': mockEnvVars.GPT_API_KEY,
      };

      authenticateApiKey(mockReq as AuthenticatedRequest, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Authentication failed due to server error',
          details: 'Environment error',
          timestamp: expect.any(String),
        },
      });

      // Restore mock
      getEnvVars.mockImplementation(() => mockEnvVars);
    });
  });
}); 
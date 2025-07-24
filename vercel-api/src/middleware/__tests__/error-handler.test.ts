import { jest } from '@jest/globals';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import ErrorHandler, { errorHandlerMiddleware, setupGlobalErrorHandlers } from '../error-handler';
import { 
  ApiError, 
  ValidationError, 
  AuthenticationError, 
  WordPressApiError, 
  RateLimitError 
} from '../../types';

// Mock dependencies
jest.mock('../../utils/env', () => ({
  secureLog: jest.fn()
}));

jest.mock('../../utils/monitoring', () => ({
  default: {
    recordAuthFailure: jest.fn(),
    recordRateLimitViolation: jest.fn(),
    recordMaliciousContent: jest.fn()
  }
}));

describe('ErrorHandler', () => {
  let mockRequest: Partial<VercelRequest>;
  let mockResponse: Partial<VercelResponse>;

  beforeEach(() => {
    mockRequest = {
      method: 'POST',
      url: '/api/test',
      headers: {
        'user-agent': 'test-agent',
        'x-forwarded-for': '192.168.1.1'
      },
      connection: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis()
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should handle ApiError correctly', () => {
      const error = new ApiError('TEST_ERROR', 'Test error message', 400, 'Test details');
      
      ErrorHandler.handle(error, mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'TEST_ERROR',
          message: 'Test error message',
          details: 'Test details',
          timestamp: expect.any(String),
          requestId: expect.any(String)
        },
        success: false
      });
    });

    it('should handle ValidationError correctly', () => {
      const error = new ValidationError('Invalid input');
      
      ErrorHandler.handle(error, mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Invalid input'
          }),
          success: false
        })
      );
    });

    it('should handle AuthenticationError correctly', () => {
      const error = new AuthenticationError('Invalid credentials');
      
      ErrorHandler.handle(error, mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'AUTHENTICATION_ERROR',
            message: 'Invalid credentials'
          }),
          success: false
        })
      );
    });

    it('should handle RateLimitError correctly', () => {
      const error = new RateLimitError('Too many requests');
      
      ErrorHandler.handle(error, mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'RATE_LIMIT_ERROR',
            message: 'Too many requests'
          }),
          success: false
        })
      );
    });

    it('should handle WordPressApiError correctly', () => {
      const error = new WordPressApiError('WordPress connection failed');
      
      ErrorHandler.handle(error, mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'WORDPRESS_API_ERROR',
            message: 'WordPress connection failed'
          }),
          success: false
        })
      );
    });

    it('should handle JSON syntax errors', () => {
      const error = new SyntaxError('Unexpected token in JSON at position 0');
      
      ErrorHandler.handle(error, mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INVALID_JSON',
            message: 'Invalid JSON in request body'
          }),
          success: false
        })
      );
    });

    it('should handle timeout errors', () => {
      const error = new Error('Request timeout occurred');
      
      ErrorHandler.handle(error, mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(408);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'TIMEOUT_ERROR',
            message: 'Request timeout'
          }),
          success: false
        })
      );
    });

    it('should handle network errors', () => {
      const error = new Error('ENOTFOUND example.com');
      
      ErrorHandler.handle(error, mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'NETWORK_ERROR',
            message: 'Network connection failed'
          }),
          success: false
        })
      );
    });

    it('should handle generic errors', () => {
      const error = new Error('Unknown error occurred');
      
      ErrorHandler.handle(error, mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred'
          }),
          success: false
        })
      );
    });

    it('should set security headers', () => {
      const error = new Error('Test error');
      
      ErrorHandler.handle(error, mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
    });

    it('should extract client IP correctly', () => {
      const mockReq = {
        ...mockRequest,
        headers: {
          'x-forwarded-for': ['192.168.1.1', '10.0.0.1'],
          'user-agent': 'test-agent'
        }
      };
      
      const error = new Error('Test error');
      ErrorHandler.handle(error, mockReq as VercelRequest, mockResponse as VercelResponse);

      // Should handle array of IPs and use the first one
      expect(mockResponse.status).toHaveBeenCalled();
    });
  });

  describe('asyncWrapper', () => {
    it('should catch async errors and handle them', async () => {
      const asyncFunction = jest.fn().mockRejectedValue(new Error('Async error'));
      const wrappedFunction = ErrorHandler.asyncWrapper(asyncFunction);

      await wrappedFunction(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR'
          }),
          success: false
        })
      );
    });

    it('should pass through successful async functions', async () => {
      const asyncFunction = jest.fn().mockResolvedValue(undefined);
      const wrappedFunction = ErrorHandler.asyncWrapper(asyncFunction);

      await wrappedFunction(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(asyncFunction).toHaveBeenCalledWith(mockRequest, mockResponse);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('formatValidationError', () => {
    it('should format string errors', () => {
      const error = ErrorHandler.formatValidationError('Single error');
      
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Validation failed');
      expect(error.details).toBe('Single error');
    });

    it('should format array of errors', () => {
      const errors = ['Error 1', 'Error 2', 'Error 3'];
      const error = ErrorHandler.formatValidationError(errors);
      
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Validation failed');
      expect(error.details).toBe('Error 1, Error 2, Error 3');
    });
  });

  describe('createWordPressError', () => {
    it('should create WordPress error with context', () => {
      const error = ErrorHandler.createWordPressError(
        'Connection failed',
        502,
        'REST_API_ERROR',
        true
      );
      
      expect(error).toBeInstanceOf(WordPressApiError);
      expect(error.message).toBe('Connection failed');
      expect(error.details).toBe('WordPress API error: REST_API_ERROR');
    });
  });

  describe('setRequestId', () => {
    it('should set and use request ID', () => {
      ErrorHandler.setRequestId('test-request-123');
      
      const error = new Error('Test error');
      ErrorHandler.handle(error, mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            requestId: 'test-request-123'
          })
        })
      );
    });
  });

  describe('errorHandlerMiddleware', () => {
    it('should be a wrapper around ErrorHandler.handle', () => {
      const error = new Error('Middleware test');
      
      errorHandlerMiddleware(error, mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe('setupGlobalErrorHandlers', () => {
    let originalProcessOn: typeof process.on;

    beforeEach(() => {
      originalProcessOn = process.on;
      process.on = jest.fn();
    });

    afterEach(() => {
      process.on = originalProcessOn;
    });

    it('should set up global error handlers', () => {
      setupGlobalErrorHandlers();

      expect(process.on).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
      expect(process.on).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
    });
  });

  describe('getStatusCode', () => {
    it('should return correct status codes for different error types', () => {
      const tests = [
        { error: new ValidationError('test'), expectedStatus: 400 },
        { error: new AuthenticationError('test'), expectedStatus: 401 },
        { error: new RateLimitError('test'), expectedStatus: 429 },
        { error: new WordPressApiError('test'), expectedStatus: 500 },
        { error: new Error('not found'), expectedStatus: 404 },
        { error: new Error('forbidden'), expectedStatus: 403 },
        { error: new Error('unauthorized'), expectedStatus: 401 },
        { error: new Error('timeout'), expectedStatus: 408 },
        { error: new Error('rate limit'), expectedStatus: 429 },
        { error: new Error('generic error'), expectedStatus: 500 }
      ];

      tests.forEach(({ error, expectedStatus }) => {
        ErrorHandler.handle(error, mockRequest as VercelRequest, mockResponse as VercelResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(expectedStatus);
        
        // Reset mocks for next test
        jest.clearAllMocks();
      });
    });
  });
});
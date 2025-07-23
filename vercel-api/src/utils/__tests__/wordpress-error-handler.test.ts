import { WordPressErrorHandler, createWordPressErrorHandler } from '../wordpress-error-handler';
import { WordPressError, WordPressErrorType } from '../../types';

describe('WordPressErrorHandler', () => {
  let errorHandler: WordPressErrorHandler;

  beforeEach(() => {
    errorHandler = createWordPressErrorHandler();
  });

  describe('Error Categorization', () => {
    it('should handle WordPress-specific errors', () => {
      const wordPressError = new WordPressError(
        WordPressErrorType.AUTHENTICATION_FAILED,
        'Authentication failed',
        401,
        'Invalid credentials'
      );

      const result = errorHandler.handleError(wordPressError);
      expect(result).toBe(wordPressError);
    });

    it('should handle HTTP 400 errors', () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'Bad request' }
        }
      };

      const result = errorHandler.handleError(error);
      expect(result.code).toBe(WordPressErrorType.VALIDATION_ERROR);
      expect(result.statusCode).toBe(400);
      expect(result.retryable).toBe(false);
    });

    it('should handle HTTP 401 errors', () => {
      const error = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' }
        }
      };

      const result = errorHandler.handleError(error);
      expect(result.code).toBe(WordPressErrorType.AUTHENTICATION_FAILED);
      expect(result.statusCode).toBe(401);
      expect(result.retryable).toBe(false);
    });

    it('should handle HTTP 403 errors', () => {
      const error = {
        response: {
          status: 403,
          data: { message: 'Forbidden' }
        }
      };

      const result = errorHandler.handleError(error);
      expect(result.code).toBe(WordPressErrorType.INSUFFICIENT_PERMISSIONS);
      expect(result.statusCode).toBe(403);
      expect(result.retryable).toBe(false);
    });

    it('should handle HTTP 404 errors', () => {
      const error = {
        response: {
          status: 404,
          data: { message: 'Not found' }
        }
      };

      const result = errorHandler.handleError(error);
      expect(result.code).toBe(WordPressErrorType.RESOURCE_NOT_FOUND);
      expect(result.statusCode).toBe(404);
      expect(result.retryable).toBe(false);
    });

    it('should handle HTTP 408 errors', () => {
      const error = {
        response: {
          status: 408,
          data: { message: 'Request timeout' }
        }
      };

      const result = errorHandler.handleError(error);
      expect(result.code).toBe(WordPressErrorType.TIMEOUT_ERROR);
      expect(result.statusCode).toBe(408);
      expect(result.retryable).toBe(true);
    });

    it('should handle HTTP 429 errors', () => {
      const error = {
        response: {
          status: 429,
          data: { message: 'Rate limit exceeded' }
        }
      };

      const result = errorHandler.handleError(error);
      expect(result.code).toBe(WordPressErrorType.RATE_LIMIT_EXCEEDED);
      expect(result.statusCode).toBe(429);
      expect(result.retryable).toBe(true);
    });

    it('should handle HTTP 500 errors', () => {
      const error = {
        response: {
          status: 500,
          data: { message: 'Internal server error' }
        }
      };

      const result = errorHandler.handleError(error);
      expect(result.code).toBe(WordPressErrorType.SERVER_ERROR);
      expect(result.statusCode).toBe(500);
      expect(result.retryable).toBe(true);
    });

    it('should handle HTTP 502 errors', () => {
      const error = {
        response: {
          status: 502,
          data: { message: 'Bad gateway' }
        }
      };

      const result = errorHandler.handleError(error);
      expect(result.code).toBe(WordPressErrorType.BAD_GATEWAY);
      expect(result.statusCode).toBe(502);
      expect(result.retryable).toBe(true);
    });

    it('should handle HTTP 503 errors', () => {
      const error = {
        response: {
          status: 503,
          data: { message: 'Service unavailable' }
        }
      };

      const result = errorHandler.handleError(error);
      expect(result.code).toBe(WordPressErrorType.SERVICE_UNAVAILABLE);
      expect(result.statusCode).toBe(503);
      expect(result.retryable).toBe(true);
    });

    it('should handle HTTP 504 errors', () => {
      const error = {
        response: {
          status: 504,
          data: { message: 'Gateway timeout' }
        }
      };

      const result = errorHandler.handleError(error);
      expect(result.code).toBe(WordPressErrorType.TIMEOUT_ERROR);
      expect(result.statusCode).toBe(504);
      expect(result.retryable).toBe(true);
    });
  });

  describe('WordPress API Error Handling', () => {
    it('should handle WordPress validation errors', () => {
      const error = {
        response: {
          status: 400,
          data: {
            code: 'rest_invalid_param',
            message: 'Invalid parameter',
            additional_errors: [
              { code: 'invalid_title', message: 'Title is required' },
              { code: 'invalid_content', message: 'Content is required' }
            ]
          }
        }
      };

      const result = errorHandler.handleError(error);
      expect(result.code).toBe(WordPressErrorType.VALIDATION_ERROR);
      expect(result.details).toContain('invalid_title: Title is required');
      expect(result.details).toContain('invalid_content: Content is required');
      expect(result.retryable).toBe(false);
    });

    it('should handle WordPress missing parameter errors', () => {
      const error = {
        response: {
          status: 400,
          data: {
            code: 'rest_missing_param',
            message: 'Missing required parameter',
            details: 'title parameter is required'
          }
        }
      };

      const result = errorHandler.handleError(error);
      expect(result.code).toBe(WordPressErrorType.VALIDATION_ERROR);
      expect(result.retryable).toBe(false);
    });

    it('should handle WordPress invalid JSON errors', () => {
      const error = {
        response: {
          status: 400,
          data: {
            code: 'rest_invalid_json',
            message: 'Invalid JSON in request body'
          }
        }
      };

      const result = errorHandler.handleError(error);
      expect(result.code).toBe(WordPressErrorType.VALIDATION_ERROR);
      expect(result.retryable).toBe(false);
    });

    it('should handle WordPress cannot create errors', () => {
      const error = {
        response: {
          status: 400,
          data: {
            code: 'rest_cannot_create',
            message: 'Cannot create resource'
          }
        }
      };

      const result = errorHandler.handleError(error);
      expect(result.code).toBe(WordPressErrorType.VALIDATION_ERROR);
      expect(result.retryable).toBe(false);
    });
  });

  describe('Network Error Handling', () => {
    it('should handle timeout errors', () => {
      const error = {
        code: 'ECONNABORTED',
        message: 'Request timeout'
      };

      const result = errorHandler.handleError(error);
      expect(result.code).toBe(WordPressErrorType.TIMEOUT_ERROR);
      expect(result.statusCode).toBe(408);
      expect(result.retryable).toBe(true);
    });

    it('should handle DNS errors', () => {
      const error = {
        code: 'ENOTFOUND',
        message: 'DNS resolution failed'
      };

      const result = errorHandler.handleError(error);
      expect(result.code).toBe(WordPressErrorType.DNS_ERROR);
      expect(result.statusCode).toBe(503);
      expect(result.retryable).toBe(true);
    });

    it('should handle connection refused errors', () => {
      const error = {
        code: 'ECONNREFUSED',
        message: 'Connection refused'
      };

      const result = errorHandler.handleError(error);
      expect(result.code).toBe(WordPressErrorType.CONNECTION_ERROR);
      expect(result.statusCode).toBe(503);
      expect(result.retryable).toBe(true);
    });

    it('should handle connection reset errors', () => {
      const error = {
        code: 'ECONNRESET',
        message: 'Connection reset'
      };

      const result = errorHandler.handleError(error);
      expect(result.code).toBe(WordPressErrorType.CONNECTION_ERROR);
      expect(result.statusCode).toBe(503);
      expect(result.retryable).toBe(true);
    });

    it('should handle SSL certificate errors', () => {
      const error = {
        code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
        message: 'SSL certificate error'
      };

      const result = errorHandler.handleError(error);
      expect(result.code).toBe(WordPressErrorType.SSL_ERROR);
      expect(result.statusCode).toBe(495);
      expect(result.retryable).toBe(false);
    });
  });

  describe('Validation Error Handling', () => {
    it('should handle validation errors', () => {
      const error = {
        name: 'ValidationError',
        message: 'Validation failed'
      };

      const result = errorHandler.handleError(error);
      expect(result.code).toBe(WordPressErrorType.VALIDATION_ERROR);
      expect(result.statusCode).toBe(400);
      expect(result.retryable).toBe(false);
    });
  });

  describe('Unknown Error Handling', () => {
    it('should handle unknown errors', () => {
      const error = {
        message: 'Unknown error occurred'
      };

      const result = errorHandler.handleError(error);
      expect(result.code).toBe(WordPressErrorType.UNKNOWN_ERROR);
      expect(result.statusCode).toBe(500);
      expect(result.retryable).toBe(true);
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit breaker after threshold errors', () => {
      const error = {
        response: { status: 500, data: { message: 'Server error' } }
      };

      // Trigger errors up to threshold
      for (let i = 0; i < 5; i++) {
        errorHandler.handleError(error);
      }

      expect(errorHandler.isCircuitBreakerOpen()).toBe(true);
    });

    it('should move to half-open state after timeout', () => {
      const error = {
        response: { status: 500, data: { message: 'Server error' } }
      };

      // Open circuit breaker
      for (let i = 0; i < 5; i++) {
        errorHandler.handleError(error);
      }

      // Mock time passing
      const status = errorHandler.getCircuitBreakerStatus();
      if (status.state === 'OPEN' && status.openTime) {
        // Simulate time passing by directly manipulating the internal state
        // This is a test-only approach
        const handler = errorHandler as any;
        handler.circuitBreakerOpenTime = Date.now() - 31000; // 31 seconds ago
        
        expect(errorHandler.isCircuitBreakerOpen()).toBe(false);
      }
    });

    it('should close circuit breaker after successful request', () => {
      const error = {
        response: { status: 500, data: { message: 'Server error' } }
      };

      // Open circuit breaker
      for (let i = 0; i < 5; i++) {
        errorHandler.handleError(error);
      }

      // Move to half-open
      const handler = errorHandler as any;
      handler.circuitBreakerOpenTime = Date.now() - 31000;
      handler.circuitBreakerState = 'HALF_OPEN';

      // Record success
      errorHandler.recordSuccess();

      expect(errorHandler.isCircuitBreakerOpen()).toBe(false);
    });

    it('should reset circuit breaker', () => {
      const error = {
        response: { status: 500, data: { message: 'Server error' } }
      };

      // Open circuit breaker
      for (let i = 0; i < 5; i++) {
        errorHandler.handleError(error);
      }

      errorHandler.resetCircuitBreaker();

      expect(errorHandler.isCircuitBreakerOpen()).toBe(false);
      expect(errorHandler.getCircuitBreakerStatus().errorCount).toBe(0);
    });
  });

  describe('Retry Logic', () => {
    it('should identify retryable errors', () => {
      const retryableError = new WordPressError(
        WordPressErrorType.SERVER_ERROR,
        'Server error',
        500,
        'Internal server error',
        undefined,
        true
      );

      expect(errorHandler.shouldRetry(retryableError)).toBe(true);
    });

    it('should not retry non-retryable errors', () => {
      const nonRetryableError = new WordPressError(
        WordPressErrorType.AUTHENTICATION_FAILED,
        'Authentication failed',
        401,
        'Invalid credentials',
        undefined,
        false
      );

      expect(errorHandler.shouldRetry(nonRetryableError)).toBe(false);
    });

    it('should not retry when circuit breaker is open', () => {
      const error = {
        response: { status: 500, data: { message: 'Server error' } }
      };

      // Open circuit breaker
      for (let i = 0; i < 5; i++) {
        errorHandler.handleError(error);
      }

      const retryableError = new WordPressError(
        WordPressErrorType.SERVER_ERROR,
        'Server error',
        500,
        'Internal server error',
        undefined,
        true
      );

      expect(errorHandler.shouldRetry(retryableError)).toBe(false);
    });

    it('should calculate retry delay with exponential backoff', () => {
      const delay1 = errorHandler.calculateRetryDelay(1);
      const delay2 = errorHandler.calculateRetryDelay(2);
      const delay3 = errorHandler.calculateRetryDelay(3);

      expect(delay1).toBe(1000); // Base delay
      expect(delay2).toBe(2000); // Base * 2^1
      expect(delay3).toBe(4000); // Base * 2^2
    });

    it('should respect maximum retry delay', () => {
      const delay10 = errorHandler.calculateRetryDelay(10);
      expect(delay10).toBe(10000); // Max delay
    });
  });

  describe('Error Response Creation', () => {
    it('should create proper error response', () => {
      const error = new WordPressError(
        WordPressErrorType.VALIDATION_ERROR,
        'Validation failed',
        400,
        'Invalid input data',
        'validation_error',
        false,
        { field: 'title' }
      );

      const context = {
        requestId: 'test-123',
        endpoint: '/wp/v2/posts',
        method: 'POST'
      };

      const response = errorHandler.createErrorResponse(error, context);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe(WordPressErrorType.VALIDATION_ERROR);
      expect(response.error.message).toBe('Validation failed');
      expect(response.error.statusCode).toBe(400);
      expect(response.error.retryable).toBe(false);
      expect(response.error.context).toEqual(context);
      expect(response.error.requestId).toBe('test-123');
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', () => {
      const customHandler = createWordPressErrorHandler({
        enableDetailedLogging: false,
        enableErrorTracking: false,
        enableRetryLogic: false,
        enableCircuitBreaker: false,
        retryConfig: {
          maxRetries: 5,
          retryDelay: 2000,
          backoffMultiplier: 3,
          maxRetryDelay: 15000,
          retryableStatusCodes: [500],
          retryableErrorCodes: [WordPressErrorType.SERVER_ERROR]
        },
        errorThreshold: 10,
        errorWindowMs: 120000
      });

      const retryConfig = customHandler.getRetryConfig();
      expect(retryConfig.maxRetries).toBe(5);
      expect(retryConfig.retryDelay).toBe(2000);
      expect(retryConfig.backoffMultiplier).toBe(3);
      expect(retryConfig.maxRetryDelay).toBe(15000);
    });

    it('should get retry configuration', () => {
      const retryConfig = errorHandler.getRetryConfig();
      expect(retryConfig.maxRetries).toBe(3);
      expect(retryConfig.retryDelay).toBe(1000);
      expect(retryConfig.backoffMultiplier).toBe(2);
      expect(retryConfig.maxRetryDelay).toBe(10000);
    });
  });

  describe('Context Handling', () => {
    it('should handle error with context', () => {
      const error = {
        response: { status: 500, data: { message: 'Server error' } }
      };

      const context = {
        requestId: 'test-123',
        endpoint: '/wp/v2/posts',
        method: 'POST',
        userId: 'user-456'
      };

      const result = errorHandler.handleError(error, context);
      expect(result.context?.requestId).toBe('test-123');
      expect(result.context?.endpoint).toBe('/wp/v2/posts');
      expect(result.context?.method).toBe('POST');
      expect(result.context?.userId).toBe('user-456');
    });
  });
}); 
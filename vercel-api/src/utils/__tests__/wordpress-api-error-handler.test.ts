import { jest } from '@jest/globals';
import {
  WordPressAPIErrorHandler,
  WordPressErrorCategory,
  WordPressErrorSeverity,
  getWordPressErrorHandler,
  wordPressErrorHandler
} from '../wordpress-api-error-handler';
import { WordPressErrorContext } from '../../types';

// Mock dependencies
jest.mock('../logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../env', () => ({
  getEnvVars: jest.fn(() => ({
    WORDPRESS_TIMEOUT_MS: 30000,
    ENABLE_DEBUG_LOGGING: true
  }))
}));

describe('WordPressAPIErrorHandler', () => {
  let handler: WordPressAPIErrorHandler;
  let mockLogger: any;
  let mockContext: WordPressErrorContext;

  beforeEach(() => {
    const { logger: loggerMock } = require('../logger');
    mockLogger = loggerMock;

    handler = new WordPressAPIErrorHandler();
    mockContext = {
      requestId: 'test-request-123',
      endpoint: '/wp/v2/posts',
      method: 'POST',
      attempt: 0,
      statusCode: 500
    };

    jest.clearAllMocks();
  });

  describe('error classification', () => {
    describe('HTTP status code classification', () => {
      it('should classify 400 errors as validation', () => {
        const error = { message: 'Invalid parameter' };
        const classification = handler.classifyError(error, 400);

        expect(classification.category).toBe(WordPressErrorCategory.VALIDATION);
        expect(classification.severity).toBe(WordPressErrorSeverity.MEDIUM);
        expect(classification.retryable).toBe(false);
        expect(classification.userMessage).toBe('Invalid request data');
      });

      it('should classify 401 errors as authentication', () => {
        const error = { message: 'Unauthorized' };
        const classification = handler.classifyError(error, 401);

        expect(classification.category).toBe(WordPressErrorCategory.AUTHENTICATION);
        expect(classification.severity).toBe(WordPressErrorSeverity.HIGH);
        expect(classification.retryable).toBe(false);
        expect(classification.userMessage).toBe('Authentication failed');
      });

      it('should classify 403 errors as authorization', () => {
        const error = { message: 'Forbidden' };
        const classification = handler.classifyError(error, 403);

        expect(classification.category).toBe(WordPressErrorCategory.AUTHORIZATION);
        expect(classification.severity).toBe(WordPressErrorSeverity.HIGH);
        expect(classification.retryable).toBe(false);
        expect(classification.userMessage).toBe('Access denied');
      });

      it('should classify 404 errors as not found', () => {
        const error = { message: 'Not found' };
        const classification = handler.classifyError(error, 404);

        expect(classification.category).toBe(WordPressErrorCategory.NOT_FOUND);
        expect(classification.severity).toBe(WordPressErrorSeverity.MEDIUM);
        expect(classification.retryable).toBe(false);
        expect(classification.userMessage).toBe('Resource not found');
      });

      it('should classify 429 errors as rate limit', () => {
        const error = { message: 'Too many requests' };
        const classification = handler.classifyError(error, 429);

        expect(classification.category).toBe(WordPressErrorCategory.RATE_LIMIT);
        expect(classification.severity).toBe(WordPressErrorSeverity.MEDIUM);
        expect(classification.retryable).toBe(true);
        expect(classification.userMessage).toBe('Too many requests');
      });

      it('should classify 5xx errors as server errors', () => {
        const error = { message: 'Internal server error' };
        
        [500, 502, 503, 504].forEach(statusCode => {
          const classification = handler.classifyError(error, statusCode);

          expect(classification.category).toBe(WordPressErrorCategory.SERVER_ERROR);
          expect(classification.severity).toBe(WordPressErrorSeverity.HIGH);
          expect(classification.retryable).toBe(true);
          expect(classification.userMessage).toBe('Server error occurred');
        });
      });
    });

    describe('WordPress error code classification', () => {
      it('should classify authentication error codes', () => {
        const authCodes = ['rest_invalid_username', 'rest_invalid_email', 'incorrect_password'];
        
        authCodes.forEach(code => {
          const error = { code };
          const classification = handler.classifyError(error);

          expect(classification.category).toBe(WordPressErrorCategory.AUTHENTICATION);
          expect(classification.severity).toBe(WordPressErrorSeverity.HIGH);
          expect(classification.retryable).toBe(false);
        });
      });

      it('should classify authorization error codes', () => {
        const authzCodes = ['rest_forbidden', 'rest_cannot_create', 'rest_cannot_edit', 'rest_cannot_delete'];
        
        authzCodes.forEach(code => {
          const error = { code };
          const classification = handler.classifyError(error);

          expect(classification.category).toBe(WordPressErrorCategory.AUTHORIZATION);
          expect(classification.severity).toBe(WordPressErrorSeverity.HIGH);
          expect(classification.retryable).toBe(false);
        });
      });

      it('should classify validation error codes', () => {
        const validationCodes = ['rest_invalid_param', 'rest_missing_callback_param', 'rest_invalid_json'];
        
        validationCodes.forEach(code => {
          const error = { code };
          const classification = handler.classifyError(error);

          expect(classification.category).toBe(WordPressErrorCategory.VALIDATION);
          expect(classification.severity).toBe(WordPressErrorSeverity.MEDIUM);
          expect(classification.retryable).toBe(false);
        });
      });

      it('should classify not found error codes', () => {
        const notFoundCodes = ['rest_post_invalid_id', 'rest_user_invalid_id', 'rest_term_invalid_id'];
        
        notFoundCodes.forEach(code => {
          const error = { code };
          const classification = handler.classifyError(error);

          expect(classification.category).toBe(WordPressErrorCategory.NOT_FOUND);
          expect(classification.severity).toBe(WordPressErrorSeverity.MEDIUM);
          expect(classification.retryable).toBe(false);
        });
      });

      it('should classify duplicate resource errors', () => {
        const duplicateCodes = ['rest_duplicate_term', 'rest_term_exists'];
        
        duplicateCodes.forEach(code => {
          const error = { code };
          const classification = handler.classifyError(error);

          expect(classification.category).toBe(WordPressErrorCategory.VALIDATION);
          expect(classification.severity).toBe(WordPressErrorSeverity.LOW);
          expect(classification.retryable).toBe(false);
        });
      });
    });

    describe('message-based classification', () => {
      it('should classify timeout errors', () => {
        const timeoutMessages = ['Request timeout', 'ETIMEDOUT', 'Operation timed out'];
        
        timeoutMessages.forEach(message => {
          const error = { message };
          const classification = handler.classifyError(error);

          expect(classification.category).toBe(WordPressErrorCategory.TIMEOUT);
          expect(classification.severity).toBe(WordPressErrorSeverity.MEDIUM);
          expect(classification.retryable).toBe(true);
        });
      });

      it('should classify network errors', () => {
        const networkMessages = ['ECONNREFUSED', 'ENOTFOUND', 'Network error'];
        
        networkMessages.forEach(message => {
          const error = { message };
          const classification = handler.classifyError(error);

          expect(classification.category).toBe(WordPressErrorCategory.NETWORK_ERROR);
          expect(classification.severity).toBe(WordPressErrorSeverity.HIGH);
          expect(classification.retryable).toBe(true);
        });
      });

      it('should classify plugin errors', () => {
        const pluginMessages = ['Plugin error occurred', 'plugin_error_code'];
        
        pluginMessages.forEach(message => {
          const error = { message };
          const classification = handler.classifyError(error);

          expect(classification.category).toBe(WordPressErrorCategory.PLUGIN_ERROR);
          expect(classification.severity).toBe(WordPressErrorSeverity.MEDIUM);
          expect(classification.retryable).toBe(false);
        });
      });

      it('should classify database errors', () => {
        const dbMessages = ['Database connection error', 'MySQL error', 'SQL syntax error'];
        
        dbMessages.forEach(message => {
          const error = { message };
          const classification = handler.classifyError(error);

          expect(classification.category).toBe(WordPressErrorCategory.DATABASE_ERROR);
          expect(classification.severity).toBe(WordPressErrorSeverity.CRITICAL);
          expect(classification.retryable).toBe(false);
        });
      });

      it('should classify unknown errors', () => {
        const error = { message: 'Some unknown error' };
        const classification = handler.classifyError(error);

        expect(classification.category).toBe(WordPressErrorCategory.UNKNOWN);
        expect(classification.severity).toBe(WordPressErrorSeverity.MEDIUM);
        expect(classification.retryable).toBe(false);
        expect(classification.userMessage).toBe('An unexpected error occurred');
      });
    });
  });

  describe('error handling', () => {
    it('should handle non-retryable errors', async () => {
      const error = { message: 'Invalid parameter', code: 'rest_invalid_param' };
      
      const result = await handler.handleError(error, mockContext);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('rest_invalid_param');
      expect(result.error.retryable).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Medium severity WordPress API error',
        expect.any(Object)
      );
    });

    it('should handle retryable errors without operation', async () => {
      const error = { message: 'Server error' };
      mockContext.statusCode = 500;
      
      const result = await handler.handleError(error, mockContext);

      expect(result.success).toBe(false);
      expect(result.error.retryable).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'High severity WordPress API error',
        expect.any(Object)
      );
    });

    it('should attempt retries for retryable errors with operation', async () => {
      const error = { message: 'Timeout error' };
      let attemptCount = 0;
      const operation = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw error;
        }
        return Promise.resolve({ success: true, data: 'success' });
      });

      const result = await handler.handleError(error, mockContext, operation);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'WordPress API retry successful',
        expect.any(Object)
      );
    });

    it('should fail after max retry attempts', async () => {
      const error = { message: 'Persistent server error' };
      mockContext.statusCode = 500;
      const operation = jest.fn().mockRejectedValue(error);

      const result = await handler.handleError(error, mockContext, operation);

      expect(result.success).toBe(false);
      expect(operation).toHaveBeenCalledTimes(3); // Max retry attempts
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Retrying WordPress API operation',
        expect.any(Object)
      );
    });
  });

  describe('retry logic', () => {
    it('should calculate exponential backoff delays', () => {
      const calculateRetryDelay = (handler as any).calculateRetryDelay.bind(handler);
      
      expect(calculateRetryDelay(1)).toBe(1000); // 1000 * 2^0
      expect(calculateRetryDelay(2)).toBe(2000); // 1000 * 2^1
      expect(calculateRetryDelay(3)).toBe(4000); // 1000 * 2^2
    });

    it('should use fixed delay when exponential backoff is disabled', () => {
      handler.updateConfig({ exponentialBackoff: false });
      const calculateRetryDelay = (handler as any).calculateRetryDelay.bind(handler);
      
      expect(calculateRetryDelay(1)).toBe(1000);
      expect(calculateRetryDelay(2)).toBe(1000);
      expect(calculateRetryDelay(3)).toBe(1000);
    });

    it('should record retry attempts', () => {
      const recordRetryAttempt = (handler as any).recordRetryAttempt.bind(handler);
      const error = new Error('Test error');
      
      recordRetryAttempt('test-request', 1, 1000, error);
      
      const history = handler.getRetryHistory('test-request');
      expect(history).toHaveLength(1);
      expect(history[0].attempt).toBe(1);
      expect(history[0].delay).toBe(1000);
      expect(history[0].error).toBe(error);
    });
  });

  describe('statistics tracking', () => {
    it('should update error statistics', () => {
      const error1 = { message: 'Auth error', code: 'rest_invalid_username' };
      const error2 = { message: 'Server error' };
      
      handler.classifyError(error1);
      handler.classifyError(error2, 500);
      
      // Trigger stats update by handling errors
      handler.handleError(error1, mockContext);
      handler.handleError(error2, { ...mockContext, statusCode: 500 });
      
      const stats = handler.getStats();
      expect(stats.totalErrors).toBe(2);
      expect(stats.errorsByCategory[WordPressErrorCategory.AUTHENTICATION]).toBe(1);
      expect(stats.errorsByCategory[WordPressErrorCategory.SERVER_ERROR]).toBe(1);
      expect(stats.errorsBySeverity[WordPressErrorSeverity.HIGH]).toBe(2);
    });

    it('should reset statistics', () => {
      const error = { message: 'Test error' };
      handler.handleError(error, mockContext);
      
      let stats = handler.getStats();
      expect(stats.totalErrors).toBe(1);
      
      handler.resetStats();
      stats = handler.getStats();
      expect(stats.totalErrors).toBe(0);
      expect(stats.lastErrorTime).toBeNull();
    });
  });

  describe('operation wrapper', () => {
    it('should wrap operations and handle errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Test error'));
      
      const result = await handler.wrapOperation(operation, {
        endpoint: '/wp/v2/posts',
        method: 'GET'
      });

      expect(operation).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error.code).toContain('wordpress_');
    });

    it('should wrap successful operations', async () => {
      const successData = { id: 123, title: 'Test Post' };
      const operation = jest.fn().mockResolvedValue(successData);
      
      const result = await handler.wrapOperation(operation, {
        endpoint: '/wp/v2/posts',
        method: 'POST'
      });

      expect(operation).toHaveBeenCalled();
      expect(result).toBe(successData);
    });
  });

  describe('retryable error detection', () => {
    it('should identify retryable status codes', () => {
      const retryableCodes = [408, 429, 500, 502, 503, 504];
      
      retryableCodes.forEach(statusCode => {
        expect(handler.isRetryableError({}, statusCode)).toBe(true);
      });
    });

    it('should identify non-retryable status codes', () => {
      const nonRetryableCodes = [400, 401, 403, 404];
      
      nonRetryableCodes.forEach(statusCode => {
        expect(handler.isRetryableError({}, statusCode)).toBe(false);
      });
    });

    it('should identify retryable error codes', () => {
      const retryableCodes = ['rest_post_invalid_page_number', 'timeout', 'network_error'];
      
      retryableCodes.forEach(code => {
        expect(handler.isRetryableError({ code })).toBe(true);
      });
    });
  });

  describe('configuration management', () => {
    it('should update configuration', () => {
      handler.updateConfig({
        maxRetryAttempts: 5,
        retryDelayMs: 2000
      });
      
      const config = handler.getConfig();
      expect(config.maxRetryAttempts).toBe(5);
      expect(config.retryDelayMs).toBe(2000);
    });

    it('should maintain default configuration values', () => {
      const config = handler.getConfig();
      expect(config.maxRetryAttempts).toBe(3);
      expect(config.exponentialBackoff).toBe(true);
      expect(config.retryableStatusCodes).toContain(500);
    });
  });

  describe('utility functions', () => {
    it('should provide global handler access', () => {
      const globalHandler = getWordPressErrorHandler();
      expect(globalHandler).toBeInstanceOf(WordPressAPIErrorHandler);
    });

    it('should provide utility functions', async () => {
      const error = { message: 'Test error' };
      const context = mockContext;
      
      const classification = wordPressErrorHandler.classify(error, 500);
      expect(classification.category).toBe(WordPressErrorCategory.SERVER_ERROR);
      
      const isRetryable = wordPressErrorHandler.isRetryable(error, 500);
      expect(isRetryable).toBe(true);
      
      const stats = wordPressErrorHandler.getStats();
      expect(stats).toHaveProperty('totalErrors');
    });
  });

  describe('error response creation', () => {
    it('should create proper error response structure', async () => {
      const error = { 
        message: 'Test error',
        code: 'test_error'
      };
      
      const result = await handler.handleError(error, mockContext);

      expect(result).toMatchObject({
        success: false,
        error: {
          code: 'test_error',
          message: expect.any(String),
          details: expect.any(String),
          statusCode: expect.any(Number),
          retryable: expect.any(Boolean),
          timestamp: expect.any(String),
          requestId: mockContext.requestId,
          context: expect.objectContaining({
            requestId: mockContext.requestId,
            endpoint: mockContext.endpoint,
            method: mockContext.method
          })
        }
      });
    });
  });
});
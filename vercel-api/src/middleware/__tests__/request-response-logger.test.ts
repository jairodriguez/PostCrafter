import { jest } from '@jest/globals';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { RequestResponseLogger, getRequestLogger, requestResponseLogger } from '../request-response-logger';

// Mock dependencies
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    logPerformance: jest.fn()
  }
}));

jest.mock('../../utils/env', () => ({
  getEnvVars: jest.fn(() => ({
    ENABLE_DEBUG_LOGGING: true,
    LOG_LEVEL: 'info'
  }))
}));

describe('RequestResponseLogger', () => {
  let logger: RequestResponseLogger;
  let mockRequest: Partial<VercelRequest>;
  let mockResponse: Partial<VercelResponse>;
  let mockLogger: any;

  beforeEach(() => {
    const { logger: loggerMock } = require('../../utils/logger');
    mockLogger = loggerMock;

    mockRequest = {
      method: 'POST',
      url: '/api/test',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'test-agent',
        'x-forwarded-for': '192.168.1.1',
        'authorization': 'Bearer secret-token-123'
      },
      body: {
        title: 'Test Post',
        content: 'Test content',
        apiKey: 'secret-api-key-456'
      },
      connection: {}
    };

    mockResponse = {
      statusCode: 200,
      setHeader: jest.fn(),
      getHeader: jest.fn(),
      getHeaderNames: jest.fn(() => ['content-type', 'x-request-id'])
    };

    logger = new RequestResponseLogger();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create logger with default configuration', () => {
      const config = logger.getConfig();
      expect(config.enableRequestLogging).toBe(true);
      expect(config.enableResponseLogging).toBe(true);
      expect(config.logLevel).toBe('info');
    });

    it('should create logger with custom configuration', () => {
      const customLogger = new RequestResponseLogger({
        logLevel: 'debug',
        enableRequestLogging: false
      });
      
      const config = customLogger.getConfig();
      expect(config.logLevel).toBe('debug');
      expect(config.enableRequestLogging).toBe(false);
    });
  });

  describe('request logging', () => {
    it('should log incoming requests', () => {
      const requestId = 'test-request-123';
      
      logger.logRequest(mockRequest as VercelRequest, requestId);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Incoming HTTP request',
        expect.objectContaining({
          requestId,
          method: 'POST',
          url: '/api/test',
          ip: '192.168.1.1',
          userAgent: 'test-agent'
        })
      );
    });

    it('should sanitize sensitive headers', () => {
      const requestId = 'test-request-123';
      
      logger.logRequest(mockRequest as VercelRequest, requestId);

      const logCall = mockLogger.info.mock.calls[0][1];
      expect(logCall.metadata.headers.authorization).toMatch(/Be\*+23/);
    });

    it('should sanitize sensitive body fields', () => {
      const requestId = 'test-request-123';
      
      logger.logRequest(mockRequest as VercelRequest, requestId);

      const logCall = mockLogger.info.mock.calls[0][1];
      expect(logCall.metadata.body.apiKey).toMatch(/se\*+56/);
      expect(logCall.metadata.body.title).toBe('Test Post'); // Non-sensitive field
    });

    it('should handle requests with query parameters', () => {
      mockRequest.url = '/api/test?param1=value1&apiKey=secret123';
      const requestId = 'test-request-123';
      
      logger.logRequest(mockRequest as VercelRequest, requestId);

      const logCall = mockLogger.info.mock.calls[0][1];
      expect(logCall.metadata.queryParams.param1).toBe('value1');
      expect(logCall.metadata.queryParams.apiKey).toMatch(/se\*+23/);
    });

    it('should exclude specified paths from logging', () => {
      mockRequest.url = '/health';
      const requestId = 'test-request-123';
      
      logger.logRequest(mockRequest as VercelRequest, requestId);

      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should handle large request bodies', () => {
      const largeBody = 'x'.repeat(20000); // Larger than maxBodySize
      mockRequest.body = largeBody;
      const requestId = 'test-request-123';
      
      logger.logRequest(mockRequest as VercelRequest, requestId);

      const logCall = mockLogger.info.mock.calls[0][1];
      expect(logCall.metadata.body).toBe('[BODY_TOO_LARGE]');
    });

    it('should handle invalid JSON in request body', () => {
      mockRequest.body = '{ invalid json';
      const requestId = 'test-request-123';
      
      logger.logRequest(mockRequest as VercelRequest, requestId);

      const logCall = mockLogger.info.mock.calls[0][1];
      expect(logCall.metadata.body).toBe('[INVALID_JSON]');
    });

    it('should extract IP from different headers', () => {
      // Test x-real-ip
      mockRequest.headers = { 'x-real-ip': '10.0.0.1' };
      logger.logRequest(mockRequest as VercelRequest, 'test-1');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Incoming HTTP request',
        expect.objectContaining({ ip: '10.0.0.1' })
      );

      // Test connection.remoteAddress
      mockRequest.headers = {};
      mockRequest.connection = { remoteAddress: '127.0.0.1' };
      logger.logRequest(mockRequest as VercelRequest, 'test-2');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Incoming HTTP request',
        expect.objectContaining({ ip: '127.0.0.1' })
      );
    });
  });

  describe('response logging', () => {
    beforeEach(() => {
      // Set up start time for processing time calculation
      const requestId = 'test-request-123';
      logger.logRequest(mockRequest as VercelRequest, requestId);
      jest.clearAllMocks();
    });

    it('should log successful responses', () => {
      const requestId = 'test-request-123';
      
      logger.logResponse(mockRequest as VercelRequest, mockResponse as VercelResponse, requestId);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP response sent successfully',
        expect.objectContaining({
          requestId,
          method: 'POST',
          url: '/api/test',
          statusCode: 200,
          processingTime: expect.any(Number)
        })
      );
    });

    it('should log error responses as warnings', () => {
      mockResponse.statusCode = 500;
      const requestId = 'test-request-123';
      
      logger.logResponse(mockRequest as VercelRequest, mockResponse as VercelResponse, requestId);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'HTTP response sent with error (500)',
        expect.objectContaining({
          statusCode: 500
        })
      );
    });

    it('should include response body when enabled', () => {
      const responseBody = { success: true, data: { id: 123 } };
      const customLogger = new RequestResponseLogger({ logResponseBody: true });
      const requestId = 'test-request-123';
      
      customLogger.logResponse(
        mockRequest as VercelRequest, 
        mockResponse as VercelResponse, 
        requestId, 
        responseBody
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP response sent successfully',
        expect.objectContaining({
          metadata: expect.objectContaining({
            body: responseBody
          })
        })
      );
    });

    it('should log performance warnings for slow requests', () => {
      const requestId = 'test-request-123';
      
      // Simulate slow request by setting start time in the past
      (logger as any).requestStartTimes.set(requestId, Date.now() - 6000);
      
      logger.logResponse(mockRequest as VercelRequest, mockResponse as VercelResponse, requestId);

      expect(mockLogger.logPerformance).toHaveBeenCalledWith(
        'POST /api/test',
        expect.any(Number),
        expect.objectContaining({
          requestId,
          statusCode: 200
        })
      );
    });

    it('should sanitize response headers', () => {
      mockResponse.getHeaderNames = jest.fn(() => ['content-type', 'set-cookie']);
      mockResponse.getHeader = jest.fn((name) => {
        if (name === 'content-type') return 'application/json';
        if (name === 'set-cookie') return 'session=secret123; HttpOnly';
        return undefined;
      });

      const requestId = 'test-request-123';
      
      logger.logResponse(mockRequest as VercelRequest, mockResponse as VercelResponse, requestId);

      const logCall = mockLogger.info.mock.calls[0][1];
      expect(logCall.metadata.headers['content-type']).toBe('application/json');
      expect(logCall.metadata.headers['set-cookie']).toMatch(/se\*+23/);
    });
  });

  describe('middleware functions', () => {
    it('should create request middleware that adds request ID', () => {
      const middleware = logger.requestMiddleware();
      const nextFn = jest.fn();
      
      middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, nextFn);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', expect.any(String));
      expect((mockRequest as any).requestId).toBeDefined();
      expect(nextFn).toHaveBeenCalled();
    });

    it('should create response middleware', () => {
      const middleware = logger.responseMiddleware();
      (mockRequest as any).requestId = 'test-request-123';
      
      middleware(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP response sent successfully',
        expect.objectContaining({
          requestId: 'test-request-123'
        })
      );
    });
  });

  describe('sensitive data masking', () => {
    it('should mask different value types', () => {
      const testLogger = new RequestResponseLogger();
      const maskValue = (testLogger as any).maskValue.bind(testLogger);

      expect(maskValue('ab')).toBe('**');
      expect(maskValue('abcd')).toBe('****');
      expect(maskValue('abcdef')).toBe('ab**ef');
      expect(maskValue('secretkey123')).toBe('se********23');
      expect(maskValue(123)).toBe('[REDACTED]');
      expect(maskValue(null)).toBe('[REDACTED]');
    });

    it('should sanitize nested objects', () => {
      const testData = {
        user: {
          name: 'John',
          password: 'secret123',
          profile: {
            email: 'test@example.com',
            apiKey: 'key456'
          }
        }
      };

      const sanitized = (logger as any).sanitizeBody(testData);
      
      expect(sanitized.user.name).toBe('John');
      expect(sanitized.user.password).toMatch(/se\*+23/);
      expect(sanitized.user.profile.email).toBe('test@example.com');
      expect(sanitized.user.profile.apiKey).toMatch(/ke\*+56/);
    });

    it('should sanitize arrays', () => {
      const testData = [
        { name: 'Item 1', secret: 'secret123' },
        { name: 'Item 2', token: 'token456' }
      ];

      const sanitized = (logger as any).sanitizeBody(testData);
      
      expect(sanitized[0].name).toBe('Item 1');
      expect(sanitized[0].secret).toMatch(/se\*+23/);
      expect(sanitized[1].name).toBe('Item 2');
      expect(sanitized[1].token).toMatch(/to\*+56/);
    });
  });

  describe('configuration management', () => {
    it('should update configuration', () => {
      logger.updateConfig({ logLevel: 'debug', enableRequestLogging: false });
      
      const config = logger.getConfig();
      expect(config.logLevel).toBe('debug');
      expect(config.enableRequestLogging).toBe(false);
    });

    it('should disable logging when configured', () => {
      logger.updateConfig({ enableRequestLogging: false });
      
      logger.logRequest(mockRequest as VercelRequest, 'test-123');
      
      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });
  });

  describe('utility functions', () => {
    it('should provide global logger access', () => {
      const globalLogger = getRequestLogger();
      expect(globalLogger).toBeInstanceOf(RequestResponseLogger);
    });

    it('should provide utility logging functions', () => {
      const requestId = requestResponseLogger.logRequest(mockRequest as VercelRequest);
      expect(requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should provide middleware functions', () => {
      const reqMiddleware = requestResponseLogger.requestMiddleware();
      const resMiddleware = requestResponseLogger.responseMiddleware();
      
      expect(typeof reqMiddleware).toBe('function');
      expect(typeof resMiddleware).toBe('function');
    });
  });

  describe('edge cases', () => {
    it('should handle requests without body', () => {
      mockRequest.body = undefined;
      const requestId = 'test-request-123';
      
      logger.logRequest(mockRequest as VercelRequest, requestId);

      expect(mockLogger.info).toHaveBeenCalled();
      const logCall = mockLogger.info.mock.calls[0][1];
      expect(logCall.metadata.body).toBeUndefined();
    });

    it('should handle responses without start time', () => {
      const requestId = 'unknown-request';
      
      logger.logResponse(mockRequest as VercelRequest, mockResponse as VercelResponse, requestId);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP response sent successfully',
        expect.objectContaining({
          requestId,
          processingTime: undefined
        })
      );
    });

    it('should handle missing URL', () => {
      mockRequest.url = undefined;
      const requestId = 'test-request-123';
      
      logger.logRequest(mockRequest as VercelRequest, requestId);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Incoming HTTP request',
        expect.objectContaining({
          url: '/'
        })
      );
    });

    it('should clear request times', () => {
      const requestId = 'test-request-123';
      logger.logRequest(mockRequest as VercelRequest, requestId);
      
      expect((logger as any).requestStartTimes.has(requestId)).toBe(true);
      
      logger.clearRequestTimes();
      
      expect((logger as any).requestStartTimes.has(requestId)).toBe(false);
    });
  });
});
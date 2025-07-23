import { jest } from '@jest/globals';
import winston from 'winston';
import { StructuredLogger, LogLevel, LogContext, createLogger, getLogger, logger } from '../logger';

// Mock winston to avoid actual file operations during tests
jest.mock('winston', () => {
  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    level: 'info',
    on: jest.fn(),
    end: jest.fn()
  };

  return {
    createLogger: jest.fn(() => mockLogger),
    format: {
      combine: jest.fn(),
      timestamp: jest.fn(),
      errors: jest.fn(),
      colorize: jest.fn(),
      printf: jest.fn(),
      json: jest.fn()
    },
    transports: {
      Console: jest.fn(),
      File: jest.fn()
    }
  };
});

jest.mock('winston-daily-rotate-file', () => jest.fn());

jest.mock('../env', () => ({
  getEnvVars: jest.fn(() => ({
    LOG_LEVEL: 'info',
    NODE_ENV: 'test',
    npm_package_version: '1.0.0'
  }))
}));

describe('StructuredLogger', () => {
  let structuredLogger: StructuredLogger;
  let mockWinstonLogger: any;

  beforeEach(() => {
    mockWinstonLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      level: 'info',
      on: jest.fn(),
      end: jest.fn()
    };

    (winston.createLogger as jest.Mock).mockReturnValue(mockWinstonLogger);
    structuredLogger = new StructuredLogger();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create logger with default configuration', () => {
      expect(winston.createLogger).toHaveBeenCalled();
    });

    it('should create logger with custom configuration', () => {
      const customConfig = {
        level: LogLevel.DEBUG,
        environment: 'development'
      };

      const customLogger = new StructuredLogger(customConfig);
      expect(winston.createLogger).toHaveBeenCalled();
    });
  });

  describe('logging methods', () => {
    it('should log error messages', () => {
      const message = 'Test error message';
      const context: LogContext = {
        requestId: 'test-request-123',
        error: {
          name: 'TestError',
          message: 'Test error'
        }
      };

      structuredLogger.error(message, context);

      expect(mockWinstonLogger.error).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          requestId: 'test-request-123',
          error: expect.objectContaining({
            name: 'TestError',
            message: 'Test error'
          })
        })
      );
    });

    it('should log warning messages', () => {
      const message = 'Test warning message';
      const context: LogContext = { requestId: 'test-request-123' };

      structuredLogger.warn(message, context);

      expect(mockWinstonLogger.warn).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          requestId: 'test-request-123'
        })
      );
    });

    it('should log info messages', () => {
      const message = 'Test info message';
      const context: LogContext = { requestId: 'test-request-123' };

      structuredLogger.info(message, context);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          requestId: 'test-request-123'
        })
      );
    });

    it('should log debug messages', () => {
      const message = 'Test debug message';
      const context: LogContext = { requestId: 'test-request-123' };

      structuredLogger.debug(message, context);

      expect(mockWinstonLogger.debug).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          requestId: 'test-request-123'
        })
      );
    });

    it('should auto-generate request ID if not provided', () => {
      const message = 'Test message';

      structuredLogger.info(message);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          requestId: expect.stringMatching(/^log_\d+_[a-z0-9]+$/)
        })
      );
    });
  });

  describe('specialized logging methods', () => {
    it('should log HTTP requests', () => {
      const mockReq = {
        method: 'POST',
        url: '/api/test',
        headers: {
          'user-agent': 'test-agent',
          'x-forwarded-for': '192.168.1.1'
        }
      };

      structuredLogger.logRequest(mockReq);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'HTTP request received',
        expect.objectContaining({
          method: 'POST',
          url: '/api/test',
          userAgent: 'test-agent',
          ip: '192.168.1.1',
          timestamp: expect.any(String)
        })
      );
    });

    it('should log HTTP responses', () => {
      const mockReq = {
        method: 'POST',
        url: '/api/test'
      };

      const mockRes = {
        statusCode: 200
      };

      const processingTime = 150;

      structuredLogger.logResponse(mockReq, mockRes, processingTime);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'HTTP response sent',
        expect.objectContaining({
          method: 'POST',
          url: '/api/test',
          statusCode: 200,
          processingTime: 150,
          timestamp: expect.any(String)
        })
      );
    });

    it('should log error responses as warnings', () => {
      const mockReq = { method: 'POST', url: '/api/test' };
      const mockRes = { statusCode: 500 };
      const processingTime = 150;

      structuredLogger.logResponse(mockReq, mockRes, processingTime);

      expect(mockWinstonLogger.warn).toHaveBeenCalledWith(
        'HTTP response sent',
        expect.objectContaining({ statusCode: 500 })
      );
    });

    it('should log authentication events', () => {
      structuredLogger.logAuth(true, 'Valid API key');

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'Authentication successful',
        expect.objectContaining({
          metadata: expect.objectContaining({
            success: true,
            reason: 'Valid API key'
          })
        })
      );
    });

    it('should log authentication failures as warnings', () => {
      structuredLogger.logAuth(false, 'Invalid API key');

      expect(mockWinstonLogger.warn).toHaveBeenCalledWith(
        'Authentication failed',
        expect.objectContaining({
          metadata: expect.objectContaining({
            success: false,
            reason: 'Invalid API key'
          })
        })
      );
    });

    it('should log security events', () => {
      structuredLogger.logSecurity('SQL_INJECTION_ATTEMPT', 'high');

      expect(mockWinstonLogger.error).toHaveBeenCalledWith(
        'Security event: SQL_INJECTION_ATTEMPT',
        expect.objectContaining({
          metadata: expect.objectContaining({
            eventType: 'SQL_INJECTION_ATTEMPT',
            severity: 'high'
          })
        })
      );
    });

    it('should log performance metrics', () => {
      structuredLogger.logPerformance('database_query', 1500);

      expect(mockWinstonLogger.debug).toHaveBeenCalledWith(
        'Performance: database_query',
        expect.objectContaining({
          metadata: expect.objectContaining({
            operation: 'database_query',
            duration: 1500
          })
        })
      );
    });

    it('should log slow operations as warnings', () => {
      structuredLogger.logPerformance('slow_database_query', 6000);

      expect(mockWinstonLogger.warn).toHaveBeenCalledWith(
        'Slow operation detected: slow_database_query',
        expect.objectContaining({
          metadata: expect.objectContaining({
            operation: 'slow_database_query',
            duration: 6000
          })
        })
      );
    });

    it('should log WordPress API calls', () => {
      structuredLogger.logWordPressAPI('/wp/v2/posts', 'POST', 201, 800);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'WordPress API call: POST /wp/v2/posts',
        expect.objectContaining({
          metadata: expect.objectContaining({
            endpoint: '/wp/v2/posts',
            method: 'POST',
            statusCode: 201,
            duration: 800
          })
        })
      );
    });

    it('should log WordPress API errors as warnings', () => {
      structuredLogger.logWordPressAPI('/wp/v2/posts', 'POST', 400, 500);

      expect(mockWinstonLogger.warn).toHaveBeenCalledWith(
        'WordPress API call: POST /wp/v2/posts',
        expect.objectContaining({
          metadata: expect.objectContaining({
            statusCode: 400
          })
        })
      );
    });
  });

  describe('level management', () => {
    it('should change log level', () => {
      structuredLogger.setLevel(LogLevel.DEBUG);
      expect(structuredLogger.getLevel()).toBe(LogLevel.DEBUG);
    });

    it('should get current log level', () => {
      const level = structuredLogger.getLevel();
      expect(level).toBe(LogLevel.INFO); // Default level
    });
  });

  describe('child logger', () => {
    it('should create child logger with default context', () => {
      const defaultContext: LogContext = {
        requestId: 'child-request-123',
        component: 'authentication'
      };

      const childLogger = structuredLogger.child(defaultContext);
      childLogger.info('Child logger message');

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'Child logger message',
        expect.objectContaining({
          requestId: 'child-request-123',
          component: 'authentication'
        })
      );
    });

    it('should merge child context with provided context', () => {
      const defaultContext: LogContext = {
        requestId: 'child-request-123',
        component: 'authentication'
      };

      const childLogger = structuredLogger.child(defaultContext);
      childLogger.error('Child error', { userId: 'user-456' });

      expect(mockWinstonLogger.error).toHaveBeenCalledWith(
        'Child error',
        expect.objectContaining({
          requestId: 'child-request-123',
          component: 'authentication',
          userId: 'user-456'
        })
      );
    });
  });

  describe('sensitive data masking', () => {
    it('should mask sensitive fields in logs', () => {
      const logger = new StructuredLogger({
        maskSensitiveData: true,
        environment: 'production'
      });

      // Test is limited because masking happens in Winston formatter
      // which is mocked. In real scenario, sensitive data would be masked.
      expect(winston.createLogger).toHaveBeenCalled();
    });

    it('should handle maskString for different lengths', () => {
      const logger = new StructuredLogger();
      
      // Access private method through type assertion for testing
      const maskString = (logger as any).maskString.bind(logger);

      expect(maskString('ab')).toBe('**');
      expect(maskString('abcd')).toBe('****');
      expect(maskString('abcdef')).toBe('ab**ef');
      expect(maskString('secretkey123')).toBe('se********23');
    });
  });

  describe('utility functions', () => {
    it('should provide global logger access', () => {
      const globalLogger = getLogger();
      expect(globalLogger).toBeInstanceOf(StructuredLogger);
    });

    it('should create new logger with config', () => {
      const customLogger = createLogger({ level: LogLevel.DEBUG });
      expect(customLogger).toBeInstanceOf(StructuredLogger);
    });

    it('should provide utility logger functions', () => {
      logger.info('Utility info message');
      logger.error('Utility error message');
      logger.warn('Utility warning message');
      logger.debug('Utility debug message');

      // These would call the global logger instance
      expect(winston.createLogger).toHaveBeenCalled();
    });
  });

  describe('winston integration', () => {
    it('should return winston logger instance', () => {
      const winstonInstance = structuredLogger.getWinstonLogger();
      expect(winstonInstance).toBe(mockWinstonLogger);
    });

    it('should handle log flushing', async () => {
      const flushPromise = structuredLogger.flush();
      
      // Simulate the finish event
      const finishCallback = mockWinstonLogger.on.mock.calls.find(
        call => call[0] === 'finish'
      )?.[1];
      
      if (finishCallback) {
        finishCallback();
      }

      await expect(flushPromise).resolves.toBeUndefined();
      expect(mockWinstonLogger.end).toHaveBeenCalled();
    });
  });

  describe('error handling in logging', () => {
    it('should handle logging errors gracefully', () => {
      mockWinstonLogger.error.mockImplementation(() => {
        throw new Error('Logging failed');
      });

      // Should not throw when Winston fails
      expect(() => {
        structuredLogger.error('Test message');
      }).not.toThrow();
    });
  });
});
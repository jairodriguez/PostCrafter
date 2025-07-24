import type { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  ApiError, 
  ValidationError, 
  AuthenticationError, 
  WordPressApiError, 
  RateLimitError,
  WordPressError 
} from '../types';
import { secureLog } from '../utils/env';
import { logger } from '../utils/logger';
import SecurityMonitoring from '../utils/monitoring';

/**
 * Error response interface
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: string;
    timestamp: string;
    requestId?: string;
  };
  success: false;
}

/**
 * Centralized error handling middleware for consistent error processing
 * Implements Express error handling middleware pattern for Vercel functions
 */
export class ErrorHandler {
  private static requestId: string = '';

  /**
   * Set request ID for error correlation
   */
  static setRequestId(id: string): void {
    ErrorHandler.requestId = id;
  }

  /**
   * Main error handling function
   */
  static handle(
    error: Error | ApiError,
    req: VercelRequest,
    res: VercelResponse
  ): void {
    try {
      // Generate request ID if not set
      const requestId = ErrorHandler.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      
      // Get client information for logging
      const clientIP = req.headers['x-forwarded-for'] || 
                      req.headers['x-real-ip'] || 
                      req.connection?.remoteAddress || 
                      'unknown';
      const ip = Array.isArray(clientIP) ? clientIP[0] : clientIP;
      const userAgent = req.headers['user-agent'];
      const method = req.method;
      const url = req.url;

      // Determine error type and create appropriate response
      const errorResponse = ErrorHandler.categorizeError(error, requestId);

      // Log error details securely
      ErrorHandler.logError(error, {
        requestId,
        ip,
        userAgent,
        method,
        url,
        statusCode: errorResponse.error.code
      });

      // Record security events for certain error types
      ErrorHandler.recordSecurityEvent(error, ip, userAgent, requestId);

      // Set security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');

      // Send error response
      res.status(ErrorHandler.getStatusCode(error))
         .json(errorResponse);

    } catch (handlingError) {
      // Fallback error handling if error handler itself fails
      logger.error('Error handler failed', {
        requestId: ErrorHandler.requestId,
        error: {
          name: 'ErrorHandlerFailure',
          message: handlingError instanceof Error ? handlingError.message : 'Unknown error'
        },
        metadata: {
          originalError: error.message,
          timestamp: new Date().toISOString()
        }
      });
      
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          timestamp: new Date().toISOString()
        },
        success: false
      });
    }
  }

  /**
   * Categorize error and create standardized response
   */
  private static categorizeError(error: Error | ApiError, requestId: string): ErrorResponse {
    const timestamp = new Date().toISOString();

    // Handle known API errors
    if (error instanceof ApiError) {
      return {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          timestamp,
          requestId
        },
        success: false
      };
    }

    // Handle specific error types
    if (error.name === 'ValidationError' || error.message.includes('validation')) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Input validation failed',
          details: error.message,
          timestamp,
          requestId
        },
        success: false
      };
    }

    if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
      return {
        error: {
          code: 'INVALID_JSON',
          message: 'Invalid JSON in request body',
          details: 'Please check the request format',
          timestamp,
          requestId
        },
        success: false
      };
    }

    if (error.message.includes('timeout') || error.message.includes('ECONNRESET')) {
      return {
        error: {
          code: 'TIMEOUT_ERROR',
          message: 'Request timeout',
          details: 'The operation took too long to complete',
          timestamp,
          requestId
        },
        success: false
      };
    }

    if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
      return {
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network connection failed',
          details: 'Unable to connect to external service',
          timestamp,
          requestId
        },
        success: false
      };
    }

    // Generic error fallback
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp,
        requestId
      },
      success: false
    };
  }

  /**
   * Get appropriate HTTP status code for error
   */
  private static getStatusCode(error: Error | ApiError): number {
    if (error instanceof ApiError) {
      return error.statusCode;
    }

    // Map common error types to status codes
    if (error instanceof ValidationError) return 400;
    if (error instanceof AuthenticationError) return 401;
    if (error instanceof RateLimitError) return 429;
    if (error instanceof WordPressApiError) return 502;
    
    if (error.name === 'ValidationError') return 400;
    if (error.message.includes('unauthorized') || error.message.includes('authentication')) return 401;
    if (error.message.includes('forbidden') || error.message.includes('permission')) return 403;
    if (error.message.includes('not found')) return 404;
    if (error.message.includes('timeout')) return 408;
    if (error.message.includes('rate limit')) return 429;

    return 500; // Default to internal server error
  }

  /**
   * Log error details securely using structured logger
   */
  private static logError(error: Error | ApiError, context: {
    requestId: string;
    ip: string;
    userAgent?: string;
    method?: string;
    url?: string;
    statusCode: string;
  }): void {
    const logContext = {
      requestId: context.requestId,
      ip: context.ip,
      userAgent: context.userAgent,
      method: context.method,
      url: context.url,
      error: {
        name: error.name,
        message: error.message,
        code: error instanceof ApiError ? error.code : 'UNKNOWN',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      metadata: {
        statusCode: context.statusCode,
        timestamp: new Date().toISOString(),
        errorType: error.constructor.name
      }
    };

    // Log with appropriate level based on error severity
    const statusCode = ErrorHandler.getStatusCode(error);
    if (statusCode >= 500) {
      logger.error('Server error occurred', logContext);
    } else if (statusCode >= 400) {
      logger.warn('Client error occurred', logContext);
    } else {
      logger.info('Request processed with error', logContext);
    }
  }

  /**
   * Record security events for certain error types
   */
  private static recordSecurityEvent(
    error: Error | ApiError, 
    ip: string, 
    userAgent?: string, 
    requestId?: string
  ): void {
    try {
      // Record authentication failures
      if (error instanceof AuthenticationError || 
          error.message.includes('authentication') || 
          error.message.includes('unauthorized')) {
        SecurityMonitoring.recordAuthFailure(ip, userAgent, undefined, error.message);
      }

      // Record rate limit violations
      if (error instanceof RateLimitError || error.message.includes('rate limit')) {
        SecurityMonitoring.recordRateLimitViolation(ip, userAgent, undefined);
      }

      // Record suspicious activity for certain patterns
      if (error.message.includes('malicious') || 
          error.message.includes('injection') || 
          error.message.includes('xss')) {
        SecurityMonitoring.recordMaliciousContent(ip, userAgent, undefined, error.message);
      }

    } catch (monitoringError) {
      logger.warn('Failed to record security event', {
        requestId,
        error: {
          name: 'SecurityMonitoringFailure',
          message: monitoringError instanceof Error ? monitoringError.message : 'Unknown error'
        },
        metadata: {
          originalError: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Create error handling wrapper for async functions
   */
  static asyncWrapper(
    fn: (req: VercelRequest, res: VercelResponse) => Promise<void>
  ) {
    return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
      try {
        await fn(req, res);
      } catch (error) {
        ErrorHandler.handle(error as Error, req, res);
      }
    };
  }

  /**
   * Format validation errors consistently
   */
  static formatValidationError(errors: string[] | string): ValidationError {
    const message = Array.isArray(errors) ? errors.join(', ') : errors;
    return new ValidationError('Validation failed', message);
  }

  /**
   * Create WordPress API error with context
   */
  static createWordPressError(
    message: string, 
    statusCode?: number, 
    wordPressCode?: string,
    retryable: boolean = false
  ): WordPressApiError {
    return new WordPressApiError(message, `WordPress API error: ${wordPressCode || 'unknown'}`);
  }
}

/**
 * Express-style error handling middleware function
 */
export function errorHandlerMiddleware(
  error: Error,
  req: VercelRequest,
  res: VercelResponse,
  next?: () => void
): void {
  ErrorHandler.handle(error, req, res);
}

/**
 * Global error handler for unhandled promise rejections
 */
export function setupGlobalErrorHandlers(): void {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', {
      error: {
        name: 'UnhandledPromiseRejection',
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined
      },
      metadata: {
        promise: promise.toString(),
        timestamp: new Date().toISOString()
      }
    });
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      metadata: {
        timestamp: new Date().toISOString(),
        fatal: true
      }
    });
    
    // In production, we might want to exit gracefully
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });
}

export default ErrorHandler;
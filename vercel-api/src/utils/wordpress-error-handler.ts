import { secureLog } from './env';
import { 
  WordPressError, 
  WordPressErrorType, 
  WordPressErrorContext, 
  WordPressApiErrorDetails,
  WordPressValidationErrorDetails,
  WordPressRetryConfig,
  WordPressErrorHandlingConfig,
  WordPressErrorResponse
} from '../types';

/**
 * WordPress Error Handler Service
 * Provides comprehensive error handling, retry logic, and circuit breaker pattern
 */
export class WordPressErrorHandler {
  private config: WordPressErrorHandlingConfig;
  private errorCount: number = 0;
  private lastErrorTime: number = 0;
  private circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private circuitBreakerOpenTime: number = 0;

  constructor(config?: Partial<WordPressErrorHandlingConfig>) {
    this.config = {
      enableDetailedLogging: true,
      enableErrorTracking: true,
      enableRetryLogic: true,
      enableCircuitBreaker: true,
      retryConfig: {
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2,
        maxRetryDelay: 10000,
        retryableStatusCodes: [408, 429, 500, 502, 503, 504],
        retryableErrorCodes: [
          WordPressErrorType.TIMEOUT_ERROR,
          WordPressErrorType.RATE_LIMIT_EXCEEDED,
          WordPressErrorType.SERVER_ERROR,
          WordPressErrorType.BAD_GATEWAY,
          WordPressErrorType.SERVICE_UNAVAILABLE,
          WordPressErrorType.CONNECTION_ERROR
        ]
      },
      errorThreshold: 5,
      errorWindowMs: 60000, // 1 minute
      ...config
    };
  }

  /**
   * Handle WordPress API errors with comprehensive error categorization
   */
  handleError(
    error: any, 
    context: Partial<WordPressErrorContext> = {}
  ): WordPressError {
    const wordPressError = this.categorizeError(error, context);
    
    // Track error for circuit breaker
    if (this.config.enableErrorTracking) {
      this.trackError(wordPressError);
    }

    // Log error with detailed context
    if (this.config.enableDetailedLogging) {
      this.logError(wordPressError, context);
    }

    return wordPressError;
  }

  /**
   * Categorize errors based on type and context
   */
  private categorizeError(
    error: any, 
    context: Partial<WordPressErrorContext>
  ): WordPressError {
    const timestamp = new Date().toISOString();
    const errorContext: WordPressErrorContext = {
      timestamp,
      ...context
    };

    // Handle WordPress-specific errors
    if (error instanceof WordPressError) {
      return error;
    }

    // Handle Axios errors
    if (error.response) {
      return this.handleHttpError(error, errorContext);
    }

    // Handle network errors
    if (error.code) {
      return this.handleNetworkError(error, errorContext);
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return this.handleValidationError(error, errorContext);
    }

    // Handle unknown errors
    return this.handleUnknownError(error, errorContext);
  }

  /**
   * Handle HTTP errors from WordPress API
   */
  private handleHttpError(error: any, context: WordPressErrorContext): WordPressError {
    const statusCode = error.response?.status || 500;
    const responseData = error.response?.data;
    const isRetryable = this.isRetryableStatusCode(statusCode);

    context.statusCode = statusCode;
    context.responseData = responseData;

    // WordPress-specific error handling
    if (responseData && typeof responseData === 'object') {
      return this.handleWordPressApiError(responseData, statusCode, context);
    }

    // Standard HTTP error handling
    switch (statusCode) {
      case 400:
        return WordPressError.createNonRetryable(
          WordPressErrorType.VALIDATION_ERROR,
          'Bad request - invalid data provided',
          statusCode,
          error.message,
          'bad_request',
          context
        );

      case 401:
        return WordPressError.createNonRetryable(
          WordPressErrorType.AUTHENTICATION_FAILED,
          'Authentication failed - invalid credentials',
          statusCode,
          'Check your WordPress username and app password',
          'invalid_credentials',
          context
        );

      case 403:
        return WordPressError.createNonRetryable(
          WordPressErrorType.INSUFFICIENT_PERMISSIONS,
          'Insufficient permissions to perform this action',
          statusCode,
          'User lacks required capabilities',
          'insufficient_permissions',
          context
        );

      case 404:
        return WordPressError.createNonRetryable(
          WordPressErrorType.RESOURCE_NOT_FOUND,
          'Resource not found',
          statusCode,
          error.message,
          'not_found',
          context
        );

      case 408:
        return WordPressError.createRetryable(
          WordPressErrorType.TIMEOUT_ERROR,
          'Request timeout',
          statusCode,
          error.message,
          'timeout',
          context
        );

      case 429:
        return WordPressError.createRetryable(
          WordPressErrorType.RATE_LIMIT_EXCEEDED,
          'Rate limit exceeded',
          statusCode,
          'Too many requests, please try again later',
          'rate_limit_exceeded',
          context
        );

      case 500:
        return WordPressError.createRetryable(
          WordPressErrorType.SERVER_ERROR,
          'WordPress server error',
          statusCode,
          error.message,
          'internal_server_error',
          context
        );

      case 502:
        return WordPressError.createRetryable(
          WordPressErrorType.BAD_GATEWAY,
          'Bad gateway error',
          statusCode,
          error.message,
          'bad_gateway',
          context
        );

      case 503:
        return WordPressError.createRetryable(
          WordPressErrorType.SERVICE_UNAVAILABLE,
          'WordPress service unavailable',
          statusCode,
          error.message,
          'service_unavailable',
          context
        );

      case 504:
        return WordPressError.createRetryable(
          WordPressErrorType.TIMEOUT_ERROR,
          'Gateway timeout',
          statusCode,
          error.message,
          'gateway_timeout',
          context
        );

      default:
        return WordPressError.createRetryable(
          WordPressErrorType.API_ERROR,
          `WordPress API error: ${statusCode}`,
          statusCode,
          error.message,
          'api_error',
          context
        );
    }
  }

  /**
   * Handle WordPress API-specific errors
   */
  private handleWordPressApiError(
    responseData: any, 
    statusCode: number, 
    context: WordPressErrorContext
  ): WordPressError {
    const message = responseData.message || responseData.error || 'WordPress API error';
    const code = responseData.code || this.getErrorCodeFromStatus(statusCode);
    const details = responseData.details || responseData.data;

    // Handle WordPress validation errors
    if (responseData.additional_errors && Array.isArray(responseData.additional_errors)) {
      const validationErrors = responseData.additional_errors
        .map((err: any) => `${err.code}: ${err.message}`)
        .join('; ');
      
      return WordPressError.createNonRetryable(
        WordPressErrorType.VALIDATION_ERROR,
        'WordPress validation failed',
        statusCode,
        validationErrors,
        code,
        context
      );
    }

    // Handle specific WordPress error codes
    switch (code) {
      case 'rest_invalid_param':
        return WordPressError.createNonRetryable(
          WordPressErrorType.VALIDATION_ERROR,
          'Invalid parameter provided',
          statusCode,
          details,
          code,
          context
        );

      case 'rest_missing_param':
        return WordPressError.createNonRetryable(
          WordPressErrorType.VALIDATION_ERROR,
          'Required parameter missing',
          statusCode,
          details,
          code,
          context
        );

      case 'rest_invalid_json':
        return WordPressError.createNonRetryable(
          WordPressErrorType.VALIDATION_ERROR,
          'Invalid JSON in request body',
          statusCode,
          details,
          code,
          context
        );

      case 'rest_cannot_create':
        return WordPressError.createNonRetryable(
          WordPressErrorType.VALIDATION_ERROR,
          'Cannot create resource',
          statusCode,
          details,
          code,
          context
        );

      case 'rest_cannot_update':
        return WordPressError.createNonRetryable(
          WordPressErrorType.VALIDATION_ERROR,
          'Cannot update resource',
          statusCode,
          details,
          code,
          context
        );

      case 'rest_cannot_delete':
        return WordPressError.createNonRetryable(
          WordPressErrorType.VALIDATION_ERROR,
          'Cannot delete resource',
          statusCode,
          details,
          code,
          context
        );

      default:
        return WordPressError.createRetryable(
          WordPressErrorType.API_ERROR,
          message,
          statusCode,
          details,
          code,
          context
        );
    }
  }

  /**
   * Handle network errors
   */
  private handleNetworkError(error: any, context: WordPressErrorContext): WordPressError {
    switch (error.code) {
      case 'ECONNABORTED':
        return WordPressError.createRetryable(
          WordPressErrorType.TIMEOUT_ERROR,
          'Request timeout',
          408,
          error.message,
          'timeout',
          context
        );

      case 'ENOTFOUND':
        return WordPressError.createRetryable(
          WordPressErrorType.DNS_ERROR,
          'DNS resolution failed',
          503,
          error.message,
          'dns_error',
          context
        );

      case 'ECONNREFUSED':
        return WordPressError.createRetryable(
          WordPressErrorType.CONNECTION_ERROR,
          'Connection refused',
          503,
          error.message,
          'connection_refused',
          context
        );

      case 'ECONNRESET':
        return WordPressError.createRetryable(
          WordPressErrorType.CONNECTION_ERROR,
          'Connection reset',
          503,
          error.message,
          'connection_reset',
          context
        );

      case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE':
      case 'CERT_HAS_EXPIRED':
      case 'CERT_NOT_YET_VALID':
        return WordPressError.createNonRetryable(
          WordPressErrorType.SSL_ERROR,
          'SSL certificate error',
          495,
          error.message,
          'ssl_error',
          context
        );

      default:
        return WordPressError.createRetryable(
          WordPressErrorType.CONNECTION_ERROR,
          'Network error',
          503,
          error.message,
          'network_error',
          context
        );
    }
  }

  /**
   * Handle validation errors
   */
  private handleValidationError(error: any, context: WordPressErrorContext): WordPressError {
    return WordPressError.createNonRetryable(
      WordPressErrorType.VALIDATION_ERROR,
      'Validation failed',
      400,
      error.message,
      'validation_error',
      context
    );
  }

  /**
   * Handle unknown errors
   */
  private handleUnknownError(error: any, context: WordPressErrorContext): WordPressError {
    return WordPressError.createRetryable(
      WordPressErrorType.UNKNOWN_ERROR,
      'Unknown error occurred',
      500,
      error.message,
      'unknown_error',
      context
    );
  }

  /**
   * Check if status code is retryable
   */
  private isRetryableStatusCode(statusCode: number): boolean {
    return this.config.retryConfig.retryableStatusCodes.includes(statusCode);
  }

  /**
   * Get error code from HTTP status
   */
  private getErrorCodeFromStatus(status: number): string {
    switch (status) {
      case 400: return 'bad_request';
      case 401: return 'unauthorized';
      case 403: return 'forbidden';
      case 404: return 'not_found';
      case 408: return 'timeout';
      case 429: return 'rate_limit_exceeded';
      case 500: return 'internal_server_error';
      case 502: return 'bad_gateway';
      case 503: return 'service_unavailable';
      case 504: return 'gateway_timeout';
      default: return 'api_error';
    }
  }

  /**
   * Track error for circuit breaker
   */
  private trackError(error: WordPressError): void {
    const now = Date.now();
    
    // Reset error count if window has passed
    if (now - this.lastErrorTime > this.config.errorWindowMs) {
      this.errorCount = 0;
    }

    this.errorCount++;
    this.lastErrorTime = now;

    // Check if circuit breaker should open
    if (this.config.enableCircuitBreaker && 
        this.errorCount >= this.config.errorThreshold && 
        this.circuitBreakerState === 'CLOSED') {
      this.openCircuitBreaker();
    }
  }

  /**
   * Open circuit breaker
   */
  private openCircuitBreaker(): void {
    this.circuitBreakerState = 'OPEN';
    this.circuitBreakerOpenTime = Date.now();
    
    secureLog('warn', 'WordPress circuit breaker opened', {
      errorCount: this.errorCount,
      errorThreshold: this.config.errorThreshold,
      errorWindowMs: this.config.errorWindowMs,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Check if circuit breaker is open
   */
  isCircuitBreakerOpen(): boolean {
    if (this.circuitBreakerState === 'OPEN') {
      const now = Date.now();
      const timeSinceOpen = now - this.circuitBreakerOpenTime;
      
      // Move to half-open after 30 seconds
      if (timeSinceOpen > 30000) {
        this.circuitBreakerState = 'HALF_OPEN';
        secureLog('info', 'WordPress circuit breaker moved to half-open state');
      }
    }
    
    return this.circuitBreakerState === 'OPEN';
  }

  /**
   * Record successful request to close circuit breaker
   */
  recordSuccess(): void {
    if (this.circuitBreakerState === 'HALF_OPEN') {
      this.circuitBreakerState = 'CLOSED';
      this.errorCount = 0;
      
      secureLog('info', 'WordPress circuit breaker closed after successful request');
    }
  }

  /**
   * Log error with detailed context
   */
  private logError(error: WordPressError, context: WordPressErrorContext): void {
    const logData = {
      ...error.getErrorContext(),
      ...context,
      timestamp: new Date().toISOString(),
      circuitBreakerState: this.circuitBreakerState,
      errorCount: this.errorCount
    };

    secureLog('error', `WordPress API Error: ${error.message}`, logData);
  }

  /**
   * Create error response for API endpoints
   */
  createErrorResponse(error: WordPressError, context: WordPressErrorContext): WordPressErrorResponse {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        statusCode: error.statusCode,
        wordPressCode: error.wordPressCode,
        retryable: error.retryable,
        context,
        timestamp: new Date().toISOString(),
        requestId: context.requestId
      }
    };
  }

  /**
   * Get retry configuration
   */
  getRetryConfig(): WordPressRetryConfig {
    return this.config.retryConfig;
  }

  /**
   * Check if error should be retried
   */
  shouldRetry(error: WordPressError): boolean {
    if (!this.config.enableRetryLogic) {
      return false;
    }

    if (this.isCircuitBreakerOpen()) {
      return false;
    }

    return error.shouldRetry() && 
           this.config.retryConfig.retryableErrorCodes.includes(error.code);
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(attempt: number): number {
    const { retryDelay, backoffMultiplier, maxRetryDelay } = this.config.retryConfig;
    const delay = retryDelay * Math.pow(backoffMultiplier, attempt - 1);
    return Math.min(delay, maxRetryDelay);
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    errorCount: number;
    lastErrorTime: number;
    openTime?: number;
  } {
    return {
      state: this.circuitBreakerState,
      errorCount: this.errorCount,
      lastErrorTime: this.lastErrorTime,
      openTime: this.circuitBreakerState === 'OPEN' ? this.circuitBreakerOpenTime : undefined
    };
  }

  /**
   * Reset circuit breaker (for testing or manual intervention)
   */
  resetCircuitBreaker(): void {
    this.circuitBreakerState = 'CLOSED';
    this.errorCount = 0;
    this.lastErrorTime = 0;
    this.circuitBreakerOpenTime = 0;
    
    secureLog('info', 'WordPress circuit breaker manually reset');
  }
}

/**
 * Create WordPress error handler instance
 */
export function createWordPressErrorHandler(
  config?: Partial<WordPressErrorHandlingConfig>
): WordPressErrorHandler {
  return new WordPressErrorHandler(config);
}

/**
 * Default WordPress error handler instance
 */
export const wordPressErrorHandler = createWordPressErrorHandler(); 
import { AxiosError, AxiosResponse } from 'axios';
import { secureLog } from './env';
import { WordPressApiError, ValidationError } from '../types';

/**
 * Error categories for WordPress API errors
 */
export enum WordPressErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  RATE_LIMIT = 'rate_limit',
  NETWORK = 'network',
  SERVER = 'server',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

/**
 * Retry configuration for different error types
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
  nonRetryableErrors: string[];
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  expectedErrors: string[];
}

/**
 * Enhanced WordPress error with additional context
 */
export interface EnhancedWordPressError extends WordPressApiError {
  category: WordPressErrorCategory;
  retryable: boolean;
  retryAfter?: number;
  requestId?: string;
  endpoint?: string;
  method?: string;
  timestamp: Date;
  context?: Record<string, any>;
}

/**
 * Error handling statistics
 */
export interface ErrorStats {
  totalErrors: number;
  errorsByCategory: Record<WordPressErrorCategory, number>;
  errorsByCode: Record<string, number>;
  lastError?: EnhancedWordPressError;
  consecutiveFailures: number;
}

/**
 * Comprehensive WordPress error handler
 */
export class WordPressErrorHandler {
  private retryConfig: RetryConfig;
  private circuitBreakerConfig: CircuitBreakerConfig;
  private errorStats: ErrorStats;
  private circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private lastFailureTime: number = 0;
  private failureCount: number = 0;

  constructor(
    retryConfig?: Partial<RetryConfig>,
    circuitBreakerConfig?: Partial<CircuitBreakerConfig>
  ) {
    this.retryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: [
        'WORDPRESS_RATE_LIMIT',
        'WORDPRESS_TIMEOUT',
        'WORDPRESS_SERVER_ERROR',
        'WORDPRESS_BAD_GATEWAY',
        'WORDPRESS_SERVICE_UNAVAILABLE',
        'ECONNRESET',
        'ECONNABORTED',
        'ETIMEDOUT'
      ],
      nonRetryableErrors: [
        'WORDPRESS_AUTHENTICATION_ERROR',
        'WORDPRESS_PERMISSION_ERROR',
        'WORDPRESS_BAD_REQUEST',
        'WORDPRESS_NOT_FOUND',
        'VALIDATION_ERROR'
      ],
      ...retryConfig
    };

    this.circuitBreakerConfig = {
      failureThreshold: 5,
      recoveryTimeout: 30000,
      expectedErrors: [
        'WORDPRESS_AUTHENTICATION_ERROR',
        'WORDPRESS_PERMISSION_ERROR',
        'WORDPRESS_BAD_REQUEST',
        'WORDPRESS_NOT_FOUND'
      ],
      ...circuitBreakerConfig
    };

    this.errorStats = {
      totalErrors: 0,
      errorsByCategory: {
        [WordPressErrorCategory.AUTHENTICATION]: 0,
        [WordPressErrorCategory.AUTHORIZATION]: 0,
        [WordPressErrorCategory.VALIDATION]: 0,
        [WordPressErrorCategory.RATE_LIMIT]: 0,
        [WordPressErrorCategory.NETWORK]: 0,
        [WordPressErrorCategory.SERVER]: 0,
        [WordPressErrorCategory.TIMEOUT]: 0,
        [WordPressErrorCategory.UNKNOWN]: 0
      },
      errorsByCode: {},
      consecutiveFailures: 0
    };
  }

  /**
   * Create enhanced WordPress error from various error types
   */
  createEnhancedError(
    error: any,
    context?: {
      requestId?: string;
      endpoint?: string;
      method?: string;
      data?: any;
    }
  ): EnhancedWordPressError {
    const baseError = this.createBaseError(error);
    const category = this.categorizeError(baseError);
    const retryable = this.isRetryableError(baseError);
    const retryAfter = this.getRetryAfterTime(error);

    const enhancedError: EnhancedWordPressError = {
      ...baseError,
      category,
      retryable,
      retryAfter,
      requestId: context?.requestId,
      endpoint: context?.endpoint,
      method: context?.method,
      timestamp: new Date(),
      context: {
        originalError: error.message || error.toString(),
        ...context
      }
    };

    this.updateErrorStats(enhancedError);
    this.updateCircuitBreaker(enhancedError);

    return enhancedError;
  }

  /**
   * Create base WordPress error
   */
  private createBaseError(error: any): WordPressApiError {
    if (error instanceof WordPressApiError) {
      return error;
    }

    if (error instanceof AxiosError) {
      return this.createErrorFromAxios(error);
    }

    if (error instanceof ValidationError) {
      return new WordPressApiError(
        'VALIDATION_ERROR',
        error.message,
        400,
        error.details
      );
    }

    // Generic error
    return new WordPressApiError(
      'WORDPRESS_API_ERROR',
      'WordPress API request failed',
      500,
      error.message || 'Unknown error'
    );
  }

  /**
   * Create WordPress error from Axios error
   */
  private createErrorFromAxios(error: AxiosError): WordPressApiError {
    const statusCode = error.response?.status || 500;
    const responseData = error.response?.data as any;

    // WordPress-specific error handling
    if (responseData && typeof responseData === 'object') {
      const message = responseData.message || responseData.error || error.message;
      const code = responseData.code || this.getErrorCodeFromStatus(statusCode);
      
      return new WordPressApiError(
        code,
        message,
        statusCode,
        responseData.details || error.message
      );
    }

    // Network or timeout errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return new WordPressApiError(
        'WORDPRESS_TIMEOUT',
        'WordPress API request timed out',
        408,
        error.message
      );
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new WordPressApiError(
        'WORDPRESS_CONNECTION_ERROR',
        'Unable to connect to WordPress site',
        503,
        error.message
      );
    }

    // Authentication errors
    if (statusCode === 401) {
      return new WordPressApiError(
        'WORDPRESS_AUTHENTICATION_ERROR',
        'WordPress authentication failed. Please check your username and app password.',
        401,
        'Invalid credentials or app password'
      );
    }

    if (statusCode === 403) {
      return new WordPressApiError(
        'WORDPRESS_PERMISSION_ERROR',
        'Insufficient permissions to perform this action',
        403,
        'User lacks required capabilities'
      );
    }

    // Rate limiting
    if (statusCode === 429) {
      return new WordPressApiError(
        'WORDPRESS_RATE_LIMIT',
        'WordPress API rate limit exceeded',
        429,
        'Too many requests, please try again later'
      );
    }

    // Generic HTTP error
    return new WordPressApiError(
      this.getErrorCodeFromStatus(statusCode),
      `WordPress API request failed with status ${statusCode}`,
      statusCode,
      error.message
    );
  }

  /**
   * Categorize error based on type and status
   */
  private categorizeError(error: WordPressApiError): WordPressErrorCategory {
    const code = error.code;
    const statusCode = error.statusCode;

    // Authentication errors
    if (code === 'WORDPRESS_AUTHENTICATION_ERROR' || statusCode === 401) {
      return WordPressErrorCategory.AUTHENTICATION;
    }

    // Authorization errors
    if (code === 'WORDPRESS_PERMISSION_ERROR' || statusCode === 403) {
      return WordPressErrorCategory.AUTHORIZATION;
    }

    // Validation errors
    if (code === 'VALIDATION_ERROR' || code === 'WORDPRESS_BAD_REQUEST' || statusCode === 400) {
      return WordPressErrorCategory.VALIDATION;
    }

    // Rate limiting
    if (code === 'WORDPRESS_RATE_LIMIT' || statusCode === 429) {
      return WordPressErrorCategory.RATE_LIMIT;
    }

    // Network errors
    if (code === 'WORDPRESS_CONNECTION_ERROR' || code === 'ECONNREFUSED' || code === 'ENOTFOUND') {
      return WordPressErrorCategory.NETWORK;
    }

    // Timeout errors
    if (code === 'WORDPRESS_TIMEOUT' || code === 'ECONNABORTED') {
      return WordPressErrorCategory.TIMEOUT;
    }

    // Server errors
    if (statusCode >= 500) {
      return WordPressErrorCategory.SERVER;
    }

    return WordPressErrorCategory.UNKNOWN;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: WordPressApiError): boolean {
    return this.retryConfig.retryableErrors.includes(error.code);
  }

  /**
   * Get retry after time from error response
   */
  private getRetryAfterTime(error: any): number | undefined {
    if (error.response?.headers?.['retry-after']) {
      return parseInt(error.response.headers['retry-after'], 10);
    }
    return undefined;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(attempt: number, retryAfter?: number): number {
    if (retryAfter) {
      return retryAfter * 1000; // Convert to milliseconds
    }

    const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  /**
   * Check if circuit breaker is open
   */
  isCircuitBreakerOpen(): boolean {
    if (this.circuitBreakerState === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime > this.circuitBreakerConfig.recoveryTimeout) {
        this.circuitBreakerState = 'HALF_OPEN';
        secureLog('info', 'Circuit breaker moved to HALF_OPEN state');
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(error: EnhancedWordPressError): void {
    if (this.circuitBreakerConfig.expectedErrors.includes(error.code)) {
      return; // Don't count expected errors
    }

    if (error.retryable) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.circuitBreakerConfig.failureThreshold) {
        this.circuitBreakerState = 'OPEN';
        secureLog('warn', 'Circuit breaker opened due to consecutive failures', {
          failureCount: this.failureCount,
          threshold: this.circuitBreakerConfig.failureThreshold
        });
      }
    } else {
      // Reset on non-retryable errors
      this.failureCount = 0;
    }
  }

  /**
   * Record successful request
   */
  recordSuccess(): void {
    if (this.circuitBreakerState === 'HALF_OPEN') {
      this.circuitBreakerState = 'CLOSED';
      this.failureCount = 0;
      secureLog('info', 'Circuit breaker closed after successful request');
    }
    this.errorStats.consecutiveFailures = 0;
  }

  /**
   * Update error statistics
   */
  private updateErrorStats(error: EnhancedWordPressError): void {
    this.errorStats.totalErrors++;
    this.errorStats.errorsByCategory[error.category]++;
    this.errorStats.errorsByCode[error.code] = (this.errorStats.errorsByCode[error.code] || 0) + 1;
    this.errorStats.lastError = error;
    this.errorStats.consecutiveFailures++;
  }

  /**
   * Get error statistics
   */
  getErrorStats(): ErrorStats {
    return { ...this.errorStats };
  }

  /**
   * Reset error statistics
   */
  resetErrorStats(): void {
    this.errorStats = {
      totalErrors: 0,
      errorsByCategory: {
        [WordPressErrorCategory.AUTHENTICATION]: 0,
        [WordPressErrorCategory.AUTHORIZATION]: 0,
        [WordPressErrorCategory.VALIDATION]: 0,
        [WordPressErrorCategory.RATE_LIMIT]: 0,
        [WordPressErrorCategory.NETWORK]: 0,
        [WordPressErrorCategory.SERVER]: 0,
        [WordPressErrorCategory.TIMEOUT]: 0,
        [WordPressErrorCategory.UNKNOWN]: 0
      },
      errorsByCode: {},
      consecutiveFailures: 0
    };
  }

  /**
   * Get error code from HTTP status
   */
  private getErrorCodeFromStatus(status: number): string {
    switch (status) {
      case 400:
        return 'WORDPRESS_BAD_REQUEST';
      case 401:
        return 'WORDPRESS_AUTHENTICATION_ERROR';
      case 403:
        return 'WORDPRESS_PERMISSION_ERROR';
      case 404:
        return 'WORDPRESS_NOT_FOUND';
      case 429:
        return 'WORDPRESS_RATE_LIMIT';
      case 500:
        return 'WORDPRESS_SERVER_ERROR';
      case 502:
        return 'WORDPRESS_BAD_GATEWAY';
      case 503:
        return 'WORDPRESS_SERVICE_UNAVAILABLE';
      default:
        return 'WORDPRESS_API_ERROR';
    }
  }

  /**
   * Create user-friendly error message
   */
  createUserFriendlyMessage(error: EnhancedWordPressError): string {
    switch (error.category) {
      case WordPressErrorCategory.AUTHENTICATION:
        return 'Authentication failed. Please check your WordPress credentials and try again.';
      
      case WordPressErrorCategory.AUTHORIZATION:
        return 'You don\'t have permission to perform this action. Please contact your administrator.';
      
      case WordPressErrorCategory.VALIDATION:
        return 'The request contains invalid data. Please check your input and try again.';
      
      case WordPressErrorCategory.RATE_LIMIT:
        return 'Too many requests. Please wait a moment and try again.';
      
      case WordPressErrorCategory.NETWORK:
        return 'Unable to connect to WordPress. Please check your internet connection and try again.';
      
      case WordPressErrorCategory.TIMEOUT:
        return 'The request timed out. Please try again.';
      
      case WordPressErrorCategory.SERVER:
        return 'WordPress server error. Please try again later.';
      
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Log error with context
   */
  logError(error: EnhancedWordPressError, context?: Record<string, any>): void {
    const logData = {
      errorCode: error.code,
      errorMessage: error.message,
      category: error.category,
      retryable: error.retryable,
      statusCode: error.statusCode,
      requestId: error.requestId,
      endpoint: error.endpoint,
      method: error.method,
      timestamp: error.timestamp.toISOString(),
      context: { ...error.context, ...context }
    };

    if (error.category === WordPressErrorCategory.AUTHENTICATION) {
      secureLog('error', 'WordPress authentication error', logData);
    } else if (error.category === WordPressErrorCategory.RATE_LIMIT) {
      secureLog('warn', 'WordPress rate limit exceeded', logData);
    } else if (error.retryable) {
      secureLog('warn', 'WordPress retryable error', logData);
    } else {
      secureLog('error', 'WordPress API error', logData);
    }
  }
}

/**
 * Create WordPress error handler with default configuration
 */
export function createWordPressErrorHandler(
  retryConfig?: Partial<RetryConfig>,
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>
): WordPressErrorHandler {
  return new WordPressErrorHandler(retryConfig, circuitBreakerConfig);
} 
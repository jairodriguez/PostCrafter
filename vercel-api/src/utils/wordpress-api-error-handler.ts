import { WordPressError, WordPressErrorResponse, WordPressErrorContext } from '../types';
import { logger } from './logger';
import { getEnvVars } from './env';

/**
 * WordPress API error categories for classification
 */
export enum WordPressErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  RATE_LIMIT = 'rate_limit',
  SERVER_ERROR = 'server_error',
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
  PLUGIN_ERROR = 'plugin_error',
  THEME_ERROR = 'theme_error',
  DATABASE_ERROR = 'database_error',
  UNKNOWN = 'unknown'
}

/**
 * WordPress API error severity levels
 */
export enum WordPressErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * WordPress API error handling configuration
 */
export interface WordPressErrorConfig {
  maxRetryAttempts: number;
  retryDelayMs: number;
  exponentialBackoff: boolean;
  retryableErrorCodes: string[];
  retryableStatusCodes: number[];
  timeoutMs: number;
  enableDetailedLogging: boolean;
  enableMetrics: boolean;
}

/**
 * Error classification result
 */
export interface ErrorClassification {
  category: WordPressErrorCategory;
  severity: WordPressErrorSeverity;
  retryable: boolean;
  userMessage: string;
  techMessage: string;
  suggestedAction: string;
}

/**
 * Retry attempt information
 */
export interface RetryAttempt {
  attempt: number;
  delay: number;
  error: Error;
  timestamp: Date;
}

/**
 * WordPress API error statistics
 */
export interface ErrorStats {
  totalErrors: number;
  errorsByCategory: Record<WordPressErrorCategory, number>;
  errorsBySeverity: Record<WordPressErrorSeverity, number>;
  retryAttempts: number;
  successfulRetries: number;
  lastErrorTime: Date | null;
}

/**
 * WordPress API error handler class
 */
export class WordPressAPIErrorHandler {
  private config: WordPressErrorConfig;
  private stats: ErrorStats;
  private retryHistory: Map<string, RetryAttempt[]> = new Map();

  constructor(config?: Partial<WordPressErrorConfig>) {
    const envVars = getEnvVars();
    
    this.config = {
      maxRetryAttempts: 3,
      retryDelayMs: 1000,
      exponentialBackoff: true,
      retryableErrorCodes: [
        'rest_post_invalid_page_number',
        'rest_invalid_param',
        'rest_missing_callback_param',
        'rest_no_route',
        'timeout',
        'network_error'
      ],
      retryableStatusCodes: [408, 429, 500, 502, 503, 504],
      timeoutMs: envVars.WORDPRESS_TIMEOUT_MS || 30000,
      enableDetailedLogging: envVars.ENABLE_DEBUG_LOGGING || false,
      enableMetrics: true,
      ...config
    };

    this.stats = {
      totalErrors: 0,
      errorsByCategory: {} as Record<WordPressErrorCategory, number>,
      errorsBySeverity: {} as Record<WordPressErrorSeverity, number>,
      retryAttempts: 0,
      successfulRetries: 0,
      lastErrorTime: null
    };

    // Initialize stats counters
    Object.values(WordPressErrorCategory).forEach(category => {
      this.stats.errorsByCategory[category] = 0;
    });
    Object.values(WordPressErrorSeverity).forEach(severity => {
      this.stats.errorsBySeverity[severity] = 0;
    });
  }

  /**
   * Classify WordPress API error
   */
  classifyError(error: any, statusCode?: number): ErrorClassification {
    // Handle HTTP status codes
    if (statusCode) {
      switch (statusCode) {
        case 400:
          return this.createClassification(
            WordPressErrorCategory.VALIDATION,
            WordPressErrorSeverity.MEDIUM,
            false,
            'Invalid request data',
            `Bad request: ${error.message || 'Unknown validation error'}`,
            'Check your request parameters and try again'
          );
        
        case 401:
          return this.createClassification(
            WordPressErrorCategory.AUTHENTICATION,
            WordPressErrorSeverity.HIGH,
            false,
            'Authentication failed',
            `Unauthorized: ${error.message || 'Invalid credentials'}`,
            'Verify your WordPress credentials and API key'
          );
        
        case 403:
          return this.createClassification(
            WordPressErrorCategory.AUTHORIZATION,
            WordPressErrorSeverity.HIGH,
            false,
            'Access denied',
            `Forbidden: ${error.message || 'Insufficient permissions'}`,
            'Check user permissions and capabilities'
          );
        
        case 404:
          return this.createClassification(
            WordPressErrorCategory.NOT_FOUND,
            WordPressErrorSeverity.MEDIUM,
            false,
            'Resource not found',
            `Not found: ${error.message || 'The requested resource does not exist'}`,
            'Verify the resource ID or endpoint URL'
          );
        
        case 429:
          return this.createClassification(
            WordPressErrorCategory.RATE_LIMIT,
            WordPressErrorSeverity.MEDIUM,
            true,
            'Too many requests',
            `Rate limit exceeded: ${error.message || 'Request rate too high'}`,
            'Wait before making additional requests'
          );
        
        case 500:
        case 502:
        case 503:
        case 504:
          return this.createClassification(
            WordPressErrorCategory.SERVER_ERROR,
            WordPressErrorSeverity.HIGH,
            true,
            'Server error occurred',
            `Server error (${statusCode}): ${error.message || 'Internal server error'}`,
            'Try again later or contact site administrator'
          );
      }
    }

    // Handle WordPress-specific error codes
    const errorCode = error.code || error.error_code || error.slug;
    if (errorCode) {
      switch (errorCode) {
        case 'rest_invalid_username':
        case 'rest_invalid_email':
        case 'incorrect_password':
          return this.createClassification(
            WordPressErrorCategory.AUTHENTICATION,
            WordPressErrorSeverity.HIGH,
            false,
            'Login credentials are invalid',
            `Authentication failed: ${errorCode}`,
            'Check your username and password'
          );

        case 'rest_forbidden':
        case 'rest_cannot_create':
        case 'rest_cannot_edit':
        case 'rest_cannot_delete':
          return this.createClassification(
            WordPressErrorCategory.AUTHORIZATION,
            WordPressErrorSeverity.HIGH,
            false,
            'You do not have permission to perform this action',
            `Authorization failed: ${errorCode}`,
            'Contact administrator for proper permissions'
          );

        case 'rest_invalid_param':
        case 'rest_missing_callback_param':
        case 'rest_invalid_json':
          return this.createClassification(
            WordPressErrorCategory.VALIDATION,
            WordPressErrorSeverity.MEDIUM,
            false,
            'Invalid request parameters',
            `Validation failed: ${errorCode}`,
            'Check your request data format and required fields'
          );

        case 'rest_post_invalid_id':
        case 'rest_user_invalid_id':
        case 'rest_term_invalid_id':
          return this.createClassification(
            WordPressErrorCategory.NOT_FOUND,
            WordPressErrorSeverity.MEDIUM,
            false,
            'The requested item was not found',
            `Resource not found: ${errorCode}`,
            'Verify the ID exists and is accessible'
          );

        case 'rest_duplicate_term':
        case 'rest_term_exists':
          return this.createClassification(
            WordPressErrorCategory.VALIDATION,
            WordPressErrorSeverity.LOW,
            false,
            'This item already exists',
            `Duplicate resource: ${errorCode}`,
            'Use a different name or update the existing item'
          );
      }
    }

    // Handle network and timeout errors
    const errorMessage = error.message || error.toString();
    if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      return this.createClassification(
        WordPressErrorCategory.TIMEOUT,
        WordPressErrorSeverity.MEDIUM,
        true,
        'Request timed out',
        `Timeout error: ${errorMessage}`,
        'Try again with a longer timeout or check network connectivity'
      );
    }

    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
      return this.createClassification(
        WordPressErrorCategory.NETWORK_ERROR,
        WordPressErrorSeverity.HIGH,
        true,
        'Unable to connect to WordPress site',
        `Network error: ${errorMessage}`,
        'Check WordPress site URL and network connectivity'
      );
    }

    // Handle plugin-specific errors
    if (errorMessage.includes('plugin') || errorCode?.includes('plugin')) {
      return this.createClassification(
        WordPressErrorCategory.PLUGIN_ERROR,
        WordPressErrorSeverity.MEDIUM,
        false,
        'WordPress plugin error',
        `Plugin error: ${errorMessage}`,
        'Check plugin configuration or disable problematic plugins'
      );
    }

    // Handle database errors
    if (errorMessage.includes('database') || errorMessage.includes('mysql') || errorMessage.includes('sql')) {
      return this.createClassification(
        WordPressErrorCategory.DATABASE_ERROR,
        WordPressErrorSeverity.CRITICAL,
        false,
        'Database error occurred',
        `Database error: ${errorMessage}`,
        'Contact site administrator to check database connectivity'
      );
    }

    // Default classification for unknown errors
    return this.createClassification(
      WordPressErrorCategory.UNKNOWN,
      WordPressErrorSeverity.MEDIUM,
      false,
      'An unexpected error occurred',
      `Unknown error: ${errorMessage}`,
      'Try again or contact support if the problem persists'
    );
  }

  /**
   * Create error classification
   */
  private createClassification(
    category: WordPressErrorCategory,
    severity: WordPressErrorSeverity,
    retryable: boolean,
    userMessage: string,
    techMessage: string,
    suggestedAction: string
  ): ErrorClassification {
    return {
      category,
      severity,
      retryable,
      userMessage,
      techMessage,
      suggestedAction
    };
  }

  /**
   * Handle WordPress API error with classification and retry logic
   */
  async handleError(
    error: any,
    context: WordPressErrorContext,
    operation?: () => Promise<any>
  ): Promise<WordPressErrorResponse | any> {
    const classification = this.classifyError(error, context.statusCode);
    
    // Update statistics
    this.updateStats(classification);
    
    // Log the error
    this.logError(error, classification, context);

    // Attempt retry if applicable
    if (classification.retryable && operation && context.attempt < this.config.maxRetryAttempts) {
      return this.attemptRetry(error, context, operation, classification);
    }

    // Create final error response
    return this.createErrorResponse(error, classification, context);
  }

  /**
   * Attempt retry with exponential backoff
   */
  private async attemptRetry(
    error: any,
    context: WordPressErrorContext,
    operation: () => Promise<any>,
    classification: ErrorClassification
  ): Promise<any> {
    const attempt = context.attempt + 1;
    const delay = this.calculateRetryDelay(attempt);
    
    // Record retry attempt
    this.recordRetryAttempt(context.requestId, attempt, delay, error);

    logger.warn('Retrying WordPress API operation', {
      requestId: context.requestId,
      attempt,
      delay,
      category: classification.category,
      endpoint: context.endpoint,
      method: context.method
    });

    // Wait for delay
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      // Update context for retry
      const retryContext = { ...context, attempt };
      
      // Attempt the operation again
      const result = await operation();
      
      // Log successful retry
      this.stats.successfulRetries++;
      logger.info('WordPress API retry successful', {
        requestId: context.requestId,
        attempt,
        endpoint: context.endpoint,
        method: context.method
      });

      return result;
    } catch (retryError) {
      // If this was the last attempt, handle the final error
      if (attempt >= this.config.maxRetryAttempts) {
        const finalClassification = this.classifyError(retryError, context.statusCode);
        return this.createErrorResponse(retryError, finalClassification, { ...context, attempt });
      }
      
      // Otherwise, try again
      return this.handleError(retryError, { ...context, attempt }, operation);
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    if (!this.config.exponentialBackoff) {
      return this.config.retryDelayMs;
    }
    
    // Exponential backoff: delay * (2 ^ (attempt - 1))
    return this.config.retryDelayMs * Math.pow(2, attempt - 1);
  }

  /**
   * Record retry attempt for tracking
   */
  private recordRetryAttempt(requestId: string, attempt: number, delay: number, error: Error): void {
    if (!this.retryHistory.has(requestId)) {
      this.retryHistory.set(requestId, []);
    }
    
    const history = this.retryHistory.get(requestId)!;
    history.push({
      attempt,
      delay,
      error,
      timestamp: new Date()
    });

    this.stats.retryAttempts++;
    
    // Clean up old retry history (keep last 100 requests)
    if (this.retryHistory.size > 100) {
      const oldestKey = this.retryHistory.keys().next().value;
      this.retryHistory.delete(oldestKey);
    }
  }

  /**
   * Update error statistics
   */
  private updateStats(classification: ErrorClassification): void {
    this.stats.totalErrors++;
    this.stats.errorsByCategory[classification.category]++;
    this.stats.errorsBySeverity[classification.severity]++;
    this.stats.lastErrorTime = new Date();
  }

  /**
   * Log error with appropriate level based on severity
   */
  private logError(error: any, classification: ErrorClassification, context: WordPressErrorContext): void {
    const logContext = {
      requestId: context.requestId,
      error: {
        name: error.name || 'WordPressError',
        message: error.message || 'Unknown error',
        code: error.code || error.error_code || 'unknown',
        stack: this.config.enableDetailedLogging ? error.stack : undefined
      },
      metadata: {
        category: classification.category,
        severity: classification.severity,
        retryable: classification.retryable,
        endpoint: context.endpoint,
        method: context.method,
        statusCode: context.statusCode,
        attempt: context.attempt,
        userMessage: classification.userMessage,
        suggestedAction: classification.suggestedAction
      }
    };

    switch (classification.severity) {
      case WordPressErrorSeverity.CRITICAL:
        logger.error('Critical WordPress API error', logContext);
        break;
      case WordPressErrorSeverity.HIGH:
        logger.error('High severity WordPress API error', logContext);
        break;
      case WordPressErrorSeverity.MEDIUM:
        logger.warn('Medium severity WordPress API error', logContext);
        break;
      case WordPressErrorSeverity.LOW:
        logger.info('Low severity WordPress API error', logContext);
        break;
      default:
        logger.warn('WordPress API error', logContext);
    }
  }

  /**
   * Create standardized error response
   */
  private createErrorResponse(
    error: any,
    classification: ErrorClassification,
    context: WordPressErrorContext
  ): WordPressErrorResponse {
    return {
      success: false,
      error: {
        code: error.code || error.error_code || `wordpress_${classification.category}`,
        message: classification.userMessage,
        details: classification.techMessage,
        statusCode: context.statusCode || 500,
        wordPressCode: error.code || error.error_code,
        retryable: classification.retryable,
        context: {
          ...context,
          category: classification.category,
          severity: classification.severity,
          suggestedAction: classification.suggestedAction
        },
        timestamp: new Date().toISOString(),
        requestId: context.requestId
      }
    };
  }

  /**
   * Get error statistics
   */
  getStats(): ErrorStats {
    return { ...this.stats };
  }

  /**
   * Get retry history for a request
   */
  getRetryHistory(requestId: string): RetryAttempt[] {
    return this.retryHistory.get(requestId) || [];
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalErrors: 0,
      errorsByCategory: {} as Record<WordPressErrorCategory, number>,
      errorsBySeverity: {} as Record<WordPressErrorSeverity, number>,
      retryAttempts: 0,
      successfulRetries: 0,
      lastErrorTime: null
    };

    Object.values(WordPressErrorCategory).forEach(category => {
      this.stats.errorsByCategory[category] = 0;
    });
    Object.values(WordPressErrorSeverity).forEach(severity => {
      this.stats.errorsBySeverity[severity] = 0;
    });
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<WordPressErrorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): WordPressErrorConfig {
    return { ...this.config };
  }

  /**
   * Check if error code is retryable
   */
  isRetryableError(error: any, statusCode?: number): boolean {
    if (statusCode && this.config.retryableStatusCodes.includes(statusCode)) {
      return true;
    }
    
    const errorCode = error.code || error.error_code || error.slug;
    if (errorCode && this.config.retryableErrorCodes.includes(errorCode)) {
      return true;
    }
    
    return false;
  }

  /**
   * Create wrapper for WordPress API operations
   */
  wrapOperation<T>(operation: () => Promise<T>, context: Partial<WordPressErrorContext>): Promise<T> {
    const fullContext: WordPressErrorContext = {
      requestId: `wp_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      endpoint: 'unknown',
      method: 'unknown',
      attempt: 0,
      ...context
    };

    return operation().catch(error => {
      return this.handleError(error, fullContext, operation);
    });
  }
}

// Create default instance
let defaultHandler: WordPressAPIErrorHandler;

/**
 * Get or create default WordPress API error handler
 */
export function getWordPressErrorHandler(): WordPressAPIErrorHandler {
  if (!defaultHandler) {
    defaultHandler = new WordPressAPIErrorHandler();
  }
  return defaultHandler;
}

/**
 * Utility functions for WordPress API error handling
 */
export const wordPressErrorHandler = {
  handle: (error: any, context: WordPressErrorContext, operation?: () => Promise<any>) =>
    getWordPressErrorHandler().handleError(error, context, operation),
  
  classify: (error: any, statusCode?: number) =>
    getWordPressErrorHandler().classifyError(error, statusCode),
  
  wrap: <T>(operation: () => Promise<T>, context: Partial<WordPressErrorContext>) =>
    getWordPressErrorHandler().wrapOperation(operation, context),
  
  isRetryable: (error: any, statusCode?: number) =>
    getWordPressErrorHandler().isRetryableError(error, statusCode),
  
  getStats: () => getWordPressErrorHandler().getStats(),
  resetStats: () => getWordPressErrorHandler().resetStats(),
  updateConfig: (config: Partial<WordPressErrorConfig>) => getWordPressErrorHandler().updateConfig(config)
};

export default wordPressErrorHandler;
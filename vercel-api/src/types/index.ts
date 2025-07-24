import { PostStatus, PostWithStatus, PostStatusMetadata } from './post-status';

// Environment variables interface
export interface EnvVars {
  WORDPRESS_URL: string;
  WORDPRESS_USERNAME: string;
  WORDPRESS_APP_PASSWORD: string;
  GPT_API_KEY: string;
  JWT_SECRET: string;
  NODE_ENV: 'development' | 'production' | 'test';
  API_RATE_LIMIT_WINDOW_MS: number;
  API_RATE_LIMIT_MAX_REQUESTS: number;
  WORDPRESS_TIMEOUT_MS: number;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
  CORS_ORIGINS: string[];
  MAX_IMAGE_SIZE_MB: number;
  ENABLE_DEBUG_LOGGING: boolean;
  ENABLE_ADAPTIVE_RATE_LIMITING?: boolean;
  ADAPTIVE_RATE_LIMIT_MULTIPLIER?: number;
  // Security monitoring configuration
  SECURITY_MONITORING_ENABLED?: boolean;
  SECURITY_ALERTS_ENABLED?: boolean;
  SECURITY_ALERT_SEVERITY_THRESHOLD?: 'low' | 'medium' | 'high' | 'critical';
  SECURITY_ALERT_RATE_LIMIT_WINDOW_MS?: number;
  SECURITY_ALERT_MAX_PER_WINDOW?: number;
  // Notification channels
  SLACK_WEBHOOK_URL?: string;
  DISCORD_WEBHOOK_URL?: string;
  PAGERDUTY_ROUTING_KEY?: string;
  SECURITY_WEBHOOK_URL?: string;
  // Security hardening configuration
  MAX_REQUEST_SIZE_MB?: number;
  ENABLE_IP_REPUTATION?: boolean;
  ENABLE_TIMING_ATTACK_PROTECTION?: boolean;
  ENABLE_SECURITY_HARDENING?: boolean;
}

// WordPress post data interface
export interface WordPressPost {
  title: string;
  content: string;
  excerpt?: string;
  status?: PostStatus;
  categories?: string[];
  tags?: string[];
  featured_media?: number;
}

// WordPress post data interface for API operations
export interface WordPressPostData {
  title: string;
  content: string;
  excerpt?: string;
  status?: PostStatus;
  author?: number;
  slug?: string;
  featured_media?: number;
  comment_status?: 'open' | 'closed';
  ping_status?: 'open' | 'closed';
  format?: string;
  template?: string;
  sticky?: boolean;
  password?: string;
}

// Yoast SEO meta fields interface
export interface YoastMeta {
  meta_title?: string;
  meta_description?: string;
  focus_keywords?: string;
  canonical?: string;
  primary_category?: number;
  meta_robots_noindex?: string;
  meta_robots_nofollow?: string;
}

// Yoast meta fields for API operations
export interface YoastMetaFields {
  meta_title?: string;
  meta_description?: string;
  focus_keywords?: string;
  canonical?: string;
  primary_category?: number;
  meta_robots_noindex?: string;
  meta_robots_nofollow?: string;
}

// Complete post data interface
export interface PostData extends WordPressPost {
  yoast_meta?: YoastMeta;
  images?: ImageData[];
}

// Image data interface
export interface ImageData {
  url?: string;
  base64?: string;
  alt_text?: string;
  caption?: string;
  featured?: boolean;
  filename?: string;
  mime_type?: string;
}

// API request interface
export interface PublishRequest {
  post: PostData;
  yoast?: YoastMeta;
  options?: {
    publish_status?: PostStatus;
    include_images?: boolean;
    optimize_images?: boolean;
    validate_content?: boolean;
    status_metadata?: PostStatusMetadata;
  };
}

// API response interface
export interface PublishResponse {
  success: boolean;
  data?: {
    post_id: number;
    post_url: string;
    status: PostStatus | 'failed';
    message: string;
    timestamp: string;
    featured_image_id?: number;
    yoast_meta?: YoastMeta;
    processing_time_ms?: number;
    status_metadata?: PostStatusMetadata;
  };
  error?: ApiErrorResponse;
}

// Error response interface
export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: string;
  timestamp?: string;
  request_id?: string;
}

// Custom error classes
export class ApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: string;

  constructor(code: string, message: string, statusCode: number = 500, details?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details || undefined;
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: string) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication failed', details?: string) {
    super('AUTHENTICATION_ERROR', message, 401, details);
    this.name = 'AuthenticationError';
  }
}

export class WordPressApiError extends ApiError {
  constructor(message: string, details?: string) {
    super('WORDPRESS_API_ERROR', message, 500, details);
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string = 'Rate limit exceeded', details?: string) {
    super('RATE_LIMIT_ERROR', message, 429, details);
  }
}

/**
 * WordPress-specific error class for comprehensive error handling
 */
export class WordPressError extends ApiError {
  public readonly wordPressCode?: string;
  public readonly retryable: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    code: string, 
    message: string, 
    statusCode: number = 500, 
    details?: string,
    wordPressCode?: string,
    retryable: boolean = false,
    context?: Record<string, any>
  ) {
    super(code, message, statusCode, details);
    this.wordPressCode = wordPressCode;
    this.retryable = retryable;
    this.context = context;
  }

  /**
   * Create a retryable WordPress error
   */
  static createRetryable(
    code: string,
    message: string,
    statusCode: number = 500,
    details?: string,
    wordPressCode?: string,
    context?: Record<string, any>
  ): WordPressError {
    return new WordPressError(code, message, statusCode, details, wordPressCode, true, context);
  }

  /**
   * Create a non-retryable WordPress error
   */
  static createNonRetryable(
    code: string,
    message: string,
    statusCode: number = 500,
    details?: string,
    wordPressCode?: string,
    context?: Record<string, any>
  ): WordPressError {
    return new WordPressError(code, message, statusCode, details, wordPressCode, false, context);
  }

  /**
   * Check if this error should trigger a retry
   */
  shouldRetry(): boolean {
    return this.retryable && this.statusCode >= 500;
  }

  /**
   * Get error context for logging
   */
  getErrorContext(): Record<string, any> {
    return {
      code: this.code,
      wordPressCode: this.wordPressCode,
      statusCode: this.statusCode,
      retryable: this.retryable,
      context: this.context,
    };
  }
}

/**
 * WordPress error types for categorization
 */
export enum WordPressErrorType {
  // Authentication errors
  AUTHENTICATION_FAILED = 'WORDPRESS_AUTHENTICATION_ERROR',
  INVALID_CREDENTIALS = 'WORDPRESS_INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'WORDPRESS_TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'WORDPRESS_PERMISSION_ERROR',

  // Validation errors
  VALIDATION_ERROR = 'WORDPRESS_VALIDATION_ERROR',
  INVALID_POST_DATA = 'WORDPRESS_INVALID_POST_DATA',
  INVALID_META_FIELDS = 'WORDPRESS_INVALID_META_FIELDS',
  INVALID_TAXONOMY = 'WORDPRESS_INVALID_TAXONOMY',

  // Network errors
  CONNECTION_ERROR = 'WORDPRESS_CONNECTION_ERROR',
  TIMEOUT_ERROR = 'WORDPRESS_TIMEOUT',
  DNS_ERROR = 'WORDPRESS_DNS_ERROR',
  SSL_ERROR = 'WORDPRESS_SSL_ERROR',

  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'WORDPRESS_RATE_LIMIT',
  TOO_MANY_REQUESTS = 'WORDPRESS_TOO_MANY_REQUESTS',

  // Server errors
  SERVER_ERROR = 'WORDPRESS_SERVER_ERROR',
  BAD_GATEWAY = 'WORDPRESS_BAD_GATEWAY',
  SERVICE_UNAVAILABLE = 'WORDPRESS_SERVICE_UNAVAILABLE',
  INTERNAL_SERVER_ERROR = 'WORDPRESS_INTERNAL_ERROR',

  // Resource errors
  RESOURCE_NOT_FOUND = 'WORDPRESS_NOT_FOUND',
  RESOURCE_CONFLICT = 'WORDPRESS_CONFLICT',
  RESOURCE_LOCKED = 'WORDPRESS_LOCKED',

  // Content errors
  CONTENT_TOO_LARGE = 'WORDPRESS_CONTENT_TOO_LARGE',
  INVALID_CONTENT_TYPE = 'WORDPRESS_INVALID_CONTENT_TYPE',
  MALICIOUS_CONTENT = 'WORDPRESS_MALICIOUS_CONTENT',

  // Generic errors
  UNKNOWN_ERROR = 'WORDPRESS_UNKNOWN_ERROR',
  API_ERROR = 'WORDPRESS_API_ERROR',
}

/**
 * WordPress error context for detailed error information
 */
export interface WordPressErrorContext {
  requestId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseData?: any;
  requestData?: any;
  timestamp?: string;
  retryCount?: number;
  userAgent?: string;
  ipAddress?: string;
  userId?: string;
}

/**
 * Enhanced WordPress error response with context
 */
export interface WordPressErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string | string[];
    statusCode: number;
    wordPressCode?: string;
    retryable: boolean;
    context?: WordPressErrorContext;
    timestamp: string;
    requestId?: string;
  };
}

/**
 * WordPress API error details
 */
export interface WordPressApiErrorDetails {
  code: string;
  message: string;
  data?: any;
  additional_errors?: Array<{
    code: string;
    message: string;
    data?: any;
  }>;
}

/**
 * WordPress validation error details
 */
export interface WordPressValidationErrorDetails {
  field: string;
  code: string;
  message: string;
  data?: any;
}

/**
 * WordPress retry configuration
 */
export interface WordPressRetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  maxRetryDelay: number;
  retryableStatusCodes: number[];
  retryableErrorCodes: string[];
}

/**
 * WordPress error handling configuration
 */
export interface WordPressErrorHandlingConfig {
  enableDetailedLogging: boolean;
  enableErrorTracking: boolean;
  enableRetryLogic: boolean;
  enableCircuitBreaker: boolean;
  retryConfig: WordPressRetryConfig;
  errorThreshold: number;
  errorWindowMs: number;
}

// WordPress API response interfaces
export interface WordPressApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    data?: any;
  };
}

export interface WordPressResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: string[];
    statusCode?: number;
  };
  statusCode?: number;
}

export interface WordPressPostResponse {
  id: number;
  date: string;
  date_gmt: string;
  guid: {
    rendered: string;
  };
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
    protected: boolean;
  };
  excerpt: {
    rendered: string;
    protected: boolean;
  };
  author: number;
  featured_media: number;
  comment_status: string;
  ping_status: string;
  sticky: boolean;
  template: string;
  format: string;
  meta: any[];
  categories: number[];
  tags: number[];
  _links: any;
}

// Media upload response interface
export interface WordPressMediaResponse {
  id: number;
  date: string;
  date_gmt: string;
  guid: {
    rendered: string;
  };
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: {
    rendered: string;
  };
  author: number;
  comment_status: string;
  ping_status: string;
  template: string;
  meta: any[];
  description: {
    rendered: string;
  };
  caption: {
    rendered: string;
  };
  alt_text: string;
  media_type: string;
  mime_type: string;
  media_details: {
    width: number;
    height: number;
    file: string;
    sizes: {
      [key: string]: {
        file: string;
        width: number;
        height: number;
        mime_type: string;
        source_url: string;
      };
    };
  };
  post: number;
  source_url: string;
  _links: any;
}

// Request context interface for middleware
export interface RequestContext {
  requestId: string;
  timestamp: string;
  userAgent?: string;
  ipAddress?: string;
  apiKey?: string;
  startTime: number;
}

// Validation result interface
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData?: any;
}

// Rate limiting interface
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  windowMs: number;
}

// Logging interface
export interface LogEntry {
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

// Taxonomy interfaces
export interface CategoryData {
  id?: number;
  name: string;
  slug?: string;
  description?: string;
  parent?: number;
}

export interface TagData {
  id?: number;
  name: string;
  slug?: string;
  description?: string;
}

export interface TaxonomyTerm {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
  link: string;
  taxonomy: string;
  meta?: any[];
  _links?: any;
}

export interface TaxonomyResponse {
  success: boolean;
  data?: TaxonomyTerm[] & {
    categoryIds?: number[];
    tagIds?: number[];
    id?: number;
  };
  statusCode?: number;
  error?: {
    code: string;
    message: string;
    details?: string[];
  };
}

// Post creation result interface
export interface PostCreationResult {
  success: boolean;
  data?: WordPressPostResponse;
  postId?: number;
  postUrl?: string;
  postData?: WordPressPostResponse;
  warnings?: string[];
  error?: {
    code: string;
    message: string;
    details?: string[];
  };
}

// Post creation options interface
export interface PostCreationOptions {
  status?: 'draft' | 'publish' | 'private';
  author?: number;
  categories?: number[];
  tags?: number[];
  featured_media?: number;
  comment_status?: 'open' | 'closed';
  ping_status?: 'open' | 'closed';
  format?: string;
  template?: string;
  sticky?: boolean;
  password?: string;
  allowComments?: boolean;
  allowPings?: boolean;
} 
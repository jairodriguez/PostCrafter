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
}

// WordPress post data interface
export interface WordPressPost {
  title: string;
  content: string;
  excerpt?: string;
  status?: 'draft' | 'publish' | 'private';
  categories?: string[];
  tags?: string[];
  featured_media?: number;
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
  options?: {
    publish_status?: 'draft' | 'publish';
    include_images?: boolean;
    optimize_images?: boolean;
    validate_content?: boolean;
  };
}

// API response interface
export interface PublishResponse {
  success: boolean;
  data?: {
    post_id: number;
    post_url: string;
    status: 'draft' | 'publish' | 'failed';
    message: string;
    timestamp: string;
    featured_image_id?: number;
    yoast_meta?: YoastMeta;
    processing_time_ms?: number;
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
    this.details = details;
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
    super('WORDPRESS_API_ERROR', message, 502, details);
    this.name = 'WordPressApiError';
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string = 'Rate limit exceeded', details?: string) {
    super('RATE_LIMIT_ERROR', message, 429, details);
    this.name = 'RateLimitError';
  }
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
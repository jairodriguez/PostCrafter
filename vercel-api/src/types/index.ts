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
  title?: string;
  caption?: string;
  featured?: boolean;
}

// API request interface
export interface PublishRequest {
  post: PostData;
  api_key: string;
}

// API response interface
export interface PublishResponse {
  success: boolean;
  data?: {
    post_id: number;
    post_url: string;
    featured_image_id?: number;
    yoast_meta?: YoastMeta;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// WordPress API response interfaces
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
  meta: Record<string, unknown>;
  _links: Record<string, unknown>;
}

// WordPress media response interface
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
  meta: Record<string, unknown>;
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
    sizes: Record<string, unknown>;
  };
  post: number;
  source_url: string;
  _links: Record<string, unknown>;
}

// Error types
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class WordPressAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'WordPressAPIError';
  }
}

// Rate limiting interface
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
  statusCode: number;
}

// Logging interface
export interface LogEntry {
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
} 
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { logger, LogContext } from '../utils/logger';
import { getEnvVars } from '../utils/env';

/**
 * Request/Response logging configuration
 */
export interface RequestLoggerConfig {
  enableRequestLogging: boolean;
  enableResponseLogging: boolean;
  logRequestBody: boolean;
  logResponseBody: boolean;
  logHeaders: boolean;
  maxBodySize: number;
  sensitiveHeaders: string[];
  sensitiveBodyFields: string[];
  excludePaths: string[];
  logLevel: 'info' | 'debug';
}

/**
 * Default configuration for request/response logging
 */
const DEFAULT_CONFIG: RequestLoggerConfig = {
  enableRequestLogging: true,
  enableResponseLogging: true,
  logRequestBody: true,
  logResponseBody: false, // Response bodies can be large
  logHeaders: true,
  maxBodySize: 10240, // 10KB max body size to log
  sensitiveHeaders: [
    'authorization',
    'x-api-key',
    'cookie',
    'set-cookie',
    'wordpress_app_password',
    'gpt_api_key',
    'jwt_secret'
  ],
  sensitiveBodyFields: [
    'password',
    'apiKey',
    'api_key',
    'token',
    'secret',
    'authorization',
    'wordpress_app_password',
    'gpt_api_key'
  ],
  excludePaths: [
    '/health',
    '/favicon.ico',
    '/robots.txt'
  ],
  logLevel: 'info'
};

/**
 * Request/Response logger middleware
 */
export class RequestResponseLogger {
  private config: RequestLoggerConfig;
  private requestStartTimes: Map<string, number> = new Map();

  constructor(config?: Partial<RequestLoggerConfig>) {
    const envVars = getEnvVars();
    
    this.config = {
      ...DEFAULT_CONFIG,
      // Override with environment-based settings
      enableRequestLogging: envVars.ENABLE_DEBUG_LOGGING || DEFAULT_CONFIG.enableRequestLogging,
      logLevel: envVars.LOG_LEVEL === 'debug' ? 'debug' : 'info',
      ...config
    };
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Check if path should be excluded from logging
   */
  private shouldExcludePath(path: string): boolean {
    return this.config.excludePaths.some(excludePath => 
      path.startsWith(excludePath)
    );
  }

  /**
   * Sanitize headers by removing sensitive information
   */
  private sanitizeHeaders(headers: Record<string, string | string[] | undefined>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    Object.entries(headers).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase();
      
      if (this.config.sensitiveHeaders.some(sensitive => 
        lowerKey.includes(sensitive.toLowerCase())
      )) {
        sanitized[key] = this.maskValue(value);
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  /**
   * Sanitize request/response body by removing sensitive fields
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    if (Array.isArray(body)) {
      return body.map(item => this.sanitizeBody(item));
    }

    const sanitized: any = {};
    
    Object.entries(body).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase();
      
      if (this.config.sensitiveBodyFields.some(sensitive => 
        lowerKey.includes(sensitive.toLowerCase())
      )) {
        sanitized[key] = this.maskValue(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeBody(value);
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  /**
   * Mask sensitive values
   */
  private maskValue(value: any): string {
    if (typeof value !== 'string') {
      return '[REDACTED]';
    }
    
    if (value.length <= 4) {
      return '*'.repeat(value.length);
    }
    
    return `${value.substring(0, 2)}${'*'.repeat(value.length - 4)}${value.substring(value.length - 2)}`;
  }

  /**
   * Extract client IP address
   */
  private getClientIP(req: VercelRequest): string {
    const forwarded = req.headers['x-forwarded-for'];
    const realIP = req.headers['x-real-ip'];
    const connectionIP = req.connection?.remoteAddress;

    if (forwarded) {
      return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return Array.isArray(realIP) ? realIP[0] : realIP;
    }
    
    return connectionIP || 'unknown';
  }

  /**
   * Parse request body safely
   */
  private parseRequestBody(req: VercelRequest): any {
    try {
      if (!req.body) {
        return null;
      }

      // If body is already parsed object
      if (typeof req.body === 'object') {
        return req.body;
      }

      // If body is string, try to parse as JSON
      if (typeof req.body === 'string') {
        if (req.body.length > this.config.maxBodySize) {
          return '[BODY_TOO_LARGE]';
        }
        return JSON.parse(req.body);
      }

      return req.body;
    } catch (error) {
      return '[INVALID_JSON]';
    }
  }

  /**
   * Log incoming request
   */
  logRequest(req: VercelRequest, requestId: string): void {
    if (!this.config.enableRequestLogging) {
      return;
    }

    const path = req.url || '/';
    
    if (this.shouldExcludePath(path)) {
      return;
    }

    const startTime = Date.now();
    this.requestStartTimes.set(requestId, startTime);

    const logContext: LogContext = {
      requestId,
      method: req.method,
      url: path,
      ip: this.getClientIP(req),
      userAgent: req.headers['user-agent'],
      metadata: {
        component: 'request-logger',
        type: 'incoming_request',
        contentType: req.headers['content-type'],
        contentLength: req.headers['content-length'],
        referer: req.headers['referer'],
        origin: req.headers['origin']
      }
    };

    // Add headers if enabled
    if (this.config.logHeaders) {
      logContext.metadata!.headers = this.sanitizeHeaders(req.headers as Record<string, string | string[]>);
    }

    // Add request body if enabled and present
    if (this.config.logRequestBody && req.body) {
      const body = this.parseRequestBody(req);
      logContext.metadata!.body = this.sanitizeBody(body);
    }

    // Add query parameters
    if (req.url && req.url.includes('?')) {
      const url = new URL(req.url, 'http://localhost');
      const queryParams: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        queryParams[key] = value;
      });
      logContext.metadata!.queryParams = this.sanitizeBody(queryParams);
    }

    logger[this.config.logLevel]('Incoming HTTP request', logContext);
  }

  /**
   * Log outgoing response
   */
  logResponse(req: VercelRequest, res: VercelResponse, requestId: string, responseBody?: any): void {
    if (!this.config.enableResponseLogging) {
      return;
    }

    const path = req.url || '/';
    
    if (this.shouldExcludePath(path)) {
      return;
    }

    const startTime = this.requestStartTimes.get(requestId);
    const processingTime = startTime ? Date.now() - startTime : undefined;
    
    // Clean up stored start time
    this.requestStartTimes.delete(requestId);

    const logContext: LogContext = {
      requestId,
      method: req.method,
      url: path,
      statusCode: res.statusCode,
      processingTime,
      ip: this.getClientIP(req),
      metadata: {
        component: 'request-logger',
        type: 'outgoing_response',
        contentType: res.getHeader('content-type'),
        contentLength: res.getHeader('content-length')
      }
    };

    // Add response headers if enabled
    if (this.config.logHeaders) {
      const responseHeaders: Record<string, any> = {};
      res.getHeaderNames().forEach(name => {
        responseHeaders[name] = res.getHeader(name);
      });
      logContext.metadata!.headers = this.sanitizeHeaders(responseHeaders);
    }

    // Add response body if enabled and provided
    if (this.config.logResponseBody && responseBody) {
      logContext.metadata!.body = this.sanitizeBody(responseBody);
    }

    // Log with appropriate level based on status code
    const level = res.statusCode >= 400 ? 'warn' : this.config.logLevel;
    const message = res.statusCode >= 400 
      ? `HTTP response sent with error (${res.statusCode})`
      : 'HTTP response sent successfully';

    logger[level](message, logContext);

    // Log performance warning for slow requests
    if (processingTime && processingTime > 5000) {
      logger.logPerformance(`${req.method} ${path}`, processingTime, {
        requestId,
        statusCode: res.statusCode
      });
    }
  }

  /**
   * Create middleware function for request logging
   */
  requestMiddleware() {
    return (req: VercelRequest, res: VercelResponse, next: () => void): void => {
      const requestId = this.generateRequestId();
      
      // Add request ID to request object for correlation
      (req as any).requestId = requestId;
      
      // Add request ID header to response
      res.setHeader('X-Request-ID', requestId);
      
      this.logRequest(req, requestId);
      
      if (next) {
        next();
      }
    };
  }

  /**
   * Create middleware function for response logging
   */
  responseMiddleware() {
    return (req: VercelRequest, res: VercelResponse, responseBody?: any): void => {
      const requestId = (req as any).requestId || this.generateRequestId();
      this.logResponse(req, res, requestId, responseBody);
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RequestLoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): RequestLoggerConfig {
    return { ...this.config };
  }

  /**
   * Clear stored request times (useful for testing)
   */
  clearRequestTimes(): void {
    this.requestStartTimes.clear();
  }
}

// Create default logger instance
let defaultRequestLogger: RequestResponseLogger;

/**
 * Get or create default request logger instance
 */
export function getRequestLogger(): RequestResponseLogger {
  if (!defaultRequestLogger) {
    defaultRequestLogger = new RequestResponseLogger();
  }
  return defaultRequestLogger;
}

/**
 * Utility functions for request/response logging
 */
export const requestResponseLogger = {
  logRequest: (req: VercelRequest, requestId?: string) => {
    const id = requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    getRequestLogger().logRequest(req, id);
    return id;
  },
  
  logResponse: (req: VercelRequest, res: VercelResponse, requestId?: string, responseBody?: any) => {
    const id = requestId || (req as any).requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    getRequestLogger().logResponse(req, res, id, responseBody);
  },
  
  requestMiddleware: () => getRequestLogger().requestMiddleware(),
  responseMiddleware: () => getRequestLogger().responseMiddleware(),
  
  updateConfig: (config: Partial<RequestLoggerConfig>) => getRequestLogger().updateConfig(config),
  getConfig: () => getRequestLogger().getConfig()
};

export default requestResponseLogger;
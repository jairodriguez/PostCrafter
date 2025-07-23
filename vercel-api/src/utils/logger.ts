import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { getEnvVars } from './env';

/**
 * Log levels enum for type safety
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn', 
  INFO = 'info',
  DEBUG = 'debug'
}

/**
 * Log context interface for structured logging
 */
export interface LogContext {
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  processingTime?: number;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, any>;
  timestamp?: string;
  environment?: string;
  version?: string;
  component?: string;
}

/**
 * Logger configuration interface
 */
export interface LoggerConfig {
  level: LogLevel;
  environment: string;
  enableConsole: boolean;
  enableFile: boolean;
  enableRotation: boolean;
  maxFiles: string;
  maxSize: string;
  format: 'json' | 'simple';
  datePattern: string;
  filename: string;
  errorFilename: string;
  maskSensitiveData: boolean;
}

/**
 * Structured logger class using Winston
 */
export class StructuredLogger {
  private logger: winston.Logger;
  private config: LoggerConfig;
  private sensitiveFields = [
    'password', 'token', 'apikey', 'api_key', 'secret', 'authorization',
    'x-api-key', 'wordpress_app_password', 'gpt_api_key', 'jwt_secret'
  ];

  constructor(config?: Partial<LoggerConfig>) {
    const envVars = getEnvVars();
    
    this.config = {
      level: (envVars.LOG_LEVEL as LogLevel) || LogLevel.INFO,
      environment: envVars.NODE_ENV || 'development',
      enableConsole: envVars.NODE_ENV !== 'production',
      enableFile: envVars.NODE_ENV === 'production',
      enableRotation: true,
      maxFiles: '30d',
      maxSize: '20m',
      format: 'json',
      datePattern: 'YYYY-MM-DD',
      filename: 'logs/application-%DATE%.log',
      errorFilename: 'logs/error-%DATE%.log',
      maskSensitiveData: true,
      ...config
    };

    this.logger = this.createLogger();
  }

  /**
   * Create Winston logger with configured transports
   */
  private createLogger(): winston.Logger {
    const transports: winston.transport[] = [];

    // Console transport for development
    if (this.config.enableConsole) {
      transports.push(
        new winston.transports.Console({
          level: this.config.level,
          format: this.config.environment === 'development' 
            ? this.getDevelopmentFormat()
            : this.getProductionFormat(),
          handleExceptions: true,
          handleRejections: true
        })
      );
    }

    // File transports for production
    if (this.config.enableFile) {
      // General application logs
      if (this.config.enableRotation) {
        transports.push(
          new DailyRotateFile({
            level: this.config.level,
            filename: this.config.filename,
            datePattern: this.config.datePattern,
            maxFiles: this.config.maxFiles,
            maxSize: this.config.maxSize,
            format: this.getProductionFormat(),
            handleExceptions: true,
            handleRejections: true,
            zippedArchive: true
          })
        );

        // Separate error log file
        transports.push(
          new DailyRotateFile({
            level: 'error',
            filename: this.config.errorFilename,
            datePattern: this.config.datePattern,
            maxFiles: this.config.maxFiles,
            maxSize: this.config.maxSize,
            format: this.getProductionFormat(),
            handleExceptions: true,
            handleRejections: true,
            zippedArchive: true
          })
        );
      } else {
        transports.push(
          new winston.transports.File({
            level: this.config.level,
            filename: 'logs/application.log',
            format: this.getProductionFormat(),
            handleExceptions: true,
            handleRejections: true
          })
        );
      }
    }

    return winston.createLogger({
      level: this.config.level,
      transports,
      exitOnError: false,
      defaultMeta: {
        service: 'postcrafter-api',
        environment: this.config.environment,
        version: process.env.npm_package_version || '1.0.0'
      }
    });
  }

  /**
   * Get development format (colorized and readable)
   */
  private getDevelopmentFormat(): winston.Logform.Format {
    return winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaString = Object.keys(meta).length > 0 
          ? `\n${JSON.stringify(meta, null, 2)}` 
          : '';
        return `${timestamp} [${level}]: ${message}${metaString}`;
      })
    );
  }

  /**
   * Get production format (structured JSON)
   */
  private getProductionFormat(): winston.Logform.Format {
    return winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf((info) => {
        // Mask sensitive data in production
        if (this.config.maskSensitiveData) {
          info = this.maskSensitiveData(info);
        }
        return JSON.stringify(info);
      })
    );
  }

  /**
   * Mask sensitive data in log entries
   */
  private maskSensitiveData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const masked = { ...data };

    // Check each field for sensitive data
    Object.keys(masked).forEach(key => {
      const lowerKey = key.toLowerCase();
      
      if (this.sensitiveFields.some(field => lowerKey.includes(field))) {
        if (typeof masked[key] === 'string' && masked[key].length > 0) {
          masked[key] = this.maskString(masked[key]);
        }
      } else if (typeof masked[key] === 'object' && masked[key] !== null) {
        masked[key] = this.maskSensitiveData(masked[key]);
      }
    });

    return masked;
  }

  /**
   * Mask string values (show first and last 2 characters)
   */
  private maskString(value: string): string {
    if (value.length <= 4) {
      return '*'.repeat(value.length);
    }
    return `${value.substring(0, 2)}${'*'.repeat(value.length - 4)}${value.substring(value.length - 2)}`;
  }

  /**
   * Add correlation ID to log context
   */
  private addCorrelationId(context: LogContext = {}): LogContext {
    if (!context.requestId) {
      context.requestId = `log_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    }
    return context;
  }

  /**
   * Log error level message
   */
  error(message: string, context?: LogContext): void {
    const enrichedContext = this.addCorrelationId(context);
    this.logger.error(message, enrichedContext);
  }

  /**
   * Log warning level message
   */
  warn(message: string, context?: LogContext): void {
    const enrichedContext = this.addCorrelationId(context);
    this.logger.warn(message, enrichedContext);
  }

  /**
   * Log info level message
   */
  info(message: string, context?: LogContext): void {
    const enrichedContext = this.addCorrelationId(context);
    this.logger.info(message, enrichedContext);
  }

  /**
   * Log debug level message
   */
  debug(message: string, context?: LogContext): void {
    const enrichedContext = this.addCorrelationId(context);
    this.logger.debug(message, enrichedContext);
  }

  /**
   * Log HTTP request
   */
  logRequest(req: any, context?: LogContext): void {
    const requestContext: LogContext = {
      ...context,
      method: req.method,
      url: req.url,
      userAgent: req.headers?.['user-agent'],
      ip: req.headers?.['x-forwarded-for'] || 
          req.headers?.['x-real-ip'] || 
          req.connection?.remoteAddress,
      timestamp: new Date().toISOString()
    };

    this.info('HTTP request received', requestContext);
  }

  /**
   * Log HTTP response
   */
  logResponse(req: any, res: any, processingTime: number, context?: LogContext): void {
    const responseContext: LogContext = {
      ...context,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      processingTime,
      timestamp: new Date().toISOString()
    };

    const level = res.statusCode >= 400 ? 'warn' : 'info';
    this[level]('HTTP response sent', responseContext);
  }

  /**
   * Log authentication event
   */
  logAuth(success: boolean, reason?: string, context?: LogContext): void {
    const authContext: LogContext = {
      ...context,
      metadata: {
        success,
        reason,
        timestamp: new Date().toISOString()
      }
    };

    if (success) {
      this.info('Authentication successful', authContext);
    } else {
      this.warn('Authentication failed', authContext);
    }
  }

  /**
   * Log security event
   */
  logSecurity(eventType: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext): void {
    const securityContext: LogContext = {
      ...context,
      metadata: {
        eventType,
        severity,
        timestamp: new Date().toISOString()
      }
    };

    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    this[level](`Security event: ${eventType}`, securityContext);
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation: string, duration: number, context?: LogContext): void {
    const perfContext: LogContext = {
      ...context,
      metadata: {
        operation,
        duration,
        timestamp: new Date().toISOString()
      }
    };

    if (duration > 5000) { // Log slow operations as warnings
      this.warn(`Slow operation detected: ${operation}`, perfContext);
    } else {
      this.debug(`Performance: ${operation}`, perfContext);
    }
  }

  /**
   * Log WordPress API interaction
   */
  logWordPressAPI(endpoint: string, method: string, statusCode: number, duration: number, context?: LogContext): void {
    const wpContext: LogContext = {
      ...context,
      metadata: {
        endpoint,
        method,
        statusCode,
        duration,
        timestamp: new Date().toISOString()
      }
    };

    const level = statusCode >= 400 ? 'warn' : 'info';
    this[level](`WordPress API call: ${method} ${endpoint}`, wpContext);
  }

  /**
   * Change log level dynamically
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
    this.logger.level = level;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * Create child logger with default context
   */
  child(defaultContext: LogContext): ChildLogger {
    return new ChildLogger(this, defaultContext);
  }

  /**
   * Get logger instance for direct Winston access
   */
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }

  /**
   * Flush logs (useful for testing)
   */
  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.on('finish', resolve);
      this.logger.end();
    });
  }
}

/**
 * Child logger with default context
 */
export class ChildLogger {
  constructor(
    private parent: StructuredLogger,
    private defaultContext: LogContext
  ) {}

  private mergeContext(context?: LogContext): LogContext {
    return { ...this.defaultContext, ...context };
  }

  error(message: string, context?: LogContext): void {
    this.parent.error(message, this.mergeContext(context));
  }

  warn(message: string, context?: LogContext): void {
    this.parent.warn(message, this.mergeContext(context));
  }

  info(message: string, context?: LogContext): void {
    this.parent.info(message, this.mergeContext(context));
  }

  debug(message: string, context?: LogContext): void {
    this.parent.debug(message, this.mergeContext(context));
  }
}

// Create default logger instance
let defaultLogger: StructuredLogger;

/**
 * Get or create default logger instance
 */
export function getLogger(): StructuredLogger {
  if (!defaultLogger) {
    defaultLogger = new StructuredLogger();
  }
  return defaultLogger;
}

/**
 * Create a new logger with custom configuration
 */
export function createLogger(config?: Partial<LoggerConfig>): StructuredLogger {
  return new StructuredLogger(config);
}

/**
 * Utility functions for quick logging
 */
export const logger = {
  error: (message: string, context?: LogContext) => getLogger().error(message, context),
  warn: (message: string, context?: LogContext) => getLogger().warn(message, context),
  info: (message: string, context?: LogContext) => getLogger().info(message, context),
  debug: (message: string, context?: LogContext) => getLogger().debug(message, context),
  logRequest: (req: any, context?: LogContext) => getLogger().logRequest(req, context),
  logResponse: (req: any, res: any, processingTime: number, context?: LogContext) => 
    getLogger().logResponse(req, res, processingTime, context),
  logAuth: (success: boolean, reason?: string, context?: LogContext) => 
    getLogger().logAuth(success, reason, context),
  logSecurity: (eventType: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext) => 
    getLogger().logSecurity(eventType, severity, context),
  logPerformance: (operation: string, duration: number, context?: LogContext) => 
    getLogger().logPerformance(operation, duration, context),
  logWordPressAPI: (endpoint: string, method: string, statusCode: number, duration: number, context?: LogContext) => 
    getLogger().logWordPressAPI(endpoint, method, statusCode, duration, context),
  setLevel: (level: LogLevel) => getLogger().setLevel(level),
  getLevel: () => getLogger().getLevel(),
  child: (defaultContext: LogContext) => getLogger().child(defaultContext)
};

export default logger;
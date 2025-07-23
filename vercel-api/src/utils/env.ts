import { EnvVars } from '@/types';

/**
 * Environment variable validation rules with enhanced security
 */
const ENV_VALIDATION_RULES = {
  WORDPRESS_URL: {
    required: true,
    pattern: /^https?:\/\/.+/,
    message: 'WORDPRESS_URL must be a valid HTTP/HTTPS URL',
    secure: true, // Mark as sensitive for logging
  },
  WORDPRESS_USERNAME: {
    required: true,
    minLength: 1,
    maxLength: 60,
    pattern: /^[a-zA-Z0-9_-]+$/,
    message: 'WORDPRESS_USERNAME must be 1-60 characters, alphanumeric with hyphens/underscores only',
    secure: true,
  },
  WORDPRESS_APP_PASSWORD: {
    required: true,
    minLength: 8,
    pattern: /^[a-zA-Z0-9\s]+$/,
    message: 'WORDPRESS_APP_PASSWORD must be at least 8 characters, alphanumeric with spaces only',
    secure: true,
  },
  GPT_API_KEY: {
    required: true,
    pattern: /^sk-[a-zA-Z0-9]{32,}$/,
    message: 'GPT_API_KEY must be a valid OpenAI API key starting with sk-',
    secure: true,
  },
  JWT_SECRET: {
    required: true,
    minLength: 32,
    pattern: /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/,
    message: 'JWT_SECRET must be at least 32 characters with valid characters only',
    secure: true,
  },
  NODE_ENV: {
    required: false,
    default: 'development',
    enum: ['development', 'production', 'test'],
    message: 'NODE_ENV must be development, production, or test',
  },
  API_RATE_LIMIT_WINDOW_MS: {
    required: false,
    default: 60000,
    type: 'number',
    min: 1000,
    max: 3600000,
    message: 'API_RATE_LIMIT_WINDOW_MS must be between 1000 and 3600000 milliseconds',
  },
  API_RATE_LIMIT_MAX_REQUESTS: {
    required: false,
    default: 100,
    type: 'number',
    min: 1,
    max: 10000,
    message: 'API_RATE_LIMIT_MAX_REQUESTS must be between 1 and 10000',
  },
  ENABLE_ADAPTIVE_RATE_LIMITING: {
    required: false,
    default: false,
    type: 'boolean',
    message: 'ENABLE_ADAPTIVE_RATE_LIMITING must be true or false',
  },
  ADAPTIVE_RATE_LIMIT_MULTIPLIER: {
    required: false,
    default: 0.2,
    type: 'number',
    min: 0.1,
    max: 1.0,
    message: 'ADAPTIVE_RATE_LIMIT_MULTIPLIER must be between 0.1 and 1.0',
  },
  WORDPRESS_TIMEOUT_MS: {
    required: false,
    default: 30000,
    type: 'number',
    min: 5000,
    max: 120000,
    message: 'WORDPRESS_TIMEOUT_MS must be between 5000 and 120000 milliseconds',
  },
  LOG_LEVEL: {
    required: false,
    default: 'info',
    enum: ['error', 'warn', 'info', 'debug'],
    message: 'LOG_LEVEL must be error, warn, info, or debug',
  },
  CORS_ORIGINS: {
    required: false,
    default: ['*'],
    type: 'array',
    message: 'CORS_ORIGINS must be an array of allowed origins',
  },
  MAX_IMAGE_SIZE_MB: {
    required: false,
    default: 10,
    type: 'number',
    min: 1,
    max: 50,
    message: 'MAX_IMAGE_SIZE_MB must be between 1 and 50',
  },
  ENABLE_DEBUG_LOGGING: {
    required: false,
    default: false,
    type: 'boolean',
    message: 'ENABLE_DEBUG_LOGGING must be true or false',
  },
} as const;

/**
 * Mask sensitive values for secure logging
 */
function maskSensitiveValue(value: string, type: string): string {
  if (!value || value.length < 4) {
    return '***';
  }
  
  switch (type) {
    case 'GPT_API_KEY':
      // Show first 7 chars (sk-xxx) and last 4 chars
      return `${value.substring(0, 7)}...${value.substring(value.length - 4)}`;
    case 'JWT_SECRET':
      // Show first 8 and last 4 chars
      return `${value.substring(0, 8)}...${value.substring(value.length - 4)}`;
    case 'WORDPRESS_APP_PASSWORD':
      // Show first 4 and last 4 chars
      return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
    default:
      // Generic masking for other sensitive values
      return `${value.substring(0, 3)}...${value.substring(value.length - 3)}`;
  }
}

/**
 * Secure logging function that masks sensitive data
 */
function secureLog(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, any>): void {
  const maskedData = data ? { ...data } : {};
  
  // Mask sensitive values in data
  Object.keys(maskedData).forEach(key => {
    const rule = ENV_VALIDATION_RULES[key as keyof typeof ENV_VALIDATION_RULES];
    if (rule?.secure && typeof maskedData[key] === 'string') {
      maskedData[key] = maskSensitiveValue(maskedData[key], key);
    }
  });
  
  const logMessage = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(Object.keys(maskedData).length > 0 && { data: maskedData }),
  };
  
  // Use console methods based on level
  switch (level) {
    case 'error':
      console.error(JSON.stringify(logMessage));
      break;
    case 'warn':
      console.warn(JSON.stringify(logMessage));
      break;
    default:
      console.log(JSON.stringify(logMessage));
  }
}

/**
 * Validate a single environment variable with enhanced security
 */
function validateEnvVar(
  name: string,
  value: string | undefined,
  rules: typeof ENV_VALIDATION_RULES[keyof typeof ENV_VALIDATION_RULES]
): string | number | boolean {
  // Handle required validation
  if (rules.required && !value) {
    const errorMsg = `Missing required environment variable: ${name}`;
    secureLog('error', errorMsg);
    throw new Error(errorMsg);
  }

  // Handle default values
  if (!value && 'default' in rules) {
    secureLog('info', `Using default value for ${name}`, { [name]: rules.default });
    return rules.default;
  }

  if (!value) {
    const errorMsg = `Environment variable ${name} is required but not set`;
    secureLog('error', errorMsg);
    throw new Error(errorMsg);
  }

  // Handle type conversion
  if ('type' in rules) {
    if (rules.type === 'number') {
      const numValue = parseInt(value, 10);
      if (isNaN(numValue)) {
        const errorMsg = `Environment variable ${name} must be a valid number`;
        secureLog('error', errorMsg, { [name]: value });
        throw new Error(errorMsg);
      }
      if ('min' in rules && numValue < rules.min) {
        const errorMsg = `Environment variable ${name} must be at least ${rules.min}`;
        secureLog('error', errorMsg, { [name]: numValue, min: rules.min });
        throw new Error(errorMsg);
      }
      if ('max' in rules && numValue > rules.max) {
        const errorMsg = `Environment variable ${name} must be at most ${rules.max}`;
        secureLog('error', errorMsg, { [name]: numValue, max: rules.max });
        throw new Error(errorMsg);
      }
      return numValue;
    }
    if (rules.type === 'boolean') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
      const errorMsg = `Environment variable ${name} must be true or false`;
      secureLog('error', errorMsg, { [name]: value });
      throw new Error(errorMsg);
    }
    if (rules.type === 'array') {
      if (!Array.isArray(value)) {
        const errorMsg = `Environment variable ${name} must be an array`;
        secureLog('error', errorMsg, { [name]: value });
        throw new Error(errorMsg);
      }
      return value;
    }
  }

  // Handle string validation
  if ('minLength' in rules && value.length < rules.minLength) {
    const errorMsg = `Environment variable ${name} must be at least ${rules.minLength} characters`;
    secureLog('error', errorMsg, { [name]: maskSensitiveValue(value, name), minLength: rules.minLength });
    throw new Error(errorMsg);
  }
  if ('maxLength' in rules && value.length > rules.maxLength) {
    const errorMsg = `Environment variable ${name} must be at most ${rules.maxLength} characters`;
    secureLog('error', errorMsg, { [name]: maskSensitiveValue(value, name), maxLength: rules.maxLength });
    throw new Error(errorMsg);
  }
  if ('pattern' in rules && !rules.pattern.test(value)) {
    secureLog('error', rules.message, { [name]: maskSensitiveValue(value, name) });
    throw new Error(rules.message);
  }
  if ('enum' in rules && !rules.enum.includes(value as any)) {
    secureLog('error', rules.message, { [name]: value, allowedValues: rules.enum });
    throw new Error(rules.message);
  }

  // Log successful validation for sensitive values
  if (rules.secure) {
    secureLog('info', `Environment variable ${name} validated successfully`, { 
      [name]: maskSensitiveValue(value, name) 
    });
  }

  return value;
}

/**
 * Parse CORS origins string into array
 */
function parseCorsOrigins(origins: string): string[] {
  if (origins === '*') return ['*'];
  return origins.split(',').map(origin => origin.trim()).filter(Boolean);
}

/**
 * Validate and load environment variables
 */
export function loadEnvVars(): EnvVars {
  const envVars: Partial<EnvVars> = {};

  // Validate each environment variable
  for (const [key, rules] of Object.entries(ENV_VALIDATION_RULES)) {
    const value = process.env[key];
    envVars[key as keyof EnvVars] = validateEnvVar(key, value, rules) as any;
  }

  // Additional validation for WordPress URL
  const wordpressUrl = envVars.WORDPRESS_URL as string;
  try {
    const url = new URL(wordpressUrl);
    if (!url.protocol.startsWith('http')) {
      throw new Error('WORDPRESS_URL must use HTTP or HTTPS protocol');
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid WORDPRESS_URL: ${error.message}`);
    }
    throw new Error('WORDPRESS_URL must be a valid URL');
  }

  // Parse CORS origins
  const corsOrigins = parseCorsOrigins(envVars.CORS_ORIGINS as string);

  return {
    WORDPRESS_URL: wordpressUrl,
    WORDPRESS_USERNAME: envVars.WORDPRESS_USERNAME as string,
    WORDPRESS_APP_PASSWORD: envVars.WORDPRESS_APP_PASSWORD as string,
    GPT_API_KEY: envVars.GPT_API_KEY as string,
    JWT_SECRET: envVars.JWT_SECRET as string,
    NODE_ENV: envVars.NODE_ENV as EnvVars['NODE_ENV'],
    API_RATE_LIMIT_WINDOW_MS: envVars.API_RATE_LIMIT_WINDOW_MS as number,
    API_RATE_LIMIT_MAX_REQUESTS: envVars.API_RATE_LIMIT_MAX_REQUESTS as number,
    ENABLE_ADAPTIVE_RATE_LIMITING: envVars.ENABLE_ADAPTIVE_RATE_LIMITING as boolean,
    ADAPTIVE_RATE_LIMIT_MULTIPLIER: envVars.ADAPTIVE_RATE_LIMIT_MULTIPLIER as number,
    WORDPRESS_TIMEOUT_MS: envVars.WORDPRESS_TIMEOUT_MS as number,
    LOG_LEVEL: envVars.LOG_LEVEL as string,
    CORS_ORIGINS: corsOrigins,
    MAX_IMAGE_SIZE_MB: envVars.MAX_IMAGE_SIZE_MB as number,
    ENABLE_DEBUG_LOGGING: envVars.ENABLE_DEBUG_LOGGING as boolean,
  };
}

/**
 * Get environment variables with validation
 */
export function getEnvVars(): EnvVars {
  if (!globalThis.envVars) {
    globalThis.envVars = loadEnvVars();
  }
  return globalThis.envVars;
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return getEnvVars().NODE_ENV === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return getEnvVars().NODE_ENV === 'production';
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return getEnvVars().NODE_ENV === 'test';
}

/**
 * Get rate limiting configuration
 */
export function getRateLimitConfig() {
  const env = getEnvVars();
  return {
    windowMs: env.API_RATE_LIMIT_WINDOW_MS,
    maxRequests: env.API_RATE_LIMIT_MAX_REQUESTS,
  };
}

/**
 * Get WordPress API configuration
 */
export function getWordPressConfig() {
  const env = getEnvVars();
  return {
    url: env.WORDPRESS_URL,
    username: env.WORDPRESS_USERNAME,
    appPassword: env.WORDPRESS_APP_PASSWORD,
    timeout: env.WORDPRESS_TIMEOUT_MS,
  };
}

/**
 * Get CORS configuration
 */
export function getCorsConfig() {
  const env = getEnvVars();
  return {
    origins: env.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  };
}

/**
 * Get logging configuration
 */
export function getLoggingConfig() {
  const env = getEnvVars();
  return {
    level: env.LOG_LEVEL,
    enableDebug: env.ENABLE_DEBUG_LOGGING,
  };
}

/**
 * Validate environment variables without throwing errors
 */
export function validateEnvVarsSilently(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    loadEnvVars();
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof Error) {
      errors.push(error.message);
    } else {
      errors.push('Unknown environment validation error');
    }
    return { valid: false, errors };
  }
}

/**
 * Get a secure summary of environment configuration for health checks
 */
export function getSecureEnvSummary(): Record<string, any> {
  const env = getEnvVars();
  
  return {
    NODE_ENV: env.NODE_ENV,
    LOG_LEVEL: env.LOG_LEVEL,
    API_RATE_LIMIT_WINDOW_MS: env.API_RATE_LIMIT_WINDOW_MS,
    API_RATE_LIMIT_MAX_REQUESTS: env.API_RATE_LIMIT_MAX_REQUESTS,
    WORDPRESS_TIMEOUT_MS: env.WORDPRESS_TIMEOUT_MS,
    MAX_IMAGE_SIZE_MB: env.MAX_IMAGE_SIZE_MB,
    ENABLE_DEBUG_LOGGING: env.ENABLE_DEBUG_LOGGING,
    CORS_ORIGINS: env.CORS_ORIGINS,
    // Mask sensitive values
    WORDPRESS_URL: maskSensitiveValue(env.WORDPRESS_URL, 'WORDPRESS_URL'),
    WORDPRESS_USERNAME: maskSensitiveValue(env.WORDPRESS_USERNAME, 'WORDPRESS_USERNAME'),
    WORDPRESS_APP_PASSWORD: maskSensitiveValue(env.WORDPRESS_APP_PASSWORD, 'WORDPRESS_APP_PASSWORD'),
    GPT_API_KEY: maskSensitiveValue(env.GPT_API_KEY, 'GPT_API_KEY'),
    JWT_SECRET: maskSensitiveValue(env.JWT_SECRET, 'JWT_SECRET'),
  };
}

/**
 * Check if environment is properly configured for production
 */
export function isProductionReady(): { ready: boolean; issues: string[] } {
  const issues: string[] = [];
  const env = getEnvVars();
  
  // Check for production environment
  if (env.NODE_ENV !== 'production') {
    issues.push('NODE_ENV should be set to "production" in production environment');
  }
  
  // Check JWT secret strength
  if (env.JWT_SECRET.length < 64) {
    issues.push('JWT_SECRET should be at least 64 characters long for production');
  }
  
  // Check for wildcard CORS in production
  if (env.CORS_ORIGINS.includes('*')) {
    issues.push('CORS_ORIGINS should not use wildcard (*) in production');
  }
  
  // Check debug logging is disabled
  if (env.ENABLE_DEBUG_LOGGING) {
    issues.push('ENABLE_DEBUG_LOGGING should be false in production');
  }
  
  // Check log level is appropriate
  if (env.LOG_LEVEL === 'debug') {
    issues.push('LOG_LEVEL should not be "debug" in production');
  }
  
  return {
    ready: issues.length === 0,
    issues,
  };
}

/**
 * Get security audit information for environment variables
 */
export function getSecurityAuditInfo(): Record<string, any> {
  const env = getEnvVars();
  const productionReady = isProductionReady();
  
  return {
    environment: env.NODE_ENV,
    productionReady: productionReady.ready,
    productionIssues: productionReady.issues,
    securityMeasures: {
      jwtSecretLength: env.JWT_SECRET.length,
      jwtSecretStrength: env.JWT_SECRET.length >= 64 ? 'strong' : 'weak',
      corsWildcard: env.CORS_ORIGINS.includes('*'),
      debugLogging: env.ENABLE_DEBUG_LOGGING,
      logLevel: env.LOG_LEVEL,
      rateLimiting: {
        enabled: true,
        windowMs: env.API_RATE_LIMIT_WINDOW_MS,
        maxRequests: env.API_RATE_LIMIT_MAX_REQUESTS,
      },
    },
    sensitiveVariables: {
      wordpressUrl: maskSensitiveValue(env.WORDPRESS_URL, 'WORDPRESS_URL'),
      wordpressUsername: maskSensitiveValue(env.WORDPRESS_USERNAME, 'WORDPRESS_USERNAME'),
      wordpressAppPassword: maskSensitiveValue(env.WORDPRESS_APP_PASSWORD, 'WORDPRESS_APP_PASSWORD'),
      gptApiKey: maskSensitiveValue(env.GPT_API_KEY, 'GPT_API_KEY'),
      jwtSecret: maskSensitiveValue(env.JWT_SECRET, 'JWT_SECRET'),
    },
  };
}

/**
 * Validate API key format without exposing the actual key
 */
export function validateApiKeyFormat(apiKey: string): { valid: boolean; error?: string } {
  if (!apiKey) {
    return { valid: false, error: 'API key is required' };
  }
  
  // Remove Bearer prefix if present
  const cleanKey = apiKey.replace(/^Bearer\s+/i, '');
  
  if (cleanKey.length < 10) {
    return { valid: false, error: 'API key is too short' };
  }
  
  // Basic format validation for OpenAI API keys
  if (!/^sk-[a-zA-Z0-9]{32,}$/.test(cleanKey)) {
    return { valid: false, error: 'API key format is invalid' };
  }
  
  return { valid: true };
}

/**
 * Secure function to check if API key matches stored key
 */
export function validateApiKey(apiKey: string): { valid: boolean; error?: string } {
  const formatCheck = validateApiKeyFormat(apiKey);
  if (!formatCheck.valid) {
    return formatCheck;
  }
  
  const env = getEnvVars();
  const cleanKey = apiKey.replace(/^Bearer\s+/i, '');
  
  if (cleanKey !== env.GPT_API_KEY) {
    secureLog('warn', 'Invalid API key attempt', { 
      providedKey: maskSensitiveValue(cleanKey, 'GPT_API_KEY') 
    });
    return { valid: false, error: 'Invalid API key' };
  }
  
  return { valid: true };
}

// Extend global to include envVars cache
declare global {
  var envVars: EnvVars | undefined;
} 
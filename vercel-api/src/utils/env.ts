import { EnvVars } from '@/types';

/**
 * Environment variable validation rules
 */
const ENV_VALIDATION_RULES = {
  WORDPRESS_URL: {
    required: true,
    pattern: /^https?:\/\/.+/,
    message: 'WORDPRESS_URL must be a valid HTTP/HTTPS URL',
  },
  WORDPRESS_USERNAME: {
    required: true,
    minLength: 1,
    maxLength: 60,
    pattern: /^[a-zA-Z0-9_-]+$/,
    message: 'WORDPRESS_USERNAME must be 1-60 characters, alphanumeric with hyphens/underscores only',
  },
  WORDPRESS_APP_PASSWORD: {
    required: true,
    minLength: 8,
    pattern: /^[a-zA-Z0-9\s]+$/,
    message: 'WORDPRESS_APP_PASSWORD must be at least 8 characters, alphanumeric with spaces',
  },
  GPT_API_KEY: {
    required: true,
    pattern: /^sk-[a-zA-Z0-9]{32,}$/,
    message: 'GPT_API_KEY must be a valid OpenAI API key starting with sk-',
  },
  JWT_SECRET: {
    required: true,
    minLength: 32,
    maxLength: 256,
    message: 'JWT_SECRET must be 32-256 characters long',
  },
  NODE_ENV: {
    required: false,
    allowedValues: ['development', 'production', 'test'],
    defaultValue: 'development',
    message: 'NODE_ENV must be development, production, or test',
  },
  API_RATE_LIMIT_WINDOW_MS: {
    required: false,
    defaultValue: 60000, // 1 minute
    type: 'number',
    min: 1000,
    max: 3600000, // 1 hour
    message: 'API_RATE_LIMIT_WINDOW_MS must be between 1000 and 3600000 milliseconds',
  },
  API_RATE_LIMIT_MAX_REQUESTS: {
    required: false,
    defaultValue: 100,
    type: 'number',
    min: 1,
    max: 10000,
    message: 'API_RATE_LIMIT_MAX_REQUESTS must be between 1 and 10000',
  },
  WORDPRESS_TIMEOUT_MS: {
    required: false,
    defaultValue: 30000, // 30 seconds
    type: 'number',
    min: 5000,
    max: 120000, // 2 minutes
    message: 'WORDPRESS_TIMEOUT_MS must be between 5000 and 120000 milliseconds',
  },
  LOG_LEVEL: {
    required: false,
    allowedValues: ['error', 'warn', 'info', 'debug'],
    defaultValue: 'info',
    message: 'LOG_LEVEL must be error, warn, info, or debug',
  },
  CORS_ORIGINS: {
    required: false,
    defaultValue: '*',
    message: 'CORS_ORIGINS must be a comma-separated list of allowed origins or *',
  },
  MAX_IMAGE_SIZE_MB: {
    required: false,
    defaultValue: 10,
    type: 'number',
    min: 1,
    max: 50,
    message: 'MAX_IMAGE_SIZE_MB must be between 1 and 50',
  },
  ENABLE_DEBUG_LOGGING: {
    required: false,
    defaultValue: false,
    type: 'boolean',
    message: 'ENABLE_DEBUG_LOGGING must be true or false',
  },
} as const;

/**
 * Validate a single environment variable
 */
function validateEnvVar(
  name: string,
  value: string | undefined,
  rules: typeof ENV_VALIDATION_RULES[keyof typeof ENV_VALIDATION_RULES]
): string | number | boolean {
  // Handle required validation
  if (rules.required && !value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  // Handle default values
  if (!value && 'defaultValue' in rules) {
    return rules.defaultValue;
  }

  if (!value) {
    throw new Error(`Environment variable ${name} is required but not set`);
  }

  // Handle type conversion
  if ('type' in rules) {
    if (rules.type === 'number') {
      const numValue = parseInt(value, 10);
      if (isNaN(numValue)) {
        throw new Error(`Environment variable ${name} must be a valid number`);
      }
      if ('min' in rules && numValue < rules.min) {
        throw new Error(`Environment variable ${name} must be at least ${rules.min}`);
      }
      if ('max' in rules && numValue > rules.max) {
        throw new Error(`Environment variable ${name} must be at most ${rules.max}`);
      }
      return numValue;
    }
    if (rules.type === 'boolean') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
      throw new Error(`Environment variable ${name} must be true or false`);
    }
  }

  // Handle string validation
  if ('minLength' in rules && value.length < rules.minLength) {
    throw new Error(`Environment variable ${name} must be at least ${rules.minLength} characters`);
  }
  if ('maxLength' in rules && value.length > rules.maxLength) {
    throw new Error(`Environment variable ${name} must be at most ${rules.maxLength} characters`);
  }
  if ('pattern' in rules && !rules.pattern.test(value)) {
    throw new Error(rules.message);
  }
  if ('allowedValues' in rules && !rules.allowedValues.includes(value as any)) {
    throw new Error(rules.message);
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

// Extend global to include envVars cache
declare global {
  var envVars: EnvVars | undefined;
} 
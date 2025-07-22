import { EnvVars } from '@/types';

/**
 * Validate and load environment variables
 */
export function loadEnvVars(): EnvVars {
  const requiredVars = [
    'WORDPRESS_URL',
    'WORDPRESS_USERNAME',
    'WORDPRESS_APP_PASSWORD',
    'GPT_API_KEY',
    'JWT_SECRET',
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  // Validate WordPress URL format
  const wordpressUrl = process.env.WORDPRESS_URL!;
  try {
    new URL(wordpressUrl);
  } catch {
    throw new Error('WORDPRESS_URL must be a valid URL');
  }

  // Validate JWT secret length
  const jwtSecret = process.env.JWT_SECRET!;
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  return {
    WORDPRESS_URL: wordpressUrl,
    WORDPRESS_USERNAME: process.env.WORDPRESS_USERNAME!,
    WORDPRESS_APP_PASSWORD: process.env.WORDPRESS_APP_PASSWORD!,
    GPT_API_KEY: process.env.GPT_API_KEY!,
    JWT_SECRET: jwtSecret,
    NODE_ENV: (process.env.NODE_ENV as EnvVars['NODE_ENV']) || 'development',
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

// Extend global to include envVars cache
declare global {
  var envVars: EnvVars | undefined;
} 
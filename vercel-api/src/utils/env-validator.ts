import { validateEnvVarsSilently } from './env';

/**
 * Environment variable validation result
 */
export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missing: string[];
  invalid: string[];
  suggestions: string[];
}

/**
 * Environment variable validation rules for documentation
 */
export const ENV_VARIABLES_DOCS = {
  WORDPRESS_URL: {
    description: 'Your WordPress site URL (must include protocol)',
    example: 'https://your-wordpress-site.com',
    required: true,
    validation: 'Must be a valid HTTP/HTTPS URL',
  },
  WORDPRESS_USERNAME: {
    description: 'WordPress username for API authentication',
    example: 'admin',
    required: true,
    validation: '1-60 characters, alphanumeric with hyphens/underscores only',
  },
  WORDPRESS_APP_PASSWORD: {
    description: 'WordPress application password (not regular password)',
    example: 'abcd 1234 efgh 5678',
    required: true,
    validation: 'At least 8 characters, alphanumeric with spaces',
  },
  GPT_API_KEY: {
    description: 'OpenAI GPT API key for authentication',
    example: 'sk-1234567890abcdef1234567890abcdef',
    required: true,
    validation: 'Must start with sk- and be at least 32 characters',
  },
  JWT_SECRET: {
    description: 'Secret key for JWT token generation (32+ characters)',
    example: 'your-super-secret-jwt-key-that-is-very-long-and-secure',
    required: true,
    validation: '32-256 characters long',
  },
  NODE_ENV: {
    description: 'Application environment',
    example: 'production',
    required: false,
    defaultValue: 'development',
    validation: 'development, production, or test',
  },
  API_RATE_LIMIT_WINDOW_MS: {
    description: 'Rate limiting window in milliseconds',
    example: '60000',
    required: false,
    defaultValue: '60000 (1 minute)',
    validation: '1000-3600000 milliseconds',
  },
  API_RATE_LIMIT_MAX_REQUESTS: {
    description: 'Maximum requests per rate limit window',
    example: '100',
    required: false,
    defaultValue: '100',
    validation: '1-10000 requests',
  },
  WORDPRESS_TIMEOUT_MS: {
    description: 'WordPress API request timeout in milliseconds',
    example: '30000',
    required: false,
    defaultValue: '30000 (30 seconds)',
    validation: '5000-120000 milliseconds',
  },
  LOG_LEVEL: {
    description: 'Application logging level',
    example: 'info',
    required: false,
    defaultValue: 'info',
    validation: 'error, warn, info, or debug',
  },
  CORS_ORIGINS: {
    description: 'Allowed CORS origins (comma-separated or * for all)',
    example: 'https://chat.openai.com,https://your-domain.com',
    required: false,
    defaultValue: '* (all origins)',
    validation: 'Comma-separated list of origins or *',
  },
  MAX_IMAGE_SIZE_MB: {
    description: 'Maximum image file size in megabytes',
    example: '10',
    required: false,
    defaultValue: '10',
    validation: '1-50 megabytes',
  },
  ENABLE_DEBUG_LOGGING: {
    description: 'Enable detailed debug logging',
    example: 'true',
    required: false,
    defaultValue: 'false',
    validation: 'true or false',
  },
} as const;

/**
 * Validate environment variables and provide detailed feedback
 */
export function validateEnvironment(): EnvValidationResult {
  const result: EnvValidationResult = {
    valid: false,
    errors: [],
    warnings: [],
    missing: [],
    invalid: [],
    suggestions: [],
  };

  // Check validation
  const validation = validateEnvVarsSilently();
  result.valid = validation.valid;
  result.errors = validation.errors;

  // Check for missing required variables
  for (const [key, config] of Object.entries(ENV_VARIABLES_DOCS)) {
    if (config.required && !process.env[key]) {
      result.missing.push(key);
    }
  }

  // Check for invalid values
  for (const [key, config] of Object.entries(ENV_VARIABLES_DOCS)) {
    const value = process.env[key];
    if (value) {
      // Basic validation checks
      if (key === 'WORDPRESS_URL' && !value.startsWith('http')) {
        result.invalid.push(`${key}: Must start with http:// or https://`);
      }
      if (key === 'GPT_API_KEY' && !value.startsWith('sk-')) {
        result.invalid.push(`${key}: Must start with sk-`);
      }
      if (key === 'JWT_SECRET' && value.length < 32) {
        result.invalid.push(`${key}: Must be at least 32 characters long`);
      }
      if (key === 'NODE_ENV' && !['development', 'production', 'test'].includes(value)) {
        result.invalid.push(`${key}: Must be development, production, or test`);
      }
    }
  }

  // Generate suggestions
  if (result.missing.length > 0) {
    result.suggestions.push('Set all required environment variables');
  }
  if (result.invalid.length > 0) {
    result.suggestions.push('Fix invalid environment variable values');
  }
  if (process.env.NODE_ENV === 'production' && process.env.LOG_LEVEL === 'debug') {
    result.warnings.push('Debug logging is enabled in production - consider setting LOG_LEVEL=info');
  }
  if (process.env.CORS_ORIGINS === '*') {
    result.warnings.push('CORS is set to allow all origins - consider restricting for production');
  }

  return result;
}

/**
 * Generate environment variables template
 */
export function generateEnvTemplate(): string {
  let template = '# PostCrafter Vercel API Environment Variables\n';
  template += '# Copy this file to .env.local and fill in your values\n\n';

  for (const [key, config] of Object.entries(ENV_VARIABLES_DOCS)) {
    template += `# ${config.description}\n`;
    if (config.example) {
      template += `# Example: ${config.example}\n`;
    }
    if (config.validation) {
      template += `# Validation: ${config.validation}\n`;
    }
    if (config.required) {
      template += `${key}=${config.example || 'your-value-here'}\n`;
    } else {
      template += `# ${key}=${config.example || 'your-value-here'} # Optional (default: ${config.defaultValue})\n`;
    }
    template += '\n';
  }

  return template;
}

/**
 * Check if environment is properly configured for production
 */
export function checkProductionReadiness(): { ready: boolean; issues: string[] } {
  const issues: string[] = [];
  const env = process.env;

  // Check required variables
  const requiredVars = ['WORDPRESS_URL', 'WORDPRESS_USERNAME', 'WORDPRESS_APP_PASSWORD', 'GPT_API_KEY', 'JWT_SECRET'];
  for (const varName of requiredVars) {
    if (!env[varName]) {
      issues.push(`Missing required environment variable: ${varName}`);
    }
  }

  // Check production-specific settings
  if (env.NODE_ENV === 'production') {
    if (env.LOG_LEVEL === 'debug') {
      issues.push('Debug logging should not be enabled in production');
    }
    if (env.CORS_ORIGINS === '*') {
      issues.push('CORS should be restricted in production');
    }
    if (!env.JWT_SECRET || env.JWT_SECRET.length < 64) {
      issues.push('JWT_SECRET should be at least 64 characters in production');
    }
  }

  return {
    ready: issues.length === 0,
    issues,
  };
}

/**
 * Get environment variable documentation
 */
export function getEnvVarDocs(): Record<string, typeof ENV_VARIABLES_DOCS[keyof typeof ENV_VARIABLES_DOCS]> {
  return ENV_VARIABLES_DOCS;
} 
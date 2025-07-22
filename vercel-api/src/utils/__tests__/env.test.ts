import { loadEnvVars, validateEnvVarsSilently, getEnvVars } from '../env';
import { validateEnvironment, generateEnvTemplate, checkProductionReadiness } from '../env-validator';

// Mock process.env
const originalEnv = process.env;

describe('Environment Variable Validation', () => {
  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
    // Clear the global cache
    (globalThis as any).envVars = undefined;
  });

  afterAll(() => {
    // Restore original process.env
    process.env = originalEnv;
  });

  describe('loadEnvVars', () => {
    it('should load valid environment variables', () => {
      process.env.WORDPRESS_URL = 'https://example.com';
      process.env.WORDPRESS_USERNAME = 'admin';
      process.env.WORDPRESS_APP_PASSWORD = 'test password 123';
      process.env.GPT_API_KEY = 'sk-1234567890abcdef1234567890abcdef';
      process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-validation';

      const envVars = loadEnvVars();

      expect(envVars.WORDPRESS_URL).toBe('https://example.com');
      expect(envVars.WORDPRESS_USERNAME).toBe('admin');
      expect(envVars.WORDPRESS_APP_PASSWORD).toBe('test password 123');
      expect(envVars.GPT_API_KEY).toBe('sk-1234567890abcdef1234567890abcdef');
      expect(envVars.JWT_SECRET).toBe('test-jwt-secret-that-is-long-enough-for-validation');
      expect(envVars.NODE_ENV).toBe('development'); // default value
    });

    it('should throw error for missing required variables', () => {
      expect(() => loadEnvVars()).toThrow('Missing required environment variable: WORDPRESS_URL');
    });

    it('should throw error for invalid WordPress URL', () => {
      process.env.WORDPRESS_URL = 'invalid-url';
      process.env.WORDPRESS_USERNAME = 'admin';
      process.env.WORDPRESS_APP_PASSWORD = 'test password 123';
      process.env.GPT_API_KEY = 'sk-1234567890abcdef1234567890abcdef';
      process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-validation';

      expect(() => loadEnvVars()).toThrow('Invalid WORDPRESS_URL');
    });

    it('should throw error for invalid GPT API key format', () => {
      process.env.WORDPRESS_URL = 'https://example.com';
      process.env.WORDPRESS_USERNAME = 'admin';
      process.env.WORDPRESS_APP_PASSWORD = 'test password 123';
      process.env.GPT_API_KEY = 'invalid-key';
      process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-validation';

      expect(() => loadEnvVars()).toThrow('GPT_API_KEY must be a valid OpenAI API key starting with sk-');
    });

    it('should throw error for short JWT secret', () => {
      process.env.WORDPRESS_URL = 'https://example.com';
      process.env.WORDPRESS_USERNAME = 'admin';
      process.env.WORDPRESS_APP_PASSWORD = 'test password 123';
      process.env.GPT_API_KEY = 'sk-1234567890abcdef1234567890abcdef';
      process.env.JWT_SECRET = 'short';

      expect(() => loadEnvVars()).toThrow('JWT_SECRET must be 32-256 characters long');
    });

    it('should use default values for optional variables', () => {
      process.env.WORDPRESS_URL = 'https://example.com';
      process.env.WORDPRESS_USERNAME = 'admin';
      process.env.WORDPRESS_APP_PASSWORD = 'test password 123';
      process.env.GPT_API_KEY = 'sk-1234567890abcdef1234567890abcdef';
      process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-validation';

      const envVars = loadEnvVars();

      expect(envVars.API_RATE_LIMIT_WINDOW_MS).toBe(60000);
      expect(envVars.API_RATE_LIMIT_MAX_REQUESTS).toBe(100);
      expect(envVars.WORDPRESS_TIMEOUT_MS).toBe(30000);
      expect(envVars.LOG_LEVEL).toBe('info');
      expect(envVars.CORS_ORIGINS).toEqual(['*']);
      expect(envVars.MAX_IMAGE_SIZE_MB).toBe(10);
      expect(envVars.ENABLE_DEBUG_LOGGING).toBe(false);
    });

    it('should parse custom values for optional variables', () => {
      process.env.WORDPRESS_URL = 'https://example.com';
      process.env.WORDPRESS_USERNAME = 'admin';
      process.env.WORDPRESS_APP_PASSWORD = 'test password 123';
      process.env.GPT_API_KEY = 'sk-1234567890abcdef1234567890abcdef';
      process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-validation';
      process.env.NODE_ENV = 'production';
      process.env.API_RATE_LIMIT_WINDOW_MS = '120000';
      process.env.API_RATE_LIMIT_MAX_REQUESTS = '50';
      process.env.WORDPRESS_TIMEOUT_MS = '60000';
      process.env.LOG_LEVEL = 'debug';
      process.env.CORS_ORIGINS = 'https://example.com,https://test.com';
      process.env.MAX_IMAGE_SIZE_MB = '20';
      process.env.ENABLE_DEBUG_LOGGING = 'true';

      const envVars = loadEnvVars();

      expect(envVars.NODE_ENV).toBe('production');
      expect(envVars.API_RATE_LIMIT_WINDOW_MS).toBe(120000);
      expect(envVars.API_RATE_LIMIT_MAX_REQUESTS).toBe(50);
      expect(envVars.WORDPRESS_TIMEOUT_MS).toBe(60000);
      expect(envVars.LOG_LEVEL).toBe('debug');
      expect(envVars.CORS_ORIGINS).toEqual(['https://example.com', 'https://test.com']);
      expect(envVars.MAX_IMAGE_SIZE_MB).toBe(20);
      expect(envVars.ENABLE_DEBUG_LOGGING).toBe(true);
    });
  });

  describe('validateEnvVarsSilently', () => {
    it('should return valid: true for valid environment', () => {
      process.env.WORDPRESS_URL = 'https://example.com';
      process.env.WORDPRESS_USERNAME = 'admin';
      process.env.WORDPRESS_APP_PASSWORD = 'test password 123';
      process.env.GPT_API_KEY = 'sk-1234567890abcdef1234567890abcdef';
      process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-validation';

      const result = validateEnvVarsSilently();

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return valid: false for invalid environment', () => {
      const result = validateEnvVarsSilently();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getEnvVars', () => {
    it('should cache environment variables', () => {
      process.env.WORDPRESS_URL = 'https://example.com';
      process.env.WORDPRESS_USERNAME = 'admin';
      process.env.WORDPRESS_APP_PASSWORD = 'test password 123';
      process.env.GPT_API_KEY = 'sk-1234567890abcdef1234567890abcdef';
      process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-validation';

      const firstCall = getEnvVars();
      const secondCall = getEnvVars();

      expect(firstCall).toBe(secondCall);
    });
  });

  describe('validateEnvironment', () => {
    it('should provide comprehensive validation results', () => {
      process.env.WORDPRESS_URL = 'https://example.com';
      process.env.WORDPRESS_USERNAME = 'admin';
      process.env.WORDPRESS_APP_PASSWORD = 'test password 123';
      process.env.GPT_API_KEY = 'sk-1234567890abcdef1234567890abcdef';
      process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-validation';

      const result = validateEnvironment();

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.missing).toEqual([]);
      expect(result.invalid).toEqual([]);
    });

    it('should detect missing required variables', () => {
      const result = validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('WORDPRESS_URL');
      expect(result.missing).toContain('WORDPRESS_USERNAME');
      expect(result.missing).toContain('WORDPRESS_APP_PASSWORD');
      expect(result.missing).toContain('GPT_API_KEY');
      expect(result.missing).toContain('JWT_SECRET');
    });

    it('should detect invalid values', () => {
      process.env.WORDPRESS_URL = 'invalid-url';
      process.env.GPT_API_KEY = 'invalid-key';
      process.env.JWT_SECRET = 'short';
      process.env.NODE_ENV = 'invalid';

      const result = validateEnvironment();

      expect(result.invalid).toContain('WORDPRESS_URL: Must start with http:// or https://');
      expect(result.invalid).toContain('GPT_API_KEY: Must start with sk-');
      expect(result.invalid).toContain('JWT_SECRET: Must be at least 32 characters long');
      expect(result.invalid).toContain('NODE_ENV: Must be development, production, or test');
    });
  });

  describe('generateEnvTemplate', () => {
    it('should generate a valid environment template', () => {
      const template = generateEnvTemplate();

      expect(template).toContain('# PostCrafter Vercel API Environment Variables');
      expect(template).toContain('WORDPRESS_URL=');
      expect(template).toContain('GPT_API_KEY=');
      expect(template).toContain('JWT_SECRET=');
      expect(template).toContain('# Optional (default:');
    });
  });

  describe('checkProductionReadiness', () => {
    it('should return ready: true for valid production environment', () => {
      process.env.NODE_ENV = 'production';
      process.env.WORDPRESS_URL = 'https://example.com';
      process.env.WORDPRESS_USERNAME = 'admin';
      process.env.WORDPRESS_APP_PASSWORD = 'test password 123';
      process.env.GPT_API_KEY = 'sk-1234567890abcdef1234567890abcdef';
      process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-validation-and-production-ready';
      process.env.LOG_LEVEL = 'info';
      process.env.CORS_ORIGINS = 'https://example.com';

      const result = checkProductionReadiness();

      expect(result.ready).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it('should return ready: false for production with issues', () => {
      process.env.NODE_ENV = 'production';
      process.env.LOG_LEVEL = 'debug';
      process.env.CORS_ORIGINS = '*';
      process.env.JWT_SECRET = 'short';

      const result = checkProductionReadiness();

      expect(result.ready).toBe(false);
      expect(result.issues).toContain('Debug logging should not be enabled in production');
      expect(result.issues).toContain('CORS should be restricted in production');
      expect(result.issues).toContain('JWT_SECRET should be at least 64 characters in production');
    });
  });
}); 
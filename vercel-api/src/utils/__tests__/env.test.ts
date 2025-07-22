import { 
  loadEnvVars, 
  getEnvVars, 
  validateEnvVarsSilently,
  isProductionReady,
  getSecureEnvSummary,
  getSecurityAuditInfo,
  validateApiKeyFormat,
  validateApiKey
} from '../env';

// Mock environment variables for testing
const mockEnvVars = {
  WORDPRESS_URL: 'https://example.com',
  WORDPRESS_USERNAME: 'testuser',
  WORDPRESS_APP_PASSWORD: 'testpassword123',
  GPT_API_KEY: 'sk-test1234567890123456789012345678901234567890',
  JWT_SECRET: 'test-jwt-secret-that-is-long-enough-for-validation-testing-purposes',
  NODE_ENV: 'test',
  API_RATE_LIMIT_WINDOW_MS: 60000,
  API_RATE_LIMIT_MAX_REQUESTS: 100,
  WORDPRESS_TIMEOUT_MS: 30000,
  LOG_LEVEL: 'info',
  CORS_ORIGINS: ['*'],
  MAX_IMAGE_SIZE_MB: 10,
  ENABLE_DEBUG_LOGGING: false,
};

describe('Environment Variable Security', () => {
  beforeEach(() => {
    // Clear global cache before each test
    (globalThis as any).envVars = undefined;
    
    // Mock process.env
    process.env = {
      ...process.env,
      ...mockEnvVars,
    };
  });

  afterEach(() => {
    // Clean up
    (globalThis as any).envVars = undefined;
  });

  describe('validateApiKeyFormat', () => {
    it('should validate correct API key format', () => {
      const result = validateApiKeyFormat('sk-test1234567890123456789012345678901234567890');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate API key with Bearer prefix', () => {
      const result = validateApiKeyFormat('Bearer sk-test1234567890123456789012345678901234567890');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty API key', () => {
      const result = validateApiKeyFormat('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key is required');
    });

    it('should reject short API key', () => {
      const result = validateApiKeyFormat('sk-short');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key is too short');
    });

    it('should reject invalid API key format', () => {
      const result = validateApiKeyFormat('invalid-key-format');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key format is invalid');
    });
  });

  describe('validateApiKey', () => {
    it('should validate correct API key', () => {
      const result = validateApiKey('sk-test1234567890123456789012345678901234567890');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject incorrect API key', () => {
      const result = validateApiKey('sk-wrong1234567890123456789012345678901234567890');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    it('should reject invalid format', () => {
      const result = validateApiKey('invalid-format');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key format is invalid');
    });
  });

  describe('getSecureEnvSummary', () => {
    it('should return masked sensitive values', () => {
      const summary = getSecureEnvSummary();
      
      // Check that sensitive values are masked
      expect(summary.GPT_API_KEY).toMatch(/^sk-test\.\.\.7890$/);
      expect(summary.JWT_SECRET).toMatch(/^test-jwt\.\.\.poses$/);
      expect(summary.WORDPRESS_APP_PASSWORD).toMatch(/^test\.\.\.123$/);
      
      // Check that non-sensitive values are not masked
      expect(summary.NODE_ENV).toBe('test');
      expect(summary.LOG_LEVEL).toBe('info');
      expect(summary.API_RATE_LIMIT_WINDOW_MS).toBe(60000);
    });
  });

  describe('isProductionReady', () => {
    it('should identify production readiness issues in test environment', () => {
      const result = isProductionReady();
      
      expect(result.ready).toBe(false);
      expect(result.issues).toContain('NODE_ENV should be set to "production" in production environment');
      expect(result.issues).toContain('JWT_SECRET should be at least 64 characters long for production');
      expect(result.issues).toContain('CORS_ORIGINS should not use wildcard (*) in production');
    });

    it('should pass production readiness check with proper configuration', () => {
      // Mock production environment
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'a'.repeat(64);
      process.env.CORS_ORIGINS = 'https://example.com,https://another.com';
      process.env.ENABLE_DEBUG_LOGGING = 'false';
      process.env.LOG_LEVEL = 'info';
      
      // Clear cache to reload with new values
      (globalThis as any).envVars = undefined;
      
      const result = isProductionReady();
      expect(result.ready).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('getSecurityAuditInfo', () => {
    it('should return comprehensive security audit information', () => {
      const audit = getSecurityAuditInfo();
      
      expect(audit.environment).toBe('test');
      expect(audit.productionReady).toBe(false);
      expect(audit.productionIssues).toBeInstanceOf(Array);
      expect(audit.securityMeasures).toBeDefined();
      expect(audit.securityMeasures.jwtSecretLength).toBe(mockEnvVars.JWT_SECRET.length);
      expect(audit.securityMeasures.jwtSecretStrength).toBe('weak');
      expect(audit.securityMeasures.corsWildcard).toBe(true);
      expect(audit.securityMeasures.debugLogging).toBe(false);
      expect(audit.securityMeasures.rateLimiting.enabled).toBe(true);
      expect(audit.sensitiveVariables).toBeDefined();
      
      // Check that sensitive variables are masked
      expect(audit.sensitiveVariables.gptApiKey).toMatch(/^sk-test\.\.\.7890$/);
      expect(audit.sensitiveVariables.jwtSecret).toMatch(/^test-jwt\.\.\.poses$/);
    });
  });

  describe('Enhanced validation with security logging', () => {
    it('should handle missing required environment variables securely', () => {
      // Remove required environment variable
      delete process.env.GPT_API_KEY;
      (globalThis as any).envVars = undefined;
      
      const result = validateEnvVarsSilently();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required environment variable: GPT_API_KEY');
    });

    it('should validate JWT secret pattern', () => {
      // Test with invalid JWT secret characters
      process.env.JWT_SECRET = 'invalid-secret-with-🚀-emoji';
      (globalThis as any).envVars = undefined;
      
      const result = validateEnvVarsSilently();
      expect(result.valid).toBe(false);
      expect(result.errors.some(error => error.includes('JWT_SECRET'))).toBe(true);
    });
  });
}); 
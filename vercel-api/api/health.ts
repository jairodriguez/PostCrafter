import type { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  getEnvVars, 
  validateEnvVarsSilently, 
  isProductionReady, 
  getSecureEnvSummary,
  getSecurityAuditInfo,
  getWordPressConfig, 
  getRateLimitConfig, 
  getCorsConfig, 
  getLoggingConfig 
} from '@/utils/env';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: `Method ${req.method} not allowed`,
      },
    });
    return;
  }

  try {
    // Validate environment variables
    const envValidation = validateEnvVarsSilently();
    const productionCheck = isProductionReady();
    const securityAudit = getSecurityAuditInfo();
    
    // Get configuration objects
    const wordpressConfig = getWordPressConfig();
    const rateLimitConfig = getRateLimitConfig();
    const corsConfig = getCorsConfig();
    const loggingConfig = getLoggingConfig();

    // Basic health check response
    res.status(200).json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: {
          nodeEnv: getEnvVars().NODE_ENV,
          productionReady: productionCheck.ready,
          issues: productionCheck.issues,
        },
        version: '1.0.0',
        services: {
          wordpress: {
            url: wordpressConfig.url ? 'configured' : 'not configured',
            timeout: wordpressConfig.timeout,
          },
          rateLimiting: {
            windowMs: rateLimitConfig.windowMs,
            maxRequests: rateLimitConfig.maxRequests,
          },
          cors: {
            origins: corsConfig.origins,
            methods: corsConfig.methods,
          },
          logging: {
            level: loggingConfig.level,
            debugEnabled: loggingConfig.enableDebug,
          },
        },
        validation: {
          valid: envValidation.valid,
          errors: envValidation.errors,
        },
        security: {
          productionReady: securityAudit.productionReady,
          productionIssues: securityAudit.productionIssues,
          jwtSecretStrength: securityAudit.securityMeasures.jwtSecretStrength,
          corsWildcard: securityAudit.securityMeasures.corsWildcard,
          debugLogging: securityAudit.securityMeasures.debugLogging,
        },
        // Include secure environment summary (with masked sensitive data)
        config: getSecureEnvSummary(),
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
} 
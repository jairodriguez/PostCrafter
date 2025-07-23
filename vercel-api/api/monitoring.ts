import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyMiddleware } from '../src/middleware/cors';
import { authenticateApiKey, AuthenticatedRequest } from '../src/middleware/auth';
import SecurityMonitoring, { SecurityEventType, SecurityEventSeverity } from '../src/utils/monitoring';
import { getEnvVars, secureLog } from '../src/utils/env';

/**
 * Monitoring API endpoint for security metrics and event logs
 * Provides comprehensive monitoring data for security events, authentication attempts,
 * rate limit violations, and suspicious activity patterns
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  return new Promise((resolve) => {
    applyMiddleware(req, res, () => {
      authenticateApiKey(req as AuthenticatedRequest, res, () => {
        handleMonitoringRequest(req as AuthenticatedRequest, res, resolve);
      });
    });
  });
}

/**
 * Handle monitoring API requests
 */
async function handleMonitoringRequest(
  req: AuthenticatedRequest,
  res: VercelResponse,
  resolve: () => void
): Promise<void> {
  try {
    const { method, url } = req;
    const envVars = getEnvVars();

    // Log the monitoring request
    secureLog('info', `Monitoring API request: ${method} ${url}`, {
      userAgent: req.headers['user-agent'],
      sourceIP: getClientIP(req),
      apiKey: req.user?.apiKey ? 'present' : 'missing'
    });

    // Check if monitoring is enabled
    if (!envVars.SECURITY_MONITORING_ENABLED) {
      res.status(503).json({
        success: false,
        error: {
          code: 'MONITORING_DISABLED',
          message: 'Security monitoring is currently disabled',
          details: 'Monitoring must be enabled via SECURITY_MONITORING_ENABLED environment variable'
        }
      });
      resolve();
      return;
    }

    // Route based on path
    const path = url?.split('?')[0] || '';
    
    switch (method) {
      case 'GET':
        await handleGetRequest(path, req, res);
        break;
      case 'POST':
        await handlePostRequest(path, req, res);
        break;
      default:
        res.status(405).json({
          success: false,
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: `Method ${method} not allowed`,
            details: 'Only GET and POST methods are supported'
          }
        });
    }

    resolve();
  } catch (error) {
    secureLog('error', 'Monitoring API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'MONITORING_ERROR',
        message: 'Internal monitoring error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    resolve();
  }
}

/**
 * Handle GET requests for monitoring data
 */
async function handleGetRequest(
  path: string,
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  switch (path) {
    case '/api/monitoring':
    case '/api/monitoring/metrics':
      await getSecurityMetrics(req, res);
      break;
    case '/api/monitoring/events':
      await getSecurityEvents(req, res);
      break;
    case '/api/monitoring/alerts':
      await getSecurityAlerts(req, res);
      break;
    case '/api/monitoring/health':
      await getMonitoringHealth(req, res);
      break;
    case '/api/monitoring/blacklist':
      await getBlacklistedIPs(req, res);
      break;
    default:
      res.status(404).json({
        success: false,
        error: {
          code: 'ENDPOINT_NOT_FOUND',
          message: 'Monitoring endpoint not found',
          details: 'Available endpoints: /metrics, /events, /alerts, /health, /blacklist'
        }
      });
  }
}

/**
 * Handle POST requests for monitoring configuration
 */
async function handlePostRequest(
  path: string,
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  switch (path) {
    case '/api/monitoring/configure':
      await configureMonitoring(req, res);
      break;
    case '/api/monitoring/test-alert':
      await testAlert(req, res);
      break;
    default:
      res.status(404).json({
        success: false,
        error: {
          code: 'ENDPOINT_NOT_FOUND',
          message: 'Monitoring endpoint not found',
          details: 'Available POST endpoints: /configure, /test-alert'
        }
      });
  }
}

/**
 * Get security metrics
 */
async function getSecurityMetrics(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  try {
    const metrics = SecurityMonitoring.getMetrics();
    
    res.status(200).json({
      success: true,
      data: {
        metrics,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'METRICS_ERROR',
        message: 'Failed to retrieve security metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}

/**
 * Get security events with filtering
 */
async function getSecurityEvents(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  try {
    const { 
      type, 
      severity, 
      limit = '100', 
      offset = '0',
      startTime,
      endTime,
      sourceIP 
    } = req.query;

    // Parse parameters
    const limitNum = Math.min(parseInt(limit as string) || 100, 1000);
    const offsetNum = parseInt(offset as string) || 0;
    const startTimestamp = startTime ? new Date(startTime as string).getTime() : undefined;
    const endTimestamp = endTime ? new Date(endTime as string).getTime() : undefined;

    // Get events from monitoring store (this would be implemented in the store)
    const events = []; // Placeholder - would get from store with filters
    
    res.status(200).json({
      success: true,
      data: {
        events,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          total: events.length // Would be actual total count
        },
        filters: {
          type: type as string,
          severity: severity as string,
          startTime: startTimestamp ? new Date(startTimestamp).toISOString() : undefined,
          endTime: endTimestamp ? new Date(endTimestamp).toISOString() : undefined,
          sourceIP: sourceIP as string
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'EVENTS_ERROR',
        message: 'Failed to retrieve security events',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}

/**
 * Get security alerts
 */
async function getSecurityAlerts(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  try {
    const { limit = '50', offset = '0' } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 50, 500);
    const offsetNum = parseInt(offset as string) || 0;

    // Get alerts from monitoring store (this would be implemented in the store)
    const alerts = []; // Placeholder - would get from store
    
    res.status(200).json({
      success: true,
      data: {
        alerts,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          total: alerts.length // Would be actual total count
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ALERTS_ERROR',
        message: 'Failed to retrieve security alerts',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}

/**
 * Get monitoring health status
 */
async function getMonitoringHealth(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  try {
    const envVars = getEnvVars();
    const metrics = SecurityMonitoring.getMetrics();
    
    const health = {
      status: 'healthy',
      monitoring: {
        enabled: envVars.SECURITY_MONITORING_ENABLED || false,
        alertsEnabled: envVars.SECURITY_ALERTS_ENABLED || false,
        eventCount: metrics.totalEvents,
        alertCount: 0, // Would get from store
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        version: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown'
      },
      security: {
        blacklistedIPs: 0, // Would get from store
        suspiciousPatterns: 0, // Would get from store
        authenticationSuccessRate: metrics.authenticationSuccessRate,
        rateLimitViolationRate: metrics.rateLimitViolationRate,
        suspiciousActivityRate: metrics.suspiciousActivityRate
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown'
    };

    res.status(200).json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_ERROR',
        message: 'Failed to retrieve monitoring health',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}

/**
 * Get blacklisted IPs
 */
async function getBlacklistedIPs(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  try {
    // Get blacklisted IPs from monitoring store (this would be implemented in the store)
    const blacklistedIPs = []; // Placeholder - would get from store
    
    res.status(200).json({
      success: true,
      data: {
        blacklistedIPs,
        count: blacklistedIPs.length,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'BLACKLIST_ERROR',
        message: 'Failed to retrieve blacklisted IPs',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}

/**
 * Configure monitoring settings
 */
async function configureMonitoring(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  try {
    const { alertsEnabled, severityThreshold, notificationChannels } = req.body;

    // Validate configuration
    if (typeof alertsEnabled !== 'boolean') {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CONFIGURATION',
          message: 'Invalid alertsEnabled value',
          details: 'alertsEnabled must be a boolean'
        }
      });
      return;
    }

    if (severityThreshold && !Object.values(SecurityEventSeverity).includes(severityThreshold)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CONFIGURATION',
          message: 'Invalid severityThreshold value',
          details: `severityThreshold must be one of: ${Object.values(SecurityEventSeverity).join(', ')}`
        }
      });
      return;
    }

    // Apply configuration (this would update the monitoring store)
    secureLog('info', 'Monitoring configuration updated', {
      alertsEnabled,
      severityThreshold,
      notificationChannels: notificationChannels ? 'configured' : 'not configured',
      updatedBy: req.user?.apiKey ? 'authenticated_user' : 'unknown'
    });

    res.status(200).json({
      success: true,
      data: {
        message: 'Monitoring configuration updated successfully',
        configuration: {
          alertsEnabled,
          severityThreshold: severityThreshold || 'medium',
          notificationChannels: notificationChannels ? 'configured' : 'not configured'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CONFIGURATION_ERROR',
        message: 'Failed to update monitoring configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}

/**
 * Test alert notification
 */
async function testAlert(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  try {
    const { channel, severity = 'medium' } = req.body;

    if (!channel || !['webhook', 'slack', 'discord', 'pagerduty'].includes(channel)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CHANNEL',
          message: 'Invalid notification channel',
          details: 'channel must be one of: webhook, slack, discord, pagerduty'
        }
      });
      return;
    }

    // Record a test security event
    SecurityMonitoring.recordEvent({
      type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity: severity as SecurityEventSeverity,
      source: {
        ip: getClientIP(req),
        userAgent: req.headers['user-agent'],
        apiKey: req.user?.apiKey,
        requestId: req.headers['x-request-id'] as string
      },
      details: {
        reason: 'Test alert triggered via monitoring API',
        endpoint: req.url,
        method: req.method
      }
    });

    res.status(200).json({
      success: true,
      data: {
        message: 'Test alert triggered successfully',
        details: {
          channel,
          severity,
          sourceIP: getClientIP(req),
          timestamp: new Date().toISOString()
        },
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'TEST_ALERT_ERROR',
        message: 'Failed to trigger test alert',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}

/**
 * Get client IP address
 */
function getClientIP(req: AuthenticatedRequest): string {
  return (req.headers['x-forwarded-for'] as string) || 
         (req.headers['x-real-ip'] as string) || 
         req.connection.remoteAddress || 
         'unknown';
} 
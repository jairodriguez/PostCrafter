import { VercelRequest, VercelResponse } from '@vercel/node';
import { logger } from '../../src/utils/logger';
import { getMonitoringInstance } from '../../src/utils/monitoring';
import { getMetricsService } from '../../src/services/metrics';
import { getWordPressErrorHandler } from '../../src/utils/wordpress-api-error-handler';
import { authenticateApiKey, AuthenticatedRequest } from '../../src/middleware/auth';
import { applyMiddleware } from '../../src/middleware/cors';
import ErrorHandler from '../../src/middleware/error-handler';
import { requestResponseLogger } from '../../src/middleware/request-response-logger';

/**
 * Debug status endpoint handler
 * Provides comprehensive system status and debugging information
 */
async function debugStatusHandler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const requestId = `debug_status_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  
  // Set request ID for error correlation
  req.headers['x-request-id'] = requestId;

  try {
    // Check if debugging is allowed
    const authHeader = req.headers.authorization;
    const debugToken = req.headers['x-debug-token'];

    if (!authHeader && !debugToken) {
      return res.status(401).json({
        error: 'Authentication required for debug access',
        requestId
      });
    }

    // Authenticate request
    if (authHeader) {
      const authResult = await authenticateApiKey(req as AuthenticatedRequest, res);
      if (!authResult.success) {
        return; // Response already sent by auth middleware
      }
    }

    // Apply middleware
    applyMiddleware(req, res, () => {
      // Middleware will handle the request
    });

    // Get debug information based on query parameters
    const { type = 'overview' } = req.query;

    switch (type) {
      case 'overview':
        await handleOverviewRequest(req, res, requestId);
        break;
      case 'health':
        await handleHealthRequest(req, res, requestId);
        break;
      case 'metrics':
        await handleMetricsRequest(req, res, requestId);
        break;
      case 'logs':
        await handleLogsRequest(req, res, requestId);
        break;
      case 'wordpress':
        await handleWordPressRequest(req, res, requestId);
        break;
      case 'alerts':
        await handleAlertsRequest(req, res, requestId);
        break;
      case 'system':
        await handleSystemRequest(req, res, requestId);
        break;
      default:
        res.status(400).json({
          error: 'Invalid debug type',
          validTypes: ['overview', 'health', 'metrics', 'logs', 'wordpress', 'alerts', 'system'],
          requestId
        });
    }

  } catch (error) {
    ErrorHandler.handleError(error, req, res);
  }
}

/**
 * Handle overview debug request
 */
async function handleOverviewRequest(req: VercelRequest, res: VercelResponse, requestId: string): Promise<void> {
  const monitoring = getMonitoringInstance();
  const metricsService = getMetricsService();

  try {
    const [healthStatus, metricsSummary, activeAlerts] = await Promise.all([
      monitoring.getHealthStatus(),
      metricsService.getMetricsSummary(),
      monitoring.getActiveAlerts()
    ]);

    const overview = {
      requestId,
      timestamp: new Date().toISOString(),
      status: {
        overall: healthStatus?.status || 'unknown',
        wordPress: healthStatus?.checks.wordPress.status || 'unknown',
        memory: healthStatus?.checks.memory.status || 'unknown',
        disk: healthStatus?.checks.disk.status || 'unknown'
      },
      metrics: {
        uptime: process.uptime(),
        totalRequests: metricsSummary.totalRequests,
        errorRate: metricsSummary.errorRate,
        averageResponseTime: metricsSummary.averageResponseTime,
        successRate: metricsSummary.successRate
      },
      alerts: {
        active: activeAlerts.length,
        critical: activeAlerts.filter(a => a.severity === 'critical').length,
        error: activeAlerts.filter(a => a.severity === 'error').length,
        warning: activeAlerts.filter(a => a.severity === 'warning').length
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        version: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
        region: process.env.VERCEL_REGION || 'unknown',
        functionName: process.env.VERCEL_FUNCTION_NAME || 'unknown'
      },
      system: {
        memory: process.memoryUsage(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version
      }
    };

    res.status(200).json(overview);
  } catch (error) {
    logger.error('Failed to generate overview', { error, requestId });
    res.status(500).json({
      error: 'Failed to generate overview',
      requestId
    });
  }
}

/**
 * Handle health debug request
 */
async function handleHealthRequest(req: VercelRequest, res: VercelResponse, requestId: string): Promise<void> {
  const monitoring = getMonitoringInstance();

  try {
    const healthStatus = await monitoring.performHealthCheck();
    
    res.status(200).json({
      requestId,
      timestamp: new Date().toISOString(),
      health: healthStatus
    });
  } catch (error) {
    logger.error('Failed to perform health check', { error, requestId });
    res.status(500).json({
      error: 'Failed to perform health check',
      requestId
    });
  }
}

/**
 * Handle metrics debug request
 */
async function handleMetricsRequest(req: VercelRequest, res: VercelResponse, requestId: string): Promise<void> {
  const metricsService = getMetricsService();
  const { timeRange = '1h', format = 'json' } = req.query;

  try {
    const filter = {
      timeRange: timeRange as string
    };

    const [summary, performance, recentEvents] = await Promise.all([
      metricsService.getMetricsSummary(filter),
      metricsService.getPerformanceMetrics(filter),
      metricsService.getMetrics(filter)
    ]);

    const metrics = {
      requestId,
      timestamp: new Date().toISOString(),
      timeRange,
      summary,
      performance,
      recentEvents: recentEvents.slice(0, 50) // Limit to last 50 events
    };

    if (format === 'csv') {
      const csvData = await metricsService.exportMetrics('csv', filter);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="metrics.csv"');
      res.status(200).send(csvData);
    } else {
      res.status(200).json(metrics);
    }
  } catch (error) {
    logger.error('Failed to retrieve metrics', { error, requestId });
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      requestId
    });
  }
}

/**
 * Handle logs debug request
 */
async function handleLogsRequest(req: VercelRequest, res: VercelResponse, requestId: string): Promise<void> {
  const { level = 'info', limit = '100', correlationId } = req.query;

  try {
    // In a real implementation, you would query your log storage
    // For now, we'll return a placeholder response
    const logs = {
      requestId,
      timestamp: new Date().toISOString(),
      level: level as string,
      limit: parseInt(limit as string),
      correlationId: correlationId as string,
      message: 'Log retrieval not fully implemented - would query log storage',
      note: 'In production, this would query your log aggregation service (e.g., CloudWatch, Datadog, etc.)'
    };

    res.status(200).json(logs);
  } catch (error) {
    logger.error('Failed to retrieve logs', { error, requestId });
    res.status(500).json({
      error: 'Failed to retrieve logs',
      requestId
    });
  }
}

/**
 * Handle WordPress debug request
 */
async function handleWordPressRequest(req: VercelRequest, res: VercelResponse, requestId: string): Promise<void> {
  const wordPressErrorHandler = getWordPressErrorHandler();
  const monitoring = getMonitoringInstance();

  try {
    const healthStatus = monitoring.getHealthStatus();
    const wordPressCheck = healthStatus?.checks.wordPress;

    const wordPressInfo = {
      requestId,
      timestamp: new Date().toISOString(),
      status: wordPressCheck?.status || 'unknown',
      responseTime: wordPressCheck?.responseTime || 0,
      error: wordPressCheck?.error,
      configuration: {
        url: process.env.WORDPRESS_URL || 'not configured',
        apiKeyConfigured: !!process.env.WORDPRESS_API_KEY,
        timeout: process.env.WORDPRESS_TIMEOUT || 'default'
      },
      errorHandler: {
        retryCount: wordPressErrorHandler.getRetryCount(),
        circuitBreakerStatus: wordPressErrorHandler.getCircuitBreakerStatus(),
        recentErrors: wordPressErrorHandler.getRecentErrors()
      }
    };

    res.status(200).json(wordPressInfo);
  } catch (error) {
    logger.error('Failed to retrieve WordPress debug info', { error, requestId });
    res.status(500).json({
      error: 'Failed to retrieve WordPress debug info',
      requestId
    });
  }
}

/**
 * Handle alerts debug request
 */
async function handleAlertsRequest(req: VercelRequest, res: VercelResponse, requestId: string): Promise<void> {
  const monitoring = getMonitoringInstance();
  const { acknowledged, severity } = req.query;

  try {
    let alerts = monitoring.getActiveAlerts();

    // Filter by acknowledged status
    if (acknowledged === 'true') {
      alerts = alerts.filter(alert => alert.acknowledged);
    } else if (acknowledged === 'false') {
      alerts = alerts.filter(alert => !alert.acknowledged);
    }

    // Filter by severity
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    const alertsInfo = {
      requestId,
      timestamp: new Date().toISOString(),
      total: alerts.length,
      bySeverity: {
        critical: alerts.filter(a => a.severity === 'critical').length,
        error: alerts.filter(a => a.severity === 'error').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        info: alerts.filter(a => a.severity === 'info').length
      },
      alerts: alerts.slice(0, 50) // Limit to last 50 alerts
    };

    res.status(200).json(alertsInfo);
  } catch (error) {
    logger.error('Failed to retrieve alerts', { error, requestId });
    res.status(500).json({
      error: 'Failed to retrieve alerts',
      requestId
    });
  }
}

/**
 * Handle system debug request
 */
async function handleSystemRequest(req: VercelRequest, res: VercelResponse, requestId: string): Promise<void> {
  try {
    const systemInfo = {
      requestId,
      timestamp: new Date().toISOString(),
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        title: process.title,
        argv: process.argv,
        env: {
          NODE_ENV: process.env.NODE_ENV,
          VERCEL_REGION: process.env.VERCEL_REGION,
          VERCEL_FUNCTION_NAME: process.env.VERCEL_FUNCTION_NAME,
          VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA
        }
      },
      system: {
        cpus: require('os').cpus().length,
        totalMemory: require('os').totalmem(),
        freeMemory: require('os').freemem(),
        loadAverage: require('os').loadavg(),
        uptime: require('os').uptime(),
        platform: require('os').platform(),
        arch: require('os').arch(),
        hostname: require('os').hostname()
      },
      network: {
        interfaces: require('os').networkInterfaces()
      }
    };

    res.status(200).json(systemInfo);
  } catch (error) {
    logger.error('Failed to retrieve system info', { error, requestId });
    res.status(500).json({
      error: 'Failed to retrieve system info',
      requestId
    });
  }
}

// Export the handler wrapped with error handling
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await requestResponseLogger(req, res, async () => {
    await debugStatusHandler(req, res);
  });
} 
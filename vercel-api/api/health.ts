import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applicationMonitor } from '../src/utils/application-monitor';
import { requestResponseLogger } from '../src/middleware/request-response-logger';
import ErrorHandler from '../src/middleware/error-handler';

/**
 * Health check endpoint handler
 */
async function healthHandler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const startTime = Date.now();
  const requestId = `health_${Date.now()}_${Math.random().toString(36).substring(2)}`;

  // Set request ID for error correlation
  ErrorHandler.setRequestId(requestId);

  // Log incoming request (but exclude from health check paths to avoid noise)
  requestResponseLogger.updateConfig({ excludePaths: ['/health', '/api/health'] });

  try {
    // Get query parameters
    const { detailed = 'false', metrics = 'false', alerts = 'false' } = req.query;
    const includeDetailed = detailed === 'true';
    const includeMetrics = metrics === 'true';
    const includeAlerts = alerts === 'true';

    // Get overall health status
    const overallHealth = applicationMonitor.getOverallHealth();
    
    // Base response
    const response: any = {
      status: overallHealth.status,
      message: overallHealth.message,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    // Add detailed health checks if requested
    if (includeDetailed) {
      response.services = applicationMonitor.getAllHealthChecks();
    }

    // Add performance metrics if requested
    if (includeMetrics) {
      response.metrics = applicationMonitor.getPerformanceMetrics();
    }

    // Add alerts if requested
    if (includeAlerts) {
      response.alerts = {
        active: applicationMonitor.getActiveAlerts(),
        total: applicationMonitor.getAllAlerts().length
      };
    }

    // Record the health check request
    const processingTime = Date.now() - startTime;
    applicationMonitor.recordRequest(true, processingTime);

    // Set appropriate HTTP status based on health
    let statusCode = 200;
    switch (overallHealth.status) {
      case 'healthy':
        statusCode = 200;
        break;
      case 'degraded':
        statusCode = 200; // Still OK, but with warnings
        break;
      case 'unhealthy':
        statusCode = 503; // Service Unavailable
        break;
      case 'critical':
        statusCode = 503; // Service Unavailable
        break;
    }

    // Set cache headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.status(statusCode).json(response);

    // Log response
    requestResponseLogger.logResponse(req, res, requestId, response);

  } catch (error) {
    // Record failed health check
    const processingTime = Date.now() - startTime;
    applicationMonitor.recordRequest(false, processingTime);

    // Let error handler take care of this
    throw error;
  }
}

// Export the handler wrapped with error handling
export default ErrorHandler.asyncWrapper(healthHandler); 
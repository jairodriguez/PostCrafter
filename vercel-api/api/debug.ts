import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applicationMonitor } from '../src/utils/application-monitor';
import { wordPressErrorHandler } from '../src/utils/wordpress-api-error-handler';
import { requestResponseLogger } from '../src/middleware/request-response-logger';
import { logger } from '../src/utils/logger';
import { getEnvVars } from '../src/utils/env';
import ErrorHandler from '../src/middleware/error-handler';

/**
 * Debug endpoint handler
 */
async function debugHandler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const startTime = Date.now();
  const requestId = `debug_${Date.now()}_${Math.random().toString(36).substring(2)}`;

  // Set request ID for error correlation
  ErrorHandler.setRequestId(requestId);

  try {
    const envVars = getEnvVars();

    // Check if debugging is allowed
    if (envVars.NODE_ENV === 'production') {
      // In production, require admin credentials
      const authHeader = req.headers.authorization;
      const debugToken = req.headers['x-debug-token'];
      
      if (!authHeader && !debugToken) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Debug endpoint requires authorization in production'
        });
        return;
      }

      // Simple token validation (in real scenario, use proper authentication)
      if (debugToken !== process.env.DEBUG_TOKEN) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Invalid debug token'
        });
        return;
      }
    }

    // Get query parameters for debug options
    const {
      logs = 'false',
      metrics = 'true',
      health = 'true',
      errors = 'true',
      config = 'false',
      wordpress = 'true',
      requests = 'false',
      alerts = 'true',
      system = 'true'
    } = req.query;

    const response: any = {
      timestamp: new Date().toISOString(),
      requestId,
      environment: envVars.NODE_ENV,
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      debug: {
        endpoint: '/api/debug',
        allowed: true,
        production: envVars.NODE_ENV === 'production'
      }
    };

    // Application metrics
    if (metrics === 'true') {
      response.metrics = {
        performance: applicationMonitor.getPerformanceMetrics(),
        all: applicationMonitor.getAllMetrics()
      };
    }

    // Health information
    if (health === 'true') {
      response.health = {
        overall: applicationMonitor.getOverallHealth(),
        services: applicationMonitor.getAllHealthChecks()
      };
    }

    // Error information
    if (errors === 'true') {
      const wpStats = wordPressErrorHandler.getStats();
      response.errors = {
        wordpress: wpStats,
        recent: wpStats.lastErrorTime ? {
          lastError: wpStats.lastErrorTime,
          timeSinceLastError: Date.now() - wpStats.lastErrorTime.getTime()
        } : null
      };
    }

    // WordPress information
    if (wordpress === 'true') {
      response.wordpress = {
        errorStats: wordPressErrorHandler.getStats(),
        config: wordPressErrorHandler.getConfig(),
        healthStatus: applicationMonitor.getAllHealthChecks().wordpress
      };
    }

    // Alert information
    if (alerts === 'true') {
      response.alerts = {
        active: applicationMonitor.getActiveAlerts(),
        all: applicationMonitor.getAllAlerts(),
        summary: {
          activeCount: applicationMonitor.getActiveAlerts().length,
          totalCount: applicationMonitor.getAllAlerts().length
        }
      };
    }

    // System information
    if (system === 'true') {
      response.system = {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        pid: process.pid,
        uptime: process.uptime(),
        resourceUsage: process.resourceUsage ? process.resourceUsage() : 'Not available'
      };
    }

    // Request/Response logger info
    if (requests === 'true') {
      response.requests = {
        config: requestResponseLogger.getConfig(),
        recentRequests: 'Request history not stored in memory'
      };
    }

    // Configuration (masked for security)
    if (config === 'true') {
      response.config = {
        monitoring: applicationMonitor.getConfig(),
        logger: logger.getLevel(),
        requestLogger: requestResponseLogger.getConfig(),
        wordpress: wordPressErrorHandler.getConfig(),
        environment: {
          NODE_ENV: envVars.NODE_ENV,
          LOG_LEVEL: envVars.LOG_LEVEL,
          ENABLE_DEBUG_LOGGING: envVars.ENABLE_DEBUG_LOGGING,
          // Don't expose sensitive config in debug endpoint
          sensitiveConfigPresent: {
            WORDPRESS_URL: !!envVars.WORDPRESS_URL,
            WORDPRESS_USERNAME: !!envVars.WORDPRESS_USERNAME,
            WORDPRESS_APP_PASSWORD: !!envVars.WORDPRESS_APP_PASSWORD,
            GPT_API_KEY: !!envVars.GPT_API_KEY,
            JWT_SECRET: !!envVars.JWT_SECRET
          }
        }
      };
    }

    // Recent logs (if enabled and in debug mode)
    if (logs === 'true' && envVars.ENABLE_DEBUG_LOGGING) {
      response.logs = {
        message: 'Recent logs would be available here in a full implementation',
        note: 'Log retrieval requires additional infrastructure like centralized logging'
      };
    }

    // Debug tools and utilities
    response.tools = {
      endpoints: {
        health: '/api/health',
        debug: '/api/debug',
        publish: '/api/publish'
      },
      queryParameters: {
        health: ['detailed=true', 'metrics=true', 'alerts=true'],
        debug: [
          'logs=true', 'metrics=true', 'health=true', 'errors=true',
          'config=true', 'wordpress=true', 'requests=true', 'alerts=true', 'system=true'
        ]
      },
      troubleshooting: {
        checkHealth: 'GET /api/health?detailed=true&metrics=true',
        checkWordPress: 'GET /api/debug?wordpress=true&errors=true',
        checkPerformance: 'GET /api/debug?metrics=true&system=true',
        checkAlerts: 'GET /api/debug?alerts=true',
        fullDebug: 'GET /api/debug?logs=true&metrics=true&health=true&errors=true&config=true&wordpress=true&requests=true&alerts=true&system=true'
      }
    };

    // Correlation information
    response.correlation = {
      requestId,
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime
    };

    // Record debug request
    applicationMonitor.recordRequest(true, Date.now() - startTime);

    // Set cache headers to prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Add debug headers
    res.setHeader('X-Debug-Request-ID', requestId);
    res.setHeader('X-Debug-Timestamp', new Date().toISOString());

    res.status(200).json(response);

  } catch (error) {
    // Record failed debug request
    applicationMonitor.recordRequest(false, Date.now() - startTime);

    // Let error handler take care of this
    throw error;
  }
}

// Export the handler wrapped with error handling
export default ErrorHandler.asyncWrapper(debugHandler);
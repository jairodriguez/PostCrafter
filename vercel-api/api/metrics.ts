/**
 * PostCrafter Metrics API Endpoint
 * 
 * Provides access to collected metrics data including API usage statistics,
 * publish success/error rates, performance metrics, and activity data.
 * 
 * @package PostCrafter
 * @version 1.0.0
 * @since 1.0.0
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getMetricsService, MetricsFilter, MetricEventType } from '../src/services/metrics';
import { secureLog } from '../src/utils/env';
import { authenticateApiKey, AuthenticatedRequest } from '../src/middleware/auth';
import { applyMiddleware } from '../src/middleware/cors';

// Validation schemas
const metricsQuerySchema = z.object({
  startDate: z.string().optional().transform(str => str ? new Date(str) : undefined),
  endDate: z.string().optional().transform(str => str ? new Date(str) : undefined),
  eventType: z.enum([
    'api_call',
    'publish_success', 
    'publish_error',
    'validation_error',
    'auth_error',
    'rate_limit_error',
    'wordpress_error',
    'system_error',
    'user_activity'
  ]).optional(),
  endpoint: z.string().optional(),
  userId: z.string().optional(),
  statusCode: z.string().optional().transform(str => str ? parseInt(str, 10) : undefined),
  limit: z.string().optional().transform(str => str ? parseInt(str, 10) : undefined),
  offset: z.string().optional().transform(str => str ? parseInt(str, 10) : undefined),
  format: z.enum(['json', 'csv']).optional().default('json')
});

const cleanupSchema = z.object({
  retentionDays: z.number().min(1).max(365).optional().default(30)
});

// Response types
interface MetricsApiResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    requestId: string;
    timestamp: string;
    endpoint: string;
  };
}

/**
 * Create standardized API response
 */
function createResponse(
  res: VercelResponse,
  success: boolean,
  data?: any,
  error?: { code: string; message: string; details?: any },
  statusCode: number = 200,
  requestId?: string
): void {
  const response: MetricsApiResponse = {
    success,
    ...(data && { data }),
    ...(error && { error }),
    meta: {
      requestId: requestId || `req_${Date.now()}`,
      timestamp: new Date().toISOString(),
      endpoint: '/api/metrics'
    }
  };

  res.status(statusCode).json(response);
}

/**
 * Handle GET requests - retrieve metrics data
 */
async function handleGetRequest(
  req: AuthenticatedRequest,
  res: VercelResponse,
  requestId: string
): Promise<void> {
  try {
    const path = req.query.path as string || '';
    const queryValidation = metricsQuerySchema.safeParse(req.query);

    if (!queryValidation.success) {
      createResponse(res, false, null, {
        code: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        details: queryValidation.error.errors
      }, 400, requestId);
      return;
    }

    const query = queryValidation.data;
    const metricsService = getMetricsService();

    // Create filter from query parameters
    const filter: MetricsFilter = {
      startDate: query.startDate,
      endDate: query.endDate,
      eventType: query.eventType,
      endpoint: query.endpoint,
      userId: query.userId,
      statusCode: query.statusCode,
      limit: query.limit,
      offset: query.offset
    };

    switch (path) {
      case 'summary':
        const summary = await metricsService.getMetricsSummary(filter);
        createResponse(res, true, summary, undefined, 200, requestId);
        break;

      case 'performance':
        const performance = await metricsService.getPerformanceMetrics(filter);
        createResponse(res, true, performance, undefined, 200, requestId);
        break;

      case 'events':
        const events = await metricsService.getMetrics(filter);
        createResponse(res, true, { events, count: events.length }, undefined, 200, requestId);
        break;

      case 'export':
        const exportData = await metricsService.exportMetrics(query.format, filter);
        
        if (query.format === 'csv') {
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="metrics-${Date.now()}.csv"`);
          res.status(200).send(exportData);
        } else {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="metrics-${Date.now()}.json"`);
          res.status(200).send(exportData);
        }
        break;

      case 'health':
        // Simple health check for metrics service
        const healthData = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          service: 'metrics',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          environment: process.env.NODE_ENV || 'development'
        };
        createResponse(res, true, healthData, undefined, 200, requestId);
        break;

      default:
        // Default to summary if no path specified
        const defaultSummary = await metricsService.getMetricsSummary(filter);
        createResponse(res, true, defaultSummary, undefined, 200, requestId);
        break;
    }

  } catch (error) {
    secureLog('error', 'Metrics API GET error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId,
      query: req.query
    });

    createResponse(res, false, null, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve metrics data'
    }, 500, requestId);
  }
}

/**
 * Handle POST requests - record metrics or manage data
 */
async function handlePostRequest(
  req: AuthenticatedRequest,
  res: VercelResponse,
  requestId: string
): Promise<void> {
  try {
    const path = req.query.path as string || '';
    const metricsService = getMetricsService();

    switch (path) {
      case 'cleanup':
        const cleanupValidation = cleanupSchema.safeParse(req.body);
        
        if (!cleanupValidation.success) {
          createResponse(res, false, null, {
            code: 'VALIDATION_ERROR',
            message: 'Invalid cleanup parameters',
            details: cleanupValidation.error.errors
          }, 400, requestId);
          return;
        }

        const { retentionDays } = cleanupValidation.data;
        const removedCount = await metricsService.cleanupOldMetrics(retentionDays);
        
        createResponse(res, true, {
          removedCount,
          retentionDays,
          message: `Cleaned up ${removedCount} old metric entries`
        }, undefined, 200, requestId);
        break;

      case 'record':
        // Manual metric recording (for testing or special cases)
        const recordSchema = z.object({
          type: z.enum([
            'api_call',
            'publish_success',
            'publish_error',
            'validation_error',
            'auth_error',
            'rate_limit_error',
            'wordpress_error',
            'system_error',
            'user_activity'
          ]),
          endpoint: z.string(),
          method: z.string(),
          userId: z.string().optional(),
          metadata: z.record(z.any()).optional()
        });

        const recordValidation = recordSchema.safeParse(req.body);
        
        if (!recordValidation.success) {
          createResponse(res, false, null, {
            code: 'VALIDATION_ERROR',
            message: 'Invalid record parameters',
            details: recordValidation.error.errors
          }, 400, requestId);
          return;
        }

        const recordData = recordValidation.data;
        
        // Record the metric based on type
        if (recordData.type === 'publish_success') {
          metricsService.recordPublishSuccess({
            endpoint: recordData.endpoint,
            method: recordData.method,
            userId: recordData.userId,
            requestId,
            metadata: recordData.metadata
          });
        } else if (recordData.type === 'user_activity') {
          if (!recordData.userId) {
            createResponse(res, false, null, {
              code: 'VALIDATION_ERROR',
              message: 'userId is required for user_activity events'
            }, 400, requestId);
            return;
          }
          
          metricsService.recordUserActivity({
            userId: recordData.userId,
            endpoint: recordData.endpoint,
            method: recordData.method,
            requestId,
            metadata: recordData.metadata
          });
        } else if (recordData.type.includes('error')) {
          metricsService.recordError({
            endpoint: recordData.endpoint,
            method: recordData.method,
            userId: recordData.userId,
            requestId,
            errorType: recordData.type as any,
            metadata: recordData.metadata
          });
        } else {
          metricsService.recordApiCall({
            endpoint: recordData.endpoint,
            method: recordData.method,
            userId: recordData.userId,
            requestId,
            metadata: recordData.metadata
          });
        }

        createResponse(res, true, {
          message: 'Metric recorded successfully',
          type: recordData.type
        }, undefined, 201, requestId);
        break;

      default:
        createResponse(res, false, null, {
          code: 'NOT_FOUND',
          message: 'Unsupported POST operation'
        }, 404, requestId);
        break;
    }

  } catch (error) {
    secureLog('error', 'Metrics API POST error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId,
      path: req.query.path,
      body: req.body
    });

    createResponse(res, false, null, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to process metrics request'
    }, 500, requestId);
  }
}

/**
 * Main API handler
 */
export default async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  const startTime = Date.now();
  const requestId = `metrics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Apply middleware (CORS, security headers, rate limiting, authentication)
    await applyMiddleware(req, res, () => {});

    // Log API call
    const metricsService = getMetricsService();
    metricsService.recordApiCall({
      endpoint: '/api/metrics',
      method: req.method || 'GET',
      userId: req.userId,
      userAgent: req.get('user-agent'),
      ip: req.ip || req.connection?.remoteAddress,
      requestId
    });

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        await handleGetRequest(req, res, requestId);
        break;

      case 'POST':
        await handlePostRequest(req, res, requestId);
        break;

      case 'OPTIONS':
        // Handled by CORS middleware
        res.status(200).end();
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
        createResponse(res, false, null, {
          code: 'METHOD_NOT_ALLOWED',
          message: `Method ${req.method} not allowed`
        }, 405, requestId);
        break;
    }

    // Record success metrics
    const duration = Date.now() - startTime;
    metricsService.recordPublishSuccess({
      endpoint: '/api/metrics',
      method: req.method || 'GET',
      userId: req.userId,
      userAgent: req.get('user-agent'),
      ip: req.ip || req.connection?.remoteAddress,
      requestId,
      duration,
      statusCode: res.statusCode
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Record error metrics
    const metricsService = getMetricsService();
    metricsService.recordError({
      endpoint: '/api/metrics',
      method: req.method || 'GET',
      userId: req.userId,
      userAgent: req.get('user-agent'),
      ip: req.ip || req.connection?.remoteAddress,
      requestId,
      duration,
      statusCode: 500,
      errorType: 'system_error',
      errorMessage
    });

    secureLog('error', 'Metrics API handler error', {
      error: errorMessage,
      requestId,
      method: req.method,
      path: req.query.path
    });

    if (!res.headersSent) {
      createResponse(res, false, null, {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }, 500, requestId);
    }
  }
}

/**
 * API Routes Documentation
 * 
 * GET /api/metrics?path=summary
 * - Returns metrics summary including totals, rates, and top items
 * - Query params: startDate, endDate, eventType, endpoint, userId, statusCode
 * 
 * GET /api/metrics?path=performance
 * - Returns performance metrics including response times and rates
 * - Query params: startDate, endDate, endpoint, userId
 * 
 * GET /api/metrics?path=events
 * - Returns raw metric events with optional filtering and pagination
 * - Query params: startDate, endDate, eventType, endpoint, userId, statusCode, limit, offset
 * 
 * GET /api/metrics?path=export&format=csv
 * - Exports metrics data in JSON or CSV format
 * - Query params: format (json|csv), plus all filter params
 * 
 * GET /api/metrics?path=health
 * - Returns health status of the metrics service
 * 
 * POST /api/metrics?path=cleanup
 * - Cleans up old metrics data beyond retention period
 * - Body: { retentionDays: number }
 * 
 * POST /api/metrics?path=record
 * - Manually records a metric event (for testing)
 * - Body: { type, endpoint, method, userId?, metadata? }
 */
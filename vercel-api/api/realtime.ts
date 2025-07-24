import { VercelRequest, VercelResponse } from '@vercel/node';
import { getMetricsService } from '../src/services/metrics';
import { z } from 'zod';

/**
 * Real-time data API endpoint
 * Supports both Server-Sent Events (SSE) and polling for real-time dashboard updates
 */

// Query parameters schema for polling endpoint
const pollingQuerySchema = z.object({
  lastUpdate: z.string().optional(),
  types: z.string().optional(), // Comma-separated event types
  limit: z.coerce.number().min(1).max(100).default(50),
});

// Query parameters schema for SSE endpoint
const sseQuerySchema = z.object({
  channels: z.string().optional(), // Comma-separated channels
});

/**
 * Get latest data updates since lastUpdate timestamp
 */
async function handlePolling(req: VercelRequest, res: VercelResponse) {
  try {
    const query = pollingQuerySchema.parse(req.query);
    const metricsService = getMetricsService();
    
    // Parse lastUpdate timestamp
    const since = query.lastUpdate ? new Date(query.lastUpdate) : new Date(Date.now() - 5 * 60 * 1000); // Default: last 5 minutes
    
    // Parse event types filter
    const eventTypes = query.types ? query.types.split(',').map(t => t.trim()) : undefined;
    
    // Get recent events
    const events = await metricsService.getEvents({
      since,
      eventTypes,
      limit: query.limit,
    });
    
    // Get current summary for comparison
    const summary = await metricsService.getSummary();
    
    // Check if there are any updates
    const hasUpdates = events.length > 0;
    const latestTimestamp = events.length > 0 ? events[0].timestamp : since.toISOString();
    
    // Response format
    const response = {
      hasUpdates,
      timestamp: new Date().toISOString(),
      lastUpdate: latestTimestamp,
      updates: hasUpdates ? {
        events: events.slice(0, 10), // Limit to 10 most recent
        summary: {
          totalRequests: summary.totalRequests,
          errorRate: summary.errorRate,
          averageResponseTime: summary.averageResponseTime,
          recentActivity: events.length,
        },
        metrics: {
          requestsLastMinute: events.filter(e => 
            new Date(e.timestamp) > new Date(Date.now() - 60 * 1000)
          ).length,
          errorsLastMinute: events.filter(e => 
            e.type.includes('error') && new Date(e.timestamp) > new Date(Date.now() - 60 * 1000)
          ).length,
        }
      } : null,
    };
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('X-Timestamp', response.timestamp);
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Polling error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch real-time updates',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Handle Server-Sent Events (SSE) connection
 */
async function handleSSE(req: VercelRequest, res: VercelResponse) {
  try {
    const query = sseQuerySchema.parse(req.query);
    
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
    
    // Parse channels
    const channels = query.channels ? query.channels.split(',').map(c => c.trim()) : ['metrics', 'activity', 'alerts'];
    
    // Send initial connection message
    res.write(`data: ${JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString(),
      channels,
      message: 'Real-time connection established',
    })}\n\n`);
    
    // Set up periodic data sending
    const interval = setInterval(async () => {
      try {
        const metricsService = getMetricsService();
        
        // Get recent events (last 30 seconds)
        const since = new Date(Date.now() - 30 * 1000);
        const events = await metricsService.getEvents({
          since,
          limit: 10,
        });
        
        if (events.length > 0) {
          // Send metrics update
          if (channels.includes('metrics')) {
            res.write(`event: metrics\n`);
            res.write(`data: ${JSON.stringify({
              type: 'metrics',
              timestamp: new Date().toISOString(),
              data: {
                recentEvents: events,
                count: events.length,
              },
            })}\n\n`);
          }
          
          // Send activity update
          if (channels.includes('activity')) {
            const activityEvents = events.filter(e => 
              ['api_call', 'publish_success', 'publish_error', 'user_activity'].includes(e.type)
            );
            
            if (activityEvents.length > 0) {
              res.write(`event: activity\n`);
              res.write(`data: ${JSON.stringify({
                type: 'activity',
                timestamp: new Date().toISOString(),
                data: activityEvents,
              })}\n\n`);
            }
          }
          
          // Send alerts for errors
          if (channels.includes('alerts')) {
            const errorEvents = events.filter(e => e.type.includes('error'));
            
            if (errorEvents.length > 0) {
              res.write(`event: alert\n`);
              res.write(`data: ${JSON.stringify({
                type: 'alert',
                timestamp: new Date().toISOString(),
                data: {
                  level: 'warning',
                  message: `${errorEvents.length} new error(s) detected`,
                  events: errorEvents,
                },
              })}\n\n`);
            }
          }
        }
        
        // Send heartbeat every minute
        if (Date.now() % 60000 < 30000) {
          res.write(`event: heartbeat\n`);
          res.write(`data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
          })}\n\n`);
        }
        
      } catch (error) {
        console.error('SSE data error:', error);
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({
          type: 'error',
          timestamp: new Date().toISOString(),
          message: 'Error fetching real-time data',
        })}\n\n`);
      }
    }, 10000); // Send updates every 10 seconds
    
    // Handle client disconnect
    req.on('close', () => {
      clearInterval(interval);
      console.log('SSE client disconnected');
    });
    
    req.on('error', (error) => {
      clearInterval(interval);
      console.error('SSE connection error:', error);
    });
    
  } catch (error) {
    console.error('SSE setup error:', error);
    res.status(500).json({
      error: 'Failed to establish SSE connection',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Main handler for the real-time API endpoint
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET requests are supported',
    });
  }
  
  // Determine the endpoint based on URL path
  const url = new URL(req.url!, `http://${req.headers.host}`);
  
  if (url.pathname.endsWith('/stream')) {
    // Server-Sent Events endpoint
    await handleSSE(req, res);
  } else if (url.pathname.endsWith('/poll')) {
    // Polling endpoint
    await handlePolling(req, res);
  } else {
    // Health check endpoint
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      endpoints: {
        polling: '/api/realtime/poll',
        sse: '/api/realtime/stream',
      },
      message: 'Real-time API is operational',
    });
  }
}
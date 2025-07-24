import { VercelRequest, VercelResponse } from '@vercel/node';
import { getMetricsService } from '../../src/services/metrics';
import { z } from 'zod';

/**
 * Real-time polling endpoint
 * Returns latest data updates since a given timestamp
 */

// Query parameters schema
const querySchema = z.object({
  lastUpdate: z.string().optional(),
  types: z.string().optional(), // Comma-separated event types
  limit: z.coerce.number().min(1).max(100).default(50),
});

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

  try {
    const query = querySchema.parse(req.query);
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
    res.setHeader('Access-Control-Allow-Origin', '*');
    
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
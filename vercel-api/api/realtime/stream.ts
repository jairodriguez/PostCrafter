import { VercelRequest, VercelResponse } from '@vercel/node';
import { getMetricsService } from '../../src/services/metrics';
import { z } from 'zod';

/**
 * Server-Sent Events (SSE) endpoint for real-time data streaming
 */

// Query parameters schema
const querySchema = z.object({
  channels: z.string().optional(), // Comma-separated channels
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, Cache-Control');
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
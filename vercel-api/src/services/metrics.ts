/**
 * Metrics Collection Service
 * 
 * Collects and stores API usage metrics, successful publishes, error rates,
 * and user activity data for PostCrafter monitoring and analytics.
 * 
 * @package PostCrafter
 * @version 1.0.0
 * @since 1.0.0
 */

import fs from 'fs/promises';
import path from 'path';
import { secureLog } from '../utils/env';

// Types for metrics data
export interface MetricEvent {
  id: string;
  timestamp: Date;
  type: MetricEventType;
  endpoint: string;
  method: string;
  userId?: string;
  userAgent?: string;
  ip?: string;
  requestId?: string;
  duration?: number;
  statusCode?: number;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export type MetricEventType = 
  | 'api_call'
  | 'publish_success'
  | 'publish_error'
  | 'validation_error'
  | 'auth_error'
  | 'rate_limit_error'
  | 'wordpress_error'
  | 'system_error'
  | 'user_activity';

export interface MetricsSummary {
  totalApiCalls: number;
  successfulPublishes: number;
  errorCount: number;
  errorRate: number;
  averageResponseTime: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  topErrors: Array<{ error: string; count: number }>;
  userActivity: Array<{ userId: string; activityCount: number }>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface MetricsFilter {
  startDate?: Date;
  endDate?: Date;
  eventType?: MetricEventType;
  endpoint?: string;
  userId?: string;
  statusCode?: number;
  limit?: number;
  offset?: number;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  errorRatePercentage: number;
  uptime: number;
}

/**
 * Metrics Collection Service
 * 
 * Handles collection, storage, and retrieval of application metrics
 */
export class MetricsService {
  private metricsBuffer: MetricEvent[] = [];
  private bufferFlushInterval: NodeJS.Timeout | null = null;
  private bufferMaxSize: number = 100;
  private flushIntervalMs: number = 30000; // 30 seconds
  private metricsFilePath: string;
  private isFlushingBuffer: boolean = false;

  constructor() {
    // Use /tmp for Vercel serverless functions or local path for development
    const metricsDir = process.env.VERCEL ? '/tmp/metrics' : './data/metrics';
    this.metricsFilePath = path.join(metricsDir, 'metrics.jsonl');
    
    this.initializeMetricsStorage();
    this.startBufferFlushInterval();
  }

  /**
   * Initialize metrics storage
   */
  private async initializeMetricsStorage(): Promise<void> {
    try {
      const metricsDir = path.dirname(this.metricsFilePath);
      await fs.mkdir(metricsDir, { recursive: true });
      
      // Create metrics file if it doesn't exist
      try {
        await fs.access(this.metricsFilePath);
      } catch {
        await fs.writeFile(this.metricsFilePath, '');
      }
      
      secureLog('info', 'Metrics storage initialized', { 
        filePath: this.metricsFilePath 
      });
    } catch (error) {
      secureLog('error', 'Failed to initialize metrics storage', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        filePath: this.metricsFilePath
      });
    }
  }

  /**
   * Start the buffer flush interval
   */
  private startBufferFlushInterval(): void {
    this.bufferFlushInterval = setInterval(() => {
      this.flushBufferToDisk();
    }, this.flushIntervalMs);
  }

  /**
   * Stop the buffer flush interval
   */
  public stopFlushInterval(): void {
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
      this.bufferFlushInterval = null;
    }
  }

  /**
   * Record an API call event
   */
  public recordApiCall(data: {
    endpoint: string;
    method: string;
    userId?: string;
    userAgent?: string;
    ip?: string;
    requestId?: string;
    duration?: number;
    statusCode?: number;
    metadata?: Record<string, any>;
  }): void {
    const event: MetricEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      type: 'api_call',
      ...data
    };

    this.addEventToBuffer(event);
  }

  /**
   * Record a successful publish event
   */
  public recordPublishSuccess(data: {
    endpoint: string;
    method: string;
    userId?: string;
    userAgent?: string;
    ip?: string;
    requestId?: string;
    duration?: number;
    statusCode?: number;
    metadata?: Record<string, any>;
  }): void {
    const event: MetricEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      type: 'publish_success',
      ...data
    };

    this.addEventToBuffer(event);
  }

  /**
   * Record an error event
   */
  public recordError(data: {
    endpoint: string;
    method: string;
    userId?: string;
    userAgent?: string;
    ip?: string;
    requestId?: string;
    duration?: number;
    statusCode?: number;
    errorCode?: string;
    errorMessage?: string;
    errorType: 'publish_error' | 'validation_error' | 'auth_error' | 'rate_limit_error' | 'wordpress_error' | 'system_error';
    metadata?: Record<string, any>;
  }): void {
    const event: MetricEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      type: data.errorType,
      endpoint: data.endpoint,
      method: data.method,
      userId: data.userId,
      userAgent: data.userAgent,
      ip: data.ip,
      requestId: data.requestId,
      duration: data.duration,
      statusCode: data.statusCode,
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,
      metadata: data.metadata
    };

    this.addEventToBuffer(event);
  }

  /**
   * Record user activity event
   */
  public recordUserActivity(data: {
    userId: string;
    endpoint: string;
    method: string;
    userAgent?: string;
    ip?: string;
    requestId?: string;
    metadata?: Record<string, any>;
  }): void {
    const event: MetricEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      type: 'user_activity',
      ...data
    };

    this.addEventToBuffer(event);
  }

  /**
   * Add event to buffer
   */
  private addEventToBuffer(event: MetricEvent): void {
    this.metricsBuffer.push(event);

    // Flush buffer if it's full
    if (this.metricsBuffer.length >= this.bufferMaxSize) {
      this.flushBufferToDisk();
    }
  }

  /**
   * Flush buffer to disk
   */
  private async flushBufferToDisk(): Promise<void> {
    if (this.isFlushingBuffer || this.metricsBuffer.length === 0) {
      return;
    }

    this.isFlushingBuffer = true;

    try {
      const eventsToFlush = [...this.metricsBuffer];
      this.metricsBuffer = [];

      const jsonLines = eventsToFlush
        .map(event => JSON.stringify(event))
        .join('\n') + '\n';

      await fs.appendFile(this.metricsFilePath, jsonLines);

      secureLog('debug', 'Metrics buffer flushed to disk', {
        eventCount: eventsToFlush.length,
        filePath: this.metricsFilePath
      });
    } catch (error) {
      // Put events back in buffer if flush failed
      this.metricsBuffer.unshift(...this.metricsBuffer);
      
      secureLog('error', 'Failed to flush metrics buffer', {
        error: error instanceof Error ? error.message : 'Unknown error',
        bufferSize: this.metricsBuffer.length
      });
    } finally {
      this.isFlushingBuffer = false;
    }
  }

  /**
   * Get metrics for specified time range and filters
   */
  public async getMetrics(filter: MetricsFilter = {}): Promise<MetricEvent[]> {
    try {
      // First flush any pending buffer data
      await this.flushBufferToDisk();

      const fileContent = await fs.readFile(this.metricsFilePath, 'utf-8');
      const lines = fileContent.trim().split('\n').filter(line => line.length > 0);

      let events: MetricEvent[] = [];
      
      for (const line of lines) {
        try {
          const event = JSON.parse(line) as MetricEvent;
          event.timestamp = new Date(event.timestamp); // Ensure timestamp is Date object
          events.push(event);
        } catch (parseError) {
          secureLog('warn', 'Failed to parse metrics line', { line });
        }
      }

      // Apply filters
      events = this.applyFilters(events, filter);

      // Apply pagination
      if (filter.offset) {
        events = events.slice(filter.offset);
      }
      if (filter.limit) {
        events = events.slice(0, filter.limit);
      }

      return events;
    } catch (error) {
      secureLog('error', 'Failed to read metrics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Get metrics summary for dashboard
   */
  public async getMetricsSummary(filter: MetricsFilter = {}): Promise<MetricsSummary> {
    const events = await this.getMetrics(filter);

    if (events.length === 0) {
      return this.getEmptyMetricsSummary();
    }

    const totalApiCalls = events.filter(e => e.type === 'api_call').length;
    const successfulPublishes = events.filter(e => e.type === 'publish_success').length;
    const errorEvents = events.filter(e => e.type.includes('error'));
    const errorCount = errorEvents.length;
    const errorRate = totalApiCalls > 0 ? (errorCount / totalApiCalls) * 100 : 0;

    // Calculate average response time
    const eventsWithDuration = events.filter(e => e.duration !== undefined);
    const averageResponseTime = eventsWithDuration.length > 0
      ? eventsWithDuration.reduce((sum, e) => sum + (e.duration || 0), 0) / eventsWithDuration.length
      : 0;

    // Top endpoints
    const endpointCounts = new Map<string, number>();
    events.forEach(e => {
      const count = endpointCounts.get(e.endpoint) || 0;
      endpointCounts.set(e.endpoint, count + 1);
    });
    const topEndpoints = Array.from(endpointCounts.entries())
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top errors
    const errorCounts = new Map<string, number>();
    errorEvents.forEach(e => {
      const errorKey = e.errorCode || e.type;
      const count = errorCounts.get(errorKey) || 0;
      errorCounts.set(errorKey, count + 1);
    });
    const topErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // User activity
    const userActivityCounts = new Map<string, number>();
    events.filter(e => e.userId).forEach(e => {
      const userId = e.userId!;
      const count = userActivityCounts.get(userId) || 0;
      userActivityCounts.set(userId, count + 1);
    });
    const userActivity = Array.from(userActivityCounts.entries())
      .map(([userId, activityCount]) => ({ userId, activityCount }))
      .sort((a, b) => b.activityCount - a.activityCount)
      .slice(0, 20);

    // Time range
    const timestamps = events.map(e => e.timestamp);
    const start = new Date(Math.min(...timestamps.map(t => t.getTime())));
    const end = new Date(Math.max(...timestamps.map(t => t.getTime())));

    return {
      totalApiCalls,
      successfulPublishes,
      errorCount,
      errorRate,
      averageResponseTime,
      topEndpoints,
      topErrors,
      userActivity,
      timeRange: { start, end }
    };
  }

  /**
   * Get performance metrics
   */
  public async getPerformanceMetrics(filter: MetricsFilter = {}): Promise<PerformanceMetrics> {
    const events = await this.getMetrics(filter);
    const eventsWithDuration = events.filter(e => e.duration !== undefined);

    if (eventsWithDuration.length === 0) {
      return {
        averageResponseTime: 0,
        medianResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        requestsPerMinute: 0,
        requestsPerHour: 0,
        errorRatePercentage: 0,
        uptime: 100
      };
    }

    // Response time calculations
    const durations = eventsWithDuration.map(e => e.duration!).sort((a, b) => a - b);
    const averageResponseTime = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const medianResponseTime = durations[Math.floor(durations.length / 2)];
    const p95ResponseTime = durations[Math.floor(durations.length * 0.95)];
    const p99ResponseTime = durations[Math.floor(durations.length * 0.99)];

    // Request rate calculations
    const timeSpanMs = filter.endDate && filter.startDate 
      ? filter.endDate.getTime() - filter.startDate.getTime()
      : 60 * 60 * 1000; // Default to 1 hour
    
    const timeSpanMinutes = timeSpanMs / (60 * 1000);
    const timeSpanHours = timeSpanMs / (60 * 60 * 1000);
    
    const requestsPerMinute = events.length / timeSpanMinutes;
    const requestsPerHour = events.length / timeSpanHours;

    // Error rate
    const errorEvents = events.filter(e => e.type.includes('error'));
    const errorRatePercentage = events.length > 0 ? (errorEvents.length / events.length) * 100 : 0;

    // Simple uptime calculation (100% - error rate)
    const uptime = Math.max(0, 100 - errorRatePercentage);

    return {
      averageResponseTime,
      medianResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      requestsPerMinute,
      requestsPerHour,
      errorRatePercentage,
      uptime
    };
  }

  /**
   * Clean up old metrics data
   */
  public async cleanupOldMetrics(retentionDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const events = await this.getMetrics();
      const validEvents = events.filter(e => e.timestamp >= cutoffDate);
      const removedCount = events.length - validEvents.length;

      if (removedCount > 0) {
        // Write back only valid events
        const jsonLines = validEvents
          .map(event => JSON.stringify(event))
          .join('\n') + (validEvents.length > 0 ? '\n' : '');

        await fs.writeFile(this.metricsFilePath, jsonLines);

        secureLog('info', 'Cleaned up old metrics', {
          removedCount,
          retentionDays,
          remainingCount: validEvents.length
        });
      }

      return removedCount;
    } catch (error) {
      secureLog('error', 'Failed to cleanup old metrics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }

  /**
   * Export metrics data
   */
  public async exportMetrics(format: 'json' | 'csv' = 'json', filter: MetricsFilter = {}): Promise<string> {
    const events = await this.getMetrics(filter);

    if (format === 'csv') {
      if (events.length === 0) {
        return 'id,timestamp,type,endpoint,method,userId,duration,statusCode,errorCode,errorMessage\n';
      }

      const headers = 'id,timestamp,type,endpoint,method,userId,duration,statusCode,errorCode,errorMessage\n';
      const rows = events.map(event => [
        event.id,
        event.timestamp.toISOString(),
        event.type,
        event.endpoint,
        event.method,
        event.userId || '',
        event.duration || '',
        event.statusCode || '',
        event.errorCode || '',
        event.errorMessage || ''
      ].map(field => `"${field}"`).join(',')).join('\n');

      return headers + rows;
    }

    return JSON.stringify(events, null, 2);
  }

  /**
   * Apply filters to events
   */
  private applyFilters(events: MetricEvent[], filter: MetricsFilter): MetricEvent[] {
    return events.filter(event => {
      if (filter.startDate && event.timestamp < filter.startDate) return false;
      if (filter.endDate && event.timestamp > filter.endDate) return false;
      if (filter.eventType && event.type !== filter.eventType) return false;
      if (filter.endpoint && event.endpoint !== filter.endpoint) return false;
      if (filter.userId && event.userId !== filter.userId) return false;
      if (filter.statusCode && event.statusCode !== filter.statusCode) return false;
      return true;
    });
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get empty metrics summary
   */
  private getEmptyMetricsSummary(): MetricsSummary {
    const now = new Date();
    return {
      totalApiCalls: 0,
      successfulPublishes: 0,
      errorCount: 0,
      errorRate: 0,
      averageResponseTime: 0,
      topEndpoints: [],
      topErrors: [],
      userActivity: [],
      timeRange: { start: now, end: now }
    };
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    this.stopFlushInterval();
    await this.flushBufferToDisk();
    secureLog('info', 'Metrics service shutdown completed');
  }
}

// Singleton instance
let metricsService: MetricsService | null = null;

/**
 * Get the singleton metrics service instance
 */
export function getMetricsService(): MetricsService {
  if (!metricsService) {
    metricsService = new MetricsService();
  }
  return metricsService;
}

/**
 * Convenience functions for common metric recording
 */
export const metrics = {
  recordApiCall: (data: Parameters<MetricsService['recordApiCall']>[0]) => {
    getMetricsService().recordApiCall(data);
  },
  
  recordPublishSuccess: (data: Parameters<MetricsService['recordPublishSuccess']>[0]) => {
    getMetricsService().recordPublishSuccess(data);
  },
  
  recordError: (data: Parameters<MetricsService['recordError']>[0]) => {
    getMetricsService().recordError(data);
  },
  
  recordUserActivity: (data: Parameters<MetricsService['recordUserActivity']>[0]) => {
    getMetricsService().recordUserActivity(data);
  }
};

/**
 * Middleware wrapper for automatic metrics collection
 */
export function withMetrics<T extends (...args: any[]) => any>(
  endpoint: string,
  method: string,
  handler: T
): T {
  return (async (...args: any[]) => {
    const startTime = Date.now();
    const metricsService = getMetricsService();
    
    try {
      // Extract request info from common patterns
      const req = args[0];
      const requestId = req?.requestId || `req_${Date.now()}`;
      
      const baseMetrics = {
        endpoint,
        method,
        requestId,
        userId: req?.userId,
        userAgent: req?.get?.('user-agent'),
        ip: req?.ip || req?.connection?.remoteAddress
      };

      // Record API call
      metricsService.recordApiCall(baseMetrics);

      // Execute handler
      const result = await handler(...args);
      
      // Record success
      const duration = Date.now() - startTime;
      metricsService.recordPublishSuccess({
        ...baseMetrics,
        duration,
        statusCode: 200
      });

      return result;
    } catch (error) {
      // Record error
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      metricsService.recordError({
        endpoint,
        method,
        requestId: args[0]?.requestId || `req_${Date.now()}`,
        userId: args[0]?.userId,
        userAgent: args[0]?.get?.('user-agent'),
        ip: args[0]?.ip,
        duration,
        statusCode: 500,
        errorType: 'system_error',
        errorMessage
      });

      throw error;
    }
  }) as T;
}
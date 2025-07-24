/**
 * Metrics Collection Service Tests
 * 
 * Unit tests for the metrics collection service functionality including
 * event recording, data retrieval, filtering, and performance calculations.
 * 
 * @package PostCrafter
 * @version 1.0.0
 */

import fs from 'fs/promises';
import path from 'path';
import { MetricsService, getMetricsService, metrics, MetricEventType, MetricsFilter } from '../metrics';

// Mock the env utility
jest.mock('../../utils/env', () => ({
  secureLog: jest.fn()
}));

describe('MetricsService', () => {
  let metricsService: MetricsService;
  let testMetricsDir: string;
  let testMetricsFile: string;

  beforeEach(async () => {
    // Create a temporary test directory
    testMetricsDir = path.join('./test-data', 'metrics-test');
    testMetricsFile = path.join(testMetricsDir, 'metrics.jsonl');
    
    // Clean up any existing test data
    try {
      await fs.rm(testMetricsDir, { recursive: true });
    } catch {
      // Directory doesn't exist, that's fine
    }

    // Create new metrics service instance for testing
    metricsService = new MetricsService();
    
    // Override the file path for testing
    (metricsService as any).metricsFilePath = testMetricsFile;
    
    // Initialize storage
    await (metricsService as any).initializeMetricsStorage();
  });

  afterEach(async () => {
    // Stop flush interval and clean up
    metricsService.stopFlushInterval();
    await metricsService.shutdown();
    
    // Clean up test files
    try {
      await fs.rm(testMetricsDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Event Recording', () => {
    it('should record API call events', () => {
      const apiCallData = {
        endpoint: '/api/publish',
        method: 'POST',
        userId: 'user123',
        userAgent: 'PostCrafter/1.0',
        ip: '192.168.1.1',
        requestId: 'req_123',
        duration: 250,
        statusCode: 200,
        metadata: { contentType: 'article' }
      };

      expect(() => {
        metricsService.recordApiCall(apiCallData);
      }).not.toThrow();
    });

    it('should record publish success events', () => {
      const publishData = {
        endpoint: '/api/publish',
        method: 'POST',
        userId: 'user123',
        duration: 1200,
        statusCode: 201,
        metadata: { postId: 456 }
      };

      expect(() => {
        metricsService.recordPublishSuccess(publishData);
      }).not.toThrow();
    });

    it('should record error events with different error types', () => {
      const errorTypes: Array<'publish_error' | 'validation_error' | 'auth_error' | 'rate_limit_error' | 'wordpress_error' | 'system_error'> = [
        'publish_error',
        'validation_error', 
        'auth_error',
        'rate_limit_error',
        'wordpress_error',
        'system_error'
      ];

      errorTypes.forEach(errorType => {
        expect(() => {
          metricsService.recordError({
            endpoint: '/api/publish',
            method: 'POST',
            userId: 'user123',
            errorType,
            errorCode: 'TEST_ERROR',
            errorMessage: 'Test error message',
            statusCode: 500
          });
        }).not.toThrow();
      });
    });

    it('should record user activity events', () => {
      const activityData = {
        userId: 'user123',
        endpoint: '/api/publish',
        method: 'POST',
        userAgent: 'PostCrafter/1.0',
        metadata: { action: 'create_post' }
      };

      expect(() => {
        metricsService.recordUserActivity(activityData);
      }).not.toThrow();
    });
  });

  describe('Buffer Management', () => {
    it('should flush buffer when it reaches maximum size', async () => {
      // Set a small buffer size for testing
      (metricsService as any).bufferMaxSize = 5;

      // Add events to trigger buffer flush
      for (let i = 0; i < 6; i++) {
        metricsService.recordApiCall({
          endpoint: '/api/test',
          method: 'GET',
          requestId: `req_${i}`
        });
      }

      // Give some time for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that metrics file was created and contains data
      const fileExists = await fs.access(testMetricsFile)
        .then(() => true)
        .catch(() => false);

      expect(fileExists).toBe(true);
    });

    it('should handle buffer flush errors gracefully', async () => {
      // Create an invalid file path to trigger flush error
      (metricsService as any).metricsFilePath = '/invalid/path/metrics.jsonl';

      expect(() => {
        metricsService.recordApiCall({
          endpoint: '/api/test',
          method: 'GET'
        });
      }).not.toThrow();
    });
  });

  describe('Metrics Retrieval', () => {
    beforeEach(async () => {
      // Add sample data for testing
      const sampleEvents = [
        { endpoint: '/api/publish', method: 'POST', type: 'api_call' as MetricEventType, userId: 'user1' },
        { endpoint: '/api/publish', method: 'POST', type: 'publish_success' as MetricEventType, userId: 'user1', duration: 500 },
        { endpoint: '/api/health', method: 'GET', type: 'api_call' as MetricEventType, userId: 'user2' },
        { endpoint: '/api/publish', method: 'POST', type: 'publish_error' as MetricEventType, userId: 'user1', errorCode: 'TIMEOUT' },
        { endpoint: '/api/metrics', method: 'GET', type: 'api_call' as MetricEventType, userId: 'user2' }
      ];

      for (const event of sampleEvents) {
        if (event.type === 'publish_success') {
          metricsService.recordPublishSuccess(event as any);
        } else if (event.type.includes('error')) {
          metricsService.recordError({
            ...event,
            errorType: event.type as any
          } as any);
        } else {
          metricsService.recordApiCall(event as any);
        }
      }

      // Force flush to disk
      await (metricsService as any).flushBufferToDisk();
    });

    it('should retrieve all metrics without filters', async () => {
      const events = await metricsService.getMetrics();
      expect(events.length).toBeGreaterThan(0);
      expect(events[0]).toHaveProperty('id');
      expect(events[0]).toHaveProperty('timestamp');
      expect(events[0]).toHaveProperty('type');
    });

    it('should filter metrics by event type', async () => {
      const filter: MetricsFilter = { eventType: 'publish_success' };
      const events = await metricsService.getMetrics(filter);
      
      expect(events.length).toBeGreaterThan(0);
      events.forEach(event => {
        expect(event.type).toBe('publish_success');
      });
    });

    it('should filter metrics by endpoint', async () => {
      const filter: MetricsFilter = { endpoint: '/api/publish' };
      const events = await metricsService.getMetrics(filter);
      
      expect(events.length).toBeGreaterThan(0);
      events.forEach(event => {
        expect(event.endpoint).toBe('/api/publish');
      });
    });

    it('should filter metrics by user ID', async () => {
      const filter: MetricsFilter = { userId: 'user1' };
      const events = await metricsService.getMetrics(filter);
      
      expect(events.length).toBeGreaterThan(0);
      events.forEach(event => {
        expect(event.userId).toBe('user1');
      });
    });

    it('should apply pagination with limit and offset', async () => {
      const filter: MetricsFilter = { limit: 2, offset: 1 };
      const events = await metricsService.getMetrics(filter);
      
      expect(events.length).toBeLessThanOrEqual(2);
    });

    it('should filter metrics by date range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const filter: MetricsFilter = {
        startDate: oneHourAgo,
        endDate: now
      };
      
      const events = await metricsService.getMetrics(filter);
      
      events.forEach(event => {
        expect(event.timestamp).toBeInstanceOf(Date);
        expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(oneHourAgo.getTime());
        expect(event.timestamp.getTime()).toBeLessThanOrEqual(now.getTime());
      });
    });
  });

  describe('Metrics Summary', () => {
    beforeEach(async () => {
      // Add diverse sample data for summary testing
      const events = [
        { endpoint: '/api/publish', method: 'POST', type: 'api_call' as const },
        { endpoint: '/api/publish', method: 'POST', type: 'publish_success' as const, duration: 500 },
        { endpoint: '/api/publish', method: 'POST', type: 'publish_success' as const, duration: 750 },
        { endpoint: '/api/health', method: 'GET', type: 'api_call' as const },
        { endpoint: '/api/publish', method: 'POST', type: 'validation_error' as const, errorCode: 'INVALID_DATA' },
        { endpoint: '/api/metrics', method: 'GET', type: 'api_call' as const }
      ];

      for (const event of events) {
        if (event.type === 'publish_success') {
          metricsService.recordPublishSuccess(event as any);
        } else if (event.type.includes('error')) {
          metricsService.recordError({
            ...event,
            errorType: event.type
          } as any);
        } else {
          metricsService.recordApiCall(event as any);
        }
      }

      await (metricsService as any).flushBufferToDisk();
    });

    it('should generate metrics summary with correct totals', async () => {
      const summary = await metricsService.getMetricsSummary();
      
      expect(summary).toHaveProperty('totalApiCalls');
      expect(summary).toHaveProperty('successfulPublishes');
      expect(summary).toHaveProperty('errorCount');
      expect(summary).toHaveProperty('errorRate');
      expect(summary).toHaveProperty('averageResponseTime');
      expect(summary).toHaveProperty('topEndpoints');
      expect(summary).toHaveProperty('topErrors');
      expect(summary).toHaveProperty('userActivity');
      expect(summary).toHaveProperty('timeRange');

      expect(summary.totalApiCalls).toBeGreaterThan(0);
      expect(summary.successfulPublishes).toBeGreaterThan(0);
      expect(summary.errorCount).toBeGreaterThan(0);
      expect(summary.errorRate).toBeGreaterThan(0);
      expect(Array.isArray(summary.topEndpoints)).toBe(true);
      expect(Array.isArray(summary.topErrors)).toBe(true);
    });

    it('should calculate correct error rate', async () => {
      const summary = await metricsService.getMetricsSummary();
      
      // We added 3 API calls and 1 error
      const expectedErrorRate = (summary.errorCount / summary.totalApiCalls) * 100;
      expect(summary.errorRate).toBeCloseTo(expectedErrorRate, 1);
    });

    it('should calculate correct average response time', async () => {
      const summary = await metricsService.getMetricsSummary();
      
      // We added events with durations of 500 and 750, so average should be 625
      expect(summary.averageResponseTime).toBeCloseTo(625, 0);
    });

    it('should return top endpoints sorted by usage', async () => {
      const summary = await metricsService.getMetricsSummary();
      
      expect(summary.topEndpoints.length).toBeGreaterThan(0);
      expect(summary.topEndpoints[0]).toHaveProperty('endpoint');
      expect(summary.topEndpoints[0]).toHaveProperty('count');
      
      // Should be sorted by count descending
      for (let i = 1; i < summary.topEndpoints.length; i++) {
        expect(summary.topEndpoints[i].count).toBeLessThanOrEqual(summary.topEndpoints[i - 1].count);
      }
    });
  });

  describe('Performance Metrics', () => {
    beforeEach(async () => {
      // Add events with various durations for performance testing
      const durations = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
      
      for (const duration of durations) {
        metricsService.recordPublishSuccess({
          endpoint: '/api/publish',
          method: 'POST',
          duration
        });
      }

      await (metricsService as any).flushBufferToDisk();
    });

    it('should calculate performance metrics correctly', async () => {
      const performance = await metricsService.getPerformanceMetrics();
      
      expect(performance).toHaveProperty('averageResponseTime');
      expect(performance).toHaveProperty('medianResponseTime');
      expect(performance).toHaveProperty('p95ResponseTime');
      expect(performance).toHaveProperty('p99ResponseTime');
      expect(performance).toHaveProperty('requestsPerMinute');
      expect(performance).toHaveProperty('requestsPerHour');
      expect(performance).toHaveProperty('errorRatePercentage');
      expect(performance).toHaveProperty('uptime');

      // Average of 100-1000 should be 550
      expect(performance.averageResponseTime).toBeCloseTo(550, 0);
      
      // Median should be around 550 (middle of 500 and 600)
      expect(performance.medianResponseTime).toBeCloseTo(550, 50);
      
      // P95 should be around 950
      expect(performance.p95ResponseTime).toBeGreaterThan(800);
      
      // Uptime should be 100% since we have no errors in this test
      expect(performance.uptime).toBe(100);
    });
  });

  describe('Data Export', () => {
    beforeEach(async () => {
      // Add sample data for export testing
      metricsService.recordApiCall({
        endpoint: '/api/test',
        method: 'GET',
        userId: 'export_user'
      });

      await (metricsService as any).flushBufferToDisk();
    });

    it('should export metrics in JSON format', async () => {
      const exportData = await metricsService.exportMetrics('json');
      
      expect(typeof exportData).toBe('string');
      
      const parsed = JSON.parse(exportData);
      expect(Array.isArray(parsed)).toBe(true);
      
      if (parsed.length > 0) {
        expect(parsed[0]).toHaveProperty('id');
        expect(parsed[0]).toHaveProperty('timestamp');
        expect(parsed[0]).toHaveProperty('type');
      }
    });

    it('should export metrics in CSV format', async () => {
      const exportData = await metricsService.exportMetrics('csv');
      
      expect(typeof exportData).toBe('string');
      expect(exportData).toContain('id,timestamp,type,endpoint,method');
      
      const lines = exportData.split('\n');
      expect(lines.length).toBeGreaterThan(1); // Header + at least one data row
    });
  });

  describe('Data Cleanup', () => {
    beforeEach(async () => {
      // Add old events for cleanup testing
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 45); // 45 days ago

      // Manually create old events by writing to file
      const oldEvent = {
        id: 'old_event_1',
        timestamp: oldDate,
        type: 'api_call',
        endpoint: '/api/old',
        method: 'GET'
      };

      await fs.appendFile(testMetricsFile, JSON.stringify(oldEvent) + '\n');

      // Add a recent event
      metricsService.recordApiCall({
        endpoint: '/api/recent',
        method: 'GET'
      });

      await (metricsService as any).flushBufferToDisk();
    });

    it('should clean up old metrics data', async () => {
      const removedCount = await metricsService.cleanupOldMetrics(30); // 30 day retention
      
      expect(removedCount).toBeGreaterThan(0);
      
      // Verify old events are removed
      const remainingEvents = await metricsService.getMetrics();
      const hasOldEvents = remainingEvents.some(event => 
        event.id === 'old_event_1'
      );
      
      expect(hasOldEvents).toBe(false);
    });

    it('should preserve recent events during cleanup', async () => {
      await metricsService.cleanupOldMetrics(30);
      
      const remainingEvents = await metricsService.getMetrics();
      const hasRecentEvents = remainingEvents.some(event => 
        event.endpoint === '/api/recent'
      );
      
      expect(hasRecentEvents).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle file read errors gracefully', async () => {
      // Point to non-existent file
      (metricsService as any).metricsFilePath = '/non/existent/file.jsonl';
      
      const events = await metricsService.getMetrics();
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBe(0);
    });

    it('should handle invalid JSON lines gracefully', async () => {
      // Write invalid JSON to file
      await fs.appendFile(testMetricsFile, 'invalid json line\n');
      await fs.appendFile(testMetricsFile, '{"valid": "json"}\n');
      
      // Should not throw and should skip invalid lines
      expect(async () => {
        await metricsService.getMetrics();
      }).not.toThrow();
    });
  });

  describe('Singleton and Convenience Functions', () => {
    it('should return the same instance from getMetricsService', () => {
      const service1 = getMetricsService();
      const service2 = getMetricsService();
      
      expect(service1).toBe(service2);
    });

    it('should provide working convenience functions', () => {
      expect(() => {
        metrics.recordApiCall({
          endpoint: '/api/test',
          method: 'GET'
        });
      }).not.toThrow();

      expect(() => {
        metrics.recordPublishSuccess({
          endpoint: '/api/test',
          method: 'POST'
        });
      }).not.toThrow();

      expect(() => {
        metrics.recordError({
          endpoint: '/api/test',
          method: 'POST',
          errorType: 'system_error'
        });
      }).not.toThrow();

      expect(() => {
        metrics.recordUserActivity({
          userId: 'test_user',
          endpoint: '/api/test',
          method: 'GET'
        });
      }).not.toThrow();
    });
  });

  describe('Graceful Shutdown', () => {
    it('should shutdown gracefully', async () => {
      expect(async () => {
        await metricsService.shutdown();
      }).not.toThrow();
    });

    it('should flush remaining buffer data on shutdown', async () => {
      // Add data to buffer
      metricsService.recordApiCall({
        endpoint: '/api/shutdown-test',
        method: 'GET'
      });

      // Shutdown (should flush buffer)
      await metricsService.shutdown();

      // Check that data was flushed
      const fileContent = await fs.readFile(testMetricsFile, 'utf-8');
      expect(fileContent).toContain('/api/shutdown-test');
    });
  });
});

describe('withMetrics middleware wrapper', () => {
  let mockHandler: jest.Mock;
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    mockHandler = jest.fn();
    mockReq = {
      requestId: 'test_req_123',
      userId: 'test_user',
      get: jest.fn().mockReturnValue('Test-Agent/1.0'),
      ip: '127.0.0.1'
    };
    mockRes = {};
  });

  it('should record metrics for successful handler execution', async () => {
    const { withMetrics } = require('../metrics');
    
    mockHandler.mockResolvedValue('success');
    
    const wrappedHandler = withMetrics('/api/test', 'POST', mockHandler);
    
    const result = await wrappedHandler(mockReq, mockRes);
    
    expect(result).toBe('success');
    expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes);
  });

  it('should record error metrics for failed handler execution', async () => {
    const { withMetrics } = require('../metrics');
    
    const testError = new Error('Test error');
    mockHandler.mockRejectedValue(testError);
    
    const wrappedHandler = withMetrics('/api/test', 'POST', mockHandler);
    
    await expect(wrappedHandler(mockReq, mockRes)).rejects.toThrow('Test error');
    expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes);
  });
});
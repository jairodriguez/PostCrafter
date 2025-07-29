/**
 * PostCrafter Performance Monitor
 * Comprehensive performance monitoring and analytics system
 */

import { logger } from './logger';
import { wordPressCache } from './cache';
import { wordPressCircuitBreaker } from './circuit-breaker';
import { wordPressBatchProcessor } from './batch-processor';

// Performance metrics interface
export interface PerformanceMetrics {
  timestamp: number;
  requestCount: number;
  responseTime: {
    average: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  };
  errorRate: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage: number;
  cacheHitRate: number;
  circuitBreakerState: string;
  activeConnections: number;
  batchProcessingStats: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageDuration: number;
  };
}

// Performance alert interface
export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: number;
  resolved: boolean;
}

// Performance thresholds
export interface PerformanceThresholds {
  responseTime: {
    warning: number; // ms
    error: number;   // ms
    critical: number; // ms
  };
  errorRate: {
    warning: number; // percentage
    error: number;   // percentage
    critical: number; // percentage
  };
  throughput: {
    warning: number; // requests per second
    error: number;   // requests per second
    critical: number; // requests per second
  };
  memoryUsage: {
    warning: number; // percentage
    error: number;   // percentage
    critical: number; // percentage
  };
  cacheHitRate: {
    warning: number; // percentage
    error: number;   // percentage
    critical: number; // percentage
  };
}

// Default thresholds
const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  responseTime: {
    warning: 2000,   // 2 seconds
    error: 5000,     // 5 seconds
    critical: 10000  // 10 seconds
  },
  errorRate: {
    warning: 5,      // 5%
    error: 10,       // 10%
    critical: 20     // 20%
  },
  throughput: {
    warning: 50,     // 50 req/s
    error: 20,       // 20 req/s
    critical: 10     // 10 req/s
  },
  memoryUsage: {
    warning: 70,     // 70%
    error: 85,       // 85%
    critical: 95     // 95%
  },
  cacheHitRate: {
    warning: 60,     // 60%
    error: 40,       // 40%
    critical: 20     // 20%
  }
};

/**
 * Performance Monitor Implementation
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private thresholds: PerformanceThresholds;
  private requestTimes: number[] = [];
  private requestCount = 0;
  private errorCount = 0;
  private startTime: number;
  private monitoringInterval?: NodeJS.Timeout;
  private maxMetricsHistory = 1000; // Keep last 1000 metrics

  constructor(thresholds: Partial<PerformanceThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
    this.startTime = Date.now();
    
    logger.info('Performance monitor initialized', { thresholds: this.thresholds });
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.checkAlerts();
      this.cleanupOldData();
    }, intervalMs);

    logger.info('Performance monitoring started', { intervalMs });
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    logger.info('Performance monitoring stopped');
  }

  /**
   * Record a request
   */
  recordRequest(responseTime: number, success: boolean = true): void {
    this.requestCount++;
    this.requestTimes.push(responseTime);
    
    if (!success) {
      this.errorCount++;
    }

    // Keep only last 1000 request times for performance
    if (this.requestTimes.length > 1000) {
      this.requestTimes = this.requestTimes.slice(-1000);
    }
  }

  /**
   * Collect current performance metrics
   */
  private collectMetrics(): void {
    const now = Date.now();
    const uptime = now - this.startTime;
    
    // Calculate response time statistics
    const responseTimeStats = this.calculateResponseTimeStats();
    
    // Calculate error rate
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
    
    // Calculate throughput (requests per second)
    const throughput = uptime > 0 ? (this.requestCount / (uptime / 1000)) : 0;
    
    // Get system metrics
    const memoryUsage = this.getMemoryUsage();
    const cpuUsage = this.getCpuUsage();
    
    // Get cache statistics
    const cacheStats = wordPressCache.getStats();
    const cacheHitRate = cacheStats.hitRate * 100;
    
    // Get circuit breaker state
    const circuitBreakerStats = wordPressCircuitBreaker.getStats();
    
    // Get batch processing statistics
    const batchStats = wordPressBatchProcessor.getStats();
    
    const metrics: PerformanceMetrics = {
      timestamp: now,
      requestCount: this.requestCount,
      responseTime: responseTimeStats,
      errorRate,
      throughput,
      memoryUsage,
      cpuUsage,
      cacheHitRate,
      circuitBreakerState: circuitBreakerStats.state,
      activeConnections: 0, // Would be implemented with actual connection tracking
      batchProcessingStats: {
        totalOperations: batchStats.totalOperations,
        successfulOperations: batchStats.successfulOperations,
        failedOperations: batchStats.failedOperations,
        averageDuration: batchStats.averageDuration
      }
    };

    this.metrics.push(metrics);
    
    // Log metrics for debugging
    logger.debug('Performance metrics collected', {
      responseTime: responseTimeStats.average,
      errorRate,
      throughput,
      cacheHitRate,
      circuitBreakerState: circuitBreakerStats.state
    });
  }

  /**
   * Calculate response time statistics
   */
  private calculateResponseTimeStats(): PerformanceMetrics['responseTime'] {
    if (this.requestTimes.length === 0) {
      return {
        average: 0,
        min: 0,
        max: 0,
        p95: 0,
        p99: 0
      };
    }

    const sorted = [...this.requestTimes].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, time) => acc + time, 0);
    const average = sum / sorted.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);
    
    return {
      average,
      min,
      max,
      p95: sorted[p95Index] || 0,
      p99: sorted[p99Index] || 0
    };
  }

  /**
   * Get memory usage percentage
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      const totalMemory = memUsage.heapTotal + memUsage.external;
      return totalMemory > 0 ? (memUsage.heapUsed / totalMemory) * 100 : 0;
    }
    return 0;
  }

  /**
   * Get CPU usage (simplified implementation)
   */
  private getCpuUsage(): number {
    // This would be implemented with actual CPU monitoring
    // For now, return a mock value
    return Math.random() * 30 + 10; // 10-40% range
  }

  /**
   * Check for performance alerts
   */
  private checkAlerts(): void {
    if (this.metrics.length === 0) return;

    const latestMetrics = this.metrics[this.metrics.length - 1];
    
    // Check response time
    this.checkThreshold('responseTime', latestMetrics.responseTime.average, this.thresholds.responseTime);
    
    // Check error rate
    this.checkThreshold('errorRate', latestMetrics.errorRate, this.thresholds.errorRate);
    
    // Check throughput
    this.checkThreshold('throughput', latestMetrics.throughput, this.thresholds.throughput);
    
    // Check memory usage
    this.checkThreshold('memoryUsage', latestMetrics.memoryUsage, this.thresholds.memoryUsage);
    
    // Check cache hit rate
    this.checkThreshold('cacheHitRate', latestMetrics.cacheHitRate, this.thresholds.cacheHitRate);
  }

  /**
   * Check if a metric exceeds thresholds
   */
  private checkThreshold(
    metricName: string,
    value: number,
    thresholds: { warning: number; error: number; critical: number }
  ): void {
    let alertType: 'warning' | 'error' | 'critical' | null = null;
    let threshold = 0;

    if (value >= thresholds.critical) {
      alertType = 'critical';
      threshold = thresholds.critical;
    } else if (value >= thresholds.error) {
      alertType = 'error';
      threshold = thresholds.error;
    } else if (value >= thresholds.warning) {
      alertType = 'warning';
      threshold = thresholds.warning;
    }

    if (alertType) {
      const alert: PerformanceAlert = {
        id: `${metricName}_${Date.now()}`,
        type: alertType,
        message: `${metricName} exceeded ${alertType} threshold`,
        metric: metricName,
        value,
        threshold,
        timestamp: Date.now(),
        resolved: false
      };

      this.alerts.push(alert);
      
      logger.warn('Performance alert triggered', {
        type: alertType,
        metric: metricName,
        value,
        threshold
      });
    }
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Clean up old alerts (older than 1 hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => alert.timestamp > oneHourAgo);
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get performance metrics history
   */
  getMetricsHistory(limit: number = 100): PerformanceMetrics[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    uptime: number;
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    throughput: number;
    cacheHitRate: number;
    activeAlerts: number;
  } {
    const currentMetrics = this.getCurrentMetrics();
    const activeAlerts = this.getActiveAlerts().length;
    
    return {
      uptime: Date.now() - this.startTime,
      totalRequests: currentMetrics?.requestCount || 0,
      averageResponseTime: currentMetrics?.responseTime.average || 0,
      errorRate: currentMetrics?.errorRate || 0,
      throughput: currentMetrics?.throughput || 0,
      cacheHitRate: currentMetrics?.cacheHitRate || 0,
      activeAlerts
    };
  }

  /**
   * Reset performance monitor
   */
  reset(): void {
    this.metrics = [];
    this.alerts = [];
    this.requestTimes = [];
    this.requestCount = 0;
    this.errorCount = 0;
    this.startTime = Date.now();
    
    logger.info('Performance monitor reset');
  }

  /**
   * Export performance data
   */
  exportData(): {
    metrics: PerformanceMetrics[];
    alerts: PerformanceAlert[];
    summary: ReturnType<typeof this.getPerformanceSummary>;
  } {
    return {
      metrics: this.getMetricsHistory(),
      alerts: this.getAllAlerts(),
      summary: this.getPerformanceSummary()
    };
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Performance monitoring middleware
export const performanceMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args: any[]) {
    const responseTime = Date.now() - startTime;
    const success = res.statusCode < 400;
    
    performanceMonitor.recordRequest(responseTime, success);
    
    originalEnd.apply(this, args);
  };
  
  next();
};

export default performanceMonitor;
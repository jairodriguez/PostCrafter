import { logger } from './logger';
import { getEnvVars } from './env';
import { wordPressErrorHandler } from './wordpress-api-error-handler';

/**
 * Application health status
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  CRITICAL = 'critical'
}

/**
 * Metric types for tracking
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMER = 'timer'
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  successRate: number;
  wordPressApiCalls: number;
  wordPressApiErrors: number;
  activeConnections: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  uptime: number;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  service: string;
  status: HealthStatus;
  responseTime: number;
  message?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  enableMetrics: boolean;
  enableAlerts: boolean;
  enableHealthChecks: boolean;
  metricsRetentionDays: number;
  healthCheckIntervalMs: number;
  alertThresholds: {
    errorRate: number;
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  webhookUrls: {
    slack?: string;
    discord?: string;
    pagerduty?: string;
    generic?: string;
  };
}

/**
 * Alert definition
 */
export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved?: boolean;
  resolvedAt?: Date;
}

/**
 * Application monitoring class
 */
export class ApplicationMonitor {
  private config: MonitoringConfig;
  private metrics: Map<string, any> = new Map();
  private responseTimes: number[] = [];
  private alerts: Map<string, Alert> = new Map();
  private healthChecks: Map<string, HealthCheckResult> = new Map();
  private startTime: Date = new Date();

  constructor(config?: Partial<MonitoringConfig>) {
    const envVars = getEnvVars();
    
    this.config = {
      enableMetrics: true,
      enableAlerts: envVars.NODE_ENV === 'production',
      enableHealthChecks: true,
      metricsRetentionDays: 7,
      healthCheckIntervalMs: 30000, // 30 seconds
      alertThresholds: {
        errorRate: 0.05, // 5% error rate
        responseTime: 5000, // 5 seconds
        memoryUsage: 0.8, // 80% memory usage
        cpuUsage: 0.8 // 80% CPU usage
      },
      webhookUrls: {
        slack: envVars.SLACK_WEBHOOK_URL,
        discord: envVars.DISCORD_WEBHOOK_URL,
        pagerduty: envVars.PAGERDUTY_ROUTING_KEY,
        generic: envVars.SECURITY_WEBHOOK_URL
      },
      ...config
    };

    // Initialize metrics
    this.initializeMetrics();

    // Start health checks if enabled
    if (this.config.enableHealthChecks) {
      this.startHealthChecks();
    }
  }

  /**
   * Initialize default metrics
   */
  private initializeMetrics(): void {
    this.setMetric('requests.total', 0, MetricType.COUNTER);
    this.setMetric('requests.errors', 0, MetricType.COUNTER);
    this.setMetric('requests.success', 0, MetricType.COUNTER);
    this.setMetric('wordpress.api.calls', 0, MetricType.COUNTER);
    this.setMetric('wordpress.api.errors', 0, MetricType.COUNTER);
    this.setMetric('response.time.avg', 0, MetricType.GAUGE);
    this.setMetric('response.time.p95', 0, MetricType.GAUGE);
    this.setMetric('response.time.p99', 0, MetricType.GAUGE);
    this.setMetric('system.memory.usage', 0, MetricType.GAUGE);
    this.setMetric('system.cpu.usage', 0, MetricType.GAUGE);
    this.setMetric('health.status', HealthStatus.HEALTHY, MetricType.GAUGE);
  }

  /**
   * Record a metric value
   */
  setMetric(name: string, value: any, type: MetricType = MetricType.GAUGE): void {
    if (!this.config.enableMetrics) return;

    this.metrics.set(name, {
      value,
      type,
      timestamp: new Date()
    });

    // Log metric if debug logging is enabled
    logger.debug('Metric recorded', {
      metric: name,
      value,
      type,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Increment a counter metric
   */
  incrementMetric(name: string, value: number = 1): void {
    if (!this.config.enableMetrics) return;

    const current = this.getMetricValue(name) || 0;
    this.setMetric(name, current + value, MetricType.COUNTER);
  }

  /**
   * Record response time
   */
  recordResponseTime(time: number): void {
    if (!this.config.enableMetrics) return;

    this.responseTimes.push(time);

    // Keep only last 1000 response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }

    // Update metrics
    this.updateResponseTimeMetrics();
  }

  /**
   * Update response time metrics
   */
  private updateResponseTimeMetrics(): void {
    if (this.responseTimes.length === 0) return;

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const avg = this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    this.setMetric('response.time.avg', Math.round(avg));
    this.setMetric('response.time.p95', p95);
    this.setMetric('response.time.p99', p99);

    // Check for performance alerts
    this.checkPerformanceAlerts(avg, p95);
  }

  /**
   * Record request
   */
  recordRequest(success: boolean, responseTime: number): void {
    this.incrementMetric('requests.total');
    
    if (success) {
      this.incrementMetric('requests.success');
    } else {
      this.incrementMetric('requests.errors');
    }

    this.recordResponseTime(responseTime);
    this.updateErrorRate();
  }

  /**
   * Record WordPress API call
   */
  recordWordPressApiCall(success: boolean): void {
    this.incrementMetric('wordpress.api.calls');
    
    if (!success) {
      this.incrementMetric('wordpress.api.errors');
    }
  }

  /**
   * Update error rate and check thresholds
   */
  private updateErrorRate(): void {
    const totalRequests = this.getMetricValue('requests.total') || 0;
    const errors = this.getMetricValue('requests.errors') || 0;
    
    if (totalRequests > 0) {
      const errorRate = errors / totalRequests;
      this.setMetric('requests.error_rate', errorRate);

      // Check error rate threshold
      if (errorRate > this.config.alertThresholds.errorRate && totalRequests >= 10) {
        this.createAlert(
          'high_error_rate',
          AlertSeverity.HIGH,
          'High Error Rate Detected',
          `Error rate is ${(errorRate * 100).toFixed(2)}% (threshold: ${(this.config.alertThresholds.errorRate * 100).toFixed(2)}%)`,
          'requests.error_rate',
          errorRate,
          this.config.alertThresholds.errorRate
        );
      }
    }
  }

  /**
   * Check performance alerts
   */
  private checkPerformanceAlerts(avgResponseTime: number, p95ResponseTime: number): void {
    const threshold = this.config.alertThresholds.responseTime;

    if (p95ResponseTime > threshold) {
      this.createAlert(
        'slow_response_time',
        AlertSeverity.MEDIUM,
        'Slow Response Time Detected',
        `95th percentile response time is ${p95ResponseTime}ms (threshold: ${threshold}ms)`,
        'response.time.p95',
        p95ResponseTime,
        threshold
      );
    }
  }

  /**
   * Get metric value
   */
  getMetricValue(name: string): any {
    const metric = this.metrics.get(name);
    return metric ? metric.value : undefined;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    this.metrics.forEach((metric, name) => {
      result[name] = metric.value;
    });
    return result;
  }

  /**
   * Get performance metrics summary
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const totalRequests = this.getMetricValue('requests.total') || 0;
    const errors = this.getMetricValue('requests.errors') || 0;
    const successRate = totalRequests > 0 ? ((totalRequests - errors) / totalRequests) : 1;

    return {
      requestCount: totalRequests,
      errorCount: errors,
      averageResponseTime: this.getMetricValue('response.time.avg') || 0,
      p95ResponseTime: this.getMetricValue('response.time.p95') || 0,
      p99ResponseTime: this.getMetricValue('response.time.p99') || 0,
      successRate: parseFloat((successRate * 100).toFixed(2)),
      wordPressApiCalls: this.getMetricValue('wordpress.api.calls') || 0,
      wordPressApiErrors: this.getMetricValue('wordpress.api.errors') || 0,
      activeConnections: 0, // Would need to track this separately
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
      uptime: Date.now() - this.startTime.getTime()
    };
  }

  /**
   * Create an alert
   */
  private createAlert(
    id: string,
    severity: AlertSeverity,
    title: string,
    message: string,
    metric: string,
    value: number,
    threshold: number
  ): void {
    // Check if alert already exists and is not resolved
    const existingAlert = this.alerts.get(id);
    if (existingAlert && !existingAlert.resolved) {
      return; // Don't create duplicate alerts
    }

    const alert: Alert = {
      id,
      severity,
      title,
      message,
      metric,
      value,
      threshold,
      timestamp: new Date()
    };

    this.alerts.set(id, alert);

    // Log the alert
    logger.error('Application alert triggered', {
      alert,
      requestId: `alert_${Date.now()}`
    });

    // Send alert notifications
    if (this.config.enableAlerts) {
      this.sendAlert(alert);
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(id: string): void {
    const alert = this.alerts.get(id);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();

      logger.info('Application alert resolved', {
        alert,
        requestId: `alert_resolved_${Date.now()}`
      });

      // Send resolution notification
      if (this.config.enableAlerts) {
        this.sendAlertResolution(alert);
      }
    }
  }

  /**
   * Send alert notification
   */
  private async sendAlert(alert: Alert): Promise<void> {
    const payload = {
      type: 'alert',
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      timestamp: alert.timestamp.toISOString(),
      environment: process.env.NODE_ENV || 'unknown'
    };

    // Send to configured webhooks
    const promises: Promise<void>[] = [];

    if (this.config.webhookUrls.slack) {
      promises.push(this.sendSlackAlert(alert, payload));
    }

    if (this.config.webhookUrls.discord) {
      promises.push(this.sendDiscordAlert(alert, payload));
    }

    if (this.config.webhookUrls.generic) {
      promises.push(this.sendWebhookAlert(this.config.webhookUrls.generic, payload));
    }

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      logger.error('Failed to send alert notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        alert: alert.id
      });
    }
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(alert: Alert, payload: any): Promise<void> {
    if (!this.config.webhookUrls.slack) return;

    const slackPayload = {
      text: `🚨 ${alert.title}`,
      attachments: [
        {
          color: this.getSeverityColor(alert.severity),
          fields: [
            { title: 'Message', value: alert.message, short: false },
            { title: 'Metric', value: alert.metric, short: true },
            { title: 'Value', value: alert.value.toString(), short: true },
            { title: 'Threshold', value: alert.threshold.toString(), short: true },
            { title: 'Environment', value: process.env.NODE_ENV || 'unknown', short: true }
          ],
          timestamp: Math.floor(alert.timestamp.getTime() / 1000)
        }
      ]
    };

    await this.sendWebhookAlert(this.config.webhookUrls.slack, slackPayload);
  }

  /**
   * Send Discord alert
   */
  private async sendDiscordAlert(alert: Alert, payload: any): Promise<void> {
    if (!this.config.webhookUrls.discord) return;

    const discordPayload = {
      embeds: [
        {
          title: `🚨 ${alert.title}`,
          description: alert.message,
          color: this.getSeverityColorHex(alert.severity),
          fields: [
            { name: 'Metric', value: alert.metric, inline: true },
            { name: 'Value', value: alert.value.toString(), inline: true },
            { name: 'Threshold', value: alert.threshold.toString(), inline: true }
          ],
          timestamp: alert.timestamp.toISOString()
        }
      ]
    };

    await this.sendWebhookAlert(this.config.webhookUrls.discord, discordPayload);
  }

  /**
   * Send generic webhook alert
   */
  private async sendWebhookAlert(url: string, payload: any): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      logger.error('Failed to send webhook alert', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Send alert resolution notification
   */
  private async sendAlertResolution(alert: Alert): Promise<void> {
    const payload = {
      type: 'alert_resolution',
      alert_id: alert.id,
      title: `✅ Resolved: ${alert.title}`,
      message: `Alert "${alert.title}" has been resolved`,
      resolved_at: alert.resolvedAt?.toISOString(),
      environment: process.env.NODE_ENV || 'unknown'
    };

    if (this.config.webhookUrls.slack) {
      const slackPayload = {
        text: `✅ Alert Resolved: ${alert.title}`,
        attachments: [
          {
            color: 'good',
            fields: [
              { title: 'Alert', value: alert.title, short: true },
              { title: 'Resolved At', value: alert.resolvedAt?.toISOString(), short: true }
            ]
          }
        ]
      };
      await this.sendWebhookAlert(this.config.webhookUrls.slack, slackPayload);
    }

    if (this.config.webhookUrls.generic) {
      await this.sendWebhookAlert(this.config.webhookUrls.generic, payload);
    }
  }

  /**
   * Get severity color for Slack
   */
  private getSeverityColor(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.LOW: return '#36a64f';
      case AlertSeverity.MEDIUM: return '#ff9900';
      case AlertSeverity.HIGH: return '#ff0000';
      case AlertSeverity.CRITICAL: return '#8b0000';
      default: return '#808080';
    }
  }

  /**
   * Get severity color hex for Discord
   */
  private getSeverityColorHex(severity: AlertSeverity): number {
    switch (severity) {
      case AlertSeverity.LOW: return 0x36a64f;
      case AlertSeverity.MEDIUM: return 0xff9900;
      case AlertSeverity.HIGH: return 0xff0000;
      case AlertSeverity.CRITICAL: return 0x8b0000;
      default: return 0x808080;
    }
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckIntervalMs);

    // Initial health check
    this.performHealthChecks();
  }

  /**
   * Perform all health checks
   */
  private async performHealthChecks(): Promise<void> {
    const checks = [
      this.checkApplicationHealth(),
      this.checkWordPressHealth(),
      this.checkSystemHealth()
    ];

    try {
      await Promise.allSettled(checks);
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check application health
   */
  private async checkApplicationHealth(): Promise<void> {
    const start = Date.now();
    const metrics = this.getPerformanceMetrics();
    const responseTime = Date.now() - start;

    let status = HealthStatus.HEALTHY;
    let message = 'Application is healthy';

    // Check error rate
    if (metrics.requestCount > 10 && (metrics.errorCount / metrics.requestCount) > 0.1) {
      status = HealthStatus.DEGRADED;
      message = 'High error rate detected';
    }

    // Check response time
    if (metrics.p95ResponseTime > 5000) {
      status = HealthStatus.DEGRADED;
      message = 'Slow response times detected';
    }

    const result: HealthCheckResult = {
      service: 'application',
      status,
      responseTime,
      message,
      details: metrics,
      timestamp: new Date()
    };

    this.healthChecks.set('application', result);
    this.setMetric('health.application', status);
  }

  /**
   * Check WordPress health
   */
  private async checkWordPressHealth(): Promise<void> {
    const start = Date.now();
    const stats = wordPressErrorHandler.getStats();
    const responseTime = Date.now() - start;

    let status = HealthStatus.HEALTHY;
    let message = 'WordPress API is healthy';

    // Check WordPress error rate
    if (stats.totalErrors > 0) {
      const recentErrors = stats.totalErrors;
      if (recentErrors > 5) {
        status = HealthStatus.DEGRADED;
        message = `WordPress API showing ${recentErrors} recent errors`;
      }
    }

    const result: HealthCheckResult = {
      service: 'wordpress',
      status,
      responseTime,
      message,
      details: stats,
      timestamp: new Date()
    };

    this.healthChecks.set('wordpress', result);
    this.setMetric('health.wordpress', status);
  }

  /**
   * Check system health
   */
  private async checkSystemHealth(): Promise<void> {
    const start = Date.now();
    const memoryUsage = process.memoryUsage();
    const responseTime = Date.now() - start;

    let status = HealthStatus.HEALTHY;
    let message = 'System resources are healthy';

    // Check memory usage (assuming 512MB limit for serverless)
    const memoryLimit = 512 * 1024 * 1024; // 512MB in bytes
    const memoryUsagePercent = memoryUsage.heapUsed / memoryLimit;

    if (memoryUsagePercent > 0.9) {
      status = HealthStatus.CRITICAL;
      message = 'Critical memory usage';
    } else if (memoryUsagePercent > 0.8) {
      status = HealthStatus.DEGRADED;
      message = 'High memory usage';
    }

    this.setMetric('system.memory.usage', memoryUsagePercent);

    const result: HealthCheckResult = {
      service: 'system',
      status,
      responseTime,
      message,
      details: {
        memoryUsage,
        memoryUsagePercent: Math.round(memoryUsagePercent * 100),
        uptime: process.uptime()
      },
      timestamp: new Date()
    };

    this.healthChecks.set('system', result);
    this.setMetric('health.system', status);
  }

  /**
   * Get overall health status
   */
  getOverallHealth(): HealthCheckResult {
    const healthChecks = Array.from(this.healthChecks.values());
    
    if (healthChecks.length === 0) {
      return {
        service: 'overall',
        status: HealthStatus.UNHEALTHY,
        responseTime: 0,
        message: 'No health checks available',
        timestamp: new Date()
      };
    }

    // Determine overall status based on worst individual status
    let overallStatus = HealthStatus.HEALTHY;
    const statusPriority = {
      [HealthStatus.HEALTHY]: 0,
      [HealthStatus.DEGRADED]: 1,
      [HealthStatus.UNHEALTHY]: 2,
      [HealthStatus.CRITICAL]: 3
    };

    for (const check of healthChecks) {
      if (statusPriority[check.status] > statusPriority[overallStatus]) {
        overallStatus = check.status;
      }
    }

    return {
      service: 'overall',
      status: overallStatus,
      responseTime: Math.max(...healthChecks.map(c => c.responseTime)),
      message: `Overall system status: ${overallStatus}`,
      details: Object.fromEntries(
        healthChecks.map(check => [check.service, {
          status: check.status,
          message: check.message,
          responseTime: check.responseTime
        }])
      ),
      timestamp: new Date()
    };
  }

  /**
   * Get all health checks
   */
  getAllHealthChecks(): Record<string, HealthCheckResult> {
    const result: Record<string, HealthCheckResult> = {};
    this.healthChecks.forEach((check, service) => {
      result[service] = check;
    });
    return result;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.metrics.clear();
    this.responseTimes = [];
    this.initializeMetrics();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }
}

// Create default monitor instance
let defaultMonitor: ApplicationMonitor;

/**
 * Get or create default application monitor
 */
export function getApplicationMonitor(): ApplicationMonitor {
  if (!defaultMonitor) {
    defaultMonitor = new ApplicationMonitor();
  }
  return defaultMonitor;
}

/**
 * Utility functions for application monitoring
 */
export const applicationMonitor = {
  recordRequest: (success: boolean, responseTime: number) =>
    getApplicationMonitor().recordRequest(success, responseTime),
    
  recordWordPressApiCall: (success: boolean) =>
    getApplicationMonitor().recordWordPressApiCall(success),
    
  getPerformanceMetrics: () => getApplicationMonitor().getPerformanceMetrics(),
  getOverallHealth: () => getApplicationMonitor().getOverallHealth(),
  getAllHealthChecks: () => getApplicationMonitor().getAllHealthChecks(),
  getActiveAlerts: () => getApplicationMonitor().getActiveAlerts(),
  
  setMetric: (name: string, value: any, type?: MetricType) =>
    getApplicationMonitor().setMetric(name, value, type),
    
  incrementMetric: (name: string, value?: number) =>
    getApplicationMonitor().incrementMetric(name, value),
    
  updateConfig: (config: Partial<MonitoringConfig>) =>
    getApplicationMonitor().updateConfig(config)
};

export default applicationMonitor;
import { logger } from './logger';
import { getWordPressErrorHandler } from './wordpress-api-error-handler';
import { getMetricsService } from '../services/metrics';

/**
 * Monitoring configuration interface
 */
export interface MonitoringConfig {
  // External monitoring services
  datadog?: {
    apiKey: string;
    appKey: string;
    site: string;
  };
  newRelic?: {
    licenseKey: string;
    appName: string;
  };
  // Alerting configuration
  alerting: {
    enabled: boolean;
    webhookUrl?: string;
    emailRecipients?: string[];
    slackWebhook?: string;
  };
  // Health check configuration
  healthCheck: {
    wordPressUrl: string;
    wordPressApiKey: string;
    checkInterval: number; // seconds
    timeout: number; // milliseconds
  };
  // Performance thresholds
  thresholds: {
    responseTime: number; // milliseconds
    errorRate: number; // percentage
    memoryUsage: number; // percentage
  };
}

/**
 * Health check result interface
 */
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: {
    wordPress: {
      status: 'ok' | 'error';
      responseTime: number;
      error?: string;
    };
    database: {
      status: 'ok' | 'error';
      error?: string;
    };
    memory: {
      status: 'ok' | 'warning' | 'error';
      usage: number;
      threshold: number;
    };
    disk: {
      status: 'ok' | 'warning' | 'error';
      usage: number;
      threshold: number;
    };
  };
  metrics: {
    uptime: number;
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
  };
}

/**
 * Alert interface
 */
export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  metadata: Record<string, any>;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

/**
 * Application Monitoring Service
 * Handles health checks, external monitoring integration, and alerting
 */
export class ApplicationMonitor {
  private config: MonitoringConfig;
  private alerts: Alert[] = [];
  private healthCheckInterval?: NodeJS.Timeout;
  private lastHealthCheck?: HealthCheckResult;

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.initializeMonitoring();
  }

  /**
   * Initialize monitoring services
   */
  private async initializeMonitoring(): Promise<void> {
    logger.info('Initializing application monitoring', {
      datadog: !!this.config.datadog,
      newRelic: !!this.config.newRelic,
      alerting: this.config.alerting.enabled
    });

    // Start health check monitoring
    if (this.config.healthCheck.checkInterval > 0) {
      this.startHealthCheckMonitoring();
    }

    // Initialize external monitoring services
    if (this.config.datadog) {
      await this.initializeDatadog();
    }

    if (this.config.newRelic) {
      await this.initializeNewRelic();
    }
  }

  /**
   * Initialize Datadog integration
   */
  private async initializeDatadog(): Promise<void> {
    try {
      // In a real implementation, you would initialize the Datadog client
      // For now, we'll just log the configuration
      logger.info('Datadog monitoring initialized', {
        site: this.config.datadog!.site
      });
    } catch (error) {
      logger.error('Failed to initialize Datadog monitoring', { error });
    }
  }

  /**
   * Initialize New Relic integration
   */
  private async initializeNewRelic(): Promise<void> {
    try {
      // In a real implementation, you would initialize the New Relic client
      logger.info('New Relic monitoring initialized', {
        appName: this.config.newRelic!.appName
      });
    } catch (error) {
      logger.error('Failed to initialize New Relic monitoring', { error });
    }
  }

  /**
   * Start health check monitoring
   */
  private startHealthCheckMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const healthCheck = await this.performHealthCheck();
        this.lastHealthCheck = healthCheck;

        // Send metrics to external monitoring services
        await this.sendMetricsToExternalServices(healthCheck);

        // Check for alert conditions
        await this.checkAlertConditions(healthCheck);

        logger.debug('Health check completed', {
          status: healthCheck.status,
          responseTime: healthCheck.checks.wordPress.responseTime
        });
      } catch (error) {
        logger.error('Health check monitoring failed', { error });
      }
    }, this.config.healthCheck.checkInterval * 1000);
  }

  /**
   * Perform comprehensive health check
   */
  public async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const metricsService = getMetricsService();

    // Check WordPress connectivity
    const wordPressCheck = await this.checkWordPressHealth();

    // Check system resources
    const memoryCheck = this.checkMemoryUsage();
    const diskCheck = this.checkDiskUsage();

    // Get application metrics
    const metrics = await this.getApplicationMetrics();

    const healthCheck: HealthCheckResult = {
      status: this.determineOverallStatus(wordPressCheck, memoryCheck, diskCheck),
      timestamp: new Date(),
      checks: {
        wordPress: wordPressCheck,
        database: { status: 'ok' }, // Placeholder - implement actual DB check
        memory: memoryCheck,
        disk: diskCheck
      },
      metrics
    };

    // Log health check result
    logger.info('Health check performed', {
      status: healthCheck.status,
      wordPressStatus: wordPressCheck.status,
      memoryUsage: memoryCheck.usage,
      errorRate: metrics.errorRate
    });

    return healthCheck;
  }

  /**
   * Check WordPress API health
   */
  private async checkWordPressHealth(): Promise<HealthCheckResult['checks']['wordPress']> {
    const startTime = Date.now();
    
    try {
      const wordPressErrorHandler = getWordPressErrorHandler();
      
      // Test WordPress API connectivity
      const response = await fetch(`${this.config.healthCheck.wordPressUrl}/wp-json/wp/v2/posts?per_page=1`, {
        headers: {
          'Authorization': `Bearer ${this.config.healthCheck.wordPressApiKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(this.config.healthCheck.timeout)
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`WordPress API returned ${response.status}: ${response.statusText}`);
      }

      return {
        status: 'ok',
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('WordPress health check failed', { error, responseTime });
      
      return {
        status: 'error',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check memory usage
   */
  private checkMemoryUsage(): HealthCheckResult['checks']['memory'] {
    const usage = process.memoryUsage();
    const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;
    const threshold = this.config.thresholds.memoryUsage;

    let status: 'ok' | 'warning' | 'error' = 'ok';
    if (heapUsedPercent > threshold * 0.8) {
      status = 'warning';
    }
    if (heapUsedPercent > threshold) {
      status = 'error';
    }

    return {
      status,
      usage: heapUsedPercent,
      threshold
    };
  }

  /**
   * Check disk usage (placeholder - implement based on deployment environment)
   */
  private checkDiskUsage(): HealthCheckResult['checks']['disk'] {
    // In a serverless environment, disk usage might not be relevant
    // This is a placeholder implementation
    const usage = 50; // Placeholder value
    const threshold = 80;

    let status: 'ok' | 'warning' | 'error' = 'ok';
    if (usage > threshold * 0.8) {
      status = 'warning';
    }
    if (usage > threshold) {
      status = 'error';
    }

    return {
      status,
      usage,
      threshold
    };
  }

  /**
   * Get application metrics
   */
  private async getApplicationMetrics(): Promise<HealthCheckResult['metrics']> {
    const metricsService = getMetricsService();
    const summary = await metricsService.getMetricsSummary();
    const performance = await metricsService.getPerformanceMetrics();

    return {
      uptime: process.uptime(),
      totalRequests: summary.totalRequests,
      errorRate: summary.errorRate,
      averageResponseTime: performance.averageResponseTime
    };
  }

  /**
   * Determine overall health status
   */
  private determineOverallStatus(
    wordPress: HealthCheckResult['checks']['wordPress'],
    memory: HealthCheckResult['checks']['memory'],
    disk: HealthCheckResult['checks']['disk']
  ): HealthCheckResult['status'] {
    if (wordPress.status === 'error' || memory.status === 'error' || disk.status === 'error') {
      return 'unhealthy';
    }
    
    if (wordPress.status === 'error' || memory.status === 'warning' || disk.status === 'warning') {
      return 'degraded';
    }
    
    return 'healthy';
  }

  /**
   * Send metrics to external monitoring services
   */
  private async sendMetricsToExternalServices(healthCheck: HealthCheckResult): Promise<void> {
    try {
      if (this.config.datadog) {
        await this.sendMetricsToDatadog(healthCheck);
      }

      if (this.config.newRelic) {
        await this.sendMetricsToNewRelic(healthCheck);
      }
    } catch (error) {
      logger.error('Failed to send metrics to external services', { error });
    }
  }

  /**
   * Send metrics to Datadog
   */
  private async sendMetricsToDatadog(healthCheck: HealthCheckResult): Promise<void> {
    // In a real implementation, you would use the Datadog API client
    // For now, we'll just log the metrics
    logger.debug('Sending metrics to Datadog', {
      status: healthCheck.status,
      errorRate: healthCheck.metrics.errorRate,
      responseTime: healthCheck.metrics.averageResponseTime
    });
  }

  /**
   * Send metrics to New Relic
   */
  private async sendMetricsToNewRelic(healthCheck: HealthCheckResult): Promise<void> {
    // In a real implementation, you would use the New Relic API client
    logger.debug('Sending metrics to New Relic', {
      status: healthCheck.status,
      errorRate: healthCheck.metrics.errorRate,
      responseTime: healthCheck.metrics.averageResponseTime
    });
  }

  /**
   * Check for alert conditions
   */
  private async checkAlertConditions(healthCheck: HealthCheckResult): Promise<void> {
    const alerts: Alert[] = [];

    // Check error rate threshold
    if (healthCheck.metrics.errorRate > this.config.thresholds.errorRate) {
      alerts.push({
        id: `error-rate-${Date.now()}`,
        severity: 'error',
        title: 'High Error Rate Detected',
        message: `Error rate (${healthCheck.metrics.errorRate.toFixed(2)}%) exceeds threshold (${this.config.thresholds.errorRate}%)`,
        timestamp: new Date(),
        metadata: {
          errorRate: healthCheck.metrics.errorRate,
          threshold: this.config.thresholds.errorRate
        },
        acknowledged: false
      });
    }

    // Check response time threshold
    if (healthCheck.metrics.averageResponseTime > this.config.thresholds.responseTime) {
      alerts.push({
        id: `response-time-${Date.now()}`,
        severity: 'warning',
        title: 'High Response Time Detected',
        message: `Average response time (${healthCheck.metrics.averageResponseTime.toFixed(2)}ms) exceeds threshold (${this.config.thresholds.responseTime}ms)`,
        timestamp: new Date(),
        metadata: {
          responseTime: healthCheck.metrics.averageResponseTime,
          threshold: this.config.thresholds.responseTime
        },
        acknowledged: false
      });
    }

    // Check WordPress health
    if (healthCheck.checks.wordPress.status === 'error') {
      alerts.push({
        id: `wordpress-error-${Date.now()}`,
        severity: 'critical',
        title: 'WordPress API Unavailable',
        message: `WordPress API is not responding: ${healthCheck.checks.wordPress.error}`,
        timestamp: new Date(),
        metadata: {
          responseTime: healthCheck.checks.wordPress.responseTime,
          error: healthCheck.checks.wordPress.error
        },
        acknowledged: false
      });
    }

    // Add new alerts and send notifications
    for (const alert of alerts) {
      this.alerts.push(alert);
      await this.sendAlert(alert);
    }
  }

  /**
   * Send alert notification
   */
  private async sendAlert(alert: Alert): Promise<void> {
    if (!this.config.alerting.enabled) {
      return;
    }

    try {
      // Send webhook notification
      if (this.config.alerting.webhookUrl) {
        await this.sendWebhookAlert(alert);
      }

      // Send Slack notification
      if (this.config.alerting.slackWebhook) {
        await this.sendSlackAlert(alert);
      }

      // Send email notification
      if (this.config.alerting.emailRecipients && this.config.alerting.emailRecipients.length > 0) {
        await this.sendEmailAlert(alert);
      }

      logger.info('Alert sent', {
        alertId: alert.id,
        severity: alert.severity,
        title: alert.title
      });
    } catch (error) {
      logger.error('Failed to send alert', { alertId: alert.id, error });
    }
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(alert: Alert): Promise<void> {
    await fetch(this.config.alerting.webhookUrl!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert)
    });
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(alert: Alert): Promise<void> {
    const slackMessage = {
      text: `🚨 *${alert.title}*\n${alert.message}`,
      attachments: [{
        color: this.getSeverityColor(alert.severity),
        fields: [
          { title: 'Severity', value: alert.severity, short: true },
          { title: 'Time', value: alert.timestamp.toISOString(), short: true }
        ]
      }]
    };

    await fetch(this.config.alerting.slackWebhook!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage)
    });
  }

  /**
   * Send email alert (placeholder)
   */
  private async sendEmailAlert(alert: Alert): Promise<void> {
    // In a real implementation, you would use an email service
    logger.info('Email alert would be sent', {
      recipients: this.config.alerting.emailRecipients,
      alertId: alert.id
    });
  }

  /**
   * Get severity color for Slack
   */
  private getSeverityColor(severity: Alert['severity']): string {
    switch (severity) {
      case 'info': return '#36a64f';
      case 'warning': return '#ffa500';
      case 'error': return '#ff0000';
      case 'critical': return '#8b0000';
      default: return '#808080';
    }
  }

  /**
   * Get current health status
   */
  public getHealthStatus(): HealthCheckResult | undefined {
    return this.lastHealthCheck;
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  public acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Clean up monitoring resources
   */
  public async shutdown(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    logger.info('Application monitoring shutdown completed');
  }
}

// Default monitoring configuration
const defaultConfig: MonitoringConfig = {
  alerting: {
    enabled: false
  },
  healthCheck: {
    wordPressUrl: process.env.WORDPRESS_URL || '',
    wordPressApiKey: process.env.WORDPRESS_API_KEY || '',
    checkInterval: 60, // 1 minute
    timeout: 10000 // 10 seconds
  },
  thresholds: {
    responseTime: 5000, // 5 seconds
    errorRate: 5, // 5%
    memoryUsage: 80 // 80%
  }
};

// Singleton instance
let monitoringInstance: ApplicationMonitor | null = null;

/**
 * Get or create monitoring instance
 */
export function getMonitoringInstance(config?: Partial<MonitoringConfig>): ApplicationMonitor {
  if (!monitoringInstance) {
    const fullConfig = { ...defaultConfig, ...config };
    monitoringInstance = new ApplicationMonitor(fullConfig);
  }
  return monitoringInstance;
}

/**
 * Initialize monitoring with configuration
 */
export function initializeMonitoring(config: Partial<MonitoringConfig> = {}): ApplicationMonitor {
  return getMonitoringInstance(config);
}

export default ApplicationMonitor; 
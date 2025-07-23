import { getEnvVars, secureLog } from './env';

/**
 * Security event types for monitoring
 */
export enum SecurityEventType {
  AUTHENTICATION_FAILED = 'authentication_failed',
  AUTHENTICATION_SUCCESS = 'authentication_success',
  RATE_LIMIT_VIOLATION = 'rate_limit_violation',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  MALICIOUS_CONTENT_DETECTED = 'malicious_content_detected',
  API_KEY_EXPOSED = 'api_key_exposed',
  UNUSUAL_REQUEST_PATTERN = 'unusual_request_pattern',
  SECURITY_HEADER_MISSING = 'security_header_missing',
  CORS_VIOLATION = 'cors_violation',
  REQUEST_SIZE_EXCEEDED = 'request_size_exceeded',
  INVALID_CONTENT_TYPE = 'invalid_content_type',
  SUSPICIOUS_IP = 'suspicious_ip',
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
  DDoS_ATTEMPT = 'ddos_attempt',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  XSS_ATTEMPT = 'xss_attempt',
  PATH_TRAVERSAL_ATTEMPT = 'path_traversal_attempt',
  COMMAND_INJECTION_ATTEMPT = 'command_injection_attempt',
}

/**
 * Security event severity levels
 */
export enum SecurityEventSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Security event interface
 */
export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  timestamp: number;
  source: {
    ip: string;
    userAgent?: string;
    apiKey?: string;
    requestId?: string;
  };
  details: {
    endpoint?: string;
    method?: string;
    payload?: any;
    reason?: string;
    threshold?: number;
    count?: number;
    pattern?: string;
  };
  context: {
    environment: string;
    version: string;
    region?: string;
  };
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  enabled: boolean;
  severityThreshold: SecurityEventSeverity;
  rateLimitWindowMs: number;
  maxAlertsPerWindow: number;
  notificationChannels: NotificationChannel[];
}

/**
 * Notification channel types
 */
export interface NotificationChannel {
  type: 'webhook' | 'email' | 'slack' | 'discord' | 'pagerduty';
  config: Record<string, any>;
  enabled: boolean;
}

/**
 * Security metrics for monitoring
 */
export interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<SecurityEventType, number>;
  eventsBySeverity: Record<SecurityEventSeverity, number>;
  eventsByHour: Record<string, number>;
  topSourceIPs: Array<{ ip: string; count: number }>;
  topUserAgents: Array<{ userAgent: string; count: number }>;
  authenticationSuccessRate: number;
  rateLimitViolationRate: number;
  suspiciousActivityRate: number;
}

/**
 * Security monitoring store
 */
class SecurityMonitoringStore {
  private events: SecurityEvent[] = [];
  private alerts: SecurityEvent[] = [];
  private ipBlacklist: Set<string> = new Set();
  private suspiciousPatterns: Map<string, number> = new Map();
  private alertConfig: AlertConfig;

  constructor() {
    const envVars = getEnvVars();
    this.alertConfig = {
      enabled: envVars.SECURITY_ALERTS_ENABLED || false,
      severityThreshold: SecurityEventSeverity.MEDIUM,
      rateLimitWindowMs: 5 * 60 * 1000, // 5 minutes
      maxAlertsPerWindow: 10,
      notificationChannels: []
    };
  }

  /**
   * Record a security event
   */
  recordEvent(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'context'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: Date.now(),
      context: {
        environment: getEnvVars().NODE_ENV,
        version: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
        region: process.env.VERCEL_REGION || 'unknown'
      }
    };

    this.events.push(fullEvent);

    // Check if event should trigger an alert
    if (this.shouldTriggerAlert(fullEvent)) {
      this.triggerAlert(fullEvent);
    }

    // Update suspicious patterns
    this.updateSuspiciousPatterns(fullEvent);

    // Check for IP blacklisting
    this.checkIPBlacklisting(fullEvent);

    // Clean up old events
    this.cleanup();

    // Log the event
    secureLog('info', `Security event recorded: ${event.type}`, {
      eventId: fullEvent.id,
      severity: event.severity,
      sourceIP: event.source.ip,
      details: event.details
    });
  }

  /**
   * Check if an event should trigger an alert
   */
  private shouldTriggerAlert(event: SecurityEvent): boolean {
    if (!this.alertConfig.enabled) return false;

    // Check severity threshold
    const severityOrder = [
      SecurityEventSeverity.LOW,
      SecurityEventSeverity.MEDIUM,
      SecurityEventSeverity.HIGH,
      SecurityEventSeverity.CRITICAL
    ];
    
    const eventSeverityIndex = severityOrder.indexOf(event.severity);
    const thresholdIndex = severityOrder.indexOf(this.alertConfig.severityThreshold);
    
    if (eventSeverityIndex < thresholdIndex) return false;

    // Check rate limiting for alerts
    const recentAlerts = this.alerts.filter(
      alert => Date.now() - alert.timestamp < this.alertConfig.rateLimitWindowMs
    );

    if (recentAlerts.length >= this.alertConfig.maxAlertsPerWindow) return false;

    return true;
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(event: SecurityEvent): Promise<void> {
    this.alerts.push(event);

    // Send notifications
    for (const channel of this.alertConfig.notificationChannels) {
      if (channel.enabled) {
        try {
          await this.sendNotification(channel, event);
        } catch (error) {
          secureLog('error', 'Failed to send security alert notification', {
            channel: channel.type,
            error: error instanceof Error ? error.message : 'Unknown error',
            eventId: event.id
          });
        }
      }
    }

    secureLog('warn', `Security alert triggered: ${event.type}`, {
      eventId: event.id,
      severity: event.severity,
      sourceIP: event.source.ip,
      details: event.details
    });
  }

  /**
   * Send notification via configured channel
   */
  private async sendNotification(channel: NotificationChannel, event: SecurityEvent): Promise<void> {
    const payload = {
      event: {
        id: event.id,
        type: event.type,
        severity: event.severity,
        timestamp: new Date(event.timestamp).toISOString(),
        source: event.source,
        details: event.details,
        context: event.context
      },
      alert: {
        triggeredAt: new Date().toISOString(),
        environment: event.context.environment,
        version: event.context.version
      }
    };

    switch (channel.type) {
      case 'webhook':
        await this.sendWebhookNotification(channel.config, payload);
        break;
      case 'email':
        await this.sendEmailNotification(channel.config, payload);
        break;
      case 'slack':
        await this.sendSlackNotification(channel.config, payload);
        break;
      case 'discord':
        await this.sendDiscordNotification(channel.config, payload);
        break;
      case 'pagerduty':
        await this.sendPagerDutyNotification(channel.config, payload);
        break;
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(config: Record<string, any>, payload: any): Promise<void> {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.headers || {})
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook notification failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Send email notification (placeholder)
   */
  private async sendEmailNotification(config: Record<string, any>, payload: any): Promise<void> {
    // Implementation would depend on email service (SendGrid, AWS SES, etc.)
    secureLog('info', 'Email notification would be sent', { config, payload });
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(config: Record<string, any>, payload: any): Promise<void> {
    const slackPayload = {
      text: `🚨 Security Alert: ${payload.event.type}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `Security Alert: ${payload.event.type}`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Severity:* ${payload.event.severity}`
            },
            {
              type: 'mrkdwn',
              text: `*Source IP:* ${payload.event.source.ip}`
            },
            {
              type: 'mrkdwn',
              text: `*Environment:* ${payload.event.context.environment}`
            },
            {
              type: 'mrkdwn',
              text: `*Timestamp:* ${new Date(payload.event.timestamp).toLocaleString()}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Details:* ${JSON.stringify(payload.event.details, null, 2)}`
          }
        }
      ]
    };

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload)
    });

    if (!response.ok) {
      throw new Error(`Slack notification failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Send Discord notification
   */
  private async sendDiscordNotification(config: Record<string, any>, payload: any): Promise<void> {
    const discordPayload = {
      embeds: [{
        title: `🚨 Security Alert: ${payload.event.type}`,
        color: this.getSeverityColor(payload.event.severity),
        fields: [
          {
            name: 'Severity',
            value: payload.event.severity,
            inline: true
          },
          {
            name: 'Source IP',
            value: payload.event.source.ip,
            inline: true
          },
          {
            name: 'Environment',
            value: payload.event.context.environment,
            inline: true
          },
          {
            name: 'Details',
            value: JSON.stringify(payload.event.details, null, 2),
            inline: false
          }
        ],
        timestamp: new Date(payload.event.timestamp).toISOString()
      }]
    };

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordPayload)
    });

    if (!response.ok) {
      throw new Error(`Discord notification failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Send PagerDuty notification
   */
  private async sendPagerDutyNotification(config: Record<string, any>, payload: any): Promise<void> {
    const pagerDutyPayload = {
      routing_key: config.routingKey,
      event_action: 'trigger',
      payload: {
        summary: `Security Alert: ${payload.event.type}`,
        severity: payload.event.severity,
        source: payload.event.source.ip,
        custom_details: payload.event.details
      }
    };

    const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pagerDutyPayload)
    });

    if (!response.ok) {
      throw new Error(`PagerDuty notification failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Get severity color for Discord embeds
   */
  private getSeverityColor(severity: SecurityEventSeverity): number {
    switch (severity) {
      case SecurityEventSeverity.LOW: return 0x00ff00; // Green
      case SecurityEventSeverity.MEDIUM: return 0xffff00; // Yellow
      case SecurityEventSeverity.HIGH: return 0xff8800; // Orange
      case SecurityEventSeverity.CRITICAL: return 0xff0000; // Red
      default: return 0x808080; // Gray
    }
  }

  /**
   * Update suspicious patterns tracking
   */
  private updateSuspiciousPatterns(event: SecurityEvent): void {
    const patternKey = `${event.type}:${event.source.ip}`;
    const currentCount = this.suspiciousPatterns.get(patternKey) || 0;
    this.suspiciousPatterns.set(patternKey, currentCount + 1);

    // Check for suspicious patterns
    if (currentCount + 1 >= 5) { // 5 events of same type from same IP
      this.recordEvent({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecurityEventSeverity.MEDIUM,
        source: event.source,
        details: {
          pattern: patternKey,
          count: currentCount + 1,
          reason: 'Multiple security events from same source'
        }
      });
    }
  }

  /**
   * Check for IP blacklisting
   */
  private checkIPBlacklisting(event: SecurityEvent): void {
    const ip = event.source.ip;
    
    // Check for critical events that should blacklist IP
    if (event.severity === SecurityEventSeverity.CRITICAL) {
      this.ipBlacklist.add(ip);
      secureLog('warn', `IP blacklisted due to critical security event`, {
        ip,
        eventType: event.type,
        eventId: event.id
      });
    }

    // Check for repeated high-severity events
    const recentHighSeverityEvents = this.events.filter(
      e => e.source.ip === ip && 
           e.severity === SecurityEventSeverity.HIGH && 
           Date.now() - e.timestamp < 60 * 60 * 1000 // Last hour
    );

    if (recentHighSeverityEvents.length >= 3) {
      this.ipBlacklist.add(ip);
      secureLog('warn', `IP blacklisted due to multiple high-severity events`, {
        ip,
        eventCount: recentHighSeverityEvents.length,
        timeWindow: '1 hour'
      });
    }
  }

  /**
   * Check if IP is blacklisted
   */
  isIPBlacklisted(ip: string): boolean {
    return this.ipBlacklist.has(ip);
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics(): SecurityMetrics {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const recentEvents = this.events.filter(e => e.timestamp > oneHourAgo);

    // Count events by type
    const eventsByType: Record<SecurityEventType, number> = {} as any;
    Object.values(SecurityEventType).forEach(type => {
      eventsByType[type] = 0;
    });
    recentEvents.forEach(event => {
      eventsByType[event.type]++;
    });

    // Count events by severity
    const eventsBySeverity: Record<SecurityEventSeverity, number> = {} as any;
    Object.values(SecurityEventSeverity).forEach(severity => {
      eventsBySeverity[severity] = 0;
    });
    recentEvents.forEach(event => {
      eventsBySeverity[event.severity]++;
    });

    // Count events by hour
    const eventsByHour: Record<string, number> = {};
    recentEvents.forEach(event => {
      const hour = new Date(event.timestamp).toISOString().slice(0, 13) + ':00:00Z';
      eventsByHour[hour] = (eventsByHour[hour] || 0) + 1;
    });

    // Top source IPs
    const ipCounts: Record<string, number> = {};
    recentEvents.forEach(event => {
      ipCounts[event.source.ip] = (ipCounts[event.source.ip] || 0) + 1;
    });
    const topSourceIPs = Object.entries(ipCounts)
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top user agents
    const userAgentCounts: Record<string, number> = {};
    recentEvents.forEach(event => {
      if (event.source.userAgent) {
        userAgentCounts[event.source.userAgent] = (userAgentCounts[event.source.userAgent] || 0) + 1;
      }
    });
    const topUserAgents = Object.entries(userAgentCounts)
      .map(([userAgent, count]) => ({ userAgent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate rates
    const authEvents = recentEvents.filter(e => 
      e.type === SecurityEventType.AUTHENTICATION_SUCCESS || 
      e.type === SecurityEventType.AUTHENTICATION_FAILED
    );
    const authSuccessEvents = authEvents.filter(e => e.type === SecurityEventType.AUTHENTICATION_SUCCESS);
    const authenticationSuccessRate = authEvents.length > 0 ? authSuccessEvents.length / authEvents.length : 1;

    const rateLimitViolationRate = eventsByType[SecurityEventType.RATE_LIMIT_VIOLATION] / Math.max(recentEvents.length, 1);
    const suspiciousActivityRate = eventsByType[SecurityEventType.SUSPICIOUS_ACTIVITY] / Math.max(recentEvents.length, 1);

    return {
      totalEvents: recentEvents.length,
      eventsByType,
      eventsBySeverity,
      eventsByHour,
      topSourceIPs,
      topUserAgents,
      authenticationSuccessRate,
      rateLimitViolationRate,
      suspiciousActivityRate
    };
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up old events
   */
  private cleanup(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
    this.events = this.events.filter(e => e.timestamp > cutoff);
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);
  }
}

// Global security monitoring store
const securityMonitoringStore = new SecurityMonitoringStore();

/**
 * Security monitoring utilities
 */
export const SecurityMonitoring = {
  /**
   * Record a security event
   */
  recordEvent: (event: Omit<SecurityEvent, 'id' | 'timestamp' | 'context'>) => {
    securityMonitoringStore.recordEvent(event);
  },

  /**
   * Check if IP is blacklisted
   */
  isIPBlacklisted: (ip: string): boolean => {
    return securityMonitoringStore.isIPBlacklisted(ip);
  },

  /**
   * Get security metrics
   */
  getMetrics: (): SecurityMetrics => {
    return securityMonitoringStore.getSecurityMetrics();
  },

  /**
   * Record authentication failure
   */
  recordAuthFailure: (ip: string, userAgent?: string, apiKey?: string, reason?: string) => {
    securityMonitoringStore.recordEvent({
      type: SecurityEventType.AUTHENTICATION_FAILED,
      severity: SecurityEventSeverity.MEDIUM,
      source: { ip, userAgent, apiKey },
      details: { reason }
    });
  },

  /**
   * Record authentication success
   */
  recordAuthSuccess: (ip: string, userAgent?: string, apiKey?: string) => {
    securityMonitoringStore.recordEvent({
      type: SecurityEventType.AUTHENTICATION_SUCCESS,
      severity: SecurityEventSeverity.LOW,
      source: { ip, userAgent, apiKey }
    });
  },

  /**
   * Record rate limit violation
   */
  recordRateLimitViolation: (ip: string, userAgent?: string, apiKey?: string, details?: any) => {
    securityMonitoringStore.recordEvent({
      type: SecurityEventType.RATE_LIMIT_VIOLATION,
      severity: SecurityEventSeverity.MEDIUM,
      source: { ip, userAgent, apiKey },
      details
    });
  },

  /**
   * Record malicious content detection
   */
  recordMaliciousContent: (ip: string, userAgent?: string, apiKey?: string, pattern?: string, payload?: any) => {
    securityMonitoringStore.recordEvent({
      type: SecurityEventType.MALICIOUS_CONTENT_DETECTED,
      severity: SecurityEventSeverity.HIGH,
      source: { ip, userAgent, apiKey },
      details: { pattern, payload }
    });
  },

  /**
   * Record suspicious activity
   */
  recordSuspiciousActivity: (ip: string, userAgent?: string, apiKey?: string, reason?: string, details?: any) => {
    securityMonitoringStore.recordEvent({
      type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity: SecurityEventSeverity.MEDIUM,
      source: { ip, userAgent, apiKey },
      details: { reason, ...details }
    });
  },

  /**
   * Record brute force attempt
   */
  recordBruteForceAttempt: (ip: string, userAgent?: string, apiKey?: string, attemptCount?: number) => {
    securityMonitoringStore.recordEvent({
      type: SecurityEventType.BRUTE_FORCE_ATTEMPT,
      severity: SecurityEventSeverity.HIGH,
      source: { ip, userAgent, apiKey },
      details: { attemptCount }
    });
  },

  /**
   * Record DDoS attempt
   */
  recordDDoSAttempt: (ip: string, userAgent?: string, requestCount?: number, timeWindow?: number) => {
    securityMonitoringStore.recordEvent({
      type: SecurityEventType.DDoS_ATTEMPT,
      severity: SecurityEventSeverity.CRITICAL,
      source: { ip, userAgent },
      details: { requestCount, timeWindow }
    });
  }
};

export default SecurityMonitoring; 
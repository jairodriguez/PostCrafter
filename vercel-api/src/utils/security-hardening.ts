import { getEnvVars, secureLog } from './env';
import SecurityMonitoring from './monitoring';
import { SecurityEventType, SecurityEventSeverity } from './monitoring';

/**
 * Security hardening configuration
 */
export interface SecurityHardeningConfig {
  enableRequestValidation: boolean;
  enableContentSanitization: boolean;
  enableRateLimitHardening: boolean;
  enableIPReputation: boolean;
  enableRequestSizeLimits: boolean;
  enableHeaderValidation: boolean;
  enablePayloadValidation: boolean;
  enableTimingAttackProtection: boolean;
  enableSecurityHeaders: boolean;
  enableCSP: boolean;
  enableHSTS: boolean;
  enableXSSProtection: boolean;
  enableContentTypeSniffing: boolean;
  enableFrameOptions: boolean;
  enableReferrerPolicy: boolean;
  enablePermissionsPolicy: boolean;
  maxRequestSize: number;
  maxPayloadDepth: number;
  maxArrayLength: number;
  maxStringLength: number;
  requestTimeoutMs: number;
  suspiciousPatternThreshold: number;
  bruteForceThreshold: number;
  ddosThreshold: number;
}

/**
 * Security hardening utilities for production deployment
 */
export class SecurityHardening {
  private config: SecurityHardeningConfig;
  private ipReputation: Map<string, { score: number; lastSeen: number; violations: number }> = new Map();
  private requestTiming: Map<string, number[]> = new Map();

  constructor() {
    const envVars = getEnvVars();
    this.config = {
      enableRequestValidation: true,
      enableContentSanitization: true,
      enableRateLimitHardening: true,
      enableIPReputation: true,
      enableRequestSizeLimits: true,
      enableHeaderValidation: true,
      enablePayloadValidation: true,
      enableTimingAttackProtection: true,
      enableSecurityHeaders: true,
      enableCSP: true,
      enableHSTS: true,
      enableXSSProtection: true,
      enableContentTypeSniffing: true,
      enableFrameOptions: true,
      enableReferrerPolicy: true,
      enablePermissionsPolicy: true,
      maxRequestSize: envVars.MAX_REQUEST_SIZE_MB || 10 * 1024 * 1024, // 10MB
      maxPayloadDepth: 10,
      maxArrayLength: 1000,
      maxStringLength: 100000,
      requestTimeoutMs: 30000,
      suspiciousPatternThreshold: 5,
      bruteForceThreshold: 10,
      ddosThreshold: 100
    };
  }

  /**
   * Apply comprehensive security headers
   */
  applySecurityHeaders(res: any): void {
    if (!this.config.enableSecurityHeaders) return;

    // Content Security Policy
    if (this.config.enableCSP) {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self';"
      );
    }

    // HTTP Strict Transport Security
    if (this.config.enableHSTS) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    }

    // X-Content-Type-Options
    if (this.config.enableContentTypeSniffing) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    // X-Frame-Options
    if (this.config.enableFrameOptions) {
      res.setHeader('X-Frame-Options', 'DENY');
    }

    // X-XSS-Protection
    if (this.config.enableXSSProtection) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    // Referrer Policy
    if (this.config.enableReferrerPolicy) {
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    // Permissions Policy
    if (this.config.enablePermissionsPolicy) {
      res.setHeader(
        'Permissions-Policy',
        'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), cross-origin-isolated=(), display-capture=(), document-domain=(), encrypted-media=(), execution-while-not-rendered=(), execution-while-out-of-viewport=(), fullscreen=(), gamepad=(), gyroscope=(), keyboard-map=(), magnetometer=(), microphone=(), midi=(), navigation-override=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(), usb=(), web-share=(), xr-spatial-tracking=()'
      );
    }

    // Cache Control for API responses
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Remove server information
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
  }

  /**
   * Validate request headers for security
   */
  validateSecurityHeaders(headers: any): { valid: boolean; errors: string[] } {
    if (!this.config.enableHeaderValidation) {
      return { valid: true, errors: [] };
    }

    const errors: string[] = [];

    // Check for required headers
    if (!headers['user-agent']) {
      errors.push('User-Agent header is required');
    }

    // Check for suspicious headers
    const suspiciousHeaders = [
      'x-forwarded-host',
      'x-forwarded-proto',
      'x-forwarded-for',
      'x-real-ip',
      'x-original-url',
      'x-rewrite-url'
    ];

    for (const header of suspiciousHeaders) {
      if (headers[header] && !this.isValidProxyHeader(headers[header])) {
        errors.push(`Suspicious ${header} header value`);
      }
    }

    // Check content type for POST requests
    if (headers['content-type'] && !headers['content-type'].includes('application/json')) {
      errors.push('Content-Type must be application/json');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate proxy headers
   */
  private isValidProxyHeader(value: string): boolean {
    if (Array.isArray(value)) {
      return value.every(v => this.isValidIP(v));
    }
    return this.isValidIP(value);
  }

  /**
   * Validate IP address format
   */
  private isValidIP(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === 'unknown';
  }

  /**
   * Validate request payload structure and size
   */
  validatePayload(payload: any, sourceIP: string): { valid: boolean; errors: string[]; sanitized?: any } {
    if (!this.config.enablePayloadValidation) {
      return { valid: true, errors: [] };
    }

    const errors: string[] = [];
    let sanitized = payload;

    try {
      // Check payload size
      const payloadSize = JSON.stringify(payload).length;
      if (payloadSize > this.config.maxRequestSize) {
        errors.push(`Payload size exceeds limit (${payloadSize} > ${this.config.maxRequestSize})`);
      }

      // Validate payload structure
      const validation = this.validatePayloadStructure(payload, 0);
      if (!validation.valid) {
        errors.push(...validation.errors);
      } else {
        sanitized = validation.sanitized;
      }

      // Check for suspicious patterns
      const suspiciousPatterns = this.detectSuspiciousPatterns(payload);
      if (suspiciousPatterns.length > 0) {
        errors.push(`Suspicious patterns detected: ${suspiciousPatterns.join(', ')}`);
        SecurityMonitoring.recordSuspiciousActivity(
          sourceIP,
          undefined,
          undefined,
          'Suspicious payload patterns',
          { patterns: suspiciousPatterns, payloadSize }
        );
      }

    } catch (error) {
      errors.push(`Payload validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: errors.length === 0 ? sanitized : undefined
    };
  }

  /**
   * Validate payload structure recursively
   */
  private validatePayloadStructure(data: any, depth: number): { valid: boolean; errors: string[]; sanitized?: any } {
    const errors: string[] = [];

    if (depth > this.config.maxPayloadDepth) {
      errors.push(`Payload depth exceeds limit (${depth} > ${this.config.maxPayloadDepth})`);
      return { valid: false, errors };
    }

    if (Array.isArray(data)) {
      if (data.length > this.config.maxArrayLength) {
        errors.push(`Array length exceeds limit (${data.length} > ${this.config.maxArrayLength})`);
      }

      const sanitizedArray = data.slice(0, this.config.maxArrayLength).map((item, index) => {
        const validation = this.validatePayloadStructure(item, depth + 1);
        if (!validation.valid) {
          errors.push(`Array item ${index}: ${validation.errors.join(', ')}`);
        }
        return validation.sanitized;
      });

      return {
        valid: errors.length === 0,
        errors,
        sanitized: errors.length === 0 ? sanitizedArray : undefined
      };
    }

    if (typeof data === 'object' && data !== null) {
      const sanitizedObject: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        // Validate key
        if (typeof key !== 'string' || key.length > 100) {
          errors.push(`Invalid object key: ${key}`);
          continue;
        }

        // Validate value
        const validation = this.validatePayloadStructure(value, depth + 1);
        if (!validation.valid) {
          errors.push(`Object property ${key}: ${validation.errors.join(', ')}`);
        } else {
          sanitizedObject[key] = validation.sanitized;
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        sanitized: errors.length === 0 ? sanitizedObject : undefined
      };
    }

    if (typeof data === 'string') {
      if (data.length > this.config.maxStringLength) {
        errors.push(`String length exceeds limit (${data.length} > ${this.config.maxStringLength})`);
        return { valid: false, errors };
      }
      return { valid: true, errors: [], sanitized: data };
    }

    return { valid: true, errors: [], sanitized: data };
  }

  /**
   * Detect suspicious patterns in payload
   */
  private detectSuspiciousPatterns(data: any): string[] {
    const patterns: string[] = [];
    const dataString = JSON.stringify(data).toLowerCase();

    // Check for common attack patterns
    const attackPatterns = [
      { pattern: /<script/i, name: 'XSS script tag' },
      { pattern: /javascript:/i, name: 'XSS javascript protocol' },
      { pattern: /on\w+\s*=/i, name: 'XSS event handler' },
      { pattern: /union\s+select/i, name: 'SQL injection' },
      { pattern: /\.\.\/|\.\.\\/i, name: 'Path traversal' },
      { pattern: /cmd\.exe|powershell/i, name: 'Command injection' },
      { pattern: /eval\s*\(/i, name: 'Code injection' },
      { pattern: /document\.cookie/i, name: 'Cookie theft attempt' },
      { pattern: /innerhtml|outerhtml/i, name: 'DOM manipulation' }
    ];

    for (const { pattern, name } of attackPatterns) {
      if (pattern.test(dataString)) {
        patterns.push(name);
      }
    }

    return patterns;
  }

  /**
   * Update IP reputation score
   */
  updateIPReputation(ip: string, violation: boolean, severity: SecurityEventSeverity = SecurityEventSeverity.MEDIUM): void {
    if (!this.config.enableIPReputation) return;

    const now = Date.now();
    const reputation = this.ipReputation.get(ip) || { score: 100, lastSeen: now, violations: 0 };

    if (violation) {
      reputation.violations++;
      reputation.score = Math.max(0, reputation.score - this.getViolationPenalty(severity));
      
      // Record violation for monitoring
      SecurityMonitoring.recordEvent({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity,
        source: { ip },
        details: {
          reason: 'IP reputation violation',
          violations: reputation.violations,
          score: reputation.score
        }
      });
    } else {
      // Gradual score recovery
      reputation.score = Math.min(100, reputation.score + 1);
    }

    reputation.lastSeen = now;
    this.ipReputation.set(ip, reputation);

    // Clean up old entries
    this.cleanupIPReputation();
  }

  /**
   * Get violation penalty based on severity
   */
  private getViolationPenalty(severity: SecurityEventSeverity): number {
    switch (severity) {
      case SecurityEventSeverity.LOW: return 5;
      case SecurityEventSeverity.MEDIUM: return 15;
      case SecurityEventSeverity.HIGH: return 30;
      case SecurityEventSeverity.CRITICAL: return 50;
      default: return 10;
    }
  }

  /**
   * Check if IP has good reputation
   */
  isIPReputable(ip: string): boolean {
    if (!this.config.enableIPReputation) return true;

    const reputation = this.ipReputation.get(ip);
    if (!reputation) return true;

    return reputation.score >= 50;
  }

  /**
   * Clean up old IP reputation entries
   */
  private cleanupIPReputation(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
    for (const [ip, reputation] of this.ipReputation.entries()) {
      if (reputation.lastSeen < cutoff) {
        this.ipReputation.delete(ip);
      }
    }
  }

  /**
   * Detect timing attacks
   */
  detectTimingAttack(ip: string, requestTime: number): boolean {
    if (!this.config.enableTimingAttackProtection) return false;

    const timings = this.requestTiming.get(ip) || [];
    timings.push(requestTime);

    // Keep only recent timings
    const cutoff = Date.now() - 60 * 1000; // 1 minute
    const recentTimings = timings.filter(time => time > cutoff);
    this.requestTiming.set(ip, recentTimings);

    // Check for suspicious timing patterns
    if (recentTimings.length >= 10) {
      const avgTime = recentTimings.reduce((sum, time) => sum + time, 0) / recentTimings.length;
      const variance = recentTimings.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / recentTimings.length;
      
      // If variance is very low, it might be a timing attack
      if (variance < 1) {
        SecurityMonitoring.recordSuspiciousActivity(
          ip,
          undefined,
          undefined,
          'Potential timing attack detected',
          { avgTime, variance, requestCount: recentTimings.length }
        );
        return true;
      }
    }

    return false;
  }

  /**
   * Detect brute force attacks
   */
  detectBruteForce(ip: string, eventType: SecurityEventType): boolean {
    const key = `${ip}:${eventType}`;
    const now = Date.now();
    const windowMs = 5 * 60 * 1000; // 5 minutes

    // This would integrate with the monitoring system to track events
    // For now, we'll use a simplified approach
    const recentEvents = 0; // Would get from monitoring system

    if (recentEvents >= this.config.bruteForceThreshold) {
      SecurityMonitoring.recordBruteForceAttempt(ip, undefined, undefined, recentEvents);
      return true;
    }

    return false;
  }

  /**
   * Detect DDoS attempts
   */
  detectDDoS(ip: string, requestCount: number, timeWindow: number): boolean {
    const rate = requestCount / (timeWindow / 1000); // requests per second

    if (rate > this.config.ddosThreshold) {
      SecurityMonitoring.recordDDoSAttempt(ip, undefined, requestCount, timeWindow);
      return true;
    }

    return false;
  }

  /**
   * Get security hardening configuration
   */
  getConfig(): SecurityHardeningConfig {
    return { ...this.config };
  }

  /**
   * Update security hardening configuration
   */
  updateConfig(newConfig: Partial<SecurityHardeningConfig>): void {
    this.config = { ...this.config, ...newConfig };
    secureLog('info', 'Security hardening configuration updated', { newConfig });
  }

  /**
   * Get security audit information
   */
  getSecurityAudit(): Record<string, any> {
    return {
      config: this.config,
      ipReputation: {
        totalIPs: this.ipReputation.size,
        averageScore: this.getAverageIPScore(),
        lowReputationIPs: this.getLowReputationIPs()
      },
      requestTiming: {
        totalTrackedIPs: this.requestTiming.size,
        potentialTimingAttacks: this.getPotentialTimingAttacks()
      },
      recommendations: this.getSecurityRecommendations()
    };
  }

  /**
   * Get average IP reputation score
   */
  private getAverageIPScore(): number {
    if (this.ipReputation.size === 0) return 100;
    const totalScore = Array.from(this.ipReputation.values()).reduce((sum, rep) => sum + rep.score, 0);
    return totalScore / this.ipReputation.size;
  }

  /**
   * Get IPs with low reputation
   */
  private getLowReputationIPs(): string[] {
    return Array.from(this.ipReputation.entries())
      .filter(([_, rep]) => rep.score < 50)
      .map(([ip, _]) => ip);
  }

  /**
   * Get potential timing attacks
   */
  private getPotentialTimingAttacks(): number {
    let count = 0;
    for (const [ip, timings] of this.requestTiming.entries()) {
      if (timings.length >= 10) {
        const avgTime = timings.reduce((sum, time) => sum + time, 0) / timings.length;
        const variance = timings.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / timings.length;
        if (variance < 1) count++;
      }
    }
    return count;
  }

  /**
   * Get security recommendations
   */
  private getSecurityRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.getAverageIPScore() < 70) {
      recommendations.push('Consider implementing stricter rate limiting for low-reputation IPs');
    }

    if (this.getPotentialTimingAttacks() > 0) {
      recommendations.push('Implement additional timing attack protection measures');
    }

    if (this.getLowReputationIPs().length > 10) {
      recommendations.push('Consider implementing IP blacklisting for repeated violations');
    }

    return recommendations;
  }
}

// Global security hardening instance
export const securityHardening = new SecurityHardening();

export default securityHardening; 
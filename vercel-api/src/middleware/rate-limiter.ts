import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getEnvVars, secureLog } from '../utils/env';
import SecurityMonitoring from '../utils/monitoring';

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  burstLimit: number;
  retryAfterMs: number;
  enableAdaptive: boolean;
  adaptiveMultiplier: number;
  adaptiveThreshold: number;
}

/**
 * Rate limit tier configuration
 */
export interface RateLimitTier {
  name: string;
  maxRequests: number;
  burstLimit: number;
  windowMs: number;
  priority: number;
}

/**
 * Token bucket for rate limiting
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number;
  private readonly refillTime: number;

  constructor(capacity: number, refillRate: number, refillTime: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.refillTime = refillTime;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Try to consume a token
   */
  tryConsume(): boolean {
    this.refill();
    
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    
    return false;
  }

  /**
   * Get remaining tokens
   */
  getRemainingTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /**
   * Get time until next token is available
   */
  getTimeUntilNextToken(): number {
    this.refill();
    
    if (this.tokens >= 1) {
      return 0;
    }
    
    const tokensNeeded = 1 - this.tokens;
    return Math.ceil(tokensNeeded / this.refillRate) * this.refillTime;
  }

  /**
   * Refill tokens based on time passed
   */
  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = (timePassed / this.refillTime) * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

/**
 * Rate limit store for tracking limits
 */
class RateLimitStore {
  private buckets: Map<string, TokenBucket> = new Map();
  private requestHistory: Map<string, number[]> = new Map();
  private adaptiveMultipliers: Map<string, number> = new Map();

  /**
   * Get or create a token bucket for a key
   */
  getBucket(key: string, config: RateLimitConfig): TokenBucket {
    if (!this.buckets.has(key)) {
      const refillRate = config.maxRequests / (config.windowMs / 1000);
      const bucket = new TokenBucket(
        config.burstLimit,
        refillRate,
        1000 // 1 second intervals
      );
      this.buckets.set(key, bucket);
    }
    
    return this.buckets.get(key)!;
  }

  /**
   * Track request history for adaptive rate limiting
   */
  trackRequest(key: string, timestamp: number): void {
    if (!this.requestHistory.has(key)) {
      this.requestHistory.set(key, []);
    }
    
    const history = this.requestHistory.get(key)!;
    history.push(timestamp);
    
    // Keep only recent history (last 10 minutes)
    const cutoff = timestamp - 10 * 60 * 1000;
    const filteredHistory = history.filter(time => time > cutoff);
    this.requestHistory.set(key, filteredHistory);
  }

  /**
   * Calculate adaptive multiplier based on request patterns
   */
  calculateAdaptiveMultiplier(key: string, config: RateLimitConfig): number {
    if (!config.enableAdaptive) {
      return 1.0;
    }

    const history = this.requestHistory.get(key) || [];
    const now = Date.now();
    const recentRequests = history.filter(time => now - time < config.windowMs);
    
    // If requests are well-distributed, increase limit
    if (recentRequests.length > 0 && recentRequests.length < config.adaptiveThreshold) {
      const intervals = [];
      for (let i = 1; i < recentRequests.length; i++) {
        intervals.push(recentRequests[i] - recentRequests[i - 1]);
      }
      
      const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      const expectedInterval = config.windowMs / config.maxRequests;
      
      if (avgInterval >= expectedInterval) {
        return Math.min(2.0, 1.0 + config.adaptiveMultiplier);
      }
    }
    
    // If requests are bursty, decrease limit
    if (recentRequests.length >= config.maxRequests) {
      return Math.max(0.5, 1.0 - config.adaptiveMultiplier);
    }
    
    return 1.0;
  }

  /**
   * Clean up old entries
   */
  cleanup(): void {
    const now = Date.now();
    const cutoff = now - 60 * 60 * 1000; // 1 hour
    
    // Clean up old buckets
    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.getRemainingTokens() === bucket['capacity'] && 
          now - bucket['lastRefill'] > cutoff) {
        this.buckets.delete(key);
      }
    }
    
    // Clean up old history
    for (const [key, history] of this.requestHistory.entries()) {
      const filteredHistory = history.filter(time => time > cutoff);
      if (filteredHistory.length === 0) {
        this.requestHistory.delete(key);
      } else {
        this.requestHistory.set(key, filteredHistory);
      }
    }
  }
}

// Global rate limit store
const rateLimitStore = new RateLimitStore();

/**
 * Rate limit tiers configuration
 */
const RATE_LIMIT_TIERS: Record<string, RateLimitTier> = {
  free: {
    name: 'Free',
    maxRequests: 10,
    burstLimit: 5,
    windowMs: 60 * 1000, // 1 minute
    priority: 1
  },
  basic: {
    name: 'Basic',
    maxRequests: 100,
    burstLimit: 20,
    windowMs: 60 * 1000, // 1 minute
    priority: 2
  },
  premium: {
    name: 'Premium',
    maxRequests: 1000,
    burstLimit: 100,
    windowMs: 60 * 1000, // 1 minute
    priority: 3
  },
  enterprise: {
    name: 'Enterprise',
    maxRequests: 10000,
    burstLimit: 1000,
    windowMs: 60 * 1000, // 1 minute
    priority: 4
  }
};

/**
 * Get rate limit tier based on API key
 */
function getRateLimitTier(apiKey: string): RateLimitTier {
  // In a real implementation, you'd look up the API key in a database
  // For now, we'll use a simple hash-based approach
  const hash = apiKey.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const tierIndex = Math.abs(hash) % Object.keys(RATE_LIMIT_TIERS).length;
  const tierNames = Object.keys(RATE_LIMIT_TIERS);
  const tierName = tierNames[tierIndex];
  
  return RATE_LIMIT_TIERS[tierName];
}

/**
 * Create rate limit key
 */
function createRateLimitKey(identifier: string, tier: string): string {
  return `rate_limit:${tier}:${identifier}`;
}

/**
 * Enhanced rate limiting middleware with token bucket algorithm
 */
export function enhancedRateLimit(
  req: VercelRequest,
  res: VercelResponse,
  next: () => void
): void {
  try {
    const envVars = getEnvVars();
    
    // Get client identifier (IP or API key)
    const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
    const clientIP = req.headers['x-forwarded-for'] || 
                    req.headers['x-real-ip'] || 
                    req.connection.remoteAddress || 
                    'unknown';
    
    const ip = Array.isArray(clientIP) ? clientIP[0] : clientIP;
    const identifier = apiKey ? `api:${apiKey}` : `ip:${ip}`;
    
    // Get rate limit tier
    const tier = apiKey ? getRateLimitTier(apiKey as string) : RATE_LIMIT_TIERS.free;
    
    // Create rate limit configuration
    const config: RateLimitConfig = {
      windowMs: tier.windowMs,
      maxRequests: tier.maxRequests,
      burstLimit: tier.burstLimit,
      retryAfterMs: 60 * 1000, // 1 minute
      enableAdaptive: envVars.ENABLE_ADAPTIVE_RATE_LIMITING || false,
      adaptiveMultiplier: 0.2,
      adaptiveThreshold: Math.floor(tier.maxRequests * 0.8)
    };
    
    // Calculate adaptive multiplier
    const adaptiveMultiplier = rateLimitStore.calculateAdaptiveMultiplier(identifier, config);
    const adjustedMaxRequests = Math.floor(config.maxRequests * adaptiveMultiplier);
    const adjustedBurstLimit = Math.floor(config.burstLimit * adaptiveMultiplier);
    
    // Create adjusted config
    const adjustedConfig: RateLimitConfig = {
      ...config,
      maxRequests: adjustedMaxRequests,
      burstLimit: adjustedBurstLimit
    };
    
    // Get or create token bucket
    const rateLimitKey = createRateLimitKey(identifier, tier.name);
    const bucket = rateLimitStore.getBucket(rateLimitKey, adjustedConfig);
    
    // Track request for adaptive rate limiting
    rateLimitStore.trackRequest(identifier, Date.now());
    
    // Try to consume a token
    if (bucket.tryConsume()) {
      // Request allowed
      const remaining = bucket.getRemainingTokens();
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', adjustedConfig.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + adjustedConfig.windowMs).toISOString());
      res.setHeader('X-RateLimit-Tier', tier.name);
      
      if (adaptiveMultiplier !== 1.0) {
        res.setHeader('X-RateLimit-Adaptive', adaptiveMultiplier.toFixed(2));
      }
      
      // Log successful request
      secureLog('info', `Rate limit passed for ${identifier}`, {
        tier: tier.name,
        remaining,
        adaptiveMultiplier,
        endpoint: `${req.method} ${req.url}`
      });
      
      next();
    } else {
      // Request blocked
      const retryAfter = bucket.getTimeUntilNextToken();
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', adjustedConfig.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + retryAfter).toISOString());
      res.setHeader('X-RateLimit-Tier', tier.name);
      res.setHeader('Retry-After', Math.ceil(retryAfter / 1000).toString());
      
      if (adaptiveMultiplier !== 1.0) {
        res.setHeader('X-RateLimit-Adaptive', adaptiveMultiplier.toFixed(2));
      }
      
      // Log rate limit violation
      secureLog('warn', `Rate limit exceeded for ${identifier}`, {
        tier: tier.name,
        retryAfter,
        adaptiveMultiplier,
        endpoint: `${req.method} ${req.url}`,
        clientIP: ip
      });

      // Record rate limit violation for monitoring
      SecurityMonitoring.recordRateLimitViolation(ip, req.headers['user-agent'], apiKey as string, {
        tier: tier.name,
        retryAfter,
        adaptiveMultiplier,
        endpoint: `${req.method} ${req.url}`,
        limit: adjustedConfig.maxRequests,
        windowMs: adjustedConfig.windowMs
      });
      
      // Return rate limit error
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded. Please try again in ${Math.ceil(retryAfter / 1000)} seconds.`,
          details: {
            tier: tier.name,
            limit: adjustedConfig.maxRequests,
            windowMs: adjustedConfig.windowMs,
            retryAfter,
            adaptiveMultiplier
          }
        },
        requestId: req.headers['x-request-id'] || 'unknown'
      });
    }
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      rateLimitStore.cleanup();
    }
    
  } catch (error) {
    console.error('Enhanced rate limiting error:', error);
    // Continue without rate limiting if there's an error
    next();
  }
}

/**
 * Rate limit by API key with tier-based limits
 */
export function rateLimitByApiKey(
  req: VercelRequest,
  res: VercelResponse,
  next: () => void
): void {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
  
  if (!apiKey) {
    // No API key, use IP-based rate limiting
    enhancedRateLimit(req, res, next);
    return;
  }
  
  // API key present, use tier-based rate limiting
  enhancedRateLimit(req, res, next);
}

/**
 * Get rate limit information for monitoring
 */
export function getRateLimitInfo(identifier: string): {
  tier: RateLimitTier;
  remaining: number;
  resetTime: number;
  adaptiveMultiplier: number;
} | null {
  try {
    const tier = RATE_LIMIT_TIERS.free; // Default tier
    const rateLimitKey = createRateLimitKey(identifier, tier.name);
    const bucket = rateLimitStore.getBucket(rateLimitKey, {
      windowMs: tier.windowMs,
      maxRequests: tier.maxRequests,
      burstLimit: tier.burstLimit,
      retryAfterMs: 60 * 1000,
      enableAdaptive: false,
      adaptiveMultiplier: 0.2,
      adaptiveThreshold: Math.floor(tier.maxRequests * 0.8)
    });
    
    return {
      tier,
      remaining: bucket.getRemainingTokens(),
      resetTime: Date.now() + bucket.getTimeUntilNextToken(),
      adaptiveMultiplier: 1.0
    };
  } catch (error) {
    console.error('Error getting rate limit info:', error);
    return null;
  }
}

/**
 * Export rate limit tiers for external use
 */
export { RATE_LIMIT_TIERS }; 
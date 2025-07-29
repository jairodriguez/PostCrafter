/**
 * PostCrafter Circuit Breaker Pattern
 * Implements circuit breaker pattern for WordPress API calls to prevent cascading failures
 */

import { logger } from './logger';

// Circuit breaker states
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service is back
}

// Circuit breaker configuration
export interface CircuitBreakerConfig {
  failureThreshold: number;    // Number of failures before opening
  recoveryTimeout: number;     // Time to wait before trying again (ms)
  expectedResponseTime: number; // Expected response time (ms)
  monitoringWindow: number;    // Time window for failure counting (ms)
  minimumRequestCount: number; // Minimum requests before considering failure rate
}

// Circuit breaker statistics
export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  totalRequests: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  failureRate: number;
  responseTime: number;
  nextAttemptTime: number;
}

// Default configuration
const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeout: 30000, // 30 seconds
  expectedResponseTime: 5000, // 5 seconds
  monitoringWindow: 60000, // 1 minute
  minimumRequestCount: 10
};

/**
 * Circuit Breaker Implementation
 */
export class CircuitBreaker {
  private state: CircuitBreakerState;
  private config: CircuitBreakerConfig;
  private stats: CircuitBreakerStats;
  private failures: Array<{ timestamp: number; responseTime: number }>;
  private successes: Array<{ timestamp: number; responseTime: number }>;
  private lastStateChange: number;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = CircuitBreakerState.CLOSED;
    this.failures = [];
    this.successes = [];
    this.lastStateChange = Date.now();

    this.stats = {
      state: this.state,
      failureCount: 0,
      successCount: 0,
      totalRequests: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      failureRate: 0,
      responseTime: 0,
      nextAttemptTime: 0
    };

    logger.info('Circuit breaker initialized', { config: this.config });
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName: string = 'operation'
  ): Promise<T> {
    const startTime = Date.now();
    
    // Check if circuit breaker is open
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        throw new Error(`Circuit breaker is OPEN for ${operationName}. Service is temporarily unavailable.`);
      }
    }

    try {
      // Execute the operation
      const result = await operation();
      const responseTime = Date.now() - startTime;
      
      this.onSuccess(responseTime);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.onFailure(responseTime);
      throw error;
    }
  }

  /**
   * Check if circuit breaker should attempt reset
   */
  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastStateChange >= this.config.recoveryTimeout;
  }

  /**
   * Handle successful operation
   */
  private onSuccess(responseTime: number): void {
    const now = Date.now();
    this.successes.push({ timestamp: now, responseTime });
    
    // Clean old successes
    this.cleanOldEntries(this.successes);
    
    // Update statistics
    this.stats.successCount++;
    this.stats.totalRequests++;
    this.stats.lastSuccessTime = now;
    this.stats.responseTime = this.calculateAverageResponseTime();
    
    // Transition state if needed
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.transitionToClosed();
    }
    
    this.updateFailureRate();
    logger.debug('Circuit breaker success', { 
      state: this.state, 
      responseTime,
      failureRate: this.stats.failureRate 
    });
  }

  /**
   * Handle failed operation
   */
  private onFailure(responseTime: number): void {
    const now = Date.now();
    this.failures.push({ timestamp: now, responseTime });
    
    // Clean old failures
    this.cleanOldEntries(this.failures);
    
    // Update statistics
    this.stats.failureCount++;
    this.stats.totalRequests++;
    this.stats.lastFailureTime = now;
    this.stats.responseTime = this.calculateAverageResponseTime();
    
    this.updateFailureRate();
    
    // Check if circuit breaker should open
    if (this.shouldOpen()) {
      this.transitionToOpen();
    }
    
    logger.warn('Circuit breaker failure', { 
      state: this.state, 
      responseTime,
      failureRate: this.stats.failureRate,
      failureCount: this.stats.failureCount 
    });
  }

  /**
   * Check if circuit breaker should open
   */
  private shouldOpen(): boolean {
    if (this.stats.totalRequests < this.config.minimumRequestCount) {
      return false;
    }
    
    return this.stats.failureRate >= (this.config.failureThreshold / this.config.minimumRequestCount);
  }

  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    this.state = CircuitBreakerState.OPEN;
    this.stats.state = this.state;
    this.lastStateChange = Date.now();
    this.stats.nextAttemptTime = this.lastStateChange + this.config.recoveryTimeout;
    
    logger.warn('Circuit breaker opened', { 
      failureRate: this.stats.failureRate,
      failureCount: this.stats.failureCount,
      nextAttemptTime: new Date(this.stats.nextAttemptTime).toISOString()
    });
  }

  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    this.state = CircuitBreakerState.HALF_OPEN;
    this.stats.state = this.state;
    this.lastStateChange = Date.now();
    
    logger.info('Circuit breaker half-open - testing service recovery');
  }

  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.stats.state = this.state;
    this.lastStateChange = Date.now();
    
    // Reset failure count
    this.stats.failureCount = 0;
    this.failures = [];
    
    logger.info('Circuit breaker closed - service recovered');
  }

  /**
   * Clean old entries from arrays
   */
  private cleanOldEntries(entries: Array<{ timestamp: number; responseTime: number }>): void {
    const cutoff = Date.now() - this.config.monitoringWindow;
    const filtered = entries.filter(entry => entry.timestamp >= cutoff);
    
    if (entries.length !== filtered.length) {
      entries.splice(0, entries.length, ...filtered);
    }
  }

  /**
   * Update failure rate
   */
  private updateFailureRate(): void {
    const total = this.failures.length + this.successes.length;
    this.stats.failureRate = total > 0 ? this.failures.length / total : 0;
  }

  /**
   * Calculate average response time
   */
  private calculateAverageResponseTime(): number {
    const allResponses = [...this.failures, ...this.successes];
    if (allResponses.length === 0) return 0;
    
    const totalTime = allResponses.reduce((sum, entry) => sum + entry.responseTime, 0);
    return totalTime / allResponses.length;
  }

  /**
   * Get current statistics
   */
  getStats(): CircuitBreakerStats {
    return { ...this.stats };
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Check if circuit breaker is open
   */
  isOpen(): boolean {
    return this.state === CircuitBreakerState.OPEN;
  }

  /**
   * Check if circuit breaker is closed
   */
  isClosed(): boolean {
    return this.state === CircuitBreakerState.CLOSED;
  }

  /**
   * Check if circuit breaker is half-open
   */
  isHalfOpen(): boolean {
    return this.state === CircuitBreakerState.HALF_OPEN;
  }

  /**
   * Force circuit breaker to close (for testing)
   */
  forceClose(): void {
    this.transitionToClosed();
  }

  /**
   * Force circuit breaker to open (for testing)
   */
  forceOpen(): void {
    this.transitionToOpen();
  }

  /**
   * Reset circuit breaker statistics
   */
  reset(): void {
    this.failures = [];
    this.successes = [];
    this.stats = {
      state: this.state,
      failureCount: 0,
      successCount: 0,
      totalRequests: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      failureRate: 0,
      responseTime: 0,
      nextAttemptTime: 0
    };
    
    logger.info('Circuit breaker statistics reset');
  }
}

/**
 * WordPress-specific circuit breaker
 */
export class WordPressCircuitBreaker extends CircuitBreaker {
  constructor() {
    super({
      failureThreshold: 3,      // Lower threshold for WordPress API
      recoveryTimeout: 60000,   // 1 minute recovery time
      expectedResponseTime: 3000, // 3 seconds expected response
      monitoringWindow: 300000, // 5 minute monitoring window
      minimumRequestCount: 5    // Lower minimum for faster detection
    });
  }

  /**
   * Execute WordPress API call with circuit breaker protection
   */
  async executeWordPressCall<T>(
    operation: () => Promise<T>,
    endpoint: string
  ): Promise<T> {
    return this.execute(operation, `WordPress API: ${endpoint}`);
  }
}

// Global circuit breaker instance for WordPress API
export const wordPressCircuitBreaker = new WordPressCircuitBreaker();

export default wordPressCircuitBreaker;
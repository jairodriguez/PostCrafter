/**
 * PostCrafter Batch Processing Utility
 * Handles multiple WordPress operations efficiently with batching and concurrency control
 */

import { logger } from './logger';
import { wordPressCircuitBreaker } from './circuit-breaker';

// Batch processing configuration
export interface BatchConfig {
  maxConcurrency: number;
  batchSize: number;
  delayBetweenBatches: number;
  timeout: number;
  retryAttempts: number;
}

// Batch operation interface
export interface BatchOperation<T = any> {
  id: string;
  operation: () => Promise<T>;
  priority?: number;
  metadata?: Record<string, any>;
}

// Batch result interface
export interface BatchResult<T = any> {
  id: string;
  success: boolean;
  data?: T;
  error?: Error;
  duration: number;
  retries: number;
}

// Batch processing statistics
export interface BatchStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageDuration: number;
  totalDuration: number;
  concurrencyLevel: number;
  batchesProcessed: number;
}

// Default configuration
const DEFAULT_CONFIG: BatchConfig = {
  maxConcurrency: 5,
  batchSize: 10,
  delayBetweenBatches: 1000, // 1 second
  timeout: 30000, // 30 seconds
  retryAttempts: 3
};

/**
 * Batch Processor Implementation
 */
export class BatchProcessor<T = any> {
  private config: BatchConfig;
  private stats: BatchStats;
  private activeOperations: Set<string> = new Set();
  private operationQueue: Array<BatchOperation<T>> = [];

  constructor(config: Partial<BatchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageDuration: 0,
      totalDuration: 0,
      concurrencyLevel: 0,
      batchesProcessed: 0
    };

    logger.info('Batch processor initialized', { config: this.config });
  }

  /**
   * Add operation to batch queue
   */
  addOperation(operation: BatchOperation<T>): void {
    this.operationQueue.push(operation);
    logger.debug('Operation added to batch queue', { 
      id: operation.id, 
      queueSize: this.operationQueue.length 
    });
  }

  /**
   * Add multiple operations to batch queue
   */
  addOperations(operations: BatchOperation<T>[]): void {
    this.operationQueue.push(...operations);
    logger.debug('Operations added to batch queue', { 
      count: operations.length, 
      queueSize: this.operationQueue.length 
    });
  }

  /**
   * Process all operations in batches
   */
  async processAll(): Promise<BatchResult<T>[]> {
    const results: BatchResult<T>[] = [];
    const batches = this.createBatches();

    logger.info('Starting batch processing', { 
      totalOperations: this.operationQueue.length,
      batchCount: batches.length,
      concurrency: this.config.maxConcurrency
    });

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.debug(`Processing batch ${i + 1}/${batches.length}`, { 
        batchSize: batch.length 
      });

      // Process batch with concurrency control
      const batchResults = await this.processBatch(batch);
      results.push(...batchResults);

      // Update statistics
      this.stats.batchesProcessed++;
      this.updateStats(batchResults);

      // Delay between batches (except for the last batch)
      if (i < batches.length - 1 && this.config.delayBetweenBatches > 0) {
        await this.delay(this.config.delayBetweenBatches);
      }
    }

    logger.info('Batch processing completed', { 
      totalResults: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });

    return results;
  }

  /**
   * Process a single batch with concurrency control
   */
  private async processBatch(batch: BatchOperation<T>[]): Promise<BatchResult<T>[]> {
    const results: BatchResult<T>[] = [];
    const promises: Promise<BatchResult<T>>[] = [];

    // Create promises for each operation in the batch
    for (const operation of batch) {
      const promise = this.executeOperation(operation);
      promises.push(promise);
    }

    // Execute operations with concurrency limit
    const batchResults = await this.executeWithConcurrencyLimit(promises);
    results.push(...batchResults);

    return results;
  }

  /**
   * Execute operations with concurrency limit
   */
  private async executeWithConcurrencyLimit(
    promises: Promise<BatchResult<T>>[]
  ): Promise<BatchResult<T>[]> {
    const results: BatchResult<T>[] = [];
    const executing: Promise<BatchResult<T>>[] = [];

    for (const promise of promises) {
      // If we've reached the concurrency limit, wait for one to complete
      if (executing.length >= this.config.maxConcurrency) {
        const completed = await Promise.race(executing);
        results.push(completed);
        executing.splice(executing.indexOf(completed), 1);
      }

      executing.push(promise);
    }

    // Wait for remaining operations to complete
    const remainingResults = await Promise.all(executing);
    results.push(...remainingResults);

    return results;
  }

  /**
   * Execute a single operation with retry logic
   */
  private async executeOperation(operation: BatchOperation<T>): Promise<BatchResult<T>> {
    const startTime = Date.now();
    let retries = 0;
    let lastError: Error;

    while (retries <= this.config.retryAttempts) {
      try {
        // Add to active operations
        this.activeOperations.add(operation.id);
        this.stats.concurrencyLevel = this.activeOperations.size;

        // Execute operation with circuit breaker protection
        const result = await wordPressCircuitBreaker.executeWordPressCall(
          () => Promise.race([
            operation.operation(),
            this.createTimeout(this.config.timeout)
          ]),
          `Batch operation: ${operation.id}`
        );

        // Remove from active operations
        this.activeOperations.delete(operation.id);
        this.stats.concurrencyLevel = this.activeOperations.size;

        const duration = Date.now() - startTime;

        return {
          id: operation.id,
          success: true,
          data: result,
          duration,
          retries
        };

      } catch (error) {
        lastError = error as Error;
        retries++;

        // Remove from active operations
        this.activeOperations.delete(operation.id);
        this.stats.concurrencyLevel = this.activeOperations.size;

        logger.warn('Batch operation failed', {
          id: operation.id,
          retry: retries,
          error: error.message,
          metadata: operation.metadata
        });

        // Don't retry if it's the last attempt
        if (retries > this.config.retryAttempts) {
          break;
        }

        // Wait before retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, retries - 1), 10000);
        await this.delay(delay);
      }
    }

    const duration = Date.now() - startTime;

    return {
      id: operation.id,
      success: false,
      error: lastError!,
      duration,
      retries
    };
  }

  /**
   * Create batches from operation queue
   */
  private createBatches(): Array<BatchOperation<T>[]> {
    const batches: Array<BatchOperation<T>[]> = [];
    
    // Sort operations by priority (higher priority first)
    this.operationQueue.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (let i = 0; i < this.operationQueue.length; i += this.config.batchSize) {
      const batch = this.operationQueue.slice(i, i + this.config.batchSize);
      batches.push(batch);
    }

    return batches;
  }

  /**
   * Create a timeout promise
   */
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${ms}ms`));
      }, ms);
    });
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update processing statistics
   */
  private updateStats(results: BatchResult<T>[]): void {
    this.stats.totalOperations += results.length;
    this.stats.successfulOperations += results.filter(r => r.success).length;
    this.stats.failedOperations += results.filter(r => !r.success).length;

    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    this.stats.totalDuration += totalDuration;
    this.stats.averageDuration = this.stats.totalDuration / this.stats.totalOperations;
  }

  /**
   * Get current statistics
   */
  getStats(): BatchStats {
    return { ...this.stats };
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      queueSize: this.operationQueue.length,
      activeOperations: this.activeOperations.size,
      maxConcurrency: this.config.maxConcurrency
    };
  }

  /**
   * Clear operation queue
   */
  clearQueue(): void {
    this.operationQueue = [];
    logger.info('Batch processor queue cleared');
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageDuration: 0,
      totalDuration: 0,
      concurrencyLevel: 0,
      batchesProcessed: 0
    };
    logger.info('Batch processor statistics reset');
  }
}

/**
 * WordPress-specific batch processor
 */
export class WordPressBatchProcessor extends BatchProcessor {
  constructor() {
    super({
      maxConcurrency: 3,        // Lower concurrency for WordPress API
      batchSize: 5,             // Smaller batches
      delayBetweenBatches: 2000, // 2 seconds between batches
      timeout: 15000,           // 15 seconds timeout
      retryAttempts: 2          // Fewer retries
    });
  }

  /**
   * Create batch operations for WordPress posts
   */
  createPostOperations(
    posts: Array<{ id: string; data: any; operation: 'create' | 'update' | 'delete' }>
  ): Array<BatchOperation> {
    return posts.map(post => ({
      id: post.id,
      operation: () => this.executePostOperation(post),
      priority: post.operation === 'delete' ? 1 : 2, // Higher priority for deletes
      metadata: { operation: post.operation, postId: post.id }
    }));
  }

  /**
   * Execute WordPress post operation
   */
  private async executePostOperation(post: { id: string; data: any; operation: string }): Promise<any> {
    // This would be implemented based on the specific WordPress client
    // For now, we'll return a mock implementation
    logger.debug('Executing WordPress post operation', {
      id: post.id,
      operation: post.operation
    });

    // Simulate operation
    await this.delay(Math.random() * 1000 + 500);
    
    return {
      id: post.id,
      operation: post.operation,
      success: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global batch processor instance
export const wordPressBatchProcessor = new WordPressBatchProcessor();

export default wordPressBatchProcessor;
/**
 * PostCrafter Caching System
 * Implements comprehensive caching strategies for improved performance
 */

import { logger } from './logger';

// Cache configuration
export interface CacheConfig {
  maxSize: number;
  ttl: number; // Time to live in milliseconds
  checkPeriod: number; // How often to check for expired entries
  enableCompression: boolean;
  enableMetrics: boolean;
}

// Cache entry interface
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  compressed?: boolean;
}

// Cache statistics
export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  maxSize: number;
  hitRate: number;
  memoryUsage: number;
}

// Default cache configuration
const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 1000,
  ttl: 5 * 60 * 1000, // 5 minutes
  checkPeriod: 60 * 1000, // 1 minute
  enableCompression: true,
  enableMetrics: true
};

/**
 * LRU Cache Implementation with TTL and Compression
 */
export class LRUCache<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      maxSize: this.config.maxSize,
      hitRate: 0,
      memoryUsage: 0
    };

    this.startCleanup();
    logger.info('Cache initialized', { config: this.config });
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T, ttl?: number): boolean {
    try {
      // Check if cache is full
      if (this.cache.size >= this.config.maxSize) {
        this.evictLRU();
      }

      const entry: CacheEntry<T> = {
        key,
        value: this.config.enableCompression ? this.compress(value) : value,
        timestamp: Date.now(),
        ttl: ttl || this.config.ttl,
        accessCount: 0,
        lastAccessed: Date.now(),
        compressed: this.config.enableCompression
      };

      this.cache.set(key, entry);
      this.stats.sets++;
      this.stats.size = this.cache.size;
      this.updateStats();

      return true;
    } catch (error) {
      logger.error('Cache set error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | null {
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.stats.misses++;
        this.updateStats();
        return null;
      }

      // Check if entry has expired
      if (this.isExpired(entry)) {
        this.delete(key);
        this.stats.misses++;
        this.updateStats();
        return null;
      }

      // Update access statistics
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      this.cache.set(key, entry);

      this.stats.hits++;
      this.updateStats();

      return this.config.enableCompression ? this.decompress(entry.value) : entry.value;
    } catch (error) {
      logger.error('Cache get error', { key, error: error.message });
      this.stats.misses++;
      this.updateStats();
      return null;
    }
  }

  /**
   * Delete a value from the cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      this.stats.size = this.cache.size;
      this.updateStats();
    }
    return deleted;
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
    this.updateStats();
    logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Check if an entry has expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
      logger.debug('Evicted LRU entry', { key: oldestKey });
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.checkPeriod);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const beforeSize = this.cache.size;
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.delete(key));

    if (expiredKeys.length > 0) {
      logger.debug('Cleaned up expired entries', { 
        count: expiredKeys.length, 
        beforeSize, 
        afterSize: this.cache.size 
      });
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
    
    if (this.config.enableMetrics) {
      this.stats.memoryUsage = this.estimateMemoryUsage();
    }
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    for (const [key, entry] of this.cache.entries()) {
      totalSize += this.estimateEntrySize(key, entry);
    }
    return totalSize;
  }

  /**
   * Estimate size of a cache entry
   */
  private estimateEntrySize(key: string, entry: CacheEntry<T>): number {
    const keySize = Buffer.byteLength(key, 'utf8');
    const valueSize = Buffer.byteLength(JSON.stringify(entry.value), 'utf8');
    const metadataSize = 100; // Approximate size of metadata
    return keySize + valueSize + metadataSize;
  }

  /**
   * Simple compression (base64 encoding for demonstration)
   */
  private compress(value: T): T {
    if (typeof value === 'string') {
      return Buffer.from(value).toString('base64') as any;
    }
    return value;
  }

  /**
   * Simple decompression
   */
  private decompress(value: T): T {
    if (typeof value === 'string') {
      try {
        return Buffer.from(value, 'base64').toString('utf8') as any;
      } catch {
        return value;
      }
    }
    return value;
  }

  /**
   * Destroy the cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
    logger.info('Cache destroyed');
  }
}

/**
 * WordPress API Response Cache
 * Specialized cache for WordPress API responses
 */
export class WordPressCache {
  private cache: LRUCache<any>;
  private endpointCache: Map<string, number>; // Track cache keys by endpoint

  constructor() {
    this.cache = new LRUCache({
      maxSize: 500,
      ttl: 10 * 60 * 1000, // 10 minutes for WordPress responses
      enableCompression: true,
      enableMetrics: true
    });
    this.endpointCache = new Map();
  }

  /**
   * Generate cache key for WordPress API request
   */
  generateKey(endpoint: string, params: Record<string, any> = {}): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return `wp:${endpoint}:${sortedParams}`;
  }

  /**
   * Cache WordPress API response
   */
  setResponse(endpoint: string, params: Record<string, any>, response: any, ttl?: number): boolean {
    const key = this.generateKey(endpoint, params);
    this.endpointCache.set(key, Date.now());
    return this.cache.set(key, response, ttl);
  }

  /**
   * Get cached WordPress API response
   */
  getResponse(endpoint: string, params: Record<string, any> = {}): any | null {
    const key = this.generateKey(endpoint, params);
    return this.cache.get(key);
  }

  /**
   * Invalidate cache for specific endpoint
   */
  invalidateEndpoint(endpoint: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key] of this.endpointCache.entries()) {
      if (key.startsWith(`wp:${endpoint}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.endpointCache.delete(key);
    });

    logger.info('Invalidated endpoint cache', { endpoint, count: keysToDelete.length });
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * Clear all WordPress cache
   */
  clear(): void {
    this.cache.clear();
    this.endpointCache.clear();
  }
}

/**
 * Connection Pool for WordPress API
 * Manages HTTP connections for better performance
 */
export class ConnectionPool {
  private connections: Map<string, any> = new Map();
  private maxConnections: number;
  private connectionTimeout: number;

  constructor(maxConnections = 10, connectionTimeout = 30000) {
    this.maxConnections = maxConnections;
    this.connectionTimeout = connectionTimeout;
  }

  /**
   * Get or create connection for URL
   */
  getConnection(url: string): any {
    if (this.connections.has(url)) {
      return this.connections.get(url);
    }

    if (this.connections.size >= this.maxConnections) {
      this.evictOldestConnection();
    }

    const connection = this.createConnection(url);
    this.connections.set(url, connection);
    
    return connection;
  }

  /**
   * Create new connection
   */
  private createConnection(url: string): any {
    // In a real implementation, this would create an HTTP agent
    // For now, we'll return a simple object
    return {
      url,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      useCount: 0
    };
  }

  /**
   * Evict oldest connection
   */
  private evictOldestConnection(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, connection] of this.connections.entries()) {
      if (connection.lastUsed < oldestTime) {
        oldestTime = connection.lastUsed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.connections.delete(oldestKey);
      logger.debug('Evicted oldest connection', { url: oldestKey });
    }
  }

  /**
   * Clean up expired connections
   */
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, connection] of this.connections.entries()) {
      if (now - connection.lastUsed > this.connectionTimeout) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.connections.delete(key));

    if (expiredKeys.length > 0) {
      logger.debug('Cleaned up expired connections', { count: expiredKeys.length });
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      totalConnections: this.connections.size,
      maxConnections: this.maxConnections,
      utilization: this.connections.size / this.maxConnections
    };
  }
}

// Global cache instances
export const wordPressCache = new WordPressCache();
export const connectionPool = new ConnectionPool();

// Export cache utilities
export const cache = {
  wordPress: wordPressCache,
  connectionPool,
  
  // Utility functions
  generateKey: (prefix: string, ...parts: any[]) => {
    return `${prefix}:${parts.map(p => JSON.stringify(p)).join(':')}`;
  },
  
  // Cache middleware for API responses
  middleware: (ttl = 5 * 60 * 1000) => {
    return (req: any, res: any, next: any) => {
      const key = cache.generateKey('api', req.method, req.url, req.body);
      const cached = wordPressCache.cache.get(key);
      
      if (cached) {
        res.json(cached);
        return;
      }
      
      // Store original send method
      const originalSend = res.json;
      
      // Override send method to cache response
      res.json = function(data: any) {
        wordPressCache.cache.set(key, data, ttl);
        originalSend.call(this, data);
      };
      
      next();
    };
  }
};

export default cache;
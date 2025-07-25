/**
 * PostCrafter Dashboard Data Manager
 * Handles data fetching, caching, and real-time updates
 */

// Configuration for data fetching
const DATA_CONFIG = {
    baseUrl: '/api/v1',
    refreshInterval: 30000, // 30 seconds
    cacheTimeout: 60000, // 1 minute
    maxRetries: 3,
    retryDelay: 1000
};

/**
 * API endpoint definitions
 */
const API_ENDPOINTS = {
    overview: '/metrics/overview',
    apiUsage: '/metrics/api-usage',
    responseTime: '/metrics/response-time',
    errorRate: '/metrics/error-rate',
    topEndpoints: '/metrics/top-endpoints',
    errorDistribution: '/metrics/error-distribution',
    userActivity: '/metrics/user-activity',
    activityLog: '/activity/recent',
    systemHealth: '/system/health'
};

/**
 * Cache manager for storing and retrieving API responses
 */
class DataCache {
    constructor() {
        this.cache = new Map();
        this.timestamps = new Map();
    }

    set(key, data) {
        this.cache.set(key, data);
        this.timestamps.set(key, Date.now());
    }

    get(key) {
        const timestamp = this.timestamps.get(key);
        if (!timestamp || Date.now() - timestamp > DATA_CONFIG.cacheTimeout) {
            this.cache.delete(key);
            this.timestamps.delete(key);
            return null;
        }
        return this.cache.get(key);
    }

    clear() {
        this.cache.clear();
        this.timestamps.clear();
    }

    has(key) {
        return this.get(key) !== null;
    }
}

/**
 * HTTP client with retry logic and error handling
 */
class APIClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async fetch(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        let lastError;

        for (let attempt = 1; attempt <= DATA_CONFIG.maxRetries; attempt++) {
            try {
                const response = await fetch(url, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                return await response.json();
            } catch (error) {
                lastError = error;
                console.warn(`API request attempt ${attempt} failed:`, error.message);
                
                if (attempt < DATA_CONFIG.maxRetries) {
                    await this.delay(DATA_CONFIG.retryDelay * attempt);
                }
            }
        }

        throw new Error(`API request failed after ${DATA_CONFIG.maxRetries} attempts: ${lastError.message}`);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Sample data generator for development and demo purposes
 */
class SampleDataGenerator {
    constructor() {
        this.startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    }

    generateOverviewMetrics() {
        return {
            totalRequests: this.randomInt(50000, 100000),
            successRate: this.randomFloat(95, 99.5),
            averageResponseTime: this.randomInt(120, 250),
            activeUsers: this.randomInt(500, 1200),
            errorCount: this.randomInt(50, 200),
            uptime: this.randomFloat(99.5, 99.99),
            totalPublishes: this.randomInt(5000, 15000),
            storageUsed: this.randomInt(2048, 8192) // MB
        };
    }

    generateTimeSeriesData(days = 7, pointsPerDay = 24) {
        const data = [];
        const now = new Date();
        const startTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

        for (let i = 0; i < days * pointsPerDay; i++) {
            const timestamp = new Date(startTime.getTime() + (i * 60 * 60 * 1000));
            data.push({
                timestamp: timestamp.toISOString(),
                value: this.randomInt(50, 200) + Math.sin(i / 12) * 30 // Daily pattern
            });
        }

        return data;
    }

    generateApiUsageData() {
        return {
            current: this.randomInt(1000, 2000),
            previous: this.randomInt(800, 1500),
            trend: this.randomFloat(-10, 15),
            timeSeries: this.generateTimeSeriesData()
        };
    }

    generateResponseTimeData() {
        return {
            average: this.randomInt(120, 250),
            p95: this.randomInt(300, 500),
            p99: this.randomInt(800, 1200),
            timeSeries: this.generateTimeSeriesData().map(point => ({
                ...point,
                value: this.randomInt(80, 300)
            }))
        };
    }

    generateErrorRateData() {
        return {
            rate: this.randomFloat(0.5, 3.0),
            count: this.randomInt(20, 100),
            trend: this.randomFloat(-2, 1),
            timeSeries: this.generateTimeSeriesData().map(point => ({
                ...point,
                value: this.randomFloat(0, 5)
            }))
        };
    }

    generateTopEndpoints() {
        const endpoints = [
            '/api/v1/posts',
            '/api/v1/auth/login',
            '/api/v1/users/profile',
            '/api/v1/posts/search',
            '/api/v1/media/upload',
            '/api/v1/analytics',
            '/api/v1/comments',
            '/api/v1/notifications'
        ];

        return endpoints.slice(0, 5).map(endpoint => ({
            endpoint,
            requests: this.randomInt(500, 5000),
            averageResponseTime: this.randomInt(80, 300),
            errorRate: this.randomFloat(0, 5)
        }));
    }

    generateErrorDistribution() {
        const errorTypes = ['400 Bad Request', '401 Unauthorized', '403 Forbidden', '404 Not Found', '500 Internal Error'];
        return errorTypes.map(type => ({
            type,
            count: this.randomInt(5, 50),
            percentage: this.randomFloat(10, 30)
        }));
    }

    generateUserActivity() {
        const activities = ['Login', 'Post Created', 'Media Upload', 'Comment', 'Share', 'Profile Update'];
        return activities.map(activity => ({
            activity,
            count: this.randomInt(50, 500),
            change: this.randomFloat(-20, 40)
        }));
    }

    generateActivityLog() {
        const activities = [
            'User authentication successful',
            'New post published',
            'Media file uploaded',
            'API rate limit exceeded',
            'Database backup completed',
            'Cache cleared',
            'New user registered',
            'Payment processed',
            'Email notification sent',
            'System health check passed'
        ];

        const types = ['info', 'success', 'warning', 'error'];
        const log = [];

        for (let i = 0; i < 20; i++) {
            const timestamp = new Date(Date.now() - i * 5 * 60 * 1000); // Every 5 minutes
            log.push({
                id: `activity_${i}`,
                timestamp: timestamp.toISOString(),
                type: types[Math.floor(Math.random() * types.length)],
                message: activities[Math.floor(Math.random() * activities.length)],
                user: `user_${this.randomInt(1, 100)}`,
                ip: this.generateRandomIP()
            });
        }

        return log;
    }

    generateSystemHealth() {
        return {
            cpu: this.randomFloat(20, 80),
            memory: this.randomFloat(40, 85),
            disk: this.randomFloat(30, 70),
            network: this.randomFloat(10, 60),
            database: this.randomFloat(95, 99.9),
            cache: this.randomFloat(90, 99.5)
        };
    }

    generateRandomIP() {
        return `${this.randomInt(1, 255)}.${this.randomInt(0, 255)}.${this.randomInt(0, 255)}.${this.randomInt(1, 255)}`;
    }

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    randomFloat(min, max, decimals = 2) {
        return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
    }
}

/**
 * Main data manager class
 */
class DataManager {
    constructor() {
        this.cache = new DataCache();
        this.apiClient = new APIClient(DATA_CONFIG.baseUrl);
        this.sampleGenerator = new SampleDataGenerator();
        this.refreshInterval = null;
        this.subscribers = new Map();
        this.useSampleData = true; // Set to false when real API is available
    }

    /**
     * Initialize the data manager
     */
    async initialize() {
        console.log('Initializing DataManager...');
        
        // Check if API is available
        await this.checkAPIAvailability();
        
        // Start auto-refresh
        this.startAutoRefresh();
        
        // Dispatch initialization event
        window.dispatchEvent(new CustomEvent('dataManagerInitialized', {
            detail: { usingSampleData: this.useSampleData }
        }));
    }

    /**
     * Check if the real API is available
     */
    async checkAPIAvailability() {
        try {
            await this.apiClient.fetch('/health');
            this.useSampleData = false;
            console.log('Real API detected, using live data');
        } catch (error) {
            this.useSampleData = true;
            console.log('API not available, using sample data');
        }
    }

    /**
     * Get data with caching
     */
    async getData(key, forceRefresh = false) {
        if (!forceRefresh && this.cache.has(key)) {
            return this.cache.get(key);
        }

        let data;
        try {
            if (this.useSampleData) {
                data = await this.getSampleData(key);
            } else {
                data = await this.getAPIData(key);
            }
            
            this.cache.set(key, data);
            this.notifySubscribers(key, data);
            return data;
        } catch (error) {
            console.error(`Failed to get data for ${key}:`, error);
            
            // Fallback to sample data if API fails
            if (!this.useSampleData) {
                console.log('Falling back to sample data');
                data = await this.getSampleData(key);
                this.cache.set(key, data);
                return data;
            }
            
            throw error;
        }
    }

    /**
     * Get data from API
     */
    async getAPIData(key) {
        const endpoint = API_ENDPOINTS[key];
        if (!endpoint) {
            throw new Error(`Unknown data key: ${key}`);
        }
        
        return await this.apiClient.fetch(endpoint);
    }

    /**
     * Get sample data
     */
    async getSampleData(key) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        
        switch (key) {
            case 'overview':
                return this.sampleGenerator.generateOverviewMetrics();
            case 'apiUsage':
                return this.sampleGenerator.generateApiUsageData();
            case 'responseTime':
                return this.sampleGenerator.generateResponseTimeData();
            case 'errorRate':
                return this.sampleGenerator.generateErrorRateData();
            case 'topEndpoints':
                return this.sampleGenerator.generateTopEndpoints();
            case 'errorDistribution':
                return this.sampleGenerator.generateErrorDistribution();
            case 'userActivity':
                return this.sampleGenerator.generateUserActivity();
            case 'activityLog':
                return this.sampleGenerator.generateActivityLog();
            case 'systemHealth':
                return this.sampleGenerator.generateSystemHealth();
            default:
                throw new Error(`Unknown sample data key: ${key}`);
        }
    }

    /**
     * Subscribe to data updates
     */
    subscribe(key, callback) {
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, new Set());
        }
        this.subscribers.get(key).add(callback);
    }

    /**
     * Unsubscribe from data updates
     */
    unsubscribe(key, callback) {
        if (this.subscribers.has(key)) {
            this.subscribers.get(key).delete(callback);
        }
    }

    /**
     * Notify subscribers of data updates
     */
    notifySubscribers(key, data) {
        if (this.subscribers.has(key)) {
            this.subscribers.get(key).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Subscriber callback error:', error);
                }
            });
        }
    }

    /**
     * Refresh all cached data
     */
    async refreshAll() {
        console.log('Refreshing all data...');
        
        const keys = Object.keys(API_ENDPOINTS);
        const promises = keys.map(key => this.getData(key, true));
        
        try {
            await Promise.allSettled(promises);
            console.log('Data refresh completed');
            
            // Dispatch refresh event
            window.dispatchEvent(new CustomEvent('dataRefreshed', {
                detail: { timestamp: new Date().toISOString() }
            }));
        } catch (error) {
            console.error('Error during data refresh:', error);
        }
    }

    /**
     * Start auto-refresh
     */
    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.refreshInterval = setInterval(() => {
            this.refreshAll();
        }, DATA_CONFIG.refreshInterval);
        
        console.log(`Auto-refresh started (interval: ${DATA_CONFIG.refreshInterval}ms)`);
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            console.log('Auto-refresh stopped');
        }
    }

    /**
     * Get multiple data sets concurrently
     */
    async getMultipleData(keys, forceRefresh = false) {
        const promises = keys.map(key => this.getData(key, forceRefresh));
        const results = await Promise.allSettled(promises);
        
        const data = {};
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                data[keys[index]] = result.value;
            } else {
                console.error(`Failed to get data for ${keys[index]}:`, result.reason);
                data[keys[index]] = null;
            }
        });
        
        return data;
    }

    /**
     * Clear all cached data
     */
    clearCache() {
        this.cache.clear();
        console.log('Cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.cache.size,
            keys: Array.from(this.cache.cache.keys())
        };
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stopAutoRefresh();
        this.clearCache();
        this.subscribers.clear();
        console.log('DataManager destroyed');
    }
}

// Create and export global instance
const dataManager = new DataManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => dataManager.initialize());
} else {
    dataManager.initialize();
}

// Export for use in other modules
window.PostCrafterDataManager = dataManager;

export default dataManager;
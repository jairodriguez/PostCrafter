/**
 * PostCrafter Dashboard Main Controller
 * 
 * Integrates chart components with the dashboard layout,
 * handles data loading, and manages dashboard state.
 * 
 * @package PostCrafter
 * @version 1.0.0
 */

import { createPostCrafterDashboard, chartFactory } from '../components/charts/index.js';

class DashboardController {
  constructor() {
    this.charts = new Map();
    this.summaryCards = new Map();
    this.activityLogs = new Map();
    this.dataManager = null;
    this.isInitialized = false;
    this.refreshInterval = null;
    this.refreshRate = 30000; // 30 seconds
    
    this.initializeDashboard();
  }

  /**
   * Initialize the dashboard
   */
  async initializeDashboard() {
    try {
      console.log('🚀 Initializing PostCrafter Dashboard...');
      
      // Wait for DOM to be ready
      await this.waitForDOM();
      
      // Wait for data manager to be available
      await this.waitForDataManager();
      
      // Initialize chart components
      await this.initializeCharts();
      
      // Initialize summary cards
      await this.initializeSummaryCards();
      
      // Initialize activity logs
      await this.initializeActivityLogs();
      
      // Load initial data
      await this.loadInitialData();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Start auto-refresh (data manager handles its own refresh)
      // this.startAutoRefresh();
      
      this.isInitialized = true;
      console.log('✅ Dashboard initialization complete');
      
      // Emit initialization event
      this.emitEvent('dashboardInitialized');
      
    } catch (error) {
      console.error('❌ Dashboard initialization failed:', error);
      this.showError('Failed to initialize dashboard');
    }
  }

  /**
   * Wait for DOM to be ready
   */
  waitForDOM() {
    return new Promise((resolve) => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve);
      } else {
        resolve();
      }
    });
  }

  /**
   * Wait for data manager to be available
   */
  waitForDataManager() {
    return new Promise((resolve) => {
      if (window.PostCrafterDataManager) {
        this.dataManager = window.PostCrafterDataManager;
        resolve();
      } else {
        const checkDataManager = () => {
          if (window.PostCrafterDataManager) {
            this.dataManager = window.PostCrafterDataManager;
            document.removeEventListener('dataManagerInitialized', checkDataManager);
            resolve();
          }
        };
        document.addEventListener('dataManagerInitialized', checkDataManager);
      }
    });
  }

  /**
   * Initialize chart components
   */
  async initializeCharts() {
    console.log('📊 Initializing charts...');
    
    try {
      // API Usage Chart
      const apiUsageCanvas = document.getElementById('api-usage-chart');
      if (apiUsageCanvas) {
        const apiUsageChart = chartFactory.createLineChart(apiUsageCanvas, 'api-usage', {
          title: 'API Usage Over Time',
          yAxisLabel: 'Requests',
          showArea: true
        });
        this.charts.set('api-usage', apiUsageChart);
      }

      // Response Time Chart
      const responseTimeCanvas = document.getElementById('response-time-chart');
      if (responseTimeCanvas) {
        const responseTimeChart = chartFactory.createLineChart(responseTimeCanvas, 'response-time', {
          title: 'Response Time Trends',
          yAxisLabel: 'Response Time (ms)'
        });
        this.charts.set('response-time', responseTimeChart);
      }

      // Top Endpoints Chart
      const topEndpointsCanvas = document.getElementById('top-endpoints-chart');
      if (topEndpointsCanvas) {
        const topEndpointsChart = chartFactory.createBarChart(topEndpointsCanvas, 'top-endpoints', {
          title: 'Top API Endpoints',
          orientation: 'vertical'
        });
        this.charts.set('top-endpoints', topEndpointsChart);
      }

      // Error Distribution Chart
      const errorDistributionCanvas = document.getElementById('error-distribution-chart');
      if (errorDistributionCanvas) {
        const errorDistributionChart = chartFactory.createBarChart(errorDistributionCanvas, 'error-distribution', {
          title: 'Error Distribution',
          colorScheme: 'error'
        });
        this.charts.set('error-distribution', errorDistributionChart);
      }

      console.log(`📈 Initialized ${this.charts.size} charts`);
    } catch (error) {
      console.error('Error initializing charts:', error);
      throw error;
    }
  }

  /**
   * Initialize summary cards
   */
  async initializeSummaryCards() {
    console.log('📋 Initializing summary cards...');
    
    try {
      const summaryContainer = document.getElementById('summary-cards');
      if (!summaryContainer) return;

      // Create summary cards
      const cardTypes = [
        { type: 'api-calls', id: 'total-api-calls' },
        { type: 'success-rate', id: 'success-rate' },
        { type: 'error-rate', id: 'error-rate' },
        { type: 'response-time', id: 'avg-response-time' },
        { type: 'publishes', id: 'total-publishes' },
        { type: 'uptime', id: 'system-uptime' }
      ];

      cardTypes.forEach(({ type, id }) => {
        const cardContainer = document.createElement('div');
        cardContainer.id = `${id}-container`;
        summaryContainer.appendChild(cardContainer);

        const card = chartFactory.createSummaryCard(cardContainer, type, {
          value: 0,
          trend: {
            value: 0,
            direction: 'stable',
            period: 'vs last hour'
          }
        });

        this.summaryCards.set(id, card);
      });

      console.log(`📊 Initialized ${this.summaryCards.size} summary cards`);
    } catch (error) {
      console.error('Error initializing summary cards:', error);
      throw error;
    }
  }

  /**
   * Initialize activity logs
   */
  async initializeActivityLogs() {
    console.log('📝 Initializing activity logs...');
    
    try {
      // Recent Activity Log
      const recentActivityContainer = document.getElementById('recent-activity');
      if (recentActivityContainer) {
        const activityLog = chartFactory.createActivityLog(recentActivityContainer, 'api-activity', {
          maxEntries: 20,
          showTimestamps: true,
          showDetails: true
        });
        this.activityLogs.set('recent-activity', activityLog);
      }

      console.log(`📋 Initialized ${this.activityLogs.size} activity logs`);
    } catch (error) {
      console.error('Error initializing activity logs:', error);
      throw error;
    }
  }

  /**
   * Load initial data
   */
  async loadInitialData() {
    console.log('📥 Loading initial data...');
    
    try {
      const data = await this.fetchDashboardData();
      this.updateDashboard(data);
      this.updateLastRefreshTime();
    } catch (error) {
      console.error('Error loading initial data:', error);
      this.showError('Failed to load dashboard data');
    }
  }

  /**
   * Refresh dashboard data
   */
  async refreshData() {
    console.log('🔄 Refreshing dashboard data...');
    
    try {
      this.showLoading(true);
      const data = await this.fetchDashboardData(true);
      this.updateDashboard(data);
      this.updateLastRefreshTime();
      this.showRefreshFeedback();
    } catch (error) {
      console.error('Error refreshing data:', error);
      this.showError('Failed to refresh dashboard data');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Fetch dashboard data using the data manager
   */
  async fetchDashboardData(forceRefresh = false) {
    try {
      if (!this.dataManager) {
        console.warn('Data manager not available, using sample data');
        return this.generateSampleData();
      }

      // Fetch all required data concurrently
      const data = await this.dataManager.getMultipleData([
        'overview',
        'apiUsage',
        'responseTime',
        'errorRate',
        'topEndpoints',
        'errorDistribution',
        'userActivity',
        'activityLog',
        'systemHealth'
      ], forceRefresh);

      // Transform data to match existing dashboard format
      return this.transformDataForDashboard(data);
      
      /* Production code would look like:
      const response = await fetch('/api/metrics');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
      */
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }

  /**
   * Transform data from data manager to dashboard format
   */
  transformDataForDashboard(data) {
    const overview = data.overview || {};
    const apiUsage = data.apiUsage || {};
    const responseTime = data.responseTime || {};
    const errorRate = data.errorRate || {};
    const topEndpoints = data.topEndpoints || [];
    const errorDistribution = data.errorDistribution || [];
    const userActivity = data.userActivity || [];
    const activityLog = data.activityLog || [];

    return {
      summary: {
        totalApiCalls: overview.totalRequests || 0,
        successfulPublishes: overview.totalPublishes || 0,
        errorCount: overview.errorCount || 0,
        errorRate: errorRate.rate || 0,
        averageResponseTime: responseTime.average || 0,
        uptime: overview.uptime || 99.9,
        activeUsers: overview.activeUsers || 0,
        storageUsed: overview.storageUsed || 0
      },
      timeSeries: this.transformTimeSeriesData(apiUsage.timeSeries, responseTime.timeSeries, errorRate.timeSeries),
      topEndpoints: topEndpoints.map(endpoint => ({
        endpoint: endpoint.endpoint,
        count: endpoint.requests,
        averageResponseTime: endpoint.averageResponseTime,
        errorRate: endpoint.errorRate
      })),
      errorDistribution: errorDistribution.map(error => ({
        type: error.type,
        count: error.count,
        percentage: error.percentage
      })),
      userActivity: userActivity.map(activity => ({
        userId: activity.activity,
        activityCount: activity.count,
        change: activity.change
      })),
      recentActivity: activityLog.map(activity => ({
        id: activity.id,
        timestamp: new Date(activity.timestamp),
        type: activity.type,
        title: activity.message,
        description: `${activity.user} from ${activity.ip}`,
        endpoint: '/api/activity'
      }))
    };
  }

  /**
   * Transform time series data for charts
   */
  transformTimeSeriesData(apiUsageData = [], responseTimeData = [], errorRateData = []) {
    const maxLength = Math.max(apiUsageData.length, responseTimeData.length, errorRateData.length);
    const timeSeries = [];

    for (let i = 0; i < maxLength; i++) {
      const apiPoint = apiUsageData[i];
      const responsePoint = responseTimeData[i];
      const errorPoint = errorRateData[i];

      const timestamp = apiPoint?.timestamp || responsePoint?.timestamp || errorPoint?.timestamp || new Date().toISOString();

      timeSeries.push({
        timestamp: new Date(timestamp),
        apiCalls: apiPoint?.value || 0,
        publishSuccess: Math.floor((apiPoint?.value || 0) * 0.8), // Estimate
        publishErrors: Math.floor((errorPoint?.value || 0) * 10), // Convert rate to count
        responseTime: responsePoint?.value || 0
      });
    }

    return timeSeries;
  }

  /**
   * Generate sample data for demo
   */
  generateSampleData() {
    const now = new Date();
    const hours = 24;
    const timeSeries = [];
    
    // Generate time series data
    for (let i = hours; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000));
      timeSeries.push({
        timestamp,
        apiCalls: Math.floor(Math.random() * 100) + 50,
        publishSuccess: Math.floor(Math.random() * 30) + 10,
        publishErrors: Math.floor(Math.random() * 5),
        responseTime: Math.floor(Math.random() * 200) + 100
      });
    }

    const totalApiCalls = timeSeries.reduce((sum, point) => sum + point.apiCalls, 0);
    const totalPublishes = timeSeries.reduce((sum, point) => sum + point.publishSuccess, 0);
    const totalErrors = timeSeries.reduce((sum, point) => sum + point.publishErrors, 0);
    const avgResponseTime = timeSeries.reduce((sum, point) => sum + point.responseTime, 0) / timeSeries.length;

    return {
      summary: {
        totalApiCalls,
        successfulPublishes: totalPublishes,
        errorCount: totalErrors,
        errorRate: totalErrors > 0 ? (totalErrors / totalApiCalls) * 100 : 0,
        averageResponseTime: Math.round(avgResponseTime),
        uptime: 99.9
      },
      timeSeries,
      topEndpoints: [
        { endpoint: '/api/publish', count: Math.floor(totalApiCalls * 0.4) },
        { endpoint: '/api/metrics', count: Math.floor(totalApiCalls * 0.2) },
        { endpoint: '/api/health', count: Math.floor(totalApiCalls * 0.15) },
        { endpoint: '/api/posts', count: Math.floor(totalApiCalls * 0.1) },
        { endpoint: '/api/users', count: Math.floor(totalApiCalls * 0.08) }
      ],
      errorDistribution: [
        { type: 'validation_error', count: Math.floor(totalErrors * 0.4) },
        { type: 'auth_error', count: Math.floor(totalErrors * 0.3) },
        { type: 'rate_limit_error', count: Math.floor(totalErrors * 0.2) },
        { type: 'system_error', count: Math.floor(totalErrors * 0.1) }
      ],
      userActivity: [
        { userId: 'user1', activityCount: 45 },
        { userId: 'user2', activityCount: 32 },
        { userId: 'user3', activityCount: 28 },
        { userId: 'user4', activityCount: 19 }
      ],
      recentActivity: this.generateRecentActivity(20)
    };
  }

  /**
   * Generate sample recent activity
   */
  generateRecentActivity(count) {
    const activities = [];
    const activityTypes = [
      { type: 'publish_success', title: 'Post Published Successfully', icon: '✅' },
      { type: 'api_call', title: 'API Request', icon: '🔄' },
      { type: 'publish_error', title: 'Publish Failed', icon: '❌' },
      { type: 'user_activity', title: 'User Login', icon: '👤' }
    ];

    for (let i = 0; i < count; i++) {
      const activity = activityTypes[Math.floor(Math.random() * activityTypes.length)];
      const timestamp = new Date(Date.now() - (Math.random() * 24 * 60 * 60 * 1000));
      
      activities.push({
        id: `activity-${i}`,
        timestamp,
        type: activity.type,
        title: activity.title,
        description: `Sample activity description ${i + 1}`,
        endpoint: '/api/publish',
        method: 'POST',
        statusCode: activity.type.includes('error') ? 500 : 200,
        userId: `user${Math.floor(Math.random() * 4) + 1}`,
        duration: Math.floor(Math.random() * 1000) + 100
      });
    }

    return activities.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Update dashboard with new data
   */
  updateDashboard(data) {
    try {
      // Update summary cards
      this.updateSummaryCards(data.summary);
      
      // Update charts
      this.updateCharts(data);
      
      // Update activity logs
      this.updateActivityLogs(data.recentActivity);
      
      // Update quick stats
      this.updateQuickStats(data);
      
      console.log('📊 Dashboard updated with new data');
    } catch (error) {
      console.error('Error updating dashboard:', error);
    }
  }

  /**
   * Update summary cards
   */
  updateSummaryCards(summary) {
    const updates = {
      'total-api-calls': { value: summary.totalApiCalls },
      'success-rate': { value: 100 - summary.errorRate },
      'error-rate': { value: summary.errorRate },
      'avg-response-time': { value: summary.averageResponseTime },
      'total-publishes': { value: summary.successfulPublishes },
      'system-uptime': { value: summary.uptime }
    };

    Object.entries(updates).forEach(([cardId, data]) => {
      const card = this.summaryCards.get(cardId);
      if (card) {
        card.updateData(data);
      }
    });
  }

  /**
   * Update charts with new data
   */
  updateCharts(data) {
    // Update API Usage Chart
    const apiUsageChart = this.charts.get('api-usage');
    if (apiUsageChart) {
      const chartData = {
        labels: data.timeSeries.map(point => point.timestamp),
        datasets: [{
          label: 'API Calls',
          data: data.timeSeries.map(point => point.apiCalls)
        }]
      };
      apiUsageChart.updateData(chartData);
    }

    // Update Response Time Chart
    const responseTimeChart = this.charts.get('response-time');
    if (responseTimeChart) {
      const chartData = {
        labels: data.timeSeries.map(point => point.timestamp),
        datasets: [{
          label: 'Response Time (ms)',
          data: data.timeSeries.map(point => point.responseTime)
        }]
      };
      responseTimeChart.updateData(chartData);
    }

    // Update Top Endpoints Chart
    const topEndpointsChart = this.charts.get('top-endpoints');
    if (topEndpointsChart) {
      const chartData = {
        labels: data.topEndpoints.map(item => item.endpoint),
        datasets: [{
          label: 'Requests',
          data: data.topEndpoints.map(item => item.count)
        }]
      };
      topEndpointsChart.updateData(chartData);
    }

    // Update Error Distribution Chart
    const errorDistributionChart = this.charts.get('error-distribution');
    if (errorDistributionChart) {
      const chartData = {
        labels: data.errorDistribution.map(item => item.type.replace('_', ' ')),
        datasets: [{
          label: 'Error Count',
          data: data.errorDistribution.map(item => item.count)
        }]
      };
      errorDistributionChart.updateData(chartData);
    }
  }

  /**
   * Update activity logs
   */
  updateActivityLogs(activities) {
    const activityLog = this.activityLogs.get('recent-activity');
    if (activityLog) {
      activityLog.clearEntries();
      activityLog.addEntries(activities);
    }
  }

  /**
   * Update quick stats in sidebar
   */
  updateQuickStats(data) {
    const elements = {
      'requests-per-minute': Math.round(data.summary.totalApiCalls / (24 * 60)),
      'active-users': data.userActivity.length,
      'success-rate-mini': (100 - data.summary.errorRate).toFixed(1) + '%',
      'avg-response-mini': data.summary.averageResponseTime + 'ms'
    };

    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshData());
    }

    // Chart control buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('chart-control-btn')) {
        this.handleChartControl(e);
      }
    });

    // Activity filter buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('activity-filter-btn')) {
        this.handleActivityFilter(e);
      }
    });

    // Listen for section changes
    document.addEventListener('navigationChanged', (e) => {
      this.onSectionChanged(e.detail.currentSection);
    });

    // Listen for data refresh events
    window.addEventListener('dataRefreshed', (e) => {
      this.onDataRefreshed(e.detail);
    });

    // Listen for data manager initialization
    window.addEventListener('dataManagerInitialized', (e) => {
      this.onDataManagerInitialized(e.detail);
    });
  }

  /**
   * Handle chart control button clicks
   */
  handleChartControl(e) {
    const button = e.target;
    const container = button.closest('.chart-container');
    const controls = container.querySelectorAll('.chart-control-btn');
    
    // Update active state
    controls.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    // Handle the control action
    const period = button.dataset.period;
    const sort = button.dataset.sort;
    
    if (period) {
      this.updateChartPeriod(container, period);
    }
    
    if (sort) {
      this.updateChartSort(container, sort);
    }
  }

  /**
   * Handle activity filter button clicks
   */
  handleActivityFilter(e) {
    const button = e.target;
    const container = button.closest('.activity-container');
    const controls = container.querySelectorAll('.activity-filter-btn');
    
    // Update active state
    controls.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    // Apply filter
    const filter = button.dataset.filter;
    this.filterActivityLog(filter);
  }

  /**
   * Update chart time period
   */
  updateChartPeriod(container, period) {
    console.log(`Updating chart period to: ${period}`);
    // Implementation would depend on your specific requirements
    // This could trigger a new data fetch with different time range
  }

  /**
   * Update chart sorting
   */
  updateChartSort(container, sort) {
    const chartId = container.querySelector('canvas').id;
    const chart = this.charts.get(chartId.replace('-chart', ''));
    
    if (chart && typeof chart.sortByValues === 'function') {
      chart.sortByValues(sort === 'asc');
    }
  }

  /**
   * Filter activity log
   */
  filterActivityLog(filter) {
    const activityLog = this.activityLogs.get('recent-activity');
    if (activityLog) {
      const filterTypes = {
        'all': [],
        'success': ['publish_success', 'api_call'],
        'error': ['publish_error', 'validation_error', 'auth_error', 'system_error']
      };
      
      activityLog.updateOptions({
        filterTypes: filterTypes[filter] || []
      });
    }
  }

  /**
   * Handle section changes
   */
  onSectionChanged(section) {
    console.log(`Section changed to: ${section}`);
    // Implement section-specific behavior here
    // For example, load section-specific data or initialize section-specific charts
  }

  /**
   * Refresh dashboard data
   */
  async refreshData() {
    try {
      console.log('🔄 Refreshing dashboard data...');
      
      // Show loading state
      this.setLoadingState(true);
      
      // Fetch new data
      const data = await this.fetchDashboardData();
      
      // Update dashboard
      this.updateDashboard(data);
      
      // Update last refresh time
      this.updateLastRefreshTime();
      
      // Hide loading state
      this.setLoadingState(false);
      
      console.log('✅ Dashboard data refreshed');
      
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      this.showError('Failed to refresh dashboard data');
      this.setLoadingState(false);
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
      this.refreshData();
    }, this.refreshRate);
    
    console.log(`🔄 Auto-refresh started (${this.refreshRate / 1000}s interval)`);
  }

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log('⏹️ Auto-refresh stopped');
    }
  }

  /**
   * Set loading state
   */
  setLoadingState(isLoading) {
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.disabled = isLoading;
      const icon = refreshBtn.querySelector('i');
      if (icon) {
        icon.style.animation = isLoading ? 'spin 1s linear infinite' : '';
      }
    }
  }

  /**
   * Update last refresh time
   */
  updateLastRefreshTime() {
    const element = document.getElementById('last-updated-time');
    if (element) {
      element.textContent = new Date().toLocaleTimeString();
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    // Implement toast notification or error display
    console.error(message);
    
    // You could integrate with a toast notification system here
    // For now, we'll just log the error
  }

  /**
   * Emit custom event
   */
  emitEvent(eventName, detail = {}) {
    const event = new CustomEvent(eventName, {
      detail: { ...detail, timestamp: Date.now() }
    });
    document.dispatchEvent(event);
  }

  /**
   * Get dashboard instance
   */
  static getInstance() {
    if (!window.dashboardController) {
      window.dashboardController = new DashboardController();
    }
    return window.dashboardController;
  }

  /**
   * Handle data manager initialization
   */
  onDataManagerInitialized(detail) {
    console.log('📊 Data manager initialized:', detail);
    if (detail.usingSampleData) {
      this.showNotification('Using sample data for demo', 'info');
    } else {
      this.showNotification('Connected to live API', 'success');
    }
  }

  /**
   * Handle data refresh events
   */
  onDataRefreshed(detail) {
    console.log('🔄 Data refreshed:', detail);
    this.updateLastRefreshTime(detail.timestamp);
    this.showNotification('Data refreshed successfully', 'success');
  }

  /**
   * Show notification to user
   */
  showNotification(message, type = 'info') {
    const toast = document.getElementById('toast-container');
    if (toast) {
      const notification = document.createElement('div');
      notification.className = `toast toast-${type}`;
      notification.textContent = message;
      toast.appendChild(notification);
      
      // Auto-remove after 3 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 3000);
    }
  }

  /**
   * Update last refresh timestamp
   */
  updateLastRefreshTime(timestamp = null) {
    const refreshTime = document.getElementById('last-refresh-time');
    if (refreshTime) {
      const time = timestamp ? new Date(timestamp) : new Date();
      refreshTime.textContent = time.toLocaleTimeString();
    }
  }

  /**
   * Destroy dashboard
   */
  destroy() {
    // Stop auto-refresh
    this.stopAutoRefresh();
    
    // Destroy charts
    this.charts.forEach(chart => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    });
    
    // Destroy summary cards
    this.summaryCards.forEach(card => {
      if (card && typeof card.destroy === 'function') {
        card.destroy();
      }
    });
    
    // Destroy activity logs
    this.activityLogs.forEach(log => {
      if (log && typeof log.destroy === 'function') {
        log.destroy();
      }
    });
    
    // Clear maps
    this.charts.clear();
    this.summaryCards.clear();
    this.activityLogs.clear();
    
    console.log('🗑️ Dashboard destroyed');
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.dashboardController = DashboardController.getInstance();
  console.log('🎛️ Dashboard controller initialized');
});

// Export for use in other modules
export { DashboardController };
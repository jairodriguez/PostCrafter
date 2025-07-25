/**
 * Dashboard Integration Script
 * 
 * Coordinates real-time updates, filtering, and main dashboard functionality
 * 
 * @package PostCrafter
 * @version 1.0.0
 */

import { RealTimeUpdatesManager } from './real-time-updates.js';
import { DashboardFilteringSystem } from './filtering-system.js';

class DashboardIntegration {
  constructor() {
    this.realTimeManager = null;
    this.filteringSystem = null;
    this.isInitialized = false;
    this.connectionStatus = 'disconnected';
    this.lastUpdateTime = null;
    this.updateQueue = [];
    
    this.initialize();
  }

  /**
   * Initialize the dashboard integration
   */
  async initialize() {
    try {
      console.log('🔄 Initializing Dashboard Integration...');
      
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
      }
      
      // Initialize filtering system first
      this.filteringSystem = new DashboardFilteringSystem();
      
      // Initialize real-time updates
      this.realTimeManager = new RealTimeUpdatesManager();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Set up real-time data subscriptions
      this.setupRealTimeSubscriptions();
      
      // Set up filtering integration
      this.setupFilteringIntegration();
      
      // Initialize UI components
      this.initializeUI();
      
      this.isInitialized = true;
      console.log('✅ Dashboard Integration initialized successfully');
      
      // Dispatch initialization event
      window.dispatchEvent(new CustomEvent('dashboardIntegrationReady', {
        detail: { timestamp: new Date().toISOString() }
      }));
      
    } catch (error) {
      console.error('❌ Failed to initialize Dashboard Integration:', error);
    }
  }

  /**
   * Set up event listeners for integration
   */
  setupEventListeners() {
    // Real-time toggle
    const realtimeToggle = document.getElementById('realtime-toggle');
    if (realtimeToggle) {
      realtimeToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.enableRealTimeUpdates();
        } else {
          this.disableRealTimeUpdates();
        }
      });
    }

    // Refresh interval change
    const refreshInterval = document.getElementById('refresh-interval');
    if (refreshInterval) {
      refreshInterval.addEventListener('change', (e) => {
        this.updateRefreshInterval(parseInt(e.target.value));
      });
    }

    // Manual refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.triggerManualRefresh();
      });
    }

    // Filter panel toggle
    const filtersToggle = document.getElementById('filters-toggle');
    const filtersContent = document.getElementById('filters-content');
    if (filtersToggle && filtersContent) {
      filtersToggle.addEventListener('click', () => {
        this.toggleFiltersPanel();
      });
    }

    // Date range button and dropdown
    const dateRangeBtn = document.getElementById('date-range-btn');
    const dateRangeDropdown = document.getElementById('date-range-dropdown');
    if (dateRangeBtn && dateRangeDropdown) {
      dateRangeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleDateRangeDropdown();
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!dateRangeDropdown.contains(e.target) && !dateRangeBtn.contains(e.target)) {
          dateRangeDropdown.classList.remove('show');
        }
      });
    }

    // Quick filter buttons
    const quickFilterBtns = document.querySelectorAll('.filter-btn[data-filter]');
    quickFilterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.handleQuickFilter(e.target.dataset.filter);
      });
    });

    // Preset buttons
    const presetBtns = document.querySelectorAll('.preset-btn[data-preset]');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.handlePresetFilter(e.target.dataset.preset);
      });
    });
  }

  /**
   * Set up real-time data subscriptions
   */
  setupRealTimeSubscriptions() {
    if (!this.realTimeManager) return;

    // Subscribe to connection status changes
    this.realTimeManager.subscribe('connectionStatus', (status) => {
      this.updateConnectionStatus(status);
    });

    // Subscribe to real-time data updates
    this.realTimeManager.subscribe('dataUpdate', (data) => {
      this.handleRealTimeDataUpdate(data);
    });

    // Subscribe to error events
    this.realTimeManager.subscribe('error', (error) => {
      this.handleRealTimeError(error);
    });
  }

  /**
   * Set up filtering system integration
   */
  setupFilteringIntegration() {
    if (!this.filteringSystem) return;

    // Subscribe to filter changes
    this.filteringSystem.subscribe('filterChange', (filters) => {
      this.handleFilterChange(filters);
    });

    // Subscribe to preset changes
    this.filteringSystem.subscribe('presetApplied', (preset) => {
      this.handlePresetApplied(preset);
    });
  }

  /**
   * Initialize UI components
   */
  initializeUI() {
    // Initialize connection status
    this.updateConnectionStatus('connecting');
    
    // Initialize filter panel (collapsed by default)
    const filtersContent = document.getElementById('filters-content');
    if (filtersContent) {
      filtersContent.classList.remove('show');
    }
    
    // Set up initial date range text
    this.updateDateRangeText('Last 24 Hours');
  }

  /**
   * Handle real-time data updates
   */
  handleRealTimeDataUpdate(data) {
    console.log('📊 Real-time data update received:', data);
    
    // Update last update time
    this.lastUpdateTime = new Date();
    
    // Queue the update if dashboard is not ready
    if (!window.PostCrafterDashboard || !window.PostCrafterDashboard.isInitialized) {
      this.updateQueue.push(data);
      return;
    }
    
    // Apply current filters to the data
    const filteredData = this.applyFiltersToData(data);
    
    // Update dashboard with filtered data
    this.updateDashboardWithData(filteredData);
    
    // Show notification for significant updates
    if (data.type === 'error' || data.events?.length > 5) {
      this.showNotification(data);
    }
  }

  /**
   * Apply current filters to incoming data
   */
  applyFiltersToData(data) {
    if (!this.filteringSystem) return data;
    
    const activeFilters = this.filteringSystem.getActiveFilters();
    
    // Apply filters to events if present
    if (data.events) {
      data.events = data.events.filter(event => {
        return this.filteringSystem.eventMatchesFilters(event, activeFilters);
      });
    }
    
    return data;
  }

  /**
   * Update dashboard with new data
   */
  updateDashboardWithData(data) {
    // Dispatch update event for dashboard components
    window.dispatchEvent(new CustomEvent('realtimeDataUpdate', {
      detail: { data, timestamp: this.lastUpdateTime }
    }));
    
    // Update summary cards if needed
    if (data.summary) {
      this.updateSummaryCards(data.summary);
    }
    
    // Update activity log if new events
    if (data.events && data.events.length > 0) {
      this.updateActivityLog(data.events);
    }
  }

  /**
   * Update connection status indicator
   */
  updateConnectionStatus(status) {
    this.connectionStatus = status;
    
    const statusElement = document.getElementById('connection-status');
    if (!statusElement) return;
    
    const statusDot = statusElement.querySelector('.status-dot');
    const statusText = statusElement.querySelector('.status-text');
    
    if (statusDot && statusText) {
      // Remove all status classes
      statusDot.className = 'status-dot';
      
      // Add appropriate status class and text
      switch (status) {
        case 'connected':
          statusDot.classList.add('status-connected');
          statusText.textContent = 'Connected';
          break;
        case 'connecting':
          statusDot.classList.add('status-connecting');
          statusText.textContent = 'Connecting...';
          break;
        case 'disconnected':
          statusDot.classList.add('status-disconnected');
          statusText.textContent = 'Disconnected';
          break;
      }
    }
  }

  /**
   * Handle filter changes
   */
  handleFilterChange(filters) {
    console.log('🔍 Filters changed:', filters);
    
    // Apply filters to existing data
    this.applyFiltersToExistingData();
    
    // Update real-time subscription if needed
    this.updateRealTimeSubscription(filters);
  }

  /**
   * Handle quick filter selection
   */
  handleQuickFilter(filterType) {
    // Update active state
    const quickFilterBtns = document.querySelectorAll('.filter-btn[data-filter]');
    quickFilterBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filterType);
    });
    
    // Apply quick filter
    if (this.filteringSystem) {
      this.filteringSystem.applyQuickFilter(filterType);
    }
  }

  /**
   * Handle preset filter application
   */
  handlePresetFilter(presetType) {
    if (!this.filteringSystem) return;
    
    switch (presetType) {
      case 'errors-only':
        this.filteringSystem.applyPreset('errorsOnly');
        this.showNotification('Applied "Errors Only" filter', 'info');
        break;
      case 'high-traffic':
        this.filteringSystem.applyPreset('highTraffic');
        this.showNotification('Applied "High Traffic" filter', 'info');
        break;
      case 'recent-activity':
        this.filteringSystem.applyPreset('recentActivity');
        this.showNotification('Applied "Recent Activity" filter', 'info');
        break;
      case 'clear-all':
        this.filteringSystem.clearAllFilters();
        this.showNotification('Cleared all filters', 'info');
        break;
    }
  }

  /**
   * Toggle filters panel
   */
  toggleFiltersPanel() {
    const filtersToggle = document.getElementById('filters-toggle');
    const filtersContent = document.getElementById('filters-content');
    
    if (filtersToggle && filtersContent) {
      const isExpanded = filtersContent.classList.contains('show');
      
      if (isExpanded) {
        filtersContent.classList.remove('show');
        filtersToggle.classList.remove('expanded');
      } else {
        filtersContent.classList.add('show');
        filtersToggle.classList.add('expanded');
      }
    }
  }

  /**
   * Toggle date range dropdown
   */
  toggleDateRangeDropdown() {
    const dropdown = document.getElementById('date-range-dropdown');
    if (dropdown) {
      dropdown.classList.toggle('show');
    }
  }

  /**
   * Update date range text
   */
  updateDateRangeText(text) {
    const dateRangeText = document.getElementById('date-range-text');
    if (dateRangeText) {
      dateRangeText.textContent = text;
    }
  }

  /**
   * Enable real-time updates
   */
  enableRealTimeUpdates() {
    if (this.realTimeManager) {
      this.realTimeManager.startUpdates();
      this.showNotification('Real-time updates enabled', 'success');
    }
  }

  /**
   * Disable real-time updates
   */
  disableRealTimeUpdates() {
    if (this.realTimeManager) {
      this.realTimeManager.stopUpdates();
      this.showNotification('Real-time updates disabled', 'info');
    }
  }

  /**
   * Update refresh interval
   */
  updateRefreshInterval(interval) {
    if (this.realTimeManager) {
      this.realTimeManager.updateInterval(interval);
      const seconds = interval / 1000;
      this.showNotification(`Refresh interval updated to ${seconds} seconds`, 'info');
    }
  }

  /**
   * Trigger manual refresh
   */
  triggerManualRefresh() {
    // Add loading state to refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      const icon = refreshBtn.querySelector('i');
      if (icon) {
        icon.style.animation = 'spin 1s linear infinite';
        setTimeout(() => {
          icon.style.animation = '';
        }, 1000);
      }
    }
    
    // Trigger refresh
    window.dispatchEvent(new CustomEvent('manualRefresh', {
      detail: { timestamp: new Date().toISOString() }
    }));
    
    this.showNotification('Dashboard refreshed', 'success');
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `toast toast-${type}`;
    notification.innerHTML = `
      <div class="toast-content">
        <i data-feather="${this.getNotificationIcon(type)}"></i>
        <span>${message}</span>
      </div>
      <button class="toast-close">
        <i data-feather="x"></i>
      </button>
    `;
    
    // Add to container
    const container = document.getElementById('toast-container');
    if (container) {
      container.appendChild(notification);
      
      // Initialize feather icons
      if (window.feather) {
        window.feather.replace();
      }
      
      // Auto remove after 3 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 3000);
      
      // Manual close
      const closeBtn = notification.querySelector('.toast-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          notification.remove();
        });
      }
    }
  }

  /**
   * Get notification icon based on type
   */
  getNotificationIcon(type) {
    switch (type) {
      case 'success': return 'check-circle';
      case 'error': return 'alert-circle';
      case 'warning': return 'alert-triangle';
      default: return 'info';
    }
  }

  /**
   * Process queued updates
   */
  processQueuedUpdates() {
    if (this.updateQueue.length > 0) {
      console.log(`📊 Processing ${this.updateQueue.length} queued updates`);
      
      this.updateQueue.forEach(data => {
        this.handleRealTimeDataUpdate(data);
      });
      
      this.updateQueue = [];
    }
  }

  /**
   * Get integration status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      connectionStatus: this.connectionStatus,
      lastUpdateTime: this.lastUpdateTime,
      queuedUpdates: this.updateQueue.length,
      realTimeEnabled: this.realTimeManager?.isConnected || false,
      filtersActive: this.filteringSystem?.hasActiveFilters() || false,
    };
  }
}

// Create and export global instance
const dashboardIntegration = new DashboardIntegration();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => dashboardIntegration.initialize());
} else {
  dashboardIntegration.initialize();
}

// Export for use in other modules
window.PostCrafterDashboardIntegration = dashboardIntegration;

export default dashboardIntegration;
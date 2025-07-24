/**
 * Dashboard Filtering System
 * 
 * Provides advanced filtering capabilities for the PostCrafter dashboard
 * including date range selection, metric filtering, and user preferences.
 * 
 * @package PostCrafter
 * @version 1.0.0
 */

class DashboardFilteringSystem {
  constructor() {
    this.filters = new Map();
    this.activeFilters = {};
    this.savedFilters = new Map();
    this.preferences = {};
    this.subscribers = new Map();
    this.storageKey = 'postcrafter-dashboard-filters';
    this.preferencesKey = 'postcrafter-dashboard-preferences';
    
    this.defaultFilters = {
      dateRange: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        end: new Date(),
        preset: '24h'
      },
      metrics: {
        types: ['all'],
        endpoints: ['all'],
        errorTypes: ['all'],
        statusCodes: ['all']
      },
      activity: {
        types: ['all'],
        users: ['all'],
        severity: ['all']
      },
      display: {
        refreshInterval: 30000,
        maxItems: 100,
        showDetails: true,
        groupBy: 'none'
      }
    };

    this.initializeFiltering();
  }

  /**
   * Initialize the filtering system
   */
  initializeFiltering() {
    console.log('🔍 Initializing filtering system...');
    
    // Load saved preferences
    this.loadPreferences();
    
    // Load saved filters
    this.loadSavedFilters();
    
    // Set up default filters
    this.activeFilters = { ...this.defaultFilters };
    
    // Create filter UI components
    this.createFilterComponents();
    
    // Bind event listeners
    this.bindEventListeners();
    
    console.log('✅ Filtering system initialized');
  }

  /**
   * Create filter UI components
   */
  createFilterComponents() {
    this.createDateRangeFilter();
    this.createMetricsFilter();
    this.createActivityFilter();
    this.createQuickFilters();
    this.createFilterPresets();
  }

  /**
   * Create date range filter component
   */
  createDateRangeFilter() {
    const dateRangeContainer = document.getElementById('date-range-filter') || this.createDateRangeContainer();
    
    dateRangeContainer.innerHTML = `
      <div class="filter-section">
        <h4 class="filter-title">Time Range</h4>
        <div class="date-range-controls">
          <div class="preset-buttons">
            <button class="preset-btn active" data-preset="1h">1H</button>
            <button class="preset-btn" data-preset="6h">6H</button>
            <button class="preset-btn" data-preset="24h">24H</button>
            <button class="preset-btn" data-preset="7d">7D</button>
            <button class="preset-btn" data-preset="30d">30D</button>
            <button class="preset-btn" data-preset="custom">Custom</button>
          </div>
          <div class="custom-date-range" style="display: none;">
            <div class="date-input-group">
              <label for="start-date">From:</label>
              <input type="datetime-local" id="start-date" class="date-input">
            </div>
            <div class="date-input-group">
              <label for="end-date">To:</label>
              <input type="datetime-local" id="end-date" class="date-input">
            </div>
            <button class="apply-date-range-btn">Apply</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create date range container if it doesn't exist
   */
  createDateRangeContainer() {
    const container = document.createElement('div');
    container.id = 'date-range-filter';
    container.className = 'filter-container';
    
    // Insert into page header or create a filter panel
    const pageHeader = document.querySelector('.page-header');
    if (pageHeader) {
      pageHeader.appendChild(container);
    }
    
    return container;
  }

  /**
   * Create metrics filter component
   */
  createMetricsFilter() {
    const metricsContainer = this.getOrCreateFilterContainer('metrics-filter');
    
    metricsContainer.innerHTML = `
      <div class="filter-section">
        <h4 class="filter-title">Metrics</h4>
        <div class="filter-group">
          <div class="filter-item">
            <label>Metric Types:</label>
            <select id="metric-types" class="filter-select" multiple>
              <option value="all" selected>All Types</option>
              <option value="api_calls">API Calls</option>
              <option value="response_time">Response Time</option>
              <option value="error_rate">Error Rate</option>
              <option value="success_rate">Success Rate</option>
              <option value="user_activity">User Activity</option>
            </select>
          </div>
          <div class="filter-item">
            <label>Endpoints:</label>
            <select id="endpoint-filter" class="filter-select" multiple>
              <option value="all" selected>All Endpoints</option>
              <option value="/api/publish">/api/publish</option>
              <option value="/api/metrics">/api/metrics</option>
              <option value="/api/health">/api/health</option>
              <option value="/api/posts">/api/posts</option>
              <option value="/api/users">/api/users</option>
            </select>
          </div>
          <div class="filter-item">
            <label>Status Codes:</label>
            <select id="status-code-filter" class="filter-select" multiple>
              <option value="all" selected>All Status Codes</option>
              <option value="200">200 (OK)</option>
              <option value="201">201 (Created)</option>
              <option value="400">400 (Bad Request)</option>
              <option value="401">401 (Unauthorized)</option>
              <option value="404">404 (Not Found)</option>
              <option value="500">500 (Server Error)</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create activity filter component
   */
  createActivityFilter() {
    const activityContainer = this.getOrCreateFilterContainer('activity-filter');
    
    activityContainer.innerHTML = `
      <div class="filter-section">
        <h4 class="filter-title">Activity</h4>
        <div class="filter-group">
          <div class="filter-item">
            <label>Activity Types:</label>
            <select id="activity-types" class="filter-select" multiple>
              <option value="all" selected>All Types</option>
              <option value="publish_success">Publish Success</option>
              <option value="publish_error">Publish Error</option>
              <option value="user_login">User Login</option>
              <option value="api_call">API Call</option>
              <option value="system_event">System Event</option>
            </select>
          </div>
          <div class="filter-item">
            <label>Users:</label>
            <select id="user-filter" class="filter-select" multiple>
              <option value="all" selected>All Users</option>
              <option value="user1">User 1</option>
              <option value="user2">User 2</option>
              <option value="user3">User 3</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div class="filter-item">
            <label>Severity:</label>
            <select id="severity-filter" class="filter-select" multiple>
              <option value="all" selected>All Levels</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create quick filter buttons
   */
  createQuickFilters() {
    const quickContainer = this.getOrCreateFilterContainer('quick-filters');
    
    quickContainer.innerHTML = `
      <div class="filter-section">
        <h4 class="filter-title">Quick Filters</h4>
        <div class="quick-filter-buttons">
          <button class="quick-filter-btn" data-filter="errors-only">Errors Only</button>
          <button class="quick-filter-btn" data-filter="high-traffic">High Traffic</button>
          <button class="quick-filter-btn" data-filter="slow-responses">Slow Responses</button>
          <button class="quick-filter-btn" data-filter="recent-activity">Recent Activity</button>
          <button class="quick-filter-btn" data-filter="system-alerts">System Alerts</button>
          <button class="quick-filter-btn active" data-filter="clear-all">Clear All</button>
        </div>
      </div>
    `;
  }

  /**
   * Create filter presets
   */
  createFilterPresets() {
    const presetsContainer = this.getOrCreateFilterContainer('filter-presets');
    
    presetsContainer.innerHTML = `
      <div class="filter-section">
        <h4 class="filter-title">Filter Presets</h4>
        <div class="preset-controls">
          <select id="preset-selector" class="filter-select">
            <option value="">Select Preset...</option>
            <option value="monitoring">Monitoring Dashboard</option>
            <option value="debugging">Debug Mode</option>
            <option value="performance">Performance Analysis</option>
            <option value="security">Security Review</option>
          </select>
          <div class="preset-actions">
            <button id="apply-preset-btn" class="btn btn-secondary">Apply</button>
            <button id="save-preset-btn" class="btn btn-secondary">Save Current</button>
            <button id="reset-filters-btn" class="btn btn-secondary">Reset All</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get or create filter container
   */
  getOrCreateFilterContainer(id) {
    let container = document.getElementById(id);
    if (!container) {
      container = document.createElement('div');
      container.id = id;
      container.className = 'filter-container';
      
      // Add to filter panel or create one
      let filterPanel = document.getElementById('filter-panel');
      if (!filterPanel) {
        filterPanel = this.createFilterPanel();
      }
      filterPanel.appendChild(container);
    }
    return container;
  }

  /**
   * Create main filter panel
   */
  createFilterPanel() {
    const panel = document.createElement('div');
    panel.id = 'filter-panel';
    panel.className = 'filter-panel';
    panel.innerHTML = `
      <div class="filter-panel-header">
        <h3>Dashboard Filters</h3>
        <button class="filter-toggle-btn" id="toggle-filters">
          <i data-feather="filter"></i>
        </button>
      </div>
      <div class="filter-panel-content">
        <!-- Filter components will be added here -->
      </div>
    `;
    
    // Insert into dashboard
    const dashboardMain = document.querySelector('.dashboard-main');
    if (dashboardMain) {
      dashboardMain.insertBefore(panel, dashboardMain.firstChild);
    }
    
    return panel;
  }

  /**
   * Bind event listeners
   */
  bindEventListeners() {
    // Date range preset buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('preset-btn')) {
        this.handleDatePreset(e.target.dataset.preset);
      }
    });

    // Custom date range apply button
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('apply-date-range-btn')) {
        this.applyCustomDateRange();
      }
    });

    // Quick filter buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('quick-filter-btn')) {
        this.handleQuickFilter(e.target.dataset.filter);
      }
    });

    // Filter selects change
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('filter-select')) {
        this.handleFilterChange(e.target);
      }
    });

    // Preset controls
    document.addEventListener('click', (e) => {
      if (e.target.id === 'apply-preset-btn') {
        this.applyPreset();
      } else if (e.target.id === 'save-preset-btn') {
        this.saveCurrentAsPreset();
      } else if (e.target.id === 'reset-filters-btn') {
        this.resetAllFilters();
      }
    });

    // Filter panel toggle
    document.addEventListener('click', (e) => {
      if (e.target.id === 'toggle-filters' || e.target.closest('#toggle-filters')) {
        this.toggleFilterPanel();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'f':
            e.preventDefault();
            this.toggleFilterPanel();
            break;
          case 'r':
            if (e.shiftKey) {
              e.preventDefault();
              this.resetAllFilters();
            }
            break;
        }
      }
    });
  }

  /**
   * Handle date preset selection
   */
  handleDatePreset(preset) {
    const now = new Date();
    let start, end = now;

    switch (preset) {
      case '1h':
        start = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        start = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        this.showCustomDateRange();
        return;
    }

    this.setDateRange(start, end, preset);
    this.updateActivePresetButton(preset);
  }

  /**
   * Show custom date range inputs
   */
  showCustomDateRange() {
    const customRange = document.querySelector('.custom-date-range');
    if (customRange) {
      customRange.style.display = 'block';
      
      // Set current values
      const startInput = document.getElementById('start-date');
      const endInput = document.getElementById('end-date');
      
      if (startInput && endInput) {
        startInput.value = this.formatDateForInput(this.activeFilters.dateRange.start);
        endInput.value = this.formatDateForInput(this.activeFilters.dateRange.end);
      }
    }
  }

  /**
   * Apply custom date range
   */
  applyCustomDateRange() {
    const startInput = document.getElementById('start-date');
    const endInput = document.getElementById('end-date');
    
    if (startInput && endInput && startInput.value && endInput.value) {
      const start = new Date(startInput.value);
      const end = new Date(endInput.value);
      
      if (start <= end) {
        this.setDateRange(start, end, 'custom');
        this.updateActivePresetButton('custom');
        
        // Hide custom range inputs
        const customRange = document.querySelector('.custom-date-range');
        if (customRange) {
          customRange.style.display = 'none';
        }
      } else {
        this.showNotification('Start date must be before end date', 'error');
      }
    }
  }

  /**
   * Set date range filter
   */
  setDateRange(start, end, preset) {
    this.activeFilters.dateRange = { start, end, preset };
    this.applyFilters();
    console.log(`📅 Date range set: ${preset} (${start.toISOString()} to ${end.toISOString()})`);
  }

  /**
   * Update active preset button
   */
  updateActivePresetButton(preset) {
    const buttons = document.querySelectorAll('.preset-btn');
    buttons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === preset);
    });
  }

  /**
   * Handle quick filter actions
   */
  handleQuickFilter(filter) {
    switch (filter) {
      case 'errors-only':
        this.setQuickFilter({
          'metric-types': ['error_rate'],
          'status-code-filter': ['400', '401', '404', '500'],
          'activity-types': ['publish_error'],
          'severity-filter': ['error', 'critical']
        });
        break;
      case 'high-traffic':
        this.setQuickFilter({
          'metric-types': ['api_calls'],
          'endpoint-filter': ['/api/publish', '/api/posts']
        });
        break;
      case 'slow-responses':
        this.setQuickFilter({
          'metric-types': ['response_time']
        });
        break;
      case 'recent-activity':
        this.handleDatePreset('1h');
        this.setQuickFilter({
          'activity-types': ['publish_success', 'user_login', 'api_call']
        });
        break;
      case 'system-alerts':
        this.setQuickFilter({
          'activity-types': ['system_event'],
          'severity-filter': ['warning', 'error', 'critical']
        });
        break;
      case 'clear-all':
        this.clearAllFilters();
        break;
    }

    this.updateActiveQuickFilterButton(filter);
  }

  /**
   * Set quick filter values
   */
  setQuickFilter(filters) {
    Object.entries(filters).forEach(([selectId, values]) => {
      const select = document.getElementById(selectId);
      if (select) {
        // Clear previous selections
        Array.from(select.options).forEach(option => {
          option.selected = values.includes(option.value);
        });
        this.handleFilterChange(select);
      }
    });
  }

  /**
   * Update active quick filter button
   */
  updateActiveQuickFilterButton(filter) {
    const buttons = document.querySelectorAll('.quick-filter-btn');
    buttons.forEach(btn => {
      btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[data-filter="${filter}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }
  }

  /**
   * Handle filter select changes
   */
  handleFilterChange(select) {
    const selectedValues = Array.from(select.selectedOptions).map(option => option.value);
    const filterType = this.getFilterTypeFromSelectId(select.id);
    
    if (filterType) {
      this.updateFilterValue(filterType, selectedValues);
      this.applyFilters();
    }
  }

  /**
   * Get filter type from select element ID
   */
  getFilterTypeFromSelectId(selectId) {
    const mapping = {
      'metric-types': 'metrics.types',
      'endpoint-filter': 'metrics.endpoints',
      'status-code-filter': 'metrics.statusCodes',
      'activity-types': 'activity.types',
      'user-filter': 'activity.users',
      'severity-filter': 'activity.severity'
    };
    return mapping[selectId];
  }

  /**
   * Update filter value
   */
  updateFilterValue(filterPath, value) {
    const parts = filterPath.split('.');
    let target = this.activeFilters;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!target[parts[i]]) {
        target[parts[i]] = {};
      }
      target = target[parts[i]];
    }
    
    target[parts[parts.length - 1]] = value;
  }

  /**
   * Apply all active filters
   */
  applyFilters() {
    console.log('🔍 Applying filters:', this.activeFilters);
    
    // Notify subscribers about filter changes
    this.notifySubscribers('filtersChanged', this.activeFilters);
    
    // Save current filters to preferences
    this.savePreferences();
    
    // Emit custom event for other components
    const event = new CustomEvent('dashboardFiltersChanged', {
      detail: { filters: this.activeFilters }
    });
    window.dispatchEvent(event);
  }

  /**
   * Clear all filters
   */
  clearAllFilters() {
    this.activeFilters = { ...this.defaultFilters };
    this.updateFilterUI();
    this.applyFilters();
    console.log('🧹 All filters cleared');
  }

  /**
   * Reset all filters to defaults
   */
  resetAllFilters() {
    this.clearAllFilters();
    this.updateActivePresetButton('24h');
    this.updateActiveQuickFilterButton('clear-all');
  }

  /**
   * Update filter UI to reflect current active filters
   */
  updateFilterUI() {
    // Update date range
    this.updateActivePresetButton(this.activeFilters.dateRange.preset);
    
    // Update select elements
    Object.entries({
      'metric-types': this.activeFilters.metrics.types,
      'endpoint-filter': this.activeFilters.metrics.endpoints,
      'status-code-filter': this.activeFilters.metrics.statusCodes,
      'activity-types': this.activeFilters.activity.types,
      'user-filter': this.activeFilters.activity.users,
      'severity-filter': this.activeFilters.activity.severity
    }).forEach(([selectId, values]) => {
      const select = document.getElementById(selectId);
      if (select) {
        Array.from(select.options).forEach(option => {
          option.selected = values.includes(option.value);
        });
      }
    });
  }

  /**
   * Apply preset filters
   */
  applyPreset() {
    const selector = document.getElementById('preset-selector');
    if (selector && selector.value) {
      const preset = this.getPresetFilters(selector.value);
      if (preset) {
        this.activeFilters = { ...preset };
        this.updateFilterUI();
        this.applyFilters();
        console.log(`🎯 Applied preset: ${selector.value}`);
      }
    }
  }

  /**
   * Get preset filter configurations
   */
  getPresetFilters(presetName) {
    const presets = {
      monitoring: {
        ...this.defaultFilters,
        dateRange: { ...this.defaultFilters.dateRange, preset: '24h' },
        metrics: { types: ['api_calls', 'response_time', 'error_rate'], endpoints: ['all'], statusCodes: ['all'] }
      },
      debugging: {
        ...this.defaultFilters,
        dateRange: { ...this.defaultFilters.dateRange, preset: '1h' },
        metrics: { types: ['error_rate'], endpoints: ['all'], statusCodes: ['400', '500'] },
        activity: { types: ['publish_error'], users: ['all'], severity: ['error', 'critical'] }
      },
      performance: {
        ...this.defaultFilters,
        dateRange: { ...this.defaultFilters.dateRange, preset: '6h' },
        metrics: { types: ['response_time', 'api_calls'], endpoints: ['all'], statusCodes: ['all'] }
      },
      security: {
        ...this.defaultFilters,
        dateRange: { ...this.defaultFilters.dateRange, preset: '24h' },
        metrics: { types: ['all'], endpoints: ['all'], statusCodes: ['401', '403'] },
        activity: { types: ['user_login'], users: ['all'], severity: ['warning', 'error'] }
      }
    };
    
    return presets[presetName];
  }

  /**
   * Save current filters as a new preset
   */
  saveCurrentAsPreset() {
    const name = prompt('Enter a name for this filter preset:');
    if (name && name.trim()) {
      this.savedFilters.set(name.trim(), { ...this.activeFilters });
      this.saveFilterPresets();
      this.updatePresetSelector();
      console.log(`💾 Saved filter preset: ${name.trim()}`);
    }
  }

  /**
   * Update preset selector with saved presets
   */
  updatePresetSelector() {
    const selector = document.getElementById('preset-selector');
    if (selector) {
      // Keep default presets, add saved ones
      const defaultOptions = Array.from(selector.options).slice(0, 5);
      selector.innerHTML = '';
      
      defaultOptions.forEach(option => selector.appendChild(option));
      
      if (this.savedFilters.size > 0) {
        const separator = document.createElement('option');
        separator.disabled = true;
        separator.textContent = '--- Saved Presets ---';
        selector.appendChild(separator);
        
        this.savedFilters.forEach((_, name) => {
          const option = document.createElement('option');
          option.value = `saved_${name}`;
          option.textContent = name;
          selector.appendChild(option);
        });
      }
    }
  }

  /**
   * Toggle filter panel visibility
   */
  toggleFilterPanel() {
    const panel = document.getElementById('filter-panel');
    if (panel) {
      panel.classList.toggle('collapsed');
      const toggleBtn = document.getElementById('toggle-filters');
      if (toggleBtn) {
        const icon = toggleBtn.querySelector('i');
        if (icon) {
          icon.setAttribute('data-feather', panel.classList.contains('collapsed') ? 'filter' : 'x');
          if (window.feather) window.feather.replace();
        }
      }
    }
  }

  /**
   * Subscribe to filter changes
   */
  subscribe(type, callback) {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    this.subscribers.get(type).add(callback);
  }

  /**
   * Unsubscribe from filter changes
   */
  unsubscribe(type, callback) {
    if (this.subscribers.has(type)) {
      this.subscribers.get(type).delete(callback);
    }
  }

  /**
   * Notify subscribers of changes
   */
  notifySubscribers(type, data) {
    if (this.subscribers.has(type)) {
      this.subscribers.get(type).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Filter subscriber callback error:', error);
        }
      });
    }
  }

  /**
   * Load preferences from localStorage
   */
  loadPreferences() {
    try {
      const saved = localStorage.getItem(this.preferencesKey);
      if (saved) {
        this.preferences = JSON.parse(saved);
        if (this.preferences.activeFilters) {
          this.activeFilters = { ...this.defaultFilters, ...this.preferences.activeFilters };
        }
      }
    } catch (error) {
      console.warn('Failed to load filter preferences:', error);
    }
  }

  /**
   * Save preferences to localStorage
   */
  savePreferences() {
    try {
      this.preferences.activeFilters = this.activeFilters;
      localStorage.setItem(this.preferencesKey, JSON.stringify(this.preferences));
    } catch (error) {
      console.warn('Failed to save filter preferences:', error);
    }
  }

  /**
   * Load saved filter presets
   */
  loadSavedFilters() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        this.savedFilters = new Map(Object.entries(data));
      }
    } catch (error) {
      console.warn('Failed to load saved filters:', error);
    }
  }

  /**
   * Save filter presets to localStorage
   */
  saveFilterPresets() {
    try {
      const data = Object.fromEntries(this.savedFilters);
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save filter presets:', error);
    }
  }

  /**
   * Format date for datetime-local input
   */
  formatDateForInput(date) {
    return date.toISOString().slice(0, 16);
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const event = new CustomEvent('showNotification', {
      detail: { message, type }
    });
    window.dispatchEvent(event);
  }

  /**
   * Get current active filters
   */
  getActiveFilters() {
    return { ...this.activeFilters };
  }

  /**
   * Set filters programmatically
   */
  setFilters(filters) {
    this.activeFilters = { ...this.activeFilters, ...filters };
    this.updateFilterUI();
    this.applyFilters();
  }

  /**
   * Check if a data item matches current filters
   */
  matchesFilters(dataItem) {
    // Date range check
    if (dataItem.timestamp) {
      const itemDate = new Date(dataItem.timestamp);
      if (itemDate < this.activeFilters.dateRange.start || itemDate > this.activeFilters.dateRange.end) {
        return false;
      }
    }

    // Metric type check
    if (dataItem.type && this.activeFilters.metrics.types.length > 0 && !this.activeFilters.metrics.types.includes('all')) {
      if (!this.activeFilters.metrics.types.includes(dataItem.type)) {
        return false;
      }
    }

    // Endpoint check
    if (dataItem.endpoint && this.activeFilters.metrics.endpoints.length > 0 && !this.activeFilters.metrics.endpoints.includes('all')) {
      if (!this.activeFilters.metrics.endpoints.includes(dataItem.endpoint)) {
        return false;
      }
    }

    // Status code check
    if (dataItem.statusCode && this.activeFilters.metrics.statusCodes.length > 0 && !this.activeFilters.metrics.statusCodes.includes('all')) {
      if (!this.activeFilters.metrics.statusCodes.includes(dataItem.statusCode.toString())) {
        return false;
      }
    }

    return true;
  }

  /**
   * Destroy the filtering system
   */
  destroy() {
    this.subscribers.clear();
    console.log('🗑️ Filtering system destroyed');
  }
}

// Export for use in other modules
export { DashboardFilteringSystem };
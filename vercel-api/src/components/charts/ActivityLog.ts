/**
 * Activity Log Component
 * 
 * Displays recent activity, API calls, publishes, and errors in a timeline
 * format for the PostCrafter dashboard monitoring.
 * 
 * @package PostCrafter
 * @version 1.0.0
 * @since 1.0.0
 */

import { ColorSchemes } from './ChartBase';

export interface ActivityLogEntry {
  id: string;
  timestamp: Date;
  type: 'api_call' | 'publish_success' | 'publish_error' | 'validation_error' | 'auth_error' | 'system_error' | 'user_activity';
  title: string;
  description?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  userId?: string;
  duration?: number;
  metadata?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface ActivityLogOptions {
  theme?: 'light' | 'dark';
  maxEntries?: number;
  showTimestamps?: boolean;
  showDetails?: boolean;
  groupByTime?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  filterTypes?: string[];
  dateFormat?: 'relative' | 'absolute';
  compact?: boolean;
}

export interface ActivityLogFilter {
  types?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  userId?: string;
  endpoint?: string;
  severity?: string[];
}

/**
 * Activity Log Component
 * 
 * Creates and manages an activity timeline display
 */
export class ActivityLog {
  private container: HTMLElement;
  private entries: ActivityLogEntry[] = [];
  private options: ActivityLogOptions;
  private logElement: HTMLElement | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor(container: HTMLElement, options: ActivityLogOptions = {}) {
    this.container = container;
    this.options = {
      theme: 'light',
      maxEntries: 50,
      showTimestamps: true,
      showDetails: true,
      groupByTime: false,
      autoRefresh: false,
      refreshInterval: 30000,
      filterTypes: [],
      dateFormat: 'relative',
      compact: false,
      ...options
    };

    this.initializeActivityLog();
  }

  /**
   * Initialize the activity log
   */
  private initializeActivityLog(): void {
    this.render();

    if (this.options.autoRefresh) {
      this.startAutoRefresh();
    }
  }

  /**
   * Render the activity log
   */
  public render(): void {
    // Remove existing log if it exists
    if (this.logElement) {
      this.logElement.remove();
    }

    // Create log container
    this.logElement = document.createElement('div');
    this.logElement.className = this.getLogClasses();
    this.logElement.style.cssText = this.getLogStyles();

    // Build log content
    const content = this.buildLogContent();
    this.logElement.innerHTML = content;

    // Add to container
    this.container.appendChild(this.logElement);
  }

  /**
   * Get CSS classes for the log
   */
  private getLogClasses(): string {
    const classes = ['activity-log'];
    
    classes.push(`activity-log--${this.options.theme}`);
    
    if (this.options.compact) {
      classes.push('activity-log--compact');
    }

    return classes.join(' ');
  }

  /**
   * Get inline styles for the log
   */
  private getLogStyles(): string {
    const isDark = this.options.theme === 'dark';
    
    return `
      background-color: ${isDark ? '#1F2937' : '#FFFFFF'};
      border: 1px solid ${isDark ? '#374151' : '#E5E7EB'};
      border-radius: 8px;
      padding: 16px;
      max-height: 600px;
      overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
  }

  /**
   * Build the HTML content for the log
   */
  private buildLogContent(): string {
    if (this.entries.length === 0) {
      return this.buildEmptyState();
    }

    const filteredEntries = this.applyFilters(this.entries);
    const groupedEntries = this.options.groupByTime 
      ? this.groupEntriesByTime(filteredEntries)
      : { 'Recent Activity': filteredEntries };

    let content = '';
    
    for (const [groupTitle, entries] of Object.entries(groupedEntries)) {
      if (this.options.groupByTime && entries.length > 0) {
        content += this.buildGroupHeader(groupTitle);
      }
      
      content += entries.map(entry => this.buildLogEntry(entry)).join('');
    }

    return content || this.buildEmptyState();
  }

  /**
   * Build empty state message
   */
  private buildEmptyState(): string {
    const isDark = this.options.theme === 'dark';
    
    return `
      <div class="activity-log__empty" style="
        text-align: center;
        padding: 40px 20px;
        color: ${isDark ? '#9CA3AF' : '#6B7280'};
      ">
        <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
        <div style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">No Activity Yet</div>
        <div style="font-size: 14px; opacity: 0.8;">Activity will appear here as your API receives requests</div>
      </div>
    `;
  }

  /**
   * Build group header for time-grouped entries
   */
  private buildGroupHeader(title: string): string {
    const isDark = this.options.theme === 'dark';
    
    return `
      <div class="activity-log__group-header" style="
        font-size: 12px;
        font-weight: 600;
        color: ${isDark ? '#9CA3AF' : '#6B7280'};
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 20px 0 12px 0;
        padding-bottom: 8px;
        border-bottom: 1px solid ${isDark ? '#374151' : '#E5E7EB'};
      ">
        ${title}
      </div>
    `;
  }

  /**
   * Build individual log entry
   */
  private buildLogEntry(entry: ActivityLogEntry): string {
    const isDark = this.options.theme === 'dark';
    const icon = this.getEntryIcon(entry.type);
    const statusColor = this.getEntryColor(entry.type, entry.statusCode);
    const timeAgo = this.formatTimestamp(entry.timestamp);
    
    const compactClass = this.options.compact ? 'activity-log__entry--compact' : '';
    
    return `
      <div class="activity-log__entry ${compactClass}" style="
        display: flex;
        align-items: flex-start;
        padding: ${this.options.compact ? '8px 0' : '12px 0'};
        border-bottom: 1px solid ${isDark ? '#374151' : '#F3F4F6'};
      ">
        <div class="activity-log__icon" style="
          margin-right: 12px;
          margin-top: 2px;
          font-size: 16px;
          color: ${statusColor};
          min-width: 20px;
        ">
          ${icon}
        </div>
        
        <div class="activity-log__content" style="flex: 1; min-width: 0;">
          <div class="activity-log__title" style="
            font-size: ${this.options.compact ? '13px' : '14px'};
            font-weight: 500;
            color: ${isDark ? '#F9FAFB' : '#111827'};
            margin-bottom: 2px;
            line-height: 1.4;
          ">
            ${entry.title}
          </div>
          
          ${this.buildEntryDescription(entry)}
          ${this.buildEntryDetails(entry)}
        </div>
        
        ${this.buildEntryTimestamp(entry, timeAgo)}
      </div>
    `;
  }

  /**
   * Build entry description
   */
  private buildEntryDescription(entry: ActivityLogEntry): string {
    if (!entry.description || this.options.compact) return '';
    
    const isDark = this.options.theme === 'dark';
    
    return `
      <div class="activity-log__description" style="
        font-size: 13px;
        color: ${isDark ? '#D1D5DB' : '#374151'};
        margin-bottom: 4px;
        line-height: 1.3;
      ">
        ${entry.description}
      </div>
    `;
  }

  /**
   * Build entry details (endpoint, method, duration, etc.)
   */
  private buildEntryDetails(entry: ActivityLogEntry): string {
    if (!this.options.showDetails) return '';
    
    const isDark = this.options.theme === 'dark';
    const details: string[] = [];
    
    if (entry.endpoint) {
      details.push(`<span style="color: ${ColorSchemes.default.primary};">${entry.method || 'GET'}</span> ${entry.endpoint}`);
    }
    
    if (entry.statusCode) {
      const statusColor = this.getStatusCodeColor(entry.statusCode);
      details.push(`<span style="color: ${statusColor};">${entry.statusCode}</span>`);
    }
    
    if (entry.duration) {
      details.push(`${entry.duration}ms`);
    }
    
    if (entry.userId) {
      details.push(`User: ${entry.userId}`);
    }
    
    if (details.length === 0) return '';
    
    return `
      <div class="activity-log__details" style="
        font-size: 11px;
        color: ${isDark ? '#9CA3AF' : '#6B7280'};
        margin-top: 4px;
        font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
      ">
        ${details.join(' • ')}
      </div>
    `;
  }

  /**
   * Build entry timestamp
   */
  private buildEntryTimestamp(entry: ActivityLogEntry, timeAgo: string): string {
    if (!this.options.showTimestamps) return '';
    
    const isDark = this.options.theme === 'dark';
    
    return `
      <div class="activity-log__timestamp" style="
        font-size: 11px;
        color: ${isDark ? '#9CA3AF' : '#6B7280'};
        margin-left: 12px;
        white-space: nowrap;
        margin-top: 2px;
      ">
        ${timeAgo}
      </div>
    `;
  }

  /**
   * Get icon for entry type
   */
  private getEntryIcon(type: string): string {
    const icons: Record<string, string> = {
      'api_call': '🔄',
      'publish_success': '✅',
      'publish_error': '❌',
      'validation_error': '⚠️',
      'auth_error': '🔒',
      'system_error': '💥',
      'user_activity': '👤'
    };
    
    return icons[type] || '📊';
  }

  /**
   * Get color for entry type and status
   */
  private getEntryColor(type: string, statusCode?: number): string {
    if (statusCode) {
      return this.getStatusCodeColor(statusCode);
    }
    
    const colors: Record<string, string> = {
      'api_call': ColorSchemes.default.info,
      'publish_success': ColorSchemes.default.success,
      'publish_error': ColorSchemes.default.error,
      'validation_error': ColorSchemes.default.warning,
      'auth_error': ColorSchemes.default.error,
      'system_error': ColorSchemes.default.error,
      'user_activity': ColorSchemes.default.primary
    };
    
    return colors[type] || ColorSchemes.default.muted;
  }

  /**
   * Get color for HTTP status code
   */
  private getStatusCodeColor(statusCode: number): string {
    if (statusCode >= 200 && statusCode < 300) {
      return ColorSchemes.default.success;
    } else if (statusCode >= 400 && statusCode < 500) {
      return ColorSchemes.default.warning;
    } else if (statusCode >= 500) {
      return ColorSchemes.default.error;
    }
    return ColorSchemes.default.muted;
  }

  /**
   * Format timestamp based on options
   */
  private formatTimestamp(timestamp: Date): string {
    if (this.options.dateFormat === 'absolute') {
      return timestamp.toLocaleString();
    }
    
    // Relative time formatting
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSeconds < 60) {
      return 'just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return timestamp.toLocaleDateString();
    }
  }

  /**
   * Group entries by time periods
   */
  private groupEntriesByTime(entries: ActivityLogEntry[]): Record<string, ActivityLogEntry[]> {
    const groups: Record<string, ActivityLogEntry[]> = {};
    const now = new Date();
    
    entries.forEach(entry => {
      const diffMs = now.getTime() - entry.timestamp.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      let groupKey: string;
      if (diffHours < 1) {
        groupKey = 'Last Hour';
      } else if (diffHours < 24) {
        groupKey = 'Today';
      } else if (diffHours < 48) {
        groupKey = 'Yesterday';
      } else if (diffHours < 168) { // 7 days
        groupKey = 'This Week';
      } else {
        groupKey = 'Older';
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(entry);
    });
    
    return groups;
  }

  /**
   * Apply filters to entries
   */
  private applyFilters(entries: ActivityLogEntry[]): ActivityLogEntry[] {
    let filtered = [...entries];
    
    // Filter by types
    if (this.options.filterTypes && this.options.filterTypes.length > 0) {
      filtered = filtered.filter(entry => this.options.filterTypes!.includes(entry.type));
    }
    
    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Limit entries
    if (this.options.maxEntries) {
      filtered = filtered.slice(0, this.options.maxEntries);
    }
    
    return filtered;
  }

  /**
   * Add new entry to the log
   */
  public addEntry(entry: ActivityLogEntry): void {
    this.entries.unshift(entry);
    
    // Maintain max entries limit
    if (this.options.maxEntries && this.entries.length > this.options.maxEntries * 2) {
      this.entries = this.entries.slice(0, this.options.maxEntries);
    }
    
    this.render();
  }

  /**
   * Add multiple entries
   */
  public addEntries(entries: ActivityLogEntry[]): void {
    this.entries.unshift(...entries);
    
    // Sort by timestamp
    this.entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Maintain max entries limit
    if (this.options.maxEntries && this.entries.length > this.options.maxEntries * 2) {
      this.entries = this.entries.slice(0, this.options.maxEntries);
    }
    
    this.render();
  }

  /**
   * Clear all entries
   */
  public clearEntries(): void {
    this.entries = [];
    this.render();
  }

  /**
   * Update options
   */
  public updateOptions(options: Partial<ActivityLogOptions>): void {
    this.options = { ...this.options, ...options };
    
    if (options.autoRefresh !== undefined) {
      if (options.autoRefresh) {
        this.startAutoRefresh();
      } else {
        this.stopAutoRefresh();
      }
    }
    
    this.render();
  }

  /**
   * Start auto refresh
   */
  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    
    this.refreshTimer = setInterval(() => {
      this.render();
    }, this.options.refreshInterval);
  }

  /**
   * Stop auto refresh
   */
  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Destroy the activity log
   */
  public destroy(): void {
    this.stopAutoRefresh();
    
    if (this.logElement) {
      this.logElement.remove();
      this.logElement = null;
    }
  }

  /**
   * Get current entries
   */
  public getEntries(): ActivityLogEntry[] {
    return [...this.entries];
  }

  /**
   * Create preset activity logs for common use cases
   */
  public static createApiActivityLog(container: HTMLElement, options: Partial<ActivityLogOptions> = {}): ActivityLog {
    return new ActivityLog(container, {
      maxEntries: 30,
      showTimestamps: true,
      showDetails: true,
      filterTypes: ['api_call', 'publish_success', 'publish_error'],
      ...options
    });
  }

  public static createErrorLog(container: HTMLElement, options: Partial<ActivityLogOptions> = {}): ActivityLog {
    return new ActivityLog(container, {
      maxEntries: 20,
      filterTypes: ['publish_error', 'validation_error', 'auth_error', 'system_error'],
      compact: true,
      ...options
    });
  }

  public static createUserActivityLog(container: HTMLElement, options: Partial<ActivityLogOptions> = {}): ActivityLog {
    return new ActivityLog(container, {
      maxEntries: 25,
      filterTypes: ['user_activity', 'publish_success'],
      groupByTime: true,
      ...options
    });
  }
}
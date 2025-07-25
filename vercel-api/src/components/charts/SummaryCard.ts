/**
 * Summary Card Component
 * 
 * Displays key metrics and KPIs in card format for the PostCrafter dashboard,
 * including totals, percentages, trends, and status indicators.
 * 
 * @package PostCrafter
 * @version 1.0.0
 * @since 1.0.0
 */

import { ColorSchemes } from './ChartBase';

export interface SummaryCardData {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
    period: string;
  };
  status?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  icon?: string;
  unit?: string;
  format?: 'number' | 'percentage' | 'currency' | 'duration' | 'bytes' | 'custom';
  target?: number;
  threshold?: {
    warning: number;
    error: number;
  };
}

export interface SummaryCardOptions {
  theme?: 'light' | 'dark';
  size?: 'small' | 'medium' | 'large';
  showTrend?: boolean;
  showProgress?: boolean;
  showIcon?: boolean;
  animate?: boolean;
  clickable?: boolean;
  colorScheme?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export interface SummaryCardStyle {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  accentColor: string;
  shadowColor: string;
}

/**
 * Summary Card Component
 * 
 * Creates and manages summary metric cards with various display options
 */
export class SummaryCard {
  private container: HTMLElement;
  private data: SummaryCardData;
  private options: SummaryCardOptions;
  private cardElement: HTMLElement | null = null;

  constructor(container: HTMLElement, data: SummaryCardData, options: SummaryCardOptions = {}) {
    this.container = container;
    this.data = data;
    this.options = {
      theme: 'light',
      size: 'medium',
      showTrend: true,
      showProgress: false,
      showIcon: true,
      animate: true,
      clickable: false,
      colorScheme: 'default',
      ...options
    };

    this.render();
  }

  /**
   * Render the summary card
   */
  public render(): void {
    // Remove existing card if it exists
    if (this.cardElement) {
      this.cardElement.remove();
    }

    // Create card element
    this.cardElement = document.createElement('div');
    this.cardElement.className = this.getCardClasses();
    this.cardElement.style.cssText = this.getCardStyles();

    // Build card content
    const content = this.buildCardContent();
    this.cardElement.innerHTML = content;

    // Add event listeners
    if (this.options.clickable) {
      this.cardElement.addEventListener('click', this.handleClick.bind(this));
      this.cardElement.style.cursor = 'pointer';
    }

    // Add to container
    this.container.appendChild(this.cardElement);

    // Apply animations
    if (this.options.animate) {
      this.animateIn();
    }
  }

  /**
   * Get CSS classes for the card
   */
  private getCardClasses(): string {
    const classes = ['summary-card'];
    
    classes.push(`summary-card--${this.options.size}`);
    classes.push(`summary-card--${this.options.theme}`);
    
    if (this.data.status) {
      classes.push(`summary-card--${this.data.status}`);
    }
    
    if (this.options.clickable) {
      classes.push('summary-card--clickable');
    }

    return classes.join(' ');
  }

  /**
   * Get inline styles for the card
   */
  private getCardStyles(): string {
    const style = this.getCardStyleConfig();
    
    return `
      background-color: ${style.backgroundColor};
      border: 1px solid ${style.borderColor};
      border-radius: 12px;
      padding: ${this.getPadding()};
      box-shadow: 0 1px 3px ${style.shadowColor};
      transition: all 0.2s ease-in-out;
      position: relative;
      overflow: hidden;
    `;
  }

  /**
   * Get padding based on card size
   */
  private getPadding(): string {
    switch (this.options.size) {
      case 'small':
        return '16px';
      case 'large':
        return '32px';
      default:
        return '24px';
    }
  }

  /**
   * Get style configuration based on theme and status
   */
  private getCardStyleConfig(): SummaryCardStyle {
    const isDark = this.options.theme === 'dark';
    const status = this.data.status || 'neutral';

    const baseStyle: SummaryCardStyle = {
      backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
      borderColor: isDark ? '#374151' : '#E5E7EB',
      textColor: isDark ? '#F9FAFB' : '#111827',
      accentColor: ColorSchemes.default.primary,
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)'
    };

    // Apply status-specific colors
    switch (status) {
      case 'success':
        baseStyle.accentColor = ColorSchemes.default.success;
        baseStyle.borderColor = ColorSchemes.default.success + '40';
        break;
      case 'warning':
        baseStyle.accentColor = ColorSchemes.default.warning;
        baseStyle.borderColor = ColorSchemes.default.warning + '40';
        break;
      case 'error':
        baseStyle.accentColor = ColorSchemes.default.error;
        baseStyle.borderColor = ColorSchemes.default.error + '40';
        break;
      case 'info':
        baseStyle.accentColor = ColorSchemes.default.info;
        baseStyle.borderColor = ColorSchemes.default.info + '40';
        break;
    }

    return baseStyle;
  }

  /**
   * Build the HTML content for the card
   */
  private buildCardContent(): string {
    const style = this.getCardStyleConfig();
    
    return `
      <div class="summary-card__header">
        ${this.buildIcon()}
        <div class="summary-card__title" style="color: ${style.textColor}; opacity: 0.8; font-size: 14px; font-weight: 500; margin: 0;">
          ${this.data.title}
        </div>
      </div>
      
      <div class="summary-card__body" style="margin: 12px 0;">
        <div class="summary-card__value" style="color: ${style.textColor}; font-size: ${this.getValueFontSize()}; font-weight: 700; margin: 0;">
          ${this.formatValue()}
        </div>
        ${this.buildSubtitle()}
        ${this.buildProgress()}
      </div>
      
      ${this.buildFooter()}
    `;
  }

  /**
   * Build icon element if enabled
   */
  private buildIcon(): string {
    if (!this.options.showIcon || !this.data.icon) return '';
    
    const style = this.getCardStyleConfig();
    
    return `
      <div class="summary-card__icon" style="
        position: absolute; 
        top: 20px; 
        right: 20px; 
        color: ${style.accentColor}; 
        opacity: 0.6;
        font-size: 24px;
      ">
        ${this.data.icon}
      </div>
    `;
  }

  /**
   * Build subtitle element if provided
   */
  private buildSubtitle(): string {
    if (!this.data.subtitle) return '';
    
    const style = this.getCardStyleConfig();
    
    return `
      <div class="summary-card__subtitle" style="
        color: ${style.textColor}; 
        opacity: 0.6; 
        font-size: 12px; 
        margin-top: 4px;
      ">
        ${this.data.subtitle}
      </div>
    `;
  }

  /**
   * Build progress bar if enabled and target is provided
   */
  private buildProgress(): string {
    if (!this.options.showProgress || !this.data.target) return '';
    
    const value = typeof this.data.value === 'number' ? this.data.value : 0;
    const percentage = Math.min((value / this.data.target) * 100, 100);
    const style = this.getCardStyleConfig();
    
    return `
      <div class="summary-card__progress" style="margin-top: 12px;">
        <div class="summary-card__progress-bar" style="
          width: 100%; 
          height: 6px; 
          background-color: ${style.textColor}20; 
          border-radius: 3px; 
          overflow: hidden;
        ">
          <div class="summary-card__progress-fill" style="
            width: ${percentage}%; 
            height: 100%; 
            background-color: ${style.accentColor}; 
            transition: width 0.3s ease-in-out;
          "></div>
        </div>
        <div class="summary-card__progress-text" style="
          font-size: 11px; 
          color: ${style.textColor}; 
          opacity: 0.6; 
          margin-top: 4px;
        ">
          ${value.toLocaleString()} / ${this.data.target.toLocaleString()} (${percentage.toFixed(1)}%)
        </div>
      </div>
    `;
  }

  /**
   * Build footer with trend information
   */
  private buildFooter(): string {
    if (!this.options.showTrend || !this.data.trend) return '';
    
    const style = this.getCardStyleConfig();
    const trend = this.data.trend;
    const trendColor = this.getTrendColor(trend.direction);
    const trendIcon = this.getTrendIcon(trend.direction);
    
    return `
      <div class="summary-card__footer" style="
        display: flex; 
        align-items: center; 
        margin-top: 16px; 
        padding-top: 16px; 
        border-top: 1px solid ${style.borderColor};
      ">
        <span class="summary-card__trend-icon" style="
          color: ${trendColor}; 
          margin-right: 6px; 
          font-size: 14px;
        ">
          ${trendIcon}
        </span>
        <span class="summary-card__trend-value" style="
          color: ${trendColor}; 
          font-weight: 600; 
          font-size: 13px; 
          margin-right: 6px;
        ">
          ${Math.abs(trend.value)}%
        </span>
        <span class="summary-card__trend-period" style="
          color: ${style.textColor}; 
          opacity: 0.6; 
          font-size: 13px;
        ">
          ${trend.period}
        </span>
      </div>
    `;
  }

  /**
   * Get font size for value based on card size
   */
  private getValueFontSize(): string {
    switch (this.options.size) {
      case 'small':
        return '24px';
      case 'large':
        return '36px';
      default:
        return '30px';
    }
  }

  /**
   * Format the display value based on type and format
   */
  private formatValue(): string {
    if (typeof this.data.value === 'string') {
      return this.data.value;
    }

    const value = this.data.value;
    const unit = this.data.unit || '';

    switch (this.data.format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'currency':
        return `$${value.toLocaleString()}`;
      case 'duration':
        return this.formatDuration(value);
      case 'bytes':
        return this.formatBytes(value);
      case 'number':
      default:
        return `${this.formatNumber(value)}${unit ? ' ' + unit : ''}`;
    }
  }

  /**
   * Format number with appropriate suffixes
   */
  private formatNumber(value: number): string {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toLocaleString();
  }

  /**
   * Format duration in milliseconds
   */
  private formatDuration(ms: number): string {
    if (ms >= 1000) {
      return (ms / 1000).toFixed(1) + 's';
    }
    return ms.toFixed(0) + 'ms';
  }

  /**
   * Format bytes with appropriate units
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)}${units[unitIndex]}`;
  }

  /**
   * Get color for trend direction
   */
  private getTrendColor(direction: 'up' | 'down' | 'stable'): string {
    switch (direction) {
      case 'up':
        return ColorSchemes.default.success;
      case 'down':
        return ColorSchemes.default.error;
      case 'stable':
      default:
        return ColorSchemes.default.muted;
    }
  }

  /**
   * Get icon for trend direction
   */
  private getTrendIcon(direction: 'up' | 'down' | 'stable'): string {
    switch (direction) {
      case 'up':
        return '↗';
      case 'down':
        return '↘';
      case 'stable':
      default:
        return '→';
    }
  }

  /**
   * Handle card click event
   */
  private handleClick(): void {
    // Emit custom event for card interaction
    const event = new CustomEvent('summaryCardClick', {
      detail: {
        data: this.data,
        cardElement: this.cardElement
      }
    });
    this.container.dispatchEvent(event);
  }

  /**
   * Animate card entrance
   */
  private animateIn(): void {
    if (!this.cardElement) return;

    this.cardElement.style.opacity = '0';
    this.cardElement.style.transform = 'translateY(20px)';

    requestAnimationFrame(() => {
      if (this.cardElement) {
        this.cardElement.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
        this.cardElement.style.opacity = '1';
        this.cardElement.style.transform = 'translateY(0)';
      }
    });
  }

  /**
   * Update card data
   */
  public updateData(newData: Partial<SummaryCardData>): void {
    this.data = { ...this.data, ...newData };
    this.render();
  }

  /**
   * Update card options
   */
  public updateOptions(newOptions: Partial<SummaryCardOptions>): void {
    this.options = { ...this.options, ...newOptions };
    this.render();
  }

  /**
   * Destroy the card
   */
  public destroy(): void {
    if (this.cardElement) {
      this.cardElement.remove();
      this.cardElement = null;
    }
  }

  /**
   * Get card element
   */
  public getElement(): HTMLElement | null {
    return this.cardElement;
  }

  /**
   * Create preset summary cards for common metrics
   */
  public static createApiCallsCard(container: HTMLElement, data: Partial<SummaryCardData> = {}): SummaryCard {
    return new SummaryCard(container, {
      title: 'Total API Calls',
      value: 0,
      format: 'number',
      icon: '📊',
      status: 'info',
      ...data
    });
  }

  public static createSuccessRateCard(container: HTMLElement, data: Partial<SummaryCardData> = {}): SummaryCard {
    return new SummaryCard(container, {
      title: 'Success Rate',
      value: 0,
      format: 'percentage',
      icon: '✅',
      status: 'success',
      ...data
    });
  }

  public static createErrorRateCard(container: HTMLElement, data: Partial<SummaryCardData> = {}): SummaryCard {
    return new SummaryCard(container, {
      title: 'Error Rate',
      value: 0,
      format: 'percentage',
      icon: '❌',
      status: 'error',
      ...data
    });
  }

  public static createResponseTimeCard(container: HTMLElement, data: Partial<SummaryCardData> = {}): SummaryCard {
    return new SummaryCard(container, {
      title: 'Avg Response Time',
      value: 0,
      format: 'duration',
      icon: '⚡',
      status: 'info',
      ...data
    });
  }

  public static createPublishesCard(container: HTMLElement, data: Partial<SummaryCardData> = {}): SummaryCard {
    return new SummaryCard(container, {
      title: 'Successful Publishes',
      value: 0,
      format: 'number',
      icon: '📝',
      status: 'success',
      ...data
    });
  }

  public static createUptimeCard(container: HTMLElement, data: Partial<SummaryCardData> = {}): SummaryCard {
    return new SummaryCard(container, {
      title: 'Uptime',
      value: 0,
      format: 'percentage',
      icon: '🟢',
      status: 'success',
      ...data
    });
  }
}
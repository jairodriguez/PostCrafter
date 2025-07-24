/**
 * Base Chart Component
 * 
 * Provides common functionality and configuration for all chart types
 * in the PostCrafter monitoring and analytics dashboard.
 * 
 * @package PostCrafter
 * @version 1.0.0
 * @since 1.0.0
 */

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
  ArcElement,
  RadialLinearScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
  ArcElement,
  RadialLinearScale
);

// Types for chart configuration
export interface ChartConfig {
  responsive: boolean;
  maintainAspectRatio: boolean;
  plugins: {
    title?: {
      display: boolean;
      text: string;
      font?: {
        size: number;
        weight: string;
      };
      color?: string;
    };
    legend?: {
      display: boolean;
      position: 'top' | 'bottom' | 'left' | 'right';
      labels?: {
        usePointStyle?: boolean;
        padding?: number;
        font?: {
          size: number;
        };
      };
    };
    tooltip?: {
      enabled: boolean;
      mode: 'index' | 'nearest' | 'point' | 'dataset';
      intersect: boolean;
      backgroundColor?: string;
      titleColor?: string;
      bodyColor?: string;
      borderColor?: string;
      borderWidth?: number;
      cornerRadius?: number;
      displayColors?: boolean;
      callbacks?: any;
    };
  };
  scales?: any;
  animation?: {
    duration: number;
    easing: string;
  };
  interaction?: {
    mode: 'index' | 'nearest' | 'point' | 'dataset';
    intersect: boolean;
  };
}

export interface ChartDataset {
  label: string;
  data: any[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
  borderDash?: number[];
  hoverBackgroundColor?: string | string[];
  hoverBorderColor?: string | string[];
}

export interface ChartData {
  labels: string[] | Date[];
  datasets: ChartDataset[];
}

export interface ChartOptions {
  title?: string;
  height?: number;
  width?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  animate?: boolean;
  responsive?: boolean;
  theme?: 'light' | 'dark';
  colorScheme?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

/**
 * Color schemes for different chart themes
 */
export const ColorSchemes = {
  default: {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#06B6D4',
    muted: '#6B7280'
  },
  gradients: {
    primary: ['rgba(59, 130, 246, 0.8)', 'rgba(59, 130, 246, 0.1)'],
    secondary: ['rgba(139, 92, 246, 0.8)', 'rgba(139, 92, 246, 0.1)'],
    success: ['rgba(16, 185, 129, 0.8)', 'rgba(16, 185, 129, 0.1)'],
    warning: ['rgba(245, 158, 11, 0.8)', 'rgba(245, 158, 11, 0.1)'],
    error: ['rgba(239, 68, 68, 0.8)', 'rgba(239, 68, 68, 0.1)'],
    info: ['rgba(6, 182, 212, 0.8)', 'rgba(6, 182, 212, 0.1)']
  }
};

/**
 * Base Chart Class
 * 
 * Provides common functionality for all chart components
 */
export abstract class ChartBase {
  protected canvas: HTMLCanvasElement;
  protected chart: ChartJS | null = null;
  protected options: ChartOptions;
  protected config: ChartConfig;

  constructor(canvas: HTMLCanvasElement, options: ChartOptions = {}) {
    this.canvas = canvas;
    this.options = {
      responsive: true,
      animate: true,
      showLegend: true,
      showTooltip: true,
      theme: 'light',
      colorScheme: 'default',
      ...options
    };
    
    this.config = this.createBaseConfig();
  }

  /**
   * Create base configuration for all charts
   */
  protected createBaseConfig(): ChartConfig {
    return {
      responsive: this.options.responsive !== false,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: !!this.options.title,
          text: this.options.title || '',
          font: {
            size: 16,
            weight: 'bold'
          },
          color: this.options.theme === 'dark' ? '#F9FAFB' : '#111827'
        },
        legend: {
          display: this.options.showLegend !== false,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          enabled: this.options.showTooltip !== false,
          mode: 'index',
          intersect: false,
          backgroundColor: this.options.theme === 'dark' ? '#374151' : '#FFFFFF',
          titleColor: this.options.theme === 'dark' ? '#F9FAFB' : '#111827',
          bodyColor: this.options.theme === 'dark' ? '#D1D5DB' : '#374151',
          borderColor: this.options.theme === 'dark' ? '#6B7280' : '#E5E7EB',
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: true
        }
      },
      animation: {
        duration: this.options.animate !== false ? 750 : 0,
        easing: 'easeInOutQuart'
      },
      interaction: {
        mode: 'index',
        intersect: false
      }
    };
  }

  /**
   * Get color for dataset based on color scheme
   */
  protected getColor(type: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'muted', opacity: number = 1): string {
    const colors = ColorSchemes.default;
    const color = colors[type];
    
    if (opacity === 1) {
      return color;
    }
    
    // Convert hex to rgba
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  /**
   * Get gradient colors for area charts
   */
  protected getGradient(type: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'): string[] {
    return ColorSchemes.gradients[type];
  }

  /**
   * Create gradient for canvas
   */
  protected createCanvasGradient(colors: string[], direction: 'vertical' | 'horizontal' = 'vertical'): CanvasGradient {
    const ctx = this.canvas.getContext('2d')!;
    const gradient = direction === 'vertical'
      ? ctx.createLinearGradient(0, 0, 0, this.canvas.height)
      : ctx.createLinearGradient(0, 0, this.canvas.width, 0);
    
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1]);
    
    return gradient;
  }

  /**
   * Format number for display
   */
  protected formatNumber(value: number): string {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  }

  /**
   * Format duration in milliseconds to readable format
   */
  protected formatDuration(ms: number): string {
    if (ms >= 1000) {
      return (ms / 1000).toFixed(1) + 's';
    }
    return ms.toFixed(0) + 'ms';
  }

  /**
   * Format percentage
   */
  protected formatPercentage(value: number): string {
    return value.toFixed(1) + '%';
  }

  /**
   * Update chart data
   */
  public updateData(data: ChartData): void {
    if (!this.chart) return;
    
    this.chart.data = data;
    this.chart.update('active');
  }

  /**
   * Update chart options
   */
  public updateOptions(options: Partial<ChartOptions>): void {
    this.options = { ...this.options, ...options };
    this.config = this.createBaseConfig();
    
    if (this.chart) {
      this.chart.options = this.config as any;
      this.chart.update('active');
    }
  }

  /**
   * Resize chart
   */
  public resize(): void {
    if (this.chart) {
      this.chart.resize();
    }
  }

  /**
   * Destroy chart
   */
  public destroy(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  /**
   * Get chart instance
   */
  public getChart(): ChartJS | null {
    return this.chart;
  }

  /**
   * Check if chart is initialized
   */
  public isInitialized(): boolean {
    return this.chart !== null;
  }

  /**
   * Abstract method to be implemented by specific chart types
   */
  public abstract render(data: ChartData): void;

  /**
   * Abstract method to get chart type
   */
  public abstract getType(): string;
}

/**
 * Utility functions for chart data processing
 */
export class ChartUtils {
  
  /**
   * Aggregate data by time periods
   */
  static aggregateByTime(
    data: Array<{ timestamp: Date; value: number }>,
    period: 'hour' | 'day' | 'week' | 'month'
  ): Array<{ label: string; value: number }> {
    const groups = new Map<string, number>();
    
    data.forEach(item => {
      let key: string;
      const date = new Date(item.timestamp);
      
      switch (period) {
        case 'hour':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
          break;
        case 'day':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          break;
        case 'week':
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
          key = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
          break;
        case 'month':
          key = `${date.getFullYear()}-${date.getMonth()}`;
          break;
      }
      
      groups.set(key, (groups.get(key) || 0) + item.value);
    });
    
    return Array.from(groups.entries()).map(([key, value]) => ({
      label: key,
      value
    }));
  }

  /**
   * Calculate moving average
   */
  static calculateMovingAverage(data: number[], windowSize: number): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const end = i + 1;
      const window = data.slice(start, end);
      const average = window.reduce((sum, val) => sum + val, 0) / window.length;
      result.push(average);
    }
    
    return result;
  }

  /**
   * Generate time series labels
   */
  static generateTimeLabels(
    start: Date,
    end: Date,
    interval: 'minute' | 'hour' | 'day' | 'week' | 'month'
  ): Date[] {
    const labels: Date[] = [];
    const current = new Date(start);
    
    while (current <= end) {
      labels.push(new Date(current));
      
      switch (interval) {
        case 'minute':
          current.setMinutes(current.getMinutes() + 1);
          break;
        case 'hour':
          current.setHours(current.getHours() + 1);
          break;
        case 'day':
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }
    
    return labels;
  }

  /**
   * Convert metrics data to chart format
   */
  static formatMetricsForChart(
    events: Array<any>,
    groupBy: 'hour' | 'day' | 'week' = 'hour'
  ): ChartData {
    const timeGroups = new Map<string, number>();
    
    events.forEach(event => {
      const date = new Date(event.timestamp);
      let key: string;
      
      switch (groupBy) {
        case 'hour':
          key = date.toISOString().substr(0, 13) + ':00:00Z';
          break;
        case 'day':
          key = date.toISOString().substr(0, 10) + 'T00:00:00Z';
          break;
        case 'week':
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
          key = weekStart.toISOString().substr(0, 10) + 'T00:00:00Z';
          break;
        default:
          key = date.toISOString();
      }
      
      timeGroups.set(key, (timeGroups.get(key) || 0) + 1);
    });
    
    const sortedEntries = Array.from(timeGroups.entries()).sort(([a], [b]) => 
      new Date(a).getTime() - new Date(b).getTime()
    );
    
    return {
      labels: sortedEntries.map(([timestamp]) => new Date(timestamp)),
      datasets: [{
        label: 'Events',
        data: sortedEntries.map(([, count]) => count),
        backgroundColor: ColorSchemes.default.primary,
        borderColor: ColorSchemes.default.primary,
        borderWidth: 2,
        fill: false,
        tension: 0.4
      }]
    };
  }
}
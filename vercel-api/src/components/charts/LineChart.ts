/**
 * Line Chart Component
 * 
 * Displays time-series data such as API usage over time, response times,
 * and other continuous metrics for the PostCrafter dashboard.
 * 
 * @package PostCrafter
 * @version 1.0.0
 * @since 1.0.0
 */

import { Chart as ChartJS } from 'chart.js';
import { ChartBase, ChartData, ChartOptions, ChartDataset } from './ChartBase';

export interface LineChartOptions extends ChartOptions {
  fill?: boolean;
  tension?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
  showArea?: boolean;
  stacked?: boolean;
  yAxisLabel?: string;
  xAxisLabel?: string;
  showGrid?: boolean;
  timeFormat?: string;
  stepSize?: number;
  beginAtZero?: boolean;
}

export interface LineChartDataset extends ChartDataset {
  fill?: boolean;
  tension?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
  borderDash?: number[];
}

export interface LineChartData extends ChartData {
  datasets: LineChartDataset[];
}

/**
 * Line Chart Component
 * 
 * Specialized chart for displaying time-series and continuous data
 */
export class LineChart extends ChartBase {
  private lineOptions: LineChartOptions;

  constructor(canvas: HTMLCanvasElement, options: LineChartOptions = {}) {
    super(canvas, options);
    
    this.lineOptions = {
      fill: false,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 6,
      showArea: false,
      stacked: false,
      showGrid: true,
      timeFormat: 'MMM dd, HH:mm',
      beginAtZero: true,
      ...options
    };

    this.updateLineConfig();
  }

  /**
   * Update configuration specific to line charts
   */
  private updateLineConfig(): void {
    // Configure scales for time-series data
    this.config.scales = {
      x: {
        type: 'time',
        time: {
          displayFormats: {
            hour: 'HH:mm',
            day: 'MMM dd',
            week: 'MMM dd',
            month: 'MMM yyyy'
          },
          tooltipFormat: this.lineOptions.timeFormat
        },
        display: true,
        title: {
          display: !!this.lineOptions.xAxisLabel,
          text: this.lineOptions.xAxisLabel || '',
          color: this.options.theme === 'dark' ? '#D1D5DB' : '#374151',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          display: this.lineOptions.showGrid !== false,
          color: this.options.theme === 'dark' ? '#374151' : '#E5E7EB',
          borderColor: this.options.theme === 'dark' ? '#6B7280' : '#D1D5DB'
        },
        ticks: {
          color: this.options.theme === 'dark' ? '#9CA3AF' : '#6B7280',
          font: {
            size: 11
          }
        }
      },
      y: {
        type: 'linear',
        display: true,
        beginAtZero: this.lineOptions.beginAtZero !== false,
        stacked: this.lineOptions.stacked === true,
        title: {
          display: !!this.lineOptions.yAxisLabel,
          text: this.lineOptions.yAxisLabel || '',
          color: this.options.theme === 'dark' ? '#D1D5DB' : '#374151',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          display: this.lineOptions.showGrid !== false,
          color: this.options.theme === 'dark' ? '#374151' : '#E5E7EB',
          borderColor: this.options.theme === 'dark' ? '#6B7280' : '#D1D5DB'
        },
        ticks: {
          color: this.options.theme === 'dark' ? '#9CA3AF' : '#6B7280',
          font: {
            size: 11
          },
          stepSize: this.lineOptions.stepSize,
          callback: (value: any) => {
            if (typeof value === 'number') {
              return this.formatNumber(value);
            }
            return value;
          }
        }
      }
    };

    // Configure tooltips for line charts
    if (this.config.plugins?.tooltip) {
      this.config.plugins.tooltip.callbacks = {
        title: (context: any) => {
          const date = new Date(context[0].label);
          return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        },
        label: (context: any) => {
          const label = context.dataset.label || '';
          const value = context.parsed.y;
          return `${label}: ${this.formatNumber(value)}`;
        }
      };
    }
  }

  /**
   * Render the line chart with data
   */
  public render(data: LineChartData): void {
    // Process datasets to apply line chart specific styling
    const processedDatasets = data.datasets.map((dataset, index) => {
      const colorType = this.getDatasetColorType(index);
      const baseColor = this.getColor(colorType);
      const fillColor = this.getColor(colorType, 0.1);

      return {
        ...dataset,
        type: 'line' as const,
        fill: this.lineOptions.showArea ? 'origin' : (dataset.fill ?? this.lineOptions.fill),
        tension: dataset.tension ?? this.lineOptions.tension,
        pointRadius: dataset.pointRadius ?? this.lineOptions.pointRadius,
        pointHoverRadius: dataset.pointHoverRadius ?? this.lineOptions.pointHoverRadius,
        backgroundColor: this.lineOptions.showArea ? fillColor : (dataset.backgroundColor || baseColor),
        borderColor: dataset.borderColor || baseColor,
        borderWidth: dataset.borderWidth || 2,
        pointBackgroundColor: baseColor,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: baseColor,
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 3
      };
    });

    const chartData = {
      labels: data.labels,
      datasets: processedDatasets
    };

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new ChartJS(this.canvas, {
      type: 'line',
      data: chartData,
      options: this.config as any
    });
  }

  /**
   * Get appropriate color type for dataset index
   */
  private getDatasetColorType(index: number): 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' {
    const colors: Array<'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = [
      'primary', 'secondary', 'success', 'warning', 'error', 'info'
    ];
    return colors[index % colors.length];
  }

  /**
   * Add a new dataset to the chart
   */
  public addDataset(dataset: LineChartDataset): void {
    if (!this.chart) return;

    const colorType = this.getDatasetColorType(this.chart.data.datasets.length);
    const baseColor = this.getColor(colorType);
    const fillColor = this.getColor(colorType, 0.1);

    const processedDataset = {
      ...dataset,
      type: 'line' as const,
      backgroundColor: this.lineOptions.showArea ? fillColor : (dataset.backgroundColor || baseColor),
      borderColor: dataset.borderColor || baseColor,
      borderWidth: dataset.borderWidth || 2,
      fill: this.lineOptions.showArea ? 'origin' : (dataset.fill ?? this.lineOptions.fill),
      tension: dataset.tension ?? this.lineOptions.tension,
      pointRadius: dataset.pointRadius ?? this.lineOptions.pointRadius,
      pointHoverRadius: dataset.pointHoverRadius ?? this.lineOptions.pointHoverRadius
    };

    this.chart.data.datasets.push(processedDataset);
    this.chart.update('active');
  }

  /**
   * Remove a dataset from the chart
   */
  public removeDataset(index: number): void {
    if (!this.chart || index < 0 || index >= this.chart.data.datasets.length) return;

    this.chart.data.datasets.splice(index, 1);
    this.chart.update('active');
  }

  /**
   * Update line chart specific options
   */
  public updateLineOptions(options: Partial<LineChartOptions>): void {
    this.lineOptions = { ...this.lineOptions, ...options };
    this.updateLineConfig();
    
    if (this.chart) {
      this.chart.options = this.config as any;
      this.chart.update('active');
    }
  }

  /**
   * Enable or disable area fill
   */
  public toggleAreaFill(enabled: boolean): void {
    this.lineOptions.showArea = enabled;
    
    if (this.chart) {
      this.chart.data.datasets.forEach((dataset: any) => {
        dataset.fill = enabled ? 'origin' : false;
        if (enabled) {
          const index = this.chart!.data.datasets.indexOf(dataset);
          const colorType = this.getDatasetColorType(index);
          dataset.backgroundColor = this.getColor(colorType, 0.1);
        }
      });
      this.chart.update('active');
    }
  }

  /**
   * Set time range for the chart
   */
  public setTimeRange(start: Date, end: Date): void {
    if (this.config.scales?.x) {
      this.config.scales.x.min = start.getTime();
      this.config.scales.x.max = end.getTime();
      
      if (this.chart) {
        this.chart.options = this.config as any;
        this.chart.update('active');
      }
    }
  }

  /**
   * Add real-time data point
   */
  public addDataPoint(datasetIndex: number, label: Date | string, value: number): void {
    if (!this.chart || datasetIndex < 0 || datasetIndex >= this.chart.data.datasets.length) return;

    // Add new label if it doesn't exist
    if (!this.chart.data.labels) {
      this.chart.data.labels = [];
    }
    
    this.chart.data.labels.push(label);
    this.chart.data.datasets[datasetIndex].data.push(value);

    // Limit data points to prevent memory issues
    const maxPoints = 100;
    if (this.chart.data.labels.length > maxPoints) {
      this.chart.data.labels.shift();
      this.chart.data.datasets.forEach(dataset => {
        dataset.data.shift();
      });
    }

    this.chart.update('active');
  }

  /**
   * Get chart type
   */
  public getType(): string {
    return 'line';
  }

  /**
   * Export chart as image
   */
  public exportAsImage(format: 'png' | 'jpeg' = 'png', quality: number = 1.0): string {
    if (!this.chart) return '';
    return this.canvas.toDataURL(`image/${format}`, quality);
  }

  /**
   * Create preset configurations for common use cases
   */
  public static createApiUsageChart(canvas: HTMLCanvasElement, options: Partial<LineChartOptions> = {}): LineChart {
    return new LineChart(canvas, {
      title: 'API Usage Over Time',
      yAxisLabel: 'Requests',
      xAxisLabel: 'Time',
      showArea: true,
      tension: 0.4,
      ...options
    });
  }

  public static createResponseTimeChart(canvas: HTMLCanvasElement, options: Partial<LineChartOptions> = {}): LineChart {
    return new LineChart(canvas, {
      title: 'Response Time Trends',
      yAxisLabel: 'Response Time (ms)',
      xAxisLabel: 'Time',
      tension: 0.3,
      pointRadius: 2,
      ...options
    });
  }

  public static createErrorRateChart(canvas: HTMLCanvasElement, options: Partial<LineChartOptions> = {}): LineChart {
    return new LineChart(canvas, {
      title: 'Error Rate Over Time',
      yAxisLabel: 'Error Rate (%)',
      xAxisLabel: 'Time',
      showArea: true,
      colorScheme: 'error',
      ...options
    });
  }

  public static createMultiMetricChart(canvas: HTMLCanvasElement, options: Partial<LineChartOptions> = {}): LineChart {
    return new LineChart(canvas, {
      title: 'Multiple Metrics',
      xAxisLabel: 'Time',
      tension: 0.4,
      pointRadius: 2,
      ...options
    });
  }
}
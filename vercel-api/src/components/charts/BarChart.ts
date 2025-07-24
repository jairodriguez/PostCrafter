/**
 * Bar Chart Component
 * 
 * Displays categorical data such as top endpoints, error distributions,
 * user activity, and other discrete metrics for the PostCrafter dashboard.
 * 
 * @package PostCrafter
 * @version 1.0.0
 * @since 1.0.0
 */

import { Chart as ChartJS } from 'chart.js';
import { ChartBase, ChartData, ChartOptions, ChartDataset } from './ChartBase';

export interface BarChartOptions extends ChartOptions {
  orientation?: 'vertical' | 'horizontal';
  stacked?: boolean;
  categoryPercentage?: number;
  barPercentage?: number;
  maxBarThickness?: number;
  minBarLength?: number;
  yAxisLabel?: string;
  xAxisLabel?: string;
  showValues?: boolean;
  showGrid?: boolean;
  beginAtZero?: boolean;
  indexAxis?: 'x' | 'y';
}

export interface BarChartDataset extends ChartDataset {
  barPercentage?: number;
  categoryPercentage?: number;
  barThickness?: number;
  maxBarThickness?: number;
  minBarLength?: number;
}

export interface BarChartData extends ChartData {
  datasets: BarChartDataset[];
}

/**
 * Bar Chart Component
 * 
 * Specialized chart for displaying categorical and comparative data
 */
export class BarChart extends ChartBase {
  private barOptions: BarChartOptions;

  constructor(canvas: HTMLCanvasElement, options: BarChartOptions = {}) {
    super(canvas, options);
    
    this.barOptions = {
      orientation: 'vertical',
      stacked: false,
      categoryPercentage: 0.8,
      barPercentage: 0.9,
      maxBarThickness: 80,
      minBarLength: 2,
      showValues: false,
      showGrid: true,
      beginAtZero: true,
      indexAxis: 'x',
      ...options
    };

    this.updateBarConfig();
  }

  /**
   * Update configuration specific to bar charts
   */
  private updateBarConfig(): void {
    // Configure scales for bar charts
    const isHorizontal = this.barOptions.orientation === 'horizontal';
    
    this.config.indexAxis = isHorizontal ? 'y' : 'x';
    
    this.config.scales = {
      x: {
        type: isHorizontal ? 'linear' : 'category',
        display: true,
        stacked: this.barOptions.stacked === true,
        beginAtZero: isHorizontal ? (this.barOptions.beginAtZero !== false) : undefined,
        title: {
          display: !!this.barOptions.xAxisLabel,
          text: this.barOptions.xAxisLabel || '',
          color: this.options.theme === 'dark' ? '#D1D5DB' : '#374151',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          display: this.barOptions.showGrid !== false && isHorizontal,
          color: this.options.theme === 'dark' ? '#374151' : '#E5E7EB',
          borderColor: this.options.theme === 'dark' ? '#6B7280' : '#D1D5DB'
        },
        ticks: {
          color: this.options.theme === 'dark' ? '#9CA3AF' : '#6B7280',
          font: {
            size: 11
          },
          callback: isHorizontal ? (value: any) => {
            if (typeof value === 'number') {
              return this.formatNumber(value);
            }
            return value;
          } : undefined,
          maxRotation: isHorizontal ? 0 : 45,
          minRotation: 0
        }
      },
      y: {
        type: isHorizontal ? 'category' : 'linear',
        display: true,
        stacked: this.barOptions.stacked === true,
        beginAtZero: !isHorizontal ? (this.barOptions.beginAtZero !== false) : undefined,
        title: {
          display: !!this.barOptions.yAxisLabel,
          text: this.barOptions.yAxisLabel || '',
          color: this.options.theme === 'dark' ? '#D1D5DB' : '#374151',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          display: this.barOptions.showGrid !== false && !isHorizontal,
          color: this.options.theme === 'dark' ? '#374151' : '#E5E7EB',
          borderColor: this.options.theme === 'dark' ? '#6B7280' : '#D1D5DB'
        },
        ticks: {
          color: this.options.theme === 'dark' ? '#9CA3AF' : '#6B7280',
          font: {
            size: 11
          },
          callback: !isHorizontal ? (value: any) => {
            if (typeof value === 'number') {
              return this.formatNumber(value);
            }
            return value;
          } : undefined
        }
      }
    };

    // Configure tooltips for bar charts
    if (this.config.plugins?.tooltip) {
      this.config.plugins.tooltip.callbacks = {
        title: (context: any) => {
          return context[0].label;
        },
        label: (context: any) => {
          const label = context.dataset.label || '';
          const value = context.parsed.y || context.parsed.x;
          return `${label}: ${this.formatNumber(value)}`;
        }
      };
    }

    // Configure plugins for value display
    if (this.barOptions.showValues) {
      this.config.plugins = {
        ...this.config.plugins,
        datalabels: {
          display: true,
          anchor: 'end',
          align: 'top',
          color: this.options.theme === 'dark' ? '#D1D5DB' : '#374151',
          font: {
            size: 10,
            weight: 'bold'
          },
          formatter: (value: number) => this.formatNumber(value)
        }
      };
    }
  }

  /**
   * Render the bar chart with data
   */
  public render(data: BarChartData): void {
    // Process datasets to apply bar chart specific styling
    const processedDatasets = data.datasets.map((dataset, index) => {
      const colors = this.generateDatasetColors(dataset.data.length, index);

      return {
        ...dataset,
        type: 'bar' as const,
        backgroundColor: dataset.backgroundColor || colors.backgrounds,
        borderColor: dataset.borderColor || colors.borders,
        borderWidth: dataset.borderWidth || 1,
        borderRadius: 4,
        borderSkipped: false,
        barPercentage: dataset.barPercentage ?? this.barOptions.barPercentage,
        categoryPercentage: dataset.categoryPercentage ?? this.barOptions.categoryPercentage,
        maxBarThickness: dataset.maxBarThickness ?? this.barOptions.maxBarThickness,
        minBarLength: dataset.minBarLength ?? this.barOptions.minBarLength,
        hoverBackgroundColor: colors.hovers,
        hoverBorderColor: colors.borders
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
      type: 'bar',
      data: chartData,
      options: this.config as any
    });
  }

  /**
   * Generate colors for dataset items
   */
  private generateDatasetColors(dataLength: number, datasetIndex: number = 0): {
    backgrounds: string[];
    borders: string[];
    hovers: string[];
  } {
    const colorTypes: Array<'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = [
      'primary', 'secondary', 'success', 'warning', 'error', 'info'
    ];

    const backgrounds: string[] = [];
    const borders: string[] = [];
    const hovers: string[] = [];

    for (let i = 0; i < dataLength; i++) {
      const colorType = colorTypes[(datasetIndex + i) % colorTypes.length];
      const baseColor = this.getColor(colorType);
      const lightColor = this.getColor(colorType, 0.8);
      const hoverColor = this.getColor(colorType, 0.9);

      backgrounds.push(lightColor);
      borders.push(baseColor);
      hovers.push(hoverColor);
    }

    return { backgrounds, borders, hovers };
  }

  /**
   * Get single color for dataset
   */
  private getSingleDatasetColor(datasetIndex: number): {
    background: string;
    border: string;
    hover: string;
  } {
    const colorTypes: Array<'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = [
      'primary', 'secondary', 'success', 'warning', 'error', 'info'
    ];

    const colorType = colorTypes[datasetIndex % colorTypes.length];
    const baseColor = this.getColor(colorType);

    return {
      background: this.getColor(colorType, 0.8),
      border: baseColor,
      hover: this.getColor(colorType, 0.9)
    };
  }

  /**
   * Add a new dataset to the chart
   */
  public addDataset(dataset: BarChartDataset): void {
    if (!this.chart) return;

    const datasetIndex = this.chart.data.datasets.length;
    const colors = this.generateDatasetColors(dataset.data.length, datasetIndex);

    const processedDataset = {
      ...dataset,
      type: 'bar' as const,
      backgroundColor: dataset.backgroundColor || colors.backgrounds,
      borderColor: dataset.borderColor || colors.borders,
      borderWidth: dataset.borderWidth || 1,
      borderRadius: 4,
      hoverBackgroundColor: colors.hovers,
      hoverBorderColor: colors.borders
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
   * Update bar chart specific options
   */
  public updateBarOptions(options: Partial<BarChartOptions>): void {
    this.barOptions = { ...this.barOptions, ...options };
    this.updateBarConfig();
    
    if (this.chart) {
      this.chart.options = this.config as any;
      this.chart.update('active');
    }
  }

  /**
   * Toggle between vertical and horizontal orientation
   */
  public toggleOrientation(): void {
    this.barOptions.orientation = this.barOptions.orientation === 'vertical' ? 'horizontal' : 'vertical';
    this.updateBarConfig();
    
    if (this.chart) {
      this.chart.options = this.config as any;
      this.chart.update('active');
    }
  }

  /**
   * Enable or disable stacked mode
   */
  public toggleStacked(enabled: boolean): void {
    this.barOptions.stacked = enabled;
    this.updateBarConfig();
    
    if (this.chart) {
      this.chart.options = this.config as any;
      this.chart.update('active');
    }
  }

  /**
   * Sort data by values
   */
  public sortByValues(ascending: boolean = false): void {
    if (!this.chart || !this.chart.data.labels || !this.chart.data.datasets[0]) return;

    const labels = this.chart.data.labels as string[];
    const dataset = this.chart.data.datasets[0];
    const data = dataset.data as number[];

    // Create array of indices and sort by values
    const indices = Array.from({ length: labels.length }, (_, i) => i);
    indices.sort((a, b) => {
      const valueA = data[a];
      const valueB = data[b];
      return ascending ? valueA - valueB : valueB - valueA;
    });

    // Reorder labels and data
    const sortedLabels = indices.map(i => labels[i]);
    const sortedData = indices.map(i => data[i]);

    // Reorder colors if they exist
    if (Array.isArray(dataset.backgroundColor)) {
      dataset.backgroundColor = indices.map(i => dataset.backgroundColor[i]);
    }
    if (Array.isArray(dataset.borderColor)) {
      dataset.borderColor = indices.map(i => dataset.borderColor[i]);
    }

    // Update chart data
    this.chart.data.labels = sortedLabels;
    dataset.data = sortedData;
    this.chart.update('active');
  }

  /**
   * Get chart type
   */
  public getType(): string {
    return 'bar';
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
  public static createTopEndpointsChart(canvas: HTMLCanvasElement, options: Partial<BarChartOptions> = {}): BarChart {
    return new BarChart(canvas, {
      title: 'Top API Endpoints',
      yAxisLabel: 'Request Count',
      xAxisLabel: 'Endpoints',
      orientation: 'vertical',
      showValues: true,
      ...options
    });
  }

  public static createErrorDistributionChart(canvas: HTMLCanvasElement, options: Partial<BarChartOptions> = {}): BarChart {
    return new BarChart(canvas, {
      title: 'Error Distribution',
      yAxisLabel: 'Error Count',
      xAxisLabel: 'Error Types',
      orientation: 'vertical',
      colorScheme: 'error',
      ...options
    });
  }

  public static createUserActivityChart(canvas: HTMLCanvasElement, options: Partial<BarChartOptions> = {}): BarChart {
    return new BarChart(canvas, {
      title: 'User Activity',
      yAxisLabel: 'Activity Count',
      xAxisLabel: 'Users',
      orientation: 'horizontal',
      ...options
    });
  }

  public static createStatusCodeChart(canvas: HTMLCanvasElement, options: Partial<BarChartOptions> = {}): BarChart {
    return new BarChart(canvas, {
      title: 'HTTP Status Code Distribution',
      yAxisLabel: 'Count',
      xAxisLabel: 'Status Code',
      orientation: 'vertical',
      ...options
    });
  }

  public static createHourlyUsageChart(canvas: HTMLCanvasElement, options: Partial<BarChartOptions> = {}): BarChart {
    return new BarChart(canvas, {
      title: 'Hourly API Usage',
      yAxisLabel: 'Requests',
      xAxisLabel: 'Hour of Day',
      orientation: 'vertical',
      categoryPercentage: 0.9,
      barPercentage: 0.8,
      ...options
    });
  }

  public static createComparisonChart(canvas: HTMLCanvasElement, options: Partial<BarChartOptions> = {}): BarChart {
    return new BarChart(canvas, {
      title: 'Metric Comparison',
      orientation: 'vertical',
      stacked: false,
      ...options
    });
  }
}
/**
 * Chart Components Library
 * 
 * Exports all visualization components for the PostCrafter monitoring
 * and analytics dashboard with factory functions for easy creation.
 * 
 * @package PostCrafter
 * @version 1.0.0
 * @since 1.0.0
 */

// Base chart components
export { ChartBase, ChartData, ChartOptions, ChartDataset, ColorSchemes, ChartUtils } from './ChartBase';

// Specific chart types
export { LineChart, LineChartOptions, LineChartData, LineChartDataset } from './LineChart';
export { BarChart, BarChartOptions, BarChartData, BarChartDataset } from './BarChart';

// UI Components
export { SummaryCard, SummaryCardData, SummaryCardOptions, SummaryCardStyle } from './SummaryCard';
export { ActivityLog, ActivityLogEntry, ActivityLogOptions, ActivityLogFilter } from './ActivityLog';

// Types
export interface ChartFactory {
  createLineChart(canvas: HTMLCanvasElement, type: 'api-usage' | 'response-time' | 'error-rate' | 'multi-metric', options?: any): LineChart;
  createBarChart(canvas: HTMLCanvasElement, type: 'top-endpoints' | 'error-distribution' | 'user-activity' | 'status-codes' | 'hourly-usage' | 'comparison', options?: any): BarChart;
  createSummaryCard(container: HTMLElement, type: 'api-calls' | 'success-rate' | 'error-rate' | 'response-time' | 'publishes' | 'uptime', data?: any): SummaryCard;
  createActivityLog(container: HTMLElement, type: 'api-activity' | 'error-log' | 'user-activity', options?: any): ActivityLog;
}

export interface MetricsData {
  summary: {
    totalApiCalls: number;
    successfulPublishes: number;
    errorCount: number;
    errorRate: number;
    averageResponseTime: number;
    uptime: number;
  };
  timeSeries: Array<{
    timestamp: Date;
    apiCalls: number;
    publishSuccess: number;
    publishErrors: number;
    responseTime: number;
  }>;
  topEndpoints: Array<{
    endpoint: string;
    count: number;
  }>;
  errorDistribution: Array<{
    type: string;
    count: number;
  }>;
  userActivity: Array<{
    userId: string;
    activityCount: number;
  }>;
  recentActivity: Array<{
    id: string;
    timestamp: Date;
    type: string;
    title: string;
    description?: string;
    endpoint?: string;
    method?: string;
    statusCode?: number;
    userId?: string;
    duration?: number;
  }>;
}

/**
 * Chart Factory Implementation
 * 
 * Provides easy-to-use factory methods for creating various chart types
 */
export class PostCrafterChartFactory implements ChartFactory {
  
  /**
   * Create line charts for time-series data
   */
  public createLineChart(
    canvas: HTMLCanvasElement, 
    type: 'api-usage' | 'response-time' | 'error-rate' | 'multi-metric', 
    options: any = {}
  ): LineChart {
    switch (type) {
      case 'api-usage':
        return LineChart.createApiUsageChart(canvas, options);
      case 'response-time':
        return LineChart.createResponseTimeChart(canvas, options);
      case 'error-rate':
        return LineChart.createErrorRateChart(canvas, options);
      case 'multi-metric':
        return LineChart.createMultiMetricChart(canvas, options);
      default:
        throw new Error(`Unknown line chart type: ${type}`);
    }
  }

  /**
   * Create bar charts for categorical data
   */
  public createBarChart(
    canvas: HTMLCanvasElement, 
    type: 'top-endpoints' | 'error-distribution' | 'user-activity' | 'status-codes' | 'hourly-usage' | 'comparison', 
    options: any = {}
  ): BarChart {
    switch (type) {
      case 'top-endpoints':
        return BarChart.createTopEndpointsChart(canvas, options);
      case 'error-distribution':
        return BarChart.createErrorDistributionChart(canvas, options);
      case 'user-activity':
        return BarChart.createUserActivityChart(canvas, options);
      case 'status-codes':
        return BarChart.createStatusCodeChart(canvas, options);
      case 'hourly-usage':
        return BarChart.createHourlyUsageChart(canvas, options);
      case 'comparison':
        return BarChart.createComparisonChart(canvas, options);
      default:
        throw new Error(`Unknown bar chart type: ${type}`);
    }
  }

  /**
   * Create summary cards for key metrics
   */
  public createSummaryCard(
    container: HTMLElement, 
    type: 'api-calls' | 'success-rate' | 'error-rate' | 'response-time' | 'publishes' | 'uptime', 
    data: any = {}
  ): SummaryCard {
    switch (type) {
      case 'api-calls':
        return SummaryCard.createApiCallsCard(container, data);
      case 'success-rate':
        return SummaryCard.createSuccessRateCard(container, data);
      case 'error-rate':
        return SummaryCard.createErrorRateCard(container, data);
      case 'response-time':
        return SummaryCard.createResponseTimeCard(container, data);
      case 'publishes':
        return SummaryCard.createPublishesCard(container, data);
      case 'uptime':
        return SummaryCard.createUptimeCard(container, data);
      default:
        throw new Error(`Unknown summary card type: ${type}`);
    }
  }

  /**
   * Create activity logs for different purposes
   */
  public createActivityLog(
    container: HTMLElement, 
    type: 'api-activity' | 'error-log' | 'user-activity', 
    options: any = {}
  ): ActivityLog {
    switch (type) {
      case 'api-activity':
        return ActivityLog.createApiActivityLog(container, options);
      case 'error-log':
        return ActivityLog.createErrorLog(container, options);
      case 'user-activity':
        return ActivityLog.createUserActivityLog(container, options);
      default:
        throw new Error(`Unknown activity log type: ${type}`);
    }
  }
}

/**
 * Dashboard Builder
 * 
 * High-level utility for building complete dashboard layouts
 */
export class DashboardBuilder {
  private factory: PostCrafterChartFactory;
  private components: Map<string, any> = new Map();

  constructor() {
    this.factory = new PostCrafterChartFactory();
  }

  /**
   * Create a complete overview dashboard
   */
  public createOverviewDashboard(containerId: string, data: MetricsData): void {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with ID '${containerId}' not found`);
    }

    // Clear existing content
    container.innerHTML = '';

    // Create dashboard layout
    const layout = this.createDashboardLayout();
    container.appendChild(layout);

    // Create summary cards
    this.createSummarySection(layout.querySelector('.dashboard-summary')!, data);

    // Create charts section
    this.createChartsSection(layout.querySelector('.dashboard-charts')!, data);

    // Create activity section
    this.createActivitySection(layout.querySelector('.dashboard-activity')!, data);
  }

  /**
   * Create dashboard layout structure
   */
  private createDashboardLayout(): HTMLElement {
    const layout = document.createElement('div');
    layout.className = 'dashboard-layout';
    layout.style.cssText = `
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
      padding: 24px;
      background-color: #F9FAFB;
      min-height: 100vh;
    `;

    layout.innerHTML = `
      <div class="dashboard-summary" style="
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 16px;
      "></div>
      
      <div class="dashboard-charts" style="
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 24px;
      "></div>
      
      <div class="dashboard-activity" style="
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 24px;
      "></div>
    `;

    return layout;
  }

  /**
   * Create summary cards section
   */
  private createSummarySection(container: HTMLElement, data: MetricsData): void {
    const summaryData = data.summary;

    // Create summary cards
    const cards = [
      { type: 'api-calls' as const, value: summaryData.totalApiCalls },
      { type: 'success-rate' as const, value: 100 - summaryData.errorRate },
      { type: 'error-rate' as const, value: summaryData.errorRate },
      { type: 'response-time' as const, value: summaryData.averageResponseTime },
      { type: 'publishes' as const, value: summaryData.successfulPublishes },
      { type: 'uptime' as const, value: summaryData.uptime }
    ];

    cards.forEach(cardConfig => {
      const cardContainer = document.createElement('div');
      container.appendChild(cardContainer);

      const card = this.factory.createSummaryCard(cardContainer, cardConfig.type, {
        value: cardConfig.value
      });

      this.components.set(`summary-${cardConfig.type}`, card);
    });
  }

  /**
   * Create charts section
   */
  private createChartsSection(container: HTMLElement, data: MetricsData): void {
    // API Usage Chart
    const apiUsageContainer = this.createChartContainer('API Usage Over Time');
    container.appendChild(apiUsageContainer);
    const apiUsageCanvas = apiUsageContainer.querySelector('canvas')!;
    const apiUsageChart = this.factory.createLineChart(apiUsageCanvas, 'api-usage');
    
    // Convert time series data for API usage
    const apiUsageData = {
      labels: data.timeSeries.map(point => point.timestamp),
      datasets: [{
        label: 'API Calls',
        data: data.timeSeries.map(point => point.apiCalls)
      }]
    };
    apiUsageChart.render(apiUsageData);
    this.components.set('api-usage-chart', apiUsageChart);

    // Top Endpoints Chart
    const endpointsContainer = this.createChartContainer('Top API Endpoints');
    container.appendChild(endpointsContainer);
    const endpointsCanvas = endpointsContainer.querySelector('canvas')!;
    const endpointsChart = this.factory.createBarChart(endpointsCanvas, 'top-endpoints');
    
    const endpointsData = {
      labels: data.topEndpoints.map(item => item.endpoint),
      datasets: [{
        label: 'Requests',
        data: data.topEndpoints.map(item => item.count)
      }]
    };
    endpointsChart.render(endpointsData);
    this.components.set('top-endpoints-chart', endpointsChart);

    // Error Distribution Chart
    const errorsContainer = this.createChartContainer('Error Distribution');
    container.appendChild(errorsContainer);
    const errorsCanvas = errorsContainer.querySelector('canvas')!;
    const errorsChart = this.factory.createBarChart(errorsCanvas, 'error-distribution');
    
    const errorsData = {
      labels: data.errorDistribution.map(item => item.type),
      datasets: [{
        label: 'Error Count',
        data: data.errorDistribution.map(item => item.count)
      }]
    };
    errorsChart.render(errorsData);
    this.components.set('error-distribution-chart', errorsChart);

    // Response Time Chart
    const responseTimeContainer = this.createChartContainer('Response Time Trends');
    container.appendChild(responseTimeContainer);
    const responseTimeCanvas = responseTimeContainer.querySelector('canvas')!;
    const responseTimeChart = this.factory.createLineChart(responseTimeCanvas, 'response-time');
    
    const responseTimeData = {
      labels: data.timeSeries.map(point => point.timestamp),
      datasets: [{
        label: 'Response Time (ms)',
        data: data.timeSeries.map(point => point.responseTime)
      }]
    };
    responseTimeChart.render(responseTimeData);
    this.components.set('response-time-chart', responseTimeChart);
  }

  /**
   * Create activity section
   */
  private createActivitySection(container: HTMLElement, data: MetricsData): void {
    // Recent Activity Log
    const activityContainer = this.createActivityContainer('Recent Activity');
    container.appendChild(activityContainer);
    const activityLogContainer = activityContainer.querySelector('.activity-log-container')!;
    const activityLog = this.factory.createActivityLog(activityLogContainer as HTMLElement, 'api-activity');
    
    // Convert activity data
    const activityEntries = data.recentActivity.map(item => ({
      ...item,
      timestamp: new Date(item.timestamp)
    }));
    activityLog.addEntries(activityEntries);
    this.components.set('activity-log', activityLog);

    // Error Log
    const errorLogContainer = this.createActivityContainer('Recent Errors');
    container.appendChild(errorLogContainer);
    const errorLogDiv = errorLogContainer.querySelector('.activity-log-container')!;
    const errorLog = this.factory.createActivityLog(errorLogDiv as HTMLElement, 'error-log');
    
    // Filter error entries
    const errorEntries = data.recentActivity
      .filter(item => item.type.includes('error'))
      .map(item => ({ ...item, timestamp: new Date(item.timestamp) }));
    errorLog.addEntries(errorEntries);
    this.components.set('error-log', errorLog);
  }

  /**
   * Create chart container with title
   */
  private createChartContainer(title: string): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    `;

    container.innerHTML = `
      <h3 style="
        margin: 0 0 16px 0;
        font-size: 18px;
        font-weight: 600;
        color: #111827;
      ">${title}</h3>
      <canvas style="max-height: 400px;"></canvas>
    `;

    return container;
  }

  /**
   * Create activity container with title
   */
  private createActivityContainer(title: string): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    `;

    container.innerHTML = `
      <h3 style="
        margin: 0 0 16px 0;
        font-size: 18px;
        font-weight: 600;
        color: #111827;
      ">${title}</h3>
      <div class="activity-log-container"></div>
    `;

    return container;
  }

  /**
   * Update dashboard with new data
   */
  public updateDashboard(data: MetricsData): void {
    // Update summary cards
    const summaryData = data.summary;
    this.updateSummaryCard('api-calls', summaryData.totalApiCalls);
    this.updateSummaryCard('success-rate', 100 - summaryData.errorRate);
    this.updateSummaryCard('error-rate', summaryData.errorRate);
    this.updateSummaryCard('response-time', summaryData.averageResponseTime);
    this.updateSummaryCard('publishes', summaryData.successfulPublishes);
    this.updateSummaryCard('uptime', summaryData.uptime);

    // Update charts
    this.updateTimeSeriesCharts(data);
    this.updateCategoricalCharts(data);

    // Update activity logs
    this.updateActivityLogs(data);
  }

  /**
   * Update summary card
   */
  private updateSummaryCard(type: string, value: number): void {
    const card = this.components.get(`summary-${type}`);
    if (card) {
      card.updateData({ value });
    }
  }

  /**
   * Update time series charts
   */
  private updateTimeSeriesCharts(data: MetricsData): void {
    // Update API usage chart
    const apiUsageChart = this.components.get('api-usage-chart');
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

    // Update response time chart
    const responseTimeChart = this.components.get('response-time-chart');
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
  }

  /**
   * Update categorical charts
   */
  private updateCategoricalCharts(data: MetricsData): void {
    // Update top endpoints chart
    const endpointsChart = this.components.get('top-endpoints-chart');
    if (endpointsChart) {
      const chartData = {
        labels: data.topEndpoints.map(item => item.endpoint),
        datasets: [{
          label: 'Requests',
          data: data.topEndpoints.map(item => item.count)
        }]
      };
      endpointsChart.updateData(chartData);
    }

    // Update error distribution chart
    const errorsChart = this.components.get('error-distribution-chart');
    if (errorsChart) {
      const chartData = {
        labels: data.errorDistribution.map(item => item.type),
        datasets: [{
          label: 'Error Count',
          data: data.errorDistribution.map(item => item.count)
        }]
      };
      errorsChart.updateData(chartData);
    }
  }

  /**
   * Update activity logs
   */
  private updateActivityLogs(data: MetricsData): void {
    const activityLog = this.components.get('activity-log');
    if (activityLog) {
      const entries = data.recentActivity.map(item => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }));
      activityLog.addEntries(entries);
    }

    const errorLog = this.components.get('error-log');
    if (errorLog) {
      const errorEntries = data.recentActivity
        .filter(item => item.type.includes('error'))
        .map(item => ({ ...item, timestamp: new Date(item.timestamp) }));
      errorLog.addEntries(errorEntries);
    }
  }

  /**
   * Get component by key
   */
  public getComponent(key: string): any {
    return this.components.get(key);
  }

  /**
   * Destroy all components
   */
  public destroy(): void {
    this.components.forEach(component => {
      if (typeof component.destroy === 'function') {
        component.destroy();
      }
    });
    this.components.clear();
  }
}

// Export singleton instances
export const chartFactory = new PostCrafterChartFactory();
export const dashboardBuilder = new DashboardBuilder();

// Convenience function for quick dashboard creation
export function createPostCrafterDashboard(containerId: string, data: MetricsData): DashboardBuilder {
  const builder = new DashboardBuilder();
  builder.createOverviewDashboard(containerId, data);
  return builder;
}
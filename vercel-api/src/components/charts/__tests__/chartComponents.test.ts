/**
 * Chart Components Tests
 * 
 * Unit tests for all chart components including line charts, bar charts,
 * summary cards, and activity logs.
 * 
 * @package PostCrafter
 * @version 1.0.0
 */

import { ChartBase, ColorSchemes, ChartUtils } from '../ChartBase';
import { LineChart, LineChartData } from '../LineChart';
import { BarChart, BarChartData } from '../BarChart';
import { SummaryCard, SummaryCardData } from '../SummaryCard';
import { ActivityLog, ActivityLogEntry } from '../ActivityLog';
import { PostCrafterChartFactory, DashboardBuilder, MetricsData } from '../index';

// Mock Chart.js since it requires canvas
jest.mock('chart.js', () => ({
  Chart: jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
    update: jest.fn(),
    resize: jest.fn(),
    data: { labels: [], datasets: [] },
    options: {}
  })),
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  PointElement: jest.fn(),
  LineElement: jest.fn(),
  BarElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
  TimeScale: jest.fn(),
  Filler: jest.fn(),
  ArcElement: jest.fn(),
  RadialLinearScale: jest.fn(),
  register: jest.fn()
}));

// Mock Canvas
class MockCanvas {
  width = 400;
  height = 300;
  
  getContext() {
    return {
      createLinearGradient: jest.fn(() => ({
        addColorStop: jest.fn()
      }))
    };
  }

  toDataURL() {
    return 'data:image/png;base64,mock-image-data';
  }
}

// Mock HTMLCanvasElement
global.HTMLCanvasElement = MockCanvas as any;

// Mock DOM methods
Object.defineProperty(global, 'document', {
  value: {
    createElement: jest.fn((tagName) => {
      const element = {
        tagName,
        className: '',
        style: {},
        innerHTML: '',
        appendChild: jest.fn(),
        remove: jest.fn(),
        addEventListener: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn()
      };
      
      if (tagName === 'canvas') {
        Object.assign(element, new MockCanvas());
      }
      
      return element;
    }),
    getElementById: jest.fn()
  }
});

describe('ColorSchemes', () => {
  it('should have proper color definitions', () => {
    expect(ColorSchemes.default).toBeDefined();
    expect(ColorSchemes.default.primary).toBe('#3B82F6');
    expect(ColorSchemes.default.success).toBe('#10B981');
    expect(ColorSchemes.default.error).toBe('#EF4444');
  });

  it('should have gradient definitions', () => {
    expect(ColorSchemes.gradients).toBeDefined();
    expect(ColorSchemes.gradients.primary).toHaveLength(2);
    expect(ColorSchemes.gradients.success).toHaveLength(2);
  });
});

describe('ChartUtils', () => {
  describe('aggregateByTime', () => {
    it('should aggregate data by hour', () => {
      const data = [
        { timestamp: new Date('2023-01-01T10:30:00Z'), value: 5 },
        { timestamp: new Date('2023-01-01T10:45:00Z'), value: 3 },
        { timestamp: new Date('2023-01-01T11:15:00Z'), value: 7 }
      ];

      const result = ChartUtils.aggregateByTime(data, 'hour');
      expect(result).toHaveLength(2);
      expect(result[0].value).toBe(8); // 5 + 3
      expect(result[1].value).toBe(7);
    });

    it('should aggregate data by day', () => {
      const data = [
        { timestamp: new Date('2023-01-01T10:00:00Z'), value: 5 },
        { timestamp: new Date('2023-01-01T15:00:00Z'), value: 3 },
        { timestamp: new Date('2023-01-02T10:00:00Z'), value: 7 }
      ];

      const result = ChartUtils.aggregateByTime(data, 'day');
      expect(result).toHaveLength(2);
      expect(result[0].value).toBe(8); // 5 + 3
      expect(result[1].value).toBe(7);
    });
  });

  describe('calculateMovingAverage', () => {
    it('should calculate moving average correctly', () => {
      const data = [1, 2, 3, 4, 5];
      const result = ChartUtils.calculateMovingAverage(data, 3);
      
      expect(result).toHaveLength(5);
      expect(result[0]).toBe(1); // [1]
      expect(result[1]).toBe(1.5); // [1, 2]
      expect(result[2]).toBe(2); // [1, 2, 3]
      expect(result[3]).toBe(3); // [2, 3, 4]
      expect(result[4]).toBe(4); // [3, 4, 5]
    });
  });

  describe('generateTimeLabels', () => {
    it('should generate hourly labels', () => {
      const start = new Date('2023-01-01T10:00:00Z');
      const end = new Date('2023-01-01T12:00:00Z');
      
      const result = ChartUtils.generateTimeLabels(start, end, 'hour');
      expect(result).toHaveLength(3); // 10:00, 11:00, 12:00
    });

    it('should generate daily labels', () => {
      const start = new Date('2023-01-01T00:00:00Z');
      const end = new Date('2023-01-03T00:00:00Z');
      
      const result = ChartUtils.generateTimeLabels(start, end, 'day');
      expect(result).toHaveLength(3); // Jan 1, Jan 2, Jan 3
    });
  });

  describe('formatMetricsForChart', () => {
    it('should format metrics data for charts', () => {
      const events = [
        { timestamp: new Date('2023-01-01T10:00:00Z'), type: 'api_call' },
        { timestamp: new Date('2023-01-01T10:30:00Z'), type: 'publish_success' },
        { timestamp: new Date('2023-01-01T11:00:00Z'), type: 'api_call' }
      ];

      const result = ChartUtils.formatMetricsForChart(events, 'hour');
      
      expect(result.labels).toHaveLength(2);
      expect(result.datasets).toHaveLength(1);
      expect(result.datasets[0].data).toEqual([2, 1]); // 2 events in first hour, 1 in second
    });
  });
});

describe('LineChart', () => {
  let canvas: HTMLCanvasElement;
  let lineChart: LineChart;

  beforeEach(() => {
    canvas = document.createElement('canvas') as HTMLCanvasElement;
    lineChart = new LineChart(canvas, {
      title: 'Test Line Chart',
      yAxisLabel: 'Value',
      xAxisLabel: 'Time'
    });
  });

  afterEach(() => {
    if (lineChart) {
      lineChart.destroy();
    }
  });

  it('should create line chart with proper configuration', () => {
    expect(lineChart).toBeDefined();
    expect(lineChart.getType()).toBe('line');
  });

  it('should render chart with data', () => {
    const data: LineChartData = {
      labels: [new Date('2023-01-01'), new Date('2023-01-02')],
      datasets: [{
        label: 'Test Data',
        data: [10, 20]
      }]
    };

    expect(() => lineChart.render(data)).not.toThrow();
  });

  it('should update chart data', () => {
    const initialData: LineChartData = {
      labels: [new Date('2023-01-01')],
      datasets: [{ label: 'Test', data: [10] }]
    };

    lineChart.render(initialData);

    const newData: LineChartData = {
      labels: [new Date('2023-01-01'), new Date('2023-01-02')],
      datasets: [{ label: 'Test', data: [10, 20] }]
    };

    expect(() => lineChart.updateData(newData)).not.toThrow();
  });

  it('should toggle area fill', () => {
    expect(() => lineChart.toggleAreaFill(true)).not.toThrow();
    expect(() => lineChart.toggleAreaFill(false)).not.toThrow();
  });

  it('should set time range', () => {
    const start = new Date('2023-01-01');
    const end = new Date('2023-01-31');
    
    expect(() => lineChart.setTimeRange(start, end)).not.toThrow();
  });

  it('should export as image', () => {
    const imageData = lineChart.exportAsImage('png', 0.8);
    expect(typeof imageData).toBe('string');
  });

  describe('Preset Charts', () => {
    it('should create API usage chart', () => {
      const chart = LineChart.createApiUsageChart(canvas);
      expect(chart).toBeInstanceOf(LineChart);
      expect(chart.getType()).toBe('line');
    });

    it('should create response time chart', () => {
      const chart = LineChart.createResponseTimeChart(canvas);
      expect(chart).toBeInstanceOf(LineChart);
    });

    it('should create error rate chart', () => {
      const chart = LineChart.createErrorRateChart(canvas);
      expect(chart).toBeInstanceOf(LineChart);
    });
  });
});

describe('BarChart', () => {
  let canvas: HTMLCanvasElement;
  let barChart: BarChart;

  beforeEach(() => {
    canvas = document.createElement('canvas') as HTMLCanvasElement;
    barChart = new BarChart(canvas, {
      title: 'Test Bar Chart',
      orientation: 'vertical'
    });
  });

  afterEach(() => {
    if (barChart) {
      barChart.destroy();
    }
  });

  it('should create bar chart with proper configuration', () => {
    expect(barChart).toBeDefined();
    expect(barChart.getType()).toBe('bar');
  });

  it('should render chart with data', () => {
    const data: BarChartData = {
      labels: ['Category A', 'Category B'],
      datasets: [{
        label: 'Test Data',
        data: [10, 20]
      }]
    };

    expect(() => barChart.render(data)).not.toThrow();
  });

  it('should toggle orientation', () => {
    expect(() => barChart.toggleOrientation()).not.toThrow();
  });

  it('should toggle stacked mode', () => {
    expect(() => barChart.toggleStacked(true)).not.toThrow();
    expect(() => barChart.toggleStacked(false)).not.toThrow();
  });

  it('should sort data by values', () => {
    const data: BarChartData = {
      labels: ['Low', 'High', 'Medium'],
      datasets: [{
        label: 'Values',
        data: [5, 25, 15]
      }]
    };

    barChart.render(data);
    expect(() => barChart.sortByValues(false)).not.toThrow(); // Descending
    expect(() => barChart.sortByValues(true)).not.toThrow(); // Ascending
  });

  describe('Preset Charts', () => {
    it('should create top endpoints chart', () => {
      const chart = BarChart.createTopEndpointsChart(canvas);
      expect(chart).toBeInstanceOf(BarChart);
    });

    it('should create error distribution chart', () => {
      const chart = BarChart.createErrorDistributionChart(canvas);
      expect(chart).toBeInstanceOf(BarChart);
    });

    it('should create user activity chart', () => {
      const chart = BarChart.createUserActivityChart(canvas);
      expect(chart).toBeInstanceOf(BarChart);
    });
  });
});

describe('SummaryCard', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('should create summary card with basic data', () => {
    const data: SummaryCardData = {
      title: 'Test Metric',
      value: 42,
      format: 'number'
    };

    const card = new SummaryCard(container, data);
    expect(card).toBeDefined();
    expect(card.getElement()).toBeDefined();
  });

  it('should create card with trend data', () => {
    const data: SummaryCardData = {
      title: 'Test Metric',
      value: 85.5,
      format: 'percentage',
      trend: {
        value: 12.5,
        direction: 'up',
        period: 'vs last week'
      }
    };

    const card = new SummaryCard(container, data);
    expect(card.getElement()).toBeDefined();
  });

  it('should create card with progress bar', () => {
    const data: SummaryCardData = {
      title: 'Progress Metric',
      value: 75,
      target: 100,
      format: 'number'
    };

    const card = new SummaryCard(container, data, {
      showProgress: true
    });

    expect(card.getElement()).toBeDefined();
  });

  it('should update card data', () => {
    const data: SummaryCardData = {
      title: 'Test Metric',
      value: 42
    };

    const card = new SummaryCard(container, data);
    
    expect(() => card.updateData({ value: 84 })).not.toThrow();
  });

  it('should update card options', () => {
    const data: SummaryCardData = {
      title: 'Test Metric',
      value: 42
    };

    const card = new SummaryCard(container, data);
    
    expect(() => card.updateOptions({ theme: 'dark' })).not.toThrow();
  });

  it('should destroy card', () => {
    const data: SummaryCardData = {
      title: 'Test Metric',
      value: 42
    };

    const card = new SummaryCard(container, data);
    expect(() => card.destroy()).not.toThrow();
    expect(card.getElement()).toBeNull();
  });

  describe('Preset Cards', () => {
    it('should create API calls card', () => {
      const card = SummaryCard.createApiCallsCard(container, { value: 1234 });
      expect(card).toBeInstanceOf(SummaryCard);
    });

    it('should create success rate card', () => {
      const card = SummaryCard.createSuccessRateCard(container, { value: 98.5 });
      expect(card).toBeInstanceOf(SummaryCard);
    });

    it('should create error rate card', () => {
      const card = SummaryCard.createErrorRateCard(container, { value: 1.5 });
      expect(card).toBeInstanceOf(SummaryCard);
    });
  });
});

describe('ActivityLog', () => {
  let container: HTMLElement;
  let activityLog: ActivityLog;

  beforeEach(() => {
    container = document.createElement('div');
    activityLog = new ActivityLog(container, {
      maxEntries: 10,
      showTimestamps: true,
      showDetails: true
    });
  });

  afterEach(() => {
    if (activityLog) {
      activityLog.destroy();
    }
  });

  it('should create activity log', () => {
    expect(activityLog).toBeDefined();
  });

  it('should add single entry', () => {
    const entry: ActivityLogEntry = {
      id: 'test-1',
      timestamp: new Date(),
      type: 'api_call',
      title: 'API Request',
      endpoint: '/api/test',
      method: 'GET',
      statusCode: 200
    };

    expect(() => activityLog.addEntry(entry)).not.toThrow();
    expect(activityLog.getEntries()).toHaveLength(1);
  });

  it('should add multiple entries', () => {
    const entries: ActivityLogEntry[] = [
      {
        id: 'test-1',
        timestamp: new Date(),
        type: 'api_call',
        title: 'First API Request'
      },
      {
        id: 'test-2',
        timestamp: new Date(),
        type: 'publish_success',
        title: 'Post Published'
      }
    ];

    expect(() => activityLog.addEntries(entries)).not.toThrow();
    expect(activityLog.getEntries()).toHaveLength(2);
  });

  it('should clear entries', () => {
    const entry: ActivityLogEntry = {
      id: 'test-1',
      timestamp: new Date(),
      type: 'api_call',
      title: 'API Request'
    };

    activityLog.addEntry(entry);
    expect(activityLog.getEntries()).toHaveLength(1);

    activityLog.clearEntries();
    expect(activityLog.getEntries()).toHaveLength(0);
  });

  it('should respect max entries limit', () => {
    const entries: ActivityLogEntry[] = [];
    for (let i = 0; i < 15; i++) {
      entries.push({
        id: `test-${i}`,
        timestamp: new Date(),
        type: 'api_call',
        title: `Request ${i}`
      });
    }

    activityLog.addEntries(entries);
    
    // Should be limited to maxEntries (10)
    expect(activityLog.getEntries().length).toBeLessThanOrEqual(10);
  });

  it('should update options', () => {
    expect(() => activityLog.updateOptions({
      compact: true,
      theme: 'dark'
    })).not.toThrow();
  });

  describe('Preset Activity Logs', () => {
    it('should create API activity log', () => {
      const log = ActivityLog.createApiActivityLog(container);
      expect(log).toBeInstanceOf(ActivityLog);
    });

    it('should create error log', () => {
      const log = ActivityLog.createErrorLog(container);
      expect(log).toBeInstanceOf(ActivityLog);
    });

    it('should create user activity log', () => {
      const log = ActivityLog.createUserActivityLog(container);
      expect(log).toBeInstanceOf(ActivityLog);
    });
  });
});

describe('PostCrafterChartFactory', () => {
  let factory: PostCrafterChartFactory;
  let canvas: HTMLCanvasElement;
  let container: HTMLElement;

  beforeEach(() => {
    factory = new PostCrafterChartFactory();
    canvas = document.createElement('canvas') as HTMLCanvasElement;
    container = document.createElement('div');
  });

  describe('createLineChart', () => {
    it('should create API usage chart', () => {
      const chart = factory.createLineChart(canvas, 'api-usage');
      expect(chart).toBeInstanceOf(LineChart);
    });

    it('should create response time chart', () => {
      const chart = factory.createLineChart(canvas, 'response-time');
      expect(chart).toBeInstanceOf(LineChart);
    });

    it('should throw error for unknown type', () => {
      expect(() => {
        factory.createLineChart(canvas, 'unknown' as any);
      }).toThrow('Unknown line chart type: unknown');
    });
  });

  describe('createBarChart', () => {
    it('should create top endpoints chart', () => {
      const chart = factory.createBarChart(canvas, 'top-endpoints');
      expect(chart).toBeInstanceOf(BarChart);
    });

    it('should create error distribution chart', () => {
      const chart = factory.createBarChart(canvas, 'error-distribution');
      expect(chart).toBeInstanceOf(BarChart);
    });

    it('should throw error for unknown type', () => {
      expect(() => {
        factory.createBarChart(canvas, 'unknown' as any);
      }).toThrow('Unknown bar chart type: unknown');
    });
  });

  describe('createSummaryCard', () => {
    it('should create API calls card', () => {
      const card = factory.createSummaryCard(container, 'api-calls');
      expect(card).toBeInstanceOf(SummaryCard);
    });

    it('should create success rate card', () => {
      const card = factory.createSummaryCard(container, 'success-rate');
      expect(card).toBeInstanceOf(SummaryCard);
    });

    it('should throw error for unknown type', () => {
      expect(() => {
        factory.createSummaryCard(container, 'unknown' as any);
      }).toThrow('Unknown summary card type: unknown');
    });
  });

  describe('createActivityLog', () => {
    it('should create API activity log', () => {
      const log = factory.createActivityLog(container, 'api-activity');
      expect(log).toBeInstanceOf(ActivityLog);
    });

    it('should create error log', () => {
      const log = factory.createActivityLog(container, 'error-log');
      expect(log).toBeInstanceOf(ActivityLog);
    });

    it('should throw error for unknown type', () => {
      expect(() => {
        factory.createActivityLog(container, 'unknown' as any);
      }).toThrow('Unknown activity log type: unknown');
    });
  });
});

describe('DashboardBuilder', () => {
  let builder: DashboardBuilder;
  let mockData: MetricsData;

  beforeEach(() => {
    builder = new DashboardBuilder();
    
    // Mock getElementById
    (document.getElementById as jest.Mock).mockReturnValue(document.createElement('div'));

    mockData = {
      summary: {
        totalApiCalls: 1234,
        successfulPublishes: 567,
        errorCount: 12,
        errorRate: 2.5,
        averageResponseTime: 156,
        uptime: 99.8
      },
      timeSeries: [
        {
          timestamp: new Date('2023-01-01T10:00:00Z'),
          apiCalls: 50,
          publishSuccess: 25,
          publishErrors: 1,
          responseTime: 150
        },
        {
          timestamp: new Date('2023-01-01T11:00:00Z'),
          apiCalls: 75,
          publishSuccess: 40,
          publishErrors: 2,
          responseTime: 160
        }
      ],
      topEndpoints: [
        { endpoint: '/api/publish', count: 800 },
        { endpoint: '/api/health', count: 200 }
      ],
      errorDistribution: [
        { type: 'validation_error', count: 8 },
        { type: 'auth_error', count: 4 }
      ],
      userActivity: [
        { userId: 'user1', activityCount: 150 },
        { userId: 'user2', activityCount: 89 }
      ],
      recentActivity: [
        {
          id: 'activity-1',
          timestamp: new Date(),
          type: 'publish_success',
          title: 'Post Published Successfully',
          endpoint: '/api/publish',
          method: 'POST',
          statusCode: 201,
          userId: 'user1',
          duration: 245
        }
      ]
    };
  });

  afterEach(() => {
    if (builder) {
      builder.destroy();
    }
  });

  it('should create overview dashboard', () => {
    expect(() => {
      builder.createOverviewDashboard('dashboard-container', mockData);
    }).not.toThrow();
  });

  it('should throw error for missing container', () => {
    (document.getElementById as jest.Mock).mockReturnValue(null);
    
    expect(() => {
      builder.createOverviewDashboard('missing-container', mockData);
    }).toThrow("Container with ID 'missing-container' not found");
  });

  it('should update dashboard', () => {
    builder.createOverviewDashboard('dashboard-container', mockData);
    
    const updatedData = {
      ...mockData,
      summary: {
        ...mockData.summary,
        totalApiCalls: 1500,
        errorRate: 1.8
      }
    };

    expect(() => {
      builder.updateDashboard(updatedData);
    }).not.toThrow();
  });

  it('should get components', () => {
    builder.createOverviewDashboard('dashboard-container', mockData);
    
    // Components should be registered
    expect(builder.getComponent('summary-api-calls')).toBeDefined();
    expect(builder.getComponent('api-usage-chart')).toBeDefined();
    expect(builder.getComponent('activity-log')).toBeDefined();
  });

  it('should destroy all components', () => {
    builder.createOverviewDashboard('dashboard-container', mockData);
    
    expect(() => builder.destroy()).not.toThrow();
    expect(builder.getComponent('summary-api-calls')).toBeUndefined();
  });
});

describe('Integration Tests', () => {
  it('should create complete dashboard with factory', () => {
    const mockData: MetricsData = {
      summary: {
        totalApiCalls: 1000,
        successfulPublishes: 800,
        errorCount: 20,
        errorRate: 2.0,
        averageResponseTime: 200,
        uptime: 99.5
      },
      timeSeries: [],
      topEndpoints: [],
      errorDistribution: [],
      userActivity: [],
      recentActivity: []
    };

    (document.getElementById as jest.Mock).mockReturnValue(document.createElement('div'));

    expect(() => {
      const { createPostCrafterDashboard } = require('../index');
      const dashboard = createPostCrafterDashboard('test-dashboard', mockData);
      expect(dashboard).toBeInstanceOf(DashboardBuilder);
    }).not.toThrow();
  });

  it('should handle empty metrics data gracefully', () => {
    const emptyData: MetricsData = {
      summary: {
        totalApiCalls: 0,
        successfulPublishes: 0,
        errorCount: 0,
        errorRate: 0,
        averageResponseTime: 0,
        uptime: 100
      },
      timeSeries: [],
      topEndpoints: [],
      errorDistribution: [],
      userActivity: [],
      recentActivity: []
    };

    const builder = new DashboardBuilder();
    (document.getElementById as jest.Mock).mockReturnValue(document.createElement('div'));

    expect(() => {
      builder.createOverviewDashboard('empty-dashboard', emptyData);
    }).not.toThrow();
  });
});
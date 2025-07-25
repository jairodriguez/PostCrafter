import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate, Counter, Gauge } from 'k6/metrics';

// System monitoring metrics
const apiResponseTime = new Trend('api_response_time');
const wordpressResponseTime = new Trend('wordpress_response_time');
const imageProcessingTime = new Trend('image_processing_time');
const seoProcessingTime = new Trend('seo_processing_time');
const errorRate = new Rate('api_error_rate');
const wordpressErrorRate = new Rate('wordpress_error_rate');
const requestThroughput = new Counter('request_throughput');
const memoryUsageEstimate = new Gauge('memory_usage_mb');
const cpuUsageEstimate = new Gauge('cpu_usage_percent');
const networkLatency = new Trend('network_latency');

// Configuration
const API_BASE_URL = __ENV.TEST_API_URL || 'http://localhost:3000';
const WORDPRESS_URL = __ENV.TEST_WORDPRESS_URL || 'https://test-wp.postcrafter.com';
const API_KEY = __ENV.TEST_API_KEY || 'test-api-key';
const MONITOR_INTERVAL = parseInt(__ENV.MONITOR_INTERVAL) || 30; // seconds

// Performance monitoring test
export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Warm up
    { duration: '10m', target: 25 },  // Steady monitoring load
    { duration: '1m', target: 0 },    // Cool down
  ],
  
  thresholds: {
    api_response_time: ['p(95)<3000'],
    wordpress_response_time: ['p(95)<2000'],
    image_processing_time: ['p(95)<8000'],
    seo_processing_time: ['p(95)<1000'],
    api_error_rate: ['rate<0.05'],
    network_latency: ['p(95)<500'],
  }
};

// Test scenarios for monitoring different aspects
const monitoringScenarios = {
  health_check: {
    weight: 20,
    endpoint: '/api/health',
    method: 'GET',
    data: null
  },
  
  simple_post: {
    weight: 30,
    endpoint: '/api/publish',
    method: 'POST',
    data: {
      title: 'Performance Monitor - Simple Post',
      content: 'Monitoring simple post creation performance.',
      status: 'draft'
    }
  },
  
  image_post: {
    weight: 25,
    endpoint: '/api/publish',
    method: 'POST',
    data: {
      title: 'Performance Monitor - Image Post',
      content: 'Monitoring image processing performance.',
      status: 'draft',
      images: [
        {
          url: 'https://picsum.photos/800/600?random=100',
          alt: 'Performance monitoring image',
          is_featured: false
        }
      ]
    }
  },
  
  seo_post: {
    weight: 20,
    endpoint: '/api/publish',
    method: 'POST',
    data: {
      title: 'Performance Monitor - SEO Post',
      content: 'Monitoring SEO processing performance.',
      status: 'draft',
      yoast_meta: {
        meta_title: 'Performance Monitor SEO Title',
        meta_description: 'Monitoring SEO field processing performance.',
        focus_keywords: ['performance', 'monitor', 'seo']
      }
    }
  },
  
  status_check: {
    weight: 5,
    endpoint: '/api/posts/status',
    method: 'GET',
    data: null
  }
};

// Main monitoring function
export default function() {
  const startTime = Date.now();
  
  // Select monitoring scenario
  const scenario = selectMonitoringScenario();
  
  // Execute monitoring request
  const response = executeMonitoringRequest(scenario);
  
  // Analyze performance metrics
  analyzePerformanceMetrics(response, scenario, startTime);
  
  // Monitor system health indicators
  monitorSystemHealth(response);
  
  // Estimate resource usage
  estimateResourceUsage(response, scenario);
  
  requestThroughput.add(1);
}

// Select monitoring scenario based on weighted distribution
function selectMonitoringScenario() {
  const scenarios = Object.entries(monitoringScenarios);
  const totalWeight = scenarios.reduce((sum, [_, scenario]) => sum + scenario.weight, 0);
  const random = Math.random() * totalWeight;
  
  let cumulativeWeight = 0;
  for (const [name, scenario] of scenarios) {
    cumulativeWeight += scenario.weight;
    if (random <= cumulativeWeight) {
      return { name, ...scenario };
    }
  }
  
  return { name: 'simple_post', ...monitoringScenarios.simple_post };
}

// Execute monitoring request with detailed timing
function executeMonitoringRequest(scenario) {
  const timestamp = Date.now();
  const randomId = Math.floor(Math.random() * 10000);
  
  // Prepare request data
  let requestData = scenario.data;
  if (requestData && requestData.title) {
    requestData = JSON.parse(JSON.stringify(requestData)); // Deep clone
    requestData.title += ` ${timestamp}-${randomId}`;
  }
  
  // Configure request parameters
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      'X-Monitor-Test': 'true',
      'X-Scenario': scenario.name,
    },
    tags: { 
      endpoint: scenario.endpoint,
      scenario: scenario.name,
      monitor: 'performance'
    },
    timeout: '30s',
  };
  
  // Execute request with timing
  const networkStart = Date.now();
  let response;
  
  if (scenario.method === 'GET') {
    response = http.get(`${API_BASE_URL}${scenario.endpoint}`, params);
  } else {
    response = http.post(`${API_BASE_URL}${scenario.endpoint}`, JSON.stringify(requestData), params);
  }
  
  const networkEnd = Date.now();
  networkLatency.add(networkEnd - networkStart);
  
  return response;
}

// Analyze performance metrics from response
function analyzePerformanceMetrics(response, scenario, startTime) {
  const totalTime = Date.now() - startTime;
  
  // Record API response time
  apiResponseTime.add(response.timings.duration);
  
  // Scenario-specific metric tracking
  switch (scenario.name) {
    case 'health_check':
      // Health checks should be very fast
      check(response, {
        'health check fast': (r) => r.timings.duration < 500,
        'health check successful': (r) => r.status === 200
      });
      break;
      
    case 'simple_post':
      // Simple posts should be processed quickly
      check(response, {
        'simple post fast': (r) => r.timings.duration < 3000,
        'simple post successful': (r) => r.status === 200
      });
      break;
      
    case 'image_post':
      // Image posts take longer due to processing
      imageProcessingTime.add(response.timings.duration);
      check(response, {
        'image post processed': (r) => r.timings.duration < 8000,
        'image post successful': (r) => r.status === 200
      });
      break;
      
    case 'seo_post':
      // SEO posts have additional processing
      seoProcessingTime.add(response.timings.duration);
      check(response, {
        'seo post processed': (r) => r.timings.duration < 4000,
        'seo post successful': (r) => r.status === 200
      });
      break;
      
    case 'status_check':
      // Status checks should be very fast
      check(response, {
        'status check fast': (r) => r.timings.duration < 1000,
        'status check successful': (r) => r.status === 200
      });
      break;
  }
  
  // Record errors
  if (response.status >= 400) {
    errorRate.add(1);
    
    console.warn(`Performance monitoring error - Scenario: ${scenario.name}`, {
      status: response.status,
      duration: response.timings.duration,
      url: response.url,
      body_preview: response.body ? response.body.substring(0, 100) : 'No body'
    });
  } else {
    errorRate.add(0);
  }
}

// Monitor system health indicators
function monitorSystemHealth(response) {
  // Analyze response timing breakdown
  if (response.timings) {
    const timings = response.timings;
    
    // DNS lookup time
    if (timings.looking_up > 100) {
      console.warn(`Slow DNS lookup: ${timings.looking_up}ms`);
    }
    
    // TCP connection time
    if (timings.connecting > 200) {
      console.warn(`Slow TCP connection: ${timings.connecting}ms`);
    }
    
    // TLS handshake time
    if (timings.tls_handshaking > 300) {
      console.warn(`Slow TLS handshake: ${timings.tls_handshaking}ms`);
    }
    
    // Server processing time
    if (timings.waiting > 5000) {
      console.warn(`Slow server processing: ${timings.waiting}ms`);
    }
    
    // Data transfer time
    if (timings.receiving > 1000) {
      console.warn(`Slow data transfer: ${timings.receiving}ms`);
    }
  }
  
  // Check for specific error patterns
  if (response.status === 429) {
    console.log('Rate limiting detected - system protecting itself');
  }
  
  if (response.status === 503) {
    console.warn('Service unavailable - possible system overload');
  }
  
  if (response.status === 502 || response.status === 504) {
    console.error('Gateway errors detected - infrastructure issues');
  }
}

// Estimate resource usage based on request characteristics
function estimateResourceUsage(response, scenario) {
  let memoryEstimate = 0;
  let cpuEstimate = 0;
  
  // Base memory usage
  memoryEstimate += 10; // Base MB per request
  
  // Additional estimates based on scenario
  switch (scenario.name) {
    case 'simple_post':
      memoryEstimate += 5;
      cpuEstimate += 10;
      break;
      
    case 'image_post':
      memoryEstimate += 20; // Image processing
      cpuEstimate += 30;
      break;
      
    case 'seo_post':
      memoryEstimate += 8; // SEO processing
      cpuEstimate += 15;
      break;
      
    case 'health_check':
      memoryEstimate += 1;
      cpuEstimate += 2;
      break;
      
    case 'status_check':
      memoryEstimate += 3;
      cpuEstimate += 5;
      break;
  }
  
  // Adjust estimates based on response time (slower = more resources)
  if (response.timings.duration > 5000) {
    memoryEstimate *= 1.5;
    cpuEstimate *= 1.5;
  }
  
  // Record estimates
  memoryUsageEstimate.add(memoryEstimate);
  cpuUsageEstimate.add(cpuEstimate);
  
  // Log resource warnings
  if (memoryEstimate > 50) {
    console.warn(`High memory usage estimated: ${memoryEstimate}MB for ${scenario.name}`);
  }
  
  if (cpuEstimate > 50) {
    console.warn(`High CPU usage estimated: ${cpuEstimate}% for ${scenario.name}`);
  }
}

// WordPress-specific monitoring
function monitorWordPressIntegration() {
  // Test WordPress API directly (if accessible)
  if (WORDPRESS_URL && WORDPRESS_URL !== 'https://test-wp.postcrafter.com') {
    const wpStart = Date.now();
    const wpResponse = http.get(`${WORDPRESS_URL}/wp-json/wp/v2/posts?per_page=1`, {
      timeout: '10s',
      tags: { endpoint: 'wordpress', type: 'direct' }
    });
    const wpTime = Date.now() - wpStart;
    
    wordpressResponseTime.add(wpTime);
    
    if (wpResponse.status >= 400) {
      wordpressErrorRate.add(1);
      console.warn(`WordPress API error: ${wpResponse.status}`);
    } else {
      wordpressErrorRate.add(0);
    }
  }
}

// Performance analysis and recommendations
function analyzePerformanceData() {
  const currentTime = Date.now();
  
  // This would typically be called periodically
  // For now, we'll just log some analysis
  
  console.log('\n📊 Performance Analysis:');
  console.log(`Timestamp: ${new Date(currentTime).toISOString()}`);
  console.log('Detailed metrics available in k6 output');
}

// Setup function for performance monitoring
export function setup() {
  console.log('🔍 Starting Performance Monitoring');
  console.log(`API URL: ${API_BASE_URL}`);
  console.log(`WordPress URL: ${WORDPRESS_URL}`);
  console.log(`Monitor Interval: ${MONITOR_INTERVAL}s`);
  
  // Initial health check
  const healthResponse = http.get(`${API_BASE_URL}/api/health`, {
    timeout: '10s'
  });
  
  if (healthResponse.status !== 200) {
    console.error('❌ Initial health check failed');
    throw new Error('API not healthy - aborting monitoring');
  }
  
  console.log('✅ Initial health check passed');
  console.log('📈 Beginning performance monitoring...');
  
  // Test WordPress connectivity if URL provided
  if (WORDPRESS_URL && WORDPRESS_URL !== 'https://test-wp.postcrafter.com') {
    const wpResponse = http.get(`${WORDPRESS_URL}/wp-json/wp/v2/`, {
      timeout: '10s'
    });
    
    if (wpResponse.status === 200) {
      console.log('✅ WordPress API accessible');
    } else {
      console.warn(`⚠️ WordPress API check failed: ${wpResponse.status}`);
    }
  }
  
  return {
    startTime: Date.now(),
    monitoringActive: true
  };
}

// Teardown function with performance summary
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 60000; // minutes
  
  console.log('\n📊 PERFORMANCE MONITORING SUMMARY');
  console.log('=====================================');
  console.log(`Duration: ${duration.toFixed(2)} minutes`);
  console.log('Detailed metrics:');
  console.log('- API Response Times: See api_response_time metric');
  console.log('- Network Latency: See network_latency metric');
  console.log('- Error Rates: See api_error_rate metric');
  console.log('- Resource Usage: See memory_usage_mb and cpu_usage_percent metrics');
  
  // Final health check
  const finalHealthResponse = http.get(`${API_BASE_URL}/api/health`, {
    timeout: '10s'
  });
  
  if (finalHealthResponse.status === 200) {
    console.log('✅ Final health check passed');
  } else {
    console.log(`⚠️ Final health check failed: ${finalHealthResponse.status}`);
  }
  
  console.log('\n📋 Performance Monitoring Complete');
  console.log('Review the k6 output above for detailed performance metrics');
}
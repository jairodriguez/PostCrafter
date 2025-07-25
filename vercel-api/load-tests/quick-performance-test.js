import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const successfulRequests = new Counter('successful_requests');

// Test configuration
const API_BASE_URL = __ENV.TEST_API_URL || 'https://httpbin.org'; // Using httpbin for demo
const TEST_DURATION = __ENV.TEST_DURATION || '2m';

// Quick performance test
export const options = {
  stages: [
    // Warm-up phase
    { duration: '30s', target: 5 },    // Ramp up to 5 users over 30 seconds
    { duration: '1m', target: 5 },     // Stay at 5 users for 1 minute
    
    // Load increase phase
    { duration: '30s', target: 15 },   // Ramp up to 15 users over 30 seconds
    { duration: '1m', target: 15 },    // Stay at 15 users for 1 minute
    
    // Peak load phase
    { duration: '30s', target: 25 },   // Ramp up to 25 users over 30 seconds
    { duration: '1m', target: 25 },    // Stay at 25 users for 1 minute
    
    // Recovery phase
    { duration: '30s', target: 5 },    // Ramp down to 5 users
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  
  thresholds: {
    // Performance thresholds
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_failed: ['rate<0.05'],    // Error rate should be below 5%
    response_time: ['p(95)<2000'],     // Custom metric threshold
    errors: ['rate<0.05'],             // Error rate should be below 5%
  },
  
  // Additional test configuration
  maxRedirects: 4,
  discardResponseBodies: false,
  noConnectionReuse: false,
  userAgent: 'PostCrafter-PerformanceTest/1.0',
};

// Test scenarios
const testScenarios = {
  health_check: {
    weight: 30,
    endpoint: '/status/200',
    method: 'GET',
    description: 'Health check endpoint'
  },
  
  simple_get: {
    weight: 40,
    endpoint: '/get',
    method: 'GET',
    description: 'Simple GET request'
  },
  
  post_request: {
    weight: 20,
    endpoint: '/post',
    method: 'POST',
    description: 'POST request with data',
    data: {
      title: 'Performance Test Post',
      content: 'This is a test post for performance testing.',
      status: 'draft'
    }
  },
  
  delay_simulation: {
    weight: 10,
    endpoint: '/delay/1',
    method: 'GET',
    description: 'Simulated delay endpoint'
  }
};

// Helper function to select test scenario
function selectTestScenario() {
  const random = Math.random() * 100;
  let cumulativeWeight = 0;
  
  for (const [key, scenario] of Object.entries(testScenarios)) {
    cumulativeWeight += scenario.weight;
    if (random <= cumulativeWeight) {
      return scenario;
    }
  }
  
  return testScenarios.health_check; // Default fallback
}

// Main test function
export default function() {
  const scenario = selectTestScenario();
  const url = `${API_BASE_URL}${scenario.endpoint}`;
  const startTime = Date.now();
  
  let response;
  
  if (scenario.method === 'POST') {
    response = http.post(url, JSON.stringify(scenario.data), {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'test-api-key',
        'User-Agent': 'PostCrafter-PerformanceTest/1.0'
      }
    });
  } else {
    response = http.get(url, {
      headers: {
        'X-API-Key': 'test-api-key',
        'User-Agent': 'PostCrafter-PerformanceTest/1.0'
      }
    });
  }
  
  const endTime = Date.now();
  const responseTimeMs = endTime - startTime;
  
  // Record metrics
  responseTime.add(responseTimeMs);
  
  // Check response
  const success = check(response, {
    [`${scenario.description} - status is 200`]: (r) => r.status === 200,
    [`${scenario.description} - response time < 2000ms`]: (r) => r.timings.duration < 2000,
    [`${scenario.description} - response has body`]: (r) => r.body.length > 0,
  });
  
  if (success) {
    successfulRequests.add(1);
  } else {
    errorRate.add(1);
  }
  
  // Add some think time between requests
  sleep(Math.random() * 2 + 1); // Random sleep between 1-3 seconds
}

// Setup function
export function setup() {
  console.log('🚀 Starting PostCrafter Performance Test');
  console.log(`📊 Test Duration: ${TEST_DURATION}`);
  console.log(`🌐 Target URL: ${API_BASE_URL}`);
  console.log(`📈 Max Users: 25`);
  console.log('='.repeat(60));
  
  return {
    testStartTime: Date.now(),
    apiBaseUrl: API_BASE_URL
  };
}

// Teardown function
export function teardown(data) {
  const testDuration = Date.now() - data.testStartTime;
  console.log('\n' + '='.repeat(60));
  console.log('📊 PERFORMANCE TEST COMPLETED');
  console.log('='.repeat(60));
  console.log(`⏱️  Total Test Duration: ${Math.round(testDuration / 1000)}s`);
  console.log(`🌐 Tested API: ${data.apiBaseUrl}`);
  console.log('📋 Check the metrics above for detailed results');
  console.log('💡 For production testing, update TEST_API_URL environment variable');
  console.log('='.repeat(60));
}

// Handle test scenarios
export function handleSummary(data) {
  const summary = {
    'performance-test-results.json': JSON.stringify(data, null, 2),
    stdout: `
============================================================
POSTCRAFTER PERFORMANCE TEST SUMMARY
============================================================

Test Configuration:
- Duration: ${TEST_DURATION}
- Target API: ${API_BASE_URL}
- Max Concurrent Users: 25

Performance Metrics:
- Total Requests: ${data.metrics.http_reqs.values.count}
- Failed Requests: ${data.metrics.http_req_failed.values.passes}
- Success Rate: ${((1 - data.metrics.http_req_failed.values.rate) * 100).toFixed(2)}%
- Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
- 95th Percentile Response Time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
- Requests per Second: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s

Threshold Results:
${Object.entries(data.metrics).map(([metric, values]) => {
  if (values.thresholds) {
    return Object.entries(values.thresholds).map(([threshold, result]) => 
      `- ${metric} ${threshold}: ${result ? '✅ PASS' : '❌ FAIL'}`
    ).join('\n');
  }
  return '';
}).filter(Boolean).join('\n')}

Recommendations:
${data.metrics.http_req_failed.values.rate > 0.05 ? '- ⚠️ Error rate is above 5% - investigate failures' : '- ✅ Error rate is acceptable'}
${data.metrics.http_req_duration.values['p(95)'] > 2000 ? '- ⚠️ 95th percentile response time is above 2s - optimize performance' : '- ✅ Response times are acceptable'}
${data.metrics.http_reqs.values.rate < 10 ? '- ⚠️ Throughput is low - consider scaling' : '- ✅ Throughput is good'}

============================================================
    `
  };
  
  return summary;
} 
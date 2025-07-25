import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics for stress testing
const errorRate = new Rate('stress_errors');
const responseTime = new Trend('stress_response_time');
const concurrentUsers = new Gauge('concurrent_users');
const memoryUsage = new Trend('memory_usage_estimate');
const breakingPoint = new Gauge('breaking_point_users');

// Test configuration
const API_BASE_URL = __ENV.TEST_API_URL || 'http://localhost:3000';
const API_KEY = __ENV.TEST_API_KEY || 'test-api-key';
const STRESS_TYPE = __ENV.STRESS_TYPE || 'spike'; // spike, endurance, breaking_point

// Stress test configurations
const stressConfigs = {
  // Spike test: sudden load increase
  spike: {
    stages: [
      { duration: '30s', target: 10 },   // Normal load
      { duration: '10s', target: 200 },  // Sudden spike
      { duration: '2m', target: 200 },   // Sustained spike
      { duration: '30s', target: 10 },   // Back to normal
      { duration: '30s', target: 0 },    // Cool down
    ],
    thresholds: {
      http_req_duration: ['p(95)<10000'], // More lenient during spike
      http_req_failed: ['rate<0.15'],     // Allow higher error rate
    }
  },

  // Endurance test: sustained load over extended period
  endurance: {
    stages: [
      { duration: '2m', target: 20 },    // Ramp up
      { duration: '30m', target: 20 },   // Sustained load for 30 minutes
      { duration: '2m', target: 0 },     // Ramp down
    ],
    thresholds: {
      http_req_duration: ['p(95)<5000'],
      http_req_failed: ['rate<0.05'],
      stress_response_time: ['p(99)<8000'], // 99th percentile threshold
    }
  },

  // Breaking point test: gradually increase until system breaks
  breaking_point: {
    stages: [
      { duration: '2m', target: 20 },    // Start moderate
      { duration: '3m', target: 50 },    // Increase
      { duration: '3m', target: 100 },   // More load
      { duration: '3m', target: 150 },   // Even more
      { duration: '3m', target: 200 },   // High load
      { duration: '3m', target: 300 },   // Very high load
      { duration: '3m', target: 500 },   // Extreme load
      { duration: '2m', target: 0 },     // Cool down
    ],
    thresholds: {
      http_req_duration: ['p(95)<15000'], // Very lenient
      http_req_failed: ['rate<0.30'],     // Expect failures at breaking point
    }
  },

  // Memory stress test: large payloads to test memory handling
  memory_stress: {
    stages: [
      { duration: '1m', target: 10 },    // Warm up
      { duration: '5m', target: 30 },    // Sustained large payloads
      { duration: '1m', target: 0 },     // Cool down
    ],
    thresholds: {
      http_req_duration: ['p(95)<20000'], // Large payloads take time
      http_req_failed: ['rate<0.10'],
      memory_usage_estimate: ['p(95)<1000'], // MB estimate
    }
  }
};

// Set options based on stress type
export const options = stressConfigs[STRESS_TYPE] || stressConfigs.spike;

// Large content for memory stress testing
const largeContent = {
  title: 'Memory Stress Test - Extremely Large Post',
  content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(5000), // ~250KB
  status: 'draft',
  categories: Array.from({length: 50}, (_, i) => `MemoryTestCategory${i + 1}`),
  tags: Array.from({length: 100}, (_, i) => `memory-stress-tag-${i + 1}`),
  yoast_meta: {
    meta_title: 'Memory Stress Test Post with Very Long Title That Tests Memory Allocation',
    meta_description: 'This is an extremely long meta description designed to test memory allocation and processing under stress conditions. '.repeat(10),
    focus_keywords: Array.from({length: 20}, (_, i) => `memory-keyword-${i + 1}`)
  },
  images: Array.from({length: 10}, (_, i) => ({
    url: `https://picsum.photos/2000/2000?random=${i + 100}`, // Large images
    alt: `Memory stress test image ${i + 1} with very long alt text that tests memory allocation`,
    is_featured: i === 0
  }))
};

// Test data for different stress scenarios
const stressTestData = {
  rapid_fire: {
    title: 'Rapid Fire Test Post',
    content: 'Quick post for rapid-fire testing.',
    status: 'draft'
  },
  
  concurrent_heavy: {
    title: 'Concurrent Heavy Load Test',
    content: 'Heavy post with multiple features for concurrent testing.',
    status: 'draft',
    categories: ['StressTest', 'Performance', 'ConcurrentLoad'],
    tags: ['stress', 'concurrent', 'heavy', 'load'],
    yoast_meta: {
      meta_title: 'Concurrent Heavy Load Test Post',
      meta_description: 'Testing concurrent heavy load scenarios.',
      focus_keywords: ['concurrent', 'heavy', 'load']
    },
    images: [
      {
        url: 'https://picsum.photos/1200/800?random=500',
        alt: 'Concurrent test image',
        is_featured: true
      }
    ]
  }
};

// Main test function
export default function() {
  const startTime = Date.now();
  const currentStage = getCurrentStage();
  
  // Record current user count
  concurrentUsers.add(__VU);
  
  // Choose test strategy based on stress type and current load
  let testData, testType;
  
  switch (STRESS_TYPE) {
    case 'spike':
      testData = currentStage.target > 100 ? stressTestData.rapid_fire : stressTestData.concurrent_heavy;
      testType = 'spike';
      break;
      
    case 'endurance':
      testData = stressTestData.concurrent_heavy;
      testType = 'endurance';
      break;
      
    case 'breaking_point':
      testData = currentStage.target > 200 ? stressTestData.rapid_fire : stressTestData.concurrent_heavy;
      testType = 'breaking_point';
      break;
      
    case 'memory_stress':
      testData = largeContent;
      testType = 'memory_stress';
      break;
      
    default:
      testData = stressTestData.concurrent_heavy;
      testType = 'default';
  }
  
  // Add randomization to test data
  const randomizedData = randomizeTestData(testData);
  
  // Execute stress test
  const response = executeStressTest(randomizedData, testType, currentStage.target);
  
  // Validate response and record metrics
  validateStressResponse(response, testType, currentStage.target);
  
  // Record total response time
  responseTime.add(Date.now() - startTime);
  
  // Estimate memory usage based on payload size
  if (testType === 'memory_stress') {
    const payloadSize = JSON.stringify(randomizedData).length / (1024 * 1024); // MB
    memoryUsage.add(payloadSize);
  }
  
  // Adjust sleep time based on stress type
  const sleepTime = getSleepTime(testType, currentStage.target);
  sleep(sleepTime);
}

// Helper function to get current stage info
function getCurrentStage() {
  const executionTime = Date.now() - __ENV.TEST_START_TIME || Date.now();
  const stages = options.stages;
  let cumulativeDuration = 0;
  
  for (const stage of stages) {
    const stageDurationMs = parseDuration(stage.duration);
    if (executionTime < cumulativeDuration + stageDurationMs) {
      return stage;
    }
    cumulativeDuration += stageDurationMs;
  }
  
  return stages[stages.length - 1]; // Return last stage if beyond all stages
}

// Helper function to parse duration string to milliseconds
function parseDuration(duration) {
  const match = duration.match(/(\d+)([sm])/);
  if (!match) return 60000; // Default 1 minute
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  return unit === 's' ? value * 1000 : value * 60 * 1000;
}

// Helper function to randomize test data
function randomizeTestData(baseData) {
  const data = JSON.parse(JSON.stringify(baseData)); // Deep clone
  const timestamp = Date.now();
  const vuId = __VU;
  const randomId = Math.floor(Math.random() * 10000);
  
  data.title += ` ${timestamp}-VU${vuId}-${randomId}`;
  
  return data;
}

// Execute stress test with monitoring
function executeStressTest(testData, testType, currentUsers) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      'X-Stress-Test': testType,
      'X-Current-Users': currentUsers.toString(),
    },
    tags: { 
      endpoint: 'publish', 
      stress_type: testType,
      user_load: currentUsers > 100 ? 'high' : currentUsers > 50 ? 'medium' : 'low'
    },
    timeout: testType === 'memory_stress' ? '60s' : '30s',
  };
  
  return http.post(`${API_BASE_URL}/api/publish`, JSON.stringify(testData), params);
}

// Validate stress test response
function validateStressResponse(response, testType, currentUsers) {
  const checks = {
    'response received': (r) => r.status !== 0,
    'response time reasonable': (r) => {
      const maxTime = testType === 'memory_stress' ? 60000 : 
                     testType === 'breaking_point' && currentUsers > 300 ? 20000 : 
                     10000;
      return r.timings.duration < maxTime;
    }
  };
  
  // Add success checks only if we're not in extreme stress conditions
  if (testType !== 'breaking_point' || currentUsers < 400) {
    checks['status is 200 or 429'] = (r) => r.status === 200 || r.status === 429; // Allow rate limiting
    checks['has response body'] = (r) => r.body && r.body.length > 0;
  }
  
  const isSuccess = check(response, checks);
  
  if (!isSuccess) {
    errorRate.add(1);
    
    // Log detailed error information for stress analysis
    console.error(`Stress test failure - Type: ${testType}, Users: ${currentUsers}`, {
      status: response.status,
      duration: response.timings.duration,
      body_preview: response.body ? response.body.substring(0, 100) : 'No body',
      vu: __VU,
      timestamp: new Date().toISOString()
    });
    
    // Record breaking point if we're in breaking point test
    if (testType === 'breaking_point' && response.status === 0) {
      breakingPoint.add(currentUsers);
    }
  }
  
  // Check for specific stress indicators
  if (response.status === 429) {
    console.log(`Rate limiting activated at ${currentUsers} users`);
  }
  
  if (response.status === 503) {
    console.log(`Service unavailable at ${currentUsers} users - possible overload`);
  }
  
  if (response.timings.duration > 15000) {
    console.log(`Slow response detected: ${response.timings.duration}ms at ${currentUsers} users`);
  }
}

// Get appropriate sleep time based on stress type and load
function getSleepTime(testType, currentUsers) {
  switch (testType) {
    case 'spike':
      return currentUsers > 100 ? Math.random() * 0.5 + 0.1 : Math.random() * 2 + 1; // Faster during spike
      
    case 'endurance':
      return Math.random() * 3 + 1; // Consistent moderate pace
      
    case 'breaking_point':
      return currentUsers > 200 ? Math.random() * 0.3 + 0.1 : Math.random() * 1 + 0.5; // Increasingly aggressive
      
    case 'memory_stress':
      return Math.random() * 2 + 2; // Slower to allow memory processing
      
    default:
      return Math.random() * 2 + 1;
  }
}

// Setup function for stress tests
export function setup() {
  console.log(`🚀 Starting PostCrafter Stress Test: ${STRESS_TYPE.toUpperCase()}`);
  console.log(`API URL: ${API_BASE_URL}`);
  console.log(`Test configuration:`, JSON.stringify(options.stages, null, 2));
  
  // Store test start time for stage calculation
  __ENV.TEST_START_TIME = Date.now();
  
  // Verify API health before stress testing
  const healthResponse = http.get(`${API_BASE_URL}/api/health`, {
    timeout: '10s',
    tags: { endpoint: 'health' }
  });
  
  if (healthResponse.status !== 200) {
    console.error('❌ API health check failed before stress test');
    throw new Error('API not healthy - aborting stress test');
  }
  
  console.log('✅ API healthy - beginning stress test');
  
  // Log stress test parameters
  console.log(`Stress test parameters:`);
  console.log(`- Test type: ${STRESS_TYPE}`);
  console.log(`- Maximum target users: ${Math.max(...options.stages.map(s => s.target))}`);
  console.log(`- Total duration: ${options.stages.reduce((sum, s) => sum + parseDuration(s.duration), 0) / 60000} minutes`);
  
  return { 
    testStartTime: Date.now(),
    stressType: STRESS_TYPE,
    maxUsers: Math.max(...options.stages.map(s => s.target))
  };
}

// Teardown function for stress tests
export function teardown(data) {
  const duration = (Date.now() - data.testStartTime) / 60000; // minutes
  
  console.log(`📊 Stress Test Complete: ${data.stressType.toUpperCase()}`);
  console.log(`Duration: ${duration.toFixed(2)} minutes`);
  console.log(`Maximum users: ${data.maxUsers}`);
  
  // Final health check
  console.log('🔧 Running post-stress health check...');
  const finalHealthResponse = http.get(`${API_BASE_URL}/api/health`, {
    timeout: '15s'
  });
  
  if (finalHealthResponse.status === 200) {
    console.log('✅ API healthy after stress test');
    
    try {
      const healthData = JSON.parse(finalHealthResponse.body);
      if (healthData.metrics) {
        console.log('📈 Post-stress metrics:', healthData.metrics);
      }
    } catch (e) {
      // Ignore JSON parsing errors
    }
  } else {
    console.log(`⚠️ API health degraded after stress test (Status: ${finalHealthResponse.status})`);
  }
  
  // Log breaking point if detected
  if (breakingPoint.value > 0) {
    console.log(`💥 Breaking point detected at approximately ${breakingPoint.value} concurrent users`);
  }
  
  // Stress test summary
  console.log('\n📋 STRESS TEST SUMMARY:');
  console.log(`Test Type: ${data.stressType}`);
  console.log(`Duration: ${duration.toFixed(2)} minutes`);
  console.log(`Max Concurrent Users: ${data.maxUsers}`);
  console.log(`See detailed metrics in the k6 output above`);
}
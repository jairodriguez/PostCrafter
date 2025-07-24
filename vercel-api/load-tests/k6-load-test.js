import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const successfulPosts = new Counter('successful_posts');
const failedPosts = new Counter('failed_posts');
const imageUploadTime = new Trend('image_upload_time');
const seoProcessingTime = new Trend('seo_processing_time');

// Test configuration from environment variables
const API_BASE_URL = __ENV.TEST_API_URL || 'http://localhost:3000';
const WORDPRESS_URL = __ENV.TEST_WORDPRESS_URL || 'https://test-wp.postcrafter.com';
const API_KEY = __ENV.TEST_API_KEY || 'test-api-key';

// Load test scenarios
export const options = {
  stages: [
    // Warm-up phase
    { duration: '2m', target: 5 },    // Ramp up to 5 users over 2 minutes
    { duration: '5m', target: 5 },    // Stay at 5 users for 5 minutes
    
    // Load increase phase
    { duration: '2m', target: 15 },   // Ramp up to 15 users over 2 minutes
    { duration: '5m', target: 15 },   // Stay at 15 users for 5 minutes
    
    // Peak load phase
    { duration: '2m', target: 30 },   // Ramp up to 30 users over 2 minutes
    { duration: '5m', target: 30 },   // Stay at 30 users for 5 minutes
    
    // Stress phase
    { duration: '2m', target: 50 },   // Ramp up to 50 users over 2 minutes
    { duration: '3m', target: 50 },   // Stay at 50 users for 3 minutes
    
    // Spike test
    { duration: '1m', target: 100 },  // Spike to 100 users over 1 minute
    { duration: '2m', target: 100 },  // Stay at 100 users for 2 minutes
    
    // Recovery phase
    { duration: '2m', target: 30 },   // Ramp down to 30 users
    { duration: '2m', target: 5 },    // Ramp down to 5 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  
  thresholds: {
    // Performance thresholds
    http_req_duration: ['p(95)<5000'], // 95% of requests should be below 5s
    http_req_failed: ['rate<0.05'],    // Error rate should be below 5%
    response_time: ['p(95)<5000'],     // Custom metric threshold
    errors: ['rate<0.05'],             // Error rate should be below 5%
    
    // Specific endpoint thresholds
    'http_req_duration{endpoint:publish}': ['p(95)<3000'], // Publish endpoint
    'http_req_duration{endpoint:health}': ['p(95)<500'],   // Health endpoint
    'http_req_duration{endpoint:status}': ['p(95)<1000'],  // Status endpoint
  },
  
  // Additional test configuration
  maxRedirects: 4,
  discardResponseBodies: false, // Keep response bodies for debugging
  noConnectionReuse: false,
  userAgent: 'PostCrafter-LoadTest/1.0',
};

// Test data templates
const testPosts = {
  simple: {
    title: 'Load Test - Simple Post',
    content: 'This is a simple post for load testing purposes.',
    status: 'draft'
  },
  
  withImage: {
    title: 'Load Test - Post with Image',
    content: 'This post includes an image for load testing image processing.',
    status: 'draft',
    images: [
      {
        url: 'https://picsum.photos/800/600?random=1',
        alt: 'Load test image',
        is_featured: false
      }
    ]
  },
  
  withSEO: {
    title: 'Load Test - SEO Optimized Post',
    content: 'This post includes SEO metadata for testing Yoast integration under load.',
    status: 'draft',
    yoast_meta: {
      meta_title: 'Load Test SEO Title',
      meta_description: 'This is a meta description for load testing.',
      focus_keywords: ['load', 'test', 'seo']
    }
  },
  
  complex: {
    title: 'Load Test - Complex Post',
    content: 'This is a complex post with multiple features for comprehensive load testing.',
    status: 'draft',
    categories: ['Technology', 'Testing', 'Performance'],
    tags: ['load-test', 'api', 'performance', 'k6'],
    yoast_meta: {
      meta_title: 'Complex Load Test Post - SEO Optimized',
      meta_description: 'A comprehensive post for testing all features under load.',
      focus_keywords: ['complex', 'load', 'test']
    },
    images: [
      {
        url: 'https://picsum.photos/1200/800?random=2',
        alt: 'Complex test featured image',
        is_featured: true
      },
      {
        url: 'https://picsum.photos/600/400?random=3',
        alt: 'Complex test secondary image',
        is_featured: false
      }
    ]
  },
  
  large: {
    title: 'Load Test - Large Content Post',
    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(500), // Large content
    status: 'draft',
    categories: Array.from({length: 10}, (_, i) => `Category${i + 1}`),
    tags: Array.from({length: 20}, (_, i) => `tag${i + 1}`),
    yoast_meta: {
      meta_title: 'Large Content Load Test Post',
      meta_description: 'Testing large content processing under load conditions.',
      focus_keywords: Array.from({length: 5}, (_, i) => `keyword${i + 1}`)
    }
  }
};

// Helper function to get random test data
function getRandomTestPost() {
  const postTypes = Object.keys(testPosts);
  const randomType = postTypes[Math.floor(Math.random() * postTypes.length)];
  const post = JSON.parse(JSON.stringify(testPosts[randomType])); // Deep clone
  
  // Add randomization to avoid duplicates
  const timestamp = Date.now();
  const randomId = Math.floor(Math.random() * 10000);
  post.title += ` ${timestamp}-${randomId}`;
  
  return { type: randomType, data: post };
}

// Main test function
export default function() {
  const startTime = Date.now();
  
  // Randomly select test scenario (weighted distribution)
  const scenarios = [
    { weight: 40, func: testSimplePost },      // 40% simple posts
    { weight: 25, func: testPostWithImage },   // 25% posts with images
    { weight: 20, func: testSEOPost },         // 20% SEO posts
    { weight: 10, func: testComplexPost },     // 10% complex posts
    { weight: 5, func: testLargePost }         // 5% large posts
  ];
  
  const random = Math.random() * 100;
  let cumulativeWeight = 0;
  
  for (const scenario of scenarios) {
    cumulativeWeight += scenario.weight;
    if (random <= cumulativeWeight) {
      scenario.func();
      break;
    }
  }
  
  // Record response time
  responseTime.add(Date.now() - startTime);
  
  // Random sleep between 1-5 seconds to simulate user behavior
  sleep(Math.random() * 4 + 1);
}

// Test scenarios
function testSimplePost() {
  const { type, data } = getRandomTestPost();
  if (type !== 'simple') {
    data.images = undefined;
    data.yoast_meta = undefined;
    data.categories = undefined;
    data.tags = undefined;
  }
  
  const response = publishPost(data, 'simple');
  validateResponse(response, 'simple');
}

function testPostWithImage() {
  const imageStartTime = Date.now();
  const { data } = getRandomTestPost();
  
  // Ensure we have an image
  if (!data.images) {
    data.images = testPosts.withImage.images;
  }
  
  const response = publishPost(data, 'image');
  imageUploadTime.add(Date.now() - imageStartTime);
  validateResponse(response, 'image');
}

function testSEOPost() {
  const seoStartTime = Date.now();
  const { data } = getRandomTestPost();
  
  // Ensure we have SEO data
  if (!data.yoast_meta) {
    data.yoast_meta = testPosts.withSEO.yoast_meta;
  }
  
  const response = publishPost(data, 'seo');
  seoProcessingTime.add(Date.now() - seoStartTime);
  validateResponse(response, 'seo');
}

function testComplexPost() {
  const { data } = testPosts.complex;
  const response = publishPost(data, 'complex');
  validateResponse(response, 'complex');
}

function testLargePost() {
  const { data } = testPosts.large;
  const response = publishPost(data, 'large');
  validateResponse(response, 'large');
}

// Helper function to publish a post
function publishPost(postData, testType) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    tags: { endpoint: 'publish', test_type: testType },
    timeout: '30s',
  };
  
  return http.post(`${API_BASE_URL}/api/publish`, JSON.stringify(postData), params);
}

// Response validation function
function validateResponse(response, testType) {
  const isSuccess = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 10s': (r) => r.timings.duration < 10000,
    'response has success field': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('success');
      } catch (e) {
        return false;
      }
    },
    'success is true': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch (e) {
        return false;
      }
    },
    'has post_id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.post_id && typeof body.post_id === 'number';
      } catch (e) {
        return false;
      }
    }
  });
  
  if (isSuccess) {
    successfulPosts.add(1);
  } else {
    failedPosts.add(1);
    errorRate.add(1);
    
    // Log error details for debugging
    console.error(`Test failed for ${testType}:`, {
      status: response.status,
      body: response.body.substring(0, 200),
      duration: response.timings.duration
    });
  }
  
  // Additional checks for specific test types
  if (testType === 'image' && isSuccess) {
    check(response, {
      'has images array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.images);
        } catch (e) {
          return false;
        }
      }
    });
  }
  
  if (testType === 'seo' && isSuccess) {
    check(response, {
      'SEO fields processed': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.yoast_meta || body.seo_processed;
        } catch (e) {
          return false;
        }
      }
    });
  }
}

// Setup function (runs once at the beginning)
export function setup() {
  console.log('🚀 Starting PostCrafter Load Test');
  console.log(`API URL: ${API_BASE_URL}`);
  console.log(`WordPress URL: ${WORDPRESS_URL}`);
  console.log('Test scenarios: Simple, Image, SEO, Complex, Large');
  
  // Health check before starting load test
  const healthResponse = http.get(`${API_BASE_URL}/api/health`, {
    timeout: '10s',
    tags: { endpoint: 'health' }
  });
  
  if (healthResponse.status !== 200) {
    console.error('❌ API health check failed:', healthResponse.status);
    throw new Error('API is not healthy - aborting load test');
  }
  
  console.log('✅ API health check passed');
  return { apiHealthy: true };
}

// Teardown function (runs once at the end)
export function teardown(data) {
  console.log('📊 Load test completed');
  console.log(`✅ Successful posts: ${successfulPosts.count}`);
  console.log(`❌ Failed posts: ${failedPosts.count}`);
  
  if (data.apiHealthy) {
    console.log('🔧 Running final health check...');
    const finalHealthResponse = http.get(`${API_BASE_URL}/api/health`, {
      timeout: '10s'
    });
    
    if (finalHealthResponse.status === 200) {
      console.log('✅ API still healthy after load test');
    } else {
      console.log('⚠️ API health degraded after load test');
    }
  }
}
import { jest } from '@jest/globals';
import axios from 'axios';
import { performance } from 'perf_hooks';
import { PublishRequest } from '../types';
import { PostStatus } from '../types/post-status';

// Mock axios for controlled testing
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Performance Tests', () => {
  const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';
  const TEST_API_KEY = process.env.TEST_API_KEY || 'test-api-key';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup successful WordPress responses
    mockedAxios.post.mockResolvedValue({
      status: 201,
      data: {
        id: 123,
        title: { rendered: 'Test Post' },
        content: { rendered: 'Test content' },
        status: 'draft',
        link: 'https://test-wp.com/test-post'
      }
    });
  });

  describe('Response Time Benchmarks (PERF-001 to PERF-005)', () => {
    test('PERF-001: Simple post creation < 3 seconds', async () => {
      const testData: PublishRequest = {
        title: 'Performance Test - Simple Post',
        content: 'Small content for performance testing.',
        status: 'draft' as PostStatus
      };

      const startTime = performance.now();
      const response = await makeAPIRequest('/api/publish', testData);
      const endTime = performance.now();
      
      const responseTime = endTime - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(3000); // 3 seconds
      
      console.log(`Simple post creation time: ${responseTime.toFixed(2)}ms`);
    });

    test('PERF-002: Post with single image < 5 seconds', async () => {
      const testData: PublishRequest = {
        title: 'Performance Test - Single Image',
        content: 'Content with single image for performance testing.',
        status: 'draft' as PostStatus,
        images: [
          {
            url: 'https://picsum.photos/800/600?random=1',
            alt: 'Performance test image',
            is_featured: false
          }
        ]
      };

      // Mock image upload
      mockedAxios.post.mockResolvedValueOnce({
        status: 201,
        data: {
          id: 201,
          source_url: 'https://test-wp.com/image.jpg',
          alt_text: 'Performance test image'
        }
      });

      const startTime = performance.now();
      const response = await makeAPIRequest('/api/publish', testData);
      const endTime = performance.now();
      
      const responseTime = endTime - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(5000); // 5 seconds
      
      console.log(`Single image post creation time: ${responseTime.toFixed(2)}ms`);
    });

    test('PERF-003: Post with multiple images < 10 seconds', async () => {
      const testData: PublishRequest = {
        title: 'Performance Test - Multiple Images',
        content: 'Content with multiple images for performance testing.',
        status: 'draft' as PostStatus,
        images: [
          {
            url: 'https://picsum.photos/800/600?random=2',
            alt: 'First performance test image',
            is_featured: false
          },
          {
            url: 'https://picsum.photos/800/600?random=3',
            alt: 'Second performance test image',
            is_featured: false
          },
          {
            url: 'https://picsum.photos/800/600?random=4',
            alt: 'Third performance test image',
            is_featured: false
          }
        ]
      };

      // Mock multiple image uploads
      mockedAxios.post
        .mockResolvedValueOnce({
          status: 201,
          data: { id: 202, source_url: 'https://test-wp.com/image1.jpg', alt_text: 'First image' }
        })
        .mockResolvedValueOnce({
          status: 201,
          data: { id: 203, source_url: 'https://test-wp.com/image2.jpg', alt_text: 'Second image' }
        })
        .mockResolvedValueOnce({
          status: 201,
          data: { id: 204, source_url: 'https://test-wp.com/image3.jpg', alt_text: 'Third image' }
        });

      const startTime = performance.now();
      const response = await makeAPIRequest('/api/publish', testData);
      const endTime = performance.now();
      
      const responseTime = endTime - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(10000); // 10 seconds
      
      console.log(`Multiple images post creation time: ${responseTime.toFixed(2)}ms`);
    });

    test('PERF-004: Concurrent requests performance', async () => {
      const testData: PublishRequest = {
        title: 'Concurrent Performance Test',
        content: 'Testing concurrent request handling.',
        status: 'draft' as PostStatus
      };

      const concurrentRequests = 5;
      const promises: Promise<any>[] = [];
      
      const startTime = performance.now();
      
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(makeAPIRequest('/api/publish', {
          ...testData,
          title: `${testData.title} ${i + 1}`
        }));
      }
      
      const responses = await Promise.all(promises);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrentRequests;
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      expect(averageTime).toBeLessThan(5000); // 5 seconds average
      
      console.log(`Concurrent requests (${concurrentRequests}): ${totalTime.toFixed(2)}ms total, ${averageTime.toFixed(2)}ms average`);
    });

    test('PERF-005: Large content post performance', async () => {
      const largeContent = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(1000);
      
      const testData: PublishRequest = {
        title: 'Performance Test - Large Content',
        content: largeContent,
        status: 'draft' as PostStatus,
        categories: ['Performance', 'Testing', 'Large Content'],
        tags: ['performance', 'load', 'testing', 'large'],
        yoast_meta: {
          meta_title: 'Large Performance Test - SEO Optimized',
          meta_description: 'This is a large post for performance testing with full SEO optimization.'
        }
      };

      const startTime = performance.now();
      const response = await makeAPIRequest('/api/publish', testData);
      const endTime = performance.now();
      
      const responseTime = endTime - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(10000); // 10 seconds
      
      console.log(`Large content post creation time: ${responseTime.toFixed(2)}ms`);
      console.log(`Content length: ${largeContent.length} characters`);
    });
  });

  describe('Load Testing Scenarios', () => {
    test('Burst load handling', async () => {
      const testData: PublishRequest = {
        title: 'Burst Load Test',
        content: 'Testing burst load scenario.',
        status: 'draft' as PostStatus
      };

      const burstSize = 10;
      const promises: Promise<any>[] = [];
      const responseTimes: number[] = [];
      
      for (let i = 0; i < burstSize; i++) {
        const promise = (async () => {
          const startTime = performance.now();
          const response = await makeAPIRequest('/api/publish', {
            ...testData,
            title: `${testData.title} ${i + 1}`
          });
          const endTime = performance.now();
          
          responseTimes.push(endTime - startTime);
          return response;
        })();
        
        promises.push(promise);
      }
      
      const responses = await Promise.all(promises);
      
      // Verify all requests succeeded
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Check performance metrics
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      
      expect(avgResponseTime).toBeLessThan(8000); // 8 seconds average
      expect(maxResponseTime).toBeLessThan(15000); // 15 seconds max
      
      console.log(`Burst load (${burstSize} requests):`);
      console.log(`  Average: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`  Min: ${minResponseTime.toFixed(2)}ms`);
      console.log(`  Max: ${maxResponseTime.toFixed(2)}ms`);
    });

    test('Sequential load testing', async () => {
      const testData: PublishRequest = {
        title: 'Sequential Load Test',
        content: 'Testing sequential load scenario.',
        status: 'draft' as PostStatus
      };

      const sequentialRequests = 5;
      const responseTimes: number[] = [];
      
      for (let i = 0; i < sequentialRequests; i++) {
        const startTime = performance.now();
        const response = await makeAPIRequest('/api/publish', {
          ...testData,
          title: `${testData.title} ${i + 1}`
        });
        const endTime = performance.now();
        
        responseTimes.push(endTime - startTime);
        expect(response.status).toBe(200);
      }
      
      // Check for performance degradation
      const firstHalf = responseTimes.slice(0, Math.floor(responseTimes.length / 2));
      const secondHalf = responseTimes.slice(Math.floor(responseTimes.length / 2));
      
      const firstHalfAvg = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length;
      
      // Performance should not degrade significantly
      const degradationRatio = secondHalfAvg / firstHalfAvg;
      expect(degradationRatio).toBeLessThan(2.0); // Less than 100% degradation
      
      console.log(`Sequential load (${sequentialRequests} requests):`);
      console.log(`  First half average: ${firstHalfAvg.toFixed(2)}ms`);
      console.log(`  Second half average: ${secondHalfAvg.toFixed(2)}ms`);
      console.log(`  Degradation ratio: ${degradationRatio.toFixed(2)}`);
    });
  });

  describe('Memory and Resource Testing', () => {
    test('Memory usage monitoring', async () => {
      const initialMemory = process.memoryUsage();
      
      const testData: PublishRequest = {
        title: 'Memory Test',
        content: 'A'.repeat(50000), // 50KB content
        status: 'draft' as PostStatus
      };

      const response = await makeAPIRequest('/api/publish', testData);
      expect(response.status).toBe(200);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB per request)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      console.log(`Memory usage:`);
      console.log(`  Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    test('Timeout handling', async () => {
      const testData: PublishRequest = {
        title: 'Timeout Test',
        content: 'Testing timeout scenario.',
        status: 'draft' as PostStatus
      };

      // Mock a slow response
      mockedAxios.post.mockImplementationOnce(() => 
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              status: 201,
              data: {
                id: 999,
                title: { rendered: 'Timeout Test' },
                content: { rendered: 'Testing timeout scenario.' },
                status: 'draft',
                link: 'https://test-wp.com/timeout-test'
              }
            });
          }, 15000); // 15 second delay
        })
      );

      const startTime = performance.now();
      
      try {
        const response = await makeAPIRequest('/api/publish', testData, {}, 10000); // 10 second timeout
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        // Should timeout around 10 seconds
        expect(responseTime).toBeGreaterThan(9000);
        expect(responseTime).toBeLessThan(12000);
        expect(error.code).toBe('ECONNABORTED');
        
        console.log(`Timeout test completed in ${responseTime.toFixed(2)}ms`);
      }
    });
  });

  describe('Stress Testing Edge Cases', () => {
    test('Maximum content size handling', async () => {
      const maxContent = 'X'.repeat(1000000); // 1MB content
      
      const testData: PublishRequest = {
        title: 'Max Content Size Test',
        content: maxContent,
        status: 'draft' as PostStatus
      };

      const startTime = performance.now();
      const response = await makeAPIRequest('/api/publish', testData);
      const endTime = performance.now();
      
      const responseTime = endTime - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(20000); // 20 seconds for large content
      
      console.log(`Max content size test: ${responseTime.toFixed(2)}ms for ${maxContent.length} characters`);
    });

    test('Complex data structure performance', async () => {
      const testData: PublishRequest = {
        title: 'Complex Data Test',
        content: 'Testing complex data structure performance.',
        status: 'draft' as PostStatus,
        categories: Array.from({ length: 20 }, (_, i) => `Category${i + 1}`),
        tags: Array.from({ length: 50 }, (_, i) => `tag${i + 1}`),
        yoast_meta: {
          meta_title: 'Complex SEO Test with Many Keywords',
          meta_description: 'This is a complex SEO test with extensive metadata for performance testing.',
          focus_keywords: Array.from({ length: 10 }, (_, i) => `keyword${i + 1}`)
        },
        images: Array.from({ length: 5 }, (_, i) => ({
          url: `https://picsum.photos/400/300?random=${i + 10}`,
          alt: `Complex test image ${i + 1}`,
          is_featured: i === 0
        }))
      };

      // Mock multiple image uploads
      for (let i = 0; i < 5; i++) {
        mockedAxios.post.mockResolvedValueOnce({
          status: 201,
          data: {
            id: 300 + i,
            source_url: `https://test-wp.com/complex-image${i + 1}.jpg`,
            alt_text: `Complex test image ${i + 1}`
          }
        });
      }

      const startTime = performance.now();
      const response = await makeAPIRequest('/api/publish', testData);
      const endTime = performance.now();
      
      const responseTime = endTime - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(25000); // 25 seconds for complex data
      
      console.log(`Complex data structure test: ${responseTime.toFixed(2)}ms`);
      console.log(`  Categories: ${testData.categories.length}`);
      console.log(`  Tags: ${testData.tags.length}`);
      console.log(`  Images: ${testData.images.length}`);
      console.log(`  Keywords: ${testData.yoast_meta.focus_keywords.length}`);
    });
  });

  // Helper function to make API requests with timing
  async function makeAPIRequest(
    endpoint: string, 
    data: any, 
    headers: Record<string, string> = {},
    timeoutMs: number = 30000
  ): Promise<any> {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'X-API-Key': TEST_API_KEY,
      ...headers
    };

    try {
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, data, {
        headers: defaultHeaders,
        timeout: timeoutMs
      });
      return response;
    } catch (error: any) {
      if (error.response) {
        return error.response;
      }
      throw error;
    }
  }
});
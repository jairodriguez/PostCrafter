import { jest } from '@jest/globals';
import axios from 'axios';
import { PublishRequest, PublishResponse } from '../types';
import { PostStatus } from '../types/post-status';

// Mock external dependencies
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('../middleware/auth', () => ({
  authenticateApiKey: jest.fn()
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('End-to-End Integration Tests', () => {
  let mockAuth: any;
  const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:3000';
  const TEST_API_KEY = process.env.TEST_API_KEY || 'test-api-key';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup authentication mock
    mockAuth = require('../middleware/auth').authenticateApiKey;
    mockAuth.mockImplementation(async (req: any, res: any) => {
      req.apiKey = TEST_API_KEY;
      return { success: true };
    });

    // Setup WordPress API mocks
    mockedAxios.post.mockResolvedValue({
      status: 201,
      data: {
        id: 123,
        title: { rendered: 'Test Post' },
        content: { rendered: 'Test content' },
        status: 'draft',
        link: 'https://test-wp.com/test-post',
        featured_media: 0
      }
    });

    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: []
    });
  });

  describe('Core Workflow Tests (CW-001 to CW-005)', () => {
    test('CW-001: Simple text post (draft status)', async () => {
      const testData: PublishRequest = {
        title: 'Test Draft Post',
        content: 'This is a simple test post content for draft testing.',
        status: 'draft' as PostStatus
      };

      // Mock WordPress post creation
      mockedAxios.post.mockResolvedValueOnce({
        status: 201,
        data: {
          id: 123,
          title: { rendered: testData.title },
          content: { rendered: testData.content },
          status: 'draft',
          link: 'https://test-wp.com/test-draft-post'
        }
      });

      const response = await makeAPIRequest('/api/publish', testData);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.post_id).toBe(123);
      expect(response.data.status).toBe('draft');
      expect(response.data.url).toContain('test-draft-post');
    });

    test('CW-002: Simple text post (published status)', async () => {
      const testData: PublishRequest = {
        title: 'Test Published Post',
        content: 'This is a simple test post content for published testing.',
        status: 'publish' as PostStatus
      };

      mockedAxios.post.mockResolvedValueOnce({
        status: 201,
        data: {
          id: 124,
          title: { rendered: testData.title },
          content: { rendered: testData.content },
          status: 'publish',
          link: 'https://test-wp.com/test-published-post'
        }
      });

      const response = await makeAPIRequest('/api/publish', testData);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.post_id).toBe(124);
      expect(response.data.status).toBe('publish');
      expect(response.data.url).toContain('test-published-post');
    });

    test('CW-003: Post with categories', async () => {
      const testData: PublishRequest = {
        title: 'Post with Categories',
        content: 'This post tests category assignment functionality.',
        status: 'draft' as PostStatus,
        categories: ['Technology', 'Testing', 'API']
      };

      // Mock category creation/lookup
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: [
          { id: 1, name: 'Technology' },
          { id: 2, name: 'Testing' },
          { id: 3, name: 'API' }
        ]
      });

      mockedAxios.post.mockResolvedValueOnce({
        status: 201,
        data: {
          id: 125,
          title: { rendered: testData.title },
          content: { rendered: testData.content },
          status: 'draft',
          categories: [1, 2, 3],
          link: 'https://test-wp.com/post-with-categories'
        }
      });

      const response = await makeAPIRequest('/api/publish', testData);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.post_id).toBe(125);
      
      // Verify category assignment API calls
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('categories'),
        expect.any(Object)
      );
    });

    test('CW-004: Post with tags', async () => {
      const testData: PublishRequest = {
        title: 'Post with Tags',
        content: 'This post tests tag assignment functionality.',
        status: 'draft' as PostStatus,
        tags: ['test', 'api', 'wordpress', 'automation']
      };

      // Mock tag creation/lookup
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: [
          { id: 1, name: 'test' },
          { id: 2, name: 'api' },
          { id: 3, name: 'wordpress' },
          { id: 4, name: 'automation' }
        ]
      });

      mockedAxios.post.mockResolvedValueOnce({
        status: 201,
        data: {
          id: 126,
          title: { rendered: testData.title },
          content: { rendered: testData.content },
          status: 'draft',
          tags: [1, 2, 3, 4],
          link: 'https://test-wp.com/post-with-tags'
        }
      });

      const response = await makeAPIRequest('/api/publish', testData);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.post_id).toBe(126);
    });

    test('CW-005: Post with excerpt', async () => {
      const testData: PublishRequest = {
        title: 'Post with Custom Excerpt',
        content: 'This is the full content of the post that tests excerpt functionality.',
        excerpt: 'This is a custom excerpt for testing.',
        status: 'draft' as PostStatus
      };

      mockedAxios.post.mockResolvedValueOnce({
        status: 201,
        data: {
          id: 127,
          title: { rendered: testData.title },
          content: { rendered: testData.content },
          excerpt: { rendered: testData.excerpt },
          status: 'draft',
          link: 'https://test-wp.com/post-with-excerpt'
        }
      });

      const response = await makeAPIRequest('/api/publish', testData);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.post_id).toBe(127);
    });
  });

  describe('SEO Integration Tests (SEO-001 to SEO-005)', () => {
    test('SEO-001: Yoast meta title', async () => {
      const testData: PublishRequest = {
        title: 'SEO Test Post',
        content: 'This post tests Yoast meta title functionality.',
        status: 'draft' as PostStatus,
        yoast_meta: {
          meta_title: 'Custom SEO Title for Testing'
        }
      };

      mockedAxios.post.mockResolvedValueOnce({
        status: 201,
        data: {
          id: 128,
          title: { rendered: testData.title },
          content: { rendered: testData.content },
          status: 'draft',
          meta: {
            _yoast_wpseo_title: 'Custom SEO Title for Testing'
          },
          link: 'https://test-wp.com/seo-test-post'
        }
      });

      const response = await makeAPIRequest('/api/publish', testData);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.post_id).toBe(128);
    });

    test('SEO-002: Yoast meta description', async () => {
      const testData: PublishRequest = {
        title: 'SEO Description Test',
        content: 'This post tests Yoast meta description functionality.',
        status: 'draft' as PostStatus,
        yoast_meta: {
          meta_description: 'This is a custom meta description for SEO testing purposes.'
        }
      };

      mockedAxios.post.mockResolvedValueOnce({
        status: 201,
        data: {
          id: 129,
          title: { rendered: testData.title },
          content: { rendered: testData.content },
          status: 'draft',
          meta: {
            _yoast_wpseo_metadesc: 'This is a custom meta description for SEO testing purposes.'
          },
          link: 'https://test-wp.com/seo-description-test'
        }
      });

      const response = await makeAPIRequest('/api/publish', testData);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.post_id).toBe(129);
    });

    test('SEO-003: Yoast focus keywords', async () => {
      const testData: PublishRequest = {
        title: 'SEO Keywords Test',
        content: 'This post tests Yoast focus keywords functionality with relevant keywords.',
        status: 'draft' as PostStatus,
        yoast_meta: {
          focus_keywords: ['seo', 'testing', 'keywords']
        }
      };

      mockedAxios.post.mockResolvedValueOnce({
        status: 201,
        data: {
          id: 130,
          title: { rendered: testData.title },
          content: { rendered: testData.content },
          status: 'draft',
          meta: {
            _yoast_wpseo_focuskw: 'seo,testing,keywords'
          },
          link: 'https://test-wp.com/seo-keywords-test'
        }
      });

      const response = await makeAPIRequest('/api/publish', testData);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.post_id).toBe(130);
    });

    test('SEO-004: Multiple Yoast fields', async () => {
      const testData: PublishRequest = {
        title: 'Complete SEO Test Post',
        content: 'This comprehensive post tests all Yoast SEO fields together.',
        status: 'draft' as PostStatus,
        yoast_meta: {
          meta_title: 'Complete SEO Test - All Fields',
          meta_description: 'This post contains all Yoast SEO fields for comprehensive testing.',
          focus_keywords: ['comprehensive', 'seo', 'test', 'yoast']
        }
      };

      mockedAxios.post.mockResolvedValueOnce({
        status: 201,
        data: {
          id: 131,
          title: { rendered: testData.title },
          content: { rendered: testData.content },
          status: 'draft',
          meta: {
            _yoast_wpseo_title: 'Complete SEO Test - All Fields',
            _yoast_wpseo_metadesc: 'This post contains all Yoast SEO fields for comprehensive testing.',
            _yoast_wpseo_focuskw: 'comprehensive,seo,test,yoast'
          },
          link: 'https://test-wp.com/complete-seo-test'
        }
      });

      const response = await makeAPIRequest('/api/publish', testData);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.post_id).toBe(131);
    });

    test('SEO-005: Missing Yoast plugin (graceful degradation)', async () => {
      const testData: PublishRequest = {
        title: 'Post without Yoast',
        content: 'This post tests graceful degradation when Yoast is not available.',
        status: 'draft' as PostStatus,
        yoast_meta: {
          meta_title: 'This should be ignored',
          meta_description: 'This should also be ignored'
        }
      };

      // Simulate Yoast not being available
      mockedAxios.post.mockResolvedValueOnce({
        status: 201,
        data: {
          id: 132,
          title: { rendered: testData.title },
          content: { rendered: testData.content },
          status: 'draft',
          link: 'https://test-wp.com/post-without-yoast'
          // No Yoast meta fields in response
        }
      });

      const response = await makeAPIRequest('/api/publish', testData);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.post_id).toBe(132);
      // Should succeed even without Yoast fields being processed
    });
  });

  describe('Image Handling Tests (IMG-001 to IMG-008)', () => {
    test('IMG-001: Single URL image', async () => {
      const testData: PublishRequest = {
        title: 'Single Image Test',
        content: 'This post tests single image upload functionality.',
        status: 'draft' as PostStatus,
        images: [
          {
            url: 'https://picsum.photos/800/600?random=1',
            alt: 'Test image from Picsum',
            is_featured: false
          }
        ]
      };

      // Mock image upload
      mockedAxios.post.mockResolvedValueOnce({
        status: 201,
        data: {
          id: 201,
          source_url: 'https://test-wp.com/wp-content/uploads/test-image.jpg',
          alt_text: 'Test image from Picsum'
        }
      });

      // Mock post creation
      mockedAxios.post.mockResolvedValueOnce({
        status: 201,
        data: {
          id: 133,
          title: { rendered: testData.title },
          content: { rendered: testData.content },
          status: 'draft',
          featured_media: 0,
          link: 'https://test-wp.com/single-image-test'
        }
      });

      const response = await makeAPIRequest('/api/publish', testData);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.post_id).toBe(133);
      expect(response.data.images).toHaveLength(1);
    });

    test('IMG-002: Multiple URL images', async () => {
      const testData: PublishRequest = {
        title: 'Multiple Images Test',
        content: 'This post tests multiple image upload functionality.',
        status: 'draft' as PostStatus,
        images: [
          {
            url: 'https://picsum.photos/800/600?random=2',
            alt: 'First test image',
            is_featured: false
          },
          {
            url: 'https://picsum.photos/800/600?random=3',
            alt: 'Second test image',
            is_featured: false
          },
          {
            url: 'https://picsum.photos/800/600?random=4',
            alt: 'Third test image',
            is_featured: false
          }
        ]
      };

      // Mock multiple image uploads
      mockedAxios.post
        .mockResolvedValueOnce({
          status: 201,
          data: { id: 202, source_url: 'https://test-wp.com/image1.jpg', alt_text: 'First test image' }
        })
        .mockResolvedValueOnce({
          status: 201,
          data: { id: 203, source_url: 'https://test-wp.com/image2.jpg', alt_text: 'Second test image' }
        })
        .mockResolvedValueOnce({
          status: 201,
          data: { id: 204, source_url: 'https://test-wp.com/image3.jpg', alt_text: 'Third test image' }
        })
        .mockResolvedValueOnce({
          status: 201,
          data: {
            id: 134,
            title: { rendered: testData.title },
            content: { rendered: testData.content },
            status: 'draft',
            link: 'https://test-wp.com/multiple-images-test'
          }
        });

      const response = await makeAPIRequest('/api/publish', testData);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.post_id).toBe(134);
      expect(response.data.images).toHaveLength(3);
    });

    test('IMG-004: Featured image', async () => {
      const testData: PublishRequest = {
        title: 'Featured Image Test',
        content: 'This post tests featured image functionality.',
        status: 'draft' as PostStatus,
        images: [
          {
            url: 'https://picsum.photos/1200/800?random=5',
            alt: 'Featured test image',
            is_featured: true
          }
        ]
      };

      // Mock featured image upload
      mockedAxios.post.mockResolvedValueOnce({
        status: 201,
        data: {
          id: 205,
          source_url: 'https://test-wp.com/featured-image.jpg',
          alt_text: 'Featured test image'
        }
      });

      // Mock post creation with featured image
      mockedAxios.post.mockResolvedValueOnce({
        status: 201,
        data: {
          id: 135,
          title: { rendered: testData.title },
          content: { rendered: testData.content },
          status: 'draft',
          featured_media: 205,
          link: 'https://test-wp.com/featured-image-test'
        }
      });

      const response = await makeAPIRequest('/api/publish', testData);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.post_id).toBe(135);
      expect(response.data.featured_image_id).toBe(205);
    });

    test('IMG-007: Invalid image URL (error handling)', async () => {
      const testData: PublishRequest = {
        title: 'Invalid Image URL Test',
        content: 'This post tests invalid image URL handling.',
        status: 'draft' as PostStatus,
        images: [
          {
            url: 'https://invalid-domain-that-does-not-exist.com/image.jpg',
            alt: 'Invalid image URL',
            is_featured: false
          }
        ]
      };

      // Mock image upload failure
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { error: 'Invalid image URL' }
        }
      });

      const response = await makeAPIRequest('/api/publish', testData);
      
      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.error).toContain('image');
    });
  });

  describe('Authentication Tests (AUTH-001 to AUTH-004)', () => {
    test('AUTH-001: Valid API key', async () => {
      const testData: PublishRequest = {
        title: 'Authentication Test',
        content: 'Testing valid API key authentication.',
        status: 'draft' as PostStatus
      };

      mockAuth.mockImplementationOnce(async (req: any, res: any) => {
        req.apiKey = 'valid-api-key';
        return { success: true };
      });

      const response = await makeAPIRequest('/api/publish', testData, {
        'X-API-Key': 'valid-api-key'
      });
      
      expect(response.status).toBe(200);
      expect(mockAuth).toHaveBeenCalled();
    });

    test('AUTH-002: Invalid API key', async () => {
      const testData: PublishRequest = {
        title: 'Authentication Test',
        content: 'Testing invalid API key authentication.',
        status: 'draft' as PostStatus
      };

      mockAuth.mockImplementationOnce(async (req: any, res: any) => {
        res.status(401).json({ error: 'Invalid API key' });
        return { success: false };
      });

      const response = await makeAPIRequest('/api/publish', testData, {
        'X-API-Key': 'invalid-api-key'
      });
      
      expect(response.status).toBe(401);
      expect(response.data.error).toContain('Invalid API key');
    });

    test('AUTH-003: Missing API key', async () => {
      const testData: PublishRequest = {
        title: 'Authentication Test',
        content: 'Testing missing API key authentication.',
        status: 'draft' as PostStatus
      };

      mockAuth.mockImplementationOnce(async (req: any, res: any) => {
        res.status(401).json({ error: 'API key required' });
        return { success: false };
      });

      const response = await makeAPIRequest('/api/publish', testData, {});
      
      expect(response.status).toBe(401);
      expect(response.data.error).toContain('API key');
    });
  });

  describe('Input Validation Tests (VAL-001 to VAL-005)', () => {
    test('VAL-001: XSS attempt (content sanitization)', async () => {
      const testData: PublishRequest = {
        title: 'XSS Test <script>alert("xss")</script>',
        content: 'This content contains <script>alert("malicious");</script> script tags.',
        status: 'draft' as PostStatus
      };

      mockedAxios.post.mockResolvedValueOnce({
        status: 201,
        data: {
          id: 136,
          title: { rendered: 'XSS Test' }, // Sanitized
          content: { rendered: 'This content contains script tags.' }, // Sanitized
          status: 'draft',
          link: 'https://test-wp.com/xss-test'
        }
      });

      const response = await makeAPIRequest('/api/publish', testData);
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      // Verify that script tags were sanitized
      expect(response.data.title).not.toContain('<script>');
    });

    test('VAL-004: Required field missing', async () => {
      const testData = {
        content: 'Content without title field',
        status: 'draft'
        // Missing title field
      };

      const response = await makeAPIRequest('/api/publish', testData);
      
      expect(response.status).toBe(400);
      expect(response.data.error).toContain('title');
    });

    test('VAL-005: Invalid data types', async () => {
      const testData = {
        title: 12345, // Should be string
        content: ['array', 'instead', 'of', 'string'], // Should be string
        status: 'draft',
        categories: 'string instead of array' // Should be array
      };

      const response = await makeAPIRequest('/api/publish', testData);
      
      expect(response.status).toBe(400);
      expect(response.data.error).toContain('validation');
    });
  });

  describe('Error Handling Tests (NET-001 to NET-004)', () => {
    test('NET-001: WordPress API down', async () => {
      const testData: PublishRequest = {
        title: 'WordPress API Down Test',
        content: 'Testing WordPress API unavailable scenario.',
        status: 'draft' as PostStatus
      };

      // Mock WordPress API failure
      mockedAxios.post.mockRejectedValueOnce({
        code: 'ECONNREFUSED',
        message: 'Connection refused'
      });

      const response = await makeAPIRequest('/api/publish', testData);
      
      expect(response.status).toBe(500);
      expect(response.data.error).toContain('WordPress');
    });

    test('NET-002: Timeout scenario', async () => {
      const testData: PublishRequest = {
        title: 'Timeout Test',
        content: 'Testing timeout scenario.',
        status: 'draft' as PostStatus
      };

      // Mock timeout
      mockedAxios.post.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded'
      });

      const response = await makeAPIRequest('/api/publish', testData);
      
      expect(response.status).toBe(408);
      expect(response.data.error).toContain('timeout');
    });
  });

  // Helper function to make API requests
  async function makeAPIRequest(endpoint: string, data: any, headers: Record<string, string> = {}): Promise<any> {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'X-API-Key': TEST_API_KEY,
      ...headers
    };

    try {
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, data, {
        headers: defaultHeaders,
        timeout: 10000
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
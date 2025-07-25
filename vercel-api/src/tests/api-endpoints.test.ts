import { jest } from '@jest/globals';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { PublishRequest } from '../types';
import { PostStatus } from '../types/post-status';

// Mock dependencies
jest.mock('../middleware/auth', () => ({
  authenticateApiKey: jest.fn()
}));

jest.mock('../middleware/cors', () => ({
  applyMiddleware: jest.fn((req: any, res: any, next: any) => next())
}));

jest.mock('../utils/validation', () => ({
  validateRequest: jest.fn(),
  securePublishRequestSchema: {},
  validateImageData: jest.fn(),
  detectMaliciousContent: jest.fn()
}));

jest.mock('../utils/wordpress-posts', () => ({
  createWordPressPostService: jest.fn()
}));

jest.mock('../services/wordpress-post-status-integration', () => ({
  createWordPressPostStatusIntegrationService: jest.fn()
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('API Endpoints Unit Tests', () => {
  let mockRequest: Partial<VercelRequest>;
  let mockResponse: Partial<VercelResponse>;
  let mockAuth: any;
  let mockValidation: any;
  let mockWordPressService: any;
  let mockStatusService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockAuth = require('../middleware/auth').authenticateApiKey;
    mockValidation = require('../utils/validation');
    mockWordPressService = {
      createPost: jest.fn(),
      uploadImage: jest.fn(),
      assignCategories: jest.fn(),
      assignTags: jest.fn()
    };
    mockStatusService = {
      createPostWithStatus: jest.fn(),
      updatePostStatus: jest.fn(),
      queryPostsByStatus: jest.fn()
    };

    require('../utils/wordpress-posts').createWordPressPostService.mockReturnValue(mockWordPressService);
    require('../services/wordpress-post-status-integration').createWordPressPostStatusIntegrationService.mockReturnValue(mockStatusService);

    // Setup request and response mocks
    mockRequest = {
      method: 'POST',
      body: {},
      headers: {
        'content-type': 'application/json',
        'x-api-key': 'test-api-key'
      }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      end: jest.fn()
    };

    // Setup successful authentication by default
    mockAuth.mockImplementation(async (req: any, res: any) => {
      req.apiKey = 'test-api-key';
      return { success: true };
    });

    // Setup successful validation by default
    mockValidation.validateRequest.mockReturnValue({ isValid: true, errors: [] });
    mockValidation.validateImageData.mockReturnValue({ isValid: true, errors: [] });
    mockValidation.detectMaliciousContent.mockReturnValue({ isMalicious: false });
  });

  describe('/api/publish endpoint', () => {
    test('should successfully create a draft post', async () => {
      const testData: PublishRequest = {
        title: 'Test Post',
        content: 'Test content',
        status: 'draft' as PostStatus
      };

      mockRequest.body = testData;

      mockWordPressService.createPost.mockResolvedValue({
        id: 123,
        title: { rendered: testData.title },
        content: { rendered: testData.content },
        status: 'draft',
        link: 'https://test-wp.com/test-post'
      });

      // Import and test the publish handler
      const publishHandler = require('../../api/publish').default;
      await publishHandler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          post_id: 123,
          status: 'draft'
        })
      );
    });

    test('should handle invalid request method', async () => {
      mockRequest.method = 'GET';

      const publishHandler = require('../../api/publish').default;
      await publishHandler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(405);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
    });

    test('should handle authentication failure', async () => {
      mockAuth.mockImplementation(async (req: any, res: any) => {
        res.status(401).json({ error: 'Invalid API key' });
        return { success: false };
      });

      const testData: PublishRequest = {
        title: 'Test Post',
        content: 'Test content',
        status: 'draft' as PostStatus
      };

      mockRequest.body = testData;

      const publishHandler = require('../../api/publish').default;
      await publishHandler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    test('should handle validation errors', async () => {
      mockValidation.validateRequest.mockReturnValue({
        isValid: false,
        errors: ['Title is required']
      });

      const testData = {
        content: 'Test content without title',
        status: 'draft'
      };

      mockRequest.body = testData;

      const publishHandler = require('../../api/publish').default;
      await publishHandler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Title is required')
        })
      );
    });

    test('should handle WordPress API errors', async () => {
      const testData: PublishRequest = {
        title: 'Test Post',
        content: 'Test content',
        status: 'draft' as PostStatus
      };

      mockRequest.body = testData;

      mockWordPressService.createPost.mockRejectedValue(new Error('WordPress API Error'));

      const publishHandler = require('../../api/publish').default;
      await publishHandler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('WordPress')
        })
      );
    });
  });

  describe('/api/health endpoint', () => {
    test('should return healthy status', async () => {
      const healthHandler = require('../../api/health').default;
      await healthHandler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          timestamp: expect.any(String)
        })
      );
    });

    test('should handle only GET requests', async () => {
      mockRequest.method = 'POST';

      const healthHandler = require('../../api/health').default;
      await healthHandler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(405);
    });
  });

  describe('/api/posts/status endpoint', () => {
    test('should query posts by status', async () => {
      mockRequest.method = 'GET';
      mockRequest.query = { status: 'draft' };

      mockStatusService.queryPostsByStatus.mockResolvedValue([
        { id: 1, title: 'Post 1', status: 'draft' },
        { id: 2, title: 'Post 2', status: 'draft' }
      ]);

      const statusHandler = require('../../api/posts/status').default;
      await statusHandler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          posts: expect.arrayContaining([
            expect.objectContaining({ status: 'draft' })
          ])
        })
      );
    });

    test('should update post status', async () => {
      mockRequest.method = 'PUT';
      mockRequest.body = {
        post_id: 123,
        status: 'publish'
      };

      mockStatusService.updatePostStatus.mockResolvedValue({
        id: 123,
        status: 'publish',
        updated: true
      });

      const statusHandler = require('../../api/posts/status').default;
      await statusHandler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          post_id: 123,
          status: 'publish'
        })
      );
    });

    test('should handle invalid status values', async () => {
      mockRequest.method = 'PUT';
      mockRequest.body = {
        post_id: 123,
        status: 'invalid_status'
      };

      const statusHandler = require('../../api/posts/status').default;
      await statusHandler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Invalid status')
        })
      );
    });
  });

  describe('Image upload functionality', () => {
    test('should handle single image upload', async () => {
      const testData: PublishRequest = {
        title: 'Test Post with Image',
        content: 'Test content',
        status: 'draft' as PostStatus,
        images: [
          {
            url: 'https://example.com/image.jpg',
            alt: 'Test image',
            is_featured: false
          }
        ]
      };

      mockRequest.body = testData;

      mockWordPressService.uploadImage.mockResolvedValue({
        id: 201,
        source_url: 'https://wp-site.com/uploads/image.jpg',
        alt_text: 'Test image'
      });

      mockWordPressService.createPost.mockResolvedValue({
        id: 123,
        title: { rendered: testData.title },
        content: { rendered: testData.content },
        status: 'draft',
        link: 'https://test-wp.com/test-post'
      });

      const publishHandler = require('../../api/publish').default;
      await publishHandler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockWordPressService.uploadImage).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://example.com/image.jpg',
          alt: 'Test image'
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    test('should handle base64 image upload', async () => {
      const testData: PublishRequest = {
        title: 'Test Post with Base64 Image',
        content: 'Test content',
        status: 'draft' as PostStatus,
        images: [
          {
            data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            alt: 'Base64 test image',
            is_featured: false
          }
        ]
      };

      mockRequest.body = testData;

      mockWordPressService.uploadImage.mockResolvedValue({
        id: 202,
        source_url: 'https://wp-site.com/uploads/base64-image.png',
        alt_text: 'Base64 test image'
      });

      mockWordPressService.createPost.mockResolvedValue({
        id: 124,
        title: { rendered: testData.title },
        content: { rendered: testData.content },
        status: 'draft',
        link: 'https://test-wp.com/test-post-base64'
      });

      const publishHandler = require('../../api/publish').default;
      await publishHandler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockWordPressService.uploadImage).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.stringContaining('data:image/png;base64'),
          alt: 'Base64 test image'
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    test('should handle image upload failures gracefully', async () => {
      const testData: PublishRequest = {
        title: 'Test Post with Failed Image',
        content: 'Test content',
        status: 'draft' as PostStatus,
        images: [
          {
            url: 'https://invalid-url.com/nonexistent.jpg',
            alt: 'Invalid image',
            is_featured: false
          }
        ]
      };

      mockRequest.body = testData;

      mockWordPressService.uploadImage.mockRejectedValue(new Error('Image upload failed'));

      const publishHandler = require('../../api/publish').default;
      await publishHandler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Image upload failed')
        })
      );
    });
  });

  describe('SEO metadata handling', () => {
    test('should handle Yoast SEO fields', async () => {
      const testData: PublishRequest = {
        title: 'SEO Test Post',
        content: 'Test content with SEO',
        status: 'draft' as PostStatus,
        yoast_meta: {
          meta_title: 'Custom SEO Title',
          meta_description: 'Custom SEO description',
          focus_keywords: ['seo', 'test']
        }
      };

      mockRequest.body = testData;

      mockWordPressService.createPost.mockResolvedValue({
        id: 125,
        title: { rendered: testData.title },
        content: { rendered: testData.content },
        status: 'draft',
        meta: {
          _yoast_wpseo_title: 'Custom SEO Title',
          _yoast_wpseo_metadesc: 'Custom SEO description',
          _yoast_wpseo_focuskw: 'seo,test'
        },
        link: 'https://test-wp.com/seo-test-post'
      });

      const publishHandler = require('../../api/publish').default;
      await publishHandler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockWordPressService.createPost).toHaveBeenCalledWith(
        expect.objectContaining({
          yoast_meta: expect.objectContaining({
            meta_title: 'Custom SEO Title',
            meta_description: 'Custom SEO description',
            focus_keywords: ['seo', 'test']
          })
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Categories and Tags handling', () => {
    test('should handle category assignment', async () => {
      const testData: PublishRequest = {
        title: 'Test Post with Categories',
        content: 'Test content',
        status: 'draft' as PostStatus,
        categories: ['Technology', 'Testing']
      };

      mockRequest.body = testData;

      mockWordPressService.assignCategories.mockResolvedValue([1, 2]);
      mockWordPressService.createPost.mockResolvedValue({
        id: 126,
        title: { rendered: testData.title },
        content: { rendered: testData.content },
        status: 'draft',
        categories: [1, 2],
        link: 'https://test-wp.com/test-post-categories'
      });

      const publishHandler = require('../../api/publish').default;
      await publishHandler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockWordPressService.assignCategories).toHaveBeenCalledWith(['Technology', 'Testing']);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    test('should handle tag assignment', async () => {
      const testData: PublishRequest = {
        title: 'Test Post with Tags',
        content: 'Test content',
        status: 'draft' as PostStatus,
        tags: ['api', 'test', 'automation']
      };

      mockRequest.body = testData;

      mockWordPressService.assignTags.mockResolvedValue([1, 2, 3]);
      mockWordPressService.createPost.mockResolvedValue({
        id: 127,
        title: { rendered: testData.title },
        content: { rendered: testData.content },
        status: 'draft',
        tags: [1, 2, 3],
        link: 'https://test-wp.com/test-post-tags'
      });

      const publishHandler = require('../../api/publish').default;
      await publishHandler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockWordPressService.assignTags).toHaveBeenCalledWith(['api', 'test', 'automation']);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Security validation', () => {
    test('should detect and block malicious content', async () => {
      mockValidation.detectMaliciousContent.mockReturnValue({
        isMalicious: true,
        reason: 'XSS attempt detected'
      });

      const testData: PublishRequest = {
        title: 'Malicious Post <script>alert("xss")</script>',
        content: 'Malicious content',
        status: 'draft' as PostStatus
      };

      mockRequest.body = testData;

      const publishHandler = require('../../api/publish').default;
      await publishHandler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('XSS attempt detected')
        })
      );
    });

    test('should validate image data for security', async () => {
      mockValidation.validateImageData.mockReturnValue({
        isValid: false,
        errors: ['Suspicious image data detected']
      });

      const testData: PublishRequest = {
        title: 'Post with Suspicious Image',
        content: 'Test content',
        status: 'draft' as PostStatus,
        images: [
          {
            data: 'malicious-data-here',
            alt: 'Suspicious image',
            is_featured: false
          }
        ]
      };

      mockRequest.body = testData;

      const publishHandler = require('../../api/publish').default;
      await publishHandler(mockRequest as VercelRequest, mockResponse as VercelResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Suspicious image data detected')
        })
      );
    });
  });
});
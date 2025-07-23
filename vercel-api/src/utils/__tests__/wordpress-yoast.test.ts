import { YoastService, createYoastService, YoastValidationResult } from '../wordpress-yoast';
import { WordPressClient } from '../wordpress';
import { YoastMetaFields } from '../../types';

// Mock the WordPress client
const mockWordPressClient = {
  post: jest.fn(),
  put: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
} as jest.Mocked<WordPressClient>;

// Mock environment utilities
jest.mock('../env', () => ({
  getEnvVars: jest.fn(() => ({
    WORDPRESS_URL: 'https://example.com',
    WORDPRESS_USERNAME: 'testuser',
    WORDPRESS_APP_PASSWORD: 'testpassword',
    WORDPRESS_TIMEOUT_MS: 30000,
  })),
  secureLog: jest.fn(),
}));

describe('Yoast SEO Integration', () => {
  let yoastService: YoastService;

  beforeEach(() => {
    jest.clearAllMocks();
    yoastService = new YoastService(mockWordPressClient);
  });

  describe('YoastService', () => {
    describe('validateYoastFields', () => {
      it('should validate valid meta title', () => {
        const fields = { meta_title: 'Valid Meta Title' };
        const result = yoastService.validateYoastFields(fields);
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.sanitizedFields.meta_title).toBe('Valid Meta Title');
      });

      it('should reject empty meta title', () => {
        const fields = { meta_title: '' };
        const result = yoastService.validateYoastFields(fields);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Meta title cannot be empty');
      });

      it('should reject meta title that is too long', () => {
        const longTitle = 'A'.repeat(70);
        const fields = { meta_title: longTitle };
        const result = yoastService.validateYoastFields(fields);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Meta title exceeds maximum length of 60 characters');
      });

      it('should validate valid meta description', () => {
        const fields = { meta_description: 'A valid meta description that is within the character limit' };
        const result = yoastService.validateYoastFields(fields);
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.sanitizedFields.meta_description).toBe('A valid meta description that is within the character limit');
      });

      it('should reject meta description that is too long', () => {
        const longDescription = 'A'.repeat(170);
        const fields = { meta_description: longDescription };
        const result = yoastService.validateYoastFields(fields);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Meta description exceeds maximum length of 160 characters');
      });

      it('should validate valid focus keywords', () => {
        const fields = { focus_keywords: ['keyword1', 'keyword2', 'keyword3'] };
        const result = yoastService.validateYoastFields(fields);
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.sanitizedFields.focus_keywords).toEqual(['keyword1', 'keyword2', 'keyword3']);
      });

      it('should handle single focus keyword', () => {
        const fields = { focus_keywords: 'single-keyword' };
        const result = yoastService.validateYoastFields(fields);
        
        expect(result.valid).toBe(true);
        expect(result.sanitizedFields.focus_keywords).toEqual(['single-keyword']);
      });

      it('should reject too many focus keywords', () => {
        const manyKeywords = Array.from({ length: 12 }, (_, i) => `keyword${i}`);
        const fields = { focus_keywords: manyKeywords };
        const result = yoastService.validateYoastFields(fields);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Too many focus keywords. Maximum allowed: 10');
      });

      it('should validate robots settings', () => {
        const fields = {
          meta_robots_noindex: true,
          meta_robots_nofollow: false
        };
        const result = yoastService.validateYoastFields(fields);
        
        expect(result.valid).toBe(true);
        expect(result.sanitizedFields.meta_robots_noindex).toBe(true);
        expect(result.sanitizedFields.meta_robots_nofollow).toBe(false);
      });

      it('should validate valid canonical URL', () => {
        const fields = { canonical: 'https://example.com/valid-url' };
        const result = yoastService.validateYoastFields(fields);
        
        expect(result.valid).toBe(true);
        expect(result.sanitizedFields.canonical).toBe('https://example.com/valid-url');
      });

      it('should reject invalid canonical URL', () => {
        const fields = { canonical: 'not-a-valid-url' };
        const result = yoastService.validateYoastFields(fields);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid canonical URL format');
      });

      it('should validate valid primary category', () => {
        const fields = { primary_category: 5 };
        const result = yoastService.validateYoastFields(fields);
        
        expect(result.valid).toBe(true);
        expect(result.sanitizedFields.primary_category).toBe(5);
      });

      it('should reject invalid primary category', () => {
        const fields = { primary_category: -1 };
        const result = yoastService.validateYoastFields(fields);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Primary category must be a positive integer');
      });

      it('should sanitize HTML from meta title', () => {
        const fields = { meta_title: '<script>alert("xss")</script>Valid Title' };
        const result = yoastService.validateYoastFields(fields);
        
        expect(result.valid).toBe(true);
        expect(result.sanitizedFields.meta_title).toBe('alert("xss")Valid Title');
      });

      it('should normalize whitespace in focus keywords', () => {
        const fields = { focus_keywords: ['  keyword1  ', '  keyword2  '] };
        const result = yoastService.validateYoastFields(fields);
        
        expect(result.valid).toBe(true);
        expect(result.sanitizedFields.focus_keywords).toEqual(['keyword1', 'keyword2']);
      });
    });

    describe('applyYoastFields', () => {
      it('should successfully apply Yoast fields to a post', async () => {
        const postId = 123;
        const fields = {
          meta_title: 'Test Meta Title',
          meta_description: 'Test meta description',
          focus_keywords: ['test', 'keyword']
        };

        mockWordPressClient.put.mockResolvedValue({
          success: true,
          data: { id: postId, title: { rendered: 'Test Post' } },
          statusCode: 200
        });

        const result = await yoastService.applyYoastFields(postId, fields);

        expect(result.success).toBe(true);
        expect(mockWordPressClient.put).toHaveBeenCalledWith(
          `/wp/v2/posts/${postId}`,
          expect.objectContaining({
            yoast_meta_title: 'Test Meta Title',
            yoast_meta_description: 'Test meta description',
            yoast_focus_keywords: ['test', 'keyword']
          })
        );
      });

      it('should return validation error for invalid fields', async () => {
        const postId = 123;
        const fields = { meta_title: '' }; // Invalid empty title

        const result = await yoastService.applyYoastFields(postId, fields);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('YOAST_VALIDATION_ERROR');
        expect(result.statusCode).toBe(400);
        expect(mockWordPressClient.put).not.toHaveBeenCalled();
      });

      it('should handle WordPress API errors', async () => {
        const postId = 123;
        const fields = { meta_title: 'Valid Title' };

        mockWordPressClient.put.mockResolvedValue({
          success: false,
          error: { code: 'WORDPRESS_ERROR', message: 'API error' },
          statusCode: 500
        });

        const result = await yoastService.applyYoastFields(postId, fields);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('YOAST_UPDATE_FAILED');
        expect(result.statusCode).toBe(500);
      });
    });

    describe('getYoastFields', () => {
      it('should successfully retrieve Yoast fields for a post', async () => {
        const postId = 123;
        const mockResponse = {
          id: postId,
          yoast_meta_title: 'Retrieved Meta Title',
          yoast_meta_description: 'Retrieved meta description',
          yoast_focus_keywords: ['retrieved', 'keywords'],
          yoast_meta_robots_noindex: false,
          yoast_meta_robots_nofollow: true,
          yoast_canonical: 'https://example.com/canonical',
          yoast_primary_category: 5
        };

        mockWordPressClient.get.mockResolvedValue({
          success: true,
          data: mockResponse,
          statusCode: 200
        });

        const result = await yoastService.getYoastFields(postId);

        expect(result.success).toBe(true);
        expect(result.data).toEqual({
          meta_title: 'Retrieved Meta Title',
          meta_description: 'Retrieved meta description',
          focus_keywords: ['retrieved', 'keywords'],
          meta_robots_noindex: false,
          meta_robots_nofollow: true,
          canonical: 'https://example.com/canonical',
          primary_category: 5
        });
        expect(mockWordPressClient.get).toHaveBeenCalledWith(
          `/wp/v2/posts/${postId}?include_yoast_fields=true`
        );
      });

      it('should handle missing Yoast fields gracefully', async () => {
        const postId = 123;
        const mockResponse = { id: postId }; // No Yoast fields

        mockWordPressClient.get.mockResolvedValue({
          success: true,
          data: mockResponse,
          statusCode: 200
        });

        const result = await yoastService.getYoastFields(postId);

        expect(result.success).toBe(true);
        expect(result.data).toEqual({
          meta_title: '',
          meta_description: '',
          focus_keywords: [],
          meta_robots_noindex: false,
          meta_robots_nofollow: false,
          canonical: '',
          primary_category: null
        });
      });
    });

    describe('generateDefaultMetaTitle', () => {
      it('should generate meta title from post title', () => {
        const postTitle = 'My Blog Post';
        const result = yoastService.generateDefaultMetaTitle(postTitle);
        
        expect(result).toBe('My Blog Post | Site');
      });

      it('should generate meta title with custom site name', () => {
        const postTitle = 'My Blog Post';
        const siteName = 'My Awesome Blog';
        const result = yoastService.generateDefaultMetaTitle(postTitle, siteName);
        
        expect(result).toBe('My Blog Post | My Awesome Blog');
      });

      it('should sanitize HTML from generated title', () => {
        const postTitle = '<script>alert("xss")</script>My Post';
        const result = yoastService.generateDefaultMetaTitle(postTitle);
        
        expect(result).toBe('alert("xss")My Post | Site');
      });
    });

    describe('generateDefaultMetaDescription', () => {
      it('should generate meta description from excerpt', () => {
        const excerpt = 'This is a test excerpt for the blog post.';
        const result = yoastService.generateDefaultMetaDescription(excerpt);
        
        expect(result).toBe('This is a test excerpt for the blog post.');
      });

      it('should sanitize HTML from generated description', () => {
        const excerpt = '<p>This is a <strong>test</strong> excerpt.</p>';
        const result = yoastService.generateDefaultMetaDescription(excerpt);
        
        expect(result).toBe('This is a test excerpt.');
      });
    });
  });

  describe('createYoastService', () => {
    it('should create a YoastService instance', () => {
      const service = createYoastService(mockWordPressClient);
      
      expect(service).toBeInstanceOf(YoastService);
    });

    it('should create a YoastService with default client if none provided', () => {
      const service = createYoastService();
      
      expect(service).toBeInstanceOf(YoastService);
    });
  });
}); 
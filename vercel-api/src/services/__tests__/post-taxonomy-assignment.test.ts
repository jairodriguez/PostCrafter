import { jest } from '@jest/globals';
import { 
  PostTaxonomyAssignmentService, 
  createPostTaxonomyAssignmentService,
  PostTaxonomyConfig,
  PostTaxonomyAssignmentRequest,
  PostCreationWithTaxonomyRequest,
  PostUpdateWithTaxonomyRequest
} from '../post-taxonomy-assignment';
import { 
  WordPressCategory, 
  WordPressTag 
} from '../../types/taxonomy';

// Mock the logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock category and tag services
jest.mock('../category-management', () => ({
  CategoryManagementService: jest.fn().mockImplementation(() => ({
    getCategoryById: jest.fn(),
    findCategoryByName: jest.fn(),
    createCategory: jest.fn()
  }))
}));

jest.mock('../tag-management', () => ({
  TagManagementService: jest.fn().mockImplementation(() => ({
    getTagById: jest.fn(),
    findTagByName: jest.fn(),
    createTag: jest.fn()
  }))
}));

// Mock global fetch
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('PostTaxonomyAssignmentService', () => {
  let service: PostTaxonomyAssignmentService;
  let mockConfig: PostTaxonomyConfig;
  let mockCategoryService: any;
  let mockTagService: any;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockConfig = {
      wordpressUrl: 'https://test-site.com',
      username: 'testuser',
      password: 'testpass',
      timeout: 5000,
      maxRetries: 2,
      retryDelay: 500,
      createMissingTerms: true,
      maxCategoriesPerPost: 10,
      maxTagsPerPost: 20
    };

    service = new PostTaxonomyAssignmentService(mockConfig);
    
    // Get mocked service instances
    mockCategoryService = (service as any).categoryService;
    mockTagService = (service as any).tagService;
    
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('assignTaxonomyToPost', () => {
    const mockRequest: PostTaxonomyAssignmentRequest = {
      postId: 123,
      categories: ['Technology', 'JavaScript'],
      tags: ['web-dev', 'programming'],
    };

    const mockCategories: WordPressCategory[] = [
      { id: 1, name: 'Technology', slug: 'technology', description: '', count: 10 },
      { id: 2, name: 'JavaScript', slug: 'javascript', description: '', count: 5 }
    ];

    const mockTags: WordPressTag[] = [
      { id: 1, name: 'web-dev', slug: 'web-dev', description: '', count: 8 },
      { id: 2, name: 'programming', slug: 'programming', description: '', count: 12 }
    ];

    it('should assign existing categories and tags to post successfully', async () => {
      // Mock post exists
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 123, title: { rendered: 'Test Post' } })
      } as Response);

      // Mock category lookups
      mockCategoryService.findCategoryByName
        .mockResolvedValueOnce({ success: true, data: mockCategories[0] })
        .mockResolvedValueOnce({ success: true, data: mockCategories[1] });

      // Mock tag lookups
      mockTagService.findTagByName
        .mockResolvedValueOnce({ success: true, data: mockTags[0] })
        .mockResolvedValueOnce({ success: true, data: mockTags[1] });

      // Mock post update
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          id: 123, 
          categories: [1, 2], 
          tags: [1, 2],
          link: 'https://test-site.com/test-post' 
        })
      } as Response);

      const result = await service.assignTaxonomyToPost(mockRequest, 'test-request-id');

      expect(result.success).toBe(true);
      expect(result.data?.postId).toBe(123);
      expect(result.data?.assignedCategories).toHaveLength(2);
      expect(result.data?.assignedTags).toHaveLength(2);
      expect(result.data?.createdCategories).toBeUndefined();
      expect(result.data?.createdTags).toBeUndefined();
      expect(result.requestId).toBe('test-request-id');
    });

    it('should create missing categories and tags when configured to do so', async () => {
      // Mock post exists
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 123, title: { rendered: 'Test Post' } })
      } as Response);

      // Mock category not found, then creation
      mockCategoryService.findCategoryByName
        .mockResolvedValueOnce({ success: false, error: { code: 'CATEGORY_NOT_FOUND' } })
        .mockResolvedValueOnce({ success: true, data: mockCategories[1] });
      
      mockCategoryService.createCategory
        .mockResolvedValueOnce({ success: true, data: mockCategories[0] });

      // Mock tag not found, then creation
      mockTagService.findTagByName
        .mockResolvedValueOnce({ success: false, error: { code: 'TAG_NOT_FOUND' } })
        .mockResolvedValueOnce({ success: true, data: mockTags[1] });
      
      mockTagService.createTag
        .mockResolvedValueOnce({ success: true, data: mockTags[0] });

      // Mock post update
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          id: 123, 
          categories: [1, 2], 
          tags: [1, 2] 
        })
      } as Response);

      const result = await service.assignTaxonomyToPost(mockRequest);

      expect(result.success).toBe(true);
      expect(result.data?.assignedCategories).toHaveLength(2);
      expect(result.data?.assignedTags).toHaveLength(2);
      expect(result.data?.createdCategories).toHaveLength(1);
      expect(result.data?.createdTags).toHaveLength(1);
      expect(result.warnings).toContain('Created 1 new categories: Technology');
      expect(result.warnings).toContain('Created 1 new tags: web-dev');
    });

    it('should handle invalid post ID', async () => {
      const invalidRequest = { ...mockRequest, postId: -1 };

      const result = await service.assignTaxonomyToPost(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_POST_ID');
    });

    it('should handle post not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ code: 'rest_post_invalid_id', message: 'Invalid post ID.' })
      } as Response);

      const result = await service.assignTaxonomyToPost(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('POST_NOT_FOUND');
    });

    it('should handle too many categories', async () => {
      const requestWithTooManyCategories = {
        ...mockRequest,
        categories: Array.from({ length: 15 }, (_, i) => `Category ${i}`)
      };

      const result = await service.assignTaxonomyToPost(requestWithTooManyCategories);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CATEGORY_PROCESSING_FAILED');
    });

    it('should handle category assignment by ID', async () => {
      const requestWithCategoryIds: PostTaxonomyAssignmentRequest = {
        postId: 123,
        categories: [1, 2],
        tags: ['web-dev']
      };

      // Mock post exists
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 123, title: { rendered: 'Test Post' } })
      } as Response);

      // Mock category lookups by ID
      mockCategoryService.getCategoryById
        .mockResolvedValueOnce({ success: true, data: mockCategories[0] })
        .mockResolvedValueOnce({ success: true, data: mockCategories[1] });

      // Mock tag lookup by name
      mockTagService.findTagByName
        .mockResolvedValueOnce({ success: true, data: mockTags[0] });

      // Mock post update
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          id: 123, 
          categories: [1, 2], 
          tags: [1] 
        })
      } as Response);

      const result = await service.assignTaxonomyToPost(requestWithCategoryIds);

      expect(result.success).toBe(true);
      expect(result.data?.assignedCategories).toHaveLength(2);
      expect(result.data?.assignedTags).toHaveLength(1);
      expect(mockCategoryService.getCategoryById).toHaveBeenCalledTimes(2);
    });

    it('should handle primary category assignment', async () => {
      const requestWithPrimary: PostTaxonomyAssignmentRequest = {
        postId: 123,
        categories: ['Technology', 'JavaScript'],
        primaryCategory: 'Technology'
      };

      // Mock post exists
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 123, title: { rendered: 'Test Post' } })
      } as Response);

      // Mock category lookups
      mockCategoryService.findCategoryByName
        .mockResolvedValueOnce({ success: true, data: mockCategories[0] })
        .mockResolvedValueOnce({ success: true, data: mockCategories[1] });

      // Mock post update
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          id: 123, 
          categories: [1, 2] 
        })
      } as Response);

      const result = await service.assignTaxonomyToPost(requestWithPrimary);

      expect(result.success).toBe(true);
      expect(result.data?.primaryCategory?.name).toBe('Technology');
    });
  });

  describe('createPostWithTaxonomy', () => {
    const mockRequest: PostCreationWithTaxonomyRequest = {
      title: 'Test Post',
      content: 'This is test content',
      categories: ['Technology'],
      tags: ['web-dev'],
      status: 'draft'
    };

    it('should create post with taxonomy successfully', async () => {
      // Mock category lookup
      mockCategoryService.findCategoryByName
        .mockResolvedValueOnce({ success: true, data: mockCategories[0] });

      // Mock tag lookup
      mockTagService.findTagByName
        .mockResolvedValueOnce({ success: true, data: mockTags[0] });

      // Mock post creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          id: 123, 
          title: { rendered: 'Test Post' },
          content: { rendered: 'This is test content' },
          categories: [1], 
          tags: [1],
          link: 'https://test-site.com/test-post'
        })
      } as Response);

      const result = await service.createPostWithTaxonomy(mockRequest, 'test-request-id');

      expect(result.success).toBe(true);
      expect(result.data?.postId).toBe(123);
      expect(result.data?.assignedCategories).toHaveLength(1);
      expect(result.data?.assignedTags).toHaveLength(1);
      expect(result.data?.postUrl).toBe('https://test-site.com/test-post');
    });

    it('should handle validation errors', async () => {
      const invalidRequest = {
        ...mockRequest,
        title: '', // Invalid empty title
        content: ''  // Invalid empty content
      };

      const result = await service.createPostWithTaxonomy(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.details).toContain('Post title is required');
      expect(result.error?.details).toContain('Post content is required');
    });

    it('should handle post creation failure', async () => {
      // Mock category lookup
      mockCategoryService.findCategoryByName
        .mockResolvedValueOnce({ success: true, data: mockCategories[0] });

      // Mock tag lookup
      mockTagService.findTagByName
        .mockResolvedValueOnce({ success: true, data: mockTags[0] });

      // Mock post creation failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ code: 'internal_error', message: 'Server error' })
      } as Response);

      const result = await service.createPostWithTaxonomy(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('POST_CREATION_FAILED');
    });

    it('should create post without taxonomy when none provided', async () => {
      const requestWithoutTaxonomy: PostCreationWithTaxonomyRequest = {
        title: 'Test Post',
        content: 'This is test content'
      };

      // Mock post creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          id: 123, 
          title: { rendered: 'Test Post' },
          content: { rendered: 'This is test content' },
          categories: [], 
          tags: [],
          link: 'https://test-site.com/test-post'
        })
      } as Response);

      const result = await service.createPostWithTaxonomy(requestWithoutTaxonomy);

      expect(result.success).toBe(true);
      expect(result.data?.assignedCategories).toHaveLength(0);
      expect(result.data?.assignedTags).toHaveLength(0);
    });
  });

  describe('updatePostWithTaxonomy', () => {
    const mockRequest: PostUpdateWithTaxonomyRequest = {
      postId: 123,
      title: 'Updated Test Post',
      categories: ['Technology'],
      tags: ['web-dev', 'javascript']
    };

    it('should update post with taxonomy successfully', async () => {
      // Mock post exists
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 123, title: { rendered: 'Test Post' } })
      } as Response);

      // Mock category lookup
      mockCategoryService.findCategoryByName
        .mockResolvedValueOnce({ success: true, data: mockCategories[0] });

      // Mock tag lookups
      mockTagService.findTagByName
        .mockResolvedValueOnce({ success: true, data: mockTags[0] })
        .mockResolvedValueOnce({ success: true, data: { id: 3, name: 'javascript', slug: 'javascript', description: '', count: 15 } });

      // Mock post update
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          id: 123, 
          title: { rendered: 'Updated Test Post' },
          categories: [1], 
          tags: [1, 3],
          link: 'https://test-site.com/updated-test-post'
        })
      } as Response);

      const result = await service.updatePostWithTaxonomy(mockRequest);

      expect(result.success).toBe(true);
      expect(result.data?.postId).toBe(123);
      expect(result.data?.assignedCategories).toHaveLength(1);
      expect(result.data?.assignedTags).toHaveLength(2);
    });

    it('should handle post not found during update', async () => {
      // Mock post not found
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ code: 'rest_post_invalid_id', message: 'Invalid post ID.' })
      } as Response);

      const result = await service.updatePostWithTaxonomy(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('POST_NOT_FOUND');
    });

    it('should handle partial taxonomy updates', async () => {
      const partialRequest: PostUpdateWithTaxonomyRequest = {
        postId: 123,
        categories: ['Technology'], // Only update categories, leave tags unchanged
        removePreviousTags: false
      };

      // Mock post exists
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 123, title: { rendered: 'Test Post' } })
      } as Response);

      // Mock category lookup
      mockCategoryService.findCategoryByName
        .mockResolvedValueOnce({ success: true, data: mockCategories[0] });

      // Mock post update
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          id: 123, 
          categories: [1],
          link: 'https://test-site.com/test-post'
        })
      } as Response);

      const result = await service.updatePostWithTaxonomy(partialRequest);

      expect(result.success).toBe(true);
      expect(result.data?.assignedCategories).toHaveLength(1);
      expect(result.data?.assignedTags).toHaveLength(0);
    });

    it('should handle taxonomy removal', async () => {
      const removalRequest: PostUpdateWithTaxonomyRequest = {
        postId: 123,
        categories: [], // Remove all categories
        tags: [], // Remove all tags
        removePreviousCategories: true,
        removePreviousTags: true
      };

      // Mock post exists
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 123, title: { rendered: 'Test Post' } })
      } as Response);

      // Mock post update
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          id: 123, 
          categories: [],
          tags: [],
          link: 'https://test-site.com/test-post'
        })
      } as Response);

      const result = await service.updatePostWithTaxonomy(removalRequest);

      expect(result.success).toBe(true);
      expect(result.data?.assignedCategories).toHaveLength(0);
      expect(result.data?.assignedTags).toHaveLength(0);
    });
  });

  describe('configuration and validation', () => {
    it('should respect maxCategoriesPerPost configuration', async () => {
      const serviceWithLimitedCategories = new PostTaxonomyAssignmentService({
        ...mockConfig,
        maxCategoriesPerPost: 2
      });

      const request: PostTaxonomyAssignmentRequest = {
        postId: 123,
        categories: ['Cat1', 'Cat2', 'Cat3'] // Exceeds limit of 2
      };

      const result = await serviceWithLimitedCategories.assignTaxonomyToPost(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CATEGORY_PROCESSING_FAILED');
    });

    it('should respect maxTagsPerPost configuration', async () => {
      const serviceWithLimitedTags = new PostTaxonomyAssignmentService({
        ...mockConfig,
        maxTagsPerPost: 2
      });

      const request: PostTaxonomyAssignmentRequest = {
        postId: 123,
        tags: ['Tag1', 'Tag2', 'Tag3'] // Exceeds limit of 2
      };

      const result = await serviceWithLimitedTags.assignTaxonomyToPost(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TAG_PROCESSING_FAILED');
    });

    it('should respect createMissingTerms configuration', async () => {
      const serviceWithNoCreation = new PostTaxonomyAssignmentService({
        ...mockConfig,
        createMissingTerms: false
      });

      const request: PostTaxonomyAssignmentRequest = {
        postId: 123,
        categories: ['NonexistentCategory']
      };

      // Mock post exists
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 123, title: { rendered: 'Test Post' } })
      } as Response);

      // Mock category not found
      const mockCategoryServiceNoCreate = (serviceWithNoCreation as any).categoryService;
      mockCategoryServiceNoCreate.findCategoryByName
        .mockResolvedValueOnce({ success: false, error: { code: 'CATEGORY_NOT_FOUND' } });

      const result = await serviceWithNoCreation.assignTaxonomyToPost(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CATEGORY_PROCESSING_FAILED');
    });
  });

  describe('error handling and retries', () => {
    it('should retry on server errors', async () => {
      const request: PostTaxonomyAssignmentRequest = {
        postId: 123,
        categories: ['Technology']
      };

      // Mock post verification success
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 123, title: { rendered: 'Test Post' } })
        } as Response);

      // Mock category lookup
      mockCategoryService.findCategoryByName
        .mockResolvedValueOnce({ success: true, data: mockCategories[0] });

      // Mock first attempt fails with 500, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ message: 'Server error' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            id: 123, 
            categories: [1] 
          })
        } as Response);

      const result = await service.assignTaxonomyToPost(request);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3); // 1 verification + 2 update attempts
    });

    it('should not retry on client errors', async () => {
      const request: PostTaxonomyAssignmentRequest = {
        postId: 123,
        categories: ['Technology']
      };

      // Mock post verification success
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 123, title: { rendered: 'Test Post' } })
        } as Response);

      // Mock category lookup
      mockCategoryService.findCategoryByName
        .mockResolvedValueOnce({ success: true, data: mockCategories[0] });

      // Mock update fails with 400 (client error)
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ code: 'invalid_data', message: 'Invalid data' })
        } as Response);

      const result = await service.assignTaxonomyToPost(request);

      expect(result.success).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(2); // 1 verification + 1 update attempt (no retry)
    });

    it('should handle network errors', async () => {
      const request: PostCreationWithTaxonomyRequest = {
        title: 'Test Post',
        content: 'Test content'
      };

      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.createPostWithTaxonomy(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('POST_CREATION_ERROR');
    });
  });

  describe('authentication', () => {
    it('should use Basic authentication with encoded credentials', async () => {
      const request: PostCreationWithTaxonomyRequest = {
        title: 'Test Post',
        content: 'Test content'
      };

      // Mock successful post creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          id: 123, 
          title: { rendered: 'Test Post' },
          link: 'https://test-site.com/test-post'
        })
      } as Response);

      await service.createPostWithTaxonomy(request);

      // Check that fetch was called with correct Authorization header
      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      const options = lastCall?.[1] as RequestInit;
      
      expect(options.headers).toHaveProperty('Authorization');
      expect((options.headers as any)['Authorization']).toMatch(/^Basic /);
      
      // Decode and verify credentials
      const encodedCredentials = (options.headers as any)['Authorization'].replace('Basic ', '');
      const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString();
      expect(decodedCredentials).toBe('testuser:testpass');
    });
  });

  describe('createPostTaxonomyAssignmentService', () => {
    it('should create service instance with config', () => {
      const service = createPostTaxonomyAssignmentService(mockConfig);
      expect(service).toBeInstanceOf(PostTaxonomyAssignmentService);
    });
  });

  describe('primary category handling', () => {
    it('should validate primary category is in assigned categories', async () => {
      const request: PostTaxonomyAssignmentRequest = {
        postId: 123,
        categories: ['Technology'],
        primaryCategory: 'JavaScript' // Not in assigned categories
      };

      // Mock post exists
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 123, title: { rendered: 'Test Post' } })
      } as Response);

      const result = await service.assignTaxonomyToPost(request);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CATEGORY_PROCESSING_FAILED');
    });

    it('should handle primary category by ID', async () => {
      const request: PostTaxonomyAssignmentRequest = {
        postId: 123,
        categories: [1, 2],
        primaryCategory: 1
      };

      // Mock post exists
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 123, title: { rendered: 'Test Post' } })
      } as Response);

      // Mock category lookups by ID
      mockCategoryService.getCategoryById
        .mockResolvedValueOnce({ success: true, data: mockCategories[0] })
        .mockResolvedValueOnce({ success: true, data: mockCategories[1] });

      // Mock post update
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          id: 123, 
          categories: [1, 2]
        })
      } as Response);

      const result = await service.assignTaxonomyToPost(request);

      expect(result.success).toBe(true);
      expect(result.data?.primaryCategory?.id).toBe(1);
    });
  });

  describe('mixed name and ID taxonomy assignment', () => {
    it('should handle mixed category names and IDs', async () => {
      const request: PostTaxonomyAssignmentRequest = {
        postId: 123,
        categories: ['Technology', 2], // Mix of name and ID
        tags: [1, 'programming'] // Mix of ID and name
      };

      // Mock post exists
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 123, title: { rendered: 'Test Post' } })
      } as Response);

      // Mock category lookups
      mockCategoryService.findCategoryByName
        .mockResolvedValueOnce({ success: true, data: mockCategories[0] });
      mockCategoryService.getCategoryById
        .mockResolvedValueOnce({ success: true, data: mockCategories[1] });

      // Mock tag lookups
      mockTagService.getTagById
        .mockResolvedValueOnce({ success: true, data: mockTags[0] });
      mockTagService.findTagByName
        .mockResolvedValueOnce({ success: true, data: mockTags[1] });

      // Mock post update
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          id: 123, 
          categories: [1, 2], 
          tags: [1, 2]
        })
      } as Response);

      const result = await service.assignTaxonomyToPost(request);

      expect(result.success).toBe(true);
      expect(result.data?.assignedCategories).toHaveLength(2);
      expect(result.data?.assignedTags).toHaveLength(2);
    });
  });
});
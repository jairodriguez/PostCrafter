import { jest } from '@jest/globals';
import {
  WordPressPostStatusIntegrationService,
  createWordPressPostStatusIntegrationService,
  WordPressPostStatusConfig,
  PostCreationWithStatusRequest,
  PostUpdateWithStatusRequest,
  WordPressPostStatusQueryOptions
} from '../wordpress-post-status-integration';
import { 
  PostStatus,
  PostStatusUpdateRequest,
  PostWithStatus 
} from '../../types/post-status';

// Mock the logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock the WordPress client
jest.mock('../../utils/wordpress', () => ({
  WordPressClient: jest.fn().mockImplementation(() => ({
    post: jest.fn(),
    put: jest.fn(),
    get: jest.fn()
  }))
}));

describe('WordPressPostStatusIntegrationService', () => {
  let service: WordPressPostStatusIntegrationService;
  let mockConfig: WordPressPostStatusConfig;
  let mockWordPressClient: any;

  beforeEach(() => {
    mockConfig = {
      wordpressUrl: 'https://test-site.com',
      username: 'testuser',
      password: 'testpass',
      timeout: 5000,
      maxRetries: 2,
      retryDelay: 500,
      enableStatusHistory: true,
      enableStatusValidation: true,
      enableMetadataTracking: true,
      defaultStatus: 'draft'
    };

    service = new WordPressPostStatusIntegrationService(mockConfig);
    mockWordPressClient = (service as any).client;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const config = service.getConfig();
      expect(config.timeout).toBe(5000);
      expect(config.enableStatusHistory).toBe(true);
      expect(config.enableStatusValidation).toBe(true);
      expect(config.defaultStatus).toBe('draft');
    });

    it('should use default values for missing config options', () => {
      const minimalConfig: WordPressPostStatusConfig = {
        wordpressUrl: 'https://test.com',
        username: 'user',
        password: 'pass'
      };

      const minimalService = new WordPressPostStatusIntegrationService(minimalConfig);
      const config = minimalService.getConfig();
      
      expect(config.timeout).toBe(10000);
      expect(config.maxRetries).toBe(3);
      expect(config.enableStatusHistory).toBe(true);
      expect(config.defaultStatus).toBe('draft');
    });
  });

  describe('createPostWithStatus', () => {
    const mockPostData: PostCreationWithStatusRequest = {
      title: 'Test Post',
      content: 'Test content',
      status: 'draft',
      author: 1
    };

    const mockWordPressResponse = {
      success: true,
      data: {
        id: 123,
        title: { rendered: 'Test Post' },
        content: { rendered: 'Test content' },
        status: 'draft',
        date: '2023-01-01T10:00:00Z',
        link: 'https://test-site.com/test-post',
        author: 1,
        featured_media: 0
      }
    };

    it('should create post with draft status successfully', async () => {
      mockWordPressClient.post.mockResolvedValue(mockWordPressResponse);

      const result = await service.createPostWithStatus(mockPostData, {}, 'test-request-id');

      expect(result.success).toBe(true);
      expect(result.postId).toBe(123);
      expect(result.postUrl).toBe('https://test-site.com/test-post');
      expect(result.statusMetadata).toBeDefined();
      expect(result.statusMetadata?.status).toBe('draft');
    });

    it('should create post with publish status successfully', async () => {
      const publishPostData = { ...mockPostData, status: 'publish' as PostStatus };
      const publishResponse = {
        ...mockWordPressResponse,
        data: { ...mockWordPressResponse.data, status: 'publish' }
      };

      mockWordPressClient.post.mockResolvedValue(publishResponse);

      const result = await service.createPostWithStatus(publishPostData, {}, 'test-request-id');

      expect(result.success).toBe(true);
      expect(result.statusMetadata?.status).toBe('publish');
      expect(result.statusMetadata?.publishedDate).toBeDefined();
    });

    it('should handle status validation errors', async () => {
      const invalidPostData = { ...mockPostData, status: 'invalid' as PostStatus };

      const result = await service.createPostWithStatus(invalidPostData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('STATUS_VALIDATION_ERROR');
      expect(mockWordPressClient.post).not.toHaveBeenCalled();
    });

    it('should handle WordPress API errors', async () => {
      mockWordPressClient.post.mockResolvedValue({
        success: false,
        error: { code: 'WP_ERROR', message: 'WordPress API error' }
      });

      const result = await service.createPostWithStatus(mockPostData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WORDPRESS_API_ERROR');
    });

    it('should create status transition when changing from current status', async () => {
      const postDataWithTransition = {
        ...mockPostData,
        status: 'publish' as PostStatus,
        currentStatus: 'draft' as PostStatus,
        statusChangeReason: 'Ready for publication',
        statusChangedBy: 'editor@test.com'
      };

      mockWordPressClient.post.mockResolvedValue({
        ...mockWordPressResponse,
        data: { ...mockWordPressResponse.data, status: 'publish' }
      });

      const result = await service.createPostWithStatus(postDataWithTransition);

      expect(result.success).toBe(true);
      expect(result.statusTransition).toBeDefined();
      expect(result.statusTransition?.from).toBe('draft');
      expect(result.statusTransition?.to).toBe('publish');
      expect(result.statusTransition?.reason).toBe('Ready for publication');
    });

    it('should handle unexpected errors gracefully', async () => {
      mockWordPressClient.post.mockRejectedValue(new Error('Network error'));

      const result = await service.createPostWithStatus(mockPostData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WORDPRESS_API_ERROR');
      expect(result.error?.message).toContain('Network error');
    });
  });

  describe('updatePostStatus', () => {
    const mockUpdateRequest: PostStatusUpdateRequest = {
      postId: 123,
      newStatus: 'publish',
      reason: 'Ready for publication'
    };

    const mockCurrentPost = {
      success: true,
      data: {
        id: 123,
        status: 'draft',
        title: { rendered: 'Test Post' }
      }
    };

    const mockUpdateResponse = {
      success: true,
      data: {
        id: 123,
        status: 'publish',
        title: { rendered: 'Test Post' },
        date: '2023-01-01T10:00:00Z'
      }
    };

    it('should update post status successfully', async () => {
      mockWordPressClient.get.mockResolvedValue(mockCurrentPost);
      mockWordPressClient.put.mockResolvedValue(mockUpdateResponse);

      const result = await service.updatePostStatus(mockUpdateRequest, 'test-request-id');

      expect(result.success).toBe(true);
      expect(result.previousStatus).toBe('draft');
      expect(result.newStatus).toBe('publish');
      expect(result.wordpressPostId).toBe(123);
      expect(mockWordPressClient.put).toHaveBeenCalledWith(
        '/wp/v2/posts/123',
        { status: 'publish' }
      );
    });

    it('should handle post not found error', async () => {
      mockWordPressClient.get.mockResolvedValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Post not found' }
      });

      const result = await service.updatePostStatus(mockUpdateRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Post not found');
      expect(mockWordPressClient.put).not.toHaveBeenCalled();
    });

    it('should validate status transitions when enabled', async () => {
      // Configure service to disallow draft to private transition
      const restrictiveConfig = {
        ...mockConfig,
        allowedStatusTransitions: {
          'draft': ['publish'] as PostStatus[],
          'publish': ['draft'] as PostStatus[],
          'private': ['draft'] as PostStatus[]
        }
      };

      const restrictiveService = new WordPressPostStatusIntegrationService(restrictiveConfig);
      (restrictiveService as any).client = mockWordPressClient;

      const invalidRequest = { ...mockUpdateRequest, newStatus: 'private' as PostStatus };

      mockWordPressClient.get.mockResolvedValue(mockCurrentPost);

      const result = await restrictiveService.updatePostStatus(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not allowed');
      expect(mockWordPressClient.put).not.toHaveBeenCalled();
    });

    it('should handle WordPress update errors', async () => {
      mockWordPressClient.get.mockResolvedValue(mockCurrentPost);
      mockWordPressClient.put.mockResolvedValue({
        success: false,
        error: { message: 'WordPress update failed' }
      });

      const result = await service.updatePostStatus(mockUpdateRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('WordPress update failed');
    });
  });

  describe('updatePostWithStatus', () => {
    const mockUpdateData: PostUpdateWithStatusRequest = {
      id: 123,
      title: 'Updated Title',
      status: 'publish',
      statusChangedBy: 'editor@test.com'
    };

    const mockCurrentPost = {
      success: true,
      data: { id: 123, status: 'draft' }
    };

    const mockUpdateResponse = {
      success: true,
      data: {
        id: 123,
        title: { rendered: 'Updated Title' },
        status: 'publish',
        link: 'https://test-site.com/updated-post',
        date: '2023-01-01T10:00:00Z'
      }
    };

    it('should update post with status successfully', async () => {
      mockWordPressClient.get.mockResolvedValue(mockCurrentPost);
      mockWordPressClient.put.mockResolvedValue(mockUpdateResponse);

      const result = await service.updatePostWithStatus(mockUpdateData, {}, 'test-request-id');

      expect(result.success).toBe(true);
      expect(result.postId).toBe(123);
      expect(result.statusMetadata).toBeDefined();
      expect(result.statusTransition).toBeDefined();
    });

    it('should update post without status change', async () => {
      const updateDataNoStatus = { ...mockUpdateData };
      delete updateDataNoStatus.status;

      mockWordPressClient.put.mockResolvedValue(mockUpdateResponse);

      const result = await service.updatePostWithStatus(updateDataNoStatus);

      expect(result.success).toBe(true);
      expect(result.statusTransition).toBeUndefined();
    });

    it('should handle status validation errors', async () => {
      const invalidUpdateData = { ...mockUpdateData, status: 'invalid' as PostStatus };

      const result = await service.updatePostWithStatus(invalidUpdateData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('STATUS_VALIDATION_ERROR');
    });
  });

  describe('queryPostsByStatus', () => {
    const mockQueryOptions: WordPressPostStatusQueryOptions = {
      status: ['draft', 'publish'],
      limit: 10,
      sortBy: 'date',
      sortOrder: 'desc'
    };

    const mockPostsResponse = {
      success: true,
      data: [
        {
          id: 1,
          title: { rendered: 'Post 1' },
          content: { rendered: 'Content 1' },
          status: 'draft',
          date: '2023-01-01T10:00:00Z',
          author: 1
        },
        {
          id: 2,
          title: { rendered: 'Post 2' },
          content: { rendered: 'Content 2' },
          status: 'publish',
          date: '2023-01-02T10:00:00Z',
          author: 1
        }
      ]
    };

    it('should query posts by status successfully', async () => {
      mockWordPressClient.get.mockResolvedValue(mockPostsResponse);

      const result = await service.queryPostsByStatus(mockQueryOptions, 'test-request-id');

      expect(result.success).toBe(true);
      expect(result.posts).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.statusDistribution).toEqual({
        'draft': 1,
        'publish': 1,
        'private': 0
      });
    });

    it('should build correct query parameters', async () => {
      mockWordPressClient.get.mockResolvedValue(mockPostsResponse);

      await service.queryPostsByStatus(mockQueryOptions);

      expect(mockWordPressClient.get).toHaveBeenCalledWith('/wp/v2/posts', {
        params: {
          status: 'draft,publish',
          per_page: 10,
          orderby: 'date',
          order: 'desc'
        }
      });
    });

    it('should handle single status query', async () => {
      const singleStatusOptions = { status: 'draft' as PostStatus };
      mockWordPressClient.get.mockResolvedValue(mockPostsResponse);

      await service.queryPostsByStatus(singleStatusOptions);

      expect(mockWordPressClient.get).toHaveBeenCalledWith('/wp/v2/posts', {
        params: { status: 'draft' }
      });
    });

    it('should handle exclude status option', async () => {
      const excludeOptions = { excludeStatus: ['private'] as PostStatus[] };
      mockWordPressClient.get.mockResolvedValue(mockPostsResponse);

      await service.queryPostsByStatus(excludeOptions);

      expect(mockWordPressClient.get).toHaveBeenCalledWith('/wp/v2/posts', {
        params: { status_exclude: 'private' }
      });
    });

    it('should handle WordPress API errors', async () => {
      mockWordPressClient.get.mockResolvedValue({
        success: false,
        error: { code: 'WP_ERROR', message: 'Query failed' }
      });

      const result = await service.queryPostsByStatus(mockQueryOptions);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WORDPRESS_API_ERROR');
    });
  });

  describe('getPostById', () => {
    const mockPost = {
      success: true,
      data: {
        id: 123,
        title: { rendered: 'Test Post' },
        status: 'publish'
      }
    };

    it('should get post by ID successfully', async () => {
      mockWordPressClient.get.mockResolvedValue(mockPost);

      const result = await service.getPostById(123, 'test-request-id');

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(123);
      expect(mockWordPressClient.get).toHaveBeenCalledWith('/wp/v2/posts/123');
    });

    it('should handle get post errors', async () => {
      mockWordPressClient.get.mockRejectedValue(new Error('Network error'));

      const result = await service.getPostById(123);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WORDPRESS_API_ERROR');
    });
  });

  describe('configuration management', () => {
    it('should return current configuration', () => {
      const config = service.getConfig();
      expect(config.wordpressUrl).toBe('https://test-site.com');
      expect(config.enableStatusHistory).toBe(true);
    });

    it('should update configuration', () => {
      service.updateConfig({ 
        enableStatusHistory: false,
        defaultStatus: 'publish'
      });

      const updatedConfig = service.getConfig();
      expect(updatedConfig.enableStatusHistory).toBe(false);
      expect(updatedConfig.defaultStatus).toBe('publish');
      expect(updatedConfig.wordpressUrl).toBe('https://test-site.com'); // Should keep existing values
    });
  });

  describe('private methods', () => {
    it('should validate status for WordPress operations', () => {
      const validationMethod = (service as any).validateStatusForWordPress;
      
      const result = validationMethod('draft', {}, 'test-request-id');
      
      expect(result.isValid).toBe(true);
      expect(result.internalStatus).toBe('draft');
      expect(result.wordpressStatus).toBe('draft');
    });

    it('should prepare post data with status mapping', () => {
      const prepareMethod = (service as any).preparePostDataWithStatus;
      const postData = {
        title: 'Test',
        content: 'Content',
        status: 'draft'
      };
      const statusValidation = {
        isValid: true,
        internalStatus: 'draft',
        wordpressStatus: 'draft'
      };

      const result = prepareMethod(postData, statusValidation);

      expect(result.title).toBe('Test');
      expect(result.content).toBe('Content');
      expect(result.status).toBe('draft');
      expect(result.author).toBe(1); // Default value
    });

    it('should build query parameters correctly', () => {
      const buildMethod = (service as any).buildQueryParams;
      const options = {
        status: ['draft', 'publish'],
        limit: 20,
        author: 5,
        search: 'test',
        sortBy: 'modified',
        sortOrder: 'asc'
      };

      const result = buildMethod(options);

      expect(result.status).toBe('draft,publish');
      expect(result.per_page).toBe(20);
      expect(result.author).toBe(5);
      expect(result.search).toBe('test');
      expect(result.orderby).toBe('modified');
      expect(result.order).toBe('asc');
    });

    it('should transform WordPress post to PostWithStatus', () => {
      const transformMethod = (service as any).transformWordPressPostToPostWithStatus;
      const wpPost = {
        id: 123,
        title: { rendered: 'Test Post' },
        content: { rendered: 'Test Content' },
        status: 'publish',
        date: '2023-01-01T10:00:00Z',
        author: 1
      };

      const result = transformMethod(wpPost);

      expect(result.id).toBe(123);
      expect(result.title).toBe('Test Post');
      expect(result.content).toBe('Test Content');
      expect(result.status).toBe('publish');
      expect(result.statusMetadata).toBeDefined();
    });
  });

  describe('createWordPressPostStatusIntegrationService factory', () => {
    it('should create service instance', () => {
      const service = createWordPressPostStatusIntegrationService(mockConfig);
      expect(service).toBeInstanceOf(WordPressPostStatusIntegrationService);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle malformed WordPress responses', async () => {
      mockWordPressClient.post.mockResolvedValue({
        success: true,
        data: null // Malformed response
      });

      const result = await service.createPostWithStatus({
        title: 'Test',
        content: 'Content',
        status: 'draft'
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WORDPRESS_API_ERROR');
    });

    it('should handle status transition validation with missing current status', async () => {
      const postData = {
        title: 'Test',
        content: 'Content',
        status: 'publish' as PostStatus,
        validateStatusTransition: true
        // Missing currentStatus
      };

      mockWordPressClient.post.mockResolvedValue({
        success: true,
        data: {
          id: 123,
          status: 'publish',
          date: '2023-01-01T10:00:00Z',
          link: 'https://test.com/post'
        }
      });

      const result = await service.createPostWithStatus(postData);

      expect(result.success).toBe(true); // Should succeed without transition validation
    });

    it('should handle empty query results', async () => {
      mockWordPressClient.get.mockResolvedValue({
        success: true,
        data: []
      });

      const result = await service.queryPostsByStatus({ status: 'draft' });

      expect(result.success).toBe(true);
      expect(result.posts).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should handle configuration with disabled features', async () => {
      const minimalService = new WordPressPostStatusIntegrationService({
        ...mockConfig,
        enableStatusHistory: false,
        enableMetadataTracking: false,
        enableStatusValidation: false
      });

      (minimalService as any).client = mockWordPressClient;

      mockWordPressClient.post.mockResolvedValue({
        success: true,
        data: {
          id: 123,
          status: 'draft',
          date: '2023-01-01T10:00:00Z',
          link: 'https://test.com/post'
        }
      });

      const result = await minimalService.createPostWithStatus({
        title: 'Test',
        content: 'Content',
        status: 'draft'
      });

      expect(result.success).toBe(true);
      expect(result.statusMetadata).toBeUndefined();
      expect(result.statusTransition).toBeUndefined();
    });
  });
});
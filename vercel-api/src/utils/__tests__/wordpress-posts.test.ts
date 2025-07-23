import { WordPressPostService, createWordPressPostService, createBasicPost } from '../wordpress-posts';
import { WordPressClient } from '../wordpress';
import { WordPressError, ValidationError } from '../../types';

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

describe('WordPress Post Service', () => {
  let postService: WordPressPostService;

  beforeEach(() => {
    jest.clearAllMocks();
    postService = new WordPressPostService(mockWordPressClient);
  });

  describe('createPost', () => {
    const validPostData = {
      title: 'Test Post Title',
      content: 'This is the test post content.',
      status: 'draft' as const,
    };

    it('should create a post successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 123,
          title: { rendered: 'Test Post Title' },
          content: { rendered: 'This is the test post content.' },
          status: 'draft',
          link: 'https://example.com/test-post',
        },
      };

      mockWordPressClient.post.mockResolvedValue(mockResponse);

      const result = await postService.createPost(validPostData);

      expect(result.success).toBe(true);
      expect(result.postId).toBe(123);
      expect(result.postUrl).toBe('https://example.com/test-post');
      expect(result.postData).toEqual(mockResponse.data);
      expect(mockWordPressClient.post).toHaveBeenCalledWith('/wp/v2/posts', expect.objectContaining({
        title: 'Test Post Title',
        content: 'This is the test post content.',
        status: 'draft',
      }));
    });

    it('should validate required fields', async () => {
      const invalidData = {
        title: '',
        content: '',
      };

      const result = await postService.createPost(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect((result.error as ValidationError).details).toContain('Post title is required');
      expect((result.error as ValidationError).details).toContain('Post content is required');
      expect(mockWordPressClient.post).not.toHaveBeenCalled();
    });

    it('should validate title length', async () => {
      const longTitle = 'A'.repeat(201);
      const invalidData = {
        title: longTitle,
        content: 'Valid content',
      };

      const result = await postService.createPost(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect((result.error as ValidationError).details).toContain('Post title exceeds maximum length of 200 characters');
    });

    it('should validate content length', async () => {
      const longContent = 'A'.repeat(50001);
      const invalidData = {
        title: 'Valid title',
        content: longContent,
      };

      const result = await postService.createPost(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect((result.error as ValidationError).details).toContain('Post content exceeds maximum length of 50000 characters');
    });

    it('should validate excerpt length', async () => {
      const longExcerpt = 'A'.repeat(161);
      const invalidData = {
        title: 'Valid title',
        content: 'Valid content',
        excerpt: longExcerpt,
      };

      const result = await postService.createPost(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect((result.error as ValidationError).details).toContain('Post excerpt exceeds maximum length of 160 characters');
    });

    it('should validate post status', async () => {
      const invalidData = {
        title: 'Valid title',
        content: 'Valid content',
        status: 'invalid-status' as any,
      };

      const result = await postService.createPost(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect((result.error as ValidationError).details).toContain('Invalid post status. Must be draft, publish, or private');
    });

    it('should validate author ID', async () => {
      const invalidData = {
        title: 'Valid title',
        content: 'Valid content',
        author: -1,
      };

      const result = await postService.createPost(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect((result.error as ValidationError).details).toContain('Author ID must be a positive integer');
    });

    it('should handle WordPress API errors', async () => {
      const mockError = {
        success: false,
        error: {
          code: 'WORDPRESS_AUTHENTICATION_ERROR',
          message: 'Authentication failed',
        } as WordPressError,
      };

      mockWordPressClient.post.mockResolvedValue(mockError);

      const result = await postService.createPost(validPostData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WORDPRESS_AUTHENTICATION_ERROR');
      expect(result.error?.message).toBe('Authentication failed');
    });

    it('should handle exceptions', async () => {
      mockWordPressClient.post.mockRejectedValue(new Error('Network error'));

      const result = await postService.createPost(validPostData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WORDPRESS_API_ERROR');
      expect(result.error?.message).toBe('Network error');
    });

    it('should include optional fields when provided', async () => {
      const postDataWithOptions = {
        ...validPostData,
        excerpt: 'Test excerpt',
        slug: 'test-post-slug',
      };

      const mockResponse = {
        success: true,
        data: {
          id: 123,
          title: { rendered: 'Test Post Title' },
          content: { rendered: 'This is the test post content.' },
          excerpt: { rendered: 'Test excerpt' },
          slug: 'test-post-slug',
          status: 'draft',
          link: 'https://example.com/test-post',
        },
      };

      mockWordPressClient.post.mockResolvedValue(mockResponse);

      const result = await postService.createPost(postDataWithOptions);

      expect(result.success).toBe(true);
      expect(mockWordPressClient.post).toHaveBeenCalledWith('/wp/v2/posts', expect.objectContaining({
        title: 'Test Post Title',
        content: 'This is the test post content.',
        excerpt: 'Test excerpt',
        slug: 'test-post-slug',
        status: 'draft',
      }));
    });

    it('should apply creation options', async () => {
      const options = {
        status: 'publish' as const,
        allowComments: false,
        allowPings: false,
        author: 2,
        format: 'aside',
        sticky: true,
        template: 'custom-template.php',
        password: 'secret123',
      };

      const mockResponse = {
        success: true,
        data: {
          id: 123,
          title: { rendered: 'Test Post Title' },
          content: { rendered: 'This is the test post content.' },
          status: 'publish',
          link: 'https://example.com/test-post',
        },
      };

      mockWordPressClient.post.mockResolvedValue(mockResponse);

      const result = await postService.createPost(validPostData, options);

      expect(result.success).toBe(true);
      expect(mockWordPressClient.post).toHaveBeenCalledWith('/wp/v2/posts', expect.objectContaining({
        title: 'Test Post Title',
        content: 'This is the test post content.',
        status: 'publish',
        author: 2,
        comment_status: 'closed',
        ping_status: 'closed',
        format: 'aside',
        sticky: true,
        template: 'custom-template.php',
        password: 'secret123',
      }));
    });
  });

  describe('updatePost', () => {
    const validUpdateData = {
      title: 'Updated Post Title',
      content: 'Updated content.',
    };

    it('should update a post successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 123,
          title: { rendered: 'Updated Post Title' },
          content: { rendered: 'Updated content.' },
          status: 'draft',
          link: 'https://example.com/updated-post',
        },
      };

      mockWordPressClient.put.mockResolvedValue(mockResponse);

      const result = await postService.updatePost(123, validUpdateData);

      expect(result.success).toBe(true);
      expect(result.postId).toBe(123);
      expect(result.postUrl).toBe('https://example.com/updated-post');
      expect(mockWordPressClient.put).toHaveBeenCalledWith('/wp/v2/posts/123', expect.objectContaining({
        title: 'Updated Post Title',
        content: 'Updated content.',
      }));
    });

    it('should validate post ID', async () => {
      const result = await postService.updatePost(-1, validUpdateData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toBe('Invalid post ID');
      expect(mockWordPressClient.put).not.toHaveBeenCalled();
    });

    it('should handle WordPress API errors during update', async () => {
      const mockError = {
        success: false,
        error: {
          code: 'WORDPRESS_NOT_FOUND_ERROR',
          message: 'Post not found',
        } as WordPressError,
      };

      mockWordPressClient.put.mockResolvedValue(mockError);

      const result = await postService.updatePost(123, validUpdateData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WORDPRESS_NOT_FOUND_ERROR');
      expect(result.error?.message).toBe('Post not found');
    });
  });

  describe('getPost', () => {
    it('should retrieve a post successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 123,
          title: { rendered: 'Test Post Title' },
          content: { rendered: 'Test content.' },
          status: 'draft',
          link: 'https://example.com/test-post',
        },
      };

      mockWordPressClient.get.mockResolvedValue(mockResponse);

      const result = await postService.getPost(123);

      expect(result.success).toBe(true);
      expect(result.postId).toBe(123);
      expect(result.postUrl).toBe('https://example.com/test-post');
      expect(result.postData).toEqual(mockResponse.data);
      expect(mockWordPressClient.get).toHaveBeenCalledWith('/wp/v2/posts/123');
    });

    it('should validate post ID for retrieval', async () => {
      const result = await postService.getPost(0);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toBe('Invalid post ID');
      expect(mockWordPressClient.get).not.toHaveBeenCalled();
    });
  });

  describe('deletePost', () => {
    it('should delete a post successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 123,
          status: 'trash',
        },
      };

      mockWordPressClient.delete.mockResolvedValue(mockResponse);

      const result = await postService.deletePost(123);

      expect(result.success).toBe(true);
      expect(result.postId).toBe(123);
      expect(mockWordPressClient.delete).toHaveBeenCalledWith('/wp/v2/posts/123');
    });

    it('should delete a post with force option', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 123,
          status: 'deleted',
        },
      };

      mockWordPressClient.delete.mockResolvedValue(mockResponse);

      const result = await postService.deletePost(123, true);

      expect(result.success).toBe(true);
      expect(result.postId).toBe(123);
      expect(mockWordPressClient.delete).toHaveBeenCalledWith('/wp/v2/posts/123?force=true');
    });

    it('should validate post ID for deletion', async () => {
      const result = await postService.deletePost(-1);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toBe('Invalid post ID');
      expect(mockWordPressClient.delete).not.toHaveBeenCalled();
    });
  });
});

describe('createWordPressPostService', () => {
  it('should create a post service instance', () => {
    const service = createWordPressPostService();
    expect(service).toBeInstanceOf(WordPressPostService);
  });

  it('should create a post service with custom client', () => {
    const customClient = {} as WordPressClient;
    const service = createWordPressPostService(customClient);
    expect(service).toBeInstanceOf(WordPressPostService);
  });
});

describe('createBasicPost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a basic post successfully', async () => {
    const mockResponse = {
      success: true,
      data: {
        id: 123,
        title: { rendered: 'Basic Post' },
        content: { rendered: 'Basic content.' },
        status: 'draft',
        link: 'https://example.com/basic-post',
      },
    };

    // Mock the WordPress client that will be created internally
    const mockClient = {
      post: jest.fn().mockResolvedValue(mockResponse),
    } as jest.Mocked<WordPressClient>;

    // Mock the createWordPressClient function
    jest.doMock('../wordpress', () => ({
      createWordPressClient: jest.fn(() => mockClient),
    }));

    const result = await createBasicPost('Basic Post', 'Basic content.');

    expect(result.success).toBe(true);
    expect(result.postId).toBe(123);
    expect(result.postUrl).toBe('https://example.com/basic-post');
  });

  it('should create a basic post with options', async () => {
    const mockResponse = {
      success: true,
      data: {
        id: 123,
        title: { rendered: 'Basic Post' },
        content: { rendered: 'Basic content.' },
        status: 'publish',
        link: 'https://example.com/basic-post',
      },
    };

    const mockClient = {
      post: jest.fn().mockResolvedValue(mockResponse),
    } as jest.Mocked<WordPressClient>;

    jest.doMock('../wordpress', () => ({
      createWordPressClient: jest.fn(() => mockClient),
    }));

    const options = {
      status: 'publish' as const,
      allowComments: false,
    };

    const result = await createBasicPost('Basic Post', 'Basic content.', options);

    expect(result.success).toBe(true);
    expect(result.postId).toBe(123);
  });
}); 
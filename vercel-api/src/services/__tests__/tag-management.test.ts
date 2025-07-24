import { jest } from '@jest/globals';
import { 
  TagManagementService, 
  createTagManagementService,
  TagManagementConfig
} from '../tag-management';
import { 
  WordPressTag, 
  TagCreateRequest, 
  TagUpdateRequest 
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

// Mock global fetch
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('TagManagementService', () => {
  let service: TagManagementService;
  let mockConfig: TagManagementConfig;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockConfig = {
      wordpressUrl: 'https://test-site.com',
      username: 'testuser',
      password: 'testpass',
      timeout: 5000,
      maxRetries: 2,
      retryDelay: 500
    };

    service = new TagManagementService(mockConfig);
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTag', () => {
    const mockTagData: TagCreateRequest = {
      name: 'JavaScript',
      description: 'JavaScript programming language',
    };

    const mockWordPressResponse = {
      id: 123,
      name: 'JavaScript',
      slug: 'javascript',
      description: 'JavaScript programming language',
      count: 0,
      link: 'https://test-site.com/tag/javascript',
      meta: {}
    };

    it('should create a new tag successfully', async () => {
      // Mock successful search (tag doesn't exist)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => []
        } as Response)
        // Mock successful creation
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockWordPressResponse
        } as Response);

      const result = await service.createTag(mockTagData, 'test-request-id');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect((result.data as WordPressTag).name).toBe('JavaScript');
      expect((result.data as WordPressTag).slug).toBe('javascript');
      expect(result.requestId).toBe('test-request-id');
    });

    it('should return existing tag if it already exists', async () => {
      // Mock search returns existing tag
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockWordPressResponse]
      } as Response);

      const result = await service.createTag(mockTagData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect((result.data as WordPressTag).id).toBe(123);
      expect(result.warnings).toContain('Tag with this name already exists');
    });

    it('should validate tag data and return error for invalid data', async () => {
      const invalidTagData: TagCreateRequest = {
        name: '', // Invalid empty name
        description: 'Test'
      };

      const result = await service.createTag(invalidTagData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toBe('Tag data validation failed');
    });

    it('should handle WordPress API errors', async () => {
      // Mock search (tag doesn't exist)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => []
        } as Response)
        // Mock creation failure
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ code: 'internal_error', message: 'Internal server error' })
        } as Response);

      const result = await service.createTag(mockTagData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CREATION_FAILED');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.createTag(mockTagData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CREATION_ERROR');
    });

    it('should retry on server errors', async () => {
      // Mock search (tag doesn't exist)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => []
        } as Response)
        // First attempt fails with 500
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ message: 'Server error' })
        } as Response)
        // Second attempt succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockWordPressResponse
        } as Response);

      const result = await service.createTag(mockTagData);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3); // 1 search + 2 creation attempts
    });
  });

  describe('updateTag', () => {
    const mockUpdateData: TagUpdateRequest = {
      id: 123,
      name: 'Updated JavaScript',
      description: 'Updated description'
    };

    const mockExistingTag = {
      id: 123,
      name: 'JavaScript',
      slug: 'javascript',
      description: 'Original description',
      count: 5,
      link: 'https://test-site.com/tag/javascript'
    };

    const mockUpdatedTag = {
      ...mockExistingTag,
      name: 'Updated JavaScript',
      slug: 'updated-javascript',
      description: 'Updated description'
    };

    it('should update a tag successfully', async () => {
      // Mock get existing tag
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockExistingTag
        } as Response)
        // Mock update
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUpdatedTag
        } as Response);

      const result = await service.updateTag(mockUpdateData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect((result.data as WordPressTag).name).toBe('Updated JavaScript');
    });

    it('should return error if tag not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ code: 'rest_term_invalid', message: 'Invalid term ID.' })
      } as Response);

      const result = await service.updateTag(mockUpdateData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TAG_NOT_FOUND');
    });
  });

  describe('getTagById', () => {
    const mockTag = {
      id: 123,
      name: 'JavaScript',
      slug: 'javascript',
      description: 'JavaScript programming',
      count: 5,
      link: 'https://test-site.com/tag/javascript'
    };

    it('should fetch tag by ID successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTag
      } as Response);

      const result = await service.getTagById(123);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect((result.data as WordPressTag).id).toBe(123);
    });

    it('should return error if tag not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ code: 'rest_term_invalid', message: 'Invalid term ID.' })
      } as Response);

      const result = await service.getTagById(999);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TAG_NOT_FOUND');
    });
  });

  describe('findTagByName', () => {
    const mockTags = [
      {
        id: 123,
        name: 'JavaScript',
        slug: 'javascript',
        description: 'JavaScript programming',
        count: 5
      },
      {
        id: 124,
        name: 'JavaScript Framework',
        slug: 'javascript-framework',
        description: 'JS frameworks',
        count: 2
      }
    ];

    it('should find tag by exact name match', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTags
      } as Response);

      const result = await service.findTagByName('JavaScript', { exactMatch: true });

      expect(result.success).toBe(true);
      expect((result.data as WordPressTag).id).toBe(123);
    });

    it('should return first result for non-exact search', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTags
      } as Response);

      const result = await service.findTagByName('Java', { exactMatch: false });

      expect(result.success).toBe(true);
      expect((result.data as WordPressTag).id).toBe(123);
    });

    it('should return error if no matches found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      } as Response);

      const result = await service.findTagByName('Nonexistent');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TAG_NOT_FOUND');
    });
  });

  describe('getAllTags', () => {
    const mockTags = [
      { id: 1, name: 'JavaScript', slug: 'javascript', count: 10 },
      { id: 2, name: 'Python', slug: 'python', count: 8 },
      { id: 3, name: 'React', slug: 'react', count: 0 },
      { id: 4, name: 'Vue', slug: 'vue', count: 3 }
    ];

    it('should fetch all tags successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTags
      } as Response);

      const result = await service.getAllTags();

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect((result.data as WordPressTag[]).length).toBe(4);
    });

    it('should filter tags by minimum post count', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTags
      } as Response);

      const result = await service.getAllTags({ minPostCount: 5 });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect((result.data as WordPressTag[]).length).toBe(2); // Only JavaScript and Python
    });

    it('should handle empty tag list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      } as Response);

      const result = await service.getAllTags();

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect((result.data as WordPressTag[]).length).toBe(0);
    });
  });

  describe('deleteTag', () => {
    it('should delete tag successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deleted: true, previous: { id: 123, name: 'Deleted Tag' } })
      } as Response);

      const result = await service.deleteTag(123);

      expect(result.success).toBe(true);
    });

    it('should handle delete failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ code: 'rest_term_invalid', message: 'Invalid term ID.' })
      } as Response);

      const result = await service.deleteTag(999);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DELETE_FAILED');
    });
  });

  describe('getTagStatistics', () => {
    const mockTags = [
      { id: 1, name: 'JavaScript', count: 10 },
      { id: 2, name: 'Python', count: 8 },
      { id: 3, name: 'React', count: 0 },
      { id: 4, name: 'Vue', count: 3 },
      { id: 5, name: 'Node.js', count: 0 }
    ];

    it('should calculate tag statistics successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTags
      } as Response);

      const result = await service.getTagStatistics();

      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
      expect(result.stats!.totalTags).toBe(5);
      expect(result.stats!.activeTags).toBe(3); // Tags with count > 0
      expect(result.stats!.unusedTags).toBe(2); // Tags with count = 0
      expect(result.stats!.averagePostsPerTag).toBe(4.2); // (10+8+0+3+0)/5 = 4.2
      expect(result.stats!.mostUsedTags[0].name).toBe('JavaScript');
    });

    it('should handle empty tag list for statistics', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      } as Response);

      const result = await service.getTagStatistics();

      expect(result.success).toBe(true);
      expect(result.stats!.totalTags).toBe(0);
      expect(result.stats!.averagePostsPerTag).toBe(0);
    });
  });

  describe('bulkCreateTags', () => {
    const tagNames = ['React', 'Vue', 'Angular'];

    it('should create multiple tags successfully', async () => {
      // Mock searches (tags don't exist)
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1, name: 'React', slug: 'react' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 2, name: 'Vue', slug: 'vue' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 3, name: 'Angular', slug: 'angular' }) } as Response);

      const result = await service.bulkCreateTags(tagNames);

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect((result.data as WordPressTag[]).length).toBe(3);
    });

    it('should handle partial failures in bulk creation', async () => {
      // Mock first tag success, second tag failure, third tag success
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1, name: 'React', slug: 'react' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
        .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ message: 'Server error' }) } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 3, name: 'Angular', slug: 'angular' }) } as Response);

      const result = await service.bulkCreateTags(tagNames);

      expect(result.success).toBe(true);
      expect((result.data as WordPressTag[]).length).toBe(2); // Only React and Angular
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('Failed to create tag "Vue"');
    });

    it('should handle empty tag list', async () => {
      const result = await service.bulkCreateTags([]);

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect((result.data as WordPressTag[]).length).toBe(0);
    });
  });

  describe('getOrCreateTags', () => {
    const tagNames = ['Existing Tag', 'New Tag'];

    it('should get existing tags and create new ones', async () => {
      // Mock existing tag found
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ id: 1, name: 'Existing Tag', slug: 'existing-tag' }]
        } as Response)
        // Mock new tag not found
        .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
        // Mock new tag creation
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 2, name: 'New Tag', slug: 'new-tag' })
        } as Response);

      const result = await service.getOrCreateTags(tagNames);

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect((result.data as WordPressTag[]).length).toBe(2);
      expect(result.warnings).toContain('Created 1 new tags');
    });

    it('should handle empty tag names list', async () => {
      const result = await service.getOrCreateTags([]);

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect((result.data as WordPressTag[]).length).toBe(0);
    });

    it('should fail if tag creation fails', async () => {
      // Mock search (tag doesn't exist)
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
        // Mock creation failure
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ message: 'Server error' })
        } as Response);

      const result = await service.getOrCreateTags(['Failed Tag']);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TAG_PROCESSING_FAILED');
    });
  });

  describe('createTagManagementService', () => {
    it('should create service instance with config', () => {
      const service = createTagManagementService(mockConfig);
      expect(service).toBeInstanceOf(TagManagementService);
    });
  });

  describe('error handling and retries', () => {
    it('should retry on timeout errors', async () => {
      const mockTagData: TagCreateRequest = {
        name: 'Test Tag'
      };

      // Mock search (tag doesn't exist)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => []
        } as Response)
        // First attempt times out
        .mockRejectedValueOnce(new Error('Timeout'))
        // Second attempt succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 123, name: 'Test Tag', slug: 'test-tag' })
        } as Response);

      const result = await service.createTag(mockTagData);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3); // 1 search + 2 creation attempts
    });

    it('should not retry on client errors (4xx)', async () => {
      const mockTagData: TagCreateRequest = {
        name: 'Test Tag'
      };

      // Mock search (tag doesn't exist)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => []
        } as Response)
        // Creation fails with 400 (client error)
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ code: 'invalid_data', message: 'Invalid data' })
        } as Response);

      const result = await service.createTag(mockTagData);

      expect(result.success).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(2); // 1 search + 1 creation attempt (no retry)
    });

    it('should handle max retries exceeded', async () => {
      const mockTagData: TagCreateRequest = {
        name: 'Test Tag'
      };

      // Mock search (tag doesn't exist)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => []
        } as Response)
        // All creation attempts fail with 500
        .mockResolvedValue({
          ok: false,
          status: 500,
          json: async () => ({ message: 'Server error' })
        } as Response);

      const result = await service.createTag(mockTagData);

      expect(result.success).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(3); // 1 search + 2 creation attempts (max retries = 2)
    });
  });

  describe('authentication', () => {
    it('should use Basic authentication with encoded credentials', async () => {
      const mockTagData: TagCreateRequest = {
        name: 'Test Tag'
      };

      // Mock search (tag doesn't exist)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => []
        } as Response)
        // Mock creation
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 123, name: 'Test Tag', slug: 'test-tag' })
        } as Response);

      await service.createTag(mockTagData);

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
});
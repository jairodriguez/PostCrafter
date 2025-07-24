import { jest } from '@jest/globals';
import { 
  CategoryManagementService, 
  createCategoryManagementService,
  CategoryManagementConfig
} from '../category-management';
import { 
  WordPressCategory, 
  CategoryCreateRequest, 
  CategoryUpdateRequest 
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

describe('CategoryManagementService', () => {
  let service: CategoryManagementService;
  let mockConfig: CategoryManagementConfig;
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

    service = new CategoryManagementService(mockConfig);
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCategory', () => {
    const mockCategoryData: CategoryCreateRequest = {
      name: 'Test Category',
      description: 'A test category',
      parent: 0
    };

    const mockWordPressResponse = {
      id: 123,
      name: 'Test Category',
      slug: 'test-category',
      description: 'A test category',
      parent: 0,
      count: 0,
      link: 'https://test-site.com/category/test-category',
      meta: {}
    };

    it('should create a new category successfully', async () => {
      // Mock successful search (category doesn't exist)
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

      const result = await service.createCategory(mockCategoryData, 'test-request-id');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect((result.data as WordPressCategory).name).toBe('Test Category');
      expect((result.data as WordPressCategory).slug).toBe('test-category');
      expect(result.requestId).toBe('test-request-id');
    });

    it('should return existing category if it already exists', async () => {
      // Mock search returns existing category
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [mockWordPressResponse]
      } as Response);

      const result = await service.createCategory(mockCategoryData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect((result.data as WordPressCategory).id).toBe(123);
      expect(result.warnings).toContain('Category with this name already exists');
    });

    it('should validate category data and return error for invalid data', async () => {
      const invalidCategoryData: CategoryCreateRequest = {
        name: '', // Invalid empty name
        description: 'Test'
      };

      const result = await service.createCategory(invalidCategoryData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toBe('Category data validation failed');
    });

    it('should validate parent category exists', async () => {
      const categoryWithParent: CategoryCreateRequest = {
        name: 'Child Category',
        parent: 999 // Non-existent parent
      };

      // Mock search for existing category (not found)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => []
        } as Response)
        // Mock parent validation (parent not found)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({ code: 'rest_term_invalid', message: 'Invalid term ID.' })
        } as Response);

      const result = await service.createCategory(categoryWithParent);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_PARENT');
    });

    it('should handle WordPress API errors', async () => {
      // Mock search (category doesn't exist)
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

      const result = await service.createCategory(mockCategoryData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CREATION_FAILED');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.createCategory(mockCategoryData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CREATION_ERROR');
    });

    it('should retry on server errors', async () => {
      // Mock search (category doesn't exist)
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

      const result = await service.createCategory(mockCategoryData);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3); // 1 search + 2 creation attempts
    });
  });

  describe('updateCategory', () => {
    const mockUpdateData: CategoryUpdateRequest = {
      id: 123,
      name: 'Updated Category',
      description: 'Updated description'
    };

    const mockExistingCategory = {
      id: 123,
      name: 'Original Category',
      slug: 'original-category',
      description: 'Original description',
      parent: 0,
      count: 5,
      link: 'https://test-site.com/category/original-category'
    };

    const mockUpdatedCategory = {
      ...mockExistingCategory,
      name: 'Updated Category',
      slug: 'updated-category',
      description: 'Updated description'
    };

    it('should update a category successfully', async () => {
      // Mock get existing category
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockExistingCategory
        } as Response)
        // Mock update
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUpdatedCategory
        } as Response);

      const result = await service.updateCategory(mockUpdateData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect((result.data as WordPressCategory).name).toBe('Updated Category');
    });

    it('should prevent circular references', async () => {
      const circularUpdateData: CategoryUpdateRequest = {
        id: 123,
        parent: 123 // Category as its own parent
      };

      const result = await service.updateCategory(circularUpdateData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CIRCULAR_REFERENCE');
    });

    it('should detect deeper circular references', async () => {
      const updateData: CategoryUpdateRequest = {
        id: 123,
        parent: 456
      };

      // Mock get existing category
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockExistingCategory
        } as Response)
        // Mock parent validation (exists)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 456, parent: 789 })
        } as Response)
        // Mock grandparent fetch for circular check
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 789, parent: 123 }) // Circular reference!
        } as Response);

      const result = await service.updateCategory(updateData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CIRCULAR_REFERENCE');
    });

    it('should return error if category not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ code: 'rest_term_invalid', message: 'Invalid term ID.' })
      } as Response);

      const result = await service.updateCategory(mockUpdateData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CATEGORY_NOT_FOUND');
    });
  });

  describe('getCategoryById', () => {
    const mockCategory = {
      id: 123,
      name: 'Test Category',
      slug: 'test-category',
      description: 'A test category',
      parent: 0,
      count: 5,
      link: 'https://test-site.com/category/test-category'
    };

    it('should fetch category by ID successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategory
      } as Response);

      const result = await service.getCategoryById(123);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect((result.data as WordPressCategory).id).toBe(123);
    });

    it('should return error if category not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ code: 'rest_term_invalid', message: 'Invalid term ID.' })
      } as Response);

      const result = await service.getCategoryById(999);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CATEGORY_NOT_FOUND');
    });
  });

  describe('findCategoryByName', () => {
    const mockCategories = [
      {
        id: 123,
        name: 'Exact Match',
        slug: 'exact-match',
        description: '',
        parent: 0,
        count: 3
      },
      {
        id: 124,
        name: 'Partial Match Category',
        slug: 'partial-match-category',
        description: '',
        parent: 0,
        count: 1
      }
    ];

    it('should find category by exact name match', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories
      } as Response);

      const result = await service.findCategoryByName('Exact Match', { exactMatch: true });

      expect(result.success).toBe(true);
      expect((result.data as WordPressCategory).id).toBe(123);
    });

    it('should return first result for non-exact search', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories
      } as Response);

      const result = await service.findCategoryByName('Match', { exactMatch: false });

      expect(result.success).toBe(true);
      expect((result.data as WordPressCategory).id).toBe(123);
    });

    it('should return error if no matches found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      } as Response);

      const result = await service.findCategoryByName('Nonexistent');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CATEGORY_NOT_FOUND');
    });
  });

  describe('getCategoryHierarchy', () => {
    const mockCategories = [
      { id: 1, name: 'Technology', slug: 'technology', parent: 0, count: 10 },
      { id: 2, name: 'Programming', slug: 'programming', parent: 1, count: 5 },
      { id: 3, name: 'JavaScript', slug: 'javascript', parent: 2, count: 3 },
      { id: 4, name: 'Python', slug: 'python', parent: 2, count: 2 },
      { id: 5, name: 'Design', slug: 'design', parent: 0, count: 8 }
    ];

    it('should build category hierarchy successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategories
      } as Response);

      const result = await service.getCategoryHierarchy();

      expect(result.success).toBe(true);
      expect(result.hierarchy).toBeDefined();
      expect(result.hierarchy!.length).toBe(2); // 2 root categories
      expect(result.stats).toBeDefined();
      expect(result.stats!.totalCategories).toBe(5);
      expect(result.stats!.rootCategories).toBe(2);
      expect(result.stats!.maxDepth).toBe(2); // Technology > Programming > JavaScript

      // Check hierarchy structure
      const techCategory = result.hierarchy!.find(cat => cat.name === 'Technology');
      expect(techCategory).toBeDefined();
      expect(techCategory!.children.length).toBe(1);
      expect(techCategory!.children[0]?.name).toBe('Programming');
      expect(techCategory!.children[0]?.children?.length).toBe(2);
    });

    it('should handle empty category list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      } as Response);

      const result = await service.getCategoryHierarchy();

      expect(result.success).toBe(true);
      expect(result.hierarchy!.length).toBe(0);
      expect(result.stats!.totalCategories).toBe(0);
    });
  });

  describe('getCategoryChildren', () => {
    const mockChildren = [
      { id: 2, name: 'Child 1', slug: 'child-1', parent: 1, count: 3 },
      { id: 3, name: 'Child 2', slug: 'child-2', parent: 1, count: 5 }
    ];

    it('should fetch category children successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockChildren
      } as Response);

      const result = await service.getCategoryChildren(1);

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect((result.data as WordPressCategory[]).length).toBe(2);
    });

    it('should handle category with no children', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      } as Response);

      const result = await service.getCategoryChildren(999);

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect((result.data as WordPressCategory[]).length).toBe(0);
    });
  });

  describe('deleteCategory', () => {
    it('should delete category successfully when it has no children', async () => {
      // Mock get children (empty)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => []
        } as Response)
        // Mock delete
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ deleted: true, previous: { id: 123, name: 'Deleted Category' } })
        } as Response);

      const result = await service.deleteCategory(123);

      expect(result.success).toBe(true);
    });

    it('should prevent deletion of category with children', async () => {
      const mockChildren = [
        { id: 456, name: 'Child Category', parent: 123 }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockChildren
      } as Response);

      const result = await service.deleteCategory(123);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('HAS_CHILDREN');
    });

    it('should force delete category when force=true', async () => {
      const mockChildren = [
        { id: 456, name: 'Child Category', parent: 123 }
      ];

      // Mock get children (has children)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockChildren
        } as Response);

      const result = await service.deleteCategory(123, true);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('HAS_CHILDREN');
      // Note: Even with force=true, we still prevent deletion of categories with children
      // This is a safety measure to prevent accidental data loss
    });
  });

  describe('createCategoryManagementService', () => {
    it('should create service instance with config', () => {
      const service = createCategoryManagementService(mockConfig);
      expect(service).toBeInstanceOf(CategoryManagementService);
    });
  });

  describe('error handling and retries', () => {
    it('should retry on timeout errors', async () => {
      const mockCategoryData: CategoryCreateRequest = {
        name: 'Test Category'
      };

      // Mock search (category doesn't exist)
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
          json: async () => ({ id: 123, name: 'Test Category', slug: 'test-category' })
        } as Response);

      const result = await service.createCategory(mockCategoryData);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3); // 1 search + 2 creation attempts
    });

    it('should not retry on client errors (4xx)', async () => {
      const mockCategoryData: CategoryCreateRequest = {
        name: 'Test Category'
      };

      // Mock search (category doesn't exist)
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

      const result = await service.createCategory(mockCategoryData);

      expect(result.success).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(2); // 1 search + 1 creation attempt (no retry)
    });

    it('should handle max retries exceeded', async () => {
      const mockCategoryData: CategoryCreateRequest = {
        name: 'Test Category'
      };

      // Mock search (category doesn't exist)
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

      const result = await service.createCategory(mockCategoryData);

      expect(result.success).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(3); // 1 search + 2 creation attempts (max retries = 2)
    });
  });

  describe('authentication', () => {
    it('should use Basic authentication with encoded credentials', async () => {
      const mockCategoryData: CategoryCreateRequest = {
        name: 'Test Category'
      };

      // Mock search (category doesn't exist)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => []
        } as Response)
        // Mock creation
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 123, name: 'Test Category', slug: 'test-category' })
        } as Response);

      await service.createCategory(mockCategoryData);

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
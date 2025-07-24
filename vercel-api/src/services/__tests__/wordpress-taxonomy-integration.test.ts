import { jest } from '@jest/globals';
import { 
  WordPressTaxonomyIntegrationService, 
  createWordPressTaxonomyIntegrationService,
  WordPressTaxonomyIntegrationConfig,
  TaxonomyBulkOperationRequest,
  TaxonomySearchOptions
} from '../wordpress-taxonomy-integration';
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

// Mock sub-services
jest.mock('../category-management', () => ({
  CategoryManagementService: jest.fn().mockImplementation(() => ({
    getCategoryHierarchy: jest.fn(),
    getCategoryById: jest.fn(),
    createCategory: jest.fn(),
    deleteCategory: jest.fn()
  }))
}));

jest.mock('../tag-management', () => ({
  TagManagementService: jest.fn().mockImplementation(() => ({
    getTagStatistics: jest.fn(),
    getAllTags: jest.fn(),
    getTagById: jest.fn(),
    createTag: jest.fn(),
    deleteTag: jest.fn()
  }))
}));

jest.mock('../post-taxonomy-assignment', () => ({
  PostTaxonomyAssignmentService: jest.fn().mockImplementation(() => ({
    assignTaxonomyToPost: jest.fn(),
    createPostWithTaxonomy: jest.fn()
  }))
}));

describe('WordPressTaxonomyIntegrationService', () => {
  let service: WordPressTaxonomyIntegrationService;
  let mockConfig: WordPressTaxonomyIntegrationConfig;
  let mockCategoryService: any;
  let mockTagService: any;
  let mockPostTaxonomyService: any;

  beforeEach(() => {
    mockConfig = {
      wordpressUrl: 'https://test-site.com',
      username: 'testuser',
      password: 'testpass',
      timeout: 5000,
      maxRetries: 2,
      retryDelay: 500,
      enableCaching: false,
      enableMetadata: true,
      validateHierarchy: true
    };

    service = new WordPressTaxonomyIntegrationService(mockConfig);
    
    // Get mocked service instances
    mockCategoryService = (service as any).categoryService;
    mockTagService = (service as any).tagService;
    mockPostTaxonomyService = (service as any).postTaxonomyService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCompleteTaxonomyHierarchy', () => {
    const mockCategories: WordPressCategory[] = [
      { id: 1, name: 'Technology', slug: 'technology', description: '', count: 10 },
      { id: 2, name: 'JavaScript', slug: 'javascript', description: '', count: 5, parent: 1 }
    ];

    const mockTags: WordPressTag[] = [
      { id: 1, name: 'web-dev', slug: 'web-dev', description: '', count: 8 },
      { id: 2, name: 'programming', slug: 'programming', description: '', count: 12 }
    ];

    const mockCategoryHierarchy = [
      {
        id: 1,
        name: 'Technology',
        slug: 'technology',
        children: [
          { id: 2, name: 'JavaScript', slug: 'javascript', parent: 1 }
        ]
      }
    ];

    it('should fetch complete taxonomy hierarchy successfully', async () => {
      // Mock category hierarchy response
      mockCategoryService.getCategoryHierarchy.mockResolvedValue({
        success: true,
        hierarchy: mockCategoryHierarchy,
        flatList: mockCategories,
        stats: {
          totalCategories: 2,
          maxDepth: 1,
          rootCategories: 1
        }
      });

      // Mock tag statistics response
      mockTagService.getTagStatistics.mockResolvedValue({
        success: true,
        stats: {
          totalTags: 2,
          activeTags: 2,
          unusedTags: 0,
          mostUsedTags: mockTags,
          averagePostsPerTag: 10
        }
      });

      const result = await service.getCompleteTaxonomyHierarchy({}, 'test-request-id');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.categories.flatList).toHaveLength(2);
      expect(result.data?.categories.hierarchy).toHaveLength(1);
      expect(result.data?.tags.statistics.totalTags).toBe(2);
      expect(result.requestId).toBe('test-request-id');
    });

    it('should handle category fetch failure', async () => {
      mockCategoryService.getCategoryHierarchy.mockResolvedValue({
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Failed to fetch categories' }
      });

      const result = await service.getCompleteTaxonomyHierarchy();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CATEGORY_FETCH_FAILED');
    });

    it('should handle tag statistics fetch failure', async () => {
      mockCategoryService.getCategoryHierarchy.mockResolvedValue({
        success: true,
        hierarchy: mockCategoryHierarchy,
        flatList: mockCategories
      });

      mockTagService.getTagStatistics.mockResolvedValue({
        success: false,
        error: { code: 'STATS_ERROR', message: 'Failed to fetch tag statistics' }
      });

      const result = await service.getCompleteTaxonomyHierarchy();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TAG_FETCH_FAILED');
    });

    it('should use cached data when caching is enabled', async () => {
      const serviceWithCache = new WordPressTaxonomyIntegrationService({
        ...mockConfig,
        enableCaching: true
      });

      const mockCategoryServiceCached = (serviceWithCache as any).categoryService;
      const mockTagServiceCached = (serviceWithCache as any).tagService;

      // Mock successful first call
      mockCategoryServiceCached.getCategoryHierarchy.mockResolvedValue({
        success: true,
        hierarchy: mockCategoryHierarchy,
        flatList: mockCategories
      });

      mockTagServiceCached.getTagStatistics.mockResolvedValue({
        success: true,
        stats: {
          totalTags: 2,
          activeTags: 2,
          unusedTags: 0,
          mostUsedTags: mockTags,
          averagePostsPerTag: 10
        }
      });

      // First call - should hit the API
      const result1 = await serviceWithCache.getCompleteTaxonomyHierarchy();
      expect(result1.success).toBe(true);

      // Second call - should use cache
      const result2 = await serviceWithCache.getCompleteTaxonomyHierarchy();
      expect(result2.success).toBe(true);

      // Should only call the services once (first time)
      expect(mockCategoryServiceCached.getCategoryHierarchy).toHaveBeenCalledTimes(1);
      expect(mockTagServiceCached.getTagStatistics).toHaveBeenCalledTimes(1);
    });
  });

  describe('synchronizeTaxonomy', () => {
    it('should synchronize taxonomy successfully', async () => {
      mockCategoryService.getCategoryHierarchy.mockResolvedValue({
        success: true,
        flatList: [
          { id: 1, name: 'Tech', parent: null },
          { id: 2, name: 'JS', parent: 1 }
        ]
      });

      mockTagService.getTagStatistics.mockResolvedValue({
        success: true,
        stats: { totalTags: 5 }
      });

      const result = await service.synchronizeTaxonomy('test-request-id');

      expect(result.success).toBe(true);
      expect(result.data?.categoriesProcessed).toBe(2);
      expect(result.data?.tagsProcessed).toBe(5);
      expect(result.data?.hierarchyValidated).toBe(true);
      expect(result.requestId).toBe('test-request-id');
    });

    it('should handle hierarchy validation failure', async () => {
      mockCategoryService.getCategoryHierarchy.mockResolvedValue({
        success: true,
        flatList: [
          { id: 1, name: 'Tech', parent: 999 } // Invalid parent
        ]
      });

      mockTagService.getTagStatistics.mockResolvedValue({
        success: true,
        stats: { totalTags: 0 }
      });

      const result = await service.synchronizeTaxonomy();

      expect(result.success).toBe(true);
      expect(result.data?.hierarchyValidated).toBe(false);
    });

    it('should clear cache after synchronization', async () => {
      const serviceWithCache = new WordPressTaxonomyIntegrationService({
        ...mockConfig,
        enableCaching: true
      });

      const mockCategoryServiceCached = (serviceWithCache as any).categoryService;
      const mockTagServiceCached = (serviceWithCache as any).tagService;

      mockCategoryServiceCached.getCategoryHierarchy.mockResolvedValue({
        success: true,
        flatList: []
      });

      mockTagServiceCached.getTagStatistics.mockResolvedValue({
        success: true,
        stats: { totalTags: 0 }
      });

      // Set some cache data first
      (serviceWithCache as any).setCachedData('test', { data: 'test' });

      await serviceWithCache.synchronizeTaxonomy();

      // Cache should be cleared
      const cachedData = (serviceWithCache as any).getCachedData('test');
      expect(cachedData).toBeNull();
    });
  });

  describe('performBulkOperations', () => {
    const mockBulkRequest: TaxonomyBulkOperationRequest = {
      operation: 'create',
      categories: [
        { name: 'Category 1', description: 'First category' },
        { name: 'Category 2', description: 'Second category' }
      ],
      tags: [
        { name: 'Tag 1', description: 'First tag' },
        { name: 'Tag 2', description: 'Second tag' }
      ]
    };

    it('should perform bulk create operations successfully', async () => {
      // Mock successful category creations
      mockCategoryService.createCategory
        .mockResolvedValueOnce({
          success: true,
          data: { id: 1, name: 'Category 1', slug: 'category-1' }
        })
        .mockResolvedValueOnce({
          success: true,
          data: { id: 2, name: 'Category 2', slug: 'category-2' }
        });

      // Mock successful tag creations
      mockTagService.createTag
        .mockResolvedValueOnce({
          success: true,
          data: { id: 1, name: 'Tag 1', slug: 'tag-1' }
        })
        .mockResolvedValueOnce({
          success: true,
          data: { id: 2, name: 'Tag 2', slug: 'tag-2' }
        });

      const result = await service.performBulkOperations(mockBulkRequest, 'test-request-id');

      expect(result.success).toBe(true);
      expect(result.data?.categoriesProcessed).toBe(2);
      expect(result.data?.tagsProcessed).toBe(2);
      expect(result.data?.successfulOperations).toBe(4);
      expect(result.data?.failedOperations).toBe(0);
      expect(result.data?.results).toHaveLength(4);
    });

    it('should handle partial failures in bulk operations', async () => {
      // Mock category creation - first succeeds, second fails
      mockCategoryService.createCategory
        .mockResolvedValueOnce({
          success: true,
          data: { id: 1, name: 'Category 1', slug: 'category-1' }
        })
        .mockResolvedValueOnce({
          success: false,
          error: { message: 'Category creation failed' }
        });

      // Mock tag creation - both succeed
      mockTagService.createTag
        .mockResolvedValueOnce({
          success: true,
          data: { id: 1, name: 'Tag 1', slug: 'tag-1' }
        })
        .mockResolvedValueOnce({
          success: true,
          data: { id: 2, name: 'Tag 2', slug: 'tag-2' }
        });

      const result = await service.performBulkOperations(mockBulkRequest);

      expect(result.success).toBe(true);
      expect(result.data?.successfulOperations).toBe(3);
      expect(result.data?.failedOperations).toBe(1);
      expect(result.data?.results.filter(r => r.success)).toHaveLength(3);
      expect(result.data?.results.filter(r => !r.success)).toHaveLength(1);
    });

    it('should handle bulk delete operations', async () => {
      const deleteRequest: TaxonomyBulkOperationRequest = {
        operation: 'delete',
        categories: [{ id: 1, action: 'delete' }],
        tags: [{ id: 1, action: 'delete' }]
      };

      mockCategoryService.deleteCategory.mockResolvedValue({
        success: true,
        data: { id: 1, name: 'Deleted Category' }
      });

      mockTagService.deleteTag.mockResolvedValue({
        success: true,
        data: { id: 1, name: 'Deleted Tag' }
      });

      const result = await service.performBulkOperations(deleteRequest);

      expect(result.success).toBe(true);
      expect(result.data?.successfulOperations).toBe(2);
      expect(mockCategoryService.deleteCategory).toHaveBeenCalledWith(1, false, undefined);
      expect(mockTagService.deleteTag).toHaveBeenCalledWith(1, false, undefined);
    });

    it('should skip unsupported operations', async () => {
      const updateRequest: TaxonomyBulkOperationRequest = {
        operation: 'update',
        categories: [{ id: 1, action: 'update' }]
      };

      const result = await service.performBulkOperations(updateRequest);

      expect(result.success).toBe(true);
      expect(result.data?.skippedOperations).toBe(1);
      expect(result.data?.results[0].success).toBe(false);
      expect(result.data?.results[0].error).toContain('Update operation not implemented');
    });
  });

  describe('searchTaxonomyTerms', () => {
    const mockSearchOptions: TaxonomySearchOptions = {
      orderBy: 'name',
      order: 'asc',
      perPage: 20,
      filterByUsage: 'used'
    };

    it('should search taxonomy terms successfully', async () => {
      const mockCategories = [
        { id: 1, name: 'JavaScript', slug: 'javascript', count: 10 },
        { id: 2, name: 'Java', slug: 'java', count: 5 }
      ];

      const mockTags = [
        { id: 1, name: 'javascript', slug: 'javascript', count: 8 },
        { id: 2, name: 'java-script', slug: 'java-script', count: 3 }
      ];

      mockCategoryService.getCategoryHierarchy.mockResolvedValue({
        success: true,
        flatList: mockCategories
      });

      mockTagService.getAllTags.mockResolvedValue({
        success: true,
        data: mockTags
      });

      const result = await service.searchTaxonomyTerms('java', mockSearchOptions, 'test-request-id');

      expect(result.success).toBe(true);
      expect(result.data?.searchQuery).toBe('java');
      expect(result.data?.categories).toHaveLength(2);
      expect(result.data?.tags).toHaveLength(2);
      expect(result.data?.totalResults).toBe(4);
    });

    it('should apply usage filters correctly', async () => {
      const mockCategories = [
        { id: 1, name: 'Used Category', slug: 'used', count: 10 },
        { id: 2, name: 'Unused Category', slug: 'unused', count: 0 }
      ];

      const mockTags = [
        { id: 1, name: 'Used Tag', slug: 'used-tag', count: 5 },
        { id: 2, name: 'Unused Tag', slug: 'unused-tag', count: 0 }
      ];

      mockCategoryService.getCategoryHierarchy.mockResolvedValue({
        success: true,
        flatList: mockCategories
      });

      mockTagService.getAllTags.mockResolvedValue({
        success: true,
        data: mockTags
      });

      // Search for only used terms
      const usedResult = await service.searchTaxonomyTerms('', { filterByUsage: 'used' });
      expect(usedResult.data?.categories).toHaveLength(1);
      expect(usedResult.data?.tags).toHaveLength(1);
      expect(usedResult.data?.categories[0].name).toBe('Used Category');
      expect(usedResult.data?.tags[0].name).toBe('Used Tag');

      // Search for only unused terms
      const unusedResult = await service.searchTaxonomyTerms('', { filterByUsage: 'unused' });
      expect(unusedResult.data?.categories).toHaveLength(1);
      expect(unusedResult.data?.tags).toHaveLength(1);
      expect(unusedResult.data?.categories[0].name).toBe('Unused Category');
      expect(unusedResult.data?.tags[0].name).toBe('Unused Tag');
    });

    it('should apply post count filters', async () => {
      const mockCategories = [
        { id: 1, name: 'High Count', slug: 'high', count: 15 },
        { id: 2, name: 'Medium Count', slug: 'medium', count: 8 },
        { id: 3, name: 'Low Count', slug: 'low', count: 2 }
      ];

      mockCategoryService.getCategoryHierarchy.mockResolvedValue({
        success: true,
        flatList: mockCategories
      });

      mockTagService.getAllTags.mockResolvedValue({
        success: true,
        data: []
      });

      const result = await service.searchTaxonomyTerms('', {
        minPostCount: 5,
        maxPostCount: 10
      });

      expect(result.data?.categories).toHaveLength(1);
      expect(result.data?.categories[0].name).toBe('Medium Count');
    });

    it('should exclude specified taxonomy types', async () => {
      mockCategoryService.getCategoryHierarchy.mockResolvedValue({
        success: true,
        flatList: [{ id: 1, name: 'Category', slug: 'category', count: 1 }]
      });

      mockTagService.getAllTags.mockResolvedValue({
        success: true,
        data: [{ id: 1, name: 'Tag', slug: 'tag', count: 1 }]
      });

      // Exclude categories
      const result1 = await service.searchTaxonomyTerms('', { exclude: ['categories'] });
      expect(result1.data?.categories).toHaveLength(0);
      expect(result1.data?.tags).toHaveLength(1);

      // Exclude tags
      const result2 = await service.searchTaxonomyTerms('', { exclude: ['tags'] });
      expect(result2.data?.categories).toHaveLength(1);
      expect(result2.data?.tags).toHaveLength(0);
    });
  });

  describe('getTaxonomyRelationships', () => {
    it('should get category relationships successfully', async () => {
      const mockCategory = {
        id: 1,
        name: 'Technology',
        slug: 'technology',
        description: 'Tech category',
        count: 10
      };

      mockCategoryService.getCategoryById.mockResolvedValue({
        success: true,
        data: mockCategory
      });

      const result = await service.getTaxonomyRelationships('category', 1, 'test-request-id');

      expect(result.success).toBe(true);
      expect(result.data?.term).toEqual(mockCategory);
      expect(result.data?.relationships).toBeDefined();
      expect(result.data?.relationships.posts).toEqual([]);
      expect(result.data?.relationships.relatedTerms).toEqual([]);
      expect(result.data?.relationships.metadata).toEqual({});
    });

    it('should get tag relationships successfully', async () => {
      const mockTag = {
        id: 1,
        name: 'javascript',
        slug: 'javascript',
        description: 'JS tag',
        count: 5
      };

      mockTagService.getTagById.mockResolvedValue({
        success: true,
        data: mockTag
      });

      const result = await service.getTaxonomyRelationships('tag', 1);

      expect(result.success).toBe(true);
      expect(result.data?.term).toEqual(mockTag);
    });

    it('should handle term not found', async () => {
      mockCategoryService.getCategoryById.mockResolvedValue({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Category not found' }
      });

      const result = await service.getTaxonomyRelationships('category', 999);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TERM_NOT_FOUND');
    });
  });

  describe('validateTaxonomyIntegrity', () => {
    it('should validate taxonomy integrity successfully', async () => {
      const mockCategories = [
        { id: 1, name: 'Parent', slug: 'parent', parent: null },
        { id: 2, name: 'Child', slug: 'child', parent: 1 }
      ];

      mockCategoryService.getCategoryHierarchy.mockResolvedValue({
        success: true,
        flatList: mockCategories
      });

      mockTagService.getTagStatistics.mockResolvedValue({
        success: true,
        stats: { totalTags: 5 }
      });

      const result = await service.validateTaxonomyIntegrity('test-request-id');

      expect(result.success).toBe(true);
      expect(result.data?.isValid).toBe(true);
      expect(result.data?.statistics.categoriesChecked).toBe(2);
      expect(result.data?.statistics.tagsChecked).toBe(5);
      expect(result.data?.issues).toHaveLength(0);
    });

    it('should detect hierarchy validation errors', async () => {
      const mockCategories = [
        { id: 1, name: 'Orphan', slug: 'orphan', parent: 999 } // Invalid parent
      ];

      mockCategoryService.getCategoryHierarchy.mockResolvedValue({
        success: true,
        flatList: mockCategories
      });

      mockTagService.getTagStatistics.mockResolvedValue({
        success: true,
        stats: { totalTags: 0 }
      });

      const result = await service.validateTaxonomyIntegrity();

      expect(result.success).toBe(true);
      expect(result.data?.isValid).toBe(false);
      expect(result.data?.issues).toHaveLength(1);
      expect(result.data?.issues[0].type).toBe('error');
      expect(result.data?.issues[0].code).toBe('HIERARCHY_INVALID');
    });

    it('should detect circular references', async () => {
      const mockCategories = [
        { id: 1, name: 'Cat1', slug: 'cat1', parent: 2 },
        { id: 2, name: 'Cat2', slug: 'cat2', parent: 1 } // Circular reference
      ];

      mockCategoryService.getCategoryHierarchy.mockResolvedValue({
        success: true,
        flatList: mockCategories
      });

      mockTagService.getTagStatistics.mockResolvedValue({
        success: true,
        stats: { totalTags: 0 }
      });

      const result = await service.validateTaxonomyIntegrity();

      expect(result.success).toBe(true);
      expect(result.data?.isValid).toBe(false);
      expect(result.data?.issues.some(issue => issue.code === 'CIRCULAR_REFERENCE')).toBe(true);
    });
  });

  describe('service accessors', () => {
    it('should provide access to sub-services', () => {
      expect(service.getCategoryService()).toBe(mockCategoryService);
      expect(service.getTagService()).toBe(mockTagService);
      expect(service.getPostTaxonomyService()).toBe(mockPostTaxonomyService);
    });
  });

  describe('createWordPressTaxonomyIntegrationService', () => {
    it('should create service instance with config', () => {
      const service = createWordPressTaxonomyIntegrationService(mockConfig);
      expect(service).toBeInstanceOf(WordPressTaxonomyIntegrationService);
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors in getCompleteTaxonomyHierarchy', async () => {
      mockCategoryService.getCategoryHierarchy.mockRejectedValue(new Error('Network error'));

      const result = await service.getCompleteTaxonomyHierarchy();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('HIERARCHY_FETCH_ERROR');
    });

    it('should handle unexpected errors in synchronizeTaxonomy', async () => {
      mockCategoryService.getCategoryHierarchy.mockRejectedValue(new Error('Database error'));

      const result = await service.synchronizeTaxonomy();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SYNC_ERROR');
    });

    it('should handle unexpected errors in performBulkOperations', async () => {
      const mockRequest: TaxonomyBulkOperationRequest = {
        operation: 'create',
        categories: [{ name: 'Test Category' }]
      };

      mockCategoryService.createCategory.mockRejectedValue(new Error('API error'));

      const result = await service.performBulkOperations(mockRequest);

      expect(result.success).toBe(true); // Bulk operations handle individual failures
      expect(result.data?.failedOperations).toBe(1);
    });

    it('should handle unexpected errors in searchTaxonomyTerms', async () => {
      mockCategoryService.getCategoryHierarchy.mockRejectedValue(new Error('Search error'));

      const result = await service.searchTaxonomyTerms('test');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SEARCH_ERROR');
    });

    it('should handle unexpected errors in getTaxonomyRelationships', async () => {
      mockCategoryService.getCategoryById.mockRejectedValue(new Error('Fetch error'));

      const result = await service.getTaxonomyRelationships('category', 1);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RELATIONSHIP_FETCH_ERROR');
    });

    it('should handle unexpected errors in validateTaxonomyIntegrity', async () => {
      mockCategoryService.getCategoryHierarchy.mockRejectedValue(new Error('Validation error'));

      const result = await service.validateTaxonomyIntegrity();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('caching functionality', () => {
    let serviceWithCache: WordPressTaxonomyIntegrationService;

    beforeEach(() => {
      serviceWithCache = new WordPressTaxonomyIntegrationService({
        ...mockConfig,
        enableCaching: true,
        cacheTimeout: 1000 // 1 second for testing
      });
    });

    it('should cache and retrieve data correctly', () => {
      const testData = { test: 'data' };
      
      // Set cache data
      (serviceWithCache as any).setCachedData('test-key', testData);
      
      // Retrieve cache data
      const cachedData = (serviceWithCache as any).getCachedData('test-key');
      expect(cachedData).toEqual(testData);
    });

    it('should expire cached data after timeout', async () => {
      const testData = { test: 'data' };
      
      // Set cache data
      (serviceWithCache as any).setCachedData('test-key', testData);
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Retrieve expired cache data
      const cachedData = (serviceWithCache as any).getCachedData('test-key');
      expect(cachedData).toBeNull();
    });

    it('should clear all cache data', () => {
      // Set multiple cache entries
      (serviceWithCache as any).setCachedData('key1', { data: 1 });
      (serviceWithCache as any).setCachedData('key2', { data: 2 });
      
      // Clear cache
      (serviceWithCache as any).clearCache();
      
      // Verify cache is empty
      expect((serviceWithCache as any).getCachedData('key1')).toBeNull();
      expect((serviceWithCache as any).getCachedData('key2')).toBeNull();
    });

    it('should not cache when caching is disabled', () => {
      const serviceWithoutCache = new WordPressTaxonomyIntegrationService({
        ...mockConfig,
        enableCaching: false
      });

      const testData = { test: 'data' };
      
      // Try to set cache data
      (serviceWithoutCache as any).setCachedData('test-key', testData);
      
      // Should return null since caching is disabled
      const cachedData = (serviceWithoutCache as any).getCachedData('test-key');
      expect(cachedData).toBeNull();
    });
  });
});
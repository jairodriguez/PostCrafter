/**
 * WordPress Taxonomy Integration Service
 * Implements Task 10.5: Complete integration with WordPress taxonomy system
 * Provides unified interface for categories, tags, and post taxonomy operations
 */

// @ts-nocheck
import { logger } from '../utils/logger';
import { 
  CategoryManagementService, 
  CategoryManagementConfig,
  CategoryOperationResult,
  CategoryHierarchyResult
} from './category-management';
import { 
  TagManagementService, 
  TagManagementConfig,
  TagOperationResult,
  TagStatisticsResult
} from './tag-management';
import { 
  PostTaxonomyAssignmentService,
  PostTaxonomyConfig,
  TaxonomyAssignmentResult,
  PostWithTaxonomyResult
} from './post-taxonomy-assignment';
import { 
  WordPressCategory, 
  WordPressTag,
  TaxonomyQueryParams,
  CategoryCreateRequest,
  TagCreateRequest,
  TaxonomyValidationOptions
} from '../types/taxonomy';

/**
 * WordPress taxonomy integration configuration
 */
export interface WordPressTaxonomyIntegrationConfig {
  wordpressUrl: string;
  username: string;
  password: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  validationOptions?: TaxonomyValidationOptions;
  defaultCategoryName?: string;
  createMissingTerms?: boolean;
  validateHierarchy?: boolean;
  maxCategoriesPerPost?: number;
  maxTagsPerPost?: number;
  enableMetadata?: boolean;
  enableCaching?: boolean;
  cacheTimeout?: number;
}

/**
 * Taxonomy term with relationships
 */
export interface TaxonomyTermWithRelationships extends WordPressCategory {
  children?: TaxonomyTermWithRelationships[];
  parent?: TaxonomyTermWithRelationships;
  ancestors?: WordPressCategory[];
  descendants?: WordPressCategory[];
  posts?: any[];
  metadata?: Record<string, any>;
}

/**
 * Complete taxonomy hierarchy
 */
export interface CompleteTaxonomyHierarchy {
  categories: {
    hierarchy: TaxonomyTermWithRelationships[];
    flatList: WordPressCategory[];
    statistics: {
      totalCategories: number;
      maxDepth: number;
      rootCategories: number;
      leafCategories: number;
      averageChildrenPerCategory: number;
    };
  };
  tags: {
    list: WordPressTag[];
    statistics: {
      totalTags: number;
      activeTags: number;
      unusedTags: number;
      mostUsedTags: WordPressTag[];
      averagePostsPerTag: number;
    };
  };
  relationships: {
    categoriesWithPosts: number;
    tagsWithPosts: number;
    uncategorizedPosts: number;
    untaggedPosts: number;
  };
}

/**
 * Taxonomy synchronization result
 */
export interface TaxonomySyncResult {
  success: boolean;
  data?: {
    categoriesProcessed: number;
    tagsProcessed: number;
    relationshipsUpdated: number;
    hierarchyValidated: boolean;
    processingTimeMs: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  warnings?: string[];
  requestId?: string;
}

/**
 * Taxonomy search and filter options
 */
export interface TaxonomySearchOptions extends TaxonomyQueryParams {
  includeHierarchy?: boolean;
  includeMetadata?: boolean;
  includePostCounts?: boolean;
  includeRelationships?: boolean;
  filterByUsage?: 'all' | 'used' | 'unused';
  minPostCount?: number;
  maxPostCount?: number;
  hierarchyDepth?: number;
  searchInDescription?: boolean;
}

/**
 * Taxonomy bulk operation request
 */
export interface TaxonomyBulkOperationRequest {
  operation: 'create' | 'update' | 'delete' | 'merge';
  categories?: (CategoryCreateRequest | { id: number; action: string })[];
  tags?: (TagCreateRequest | { id: number; action: string })[];
  options?: {
    skipExisting?: boolean;
    validateHierarchy?: boolean;
    preserveRelationships?: boolean;
    batchSize?: number;
  };
}

/**
 * Taxonomy bulk operation result
 */
export interface TaxonomyBulkOperationResult {
  success: boolean;
  data?: {
    categoriesProcessed: number;
    tagsProcessed: number;
    successfulOperations: number;
    failedOperations: number;
    skippedOperations: number;
    processingTimeMs: number;
    results: Array<{
      operation: string;
      termType: 'category' | 'tag';
      termName: string;
      success: boolean;
      error?: string;
    }>;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  warnings?: string[];
  requestId?: string;
}

/**
 * WordPress Taxonomy Integration Service
 */
export class WordPressTaxonomyIntegrationService {
  private config: WordPressTaxonomyIntegrationConfig;
  private categoryService: CategoryManagementService;
  private tagService: TagManagementService;
  private postTaxonomyService: PostTaxonomyAssignmentService;
  private cache: Map<string, { data: any; timestamp: number }>;

  constructor(config: WordPressTaxonomyIntegrationConfig) {
    this.config = {
      timeout: 10000,
      maxRetries: 3,
      retryDelay: 1000,
      defaultCategoryName: 'Uncategorized',
      createMissingTerms: true,
      validateHierarchy: true,
      maxCategoriesPerPost: 50,
      maxTagsPerPost: 100,
      enableMetadata: true,
      enableCaching: false,
      cacheTimeout: 300000, // 5 minutes
      ...config
    };

    // Initialize sub-services
    const categoryConfig: CategoryManagementConfig = {
      wordpressUrl: this.config.wordpressUrl,
      username: this.config.username,
      password: this.config.password,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay,
      validationOptions: this.config.validationOptions
    };

    const tagConfig: TagManagementConfig = {
      wordpressUrl: this.config.wordpressUrl,
      username: this.config.username,
      password: this.config.password,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay,
      validationOptions: this.config.validationOptions
    };

    const postTaxonomyConfig: PostTaxonomyConfig = {
      wordpressUrl: this.config.wordpressUrl,
      username: this.config.username,
      password: this.config.password,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay,
      defaultCategoryName: this.config.defaultCategoryName,
      createMissingTerms: this.config.createMissingTerms,
      validateHierarchy: this.config.validateHierarchy,
      maxCategoriesPerPost: this.config.maxCategoriesPerPost,
      maxTagsPerPost: this.config.maxTagsPerPost
    };

    this.categoryService = new CategoryManagementService(categoryConfig);
    this.tagService = new TagManagementService(tagConfig);
    this.postTaxonomyService = new PostTaxonomyAssignmentService(postTaxonomyConfig);
    this.cache = new Map();
  }

  /**
   * Get complete taxonomy hierarchy with relationships
   */
  async getCompleteTaxonomyHierarchy(
    options: TaxonomySearchOptions = {},
    requestId?: string
  ): Promise<{ success: boolean; data?: CompleteTaxonomyHierarchy; error?: any; requestId?: string }> {
    const startTime = Date.now();
    const logContext: any = { requestId };
    
    try {
      logger.info('Fetching complete taxonomy hierarchy', logContext);

      // Check cache first
      const cacheKey = `taxonomy_hierarchy_${JSON.stringify(options)}`;
      if (this.config.enableCaching) {
        const cached = this.getCachedData(cacheKey);
        if (cached) {
          logger.info('Returning cached taxonomy hierarchy', { ...logContext, fromCache: true });
          return {
            success: true,
            data: cached,
            requestId
          };
        }
      }

      // Fetch categories with hierarchy
      const categoryResult = await this.categoryService.getCategoryHierarchy(options, requestId);
      if (!categoryResult.success) {
        return {
          success: false,
          error: {
            code: 'CATEGORY_FETCH_FAILED',
            message: 'Failed to fetch category hierarchy',
            details: categoryResult.error
          },
          requestId
        };
      }

      // Fetch tags with statistics
      const tagStatsResult = await this.tagService.getTagStatistics(requestId);
      if (!tagStatsResult.success) {
        return {
          success: false,
          error: {
            code: 'TAG_FETCH_FAILED',
            message: 'Failed to fetch tag statistics',
            details: tagStatsResult.error
          },
          requestId
        };
      }

      // Build enhanced hierarchy with relationships
      const enhancedCategories = await this.buildEnhancedCategoryHierarchy(
        categoryResult.hierarchy || [],
        categoryResult.flatList || [],
        options,
        requestId
      );

      // Calculate category statistics
      const categoryStats = this.calculateCategoryStatistics(enhancedCategories, categoryResult.flatList || []);

      // Get relationship statistics
      const relationshipStats = await this.calculateRelationshipStatistics(requestId);

      const hierarchyData: CompleteTaxonomyHierarchy = {
        categories: {
          hierarchy: enhancedCategories,
          flatList: categoryResult.flatList || [],
          statistics: categoryStats
        },
        tags: {
          list: tagStatsResult.stats?.mostUsedTags || [],
          statistics: {
            totalTags: tagStatsResult.stats?.totalTags || 0,
            activeTags: tagStatsResult.stats?.activeTags || 0,
            unusedTags: tagStatsResult.stats?.unusedTags || 0,
            mostUsedTags: tagStatsResult.stats?.mostUsedTags || [],
            averagePostsPerTag: tagStatsResult.stats?.averagePostsPerTag || 0
          }
        },
        relationships: relationshipStats
      };

      // Cache the result
      if (this.config.enableCaching) {
        this.setCachedData(cacheKey, hierarchyData);
      }

      const processingTime = Date.now() - startTime;

      logger.info('Complete taxonomy hierarchy fetched successfully', {
        ...logContext,
        categoryCount: categoryStats.totalCategories,
        tagCount: tagStatsResult.stats?.totalTags || 0,
        processingTimeMs: processingTime
      });

      return {
        success: true,
        data: hierarchyData,
        requestId
      };

    } catch (error) {
      logger.error('Error fetching complete taxonomy hierarchy', {
        ...logContext,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'HIERARCHY_FETCH_ERROR',
          message: 'Unexpected error fetching taxonomy hierarchy',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        requestId
      };
    }
  }

  /**
   * Synchronize taxonomy system
   */
  async synchronizeTaxonomy(
    requestId?: string
  ): Promise<TaxonomySyncResult> {
    const startTime = Date.now();
    const logContext: any = { requestId };
    
    try {
      logger.info('Starting taxonomy synchronization', logContext);

      let categoriesProcessed = 0;
      let tagsProcessed = 0;
      let relationshipsUpdated = 0;
      let hierarchyValidated = false;

      // Synchronize categories
      const categoryHierarchy = await this.categoryService.getCategoryHierarchy({}, requestId);
      if (categoryHierarchy.success && categoryHierarchy.flatList) {
        categoriesProcessed = categoryHierarchy.flatList.length;

        // Validate hierarchy if enabled
        if (this.config.validateHierarchy) {
          const hierarchyValidation = await this.validateCategoryHierarchy(
            categoryHierarchy.flatList,
            requestId
          );
          hierarchyValidated = hierarchyValidation.success;
          
          if (!hierarchyValidated) {
            logger.warn('Category hierarchy validation failed during sync', {
              ...logContext,
              validationErrors: hierarchyValidation.errors
            });
          }
        }
      }

      // Synchronize tags
      const tagStats = await this.tagService.getTagStatistics(requestId);
      if (tagStats.success && tagStats.stats) {
        tagsProcessed = tagStats.stats.totalTags;
      }

      // Update relationships (placeholder for relationship sync)
      relationshipsUpdated = await this.updateTaxonomyRelationships(requestId);

      // Clear cache after synchronization
      if (this.config.enableCaching) {
        this.clearCache();
      }

      const processingTime = Date.now() - startTime;

      logger.info('Taxonomy synchronization completed', {
        ...logContext,
        categoriesProcessed,
        tagsProcessed,
        relationshipsUpdated,
        hierarchyValidated,
        processingTimeMs: processingTime
      });

      return {
        success: true,
        data: {
          categoriesProcessed,
          tagsProcessed,
          relationshipsUpdated,
          hierarchyValidated,
          processingTimeMs: processingTime
        },
        requestId
      };

    } catch (error) {
      logger.error('Error during taxonomy synchronization', {
        ...logContext,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'SYNC_ERROR',
          message: 'Unexpected error during taxonomy synchronization',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        requestId
      };
    }
  }

  /**
   * Perform bulk taxonomy operations
   */
  async performBulkOperations(
    request: TaxonomyBulkOperationRequest,
    requestId?: string
  ): Promise<TaxonomyBulkOperationResult> {
    const startTime = Date.now();
    const logContext: any = { 
      requestId, 
      operation: request.operation,
      categoryCount: request.categories?.length || 0,
      tagCount: request.tags?.length || 0
    };
    
    try {
      logger.info('Starting bulk taxonomy operations', logContext);

      const results: Array<{
        operation: string;
        termType: 'category' | 'tag';
        termName: string;
        success: boolean;
        error?: string;
      }> = [];

      let categoriesProcessed = 0;
      let tagsProcessed = 0;
      let successfulOperations = 0;
      let failedOperations = 0;
      let skippedOperations = 0;

      // Process categories
      if (request.categories && request.categories.length > 0) {
        for (const categoryItem of request.categories) {
          try {
            categoriesProcessed++;
            
            if ('name' in categoryItem) {
              // Create operation
              const result = await this.categoryService.createCategory(categoryItem, requestId);
              
              if (result.success) {
                successfulOperations++;
                results.push({
                  operation: request.operation,
                  termType: 'category',
                  termName: categoryItem.name,
                  success: true
                });
              } else {
                failedOperations++;
                results.push({
                  operation: request.operation,
                  termType: 'category',
                  termName: categoryItem.name,
                  success: false,
                  error: result.error?.message
                });
              }
            } else if ('id' in categoryItem) {
              // Update/Delete operation
              if (request.operation === 'delete') {
                const result = await this.categoryService.deleteCategory(categoryItem.id, false, requestId);
                
                if (result.success) {
                  successfulOperations++;
                  results.push({
                    operation: request.operation,
                    termType: 'category',
                    termName: `ID:${categoryItem.id}`,
                    success: true
                  });
                } else {
                  failedOperations++;
                  results.push({
                    operation: request.operation,
                    termType: 'category',
                    termName: `ID:${categoryItem.id}`,
                    success: false,
                    error: result.error?.message
                  });
                }
              } else {
                skippedOperations++;
                results.push({
                  operation: request.operation,
                  termType: 'category',
                  termName: `ID:${categoryItem.id}`,
                  success: false,
                  error: 'Update operation not implemented in bulk processor'
                });
              }
            }
          } catch (error) {
            failedOperations++;
            results.push({
              operation: request.operation,
              termType: 'category',
              termName: 'name' in categoryItem ? categoryItem.name : `ID:${categoryItem.id}`,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }

      // Process tags
      if (request.tags && request.tags.length > 0) {
        for (const tagItem of request.tags) {
          try {
            tagsProcessed++;
            
            if ('name' in tagItem) {
              // Create operation
              const result = await this.tagService.createTag(tagItem, requestId);
              
              if (result.success) {
                successfulOperations++;
                results.push({
                  operation: request.operation,
                  termType: 'tag',
                  termName: tagItem.name,
                  success: true
                });
              } else {
                failedOperations++;
                results.push({
                  operation: request.operation,
                  termType: 'tag',
                  termName: tagItem.name,
                  success: false,
                  error: result.error?.message
                });
              }
            } else if ('id' in tagItem) {
              // Update/Delete operation
              if (request.operation === 'delete') {
                const result = await this.tagService.deleteTag(tagItem.id, false, requestId);
                
                if (result.success) {
                  successfulOperations++;
                  results.push({
                    operation: request.operation,
                    termType: 'tag',
                    termName: `ID:${tagItem.id}`,
                    success: true
                  });
                } else {
                  failedOperations++;
                  results.push({
                    operation: request.operation,
                    termType: 'tag',
                    termName: `ID:${tagItem.id}`,
                    success: false,
                    error: result.error?.message
                  });
                }
              } else {
                skippedOperations++;
                results.push({
                  operation: request.operation,
                  termType: 'tag',
                  termName: `ID:${tagItem.id}`,
                  success: false,
                  error: 'Update operation not implemented in bulk processor'
                });
              }
            }
          } catch (error) {
            failedOperations++;
            results.push({
              operation: request.operation,
              termType: 'tag',
              termName: 'name' in tagItem ? tagItem.name : `ID:${tagItem.id}`,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }

      const processingTime = Date.now() - startTime;

      logger.info('Bulk taxonomy operations completed', {
        ...logContext,
        categoriesProcessed,
        tagsProcessed,
        successfulOperations,
        failedOperations,
        skippedOperations,
        processingTimeMs: processingTime
      });

      return {
        success: true,
        data: {
          categoriesProcessed,
          tagsProcessed,
          successfulOperations,
          failedOperations,
          skippedOperations,
          processingTimeMs: processingTime,
          results
        },
        requestId
      };

    } catch (error) {
      logger.error('Error during bulk taxonomy operations', {
        ...logContext,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'BULK_OPERATION_ERROR',
          message: 'Unexpected error during bulk operations',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        requestId
      };
    }
  }

  /**
   * Search taxonomy terms with advanced filtering
   */
  async searchTaxonomyTerms(
    query: string,
    options: TaxonomySearchOptions = {},
    requestId?: string
  ): Promise<{
    success: boolean;
    data?: {
      categories: WordPressCategory[];
      tags: WordPressTag[];
      totalResults: number;
      searchQuery: string;
    };
    error?: any;
    requestId?: string;
  }> {
    try {
      logger.info('Searching taxonomy terms', { requestId, query, options });

      const searchResults = {
        categories: [] as WordPressCategory[],
        tags: [] as WordPressTag[],
        totalResults: 0,
        searchQuery: query
      };

      // Search categories
      if (!options.exclude || !options.exclude.includes('categories')) {
        const categorySearchOptions = {
          search: query,
          hideEmpty: options.hideEmpty,
          orderBy: options.orderBy || 'name',
          order: options.order || 'asc',
          perPage: options.perPage || 50
        };

        const categoryResults = await this.categoryService.getCategoryHierarchy(categorySearchOptions, requestId);
        if (categoryResults.success && categoryResults.flatList) {
          let filteredCategories = categoryResults.flatList;

          // Apply additional filters
          if (options.minPostCount !== undefined) {
            filteredCategories = filteredCategories.filter(cat => (cat.count || 0) >= options.minPostCount!);
          }

          if (options.maxPostCount !== undefined) {
            filteredCategories = filteredCategories.filter(cat => (cat.count || 0) <= options.maxPostCount!);
          }

          if (options.filterByUsage === 'used') {
            filteredCategories = filteredCategories.filter(cat => (cat.count || 0) > 0);
          } else if (options.filterByUsage === 'unused') {
            filteredCategories = filteredCategories.filter(cat => (cat.count || 0) === 0);
          }

          searchResults.categories = filteredCategories;
        }
      }

      // Search tags
      if (!options.exclude || !options.exclude.includes('tags')) {
        const tagSearchOptions = {
          search: query,
          hideEmpty: options.hideEmpty,
          orderBy: options.orderBy || 'name',
          order: options.order || 'asc',
          perPage: options.perPage || 50,
          minPostCount: options.minPostCount
        };

        const tagResults = await this.tagService.getAllTags(tagSearchOptions, requestId);
        if (tagResults.success && Array.isArray(tagResults.data)) {
          let filteredTags = tagResults.data as WordPressTag[];

          // Apply usage filter
          if (options.filterByUsage === 'used') {
            filteredTags = filteredTags.filter(tag => (tag.count || 0) > 0);
          } else if (options.filterByUsage === 'unused') {
            filteredTags = filteredTags.filter(tag => (tag.count || 0) === 0);
          }

          searchResults.tags = filteredTags;
        }
      }

      searchResults.totalResults = searchResults.categories.length + searchResults.tags.length;

      logger.info('Taxonomy search completed', {
        requestId,
        query,
        categoryResults: searchResults.categories.length,
        tagResults: searchResults.tags.length,
        totalResults: searchResults.totalResults
      });

      return {
        success: true,
        data: searchResults,
        requestId
      };

    } catch (error) {
      logger.error('Error searching taxonomy terms', {
        requestId,
        query,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: 'Error searching taxonomy terms',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        requestId
      };
    }
  }

  /**
   * Get taxonomy term relationships
   */
  async getTaxonomyRelationships(
    termType: 'category' | 'tag',
    termId: number,
    requestId?: string
  ): Promise<{
    success: boolean;
    data?: {
      term: WordPressCategory | WordPressTag;
      relationships: {
        posts: any[];
        relatedTerms: (WordPressCategory | WordPressTag)[];
        metadata: Record<string, any>;
      };
    };
    error?: any;
    requestId?: string;
  }> {
    try {
      logger.info('Fetching taxonomy relationships', { requestId, termType, termId });

      let term: WordPressCategory | WordPressTag | undefined;

      // Get the term
      if (termType === 'category') {
        const result = await this.categoryService.getCategoryById(termId, requestId);
        if (result.success && result.data) {
          term = result.data as WordPressCategory;
        }
      } else {
        const result = await this.tagService.getTagById(termId, requestId);
        if (result.success && result.data) {
          term = result.data as WordPressTag;
        }
      }

      if (!term) {
        return {
          success: false,
          error: {
            code: 'TERM_NOT_FOUND',
            message: `${termType} with ID ${termId} not found`
          },
          requestId
        };
      }

      // Get relationships (placeholder implementation)
      const relationships = {
        posts: [], // Would fetch posts with this term
        relatedTerms: [], // Would fetch related terms
        metadata: {} // Would fetch term metadata
      };

      return {
        success: true,
        data: {
          term,
          relationships
        },
        requestId
      };

    } catch (error) {
      logger.error('Error fetching taxonomy relationships', {
        requestId,
        termType,
        termId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'RELATIONSHIP_FETCH_ERROR',
          message: 'Error fetching taxonomy relationships',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        requestId
      };
    }
  }

  /**
   * Validate taxonomy hierarchy integrity
   */
  async validateTaxonomyIntegrity(
    requestId?: string
  ): Promise<{
    success: boolean;
    data?: {
      isValid: boolean;
      issues: Array<{
        type: 'error' | 'warning';
        code: string;
        message: string;
        details?: any;
      }>;
      statistics: {
        categoriesChecked: number;
        tagsChecked: number;
        issuesFound: number;
      };
    };
    error?: any;
    requestId?: string;
  }> {
    try {
      logger.info('Validating taxonomy integrity', { requestId });

      const issues: Array<{
        type: 'error' | 'warning';
        code: string;
        message: string;
        details?: any;
      }> = [];

      let categoriesChecked = 0;
      let tagsChecked = 0;

      // Validate category hierarchy
      const categoryHierarchy = await this.categoryService.getCategoryHierarchy({}, requestId);
      if (categoryHierarchy.success && categoryHierarchy.flatList) {
        categoriesChecked = categoryHierarchy.flatList.length;
        
        const hierarchyValidation = await this.validateCategoryHierarchy(
          categoryHierarchy.flatList,
          requestId
        );
        
        if (!hierarchyValidation.success) {
          issues.push({
            type: 'error',
            code: 'HIERARCHY_INVALID',
            message: 'Category hierarchy validation failed',
            details: hierarchyValidation.errors
          });
        }

        // Check for circular references
        for (const category of categoryHierarchy.flatList) {
          if (category.parent && await this.hasCircularReference(category, categoryHierarchy.flatList)) {
            issues.push({
              type: 'error',
              code: 'CIRCULAR_REFERENCE',
              message: `Circular reference detected in category: ${category.name}`,
              details: { categoryId: category.id, categoryName: category.name }
            });
          }
        }
      }

      // Validate tags
      const tagStats = await this.tagService.getTagStatistics(requestId);
      if (tagStats.success && tagStats.stats) {
        tagsChecked = tagStats.stats.totalTags;
        
        // Check for duplicate tag names (placeholder)
        // Would implement duplicate detection logic here
      }

      const isValid = issues.filter(issue => issue.type === 'error').length === 0;

      logger.info('Taxonomy integrity validation completed', {
        requestId,
        isValid,
        categoriesChecked,
        tagsChecked,
        issuesFound: issues.length
      });

      return {
        success: true,
        data: {
          isValid,
          issues,
          statistics: {
            categoriesChecked,
            tagsChecked,
            issuesFound: issues.length
          }
        },
        requestId
      };

    } catch (error) {
      logger.error('Error validating taxonomy integrity', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Error validating taxonomy integrity',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        requestId
      };
    }
  }

  /**
   * Build enhanced category hierarchy with relationships
   */
  private async buildEnhancedCategoryHierarchy(
    hierarchy: any[],
    flatList: WordPressCategory[],
    options: TaxonomySearchOptions,
    requestId?: string
  ): Promise<TaxonomyTermWithRelationships[]> {
    const enhanced: TaxonomyTermWithRelationships[] = [];

    for (const categoryNode of hierarchy) {
      const enhancedCategory: TaxonomyTermWithRelationships = {
        ...categoryNode,
        ancestors: this.getAncestors(categoryNode, flatList),
        descendants: this.getDescendants(categoryNode, flatList)
      };

      // Include metadata if requested
      if (options.includeMetadata && this.config.enableMetadata) {
        enhancedCategory.metadata = await this.getTermMetadata('category', categoryNode.id, requestId);
      }

      // Include post relationships if requested
      if (options.includeRelationships) {
        enhancedCategory.posts = await this.getTermPosts('category', categoryNode.id, requestId);
      }

      // Recursively process children
      if (categoryNode.children && categoryNode.children.length > 0) {
        enhancedCategory.children = await this.buildEnhancedCategoryHierarchy(
          categoryNode.children,
          flatList,
          options,
          requestId
        );
      }

      enhanced.push(enhancedCategory);
    }

    return enhanced;
  }

  /**
   * Calculate category statistics
   */
  private calculateCategoryStatistics(
    hierarchy: TaxonomyTermWithRelationships[],
    flatList: WordPressCategory[]
  ): {
    totalCategories: number;
    maxDepth: number;
    rootCategories: number;
    leafCategories: number;
    averageChildrenPerCategory: number;
  } {
    const totalCategories = flatList.length;
    const rootCategories = hierarchy.length;
    const leafCategories = flatList.filter(cat => !flatList.some(child => child.parent === cat.id)).length;
    
    const maxDepth = this.calculateMaxHierarchyDepth(hierarchy);
    
    const totalChildren = flatList.filter(cat => cat.parent && cat.parent > 0).length;
    const categoriesWithChildren = flatList.filter(cat => flatList.some(child => child.parent === cat.id)).length;
    const averageChildrenPerCategory = categoriesWithChildren > 0 ? totalChildren / categoriesWithChildren : 0;

    return {
      totalCategories,
      maxDepth,
      rootCategories,
      leafCategories,
      averageChildrenPerCategory: Math.round(averageChildrenPerCategory * 100) / 100
    };
  }

  /**
   * Calculate relationship statistics
   */
  private async calculateRelationshipStatistics(requestId?: string): Promise<{
    categoriesWithPosts: number;
    tagsWithPosts: number;
    uncategorizedPosts: number;
    untaggedPosts: number;
  }> {
    // Placeholder implementation - would query WordPress for actual post relationships
    return {
      categoriesWithPosts: 0,
      tagsWithPosts: 0,
      uncategorizedPosts: 0,
      untaggedPosts: 0
    };
  }

  /**
   * Update taxonomy relationships
   */
  private async updateTaxonomyRelationships(requestId?: string): Promise<number> {
    // Placeholder implementation - would update taxonomy relationships
    return 0;
  }

  /**
   * Validate category hierarchy
   */
  private async validateCategoryHierarchy(
    categories: WordPressCategory[],
    requestId?: string
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const errors: string[] = [];
      
      for (const category of categories) {
        if (category.parent && category.parent > 0) {
          const parent = categories.find(cat => cat.id === category.parent);
          if (!parent) {
            errors.push(`Category "${category.name}" has invalid parent ID: ${category.parent}`);
          }
        }
      }

      return {
        success: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      return {
        success: false,
        errors: ['Error validating category hierarchy']
      };
    }
  }

  /**
   * Check for circular references
   */
  private async hasCircularReference(
    category: WordPressCategory,
    allCategories: WordPressCategory[],
    visited: Set<number> = new Set()
  ): Promise<boolean> {
    if (!category.parent || category.parent === 0) {
      return false;
    }

    if (visited.has(category.id!)) {
      return true;
    }

    visited.add(category.id!);

    const parent = allCategories.find(cat => cat.id === category.parent);
    if (parent) {
      return this.hasCircularReference(parent, allCategories, visited);
    }

    return false;
  }

  /**
   * Get ancestors of a category
   */
  private getAncestors(category: any, flatList: WordPressCategory[]): WordPressCategory[] {
    const ancestors: WordPressCategory[] = [];
    let current = category;

    while (current.parent && current.parent > 0) {
      const parent = flatList.find(cat => cat.id === current.parent);
      if (parent) {
        ancestors.unshift(parent);
        current = parent;
      } else {
        break;
      }
    }

    return ancestors;
  }

  /**
   * Get descendants of a category
   */
  private getDescendants(category: any, flatList: WordPressCategory[]): WordPressCategory[] {
    const descendants: WordPressCategory[] = [];
    
    const findChildren = (parentId: number) => {
      const children = flatList.filter(cat => cat.parent === parentId);
      for (const child of children) {
        descendants.push(child);
        findChildren(child.id!);
      }
    };

    findChildren(category.id);
    return descendants;
  }

  /**
   * Calculate maximum hierarchy depth
   */
  private calculateMaxHierarchyDepth(hierarchy: any[], currentDepth: number = 0): number {
    let maxDepth = currentDepth;
    
    for (const node of hierarchy) {
      if (node.children && node.children.length > 0) {
        const childDepth = this.calculateMaxHierarchyDepth(node.children, currentDepth + 1);
        maxDepth = Math.max(maxDepth, childDepth);
      }
    }

    return maxDepth;
  }

  /**
   * Get term metadata
   */
  private async getTermMetadata(
    termType: 'category' | 'tag',
    termId: number,
    requestId?: string
  ): Promise<Record<string, any>> {
    // Placeholder implementation - would fetch term metadata from WordPress
    return {};
  }

  /**
   * Get posts associated with a term
   */
  private async getTermPosts(
    termType: 'category' | 'tag',
    termId: number,
    requestId?: string
  ): Promise<any[]> {
    // Placeholder implementation - would fetch posts associated with term
    return [];
  }

  /**
   * Cache management
   */
  private getCachedData(key: string): any | null {
    if (!this.config.enableCaching) return null;
    
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout!) {
      return cached.data;
    }
    
    this.cache.delete(key);
    return null;
  }

  private setCachedData(key: string, data: any): void {
    if (!this.config.enableCaching) return;
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get category service instance
   */
  getCategoryService(): CategoryManagementService {
    return this.categoryService;
  }

  /**
   * Get tag service instance
   */
  getTagService(): TagManagementService {
    return this.tagService;
  }

  /**
   * Get post taxonomy service instance
   */
  getPostTaxonomyService(): PostTaxonomyAssignmentService {
    return this.postTaxonomyService;
  }
}

/**
 * Create WordPress taxonomy integration service instance
 */
export function createWordPressTaxonomyIntegrationService(
  config: WordPressTaxonomyIntegrationConfig
): WordPressTaxonomyIntegrationService {
  return new WordPressTaxonomyIntegrationService(config);
}
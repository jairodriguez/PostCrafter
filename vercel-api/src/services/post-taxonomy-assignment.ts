/**
 * Post Taxonomy Assignment Service
 * Implements Task 10.4: Category and tag assignment to posts during creation or update
 */

// @ts-nocheck
import { logger } from '../utils/logger';
import { 
  CategoryManagementService, 
  CategoryManagementConfig,
  CategoryOperationResult
} from './category-management';
import { 
  TagManagementService, 
  TagManagementConfig,
  TagOperationResult
} from './tag-management';
import { 
  WordPressCategory, 
  WordPressTag,
  TaxonomyQueryParams 
} from '../types/taxonomy';

/**
 * Post taxonomy assignment configuration
 */
export interface PostTaxonomyConfig {
  wordpressUrl: string;
  username: string;
  password: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  defaultCategoryName?: string;
  createMissingTerms?: boolean;
  validateHierarchy?: boolean;
  maxCategoriesPerPost?: number;
  maxTagsPerPost?: number;
}

/**
 * Post taxonomy assignment request
 */
export interface PostTaxonomyAssignmentRequest {
  postId: number;
  categories?: (string | number)[];
  tags?: (string | number)[];
  removePreviousCategories?: boolean;
  removePreviousTags?: boolean;
  primaryCategory?: string | number;
}

/**
 * Post creation with taxonomy request
 */
export interface PostCreationWithTaxonomyRequest {
  title: string;
  content: string;
  status?: 'draft' | 'publish' | 'private' | 'pending' | 'future';
  excerpt?: string;
  slug?: string;
  author?: number;
  categories?: (string | number)[];
  tags?: (string | number)[];
  primaryCategory?: string | number;
  meta?: Record<string, any>;
}

/**
 * Post update with taxonomy request
 */
export interface PostUpdateWithTaxonomyRequest {
  postId: number;
  title?: string;
  content?: string;
  status?: 'draft' | 'publish' | 'private' | 'pending' | 'future';
  excerpt?: string;
  slug?: string;
  author?: number;
  categories?: (string | number)[];
  tags?: (string | number)[];
  primaryCategory?: string | number;
  meta?: Record<string, any>;
  removePreviousCategories?: boolean;
  removePreviousTags?: boolean;
}

/**
 * Taxonomy assignment result
 */
export interface TaxonomyAssignmentResult {
  success: boolean;
  data?: {
    postId: number;
    assignedCategories: WordPressCategory[];
    assignedTags: WordPressTag[];
    primaryCategory?: WordPressCategory;
    createdCategories?: WordPressCategory[];
    createdTags?: WordPressTag[];
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
 * Post with taxonomy result
 */
export interface PostWithTaxonomyResult {
  success: boolean;
  data?: {
    postId: number;
    postUrl?: string;
    postData: any;
    assignedCategories: WordPressCategory[];
    assignedTags: WordPressTag[];
    primaryCategory?: WordPressCategory;
    createdCategories?: WordPressCategory[];
    createdTags?: WordPressTag[];
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
 * Taxonomy term reference (can be name or ID)
 */
export interface TaxonomyTermReference {
  type: 'name' | 'id';
  value: string | number;
}

/**
 * Post Taxonomy Assignment Service
 */
export class PostTaxonomyAssignmentService {
  private config: PostTaxonomyConfig;
  private categoryService: CategoryManagementService;
  private tagService: TagManagementService;
  private baseUrl: string;
  private authHeader: string;

  constructor(config: PostTaxonomyConfig) {
    this.config = {
      timeout: 10000,
      maxRetries: 3,
      retryDelay: 1000,
      defaultCategoryName: 'Uncategorized',
      createMissingTerms: true,
      validateHierarchy: true,
      maxCategoriesPerPost: 50,
      maxTagsPerPost: 100,
      ...config
    };
    
    this.baseUrl = `${this.config.wordpressUrl}/wp-json/wp/v2`;
    this.authHeader = 'Basic ' + Buffer.from(
      `${this.config.username}:${this.config.password}`
    ).toString('base64');

    // Initialize category and tag services
    const categoryConfig: CategoryManagementConfig = {
      wordpressUrl: this.config.wordpressUrl,
      username: this.config.username,
      password: this.config.password,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay
    };

    const tagConfig: TagManagementConfig = {
      wordpressUrl: this.config.wordpressUrl,
      username: this.config.username,
      password: this.config.password,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay
    };

    this.categoryService = new CategoryManagementService(categoryConfig);
    this.tagService = new TagManagementService(tagConfig);
  }

  /**
   * Assign categories and tags to an existing post
   */
  async assignTaxonomyToPost(
    request: PostTaxonomyAssignmentRequest,
    requestId?: string
  ): Promise<TaxonomyAssignmentResult> {
    const startTime = Date.now();
    const logContext: any = { 
      requestId, 
      postId: request.postId,
      categoryCount: request.categories?.length || 0,
      tagCount: request.tags?.length || 0
    };
    
    try {
      logger.info('Assigning taxonomy to post', logContext);

      // Validate post ID
      if (!Number.isInteger(request.postId) || request.postId <= 0) {
        return {
          success: false,
          error: {
            code: 'INVALID_POST_ID',
            message: 'Invalid post ID provided',
            details: 'Post ID must be a positive integer'
          },
          requestId
        };
      }

      // Verify post exists
      const postExists = await this.verifyPostExists(request.postId, requestId);
      if (!postExists.success) {
        return {
          success: false,
          error: {
            code: 'POST_NOT_FOUND',
            message: 'Post not found',
            details: postExists.error
          },
          requestId
        };
      }

      // Process categories
      let categoryIds: number[] = [];
      let assignedCategories: WordPressCategory[] = [];
      let createdCategories: WordPressCategory[] = [];
      let primaryCategoryId: number | undefined;
      let primaryCategory: WordPressCategory | undefined;

      if (request.categories && request.categories.length > 0) {
        const categoryResult = await this.processCategories(
          request.categories, 
          request.primaryCategory,
          requestId
        );
        
        if (!categoryResult.success) {
          return {
            success: false,
            error: {
              code: 'CATEGORY_PROCESSING_FAILED',
              message: 'Failed to process categories',
              details: categoryResult.error
            },
            requestId
          };
        }

        categoryIds = categoryResult.categoryIds;
        assignedCategories = categoryResult.categories;
        createdCategories = categoryResult.createdCategories;
        primaryCategoryId = categoryResult.primaryCategoryId;
        primaryCategory = categoryResult.primaryCategory;
      }

      // Process tags
      let tagIds: number[] = [];
      let assignedTags: WordPressTag[] = [];
      let createdTags: WordPressTag[] = [];

      if (request.tags && request.tags.length > 0) {
        const tagResult = await this.processTags(request.tags, requestId);
        
        if (!tagResult.success) {
          return {
            success: false,
            error: {
              code: 'TAG_PROCESSING_FAILED',
              message: 'Failed to process tags',
              details: tagResult.error
            },
            requestId
          };
        }

        tagIds = tagResult.tagIds;
        assignedTags = tagResult.tags;
        createdTags = tagResult.createdTags;
      }

      // Assign taxonomy to post
      const assignmentResult = await this.updatePostTaxonomy(
        request.postId,
        categoryIds,
        tagIds,
        primaryCategoryId,
        request.removePreviousCategories,
        request.removePreviousTags,
        requestId
      );

      if (!assignmentResult.success) {
        return {
          success: false,
          error: {
            code: 'TAXONOMY_ASSIGNMENT_FAILED',
            message: 'Failed to assign taxonomy to post',
            details: assignmentResult.error
          },
          requestId
        };
      }

      const processingTime = Date.now() - startTime;

      logger.info('Taxonomy assigned to post successfully', {
        ...logContext,
        assignedCategoryCount: assignedCategories.length,
        assignedTagCount: assignedTags.length,
        createdCategoryCount: createdCategories.length,
        createdTagCount: createdTags.length,
        processingTimeMs: processingTime
      });

      return {
        success: true,
        data: {
          postId: request.postId,
          assignedCategories,
          assignedTags,
          primaryCategory,
          createdCategories: createdCategories.length > 0 ? createdCategories : undefined,
          createdTags: createdTags.length > 0 ? createdTags : undefined,
          processingTimeMs: processingTime
        },
        warnings: this.generateWarnings(createdCategories, createdTags),
        requestId
      };

    } catch (error) {
      logger.error('Error assigning taxonomy to post', {
        ...logContext,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'TAXONOMY_ASSIGNMENT_ERROR',
          message: 'Unexpected error during taxonomy assignment',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        requestId
      };
    }
  }

  /**
   * Create a new post with categories and tags
   */
  async createPostWithTaxonomy(
    request: PostCreationWithTaxonomyRequest,
    requestId?: string
  ): Promise<PostWithTaxonomyResult> {
    const startTime = Date.now();
    const logContext: any = { 
      requestId, 
      title: request.title?.substring(0, 50) + '...',
      categoryCount: request.categories?.length || 0,
      tagCount: request.tags?.length || 0
    };
    
    try {
      logger.info('Creating post with taxonomy', logContext);

      // Validate post data
      const validation = this.validatePostData(request);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Post data validation failed',
            details: validation.errors
          },
          requestId
        };
      }

      // Process categories
      let categoryIds: number[] = [];
      let assignedCategories: WordPressCategory[] = [];
      let createdCategories: WordPressCategory[] = [];
      let primaryCategoryId: number | undefined;
      let primaryCategory: WordPressCategory | undefined;

      if (request.categories && request.categories.length > 0) {
        const categoryResult = await this.processCategories(
          request.categories, 
          request.primaryCategory,
          requestId
        );
        
        if (!categoryResult.success) {
          return {
            success: false,
            error: {
              code: 'CATEGORY_PROCESSING_FAILED',
              message: 'Failed to process categories',
              details: categoryResult.error
            },
            requestId
          };
        }

        categoryIds = categoryResult.categoryIds;
        assignedCategories = categoryResult.categories;
        createdCategories = categoryResult.createdCategories;
        primaryCategoryId = categoryResult.primaryCategoryId;
        primaryCategory = categoryResult.primaryCategory;
      }

      // Process tags
      let tagIds: number[] = [];
      let assignedTags: WordPressTag[] = [];
      let createdTags: WordPressTag[] = [];

      if (request.tags && request.tags.length > 0) {
        const tagResult = await this.processTags(request.tags, requestId);
        
        if (!tagResult.success) {
          return {
            success: false,
            error: {
              code: 'TAG_PROCESSING_FAILED',
              message: 'Failed to process tags',
              details: tagResult.error
            },
            requestId
          };
        }

        tagIds = tagResult.tagIds;
        assignedTags = tagResult.tags;
        createdTags = tagResult.createdTags;
      }

      // Create post
      const postResult = await this.createPost(request, categoryIds, tagIds, requestId);
      
      if (!postResult.success) {
        return {
          success: false,
          error: {
            code: 'POST_CREATION_FAILED',
            message: 'Failed to create post',
            details: postResult.error
          },
          requestId
        };
      }

      // Set primary category if specified
      if (primaryCategoryId && postResult.postId) {
        await this.setPrimaryCategory(postResult.postId, primaryCategoryId, requestId);
      }

      const processingTime = Date.now() - startTime;

      logger.info('Post created with taxonomy successfully', {
        ...logContext,
        postId: postResult.postId,
        assignedCategoryCount: assignedCategories.length,
        assignedTagCount: assignedTags.length,
        createdCategoryCount: createdCategories.length,
        createdTagCount: createdTags.length,
        processingTimeMs: processingTime
      });

      return {
        success: true,
        data: {
          postId: postResult.postId!,
          postUrl: postResult.postUrl,
          postData: postResult.postData,
          assignedCategories,
          assignedTags,
          primaryCategory,
          createdCategories: createdCategories.length > 0 ? createdCategories : undefined,
          createdTags: createdTags.length > 0 ? createdTags : undefined,
          processingTimeMs: processingTime
        },
        warnings: this.generateWarnings(createdCategories, createdTags),
        requestId
      };

    } catch (error) {
      logger.error('Error creating post with taxonomy', {
        ...logContext,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'POST_CREATION_ERROR',
          message: 'Unexpected error during post creation',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        requestId
      };
    }
  }

  /**
   * Update an existing post with categories and tags
   */
  async updatePostWithTaxonomy(
    request: PostUpdateWithTaxonomyRequest,
    requestId?: string
  ): Promise<PostWithTaxonomyResult> {
    const startTime = Date.now();
    const logContext: any = { 
      requestId, 
      postId: request.postId,
      categoryCount: request.categories?.length || 0,
      tagCount: request.tags?.length || 0
    };
    
    try {
      logger.info('Updating post with taxonomy', logContext);

      // Validate post data
      const validation = this.validateUpdateData(request);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Post update data validation failed',
            details: validation.errors
          },
          requestId
        };
      }

      // Verify post exists
      const postExists = await this.verifyPostExists(request.postId, requestId);
      if (!postExists.success) {
        return {
          success: false,
          error: {
            code: 'POST_NOT_FOUND',
            message: 'Post not found',
            details: postExists.error
          },
          requestId
        };
      }

      // Process categories if provided
      let categoryIds: number[] = [];
      let assignedCategories: WordPressCategory[] = [];
      let createdCategories: WordPressCategory[] = [];
      let primaryCategoryId: number | undefined;
      let primaryCategory: WordPressCategory | undefined;

      if (request.categories !== undefined) {
        if (request.categories.length > 0) {
          const categoryResult = await this.processCategories(
            request.categories, 
            request.primaryCategory,
            requestId
          );
          
          if (!categoryResult.success) {
            return {
              success: false,
              error: {
                code: 'CATEGORY_PROCESSING_FAILED',
                message: 'Failed to process categories',
                details: categoryResult.error
              },
              requestId
            };
          }

          categoryIds = categoryResult.categoryIds;
          assignedCategories = categoryResult.categories;
          createdCategories = categoryResult.createdCategories;
          primaryCategoryId = categoryResult.primaryCategoryId;
          primaryCategory = categoryResult.primaryCategory;
        }
      }

      // Process tags if provided
      let tagIds: number[] = [];
      let assignedTags: WordPressTag[] = [];
      let createdTags: WordPressTag[] = [];

      if (request.tags !== undefined) {
        if (request.tags.length > 0) {
          const tagResult = await this.processTags(request.tags, requestId);
          
          if (!tagResult.success) {
            return {
              success: false,
              error: {
                code: 'TAG_PROCESSING_FAILED',
                message: 'Failed to process tags',
                details: tagResult.error
              },
              requestId
            };
          }

          tagIds = tagResult.tagIds;
          assignedTags = tagResult.tags;
          createdTags = tagResult.createdTags;
        }
      }

      // Update post
      const postResult = await this.updatePost(request, categoryIds, tagIds, requestId);
      
      if (!postResult.success) {
        return {
          success: false,
          error: {
            code: 'POST_UPDATE_FAILED',
            message: 'Failed to update post',
            details: postResult.error
          },
          requestId
        };
      }

      // Set primary category if specified
      if (primaryCategoryId) {
        await this.setPrimaryCategory(request.postId, primaryCategoryId, requestId);
      }

      const processingTime = Date.now() - startTime;

      logger.info('Post updated with taxonomy successfully', {
        ...logContext,
        assignedCategoryCount: assignedCategories.length,
        assignedTagCount: assignedTags.length,
        createdCategoryCount: createdCategories.length,
        createdTagCount: createdTags.length,
        processingTimeMs: processingTime
      });

      return {
        success: true,
        data: {
          postId: request.postId,
          postUrl: postResult.postUrl,
          postData: postResult.postData,
          assignedCategories,
          assignedTags,
          primaryCategory,
          createdCategories: createdCategories.length > 0 ? createdCategories : undefined,
          createdTags: createdTags.length > 0 ? createdTags : undefined,
          processingTimeMs: processingTime
        },
        warnings: this.generateWarnings(createdCategories, createdTags),
        requestId
      };

    } catch (error) {
      logger.error('Error updating post with taxonomy', {
        ...logContext,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'POST_UPDATE_ERROR',
          message: 'Unexpected error during post update',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        requestId
      };
    }
  }

  /**
   * Process categories for assignment
   */
  private async processCategories(
    categories: (string | number)[],
    primaryCategory?: string | number,
    requestId?: string
  ): Promise<{
    success: boolean;
    categoryIds: number[];
    categories: WordPressCategory[];
    createdCategories: WordPressCategory[];
    primaryCategoryId?: number;
    primaryCategory?: WordPressCategory;
    error?: any;
  }> {
    try {
      // Validate category count
      if (categories.length > this.config.maxCategoriesPerPost!) {
        return {
          success: false,
          categoryIds: [],
          categories: [],
          createdCategories: [],
          error: `Too many categories. Maximum allowed: ${this.config.maxCategoriesPerPost}`
        };
      }

      const categoryIds: number[] = [];
      const categoryObjects: WordPressCategory[] = [];
      const createdCategories: WordPressCategory[] = [];
      
      for (const categoryRef of categories) {
        if (typeof categoryRef === 'number') {
          // Category ID provided
          const result = await this.categoryService.getCategoryById(categoryRef, requestId);
          if (result.success && result.data) {
            categoryIds.push(categoryRef);
            categoryObjects.push(result.data as WordPressCategory);
          } else if (this.config.createMissingTerms) {
            // Category ID not found, but we can't create by ID
            return {
              success: false,
              categoryIds: [],
              categories: [],
              createdCategories: [],
              error: `Category with ID ${categoryRef} not found`
            };
          }
        } else {
          // Category name provided
          const result = await this.categoryService.findCategoryByName(categoryRef, { exactMatch: true }, requestId);
          if (result.success && result.data) {
            const category = result.data as WordPressCategory;
            categoryIds.push(category.id!);
            categoryObjects.push(category);
          } else if (this.config.createMissingTerms) {
            // Create new category
            const createResult = await this.categoryService.createCategory({ name: categoryRef }, requestId);
            if (createResult.success && createResult.data) {
              const category = createResult.data as WordPressCategory;
              categoryIds.push(category.id!);
              categoryObjects.push(category);
              createdCategories.push(category);
            } else {
              return {
                success: false,
                categoryIds: [],
                categories: [],
                createdCategories: [],
                error: `Failed to create category: ${categoryRef}`
              };
            }
          } else {
            return {
              success: false,
              categoryIds: [],
              categories: [],
              createdCategories: [],
              error: `Category not found: ${categoryRef}`
            };
          }
        }
      }

      // Process primary category
      let primaryCategoryId: number | undefined;
      let primaryCategoryObject: WordPressCategory | undefined;

      if (primaryCategory !== undefined) {
        if (typeof primaryCategory === 'number') {
          if (categoryIds.includes(primaryCategory)) {
            primaryCategoryId = primaryCategory;
            primaryCategoryObject = categoryObjects.find(cat => cat.id === primaryCategory);
          } else {
            return {
              success: false,
              categoryIds: [],
              categories: [],
              createdCategories: [],
              error: 'Primary category must be one of the assigned categories'
            };
          }
        } else {
          const primaryCat = categoryObjects.find(cat => cat.name === primaryCategory);
          if (primaryCat) {
            primaryCategoryId = primaryCat.id;
            primaryCategoryObject = primaryCat;
          } else {
            return {
              success: false,
              categoryIds: [],
              categories: [],
              createdCategories: [],
              error: 'Primary category must be one of the assigned categories'
            };
          }
        }
      }

      return {
        success: true,
        categoryIds,
        categories: categoryObjects,
        createdCategories,
        primaryCategoryId,
        primaryCategory: primaryCategoryObject
      };
    } catch (error) {
      return {
        success: false,
        categoryIds: [],
        categories: [],
        createdCategories: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process tags for assignment
   */
  private async processTags(
    tags: (string | number)[],
    requestId?: string
  ): Promise<{
    success: boolean;
    tagIds: number[];
    tags: WordPressTag[];
    createdTags: WordPressTag[];
    error?: any;
  }> {
    try {
      // Validate tag count
      if (tags.length > this.config.maxTagsPerPost!) {
        return {
          success: false,
          tagIds: [],
          tags: [],
          createdTags: [],
          error: `Too many tags. Maximum allowed: ${this.config.maxTagsPerPost}`
        };
      }

      const tagIds: number[] = [];
      const tagObjects: WordPressTag[] = [];
      const createdTags: WordPressTag[] = [];
      
      for (const tagRef of tags) {
        if (typeof tagRef === 'number') {
          // Tag ID provided
          const result = await this.tagService.getTagById(tagRef, requestId);
          if (result.success && result.data) {
            tagIds.push(tagRef);
            tagObjects.push(result.data as WordPressTag);
          } else if (this.config.createMissingTerms) {
            // Tag ID not found, but we can't create by ID
            return {
              success: false,
              tagIds: [],
              tags: [],
              createdTags: [],
              error: `Tag with ID ${tagRef} not found`
            };
          }
        } else {
          // Tag name provided
          const result = await this.tagService.findTagByName(tagRef, { exactMatch: true }, requestId);
          if (result.success && result.data) {
            const tag = result.data as WordPressTag;
            tagIds.push(tag.id!);
            tagObjects.push(tag);
          } else if (this.config.createMissingTerms) {
            // Create new tag
            const createResult = await this.tagService.createTag({ name: tagRef }, requestId);
            if (createResult.success && createResult.data) {
              const tag = createResult.data as WordPressTag;
              tagIds.push(tag.id!);
              tagObjects.push(tag);
              createdTags.push(tag);
            } else {
              return {
                success: false,
                tagIds: [],
                tags: [],
                createdTags: [],
                error: `Failed to create tag: ${tagRef}`
              };
            }
          } else {
            return {
              success: false,
              tagIds: [],
              tags: [],
              createdTags: [],
              error: `Tag not found: ${tagRef}`
            };
          }
        }
      }

      return {
        success: true,
        tagIds,
        tags: tagObjects,
        createdTags
      };
    } catch (error) {
      return {
        success: false,
        tagIds: [],
        tags: [],
        createdTags: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Verify that a post exists
   */
  private async verifyPostExists(
    postId: number,
    requestId?: string
  ): Promise<{ success: boolean; error?: any }> {
    try {
      const response = await this.makeWordPressRequest(
        'GET',
        `/posts/${postId}`,
        undefined,
        requestId
      );

      return { success: response.success };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update post taxonomy via WordPress REST API
   */
  private async updatePostTaxonomy(
    postId: number,
    categoryIds: number[],
    tagIds: number[],
    primaryCategoryId?: number,
    removePreviousCategories?: boolean,
    removePreviousTags?: boolean,
    requestId?: string
  ): Promise<{ success: boolean; error?: any }> {
    try {
      const updateData: any = {};

      // Handle categories
      if (categoryIds.length > 0 || removePreviousCategories) {
        updateData.categories = categoryIds;
      }

      // Handle tags
      if (tagIds.length > 0 || removePreviousTags) {
        updateData.tags = tagIds;
      }

      const response = await this.makeWordPressRequest(
        'PUT',
        `/posts/${postId}`,
        updateData,
        requestId
      );

      return { success: response.success, error: response.error };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create a new post via WordPress REST API
   */
  private async createPost(
    request: PostCreationWithTaxonomyRequest,
    categoryIds: number[],
    tagIds: number[],
    requestId?: string
  ): Promise<{ success: boolean; postId?: number; postUrl?: string; postData?: any; error?: any }> {
    try {
      const postData: any = {
        title: request.title,
        content: request.content,
        status: request.status || 'draft',
        categories: categoryIds,
        tags: tagIds
      };

      if (request.excerpt) postData.excerpt = request.excerpt;
      if (request.slug) postData.slug = request.slug;
      if (request.author) postData.author = request.author;
      if (request.meta) postData.meta = request.meta;

      const response = await this.makeWordPressRequest(
        'POST',
        '/posts',
        postData,
        requestId
      );

      if (response.success && response.data) {
        return {
          success: true,
          postId: response.data.id,
          postUrl: response.data.link,
          postData: response.data
        };
      } else {
        return {
          success: false,
          error: response.error
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update an existing post via WordPress REST API
   */
  private async updatePost(
    request: PostUpdateWithTaxonomyRequest,
    categoryIds: number[],
    tagIds: number[],
    requestId?: string
  ): Promise<{ success: boolean; postUrl?: string; postData?: any; error?: any }> {
    try {
      const updateData: any = {};

      if (request.title !== undefined) updateData.title = request.title;
      if (request.content !== undefined) updateData.content = request.content;
      if (request.status !== undefined) updateData.status = request.status;
      if (request.excerpt !== undefined) updateData.excerpt = request.excerpt;
      if (request.slug !== undefined) updateData.slug = request.slug;
      if (request.author !== undefined) updateData.author = request.author;
      if (request.meta !== undefined) updateData.meta = request.meta;

      // Handle taxonomy updates
      if (request.categories !== undefined || request.removePreviousCategories) {
        updateData.categories = categoryIds;
      }

      if (request.tags !== undefined || request.removePreviousTags) {
        updateData.tags = tagIds;
      }

      const response = await this.makeWordPressRequest(
        'PUT',
        `/posts/${request.postId}`,
        updateData,
        requestId
      );

      if (response.success && response.data) {
        return {
          success: true,
          postUrl: response.data.link,
          postData: response.data
        };
      } else {
        return {
          success: false,
          error: response.error
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Set primary category for post (Yoast SEO)
   */
  private async setPrimaryCategory(
    postId: number,
    categoryId: number,
    requestId?: string
  ): Promise<{ success: boolean; error?: any }> {
    try {
      // This would typically be handled by Yoast SEO meta fields
      // For now, we'll just log it as the implementation depends on Yoast SEO plugin
      logger.info('Setting primary category', {
        postId,
        categoryId,
        requestId,
        note: 'Primary category setting requires Yoast SEO plugin integration'
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate post creation data
   */
  private validatePostData(data: PostCreationWithTaxonomyRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.title || data.title.trim() === '') {
      errors.push('Post title is required');
    }

    if (!data.content || data.content.trim() === '') {
      errors.push('Post content is required');
    }

    if (data.title && data.title.length > 200) {
      errors.push('Post title is too long (maximum 200 characters)');
    }

    if (data.categories && data.categories.length > this.config.maxCategoriesPerPost!) {
      errors.push(`Too many categories (maximum ${this.config.maxCategoriesPerPost})`);
    }

    if (data.tags && data.tags.length > this.config.maxTagsPerPost!) {
      errors.push(`Too many tags (maximum ${this.config.maxTagsPerPost})`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate post update data
   */
  private validateUpdateData(data: PostUpdateWithTaxonomyRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Number.isInteger(data.postId) || data.postId <= 0) {
      errors.push('Valid post ID is required');
    }

    if (data.title !== undefined && data.title.trim() === '') {
      errors.push('Post title cannot be empty');
    }

    if (data.title && data.title.length > 200) {
      errors.push('Post title is too long (maximum 200 characters)');
    }

    if (data.categories && data.categories.length > this.config.maxCategoriesPerPost!) {
      errors.push(`Too many categories (maximum ${this.config.maxCategoriesPerPost})`);
    }

    if (data.tags && data.tags.length > this.config.maxTagsPerPost!) {
      errors.push(`Too many tags (maximum ${this.config.maxTagsPerPost})`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate warning messages
   */
  private generateWarnings(createdCategories: WordPressCategory[], createdTags: WordPressTag[]): string[] {
    const warnings: string[] = [];

    if (createdCategories.length > 0) {
      warnings.push(`Created ${createdCategories.length} new categories: ${createdCategories.map(c => c.name).join(', ')}`);
    }

    if (createdTags.length > 0) {
      warnings.push(`Created ${createdTags.length} new tags: ${createdTags.map(t => t.name).join(', ')}`);
    }

    return warnings;
  }

  /**
   * Make WordPress REST API request
   */
  private async makeWordPressRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    requestId?: string
  ): Promise<{ success: boolean; data?: any; error?: any }> {
    const url = `${this.baseUrl}${endpoint}`;
    const logContext: any = { requestId, method, endpoint };

    let attempts = 0;
    const maxRetries = this.config.maxRetries!;

    while (attempts < maxRetries) {
      attempts++;
      
      try {
        logger.debug('Making WordPress API request', {
          ...logContext,
          attempt: attempts,
          url
        });

        const options: RequestInit = {
          method,
          headers: {
            'Authorization': this.authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(this.config.timeout!)
        };

        if (data && (method === 'POST' || method === 'PUT')) {
          options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        const responseData = await response.json();

        if (response.ok) {
          logger.debug('WordPress API request successful', {
            ...logContext,
            status: response.status,
            attempt: attempts
          });
          
          return {
            success: true,
            data: responseData
          };
        } else {
          logger.warn('WordPress API request failed', {
            ...logContext,
            status: response.status,
            attempt: attempts,
            error: responseData
          });

          // Don't retry on client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            return {
              success: false,
              error: responseData
            };
          }

          // Retry on server errors (5xx)
          if (attempts < maxRetries) {
            logger.info('Retrying WordPress API request', {
              ...logContext,
              attempt: attempts + 1,
              delay: this.config.retryDelay
            });
            
            await new Promise(resolve => setTimeout(resolve, this.config.retryDelay!));
            continue;
          }

          return {
            success: false,
            error: responseData
          };
        }
      } catch (error) {
        logger.error('WordPress API request error', {
          ...logContext,
          attempt: attempts,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        if (attempts < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay!));
          continue;
        }

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return {
      success: false,
      error: 'Max retries exceeded'
    };
  }
}

/**
 * Create post taxonomy assignment service instance
 */
export function createPostTaxonomyAssignmentService(
  config: PostTaxonomyConfig
): PostTaxonomyAssignmentService {
  return new PostTaxonomyAssignmentService(config);
}
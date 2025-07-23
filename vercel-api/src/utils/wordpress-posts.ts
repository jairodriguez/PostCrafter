import { WordPressClient } from './wordpress';
import { getEnvVars, secureLog } from './env';
import { createYoastService, YoastService } from './wordpress-yoast';
import { createWordPressTaxonomyService, WordPressTaxonomyService } from './wordpress-taxonomy';
import { wordPressValidationService, WordPressValidationService } from './wordpress-validation';
import { 
  WordPressApiError, 
  ValidationError, 
  WordPressPostData,
  WordPressPostResponse,
  YoastMetaFields,
  WordPressResponse,
  PostCreationResult,
  PostCreationOptions
} from '../types';

/**
 * WordPress post creation configuration
 */
export interface PostCreationConfig {
  defaultStatus: 'draft' | 'publish' | 'private';
  allowComments: boolean;
  allowPings: boolean;
  defaultAuthor: number;
  defaultFormat: string;
  maxTitleLength: number;
  maxExcerptLength: number;
  maxContentLength: number;
}



/**
 * WordPress post creation service with Yoast and taxonomy integration
 */
export class WordPressPostService {
  private client: WordPressClient;
  private yoastService: YoastService;
  private taxonomyService: WordPressTaxonomyService;
  private validationService: WordPressValidationService;
  private config: PostCreationConfig;

  constructor(client: WordPressClient, config?: Partial<PostCreationConfig>) {
    this.client = client;
    this.yoastService = createYoastService(client);
    this.taxonomyService = createWordPressTaxonomyService(client);
    this.validationService = wordPressValidationService;
    this.config = {
      defaultStatus: 'draft',
      allowComments: true,
      allowPings: true,
      defaultAuthor: 1,
      defaultFormat: 'standard',
      maxTitleLength: 200,
      maxExcerptLength: 160,
      maxContentLength: 50000,
      ...config
    };
  }

  /**
   * Get default post creation configuration
   */
  private getDefaultConfig(): PostCreationConfig {
    const env = getEnvVars();
    
    return {
      defaultStatus: 'draft',
      allowComments: true,
      allowPings: true,
      defaultAuthor: 1, // Default to admin user
      defaultFormat: 'standard',
      maxTitleLength: 200,
      maxExcerptLength: 160,
      maxContentLength: 50000, // 50KB limit
    };
  }

  /**
   * Validate and sanitize post data before creation
   */
  private validatePostData(data: WordPressPostData, requestId?: string): { 
    valid: boolean; 
    errors: string[]; 
    warnings: string[];
    sanitizedData?: WordPressPostData;
  } {
    // Use the comprehensive WordPress validation service
    const validationResult = this.validationService.validateAndSanitizePostData(data, requestId);
    
    return {
      valid: validationResult.valid,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      sanitizedData: validationResult.sanitizedData as WordPressPostData,
    };
  }

  /**
   * Prepare post data for WordPress API
   */
  private preparePostData(data: WordPressPostData, options: PostCreationOptions = {}): any {
    const postData: any = {
      title: data.title,
      content: data.content,
      status: options.status || data.status || this.config.defaultStatus,
      author: options.author || data.author || this.config.defaultAuthor,
      comment_status: options.allowComments !== undefined ? (options.allowComments ? 'open' : 'closed') : (this.config.allowComments ? 'open' : 'closed'),
      ping_status: options.allowPings !== undefined ? (options.allowPings ? 'open' : 'closed') : (this.config.allowPings ? 'open' : 'closed'),
    };

    // Add optional fields if provided
    if (data.excerpt) {
      postData.excerpt = data.excerpt;
    }

    if (data.slug) {
      postData.slug = data.slug;
    }

    if (options.format) {
      postData.format = options.format;
    }

    if (options.template) {
      postData.template = options.template;
    }

    if (options.password) {
      postData.password = options.password;
    }

    if (options.sticky) {
      postData.sticky = options.sticky;
    }

    return postData;
  }

  /**
   * Create a new WordPress post
   */
  async createPost(
    data: WordPressPostData, 
    options: PostCreationOptions = {},
    requestId?: string
  ): Promise<PostCreationResult> {
    try {
      secureLog('info', 'Creating WordPress post', {
        requestId,
        title: data.title?.substring(0, 50) + '...',
        status: options.status || data.status || this.config.defaultStatus,
        author: options.author || data.author || this.config.defaultAuthor,
      });

      // Validate and sanitize post data
      const validation = this.validatePostData(data, requestId);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Post data validation failed',
            details: validation.errors,
          },
          warnings: validation.warnings,
        };
      }

      // Use sanitized data if available
      const postDataToUse = validation.sanitizedData || data;

      // Prepare post data for WordPress API
      const postData = this.preparePostData(postDataToUse, options);

      // Create post via WordPress REST API
      const response = await this.client.post<WordPressPostResponse>('/wp/v2/posts', postData);

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || {
            code: 'WORDPRESS_API_ERROR',
            message: 'Failed to create post via WordPress API',
          } as WordPressApiError,
        };
      }

      const post = response.data;
      const postUrl = post.link || `${getEnvVars().WORDPRESS_URL}/?p=${post.id}`;

      secureLog('info', 'WordPress post created successfully', {
        postId: post.id,
        postUrl,
        status: post.status,
      });

      return {
        success: true,
        postId: post.id,
        postUrl,
        postData: post,
        warnings: validation.warnings.length > 0 ? validation.warnings : [],
      };

    } catch (error) {
      secureLog('error', 'Error creating WordPress post', {
        error: error instanceof Error ? error.message : 'Unknown error',
        title: data.title?.substring(0, 50) + '...',
      });

              return {
          success: false,
          error: {
            code: 'WORDPRESS_API_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error occurred while creating post',
          } as WordPressApiError,
        };
    }
  }

  /**
   * Update an existing WordPress post
   */
  async updatePost(
    postId: number,
    data: Partial<WordPressPostData>,
    options: PostCreationOptions = {},
    requestId?: string
  ): Promise<PostCreationResult> {
    try {
      secureLog('info', 'Updating WordPress post', {
        requestId,
        postId,
        title: data.title?.substring(0, 50) + '...',
      });

      // Validate post ID
      if (!Number.isInteger(postId) || postId <= 0) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid post ID',
          } as ValidationError,
        };
      }

      // Validate and sanitize partial post data
      const validation = this.validatePostData(data as WordPressPostData, requestId);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Post data validation failed',
            details: validation.errors,
          },
          warnings: validation.warnings,
        };
      }

      // Use sanitized data if available
      const postDataToUse = validation.sanitizedData || data;

      // Prepare post data for WordPress API
      const postData = this.preparePostData(postDataToUse as WordPressPostData, options);

      // Update post via WordPress REST API
      const response = await this.client.put<WordPressPostResponse>(`/wp/v2/posts/${postId}`, postData);

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || {
            code: 'WORDPRESS_API_ERROR',
            message: 'Failed to update post via WordPress API',
          } as WordPressApiError,
        };
      }

      const post = response.data;
      const postUrl = post.link || `${getEnvVars().WORDPRESS_URL}/?p=${post.id}`;

      secureLog('info', 'WordPress post updated successfully', {
        postId: post.id,
        postUrl,
        status: post.status,
      });

      return {
        success: true,
        postId: post.id,
        postUrl,
        postData: post,
        warnings: validation.warnings.length > 0 ? validation.warnings : [],
      };

    } catch (error) {
      secureLog('error', 'Error updating WordPress post', {
        error: error instanceof Error ? error.message : 'Unknown error',
        postId,
        title: data.title?.substring(0, 50) + '...',
      });

              return {
          success: false,
          error: {
            code: 'WORDPRESS_API_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error occurred while updating post',
          } as WordPressApiError,
        };
    }
  }

  /**
   * Get a WordPress post by ID
   */
  async getPost(postId: number): Promise<PostCreationResult> {
    try {
      secureLog('info', 'Retrieving WordPress post', { postId });

      // Validate post ID
      if (!Number.isInteger(postId) || postId <= 0) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid post ID',
          } as ValidationError,
        };
      }

      // Get post via WordPress REST API
      const response = await this.client.get<WordPressPostResponse>(`/wp/v2/posts/${postId}`);

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || {
            code: 'WORDPRESS_API_ERROR',
            message: 'Failed to retrieve post via WordPress API',
          } as WordPressApiError,
        };
      }

      const post = response.data;
      const postUrl = post.link || `${getEnvVars().WORDPRESS_URL}/?p=${post.id}`;

      return {
        success: true,
        postId: post.id,
        postUrl,
        postData: post,
      };

    } catch (error) {
      secureLog('error', 'Error retrieving WordPress post', {
        error: error instanceof Error ? error.message : 'Unknown error',
        postId,
      });

      return {
        success: false,
        error: {
          code: 'WORDPRESS_API_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred while retrieving post',
        } as WordPressApiError,
      };
    }
  }

  /**
   * Delete a WordPress post
   */
  async deletePost(postId: number, force: boolean = false): Promise<PostCreationResult> {
    try {
      secureLog('info', 'Deleting WordPress post', { postId, force });

      // Validate post ID
      if (!Number.isInteger(postId) || postId <= 0) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid post ID',
          } as ValidationError,
        };
      }

      // Delete post via WordPress REST API
      const endpoint = `/wp/v2/posts/${postId}${force ? '?force=true' : ''}`;
      const response = await this.client.delete<WordPressPostResponse>(endpoint);

      if (!response.success) {
        return {
          success: false,
          error: response.error || {
            code: 'WORDPRESS_API_ERROR',
            message: 'Failed to delete post via WordPress API',
          } as WordPressApiError,
        };
      }

      secureLog('info', 'WordPress post deleted successfully', { postId });

      return {
        success: true,
        postId,
      };

    } catch (error) {
      secureLog('error', 'Error deleting WordPress post', {
        error: error instanceof Error ? error.message : 'Unknown error',
        postId,
      });

      return {
        success: false,
        error: {
          code: 'WORDPRESS_API_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred while deleting post',
        } as WordPressApiError,
      };
    }
  }

  /**
   * Create a new WordPress post with Yoast SEO integration
   */
  async createPostWithYoast(
    postData: WordPressPostData,
    yoastFields?: Partial<YoastMetaFields>
  ): Promise<WordPressResponse<WordPressPostResponse>> {
    try {
      // Validate post data
      const postValidation = this.validatePostData(postData);
      if (!postValidation.valid) {
        return {
          success: false,
          error: {
            code: 'POST_VALIDATION_ERROR',
            message: 'Post data validation failed',
            details: postValidation.errors.join(', ')
          },
          statusCode: 400
        };
      }

      // Create the post first
      const postResponse = await this.createPost(postData);
      if (!postResponse.success || !postResponse.data) {
        return postResponse;
      }

      const postId = postResponse.data.id;

      // Apply Yoast fields if provided
      if (yoastFields && Object.keys(yoastFields).length > 0) {
        const yoastResponse = await this.yoastService.applyYoastFields(postId, yoastFields);
        
        if (!yoastResponse.success) {
          secureLog('warn', 'Failed to apply Yoast fields, but post was created', {
            postId,
            yoastError: yoastResponse.error?.message
          });
          
          // Return post creation success with Yoast warning
          return {
            success: true,
            data: {
              ...postResponse.data,
              yoastWarning: 'Post created successfully but Yoast fields could not be applied'
            },
            statusCode: 201
          };
        }

        secureLog('info', 'Post created with Yoast fields', {
          postId,
          yoastFieldsApplied: Object.keys(yoastFields)
        });
      }

      return postResponse;
    } catch (error) {
      secureLog('error', 'Error creating post with Yoast integration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        postData: { title: postData.title, status: postData.status }
      });

      return {
        success: false,
        error: {
          code: 'POST_CREATION_ERROR',
          message: 'Error creating post with Yoast integration',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        statusCode: 500
      };
    }
  }

  /**
   * Update an existing WordPress post with Yoast fields
   */
  async updatePostWithYoast(
    postId: number,
    postData: Partial<WordPressPostData>,
    yoastFields?: Partial<YoastMetaFields>
  ): Promise<WordPressResponse<WordPressPostResponse>> {
    try {
      // Validate post data
      if (postData) {
        const postValidation = this.validatePostData(postData as WordPressPostData, true);
        if (!postValidation.valid) {
          return {
            success: false,
            error: {
              code: 'POST_VALIDATION_ERROR',
              message: 'Post data validation failed',
              details: postValidation.errors.join(', ')
            },
            statusCode: 400
          };
        }
      }

      // Update the post
      const postResponse = await this.updatePost(postId, postData);
      if (!postResponse.success || !postResponse.data) {
        return postResponse;
      }

      // Apply Yoast fields if provided
      if (yoastFields && Object.keys(yoastFields).length > 0) {
        const yoastResponse = await this.yoastService.applyYoastFields(postId, yoastFields);
        
        if (!yoastResponse.success) {
          secureLog('warn', 'Failed to apply Yoast fields during update', {
            postId,
            yoastError: yoastResponse.error?.message
          });
          
          // Return post update success with Yoast warning
          return {
            success: true,
            data: {
              ...postResponse.data,
              yoastWarning: 'Post updated successfully but Yoast fields could not be applied'
            },
            statusCode: 200
          };
        }

        secureLog('info', 'Post updated with Yoast fields', {
          postId,
          yoastFieldsApplied: Object.keys(yoastFields)
        });
      }

      return postResponse;
    } catch (error) {
      secureLog('error', 'Error updating post with Yoast integration', {
        postId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'POST_UPDATE_ERROR',
          message: 'Error updating post with Yoast integration',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        statusCode: 500
      };
    }
  }

  /**
   * Get a post with its Yoast fields
   */
  async getPostWithYoast(postId: number): Promise<WordPressResponse<WordPressPostResponse & { yoast: YoastMetaFields }>> {
    try {
      // Get the post
      const postResponse = await this.getPost(postId);
      if (!postResponse.success || !postResponse.data) {
        return postResponse as any;
      }

      // Get Yoast fields
      const yoastResponse = await this.yoastService.getYoastFields(postId);
      const yoastFields = yoastResponse.success ? yoastResponse.data : {
        meta_title: '',
        meta_description: '',
        focus_keywords: [],
        meta_robots_noindex: false,
        meta_robots_nofollow: false,
        canonical: '',
        primary_category: null
      };

      return {
        success: true,
        data: {
          ...postResponse.data,
          yoast: yoastFields
        },
        statusCode: 200
      };
    } catch (error) {
      secureLog('error', 'Error retrieving post with Yoast fields', {
        postId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'POST_RETRIEVAL_ERROR',
          message: 'Error retrieving post with Yoast fields',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        statusCode: 500
      };
    }
  }

  /**
   * Generate default Yoast fields from post data
   */
  generateDefaultYoastFields(postData: WordPressPostData): Partial<YoastMetaFields> {
    const yoastFields: Partial<YoastMetaFields> = {};

    // Generate default meta title from post title
    if (postData.title) {
      yoastFields.meta_title = this.yoastService.generateDefaultMetaTitle(postData.title);
    }

    // Generate default meta description from excerpt or content
    if (postData.excerpt) {
      yoastFields.meta_description = this.yoastService.generateDefaultMetaDescription(postData.excerpt);
    } else if (postData.content) {
      // Extract first paragraph as excerpt
      const contentText = postData.content.replace(/<[^>]*>/g, '').trim();
      const firstParagraph = contentText.split('\n')[0].substring(0, 160);
      yoastFields.meta_description = this.yoastService.generateDefaultMetaDescription(firstParagraph);
    }

    return yoastFields;
  }

  /**
   * Create post with categories and tags
   */
  async createPostWithTaxonomy(
    postData: WordPressPostData,
    categoryNames?: string[],
    tagNames?: string[],
    options?: PostCreationOptions
  ): Promise<WordPressPostResponse> {
    try {
      const startTime = Date.now();
      const requestId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      secureLog('info', 'Creating post with taxonomy', {
        requestId,
        title: postData.title.substring(0, 50) + '...',
        categoryCount: categoryNames?.length || 0,
        tagCount: tagNames?.length || 0
      });

      // Process categories if provided
      let categoryIds: number[] = [];
      if (categoryNames && categoryNames.length > 0) {
        const categoryResult = await this.taxonomyService.getOrCreateCategories(categoryNames);
        if (!categoryResult.success) {
          return {
            success: false,
            error: {
              code: categoryResult.error?.code || 'CATEGORY_PROCESSING_ERROR',
              message: categoryResult.error?.message || 'Failed to process categories',
              details: categoryResult.error?.details || 'Unknown error'
            },
            statusCode: categoryResult.statusCode || 500
          };
        }
        categoryIds = categoryResult.data.categoryIds;
      }

      // Process tags if provided
      let tagIds: number[] = [];
      if (tagNames && tagNames.length > 0) {
        const tagResult = await this.taxonomyService.getOrCreateTags(tagNames);
        if (!tagResult.success) {
          return {
            success: false,
            error: {
              code: tagResult.error?.code || 'TAG_PROCESSING_ERROR',
              message: tagResult.error?.message || 'Failed to process tags',
              details: tagResult.error?.details || 'Unknown error'
            },
            statusCode: tagResult.statusCode || 500
          };
        }
        tagIds = tagResult.data.tagIds;
      }

      // Create post with taxonomy
      const postResult = await this.createPost(postData, {
        ...options,
        categories: categoryIds,
        tags: tagIds
      });

      if (postResult.success && postResult.data) {
        const processingTime = Date.now() - startTime;

        secureLog('info', 'Post created successfully with taxonomy', {
          requestId,
          postId: postResult.data.id,
          postTitle: postResult.data.title.rendered,
          categoryCount: categoryIds.length,
          tagCount: tagIds.length,
          processingTime
        });

        return {
          success: true,
          data: {
            ...postResult.data,
            categories: categoryIds,
            tags: tagIds,
            taxonomy_processing_time_ms: processingTime
          },
          statusCode: 201
        };
      } else {
        return postResult;
      }
    } catch (error) {
      secureLog('error', 'Error creating post with taxonomy', {
        error: error instanceof Error ? error.message : 'Unknown error',
        postData: { title: postData.title.substring(0, 50) + '...' }
      });

      return {
        success: false,
        error: {
          code: 'POST_CREATION_ERROR',
          message: 'Error creating post with taxonomy',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        statusCode: 500
      };
    }
  }

  /**
   * Create post with Yoast and taxonomy integration
   */
  async createPostWithYoastAndTaxonomy(
    postData: WordPressPostData,
    yoastFields?: YoastMetaFields,
    categoryNames?: string[],
    tagNames?: string[],
    options?: PostCreationOptions
  ): Promise<WordPressPostResponse> {
    try {
      const startTime = Date.now();
      const requestId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      secureLog('info', 'Creating post with Yoast and taxonomy', {
        requestId,
        title: postData.title.substring(0, 50) + '...',
        hasYoastFields: !!yoastFields,
        categoryCount: categoryNames?.length || 0,
        tagCount: tagNames?.length || 0
      });

      // Process categories if provided
      let categoryIds: number[] = [];
      if (categoryNames && categoryNames.length > 0) {
        const categoryResult = await this.taxonomyService.getOrCreateCategories(categoryNames);
        if (!categoryResult.success) {
          return {
            success: false,
            error: {
              code: categoryResult.error?.code || 'CATEGORY_PROCESSING_ERROR',
              message: categoryResult.error?.message || 'Failed to process categories',
              details: categoryResult.error?.details || 'Unknown error'
            },
            statusCode: categoryResult.statusCode || 500
          };
        }
        categoryIds = categoryResult.data.categoryIds;
      }

      // Process tags if provided
      let tagIds: number[] = [];
      if (tagNames && tagNames.length > 0) {
        const tagResult = await this.taxonomyService.getOrCreateTags(tagNames);
        if (!tagResult.success) {
          return {
            success: false,
            error: {
              code: tagResult.error?.code || 'TAG_PROCESSING_ERROR',
              message: tagResult.error?.message || 'Failed to process tags',
              details: tagResult.error?.details || 'Unknown error'
            },
            statusCode: tagResult.statusCode || 500
          };
        }
        tagIds = tagResult.data.tagIds;
      }

      // Create post with taxonomy
      const postResult = await this.createPost(postData, {
        ...options,
        categories: categoryIds,
        tags: tagIds
      });

      if (!postResult.success || !postResult.data) {
        return postResult;
      }

      // Apply Yoast fields if provided
      let yoastWarning = null;
      if (yoastFields) {
        const yoastResult = await this.yoastService.applyYoastFields(postResult.data.id, yoastFields);
        if (!yoastResult.success) {
          yoastWarning = `Yoast fields could not be applied: ${yoastResult.error?.message}`;
          secureLog('warn', 'Yoast fields application failed', {
            requestId,
            postId: postResult.data.id,
            error: yoastResult.error?.details
          });
        }
      }

      const processingTime = Date.now() - startTime;

      secureLog('info', 'Post created successfully with Yoast and taxonomy', {
        requestId,
        postId: postResult.data.id,
        postTitle: postResult.data.title.rendered,
        categoryCount: categoryIds.length,
        tagCount: tagIds.length,
        yoastApplied: !!yoastFields,
        yoastWarning,
        processingTime
      });

      return {
        success: true,
        data: {
          ...postResult.data,
          categories: categoryIds,
          tags: tagIds,
          yoastWarning,
          taxonomy_processing_time_ms: processingTime
        },
        statusCode: 201
      };
    } catch (error) {
      secureLog('error', 'Error creating post with Yoast and taxonomy', {
        error: error instanceof Error ? error.message : 'Unknown error',
        postData: { title: postData.title.substring(0, 50) + '...' }
      });

      return {
        success: false,
        error: {
          code: 'POST_CREATION_ERROR',
          message: 'Error creating post with Yoast and taxonomy',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        statusCode: 500
      };
    }
  }
}

/**
 * Create a WordPress post service instance
 */
export function createWordPressPostService(client?: WordPressClient): WordPressPostService {
  return new WordPressPostService(client);
}

/**
 * Utility function to create a post with basic data
 */
export async function createBasicPost(
  title: string,
  content: string,
  options: PostCreationOptions = {}
): Promise<PostCreationResult> {
  const service = createWordPressPostService();
  
  const postData: WordPressPostData = {
    title,
    content,
    status: options.status || 'draft',
  };

  return service.createPost(postData, options);
} 
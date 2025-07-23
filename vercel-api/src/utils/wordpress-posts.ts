import { WordPressClient, createWordPressClient } from './wordpress';
import { getEnvVars, secureLog } from './env';
import { createYoastService, YoastService } from './wordpress-yoast';
import { 
  WordPressError, 
  ValidationError, 
  PublishRequest, 
  WordPressPostData,
  WordPressPostResponse,
  YoastMetaFields
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
 * WordPress post creation options
 */
export interface PostCreationOptions {
  status?: 'draft' | 'publish' | 'private';
  allowComments?: boolean;
  allowPings?: boolean;
  author?: number;
  format?: string;
  sticky?: boolean;
  template?: string;
  password?: string;
}

/**
 * WordPress post creation result
 */
export interface PostCreationResult {
  success: boolean;
  postId?: number;
  postUrl?: string;
  postData?: WordPressPostResponse;
  error?: WordPressError | ValidationError;
  warnings?: string[];
}

/**
 * WordPress post creation service with Yoast integration
 */
export class WordPressPostService {
  private client: WordPressClient;
  private yoastService: YoastService;
  private config: PostCreationConfig;

  constructor(client: WordPressClient, config?: Partial<PostCreationConfig>) {
    this.client = client;
    this.yoastService = createYoastService(client);
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
   * Validate post data before creation
   */
  private validatePostData(data: WordPressPostData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate title
    if (!data.title || data.title.trim().length === 0) {
      errors.push('Post title is required');
    } else if (data.title.length > this.config.maxTitleLength) {
      errors.push(`Post title exceeds maximum length of ${this.config.maxTitleLength} characters`);
    }

    // Validate content
    if (!data.content || data.content.trim().length === 0) {
      errors.push('Post content is required');
    } else if (data.content.length > this.config.maxContentLength) {
      errors.push(`Post content exceeds maximum length of ${this.config.maxContentLength} characters`);
    }

    // Validate excerpt (optional but if provided, check length)
    if (data.excerpt && data.excerpt.length > this.config.maxExcerptLength) {
      errors.push(`Post excerpt exceeds maximum length of ${this.config.maxExcerptLength} characters`);
    }

    // Validate status
    if (data.status && !['draft', 'publish', 'private'].includes(data.status)) {
      errors.push('Invalid post status. Must be draft, publish, or private');
    }

    // Validate author ID
    if (data.author && (!Number.isInteger(data.author) || data.author <= 0)) {
      errors.push('Author ID must be a positive integer');
    }

    return {
      valid: errors.length === 0,
      errors
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
    options: PostCreationOptions = {}
  ): Promise<PostCreationResult> {
    try {
      secureLog('info', 'Creating WordPress post', {
        title: data.title?.substring(0, 50) + '...',
        status: options.status || data.status || this.config.defaultStatus,
        author: options.author || data.author || this.config.defaultAuthor,
      });

      // Validate post data
      const validation = this.validatePostData(data);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Post data validation failed',
            details: validation.errors,
          } as ValidationError,
        };
      }

      // Prepare post data for WordPress API
      const postData = this.preparePostData(data, options);

      // Create post via WordPress REST API
      const response = await this.client.post<WordPressPostResponse>('/wp/v2/posts', postData);

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || {
            code: 'WORDPRESS_API_ERROR',
            message: 'Failed to create post via WordPress API',
          } as WordPressError,
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
        } as WordPressError,
      };
    }
  }

  /**
   * Update an existing WordPress post
   */
  async updatePost(
    postId: number,
    data: Partial<WordPressPostData>,
    options: PostCreationOptions = {}
  ): Promise<PostCreationResult> {
    try {
      secureLog('info', 'Updating WordPress post', {
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

      // Validate partial post data
      const validation = this.validatePostData(data as WordPressPostData);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Post data validation failed',
            details: validation.errors,
          } as ValidationError,
        };
      }

      // Prepare post data for WordPress API
      const postData = this.preparePostData(data as WordPressPostData, options);

      // Update post via WordPress REST API
      const response = await this.client.put<WordPressPostResponse>(`/wp/v2/posts/${postId}`, postData);

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || {
            code: 'WORDPRESS_API_ERROR',
            message: 'Failed to update post via WordPress API',
          } as WordPressError,
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
        } as WordPressError,
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
          } as WordPressError,
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
        } as WordPressError,
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
          } as WordPressError,
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
        } as WordPressError,
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
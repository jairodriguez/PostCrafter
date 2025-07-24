/**
 * WordPress Post Status Integration Service
 * Implements Task 11.2: Implement status handling in WordPress API integration
 * Provides enhanced status handling for WordPress post creation and updates
 */

import { WordPressClient } from '../utils/wordpress';
import { logger } from '../utils/logger';
import {
  PostStatus,
  WordPressPostStatus,
  PostStatusMetadata,
  PostStatusTransition,
  PostStatusUpdateRequest,
  PostStatusUpdateResult,
  PostWithStatus,
  validatePostStatus,
  mapToWordPressStatus,
  mapFromWordPressStatus,
  createStatusTransition,
  createPostStatusMetadata,
  isStatusTransitionAllowed,
  postStatusUtils
} from '../types/post-status';
import {
  WordPressPostData,
  WordPressPostResponse,
  WordPressApiError,
  ValidationError,
  PostCreationResult,
  PostCreationOptions
} from '../types';

/**
 * WordPress post status integration configuration
 */
export interface WordPressPostStatusConfig {
  wordpressUrl: string;
  username: string;
  password: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  enableStatusHistory?: boolean;
  enableStatusValidation?: boolean;
  allowedStatusTransitions?: Record<PostStatus, PostStatus[]>;
  defaultStatus?: PostStatus;
  enableMetadataTracking?: boolean;
}

/**
 * Post creation request with enhanced status support
 */
export interface PostCreationWithStatusRequest extends WordPressPostData {
  status: PostStatus;
  statusMetadata?: PostStatusMetadata;
  validateStatusTransition?: boolean;
  currentStatus?: PostStatus;
  statusChangeReason?: string;
  statusChangedBy?: string;
}

/**
 * Post update request with status change support
 */
export interface PostUpdateWithStatusRequest extends Partial<WordPressPostData> {
  id: number;
  status?: PostStatus;
  statusMetadata?: PostStatusMetadata;
  validateStatusTransition?: boolean;
  currentStatus?: PostStatus;
  statusChangeReason?: string;
  statusChangedBy?: string;
}

/**
 * Enhanced post creation result with status information
 */
export interface PostCreationWithStatusResult extends PostCreationResult {
  statusMetadata?: PostStatusMetadata;
  statusTransition?: PostStatusTransition;
  statusWarnings?: string[];
}

/**
 * WordPress post status query options
 */
export interface WordPressPostStatusQueryOptions {
  status?: PostStatus | PostStatus[];
  excludeStatus?: PostStatus | PostStatus[];
  includeStatusHistory?: boolean;
  sortBy?: 'date' | 'modified' | 'status_changed';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  author?: number;
  search?: string;
}

/**
 * WordPress post status query result
 */
export interface WordPressPostStatusQueryResult {
  success: boolean;
  posts?: PostWithStatus[];
  totalCount?: number;
  statusDistribution?: Record<PostStatus, number>;
  error?: WordPressApiError;
  requestId?: string;
}

/**
 * Status validation result for WordPress operations
 */
export interface WordPressStatusValidationResult {
  isValid: boolean;
  internalStatus?: PostStatus;
  wordpressStatus?: WordPressPostStatus;
  error?: string;
  warnings?: string[];
  statusMetadata?: PostStatusMetadata;
}

/**
 * WordPress Post Status Integration Service
 */
export class WordPressPostStatusIntegrationService {
  private client: WordPressClient;
  private config: WordPressPostStatusConfig;

  constructor(config: WordPressPostStatusConfig) {
    this.config = {
      timeout: 10000,
      maxRetries: 3,
      retryDelay: 1000,
      enableStatusHistory: true,
      enableStatusValidation: true,
      enableMetadataTracking: true,
      defaultStatus: 'draft',
      allowedStatusTransitions: {
        'draft': ['publish', 'private'],
        'publish': ['draft', 'private'],
        'private': ['draft', 'publish']
      },
      ...config
    };

    this.client = new WordPressClient({
      baseUrl: this.config.wordpressUrl,
      username: this.config.username,
      appPassword: this.config.password,
      timeout: this.config.timeout,
      retryAttempts: this.config.maxRetries
    });
  }

  /**
   * Create post with enhanced status handling
   */
  async createPostWithStatus(
    postData: PostCreationWithStatusRequest,
    options: PostCreationOptions = {},
    requestId?: string
  ): Promise<PostCreationWithStatusResult> {
    const logContext: any = { requestId, postTitle: postData.title?.substring(0, 50) };
    
    try {
      logger.info('Creating WordPress post with status handling', {
        ...logContext,
        requestedStatus: postData.status
      });

      // Validate status
      const statusValidation = this.validateStatusForWordPress(
        postData.status,
        {
          validateTransitions: postData.validateStatusTransition,
          currentStatus: postData.currentStatus
        },
        requestId
      );

      if (!statusValidation.isValid) {
        return {
          success: false,
          error: {
            code: 'STATUS_VALIDATION_ERROR',
            message: 'Post status validation failed',
            details: statusValidation.error
          } as WordPressApiError,
          statusWarnings: statusValidation.warnings
        };
      }

      // Prepare post data with WordPress status
      const wordpressPostData = this.preparePostDataWithStatus(postData, statusValidation);

      // Create status metadata if enabled
      let statusMetadata: PostStatusMetadata | undefined;
      let statusTransition: PostStatusTransition | undefined;

      if (this.config.enableMetadataTracking) {
        statusMetadata = createPostStatusMetadata(statusValidation.internalStatus!, {
          statusChangedBy: postData.statusChangedBy
        });

        if (postData.currentStatus && postData.currentStatus !== statusValidation.internalStatus) {
          statusTransition = createStatusTransition(
            postData.currentStatus,
            statusValidation.internalStatus!,
            postData.statusChangedBy,
            postData.statusChangeReason
          );
        }
      }

      // Create post via WordPress REST API
      const response = await this.client.post<WordPressPostResponse>('/wp/v2/posts', wordpressPostData);

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || {
            code: 'WORDPRESS_API_ERROR',
            message: 'Failed to create post via WordPress API'
          } as WordPressApiError
        };
      }

      const createdPost = response.data;
      const finalStatus = mapFromWordPressStatus(createdPost.status as WordPressPostStatus);

      // Update status metadata with actual creation data
      if (statusMetadata) {
        statusMetadata.statusHistory = statusTransition ? [statusTransition] : [];
        if (finalStatus === 'publish') {
          statusMetadata.publishedDate = createdPost.date || new Date().toISOString();
        } else if (finalStatus === 'draft') {
          statusMetadata.draftSavedDate = createdPost.date || new Date().toISOString();
        }
      }

      logger.info('WordPress post created successfully with status', {
        ...logContext,
        postId: createdPost.id,
        requestedStatus: postData.status,
        finalStatus: finalStatus,
        wordpressStatus: createdPost.status
      });

      return {
        success: true,
        postId: createdPost.id,
        postUrl: createdPost.link || `${this.config.wordpressUrl}/?p=${createdPost.id}`,
        postData: createdPost,
        statusMetadata,
        statusTransition,
        statusWarnings: statusValidation.warnings
      };

    } catch (error) {
      logger.error('Error creating WordPress post with status', {
        ...logContext,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'WORDPRESS_API_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred while creating post'
        } as WordPressApiError
      };
    }
  }

  /**
   * Update post status
   */
  async updatePostStatus(
    updateRequest: PostStatusUpdateRequest,
    requestId?: string
  ): Promise<PostStatusUpdateResult> {
    const logContext: any = { requestId, postId: updateRequest.postId };
    
    try {
      logger.info('Updating WordPress post status', {
        ...logContext,
        newStatus: updateRequest.newStatus
      });

      // Get current post to validate transition
      const currentPost = await this.getPostById(updateRequest.postId, requestId);
      if (!currentPost.success || !currentPost.data) {
        return {
          success: false,
          previousStatus: 'draft',
          newStatus: updateRequest.newStatus,
          timestamp: new Date().toISOString(),
          error: 'Post not found or could not retrieve current status'
        };
      }

      const currentStatus = mapFromWordPressStatus(currentPost.data.status as WordPressPostStatus);

      // Validate status transition
      if (this.config.enableStatusValidation) {
        const isAllowed = isStatusTransitionAllowed(
          currentStatus,
          updateRequest.newStatus,
          { statusTransitionPermissions: this.config.allowedStatusTransitions }
        );

        if (!isAllowed) {
          return {
            success: false,
            previousStatus: currentStatus,
            newStatus: updateRequest.newStatus,
            timestamp: new Date().toISOString(),
            error: `Status transition from "${currentStatus}" to "${updateRequest.newStatus}" is not allowed`
          };
        }
      }

      // Prepare update data
      const wordpressStatus = mapToWordPressStatus(updateRequest.newStatus);
      const updateData = {
        status: wordpressStatus
      };

      // Update post via WordPress REST API
      const response = await this.client.put<WordPressPostResponse>(
        `/wp/v2/posts/${updateRequest.postId}`,
        updateData
      );

      if (!response.success || !response.data) {
        return {
          success: false,
          previousStatus: currentStatus,
          newStatus: updateRequest.newStatus,
          timestamp: new Date().toISOString(),
          error: response.error?.message || 'Failed to update post status in WordPress'
        };
      }

      const updatedPost = response.data;
      const finalStatus = mapFromWordPressStatus(updatedPost.status as WordPressPostStatus);
      const timestamp = new Date().toISOString();

      logger.info('WordPress post status updated successfully', {
        ...logContext,
        previousStatus: currentStatus,
        newStatus: finalStatus,
        wordpressStatus: updatedPost.status
      });

      return {
        success: true,
        previousStatus: currentStatus,
        newStatus: finalStatus,
        timestamp,
        wordpressPostId: updatedPost.id
      };

    } catch (error) {
      logger.error('Error updating WordPress post status', {
        ...logContext,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        previousStatus: 'draft',
        newStatus: updateRequest.newStatus,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error occurred while updating post status'
      };
    }
  }

  /**
   * Update existing post with status handling
   */
  async updatePostWithStatus(
    updateData: PostUpdateWithStatusRequest,
    options: PostCreationOptions = {},
    requestId?: string
  ): Promise<PostCreationWithStatusResult> {
    const logContext: any = { requestId, postId: updateData.id };
    
    try {
      logger.info('Updating WordPress post with status handling', {
        ...logContext,
        requestedStatus: updateData.status
      });

      // Get current post for transition validation
      let currentStatus: PostStatus | undefined;
      if (updateData.validateStatusTransition && updateData.status) {
        const currentPost = await this.getPostById(updateData.id, requestId);
        if (currentPost.success && currentPost.data) {
          currentStatus = mapFromWordPressStatus(currentPost.data.status as WordPressPostStatus);
        }
      }

      // Validate status if provided
      let statusValidation: WordPressStatusValidationResult | undefined;
      let statusTransition: PostStatusTransition | undefined;

      if (updateData.status) {
        statusValidation = this.validateStatusForWordPress(
          updateData.status,
          {
            validateTransitions: updateData.validateStatusTransition,
            currentStatus: currentStatus || updateData.currentStatus
          },
          requestId
        );

        if (!statusValidation.isValid) {
          return {
            success: false,
            error: {
              code: 'STATUS_VALIDATION_ERROR',
              message: 'Post status validation failed',
              details: statusValidation.error
            } as WordPressApiError,
            statusWarnings: statusValidation.warnings
          };
        }

        // Create status transition record
        if (currentStatus && currentStatus !== statusValidation.internalStatus) {
          statusTransition = createStatusTransition(
            currentStatus,
            statusValidation.internalStatus!,
            updateData.statusChangedBy,
            updateData.statusChangeReason
          );
        }
      }

      // Prepare update data with WordPress status
      const wordpressUpdateData = this.prepareUpdateDataWithStatus(updateData, statusValidation);

      // Update post via WordPress REST API
      const response = await this.client.put<WordPressPostResponse>(
        `/wp/v2/posts/${updateData.id}`,
        wordpressUpdateData
      );

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || {
            code: 'WORDPRESS_API_ERROR',
            message: 'Failed to update post via WordPress API'
          } as WordPressApiError
        };
      }

      const updatedPost = response.data;
      const finalStatus = mapFromWordPressStatus(updatedPost.status as WordPressPostStatus);

      // Update status metadata
      let statusMetadata: PostStatusMetadata | undefined;
      if (this.config.enableMetadataTracking && statusValidation) {
        statusMetadata = createPostStatusMetadata(finalStatus, {
          statusChangedBy: updateData.statusChangedBy,
          previousTransitions: statusTransition ? [statusTransition] : []
        });
      }

      logger.info('WordPress post updated successfully with status', {
        ...logContext,
        requestedStatus: updateData.status,
        finalStatus: finalStatus,
        wordpressStatus: updatedPost.status
      });

      return {
        success: true,
        postId: updatedPost.id,
        postUrl: updatedPost.link || `${this.config.wordpressUrl}/?p=${updatedPost.id}`,
        postData: updatedPost,
        statusMetadata,
        statusTransition,
        statusWarnings: statusValidation?.warnings
      };

    } catch (error) {
      logger.error('Error updating WordPress post with status', {
        ...logContext,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'WORDPRESS_API_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred while updating post'
        } as WordPressApiError
      };
    }
  }

  /**
   * Query posts by status
   */
  async queryPostsByStatus(
    queryOptions: WordPressPostStatusQueryOptions,
    requestId?: string
  ): Promise<WordPressPostStatusQueryResult> {
    const logContext: any = { requestId };
    
    try {
      logger.info('Querying WordPress posts by status', {
        ...logContext,
        queryOptions
      });

      // Build WordPress REST API query parameters
      const params = this.buildQueryParams(queryOptions);

      // Query posts via WordPress REST API
      const response = await this.client.get<WordPressPostResponse[]>('/wp/v2/posts', { params });

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || {
            code: 'WORDPRESS_API_ERROR',
            message: 'Failed to query posts via WordPress API'
          } as WordPressApiError,
          requestId
        };
      }

      const posts = response.data;
      
      // Transform posts to include status information
      const postsWithStatus: PostWithStatus[] = posts.map(post => this.transformWordPressPostToPostWithStatus(post));

      // Calculate status distribution
      const statusDistribution: Record<PostStatus, number> = {
        'draft': 0,
        'publish': 0,
        'private': 0
      };

      postsWithStatus.forEach(post => {
        statusDistribution[post.status]++;
      });

      logger.info('WordPress posts queried successfully', {
        ...logContext,
        postCount: posts.length,
        statusDistribution
      });

      return {
        success: true,
        posts: postsWithStatus,
        totalCount: posts.length,
        statusDistribution,
        requestId
      };

    } catch (error) {
      logger.error('Error querying WordPress posts by status', {
        ...logContext,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'WORDPRESS_API_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred while querying posts'
        } as WordPressApiError,
        requestId
      };
    }
  }

  /**
   * Get post by ID with status information
   */
  async getPostById(
    postId: number,
    requestId?: string
  ): Promise<{ success: boolean; data?: WordPressPostResponse; error?: WordPressApiError }> {
    try {
      const response = await this.client.get<WordPressPostResponse>(`/wp/v2/posts/${postId}`);
      return response;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'WORDPRESS_API_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred while fetching post'
        } as WordPressApiError
      };
    }
  }

  /**
   * Validate status for WordPress operations
   */
  private validateStatusForWordPress(
    status: PostStatus,
    options: {
      validateTransitions?: boolean;
      currentStatus?: PostStatus;
    } = {},
    requestId?: string
  ): WordPressStatusValidationResult {
    // Validate the internal status
    const validation = validatePostStatus(status, {
      validateTransitions: options.validateTransitions,
      currentStatus: options.currentStatus
    });

    if (!validation.isValid) {
      return {
        isValid: false,
        error: validation.error,
        warnings: validation.warnings
      };
    }

    const internalStatus = validation.status!;
    const wordpressStatus = mapToWordPressStatus(internalStatus);

    // Create status metadata
    const statusMetadata = this.config.enableMetadataTracking
      ? createPostStatusMetadata(internalStatus)
      : undefined;

    return {
      isValid: true,
      internalStatus,
      wordpressStatus,
      statusMetadata
    };
  }

  /**
   * Prepare post data with WordPress status mapping
   */
  private preparePostDataWithStatus(
    postData: PostCreationWithStatusRequest,
    statusValidation: WordPressStatusValidationResult
  ): any {
    const wordpressData: any = {
      title: postData.title,
      content: postData.content,
      status: statusValidation.wordpressStatus,
      author: postData.author || 1,
      comment_status: postData.comment_status || 'open',
      ping_status: postData.ping_status || 'open'
    };

    // Add optional fields
    if (postData.excerpt) wordpressData.excerpt = postData.excerpt;
    if (postData.slug) wordpressData.slug = postData.slug;
    if (postData.featured_media) wordpressData.featured_media = postData.featured_media;
    if (postData.format) wordpressData.format = postData.format;
    if (postData.template) wordpressData.template = postData.template;
    if (postData.sticky !== undefined) wordpressData.sticky = postData.sticky;
    if (postData.password) wordpressData.password = postData.password;

    return wordpressData;
  }

  /**
   * Prepare update data with WordPress status mapping
   */
  private prepareUpdateDataWithStatus(
    updateData: PostUpdateWithStatusRequest,
    statusValidation?: WordPressStatusValidationResult
  ): any {
    const wordpressData: any = {};

    // Only include fields that are being updated
    if (updateData.title !== undefined) wordpressData.title = updateData.title;
    if (updateData.content !== undefined) wordpressData.content = updateData.content;
    if (updateData.excerpt !== undefined) wordpressData.excerpt = updateData.excerpt;
    if (updateData.slug !== undefined) wordpressData.slug = updateData.slug;
    if (updateData.author !== undefined) wordpressData.author = updateData.author;
    if (updateData.featured_media !== undefined) wordpressData.featured_media = updateData.featured_media;
    if (updateData.comment_status !== undefined) wordpressData.comment_status = updateData.comment_status;
    if (updateData.ping_status !== undefined) wordpressData.ping_status = updateData.ping_status;
    if (updateData.format !== undefined) wordpressData.format = updateData.format;
    if (updateData.template !== undefined) wordpressData.template = updateData.template;
    if (updateData.sticky !== undefined) wordpressData.sticky = updateData.sticky;
    if (updateData.password !== undefined) wordpressData.password = updateData.password;

    // Add status if validated
    if (statusValidation?.wordpressStatus) {
      wordpressData.status = statusValidation.wordpressStatus;
    }

    return wordpressData;
  }

  /**
   * Build query parameters for WordPress REST API
   */
  private buildQueryParams(queryOptions: WordPressPostStatusQueryOptions): Record<string, any> {
    const params: Record<string, any> = {};

    // Handle status filtering
    if (queryOptions.status) {
      const statuses = Array.isArray(queryOptions.status) ? queryOptions.status : [queryOptions.status];
      const wordpressStatuses = statuses.map(status => mapToWordPressStatus(status));
      params.status = wordpressStatuses.join(',');
    }

    // Handle excluded statuses
    if (queryOptions.excludeStatus) {
      const excludeStatuses = Array.isArray(queryOptions.excludeStatus) 
        ? queryOptions.excludeStatus 
        : [queryOptions.excludeStatus];
      const excludeWordpressStatuses = excludeStatuses.map(status => mapToWordPressStatus(status));
      params.status_exclude = excludeWordpressStatuses.join(',');
    }

    // Add other query parameters
    if (queryOptions.limit) params.per_page = queryOptions.limit;
    if (queryOptions.offset) params.offset = queryOptions.offset;
    if (queryOptions.author) params.author = queryOptions.author;
    if (queryOptions.search) params.search = queryOptions.search;

    // Handle sorting
    if (queryOptions.sortBy) {
      switch (queryOptions.sortBy) {
        case 'date':
          params.orderby = 'date';
          break;
        case 'modified':
          params.orderby = 'modified';
          break;
        case 'status_changed':
          // WordPress doesn't have direct status_changed sorting, fallback to modified
          params.orderby = 'modified';
          break;
      }
    }

    if (queryOptions.sortOrder) {
      params.order = queryOptions.sortOrder;
    }

    return params;
  }

  /**
   * Transform WordPress post to PostWithStatus
   */
  private transformWordPressPostToPostWithStatus(wpPost: WordPressPostResponse): PostWithStatus {
    const status = mapFromWordPressStatus(wpPost.status as WordPressPostStatus);
    
    const postWithStatus: PostWithStatus = {
      id: wpPost.id,
      title: wpPost.title?.rendered || wpPost.title || '',
      content: wpPost.content?.rendered || wpPost.content || '',
      excerpt: wpPost.excerpt?.rendered || wpPost.excerpt,
      status,
      slug: wpPost.slug,
      author: wpPost.author,
      featured_media: wpPost.featured_media
    };

    // Add status metadata if enabled
    if (this.config.enableMetadataTracking) {
      postWithStatus.statusMetadata = createPostStatusMetadata(status, {
        publishedDate: status === 'publish' ? wpPost.date : undefined,
        draftSavedDate: status === 'draft' ? wpPost.modified : undefined
      });
    }

    return postWithStatus;
  }

  /**
   * Get service configuration
   */
  getConfig(): WordPressPostStatusConfig {
    return { ...this.config };
  }

  /**
   * Update service configuration
   */
  updateConfig(newConfig: Partial<WordPressPostStatusConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Create WordPress post status integration service instance
 */
export function createWordPressPostStatusIntegrationService(
  config: WordPressPostStatusConfig
): WordPressPostStatusIntegrationService {
  return new WordPressPostStatusIntegrationService(config);
}

export default WordPressPostStatusIntegrationService;
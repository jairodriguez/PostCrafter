/**
 * Tag Creation and Management Service
 * Implements Task 10.3: Tag creation, management, and WordPress REST API integration
 */

// @ts-nocheck
import { logger } from '../utils/logger';
import { 
  WordPressTag, 
  TagCreateRequest, 
  TagUpdateRequest,
  TaxonomyQueryParams,
  validateTag,
  generateSlug,
  TaxonomyValidationOptions 
} from '../types/taxonomy';

/**
 * Tag management configuration
 */
export interface TagManagementConfig {
  wordpressUrl: string;
  username: string;
  password: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  validationOptions?: TaxonomyValidationOptions;
}

/**
 * Tag operation result
 */
export interface TagOperationResult {
  success: boolean;
  data?: WordPressTag | WordPressTag[];
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  warnings?: string[];
  requestId?: string;
}

/**
 * Tag search options
 */
export interface TagSearchOptions extends TaxonomyQueryParams {
  includeUsageCount?: boolean;
  exactMatch?: boolean;
  minPostCount?: number;
}

/**
 * Tag statistics result
 */
export interface TagStatisticsResult {
  success: boolean;
  stats?: {
    totalTags: number;
    activeTags: number;
    unusedTags: number;
    mostUsedTags: WordPressTag[];
    averagePostsPerTag: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  requestId?: string;
}

/**
 * Tag Management Service
 */
export class TagManagementService {
  private config: TagManagementConfig;
  private baseUrl: string;
  private authHeader: string;

  constructor(config: TagManagementConfig) {
    this.config = {
      timeout: 10000,
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };
    
    this.baseUrl = `${this.config.wordpressUrl}/wp-json/wp/v2`;
    this.authHeader = 'Basic ' + Buffer.from(
      `${this.config.username}:${this.config.password}`
    ).toString('base64');
  }

  /**
   * Create a new tag
   */
  async createTag(
    tagData: TagCreateRequest, 
    requestId?: string
  ): Promise<TagOperationResult> {
    const logContext: any = { requestId, tagName: tagData.name };
    
    try {
      logger.info('Creating tag', logContext);

      // Validate tag data
      const validation = validateTag(tagData, this.config.validationOptions);
      if (!validation.isValid) {
        logger.warn('Tag validation failed', { 
          ...logContext, 
          error: validation.error 
        });
        
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Tag data validation failed',
            details: validation.error
          },
          requestId
        };
      }

      // Check if tag already exists
      const existingTag = await this.findTagByName(
        validation.sanitizedName!, 
        { exactMatch: true },
        requestId
      );

      if (existingTag.success && existingTag.data) {
        logger.info('Tag already exists, returning existing tag', {
          ...logContext,
          existingTagId: (existingTag.data as WordPressTag).id
        });

        return {
          success: true,
          data: existingTag.data as WordPressTag,
          warnings: ['Tag with this name already exists'],
          requestId
        };
      }

      // Prepare tag payload
      const tagPayload = {
        name: validation.sanitizedName!,
        slug: validation.generatedSlug || generateSlug(validation.sanitizedName!),
        description: validation.sanitizedDescription || '',
        meta: tagData.meta || {}
      };

      // Create tag via WordPress REST API
      const response = await this.makeWordPressRequest(
        'POST',
        '/tags',
        tagPayload,
        requestId
      );

      if (response.success && response.data) {
        const createdTag = this.transformWordPressTag(response.data);
        
        logger.info('Tag created successfully', {
          ...logContext,
          tagId: createdTag.id,
          tagSlug: createdTag.slug
        });

        return {
          success: true,
          data: createdTag,
          warnings: validation.warnings,
          requestId
        };
      } else {
        logger.error('Failed to create tag', {
          ...logContext,
          error: response.error
        });

        return {
          success: false,
          error: {
            code: 'CREATION_FAILED',
            message: 'Failed to create tag in WordPress',
            details: response.error
          },
          requestId
        };
      }

    } catch (error) {
      logger.error('Error creating tag', {
        ...logContext,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'CREATION_ERROR',
          message: 'Unexpected error during tag creation',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        requestId
      };
    }
  }

  /**
   * Update an existing tag
   */
  async updateTag(
    tagData: TagUpdateRequest, 
    requestId?: string
  ): Promise<TagOperationResult> {
    const logContext: any = { requestId, tagId: tagData.id };
    
    try {
      logger.info('Updating tag', logContext);

      // Validate tag data
      const validation = validateTag(tagData, this.config.validationOptions);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Tag data validation failed',
            details: validation.error
          },
          requestId
        };
      }

      // Check if tag exists
      const existingTag = await this.getTagById(tagData.id, requestId);
      if (!existingTag.success) {
        return {
          success: false,
          error: {
            code: 'TAG_NOT_FOUND',
            message: 'Tag not found',
            details: `Tag with ID ${tagData.id} does not exist`
          },
          requestId
        };
      }

      // Prepare update payload
      const updatePayload: any = {};
      if (tagData.name) updatePayload.name = validation.sanitizedName;
      if (tagData.slug) updatePayload.slug = validation.generatedSlug;
      if (tagData.description !== undefined) updatePayload.description = validation.sanitizedDescription;
      if (tagData.meta) updatePayload.meta = tagData.meta;

      // Update tag via WordPress REST API
      const response = await this.makeWordPressRequest(
        'PUT',
        `/tags/${tagData.id}`,
        updatePayload,
        requestId
      );

      if (response.success && response.data) {
        const updatedTag = this.transformWordPressTag(response.data);
        
        logger.info('Tag updated successfully', {
          ...logContext,
          tagSlug: updatedTag.slug
        });

        return {
          success: true,
          data: updatedTag,
          warnings: validation.warnings,
          requestId
        };
      } else {
        return {
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: 'Failed to update tag in WordPress',
            details: response.error
          },
          requestId
        };
      }

    } catch (error) {
      logger.error('Error updating tag', {
        ...logContext,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: 'Unexpected error during tag update',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        requestId
      };
    }
  }

  /**
   * Get tag by ID
   */
  async getTagById(
    tagId: number, 
    requestId?: string
  ): Promise<TagOperationResult> {
    try {
      const response = await this.makeWordPressRequest(
        'GET',
        `/tags/${tagId}`,
        undefined,
        requestId
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: this.transformWordPressTag(response.data),
          requestId
        };
      } else {
        return {
          success: false,
          error: {
            code: 'TAG_NOT_FOUND',
            message: 'Tag not found',
            details: response.error
          },
          requestId
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Error fetching tag',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        requestId
      };
    }
  }

  /**
   * Find tag by name
   */
  async findTagByName(
    name: string, 
    options: TagSearchOptions = {},
    requestId?: string
  ): Promise<TagOperationResult> {
    try {
      const searchParams = new URLSearchParams({
        search: name,
        per_page: '100',
        ...(options.hideEmpty !== undefined && { hide_empty: options.hideEmpty.toString() }),
        ...(options.orderBy && { orderby: options.orderBy }),
        ...(options.order && { order: options.order })
      });

      const response = await this.makeWordPressRequest(
        'GET',
        `/tags?${searchParams.toString()}`,
        undefined,
        requestId
      );

      if (response.success && response.data) {
        const tags = Array.isArray(response.data) ? response.data : [response.data];
        
        let matchedTag;
        if (options.exactMatch) {
          matchedTag = tags.find(tag => 
            tag.name.toLowerCase() === name.toLowerCase()
          );
        } else {
          matchedTag = tags[0]; // Return first match for non-exact search
        }

        if (matchedTag) {
          return {
            success: true,
            data: this.transformWordPressTag(matchedTag),
            requestId
          };
        } else {
          return {
            success: false,
            error: {
              code: 'TAG_NOT_FOUND',
              message: 'Tag not found',
              details: `No tag found with name: ${name}`
            },
            requestId
          };
        }
      } else {
        return {
          success: false,
          error: {
            code: 'SEARCH_FAILED',
            message: 'Failed to search tags',
            details: response.error
          },
          requestId
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: 'Error searching tags',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        requestId
      };
    }
  }

  /**
   * Get all tags with optional filtering
   */
  async getAllTags(
    options: TagSearchOptions = {},
    requestId?: string
  ): Promise<TagOperationResult> {
    try {
      logger.info('Fetching all tags', { requestId });

      const searchParams = new URLSearchParams({
        per_page: '100',
        orderby: options.orderBy || 'name',
        order: options.order || 'asc',
        ...(options.hideEmpty !== undefined && { hide_empty: options.hideEmpty.toString() }),
        ...(options.include && { include: options.include.join(',') }),
        ...(options.exclude && { exclude: options.exclude.join(',') }),
        ...(options.search && { search: options.search })
      });

      const response = await this.makeWordPressRequest(
        'GET',
        `/tags?${searchParams.toString()}`,
        undefined,
        requestId
      );

      if (response.success && response.data) {
        const tags = Array.isArray(response.data) ? response.data : [response.data];
        let transformedTags = tags.map(tag => this.transformWordPressTag(tag));
        
        // Apply additional filtering
        if (options.minPostCount !== undefined) {
          transformedTags = transformedTags.filter(tag => (tag.count || 0) >= options.minPostCount!);
        }

        logger.info('Tags retrieved successfully', {
          requestId,
          tagCount: transformedTags.length
        });

        return {
          success: true,
          data: transformedTags,
          requestId
        };
      } else {
        return {
          success: false,
          error: {
            code: 'TAGS_FETCH_FAILED',
            message: 'Failed to fetch tags',
            details: response.error
          },
          requestId
        };
      }
    } catch (error) {
      logger.error('Error fetching tags', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'TAGS_FETCH_ERROR',
          message: 'Error fetching tags',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        requestId
      };
    }
  }

  /**
   * Delete a tag
   */
  async deleteTag(
    tagId: number, 
    force: boolean = false,
    requestId?: string
  ): Promise<TagOperationResult> {
    const logContext: any = { requestId, tagId };
    
    try {
      logger.info('Deleting tag', logContext);

      const searchParams = new URLSearchParams();
      if (force) {
        searchParams.append('force', 'true');
      }

      const response = await this.makeWordPressRequest(
        'DELETE',
        `/tags/${tagId}?${searchParams.toString()}`,
        undefined,
        requestId
      );

      if (response.success) {
        logger.info('Tag deleted successfully', logContext);
        
        return {
          success: true,
          data: response.data ? this.transformWordPressTag(response.data) : undefined,
          requestId
        };
      } else {
        return {
          success: false,
          error: {
            code: 'DELETE_FAILED',
            message: 'Failed to delete tag',
            details: response.error
          },
          requestId
        };
      }
    } catch (error) {
      logger.error('Error deleting tag', {
        ...logContext,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: 'Error deleting tag',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        requestId
      };
    }
  }

  /**
   * Get tag statistics
   */
  async getTagStatistics(
    requestId?: string
  ): Promise<TagStatisticsResult> {
    try {
      logger.info('Fetching tag statistics', { requestId });

      // Get all tags with their usage counts
      const allTagsResult = await this.getAllTags({ includeUsageCount: true }, requestId);
      
      if (!allTagsResult.success || !Array.isArray(allTagsResult.data)) {
        return {
          success: false,
          error: {
            code: 'STATS_FETCH_FAILED',
            message: 'Failed to fetch tags for statistics',
            details: allTagsResult.error
          },
          requestId
        };
      }

      const tags = allTagsResult.data as WordPressTag[];
      
      // Calculate statistics
      const totalTags = tags.length;
      const activeTags = tags.filter(tag => (tag.count || 0) > 0);
      const unusedTags = tags.filter(tag => (tag.count || 0) === 0);
      const mostUsedTags = tags
        .sort((a, b) => (b.count || 0) - (a.count || 0))
        .slice(0, 10);
      
      const totalPosts = tags.reduce((sum, tag) => sum + (tag.count || 0), 0);
      const averagePostsPerTag = totalTags > 0 ? totalPosts / totalTags : 0;

      const stats = {
        totalTags,
        activeTags: activeTags.length,
        unusedTags: unusedTags.length,
        mostUsedTags,
        averagePostsPerTag: Math.round(averagePostsPerTag * 100) / 100
      };

      logger.info('Tag statistics calculated successfully', {
        requestId,
        ...stats
      });

      return {
        success: true,
        stats,
        requestId
      };
    } catch (error) {
      logger.error('Error calculating tag statistics', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: 'Error calculating tag statistics',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        requestId
      };
    }
  }

  /**
   * Bulk create tags
   */
  async bulkCreateTags(
    tagNames: string[],
    requestId?: string
  ): Promise<TagOperationResult> {
    const logContext: any = { requestId, tagCount: tagNames.length };
    
    try {
      logger.info('Bulk creating tags', logContext);

      if (tagNames.length === 0) {
        return {
          success: true,
          data: [],
          requestId
        };
      }

      const results: WordPressTag[] = [];
      const errors: string[] = [];

      for (const tagName of tagNames) {
        try {
          const result = await this.createTag({ name: tagName }, requestId);
          
          if (result.success && result.data) {
            results.push(result.data as WordPressTag);
          } else {
            errors.push(`Failed to create tag "${tagName}": ${result.error?.message}`);
          }
        } catch (error) {
          errors.push(`Error creating tag "${tagName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (errors.length > 0) {
        logger.warn('Some tags failed to create during bulk operation', {
          ...logContext,
          errors,
          successCount: results.length,
          failureCount: errors.length
        });
      }

      logger.info('Bulk tag creation completed', {
        ...logContext,
        successCount: results.length,
        failureCount: errors.length
      });

      return {
        success: true,
        data: results,
        warnings: errors.length > 0 ? errors : undefined,
        requestId
      };
    } catch (error) {
      logger.error('Error in bulk tag creation', {
        ...logContext,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'BULK_CREATE_ERROR',
          message: 'Error during bulk tag creation',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        requestId
      };
    }
  }

  /**
   * Get or create tags (for post assignment)
   */
  async getOrCreateTags(
    tagNames: string[],
    requestId?: string
  ): Promise<TagOperationResult> {
    const logContext: any = { requestId, tagNames };
    
    try {
      logger.info('Getting or creating tags', logContext);

      if (tagNames.length === 0) {
        return {
          success: true,
          data: [],
          requestId
        };
      }

      const tagIds: number[] = [];
      const createdTags: WordPressTag[] = [];
      const existingTags: WordPressTag[] = [];

      for (const tagName of tagNames) {
        // First try to find existing tag
        const existingResult = await this.findTagByName(tagName, { exactMatch: true }, requestId);
        
        if (existingResult.success && existingResult.data) {
          const tag = existingResult.data as WordPressTag;
          tagIds.push(tag.id!);
          existingTags.push(tag);
        } else {
          // Create new tag
          const createResult = await this.createTag({ name: tagName }, requestId);
          
          if (createResult.success && createResult.data) {
            const tag = createResult.data as WordPressTag;
            tagIds.push(tag.id!);
            createdTags.push(tag);
          } else {
            return {
              success: false,
              error: {
                code: 'TAG_PROCESSING_FAILED',
                message: 'Failed to process tags',
                details: `Failed to create tag: ${tagName} - ${createResult.error?.details}`
              },
              requestId
            };
          }
        }
      }

      logger.info('Tags processed successfully', {
        requestId,
        totalTags: tagIds.length,
        createdTags: createdTags.length,
        existingTags: existingTags.length,
        tagIds
      });

      return {
        success: true,
        data: [...existingTags, ...createdTags],
        warnings: createdTags.length > 0 ? [`Created ${createdTags.length} new tags`] : undefined,
        requestId
      };
    } catch (error) {
      logger.error('Error processing tags', {
        ...logContext,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'TAG_PROCESSING_ERROR',
          message: 'Error processing tags',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        requestId
      };
    }
  }

  /**
   * Transform WordPress tag to our format
   */
  private transformWordPressTag(wpTag: any): WordPressTag {
    return {
      id: wpTag.id,
      name: wpTag.name,
      slug: wpTag.slug,
      description: wpTag.description || '',
      count: wpTag.count || 0,
      link: wpTag.link,
      meta: wpTag.meta || {}
    };
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
 * Create tag management service instance
 */
export function createTagManagementService(
  config: TagManagementConfig
): TagManagementService {
  return new TagManagementService(config);
}
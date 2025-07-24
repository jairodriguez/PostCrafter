import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { authenticateApiKey, AuthenticatedRequest } from '../../src/middleware/auth';
import { applyMiddleware } from '../../src/middleware/cors';
import { logger } from '../../src/utils/logger';
import { 
  createWordPressPostStatusIntegrationService,
  WordPressPostStatusQueryOptions
} from '../../src/services/wordpress-post-status-integration';
import { 
  PostStatus,
  PostWithStatus,
  PostStatusUpdateRequest,
  getStatusLabel,
  getStatusDescription,
  getStatusIcon,
  getStatusColor,
  isStatusTransitionAllowed
} from '../../src/types/post-status';
import ErrorHandler from '../../src/middleware/error-handler';
import { requestResponseLogger } from '../../src/middleware/request-response-logger';
import { applicationMonitor } from '../../src/utils/application-monitor';
import { ApiError } from '../../src/types';

/**
 * Draft management query parameters
 */
interface DraftQueryParams {
  action?: 'list' | 'batch_update' | 'analytics' | 'export';
  status?: string | string[];
  limit?: string;
  offset?: string;
  search?: string;
  author?: string;
  sortBy?: 'date' | 'modified' | 'title' | 'author';
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
  includeMetadata?: string;
  tags?: string;
  categories?: string;
}

/**
 * Batch operation request schema
 */
const batchOperationSchema = z.object({
  action: z.enum(['publish', 'delete', 'update_status', 'duplicate', 'archive']),
  post_ids: z.array(z.number().int().positive()).min(1).max(100),
  target_status: z.enum(['draft', 'publish', 'private']).optional(),
  options: z.object({
    reason: z.string().max(500).optional(),
    changed_by: z.string().max(255).optional(),
    skip_validation: z.boolean().default(false),
    notify_author: z.boolean().default(false),
    preserve_metadata: z.boolean().default(true),
    update_modified_date: z.boolean().default(true)
  }).optional(),
  filters: z.object({
    only_drafts: z.boolean().default(true),
    exclude_auto_drafts: z.boolean().default(true),
    minimum_word_count: z.number().int().min(0).optional(),
    require_featured_image: z.boolean().optional()
  }).optional()
});

/**
 * Draft analytics response interface
 */
interface DraftAnalytics {
  summary: {
    total_drafts: number;
    total_private: number;
    total_published: number;
    drafts_modified_last_week: number;
    drafts_modified_last_month: number;
    average_words_per_draft: number;
    drafts_with_images: number;
    drafts_without_categories: number;
  };
  trends: {
    drafts_created_by_month: Array<{ month: string; count: number }>;
    draft_to_publish_conversion_rate: number;
    average_days_in_draft: number;
  };
  author_breakdown: Array<{
    author_id: number;
    author_name: string;
    draft_count: number;
    published_count: number;
    conversion_rate: number;
  }>;
  content_analysis: {
    most_common_categories: Array<{ name: string; count: number }>;
    most_common_tags: Array<{ name: string; count: number }>;
    word_count_distribution: {
      under_100: number;
      "100_500": number;
      "500_1000": number;
      "1000_2000": number;
      over_2000: number;
    };
  };
}

/**
 * Draft workflow response interface
 */
interface DraftWorkflowResponse {
  success: boolean;
  data?: {
    posts?: PostWithStatus[];
    total_count?: number;
    status_distribution?: Record<PostStatus, number>;
    analytics?: DraftAnalytics;
    batch_results?: {
      successful: number;
      failed: number;
      skipped: number;
      results: Array<{
        post_id: number;
        title: string;
        success: boolean;
        error?: string;
        new_status?: PostStatus;
      }>;
    };
    query_info?: {
      action: string;
      filters_applied: string[];
      processing_time_ms: number;
      total_pages?: number;
      current_page?: number;
    };
    export_url?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  warnings?: string[];
  request_id?: string;
}

async function draftWorkflowHandler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Set request ID for error correlation
  ErrorHandler.setRequestId(requestId);
  
  // Log incoming request
  requestResponseLogger.logRequest(req, requestId);

  // Apply middleware (CORS, security headers, rate limiting)
  applyMiddleware(req, res, () => {
    // Middleware will handle the request
  });

  try {
    const method = req.method;
    let action = 'list';
    let query: DraftQueryParams = {};
    let batchData: any = null;

    // Parse request based on method
    if (method === 'GET') {
      query = req.query as DraftQueryParams;
      action = query.action || 'list';
    } else if (method === 'POST') {
      action = 'batch_update';
      const validationResult = batchOperationSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessages = validationResult.error.errors.map(
          (err) => `${err.path.join('.')}: ${err.message}`
        );
        
        throw new ApiError(
          'VALIDATION_ERROR',
          'Invalid batch operation request',
          400,
          errorMessages
        );
      }
      
      batchData = validationResult.data;
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      throw new ApiError('METHOD_NOT_ALLOWED', 'Method not allowed', 405);
    }

    logger.info('Processing draft workflow request', {
      requestId,
      action,
      method,
      queryParams: Object.keys(query).length,
      batchPostCount: batchData?.post_ids?.length || 0
    });

    // Initialize WordPress post status integration service
    const statusService = createWordPressPostStatusIntegrationService({
      wordpressUrl: process.env.WORDPRESS_URL!,
      username: process.env.WORDPRESS_USERNAME!,
      password: process.env.WORDPRESS_APP_PASSWORD!,
      enableStatusHistory: true,
      enableStatusValidation: true,
      enableMetadataTracking: true
    });

    let response: DraftWorkflowResponse;

    switch (action) {
      case 'list':
        response = await handleListDrafts(statusService, query, requestId);
        break;
      case 'analytics':
        response = await handleDraftAnalytics(statusService, query, requestId);
        break;
      case 'export':
        response = await handleExportDrafts(statusService, query, requestId);
        break;
      case 'batch_update':
        response = await handleBatchOperations(statusService, batchData, requestId);
        break;
      default:
        throw new ApiError(
          'INVALID_ACTION',
          'Invalid action specified',
          400,
          `Action must be one of: list, analytics, export, batch_update. Got: ${action}`
        );
    }

    const processingTime = Date.now() - startTime;
    
    // Add processing time to response
    if (response.data) {
      response.data.query_info = {
        ...response.data.query_info,
        processing_time_ms: processingTime
      };
    }

    response.request_id = requestId;

    // Update application monitoring
    applicationMonitor.recordRequest({
      method,
      endpoint: '/api/workflow/drafts',
      statusCode: 200,
      responseTime: processingTime,
      success: true,
      requestId
    });

    // Log successful response
    requestResponseLogger.logResponse(res, response, requestId, processingTime);

    logger.info('Draft workflow request completed successfully', {
      requestId,
      action,
      processingTime,
      success: response.success,
      dataSize: response.data ? Object.keys(response.data).length : 0
    });

    res.status(200).json(response);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    // Update application monitoring for error
    applicationMonitor.recordRequest({
      method: req.method,
      endpoint: '/api/workflow/drafts',
      statusCode: error instanceof ApiError ? error.statusCode : 500,
      responseTime: processingTime,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId
    });

    const handledError = ErrorHandler.handleError(error);
    
    // Log error response
    requestResponseLogger.logResponse(res, handledError, requestId, processingTime);

    logger.error('Error in draft workflow endpoint', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime
    });

    res.status(handledError.statusCode).json(handledError);
  }
}

/**
 * Handle listing drafts with filtering and pagination
 */
async function handleListDrafts(
  statusService: any,
  query: DraftQueryParams,
  requestId: string
): Promise<DraftWorkflowResponse> {
  // Parse query parameters
  let statusFilter: PostStatus[] = ['draft']; // Default to drafts
  if (query.status) {
    const statusValues = Array.isArray(query.status) ? query.status : [query.status];
    statusFilter = [];
    
    for (const status of statusValues) {
      if (!['draft', 'publish', 'private'].includes(status)) {
        throw new ApiError(
          'VALIDATION_ERROR',
          'Invalid status parameter',
          400,
          `Status must be one of: draft, publish, private. Got: ${status}`
        );
      }
      statusFilter.push(status as PostStatus);
    }
  }

  const limit = query.limit ? parseInt(query.limit, 10) : 20;
  const offset = query.offset ? parseInt(query.offset, 10) : 0;
  const author = query.author ? parseInt(query.author, 10) : undefined;

  // Validate numeric parameters
  if (isNaN(limit) || limit < 1 || limit > 100) {
    throw new ApiError(
      'VALIDATION_ERROR',
      'Invalid limit parameter',
      400,
      'Limit must be between 1 and 100'
    );
  }

  if (isNaN(offset) || offset < 0) {
    throw new ApiError(
      'VALIDATION_ERROR',
      'Invalid offset parameter',
      400,
      'Offset must be 0 or greater'
    );
  }

  // Build query options
  const queryOptions: WordPressPostStatusQueryOptions = {
    status: statusFilter,
    limit,
    offset,
    search: query.search,
    author,
    sortBy: query.sortBy || 'modified',
    sortOrder: query.sortOrder || 'desc',
    includeStatusHistory: query.includeMetadata === 'true'
  };

  // Add date filters if provided
  if (query.dateFrom || query.dateTo) {
    queryOptions.dateQuery = {};
    if (query.dateFrom) {
      queryOptions.dateQuery.after = query.dateFrom;
    }
    if (query.dateTo) {
      queryOptions.dateQuery.before = query.dateTo;
    }
  }

  // Query posts with status filtering
  const result = await statusService.queryPostsByStatus(queryOptions, requestId);

  if (!result.success) {
    throw new ApiError(
      'WORDPRESS_API_ERROR',
      result.error?.message || 'Failed to fetch posts',
      500,
      result.error?.details
    );
  }

  // Transform posts to include enhanced display information
  const enhancedPosts = (result.posts || []).map((post: PostWithStatus) => ({
    ...post,
    status_display: {
      label: getStatusLabel(post.status),
      icon: getStatusIcon(post.status),
      color: getStatusColor(post.status),
      description: getStatusDescription(post.status),
      can_publish: post.status === 'draft' && isStatusTransitionAllowed(post.status, 'publish'),
      can_make_private: isStatusTransitionAllowed(post.status, 'private'),
      can_revert_to_draft: post.status === 'publish' && isStatusTransitionAllowed(post.status, 'draft')
    },
    workflow_actions: generateWorkflowActions(post)
  }));

  // Build filters applied list
  const filtersApplied: string[] = [];
  if (statusFilter.length > 0) {
    filtersApplied.push(`status: ${statusFilter.join(', ')}`);
  }
  if (query.search) {
    filtersApplied.push(`search: "${query.search}"`);
  }
  if (author) {
    filtersApplied.push(`author: ${author}`);
  }
  if (query.dateFrom || query.dateTo) {
    filtersApplied.push(`date range: ${query.dateFrom || 'any'} to ${query.dateTo || 'any'}`);
  }

  const totalPages = Math.ceil((result.totalCount || 0) / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return {
    success: true,
    data: {
      posts: enhancedPosts,
      total_count: result.totalCount || 0,
      status_distribution: result.statusDistribution || { draft: 0, publish: 0, private: 0 },
      query_info: {
        action: 'list',
        filters_applied: filtersApplied,
        processing_time_ms: 0, // Will be set by caller
        total_pages: totalPages,
        current_page: currentPage
      }
    }
  };
}

/**
 * Handle draft analytics and reporting
 */
async function handleDraftAnalytics(
  statusService: any,
  query: DraftQueryParams,
  requestId: string
): Promise<DraftWorkflowResponse> {
  // This is a simplified implementation - in a real scenario, you'd query more detailed analytics
  
  // Get all posts for analytics
  const allPostsResult = await statusService.queryPostsByStatus({
    status: ['draft', 'publish', 'private'],
    limit: 1000, // Get a large sample for analytics
    includeStatusHistory: true
  }, requestId);

  if (!allPostsResult.success) {
    throw new ApiError(
      'WORDPRESS_API_ERROR',
      'Failed to fetch posts for analytics',
      500,
      allPostsResult.error?.details
    );
  }

  const posts = allPostsResult.posts || [];
  const drafts = posts.filter((p: PostWithStatus) => p.status === 'draft');
  const published = posts.filter((p: PostWithStatus) => p.status === 'publish');
  const privateposts = posts.filter((p: PostWithStatus) => p.status === 'private');

  // Calculate analytics
  const analytics: DraftAnalytics = {
    summary: {
      total_drafts: drafts.length,
      total_private: privateposts.length,
      total_published: published.length,
      drafts_modified_last_week: drafts.filter(p => 
        new Date(p.modified || p.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length,
      drafts_modified_last_month: drafts.filter(p => 
        new Date(p.modified || p.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length,
      average_words_per_draft: Math.round(
        drafts.reduce((sum, p) => sum + (p.content?.split(' ').length || 0), 0) / Math.max(drafts.length, 1)
      ),
      drafts_with_images: drafts.filter(p => p.featured_media && p.featured_media > 0).length,
      drafts_without_categories: drafts.filter(p => !p.categories || p.categories.length === 0).length
    },
    trends: {
      drafts_created_by_month: [], // Would calculate month-by-month breakdown
      draft_to_publish_conversion_rate: published.length / Math.max(drafts.length + published.length, 1) * 100,
      average_days_in_draft: 0 // Would calculate based on status history
    },
    author_breakdown: [], // Would group by author and calculate stats
    content_analysis: {
      most_common_categories: [], // Would analyze category usage
      most_common_tags: [], // Would analyze tag usage
      word_count_distribution: {
        under_100: drafts.filter(p => (p.content?.split(' ').length || 0) < 100).length,
        "100_500": drafts.filter(p => {
          const wordCount = p.content?.split(' ').length || 0;
          return wordCount >= 100 && wordCount < 500;
        }).length,
        "500_1000": drafts.filter(p => {
          const wordCount = p.content?.split(' ').length || 0;
          return wordCount >= 500 && wordCount < 1000;
        }).length,
        "1000_2000": drafts.filter(p => {
          const wordCount = p.content?.split(' ').length || 0;
          return wordCount >= 1000 && wordCount < 2000;
        }).length,
        over_2000: drafts.filter(p => (p.content?.split(' ').length || 0) >= 2000).length
      }
    }
  };

  return {
    success: true,
    data: {
      analytics,
      query_info: {
        action: 'analytics',
        filters_applied: ['all_posts'],
        processing_time_ms: 0
      }
    }
  };
}

/**
 * Handle exporting drafts
 */
async function handleExportDrafts(
  statusService: any,
  query: DraftQueryParams,
  requestId: string
): Promise<DraftWorkflowResponse> {
  // Get drafts for export
  const result = await statusService.queryPostsByStatus({
    status: ['draft'],
    limit: 1000 // Export all drafts
  }, requestId);

  if (!result.success) {
    throw new ApiError(
      'WORDPRESS_API_ERROR',
      'Failed to fetch drafts for export',
      500,
      result.error?.details
    );
  }

  // In a real implementation, you would:
  // 1. Generate CSV/JSON export file
  // 2. Upload to storage (S3, etc.)
  // 3. Return download URL
  
  const exportData = {
    export_timestamp: new Date().toISOString(),
    total_drafts: result.posts?.length || 0,
    drafts: (result.posts || []).map((post: PostWithStatus) => ({
      id: post.id,
      title: post.title,
      content_length: post.content?.length || 0,
      created: post.date,
      modified: post.modified,
      author: post.author,
      categories: post.categories,
      tags: post.tags
    }))
  };

  // In production, this would be a real URL to download the export
  const exportUrl = `${process.env.API_BASE_URL}/exports/drafts-${requestId}.json`;

  return {
    success: true,
    data: {
      export_url: exportUrl,
      query_info: {
        action: 'export',
        filters_applied: ['draft_status'],
        processing_time_ms: 0
      }
    }
  };
}

/**
 * Handle batch operations on multiple posts
 */
async function handleBatchOperations(
  statusService: any,
  batchData: any,
  requestId: string
): Promise<DraftWorkflowResponse> {
  const { action, post_ids, target_status, options = {}, filters = {} } = batchData;
  
  logger.info('Processing batch operation', {
    requestId,
    action,
    postCount: post_ids.length,
    targetStatus: target_status
  });

  const results: Array<{
    post_id: number;
    title: string;
    success: boolean;
    error?: string;
    new_status?: PostStatus;
  }> = [];

  let successful = 0;
  let failed = 0;
  let skipped = 0;

  // Process each post
  for (const postId of post_ids) {
    try {
      let result: any = { success: false };
      let postTitle = `Post ${postId}`;

      // Get current post information
      try {
        const currentPostResult = await statusService.queryPostsByStatus({
          status: ['draft', 'publish', 'private'],
          postId: postId
        }, requestId);
        
        if (currentPostResult.success && currentPostResult.posts?.length > 0) {
          const currentPost = currentPostResult.posts[0];
          postTitle = currentPost.title || postTitle;
          
          // Apply filters
          if (filters.only_drafts && currentPost.status !== 'draft') {
            skipped++;
            results.push({
              post_id: postId,
              title: postTitle,
              success: false,
              error: 'Skipped: Post is not a draft'
            });
            continue;
          }

          if (filters.minimum_word_count && (currentPost.content?.split(' ').length || 0) < filters.minimum_word_count) {
            skipped++;
            results.push({
              post_id: postId,
              title: postTitle,
              success: false,
              error: `Skipped: Post does not meet minimum word count (${filters.minimum_word_count})`
            });
            continue;
          }

          if (filters.require_featured_image && (!currentPost.featured_media || currentPost.featured_media === 0)) {
            skipped++;
            results.push({
              post_id: postId,
              title: postTitle,
              success: false,
              error: 'Skipped: Post does not have a featured image'
            });
            continue;
          }
        }
      } catch (error) {
        // Continue with operation even if we can't get current post info
      }

      // Perform the batch action
      switch (action) {
        case 'publish':
        case 'update_status':
          if (target_status) {
            result = await statusService.updatePostStatus({
              postId: postId,
              newStatus: target_status,
              reason: options.reason || `Batch ${action} operation`,
              changedBy: options.changed_by || 'batch_operation'
            }, requestId);

            if (result.success) {
              results.push({
                post_id: postId,
                title: postTitle,
                success: true,
                new_status: result.newStatus
              });
              successful++;
            } else {
              results.push({
                post_id: postId,
                title: postTitle,
                success: false,
                error: result.error || 'Status update failed'
              });
              failed++;
            }
          } else {
            results.push({
              post_id: postId,
              title: postTitle,
              success: false,
              error: 'No target status specified'
            });
            failed++;
          }
          break;

        case 'delete':
          // Note: This would require implementing delete functionality in the status service
          results.push({
            post_id: postId,
            title: postTitle,
            success: false,
            error: 'Delete operation not implemented'
          });
          failed++;
          break;

        case 'duplicate':
          // Note: This would require implementing duplicate functionality
          results.push({
            post_id: postId,
            title: postTitle,
            success: false,
            error: 'Duplicate operation not implemented'
          });
          failed++;
          break;

        case 'archive':
          // Archive is essentially setting to private status
          result = await statusService.updatePostStatus({
            postId: postId,
            newStatus: 'private',
            reason: options.reason || 'Batch archive operation',
            changedBy: options.changed_by || 'batch_operation'
          }, requestId);

          if (result.success) {
            results.push({
              post_id: postId,
              title: postTitle,
              success: true,
              new_status: 'private'
            });
            successful++;
          } else {
            results.push({
              post_id: postId,
              title: postTitle,
              success: false,
              error: result.error || 'Archive operation failed'
            });
            failed++;
          }
          break;

        default:
          results.push({
            post_id: postId,
            title: postTitle,
            success: false,
            error: `Unknown action: ${action}`
          });
          failed++;
          break;
      }

    } catch (error) {
      results.push({
        post_id: postId,
        title: `Post ${postId}`,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      failed++;
    }
  }

  const warnings: string[] = [];
  if (skipped > 0) {
    warnings.push(`${skipped} posts were skipped due to filters`);
  }
  if (failed > 0) {
    warnings.push(`${failed} operations failed`);
  }

  return {
    success: true,
    data: {
      batch_results: {
        successful,
        failed,
        skipped,
        results
      },
      query_info: {
        action: 'batch_update',
        filters_applied: [`batch_action: ${action}`, `posts: ${post_ids.length}`],
        processing_time_ms: 0
      }
    },
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Generate available workflow actions for a post
 */
function generateWorkflowActions(post: PostWithStatus): Array<{
  action: string;
  label: string;
  description: string;
  available: boolean;
  target_status?: PostStatus;
}> {
  const actions = [
    {
      action: 'publish',
      label: '🚀 Publish',
      description: 'Make this post publicly visible',
      available: post.status === 'draft' && isStatusTransitionAllowed(post.status, 'publish'),
      target_status: 'publish' as PostStatus
    },
    {
      action: 'make_private',
      label: '🔒 Make Private',
      description: 'Set post to private (authorized access only)',
      available: isStatusTransitionAllowed(post.status, 'private'),
      target_status: 'private' as PostStatus
    },
    {
      action: 'revert_to_draft',
      label: '📝 Revert to Draft',
      description: 'Change post back to draft status',
      available: post.status === 'publish' && isStatusTransitionAllowed(post.status, 'draft'),
      target_status: 'draft' as PostStatus
    },
    {
      action: 'duplicate',
      label: '📄 Duplicate',
      description: 'Create a copy of this post as a new draft',
      available: true
    },
    {
      action: 'preview',
      label: '👁️ Preview',
      description: 'Preview the post content',
      available: true
    },
    {
      action: 'edit',
      label: '✏️ Edit',
      description: 'Edit post content in WordPress',
      available: true
    }
  ];

  return actions;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Authenticate request
    const authResult = await authenticateApiKey(req, res);
    if (!authResult.success) {
      return; // Response already sent by auth middleware
    }

    // Process authenticated request
    await draftWorkflowHandler(req as AuthenticatedRequest, res);
  } catch (error) {
    const handledError = ErrorHandler.handleError(error);
    res.status(handledError.statusCode).json(handledError);
  }
}
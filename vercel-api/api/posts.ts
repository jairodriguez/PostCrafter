import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticateApiKey, AuthenticatedRequest } from '../src/middleware/auth';
import { applyMiddleware } from '../src/middleware/cors';
import { logger } from '../src/utils/logger';
import { 
  createWordPressPostStatusIntegrationService,
  WordPressPostStatusQueryOptions
} from '../src/services/wordpress-post-status-integration';
import { 
  PostStatus,
  PostWithStatus,
  getStatusLabel,
  getStatusDescription,
  getStatusIcon,
  getStatusColor
} from '../src/types/post-status';
import ErrorHandler from '../src/middleware/error-handler';
import { requestResponseLogger } from '../src/middleware/request-response-logger';
import { applicationMonitor } from '../src/utils/application-monitor';
import { ApiError } from '../src/types';

/**
 * Posts query parameters interface
 */
interface PostsQueryParams {
  status?: string | string[];
  limit?: string;
  offset?: string;
  search?: string;
  author?: string;
  sortBy?: 'date' | 'modified' | 'status_changed';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Posts response with visual indicators
 */
interface PostsWithStatusIndicators extends PostWithStatus {
  status_display: {
    label: string;
    color: string;
    icon: string;
    description: string;
    badge_style: {
      background: string;
      border: string;
      text_color: string;
    };
  };
}

/**
 * Posts API response
 */
interface PostsApiResponse {
  success: boolean;
  data?: {
    posts: PostsWithStatusIndicators[];
    total_count: number;
    status_distribution: Record<PostStatus, number>;
    query_info: {
      limit: number;
      offset: number;
      filters_applied: string[];
      search_query?: string;
    };
    processing_time_ms: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  request_id?: string;
}

async function postsHandler(
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

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    throw new ApiError('METHOD_NOT_ALLOWED', 'Method not allowed', 405);
  }

  try {
    // Parse query parameters
    const query = req.query as PostsQueryParams;
    
    // Validate and parse status parameter
    let statusFilter: PostStatus[] | undefined;
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

    // Validate and parse numeric parameters
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;
    const author = query.author ? parseInt(query.author, 10) : undefined;

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

    if (author !== undefined && (isNaN(author) || author < 1)) {
      throw new ApiError(
        'VALIDATION_ERROR',
        'Invalid author parameter',
        400,
        'Author must be a positive integer'
      );
    }

    // Validate search parameter
    if (query.search && query.search.length > 200) {
      throw new ApiError(
        'VALIDATION_ERROR',
        'Invalid search parameter',
        400,
        'Search query must be 200 characters or less'
      );
    }

    // Validate sort parameters
    const sortBy = query.sortBy || 'date';
    const sortOrder = query.sortOrder || 'desc';

    if (!['date', 'modified', 'status_changed'].includes(sortBy)) {
      throw new ApiError(
        'VALIDATION_ERROR',
        'Invalid sortBy parameter',
        400,
        'sortBy must be one of: date, modified, status_changed'
      );
    }

    if (!['asc', 'desc'].includes(sortOrder)) {
      throw new ApiError(
        'VALIDATION_ERROR',
        'Invalid sortOrder parameter',
        400,
        'sortOrder must be either asc or desc'
      );
    }

    logger.info('Processing posts query request', {
      requestId,
      statusFilter,
      limit,
      offset,
      search: query.search?.substring(0, 50),
      author,
      sortBy,
      sortOrder
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

    // Build query options
    const queryOptions: WordPressPostStatusQueryOptions = {
      status: statusFilter,
      limit,
      offset,
      search: query.search,
      author,
      sortBy,
      sortOrder
    };

    // Query posts with status filtering
    const result = await statusService.queryPostsByStatus(queryOptions, requestId);

    if (!result.success) {
      const errorMessage = result.error?.message || 'Failed to fetch posts';
      const errorCode = result.error?.code || 'WORDPRESS_API_ERROR';
      
      logger.error('Posts query failed', {
        requestId,
        errorCode,
        errorMessage,
        queryOptions
      });

      throw new ApiError(errorCode, errorMessage, 500, result.error?.details);
    }

    // Transform posts to include visual status indicators
    const postsWithIndicators: PostsWithStatusIndicators[] = (result.posts || []).map(post => {
      const statusInfo = getStatusDisplayInfo(post.status);
      
      return {
        ...post,
        status_display: {
          label: statusInfo.label,
          color: statusInfo.color,
          icon: statusInfo.icon,
          description: statusInfo.description,
          badge_style: {
            background: statusInfo.badgeBackground,
            border: statusInfo.color,
            text_color: statusInfo.textColor
          }
        }
      };
    });

    // Build filters applied list
    const filtersApplied: string[] = [];
    if (statusFilter && statusFilter.length > 0) {
      filtersApplied.push(`status: ${statusFilter.join(', ')}`);
    }
    if (query.search) {
      filtersApplied.push(`search: "${query.search}"`);
    }
    if (author) {
      filtersApplied.push(`author: ${author}`);
    }
    if (sortBy !== 'date' || sortOrder !== 'desc') {
      filtersApplied.push(`sort: ${sortBy} ${sortOrder}`);
    }

    const processingTime = Date.now() - startTime;

    const response: PostsApiResponse = {
      success: true,
      data: {
        posts: postsWithIndicators,
        total_count: result.totalCount || 0,
        status_distribution: result.statusDistribution || { draft: 0, publish: 0, private: 0 },
        query_info: {
          limit,
          offset,
          filters_applied: filtersApplied,
          search_query: query.search
        },
        processing_time_ms: processingTime
      },
      request_id: requestId
    };

    // Update application monitoring
    applicationMonitor.recordRequest({
      method: 'GET',
      endpoint: '/api/posts',
      statusCode: 200,
      responseTime: processingTime,
      success: true,
      requestId
    });

    // Log successful response
    requestResponseLogger.logResponse(res, response, requestId, processingTime);

    logger.info('Posts query completed successfully', {
      requestId,
      postsReturned: postsWithIndicators.length,
      totalCount: result.totalCount,
      statusDistribution: result.statusDistribution,
      processingTime,
      filtersApplied
    });

    res.status(200).json(response);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    // Update application monitoring for error
    applicationMonitor.recordRequest({
      method: 'GET',
      endpoint: '/api/posts',
      statusCode: error instanceof ApiError ? error.statusCode : 500,
      responseTime: processingTime,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId
    });

    const handledError = ErrorHandler.handleError(error);
    
    // Log error response
    requestResponseLogger.logResponse(res, handledError, requestId, processingTime);

    logger.error('Error in posts endpoint', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime
    });

    res.status(handledError.statusCode).json(handledError);
  }
}

/**
 * Get status display information for UI components
 */
function getStatusDisplayInfo(status: PostStatus): {
  label: string;
  color: string;
  icon: string;
  description: string;
  badgeBackground: string;
  textColor: string;
} {
  const baseInfo = {
    label: getStatusLabel(status),
    color: getStatusColor(status),
    icon: getStatusIcon(status),
    description: getStatusDescription(status)
  };

  // Define badge styling based on status
  const badgeStyles = {
    draft: {
      badgeBackground: '#fef3c7', // amber-100
      textColor: '#92400e' // amber-800
    },
    publish: {
      badgeBackground: '#d1fae5', // green-100
      textColor: '#065f46' // green-800
    },
    private: {
      badgeBackground: '#e0e7ff', // indigo-100
      textColor: '#3730a3' // indigo-800
    }
  };

  return {
    ...baseInfo,
    ...badgeStyles[status]
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Authenticate request
    const authResult = await authenticateApiKey(req, res);
    if (!authResult.success) {
      return; // Response already sent by auth middleware
    }

    // Process authenticated request
    await postsHandler(req as AuthenticatedRequest, res);
  } catch (error) {
    const handledError = ErrorHandler.handleError(error);
    res.status(handledError.statusCode).json(handledError);
  }
}
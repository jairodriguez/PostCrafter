import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { authenticateApiKey, AuthenticatedRequest } from '../../src/middleware/auth';
import { applyMiddleware } from '../../src/middleware/cors';
import { logger } from '../../src/utils/logger';
import { 
  createWordPressPostStatusIntegrationService
} from '../../src/services/wordpress-post-status-integration';
import { 
  PostStatus,
  PostStatusUpdateRequest,
  validatePostStatus,
  isStatusTransitionAllowed,
  getStatusLabel,
  getStatusDescription,
  getStatusIcon,
  getStatusColor
} from '../../src/types/post-status';
import ErrorHandler from '../../src/middleware/error-handler';
import { requestResponseLogger } from '../../src/middleware/request-response-logger';
import { applicationMonitor } from '../../src/utils/application-monitor';
import { ApiError } from '../../src/types';

/**
 * Post status update request schema
 */
const postStatusUpdateSchema = z.object({
  post_id: z.number().int().positive(),
  new_status: z.enum(['draft', 'publish', 'private']),
  reason: z.string().max(500).optional(),
  changed_by: z.string().max(255).optional(),
  validate_transition: z.boolean().default(true),
  include_metadata: z.boolean().default(true)
});

/**
 * Post status update response
 */
interface PostStatusUpdateResponse {
  success: boolean;
  data?: {
    post_id: number;
    previous_status: PostStatus;
    new_status: PostStatus;
    timestamp: string;
    wordpress_post_id?: number;
    status_display: {
      previous: {
        label: string;
        icon: string;
        color: string;
        description: string;
      };
      new: {
        label: string;
        icon: string;
        color: string;
        description: string;
      };
    };
    transition_info: {
      allowed: boolean;
      reason?: string;
      changed_by?: string;
      validation_performed: boolean;
    };
    processing_time_ms: number;
    post_url?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  warnings?: string[];
  request_id?: string;
}

async function postStatusUpdateHandler(
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

  // Only allow PUT requests
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    throw new ApiError('METHOD_NOT_ALLOWED', 'Method not allowed', 405);
  }

  try {
    // Validate request body
    const validationResult = postStatusUpdateSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      );
      
      throw new ApiError(
        'VALIDATION_ERROR',
        'Invalid request data',
        400,
        errorMessages
      );
    }

    const updateData = validationResult.data;
    
    logger.info('Processing post status update request', {
      requestId,
      postId: updateData.post_id,
      newStatus: updateData.new_status,
      reason: updateData.reason?.substring(0, 100),
      changedBy: updateData.changed_by,
      validateTransition: updateData.validate_transition
    });

    // Validate the new status
    const statusValidation = validatePostStatus(updateData.new_status);
    if (!statusValidation.isValid) {
      throw new ApiError(
        'STATUS_VALIDATION_ERROR',
        'Invalid post status',
        400,
        statusValidation.error
      );
    }

    // Initialize WordPress post status integration service
    const statusService = createWordPressPostStatusIntegrationService({
      wordpressUrl: process.env.WORDPRESS_URL!,
      username: process.env.WORDPRESS_USERNAME!,
      password: process.env.WORDPRESS_APP_PASSWORD!,
      enableStatusHistory: updateData.include_metadata,
      enableStatusValidation: updateData.validate_transition,
      enableMetadataTracking: updateData.include_metadata
    });

    // Create status update request
    const statusUpdateRequest: PostStatusUpdateRequest = {
      postId: updateData.post_id,
      newStatus: updateData.new_status,
      reason: updateData.reason,
      changedBy: updateData.changed_by
    };

    // Update post status
    const result = await statusService.updatePostStatus(statusUpdateRequest, requestId);

    if (!result.success) {
      const errorMessage = result.error || 'Failed to update post status';
      
      logger.error('Post status update failed', {
        requestId,
        postId: updateData.post_id,
        newStatus: updateData.new_status,
        errorMessage
      });

      throw new ApiError(
        'STATUS_UPDATE_ERROR',
        'Failed to update post status',
        500,
        errorMessage
      );
    }

    // Get status display information for both previous and new status
    const previousStatusDisplay = getStatusDisplayInfo(result.previousStatus);
    const newStatusDisplay = getStatusDisplayInfo(result.newStatus);

    // Check if transition was allowed (for informational purposes)
    const transitionAllowed = updateData.validate_transition 
      ? isStatusTransitionAllowed(result.previousStatus, result.newStatus)
      : true;

    const processingTime = Date.now() - startTime;

    // Build response with enhanced status information
    const response: PostStatusUpdateResponse = {
      success: true,
      data: {
        post_id: updateData.post_id,
        previous_status: result.previousStatus,
        new_status: result.newStatus,
        timestamp: result.timestamp,
        wordpress_post_id: result.wordpressPostId,
        status_display: {
          previous: previousStatusDisplay,
          new: newStatusDisplay
        },
        transition_info: {
          allowed: transitionAllowed,
          reason: updateData.reason,
          changed_by: updateData.changed_by,
          validation_performed: updateData.validate_transition
        },
        processing_time_ms: processingTime,
        post_url: result.wordpressPostId 
          ? `${process.env.WORDPRESS_URL}/?p=${result.wordpressPostId}` 
          : undefined
      },
      request_id: requestId
    };

    // Add warnings if any
    const warnings: string[] = [];
    
    if (!transitionAllowed && updateData.validate_transition) {
      warnings.push(`Status transition from "${result.previousStatus}" to "${result.newStatus}" may not be recommended`);
    }
    
    if (result.newStatus === 'publish' && result.previousStatus === 'draft') {
      warnings.push('Post is now publicly visible. Consider reviewing content and SEO settings.');
    }
    
    if (result.newStatus === 'private' && result.previousStatus === 'publish') {
      warnings.push('Post is no longer publicly visible. Only authorized users can access it.');
    }

    if (warnings.length > 0) {
      response.warnings = warnings;
    }

    // Update application monitoring
    applicationMonitor.recordRequest({
      method: 'PUT',
      endpoint: '/api/posts/status',
      statusCode: 200,
      responseTime: processingTime,
      success: true,
      requestId
    });

    // Log successful response
    requestResponseLogger.logResponse(res, response, requestId, processingTime);

    logger.info('Post status updated successfully', {
      requestId,
      postId: updateData.post_id,
      previousStatus: result.previousStatus,
      newStatus: result.newStatus,
      processingTime,
      wordpressPostId: result.wordpressPostId,
      transitionAllowed,
      warningsCount: warnings.length
    });

    res.status(200).json(response);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    // Update application monitoring for error
    applicationMonitor.recordRequest({
      method: 'PUT',
      endpoint: '/api/posts/status',
      statusCode: error instanceof ApiError ? error.statusCode : 500,
      responseTime: processingTime,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId
    });

    const handledError = ErrorHandler.handleError(error);
    
    // Log error response
    requestResponseLogger.logResponse(res, handledError, requestId, processingTime);

    logger.error('Error in post status update endpoint', {
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
  icon: string;
  color: string;
  description: string;
} {
  return {
    label: getStatusLabel(status),
    icon: getStatusIcon(status),
    color: getStatusColor(status),
    description: getStatusDescription(status)
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
    await postStatusUpdateHandler(req as AuthenticatedRequest, res);
  } catch (error) {
    const handledError = ErrorHandler.handleError(error);
    res.status(handledError.statusCode).json(handledError);
  }
}
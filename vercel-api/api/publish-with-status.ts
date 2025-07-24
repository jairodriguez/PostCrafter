import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { PublishRequest, PublishResponse, ApiError, ValidationError } from '../src/types';
import { authenticateApiKey, AuthenticatedRequest } from '../src/middleware/auth';
import { applyMiddleware } from '../src/middleware/cors';
import { 
  validateRequest, 
  securePublishRequestSchema, 
  validateImageData,
  detectMaliciousContent 
} from '../src/utils/validation';
import { secureLog } from '../src/utils/env';
import { 
  createWordPressPostStatusIntegrationService,
  WordPressPostStatusIntegrationService,
  PostCreationWithStatusRequest
} from '../src/services/wordpress-post-status-integration';
import { 
  postStatusUtils, 
  PostStatusMetadata 
} from '../src/types/post-status';
import ErrorHandler from '../src/middleware/error-handler';
import { requestResponseLogger } from '../src/middleware/request-response-logger';
import { applicationMonitor } from '../src/utils/application-monitor';

/**
 * Enhanced publish request with status support
 */
interface EnhancedPublishRequest extends PublishRequest {
  post: PublishRequest['post'] & {
    status?: 'draft' | 'publish' | 'private';
    statusChangeReason?: string;
    statusChangedBy?: string;
  };
  options?: PublishRequest['options'] & {
    validateStatusTransition?: boolean;
    enableStatusHistory?: boolean;
    enableMetadataTracking?: boolean;
  };
}

/**
 * Enhanced publish response with status information
 */
interface EnhancedPublishResponse extends PublishResponse {
  data?: PublishResponse['data'] & {
    status_metadata?: PostStatusMetadata;
    status_transition?: {
      from: string;
      to: string;
      timestamp: string;
      reason?: string;
    };
    status_warnings?: string[];
  };
}

async function publishWithStatusHandler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Set request ID for error correlation
  ErrorHandler.setRequestId(requestId);
  
  // Log incoming request
  requestResponseLogger.logRequest(req, requestId);

  // Apply middleware (CORS, security headers, rate limiting, authentication)
  applyMiddleware(req, res, () => {
    // Middleware will handle the request
  });

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    throw new ApiError('METHOD_NOT_ALLOWED', 'Method not allowed', 405);
  }

  // Validate request body
  const validationResult = validateRequest(req, securePublishRequestSchema);
  if (!validationResult.valid) {
    throw ErrorHandler.formatValidationError(validationResult.errors);
  }

  const publishData: EnhancedPublishRequest = validationResult.data;

  // Check for malicious content
  const maliciousContent = detectMaliciousContent(publishData);
  if (maliciousContent.detected) {
    throw new ApiError(
      'SECURITY_VIOLATION', 
      'Malicious content detected', 
      400, 
      `Detected patterns: ${maliciousContent.patterns.join(', ')}`
    );
  }

  // Validate image data if provided
  if (publishData.post.images && publishData.post.images.length > 0) {
    for (const image of publishData.post.images) {
      const imageValidation = validateImageData(image);
      if (!imageValidation.valid) {
        throw new ApiError(
          'IMAGE_VALIDATION_ERROR',
          'Image validation failed',
          400,
          imageValidation.errors.join(', ')
        );
      }
    }
  }

  try {
    // Initialize WordPress post status integration service
    const statusService = createWordPressPostStatusIntegrationService({
      wordpressUrl: process.env.WORDPRESS_URL!,
      username: process.env.WORDPRESS_USERNAME!,
      password: process.env.WORDPRESS_APP_PASSWORD!,
      enableStatusHistory: publishData.options?.enableStatusHistory ?? true,
      enableStatusValidation: true,
      enableMetadataTracking: publishData.options?.enableMetadataTracking ?? true,
      defaultStatus: 'draft'
    });

    // Validate and sanitize status
    const requestedStatus = publishData.post.status || publishData.options?.publish_status || 'draft';
    const statusValidation = postStatusUtils.validate(requestedStatus);
    
    if (!statusValidation.isValid) {
      throw new ApiError(
        'STATUS_VALIDATION_ERROR',
        'Invalid post status',
        400,
        statusValidation.error
      );
    }

    const finalStatus = statusValidation.status!;

    secureLog('info', 'Creating post with enhanced status handling', {
      requestId,
      title: publishData.post.title?.substring(0, 50) + '...',
      requestedStatus,
      finalStatus,
      enableStatusValidation: true,
      enableMetadataTracking: publishData.options?.enableMetadataTracking ?? true
    });

    // Prepare post data with status information
    const postData: PostCreationWithStatusRequest = {
      title: publishData.post.title,
      content: publishData.post.content,
      excerpt: publishData.post.excerpt,
      status: finalStatus,
      author: publishData.post.author || 1,
      slug: publishData.post.slug,
      featured_media: publishData.post.featured_media,
      comment_status: publishData.post.comment_status || 'open',
      ping_status: publishData.post.ping_status || 'open',
      format: publishData.post.format || 'standard',
      template: publishData.post.template,
      sticky: publishData.post.sticky,
      password: publishData.post.password,
      validateStatusTransition: publishData.options?.validateStatusTransition ?? false,
      statusChangeReason: publishData.post.statusChangeReason,
      statusChangedBy: publishData.post.statusChangedBy
    };

    // Create post with enhanced status handling
    const result = await statusService.createPostWithStatus(
      postData,
      {
        include_images: publishData.options?.include_images,
        optimize_images: publishData.options?.optimize_images,
        validate_content: publishData.options?.validate_content
      },
      requestId
    );

    if (!result.success) {
      const errorMessage = result.error?.message || 'Failed to create post';
      const errorCode = result.error?.code || 'WORDPRESS_API_ERROR';
      
      secureLog('error', 'Post creation failed with status integration', {
        requestId,
        errorCode,
        errorMessage,
        statusWarnings: result.statusWarnings
      });

      throw new ApiError(errorCode, errorMessage, 500, result.error?.details);
    }

    const processingTime = Date.now() - startTime;

    // Build enhanced response with status information
    const successResponse: EnhancedPublishResponse = {
      success: true,
      data: {
        post_id: result.postId!,
        post_url: result.postUrl!,
        status: finalStatus,
        message: `Post ${finalStatus === 'publish' ? 'published' : 'saved as ' + finalStatus} successfully`,
        timestamp: new Date().toISOString(),
        featured_image_id: result.postData?.featured_media,
        processing_time_ms: processingTime,
        status_metadata: result.statusMetadata,
        status_transition: result.statusTransition ? {
          from: result.statusTransition.from,
          to: result.statusTransition.to,
          timestamp: result.statusTransition.timestamp,
          reason: result.statusTransition.reason
        } : undefined,
        status_warnings: result.statusWarnings
      }
    };

    // Update application monitoring
    applicationMonitor.recordRequest({
      method: 'POST',
      endpoint: '/api/publish-with-status',
      statusCode: 200,
      responseTime: processingTime,
      success: true,
      requestId
    });

    // Log successful response
    requestResponseLogger.logResponse(res, successResponse, requestId, processingTime);

    secureLog('info', 'Post created successfully with status integration', {
      requestId,
      postId: result.postId,
      postUrl: result.postUrl,
      finalStatus,
      processingTime,
      hasStatusMetadata: !!result.statusMetadata,
      hasStatusTransition: !!result.statusTransition,
      statusWarnings: result.statusWarnings?.length || 0
    });

    res.status(200).json(successResponse);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    // Update application monitoring for error
    applicationMonitor.recordRequest({
      method: 'POST',
      endpoint: '/api/publish-with-status',
      statusCode: error instanceof ApiError ? error.statusCode : 500,
      responseTime: processingTime,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId
    });

    const handledError = ErrorHandler.handleError(error);
    
    // Log error response
    requestResponseLogger.logResponse(res, handledError, requestId, processingTime);

    secureLog('error', 'Error in publish with status endpoint', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTime
    });

    res.status(handledError.statusCode).json(handledError);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Authenticate request
    const authResult = await authenticateApiKey(req, res);
    if (!authResult.success) {
      return; // Response already sent by auth middleware
    }

    // Process authenticated request
    await publishWithStatusHandler(req as AuthenticatedRequest, res);
  } catch (error) {
    const handledError = ErrorHandler.handleError(error);
    res.status(handledError.statusCode).json(handledError);
  }
}
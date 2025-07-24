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
import { createWordPressPostService } from '../src/utils/wordpress-posts';
import { 
  createWordPressPostStatusIntegrationService 
} from '../src/services/wordpress-post-status-integration';
import { 
  PostStatus,
  validatePostStatus,
  getStatusLabel,
  getStatusDescription
} from '../src/types/post-status';
import ErrorHandler from '../src/middleware/error-handler';
import { requestResponseLogger } from '../src/middleware/request-response-logger';
import { applicationMonitor } from '../src/utils/application-monitor';

async function publishHandler(
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

  // Enhanced validation schema with status parameter
  const enhancedPublishRequestSchema = securePublishRequestSchema.extend({
    status: z.enum(['draft', 'publish', 'private']).default('draft').optional(),
    status_metadata: z.object({
      reason: z.string().max(500).optional(),
      changed_by: z.string().max(255).optional()
    }).optional()
  });

  // Validate request body
  const validationResult = validateRequest(req, enhancedPublishRequestSchema);
  if (!validationResult.valid) {
    throw ErrorHandler.formatValidationError(validationResult.errors);
  }

  const publishData: PublishRequest & { 
    status?: PostStatus; 
    status_metadata?: { reason?: string; changed_by?: string } 
  } = validationResult.data;

  // Validate status parameter if provided
  const postStatus: PostStatus = publishData.status || 'draft';
  const statusValidation = validatePostStatus(postStatus);
  if (!statusValidation.isValid) {
    throw new ApiError(
      'STATUS_VALIDATION_ERROR',
      'Invalid post status',
      400,
      statusValidation.error
    );
  }

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
  if (publishData.images && publishData.images.length > 0) {
    for (const image of publishData.images) {
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

    // Create WordPress post service and status integration service
    const postService = createWordPressPostService();
    const statusService = createWordPressPostStatusIntegrationService({
      wordpressUrl: process.env.WORDPRESS_URL!,
      username: process.env.WORDPRESS_USERNAME!,
      password: process.env.WORDPRESS_APP_PASSWORD!,
      enableStatusHistory: true,
      enableStatusValidation: true,
      enableMetadataTracking: true
    });

    // Prepare post data with validated status
    const postData = {
      title: publishData.post.title,
      content: publishData.post.content,
      excerpt: publishData.post.excerpt || '',
      status: postStatus, // Use validated status
      author: publishData.post.author || 1,
      featured_media: publishData.post.featured_media || 0,
      comment_status: publishData.post.comment_status || 'open',
      ping_status: publishData.post.ping_status || 'open',
      format: publishData.post.format || 'standard',
      template: publishData.post.template || '',
      password: publishData.post.password || '',
      sticky: publishData.post.sticky || false
    };

    // Prepare Yoast fields
    let yoastFields = undefined;
    if (publishData.yoast) {
      yoastFields = {
        meta_title: publishData.yoast.meta_title,
        meta_description: publishData.yoast.meta_description,
        focus_keywords: publishData.yoast.focus_keywords,
        meta_robots_noindex: publishData.yoast.meta_robots_noindex,
        meta_robots_nofollow: publishData.yoast.meta_robots_nofollow,
        canonical: publishData.yoast.canonical,
        primary_category: publishData.yoast.primary_category
      };
    } else {
      // Generate default Yoast fields if not provided
      yoastFields = postService.generateDefaultYoastFields(postData);
    }

    // Prepare categories and tags
    const categoryNames = publishData.post.categories || [];
    const tagNames = publishData.post.tags || [];

    // Create post with enhanced status handling
    const enhancedPostData = {
      ...postData,
      status_change_reason: publishData.status_metadata?.reason || `Post created with status: ${postStatus}`,
      status_changed_by: publishData.status_metadata?.changed_by || 'api_user'
    };

    // Use status integration service for enhanced status handling
    const result = await statusService.createPostWithStatus(
      enhancedPostData,
      { 
        yoast: yoastFields,
        categories: categoryNames,
        tags: tagNames,
        includeImages: true,
        optimizeImages: true,
        validateContent: true,
        generateExcerpt: false
      },
      requestId
    );

    if (result.success && result.postId) {
      const processingTime = Date.now() - startTime;

      const successResponse: PublishResponse & {
        status_metadata?: any;
        status_display?: any;
      } = {
        success: true,
        data: {
          post_id: result.postId,
          post_url: result.postUrl || '',
          post_title: result.postData?.title?.rendered || enhancedPostData.title,
          post_status: postStatus,
          created_at: new Date().toISOString(),
          modified_at: new Date().toISOString(),
          author: enhancedPostData.author,
          featured_media: result.featuredImageId || enhancedPostData.featured_media,
          categories: categoryNames,
          tags: tagNames,
          yoast_applied: yoastFields ? Object.keys(yoastFields).length > 0 : false,
          processing_time_ms: processingTime,
          request_id: requestId
        },
        status_metadata: result.statusMetadata,
        status_display: {
          label: getStatusLabel(postStatus),
          description: getStatusDescription(postStatus),
          message: postStatus === 'draft' 
            ? '📝 Post saved as draft! You can review and edit it before publishing.'
            : postStatus === 'publish'
            ? '🚀 Post published successfully! It\'s now live and publicly visible.'
            : '🔒 Private post created! It\'s accessible only to authorized users.'
        }
      };

      secureLog('info', 'Post published successfully with Yoast and taxonomy integration', {
        requestId,
        postId: result.data.id,
        postTitle: result.data.title.rendered,
        postStatus: result.data.status,
        processingTime,
        categoryCount: result.data.categories?.length || 0,
        tagCount: result.data.tags?.length || 0,
        yoastFieldsApplied: yoastFields ? Object.keys(yoastFields) : [],
        yoastWarning: (result.data as any).yoastWarning,
        taxonomyProcessingTime: (result.data as any).taxonomy_processing_time_ms
      });

      res.status(201).json(successResponse);
      
      // Record successful request and WordPress API call
      const processingTime = Date.now() - startTime;
      applicationMonitor.recordRequest(true, processingTime);
      applicationMonitor.recordWordPressApiCall(true);
      
      // Log successful response
      requestResponseLogger.logResponse(req, res, requestId, successResponse);
    } else {
      // Record failed WordPress API call
      applicationMonitor.recordWordPressApiCall(false);
      
      throw new ApiError(
        result.error?.code || 'PUBLISH_FAILED',
        result.error?.message || 'Failed to publish post',
        result.statusCode || 500,
        result.error?.details || 'Unknown error occurred'
      );
    }
}

// Export the handler wrapped with error handling
export default ErrorHandler.asyncWrapper(publishHandler); 
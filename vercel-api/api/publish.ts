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
import ErrorHandler from '../src/middleware/error-handler';

async function publishHandler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Set request ID for error correlation
  ErrorHandler.setRequestId(requestId);

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

  const publishData: PublishRequest = validationResult.data;

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

    // Create WordPress post service
    const postService = createWordPressPostService();

    // Prepare post data
    const postData = {
      title: publishData.post.title,
      content: publishData.post.content,
      excerpt: publishData.post.excerpt || '',
      status: publishData.post.status || 'draft',
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

    // Create post with Yoast and taxonomy integration
    const result = await postService.createPostWithYoastAndTaxonomy(
      postData,
      yoastFields,
      categoryNames,
      tagNames
    );

    if (result.success && result.data) {
      const processingTime = Date.now() - startTime;

      const successResponse: PublishResponse = {
        success: true,
        data: {
          post_id: result.data.id,
          post_url: result.data.link,
          post_title: result.data.title.rendered,
          post_status: result.data.status,
          created_at: result.data.date,
          modified_at: result.data.modified,
          author: result.data.author,
          featured_media: result.data.featured_media,
          categories: result.data.categories || [],
          tags: result.data.tags || [],
          yoast_applied: yoastFields ? Object.keys(yoastFields).length > 0 : false,
          yoast_warning: (result.data as any).yoastWarning,
          taxonomy_processing_time_ms: (result.data as any).taxonomy_processing_time_ms,
          processing_time_ms: processingTime,
          request_id: requestId
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
    } else {
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
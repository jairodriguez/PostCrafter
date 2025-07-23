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

// Helper function to create error response
function createErrorResponse(
  res: VercelResponse,
  error: ApiError,
  requestId?: string
): void {
  const errorResponse: PublishResponse = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
      requestId
    }
  };

  res.status(error.statusCode || 500).json(errorResponse);
}

export default async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Apply middleware (CORS, security headers, rate limiting, authentication)
    applyMiddleware(req, res, () => {
      // Middleware will handle the request
    });

    // Only allow POST requests
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      createErrorResponse(res, {
        code: 'METHOD_NOT_ALLOWED',
        message: `Method ${req.method} not allowed`,
        statusCode: 405
      }, requestId);
      return;
    }

    // Validate request body
    const validationResult = validateRequest(req, securePublishRequestSchema);
    if (!validationResult.valid) {
      createErrorResponse(res, {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: validationResult.errors.join(', '),
        statusCode: 400
      }, requestId);
      return;
    }

    const publishData: PublishRequest = validationResult.data;

    // Check for malicious content
    const maliciousContent = detectMaliciousContent(publishData);
    if (maliciousContent.detected) {
      createErrorResponse(res, {
        code: 'SECURITY_VIOLATION',
        message: 'Malicious content detected',
        details: `Detected patterns: ${maliciousContent.patterns.join(', ')}`,
        statusCode: 400
      }, requestId);
      return;
    }

    // Validate image data if provided
    if (publishData.images && publishData.images.length > 0) {
      for (const image of publishData.images) {
        const imageValidation = validateImageData(image);
        if (!imageValidation.valid) {
          createErrorResponse(res, {
            code: 'IMAGE_VALIDATION_ERROR',
            message: 'Image validation failed',
            details: imageValidation.errors.join(', '),
            statusCode: 400
          }, requestId);
          return;
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
      categories: publishData.post.categories || [],
      tags: publishData.post.tags || [],
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

    // Create post with Yoast integration
    const result = await postService.createPostWithYoast(postData, yoastFields);

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
          categories: result.data.categories,
          tags: result.data.tags,
          yoast_applied: yoastFields ? Object.keys(yoastFields).length > 0 : false,
          yoast_warning: (result.data as any).yoastWarning,
          processing_time_ms: processingTime,
          request_id: requestId
        }
      };

      secureLog('info', 'Post published successfully with Yoast integration', {
        requestId,
        postId: result.data.id,
        postTitle: result.data.title.rendered,
        postStatus: result.data.status,
        processingTime,
        yoastFieldsApplied: yoastFields ? Object.keys(yoastFields) : [],
        yoastWarning: (result.data as any).yoastWarning
      });

      res.status(201).json(successResponse);
    } else {
      createErrorResponse(res, {
        code: result.error?.code || 'PUBLISH_FAILED',
        message: result.error?.message || 'Failed to publish post',
        details: result.error?.details || 'Unknown error occurred',
        statusCode: result.statusCode || 500
      }, requestId);
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    secureLog('error', 'Unexpected error in publish endpoint', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime
    });

    createErrorResponse(res, {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
      statusCode: 500
    }, requestId);
  }
} 
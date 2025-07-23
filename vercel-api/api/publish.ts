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
      requestId,
    },
  };

  res.status(error.statusCode || 400).json(errorResponse);
}

// Helper function to create success response
function createSuccessResponse(
  res: VercelResponse,
  data: any,
  requestId?: string
): void {
  const successResponse: PublishResponse = {
    success: true,
    data: {
      ...data,
      requestId,
    },
  };

  res.status(200).json(successResponse);
}

export default async function handler(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Apply middleware (CORS, security headers, rate limiting, authentication)
    const middlewareResult = applyMiddleware(req, res);
    if (!middlewareResult.success) {
      return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      createErrorResponse(res, {
        code: 'METHOD_NOT_ALLOWED',
        message: `Method ${req.method} not allowed`,
        statusCode: 405,
      }, requestId);
      return;
    }

    secureLog('info', 'Processing publish request', {
      requestId,
      method: req.method,
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    });

    // Validate request body
    const validationResult = validateRequest(req.body, securePublishRequestSchema);
    if (!validationResult.success) {
      createErrorResponse(res, {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: validationResult.errors,
        statusCode: 400,
      }, requestId);
      return;
    }

    const publishData: PublishRequest = validationResult.data;

    // Check for malicious content
    const maliciousContentCheck = detectMaliciousContent(publishData.post.title + ' ' + publishData.post.content);
    if (maliciousContentCheck.detected) {
      createErrorResponse(res, {
        code: 'SECURITY_ERROR',
        message: 'Malicious content detected in request',
        details: maliciousContentCheck.patterns,
        statusCode: 400,
      }, requestId);
      return;
    }

    // Validate image data if provided
    if (publishData.images && publishData.images.length > 0) {
      for (const image of publishData.images) {
        const imageValidation = validateImageData(image);
        if (!imageValidation.valid) {
          createErrorResponse(res, {
            code: 'VALIDATION_ERROR',
            message: 'Invalid image data',
            details: imageValidation.errors,
            statusCode: 400,
          }, requestId);
          return;
        }
      }
    }

    secureLog('info', 'Request validation passed, creating WordPress post', {
      requestId,
      title: publishData.post.title.substring(0, 50) + '...',
      hasImages: publishData.images && publishData.images.length > 0,
      hasYoastMeta: !!(publishData.yoast_meta),
    });

    // Create WordPress post
    const postService = createWordPressPostService();
    
    const postData = {
      title: publishData.post.title,
      content: publishData.post.content,
      excerpt: publishData.post.excerpt,
      status: publishData.post.status || 'draft',
      slug: publishData.post.slug,
    };

    const postOptions = {
      status: publishData.post.status || 'draft',
      allowComments: publishData.options?.allow_comments !== false,
      allowPings: publishData.options?.allow_pings !== false,
      author: publishData.options?.author_id,
      format: publishData.options?.post_format,
      sticky: publishData.options?.sticky || false,
      template: publishData.options?.template,
      password: publishData.options?.password,
    };

    const postResult = await postService.createPost(postData, postOptions);

    if (!postResult.success) {
      secureLog('error', 'WordPress post creation failed', {
        requestId,
        error: postResult.error,
        title: publishData.post.title.substring(0, 50) + '...',
      });

      createErrorResponse(res, {
        code: postResult.error?.code || 'WORDPRESS_API_ERROR',
        message: postResult.error?.message || 'Failed to create WordPress post',
        details: postResult.error?.details,
        statusCode: 500,
      }, requestId);
      return;
    }

    // TODO: Handle Yoast meta fields (Task 3.3)
    if (publishData.yoast_meta) {
      secureLog('info', 'Yoast meta fields provided, will be handled in Task 3.3', {
        requestId,
        postId: postResult.postId,
        yoastFields: Object.keys(publishData.yoast_meta),
      });
    }

    // TODO: Handle image uploads (Task 4)
    if (publishData.images && publishData.images.length > 0) {
      secureLog('info', 'Images provided, will be handled in Task 4', {
        requestId,
        postId: postResult.postId,
        imageCount: publishData.images.length,
      });
    }

    // TODO: Handle categories and tags (Task 3.4)
    if (publishData.post.categories && publishData.post.categories.length > 0) {
      secureLog('info', 'Categories provided, will be handled in Task 3.4', {
        requestId,
        postId: postResult.postId,
        categoryCount: publishData.post.categories.length,
      });
    }

    if (publishData.post.tags && publishData.post.tags.length > 0) {
      secureLog('info', 'Tags provided, will be handled in Task 3.4', {
        requestId,
        postId: postResult.postId,
        tagCount: publishData.post.tags.length,
      });
    }

    const processingTime = Date.now() - startTime;

    secureLog('info', 'Post published successfully', {
      requestId,
      postId: postResult.postId,
      postUrl: postResult.postUrl,
      processingTime,
      status: postResult.postData?.status,
    });

    // Return success response
    createSuccessResponse(res, {
      post_id: postResult.postId,
      post_url: postResult.postUrl,
      post_status: postResult.postData?.status || 'draft',
      processing_time_ms: processingTime,
      message: 'Post created successfully',
      // TODO: Add these fields when implementing related tasks
      yoast_meta_updated: false, // Will be true when Task 3.3 is implemented
      images_uploaded: false, // Will be true when Task 4 is implemented
      categories_assigned: false, // Will be true when Task 3.4 is implemented
      tags_assigned: false, // Will be true when Task 3.4 is implemented
    }, requestId);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    secureLog('error', 'Unexpected error in publish endpoint', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
      stack: error instanceof Error ? error.stack : undefined,
    });

    createErrorResponse(res, {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred while processing the request',
      statusCode: 500,
    }, requestId);
  }
} 
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
      timestamp: new Date().toISOString(),
      request_id: requestId,
    },
  };

  res.status(error.statusCode).json(errorResponse);
}

// Helper function to create success response
function createSuccessResponse(
  res: VercelResponse,
  data: PublishResponse['data'],
  requestId?: string
): void {
  const successResponse: PublishResponse = {
    success: true,
    data: {
      ...data,
      timestamp: new Date().toISOString(),
      processing_time_ms: data.processing_time_ms,
    },
  };

  res.status(200).json(successResponse);
}

// Main handler function
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Apply CORS, security headers, and rate limiting middleware
  applyMiddleware(req, res, () => {
    // Apply authentication middleware
    authenticateApiKey(req as AuthenticatedRequest, res, () => {
      handlePublishRequest(req as AuthenticatedRequest, res);
    });
  });
}

// Main request handler (after authentication)
async function handlePublishRequest(
  req: AuthenticatedRequest,
  res: VercelResponse
): Promise<void> {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Set request ID header
    res.setHeader('X-Request-ID', requestId);

    // Only allow POST requests
    if (req.method !== 'POST') {
      throw new ValidationError(`Method ${req.method} not allowed. Only POST is supported.`);
    }

    // Comprehensive request validation
    const validationResult = validateRequest(req.body, req.headers);
    
    if (!validationResult.valid) {
      secureLog('warn', `Request validation failed for ${requestId}:`, {
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        userAgent: req.headers['user-agent'],
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      });
      
      throw new ValidationError(
        'Request validation failed',
        validationResult.errors.join('; ')
      );
    }

    // Log validation warnings if any
    if (validationResult.warnings.length > 0) {
      secureLog('warn', `Request validation warnings for ${requestId}:`, {
        warnings: validationResult.warnings,
      });
    }

    // Use the secure schema for additional validation and sanitization
    const validatedData = securePublishRequestSchema.parse(req.body);
    const { post, options } = validatedData;

    // Additional image validation if images are present
    if (post.images && Array.isArray(post.images)) {
      for (let i = 0; i < post.images.length; i++) {
        const imageValidation = validateImageData(post.images[i]);
        if (!imageValidation.valid) {
          throw new ValidationError(
            `Image validation failed at index ${i}`,
            imageValidation.error || 'Invalid image data'
          );
        }
        // Replace with sanitized image data
        post.images[i] = imageValidation.sanitized!;
      }
    }

    // Final security check on sanitized content
    const titleSecurityCheck = detectMaliciousContent(post.title);
    const contentSecurityCheck = detectMaliciousContent(post.content);
    
    if (titleSecurityCheck.malicious || contentSecurityCheck.malicious) {
      const maliciousPatterns = [
        ...titleSecurityCheck.patterns,
        ...contentSecurityCheck.patterns
      ];
      
      secureLog('error', `Malicious content detected in request ${requestId}:`, {
        patterns: maliciousPatterns,
        userAgent: req.headers['user-agent'],
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      });
      
      throw new ValidationError(
        'Malicious content detected',
        `Security violation: ${maliciousPatterns.join(', ')}`
      );
    }

    // Log successful validation
    secureLog('info', `Request validation successful for ${requestId}`, {
      postTitle: post.title.substring(0, 50) + (post.title.length > 50 ? '...' : ''),
      hasImages: post.images ? post.images.length : 0,
      publishStatus: options?.publish_status || post.status,
    });

    // TODO: Implement actual WordPress integration
    // For now, return a mock successful response
    const mockResponse: PublishResponse['data'] = {
      post_id: Math.floor(Math.random() * 1000) + 1,
      post_url: `https://example.com/post/${Math.floor(Math.random() * 1000) + 1}`,
      status: options?.publish_status || post.status || 'draft',
      message: 'Post created successfully',
      timestamp: new Date().toISOString(),
      processing_time_ms: Date.now() - startTime,
      yoast_meta: post.yoast_meta,
    };

    createSuccessResponse(res, mockResponse, requestId);

  } catch (error) {
    console.error(`[${requestId}] Error processing request:`, error);

    if (error instanceof z.ZodError) {
      // Handle validation errors
      const validationError = new ValidationError(
        'Request validation failed',
        error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      );
      createErrorResponse(res, validationError, requestId);
    } else if (error instanceof ApiError) {
      // Handle custom API errors
      createErrorResponse(res, error, requestId);
    } else {
      // Handle unexpected errors
      const unexpectedError = new ApiError(
        'INTERNAL_ERROR',
        'An unexpected error occurred',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      );
      createErrorResponse(res, unexpectedError, requestId);
    }
  }
} 
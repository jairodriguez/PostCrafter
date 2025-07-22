import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { PublishRequest, PublishResponse, ApiError, ValidationError } from '../src/types';
import { authenticateApiKey, AuthenticatedRequest } from '../src/middleware/auth';
import { applyMiddleware } from '../src/middleware/cors';

// Request validation schema
const publishRequestSchema = z.object({
  post: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    content: z.string().min(1, 'Content is required'),
    excerpt: z.string().optional(),
    status: z.enum(['draft', 'publish', 'private']).optional().default('draft'),
    categories: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    featured_media: z.number().optional(),
    yoast_meta: z.object({
      meta_title: z.string().optional(),
      meta_description: z.string().optional(),
      focus_keywords: z.string().optional(),
      canonical: z.string().url().optional(),
      primary_category: z.number().optional(),
      meta_robots_noindex: z.string().optional(),
      meta_robots_nofollow: z.string().optional(),
    }).optional(),
    images: z.array(z.object({
      url: z.string().url().optional(),
      base64: z.string().optional(),
      alt_text: z.string().optional(),
      caption: z.string().optional(),
      featured: z.boolean().optional(),
      filename: z.string().optional(),
      mime_type: z.string().optional(),
    })).optional(),
  }),
  options: z.object({
    publish_status: z.enum(['draft', 'publish']).optional(),
    include_images: z.boolean().optional().default(true),
    optimize_images: z.boolean().optional().default(false),
    validate_content: z.boolean().optional().default(true),
  }).optional(),
});

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

    // Validate request body
    if (!req.body) {
      throw new ValidationError('Request body is required');
    }

    // Parse and validate the request
    const validatedData = publishRequestSchema.parse(req.body);
    const { post, options } = validatedData;

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
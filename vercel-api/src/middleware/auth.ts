import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthenticationError } from '../types';
import { getEnvVars, validateApiKey } from '../utils/env';

/**
 * Authentication middleware for API key validation
 * Validates API keys from request headers and implements proper error responses
 */
export interface AuthenticatedRequest extends VercelRequest {
  user?: {
    apiKey: string;
    timestamp: number;
  };
}

/**
 * Middleware function to validate API key authentication
 */
export function authenticateApiKey(
  req: AuthenticatedRequest,
  res: VercelResponse,
  next: () => void
): void {
  try {
    // Get API key from headers
    const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
    
    if (!apiKey) {
      throw new AuthenticationError('API key is required', 'Missing API key in request headers');
    }
    
    // Convert to string if it's an array
    const apiKeyString = typeof apiKey === 'string' ? apiKey : Array.isArray(apiKey) ? apiKey[0] : '';
    
    if (!apiKeyString) {
      throw new AuthenticationError('Invalid API key format', 'API key cannot be empty');
    }
    
    // Use secure validation function
    const validation = validateApiKey(apiKeyString);
    
    if (!validation.valid) {
      throw new AuthenticationError('Invalid API key', validation.error || 'API key validation failed');
    }
    
    // Remove 'Bearer ' prefix if present for storage
    const cleanApiKey = apiKeyString.replace(/^Bearer\s+/i, '');
    
    // Add user info to request object
    req.user = {
      apiKey: cleanApiKey,
      timestamp: Date.now(),
    };
    
    // Continue to next middleware/route handler
    next();
    
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      // Handle unexpected errors
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Authentication failed due to server error',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
}

/**
 * Optional authentication middleware for endpoints that can work with or without auth
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: VercelResponse,
  next: () => void
): void {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
    
    if (apiKey) {
      // If API key is provided, validate it
      authenticateApiKey(req, res, next);
    } else {
      // If no API key, continue without authentication
      req.user = undefined;
      next();
    }
  } catch (error) {
    // If authentication fails, continue without it
    req.user = undefined;
    next();
  }
}

/**
 * Rate limiting middleware based on API key
 */
export function rateLimitByApiKey(
  req: AuthenticatedRequest,
  res: VercelResponse,
  next: () => void
): void {
  try {
    const envVars = getEnvVars();
    
    if (!req.user?.apiKey) {
      // If no user (no API key), skip rate limiting
      next();
      return;
    }
    
    // Simple in-memory rate limiting (in production, use Redis or similar)
    const rateLimitKey = `rate_limit:${req.user.apiKey}`;
    const now = Date.now();
    const windowMs = envVars.API_RATE_LIMIT_WINDOW_MS;
    const maxRequests = envVars.API_RATE_LIMIT_MAX_REQUESTS;
    
    // Get current rate limit data (this is a simplified version)
    // In production, you'd use a proper rate limiting library
    const currentRequests = 1; // This would be retrieved from storage
    const windowStart = now - windowMs;
    
    if (currentRequests >= maxRequests) {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded',
          details: `Maximum ${maxRequests} requests per ${windowMs}ms window`,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }
    
    // Continue to next middleware/route handler
    next();
    
  } catch (error) {
    // If rate limiting fails, continue without it
    console.error('Rate limiting error:', error);
    next();
  }
}

/**
 * Combined authentication and rate limiting middleware
 */
export function authAndRateLimit(
  req: AuthenticatedRequest,
  res: VercelResponse,
  next: () => void
): void {
  authenticateApiKey(req, res, () => {
    rateLimitByApiKey(req, res, next);
  });
}

/**
 * Middleware to log authentication attempts
 */
export function logAuthAttempt(
  req: AuthenticatedRequest,
  res: VercelResponse,
  next: () => void
): void {
  const startTime = Date.now();
  const originalEnd = res.end;
  
  // Override res.end to capture response
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const hasApiKey = !!(req.headers['x-api-key'] || req.headers['authorization']);
    const isAuthenticated = !!req.user;
    
    console.log(`[AUTH] ${req.method} ${req.url} - API Key: ${hasApiKey ? 'Present' : 'Missing'} - Auth: ${isAuthenticated ? 'Success' : 'Failed'} - Status: ${statusCode} - Duration: ${duration}ms`);
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
} 
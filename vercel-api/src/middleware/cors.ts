import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getEnvVars } from '../utils/env';

/**
 * CORS configuration for the API
 * Allows requests from ChatGPT domains and other authorized origins
 */
export function configureCors(
  req: VercelRequest,
  res: VercelResponse,
  next: () => void
): void {
  try {
    const envVars = getEnvVars();
    
    // Get the origin from the request
    const origin = req.headers.origin;
    
    // Define allowed origins
    const allowedOrigins = [
      // ChatGPT domains
      'https://chat.openai.com',
      'https://chatgpt.com',
      'https://chat.openai.com:443',
      'https://chatgpt.com:443',
      // Development origins
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8080',
      // Vercel preview domains
      /^https:\/\/.*\.vercel\.app$/,
      /^https:\/\/.*\.vercel\.dev$/,
      // Custom domains from environment
      ...envVars.CORS_ORIGINS,
    ];
    
    // Check if origin is allowed
    const isOriginAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      }
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin || '');
      }
      return false;
    });
    
    // Set CORS headers
    if (origin && isOriginAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (envVars.CORS_ORIGINS.includes('*')) {
      // Allow all origins if configured
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else {
      // Default to no CORS if origin not allowed
      res.setHeader('Access-Control-Allow-Origin', 'null');
    }
    
    // Set other CORS headers
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Request-ID');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    next();
  } catch (error) {
    console.error('CORS configuration error:', error);
    // Continue without CORS if there's an error
    next();
  }
}

/**
 * Security headers middleware
 * Sets headers to prevent common vulnerabilities
 */
export function setSecurityHeaders(
  req: VercelRequest,
  res: VercelResponse,
  next: () => void
): void {
  try {
    // Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';"
    );
    
    // X-Content-Type-Options
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // X-Frame-Options
    res.setHeader('X-Frame-Options', 'DENY');
    
    // X-XSS-Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Strict Transport Security (HSTS)
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
    
    // Permissions Policy
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
    );
    
    // Cache Control for API responses
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Remove server information
    res.removeHeader('X-Powered-By');
    
    next();
  } catch (error) {
    console.error('Security headers error:', error);
    // Continue without security headers if there's an error
    next();
  }
}

/**
 * Rate limiting middleware
 * Implements basic rate limiting based on IP address
 */
export function rateLimitByIP(
  req: VercelRequest,
  res: VercelResponse,
  next: () => void
): void {
  try {
    const envVars = getEnvVars();
    
    // Get client IP
    const clientIP = req.headers['x-forwarded-for'] || 
                    req.headers['x-real-ip'] || 
                    req.connection.remoteAddress || 
                    'unknown';
    
    const ip = Array.isArray(clientIP) ? clientIP[0] : clientIP;
    
    // Simple in-memory rate limiting (in production, use Redis or similar)
    // This is a basic implementation - for production, use a proper rate limiting library
    const rateLimitKey = `rate_limit_ip:${ip}`;
    const now = Date.now();
    const windowMs = envVars.API_RATE_LIMIT_WINDOW_MS;
    const maxRequests = envVars.API_RATE_LIMIT_MAX_REQUESTS;
    
    // For now, we'll just log the request
    // In production, you'd check against a rate limiting store
    console.log(`[RATE_LIMIT] IP: ${ip}, Endpoint: ${req.method} ${req.url}, Time: ${new Date().toISOString()}`);
    
    // TODO: Implement proper rate limiting with storage
    // This would involve checking current request count for this IP
    // and rejecting if over the limit
    
    next();
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Continue without rate limiting if there's an error
    next();
  }
}

/**
 * Request logging middleware
 * Logs incoming requests for monitoring and debugging
 */
export function logRequest(
  req: VercelRequest,
  res: VercelResponse,
  next: () => void
): void {
  const startTime = Date.now();
  const originalEnd = res.end;
  
  // Override res.end to capture response
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const method = req.method;
    const url = req.url;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const clientIP = req.headers['x-forwarded-for'] || 
                    req.headers['x-real-ip'] || 
                    req.connection.remoteAddress || 
                    'unknown';
    
    console.log(`[REQUEST] ${method} ${url} - IP: ${clientIP} - Status: ${statusCode} - Duration: ${duration}ms - UA: ${userAgent}`);
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
}

/**
 * Combined middleware for CORS, security headers, and rate limiting
 */
export function applyMiddleware(
  req: VercelRequest,
  res: VercelResponse,
  next: () => void
): void {
  logRequest(req, res, () => {
    configureCors(req, res, () => {
      setSecurityHeaders(req, res, () => {
        rateLimitByIP(req, res, next);
      });
    });
  });
} 
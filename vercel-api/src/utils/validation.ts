import { z } from 'zod';
import { ValidationResult, ValidationError } from '../types';
import SecurityMonitoring from './monitoring';

/**
 * Security patterns for detecting malicious content
 */
const SECURITY_PATTERNS = {
  // XSS patterns
  xssScript: /<script[^>]*>.*?<\/script>/gi,
  xssEventHandlers: /on\w+\s*=/gi,
  xssJavaScript: /javascript:/gi,
  xssDataProtocol: /data:text\/html/gi,
  xssVbscript: /vbscript:/gi,
  
  // SQL injection patterns
  sqlInjection: /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
  sqlComment: /--/g,
  sqlQuote: /'|"/g,
  
  // Command injection patterns
  commandInjection: /(\b(cmd|powershell|bash|sh|exec|system|eval)\b)/gi,
  
  // Path traversal patterns
  pathTraversal: /\.\.\/|\.\.\\/gi,
  
  // HTML tag patterns
  htmlTags: /<[^>]*>/gi,
  
  // Suspicious URL patterns
  suspiciousUrl: /(file|ftp|gopher|mailto|telnet):/gi,
} as const;

/**
 * Content type validation
 */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
] as const;

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(content: string): string {
  if (!content) return content;
  
  let sanitized = content;
  
  // Remove script tags and event handlers
  sanitized = sanitized.replace(SECURITY_PATTERNS.xssScript, '');
  sanitized = sanitized.replace(SECURITY_PATTERNS.xssEventHandlers, '');
  sanitized = sanitized.replace(SECURITY_PATTERNS.xssJavaScript, '');
  sanitized = sanitized.replace(SECURITY_PATTERNS.xssDataProtocol, '');
  sanitized = sanitized.replace(SECURITY_PATTERNS.xssVbscript, '');
  
  // Remove HTML tags (basic sanitization)
  sanitized = sanitized.replace(SECURITY_PATTERNS.htmlTags, '');
  
  // Encode special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  
  return sanitized;
}

/**
 * Sanitize markdown content
 */
export function sanitizeMarkdown(content: string): string {
  if (!content) return content;
  
  let sanitized = content;
  
  // Remove dangerous patterns
  sanitized = sanitized.replace(SECURITY_PATTERNS.xssScript, '');
  sanitized = sanitized.replace(SECURITY_PATTERNS.xssEventHandlers, '');
  sanitized = sanitized.replace(SECURITY_PATTERNS.xssJavaScript, '');
  sanitized = sanitized.replace(SECURITY_PATTERNS.xssDataProtocol, '');
  sanitized = sanitized.replace(SECURITY_PATTERNS.xssVbscript, '');
  
  // Remove command injection patterns
  sanitized = sanitized.replace(SECURITY_PATTERNS.commandInjection, '');
  
  return sanitized;
}

/**
 * Validate and sanitize URL
 */
export function validateAndSanitizeUrl(url: string): { valid: boolean; sanitized?: string; error?: string } {
  if (!url) {
    return { valid: false, error: 'URL is required' };
  }
  
  // Check for suspicious protocols
  if (SECURITY_PATTERNS.suspiciousUrl.test(url)) {
    return { valid: false, error: 'URL protocol not allowed' };
  }
  
  // Check for path traversal
  if (SECURITY_PATTERNS.pathTraversal.test(url)) {
    return { valid: false, error: 'Path traversal detected in URL' };
  }
  
  try {
    const urlObj = new URL(url);
    
    // Only allow HTTP and HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
    }
    
    // Validate hostname
    if (!urlObj.hostname || urlObj.hostname.length === 0) {
      return { valid: false, error: 'Invalid hostname' };
    }
    
    return { valid: true, sanitized: urlObj.toString() };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate image data
 */
export function validateImageData(imageData: any): { valid: boolean; sanitized?: any; error?: string } {
  if (!imageData) {
    return { valid: false, error: 'Image data is required' };
  }
  
  const sanitized: any = {};
  
  // Validate URL if present
  if (imageData.url) {
    const urlValidation = validateAndSanitizeUrl(imageData.url);
    if (!urlValidation.valid) {
      return { valid: false, error: `Invalid image URL: ${urlValidation.error}` };
    }
    sanitized.url = urlValidation.sanitized;
  }
  
  // Validate base64 if present
  if (imageData.base64) {
    if (typeof imageData.base64 !== 'string') {
      return { valid: false, error: 'Base64 data must be a string' };
    }
    
    // Check if it's valid base64
    if (!/^data:image\/[a-zA-Z]+;base64,/.test(imageData.base64)) {
      return { valid: false, error: 'Invalid base64 image format' };
    }
    
    // Check size (max 10MB)
    const base64Data = imageData.base64.split(',')[1];
    const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);
    const sizeInMB = sizeInBytes / (1024 * 1024);
    
    if (sizeInMB > 10) {
      return { valid: false, error: 'Image size exceeds 10MB limit' };
    }
    
    sanitized.base64 = imageData.base64;
  }
  
  // Validate MIME type if present
  if (imageData.mime_type) {
    if (!ALLOWED_MIME_TYPES.includes(imageData.mime_type as any)) {
      return { valid: false, error: 'Unsupported image MIME type' };
    }
    sanitized.mime_type = imageData.mime_type;
  }
  
  // Sanitize text fields
  if (imageData.alt_text) {
    sanitized.alt_text = sanitizeHtml(imageData.alt_text);
  }
  
  if (imageData.caption) {
    sanitized.caption = sanitizeHtml(imageData.caption);
  }
  
  if (imageData.filename) {
    // Validate filename (no path traversal, reasonable length)
    if (SECURITY_PATTERNS.pathTraversal.test(imageData.filename)) {
      return { valid: false, error: 'Invalid filename' };
    }
    if (imageData.filename.length > 255) {
      return { valid: false, error: 'Filename too long' };
    }
    sanitized.filename = imageData.filename;
  }
  
  // Boolean fields
  if (typeof imageData.featured === 'boolean') {
    sanitized.featured = imageData.featured;
  }
  
  return { valid: true, sanitized };
}

/**
 * Detect malicious content in text
 */
export function detectMaliciousContent(text: string, sourceIP?: string, userAgent?: string, apiKey?: string): { malicious: boolean; patterns: string[] } {
  if (!text) {
    return { malicious: false, patterns: [] };
  }
  
  const detectedPatterns: string[] = [];
  
  // Check for XSS patterns
  if (SECURITY_PATTERNS.xssScript.test(text)) {
    detectedPatterns.push('XSS script tag');
  }
  if (SECURITY_PATTERNS.xssEventHandlers.test(text)) {
    detectedPatterns.push('XSS event handler');
  }
  if (SECURITY_PATTERNS.xssJavaScript.test(text)) {
    detectedPatterns.push('XSS javascript protocol');
  }
  if (SECURITY_PATTERNS.xssDataProtocol.test(text)) {
    detectedPatterns.push('XSS data protocol');
  }
  
  // Check for SQL injection patterns
  if (SECURITY_PATTERNS.sqlInjection.test(text)) {
    detectedPatterns.push('SQL injection attempt');
  }
  
  // Check for command injection patterns
  if (SECURITY_PATTERNS.commandInjection.test(text)) {
    detectedPatterns.push('Command injection attempt');
  }
  
  // Check for path traversal patterns
  if (SECURITY_PATTERNS.pathTraversal.test(text)) {
    detectedPatterns.push('Path traversal attempt');
  }
  
  // Check for suspicious URL patterns
  if (SECURITY_PATTERNS.suspiciousUrl.test(text)) {
    detectedPatterns.push('Suspicious URL protocol');
  }

  const isMalicious = detectedPatterns.length > 0;

  // Record malicious content detection for monitoring
  if (isMalicious && sourceIP) {
    SecurityMonitoring.recordMaliciousContent(
      sourceIP,
      userAgent,
      apiKey,
      detectedPatterns.join(', '),
      { contentLength: text.length, patterns: detectedPatterns }
    );
  }

  return {
    malicious: isMalicious,
    patterns: detectedPatterns,
  };
}

  /**
 * Validate request headers
   */
export function validateRequestHeaders(headers: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
  
  // Check content type
  const contentType = headers['content-type'];
  if (!contentType) {
    errors.push('Content-Type header is required');
  } else if (!contentType.includes('application/json')) {
    errors.push('Content-Type must be application/json');
  }
  
  // Check content length
  const contentLength = headers['content-length'];
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (isNaN(size) || size > 10 * 1024 * 1024) { // 10MB limit
      errors.push('Request body too large (max 10MB)');
    }
  }
  
  // Check user agent
  const userAgent = headers['user-agent'];
  if (!userAgent) {
    errors.push('User-Agent header is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
 * Comprehensive request validation middleware
 */
export function validateRequest(
  body: any,
  headers: any,
  maxBodySize: number = 10 * 1024 * 1024 // 10MB default
): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
  let sanitizedData: any = null;
  
  try {
    // Validate headers
    const headerValidation = validateRequestHeaders(headers);
    if (!headerValidation.valid) {
      errors.push(...headerValidation.errors);
    }
    
    // Check body size
    if (body && typeof body === 'string') {
      const bodySize = Buffer.byteLength(body, 'utf8');
      if (bodySize > maxBodySize) {
        errors.push(`Request body too large (${bodySize} bytes, max ${maxBodySize} bytes)`);
      }
    }
    
    // Check for malicious content in body
    if (body) {
      const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
      const maliciousCheck = detectMaliciousContent(bodyString);
      
      if (maliciousCheck.malicious) {
        errors.push(`Malicious content detected: ${maliciousCheck.patterns.join(', ')}`);
      }
    }
    
    // If no critical errors, attempt to sanitize
    if (errors.length === 0 && body) {
      sanitizedData = sanitizeRequestData(body);
    }
    
  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    sanitizedData,
    };
  }

  /**
 * Sanitize request data recursively
 */
function sanitizeRequestData(data: any): any {
  if (typeof data === 'string') {
    return sanitizeHtml(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeRequestData(item));
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeRequestData(value);
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Enhanced Zod schema with security validation
 */
export const securePublishRequestSchema = z.object({
  post: z.object({
    title: z.string()
      .min(1, 'Title is required')
      .max(200, 'Title too long')
      .transform(sanitizeHtml)
      .refine((val) => !detectMaliciousContent(val).malicious, {
        message: 'Title contains malicious content',
      }),
    content: z.string()
      .min(1, 'Content is required')
      .max(50000, 'Content too long')
      .transform(sanitizeMarkdown)
      .refine((val) => !detectMaliciousContent(val).malicious, {
        message: 'Content contains malicious content',
      }),
    excerpt: z.string()
      .max(500, 'Excerpt too long')
      .transform(sanitizeHtml)
      .optional(),
    status: z.enum(['draft', 'publish', 'private']).optional().default('draft'),
    categories: z.array(z.string().max(100).transform(sanitizeHtml)).optional(),
    tags: z.array(z.string().max(100).transform(sanitizeHtml)).optional(),
    featured_media: z.number().positive().optional(),
    yoast_meta: z.object({
      meta_title: z.string().max(60).transform(sanitizeHtml).optional(),
      meta_description: z.string().max(160).transform(sanitizeHtml).optional(),
      focus_keywords: z.string().max(200).transform(sanitizeHtml).optional(),
      canonical: z.string().url().optional(),
      primary_category: z.number().positive().optional(),
      meta_robots_noindex: z.string().max(20).optional(),
      meta_robots_nofollow: z.string().max(20).optional(),
    }).optional(),
    images: z.array(z.object({
      url: z.string().url().optional(),
      base64: z.string().optional(),
      alt_text: z.string().max(255).transform(sanitizeHtml).optional(),
      caption: z.string().max(500).transform(sanitizeHtml).optional(),
      featured: z.boolean().optional(),
      filename: z.string().max(255).optional(),
      mime_type: z.enum(ALLOWED_MIME_TYPES).optional(),
    })).optional(),
  }),
  options: z.object({
    publish_status: z.enum(['draft', 'publish']).optional(),
    include_images: z.boolean().optional().default(true),
    optimize_images: z.boolean().optional().default(false),
    validate_content: z.boolean().optional().default(true),
  }).optional(),
}).refine((data) => {
  // Additional cross-field validation
  if (data.post.images && data.post.images.length > 10) {
    return false;
  }
  return true;
}, {
  message: 'Too many images (max 10)',
  path: ['post', 'images'],
}); 
/**
 * URL and Image validation utilities
 * Provides comprehensive validation for URLs and image sources with security features
 */

import { logger } from './logger';
import { ValidationResult } from './validation';

/**
 * URL validation configuration options
 */
export interface UrlValidationOptions {
  // Allowed protocols
  allowedProtocols?: string[];
  // Allowed domains (allowlist)
  allowedDomains?: string[];
  // Blocked domains (blocklist)
  blockedDomains?: string[];
  // Allow IP addresses
  allowIpAddresses?: boolean;
  // Allow localhost
  allowLocalhost?: boolean;
  // Allow private IP ranges
  allowPrivateIps?: boolean;
  // Maximum URL length
  maxLength?: number;
  // Require secure protocols
  requireSecure?: boolean;
  // Check if URL is reachable
  checkReachability?: boolean;
  // Custom port restrictions
  allowedPorts?: number[];
  // Block suspicious URL patterns
  blockSuspiciousPatterns?: boolean;
}

/**
 * Image validation configuration options
 */
export interface ImageValidationOptions extends UrlValidationOptions {
  // Allowed image file extensions
  allowedExtensions?: string[];
  // Allowed MIME types
  allowedMimeTypes?: string[];
  // Maximum image file size in bytes
  maxSizeBytes?: number;
  // Minimum image dimensions
  minWidth?: number;
  minHeight?: number;
  // Maximum image dimensions
  maxWidth?: number;
  maxHeight?: number;
  // Check image metadata
  validateImageData?: boolean;
  // Allow SVG images (security risk)
  allowSvg?: boolean;
  // Allow WebP images
  allowWebP?: boolean;
  // Check image headers
  checkImageHeaders?: boolean;
}

/**
 * Image metadata interface
 */
export interface ImageMetadata {
  width?: number;
  height?: number;
  format?: string;
  size?: number;
  mimeType?: string;
  isValid: boolean;
  errors: string[];
}

/**
 * URL validation result with additional metadata
 */
export interface UrlValidationResult extends ValidationResult {
  url?: URL;
  domain?: string;
  protocol?: string;
  isReachable?: boolean;
  responseCode?: number;
  redirectUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Image validation result with image-specific metadata
 */
export interface ImageValidationResult extends UrlValidationResult {
  imageMetadata?: ImageMetadata;
  fileExtension?: string;
  estimatedSize?: number;
}

/**
 * Default URL validation configuration
 */
const DEFAULT_URL_CONFIG: UrlValidationOptions = {
  allowedProtocols: ['http', 'https'],
  allowedDomains: [], // Empty means all domains allowed
  blockedDomains: [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    'example.com',
    'example.org',
    'test.com',
    'invalid',
    'local'
  ],
  allowIpAddresses: false,
  allowLocalhost: false,
  allowPrivateIps: false,
  maxLength: 2048,
  requireSecure: false,
  checkReachability: false,
  allowedPorts: [80, 443, 8080, 8443],
  blockSuspiciousPatterns: true
};

/**
 * Default image validation configuration
 */
const DEFAULT_IMAGE_CONFIG: ImageValidationOptions = {
  ...DEFAULT_URL_CONFIG,
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
  allowedMimeTypes: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/webp'
  ],
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  minWidth: 1,
  minHeight: 1,
  maxWidth: 10000,
  maxHeight: 10000,
  validateImageData: false,
  allowSvg: false,
  allowWebP: true,
  checkImageHeaders: false
};

/**
 * Suspicious URL patterns that might indicate malicious intent
 */
const SUSPICIOUS_PATTERNS = [
  // IP address patterns
  /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/,
  // Data URLs
  /^data:/i,
  // JavaScript protocols
  /^javascript:/i,
  // VBScript protocols
  /^vbscript:/i,
  // File protocols
  /^file:/i,
  // FTP protocols in images
  /^ftp:/i,
  // URL shorteners (potentially suspicious)
  /bit\.ly|tinyurl|t\.co|goo\.gl|short\.link/i,
  // Suspicious query parameters
  /[?&](redirect|return|url|link|ref)=/i,
  // Multiple redirects
  /redirect.*redirect/i,
  // Suspicious file extensions in URLs
  /\.(exe|bat|cmd|scr|vbs|js|jar|com)(\?|$)/i,
  // Very long query strings (potential overflow)
  /\?.{500,}/,
  // Suspicious Unicode characters
  /[\u200E\u200F\u202A-\u202E]/,
  // IDN homograph attacks (mixed scripts)
  /[а-я].*[a-z]|[a-z].*[а-я]/i
];

/**
 * Private IP address ranges
 */
const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^169\.254\./, // Link-local
  /^fe80:/i, // IPv6 link-local
  /^::1$/, // IPv6 loopback
  /^fc00:/i, // IPv6 unique local
  /^fd00:/i // IPv6 unique local
];

/**
 * Extract file extension from URL
 */
function getFileExtension(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const lastDot = pathname.lastIndexOf('.');
    if (lastDot === -1) return '';
    return pathname.substring(lastDot).toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Check if IP address is private
 */
function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_RANGES.some(range => range.test(ip));
}

/**
 * Check for suspicious URL patterns
 */
function hasSuspiciousPatterns(url: string): { suspicious: boolean; patterns: string[] } {
  const detectedPatterns: string[] = [];
  
  SUSPICIOUS_PATTERNS.forEach((pattern, index) => {
    if (pattern.test(url)) {
      detectedPatterns.push(`pattern_${index + 1}`);
    }
  });

  return {
    suspicious: detectedPatterns.length > 0,
    patterns: detectedPatterns
  };
}

/**
 * Validate URL format and security
 */
export function validateUrl(
  url: string,
  options: UrlValidationOptions = {},
  requestId?: string
): UrlValidationResult {
  const config = { ...DEFAULT_URL_CONFIG, ...options };
  const errors: string[] = [];
  let urlObj: URL | undefined;
  let isValid = true;

  try {
    // Basic validation
    if (!url || typeof url !== 'string') {
      errors.push('URL must be a non-empty string');
      isValid = false;
    } else {
      // Length check
      if (url.length > config.maxLength!) {
        errors.push(`URL exceeds maximum length of ${config.maxLength} characters`);
        isValid = false;
      }

      // Try to parse URL
      try {
        urlObj = new URL(url);
      } catch (error) {
        errors.push('Invalid URL format');
        isValid = false;
      }

      if (urlObj) {
        // Protocol validation
        const protocol = urlObj.protocol.slice(0, -1); // Remove trailing ':'
        if (!config.allowedProtocols!.includes(protocol)) {
          errors.push(`Protocol '${protocol}' is not allowed`);
          isValid = false;
        }

        // Require secure protocol if specified
        if (config.requireSecure && !['https', 'wss'].includes(protocol)) {
          errors.push('Secure protocol required (https/wss)');
          isValid = false;
        }

        // Domain validation
        const hostname = urlObj.hostname.toLowerCase();
        
        // Check blocked domains
        if (config.blockedDomains!.some(blocked => 
          hostname === blocked || hostname.endsWith('.' + blocked)
        )) {
          errors.push(`Domain '${hostname}' is blocked`);
          isValid = false;
        }

        // Check allowed domains (if specified)
        if (config.allowedDomains!.length > 0) {
          const isAllowed = config.allowedDomains!.some(allowed => 
            hostname === allowed || hostname.endsWith('.' + allowed)
          );
          if (!isAllowed) {
            errors.push(`Domain '${hostname}' is not in the allowed list`);
            isValid = false;
          }
        }

        // IP address checks
        const isIpAddress = /^[0-9.]+$/.test(hostname) || /^[0-9a-f:]+$/i.test(hostname);
        if (isIpAddress) {
          if (!config.allowIpAddresses) {
            errors.push('IP addresses are not allowed');
            isValid = false;
          } else if (!config.allowPrivateIps && isPrivateIp(hostname)) {
            errors.push('Private IP addresses are not allowed');
            isValid = false;
          }
        }

        // Localhost check
        if (!config.allowLocalhost && (
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname === '::1'
        )) {
          errors.push('Localhost is not allowed');
          isValid = false;
        }

        // Port validation
        if (urlObj.port && config.allowedPorts!.length > 0) {
          const port = parseInt(urlObj.port);
          if (!config.allowedPorts!.includes(port)) {
            errors.push(`Port ${port} is not allowed`);
            isValid = false;
          }
        }

        // Suspicious pattern detection
        if (config.blockSuspiciousPatterns) {
          const suspiciousCheck = hasSuspiciousPatterns(url);
          if (suspiciousCheck.suspicious) {
            errors.push(`Suspicious URL patterns detected: ${suspiciousCheck.patterns.join(', ')}`);
            isValid = false;
          }
        }
      }
    }

    // Log validation if failed
    if (!isValid) {
      logger.warn('URL validation failed', {
        requestId,
        metadata: {
          url: url.substring(0, 100), // Truncate for logging
          errors
        },
        component: 'url-image-validator'
      });
    }

    return {
      isValid,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      url: urlObj,
      domain: urlObj?.hostname,
      protocol: urlObj?.protocol.slice(0, -1)
    };

  } catch (error) {
    logger.error('URL validation error', {
      requestId,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      component: 'url-image-validator'
    });

    return {
      isValid: false,
      error: 'URL validation failed due to internal error'
    };
  }
}

/**
 * Validate image URL with image-specific checks
 */
export function validateImageUrl(
  url: string,
  options: ImageValidationOptions = {},
  requestId?: string
): ImageValidationResult {
  const config = { ...DEFAULT_IMAGE_CONFIG, ...options };
  const urlResult = validateUrl(url, config, requestId);
  
  if (!urlResult.isValid) {
    return {
      ...urlResult,
      isValid: false
    };
  }

  const errors: string[] = [];
  let isValid = urlResult.isValid;

  // Extract file extension
  const fileExtension = getFileExtension(url);
  
  // Extension validation
  if (fileExtension) {
    if (!config.allowedExtensions!.includes(fileExtension)) {
      // Special handling for SVG
      if (fileExtension === '.svg' && !config.allowSvg) {
        errors.push('SVG images are not allowed for security reasons');
        isValid = false;
      } else if (fileExtension !== '.svg') {
        errors.push(`File extension '${fileExtension}' is not allowed for images`);
        isValid = false;
      }
    }
  } else {
    // Allow URLs without extensions, but warn
    logger.debug('Image URL has no file extension', {
      requestId,
      metadata: {
        url: url.substring(0, 100)
      },
      component: 'url-image-validator'
    });
  }

  // WebP handling
  if (fileExtension === '.webp' && !config.allowWebP) {
    errors.push('WebP images are not supported');
    isValid = false;
  }

  // Log validation result
  if (!isValid) {
    logger.warn('Image URL validation failed', {
      requestId,
      metadata: {
        url: url.substring(0, 100),
        fileExtension,
        errors
      },
      component: 'url-image-validator'
    });
  }

  return {
    ...urlResult,
    isValid,
    error: errors.length > 0 ? 
      (urlResult.error ? `${urlResult.error}; ${errors.join('; ')}` : errors.join('; ')) : 
      urlResult.error,
    fileExtension: fileExtension || undefined,
    estimatedSize: undefined // Will be populated by async validation
  };
}

/**
 * Check if URL is reachable (async validation)
 */
export async function checkUrlReachability(
  url: string,
  timeout: number = 5000,
  requestId?: string
): Promise<{ reachable: boolean; responseCode?: number; redirectUrl?: string; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'manual' // Handle redirects manually for security
    });

    clearTimeout(timeoutId);

    // Handle redirects
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location');
      if (location) {
        // Validate redirect URL
        const redirectResult = validateUrl(location, DEFAULT_URL_CONFIG, requestId);
        if (!redirectResult.isValid) {
          return {
            reachable: false,
            responseCode: response.status,
            error: 'Redirect URL failed validation'
          };
        }
        
        return {
          reachable: true,
          responseCode: response.status,
          redirectUrl: location
        };
      }
    }

    return {
      reachable: response.ok,
      responseCode: response.status
    };

  } catch (error) {
    logger.debug('URL reachability check failed', {
      requestId,
      metadata: {
        url: url.substring(0, 100)
      },
      error: {
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      component: 'url-image-validator'
    });

    return {
      reachable: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validate image metadata (async)
 */
export async function validateImageMetadata(
  url: string,
  options: ImageValidationOptions = {},
  requestId?: string
): Promise<ImageMetadata> {
  const config = { ...DEFAULT_IMAGE_CONFIG, ...options };
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    // Fetch only the first part of the image to check headers
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Range': 'bytes=0-2048' // Get first 2KB for header analysis
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        isValid: false,
        errors: [`HTTP ${response.status}: ${response.statusText}`]
      };
    }

    const contentType = response.headers.get('Content-Type');
    const contentLength = response.headers.get('Content-Length');
    const errors: string[] = [];
    let isValid = true;

    // MIME type validation
    if (contentType && !config.allowedMimeTypes!.includes(contentType)) {
      errors.push(`MIME type '${contentType}' is not allowed`);
      isValid = false;
    }

    // Size validation (if available)
    if (contentLength) {
      const size = parseInt(contentLength);
      if (size > config.maxSizeBytes!) {
        errors.push(`Image size ${size} bytes exceeds maximum ${config.maxSizeBytes} bytes`);
        isValid = false;
      }
    }

    // Try to get image dimensions from headers (basic implementation)
    let width: number | undefined;
    let height: number | undefined;

    if (config.validateImageData) {
      try {
        const buffer = await response.arrayBuffer();
        const dimensions = extractImageDimensions(buffer, contentType || '');
        width = dimensions.width;
        height = dimensions.height;

        // Dimension validation
        if (width && height) {
          if (width < config.minWidth! || height < config.minHeight!) {
            errors.push(`Image dimensions ${width}x${height} below minimum ${config.minWidth}x${config.minHeight}`);
            isValid = false;
          }
          if (width > config.maxWidth! || height > config.maxHeight!) {
            errors.push(`Image dimensions ${width}x${height} exceed maximum ${config.maxWidth}x${config.maxHeight}`);
            isValid = false;
          }
        }
      } catch (error) {
        errors.push('Failed to validate image dimensions');
        isValid = false;
      }
    }

    return {
      width,
      height,
      format: contentType || undefined,
      size: contentLength ? parseInt(contentLength) : undefined,
      mimeType: contentType || undefined,
      isValid,
      errors
    };

  } catch (error) {
    logger.error('Image metadata validation failed', {
      requestId,
      metadata: {
        url: url.substring(0, 100)
      },
      error: {
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      component: 'url-image-validator'
    });

    return {
      isValid: false,
      errors: ['Failed to fetch image metadata']
    };
  }
}

/**
 * Extract image dimensions from buffer (basic implementation)
 */
function extractImageDimensions(buffer: ArrayBuffer, mimeType: string): { width?: number; height?: number } {
  const uint8Array = new Uint8Array(buffer);
  
  try {
    if (mimeType.includes('png')) {
      // PNG format: width and height are at bytes 16-23
      if (uint8Array.length >= 24) {
        const dataView = new DataView(buffer);
        const width = dataView.getUint32(16, false); // Big endian
        const height = dataView.getUint32(20, false);
        return { width, height };
      }
    } else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
      // JPEG format: more complex, simplified implementation
      // Look for SOF markers (0xFFC0, 0xFFC2)
      for (let i = 0; i < uint8Array.length - 8; i++) {
        if (uint8Array[i] === 0xFF && (uint8Array[i + 1] === 0xC0 || uint8Array[i + 1] === 0xC2)) {
          const dataView = new DataView(buffer, i + 5);
          const height = dataView.getUint16(0, false); // Big endian
          const width = dataView.getUint16(2, false);
          return { width, height };
        }
      }
    } else if (mimeType.includes('gif')) {
      // GIF format: width and height at bytes 6-9
      if (uint8Array.length >= 10) {
        const dataView = new DataView(buffer);
        const width = dataView.getUint16(6, true); // Little endian
        const height = dataView.getUint16(8, true);
        return { width, height };
      }
    }
  } catch (error) {
    // Ignore errors in dimension extraction
  }

  return {};
}

/**
 * Comprehensive image validation (combines sync and async)
 */
export async function validateImageComplete(
  url: string,
  options: ImageValidationOptions = {},
  requestId?: string
): Promise<ImageValidationResult> {
  const syncResult = validateImageUrl(url, options, requestId);
  
  if (!syncResult.isValid) {
    return syncResult;
  }

  const config = { ...DEFAULT_IMAGE_CONFIG, ...options };
  let reachabilityResult: Awaited<ReturnType<typeof checkUrlReachability>> | undefined;
  let metadataResult: ImageMetadata | undefined;

  // Async validations
  if (config.checkReachability) {
    reachabilityResult = await checkUrlReachability(url, 5000, requestId);
    if (!reachabilityResult.reachable) {
      return {
        ...syncResult,
        isValid: false,
        error: `${syncResult.error || ''}; URL is not reachable: ${reachabilityResult.error || 'Unknown error'}`.trim(),
        isReachable: false,
        responseCode: reachabilityResult.responseCode
      };
    }
  }

  if (config.validateImageData || config.checkImageHeaders) {
    metadataResult = await validateImageMetadata(url, options, requestId);
    if (!metadataResult.isValid) {
      return {
        ...syncResult,
        isValid: false,
        error: `${syncResult.error || ''}; ${metadataResult.errors.join('; ')}`.trim(),
        imageMetadata: metadataResult
      };
    }
  }

  return {
    ...syncResult,
    isReachable: reachabilityResult?.reachable,
    responseCode: reachabilityResult?.responseCode,
    redirectUrl: reachabilityResult?.redirectUrl,
    imageMetadata: metadataResult
  };
}

/**
 * URL and image validator utilities object
 */
export const urlImageValidator = {
  validateUrl,
  validateImageUrl,
  validateImageComplete,
  checkUrlReachability,
  validateImageMetadata,
  
  // Utility functions
  getFileExtension,
  isPrivateIp,
  hasSuspiciousPatterns,
  
  // Predefined configurations
  configs: {
    strict: {
      url: {
        ...DEFAULT_URL_CONFIG,
        requireSecure: true,
        allowIpAddresses: false,
        allowLocalhost: false,
        checkReachability: true,
        blockSuspiciousPatterns: true
      } as UrlValidationOptions,
      image: {
        ...DEFAULT_IMAGE_CONFIG,
        requireSecure: true,
        allowSvg: false,
        validateImageData: true,
        checkImageHeaders: true,
        maxSizeBytes: 5 * 1024 * 1024 // 5MB
      } as ImageValidationOptions
    },
    moderate: {
      url: DEFAULT_URL_CONFIG,
      image: DEFAULT_IMAGE_CONFIG
    },
    permissive: {
      url: {
        ...DEFAULT_URL_CONFIG,
        allowIpAddresses: true,
        allowLocalhost: true,
        blockSuspiciousPatterns: false,
        allowedProtocols: ['http', 'https', 'ftp']
      } as UrlValidationOptions,
      image: {
        ...DEFAULT_IMAGE_CONFIG,
        allowSvg: true,
        maxSizeBytes: 50 * 1024 * 1024, // 50MB
        allowedExtensions: [...DEFAULT_IMAGE_CONFIG.allowedExtensions!, '.svg', '.ico', '.tiff', '.tif']
      } as ImageValidationOptions
    }
  }
};

export default urlImageValidator;
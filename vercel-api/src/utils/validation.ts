/**
 * Input validation utility functions
 * Provides reusable validation functions for common data validation tasks
 * 
 * subtask 9.1: Enhanced validation functions with security improvements
 * - Added dangerous protocol blocking for URLs
 * - Enhanced email validation to prevent consecutive dots
 * - Added malformed hostname detection
 * - Improved error logging with structured context
 */

import { logger } from './logger';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  value?: any;
}

/**
 * Validation options for strings
 */
export interface StringValidationOptions {
  minLength?: number;
  maxLength?: number;
  allowEmpty?: boolean;
  pattern?: RegExp;
  trim?: boolean;
  customValidator?: (value: string) => boolean;
}

/**
 * Validation options for numbers
 */
export interface NumberValidationOptions {
  min?: number;
  max?: number;
  integer?: boolean;
  positive?: boolean;
  allowZero?: boolean;
}

/**
 * Validation options for URLs
 */
export interface UrlValidationOptions {
  allowedProtocols?: string[];
  allowedDomains?: string[];
  blockedDomains?: string[];
  requireTLD?: boolean;
  allowLocalhost?: boolean;
  allowIP?: boolean;
}

/**
 * Validation options for emails
 */
export interface EmailValidationOptions {
  allowedDomains?: string[];
  blockedDomains?: string[];
  requireTLD?: boolean;
  maxLength?: number;
}

/**
 * Common email validation pattern (RFC 5322 compliant)
 * Prevents consecutive dots and ensures proper format
 */
const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(?!.*\.\.)@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;



/**
 * IPv4 pattern
 */
const IPV4_PATTERN = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

/**
 * IPv6 pattern
 */
const IPV6_PATTERN = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

/**
 * Validate string input with comprehensive options
 */
export function validateString(value: any, options: StringValidationOptions = {}): ValidationResult {
  const {
    minLength = 0,
    maxLength = Infinity,
    allowEmpty = true,
    pattern,
    trim = true,
    customValidator
  } = options;

  // Type check
  if (typeof value !== 'string') {
    return {
      isValid: false,
      error: `Expected string, got ${typeof value}`
    };
  }

  let processedValue = trim ? value.trim() : value;

  // Empty check
  if (!allowEmpty && processedValue.length === 0) {
    return {
      isValid: false,
      error: 'String cannot be empty'
    };
  }

  // Length validation
  if (processedValue.length < minLength) {
    return {
      isValid: false,
      error: `String must be at least ${minLength} characters long`
    };
  }

  if (processedValue.length > maxLength) {
    return {
      isValid: false,
      error: `String must be no more than ${maxLength} characters long`
    };
  }

  // Pattern validation
  if (pattern && !pattern.test(processedValue)) {
    return {
      isValid: false,
      error: 'String does not match required pattern'
    };
  }

  // Custom validation
  if (customValidator && !customValidator(processedValue)) {
    return {
      isValid: false,
      error: 'String failed custom validation'
    };
  }

  return {
    isValid: true,
    value: processedValue
  };
}

/**
 * Validate email address
 */
export function validateEmail(value: any, options: EmailValidationOptions = {}): ValidationResult {
  const {
    allowedDomains,
    blockedDomains,
    requireTLD = true,
    maxLength = 320 // RFC 5321 limit
  } = options;

  // Basic string validation
  const stringResult = validateString(value, {
    minLength: 3,
    maxLength,
    allowEmpty: false,
    trim: true
  });

  if (!stringResult.isValid) {
    return stringResult;
  }

  const email = stringResult.value!.toLowerCase();

  // Pattern validation
  if (!EMAIL_PATTERN.test(email)) {
    return {
      isValid: false,
      error: 'Invalid email format'
    };
  }

  // Check for consecutive dots in local part
  const localPart = email.split('@')[0];
  if (localPart.includes('..')) {
    return {
      isValid: false,
      error: 'Invalid email format: consecutive dots not allowed'
    };
  }

  // Extract domain
  const domain = email.split('@')[1];

  // TLD validation
  if (requireTLD && !domain.includes('.')) {
    return {
      isValid: false,
      error: 'Email must have a valid top-level domain'
    };
  }

  // Domain allowlist
  if (allowedDomains && !allowedDomains.includes(domain)) {
    return {
      isValid: false,
      error: 'Email domain not allowed'
    };
  }

  // Domain blocklist
  if (blockedDomains && blockedDomains.includes(domain)) {
    return {
      isValid: false,
      error: 'Email domain is blocked'
    };
  }

  return {
    isValid: true,
    value: email
  };
}

/**
 * Validate URL
 */
export function validateUrl(value: any, options: UrlValidationOptions = {}): ValidationResult {
  const {
    allowedProtocols = ['http', 'https'],
    allowedDomains,
    blockedDomains,
    requireTLD = true,
    allowLocalhost = false,
    allowIP = false
  } = options;

  // Basic string validation
  const stringResult = validateString(value, {
    minLength: 7, // http://a
    maxLength: 2048, // Common browser limit
    allowEmpty: false,
    trim: true
  });

  if (!stringResult.isValid) {
    return stringResult;
  }

  const url = stringResult.value!;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid URL format'
    };
  }

  // Protocol validation
  const protocol = parsedUrl.protocol.slice(0, -1); // Remove trailing ':'
  
  // Block dangerous protocols
  const dangerousProtocols = ['javascript', 'data', 'vbscript', 'file'];
  if (dangerousProtocols.includes(protocol)) {
    return {
      isValid: false,
      error: `Dangerous protocol '${protocol}' not allowed`
    };
  }
  
  if (!allowedProtocols.includes(protocol)) {
    return {
      isValid: false,
      error: `Protocol '${protocol}' not allowed`
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Check for malformed hostnames
  if (hostname === '' || hostname.startsWith('.') || hostname.endsWith('.')) {
    return {
      isValid: false,
      error: 'Invalid hostname format'
    };
  }

  // IP address validation
  if (IPV4_PATTERN.test(hostname) || IPV6_PATTERN.test(hostname)) {
    if (!allowIP) {
      return {
        isValid: false,
        error: 'IP addresses not allowed'
      };
    }
  }

  // Localhost validation
  if ((hostname === 'localhost' || hostname.startsWith('127.') || hostname === '::1')) {
    if (!allowLocalhost) {
      return {
        isValid: false,
        error: 'Localhost URLs not allowed'
      };
    }
  }

  // TLD validation (skip for localhost and IPs)
  if (requireTLD && !allowLocalhost && !IPV4_PATTERN.test(hostname) && !IPV6_PATTERN.test(hostname)) {
    if (!hostname.includes('.')) {
      return {
        isValid: false,
        error: 'URL must have a valid top-level domain'
      };
    }
  }

  // Domain allowlist
  if (allowedDomains && !allowedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
    return {
      isValid: false,
      error: 'Domain not allowed'
    };
  }

  // Domain blocklist
  if (blockedDomains && blockedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
    return {
      isValid: false,
      error: 'Domain is blocked'
    };
  }

  return {
    isValid: true,
    value: url
  };
}

/**
 * Validate number
 */
export function validateNumber(value: any, options: NumberValidationOptions = {}): ValidationResult {
  const {
    min = -Infinity,
    max = Infinity,
    integer = false,
    positive = false,
    allowZero = true
  } = options;

  let numValue: number;

  // Type conversion and validation
  if (typeof value === 'number') {
    numValue = value;
  } else if (typeof value === 'string') {
    numValue = Number(value);
  } else {
    return {
      isValid: false,
      error: `Expected number or numeric string, got ${typeof value}`
    };
  }

  // NaN check
  if (isNaN(numValue)) {
    return {
      isValid: false,
      error: 'Invalid number'
    };
  }

  // Infinity check
  if (!isFinite(numValue)) {
    return {
      isValid: false,
      error: 'Number must be finite'
    };
  }

  // Integer check
  if (integer && !Number.isInteger(numValue)) {
    return {
      isValid: false,
      error: 'Number must be an integer'
    };
  }

  // Positive check
  if (positive && numValue < 0) {
    return {
      isValid: false,
      error: 'Number must be positive'
    };
  }

  // Zero check
  if (!allowZero && numValue === 0) {
    return {
      isValid: false,
      error: 'Number cannot be zero'
    };
  }

  // Range validation
  if (numValue < min) {
    return {
      isValid: false,
      error: `Number must be at least ${min}`
    };
  }

  if (numValue > max) {
    return {
      isValid: false,
      error: `Number must be no more than ${max}`
    };
  }

  return {
    isValid: true,
    value: numValue
  };
}

/**
 * Validate JSON string
 */
export function isValidJson(value: any): ValidationResult {
  if (typeof value !== 'string') {
    return {
      isValid: false,
      error: `Expected string, got ${typeof value}`
    };
  }

  try {
    const parsed = JSON.parse(value);
    return {
      isValid: true,
      value: parsed
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid JSON format'
    };
  }
}

/**
 * Validate image file extensions
 */
export function validateImageExtension(filename: string): ValidationResult {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
  
  if (typeof filename !== 'string') {
    return {
      isValid: false,
      error: 'Filename must be a string'
    };
  }

  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  
  if (!allowedExtensions.includes(extension)) {
    return {
      isValid: false,
      error: `Invalid image extension. Allowed: ${allowedExtensions.join(', ')}`
    };
  }

  return {
    isValid: true,
    value: extension
  };
}

/**
 * Validate MIME type for images
 */
export function validateImageMimeType(mimeType: string): ValidationResult {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/webp',
    'image/svg+xml'
  ];

  if (typeof mimeType !== 'string') {
    return {
      isValid: false,
      error: 'MIME type must be a string'
    };
  }

  const normalizedMimeType = mimeType.toLowerCase().trim();

  if (!allowedMimeTypes.includes(normalizedMimeType)) {
    return {
      isValid: false,
      error: `Invalid image MIME type. Allowed: ${allowedMimeTypes.join(', ')}`
    };
  }

  return {
    isValid: true,
    value: normalizedMimeType
  };
}

/**
 * Validate file size
 */
export function validateFileSize(size: number, maxSizeBytes: number = 10 * 1024 * 1024): ValidationResult {
  const numberResult = validateNumber(size, {
    min: 0,
    integer: true,
    positive: true,
    allowZero: false
  });

  if (!numberResult.isValid) {
    return {
      isValid: false,
      error: `Invalid file size: ${numberResult.error}`
    };
  }

  if (size > maxSizeBytes) {
    const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(2);
    return {
      isValid: false,
      error: `File size too large. Maximum allowed: ${maxSizeMB}MB`
    };
  }

  return {
    isValid: true,
    value: size
  };
}

/**
 * Validate hexadecimal color
 */
export function validateHexColor(value: any): ValidationResult {
  const stringResult = validateString(value, {
    allowEmpty: false,
    trim: true,
    pattern: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  });

  if (!stringResult.isValid) {
    return {
      isValid: false,
      error: 'Invalid hex color format (expected #RRGGBB or #RGB)'
    };
  }

  return {
    isValid: true,
    value: stringResult.value!.toUpperCase()
  };
}

/**
 * Validate slug (URL-friendly string)
 */
export function validateSlug(value: any, maxLength: number = 50): ValidationResult {
  const stringResult = validateString(value, {
    minLength: 1,
    maxLength,
    allowEmpty: false,
    trim: true,
    pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  });

  if (!stringResult.isValid) {
    return {
      isValid: false,
      error: 'Invalid slug format (use lowercase letters, numbers, and hyphens only)'
    };
  }

  return stringResult;
}

/**
 * Validate boolean value (including string representations)
 */
export function validateBoolean(value: any): ValidationResult {
  if (typeof value === 'boolean') {
    return {
      isValid: true,
      value
    };
  }

  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase().trim();
    
    if (['true', '1', 'yes', 'on'].includes(lowerValue)) {
      return {
        isValid: true,
        value: true
      };
    }
    
    if (['false', '0', 'no', 'off'].includes(lowerValue)) {
      return {
        isValid: true,
        value: false
      };
    }
  }

  if (typeof value === 'number') {
    return {
      isValid: true,
      value: Boolean(value)
    };
  }

  return {
    isValid: false,
    error: 'Invalid boolean value'
  };
}

/**
 * Validate array with element validation
 */
export function validateArray<T>(
  value: any,
  elementValidator: (item: any) => ValidationResult,
  options: { minLength?: number; maxLength?: number; allowEmpty?: boolean } = {}
): ValidationResult {
  const { minLength = 0, maxLength = Infinity, allowEmpty = true } = options;

  if (!Array.isArray(value)) {
    return {
      isValid: false,
      error: `Expected array, got ${typeof value}`
    };
  }

  if (!allowEmpty && value.length === 0) {
    return {
      isValid: false,
      error: 'Array cannot be empty'
    };
  }

  if (value.length < minLength) {
    return {
      isValid: false,
      error: `Array must have at least ${minLength} elements`
    };
  }

  if (value.length > maxLength) {
    return {
      isValid: false,
      error: `Array must have no more than ${maxLength} elements`
    };
  }

  const validatedElements: T[] = [];
  for (let i = 0; i < value.length; i++) {
    const elementResult = elementValidator(value[i]);
    if (!elementResult.isValid) {
      return {
        isValid: false,
        error: `Invalid element at index ${i}: ${elementResult.error}`
      };
    }
    validatedElements.push(elementResult.value);
  }

  return {
    isValid: true,
    value: validatedElements
  };
}

/**
 * Validate date string or Date object
 */
export function validateDate(value: any, options: { future?: boolean; past?: boolean } = {}): ValidationResult {
  const { future, past } = options;

  let date: Date;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'string') {
    date = new Date(value);
  } else if (typeof value === 'number') {
    date = new Date(value);
  } else {
    return {
      isValid: false,
      error: `Expected Date, string, or number, got ${typeof value}`
    };
  }

  if (isNaN(date.getTime())) {
    return {
      isValid: false,
      error: 'Invalid date'
    };
  }

  const now = new Date();

  if (future && date <= now) {
    return {
      isValid: false,
      error: 'Date must be in the future'
    };
  }

  if (past && date >= now) {
    return {
      isValid: false,
      error: 'Date must be in the past'
    };
  }

  return {
    isValid: true,
    value: date
  };
}

/**
 * Sanitize string to prevent basic XSS
 */
export function sanitizeString(value: string): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/[<>]/g, '') // Remove basic HTML brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validation utilities object for easy import
 */
export const validationUtils = {
  validateString,
  validateEmail,
  validateUrl,
  validateNumber,
  isValidJson,
  validateImageExtension,
  validateImageMimeType,
  validateFileSize,
  validateHexColor,
  validateSlug,
  validateBoolean,
  validateArray,
  validateDate,
  sanitizeString
};

/**
 * Log validation error for debugging
 */
export function logValidationError(field: string, error: string, requestId?: string): void {
  const context: any = {
    error: {
      message: error
    },
    component: 'validation',
    metadata: {
      field
    }
  };
  
  if (requestId) {
    context.requestId = requestId;
  }
  
  logger.warn('Validation error', context);
}

export default validationUtils; 
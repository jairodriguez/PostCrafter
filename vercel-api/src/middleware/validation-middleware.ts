/**
 * Input validation middleware for Express
 * Provides comprehensive request validation using schemas and utility functions
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { logger } from '../utils/logger';
import { validationUtils, ValidationResult } from '../utils/validation';
import { contentSanitizer } from '../utils/content-sanitizer';
import { urlImageValidator } from '../utils/url-image-validator';

/**
 * Validation schema field configuration
 */
export interface ValidationFieldSchema {
  // Field type
  type: 'string' | 'number' | 'boolean' | 'email' | 'url' | 'imageUrl' | 'json' | 'array' | 'date' | 'slug' | 'hexColor';
  
  // Field requirements
  required?: boolean;
  
  // String validation options
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  allowEmpty?: boolean;
  trim?: boolean;
  
  // Number validation options
  min?: number;
  max?: number;
  integer?: boolean;
  positive?: boolean;
  
  // Array validation options
  minItems?: number;
  maxItems?: number;
  itemType?: ValidationFieldSchema;
  
  // Content sanitization options
  sanitize?: boolean;
  sanitizeAs?: 'text' | 'html' | 'markdown';
  sanitizeOptions?: any;
  
  // URL validation options
  urlOptions?: any;
  imageOptions?: any;
  
  // Custom validation function
  customValidator?: (value: any) => ValidationResult;
  
  // Default value
  defaultValue?: any;
  
  // Transform function (applied after validation)
  transform?: (value: any) => any;
  
  // Field description for error messages
  description?: string;
}

/**
 * Validation schema for request body, query, or params
 */
export interface ValidationSchema {
  [fieldName: string]: ValidationFieldSchema;
}

/**
 * Validation configuration
 */
export interface ValidationConfig {
  // Schema for request body
  body?: ValidationSchema;
  // Schema for query parameters
  query?: ValidationSchema;
  // Schema for route parameters
  params?: ValidationSchema;
  // Schema for headers
  headers?: ValidationSchema;
  
  // Validation options
  strict?: boolean; // Reject unknown fields
  abortEarly?: boolean; // Stop on first error
  allowUnknown?: boolean; // Allow fields not in schema
  stripUnknown?: boolean; // Remove unknown fields
  
  // Custom error message
  errorMessage?: string;
  
  // Transform options
  coerceTypes?: boolean; // Convert string numbers to numbers, etc.
  
  // Security options
  maxFieldCount?: number; // Maximum number of fields
  maxDepth?: number; // Maximum object nesting depth
  preventPrototypePollution?: boolean; // Prevent __proto__ attacks
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  value: any;
  message: string;
  code: string;
}

/**
 * Validation result
 */
export interface ValidationResultDetailed {
  isValid: boolean;
  errors: ValidationError[];
  sanitized?: any;
  warnings?: string[];
}

/**
 * Default validation configuration
 */
const DEFAULT_CONFIG: ValidationConfig = {
  strict: false,
  abortEarly: false,
  allowUnknown: true,
  stripUnknown: false,
  coerceTypes: true,
  maxFieldCount: 100,
  maxDepth: 10,
  preventPrototypePollution: true
};

/**
 * Validate a single field against its schema
 */
function validateField(
  fieldName: string,
  value: any,
  schema: ValidationFieldSchema,
  requestId?: string
): ValidationResultDetailed {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  let sanitized = value;
  let isValid = true;

  try {
    // Handle required fields
    if (schema.required && (value === undefined || value === null || value === '')) {
      return {
        isValid: false,
        errors: [{
          field: fieldName,
          value,
          message: `${schema.description || fieldName} is required`,
          code: 'REQUIRED'
        }]
      };
    }

    // Handle optional fields
    if (!schema.required && (value === undefined || value === null)) {
      if (schema.defaultValue !== undefined) {
        sanitized = schema.defaultValue;
      }
      return { isValid: true, errors: [], sanitized };
    }

    // Handle empty strings
    if (value === '' && !schema.allowEmpty) {
      if (schema.defaultValue !== undefined) {
        sanitized = schema.defaultValue;
      } else if (!schema.required) {
        return { isValid: true, errors: [], sanitized: undefined };
      } else {
        return {
          isValid: false,
          errors: [{
            field: fieldName,
            value,
            message: `${schema.description || fieldName} cannot be empty`,
            code: 'EMPTY'
          }]
        };
      }
    }

    // Trim strings if specified
    if (schema.trim && typeof sanitized === 'string') {
      sanitized = sanitized.trim();
    }

    // Type coercion
    if (schema.type === 'number' && typeof sanitized === 'string') {
      const num = Number(sanitized);
      if (!isNaN(num)) {
        sanitized = num;
      }
    } else if (schema.type === 'boolean' && typeof sanitized === 'string') {
      sanitized = sanitized.toLowerCase() === 'true' || sanitized === '1';
    }

    // Validate based on type
    let validationResult: ValidationResult;
    
    switch (schema.type) {
      case 'string':
        validationResult = validationUtils.validateString(sanitized, {
          minLength: schema.minLength,
          maxLength: schema.maxLength,
          pattern: schema.pattern,
          allowEmpty: schema.allowEmpty,
          trim: schema.trim
        });
        break;
        
      case 'number':
        validationResult = validationUtils.validateNumber(sanitized, {
          min: schema.min,
          max: schema.max,
          integer: schema.integer,
          positive: schema.positive
        });
        break;
        
      case 'boolean':
        validationResult = validationUtils.validateBoolean(sanitized);
        break;
        
      case 'email':
        validationResult = validationUtils.validateEmail(sanitized);
        break;
        
      case 'url':
        validationResult = urlImageValidator.validateUrl(sanitized, schema.urlOptions, requestId);
        break;
        
      case 'imageUrl':
        validationResult = urlImageValidator.validateImageUrl(sanitized, schema.imageOptions, requestId);
        break;
        
      case 'json':
        validationResult = validationUtils.isValidJson(sanitized);
        break;
        
      case 'array':
        validationResult = validationUtils.validateArray(
          sanitized,
          schema.itemType ? (item: any) => validateField(`${fieldName}[item]`, item, schema.itemType!, requestId).isValid ? { isValid: true } : { isValid: false, error: 'Invalid item' } : () => ({ isValid: true }),
          {
            minLength: schema.minItems,
            maxLength: schema.maxItems,
            allowEmpty: schema.allowEmpty
          }
        );
        break;
        
      case 'date':
        validationResult = validationUtils.validateDate(sanitized);
        break;
        
      case 'slug':
        validationResult = validationUtils.validateSlug(sanitized, schema.maxLength);
        break;
        
      case 'hexColor':
        validationResult = validationUtils.validateHexColor(sanitized);
        break;
        
      default:
        validationResult = { isValid: true };
    }

    if (!validationResult.isValid) {
      errors.push({
        field: fieldName,
        value: sanitized,
        message: validationResult.error || `Invalid ${schema.type}`,
        code: 'INVALID_TYPE'
      });
      isValid = false;
    }

    // Apply custom validation
    if (isValid && schema.customValidator) {
      const customResult = schema.customValidator(sanitized);
      if (!customResult.isValid) {
        errors.push({
          field: fieldName,
          value: sanitized,
          message: customResult.error || 'Custom validation failed',
          code: 'CUSTOM_VALIDATION'
        });
        isValid = false;
      }
    }

    // Apply sanitization
    if (isValid && schema.sanitize && typeof sanitized === 'string') {
      const sanitizeType = schema.sanitizeAs || 'text';
      const sanitizeResult = contentSanitizer.sanitizeContent(
        sanitized,
        sanitizeType,
        schema.sanitizeOptions,
        requestId
      );
      
      sanitized = sanitizeResult.sanitized;
      
      if (sanitizeResult.wasModified) {
        warnings.push(`${fieldName} was sanitized for security`);
      }
      
      if (sanitizeResult.warnings.length > 0) {
        warnings.push(...sanitizeResult.warnings.map(w => `${fieldName}: ${w}`));
      }
    }

    // Apply transformation
    if (isValid && schema.transform) {
      sanitized = schema.transform(sanitized);
    }

    return {
      isValid,
      errors,
      sanitized,
      warnings
    };

  } catch (error) {
    logger.error('Field validation error', {
      requestId,
      fieldName,
      error: error instanceof Error ? error.message : 'Unknown error',
      component: 'validation-middleware'
    });

    return {
      isValid: false,
      errors: [{
        field: fieldName,
        value,
        message: 'Validation failed due to internal error',
        code: 'INTERNAL_ERROR'
      }]
    };
  }
}

/**
 * Validate an object against a schema
 */
function validateObject(
  data: any,
  schema: ValidationSchema,
  config: ValidationConfig,
  requestId?: string
): ValidationResultDetailed {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  const sanitized: any = {};
  let isValid = true;

  try {
    // Security checks
    if (config.preventPrototypePollution) {
      // Remove dangerous prototype properties
      if (data && typeof data === 'object') {
        delete data.__proto__;
        delete data.constructor;
        delete data.prototype;
      }
    }

    // Check field count
    if (config.maxFieldCount && data && typeof data === 'object') {
      const fieldCount = Object.keys(data).length;
      if (fieldCount > config.maxFieldCount) {
        return {
          isValid: false,
          errors: [{
            field: '_root',
            value: data,
            message: `Too many fields: ${fieldCount}, maximum allowed: ${config.maxFieldCount}`,
            code: 'TOO_MANY_FIELDS'
          }]
        };
      }
    }

    // Validate required fields from schema
    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
      const fieldValue = data?.[fieldName];
      const fieldResult = validateField(fieldName, fieldValue, fieldSchema, requestId);
      
      if (!fieldResult.isValid) {
        errors.push(...fieldResult.errors);
        isValid = false;
        
        if (config.abortEarly) {
          break;
        }
      } else {
        // Only include the field if it has a value or a default was applied
        if (fieldResult.sanitized !== undefined) {
          sanitized[fieldName] = fieldResult.sanitized;
        }
        
        if (fieldResult.warnings) {
          warnings.push(...fieldResult.warnings);
        }
      }
    }

    // Handle unknown fields
    if (data && typeof data === 'object') {
      const unknownFields = Object.keys(data).filter(key => !schema.hasOwnProperty(key));
      
      if (unknownFields.length > 0) {
        if (config.strict) {
          unknownFields.forEach(field => {
            errors.push({
              field,
              value: data[field],
              message: `Unknown field: ${field}`,
              code: 'UNKNOWN_FIELD'
            });
          });
          isValid = false;
        } else if (config.allowUnknown && !config.stripUnknown) {
          // Include unknown fields in output
          unknownFields.forEach(field => {
            sanitized[field] = data[field];
          });
        }
        // If stripUnknown is true, we simply don't include them
      }
    }

    return {
      isValid,
      errors,
      sanitized,
      warnings
    };

  } catch (error) {
    logger.error('Object validation error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      component: 'validation-middleware'
    });

    return {
      isValid: false,
      errors: [{
        field: '_root',
        value: data,
        message: 'Validation failed due to internal error',
        code: 'INTERNAL_ERROR'
      }]
    };
  }
}

/**
 * Create validation middleware
 */
export function createValidationMiddleware(
  config: ValidationConfig
): (req: VercelRequest, res: VercelResponse, next?: () => void) => Promise<void> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  return async (req: VercelRequest, res: VercelResponse, next?: () => void): Promise<void> => {
    const requestId = (req as any).requestId || `validation_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const startTime = Date.now();

    try {
      const validationResults: Record<string, ValidationResultDetailed> = {};
      let hasErrors = false;
      const allWarnings: string[] = [];

      // Validate body
      if (mergedConfig.body) {
        validationResults.body = validateObject(req.body, mergedConfig.body, mergedConfig, requestId);
        if (!validationResults.body.isValid) {
          hasErrors = true;
        } else {
          req.body = validationResults.body.sanitized;
          if (validationResults.body.warnings) {
            allWarnings.push(...validationResults.body.warnings);
          }
        }
      }

      // Validate query parameters
      if (mergedConfig.query && !hasErrors) {
        validationResults.query = validateObject(req.query, mergedConfig.query, mergedConfig, requestId);
        if (!validationResults.query.isValid) {
          hasErrors = true;
        } else {
          req.query = validationResults.query.sanitized;
          if (validationResults.query.warnings) {
            allWarnings.push(...validationResults.query.warnings);
          }
        }
      }

      // Validate route parameters
      if (mergedConfig.params && !hasErrors) {
        const params = (req as any).params || {};
        validationResults.params = validateObject(params, mergedConfig.params, mergedConfig, requestId);
        if (!validationResults.params.isValid) {
          hasErrors = true;
        } else {
          (req as any).params = validationResults.params.sanitized;
          if (validationResults.params.warnings) {
            allWarnings.push(...validationResults.params.warnings);
          }
        }
      }

      // Validate headers
      if (mergedConfig.headers && !hasErrors) {
        validationResults.headers = validateObject(req.headers, mergedConfig.headers, mergedConfig, requestId);
        if (!validationResults.headers.isValid) {
          hasErrors = true;
        } else {
          req.headers = validationResults.headers.sanitized;
          if (validationResults.headers.warnings) {
            allWarnings.push(...validationResults.headers.warnings);
          }
        }
      }

      // Handle validation errors
      if (hasErrors) {
        const allErrors = Object.values(validationResults)
          .filter(result => !result.isValid)
          .flatMap(result => result.errors);

        logger.warn('Request validation failed', {
          requestId,
          errors: allErrors.map(e => ({ field: e.field, message: e.message, code: e.code })),
          processingTime: Date.now() - startTime,
          component: 'validation-middleware'
        });

        res.status(400).json({
          error: 'Validation failed',
          message: mergedConfig.errorMessage || 'Request validation failed',
          details: allErrors.map(e => ({
            field: e.field,
            message: e.message,
            code: e.code
          })),
          requestId
        });
        return;
      }

      // Log warnings if any
      if (allWarnings.length > 0) {
        logger.info('Request validation warnings', {
          requestId,
          warnings: allWarnings,
          processingTime: Date.now() - startTime,
          component: 'validation-middleware'
        });
      }

      // Add validation metadata to request
      (req as any).validationMetadata = {
        requestId,
        warnings: allWarnings,
        processingTime: Date.now() - startTime
      };

      // Continue to next middleware
      if (next) {
        next();
      }

    } catch (error) {
      logger.error('Validation middleware error', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        processingTime: Date.now() - startTime,
        component: 'validation-middleware'
      });

      res.status(500).json({
        error: 'Internal validation error',
        message: 'Request validation failed due to internal error',
        requestId
      });
    }
  };
}

/**
 * Common validation schemas for reuse
 */
export const commonSchemas = {
  // WordPress post content
  postContent: {
    title: {
      type: 'string' as const,
      required: true,
      minLength: 1,
      maxLength: 200,
      trim: true,
      sanitize: true,
      sanitizeAs: 'text' as const,
      description: 'Post title'
    },
    content: {
      type: 'string' as const,
      required: true,
      minLength: 1,
      maxLength: 100000,
      sanitize: true,
      sanitizeAs: 'html' as const,
      description: 'Post content'
    },
    excerpt: {
      type: 'string' as const,
      required: false,
      maxLength: 500,
      sanitize: true,
      sanitizeAs: 'text' as const,
      description: 'Post excerpt'
    },
    featuredImage: {
      type: 'imageUrl' as const,
      required: false,
      imageOptions: {
        requireSecure: true,
        maxSizeBytes: 10 * 1024 * 1024
      },
      description: 'Featured image URL'
    },
    categories: {
      type: 'array' as const,
      required: false,
      itemType: {
        type: 'string' as const,
        minLength: 1,
        maxLength: 50
      },
      maxItems: 10,
      description: 'Post categories'
    },
    tags: {
      type: 'array' as const,
      required: false,
      itemType: {
        type: 'string' as const,
        minLength: 1,
        maxLength: 30
      },
      maxItems: 20,
      description: 'Post tags'
    },
    status: {
      type: 'string' as const,
      required: false,
      pattern: /^(draft|publish|private)$/,
      defaultValue: 'draft',
      description: 'Post status'
    }
  },

  // Pagination and filtering
  pagination: {
    page: {
      type: 'number' as const,
      required: false,
      min: 1,
      integer: true,
      defaultValue: 1,
      description: 'Page number'
    },
    limit: {
      type: 'number' as const,
      required: false,
      min: 1,
      max: 100,
      integer: true,
      defaultValue: 20,
      description: 'Items per page'
    },
    sort: {
      type: 'string' as const,
      required: false,
      pattern: /^(date|title|author)$/,
      defaultValue: 'date',
      description: 'Sort field'
    },
    order: {
      type: 'string' as const,
      required: false,
      pattern: /^(asc|desc)$/,
      defaultValue: 'desc',
      description: 'Sort order'
    }
  },

  // User input
  userInput: {
    name: {
      type: 'string' as const,
      required: true,
      minLength: 1,
      maxLength: 100,
      trim: true,
      sanitize: true,
      description: 'User name'
    },
    email: {
      type: 'email' as const,
      required: true,
      description: 'Email address'
    },
    website: {
      type: 'url' as const,
      required: false,
      urlOptions: {
        requireSecure: true
      },
      description: 'Website URL'
    }
  }
};

/**
 * Validation middleware utilities
 */
export const validationMiddleware = {
  create: createValidationMiddleware,
  schemas: commonSchemas,
  
  // Pre-configured middleware for common use cases
  postContent: createValidationMiddleware({
    body: commonSchemas.postContent,
    strict: false,
    stripUnknown: true
  }),
  
  pagination: createValidationMiddleware({
    query: commonSchemas.pagination,
    strict: false
  }),
  
  userInput: createValidationMiddleware({
    body: commonSchemas.userInput,
    strict: true
  })
};

export default validationMiddleware;
import { jest } from '@jest/globals';
import {
  createValidationMiddleware,
  validationMiddleware,
  commonSchemas,
  ValidationConfig,
  ValidationFieldSchema
} from '../validation-middleware';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Mock dependencies
jest.mock('../../utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../../utils/content-sanitizer', () => ({
  contentSanitizer: {
    sanitizeContent: jest.fn((content, type) => ({
      sanitized: content,
      wasModified: false,
      warnings: [],
      removedElements: [],
      stats: { originalLength: content.length, sanitizedLength: content.length, removedCount: 0 }
    }))
  }
}));

jest.mock('../../utils/url-image-validator', () => ({
  urlImageValidator: {
    validateUrl: jest.fn((url) => ({
      isValid: url.startsWith('http'),
      error: url.startsWith('http') ? undefined : 'Invalid URL'
    })),
    validateImageUrl: jest.fn((url) => ({
      isValid: url.startsWith('http') && (url.endsWith('.jpg') || url.endsWith('.png')),
      error: (url.startsWith('http') && (url.endsWith('.jpg') || url.endsWith('.png'))) ? undefined : 'Invalid image URL'
    }))
  }
}));

// Mock validation utils
jest.mock('../../utils/validation', () => ({
  validationUtils: {
    validateString: jest.fn((value, options = {}) => {
      if (typeof value !== 'string') return { isValid: false, error: 'Must be a string' };
      if (options.minLength && value.length < options.minLength) return { isValid: false, error: 'Too short' };
      if (options.maxLength && value.length > options.maxLength) return { isValid: false, error: 'Too long' };
      if (options.pattern && !options.pattern.test(value)) return { isValid: false, error: 'Pattern mismatch' };
      return { isValid: true };
    }),
    validateNumber: jest.fn((value, options = {}) => {
      const num = Number(value);
      if (isNaN(num)) return { isValid: false, error: 'Must be a number' };
      if (options.min !== undefined && num < options.min) return { isValid: false, error: 'Too small' };
      if (options.max !== undefined && num > options.max) return { isValid: false, error: 'Too large' };
      if (options.integer && !Number.isInteger(num)) return { isValid: false, error: 'Must be integer' };
      return { isValid: true };
    }),
    validateBoolean: jest.fn((value) => ({
      isValid: typeof value === 'boolean',
      error: typeof value === 'boolean' ? undefined : 'Must be a boolean'
    })),
    validateEmail: jest.fn((value) => ({
      isValid: typeof value === 'string' && value.includes('@'),
      error: (typeof value === 'string' && value.includes('@')) ? undefined : 'Invalid email'
    })),
    isValidJson: jest.fn((value) => {
      try {
        JSON.parse(value);
        return { isValid: true };
      } catch {
        return { isValid: false, error: 'Invalid JSON' };
      }
    }),
    validateArray: jest.fn((value, validator, options = {}) => {
      if (!Array.isArray(value)) return { isValid: false, error: 'Must be an array' };
      if (options.minLength && value.length < options.minLength) return { isValid: false, error: 'Too few items' };
      if (options.maxLength && value.length > options.maxLength) return { isValid: false, error: 'Too many items' };
      return { isValid: true };
    }),
    validateDate: jest.fn((value) => ({
      isValid: !isNaN(Date.parse(value)),
      error: isNaN(Date.parse(value)) ? 'Invalid date' : undefined
    })),
    validateSlug: jest.fn((value, maxLength) => ({
      isValid: typeof value === 'string' && /^[a-z0-9-]+$/.test(value),
      error: (typeof value === 'string' && /^[a-z0-9-]+$/.test(value)) ? undefined : 'Invalid slug'
    })),
    validateHexColor: jest.fn((value) => ({
      isValid: typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value),
      error: (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) ? undefined : 'Invalid hex color'
    }))
  }
}));

describe('Validation Middleware', () => {
  let mockRequest: Partial<VercelRequest>;
  let mockResponse: Partial<VercelResponse>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      body: {},
      query: {},
      headers: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
  });

  describe('createValidationMiddleware', () => {
    it('should create middleware function', () => {
      const config: ValidationConfig = {
        body: {
          name: { type: 'string', required: true }
        }
      };
      
      const middleware = createValidationMiddleware(config);
      expect(typeof middleware).toBe('function');
    });

    it('should validate required fields', async () => {
      const config: ValidationConfig = {
        body: {
          name: { type: 'string', required: true }
        }
      };
      
      const middleware = createValidationMiddleware(config);
      mockRequest.body = {};
      
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'name',
              code: 'REQUIRED'
            })
          ])
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass validation with valid data', async () => {
      const config: ValidationConfig = {
        body: {
          name: { type: 'string', required: true }
        }
      };
      
      const middleware = createValidationMiddleware(config);
      mockRequest.body = { name: 'John Doe' };
      
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.body).toEqual({ name: 'John Doe' });
    });

    it('should apply default values', async () => {
      const config: ValidationConfig = {
        body: {
          status: { type: 'string', required: false, defaultValue: 'active' }
        }
      };
      
      const middleware = createValidationMiddleware(config);
      mockRequest.body = {};
      
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.body).toEqual({ status: 'active' });
    });

    it('should validate string fields', async () => {
      const config: ValidationConfig = {
        body: {
          title: { type: 'string', required: true, minLength: 3, maxLength: 10 }
        }
      };
      
      const middleware = createValidationMiddleware(config);
      
      // Test valid string
      mockRequest.body = { title: 'Valid' };
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      expect(mockNext).toHaveBeenCalled();
      
      // Reset mocks
      jest.clearAllMocks();
      mockNext.mockClear();
      
      // Test invalid string (too short)
      mockRequest.body = { title: 'Hi' };
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should validate number fields', async () => {
      const config: ValidationConfig = {
        body: {
          age: { type: 'number', required: true, min: 0, max: 120, integer: true }
        }
      };
      
      const middleware = createValidationMiddleware(config);
      
      // Test valid number
      mockRequest.body = { age: 25 };
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      expect(mockNext).toHaveBeenCalled();
      
      // Reset mocks
      jest.clearAllMocks();
      mockNext.mockClear();
      
      // Test invalid number (too large)
      mockRequest.body = { age: 150 };
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should validate email fields', async () => {
      const config: ValidationConfig = {
        body: {
          email: { type: 'email', required: true }
        }
      };
      
      const middleware = createValidationMiddleware(config);
      
      // Test valid email
      mockRequest.body = { email: 'test@example.com' };
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      expect(mockNext).toHaveBeenCalled();
      
      // Reset mocks
      jest.clearAllMocks();
      mockNext.mockClear();
      
      // Test invalid email
      mockRequest.body = { email: 'invalid-email' };
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should validate URL fields', async () => {
      const config: ValidationConfig = {
        body: {
          website: { type: 'url', required: true }
        }
      };
      
      const middleware = createValidationMiddleware(config);
      
      // Test valid URL
      mockRequest.body = { website: 'https://example.com' };
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      expect(mockNext).toHaveBeenCalled();
      
      // Reset mocks
      jest.clearAllMocks();
      mockNext.mockClear();
      
      // Test invalid URL
      mockRequest.body = { website: 'not-a-url' };
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should validate image URL fields', async () => {
      const config: ValidationConfig = {
        body: {
          avatar: { type: 'imageUrl', required: true }
        }
      };
      
      const middleware = createValidationMiddleware(config);
      
      // Test valid image URL
      mockRequest.body = { avatar: 'https://example.com/image.jpg' };
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      expect(mockNext).toHaveBeenCalled();
      
      // Reset mocks
      jest.clearAllMocks();
      mockNext.mockClear();
      
      // Test invalid image URL
      mockRequest.body = { avatar: 'https://example.com/document.pdf' };
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should validate array fields', async () => {
      const config: ValidationConfig = {
        body: {
          tags: { 
            type: 'array', 
            required: true, 
            minItems: 1, 
            maxItems: 5,
            itemType: { type: 'string', minLength: 1 }
          }
        }
      };
      
      const middleware = createValidationMiddleware(config);
      
      // Test valid array
      mockRequest.body = { tags: ['tag1', 'tag2'] };
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      expect(mockNext).toHaveBeenCalled();
      
      // Reset mocks
      jest.clearAllMocks();
      mockNext.mockClear();
      
      // Test invalid array (too many items)
      mockRequest.body = { tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'] };
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should validate JSON fields', async () => {
      const config: ValidationConfig = {
        body: {
          metadata: { type: 'json', required: true }
        }
      };
      
      const middleware = createValidationMiddleware(config);
      
      // Test valid JSON
      mockRequest.body = { metadata: '{"key": "value"}' };
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      expect(mockNext).toHaveBeenCalled();
      
      // Reset mocks
      jest.clearAllMocks();
      mockNext.mockClear();
      
      // Test invalid JSON
      mockRequest.body = { metadata: '{invalid json}' };
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should validate slug fields', async () => {
      const config: ValidationConfig = {
        body: {
          slug: { type: 'slug', required: true }
        }
      };
      
      const middleware = createValidationMiddleware(config);
      
      // Test valid slug
      mockRequest.body = { slug: 'valid-slug-123' };
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      expect(mockNext).toHaveBeenCalled();
      
      // Reset mocks
      jest.clearAllMocks();
      mockNext.mockClear();
      
      // Test invalid slug
      mockRequest.body = { slug: 'Invalid Slug!' };
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should validate hex color fields', async () => {
      const config: ValidationConfig = {
        body: {
          color: { type: 'hexColor', required: true }
        }
      };
      
      const middleware = createValidationMiddleware(config);
      
      // Test valid hex color
      mockRequest.body = { color: '#FF0000' };
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      expect(mockNext).toHaveBeenCalled();
      
      // Reset mocks
      jest.clearAllMocks();
      mockNext.mockClear();
      
      // Test invalid hex color
      mockRequest.body = { color: 'red' };
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should validate query parameters', async () => {
      const config: ValidationConfig = {
        query: {
          page: { type: 'number', required: false, defaultValue: 1, min: 1 }
        }
      };
      
      const middleware = createValidationMiddleware(config);
      mockRequest.query = { page: '2' };
      
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.query).toEqual({ page: 2 });
    });

    it('should handle custom validators', async () => {
      const config: ValidationConfig = {
        body: {
          username: {
            type: 'string',
            required: true,
            customValidator: (value) => ({
              isValid: value !== 'admin',
              error: value === 'admin' ? 'Username "admin" is reserved' : undefined
            })
          }
        }
      };
      
      const middleware = createValidationMiddleware(config);
      
      // Test valid custom validation
      mockRequest.body = { username: 'john' };
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      expect(mockNext).toHaveBeenCalled();
      
      // Reset mocks
      jest.clearAllMocks();
      mockNext.mockClear();
      
      // Test invalid custom validation
      mockRequest.body = { username: 'admin' };
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'username',
              message: 'Username "admin" is reserved',
              code: 'CUSTOM_VALIDATION'
            })
          ])
        })
      );
    });

    it('should apply transformations', async () => {
      const config: ValidationConfig = {
        body: {
          name: {
            type: 'string',
            required: true,
            transform: (value) => value.toUpperCase()
          }
        }
      };
      
      const middleware = createValidationMiddleware(config);
      mockRequest.body = { name: 'john doe' };
      
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.body).toEqual({ name: 'JOHN DOE' });
    });

    it('should handle strict mode', async () => {
      const config: ValidationConfig = {
        body: {
          name: { type: 'string', required: true }
        },
        strict: true
      };
      
      const middleware = createValidationMiddleware(config);
      mockRequest.body = { name: 'John', unknownField: 'value' };
      
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'unknownField',
              code: 'UNKNOWN_FIELD'
            })
          ])
        })
      );
    });

    it('should strip unknown fields when configured', async () => {
      const config: ValidationConfig = {
        body: {
          name: { type: 'string', required: true }
        },
        stripUnknown: true
      };
      
      const middleware = createValidationMiddleware(config);
      mockRequest.body = { name: 'John', unknownField: 'value' };
      
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.body).toEqual({ name: 'John' });
    });

    it('should handle too many fields', async () => {
      const config: ValidationConfig = {
        body: {
          name: { type: 'string', required: true }
        },
        maxFieldCount: 2
      };
      
      const middleware = createValidationMiddleware(config);
      mockRequest.body = { 
        name: 'John', 
        field1: 'value1', 
        field2: 'value2', 
        field3: 'value3' 
      };
      
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              field: '_root',
              code: 'TOO_MANY_FIELDS'
            })
          ])
        })
      );
    });

    it('should prevent prototype pollution', async () => {
      const config: ValidationConfig = {
        body: {
          name: { type: 'string', required: true }
        },
        preventPrototypePollution: true
      };
      
      const middleware = createValidationMiddleware(config);
      mockRequest.body = { 
        name: 'John',
        __proto__: { polluted: true },
        constructor: { polluted: true }
      };
      
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.body.__proto__).toBeUndefined();
      expect(mockRequest.body.constructor).toBeUndefined();
    });

    it('should handle type coercion', async () => {
      const config: ValidationConfig = {
        body: {
          age: { type: 'number', required: true },
          active: { type: 'boolean', required: true }
        },
        coerceTypes: true
      };
      
      const middleware = createValidationMiddleware(config);
      mockRequest.body = { age: '25', active: 'true' };
      
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.body).toEqual({ age: 25, active: true });
    });

    it('should handle sanitization', async () => {
      const { contentSanitizer } = require('../../utils/content-sanitizer');
      contentSanitizer.sanitizeContent.mockReturnValueOnce({
        sanitized: 'Clean content',
        wasModified: true,
        warnings: ['Content was modified'],
        removedElements: ['script'],
        stats: { originalLength: 20, sanitizedLength: 13, removedCount: 1 }
      });

      const config: ValidationConfig = {
        body: {
          content: { 
            type: 'string', 
            required: true, 
            sanitize: true, 
            sanitizeAs: 'html' 
          }
        }
      };
      
      const middleware = createValidationMiddleware(config);
      mockRequest.body = { content: '<script>alert(1)</script>Clean content' };
      
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.body).toEqual({ content: 'Clean content' });
      expect((mockRequest as any).validationMetadata.warnings).toContain('content was sanitized for security');
    });

    it('should handle internal errors gracefully', async () => {
      const config: ValidationConfig = {
        body: {
          name: { type: 'string', required: true }
        }
      };
      
      // Mock an error in validation utils
      const { validationUtils } = require('../../utils/validation');
      validationUtils.validateString.mockImplementationOnce(() => {
        throw new Error('Validation error');
      });
      
      const middleware = createValidationMiddleware(config);
      mockRequest.body = { name: 'John' };
      
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'name',
              code: 'INTERNAL_ERROR'
            })
          ])
        })
      );
    });

    it('should handle middleware errors', async () => {
      const config: ValidationConfig = {
        body: {
          name: { type: 'string', required: true }
        }
      };
      
      const middleware = createValidationMiddleware(config);
      
      // Create a malformed request that will cause an error
      const malformedRequest = {
        get body() {
          throw new Error('Request error');
        }
      } as any;
      
      await middleware(malformedRequest, mockResponse as VercelResponse, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal validation error'
        })
      );
    });
  });

  describe('commonSchemas', () => {
    it('should have postContent schema', () => {
      expect(commonSchemas.postContent).toBeDefined();
      expect(commonSchemas.postContent.title).toBeDefined();
      expect(commonSchemas.postContent.content).toBeDefined();
      expect(commonSchemas.postContent.title.required).toBe(true);
      expect(commonSchemas.postContent.content.sanitize).toBe(true);
    });

    it('should have pagination schema', () => {
      expect(commonSchemas.pagination).toBeDefined();
      expect(commonSchemas.pagination.page).toBeDefined();
      expect(commonSchemas.pagination.limit).toBeDefined();
      expect(commonSchemas.pagination.page.defaultValue).toBe(1);
      expect(commonSchemas.pagination.limit.max).toBe(100);
    });

    it('should have userInput schema', () => {
      expect(commonSchemas.userInput).toBeDefined();
      expect(commonSchemas.userInput.name).toBeDefined();
      expect(commonSchemas.userInput.email).toBeDefined();
      expect(commonSchemas.userInput.name.required).toBe(true);
      expect(commonSchemas.userInput.email.type).toBe('email');
    });
  });

  describe('validationMiddleware presets', () => {
    it('should have postContent middleware', async () => {
      const middleware = validationMiddleware.postContent;
      mockRequest.body = {
        title: 'Test Title',
        content: 'Test content'
      };
      
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should have pagination middleware', async () => {
      const middleware = validationMiddleware.pagination;
      mockRequest.query = { page: '2', limit: '10' };
      
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.query).toEqual({ page: 2, limit: 10 });
    });

    it('should have userInput middleware', async () => {
      const middleware = validationMiddleware.userInput;
      mockRequest.body = {
        name: 'John Doe',
        email: 'john@example.com'
      };
      
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null and undefined values', async () => {
      const config: ValidationConfig = {
        body: {
          optional: { type: 'string', required: false },
          required: { type: 'string', required: true }
        }
      };
      
      const middleware = createValidationMiddleware(config);
      mockRequest.body = { optional: null, required: undefined };
      
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'required',
              code: 'REQUIRED'
            })
          ])
        })
      );
    });

    it('should handle empty strings appropriately', async () => {
      const config: ValidationConfig = {
        body: {
          allowEmpty: { type: 'string', required: true, allowEmpty: true },
          disallowEmpty: { type: 'string', required: true, allowEmpty: false }
        }
      };
      
      const middleware = createValidationMiddleware(config);
      mockRequest.body = { allowEmpty: '', disallowEmpty: '' };
      
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'disallowEmpty',
              code: 'EMPTY'
            })
          ])
        })
      );
    });

    it('should handle trimming for strings', async () => {
      const config: ValidationConfig = {
        body: {
          name: { type: 'string', required: true, trim: true }
        }
      };
      
      const middleware = createValidationMiddleware(config);
      mockRequest.body = { name: '  John Doe  ' };
      
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.body).toEqual({ name: 'John Doe' });
    });

    it('should handle request metadata addition', async () => {
      const config: ValidationConfig = {
        body: {
          name: { type: 'string', required: true }
        }
      };
      
      const middleware = createValidationMiddleware(config);
      mockRequest.body = { name: 'John' };
      
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect((mockRequest as any).validationMetadata).toBeDefined();
      expect((mockRequest as any).validationMetadata.requestId).toBeDefined();
      expect((mockRequest as any).validationMetadata.processingTime).toBeDefined();
    });

    it('should handle abort early configuration', async () => {
      const config: ValidationConfig = {
        body: {
          field1: { type: 'string', required: true },
          field2: { type: 'string', required: true }
        },
        abortEarly: true
      };
      
      const middleware = createValidationMiddleware(config);
      mockRequest.body = {}; // Both fields missing
      
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'field1',
              code: 'REQUIRED'
            })
          ])
        })
      );
      
      // Should only have one error due to abortEarly
      const call = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(call.details.length).toBe(1);
    });
  });

  describe('integration tests', () => {
    it('should validate complete post creation request', async () => {
      const middleware = validationMiddleware.postContent;
      mockRequest.body = {
        title: 'My Blog Post',
        content: '<p>This is the content</p>',
        excerpt: 'A short excerpt',
        featuredImage: 'https://example.com/image.jpg',
        categories: ['tech', 'programming'],
        tags: ['javascript', 'node'],
        status: 'draft'
      };
      
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.body.title).toBe('My Blog Post');
      expect(mockRequest.body.status).toBe('draft');
    });

    it('should validate pagination with query parameters', async () => {
      const middleware = validationMiddleware.pagination;
      mockRequest.query = {
        page: '3',
        limit: '25',
        sort: 'title',
        order: 'asc'
      };
      
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.query).toEqual({
        page: 3,
        limit: 25,
        sort: 'title',
        order: 'asc'
      });
    });

    it('should handle complex nested validation scenarios', async () => {
      const config: ValidationConfig = {
        body: {
          user: {
            type: 'json',
            required: true,
            customValidator: (value) => {
              try {
                const parsed = JSON.parse(value);
                return {
                  isValid: parsed.hasOwnProperty('name') && parsed.hasOwnProperty('email'),
                  error: 'User object must have name and email properties'
                };
              } catch {
                return { isValid: false, error: 'Invalid user JSON' };
              }
            }
          }
        }
      };
      
      const middleware = createValidationMiddleware(config);
      mockRequest.body = {
        user: '{"name": "John", "email": "john@example.com"}'
      };
      
      await middleware(mockRequest as VercelRequest, mockResponse as VercelResponse, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
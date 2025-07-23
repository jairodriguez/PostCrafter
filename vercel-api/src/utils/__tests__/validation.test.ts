import { jest } from '@jest/globals';
import {
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
  sanitizeString,
  validationUtils,
  logValidationError
} from '../validation';

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Validation Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateString', () => {
    it('should validate basic string', () => {
      const result = validateString('hello world');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('hello world');
    });

    it('should trim strings by default', () => {
      const result = validateString('  hello world  ');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('hello world');
    });

    it('should not trim when trim option is false', () => {
      const result = validateString('  hello world  ', { trim: false });
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('  hello world  ');
    });

    it('should reject non-string types', () => {
      const result = validateString(123);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Expected string, got number');
    });

    it('should validate minimum length', () => {
      const result = validateString('hi', { minLength: 5 });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('String must be at least 5 characters long');
    });

    it('should validate maximum length', () => {
      const result = validateString('this is too long', { maxLength: 5 });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('String must be no more than 5 characters long');
    });

    it('should validate empty strings when allowEmpty is false', () => {
      const result = validateString('', { allowEmpty: false });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('String cannot be empty');
    });

    it('should validate against pattern', () => {
      const result = validateString('123abc', { pattern: /^\d+$/ });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('String does not match required pattern');
    });

    it('should use custom validator', () => {
      const customValidator = (value: string) => value.includes('valid');
      const result = validateString('invalid', { customValidator });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('String failed custom validation');
    });

    it('should pass custom validation', () => {
      const customValidator = (value: string) => value.includes('valid');
      const result = validateString('this is valid', { customValidator });
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('this is valid');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test+tag@example.org',
        'user_name@example-domain.com'
      ];

      validEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(email.toLowerCase());
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid.email',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test@.example.com',
        'test@example.',
        ''
      ];

      invalidEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(false);
      });
    });

    it('should reject emails exceeding max length', () => {
      const longEmail = 'a'.repeat(300) + '@example.com';
      const result = validateEmail(longEmail);
      expect(result.isValid).toBe(false);
    });

    it('should validate domain allowlist', () => {
      const result = validateEmail('test@example.com', {
        allowedDomains: ['allowed.com', 'example.org']
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email domain not allowed');
    });

    it('should validate domain blocklist', () => {
      const result = validateEmail('test@blocked.com', {
        blockedDomains: ['blocked.com', 'spam.org']
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email domain is blocked');
    });

    it('should require TLD when specified', () => {
      const result = validateEmail('test@localhost', { requireTLD: true });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email must have a valid top-level domain');
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://subdomain.example.org/path?query=value',
        'https://example.com:8080/path',
        'http://192.168.1.1:3000'
      ];

      validUrls.forEach(url => {
        const result = validateUrl(url, { allowIP: true });
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(url);
      });
    });

    it('should reject invalid URL formats', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com',
        'javascript:alert(1)',
        'http://',
        'https://.com',
        ''
      ];

      invalidUrls.forEach(url => {
        const result = validateUrl(url);
        expect(result.isValid).toBe(false);
      });
    });

    it('should validate allowed protocols', () => {
      const result = validateUrl('ftp://example.com', {
        allowedProtocols: ['http', 'https']
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Protocol 'ftp' not allowed");
    });

    it('should reject IP addresses when not allowed', () => {
      const result = validateUrl('http://192.168.1.1');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('IP addresses not allowed');
    });

    it('should reject localhost when not allowed', () => {
      const result = validateUrl('http://localhost:3000');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Localhost URLs not allowed');
    });

    it('should validate domain allowlist', () => {
      const result = validateUrl('https://blocked.com', {
        allowedDomains: ['example.com', 'allowed.org']
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Domain not allowed');
    });

    it('should validate domain blocklist', () => {
      const result = validateUrl('https://malicious.com', {
        blockedDomains: ['malicious.com', 'spam.org']
      });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Domain is blocked');
    });
  });

  describe('validateNumber', () => {
    it('should validate numbers', () => {
      const validNumbers = [0, 1, -1, 3.14, 42];

      validNumbers.forEach(num => {
        const result = validateNumber(num);
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(num);
      });
    });

    it('should validate numeric strings', () => {
      const result = validateNumber('42.5');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(42.5);
    });

    it('should reject invalid number types', () => {
      const result = validateNumber('not-a-number');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid number');
    });

    it('should reject infinity', () => {
      const result = validateNumber(Infinity);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Number must be finite');
    });

    it('should validate integer requirement', () => {
      const result = validateNumber(3.14, { integer: true });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Number must be an integer');
    });

    it('should validate positive requirement', () => {
      const result = validateNumber(-5, { positive: true });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Number must be positive');
    });

    it('should validate zero allowance', () => {
      const result = validateNumber(0, { allowZero: false });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Number cannot be zero');
    });

    it('should validate minimum value', () => {
      const result = validateNumber(5, { min: 10 });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Number must be at least 10');
    });

    it('should validate maximum value', () => {
      const result = validateNumber(15, { max: 10 });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Number must be no more than 10');
    });
  });

  describe('isValidJson', () => {
    it('should validate correct JSON strings', () => {
      const validJson = [
        '{"key": "value"}',
        '[1, 2, 3]',
        '"string"',
        'true',
        'null',
        '42'
      ];

      validJson.forEach(json => {
        const result = isValidJson(json);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid JSON', () => {
      const invalidJson = [
        '{key: "value"}',
        '{"key": value}',
        '{',
        '[1, 2,]',
        'undefined'
      ];

      invalidJson.forEach(json => {
        const result = isValidJson(json);
        expect(result.isValid).toBe(false);
      });
    });

    it('should reject non-string types', () => {
      const result = isValidJson(123);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Expected string, got number');
    });
  });

  describe('validateImageExtension', () => {
    it('should validate correct image extensions', () => {
      const validExtensions = [
        'image.jpg',
        'photo.jpeg',
        'picture.png',
        'animation.gif',
        'icon.svg',
        'bitmap.bmp',
        'modern.webp'
      ];

      validExtensions.forEach(filename => {
        const result = validateImageExtension(filename);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid extensions', () => {
      const invalidExtensions = [
        'document.pdf',
        'video.mp4',
        'audio.mp3',
        'text.txt',
        'archive.zip'
      ];

      invalidExtensions.forEach(filename => {
        const result = validateImageExtension(filename);
        expect(result.isValid).toBe(false);
      });
    });

    it('should handle case insensitivity', () => {
      const result = validateImageExtension('IMAGE.JPG');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('.jpg');
    });
  });

  describe('validateImageMimeType', () => {
    it('should validate correct MIME types', () => {
      const validMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml'
      ];

      validMimeTypes.forEach(mimeType => {
        const result = validateImageMimeType(mimeType);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid MIME types', () => {
      const invalidMimeTypes = [
        'application/pdf',
        'video/mp4',
        'audio/mpeg',
        'text/plain'
      ];

      invalidMimeTypes.forEach(mimeType => {
        const result = validateImageMimeType(mimeType);
        expect(result.isValid).toBe(false);
      });
    });

    it('should handle case insensitivity', () => {
      const result = validateImageMimeType('IMAGE/JPEG');
      expect(result.isValid).toBe(true);
      expect(result.value).toBe('image/jpeg');
    });
  });

  describe('validateFileSize', () => {
    it('should validate file sizes within limits', () => {
      const result = validateFileSize(1024 * 1024); // 1MB
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(1024 * 1024);
    });

    it('should reject files exceeding size limit', () => {
      const result = validateFileSize(15 * 1024 * 1024); // 15MB
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File size too large');
    });

    it('should reject zero or negative sizes', () => {
      expect(validateFileSize(0).isValid).toBe(false);
      expect(validateFileSize(-100).isValid).toBe(false);
    });

    it('should accept custom size limits', () => {
      const result = validateFileSize(2 * 1024 * 1024, 1024 * 1024); // 2MB with 1MB limit
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateHexColor', () => {
    it('should validate correct hex colors', () => {
      const validColors = ['#FF0000', '#00ff00', '#0000FF', '#fff', '#ABC'];

      validColors.forEach(color => {
        const result = validateHexColor(color);
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(color.toUpperCase());
      });
    });

    it('should reject invalid hex colors', () => {
      const invalidColors = [
        'FF0000',
        '#GG0000',
        '#FF00',
        '#FFFF',
        'red',
        'rgb(255,0,0)'
      ];

      invalidColors.forEach(color => {
        const result = validateHexColor(color);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('validateSlug', () => {
    it('should validate correct slugs', () => {
      const validSlugs = [
        'hello-world',
        'test-123',
        'single',
        'multi-word-slug'
      ];

      validSlugs.forEach(slug => {
        const result = validateSlug(slug);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid slugs', () => {
      const invalidSlugs = [
        'Hello World',
        'test_123',
        'test@123',
        'test--double',
        '-start-dash',
        'end-dash-',
        ''
      ];

      invalidSlugs.forEach(slug => {
        const result = validateSlug(slug);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('validateBoolean', () => {
    it('should validate boolean values', () => {
      expect(validateBoolean(true).isValid).toBe(true);
      expect(validateBoolean(false).isValid).toBe(true);
    });

    it('should convert string representations', () => {
      const trueValues = ['true', 'TRUE', '1', 'yes', 'on'];
      const falseValues = ['false', 'FALSE', '0', 'no', 'off'];

      trueValues.forEach(value => {
        const result = validateBoolean(value);
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(true);
      });

      falseValues.forEach(value => {
        const result = validateBoolean(value);
        expect(result.isValid).toBe(true);
        expect(result.value).toBe(false);
      });
    });

    it('should convert numbers', () => {
      expect(validateBoolean(1).value).toBe(true);
      expect(validateBoolean(0).value).toBe(false);
      expect(validateBoolean(-1).value).toBe(true);
    });

    it('should reject invalid boolean representations', () => {
      const invalidValues = ['maybe', 'invalid', {}];

      invalidValues.forEach(value => {
        const result = validateBoolean(value);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('validateArray', () => {
    const stringValidator = (item: any) => validateString(item, { minLength: 1 });

    it('should validate arrays with element validation', () => {
      const result = validateArray(['hello', 'world'], stringValidator);
      expect(result.isValid).toBe(true);
      expect(result.value).toEqual(['hello', 'world']);
    });

    it('should reject non-arrays', () => {
      const result = validateArray('not-array', stringValidator);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Expected array, got string');
    });

    it('should validate array length constraints', () => {
      const tooShort = validateArray(['one'], stringValidator, { minLength: 2 });
      expect(tooShort.isValid).toBe(false);

      const tooLong = validateArray(['a', 'b', 'c'], stringValidator, { maxLength: 2 });
      expect(tooLong.isValid).toBe(false);
    });

    it('should validate empty arrays', () => {
      const notAllowed = validateArray([], stringValidator, { allowEmpty: false });
      expect(notAllowed.isValid).toBe(false);

      const allowed = validateArray([], stringValidator, { allowEmpty: true });
      expect(allowed.isValid).toBe(true);
    });

    it('should reject arrays with invalid elements', () => {
      const result = validateArray(['valid', ''], stringValidator);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid element at index 1');
    });
  });

  describe('validateDate', () => {
    it('should validate Date objects', () => {
      const date = new Date();
      const result = validateDate(date);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(date);
    });

    it('should validate date strings', () => {
      const result = validateDate('2024-01-01');
      expect(result.isValid).toBe(true);
      expect(result.value).toBeInstanceOf(Date);
    });

    it('should validate timestamps', () => {
      const timestamp = Date.now();
      const result = validateDate(timestamp);
      expect(result.isValid).toBe(true);
      expect(result.value).toBeInstanceOf(Date);
    });

    it('should reject invalid dates', () => {
      const invalidDates = ['invalid-date', 'not-a-date', {}];

      invalidDates.forEach(date => {
        const result = validateDate(date);
        expect(result.isValid).toBe(false);
      });
    });

    it('should validate future dates', () => {
      const past = new Date(Date.now() - 1000);
      const future = new Date(Date.now() + 1000);

      expect(validateDate(past, { future: true }).isValid).toBe(false);
      expect(validateDate(future, { future: true }).isValid).toBe(true);
    });

    it('should validate past dates', () => {
      const past = new Date(Date.now() - 1000);
      const future = new Date(Date.now() + 1000);

      expect(validateDate(past, { past: true }).isValid).toBe(true);
      expect(validateDate(future, { past: true }).isValid).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should remove HTML brackets', () => {
      const result = sanitizeString('Hello <script>alert(1)</script> World');
      expect(result).toBe('Hello scriptalert(1)/script World');
    });

    it('should remove javascript protocols', () => {
      const result = sanitizeString('Click javascript:alert(1) here');
      expect(result).toBe('Click alert(1) here');
    });

    it('should remove event handlers', () => {
      const result = sanitizeString('Text onclick=alert(1) more text');
      expect(result).toBe('Text alert(1) more text');
    });

    it('should trim whitespace', () => {
      const result = sanitizeString('  hello world  ');
      expect(result).toBe('hello world');
    });

    it('should handle non-string inputs', () => {
      expect(sanitizeString(123 as any)).toBe('');
      expect(sanitizeString(null as any)).toBe('');
      expect(sanitizeString(undefined as any)).toBe('');
    });
  });

  describe('logValidationError', () => {
    it('should log validation errors', () => {
      const { logger } = require('../logger');
      logValidationError('testField', 'Test error', 'req123');

      expect(logger.warn).toHaveBeenCalledWith('Validation error', {
        field: 'testField',
        error: 'Test error',
        requestId: 'req123',
        component: 'validation'
      });
    });
  });

  describe('validationUtils object', () => {
    it('should export all validation functions', () => {
      expect(validationUtils.validateString).toBe(validateString);
      expect(validationUtils.validateEmail).toBe(validateEmail);
      expect(validationUtils.validateUrl).toBe(validateUrl);
      expect(validationUtils.validateNumber).toBe(validateNumber);
      expect(validationUtils.isValidJson).toBe(isValidJson);
      expect(validationUtils.validateImageExtension).toBe(validateImageExtension);
      expect(validationUtils.validateImageMimeType).toBe(validateImageMimeType);
      expect(validationUtils.validateFileSize).toBe(validateFileSize);
      expect(validationUtils.validateHexColor).toBe(validateHexColor);
      expect(validationUtils.validateSlug).toBe(validateSlug);
      expect(validationUtils.validateBoolean).toBe(validateBoolean);
      expect(validationUtils.validateArray).toBe(validateArray);
      expect(validationUtils.validateDate).toBe(validateDate);
      expect(validationUtils.sanitizeString).toBe(sanitizeString);
    });
  });

  describe('edge cases and integration', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(validateString(null).isValid).toBe(false);
      expect(validateString(undefined).isValid).toBe(false);
      expect(validateNumber(null).isValid).toBe(false);
      expect(validateNumber(undefined).isValid).toBe(false);
    });

    it('should handle complex validation scenarios', () => {
      // Complex email validation with multiple constraints
      const complexEmailResult = validateEmail('test@example.com', {
        allowedDomains: ['example.com'],
        maxLength: 50,
        requireTLD: true
      });
      expect(complexEmailResult.isValid).toBe(true);

      // Complex URL validation with multiple constraints
      const complexUrlResult = validateUrl('https://api.example.com/v1/data', {
        allowedProtocols: ['https'],
        allowedDomains: ['api.example.com'],
        requireTLD: true
      });
      expect(complexUrlResult.isValid).toBe(true);

      // Complex array validation with nested element validation
      const arrayResult = validateArray(
        ['#FF0000', '#00FF00', '#0000FF'],
        (item) => validateHexColor(item),
        { minLength: 1, maxLength: 5 }
      );
      expect(arrayResult.isValid).toBe(true);
    });

    it('should maintain type safety in validation results', () => {
      const stringResult = validateString('test');
      if (stringResult.isValid) {
        expect(typeof stringResult.value).toBe('string');
      }

      const numberResult = validateNumber(42);
      if (numberResult.isValid) {
        expect(typeof numberResult.value).toBe('number');
      }

      const booleanResult = validateBoolean('true');
      if (booleanResult.isValid) {
        expect(typeof booleanResult.value).toBe('boolean');
      }
    });

    it('should handle performance with large inputs', () => {
      // Test with large string
      const largeString = 'a'.repeat(10000);
      const result = validateString(largeString, { maxLength: 15000 });
      expect(result.isValid).toBe(true);

      // Test with large array
      const largeArray = Array.from({ length: 1000 }, (_, i) => `item${i}`);
      const arrayResult = validateArray(largeArray, validateString);
      expect(arrayResult.isValid).toBe(true);
    });
  });
}); 
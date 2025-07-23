import { sanitizeHtml, sanitizeMarkdown, detectMaliciousContent } from './validation';
import { secureLog } from './env';
import { ValidationResult, WordPressPostData } from '../types';

/**
 * WordPress-specific validation configuration
 */
export interface WordPressValidationConfig {
  // Title validation
  minTitleLength: number;
  maxTitleLength: number;
  allowHtmlInTitle: boolean;
  
  // Content validation
  minContentLength: number;
  maxContentLength: number;
  allowHtmlInContent: boolean;
  allowMarkdownInContent: boolean;
  allowedHtmlTags: string[];
  allowedHtmlAttributes: string[];
  
  // Excerpt validation
  maxExcerptLength: number;
  allowHtmlInExcerpt: boolean;
  
  // Slug validation
  maxSlugLength: number;
  slugPattern: RegExp;
  
  // Author validation
  minAuthorId: number;
  maxAuthorId: number;
  
  // Status validation
  allowedStatuses: string[];
  
  // Security settings
  enableMaliciousContentDetection: boolean;
  enableHtmlSanitization: boolean;
  enableMarkdownSanitization: boolean;
}

/**
 * Default WordPress validation configuration
 */
export const DEFAULT_WORDPRESS_VALIDATION_CONFIG: WordPressValidationConfig = {
  // Title validation
  minTitleLength: 1,
  maxTitleLength: 200,
  allowHtmlInTitle: false,
  
  // Content validation
  minContentLength: 1,
  maxContentLength: 50000, // 50KB
  allowHtmlInContent: true,
  allowMarkdownInContent: true,
  allowedHtmlTags: [
    'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img', 'div', 'span'
  ],
  allowedHtmlAttributes: [
    'href', 'src', 'alt', 'title', 'class', 'id', 'style', 'target', 'rel'
  ],
  
  // Excerpt validation
  maxExcerptLength: 160,
  allowHtmlInExcerpt: false,
  
  // Slug validation
  maxSlugLength: 200,
  slugPattern: /^[a-z0-9-]+$/,
  
  // Author validation
  minAuthorId: 1,
  maxAuthorId: 999999,
  
  // Status validation
  allowedStatuses: ['draft', 'publish', 'private', 'pending'],
  
  // Security settings
  enableMaliciousContentDetection: true,
  enableHtmlSanitization: true,
  enableMarkdownSanitization: true,
};

/**
 * WordPress content validation and sanitization service
 */
export class WordPressValidationService {
  private config: WordPressValidationConfig;

  constructor(config?: Partial<WordPressValidationConfig>) {
    this.config = { ...DEFAULT_WORDPRESS_VALIDATION_CONFIG, ...config };
  }

  /**
   * Validate and sanitize WordPress post data
   */
  validateAndSanitizePostData(
    data: WordPressPostData,
    requestId?: string
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const sanitizedData: Partial<WordPressPostData> = {};

    try {
      // Validate and sanitize title
      if (data.title !== undefined) {
        const titleValidation = this.validateAndSanitizeTitle(data.title);
        if (!titleValidation.valid) {
          errors.push(`Title: ${titleValidation.error}`);
        } else {
          sanitizedData.title = titleValidation.sanitized!;
          if (titleValidation.warning) {
            warnings.push(`Title: ${titleValidation.warning}`);
          }
        }
      }

      // Validate and sanitize content
      if (data.content !== undefined) {
        const contentValidation = this.validateAndSanitizeContent(data.content);
        if (!contentValidation.valid) {
          errors.push(`Content: ${contentValidation.error}`);
        } else {
          sanitizedData.content = contentValidation.sanitized!;
          if (contentValidation.warning) {
            warnings.push(`Content: ${contentValidation.warning}`);
          }
        }
      }

      // Validate and sanitize excerpt
      if (data.excerpt !== undefined) {
        const excerptValidation = this.validateAndSanitizeExcerpt(data.excerpt);
        if (!excerptValidation.valid) {
          errors.push(`Excerpt: ${excerptValidation.error}`);
        } else {
          sanitizedData.excerpt = excerptValidation.sanitized!;
          if (excerptValidation.warning) {
            warnings.push(`Excerpt: ${excerptValidation.warning}`);
          }
        }
      }

      // Validate and sanitize slug
      if (data.slug !== undefined) {
        const slugValidation = this.validateAndSanitizeSlug(data.slug);
        if (!slugValidation.valid) {
          errors.push(`Slug: ${slugValidation.error}`);
        } else {
          sanitizedData.slug = slugValidation.sanitized!;
          if (slugValidation.warning) {
            warnings.push(`Slug: ${slugValidation.warning}`);
          }
        }
      }

      // Validate author ID
      if (data.author !== undefined) {
        const authorValidation = this.validateAuthorId(data.author);
        if (!authorValidation.valid) {
          errors.push(`Author: ${authorValidation.error}`);
        } else {
          sanitizedData.author = authorValidation.sanitized!;
        }
      }

      // Validate status
      if (data.status !== undefined) {
        const statusValidation = this.validateStatus(data.status);
        if (!statusValidation.valid) {
          errors.push(`Status: ${statusValidation.error}`);
        } else {
          sanitizedData.status = statusValidation.sanitized! as 'draft' | 'publish' | 'private' | 'pending';
        }
      }

      // Log validation results
      secureLog('info', 'WordPress post validation completed', {
        requestId,
        hasErrors: errors.length > 0,
        hasWarnings: warnings.length > 0,
        errorCount: errors.length,
        warningCount: warnings.length,
      });

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        sanitizedData: errors.length === 0 ? sanitizedData : undefined,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      secureLog('error', 'WordPress validation service error', {
        requestId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      return {
        valid: false,
        errors: [`Validation service error: ${errorMessage}`],
        warnings: [],
      };
    }
  }

  /**
   * Validate and sanitize post title
   */
  private validateAndSanitizeTitle(title: string): {
    valid: boolean;
    sanitized?: string;
    error?: string;
    warning?: string;
  } {
    if (!title || typeof title !== 'string') {
      return { valid: false, error: 'Title is required and must be a string' };
    }

    const trimmedTitle = title.trim();
    
    if (trimmedTitle.length === 0) {
      return { valid: false, error: 'Title cannot be empty' };
    }

    if (trimmedTitle.length < this.config.minTitleLength) {
      return { 
        valid: false, 
        error: `Title must be at least ${this.config.minTitleLength} characters long` 
      };
    }

    if (trimmedTitle.length > this.config.maxTitleLength) {
      return { 
        valid: false, 
        error: `Title cannot exceed ${this.config.maxTitleLength} characters` 
      };
    }

    // Check for malicious content
    if (this.config.enableMaliciousContentDetection) {
      const maliciousCheck = detectMaliciousContent(trimmedTitle);
      if (maliciousCheck.malicious) {
        return { 
          valid: false, 
          error: `Title contains potentially malicious content: ${maliciousCheck.patterns.join(', ')}` 
        };
      }
    }

    let sanitizedTitle = trimmedTitle;

    // Sanitize HTML if not allowed
    if (!this.config.allowHtmlInTitle) {
      sanitizedTitle = sanitizeHtml(sanitizedTitle);
    }

    // Normalize whitespace
    sanitizedTitle = sanitizedTitle.replace(/\s+/g, ' ');

    // Check for excessive whitespace
    if (sanitizedTitle !== trimmedTitle) {
      return {
        valid: true,
        sanitized: sanitizedTitle,
        warning: 'Title whitespace has been normalized',
      };
    }

    return { valid: true, sanitized: sanitizedTitle };
  }

  /**
   * Validate and sanitize post content
   */
  private validateAndSanitizeContent(content: string): {
    valid: boolean;
    sanitized?: string;
    error?: string;
    warning?: string;
  } {
    if (!content || typeof content !== 'string') {
      return { valid: false, error: 'Content is required and must be a string' };
    }

    const trimmedContent = content.trim();
    
    if (trimmedContent.length === 0) {
      return { valid: false, error: 'Content cannot be empty' };
    }

    if (trimmedContent.length < this.config.minContentLength) {
      return { 
        valid: false, 
        error: `Content must be at least ${this.config.minContentLength} characters long` 
      };
    }

    if (trimmedContent.length > this.config.maxContentLength) {
      return { 
        valid: false, 
        error: `Content cannot exceed ${this.config.maxContentLength} characters` 
      };
    }

    // Check for malicious content
    if (this.config.enableMaliciousContentDetection) {
      const maliciousCheck = detectMaliciousContent(trimmedContent);
      if (maliciousCheck.malicious) {
        return { 
          valid: false, 
          error: `Content contains potentially malicious content: ${maliciousCheck.patterns.join(', ')}` 
        };
      }
    }

    let sanitizedContent = trimmedContent;

    // Sanitize content based on configuration
    if (this.config.enableHtmlSanitization && this.config.allowHtmlInContent) {
      // Allow safe HTML tags and attributes
      sanitizedContent = this.sanitizeHtmlWithAllowlist(sanitizedContent);
    } else if (this.config.enableHtmlSanitization) {
      // Remove all HTML
      sanitizedContent = sanitizeHtml(sanitizedContent);
    }

    if (this.config.enableMarkdownSanitization && this.config.allowMarkdownInContent) {
      sanitizedContent = sanitizeMarkdown(sanitizedContent);
    }

    // Normalize line endings
    sanitizedContent = sanitizedContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Check for excessive line breaks
    const lineBreakCount = (sanitizedContent.match(/\n/g) || []).length;
    const contentLength = sanitizedContent.length;
    const lineBreakRatio = lineBreakCount / contentLength;

    if (lineBreakRatio > 0.3) {
      return {
        valid: true,
        sanitized: sanitizedContent,
        warning: 'Content contains many line breaks which may affect formatting',
      };
    }

    return { valid: true, sanitized: sanitizedContent };
  }

  /**
   * Validate and sanitize post excerpt
   */
  private validateAndSanitizeExcerpt(excerpt: string): {
    valid: boolean;
    sanitized?: string;
    error?: string;
    warning?: string;
  } {
    if (!excerpt || typeof excerpt !== 'string') {
      return { valid: false, error: 'Excerpt must be a string' };
    }

    const trimmedExcerpt = excerpt.trim();
    
    if (trimmedExcerpt.length === 0) {
      return { valid: true, sanitized: '' }; // Empty excerpt is allowed
    }

    if (trimmedExcerpt.length > this.config.maxExcerptLength) {
      return { 
        valid: false, 
        error: `Excerpt cannot exceed ${this.config.maxExcerptLength} characters` 
      };
    }

    // Check for malicious content
    if (this.config.enableMaliciousContentDetection) {
      const maliciousCheck = detectMaliciousContent(trimmedExcerpt);
      if (maliciousCheck.malicious) {
        return { 
          valid: false, 
          error: `Excerpt contains potentially malicious content: ${maliciousCheck.patterns.join(', ')}` 
        };
      }
    }

    let sanitizedExcerpt = trimmedExcerpt;

    // Sanitize HTML if not allowed
    if (!this.config.allowHtmlInExcerpt) {
      sanitizedExcerpt = sanitizeHtml(sanitizedExcerpt);
    }

    // Normalize whitespace
    sanitizedExcerpt = sanitizedExcerpt.replace(/\s+/g, ' ');

    return { valid: true, sanitized: sanitizedExcerpt };
  }

  /**
   * Validate and sanitize post slug
   */
  private validateAndSanitizeSlug(slug: string): {
    valid: boolean;
    sanitized?: string;
    error?: string;
    warning?: string;
  } {
    if (!slug || typeof slug !== 'string') {
      return { valid: false, error: 'Slug must be a string' };
    }

    const trimmedSlug = slug.trim();
    
    if (trimmedSlug.length === 0) {
      return { valid: false, error: 'Slug cannot be empty' };
    }

    if (trimmedSlug.length > this.config.maxSlugLength) {
      return { 
        valid: false, 
        error: `Slug cannot exceed ${this.config.maxSlugLength} characters` 
      };
    }

    // Check slug pattern
    if (!this.config.slugPattern.test(trimmedSlug)) {
      return { 
        valid: false, 
        error: 'Slug can only contain lowercase letters, numbers, and hyphens' 
      };
    }

    // Check for consecutive hyphens
    if (trimmedSlug.includes('--')) {
      return { 
        valid: false, 
        error: 'Slug cannot contain consecutive hyphens' 
      };
    }

    // Check for leading/trailing hyphens
    if (trimmedSlug.startsWith('-') || trimmedSlug.endsWith('-')) {
      return { 
        valid: false, 
        error: 'Slug cannot start or end with a hyphen' 
      };
    }

    return { valid: true, sanitized: trimmedSlug };
  }

  /**
   * Validate author ID
   */
  private validateAuthorId(authorId: number): {
    valid: boolean;
    sanitized?: number;
    error?: string;
  } {
    if (!Number.isInteger(authorId)) {
      return { valid: false, error: 'Author ID must be an integer' };
    }

    if (authorId < this.config.minAuthorId || authorId > this.config.maxAuthorId) {
      return { 
        valid: false, 
        error: `Author ID must be between ${this.config.minAuthorId} and ${this.config.maxAuthorId}` 
      };
    }

    return { valid: true, sanitized: authorId };
  }

  /**
   * Validate post status
   */
  private validateStatus(status: string): {
    valid: boolean;
    sanitized?: string;
    error?: string;
  } {
    if (!status || typeof status !== 'string') {
      return { valid: false, error: 'Status must be a string' };
    }

    const normalizedStatus = status.toLowerCase().trim();
    
    if (!this.config.allowedStatuses.includes(normalizedStatus)) {
      return { 
        valid: false, 
        error: `Status must be one of: ${this.config.allowedStatuses.join(', ')}` 
      };
    }

    return { valid: true, sanitized: normalizedStatus };
  }

  /**
   * Sanitize HTML with allowlist of safe tags and attributes
   */
  private sanitizeHtmlWithAllowlist(content: string): string {
    if (!content) return content;

    let sanitized = content;

    // Remove script tags and event handlers (always remove these)
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/data:text\/html/gi, '');
    sanitized = sanitized.replace(/vbscript:/gi, '');

    // Remove all HTML tags except allowed ones
    const allowedTagsPattern = new RegExp(
      `</?(?!(${this.config.allowedHtmlTags.join('|')})\\b)[^>]*>`,
      'gi'
    );
    sanitized = sanitized.replace(allowedTagsPattern, '');

    // Remove disallowed attributes from allowed tags
    const allowedAttributesPattern = new RegExp(
      `\\s(?!(${this.config.allowedHtmlAttributes.join('|')})\\b)[a-zA-Z-]+\\s*=`,
      'gi'
    );
    sanitized = sanitized.replace(allowedAttributesPattern, ' ');

    // Encode special characters outside of HTML tags
    sanitized = sanitized.replace(/&(?!amp;|lt;|gt;|quot;|#x27;)/g, '&amp;');

    return sanitized;
  }

  /**
   * Generate a valid slug from title
   */
  generateSlugFromTitle(title: string): string {
    if (!title) return '';

    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Generate excerpt from content
   */
  generateExcerptFromContent(content: string, maxLength: number = 160): string {
    if (!content) return '';

    // Remove HTML tags
    const plainText = content.replace(/<[^>]*>/g, '');
    
    // Remove extra whitespace
    const normalized = plainText.replace(/\s+/g, ' ').trim();
    
    if (normalized.length <= maxLength) {
      return normalized;
    }

    // Truncate at word boundary
    const truncated = normalized.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
  }
}

/**
 * Create a WordPress validation service instance
 */
export function createWordPressValidationService(
  config?: Partial<WordPressValidationConfig>
): WordPressValidationService {
  return new WordPressValidationService(config);
}

/**
 * Default WordPress validation service instance
 */
export const wordPressValidationService = createWordPressValidationService(); 
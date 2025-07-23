import { WordPressClient, createWordPressClient } from './wordpress';
import { getEnvVars, secureLog } from './env';
import { 
  WordPressError, 
  ValidationError, 
  YoastMetaFields,
  WordPressPostResponse 
} from '../types';

/**
 * Yoast SEO field configuration
 */
export interface YoastConfig {
  enableYoastIntegration: boolean;
  defaultMetaTitleTemplate: string;
  defaultMetaDescriptionTemplate: string;
  maxMetaTitleLength: number;
  maxMetaDescriptionLength: number;
  maxFocusKeywords: number;
  maxFocusKeywordLength: number;
  enableRobotsSettings: boolean;
  enableCanonicalUrls: boolean;
  enablePrimaryCategory: boolean;
}

/**
 * Yoast meta field validation result
 */
export interface YoastValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedFields: Partial<YoastMetaFields>;
}

/**
 * Yoast SEO integration service
 */
export class YoastService {
  private client: WordPressClient;
  private config: YoastConfig;

  constructor(client: WordPressClient, config?: Partial<YoastConfig>) {
    this.client = client;
    this.config = {
      enableYoastIntegration: true,
      defaultMetaTitleTemplate: '{title} | {site_name}',
      defaultMetaDescriptionTemplate: '{excerpt}',
      maxMetaTitleLength: 60,
      maxMetaDescriptionLength: 160,
      maxFocusKeywords: 10,
      maxFocusKeywordLength: 50,
      enableRobotsSettings: true,
      enableCanonicalUrls: true,
      enablePrimaryCategory: true,
      ...config
    };
  }

  /**
   * Validate and sanitize Yoast meta fields
   */
  validateYoastFields(fields: Partial<YoastMetaFields>): YoastValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const sanitizedFields: Partial<YoastMetaFields> = {};

    // Validate meta title
    if (fields.meta_title !== undefined) {
      const title = String(fields.meta_title).trim();
      if (title.length === 0) {
        errors.push('Meta title cannot be empty');
      } else if (title.length > this.config.maxMetaTitleLength) {
        errors.push(`Meta title exceeds maximum length of ${this.config.maxMetaTitleLength} characters`);
      } else {
        sanitizedFields.meta_title = this.sanitizeMetaTitle(title);
      }
    }

    // Validate meta description
    if (fields.meta_description !== undefined) {
      const description = String(fields.meta_description).trim();
      if (description.length === 0) {
        errors.push('Meta description cannot be empty');
      } else if (description.length > this.config.maxMetaDescriptionLength) {
        errors.push(`Meta description exceeds maximum length of ${this.config.maxMetaDescriptionLength} characters`);
      } else {
        sanitizedFields.meta_description = this.sanitizeMetaDescription(description);
      }
    }

    // Validate focus keywords
    if (fields.focus_keywords !== undefined) {
      const keywords = Array.isArray(fields.focus_keywords) 
        ? fields.focus_keywords 
        : [fields.focus_keywords];
      
      if (keywords.length > this.config.maxFocusKeywords) {
        errors.push(`Too many focus keywords. Maximum allowed: ${this.config.maxFocusKeywords}`);
      } else {
        const sanitizedKeywords = keywords
          .map(kw => String(kw).trim())
          .filter(kw => kw.length > 0)
          .map(kw => this.sanitizeFocusKeyword(kw))
          .filter(kw => kw.length <= this.config.maxFocusKeywordLength);

        if (sanitizedKeywords.length !== keywords.length) {
          warnings.push('Some focus keywords were filtered out due to length or format issues');
        }

        sanitizedFields.focus_keywords = sanitizedKeywords;
      }
    }

    // Validate robots settings
    if (this.config.enableRobotsSettings) {
      if (fields.meta_robots_noindex !== undefined) {
        const noindex = Boolean(fields.meta_robots_noindex);
        sanitizedFields.meta_robots_noindex = noindex;
      }

      if (fields.meta_robots_nofollow !== undefined) {
        const nofollow = Boolean(fields.meta_robots_nofollow);
        sanitizedFields.meta_robots_nofollow = nofollow;
      }
    }

    // Validate canonical URL
    if (this.config.enableCanonicalUrls && fields.canonical !== undefined) {
      const canonical = String(fields.canonical).trim();
      if (canonical.length > 0) {
        if (this.isValidUrl(canonical)) {
          sanitizedFields.canonical = canonical;
        } else {
          errors.push('Invalid canonical URL format');
        }
      }
    }

    // Validate primary category
    if (this.config.enablePrimaryCategory && fields.primary_category !== undefined) {
      const categoryId = Number(fields.primary_category);
      if (isNaN(categoryId) || categoryId <= 0) {
        errors.push('Primary category must be a positive integer');
      } else {
        sanitizedFields.primary_category = categoryId;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sanitizedFields
    };
  }

  /**
   * Apply Yoast meta fields to a WordPress post
   */
  async applyYoastFields(
    postId: number, 
    fields: Partial<YoastMetaFields>
  ): Promise<WordPressResponse<{ success: boolean; fields: Partial<YoastMetaFields> }>> {
    try {
      // Validate fields first
      const validation = this.validateYoastFields(fields);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'YOAST_VALIDATION_ERROR',
            message: 'Yoast field validation failed',
            details: validation.errors.join(', ')
          },
          statusCode: 400
        };
      }

      // Apply fields using the custom REST API endpoint
      const endpoint = `/wp/v2/posts/${postId}`;
      const updateData: any = {};

      // Map Yoast fields to WordPress custom fields
      if (validation.sanitizedFields.meta_title) {
        updateData.yoast_meta_title = validation.sanitizedFields.meta_title;
      }
      if (validation.sanitizedFields.meta_description) {
        updateData.yoast_meta_description = validation.sanitizedFields.meta_description;
      }
      if (validation.sanitizedFields.focus_keywords) {
        updateData.yoast_focus_keywords = validation.sanitizedFields.focus_keywords;
      }
      if (validation.sanitizedFields.meta_robots_noindex !== undefined) {
        updateData.yoast_meta_robots_noindex = validation.sanitizedFields.meta_robots_noindex;
      }
      if (validation.sanitizedFields.meta_robots_nofollow !== undefined) {
        updateData.yoast_meta_robots_nofollow = validation.sanitizedFields.meta_robots_nofollow;
      }
      if (validation.sanitizedFields.canonical) {
        updateData.yoast_canonical = validation.sanitizedFields.canonical;
      }
      if (validation.sanitizedFields.primary_category) {
        updateData.yoast_primary_category = validation.sanitizedFields.primary_category;
      }

      // Update the post with Yoast fields
      const response = await this.client.put(endpoint, updateData);

      if (response.success && response.data) {
        secureLog('info', `Yoast fields applied successfully to post ${postId}`, {
          postId,
          fieldsApplied: Object.keys(validation.sanitizedFields),
          warnings: validation.warnings
        });

        return {
          success: true,
          data: {
            success: true,
            fields: validation.sanitizedFields
          },
          statusCode: 200
        };
      } else {
        return {
          success: false,
          error: response.error || {
            code: 'YOAST_UPDATE_FAILED',
            message: 'Failed to update Yoast fields'
          },
          statusCode: response.statusCode || 500
        };
      }
    } catch (error) {
      secureLog('error', 'Error applying Yoast fields', {
        postId,
        error: error instanceof Error ? error.message : 'Unknown error',
        fields: Object.keys(fields)
      });

      return {
        success: false,
        error: {
          code: 'YOAST_UPDATE_ERROR',
          message: 'Error applying Yoast fields',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        statusCode: 500
      };
    }
  }

  /**
   * Get Yoast meta fields for a post
   */
  async getYoastFields(postId: number): Promise<WordPressResponse<YoastMetaFields>> {
    try {
      const endpoint = `/wp/v2/posts/${postId}?include_yoast_fields=true`;
      const response = await this.client.get(endpoint);

      if (response.success && response.data) {
        const yoastFields: YoastMetaFields = {
          meta_title: response.data.yoast_meta_title || '',
          meta_description: response.data.yoast_meta_description || '',
          focus_keywords: response.data.yoast_focus_keywords || [],
          meta_robots_noindex: response.data.yoast_meta_robots_noindex || false,
          meta_robots_nofollow: response.data.yoast_meta_robots_nofollow || false,
          canonical: response.data.yoast_canonical || '',
          primary_category: response.data.yoast_primary_category || null
        };

        return {
          success: true,
          data: yoastFields,
          statusCode: 200
        };
      } else {
        return {
          success: false,
          error: response.error || {
            code: 'YOAST_FIELDS_NOT_FOUND',
            message: 'Yoast fields not found for post'
          },
          statusCode: response.statusCode || 404
        };
      }
    } catch (error) {
      secureLog('error', 'Error retrieving Yoast fields', {
        postId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'YOAST_RETRIEVAL_ERROR',
          message: 'Error retrieving Yoast fields',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        statusCode: 500
      };
    }
  }

  /**
   * Generate default meta title from post title
   */
  generateDefaultMetaTitle(postTitle: string, siteName?: string): string {
    let template = this.config.defaultMetaTitleTemplate;
    template = template.replace('{title}', postTitle);
    template = template.replace('{site_name}', siteName || 'Site');
    
    return this.sanitizeMetaTitle(template);
  }

  /**
   * Generate default meta description from excerpt
   */
  generateDefaultMetaDescription(excerpt: string): string {
    let template = this.config.defaultMetaDescriptionTemplate;
    template = template.replace('{excerpt}', excerpt);
    
    return this.sanitizeMetaDescription(template);
  }

  /**
   * Sanitize meta title
   */
  private sanitizeMetaTitle(title: string): string {
    return title
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, this.config.maxMetaTitleLength);
  }

  /**
   * Sanitize meta description
   */
  private sanitizeMetaDescription(description: string): string {
    return description
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, this.config.maxMetaDescriptionLength);
  }

  /**
   * Sanitize focus keyword
   */
  private sanitizeFocusKeyword(keyword: string): string {
    return keyword
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, this.config.maxFocusKeywordLength);
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a Yoast service instance
 */
export function createYoastService(client?: WordPressClient): YoastService {
  const wpClient = client || createWordPressClient();
  return new YoastService(wpClient);
} 
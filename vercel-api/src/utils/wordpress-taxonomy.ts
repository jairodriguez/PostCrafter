import { WordPressClient, createWordPressClient } from './wordpress';
import { getEnvVars, secureLog } from './env';
import { 
  WordPressApiError,
  ValidationError, 
  CategoryData, 
  TagData, 
  TaxonomyTerm, 
  TaxonomyResponse 
} from '../types';

/**
 * Taxonomy configuration
 */
export interface TaxonomyConfig {
  maxCategoryDepth: number;
  maxCategoriesPerPost: number;
  maxTagsPerPost: number;
  maxCategoryNameLength: number;
  maxTagNameLength: number;
  maxDescriptionLength: number;
  enableAutoSlugGeneration: boolean;
  enableHierarchyValidation: boolean;
}

/**
 * Taxonomy validation result
 */
export interface TaxonomyValidationResult {
  valid: boolean;
  errors: string[];
  sanitizedData: any;
}

/**
 * WordPress taxonomy service for categories and tags
 */
export class WordPressTaxonomyService {
  private client: WordPressClient;
  private config: TaxonomyConfig;

  constructor(client: WordPressClient, config?: Partial<TaxonomyConfig>) {
    this.client = client;
    this.config = {
      maxCategoryDepth: 3,
      maxCategoriesPerPost: 10,
      maxTagsPerPost: 20,
      maxCategoryNameLength: 50,
      maxTagNameLength: 50,
      maxDescriptionLength: 200,
      enableAutoSlugGeneration: true,
      enableHierarchyValidation: true,
      ...config
    };
  }

  /**
   * Validate category data
   */
  validateCategory(category: CategoryData): TaxonomyValidationResult {
    const errors: string[] = [];
    const sanitizedData: CategoryData = { ...category };

    // Validate name
    if (!category.name || category.name.trim().length === 0) {
      errors.push('Category name cannot be empty');
    } else if (category.name.length > this.config.maxCategoryNameLength) {
      errors.push(`Category name exceeds maximum length of ${this.config.maxCategoryNameLength} characters`);
    } else {
      sanitizedData.name = category.name.trim();
    }

    // Validate slug
    if (category.slug) {
      if (category.slug.length > 50) {
        errors.push('Category slug exceeds maximum length of 50 characters');
      } else if (!/^[a-z0-9-]+$/.test(category.slug)) {
        errors.push('Category slug can only contain lowercase letters, numbers, and hyphens');
      }
    } else if (this.config.enableAutoSlugGeneration) {
      sanitizedData.slug = this.generateSlug(category.name);
    }

    // Validate description
    if (category.description && category.description.length > this.config.maxDescriptionLength) {
      errors.push(`Category description exceeds maximum length of ${this.config.maxDescriptionLength} characters`);
    }

    // Validate parent
    if (category.parent !== undefined) {
      if (category.parent < 0) {
        errors.push('Parent category ID must be a positive integer');
      }
      if (category.parent === category.id) {
        errors.push('Category cannot be its own parent');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitizedData
    };
  }

  /**
   * Validate tag data
   */
  validateTag(tag: TagData): TaxonomyValidationResult {
    const errors: string[] = [];
    const sanitizedData: TagData = { ...tag };

    // Validate name
    if (!tag.name || tag.name.trim().length === 0) {
      errors.push('Tag name cannot be empty');
    } else if (tag.name.length > this.config.maxTagNameLength) {
      errors.push(`Tag name exceeds maximum length of ${this.config.maxTagNameLength} characters`);
    } else {
      sanitizedData.name = tag.name.trim();
    }

    // Validate slug
    if (tag.slug) {
      if (tag.slug.length > 50) {
        errors.push('Tag slug exceeds maximum length of 50 characters');
      } else if (!/^[a-z0-9-]+$/.test(tag.slug)) {
        errors.push('Tag slug can only contain lowercase letters, numbers, and hyphens');
      }
    } else if (this.config.enableAutoSlugGeneration) {
      sanitizedData.slug = this.generateSlug(tag.name);
    }

    // Validate description
    if (tag.description && tag.description.length > this.config.maxDescriptionLength) {
      errors.push(`Tag description exceeds maximum length of ${this.config.maxDescriptionLength} characters`);
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitizedData
    };
  }

  /**
   * Create a new category
   */
  async createCategory(categoryData: CategoryData): Promise<TaxonomyResponse> {
    try {
      // Validate category data
      const validation = this.validateCategory(categoryData);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'TAXONOMY_VALIDATION_ERROR',
            message: 'Category validation failed',
            details: validation.errors.join(', ')
          },
          statusCode: 400
        };
      }

      // Check if category already exists
      const existingCategory = await this.findCategoryByName(validation.sanitizedData.name);
      if (existingCategory.success && existingCategory.data) {
        return {
          success: true,
          data: existingCategory.data,
          statusCode: 200,
          message: 'Category already exists'
        };
      }

      // Create category via WordPress REST API
      const response = await this.client.post('/wp/v2/categories', {
        name: validation.sanitizedData.name,
        slug: validation.sanitizedData.slug,
        description: validation.sanitizedData.description || '',
        parent: validation.sanitizedData.parent || 0
      });

      if (response.success && response.data) {
        secureLog('info', 'Category created successfully', {
          categoryId: response.data.id,
          categoryName: response.data.name,
          categorySlug: response.data.slug
        });

        return {
          success: true,
          data: {
            id: response.data.id,
            name: response.data.name,
            slug: response.data.slug,
            description: response.data.description,
            parent: response.data.parent,
            count: response.data.count,
            link: response.data.link
          },
          statusCode: 201
        };
      } else {
        return {
          success: false,
          error: {
            code: 'CATEGORY_CREATION_FAILED',
            message: 'Failed to create category',
            details: response.error?.message || 'Unknown error'
          },
          statusCode: response.statusCode || 500
        };
      }
    } catch (error) {
      secureLog('error', 'Error creating category', {
        error: error instanceof Error ? error.message : 'Unknown error',
        categoryData: { name: categoryData.name }
      });

      return {
        success: false,
        error: {
          code: 'CATEGORY_CREATION_ERROR',
          message: 'Error creating category',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        statusCode: 500
      };
    }
  }

  /**
   * Create a new tag
   */
  async createTag(tagData: TagData): Promise<TaxonomyResponse> {
    try {
      // Validate tag data
      const validation = this.validateTag(tagData);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'TAXONOMY_VALIDATION_ERROR',
            message: 'Tag validation failed',
            details: validation.errors.join(', ')
          },
          statusCode: 400
        };
      }

      // Check if tag already exists
      const existingTag = await this.findTagByName(validation.sanitizedData.name);
      if (existingTag.success && existingTag.data) {
        return {
          success: true,
          data: existingTag.data,
          statusCode: 200,
          message: 'Tag already exists'
        };
      }

      // Create tag via WordPress REST API
      const response = await this.client.post('/wp/v2/tags', {
        name: validation.sanitizedData.name,
        slug: validation.sanitizedData.slug,
        description: validation.sanitizedData.description || ''
      });

      if (response.success && response.data) {
        secureLog('info', 'Tag created successfully', {
          tagId: response.data.id,
          tagName: response.data.name,
          tagSlug: response.data.slug
        });

        return {
          success: true,
          data: {
            id: response.data.id,
            name: response.data.name,
            slug: response.data.slug,
            description: response.data.description,
            count: response.data.count,
            link: response.data.link
          },
          statusCode: 201
        };
      } else {
        return {
          success: false,
          error: {
            code: 'TAG_CREATION_FAILED',
            message: 'Failed to create tag',
            details: response.error?.message || 'Unknown error'
          },
          statusCode: response.statusCode || 500
        };
      }
    } catch (error) {
      secureLog('error', 'Error creating tag', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tagData: { name: tagData.name }
      });

      return {
        success: false,
        error: {
          code: 'TAG_CREATION_ERROR',
          message: 'Error creating tag',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        statusCode: 500
      };
    }
  }

  /**
   * Find category by name
   */
  async findCategoryByName(name: string): Promise<TaxonomyResponse> {
    try {
      const response = await this.client.get(`/wp/v2/categories?search=${encodeURIComponent(name)}&per_page=100`);
      
      if (response.success && response.data) {
        const categories = Array.isArray(response.data) ? response.data : [response.data];
        const exactMatch = categories.find(cat => 
          cat.name.toLowerCase() === name.toLowerCase()
        );

        if (exactMatch) {
          return {
            success: true,
            data: {
              id: exactMatch.id,
              name: exactMatch.name,
              slug: exactMatch.slug,
              description: exactMatch.description,
              parent: exactMatch.parent,
              count: exactMatch.count,
              link: exactMatch.link
            },
            statusCode: 200
          };
        }
      }

      return {
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found',
          details: `No category found with name: ${name}`
        },
        statusCode: 404
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CATEGORY_SEARCH_ERROR',
          message: 'Error searching for category',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        statusCode: 500
      };
    }
  }

  /**
   * Find tag by name
   */
  async findTagByName(name: string): Promise<TaxonomyResponse> {
    try {
      const response = await this.client.get(`/wp/v2/tags?search=${encodeURIComponent(name)}&per_page=100`);
      
      if (response.success && response.data) {
        const tags = Array.isArray(response.data) ? response.data : [response.data];
        const exactMatch = tags.find(tag => 
          tag.name.toLowerCase() === name.toLowerCase()
        );

        if (exactMatch) {
          return {
            success: true,
            data: {
              id: exactMatch.id,
              name: exactMatch.name,
              slug: exactMatch.slug,
              description: exactMatch.description,
              count: exactMatch.count,
              link: exactMatch.link
            },
            statusCode: 200
          };
        }
      }

      return {
        success: false,
        error: {
          code: 'TAG_NOT_FOUND',
          message: 'Tag not found',
          details: `No tag found with name: ${name}`
        },
        statusCode: 404
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TAG_SEARCH_ERROR',
          message: 'Error searching for tag',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        statusCode: 500
      };
    }
  }

  /**
   * Get or create categories
   */
  async getOrCreateCategories(categoryNames: string[]): Promise<TaxonomyResponse> {
    try {
      if (categoryNames.length > this.config.maxCategoriesPerPost) {
        return {
          success: false,
          error: {
            code: 'TOO_MANY_CATEGORIES',
            message: 'Too many categories',
            details: `Maximum ${this.config.maxCategoriesPerPost} categories allowed per post`
          },
          statusCode: 400
        };
      }

      const categoryIds: number[] = [];
      const createdCategories: TaxonomyTerm[] = [];
      const existingCategories: TaxonomyTerm[] = [];

      for (const categoryName of categoryNames) {
        // First try to find existing category
        const existingResult = await this.findCategoryByName(categoryName);
        
        if (existingResult.success && existingResult.data) {
          categoryIds.push(existingResult.data.id);
          existingCategories.push(existingResult.data);
        } else {
          // Create new category
          const createResult = await this.createCategory({ name: categoryName });
          
          if (createResult.success && createResult.data) {
            categoryIds.push(createResult.data.id);
            createdCategories.push(createResult.data);
          } else {
            return {
              success: false,
              error: {
                code: 'CATEGORY_PROCESSING_FAILED',
                message: 'Failed to process categories',
                details: `Failed to create category: ${categoryName} - ${createResult.error?.details}`
              },
              statusCode: createResult.statusCode || 500
            };
          }
        }
      }

      secureLog('info', 'Categories processed successfully', {
        totalCategories: categoryIds.length,
        createdCategories: createdCategories.length,
        existingCategories: existingCategories.length,
        categoryIds
      });

      return {
        success: true,
        data: {
          categoryIds,
          createdCategories,
          existingCategories,
          totalCount: categoryIds.length
        },
        statusCode: 200
      };
    } catch (error) {
      secureLog('error', 'Error processing categories', {
        error: error instanceof Error ? error.message : 'Unknown error',
        categoryNames
      });

      return {
        success: false,
        error: {
          code: 'CATEGORY_PROCESSING_ERROR',
          message: 'Error processing categories',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        statusCode: 500
      };
    }
  }

  /**
   * Get or create tags
   */
  async getOrCreateTags(tagNames: string[]): Promise<TaxonomyResponse> {
    try {
      if (tagNames.length > this.config.maxTagsPerPost) {
        return {
          success: false,
          error: {
            code: 'TOO_MANY_TAGS',
            message: 'Too many tags',
            details: `Maximum ${this.config.maxTagsPerPost} tags allowed per post`
          },
          statusCode: 400
        };
      }

      const tagIds: number[] = [];
      const createdTags: TaxonomyTerm[] = [];
      const existingTags: TaxonomyTerm[] = [];

      for (const tagName of tagNames) {
        // First try to find existing tag
        const existingResult = await this.findTagByName(tagName);
        
        if (existingResult.success && existingResult.data) {
          tagIds.push(existingResult.data.id);
          existingTags.push(existingResult.data);
        } else {
          // Create new tag
          const createResult = await this.createTag({ name: tagName });
          
          if (createResult.success && createResult.data) {
            tagIds.push(createResult.data.id);
            createdTags.push(createResult.data);
          } else {
            return {
              success: false,
              error: {
                code: 'TAG_PROCESSING_FAILED',
                message: 'Failed to process tags',
                details: `Failed to create tag: ${tagName} - ${createResult.error?.details}`
              },
              statusCode: createResult.statusCode || 500
            };
          }
        }
      }

      secureLog('info', 'Tags processed successfully', {
        totalTags: tagIds.length,
        createdTags: createdTags.length,
        existingTags: existingTags.length,
        tagIds
      });

      return {
        success: true,
        data: {
          tagIds,
          createdTags,
          existingTags,
          totalCount: tagIds.length
        },
        statusCode: 200
      };
    } catch (error) {
      secureLog('error', 'Error processing tags', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tagNames
      });

      return {
        success: false,
        error: {
          code: 'TAG_PROCESSING_ERROR',
          message: 'Error processing tags',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        statusCode: 500
      };
    }
  }

  /**
   * Get category hierarchy
   */
  async getCategoryHierarchy(): Promise<TaxonomyResponse> {
    try {
      const response = await this.client.get('/wp/v2/categories?per_page=100&orderby=name&order=asc');
      
      if (response.success && response.data) {
        const categories = Array.isArray(response.data) ? response.data : [response.data];
        
        // Build hierarchy
        const hierarchy = this.buildHierarchy(categories);
        
        return {
          success: true,
          data: hierarchy,
          statusCode: 200
        };
      } else {
        return {
          success: false,
          error: {
            code: 'HIERARCHY_RETRIEVAL_FAILED',
            message: 'Failed to retrieve category hierarchy',
            details: response.error?.message || 'Unknown error'
          },
          statusCode: response.statusCode || 500
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'HIERARCHY_RETRIEVAL_ERROR',
          message: 'Error retrieving category hierarchy',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        statusCode: 500
      };
    }
  }

  /**
   * Generate slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
  }

  /**
   * Build category hierarchy
   */
  private buildHierarchy(categories: any[]): any[] {
    const categoryMap = new Map();
    const rootCategories: any[] = [];

    // Create map of all categories
    categories.forEach(category => {
      categoryMap.set(category.id, {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        parent: category.parent,
        count: category.count,
        children: []
      });
    });

    // Build hierarchy
    categories.forEach(category => {
      const categoryNode = categoryMap.get(category.id);
      
      if (category.parent === 0) {
        rootCategories.push(categoryNode);
      } else {
        const parent = categoryMap.get(category.parent);
        if (parent) {
          parent.children.push(categoryNode);
        }
      }
    });

    return rootCategories;
  }
}

/**
 * Create WordPress taxonomy service
 */
export function createWordPressTaxonomyService(client?: WordPressClient): WordPressTaxonomyService {
  const wpClient = client || createWordPressClient();
  return new WordPressTaxonomyService(wpClient);
} 
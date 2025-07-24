/**
 * Category Creation and Hierarchy Management Service
 * Implements Task 10.2: Category creation, hierarchy management, and WordPress REST API integration
 */

// @ts-nocheck
import { logger } from '../utils/logger';
import { 
  WordPressCategory, 
  CategoryCreateRequest, 
  CategoryUpdateRequest,
  TaxonomyQueryParams,
  validateCategory,
  generateSlug,
  TaxonomyValidationOptions 
} from '../types/taxonomy';

/**
 * Category management configuration
 */
export interface CategoryManagementConfig {
  wordpressUrl: string;
  username: string;
  password: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  validationOptions?: TaxonomyValidationOptions;
}

/**
 * Category operation result
 */
export interface CategoryOperationResult {
  success: boolean;
  data?: WordPressCategory | WordPressCategory[];
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  warnings?: string[];
  requestId?: string;
}

/**
 * Category hierarchy result
 */
export interface CategoryHierarchyResult {
  success: boolean;
  hierarchy?: CategoryHierarchyNode[];
  flatList?: WordPressCategory[];
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  stats?: {
    totalCategories: number;
    maxDepth: number;
    rootCategories: number;
  };
  requestId?: string;
}

/**
 * Category hierarchy node
 */
export interface CategoryHierarchyNode extends WordPressCategory {
  children: CategoryHierarchyNode[];
  depth: number;
  hasChildren: boolean;
  parentPath: string[];
}

/**
 * Category search options
 */
export interface CategorySearchOptions extends TaxonomyQueryParams {
  includeHierarchy?: boolean;
  includeChildCount?: boolean;
  exactMatch?: boolean;
}

/**
 * Category Management Service
 */
export class CategoryManagementService {
  private config: CategoryManagementConfig;
  private baseUrl: string;
  private authHeader: string;

  constructor(config: CategoryManagementConfig) {
    this.config = {
      timeout: 10000,
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };
    
    this.baseUrl = `${this.config.wordpressUrl}/wp-json/wp/v2`;
    this.authHeader = 'Basic ' + Buffer.from(
      `${this.config.username}:${this.config.password}`
    ).toString('base64');
  }

  /**
   * Create a new category
   */
  async createCategory(
    categoryData: CategoryCreateRequest, 
    requestId?: string
  ): Promise<CategoryOperationResult> {
    const logContext: any = { requestId, categoryName: categoryData.name };
    
    try {
      logger.info('Creating category', logContext);

      // Validate category data
      const validation = validateCategory(categoryData, this.config.validationOptions);
      if (!validation.isValid) {
        logger.warn('Category validation failed', { 
          ...logContext, 
          error: validation.error 
        });
        
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Category data validation failed',
            details: validation.error
          },
          requestId
        };
      }

      // Check if category already exists
      const existingCategory = await this.findCategoryByName(
        validation.sanitizedName!, 
        { exactMatch: true },
        requestId
      );

      if (existingCategory.success && existingCategory.data) {
        logger.info('Category already exists, returning existing category', {
          ...logContext,
          existingCategoryId: (existingCategory.data as WordPressCategory).id
        });

        return {
          success: true,
          data: existingCategory.data as WordPressCategory,
          warnings: ['Category with this name already exists'],
          requestId
        };
      }

      // Validate parent category if specified
      if (categoryData.parent) {
        const parentValidation = await this.validateParentCategory(
          categoryData.parent, 
          requestId
        );
        
        if (!parentValidation.success) {
          return {
            success: false,
            error: {
              code: 'INVALID_PARENT',
              message: 'Parent category validation failed',
              details: parentValidation.error
            },
            requestId
          };
        }
      }

      // Prepare category payload
      const categoryPayload = {
        name: validation.sanitizedName!,
        slug: validation.generatedSlug || generateSlug(validation.sanitizedName!),
        description: validation.sanitizedDescription || '',
        parent: categoryData.parent || 0,
        meta: categoryData.meta || {}
      };

      // Create category via WordPress REST API
      const response = await this.makeWordPressRequest(
        'POST',
        '/categories',
        categoryPayload,
        requestId
      );

      if (response.success && response.data) {
        const createdCategory = this.transformWordPressCategory(response.data);
        
        logger.info('Category created successfully', {
          ...logContext,
          categoryId: createdCategory.id,
          categorySlug: createdCategory.slug
        });

        return {
          success: true,
          data: createdCategory,
          warnings: validation.warnings,
          requestId
        };
      } else {
        logger.error('Failed to create category', {
          ...logContext,
          error: response.error
        });

        return {
          success: false,
          error: {
            code: 'CREATION_FAILED',
            message: 'Failed to create category in WordPress',
            details: response.error
          },
          requestId
        };
      }

    } catch (error) {
      logger.error('Error creating category', {
        ...logContext,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'CREATION_ERROR',
          message: 'Unexpected error during category creation',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        requestId
      };
    }
  }

  /**
   * Update an existing category
   */
  async updateCategory(
    categoryData: CategoryUpdateRequest, 
    requestId?: string
  ): Promise<CategoryOperationResult> {
    const logContext: any = { requestId, categoryId: categoryData.id };
    
    try {
      logger.info('Updating category', logContext);

      // Validate category data
      const validation = validateCategory(categoryData, this.config.validationOptions);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Category data validation failed',
            details: validation.error
          },
          requestId
        };
      }

      // Check if category exists
      const existingCategory = await this.getCategoryById(categoryData.id, requestId);
      if (!existingCategory.success) {
        return {
          success: false,
          error: {
            code: 'CATEGORY_NOT_FOUND',
            message: 'Category not found',
            details: `Category with ID ${categoryData.id} does not exist`
          },
          requestId
        };
      }

      // Validate parent category if specified
      if (categoryData.parent !== undefined) {
        // Prevent circular references
        if (categoryData.parent === categoryData.id) {
          return {
            success: false,
            error: {
              code: 'CIRCULAR_REFERENCE',
              message: 'Category cannot be its own parent',
              details: 'Circular reference detected'
            },
            requestId
          };
        }

        if (categoryData.parent > 0) {
          const parentValidation = await this.validateParentCategory(
            categoryData.parent, 
            requestId
          );
          
          if (!parentValidation.success) {
            return {
              success: false,
              error: {
                code: 'INVALID_PARENT',
                message: 'Parent category validation failed',
                details: parentValidation.error
              },
              requestId
            };
          }

          // Check for deeper circular references
          const circularCheck = await this.checkCircularReference(
            categoryData.id, 
            categoryData.parent, 
            requestId
          );
          
          if (!circularCheck.success) {
            return {
              success: false,
              error: {
                code: 'CIRCULAR_REFERENCE',
                message: 'Circular reference detected in category hierarchy',
                details: circularCheck.error
              },
              requestId
            };
          }
        }
      }

      // Prepare update payload
      const updatePayload: any = {};
      if (categoryData.name) updatePayload.name = validation.sanitizedName;
      if (categoryData.slug) updatePayload.slug = validation.generatedSlug;
      if (categoryData.description !== undefined) updatePayload.description = validation.sanitizedDescription;
      if (categoryData.parent !== undefined) updatePayload.parent = categoryData.parent;
      if (categoryData.meta) updatePayload.meta = categoryData.meta;

      // Update category via WordPress REST API
      const response = await this.makeWordPressRequest(
        'PUT',
        `/categories/${categoryData.id}`,
        updatePayload,
        requestId
      );

      if (response.success && response.data) {
        const updatedCategory = this.transformWordPressCategory(response.data);
        
        logger.info('Category updated successfully', {
          ...logContext,
          categorySlug: updatedCategory.slug
        });

        return {
          success: true,
          data: updatedCategory,
          warnings: validation.warnings,
          requestId
        };
      } else {
        return {
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: 'Failed to update category in WordPress',
            details: response.error
          },
          requestId
        };
      }

    } catch (error) {
      logger.error('Error updating category', {
        ...logContext,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: 'Unexpected error during category update',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        requestId
      };
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(
    categoryId: number, 
    requestId?: string
  ): Promise<CategoryOperationResult> {
    try {
      const response = await this.makeWordPressRequest(
        'GET',
        `/categories/${categoryId}`,
        undefined,
        requestId
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: this.transformWordPressCategory(response.data),
          requestId
        };
      } else {
        return {
          success: false,
          error: {
            code: 'CATEGORY_NOT_FOUND',
            message: 'Category not found',
            details: response.error
          },
          requestId
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Error fetching category',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        requestId
      };
    }
  }

  /**
   * Find category by name
   */
  async findCategoryByName(
    name: string, 
    options: CategorySearchOptions = {},
    requestId?: string
  ): Promise<CategoryOperationResult> {
    try {
      const searchParams = new URLSearchParams({
        search: name,
        per_page: '100',
        ...(options.hideEmpty !== undefined && { hide_empty: options.hideEmpty.toString() }),
        ...(options.orderBy && { orderby: options.orderBy }),
        ...(options.order && { order: options.order })
      });

      const response = await this.makeWordPressRequest(
        'GET',
        `/categories?${searchParams.toString()}`,
        undefined,
        requestId
      );

      if (response.success && response.data) {
        const categories = Array.isArray(response.data) ? response.data : [response.data];
        
        let matchedCategory;
        if (options.exactMatch) {
          matchedCategory = categories.find(cat => 
            cat.name.toLowerCase() === name.toLowerCase()
          );
        } else {
          matchedCategory = categories[0]; // Return first match for non-exact search
        }

        if (matchedCategory) {
          return {
            success: true,
            data: this.transformWordPressCategory(matchedCategory),
            requestId
          };
        } else {
          return {
            success: false,
            error: {
              code: 'CATEGORY_NOT_FOUND',
              message: 'Category not found',
              details: `No category found with name: ${name}`
            },
            requestId
          };
        }
      } else {
        return {
          success: false,
          error: {
            code: 'SEARCH_FAILED',
            message: 'Failed to search categories',
            details: response.error
          },
          requestId
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: 'Error searching categories',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        requestId
      };
    }
  }

  /**
   * Get full category hierarchy
   */
  async getCategoryHierarchy(
    options: CategorySearchOptions = {},
    requestId?: string
  ): Promise<CategoryHierarchyResult> {
    try {
      logger.info('Fetching category hierarchy', { requestId });

      const searchParams = new URLSearchParams({
        per_page: '100',
        orderby: 'name',
        order: 'asc',
        ...(options.hideEmpty !== undefined && { hide_empty: options.hideEmpty.toString() }),
        ...(options.include && { include: options.include.join(',') }),
        ...(options.exclude && { exclude: options.exclude.join(',') })
      });

      const response = await this.makeWordPressRequest(
        'GET',
        `/categories?${searchParams.toString()}`,
        undefined,
        requestId
      );

      if (response.success && response.data) {
        const categories = Array.isArray(response.data) ? response.data : [response.data];
        const transformedCategories = categories.map(cat => this.transformWordPressCategory(cat));
        
        // Build hierarchy
        const hierarchy = this.buildCategoryHierarchy(transformedCategories);
        
        // Calculate stats
        const stats = {
          totalCategories: transformedCategories.length,
          maxDepth: this.calculateMaxDepth(hierarchy),
          rootCategories: hierarchy.length
        };

        logger.info('Category hierarchy retrieved successfully', {
          requestId,
          ...stats
        });

        return {
          success: true,
          hierarchy,
          flatList: transformedCategories,
          stats,
          requestId
        };
      } else {
        return {
          success: false,
          error: {
            code: 'HIERARCHY_FETCH_FAILED',
            message: 'Failed to fetch category hierarchy',
            details: response.error
          },
          requestId
        };
      }
    } catch (error) {
      logger.error('Error fetching category hierarchy', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'HIERARCHY_FETCH_ERROR',
          message: 'Error fetching category hierarchy',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        requestId
      };
    }
  }

  /**
   * Get category children
   */
  async getCategoryChildren(
    parentId: number, 
    requestId?: string
  ): Promise<CategoryOperationResult> {
    try {
      const searchParams = new URLSearchParams({
        parent: parentId.toString(),
        per_page: '100',
        orderby: 'name',
        order: 'asc'
      });

      const response = await this.makeWordPressRequest(
        'GET',
        `/categories?${searchParams.toString()}`,
        undefined,
        requestId
      );

      if (response.success && response.data) {
        const categories = Array.isArray(response.data) ? response.data : [response.data];
        const transformedCategories = categories.map(cat => this.transformWordPressCategory(cat));

        return {
          success: true,
          data: transformedCategories,
          requestId
        };
      } else {
        return {
          success: false,
          error: {
            code: 'CHILDREN_FETCH_FAILED',
            message: 'Failed to fetch category children',
            details: response.error
          },
          requestId
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CHILDREN_FETCH_ERROR',
          message: 'Error fetching category children',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        requestId
      };
    }
  }

  /**
   * Delete a category
   */
  async deleteCategory(
    categoryId: number, 
    force: boolean = false,
    requestId?: string
  ): Promise<CategoryOperationResult> {
    const logContext: any = { requestId, categoryId };
    
    try {
      logger.info('Deleting category', logContext);

      // Check if category has children
      const children = await this.getCategoryChildren(categoryId, requestId);
      if (children.success && Array.isArray(children.data) && children.data.length > 0) {
        return {
          success: false,
          error: {
            code: 'HAS_CHILDREN',
            message: 'Cannot delete category with children',
            details: `Category has ${children.data.length} child categories`
          },
          requestId
        };
      }

      const searchParams = new URLSearchParams();
      if (force) {
        searchParams.append('force', 'true');
      }

      const response = await this.makeWordPressRequest(
        'DELETE',
        `/categories/${categoryId}?${searchParams.toString()}`,
        undefined,
        requestId
      );

      if (response.success) {
        logger.info('Category deleted successfully', logContext);
        
        return {
          success: true,
          data: response.data ? this.transformWordPressCategory(response.data) : undefined,
          requestId
        };
      } else {
        return {
          success: false,
          error: {
            code: 'DELETE_FAILED',
            message: 'Failed to delete category',
            details: response.error
          },
          requestId
        };
      }
    } catch (error) {
      logger.error('Error deleting category', {
        ...logContext,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: 'Error deleting category',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        requestId
      };
    }
  }

  /**
   * Validate parent category
   */
  private async validateParentCategory(
    parentId: number, 
    requestId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const parentCategory = await this.getCategoryById(parentId, requestId);
      
      if (!parentCategory.success) {
        return {
          success: false,
          error: `Parent category with ID ${parentId} does not exist`
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Error validating parent category: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check for circular references in category hierarchy
   */
  private async checkCircularReference(
    categoryId: number, 
    proposedParentId: number, 
    requestId?: string,
    visited: Set<number> = new Set()
  ): Promise<{ success: boolean; error?: string }> {
    if (visited.has(proposedParentId)) {
      return {
        success: false,
        error: 'Circular reference detected in category hierarchy'
      };
    }

    visited.add(proposedParentId);

    try {
      const parentCategory = await this.getCategoryById(proposedParentId, requestId);
      
      if (!parentCategory.success) {
        return { success: true }; // Parent doesn't exist, no circular reference
      }

      const parent = parentCategory.data as WordPressCategory;
      
      if (parent.parent && parent.parent > 0) {
        if (parent.parent === categoryId) {
          return {
            success: false,
            error: 'Circular reference detected: proposed parent is a child of this category'
          };
        }

        // Recursively check up the hierarchy
        return this.checkCircularReference(categoryId, parent.parent, requestId, visited);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Error checking circular reference: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Build category hierarchy from flat list
   */
  private buildCategoryHierarchy(categories: WordPressCategory[]): CategoryHierarchyNode[] {
    const categoryMap = new Map<number, CategoryHierarchyNode>();
    const rootCategories: CategoryHierarchyNode[] = [];

    // Create hierarchy nodes
    categories.forEach(category => {
      const node: CategoryHierarchyNode = {
        ...category,
        children: [],
        depth: 0,
        hasChildren: false,
        parentPath: []
      };
      categoryMap.set(category.id!, node);
    });

    // Build hierarchy and calculate depth
    categories.forEach(category => {
      const node = categoryMap.get(category.id!)!;
      
      if (category.parent && category.parent > 0) {
        const parent = categoryMap.get(category.parent);
        if (parent) {
          parent.children.push(node);
          parent.hasChildren = true;
          node.depth = parent.depth + 1;
          node.parentPath = [...parent.parentPath, parent.name];
        } else {
          // Parent not found, treat as root
          rootCategories.push(node);
        }
      } else {
        rootCategories.push(node);
      }
    });

    // Sort children by name
    const sortChildren = (nodes: CategoryHierarchyNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach(node => {
        if (node.children.length > 0) {
          sortChildren(node.children);
        }
      });
    };

    sortChildren(rootCategories);
    
    return rootCategories;
  }

  /**
   * Calculate maximum depth of hierarchy
   */
  private calculateMaxDepth(hierarchy: CategoryHierarchyNode[]): number {
    let maxDepth = 0;
    
    const traverse = (nodes: CategoryHierarchyNode[], currentDepth: number) => {
      maxDepth = Math.max(maxDepth, currentDepth);
      nodes.forEach(node => {
        if (node.children.length > 0) {
          traverse(node.children, currentDepth + 1);
        }
      });
    };

    traverse(hierarchy, 0);
    return maxDepth;
  }

  /**
   * Transform WordPress category to our format
   */
  private transformWordPressCategory(wpCategory: any): WordPressCategory {
    return {
      id: wpCategory.id,
      name: wpCategory.name,
      slug: wpCategory.slug,
      description: wpCategory.description || '',
      count: wpCategory.count || 0,
      parent: wpCategory.parent || undefined,
      link: wpCategory.link,
      meta: wpCategory.meta || {}
    };
  }

  /**
   * Make WordPress REST API request
   */
  private async makeWordPressRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    requestId?: string
  ): Promise<{ success: boolean; data?: any; error?: any }> {
    const url = `${this.baseUrl}${endpoint}`;
    const logContext: any = { requestId, method, endpoint };

    let attempts = 0;
    const maxRetries = this.config.maxRetries!;

    while (attempts < maxRetries) {
      attempts++;
      
      try {
        logger.debug('Making WordPress API request', {
          ...logContext,
          attempt: attempts,
          url
        });

        const options: RequestInit = {
          method,
          headers: {
            'Authorization': this.authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(this.config.timeout!)
        };

        if (data && (method === 'POST' || method === 'PUT')) {
          options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        const responseData = await response.json();

        if (response.ok) {
          logger.debug('WordPress API request successful', {
            ...logContext,
            status: response.status,
            attempt: attempts
          });
          
          return {
            success: true,
            data: responseData
          };
        } else {
          logger.warn('WordPress API request failed', {
            ...logContext,
            status: response.status,
            attempt: attempts,
            error: responseData
          });

          // Don't retry on client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            return {
              success: false,
              error: responseData
            };
          }

          // Retry on server errors (5xx)
          if (attempts < maxRetries) {
            logger.info('Retrying WordPress API request', {
              ...logContext,
              attempt: attempts + 1,
              delay: this.config.retryDelay
            });
            
            await new Promise(resolve => setTimeout(resolve, this.config.retryDelay!));
            continue;
          }

          return {
            success: false,
            error: responseData
          };
        }
      } catch (error) {
        logger.error('WordPress API request error', {
          ...logContext,
          attempt: attempts,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        if (attempts < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay!));
          continue;
        }

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return {
      success: false,
      error: 'Max retries exceeded'
    };
  }
}

/**
 * Create category management service instance
 */
export function createCategoryManagementService(
  config: CategoryManagementConfig
): CategoryManagementService {
  return new CategoryManagementService(config);
}
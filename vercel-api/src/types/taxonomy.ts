/**
 * WordPress Taxonomy Types and Interfaces
 * Defines data structures for categories and tags with validation
 */

// @ts-nocheck
import { validationUtils, ValidationResult } from '../utils/validation';

/**
 * Base taxonomy term interface
 */
export interface BaseTaxonomyTerm {
  id?: number;
  name: string;
  slug?: string;
  description?: string;
  count?: number;
  meta?: Record<string, any>;
}

/**
 * WordPress Category interface with hierarchical support
 */
export interface WordPressCategory extends BaseTaxonomyTerm {
  parent?: number;
  parentName?: string;
  children?: WordPressCategory[];
  level?: number;
  path?: string; // Full path including parent categories
  link?: string; // WordPress URL for the category
}

/**
 * WordPress Tag interface (flat structure)
 */
export interface WordPressTag extends BaseTaxonomyTerm {
  link?: string; // WordPress URL for the tag
}

/**
 * Taxonomy validation options
 */
export interface TaxonomyValidationOptions {
  maxNameLength?: number;
  maxDescriptionLength?: number;
  maxSlugLength?: number;
  allowHtml?: boolean;
  requireName?: boolean;
  slugPattern?: RegExp;
  reservedSlugs?: string[];
  maxHierarchyDepth?: number; // For categories only
}

/**
 * Default validation options
 */
const DEFAULT_VALIDATION_OPTIONS: TaxonomyValidationOptions = {
  maxNameLength: 200,
  maxDescriptionLength: 1000,
  maxSlugLength: 200,
  allowHtml: false,
  requireName: true,
  slugPattern: /^[a-z0-9-]+$/,
  reservedSlugs: ['admin', 'api', 'www', 'root', 'wordpress', 'wp-admin', 'wp-content'],
  maxHierarchyDepth: 10
};

/**
 * Validation result for taxonomy terms
 */
export interface TaxonomyValidationResult extends ValidationResult {
  generatedSlug?: string;
  sanitizedName?: string;
  sanitizedDescription?: string;
  warnings?: string[];
}

/**
 * Category creation request
 */
export interface CategoryCreateRequest {
  name: string;
  slug?: string;
  description?: string;
  parent?: number;
  meta?: Record<string, any>;
}

/**
 * Tag creation request
 */
export interface TagCreateRequest {
  name: string;
  slug?: string;
  description?: string;
  meta?: Record<string, any>;
}

/**
 * Category update request
 */
export interface CategoryUpdateRequest extends Partial<CategoryCreateRequest> {
  id: number;
}

/**
 * Tag update request
 */
export interface TagUpdateRequest extends Partial<TagCreateRequest> {
  id: number;
}

/**
 * Taxonomy query parameters
 */
export interface TaxonomyQueryParams {
  search?: string;
  include?: number[];
  exclude?: number[];
  parent?: number;
  hideEmpty?: boolean;
  orderBy?: 'name' | 'slug' | 'count' | 'id' | 'description';
  order?: 'asc' | 'desc';
  perPage?: number;
  page?: number;
}

/**
 * Generate a URL-friendly slug from a name
 */
export function generateSlug(
  name: string, 
  options: TaxonomyValidationOptions = {}
): string {
  const config = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
  
  if (!name || typeof name !== 'string') {
    return '';
  }
  
  let slug = name
    .toLowerCase()
    .trim()
    // Replace spaces and special characters with hyphens
    .replace(/[^a-z0-9\u00C0-\u017F]/gi, '-')
    // Handle accented characters
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remove multiple consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length
    .substring(0, config.maxSlugLength || 200);
  
  // Ensure slug is not empty
  if (!slug) {
    slug = 'term-' + Date.now();
  }
  
  // Check against reserved slugs
  if (config.reservedSlugs && config.reservedSlugs.includes(slug)) {
    slug = slug + '-term';
  }
  
  return slug;
}

/**
 * Validate category data
 */
export function validateCategory(
  category: CategoryCreateRequest | CategoryUpdateRequest,
  options: TaxonomyValidationOptions = {}
): TaxonomyValidationResult {
  const config = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
  const errors: string[] = [];
  const warnings: string[] = [];
  let isValid = true;
  
  // Validate name
  if (config.requireName && (!category.name || category.name.trim() === '')) {
    errors.push('Category name is required');
    isValid = false;
  }
  
  let sanitizedName = category.name;
  if (category.name) {
    if (category.name.length > config.maxNameLength!) {
      errors.push(`Category name exceeds maximum length of ${config.maxNameLength} characters`);
      isValid = false;
    }
    
    // Sanitize name
    if (!config.allowHtml) {
      const nameValidation = validationUtils.validateString(category.name, {
        maxLength: config.maxNameLength,
        pattern: /^[^<>]*$/ // No HTML tags
      });
      
      if (!nameValidation.isValid) {
        errors.push('Category name contains invalid characters');
        isValid = false;
      }
      
      sanitizedName = validationUtils.sanitizeString(category.name);
    }
  }
  
  // Validate description
  let sanitizedDescription = category.description;
  if (category.description) {
    if (category.description.length > config.maxDescriptionLength!) {
      warnings.push(`Description truncated to ${config.maxDescriptionLength} characters`);
      sanitizedDescription = category.description.substring(0, config.maxDescriptionLength);
    }
    
    if (!config.allowHtml) {
      sanitizedDescription = validationUtils.sanitizeString(category.description || '');
    }
  }
  
  // Validate or generate slug
  let generatedSlug = category.slug;
  if (!generatedSlug && sanitizedName) {
    generatedSlug = generateSlug(sanitizedName, config);
  } else if (generatedSlug) {
    // Validate provided slug
    if (generatedSlug.length > config.maxSlugLength!) {
      errors.push(`Slug exceeds maximum length of ${config.maxSlugLength} characters`);
      isValid = false;
    }
    
    if (config.slugPattern && !config.slugPattern.test(generatedSlug)) {
      errors.push('Slug contains invalid characters. Use only lowercase letters, numbers, and hyphens');
      isValid = false;
    }
    
    if (config.reservedSlugs && config.reservedSlugs.includes(generatedSlug)) {
      errors.push(`Slug "${generatedSlug}" is reserved and cannot be used`);
      isValid = false;
    }
  }
  
  // Validate parent (for hierarchy)
  if (category.parent !== undefined) {
    if (typeof category.parent !== 'number' || category.parent < 0) {
      errors.push('Parent category ID must be a positive number');
      isValid = false;
    }
    
    // Check for circular reference (if updating)
    if ('id' in category && category.parent === category.id) {
      errors.push('Category cannot be its own parent');
      isValid = false;
    }
  }
  
  return {
    isValid,
    error: errors.length > 0 ? errors.join('; ') : undefined,
    generatedSlug,
    sanitizedName,
    sanitizedDescription,
    warnings
  };
}

/**
 * Validate tag data
 */
export function validateTag(
  tag: TagCreateRequest | TagUpdateRequest,
  options: TaxonomyValidationOptions = {}
): TaxonomyValidationResult {
  const config = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
  const errors: string[] = [];
  const warnings: string[] = [];
  let isValid = true;
  
  // Validate name
  if (config.requireName && (!tag.name || tag.name.trim() === '')) {
    errors.push('Tag name is required');
    isValid = false;
  }
  
  let sanitizedName = tag.name;
  if (tag.name) {
    if (tag.name.length > config.maxNameLength!) {
      errors.push(`Tag name exceeds maximum length of ${config.maxNameLength} characters`);
      isValid = false;
    }
    
    // Sanitize name
    if (!config.allowHtml) {
      const nameValidation = validationUtils.validateString(tag.name, {
        maxLength: config.maxNameLength,
        pattern: /^[^<>]*$/ // No HTML tags
      });
      
      if (!nameValidation.isValid) {
        errors.push('Tag name contains invalid characters');
        isValid = false;
      }
      
      sanitizedName = validationUtils.sanitizeString(tag.name);
    }
  }
  
  // Validate description
  let sanitizedDescription = tag.description;
  if (tag.description) {
    if (tag.description.length > config.maxDescriptionLength!) {
      warnings.push(`Description truncated to ${config.maxDescriptionLength} characters`);
      sanitizedDescription = tag.description.substring(0, config.maxDescriptionLength);
    }
    
    if (!config.allowHtml) {
      sanitizedDescription = validationUtils.sanitizeString(tag.description || '');
    }
  }
  
  // Validate or generate slug
  let generatedSlug = tag.slug;
  if (!generatedSlug && sanitizedName) {
    generatedSlug = generateSlug(sanitizedName, config);
  } else if (generatedSlug) {
    // Validate provided slug
    if (generatedSlug.length > config.maxSlugLength!) {
      errors.push(`Slug exceeds maximum length of ${config.maxSlugLength} characters`);
      isValid = false;
    }
    
    if (config.slugPattern && !config.slugPattern.test(generatedSlug)) {
      errors.push('Slug contains invalid characters. Use only lowercase letters, numbers, and hyphens');
      isValid = false;
    }
    
    if (config.reservedSlugs && config.reservedSlugs.includes(generatedSlug)) {
      errors.push(`Slug "${generatedSlug}" is reserved and cannot be used`);
      isValid = false;
    }
  }
  
  return {
    isValid,
    error: errors.length > 0 ? errors.join('; ') : undefined,
    generatedSlug,
    sanitizedName,
    sanitizedDescription,
    warnings
  };
}

/**
 * Build category hierarchy path
 */
export function buildCategoryPath(
  category: WordPressCategory,
  categories: WordPressCategory[] = []
): string {
  if (!category.parent) {
    return category.name;
  }
  
  const parentCategory = categories.find(cat => cat.id === category.parent);
  if (!parentCategory) {
    return category.name;
  }
  
  const parentPath = buildCategoryPath(parentCategory, categories);
  return `${parentPath} > ${category.name}`;
}

/**
 * Calculate category hierarchy level
 */
export function calculateCategoryLevel(
  category: WordPressCategory,
  categories: WordPressCategory[] = [],
  maxDepth: number = 10
): number {
  if (!category.parent || maxDepth <= 0) {
    return 0;
  }
  
  const parentCategory = categories.find(cat => cat.id === category.parent);
  if (!parentCategory) {
    return 0;
  }
  
  return 1 + calculateCategoryLevel(parentCategory, categories, maxDepth - 1);
}

/**
 * Validate category hierarchy depth
 */
export function validateCategoryHierarchy(
  categories: WordPressCategory[],
  maxDepth: number = 10
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  for (const category of categories) {
    const level = calculateCategoryLevel(category, categories, maxDepth + 1);
    
    if (level > maxDepth) {
      errors.push(`Category "${category.name}" exceeds maximum hierarchy depth of ${maxDepth}`);
    } else if (level === maxDepth) {
      warnings.push(`Category "${category.name}" is at maximum hierarchy depth`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Sort categories by hierarchy
 */
export function sortCategoriesByHierarchy(categories: WordPressCategory[]): WordPressCategory[] {
  const sorted: WordPressCategory[] = [];
  const remaining = [...categories];
  
  // Function to add category and its children recursively
  const addCategoryAndChildren = (parentId: number | undefined) => {
    const children = remaining.filter(cat => cat.parent === parentId);
    children.sort((a, b) => a.name.localeCompare(b.name));
    
    for (const child of children) {
      const index = remaining.indexOf(child);
      if (index > -1) {
        remaining.splice(index, 1);
        sorted.push(child);
        addCategoryAndChildren(child.id);
      }
    }
  };
  
  // Start with root categories (no parent)
  addCategoryAndChildren(undefined);
  
  // Add any remaining categories (in case of orphaned categories)
  sorted.push(...remaining);
  
  return sorted;
}

/**
 * Taxonomy utilities object
 */
export const taxonomyUtils = {
  generateSlug,
  validateCategory,
  validateTag,
  buildCategoryPath,
  calculateCategoryLevel,
  validateCategoryHierarchy,
  sortCategoriesByHierarchy,
  
  // Default validation options
  defaultValidationOptions: DEFAULT_VALIDATION_OPTIONS
};

export default taxonomyUtils;
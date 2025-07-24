import { jest } from '@jest/globals';
import {
  taxonomyUtils,
  generateSlug,
  validateCategory,
  validateTag,
  buildCategoryPath,
  calculateCategoryLevel,
  validateCategoryHierarchy,
  sortCategoriesByHierarchy,
  WordPressCategory,
  CategoryCreateRequest,
  TagCreateRequest,
  TaxonomyValidationOptions
} from '../taxonomy';

// Mock validation utils
jest.mock('../../utils/validation', () => ({
  validationUtils: {
    validateString: jest.fn((value, options = {}) => {
      if (options.pattern && !options.pattern.test(value)) {
        return { isValid: false, error: 'Pattern mismatch' };
      }
      if (options.maxLength && value.length > options.maxLength) {
        return { isValid: false, error: 'Too long' };
      }
      return { isValid: true };
    }),
    sanitizeString: jest.fn((value) => value.replace(/<[^>]*>/g, ''))
  }
}));

describe('Taxonomy Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSlug', () => {
    it('should generate basic slugs from names', () => {
      expect(generateSlug('Hello World')).toBe('hello-world');
      expect(generateSlug('Technology')).toBe('technology');
      expect(generateSlug('JavaScript Development')).toBe('javascript-development');
    });

    it('should handle special characters', () => {
      expect(generateSlug('React & Vue.js')).toBe('react-vue-js');
      expect(generateSlug('C++ Programming')).toBe('c-programming');
      expect(generateSlug('Node.js & Express')).toBe('node-js-express');
    });

    it('should handle accented characters', () => {
      expect(generateSlug('Café & Résumé')).toBe('cafe-resume');
      expect(generateSlug('Naïve Algorithm')).toBe('naive-algorithm');
      expect(generateSlug('Piñata Party')).toBe('pinata-party');
    });

    it('should handle multiple spaces and hyphens', () => {
      expect(generateSlug('Multiple   Spaces')).toBe('multiple-spaces');
      expect(generateSlug('Already-Has-Hyphens')).toBe('already-has-hyphens');
      expect(generateSlug('  Leading and trailing  ')).toBe('leading-and-trailing');
    });

    it('should limit slug length', () => {
      const longName = 'A'.repeat(300);
      const slug = generateSlug(longName, { maxSlugLength: 50 });
      expect(slug.length).toBeLessThanOrEqual(50);
    });

    it('should handle reserved slugs', () => {
      expect(generateSlug('admin')).toBe('admin-term');
      expect(generateSlug('wordpress')).toBe('wordpress-term');
      expect(generateSlug('api')).toBe('api-term');
    });

    it('should handle empty or invalid input', () => {
      expect(generateSlug('')).toBeTruthy(); // Should generate fallback
      expect(generateSlug('   ')).toBeTruthy(); // Should generate fallback
      expect(generateSlug(null as any)).toBe('');
      expect(generateSlug(undefined as any)).toBe('');
    });

    it('should handle Unicode and emoji', () => {
      expect(generateSlug('Hello 🌟 World')).toBe('hello-world');
      expect(generateSlug('Test 测试')).toBe('test');
    });
  });

  describe('validateCategory', () => {
    it('should validate valid category data', () => {
      const category: CategoryCreateRequest = {
        name: 'Technology',
        description: 'Tech-related posts',
        slug: 'technology'
      };

      const result = validateCategory(category);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.generatedSlug).toBe('technology');
    });

    it('should require category name', () => {
      const category: CategoryCreateRequest = {
        name: ''
      };

      const result = validateCategory(category);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Category name is required');
    });

    it('should validate name length', () => {
      const category: CategoryCreateRequest = {
        name: 'A'.repeat(300)
      };

      const result = validateCategory(category, { maxNameLength: 200 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum length');
    });

    it('should generate slug from name when not provided', () => {
      const category: CategoryCreateRequest = {
        name: 'Web Development'
      };

      const result = validateCategory(category);
      expect(result.isValid).toBe(true);
      expect(result.generatedSlug).toBe('web-development');
    });

    it('should validate provided slug', () => {
      const category: CategoryCreateRequest = {
        name: 'Technology',
        slug: 'invalid slug!'
      };

      const result = validateCategory(category);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    it('should validate reserved slugs', () => {
      const category: CategoryCreateRequest = {
        name: 'Administration',
        slug: 'admin'
      };

      const result = validateCategory(category);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('reserved');
    });

    it('should validate parent category', () => {
      const category: CategoryCreateRequest = {
        name: 'Subcategory',
        parent: 123
      };

      const result = validateCategory(category);
      expect(result.isValid).toBe(true);
    });

    it('should reject negative parent ID', () => {
      const category: CategoryCreateRequest = {
        name: 'Subcategory',
        parent: -1
      };

      const result = validateCategory(category);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('positive number');
    });

    it('should prevent circular parent reference', () => {
      const category = {
        id: 123,
        name: 'Category',
        parent: 123
      };

      const result = validateCategory(category);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot be its own parent');
    });

    it('should handle description truncation', () => {
      const category: CategoryCreateRequest = {
        name: 'Technology',
        description: 'A'.repeat(2000)
      };

      const result = validateCategory(category, { maxDescriptionLength: 1000 });
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Description truncated');
      expect(result.sanitizedDescription?.length).toBe(1000);
    });

    it('should sanitize HTML in names and descriptions', () => {
      const category: CategoryCreateRequest = {
        name: 'Tech<script>alert(1)</script>',
        description: 'Description with <b>HTML</b>'
      };

      const result = validateCategory(category, { allowHtml: false });
      expect(result.isValid).toBe(true);
      expect(result.sanitizedName).toBe('Techalert(1)');
      expect(result.sanitizedDescription).toBe('Description with HTML');
    });
  });

  describe('validateTag', () => {
    it('should validate valid tag data', () => {
      const tag: TagCreateRequest = {
        name: 'javascript',
        description: 'JavaScript programming',
        slug: 'javascript'
      };

      const result = validateTag(tag);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should require tag name', () => {
      const tag: TagCreateRequest = {
        name: ''
      };

      const result = validateTag(tag);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Tag name is required');
    });

    it('should generate slug from name', () => {
      const tag: TagCreateRequest = {
        name: 'React Development'
      };

      const result = validateTag(tag);
      expect(result.isValid).toBe(true);
      expect(result.generatedSlug).toBe('react-development');
    });

    it('should validate tag name length', () => {
      const tag: TagCreateRequest = {
        name: 'A'.repeat(300)
      };

      const result = validateTag(tag, { maxNameLength: 100 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum length');
    });

    it('should validate slug format', () => {
      const tag: TagCreateRequest = {
        name: 'JavaScript',
        slug: 'JavaScript!'
      };

      const result = validateTag(tag);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });
  });

  describe('buildCategoryPath', () => {
    it('should build path for root category', () => {
      const category: WordPressCategory = {
        id: 1,
        name: 'Technology'
      };

      const path = buildCategoryPath(category);
      expect(path).toBe('Technology');
    });

    it('should build path for nested category', () => {
      const categories: WordPressCategory[] = [
        { id: 1, name: 'Technology' },
        { id: 2, name: 'Programming', parent: 1 },
        { id: 3, name: 'JavaScript', parent: 2 }
      ];

      const path = buildCategoryPath(categories[2], categories);
      expect(path).toBe('Technology > Programming > JavaScript');
    });

    it('should handle missing parent', () => {
      const category: WordPressCategory = {
        id: 2,
        name: 'Programming',
        parent: 999 // Non-existent parent
      };

      const path = buildCategoryPath(category, []);
      expect(path).toBe('Programming');
    });
  });

  describe('calculateCategoryLevel', () => {
    it('should calculate level for root category', () => {
      const category: WordPressCategory = {
        id: 1,
        name: 'Technology'
      };

      const level = calculateCategoryLevel(category);
      expect(level).toBe(0);
    });

    it('should calculate level for nested categories', () => {
      const categories: WordPressCategory[] = [
        { id: 1, name: 'Technology' },
        { id: 2, name: 'Programming', parent: 1 },
        { id: 3, name: 'JavaScript', parent: 2 },
        { id: 4, name: 'React', parent: 3 }
      ];

      expect(calculateCategoryLevel(categories[0], categories)).toBe(0);
      expect(calculateCategoryLevel(categories[1], categories)).toBe(1);
      expect(calculateCategoryLevel(categories[2], categories)).toBe(2);
      expect(calculateCategoryLevel(categories[3], categories)).toBe(3);
    });

    it('should respect maximum depth', () => {
      const categories: WordPressCategory[] = [
        { id: 1, name: 'Level1' },
        { id: 2, name: 'Level2', parent: 1 },
        { id: 3, name: 'Level3', parent: 2 },
        { id: 4, name: 'Level4', parent: 3 }
      ];

      const level = calculateCategoryLevel(categories[3], categories, 2);
      expect(level).toBe(2); // Should stop at max depth
    });
  });

  describe('validateCategoryHierarchy', () => {
    it('should validate proper hierarchy', () => {
      const categories: WordPressCategory[] = [
        { id: 1, name: 'Technology' },
        { id: 2, name: 'Programming', parent: 1 },
        { id: 3, name: 'JavaScript', parent: 2 }
      ];

      const result = validateCategoryHierarchy(categories, 5);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect hierarchy depth violations', () => {
      const categories: WordPressCategory[] = [
        { id: 1, name: 'Level1' },
        { id: 2, name: 'Level2', parent: 1 },
        { id: 3, name: 'Level3', parent: 2 },
        { id: 4, name: 'Level4', parent: 3 }
      ];

      const result = validateCategoryHierarchy(categories, 2);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Category "Level4" exceeds maximum hierarchy depth of 2');
    });

    it('should generate warnings for categories at max depth', () => {
      const categories: WordPressCategory[] = [
        { id: 1, name: 'Level1' },
        { id: 2, name: 'Level2', parent: 1 },
        { id: 3, name: 'Level3', parent: 2 }
      ];

      const result = validateCategoryHierarchy(categories, 2);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Category "Level3" is at maximum hierarchy depth');
    });
  });

  describe('sortCategoriesByHierarchy', () => {
    it('should sort categories by hierarchy', () => {
      const categories: WordPressCategory[] = [
        { id: 3, name: 'JavaScript', parent: 2 },
        { id: 1, name: 'Technology' },
        { id: 4, name: 'React', parent: 3 },
        { id: 2, name: 'Programming', parent: 1 },
        { id: 5, name: 'Vue', parent: 3 }
      ];

      const sorted = sortCategoriesByHierarchy(categories);
      
      // Should be ordered: Technology, Programming, JavaScript, React, Vue
      expect(sorted[0].name).toBe('Technology');
      expect(sorted[1].name).toBe('Programming');
      expect(sorted[2].name).toBe('JavaScript');
      expect(sorted[3].name).toBe('React');
      expect(sorted[4].name).toBe('Vue');
    });

    it('should handle multiple root categories', () => {
      const categories: WordPressCategory[] = [
        { id: 2, name: 'Sports' },
        { id: 1, name: 'Technology' },
        { id: 3, name: 'Programming', parent: 1 },
        { id: 4, name: 'Football', parent: 2 }
      ];

      const sorted = sortCategoriesByHierarchy(categories);
      
      // Root categories should come first, sorted alphabetically
      expect(sorted[0].name).toBe('Sports');
      expect(sorted[1].name).toBe('Technology');
      expect(sorted[2].name).toBe('Football');
      expect(sorted[3].name).toBe('Programming');
    });

    it('should handle orphaned categories', () => {
      const categories: WordPressCategory[] = [
        { id: 1, name: 'Technology' },
        { id: 2, name: 'Orphan', parent: 999 }, // Non-existent parent
        { id: 3, name: 'Programming', parent: 1 }
      ];

      const sorted = sortCategoriesByHierarchy(categories);
      
      expect(sorted).toHaveLength(3);
      expect(sorted.map(c => c.name)).toContain('Orphan');
    });
  });

  describe('Custom validation options', () => {
    it('should use custom validation options', () => {
      const options: TaxonomyValidationOptions = {
        maxNameLength: 50,
        maxDescriptionLength: 200,
        maxSlugLength: 30,
        allowHtml: true,
        requireName: false,
        slugPattern: /^[a-z0-9_]+$/,
        reservedSlugs: ['custom-reserved'],
        maxHierarchyDepth: 3
      };

      const category: CategoryCreateRequest = {
        name: 'Custom Category',
        slug: 'custom-reserved'
      };

      const result = validateCategory(category, options);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('reserved');
    });

    it('should allow optional names when configured', () => {
      const options: TaxonomyValidationOptions = {
        requireName: false
      };

      const category: CategoryCreateRequest = {
        name: ''
      };

      const result = validateCategory(category, options);
      expect(result.isValid).toBe(true);
    });

    it('should allow HTML when configured', () => {
      const options: TaxonomyValidationOptions = {
        allowHtml: true
      };

      const category: CategoryCreateRequest = {
        name: 'Category with <b>HTML</b>',
        description: 'Description with <em>emphasis</em>'
      };

      const result = validateCategory(category, options);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedName).toBe('Category with <b>HTML</b>');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle null and undefined values', () => {
      const category = {
        name: null as any
      };

      const result = validateCategory(category);
      expect(result.isValid).toBe(false);
    });

    it('should handle very long slugs', () => {
      const category: CategoryCreateRequest = {
        name: 'Category',
        slug: 'a'.repeat(500)
      };

      const result = validateCategory(category, { maxSlugLength: 100 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Slug exceeds maximum length');
    });

    it('should handle special characters in names', () => {
      const category: CategoryCreateRequest = {
        name: 'Category with 中文 and émojis 🚀'
      };

      const result = validateCategory(category);
      expect(result.isValid).toBe(true);
      expect(result.generatedSlug).toBe('category-with-and-emojis');
    });
  });

  describe('Taxonomy utils object', () => {
    it('should export all utility functions', () => {
      expect(taxonomyUtils.generateSlug).toBeDefined();
      expect(taxonomyUtils.validateCategory).toBeDefined();
      expect(taxonomyUtils.validateTag).toBeDefined();
      expect(taxonomyUtils.buildCategoryPath).toBeDefined();
      expect(taxonomyUtils.calculateCategoryLevel).toBeDefined();
      expect(taxonomyUtils.validateCategoryHierarchy).toBeDefined();
      expect(taxonomyUtils.sortCategoriesByHierarchy).toBeDefined();
      expect(taxonomyUtils.defaultValidationOptions).toBeDefined();
    });

    it('should have proper default validation options', () => {
      const options = taxonomyUtils.defaultValidationOptions;
      expect(options.maxNameLength).toBe(200);
      expect(options.maxDescriptionLength).toBe(1000);
      expect(options.maxSlugLength).toBe(200);
      expect(options.allowHtml).toBe(false);
      expect(options.requireName).toBe(true);
      expect(options.maxHierarchyDepth).toBe(10);
      expect(options.reservedSlugs).toContain('admin');
    });
  });
});
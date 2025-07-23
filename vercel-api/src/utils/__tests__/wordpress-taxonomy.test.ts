import { WordPressTaxonomyService, createWordPressTaxonomyService } from '../wordpress-taxonomy';
import { WordPressClient } from '../wordpress';
import { WordPressError, ValidationError } from '../../types';

// Mock the WordPress client
const mockWordPressClient = {
  post: jest.fn(),
  put: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
} as jest.Mocked<WordPressClient>;

// Mock environment utilities
jest.mock('../env', () => ({
  getEnvVars: jest.fn(() => ({
    WORDPRESS_URL: 'https://example.com',
    WORDPRESS_USERNAME: 'testuser',
    WORDPRESS_APP_PASSWORD: 'testpassword',
    WORDPRESS_TIMEOUT_MS: 30000,
  })),
  secureLog: jest.fn(),
}));

describe('WordPress Taxonomy Service', () => {
  let taxonomyService: WordPressTaxonomyService;

  beforeEach(() => {
    jest.clearAllMocks();
    taxonomyService = new WordPressTaxonomyService(mockWordPressClient);
  });

  describe('WordPressTaxonomyService', () => {
    describe('validateCategory', () => {
      it('should validate valid category data', () => {
        const category = {
          name: 'Test Category',
          description: 'A test category',
          parent: 0
        };
        const result = taxonomyService.validateCategory(category);
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.sanitizedData.name).toBe('Test Category');
      });

      it('should reject empty category name', () => {
        const category = { name: '' };
        const result = taxonomyService.validateCategory(category);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Category name cannot be empty');
      });

      it('should reject category name that is too long', () => {
        const longName = 'A'.repeat(60);
        const category = { name: longName };
        const result = taxonomyService.validateCategory(category);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Category name exceeds maximum length of 50 characters');
      });

      it('should validate category slug', () => {
        const category = { name: 'Test Category', slug: 'test-category' };
        const result = taxonomyService.validateCategory(category);
        
        expect(result.valid).toBe(true);
        expect(result.sanitizedData.slug).toBe('test-category');
      });

      it('should reject invalid category slug', () => {
        const category = { name: 'Test Category', slug: 'test@category' };
        const result = taxonomyService.validateCategory(category);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Category slug can only contain lowercase letters, numbers, and hyphens');
      });

      it('should auto-generate slug when not provided', () => {
        const category = { name: 'Test Category' };
        const result = taxonomyService.validateCategory(category);
        
        expect(result.valid).toBe(true);
        expect(result.sanitizedData.slug).toBe('test-category');
      });

      it('should validate parent category', () => {
        const category = { name: 'Test Category', parent: 5 };
        const result = taxonomyService.validateCategory(category);
        
        expect(result.valid).toBe(true);
        expect(result.sanitizedData.parent).toBe(5);
      });

      it('should reject negative parent ID', () => {
        const category = { name: 'Test Category', parent: -1 };
        const result = taxonomyService.validateCategory(category);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Parent category ID must be a positive integer');
      });
    });

    describe('validateTag', () => {
      it('should validate valid tag data', () => {
        const tag = {
          name: 'Test Tag',
          description: 'A test tag'
        };
        const result = taxonomyService.validateTag(tag);
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.sanitizedData.name).toBe('Test Tag');
      });

      it('should reject empty tag name', () => {
        const tag = { name: '' };
        const result = taxonomyService.validateTag(tag);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Tag name cannot be empty');
      });

      it('should reject tag name that is too long', () => {
        const longName = 'A'.repeat(60);
        const tag = { name: longName };
        const result = taxonomyService.validateTag(tag);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Tag name exceeds maximum length of 50 characters');
      });

      it('should auto-generate tag slug when not provided', () => {
        const tag = { name: 'Test Tag' };
        const result = taxonomyService.validateTag(tag);
        
        expect(result.valid).toBe(true);
        expect(result.sanitizedData.slug).toBe('test-tag');
      });
    });

    describe('createCategory', () => {
      it('should create a new category successfully', async () => {
        const categoryData = { name: 'New Category' };
        
        mockWordPressClient.post.mockResolvedValue({
          success: true,
          data: {
            id: 123,
            name: 'New Category',
            slug: 'new-category',
            description: '',
            parent: 0,
            count: 0,
            link: 'https://example.com/category/new-category'
          },
          statusCode: 201
        });

        const result = await taxonomyService.createCategory(categoryData);

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe(123);
        expect(result.data?.name).toBe('New Category');
        expect(result.statusCode).toBe(201);
        expect(mockWordPressClient.post).toHaveBeenCalledWith('/wp/v2/categories', {
          name: 'New Category',
          slug: 'new-category',
          description: '',
          parent: 0
        });
      });

      it('should return existing category if it already exists', async () => {
        const categoryData = { name: 'Existing Category' };
        
        mockWordPressClient.get.mockResolvedValue({
          success: true,
          data: [{
            id: 456,
            name: 'Existing Category',
            slug: 'existing-category',
            description: '',
            parent: 0,
            count: 5,
            link: 'https://example.com/category/existing-category'
          }],
          statusCode: 200
        });

        const result = await taxonomyService.createCategory(categoryData);

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe(456);
        expect(result.message).toBe('Category already exists');
        expect(mockWordPressClient.post).not.toHaveBeenCalled();
      });

      it('should return validation error for invalid category data', async () => {
        const categoryData = { name: '' };
        
        const result = await taxonomyService.createCategory(categoryData);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('TAXONOMY_VALIDATION_ERROR');
        expect(result.statusCode).toBe(400);
        expect(mockWordPressClient.post).not.toHaveBeenCalled();
      });
    });

    describe('createTag', () => {
      it('should create a new tag successfully', async () => {
        const tagData = { name: 'New Tag' };
        
        mockWordPressClient.post.mockResolvedValue({
          success: true,
          data: {
            id: 789,
            name: 'New Tag',
            slug: 'new-tag',
            description: '',
            count: 0,
            link: 'https://example.com/tag/new-tag'
          },
          statusCode: 201
        });

        const result = await taxonomyService.createTag(tagData);

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe(789);
        expect(result.data?.name).toBe('New Tag');
        expect(result.statusCode).toBe(201);
        expect(mockWordPressClient.post).toHaveBeenCalledWith('/wp/v2/tags', {
          name: 'New Tag',
          slug: 'new-tag',
          description: ''
        });
      });

      it('should return existing tag if it already exists', async () => {
        const tagData = { name: 'Existing Tag' };
        
        mockWordPressClient.get.mockResolvedValue({
          success: true,
          data: [{
            id: 101,
            name: 'Existing Tag',
            slug: 'existing-tag',
            description: '',
            count: 3,
            link: 'https://example.com/tag/existing-tag'
          }],
          statusCode: 200
        });

        const result = await taxonomyService.createTag(tagData);

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe(101);
        expect(result.message).toBe('Tag already exists');
        expect(mockWordPressClient.post).not.toHaveBeenCalled();
      });
    });

    describe('findCategoryByName', () => {
      it('should find category by exact name match', async () => {
        const searchResults = [
          { id: 1, name: 'Technology', slug: 'technology' },
          { id: 2, name: 'Tech News', slug: 'tech-news' }
        ];
        
        mockWordPressClient.get.mockResolvedValue({
          success: true,
          data: searchResults,
          statusCode: 200
        });

        const result = await taxonomyService.findCategoryByName('Technology');

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe(1);
        expect(result.data?.name).toBe('Technology');
        expect(mockWordPressClient.get).toHaveBeenCalledWith('/wp/v2/categories?search=Technology&per_page=100');
      });

      it('should return not found for non-existent category', async () => {
        mockWordPressClient.get.mockResolvedValue({
          success: true,
          data: [],
          statusCode: 200
        });

        const result = await taxonomyService.findCategoryByName('Non Existent');

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('CATEGORY_NOT_FOUND');
        expect(result.statusCode).toBe(404);
      });
    });

    describe('findTagByName', () => {
      it('should find tag by exact name match', async () => {
        const searchResults = [
          { id: 1, name: 'JavaScript', slug: 'javascript' },
          { id: 2, name: 'JS Tips', slug: 'js-tips' }
        ];
        
        mockWordPressClient.get.mockResolvedValue({
          success: true,
          data: searchResults,
          statusCode: 200
        });

        const result = await taxonomyService.findTagByName('JavaScript');

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe(1);
        expect(result.data?.name).toBe('JavaScript');
        expect(mockWordPressClient.get).toHaveBeenCalledWith('/wp/v2/tags?search=JavaScript&per_page=100');
      });
    });

    describe('getOrCreateCategories', () => {
      it('should process multiple categories successfully', async () => {
        const categoryNames = ['Technology', 'Programming', 'Web Development'];
        
        // Mock existing category
        mockWordPressClient.get.mockResolvedValueOnce({
          success: true,
          data: [{ id: 1, name: 'Technology', slug: 'technology' }],
          statusCode: 200
        });

        // Mock new category creation
        mockWordPressClient.post.mockResolvedValueOnce({
          success: true,
          data: { id: 2, name: 'Programming', slug: 'programming' },
          statusCode: 201
        });

        mockWordPressClient.post.mockResolvedValueOnce({
          success: true,
          data: { id: 3, name: 'Web Development', slug: 'web-development' },
          statusCode: 201
        });

        const result = await taxonomyService.getOrCreateCategories(categoryNames);

        expect(result.success).toBe(true);
        expect(result.data?.categoryIds).toEqual([1, 2, 3]);
        expect(result.data?.existingCategories).toHaveLength(1);
        expect(result.data?.createdCategories).toHaveLength(2);
        expect(result.data?.totalCount).toBe(3);
      });

      it('should reject too many categories', async () => {
        const manyCategories = Array.from({ length: 15 }, (_, i) => `Category ${i}`);
        
        const result = await taxonomyService.getOrCreateCategories(manyCategories);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('TOO_MANY_CATEGORIES');
        expect(result.statusCode).toBe(400);
      });
    });

    describe('getOrCreateTags', () => {
      it('should process multiple tags successfully', async () => {
        const tagNames = ['JavaScript', 'React', 'TypeScript'];
        
        // Mock existing tag
        mockWordPressClient.get.mockResolvedValueOnce({
          success: true,
          data: [{ id: 1, name: 'JavaScript', slug: 'javascript' }],
          statusCode: 200
        });

        // Mock new tag creation
        mockWordPressClient.post.mockResolvedValueOnce({
          success: true,
          data: { id: 2, name: 'React', slug: 'react' },
          statusCode: 201
        });

        mockWordPressClient.post.mockResolvedValueOnce({
          success: true,
          data: { id: 3, name: 'TypeScript', slug: 'typescript' },
          statusCode: 201
        });

        const result = await taxonomyService.getOrCreateTags(tagNames);

        expect(result.success).toBe(true);
        expect(result.data?.tagIds).toEqual([1, 2, 3]);
        expect(result.data?.existingTags).toHaveLength(1);
        expect(result.data?.createdTags).toHaveLength(2);
        expect(result.data?.totalCount).toBe(3);
      });

      it('should reject too many tags', async () => {
        const manyTags = Array.from({ length: 25 }, (_, i) => `Tag ${i}`);
        
        const result = await taxonomyService.getOrCreateTags(manyTags);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('TOO_MANY_TAGS');
        expect(result.statusCode).toBe(400);
      });
    });

    describe('getCategoryHierarchy', () => {
      it('should build category hierarchy correctly', async () => {
        const categories = [
          { id: 1, name: 'Technology', parent: 0 },
          { id: 2, name: 'Programming', parent: 1 },
          { id: 3, name: 'Web Development', parent: 2 },
          { id: 4, name: 'Design', parent: 0 }
        ];
        
        mockWordPressClient.get.mockResolvedValue({
          success: true,
          data: categories,
          statusCode: 200
        });

        const result = await taxonomyService.getCategoryHierarchy();

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(2); // Technology and Design (root categories)
        expect(result.data[0].name).toBe('Technology');
        expect(result.data[0].children).toHaveLength(1); // Programming
        expect(result.data[0].children[0].children).toHaveLength(1); // Web Development
        expect(result.data[1].name).toBe('Design');
        expect(result.data[1].children).toHaveLength(0);
      });
    });
  });

  describe('createWordPressTaxonomyService', () => {
    it('should create a WordPressTaxonomyService instance', () => {
      const service = createWordPressTaxonomyService(mockWordPressClient);
      
      expect(service).toBeInstanceOf(WordPressTaxonomyService);
    });

    it('should create a WordPressTaxonomyService with default client if none provided', () => {
      const service = createWordPressTaxonomyService();
      
      expect(service).toBeInstanceOf(WordPressTaxonomyService);
    });
  });
}); 
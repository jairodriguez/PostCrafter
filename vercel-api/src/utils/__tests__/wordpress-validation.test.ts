import { 
  WordPressValidationService, 
  createWordPressValidationService,
  DEFAULT_WORDPRESS_VALIDATION_CONFIG 
} from '../wordpress-validation';
import { WordPressPostData } from '../../types';

describe('WordPressValidationService', () => {
  let validationService: WordPressValidationService;

  beforeEach(() => {
    validationService = createWordPressValidationService();
  });

  describe('validateAndSanitizePostData', () => {
    it('should validate valid post data successfully', () => {
      const validPostData: WordPressPostData = {
        title: 'Valid Post Title',
        content: 'This is valid content for the post.',
        excerpt: 'Valid excerpt',
        status: 'draft',
        author: 1,
        slug: 'valid-post-slug'
      };

      const result = validationService.validateAndSanitizePostData(validPostData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.sanitizedData).toBeDefined();
      expect(result.sanitizedData?.title).toBe('Valid Post Title');
    });

    it('should reject post data with missing required fields', () => {
      const invalidPostData = {
        content: 'Content without title',
        excerpt: 'Valid excerpt'
      } as WordPressPostData;

      const result = validationService.validateAndSanitizePostData(invalidPostData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title: Title is required and must be a string');
      expect(result.sanitizedData).toBeUndefined();
    });

    it('should reject post data with empty title', () => {
      const invalidPostData: WordPressPostData = {
        title: '',
        content: 'Valid content'
      };

      const result = validationService.validateAndSanitizePostData(invalidPostData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title: Title cannot be empty');
    });

    it('should reject post data with empty content', () => {
      const invalidPostData: WordPressPostData = {
        title: 'Valid Title',
        content: ''
      };

      const result = validationService.validateAndSanitizePostData(invalidPostData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Content: Content cannot be empty');
    });

    it('should reject post data with title exceeding maximum length', () => {
      const longTitle = 'A'.repeat(201);
      const invalidPostData: WordPressPostData = {
        title: longTitle,
        content: 'Valid content'
      };

      const result = validationService.validateAndSanitizePostData(invalidPostData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title: Title cannot exceed 200 characters');
    });

    it('should reject post data with content exceeding maximum length', () => {
      const longContent = 'A'.repeat(50001);
      const invalidPostData: WordPressPostData = {
        title: 'Valid Title',
        content: longContent
      };

      const result = validationService.validateAndSanitizePostData(invalidPostData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Content: Content cannot exceed 50000 characters');
    });

    it('should reject post data with excerpt exceeding maximum length', () => {
      const longExcerpt = 'A'.repeat(161);
      const invalidPostData: WordPressPostData = {
        title: 'Valid Title',
        content: 'Valid content',
        excerpt: longExcerpt
      };

      const result = validationService.validateAndSanitizePostData(invalidPostData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Excerpt: Excerpt cannot exceed 160 characters');
    });

    it('should reject post data with invalid slug format', () => {
      const invalidPostData: WordPressPostData = {
        title: 'Valid Title',
        content: 'Valid content',
        slug: 'invalid slug with spaces'
      };

      const result = validationService.validateAndSanitizePostData(invalidPostData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Slug: Slug can only contain lowercase letters, numbers, and hyphens');
    });

    it('should reject post data with invalid author ID', () => {
      const invalidPostData: WordPressPostData = {
        title: 'Valid Title',
        content: 'Valid content',
        author: 0
      };

      const result = validationService.validateAndSanitizePostData(invalidPostData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Author: Author ID must be between 1 and 999999');
    });

    it('should reject post data with invalid status', () => {
      const invalidPostData: WordPressPostData = {
        title: 'Valid Title',
        content: 'Valid content',
        status: 'invalid-status' as any
      };

      const result = validationService.validateAndSanitizePostData(invalidPostData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Status: Status must be one of: draft, publish, private, pending');
    });

    it('should detect malicious content in title', () => {
      const maliciousPostData: WordPressPostData = {
        title: '<script>alert("xss")</script>',
        content: 'Valid content'
      };

      const result = validationService.validateAndSanitizePostData(maliciousPostData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title: Title contains potentially malicious content: xssScript');
    });

    it('should detect malicious content in content', () => {
      const maliciousPostData: WordPressPostData = {
        title: 'Valid Title',
        content: 'javascript:alert("xss")'
      };

      const result = validationService.validateAndSanitizePostData(maliciousPostData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Content: Content contains potentially malicious content: xssJavaScript');
    });

    it('should sanitize HTML in title when not allowed', () => {
      const postData: WordPressPostData = {
        title: '<strong>Bold Title</strong>',
        content: 'Valid content'
      };

      const result = validationService.validateAndSanitizePostData(postData);

      expect(result.valid).toBe(true);
      expect(result.sanitizedData?.title).toBe('&lt;strong&gt;Bold Title&lt;/strong&gt;');
    });

    it('should normalize whitespace in title', () => {
      const postData: WordPressPostData = {
        title: '  Title   with   extra   spaces  ',
        content: 'Valid content'
      };

      const result = validationService.validateAndSanitizePostData(postData);

      expect(result.valid).toBe(true);
      expect(result.sanitizedData?.title).toBe('Title with extra spaces');
      expect(result.warnings).toContain('Title: Title whitespace has been normalized');
    });

    it('should sanitize HTML in content with allowlist', () => {
      const postData: WordPressPostData = {
        title: 'Valid Title',
        content: '<p>Valid paragraph</p><script>alert("xss")</script>'
      };

      const result = validationService.validateAndSanitizePostData(postData);

      expect(result.valid).toBe(true);
      expect(result.sanitizedData?.content).toContain('<p>Valid paragraph</p>');
      expect(result.sanitizedData?.content).not.toContain('<script>');
    });

    it('should warn about excessive line breaks in content', () => {
      const contentWithManyBreaks = 'Line 1\n\n\n\n\nLine 2\n\n\n\n\nLine 3';
      const postData: WordPressPostData = {
        title: 'Valid Title',
        content: contentWithManyBreaks
      };

      const result = validationService.validateAndSanitizePostData(postData);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Content: Content contains many line breaks which may affect formatting');
    });

    it('should handle empty excerpt gracefully', () => {
      const postData: WordPressPostData = {
        title: 'Valid Title',
        content: 'Valid content',
        excerpt: ''
      };

      const result = validationService.validateAndSanitizePostData(postData);

      expect(result.valid).toBe(true);
      expect(result.sanitizedData?.excerpt).toBe('');
    });

    it('should validate slug with consecutive hyphens', () => {
      const postData: WordPressPostData = {
        title: 'Valid Title',
        content: 'Valid content',
        slug: 'slug--with--consecutive--hyphens'
      };

      const result = validationService.validateAndSanitizePostData(postData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Slug: Slug cannot contain consecutive hyphens');
    });

    it('should validate slug with leading/trailing hyphens', () => {
      const postData: WordPressPostData = {
        title: 'Valid Title',
        content: 'Valid content',
        slug: '-slug-with-leading-hyphen-'
      };

      const result = validationService.validateAndSanitizePostData(postData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Slug: Slug cannot start or end with a hyphen');
    });

    it('should handle multiple validation errors', () => {
      const invalidPostData: WordPressPostData = {
        title: '',
        content: '',
        author: 0,
        status: 'invalid' as any
      };

      const result = validationService.validateAndSanitizePostData(invalidPostData);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(4);
      expect(result.errors).toContain('Title: Title cannot be empty');
      expect(result.errors).toContain('Content: Content cannot be empty');
      expect(result.errors).toContain('Author: Author ID must be between 1 and 999999');
      expect(result.errors).toContain('Status: Status must be one of: draft, publish, private, pending');
    });
  });

  describe('generateSlugFromTitle', () => {
    it('should generate valid slug from title', () => {
      const title = 'This is a Test Title with Special Characters!@#';
      const slug = validationService.generateSlugFromTitle(title);

      expect(slug).toBe('this-is-a-test-title-with-special-characters');
    });

    it('should handle empty title', () => {
      const slug = validationService.generateSlugFromTitle('');

      expect(slug).toBe('');
    });

    it('should handle title with multiple spaces', () => {
      const title = '  Multiple    Spaces   ';
      const slug = validationService.generateSlugFromTitle(title);

      expect(slug).toBe('multiple-spaces');
    });

    it('should handle title with special characters', () => {
      const title = 'Title with émojis 🎉 and symbols &*()';
      const slug = validationService.generateSlugFromTitle(title);

      expect(slug).toBe('title-with-mojis-and-symbols');
    });
  });

  describe('generateExcerptFromContent', () => {
    it('should generate excerpt from content', () => {
      const content = 'This is a long content that should be truncated to create an excerpt. It contains multiple sentences and should be cut off at a reasonable length.';
      const excerpt = validationService.generateExcerptFromContent(content, 50);

      expect(excerpt.length).toBeLessThanOrEqual(53); // 50 + '...'
      expect(excerpt).toContain('...');
    });

    it('should handle content shorter than max length', () => {
      const content = 'Short content';
      const excerpt = validationService.generateExcerptFromContent(content, 50);

      expect(excerpt).toBe('Short content');
      expect(excerpt).not.toContain('...');
    });

    it('should remove HTML tags from content', () => {
      const content = '<p>This is <strong>bold</strong> content with <a href="#">links</a>.</p>';
      const excerpt = validationService.generateExcerptFromContent(content, 50);

      expect(excerpt).toBe('This is bold content with links.');
    });

    it('should handle empty content', () => {
      const excerpt = validationService.generateExcerptFromContent('', 50);

      expect(excerpt).toBe('');
    });

    it('should truncate at word boundary when possible', () => {
      const content = 'This is a very long sentence that should be truncated at a word boundary rather than in the middle of a word.';
      const excerpt = validationService.generateExcerptFromContent(content, 30);

      expect(excerpt).toContain('...');
      expect(excerpt).not.toMatch(/\s\w*\.\.\.$/); // Should not end with partial word
    });
  });

  describe('custom configuration', () => {
    it('should use custom configuration', () => {
      const customConfig = {
        maxTitleLength: 100,
        maxContentLength: 1000,
        allowHtmlInTitle: true
      };

      const customService = createWordPressValidationService(customConfig);

      // Test with title that would be valid with custom config but invalid with default
      const postData: WordPressPostData = {
        title: 'A'.repeat(150), // Would be invalid with default (200), but we're testing custom config
        content: 'Valid content'
      };

      const result = customService.validateAndSanitizePostData(postData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title: Title cannot exceed 100 characters');
    });

    it('should allow HTML in title when configured', () => {
      const customConfig = {
        allowHtmlInTitle: true
      };

      const customService = createWordPressValidationService(customConfig);

      const postData: WordPressPostData = {
        title: '<strong>Bold Title</strong>',
        content: 'Valid content'
      };

      const result = customService.validateAndSanitizePostData(postData);

      expect(result.valid).toBe(true);
      expect(result.sanitizedData?.title).toBe('<strong>Bold Title</strong>');
    });

    it('should disable malicious content detection when configured', () => {
      const customConfig = {
        enableMaliciousContentDetection: false
      };

      const customService = createWordPressValidationService(customConfig);

      const postData: WordPressPostData = {
        title: '<script>alert("xss")</script>',
        content: 'Valid content'
      };

      const result = customService.validateAndSanitizePostData(postData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle validation service errors gracefully', () => {
      // Mock a scenario where validation service throws an error
      const mockService = new WordPressValidationService();
      jest.spyOn(mockService as any, 'validateAndSanitizeTitle').mockImplementation(() => {
        throw new Error('Mock validation error');
      });

      const postData: WordPressPostData = {
        title: 'Valid Title',
        content: 'Valid content'
      };

      const result = mockService.validateAndSanitizePostData(postData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Validation service error: Mock validation error');
    });
  });
}); 
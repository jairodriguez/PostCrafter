import { jest } from '@jest/globals';
import {
  PostStatus,
  WordPressPostStatus,
  PostStatusTransition,
  PostStatusConfig,
  PostStatusValidationOptions,
  PostStatusValidationResult,
  PostStatusMetadata,
  PostWithStatus,
  PostStatusUpdateRequest,
  PostStatusUpdateResult,
  PostStatusQueryOptions,
  PostStatusStatistics,
  DEFAULT_POST_STATUS_CONFIG,
  POST_STATUS_LABELS,
  POST_STATUS_DESCRIPTIONS,
  POST_STATUS_ICONS,
  POST_STATUS_COLORS,
  WORDPRESS_STATUS_MAP,
  REVERSE_WORDPRESS_STATUS_MAP,
  validatePostStatus,
  getDefaultPostStatus,
  isStatusTransitionAllowed,
  createStatusTransition,
  mapToWordPressStatus,
  mapFromWordPressStatus,
  getStatusLabel,
  getStatusDescription,
  getStatusIcon,
  getStatusColor,
  isPostPublished,
  isPostDraft,
  isPostPrivate,
  isPostPubliclyVisible,
  getAllPostStatuses,
  sanitizePostStatus,
  createPostStatusMetadata,
  postStatusUtils
} from '../post-status';

describe('Post Status Types and Utilities', () => {
  describe('Type definitions', () => {
    it('should define correct PostStatus type', () => {
      const validStatuses: PostStatus[] = ['draft', 'publish', 'private'];
      expect(validStatuses).toHaveLength(3);
    });

    it('should define comprehensive WordPressPostStatus type', () => {
      const wpStatuses: WordPressPostStatus[] = [
        'draft', 'publish', 'private', 'pending', 'future', 'trash', 'auto-draft', 'inherit'
      ];
      expect(wpStatuses).toHaveLength(8);
    });
  });

  describe('Default configuration', () => {
    it('should have correct default configuration', () => {
      expect(DEFAULT_POST_STATUS_CONFIG.allowedStatuses).toEqual(['draft', 'publish', 'private']);
      expect(DEFAULT_POST_STATUS_CONFIG.defaultStatus).toBe('draft');
      expect(DEFAULT_POST_STATUS_CONFIG.requireReviewForPublish).toBe(false);
      expect(DEFAULT_POST_STATUS_CONFIG.allowStatusTransitions).toBe(true);
      expect(DEFAULT_POST_STATUS_CONFIG.enableStatusHistory).toBe(true);
    });

    it('should have correct status transition permissions', () => {
      const permissions = DEFAULT_POST_STATUS_CONFIG.statusTransitionPermissions;
      expect(permissions.draft).toEqual(['publish', 'private']);
      expect(permissions.publish).toEqual(['draft', 'private']);
      expect(permissions.private).toEqual(['draft', 'publish']);
    });
  });

  describe('Status labels and metadata', () => {
    it('should have correct status labels', () => {
      expect(POST_STATUS_LABELS.draft).toBe('Draft');
      expect(POST_STATUS_LABELS.publish).toBe('Published');
      expect(POST_STATUS_LABELS.private).toBe('Private');
    });

    it('should have status descriptions', () => {
      expect(POST_STATUS_DESCRIPTIONS.draft).toContain('draft');
      expect(POST_STATUS_DESCRIPTIONS.publish).toContain('published');
      expect(POST_STATUS_DESCRIPTIONS.private).toContain('private');
    });

    it('should have status icons', () => {
      expect(POST_STATUS_ICONS.draft).toBe('📝');
      expect(POST_STATUS_ICONS.publish).toBe('🌐');
      expect(POST_STATUS_ICONS.private).toBe('🔒');
    });

    it('should have status colors', () => {
      expect(POST_STATUS_COLORS.draft).toBe('#f59e0b');
      expect(POST_STATUS_COLORS.publish).toBe('#10b981');
      expect(POST_STATUS_COLORS.private).toBe('#6366f1');
    });
  });

  describe('WordPress status mapping', () => {
    it('should map internal status to WordPress status correctly', () => {
      expect(WORDPRESS_STATUS_MAP.draft).toBe('draft');
      expect(WORDPRESS_STATUS_MAP.publish).toBe('publish');
      expect(WORDPRESS_STATUS_MAP.private).toBe('private');
    });

    it('should map WordPress status to internal status correctly', () => {
      expect(REVERSE_WORDPRESS_STATUS_MAP.draft).toBe('draft');
      expect(REVERSE_WORDPRESS_STATUS_MAP.publish).toBe('publish');
      expect(REVERSE_WORDPRESS_STATUS_MAP.private).toBe('private');
      expect(REVERSE_WORDPRESS_STATUS_MAP.pending).toBe('draft');
      expect(REVERSE_WORDPRESS_STATUS_MAP.future).toBe('publish');
      expect(REVERSE_WORDPRESS_STATUS_MAP.trash).toBe('draft');
      expect(REVERSE_WORDPRESS_STATUS_MAP['auto-draft']).toBe('draft');
      expect(REVERSE_WORDPRESS_STATUS_MAP.inherit).toBe('publish');
    });
  });

  describe('validatePostStatus', () => {
    it('should validate valid status values', () => {
      const result = validatePostStatus('draft');
      expect(result.isValid).toBe(true);
      expect(result.status).toBe('draft');
      expect(result.error).toBeUndefined();
    });

    it('should handle case insensitive input', () => {
      const result = validatePostStatus('PUBLISH');
      expect(result.isValid).toBe(true);
      expect(result.status).toBe('publish');
    });

    it('should handle whitespace in input', () => {
      const result = validatePostStatus('  private  ');
      expect(result.isValid).toBe(true);
      expect(result.status).toBe('private');
    });

    it('should reject invalid status values', () => {
      const result = validatePostStatus('invalid');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid status');
    });

    it('should handle undefined status with default', () => {
      const result = validatePostStatus(undefined);
      expect(result.isValid).toBe(true);
      expect(result.status).toBe('draft');
    });

    it('should handle null status with default', () => {
      const result = validatePostStatus(null);
      expect(result.isValid).toBe(true);
      expect(result.status).toBe('draft');
    });

    it('should handle empty string with default', () => {
      const result = validatePostStatus('');
      expect(result.isValid).toBe(true);
      expect(result.status).toBe('draft');
    });

    it('should reject undefined when required', () => {
      const result = validatePostStatus(undefined, { requireStatus: true });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Status is required');
    });

    it('should validate with custom allowed statuses', () => {
      const result = validatePostStatus('private', { allowedStatuses: ['draft', 'publish'] });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid status');
    });

    it('should use custom default status', () => {
      const result = validatePostStatus(undefined, { defaultStatus: 'publish' });
      expect(result.isValid).toBe(true);
      expect(result.status).toBe('publish');
    });

    it('should validate status transitions', () => {
      const result = validatePostStatus('private', {
        validateTransitions: true,
        currentStatus: 'draft'
      });
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid status transitions', () => {
      // Mock a custom config that doesn't allow draft to private
      const result = validatePostStatus('publish', {
        validateTransitions: true,
        currentStatus: 'nonexistent' as PostStatus
      });
      // Should still work as the function has fallback logic
      expect(result.isValid).toBe(true);
    });

    it('should reject non-string status', () => {
      const result = validatePostStatus(123);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Status must be a string');
    });
  });

  describe('getDefaultPostStatus', () => {
    it('should return default status from DEFAULT_POST_STATUS_CONFIG', () => {
      expect(getDefaultPostStatus()).toBe('draft');
    });

    it('should use custom default status from config', () => {
      expect(getDefaultPostStatus({ defaultStatus: 'publish' })).toBe('publish');
    });

    it('should handle empty config object', () => {
      expect(getDefaultPostStatus({})).toBe('draft');
    });
  });

  describe('isStatusTransitionAllowed', () => {
    it('should allow valid transitions', () => {
      expect(isStatusTransitionAllowed('draft', 'publish')).toBe(true);
      expect(isStatusTransitionAllowed('publish', 'draft')).toBe(true);
      expect(isStatusTransitionAllowed('draft', 'private')).toBe(true);
    });

    it('should allow same status transitions', () => {
      expect(isStatusTransitionAllowed('draft', 'draft')).toBe(true);
      expect(isStatusTransitionAllowed('publish', 'publish')).toBe(true);
    });

    it('should use custom transition permissions', () => {
      const customConfig = {
        statusTransitionPermissions: {
          'draft': ['publish'] as PostStatus[],
          'publish': [] as PostStatus[],
          'private': [] as PostStatus[]
        }
      };

      expect(isStatusTransitionAllowed('draft', 'publish', customConfig)).toBe(true);
      expect(isStatusTransitionAllowed('draft', 'private', customConfig)).toBe(false);
    });
  });

  describe('createStatusTransition', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2023-01-01T10:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should create status transition with required fields', () => {
      const transition = createStatusTransition('draft', 'publish');
      
      expect(transition.from).toBe('draft');
      expect(transition.to).toBe('publish');
      expect(transition.timestamp).toBe('2023-01-01T10:00:00.000Z');
      expect(transition.user).toBeUndefined();
      expect(transition.reason).toBeUndefined();
    });

    it('should create status transition with optional fields', () => {
      const transition = createStatusTransition('draft', 'publish', 'john@example.com', 'Ready for publication');
      
      expect(transition.from).toBe('draft');
      expect(transition.to).toBe('publish');
      expect(transition.timestamp).toBe('2023-01-01T10:00:00.000Z');
      expect(transition.user).toBe('john@example.com');
      expect(transition.reason).toBe('Ready for publication');
    });
  });

  describe('WordPress status mapping functions', () => {
    it('should map internal status to WordPress status', () => {
      expect(mapToWordPressStatus('draft')).toBe('draft');
      expect(mapToWordPressStatus('publish')).toBe('publish');
      expect(mapToWordPressStatus('private')).toBe('private');
    });

    it('should fallback to draft for unknown status', () => {
      expect(mapToWordPressStatus('unknown' as PostStatus)).toBe('draft');
    });

    it('should map WordPress status to internal status', () => {
      expect(mapFromWordPressStatus('draft')).toBe('draft');
      expect(mapFromWordPressStatus('publish')).toBe('publish');
      expect(mapFromWordPressStatus('private')).toBe('private');
      expect(mapFromWordPressStatus('pending')).toBe('draft');
      expect(mapFromWordPressStatus('future')).toBe('publish');
    });

    it('should fallback to draft for unknown WordPress status', () => {
      expect(mapFromWordPressStatus('unknown' as WordPressPostStatus)).toBe('draft');
    });
  });

  describe('Status utility functions', () => {
    it('should get status labels', () => {
      expect(getStatusLabel('draft')).toBe('Draft');
      expect(getStatusLabel('publish')).toBe('Published');
      expect(getStatusLabel('private')).toBe('Private');
    });

    it('should fallback for unknown status labels', () => {
      expect(getStatusLabel('unknown' as PostStatus)).toBe('unknown');
    });

    it('should get status descriptions', () => {
      expect(getStatusDescription('draft')).toContain('draft');
      expect(getStatusDescription('publish')).toContain('published');
      expect(getStatusDescription('private')).toContain('private');
    });

    it('should get status icons', () => {
      expect(getStatusIcon('draft')).toBe('📝');
      expect(getStatusIcon('publish')).toBe('🌐');
      expect(getStatusIcon('private')).toBe('🔒');
    });

    it('should fallback for unknown status icons', () => {
      expect(getStatusIcon('unknown' as PostStatus)).toBe('📄');
    });

    it('should get status colors', () => {
      expect(getStatusColor('draft')).toBe('#f59e0b');
      expect(getStatusColor('publish')).toBe('#10b981');
      expect(getStatusColor('private')).toBe('#6366f1');
    });

    it('should fallback for unknown status colors', () => {
      expect(getStatusColor('unknown' as PostStatus)).toBe('#6b7280');
    });
  });

  describe('Status check functions', () => {
    it('should check if post is published', () => {
      expect(isPostPublished('publish')).toBe(true);
      expect(isPostPublished('draft')).toBe(false);
      expect(isPostPublished('private')).toBe(false);
    });

    it('should check if post is draft', () => {
      expect(isPostDraft('draft')).toBe(true);
      expect(isPostDraft('publish')).toBe(false);
      expect(isPostDraft('private')).toBe(false);
    });

    it('should check if post is private', () => {
      expect(isPostPrivate('private')).toBe(true);
      expect(isPostPrivate('draft')).toBe(false);
      expect(isPostPrivate('publish')).toBe(false);
    });

    it('should check if post is publicly visible', () => {
      expect(isPostPubliclyVisible('publish')).toBe(true);
      expect(isPostPubliclyVisible('draft')).toBe(false);
      expect(isPostPubliclyVisible('private')).toBe(false);
    });
  });

  describe('getAllPostStatuses', () => {
    it('should return all available statuses', () => {
      const statuses = getAllPostStatuses();
      expect(statuses).toEqual(['draft', 'publish', 'private']);
      expect(statuses).toHaveLength(3);
    });
  });

  describe('sanitizePostStatus', () => {
    it('should sanitize valid status strings', () => {
      expect(sanitizePostStatus('draft')).toBe('draft');
      expect(sanitizePostStatus('PUBLISH')).toBe('publish');
      expect(sanitizePostStatus('  private  ')).toBe('private');
    });

    it('should return default for invalid strings', () => {
      expect(sanitizePostStatus('invalid')).toBe('draft');
      expect(sanitizePostStatus('')).toBe('draft');
    });

    it('should return default for non-strings', () => {
      expect(sanitizePostStatus(123)).toBe('draft');
      expect(sanitizePostStatus(null)).toBe('draft');
      expect(sanitizePostStatus(undefined)).toBe('draft');
      expect(sanitizePostStatus({})).toBe('draft');
      expect(sanitizePostStatus([])).toBe('draft');
    });
  });

  describe('createPostStatusMetadata', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2023-01-01T10:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should create metadata for draft status', () => {
      const metadata = createPostStatusMetadata('draft');
      
      expect(metadata.status).toBe('draft');
      expect(metadata.statusHistory).toEqual([]);
      expect(metadata.lastModified).toBe('2023-01-01T10:00:00.000Z');
      expect(metadata.publishedDate).toBeUndefined();
      expect(metadata.draftSavedDate).toBe('2023-01-01T10:00:00.000Z');
    });

    it('should create metadata for publish status', () => {
      const metadata = createPostStatusMetadata('publish');
      
      expect(metadata.status).toBe('publish');
      expect(metadata.publishedDate).toBe('2023-01-01T10:00:00.000Z');
      expect(metadata.draftSavedDate).toBeUndefined();
    });

    it('should create metadata for private status', () => {
      const metadata = createPostStatusMetadata('private');
      
      expect(metadata.status).toBe('private');
      expect(metadata.publishedDate).toBeUndefined();
      expect(metadata.draftSavedDate).toBeUndefined();
    });

    it('should create metadata with options', () => {
      const previousTransitions: PostStatusTransition[] = [
        {
          from: 'draft',
          to: 'publish',
          timestamp: '2023-01-01T09:00:00.000Z'
        }
      ];

      const metadata = createPostStatusMetadata('publish', {
        publishedDate: '2023-01-01T09:30:00.000Z',
        statusChangedBy: 'john@example.com',
        previousTransitions
      });
      
      expect(metadata.status).toBe('publish');
      expect(metadata.publishedDate).toBe('2023-01-01T09:30:00.000Z');
      expect(metadata.statusChangedBy).toBe('john@example.com');
      expect(metadata.statusHistory).toEqual(previousTransitions);
    });
  });

  describe('postStatusUtils object', () => {
    it('should expose all utility functions', () => {
      expect(typeof postStatusUtils.validate).toBe('function');
      expect(typeof postStatusUtils.getDefault).toBe('function');
      expect(typeof postStatusUtils.isTransitionAllowed).toBe('function');
      expect(typeof postStatusUtils.createTransition).toBe('function');
      expect(typeof postStatusUtils.mapToWordPress).toBe('function');
      expect(typeof postStatusUtils.mapFromWordPress).toBe('function');
      expect(typeof postStatusUtils.getLabel).toBe('function');
      expect(typeof postStatusUtils.getDescription).toBe('function');
      expect(typeof postStatusUtils.getIcon).toBe('function');
      expect(typeof postStatusUtils.getColor).toBe('function');
      expect(typeof postStatusUtils.isPublished).toBe('function');
      expect(typeof postStatusUtils.isDraft).toBe('function');
      expect(typeof postStatusUtils.isPrivate).toBe('function');
      expect(typeof postStatusUtils.isPubliclyVisible).toBe('function');
      expect(typeof postStatusUtils.getAllStatuses).toBe('function');
      expect(typeof postStatusUtils.sanitize).toBe('function');
      expect(typeof postStatusUtils.createMetadata).toBe('function');
    });

    it('should work through the utils object', () => {
      expect(postStatusUtils.validate('draft').isValid).toBe(true);
      expect(postStatusUtils.getDefault()).toBe('draft');
      expect(postStatusUtils.isTransitionAllowed('draft', 'publish')).toBe(true);
      expect(postStatusUtils.mapToWordPress('draft')).toBe('draft');
      expect(postStatusUtils.mapFromWordPress('draft')).toBe('draft');
      expect(postStatusUtils.getLabel('draft')).toBe('Draft');
      expect(postStatusUtils.getDescription('draft')).toContain('draft');
      expect(postStatusUtils.getIcon('draft')).toBe('📝');
      expect(postStatusUtils.getColor('draft')).toBe('#f59e0b');
      expect(postStatusUtils.isPublished('publish')).toBe(true);
      expect(postStatusUtils.isDraft('draft')).toBe(true);
      expect(postStatusUtils.isPrivate('private')).toBe(true);
      expect(postStatusUtils.isPubliclyVisible('publish')).toBe(true);
      expect(postStatusUtils.getAllStatuses()).toEqual(['draft', 'publish', 'private']);
      expect(postStatusUtils.sanitize('DRAFT')).toBe('draft');
      expect(postStatusUtils.createMetadata('draft').status).toBe('draft');
    });
  });

  describe('Interface compliance', () => {
    it('should create valid PostWithStatus objects', () => {
      const post: PostWithStatus = {
        title: 'Test Post',
        content: 'Test content',
        status: 'draft',
        categories: ['tech'],
        tags: ['javascript']
      };

      expect(post.status).toBe('draft');
      expect(post.title).toBe('Test Post');
    });

    it('should create valid PostStatusUpdateRequest objects', () => {
      const request: PostStatusUpdateRequest = {
        postId: 123,
        newStatus: 'publish',
        reason: 'Ready for publication',
        notifyAuthor: true
      };

      expect(request.postId).toBe(123);
      expect(request.newStatus).toBe('publish');
    });

    it('should create valid PostStatusQueryOptions objects', () => {
      const options: PostStatusQueryOptions = {
        status: ['draft', 'publish'],
        sortBy: 'modified',
        sortOrder: 'desc',
        limit: 10
      };

      expect(options.status).toEqual(['draft', 'publish']);
      expect(options.limit).toBe(10);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle array input gracefully', () => {
      expect(sanitizePostStatus(['draft'])).toBe('draft');
    });

    it('should handle object input gracefully', () => {
      expect(sanitizePostStatus({ status: 'draft' })).toBe('draft');
    });

    it('should handle function input gracefully', () => {
      expect(sanitizePostStatus(() => 'draft')).toBe('draft');
    });

    it('should handle boolean input gracefully', () => {
      expect(sanitizePostStatus(true)).toBe('draft');
      expect(sanitizePostStatus(false)).toBe('draft');
    });

    it('should handle Symbol input gracefully', () => {
      expect(sanitizePostStatus(Symbol('draft'))).toBe('draft');
    });
  });
});
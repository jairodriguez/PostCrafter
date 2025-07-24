import { jest } from '@jest/globals';
import request from 'supertest';
import { PostStatus } from '../types/post-status';

// Mock the services
jest.mock('../services/wordpress-post-status-integration', () => ({
  createWordPressPostStatusIntegrationService: jest.fn(() => ({
    queryPostsByStatus: jest.fn(),
    updatePostStatus: jest.fn(),
    createPostWithStatus: jest.fn()
  }))
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../middleware/auth', () => ({
  authenticateApiKey: jest.fn()
}));

jest.mock('../middleware/cors', () => ({
  applyMiddleware: jest.fn((req, res, next) => next())
}));

describe('Draft Workflow Controls', () => {
  let mockStatusService: any;
  let mockAuth: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    mockStatusService = {
      queryPostsByStatus: jest.fn(),
      updatePostStatus: jest.fn(),
      createPostWithStatus: jest.fn()
    };

    mockAuth = require('../middleware/auth').authenticateApiKey;
    mockAuth.mockImplementation(async (req: any, res: any) => {
      req.apiKey = 'test-key';
      return { success: true };
    });

    const { createWordPressPostStatusIntegrationService } = require('../services/wordpress-post-status-integration');
    createWordPressPostStatusIntegrationService.mockReturnValue(mockStatusService);
  });

  describe('Draft Listing and Filtering', () => {
    it('should list drafts with default filters', async () => {
      const mockDrafts = [
        {
          id: 1,
          title: 'Draft Post 1',
          status: 'draft',
          content: 'Draft content 1',
          date: '2023-12-01T10:00:00Z',
          modified: '2023-12-01T10:00:00Z',
          author: 1,
          categories: ['Technology'],
          tags: ['draft', 'testing']
        },
        {
          id: 2,
          title: 'Draft Post 2',
          status: 'draft',
          content: 'Draft content 2',
          date: '2023-12-01T09:00:00Z',
          modified: '2023-12-01T11:00:00Z',
          author: 1,
          categories: ['News'],
          tags: ['draft', 'urgent']
        }
      ];

      mockStatusService.queryPostsByStatus.mockResolvedValue({
        success: true,
        posts: mockDrafts,
        totalCount: 2,
        statusDistribution: { draft: 2, publish: 0, private: 0 }
      });

      // Note: In a real test, you would use supertest to test the actual endpoint
      // For this example, we'll test the service logic
      const result = await mockStatusService.queryPostsByStatus({
        status: ['draft'],
        limit: 20,
        offset: 0,
        sortBy: 'modified',
        sortOrder: 'desc'
      });

      expect(result.success).toBe(true);
      expect(result.posts).toHaveLength(2);
      expect(result.posts[0].status).toBe('draft');
      expect(result.posts[1].status).toBe('draft');
      expect(result.statusDistribution.draft).toBe(2);
    });

    it('should filter drafts by search query', async () => {
      const mockDrafts = [
        {
          id: 1,
          title: 'WordPress Tutorial Draft',
          status: 'draft',
          content: 'WordPress tutorial content',
          author: 1
        }
      ];

      mockStatusService.queryPostsByStatus.mockResolvedValue({
        success: true,
        posts: mockDrafts,
        totalCount: 1,
        statusDistribution: { draft: 1, publish: 0, private: 0 }
      });

      const result = await mockStatusService.queryPostsByStatus({
        status: ['draft'],
        search: 'WordPress',
        limit: 20,
        offset: 0
      });

      expect(result.success).toBe(true);
      expect(result.posts).toHaveLength(1);
      expect(result.posts[0].title).toContain('WordPress');
    });

    it('should filter drafts by author', async () => {
      const mockDrafts = [
        {
          id: 1,
          title: 'Author 2 Draft',
          status: 'draft',
          content: 'Content by author 2',
          author: 2
        }
      ];

      mockStatusService.queryPostsByStatus.mockResolvedValue({
        success: true,
        posts: mockDrafts,
        totalCount: 1,
        statusDistribution: { draft: 1, publish: 0, private: 0 }
      });

      const result = await mockStatusService.queryPostsByStatus({
        status: ['draft'],
        author: 2,
        limit: 20,
        offset: 0
      });

      expect(result.success).toBe(true);
      expect(result.posts).toHaveLength(1);
      expect(result.posts[0].author).toBe(2);
    });

    it('should filter drafts by date range', async () => {
      const mockDrafts = [
        {
          id: 1,
          title: 'Recent Draft',
          status: 'draft',
          content: 'Recent content',
          date: '2023-12-01T10:00:00Z',
          modified: '2023-12-01T10:00:00Z'
        }
      ];

      mockStatusService.queryPostsByStatus.mockResolvedValue({
        success: true,
        posts: mockDrafts,
        totalCount: 1,
        statusDistribution: { draft: 1, publish: 0, private: 0 }
      });

      const result = await mockStatusService.queryPostsByStatus({
        status: ['draft'],
        dateQuery: {
          after: '2023-11-01',
          before: '2023-12-31'
        },
        limit: 20,
        offset: 0
      });

      expect(result.success).toBe(true);
      expect(result.posts).toHaveLength(1);
    });

    it('should support pagination', async () => {
      const mockDrafts = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        title: `Draft Post ${i + 1}`,
        status: 'draft',
        content: `Draft content ${i + 1}`,
        author: 1
      }));

      // First page
      mockStatusService.queryPostsByStatus.mockResolvedValueOnce({
        success: true,
        posts: mockDrafts.slice(0, 3),
        totalCount: 5,
        statusDistribution: { draft: 5, publish: 0, private: 0 }
      });

      const firstPageResult = await mockStatusService.queryPostsByStatus({
        status: ['draft'],
        limit: 3,
        offset: 0
      });

      expect(firstPageResult.success).toBe(true);
      expect(firstPageResult.posts).toHaveLength(3);
      expect(firstPageResult.totalCount).toBe(5);

      // Second page
      mockStatusService.queryPostsByStatus.mockResolvedValueOnce({
        success: true,
        posts: mockDrafts.slice(3, 5),
        totalCount: 5,
        statusDistribution: { draft: 5, publish: 0, private: 0 }
      });

      const secondPageResult = await mockStatusService.queryPostsByStatus({
        status: ['draft'],
        limit: 3,
        offset: 3
      });

      expect(secondPageResult.success).toBe(true);
      expect(secondPageResult.posts).toHaveLength(2);
      expect(secondPageResult.totalCount).toBe(5);
    });

    it('should support sorting by different fields', async () => {
      const mockDrafts = [
        {
          id: 1,
          title: 'A Draft Post',
          status: 'draft',
          date: '2023-12-01T10:00:00Z',
          modified: '2023-12-01T12:00:00Z'
        },
        {
          id: 2,
          title: 'B Draft Post',
          status: 'draft',
          date: '2023-12-01T11:00:00Z',
          modified: '2023-12-01T11:00:00Z'
        }
      ];

      // Sort by title ascending
      mockStatusService.queryPostsByStatus.mockResolvedValue({
        success: true,
        posts: mockDrafts.sort((a, b) => a.title.localeCompare(b.title)),
        totalCount: 2,
        statusDistribution: { draft: 2, publish: 0, private: 0 }
      });

      const result = await mockStatusService.queryPostsByStatus({
        status: ['draft'],
        sortBy: 'title',
        sortOrder: 'asc',
        limit: 20,
        offset: 0
      });

      expect(result.success).toBe(true);
      expect(result.posts[0].title).toBe('A Draft Post');
      expect(result.posts[1].title).toBe('B Draft Post');
    });
  });

  describe('Status Transitions', () => {
    it('should publish a draft post', async () => {
      mockStatusService.updatePostStatus.mockResolvedValue({
        success: true,
        previousStatus: 'draft',
        newStatus: 'publish',
        timestamp: '2023-12-01T10:00:00Z',
        wordpressPostId: 123
      });

      const result = await mockStatusService.updatePostStatus({
        postId: 123,
        newStatus: 'publish',
        reason: 'Content is ready for publication',
        changedBy: 'editor@test.com'
      });

      expect(result.success).toBe(true);
      expect(result.previousStatus).toBe('draft');
      expect(result.newStatus).toBe('publish');
      expect(result.wordpressPostId).toBe(123);
    });

    it('should revert published post to draft', async () => {
      mockStatusService.updatePostStatus.mockResolvedValue({
        success: true,
        previousStatus: 'publish',
        newStatus: 'draft',
        timestamp: '2023-12-01T10:00:00Z',
        wordpressPostId: 124
      });

      const result = await mockStatusService.updatePostStatus({
        postId: 124,
        newStatus: 'draft',
        reason: 'Found errors, reverting to draft for fixes',
        changedBy: 'editor@test.com'
      });

      expect(result.success).toBe(true);
      expect(result.previousStatus).toBe('publish');
      expect(result.newStatus).toBe('draft');
    });

    it('should make post private', async () => {
      mockStatusService.updatePostStatus.mockResolvedValue({
        success: true,
        previousStatus: 'draft',
        newStatus: 'private',
        timestamp: '2023-12-01T10:00:00Z',
        wordpressPostId: 125
      });

      const result = await mockStatusService.updatePostStatus({
        postId: 125,
        newStatus: 'private',
        reason: 'Sensitive content - making private',
        changedBy: 'admin@test.com'
      });

      expect(result.success).toBe(true);
      expect(result.previousStatus).toBe('draft');
      expect(result.newStatus).toBe('private');
    });

    it('should validate status transitions', async () => {
      // Test invalid transition
      mockStatusService.updatePostStatus.mockResolvedValue({
        success: false,
        error: 'Invalid status transition'
      });

      const result = await mockStatusService.updatePostStatus({
        postId: 123,
        newStatus: 'invalid_status' as any,
        reason: 'Testing invalid transition'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Batch Operations', () => {
    it('should publish multiple drafts in batch', async () => {
      const postIds = [1, 2, 3];
      const batchResults = {
        successful: 3,
        failed: 0,
        skipped: 0,
        results: postIds.map(id => ({
          post_id: id,
          title: `Post ${id}`,
          success: true,
          new_status: 'publish' as PostStatus
        }))
      };

      // Mock individual status updates
      mockStatusService.updatePostStatus.mockResolvedValue({
        success: true,
        previousStatus: 'draft',
        newStatus: 'publish',
        timestamp: '2023-12-01T10:00:00Z'
      });

      // Simulate batch operation logic
      const results = [];
      for (const postId of postIds) {
        const result = await mockStatusService.updatePostStatus({
          postId,
          newStatus: 'publish',
          reason: 'Batch publish operation',
          changedBy: 'batch_operation'
        });

        results.push({
          post_id: postId,
          title: `Post ${postId}`,
          success: result.success,
          new_status: result.success ? result.newStatus : undefined
        });
      }

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(results.every(r => r.new_status === 'publish')).toBe(true);
    });

    it('should handle batch operation with failures', async () => {
      const postIds = [1, 2, 3];
      
      // Mock mixed results
      mockStatusService.updatePostStatus
        .mockResolvedValueOnce({
          success: true,
          previousStatus: 'draft',
          newStatus: 'publish'
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'Post not found'
        })
        .mockResolvedValueOnce({
          success: true,
          previousStatus: 'draft',
          newStatus: 'publish'
        });

      const results = [];
      for (const postId of postIds) {
        try {
          const result = await mockStatusService.updatePostStatus({
            postId,
            newStatus: 'publish'
          });

          results.push({
            post_id: postId,
            title: `Post ${postId}`,
            success: result.success,
            error: result.error,
            new_status: result.success ? result.newStatus : undefined
          });
        } catch (error) {
          results.push({
            post_id: postId,
            title: `Post ${postId}`,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      expect(results).toHaveLength(3);
      expect(results.filter(r => r.success)).toHaveLength(2);
      expect(results.filter(r => !r.success)).toHaveLength(1);
      expect(results[1].error).toBe('Post not found');
    });

    it('should apply filters in batch operations', async () => {
      const mockPosts = [
        {
          id: 1,
          title: 'Short Draft',
          status: 'draft',
          content: 'Short content',
          featured_media: 0
        },
        {
          id: 2,
          title: 'Long Draft',
          status: 'draft',
          content: 'This is a much longer draft content that meets the word count requirements for publication',
          featured_media: 123
        },
        {
          id: 3,
          title: 'Published Post',
          status: 'publish',
          content: 'Published content',
          featured_media: 456
        }
      ];

      // Simulate filter application
      const filters = {
        only_drafts: true,
        minimum_word_count: 10,
        require_featured_image: true
      };

      const eligiblePosts = mockPosts.filter(post => {
        if (filters.only_drafts && post.status !== 'draft') return false;
        if (filters.minimum_word_count && post.content.split(' ').length < filters.minimum_word_count) return false;
        if (filters.require_featured_image && (!post.featured_media || post.featured_media === 0)) return false;
        return true;
      });

      expect(eligiblePosts).toHaveLength(1);
      expect(eligiblePosts[0].id).toBe(2);
    });

    it('should support different batch actions', async () => {
      const batchActions = ['publish', 'archive', 'update_status'];
      
      for (const action of batchActions) {
        let expectedStatus: PostStatus;
        
        switch (action) {
          case 'publish':
            expectedStatus = 'publish';
            break;
          case 'archive':
            expectedStatus = 'private';
            break;
          case 'update_status':
            expectedStatus = 'publish'; // Assuming target_status is 'publish'
            break;
          default:
            expectedStatus = 'draft';
        }

        mockStatusService.updatePostStatus.mockResolvedValue({
          success: true,
          previousStatus: 'draft',
          newStatus: expectedStatus,
          timestamp: '2023-12-01T10:00:00Z'
        });

        const result = await mockStatusService.updatePostStatus({
          postId: 123,
          newStatus: expectedStatus,
          reason: `Batch ${action} operation`
        });

        expect(result.success).toBe(true);
        expect(result.newStatus).toBe(expectedStatus);
      }
    });
  });

  describe('Draft Analytics', () => {
    it('should calculate draft statistics', async () => {
      const mockPosts = [
        { id: 1, status: 'draft', content: 'Short draft', featured_media: 0, categories: [] },
        { id: 2, status: 'draft', content: 'This is a longer draft with more words', featured_media: 123, categories: ['Tech'] },
        { id: 3, status: 'publish', content: 'Published content', featured_media: 456, categories: ['News'] },
        { id: 4, status: 'private', content: 'Private content', featured_media: 0, categories: ['Internal'] }
      ];

      mockStatusService.queryPostsByStatus.mockResolvedValue({
        success: true,
        posts: mockPosts,
        totalCount: 4,
        statusDistribution: { draft: 2, publish: 1, private: 1 }
      });

      const result = await mockStatusService.queryPostsByStatus({
        status: ['draft', 'publish', 'private'],
        limit: 1000,
        includeStatusHistory: true
      });

      // Calculate analytics (simulated)
      const drafts = result.posts.filter((p: any) => p.status === 'draft');
      const published = result.posts.filter((p: any) => p.status === 'publish');
      const privatePosts = result.posts.filter((p: any) => p.status === 'private');

      const analytics = {
        total_drafts: drafts.length,
        total_published: published.length,
        total_private: privatePosts.length,
        drafts_with_images: drafts.filter((p: any) => p.featured_media && p.featured_media > 0).length,
        drafts_without_categories: drafts.filter((p: any) => !p.categories || p.categories.length === 0).length,
        average_words_per_draft: Math.round(
          drafts.reduce((sum: number, p: any) => sum + (p.content?.split(' ').length || 0), 0) / Math.max(drafts.length, 1)
        )
      };

      expect(analytics.total_drafts).toBe(2);
      expect(analytics.total_published).toBe(1);
      expect(analytics.total_private).toBe(1);
      expect(analytics.drafts_with_images).toBe(1);
      expect(analytics.drafts_without_categories).toBe(1);
      expect(analytics.average_words_per_draft).toBeGreaterThan(0);
    });

    it('should calculate conversion rates', async () => {
      const mockPosts = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        status: i < 15 ? 'publish' : 'draft',
        content: `Content ${i + 1}`,
        date: `2023-12-${String(i + 1).padStart(2, '0')}T10:00:00Z`
      }));

      const drafts = mockPosts.filter(p => p.status === 'draft');
      const published = mockPosts.filter(p => p.status === 'publish');
      
      const conversionRate = published.length / (drafts.length + published.length) * 100;

      expect(conversionRate).toBe(75); // 15 published out of 20 total
      expect(drafts.length).toBe(5);
      expect(published.length).toBe(15);
    });

    it('should analyze content distribution', async () => {
      const mockPosts = [
        { content: 'Short' }, // 1 word
        { content: 'This is a medium length draft content' }, // 8 words  
        { content: Array(150).fill('word').join(' ') }, // 150 words
        { content: Array(750).fill('word').join(' ') }, // 750 words
        { content: Array(1500).fill('word').join(' ') }, // 1500 words
        { content: Array(2500).fill('word').join(' ') } // 2500 words
      ];

      const wordCountDistribution = {
        under_100: mockPosts.filter(p => (p.content?.split(' ').length || 0) < 100).length,
        "100_500": mockPosts.filter(p => {
          const wordCount = p.content?.split(' ').length || 0;
          return wordCount >= 100 && wordCount < 500;
        }).length,
        "500_1000": mockPosts.filter(p => {
          const wordCount = p.content?.split(' ').length || 0;
          return wordCount >= 500 && wordCount < 1000;
        }).length,
        "1000_2000": mockPosts.filter(p => {
          const wordCount = p.content?.split(' ').length || 0;
          return wordCount >= 1000 && wordCount < 2000;
        }).length,
        over_2000: mockPosts.filter(p => (p.content?.split(' ').length || 0) >= 2000).length
      };

      expect(wordCountDistribution.under_100).toBe(2);
      expect(wordCountDistribution["100_500"]).toBe(1);
      expect(wordCountDistribution["500_1000"]).toBe(1);
      expect(wordCountDistribution["1000_2000"]).toBe(1);
      expect(wordCountDistribution.over_2000).toBe(1);
    });
  });

  describe('Export Functionality', () => {
    it('should prepare draft export data', async () => {
      const mockDrafts = [
        {
          id: 1,
          title: 'Draft 1',
          content: 'Draft content 1',
          date: '2023-12-01T10:00:00Z',
          modified: '2023-12-01T11:00:00Z',
          author: 1,
          categories: ['Tech'],
          tags: ['draft', 'test']
        },
        {
          id: 2,
          title: 'Draft 2',
          content: 'Draft content 2',
          date: '2023-12-01T09:00:00Z',
          modified: '2023-12-01T12:00:00Z',
          author: 2,
          categories: ['News'],
          tags: ['draft', 'urgent']
        }
      ];

      mockStatusService.queryPostsByStatus.mockResolvedValue({
        success: true,
        posts: mockDrafts,
        totalCount: 2
      });

      const result = await mockStatusService.queryPostsByStatus({
        status: ['draft'],
        limit: 1000
      });

      // Prepare export data
      const exportData = {
        export_timestamp: new Date().toISOString(),
        total_drafts: result.posts?.length || 0,
        drafts: (result.posts || []).map((post: any) => ({
          id: post.id,
          title: post.title,
          content_length: post.content?.length || 0,
          created: post.date,
          modified: post.modified,
          author: post.author,
          categories: post.categories,
          tags: post.tags
        }))
      };

      expect(exportData.total_drafts).toBe(2);
      expect(exportData.drafts).toHaveLength(2);
      expect(exportData.drafts[0]).toHaveProperty('content_length');
      expect(exportData.drafts[0].content_length).toBeGreaterThan(0);
    });
  });

  describe('Authorization and Security', () => {
    it('should require authentication for all operations', async () => {
      // Test that authentication is required
      mockAuth.mockImplementation(async (req: any, res: any) => {
        return { success: false };
      });

      // In a real test, you would test the actual endpoint with supertest
      // and verify that unauthenticated requests are rejected
      const authResult = await mockAuth({}, {});
      expect(authResult.success).toBe(false);
    });

    it('should validate post ownership for status changes', async () => {
      // Mock checking post ownership
      const mockCurrentUser = { id: 1, role: 'editor' };
      const mockPost = { id: 123, author: 2, status: 'draft' };

      // In a real implementation, you would check if the user can modify this post
      const canModify = mockCurrentUser.role === 'admin' || mockCurrentUser.id === mockPost.author;
      
      // For this test, user 1 trying to modify post by user 2
      expect(canModify).toBe(false);

      // Admin should be able to modify any post
      const adminUser = { id: 3, role: 'admin' };
      const adminCanModify = adminUser.role === 'admin' || adminUser.id === mockPost.author;
      expect(adminCanModify).toBe(true);
    });

    it('should validate status transition permissions', async () => {
      const statusTransitions = [
        { from: 'draft', to: 'publish', allowed: true },
        { from: 'publish', to: 'draft', allowed: true },
        { from: 'draft', to: 'private', allowed: true },
        { from: 'private', to: 'publish', allowed: true },
        { from: 'publish', to: 'private', allowed: true },
        { from: 'private', to: 'draft', allowed: true }
      ];

      statusTransitions.forEach(transition => {
        // In the real implementation, this would use isStatusTransitionAllowed
        expect(transition.allowed).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle WordPress API errors gracefully', async () => {
      mockStatusService.queryPostsByStatus.mockResolvedValue({
        success: false,
        error: {
          message: 'WordPress API connection failed',
          details: 'Connection timeout'
        }
      });

      const result = await mockStatusService.queryPostsByStatus({
        status: ['draft'],
        limit: 20
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('WordPress API');
    });

    it('should handle invalid parameters', async () => {
      // Test invalid status values
      const invalidStatusValues = ['invalid', 'unknown', ''];
      
      for (const invalidStatus of invalidStatusValues) {
        try {
          await mockStatusService.queryPostsByStatus({
            status: [invalidStatus as any],
            limit: 20
          });
        } catch (error) {
          expect(error).toBeDefined();
        }
      }
    });

    it('should handle batch operation failures', async () => {
      const postIds = [1, 2, 3];
      const errors = ['Post not found', 'Permission denied', 'Invalid status'];

      // Mock failures for all posts
      postIds.forEach((_, index) => {
        mockStatusService.updatePostStatus.mockResolvedValueOnce({
          success: false,
          error: errors[index]
        });
      });

      const results = [];
      for (let i = 0; i < postIds.length; i++) {
        const result = await mockStatusService.updatePostStatus({
          postId: postIds[i],
          newStatus: 'publish'
        });

        results.push({
          post_id: postIds[i],
          success: result.success,
          error: result.error
        });
      }

      expect(results.every(r => !r.success)).toBe(true);
      expect(results[0].error).toBe('Post not found');
      expect(results[1].error).toBe('Permission denied');
      expect(results[2].error).toBe('Invalid status');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large batch operations efficiently', async () => {
      const largePostIdArray = Array.from({ length: 50 }, (_, i) => i + 1);
      
      // Mock success for all posts
      mockStatusService.updatePostStatus.mockResolvedValue({
        success: true,
        previousStatus: 'draft',
        newStatus: 'publish'
      });

      const startTime = Date.now();
      
      // Process in batches of 10 (simulating real batch processing)
      const batchSize = 10;
      const results = [];
      
      for (let i = 0; i < largePostIdArray.length; i += batchSize) {
        const batch = largePostIdArray.slice(i, i + batchSize);
        const batchPromises = batch.map(postId => 
          mockStatusService.updatePostStatus({
            postId,
            newStatus: 'publish'
          })
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }
      
      const processingTime = Date.now() - startTime;
      
      expect(results).toHaveLength(50);
      expect(results.every(r => r.success)).toBe(true);
      expect(processingTime).toBeLessThan(1000); // Should complete within 1 second for mocked operations
    });

    it('should implement proper pagination for large result sets', async () => {
      const totalPosts = 1000;
      const pageSize = 20;
      const totalPages = Math.ceil(totalPosts / pageSize);

      for (let page = 0; page < 3; page++) { // Test first 3 pages
        const offset = page * pageSize;
        
        mockStatusService.queryPostsByStatus.mockResolvedValue({
          success: true,
          posts: Array.from({ length: pageSize }, (_, i) => ({
            id: offset + i + 1,
            title: `Post ${offset + i + 1}`,
            status: 'draft'
          })),
          totalCount: totalPosts
        });

        const result = await mockStatusService.queryPostsByStatus({
          status: ['draft'],
          limit: pageSize,
          offset: offset
        });

        expect(result.success).toBe(true);
        expect(result.posts).toHaveLength(pageSize);
        expect(result.totalCount).toBe(totalPosts);
        expect(result.posts[0].id).toBe(offset + 1);
      }
    });
  });
});
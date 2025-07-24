/**
 * Post Status Types and Utilities
 * Implements Task 11.1: Add status field to database schema and API models
 * Provides comprehensive post status management for draft/publish functionality
 */

/**
 * WordPress post status values
 */
export type WordPressPostStatus = 
  | 'draft'      // Post is saved as draft
  | 'publish'    // Post is published and visible
  | 'private'    // Post is published but only visible to logged-in users
  | 'pending'    // Post is pending review
  | 'future'     // Post is scheduled for future publishing
  | 'trash'      // Post is in trash
  | 'auto-draft' // Auto-saved draft
  | 'inherit';   // Attachment inherits status from parent post

/**
 * Internal post status values (simplified)
 */
export type PostStatus = 'draft' | 'publish' | 'private';

/**
 * Post status transition types
 */
export type PostStatusTransition = {
  from: PostStatus;
  to: PostStatus;
  timestamp: string;
  user?: string;
  reason?: string;
};

/**
 * Post status configuration
 */
export interface PostStatusConfig {
  allowedStatuses: PostStatus[];
  defaultStatus: PostStatus;
  requireReviewForPublish: boolean;
  allowStatusTransitions: boolean;
  enableStatusHistory: boolean;
  statusTransitionPermissions: Record<PostStatus, PostStatus[]>;
}

/**
 * Post status validation options
 */
export interface PostStatusValidationOptions {
  allowedStatuses?: PostStatus[];
  defaultStatus?: PostStatus;
  requireStatus?: boolean;
  validateTransitions?: boolean;
  currentStatus?: PostStatus;
}

/**
 * Post status validation result
 */
export interface PostStatusValidationResult {
  isValid: boolean;
  status?: PostStatus;
  error?: string;
  warnings?: string[];
}

/**
 * Post status metadata
 */
export interface PostStatusMetadata {
  status: PostStatus;
  statusHistory?: PostStatusTransition[];
  lastModified: string;
  publishedDate?: string;
  draftSavedDate?: string;
  autoSaveDate?: string;
  statusChangedBy?: string;
  scheduledPublishDate?: string;
}

/**
 * Post with status information
 */
export interface PostWithStatus {
  id?: number;
  title: string;
  content: string;
  excerpt?: string;
  status: PostStatus;
  statusMetadata?: PostStatusMetadata;
  slug?: string;
  author?: number;
  categories?: string[] | number[];
  tags?: string[] | number[];
  featured_media?: number;
  yoast_meta?: any;
}

/**
 * Post status update request
 */
export interface PostStatusUpdateRequest {
  postId: number;
  newStatus: PostStatus;
  reason?: string;
  scheduledDate?: string;
  notifyAuthor?: boolean;
}

/**
 * Post status update result
 */
export interface PostStatusUpdateResult {
  success: boolean;
  previousStatus: PostStatus;
  newStatus: PostStatus;
  timestamp: string;
  wordpressPostId?: number;
  error?: string;
  warnings?: string[];
}

/**
 * Post status query options
 */
export interface PostStatusQueryOptions {
  status?: PostStatus | PostStatus[];
  excludeStatus?: PostStatus | PostStatus[];
  includeStatusHistory?: boolean;
  sortBy?: 'created' | 'modified' | 'status_changed';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Post status statistics
 */
export interface PostStatusStatistics {
  totalPosts: number;
  draftCount: number;
  publishedCount: number;
  privateCount: number;
  statusDistribution: Record<PostStatus, number>;
  recentTransitions: PostStatusTransition[];
  averageTimeInDraft?: number; // in milliseconds
  totalPublishingTime?: number; // in milliseconds
}

/**
 * Default post status configuration
 */
export const DEFAULT_POST_STATUS_CONFIG: PostStatusConfig = {
  allowedStatuses: ['draft', 'publish', 'private'],
  defaultStatus: 'draft',
  requireReviewForPublish: false,
  allowStatusTransitions: true,
  enableStatusHistory: true,
  statusTransitionPermissions: {
    'draft': ['publish', 'private'],
    'publish': ['draft', 'private'],
    'private': ['draft', 'publish']
  }
};

/**
 * Status labels for UI display
 */
export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  'draft': 'Draft',
  'publish': 'Published',
  'private': 'Private'
};

/**
 * Status descriptions for UI tooltips
 */
export const POST_STATUS_DESCRIPTIONS: Record<PostStatus, string> = {
  'draft': 'Post is saved as draft and not visible to the public',
  'publish': 'Post is published and visible to all visitors',
  'private': 'Post is published but only visible to logged-in users'
};

/**
 * Status icons for UI display
 */
export const POST_STATUS_ICONS: Record<PostStatus, string> = {
  'draft': '📝',
  'publish': '🌐',
  'private': '🔒'
};

/**
 * Status colors for UI display
 */
export const POST_STATUS_COLORS: Record<PostStatus, string> = {
  'draft': '#f59e0b', // yellow
  'publish': '#10b981', // green
  'private': '#6366f1'  // indigo
};

/**
 * WordPress status mapping
 */
export const WORDPRESS_STATUS_MAP: Record<PostStatus, WordPressPostStatus> = {
  'draft': 'draft',
  'publish': 'publish',
  'private': 'private'
};

/**
 * Reverse WordPress status mapping
 */
export const REVERSE_WORDPRESS_STATUS_MAP: Record<WordPressPostStatus, PostStatus> = {
  'draft': 'draft',
  'publish': 'publish',
  'private': 'private',
  'pending': 'draft',     // Map pending to draft for simplicity
  'future': 'publish',    // Map future to publish
  'trash': 'draft',       // Map trash to draft
  'auto-draft': 'draft',  // Map auto-draft to draft
  'inherit': 'publish'    // Map inherit to publish
};

/**
 * Validate post status
 */
export function validatePostStatus(
  status: any,
  options: PostStatusValidationOptions = {}
): PostStatusValidationResult {
  const {
    allowedStatuses = DEFAULT_POST_STATUS_CONFIG.allowedStatuses,
    defaultStatus = DEFAULT_POST_STATUS_CONFIG.defaultStatus,
    requireStatus = false,
    validateTransitions = false,
    currentStatus
  } = options;

  // Handle undefined/null status
  if (status === undefined || status === null) {
    if (requireStatus) {
      return {
        isValid: false,
        error: 'Status is required'
      };
    }
    return {
      isValid: true,
      status: defaultStatus
    };
  }

  // Handle empty string
  if (status === '') {
    return {
      isValid: true,
      status: defaultStatus
    };
  }

  // Validate status type
  if (typeof status !== 'string') {
    return {
      isValid: false,
      error: `Status must be a string, received ${typeof status}`
    };
  }

  // Normalize status
  const normalizedStatus = status.toLowerCase().trim() as PostStatus;

  // Check if status is allowed
  if (!allowedStatuses.includes(normalizedStatus)) {
    return {
      isValid: false,
      error: `Invalid status "${status}". Allowed values: ${allowedStatuses.join(', ')}`
    };
  }

  // Validate status transitions if requested
  if (validateTransitions && currentStatus) {
    const allowedTransitions = DEFAULT_POST_STATUS_CONFIG.statusTransitionPermissions[currentStatus] || [];
    if (!allowedTransitions.includes(normalizedStatus) && currentStatus !== normalizedStatus) {
      return {
        isValid: false,
        error: `Invalid status transition from "${currentStatus}" to "${normalizedStatus}"`
      };
    }
  }

  return {
    isValid: true,
    status: normalizedStatus
  };
}

/**
 * Get default status for new posts
 */
export function getDefaultPostStatus(config: Partial<PostStatusConfig> = {}): PostStatus {
  return config.defaultStatus || DEFAULT_POST_STATUS_CONFIG.defaultStatus;
}

/**
 * Check if status transition is allowed
 */
export function isStatusTransitionAllowed(
  fromStatus: PostStatus,
  toStatus: PostStatus,
  config: Partial<PostStatusConfig> = {}
): boolean {
  const permissions = config.statusTransitionPermissions || DEFAULT_POST_STATUS_CONFIG.statusTransitionPermissions;
  const allowedTransitions = permissions[fromStatus] || [];
  return allowedTransitions.includes(toStatus) || fromStatus === toStatus;
}

/**
 * Create status transition record
 */
export function createStatusTransition(
  fromStatus: PostStatus,
  toStatus: PostStatus,
  user?: string,
  reason?: string
): PostStatusTransition {
  return {
    from: fromStatus,
    to: toStatus,
    timestamp: new Date().toISOString(),
    user,
    reason
  };
}

/**
 * Map internal status to WordPress status
 */
export function mapToWordPressStatus(status: PostStatus): WordPressPostStatus {
  return WORDPRESS_STATUS_MAP[status] || 'draft';
}

/**
 * Map WordPress status to internal status
 */
export function mapFromWordPressStatus(wpStatus: WordPressPostStatus): PostStatus {
  return REVERSE_WORDPRESS_STATUS_MAP[wpStatus] || 'draft';
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: PostStatus): string {
  return POST_STATUS_LABELS[status] || status;
}

/**
 * Get status description
 */
export function getStatusDescription(status: PostStatus): string {
  return POST_STATUS_DESCRIPTIONS[status] || `Post status: ${status}`;
}

/**
 * Get status icon
 */
export function getStatusIcon(status: PostStatus): string {
  return POST_STATUS_ICONS[status] || '📄';
}

/**
 * Get status color
 */
export function getStatusColor(status: PostStatus): string {
  return POST_STATUS_COLORS[status] || '#6b7280';
}

/**
 * Check if post is published
 */
export function isPostPublished(status: PostStatus): boolean {
  return status === 'publish';
}

/**
 * Check if post is draft
 */
export function isPostDraft(status: PostStatus): boolean {
  return status === 'draft';
}

/**
 * Check if post is private
 */
export function isPostPrivate(status: PostStatus): boolean {
  return status === 'private';
}

/**
 * Check if post is publicly visible
 */
export function isPostPubliclyVisible(status: PostStatus): boolean {
  return status === 'publish';
}

/**
 * Get all available statuses
 */
export function getAllPostStatuses(): PostStatus[] {
  return ['draft', 'publish', 'private'];
}

/**
 * Sanitize and normalize status input
 */
export function sanitizePostStatus(input: any): PostStatus {
  if (typeof input !== 'string') {
    return getDefaultPostStatus();
  }

  const normalized = input.toLowerCase().trim();
  const validStatuses = getAllPostStatuses();
  
  if (validStatuses.includes(normalized as PostStatus)) {
    return normalized as PostStatus;
  }

  return getDefaultPostStatus();
}

/**
 * Create post status metadata
 */
export function createPostStatusMetadata(
  status: PostStatus,
  options: {
    publishedDate?: string;
    draftSavedDate?: string;
    statusChangedBy?: string;
    previousTransitions?: PostStatusTransition[];
  } = {}
): PostStatusMetadata {
  const now = new Date().toISOString();
  
  return {
    status,
    statusHistory: options.previousTransitions || [],
    lastModified: now,
    publishedDate: status === 'publish' ? (options.publishedDate || now) : undefined,
    draftSavedDate: status === 'draft' ? (options.draftSavedDate || now) : undefined,
    statusChangedBy: options.statusChangedBy
  };
}

/**
 * Post status utilities
 */
export const postStatusUtils = {
  validate: validatePostStatus,
  getDefault: getDefaultPostStatus,
  isTransitionAllowed: isStatusTransitionAllowed,
  createTransition: createStatusTransition,
  mapToWordPress: mapToWordPressStatus,
  mapFromWordPress: mapFromWordPressStatus,
  getLabel: getStatusLabel,
  getDescription: getStatusDescription,
  getIcon: getStatusIcon,
  getColor: getStatusColor,
  isPublished: isPostPublished,
  isDraft: isPostDraft,
  isPrivate: isPostPrivate,
  isPubliclyVisible: isPostPubliclyVisible,
  getAllStatuses: getAllPostStatuses,
  sanitize: sanitizePostStatus,
  createMetadata: createPostStatusMetadata
};

export default postStatusUtils;
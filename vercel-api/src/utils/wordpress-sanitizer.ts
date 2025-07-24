/**
 * WordPress-specific data sanitization utilities
 * Handles WordPress post content, shortcodes, Gutenberg blocks, and metadata
 */

import { logger } from './logger';
import { contentSanitizer, SanitizationResult } from './content-sanitizer';
import { validationUtils } from './validation';

/**
 * WordPress field types
 */
export type WordPressFieldType = 
  | 'post_title' 
  | 'post_content' 
  | 'post_excerpt' 
  | 'meta_value' 
  | 'comment_content'
  | 'category_name'
  | 'tag_name'
  | 'custom_field'
  | 'shortcode'
  | 'gutenberg_block';

/**
 * WordPress sanitization options
 */
export interface WordPressSanitizationOptions {
  // Allow shortcodes
  allowShortcodes?: boolean;
  // Allow Gutenberg blocks
  allowGutenbergBlocks?: boolean;
  // Allow HTML in content
  allowHtml?: boolean;
  // Strip WordPress comments
  stripWpComments?: boolean;
  // Validate shortcode attributes
  validateShortcodes?: boolean;
  // Maximum content length
  maxLength?: number;
  // Custom shortcode whitelist
  allowedShortcodes?: string[];
  // Block specific Gutenberg blocks
  blockedGutenbergBlocks?: string[];
  // Preserve WordPress formatting
  preserveWpFormatting?: boolean;
  // Sanitize for specific WordPress version
  wpVersion?: string;
  // Handle WordPress entities
  handleWpEntities?: boolean;
}

/**
 * WordPress sanitization result
 */
export interface WordPressSanitizationResult extends SanitizationResult {
  shortcodesFound?: string[];
  gutenbergBlocksFound?: string[];
  wpEntitiesHandled?: number;
  wordPressSpecific?: {
    shortcodesRemoved: string[];
    blocksModified: string[];
    entitiesConverted: number;
  };
}

/**
 * WordPress post data structure
 */
export interface WordPressPostData {
  post_title?: string;
  post_content?: string;
  post_excerpt?: string;
  post_status?: string;
  post_type?: string;
  meta_input?: Record<string, any>;
  categories?: string[] | number[];
  tags?: string[] | number[];
  featured_media?: number | string;
  [key: string]: any;
}

/**
 * Default WordPress sanitization options
 */
const DEFAULT_WP_OPTIONS: WordPressSanitizationOptions = {
  allowShortcodes: true,
  allowGutenbergBlocks: true,
  allowHtml: true,
  stripWpComments: true,
  validateShortcodes: true,
  maxLength: 1000000, // 1MB
  allowedShortcodes: [], // Empty means all allowed
  blockedGutenbergBlocks: ['core/html', 'core/code', 'core/embed'],
  preserveWpFormatting: true,
  wpVersion: '6.0',
  handleWpEntities: true
};

/**
 * Common WordPress shortcodes (for validation)
 */
const COMMON_SHORTCODES = [
  'gallery', 'caption', 'embed', 'audio', 'video', 'playlist',
  'wp_caption', 'contact-form-7', 'gravityform', 'woocommerce_cart',
  'woocommerce_checkout', 'recent_posts', 'recent_comments'
];

/**
 * Dangerous shortcodes that should be blocked
 */
const DANGEROUS_SHORTCODES = [
  'php', 'eval', 'exec', 'system', 'shell_exec', 'passthru',
  'file_get_contents', 'fopen', 'fwrite', 'include', 'require'
];

/**
 * Gutenberg block patterns
 */
const GUTENBERG_BLOCK_PATTERN = /<!-- wp:([a-zA-Z0-9\-\/]+)(?:\s+(\{.*?\}))?\s*(?:\/)?-->/g;
const GUTENBERG_BLOCK_END_PATTERN = /<!-- \/wp:([a-zA-Z0-9\-\/]+) -->/g;

/**
 * WordPress shortcode patterns
 */
const SHORTCODE_PATTERN = /\[([a-zA-Z0-9_\-]+)(?:\s+([^\]]*))?\](?:(.*?)\[\/\1\])?/g;

/**
 * WordPress comment patterns
 */
const WP_COMMENT_PATTERN = /<!--.*?-->/gs;

/**
 * WordPress HTML entities
 */
const WP_ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#039;': "'",
  '&#8217;': "'",
  '&#8220;': '"',
  '&#8221;': '"',
  '&#8211;': '–',
  '&#8212;': '—',
  '&hellip;': '…',
  '&nbsp;': ' '
};

/**
 * Extract shortcodes from content
 */
function extractShortcodes(content: string): { shortcode: string; attributes: string; content: string }[] {
  const shortcodes: { shortcode: string; attributes: string; content: string }[] = [];
  let match;
  
  const regex = new RegExp(SHORTCODE_PATTERN);
  while ((match = regex.exec(content)) !== null) {
    shortcodes.push({
      shortcode: match[1],
      attributes: match[2] || '',
      content: match[3] || ''
    });
  }
  
  return shortcodes;
}

/**
 * Extract Gutenberg blocks from content
 */
function extractGutenbergBlocks(content: string): { blockType: string; attributes: any; content: string }[] {
  const blocks: { blockType: string; attributes: any; content: string }[] = [];
  let match;
  
  const regex = new RegExp(GUTENBERG_BLOCK_PATTERN);
  while ((match = regex.exec(content)) !== null) {
    let attributes = {};
    try {
      if (match[2]) {
        attributes = JSON.parse(match[2]);
      }
    } catch (error) {
      // Invalid JSON in block attributes
    }
    
    blocks.push({
      blockType: match[1],
      attributes,
      content: match[0]
    });
  }
  
  return blocks;
}

/**
 * Validate shortcode safety
 */
function validateShortcode(shortcodeName: string, attributes: string, options: WordPressSanitizationOptions): boolean {
  // Check if shortcode is in dangerous list
  if (DANGEROUS_SHORTCODES.includes(shortcodeName.toLowerCase())) {
    return false;
  }
  
  // Check if shortcode is in allowed list (if specified)
  if (options.allowedShortcodes && options.allowedShortcodes.length > 0) {
    return options.allowedShortcodes.includes(shortcodeName);
  }
  
  // Check for dangerous attributes
  if (attributes) {
    const dangerousPatterns = [
      /eval\s*\(/i,
      /javascript:/i,
      /vbscript:/i,
      /data:text\/html/i,
      /on\w+\s*=/i // Event handlers
    ];
    
    if (dangerousPatterns.some(pattern => pattern.test(attributes))) {
      return false;
    }
  }
  
  return true;
}

/**
 * Sanitize WordPress shortcodes
 */
function sanitizeShortcodes(
  content: string, 
  options: WordPressSanitizationOptions,
  requestId?: string
): { sanitized: string; removedShortcodes: string[]; foundShortcodes: string[] } {
  const removedShortcodes: string[] = [];
  const foundShortcodes: string[] = [];
  
  if (!options.allowShortcodes) {
    // Remove all shortcodes
    const sanitized = content.replace(SHORTCODE_PATTERN, (match, shortcodeName) => {
      removedShortcodes.push(shortcodeName);
      return '';
    });
    return { sanitized, removedShortcodes, foundShortcodes };
  }
  
  const shortcodes = extractShortcodes(content);
  let sanitized = content;
  
  for (const shortcode of shortcodes) {
    foundShortcodes.push(shortcode.shortcode);
    
    if (options.validateShortcodes && !validateShortcode(shortcode.shortcode, shortcode.attributes, options)) {
      removedShortcodes.push(shortcode.shortcode);
      // Remove the shortcode
      const shortcodeRegex = new RegExp(`\\[${shortcode.shortcode}[^\\]]*\\](?:.*?\\[\\/${shortcode.shortcode}\\])?`, 'g');
      sanitized = sanitized.replace(shortcodeRegex, '');
      
      logger.warn('Dangerous shortcode removed', {
        requestId,
        shortcode: shortcode.shortcode,
        attributes: shortcode.attributes,
        component: 'wordpress-sanitizer'
      });
    }
  }
  
  return { sanitized, removedShortcodes, foundShortcodes };
}

/**
 * Sanitize Gutenberg blocks
 */
function sanitizeGutenbergBlocks(
  content: string,
  options: WordPressSanitizationOptions,
  requestId?: string
): { sanitized: string; blocksModified: string[]; foundBlocks: string[] } {
  const blocksModified: string[] = [];
  const foundBlocks: string[] = [];
  
  if (!options.allowGutenbergBlocks) {
    // Remove all Gutenberg blocks
    const sanitized = content
      .replace(GUTENBERG_BLOCK_PATTERN, '')
      .replace(GUTENBERG_BLOCK_END_PATTERN, '');
    return { sanitized, blocksModified, foundBlocks };
  }
  
  const blocks = extractGutenbergBlocks(content);
  let sanitized = content;
  
  for (const block of blocks) {
    foundBlocks.push(block.blockType);
    
    if (options.blockedGutenbergBlocks && options.blockedGutenbergBlocks.includes(block.blockType)) {
      blocksModified.push(block.blockType);
      // Remove the block
      const blockRegex = new RegExp(`<!-- wp:${block.blockType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?(?:\/)?-->(?:[\\s\\S]*?<!-- \\/wp:${block.blockType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} -->)?`, 'g');
      sanitized = sanitized.replace(blockRegex, '');
      
      logger.warn('Blocked Gutenberg block removed', {
        requestId,
        blockType: block.blockType,
        component: 'wordpress-sanitizer'
      });
    }
  }
  
  return { sanitized, blocksModified, foundBlocks };
}

/**
 * Handle WordPress entities
 */
function handleWordPressEntities(content: string): { sanitized: string; entitiesConverted: number } {
  let entitiesConverted = 0;
  let sanitized = content;
  
  for (const [entity, replacement] of Object.entries(WP_ENTITIES)) {
    const regex = new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = sanitized.match(regex);
    if (matches) {
      entitiesConverted += matches.length;
      sanitized = sanitized.replace(regex, replacement);
    }
  }
  
  return { sanitized, entitiesConverted };
}

/**
 * Sanitize WordPress post title
 */
export function sanitizePostTitle(
  title: string,
  options: WordPressSanitizationOptions = {},
  requestId?: string
): WordPressSanitizationResult {
  const config = { ...DEFAULT_WP_OPTIONS, ...options };
  const originalLength = title.length;
  
  try {
    // Length check
    if (config.maxLength && originalLength > config.maxLength) {
      title = title.substring(0, config.maxLength);
    }
    
    // Remove HTML tags (titles should be plain text)
    let sanitized = title.replace(/<[^>]*>/g, '');
    
    // Handle WordPress entities
    let entitiesConverted = 0;
    if (config.handleWpEntities) {
      const entityResult = handleWordPressEntities(sanitized);
      sanitized = entityResult.sanitized;
      entitiesConverted = entityResult.entitiesConverted;
    }
    
    // Remove shortcodes (titles shouldn't have shortcodes)
    sanitized = sanitized.replace(SHORTCODE_PATTERN, '');
    
    // Trim and normalize whitespace
    sanitized = sanitized.trim().replace(/\s+/g, ' ');
    
    const wasModified = title !== sanitized;
    
    return {
      sanitized,
      wasModified,
      removedElements: wasModified ? ['html_tags', 'shortcodes'] : [],
      warnings: [],
      stats: {
        originalLength,
        sanitizedLength: sanitized.length,
        removedCount: wasModified ? 1 : 0
      },
      wpEntitiesHandled: entitiesConverted,
      wordPressSpecific: {
        shortcodesRemoved: [],
        blocksModified: [],
        entitiesConverted
      }
    };
    
  } catch (error) {
    logger.error('WordPress title sanitization failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      component: 'wordpress-sanitizer'
    });
    
    return {
      sanitized: validationUtils.sanitizeString(title),
      wasModified: true,
      removedElements: ['sanitization_error'],
      warnings: ['Title sanitization failed'],
      stats: {
        originalLength,
        sanitizedLength: title.length,
        removedCount: 1
      }
    };
  }
}

/**
 * Sanitize WordPress post content
 */
export function sanitizePostContent(
  content: string,
  options: WordPressSanitizationOptions = {},
  requestId?: string
): WordPressSanitizationResult {
  const config = { ...DEFAULT_WP_OPTIONS, ...options };
  const originalLength = content.length;
  let sanitized = content;
  const removedElements: string[] = [];
  const warnings: string[] = [];
  
  try {
    // Length check
    if (config.maxLength && originalLength > config.maxLength) {
      warnings.push(`Content length ${originalLength} exceeds maximum ${config.maxLength}`);
      sanitized = sanitized.substring(0, config.maxLength);
    }
    
    // Remove WordPress comments if requested
    if (config.stripWpComments) {
      const beforeLength = sanitized.length;
      sanitized = sanitized.replace(WP_COMMENT_PATTERN, '');
      if (sanitized.length < beforeLength) {
        removedElements.push('wp_comments');
      }
    }
    
    // Handle shortcodes
    const shortcodeResult = sanitizeShortcodes(sanitized, config, requestId);
    sanitized = shortcodeResult.sanitized;
    const shortcodesFound = shortcodeResult.foundShortcodes;
    const shortcodesRemoved = shortcodeResult.removedShortcodes;
    
    if (shortcodesRemoved.length > 0) {
      removedElements.push('dangerous_shortcodes');
      warnings.push(`Removed dangerous shortcodes: ${shortcodesRemoved.join(', ')}`);
    }
    
    // Handle Gutenberg blocks
    const blockResult = sanitizeGutenbergBlocks(sanitized, config, requestId);
    sanitized = blockResult.sanitized;
    const gutenbergBlocksFound = blockResult.foundBlocks;
    const blocksModified = blockResult.blocksModified;
    
    if (blocksModified.length > 0) {
      removedElements.push('blocked_gutenberg_blocks');
      warnings.push(`Removed blocked Gutenberg blocks: ${blocksModified.join(', ')}`);
    }
    
    // Handle WordPress entities
    let entitiesConverted = 0;
    if (config.handleWpEntities) {
      const entityResult = handleWordPressEntities(sanitized);
      sanitized = entityResult.sanitized;
      entitiesConverted = entityResult.entitiesConverted;
    }
    
    // Apply HTML sanitization if requested
    let htmlResult: SanitizationResult | undefined;
    if (config.allowHtml) {
      htmlResult = contentSanitizer.sanitizeHtml(sanitized, {
        allowedTags: [
          'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
          'a', 'img', 'figure', 'figcaption',
          'table', 'thead', 'tbody', 'tr', 'td', 'th',
          'div', 'span', 'section', 'article', 'aside', 'header', 'footer'
        ],
        allowedAttributes: {
          'a': ['href', 'title', 'target', 'rel'],
          'img': ['src', 'alt', 'title', 'width', 'height', 'class'],
          'div': ['class', 'id'],
          'span': ['class'],
          'p': ['class'],
          'h1': ['class', 'id'],
          'h2': ['class', 'id'],
          'h3': ['class', 'id'],
          'h4': ['class', 'id'],
          'h5': ['class', 'id'],
          'h6': ['class', 'id']
        },
        allowExternalLinks: true,
        maxLength: config.maxLength
      }, requestId);
      
      sanitized = htmlResult.sanitized;
      if (htmlResult.wasModified) {
        removedElements.push(...htmlResult.removedElements);
        warnings.push(...htmlResult.warnings);
      }
    } else {
      // Strip all HTML
      sanitized = sanitized.replace(/<[^>]*>/g, '');
      removedElements.push('all_html');
    }
    
    const wasModified = content !== sanitized;
    
    if (wasModified) {
      logger.info('WordPress content sanitized', {
        requestId,
        originalLength,
        sanitizedLength: sanitized.length,
        shortcodesFound: shortcodesFound.length,
        shortcodesRemoved: shortcodesRemoved.length,
        blocksFound: gutenbergBlocksFound.length,
        blocksModified: blocksModified.length,
        entitiesConverted,
        component: 'wordpress-sanitizer'
      });
    }
    
    return {
      sanitized,
      wasModified,
      removedElements,
      warnings,
      stats: {
        originalLength,
        sanitizedLength: sanitized.length,
        removedCount: removedElements.length
      },
      shortcodesFound,
      gutenbergBlocksFound,
      wpEntitiesHandled: entitiesConverted,
      wordPressSpecific: {
        shortcodesRemoved,
        blocksModified,
        entitiesConverted
      }
    };
    
  } catch (error) {
    logger.error('WordPress content sanitization failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      originalLength,
      component: 'wordpress-sanitizer'
    });
    
    return {
      sanitized: validationUtils.sanitizeString(content),
      wasModified: true,
      removedElements: ['sanitization_error'],
      warnings: ['Content sanitization failed'],
      stats: {
        originalLength,
        sanitizedLength: content.length,
        removedCount: 1
      }
    };
  }
}

/**
 * Sanitize WordPress post excerpt
 */
export function sanitizePostExcerpt(
  excerpt: string,
  options: WordPressSanitizationOptions = {},
  requestId?: string
): WordPressSanitizationResult {
  const config = { ...DEFAULT_WP_OPTIONS, ...options, allowShortcodes: false, allowGutenbergBlocks: false };
  
  // Excerpts should be plain text with limited length
  const maxLength = Math.min(config.maxLength || 500, 500);
  
  return sanitizePostTitle(excerpt, { ...config, maxLength }, requestId);
}

/**
 * Sanitize WordPress metadata
 */
export function sanitizeWordPressMeta(
  metaValue: any,
  metaKey: string,
  options: WordPressSanitizationOptions = {},
  requestId?: string
): WordPressSanitizationResult {
  const config = { ...DEFAULT_WP_OPTIONS, ...options };
  
  if (typeof metaValue !== 'string') {
    metaValue = String(metaValue);
  }
  
  const originalLength = metaValue.length;
  let sanitized = metaValue;
  const removedElements: string[] = [];
  const warnings: string[] = [];
  
  try {
    // Different sanitization based on meta key
    if (metaKey.includes('url') || metaKey.includes('link')) {
      // URL meta fields
      const urlResult = validationUtils.validateUrl(sanitized);
      if (!urlResult.isValid) {
        warnings.push(`Invalid URL in meta field ${metaKey}`);
        sanitized = '';
        removedElements.push('invalid_url');
      }
    } else if (metaKey.includes('email')) {
      // Email meta fields
      const emailResult = validationUtils.validateEmail(sanitized);
      if (!emailResult.isValid) {
        warnings.push(`Invalid email in meta field ${metaKey}`);
        sanitized = '';
        removedElements.push('invalid_email');
      }
    } else {
      // General meta field sanitization
      sanitized = validationUtils.sanitizeString(sanitized);
      
      // Remove shortcodes from meta (usually not wanted)
      sanitized = sanitized.replace(SHORTCODE_PATTERN, '');
      
      // Handle length limits
      const maxLength = config.maxLength || 1000;
      if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
        warnings.push(`Meta field ${metaKey} truncated to ${maxLength} characters`);
      }
    }
    
    const wasModified = metaValue !== sanitized;
    
    return {
      sanitized,
      wasModified,
      removedElements,
      warnings,
      stats: {
        originalLength,
        sanitizedLength: sanitized.length,
        removedCount: removedElements.length
      }
    };
    
  } catch (error) {
    logger.error('WordPress meta sanitization failed', {
      requestId,
      metaKey,
      error: error instanceof Error ? error.message : 'Unknown error',
      component: 'wordpress-sanitizer'
    });
    
    return {
      sanitized: '',
      wasModified: true,
      removedElements: ['sanitization_error'],
      warnings: [`Meta sanitization failed for ${metaKey}`],
      stats: {
        originalLength,
        sanitizedLength: 0,
        removedCount: 1
      }
    };
  }
}

/**
 * Sanitize complete WordPress post data
 */
export function sanitizeWordPressPost(
  postData: WordPressPostData,
  options: WordPressSanitizationOptions = {},
  requestId?: string
): {
  sanitized: WordPressPostData;
  results: Record<string, WordPressSanitizationResult>;
  warnings: string[];
} {
  const config = { ...DEFAULT_WP_OPTIONS, ...options };
  const sanitized: WordPressPostData = { ...postData };
  const results: Record<string, WordPressSanitizationResult> = {};
  const warnings: string[] = [];
  
  try {
    // Sanitize post title
    if (sanitized.post_title) {
      const titleResult = sanitizePostTitle(sanitized.post_title, config, requestId);
      sanitized.post_title = titleResult.sanitized;
      results.post_title = titleResult;
      warnings.push(...titleResult.warnings);
    }
    
    // Sanitize post content
    if (sanitized.post_content) {
      const contentResult = sanitizePostContent(sanitized.post_content, config, requestId);
      sanitized.post_content = contentResult.sanitized;
      results.post_content = contentResult;
      warnings.push(...contentResult.warnings);
    }
    
    // Sanitize post excerpt
    if (sanitized.post_excerpt) {
      const excerptResult = sanitizePostExcerpt(sanitized.post_excerpt, config, requestId);
      sanitized.post_excerpt = excerptResult.sanitized;
      results.post_excerpt = excerptResult;
      warnings.push(...excerptResult.warnings);
    }
    
    // Sanitize meta fields
    if (sanitized.meta_input && typeof sanitized.meta_input === 'object') {
      for (const [metaKey, metaValue] of Object.entries(sanitized.meta_input)) {
        const metaResult = sanitizeWordPressMeta(metaValue, metaKey, config, requestId);
        sanitized.meta_input[metaKey] = metaResult.sanitized;
        results[`meta_${metaKey}`] = metaResult;
        warnings.push(...metaResult.warnings);
      }
    }
    
    // Sanitize categories and tags
    if (sanitized.categories && Array.isArray(sanitized.categories)) {
      sanitized.categories = sanitized.categories.map(cat => 
        typeof cat === 'string' ? validationUtils.sanitizeString(cat) : cat
      );
    }
    
    if (sanitized.tags && Array.isArray(sanitized.tags)) {
      sanitized.tags = sanitized.tags.map(tag => 
        typeof tag === 'string' ? validationUtils.sanitizeString(tag) : tag
      );
    }
    
    // Validate post status
    if (sanitized.post_status && typeof sanitized.post_status === 'string') {
      const validStatuses = ['publish', 'draft', 'private', 'pending', 'future'];
      if (!validStatuses.includes(sanitized.post_status)) {
        sanitized.post_status = 'draft';
        warnings.push('Invalid post status, defaulted to draft');
      }
    }
    
    logger.info('WordPress post sanitized', {
      requestId,
      fieldsProcessed: Object.keys(results).length,
      warningsGenerated: warnings.length,
      component: 'wordpress-sanitizer'
    });
    
    return { sanitized, results, warnings };
    
  } catch (error) {
    logger.error('WordPress post sanitization failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      component: 'wordpress-sanitizer'
    });
    
    throw new Error('WordPress post sanitization failed');
  }
}

/**
 * WordPress sanitizer utilities object
 */
export const wordPressSanitizer = {
  sanitizePostTitle,
  sanitizePostContent,
  sanitizePostExcerpt,
  sanitizeWordPressMeta,
  sanitizeWordPressPost,
  
  // Utility functions
  extractShortcodes,
  extractGutenbergBlocks,
  validateShortcode,
  handleWordPressEntities,
  
  // Predefined configurations
  configs: {
    strict: {
      allowShortcodes: false,
      allowGutenbergBlocks: false,
      allowHtml: false,
      validateShortcodes: true,
      blockedGutenbergBlocks: ['core/html', 'core/code', 'core/embed', 'core/shortcode'],
      maxLength: 50000
    } as WordPressSanitizationOptions,
    
    moderate: DEFAULT_WP_OPTIONS,
    
    permissive: {
      ...DEFAULT_WP_OPTIONS,
      allowShortcodes: true,
      allowGutenbergBlocks: true,
      allowHtml: true,
      validateShortcodes: false,
      blockedGutenbergBlocks: [],
      maxLength: 2000000 // 2MB
    } as WordPressSanitizationOptions
  }
};

export default wordPressSanitizer;
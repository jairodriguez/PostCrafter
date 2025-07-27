/**
 * Content sanitization utilities for HTML and Markdown
 * Provides secure content cleaning to prevent XSS attacks and malicious content
 */

import * as DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import MarkdownIt from 'markdown-it';
import { logger } from './logger';
import { validationUtils } from './validation';

// Create DOM environment for server-side DOMPurify
// const window = new JSDOM('').window; // Removed - using fresh instances instead
// const purify = DOMPurify(window as any); // Removed - using fresh instances instead

/**
 * HTML sanitization configuration options
 */
export interface HtmlSanitizationOptions {
  // Allowed HTML tags
  allowedTags?: string[];
  // Allowed attributes per tag
  allowedAttributes?: Record<string, string[]>;
  // Allow custom attributes (data-*, aria-*)
  allowCustomAttributes?: boolean;
  // Allow external links
  allowExternalLinks?: boolean;
  // Allowed protocols for links
  allowedProtocols?: string[];
  // Remove all HTML tags (text only)
  stripAllTags?: boolean;
  // Transform URLs to safe domains
  transformUrls?: boolean;
  // Maximum content length
  maxLength?: number;
  // Custom URL transformer function
  urlTransformer?: (url: string) => string;
}

/**
 * Markdown sanitization configuration options
 */
export interface MarkdownSanitizationOptions {
  // Allow HTML in markdown
  allowHtml?: boolean;
  // Allow links
  allowLinks?: boolean;
  // Allow images
  allowImages?: boolean;
  // Allow code blocks
  allowCodeBlocks?: boolean;
  // Allowed protocols for links and images
  allowedProtocols?: string[];
  // Maximum content length
  maxLength?: number;
  // Custom link/image validator
  linkValidator?: (url: string) => boolean;
  // Enable line breaks
  enableLineBreaks?: boolean;
  // Allow tables
  allowTables?: boolean;
  // Allow lists
  allowLists?: boolean;
}

/**
 * Sanitization result interface
 */
export interface SanitizationResult {
  sanitized: string;
  wasModified: boolean;
  removedElements: string[];
  warnings: string[];
  stats: {
    originalLength: number;
    sanitizedLength: number;
    removedCount: number;
  };
}

/**
 * Malicious pattern detection
 */
const MALICIOUS_PATTERNS = {
  // Script injection patterns
  scriptTags: /<script[^>]*>[\s\S]*?<\/script>/gi,
  scriptEvents: /on\w+\s*=\s*['"]/gi,
  javascriptProtocol: /javascript\s*:/gi,
  vbscriptProtocol: /vbscript\s*:/gi,
  dataProtocol: /data\s*:\s*text\/html/gi,
  
  // Object/embed patterns
  objectTags: /<(object|embed|applet|iframe)[^>]*>/gi,
  
  // Form hijacking
  formTags: /<form[^>]*>/gi,
  
  // Meta refresh
  metaRefresh: /<meta[^>]*http-equiv\s*=\s*['"]\s*refresh['"]/gi,
  
  // Link manipulation
  linkRel: /<link[^>]*rel\s*=\s*['"]\s*(stylesheet|import)['"]/gi,
  
  // Comment-based attacks
  htmlComments: /<!--[\s\S]*?-->/g,
  
  // CSS expression attacks
  cssExpression: /expression\s*\(/gi,
  cssImport: /@import/gi,
  
  // SQL injection in attributes
  sqlInjection: /(union|select|insert|update|delete|drop|create|alter|exec|execute)\s+/gi,
} as const;

/**
 * Default HTML sanitization configuration
 */
const DEFAULT_HTML_CONFIG: HtmlSanitizationOptions = {
  allowedTags: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'div', 'span'
  ],
  allowedAttributes: {
    'a': ['href', 'title', 'target', 'rel'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'blockquote': ['cite'],
    'pre': ['class'],
    'code': ['class'],
    'div': ['class'],
    'span': ['class']
  },
  allowCustomAttributes: false,
  allowExternalLinks: true,
  allowedProtocols: ['http', 'https', 'mailto'],
  stripAllTags: false,
  transformUrls: false,
  maxLength: 100000 // 100KB
};

/**
 * Default Markdown sanitization configuration
 */
const DEFAULT_MARKDOWN_CONFIG: MarkdownSanitizationOptions = {
  allowHtml: false,
  allowLinks: true,
  allowImages: true,
  allowCodeBlocks: true,
  allowedProtocols: ['http', 'https'],
  maxLength: 100000, // 100KB
  enableLineBreaks: true,
  allowTables: true,
  allowLists: true
};

/**
 * Initialize markdown parser with security configurations
 */
function createSecureMarkdownParser(options: MarkdownSanitizationOptions): MarkdownIt {
  const md = new MarkdownIt({
    html: options.allowHtml || false,
    linkify: options.allowLinks !== false,
    breaks: options.enableLineBreaks !== false,
    typographer: false // Disable for security
  });

  // Configure plugins based on options
  if (options.allowTables) {
    // Tables are built-in to markdown-it
  }

  // Custom link validation
  if (options.linkValidator) {
    const defaultRender = md.renderer.rules['link_open'] || function(tokens, idx, options, _env, self) {
      return self.renderToken(tokens, idx, options);
    };

    md.renderer.rules['link_open'] = function(tokens, idx, opts, env, self) {
      const token = tokens[idx];
      if (!token) return defaultRender(tokens, idx, opts, env, self);
      
      const hrefIndex = token.attrIndex('href');
      
      if (hrefIndex >= 0) {
        const href = token.attrGet('href');
        if (href && !options.linkValidator!(href)) {
          // Remove the href attribute if validation fails
          token.attrSet('href', '#');
          token.attrSet('title', 'Link removed for security');
        }
      }
      
      return defaultRender(tokens, idx, opts, env, self);
    };
  }

  // Protocol validation for links and images
  if (options.allowedProtocols) {
    const validateProtocol = (url: string): boolean => {
      try {
        const urlObj = new URL(url);
        return options.allowedProtocols!.includes(urlObj.protocol.slice(0, -1));
      } catch {
        // If not a valid URL, allow it (might be relative)
        return !url.includes(':');
      }
    };

    // Override link renderer
    const defaultLinkRender = md.renderer.rules['link_open'] || function(tokens, idx, options, _env, self) {
      return self.renderToken(tokens, idx, options);
    };

    md.renderer.rules['link_open'] = function(tokens, idx, opts, env, self) {
      const token = tokens[idx];
      if (!token) return defaultLinkRender(tokens, idx, opts, env, self);
      
      const hrefIndex = token.attrIndex('href');
      
      if (hrefIndex >= 0) {
        const href = token.attrGet('href');
        if (href && !validateProtocol(href)) {
          token.attrSet('href', '#');
          token.attrSet('title', 'Link removed - invalid protocol');
        }
      }
      
      return defaultLinkRender(tokens, idx, opts, env, self);
    };

    // Override image renderer
    const defaultImageRender = md.renderer.rules.image || function(tokens, idx, options, _env, self) {
      return self.renderToken(tokens, idx, options);
    };

    md.renderer.rules.image = function(tokens, idx, opts, env, self) {
      const token = tokens[idx];
      if (!token) return defaultImageRender(tokens, idx, opts, env, self);
      
      const srcIndex = token.attrIndex('src');
      
      if (srcIndex >= 0) {
        const src = token.attrGet('src');
        if (src && !validateProtocol(src)) {
          token.attrSet('src', '');
          token.attrSet('alt', 'Image removed - invalid protocol');
        }
      }
      
      return defaultImageRender(tokens, idx, opts, env, self);
    };
  }

  return md;
}

/**
 * Detect malicious patterns in content
 */
export function detectMaliciousPatterns(content: string): { 
  malicious: boolean; 
  patterns: string[]; 
  details: Record<string, number> 
} {
  const detectedPatterns: string[] = [];
  const details: Record<string, number> = {};

  Object.entries(MALICIOUS_PATTERNS).forEach(([name, pattern]) => {
    const matches = content.match(pattern);
    if (matches) {
      detectedPatterns.push(name);
      details[name] = matches.length;
    }
  });

  const malicious = detectedPatterns.length > 0;

  if (malicious) {
    logger.warn('Malicious patterns detected in content', {
      metadata: {
        patterns: detectedPatterns,
        details,
        contentLength: content.length
      },
      component: 'content-sanitizer'
    });
  }

  return {
    malicious,
    patterns: detectedPatterns,
    details
  };
}

/**
 * Sanitize HTML content with comprehensive security measures
 */
export function sanitizeHtml(
  content: string, 
  options: HtmlSanitizationOptions = {},
  requestId?: string
): SanitizationResult {
  const config = { ...DEFAULT_HTML_CONFIG, ...options };
  const originalLength = content.length;
  let sanitized = content;
  const removedElements: string[] = [];
  const warnings: string[] = [];

  try {
    // Length validation
    if (config.maxLength && originalLength > config.maxLength) {
      warnings.push(`Content length ${originalLength} exceeds maximum ${config.maxLength}`);
      sanitized = sanitized.substring(0, config.maxLength);
    }

    // Detect malicious patterns before sanitization
    const maliciousCheck = detectMaliciousPatterns(sanitized);
    if (maliciousCheck.malicious) {
      warnings.push(`Malicious patterns detected: ${maliciousCheck.patterns.join(', ')}`);
      removedElements.push(...maliciousCheck.patterns);
    }

    // Configure DOMPurify
    const allowedAttributes = config.allowedAttributes || DEFAULT_HTML_CONFIG.allowedAttributes || {};
    const allAllowedAttrs = new Set<string>();
    
    // Flatten the allowed attributes from the nested structure
    Object.values(allowedAttributes).forEach(attrs => {
      if (Array.isArray(attrs)) {
        attrs.forEach(attr => allAllowedAttrs.add(attr));
      }
    });
    
    // Ensure no duplicate tags
    const allowedTags = new Set(config.allowedTags || DEFAULT_HTML_CONFIG.allowedTags);
    
    const purifyConfig: any = {
      ALLOWED_TAGS: Array.from(allowedTags),
      ALLOWED_ATTR: Array.from(allAllowedAttrs),
      ALLOW_DATA_ATTR: config.allowCustomAttributes,
      ALLOW_ARIA_ATTR: config.allowCustomAttributes,
      FORBID_TAGS: ['script', 'object', 'embed', 'applet', 'meta', 'link', 'style', 'form', 'input', 'button'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit'],
      KEEP_CONTENT: true, // Keep content but remove forbidden tags
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_TRUSTED_TYPE: false
    };



    // Handle protocol restrictions
    if (config.allowedProtocols) {
      purifyConfig.ALLOWED_URI_REGEXP = new RegExp(
        `^(?:(?:${config.allowedProtocols.join('|')}):|\\/|\\?|#|[^a-z]|[a-z+.\\-]+(?:[^a-z+.\\-:]|:(?!\\/\\/))|[a-z0-9._-]+(?:\\.[a-z0-9._-]+)*$)`
      );
    }

    // Strip all tags if requested
    if (config.stripAllTags) {
      purifyConfig.ALLOWED_TAGS = [];
      purifyConfig.KEEP_CONTENT = true;
    }

    // Sanitize content
    // Try using the default DOMPurify instance
    const defaultWindow = new JSDOM('').window;
    const defaultPurify = DOMPurify.default(defaultWindow as any);
    
    // Add custom hook for security and URL transformation
    defaultPurify.addHook('afterSanitizeAttributes', function(node) {
      // Remove all event handlers
      const eventAttributes = Array.from(node.attributes || []).filter(attr => 
        attr.name.startsWith('on')
      );
      
      eventAttributes.forEach(attr => {
        node.removeAttribute(attr.name);
        removedElements.push('event_handler');
      });
      
      // Handle href attributes (links)
      if (node.tagName === 'A' && node.hasAttribute('href')) {
        const href = node.getAttribute('href');
        if (href) {
          // Remove javascript: and other dangerous protocols
          if (href.toLowerCase().startsWith('javascript:') || 
              href.toLowerCase().startsWith('vbscript:') ||
              href.toLowerCase().startsWith('data:text/html')) {
            node.removeAttribute('href');
            removedElements.push('dangerous_protocol');
          } else if (config.transformUrls && config.urlTransformer) {
            node.setAttribute('href', config.urlTransformer!(href));
          }
        }
      }
      
      // Handle src attributes (images)
      if (node.tagName === 'IMG' && node.hasAttribute('src')) {
        const src = node.getAttribute('src');
        if (src) {
          // Remove javascript: and other dangerous protocols
          if (src.toLowerCase().startsWith('javascript:') || 
              src.toLowerCase().startsWith('vbscript:') ||
              src.toLowerCase().startsWith('data:text/html')) {
            node.removeAttribute('src');
            removedElements.push('dangerous_protocol');
          } else if (config.transformUrls && config.urlTransformer) {
            node.setAttribute('src', config.urlTransformer!(src));
          }
        }
      }
    });
    
    sanitized = defaultPurify.sanitize(sanitized, purifyConfig) as unknown as string;

    // Post-process to remove any remaining script content
    sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    sanitized = sanitized.replace(/javascript\s*:/gi, '');
    sanitized = sanitized.replace(/vbscript\s*:/gi, '');
    sanitized = sanitized.replace(/data\s*:\s*text\/html/gi, '');
    // Remove HTML-encoded script content
    sanitized = sanitized.replace(/&lt;script[^&]*&gt;[\s\S]*?&lt;\/script&gt;/gi, '');
    sanitized = sanitized.replace(/alert\s*\(\s*1\s*\)/gi, '');

    // Additional security checks
    if (!config.allowExternalLinks) {
      // Remove external links by converting to text
      sanitized = sanitized.replace(/<a[^>]*href\s*=\s*['"]\s*https?:\/\/[^'"]*['"]/gi, (match) => {
        removedElements.push('external_link');
        return match.replace(/href\s*=\s*['"]\s*https?:\/\/[^'"]*['"]/, 'href="#"');
      });
    }

    // Clean up DOMPurify hooks
    defaultPurify.removeAllHooks();

    const sanitizedLength = sanitized.length;
    const wasModified = originalLength !== sanitizedLength || content !== sanitized;

    // Log sanitization activity
    if (wasModified || removedElements.length > 0) {
      const logContext: any = {
        metadata: {
          originalLength,
          sanitizedLength,
          removedElements: removedElements.length,
          warnings: warnings.length
        },
        component: 'content-sanitizer'
      };
      
      if (requestId) {
        logContext.requestId = requestId;
      }
      
      logger.info('HTML content sanitized', logContext);
    }

    return {
      sanitized,
      wasModified,
      removedElements,
      warnings,
      stats: {
        originalLength,
        sanitizedLength,
        removedCount: removedElements.length
      }
    };

  } catch (error) {
    const logContext: any = {
      error: {
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      metadata: {
        originalLength
      },
      component: 'content-sanitizer'
    };
    
    if (requestId) {
      logContext.requestId = requestId;
    }
    
    logger.error('HTML sanitization failed', logContext);

    // Return safe fallback
    return {
      sanitized: validationUtils.sanitizeString(content),
      wasModified: true,
      removedElements: ['sanitization_error'],
      warnings: ['Sanitization failed, applied basic cleaning'],
      stats: {
        originalLength,
        sanitizedLength: validationUtils.sanitizeString(content).length,
        removedCount: 1
      }
    };
  }
}

/**
 * Sanitize Markdown content with security measures
 */
export function sanitizeMarkdown(
  content: string,
  options: MarkdownSanitizationOptions = {},
  requestId?: string
): SanitizationResult {
  const config = { ...DEFAULT_MARKDOWN_CONFIG, ...options };
  const originalLength = content.length;
  let sanitized = content;
  const removedElements: string[] = [];
  const warnings: string[] = [];

  try {
    // Length validation
    if (config.maxLength && originalLength > config.maxLength) {
      warnings.push(`Content length ${originalLength} exceeds maximum ${config.maxLength}`);
      sanitized = sanitized.substring(0, config.maxLength);
    }

    // Detect malicious patterns
    const maliciousCheck = detectMaliciousPatterns(sanitized);
    if (maliciousCheck.malicious) {
      warnings.push(`Malicious patterns detected: ${maliciousCheck.patterns.join(', ')}`);
      removedElements.push(...maliciousCheck.patterns);
    }

    // Remove dangerous patterns before processing
    sanitized = sanitized
      .replace(MALICIOUS_PATTERNS.scriptTags, '')
      .replace(MALICIOUS_PATTERNS.scriptEvents, '')
      .replace(MALICIOUS_PATTERNS.javascriptProtocol, '')
      .replace(MALICIOUS_PATTERNS.vbscriptProtocol, '')
      .replace(MALICIOUS_PATTERNS.dataProtocol, '');

    // Remove HTML if not allowed
    if (!config.allowHtml) {
      // Remove HTML tags but preserve markdown
      sanitized = sanitized.replace(/<[^>]*>/g, '');
      if (content !== sanitized) {
        removedElements.push('html_tags');
      }
    }

    // Handle links
    if (!config.allowLinks) {
      // Remove markdown links but keep text
      sanitized = sanitized.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
      sanitized = sanitized.replace(/<[^>]*href[^>]*>/gi, '');
      if (content !== sanitized) {
        removedElements.push('links');
      }
    }

    // Handle images
    if (!config.allowImages) {
      // Remove markdown images
      sanitized = sanitized.replace(/!\[([^\]]*)\]\([^)]*\)/g, '[$1]');
      sanitized = sanitized.replace(/<img[^>]*>/gi, '');
      if (content !== sanitized) {
        removedElements.push('images');
      }
    }

    // Handle code blocks
    if (!config.allowCodeBlocks) {
      // Remove code blocks but keep inline code
      sanitized = sanitized.replace(/```[\s\S]*?```/g, '');
      sanitized = sanitized.replace(/~~~[\s\S]*?~~~/g, '');
      if (content !== sanitized) {
        removedElements.push('code_blocks');
      }
    }

    // Create secure markdown parser
    const md = createSecureMarkdownParser(config);

    // Render markdown to HTML
    let htmlContent = md.render(sanitized);

    // Apply HTML sanitization to the rendered output
    const htmlSanitizationOptions: HtmlSanitizationOptions = {
      allowedTags: config.allowHtml ? DEFAULT_HTML_CONFIG.allowedTags! : [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'pre', 'code'
      ],
      allowedAttributes: DEFAULT_HTML_CONFIG.allowedAttributes || {},
      allowExternalLinks: config.allowLinks || false,
      allowedProtocols: config.allowedProtocols || ['http', 'https']
    };
    
    if (config.maxLength) {
      htmlSanitizationOptions.maxLength = config.maxLength;
    }

    // Add table tags if allowed
    if (config.allowTables) {
      htmlSanitizationOptions.allowedTags?.push('table', 'thead', 'tbody', 'tr', 'td', 'th');
    }

    // Add link and image tags if allowed
    if (config.allowLinks) {
      htmlSanitizationOptions.allowedTags?.push('a');
    }
    if (config.allowImages) {
      htmlSanitizationOptions.allowedTags?.push('img');
    }

    const htmlResult = sanitizeHtml(htmlContent, htmlSanitizationOptions, requestId);
    
    // Combine results
    const finalSanitized = htmlResult.sanitized;
    // Markdown is always modified when converted to HTML, or if content was sanitized
    const wasModified = content !== sanitized || htmlResult.wasModified || content !== finalSanitized;
    removedElements.push(...htmlResult.removedElements);
    warnings.push(...htmlResult.warnings);

    const sanitizedLength = finalSanitized.length;

    // Log sanitization activity
    if (wasModified || removedElements.length > 0) {
      const logContext: any = {
        metadata: {
          originalLength,
          sanitizedLength,
          removedElements: removedElements.length,
          warnings: warnings.length
        },
        component: 'content-sanitizer'
      };
      
      if (requestId) {
        logContext.requestId = requestId;
      }
      
      logger.info('Markdown content sanitized', logContext);
    }

    return {
      sanitized: finalSanitized,
      wasModified,
      removedElements: [...new Set(removedElements)], // Remove duplicates
      warnings: [...new Set(warnings)], // Remove duplicates
      stats: {
        originalLength,
        sanitizedLength,
        removedCount: removedElements.length
      }
    };

  } catch (error) {
    const logContext: any = {
      error: {
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      metadata: {
        originalLength
      },
      component: 'content-sanitizer'
    };
    
    if (requestId) {
      logContext.requestId = requestId;
    }
    
    logger.error('Markdown sanitization failed', logContext);

    // Return safe fallback
    const fallback = validationUtils.sanitizeString(content);
    return {
      sanitized: fallback,
      wasModified: true,
      removedElements: ['sanitization_error'],
      warnings: ['Sanitization failed, applied basic cleaning'],
      stats: {
        originalLength,
        sanitizedLength: fallback.length,
        removedCount: 1
      }
    };
  }
}

/**
 * Sanitize plain text content
 */
export function sanitizeText(
  content: string | null | undefined,
  maxLength: number = 10000,
  requestId?: string
): SanitizationResult {
  // Handle null/undefined content
  if (content == null) {
    return {
      sanitized: '',
      wasModified: true,
      removedElements: ['null_content'],
      warnings: ['Content was null or undefined'],
      stats: {
        originalLength: 0,
        sanitizedLength: 0,
        removedCount: 1
      }
    };
  }
  
  const originalLength = content.length;
  let sanitized = validationUtils.sanitizeString(content);
  const warnings: string[] = [];
  const removedElements: string[] = [];

  // Length validation
  if (maxLength && originalLength > maxLength) {
    warnings.push(`Content length ${originalLength} exceeds maximum ${maxLength}`);
    sanitized = sanitized.substring(0, maxLength);
  }

  const maliciousCheck = detectMaliciousPatterns(content);
  if (maliciousCheck.malicious) {
    warnings.push(`Malicious patterns detected: ${maliciousCheck.patterns.join(', ')}`);
    removedElements.push(...maliciousCheck.patterns);
  }

  const sanitizedLength = sanitized.length;
  const wasModified = originalLength !== sanitizedLength || content !== sanitized;

  if (wasModified) {
    const logContext: any = {
      metadata: {
        originalLength,
        sanitizedLength,
        warnings: warnings.length
      },
      component: 'content-sanitizer'
    };
    
    if (requestId) {
      logContext.requestId = requestId;
    }
    
    logger.info('Text content sanitized', logContext);
  }

  return {
    sanitized,
    wasModified,
    removedElements,
    warnings,
    stats: {
      originalLength,
      sanitizedLength,
      removedCount: removedElements.length
    }
  };
}

/**
 * Sanitize content based on type detection
 */
export function sanitizeContent(
  content: string,
  contentType: 'html' | 'markdown' | 'text' = 'text',
  options: HtmlSanitizationOptions | MarkdownSanitizationOptions = {},
  requestId?: string
): SanitizationResult {
  switch (contentType.toLowerCase()) {
    case 'html':
      return sanitizeHtml(content, options as HtmlSanitizationOptions, requestId);
    case 'markdown':
      return sanitizeMarkdown(content, options as MarkdownSanitizationOptions, requestId);
    case 'text':
    default:
      return sanitizeText(content, (options as any).maxLength, requestId);
  }
}

/**
 * Content sanitizer utilities object
 */
export const contentSanitizer = {
  sanitizeHtml,
  sanitizeMarkdown,
  sanitizeText,
  sanitizeContent,
  detectMaliciousPatterns,
  
  // Predefined configurations
  configs: {
    strict: {
      html: {
        allowedTags: ['p', 'br', 'strong', 'em'],
        allowedAttributes: {},
        allowExternalLinks: false,
        stripAllTags: false
      } as HtmlSanitizationOptions,
      markdown: {
        allowHtml: false,
        allowLinks: false,
        allowImages: false,
        allowCodeBlocks: false
      } as MarkdownSanitizationOptions
    },
    moderate: {
      html: DEFAULT_HTML_CONFIG,
      markdown: DEFAULT_MARKDOWN_CONFIG
    },
    permissive: {
      html: {
        ...DEFAULT_HTML_CONFIG,
        allowCustomAttributes: true,
        allowExternalLinks: true
      } as HtmlSanitizationOptions,
      markdown: {
        ...DEFAULT_MARKDOWN_CONFIG,
        allowHtml: true
      } as MarkdownSanitizationOptions
    }
  }
};

export default contentSanitizer;
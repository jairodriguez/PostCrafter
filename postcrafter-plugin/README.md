# PostCrafter SEO Integration Plugin

## Description
This WordPress plugin enables AI-generated, SEO-optimized articles to be published directly from ChatGPT to WordPress with comprehensive Yoast SEO and RankMath integration.

## Features
- **Direct ChatGPT Integration**: Publish posts directly from ChatGPT via REST API
- **SEO Optimization**: Full Yoast SEO meta field support (meta title, meta description, focus keywords)
- **Category & Tag Management**: Automatic creation and assignment of categories and tags
- **Health Check Endpoint**: Monitor plugin status and WordPress compatibility
- **Secure API**: Built-in permission checking and data sanitization

## Installation
1. Upload the plugin files to `/wp-content/plugins/postcrafter-seo-integration/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. The plugin will automatically expose REST API endpoints for PostCrafter

## API Endpoints

### Publish Post
- **URL**: `/wp-json/postcrafter/v1/publish`
- **Method**: POST
- **Authentication**: None (can be configured)

**Request Body:**
```json
{
  "title": "Your Post Title",
  "content": "<p>Your post content in HTML format</p>",
  "excerpt": "Optional post excerpt",
  "status": "publish",
  "categories": ["Technology", "AI"],
  "tags": ["content-creation", "seo"],
  "yoast_meta": {
    "meta_title": "SEO Optimized Title",
    "meta_description": "SEO meta description",
    "focus_keyword": "primary keyword"
  }
}
```

### Health Check
- **URL**: `/wp-json/postcrafter/v1/health`
- **Method**: GET
- **Authentication**: None

## Requirements
- WordPress 5.0+
- PHP 7.4+
- Yoast SEO plugin (optional, for enhanced SEO features)

## Support
For support and documentation, visit: https://braindump.guru

## Version
1.0.0 
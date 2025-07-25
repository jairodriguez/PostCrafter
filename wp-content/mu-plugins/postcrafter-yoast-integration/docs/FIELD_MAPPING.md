# PostCrafter SEO Field Mapping Documentation

This document outlines the field mapping between different SEO plugins (Yoast SEO and RankMath SEO) and the universal REST API structure used by PostCrafter.

## Overview

PostCrafter provides a unified REST API interface that works with both Yoast SEO and RankMath SEO plugins. This abstraction layer allows developers to use consistent field names regardless of which SEO plugin is active on the WordPress site.

## Universal API Field Names

The following field names are used in the REST API and are automatically mapped to the appropriate SEO plugin:

### Basic SEO Fields

| API Field Name | Description | Type | Yoast Meta Key | RankMath Meta Key |
|----------------|-------------|------|----------------|-------------------|
| `seo_meta_title` | SEO title for search engines | string | `_yoast_wpseo_title` | `rank_math_title` |
| `seo_meta_description` | Meta description for search engines | string | `_yoast_wpseo_metadesc` | `rank_math_description` |
| `seo_focus_keywords` | Primary focus keyword(s) | string | `_yoast_wpseo_focuskw` | `rank_math_focus_keyword` |

### Robots Meta Fields

| API Field Name | Description | Type | Yoast Meta Key | RankMath Meta Key |
|----------------|-------------|------|----------------|-------------------|
| `seo_robots_noindex` | Prevent search engine indexing | boolean | `_yoast_wpseo_meta-robots-noindex` | `rank_math_robots` (array) |
| `seo_robots_nofollow` | Prevent following links | boolean | `_yoast_wpseo_meta-robots-nofollow` | `rank_math_robots` (array) |

### URL and Linking Fields

| API Field Name | Description | Type | Yoast Meta Key | RankMath Meta Key |
|----------------|-------------|------|----------------|-------------------|
| `seo_canonical` | Canonical URL | string | `_yoast_wpseo_canonical` | `rank_math_canonical_url` |
| `seo_primary_category` | Primary category ID | integer | `_yoast_wpseo_primary_category` | `rank_math_primary_category` |

### Social Media Fields

| API Field Name | Description | Type | Yoast Meta Key | RankMath Meta Key |
|----------------|-------------|------|----------------|-------------------|
| `seo_opengraph_title` | Facebook/OpenGraph title | string | `_yoast_wpseo_opengraph-title` | `rank_math_facebook_title` |
| `seo_opengraph_description` | Facebook/OpenGraph description | string | `_yoast_wpseo_opengraph-description` | `rank_math_facebook_description` |
| `seo_opengraph_image` | Facebook/OpenGraph image URL | string | `_yoast_wpseo_opengraph-image` | `rank_math_facebook_image` |
| `seo_twitter_title` | Twitter card title | string | `_yoast_wpseo_twitter-title` | `rank_math_twitter_title` |
| `seo_twitter_description` | Twitter card description | string | `_yoast_wpseo_twitter-description` | `rank_math_twitter_description` |
| `seo_twitter_image` | Twitter card image URL | string | `_yoast_wpseo_twitter-image` | `rank_math_twitter_image` |

## Legacy Compatibility

For backward compatibility, the original Yoast-specific field names are still supported:

| Legacy Field Name | Universal Field Name | Status |
|-------------------|---------------------|---------|
| `yoast_meta_title` | `seo_meta_title` | ✅ Supported |
| `yoast_meta_description` | `seo_meta_description` | ✅ Supported |
| `yoast_focus_keywords` | `seo_focus_keywords` | ✅ Supported |

## RankMath-Specific Fields

RankMath offers additional fields that don't have direct Yoast equivalents:

### Advanced SEO Fields

| Field Name | Meta Key | Description | Type |
|------------|----------|-------------|------|
| `rankmath_breadcrumbs_title` | `rank_math_breadcrumb_title` | Custom breadcrumb title | string |
| `rankmath_pillar_content` | `rank_math_pillar_content` | Mark as pillar content | boolean |
| `rankmath_twitter_card_type` | `rank_math_twitter_card_type` | Twitter card type | string |

### Schema Markup Fields

| Field Name | Meta Key | Description | Type |
|------------|----------|-------------|------|
| `rankmath_schema_type` | `rank_math_rich_snippet` | Schema.org type | string |
| `rankmath_schema_article_type` | `rank_math_snippet_article_type` | Article schema type | string |

### Product/Review Fields (WooCommerce)

| Field Name | Meta Key | Description | Type |
|------------|----------|-------------|------|
| `rankmath_product_brand` | `rank_math_snippet_product_brand` | Product brand | string |
| `rankmath_product_sku` | `rank_math_snippet_product_sku` | Product SKU | string |
| `rankmath_review_rating` | `rank_math_snippet_review_rating_value` | Review rating value | number |

## Field Type Mappings

### Data Type Conversions

Different SEO plugins store the same logical data in different formats:

#### Robots Meta (noindex/nofollow)

**Yoast SEO:**
```php
// Stored as separate boolean values
_yoast_wpseo_meta-robots-noindex: "1" or ""
_yoast_wpseo_meta-robots-nofollow: "1" or ""
```

**RankMath:**
```php
// Stored as array of robots values
rank_math_robots: ["noindex", "nofollow"]
```

**Universal API:**
```json
{
  "seo_robots_noindex": true,
  "seo_robots_nofollow": false
}
```

#### Image Fields

**Yoast SEO:**
```php
// Direct URL storage
_yoast_wpseo_opengraph-image: "https://example.com/image.jpg"
```

**RankMath:**
```php
// Uses attachment ID with fallback to URL
rank_math_facebook_image_id: "123"
rank_math_facebook_image: "https://example.com/image.jpg"
```

**Universal API:**
```json
{
  "seo_opengraph_image": "https://example.com/image.jpg"
}
```

## REST API Usage Examples

### Creating a Post with SEO Data

```http
POST /wp-json/wp/v2/posts
Content-Type: application/json

{
  "title": "My Blog Post",
  "content": "Post content here...",
  "status": "publish",
  "seo_meta_title": "Optimized SEO Title",
  "seo_meta_description": "Optimized meta description for search engines",
  "seo_focus_keywords": "primary keyword",
  "seo_canonical": "https://example.com/canonical-url",
  "seo_robots_noindex": false,
  "seo_robots_nofollow": false
}
```

### Updating SEO Data Only

```http
PUT /wp-json/wp/v2/posts/123
Content-Type: application/json

{
  "seo_meta_title": "Updated SEO Title",
  "seo_meta_description": "Updated meta description",
  "seo_opengraph_title": "Social Media Title",
  "seo_twitter_title": "Twitter Title"
}
```

### Retrieving Post with SEO Data

```http
GET /wp-json/wp/v2/posts/123
```

Response includes:
```json
{
  "id": 123,
  "title": {"rendered": "My Blog Post"},
  "content": {"rendered": "Post content..."},
  "seo_meta_title": "Optimized SEO Title",
  "seo_meta_description": "Optimized meta description",
  "seo_focus_keywords": "primary keyword",
  "seo_canonical": "https://example.com/canonical-url",
  "seo_robots_noindex": false,
  "seo_robots_nofollow": false,
  "yoast_meta_title": "Optimized SEO Title",
  "yoast_meta_description": "Optimized meta description",
  "yoast_focus_keywords": "primary keyword"
}
```

## Plugin Detection and Field Mapping

The PostCrafter SEO integration automatically detects which SEO plugin is active and maps fields accordingly:

### Detection Priority

1. **Both plugins active**: RankMath takes priority (configurable)
2. **Single plugin active**: Uses detected plugin
3. **No plugin active**: Returns empty values

### Field Mapping Process

1. **API Request** → Universal field names (e.g., `seo_meta_title`)
2. **Plugin Detection** → Determines active SEO plugin
3. **Field Mapping** → Maps to plugin-specific meta keys
4. **Data Processing** → Converts between data formats if needed
5. **Storage/Retrieval** → Uses native plugin meta keys

## Validation and Sanitization

All fields undergo validation and sanitization regardless of the SEO plugin:

### Title Fields
- Maximum length: 60 characters (recommended)
- HTML tags: Stripped
- Special characters: Escaped

### Description Fields
- Maximum length: 160 characters (recommended)
- HTML tags: Stripped (except basic formatting)
- Line breaks: Converted to spaces

### URL Fields
- Format validation: Must be valid URL
- Protocol: HTTPS preferred
- Sanitization: WordPress `sanitize_url()`

### Keywords
- Format: Comma-separated list
- Validation: Non-empty, reasonable length
- Sanitization: Trim whitespace, remove duplicates

## Error Handling

### Validation Errors

```json
{
  "code": "rest_invalid_param",
  "message": "Invalid parameter(s): seo_meta_title",
  "data": {
    "status": 400,
    "params": {
      "seo_meta_title": "Title exceeds maximum length of 60 characters"
    }
  }
}
```

### Plugin Compatibility Errors

```json
{
  "code": "seo_plugin_not_supported",
  "message": "No supported SEO plugin detected",
  "data": {
    "status": 424,
    "supported_plugins": ["Yoast SEO", "RankMath SEO"],
    "detected_plugins": []
  }
}
```

## Migration Between Plugins

When switching between SEO plugins, PostCrafter can help migrate data:

### Yoast to RankMath

```php
// Example migration script
$yoast_title = get_post_meta($post_id, '_yoast_wpseo_title', true);
if ($yoast_title) {
    update_post_meta($post_id, 'rank_math_title', $yoast_title);
}
```

### Field Mapping Equivalencies

| Yoast Meta Key | RankMath Meta Key | Notes |
|---------------|-------------------|-------|
| `_yoast_wpseo_title` | `rank_math_title` | Direct mapping |
| `_yoast_wpseo_metadesc` | `rank_math_description` | Direct mapping |
| `_yoast_wpseo_focuskw` | `rank_math_focus_keyword` | Direct mapping |
| `_yoast_wpseo_canonical` | `rank_math_canonical_url` | Direct mapping |
| `_yoast_wpseo_meta-robots-noindex` | `rank_math_robots` | Boolean to array conversion |
| `_yoast_wpseo_opengraph-title` | `rank_math_facebook_title` | Direct mapping |

## Best Practices

### API Usage

1. **Always use universal field names** (`seo_*`) in new integrations
2. **Check plugin detection status** before making assumptions
3. **Handle validation errors gracefully** with user-friendly messages
4. **Use batch operations** for bulk updates to minimize API calls

### Performance

1. **Cache detection results** to avoid repeated plugin checks
2. **Use selective field updates** rather than full post updates
3. **Monitor field validation** to catch issues early

### Compatibility

1. **Test with both plugins** during development
2. **Use feature detection** rather than plugin-specific code
3. **Implement fallback behavior** for unsupported fields
4. **Keep legacy field support** for backward compatibility

## Troubleshooting

### Common Issues

**Issue**: Fields not saving
- **Check**: Plugin detection status
- **Check**: User permissions
- **Check**: Field validation errors

**Issue**: Inconsistent data between plugins
- **Check**: Data type conversions
- **Check**: Field mapping accuracy
- **Check**: Plugin-specific storage formats

**Issue**: Performance problems
- **Check**: Detection result caching
- **Check**: Unnecessary API calls
- **Check**: Validation complexity

### Debug Information

Enable debug mode by adding to `wp-config.php`:

```php
define('POSTCRAFTER_SEO_DEBUG', true);
```

This will log field mapping operations and validation results for troubleshooting.
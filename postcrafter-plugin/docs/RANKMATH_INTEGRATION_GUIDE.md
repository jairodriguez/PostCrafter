# PostCrafter RankMath Integration Guide

Complete integration guide for using PostCrafter with RankMath SEO plugin.

## Overview

PostCrafter now provides comprehensive support for RankMath SEO, offering the same powerful features available for Yoast SEO. This integration enables seamless SEO management through the PostCrafter REST API, regardless of which SEO plugin you choose.

## Features

### ✅ Full RankMath Support
- **Automatic Detection**: Intelligent detection of RankMath SEO plugin
- **Universal API**: Consistent API interface for both Yoast and RankMath
- **Field Mapping**: Complete mapping of RankMath fields to PostCrafter API
- **Data Conversion**: Seamless conversion between plugin formats
- **Backward Compatibility**: Existing Yoast integrations continue working

### 🔄 Dual Plugin Support
- **Plugin Auto-Detection**: Automatically detects which SEO plugin is active
- **Primary Plugin Selection**: Intelligent selection of primary plugin when both are active
- **Unified API**: Single API interface that works with both plugins
- **Migration Support**: Tools for migrating between Yoast and RankMath

### 📊 Advanced Features
- **Plugin-Specific Fields**: Access to unique RankMath features
- **Data Normalization**: Consistent data format across plugins
- **Migration Reports**: Detailed analysis for plugin transitions
- **Version Compatibility**: Support for multiple RankMath versions

## Prerequisites

### WordPress Requirements
- WordPress 5.0 or higher (recommended: 6.0+)
- PHP 7.4 or higher (recommended: 8.0+)
- MySQL 5.6 or higher

### Plugin Requirements
- **RankMath SEO**: Version 1.0.40 or higher (recommended: 1.0.46+)
- **PostCrafter SEO Integration**: Version 1.1.0 or higher

### Optional
- **Yoast SEO**: If running both plugins simultaneously

## Installation and Setup

### Step 1: Install RankMath SEO

1. **Via WordPress Admin:**
   ```
   Plugins → Add New → Search "RankMath" → Install → Activate
   ```

2. **Via Composer:**
   ```bash
   composer require rankmath/seo-by-rank-math
   ```

### Step 2: Configure RankMath

1. **Run Setup Wizard:**
   - Navigate to `RankMath → Setup Wizard`
   - Complete the configuration steps
   - Choose your SEO settings

2. **Basic Configuration:**
   ```php
   // Ensure RankMath is properly configured
   if (function_exists('rank_math')) {
       // RankMath is active and ready
   }
   ```

### Step 3: Verify PostCrafter Integration

1. **Check Plugin Detection:**
   ```http
   GET /wp-json/postcrafter/v1/seo-status
   ```

   **Expected Response:**
   ```json
   {
     "success": true,
     "primary_plugin": "rankmath",
     "detected_plugins": {
       "rankmath": {
         "active": true,
         "supported": true,
         "version": "1.0.46"
       }
     }
   }
   ```

2. **Test API Endpoints:**
   ```http
   GET /wp-json/postcrafter/v1/seo-fields/123
   ```

## API Reference

### Universal Endpoints (Work with Both Plugins)

#### Get SEO Fields
```http
GET /wp-json/postcrafter/v1/seo-fields/{post_id}
```

**Example Response with RankMath:**
```json
{
  "plugin_detected": "rankmath",
  "fields": {
    "meta_title": "My Awesome Post Title",
    "meta_description": "Comprehensive description of the post content...",
    "focus_keywords": "rankmath, seo, wordpress",
    "canonical": "https://example.com/my-awesome-post",
    "robots_noindex": false,
    "robots_nofollow": false,
    "opengraph_title": "Social Media Title",
    "opengraph_description": "Social media description...",
    "twitter_title": "Twitter Title",
    "twitter_description": "Twitter description...",
    "pillar_content": true,
    "breadcrumb_title": "Custom Breadcrumb"
  },
  "detection_info": {
    "primary_plugin": "rankmath",
    "version": "1.0.46",
    "supported": true
  }
}
```

#### Update SEO Fields
```http
POST /wp-json/postcrafter/v1/seo-fields/{post_id}
Content-Type: application/json

{
  "meta_title": "Updated Post Title",
  "meta_description": "Updated meta description for better SEO...",
  "focus_keywords": "updated, keywords, seo",
  "robots_noindex": false,
  "canonical": "https://example.com/updated-post"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "SEO fields updated successfully",
  "plugin_used": "rankmath",
  "update_results": {
    "meta_title": true,
    "meta_description": true,
    "focus_keywords": true,
    "robots_noindex": true,
    "canonical": true
  },
  "data": {
    "meta_title": "Updated Post Title",
    "meta_description": "Updated meta description for better SEO...",
    "focus_keywords": "updated, keywords, seo"
  }
}
```

### RankMath-Specific Endpoints

#### Get RankMath Fields
```http
GET /wp-json/postcrafter/v1/rankmath-fields/{post_id}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "meta_title": "RankMath Optimized Title",
    "meta_description": "SEO description optimized for RankMath...",
    "focus_keywords": "rankmath, optimization",
    "pillar_content": true,
    "breadcrumbs_title": "Custom Breadcrumb Title",
    "twitter_card_type": "summary_large_image",
    "schema_type": "Article",
    "advanced_robots": ["noimageindex", "noarchive"],
    "internal_links_processed": true
  }
}
```

#### Update RankMath Fields
```http
POST /wp-json/postcrafter/v1/rankmath-fields/{post_id}
Content-Type: application/json

{
  "meta_title": "New RankMath Title",
  "pillar_content": true,
  "breadcrumbs_title": "Custom Breadcrumb",
  "twitter_card_type": "summary"
}
```

### WordPress Posts Endpoint Enhancement

#### Get Post with SEO Fields
```http
GET /wp-json/wp/v2/posts/{post_id}?include_seo_fields=true
```

**Example Response:**
```json
{
  "id": 123,
  "title": {"rendered": "My Post Title"},
  "content": {"rendered": "Post content..."},
  "seo_fields": {
    "meta_title": "SEO Title",
    "meta_description": "SEO description...",
    "focus_keywords": "keywords",
    "pillar_content": true
  },
  "seo_plugin_detected": "rankmath",
  "rankmath_fields": {
    "meta_title": "SEO Title",
    "pillar_content": true,
    "breadcrumbs_title": "Breadcrumb"
  }
}
```

## RankMath Field Mapping

### Core SEO Fields

| API Field | RankMath Meta Key | Description | Type |
|-----------|-------------------|-------------|------|
| `seo_meta_title` | `rank_math_title` | SEO page title | string |
| `seo_meta_description` | `rank_math_description` | Meta description | string |
| `seo_focus_keywords` | `rank_math_focus_keyword` | Primary focus keyword | string |
| `seo_canonical` | `rank_math_canonical_url` | Canonical URL | string |
| `seo_robots_noindex` | `rank_math_robots` | Robots noindex (array) | boolean |
| `seo_robots_nofollow` | `rank_math_robots` | Robots nofollow (array) | boolean |

### Social Media Fields

| API Field | RankMath Meta Key | Description | Type |
|-----------|-------------------|-------------|------|
| `seo_opengraph_title` | `rank_math_facebook_title` | OpenGraph title | string |
| `seo_opengraph_description` | `rank_math_facebook_description` | OpenGraph description | string |
| `seo_opengraph_image` | `rank_math_facebook_image` | OpenGraph image | string |
| `seo_twitter_title` | `rank_math_twitter_title` | Twitter title | string |
| `seo_twitter_description` | `rank_math_twitter_description` | Twitter description | string |
| `seo_twitter_image` | `rank_math_twitter_image` | Twitter image | string |

### RankMath-Specific Fields

| API Field | RankMath Meta Key | Description | Type |
|-----------|-------------------|-------------|------|
| `rankmath_pillar_content` | `rank_math_pillar_content` | Pillar content flag | boolean |
| `rankmath_breadcrumbs_title` | `rank_math_breadcrumb_title` | Custom breadcrumb title | string |
| `rankmath_twitter_card_type` | `rank_math_twitter_card_type` | Twitter card type | string |
| `rankmath_schema_type` | `rank_math_rich_snippet` | Schema markup type | string |
| `rankmath_advanced_robots` | `rank_math_advanced_robots` | Advanced robots settings | array |

## Data Type Conversions

### Robots Meta Fields

RankMath stores robots meta as an array, while the API provides boolean values:

**RankMath Storage:**
```php
rank_math_robots: ["noindex", "nofollow", "noarchive"]
```

**API Response:**
```json
{
  "seo_robots_noindex": true,
  "seo_robots_nofollow": true,
  "seo_robots_noarchive": true
}
```

**API Update:**
```json
{
  "seo_robots_noindex": false,
  "seo_robots_nofollow": true
}
```

### Image Fields

Images can be provided as URLs or attachment IDs:

**Input (URL):**
```json
{
  "seo_opengraph_image": "https://example.com/image.jpg"
}
```

**Input (Attachment ID):**
```json
{
  "seo_opengraph_image": 123
}
```

**Processing:**
- URLs are validated and sanitized
- Attachment IDs are converted to URLs
- Invalid values are rejected

### Schema Types

RankMath supports various schema types:

**Common Values:**
- `Article`
- `BlogPosting`
- `Product`
- `Review`
- `Course`
- `Recipe`
- `Event`

**Example:**
```json
{
  "rankmath_schema_type": "Article",
  "rankmath_article_type": "BlogPosting"
}
```

## Migration from Yoast

### Migration Process

1. **Generate Migration Report:**
   ```php
   $converter = new PostCrafter_SEO_Data_Converter();
   $report = $converter->create_migration_report($post_id, 'yoast', 'rankmath');
   ```

2. **Review Potential Data Loss:**
   ```php
   foreach ($report['potential_data_loss'] as $loss) {
       echo "Field: {$loss['field']} - Reason: {$loss['reason']}\n";
   }
   ```

3. **Perform Migration:**
   ```php
   $result = $converter->convert_between_plugins($post_id, 'yoast', 'rankmath');
   
   if ($result['success']) {
       echo "Migrated {$result['summary']['successfully_converted']} fields\n";
   }
   ```

4. **Validate Migration:**
   ```php
   $validation = $converter->validate_conversion_integrity($post_id, $result);
   
   if (!$validation['is_valid']) {
       foreach ($validation['errors'] as $error) {
           echo "Error: $error\n";
       }
   }
   ```

### Field Mapping During Migration

| Yoast Field | RankMath Field | Notes |
|-------------|----------------|-------|
| `_yoast_wpseo_title` | `rank_math_title` | Direct mapping |
| `_yoast_wpseo_metadesc` | `rank_math_description` | Direct mapping |
| `_yoast_wpseo_focuskw` | `rank_math_focus_keyword` | Direct mapping |
| `_yoast_wpseo_meta-robots-noindex` | `rank_math_robots` | Boolean to array |
| `_yoast_wpseo_canonical` | `rank_math_canonical_url` | Direct mapping |
| `_yoast_wpseo_opengraph-title` | `rank_math_facebook_title` | Direct mapping |
| `_yoast_wpseo_twitter-title` | `rank_math_twitter_title` | Direct mapping |

### Yoast-Only Fields (No RankMath Equivalent)

- `_yoast_wpseo_linkdex` (SEO Score)
- `_yoast_wpseo_content_score` (Content Score)
- `_yoast_wpseo_keyword_synonyms` (Keyword Synonyms)

### RankMath-Only Fields (No Yoast Equivalent)

- `rank_math_pillar_content` (Pillar Content Flag)
- `rank_math_twitter_card_type` (Twitter Card Type)
- `rank_math_internal_links_processed` (Internal Links)

## Code Examples

### Basic Usage

```php
// Initialize the SEO integration
$seo_integration = new PostCrafter_SEO_Integration();

// Check which plugin is active
if ($seo_integration->detector->get_primary_plugin() === 'rankmath') {
    echo "RankMath is the primary SEO plugin\n";
}

// Get SEO data for a post
$post_id = 123;
$seo_data = $seo_integration->get_seo_meta_title($post_id);
echo "SEO Title: $seo_data\n";
```

### REST API Integration

```javascript
// JavaScript example for updating SEO fields
const updateSEOFields = async (postId, fields) => {
  const response = await fetch(`/wp-json/postcrafter/v1/seo-fields/${postId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-WP-Nonce': wpApiSettings.nonce
    },
    body: JSON.stringify(fields)
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('SEO fields updated successfully');
    console.log('Plugin used:', result.plugin_used);
  } else {
    console.error('Update failed:', result.message);
  }
};

// Usage
updateSEOFields(123, {
  meta_title: 'New SEO Title',
  meta_description: 'Updated meta description',
  focus_keywords: 'javascript, api, seo'
});
```

### Plugin Detection

```php
// Check if RankMath is active and supported
$detector = new PostCrafter_SEO_Plugin_Detector();

if ($detector->is_plugin_active_and_supported('rankmath')) {
    $version = $detector->get_plugin_version('rankmath');
    echo "RankMath version $version is active and supported\n";
} else {
    echo "RankMath is not available\n";
}

// Get all detection results
$results = $detector->get_api_detection_results();
foreach ($results as $plugin => $info) {
    echo "$plugin: " . ($info['supported'] ? 'Supported' : 'Not supported') . "\n";
}
```

### Data Conversion

```php
// Convert data between plugins
$converter = new PostCrafter_SEO_Data_Converter();

// Get normalized data (works with any plugin)
$normalized = $converter->get_normalized_data($post_id);
echo "Title: " . $normalized['meta_title'] . "\n";
echo "Plugin: " . $normalized['plugin_detected'] . "\n";

// Convert specific post from Yoast to RankMath
$conversion_result = $converter->convert_between_plugins(
    $post_id,
    'yoast',
    'rankmath'
);

if ($conversion_result['success']) {
    echo "Converted {$conversion_result['summary']['successfully_converted']} fields\n";
}
```

## Testing and Validation

### Plugin Detection Tests

```php
// Test RankMath detection
$detector = new PostCrafter_SEO_Plugin_Detector();

// Test active plugin detection
assert($detector->is_plugin_active('rankmath') === true);

// Test version support
assert($detector->is_version_supported('rankmath', '1.0.46') === true);

// Test primary plugin selection
assert($detector->get_primary_plugin() === 'rankmath');
```

### Field Mapping Tests

```php
// Test field mapping
$field_handler = new PostCrafter_RankMath_Field_Handler();

// Test title field
$post_id = 123;
update_post_meta($post_id, 'rank_math_title', 'Test Title');
$title = $field_handler->get_rankmath_meta_title($post_id);
assert($title === 'Test Title');

// Test robots field (array format)
$field_handler->set_rankmath_meta_robots_noindex($post_id, true);
$robots = get_post_meta($post_id, 'rank_math_robots', true);
assert(in_array('noindex', $robots));
```

### REST API Tests

```bash
# Test plugin detection endpoint
curl -X GET "https://example.com/wp-json/postcrafter/v1/seo-status" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test getting SEO fields
curl -X GET "https://example.com/wp-json/postcrafter/v1/seo-fields/123" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test updating SEO fields
curl -X POST "https://example.com/wp-json/postcrafter/v1/seo-fields/123" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "meta_title": "API Test Title",
    "meta_description": "Test description via API"
  }'
```

## Troubleshooting

### Common Issues

#### 1. RankMath Not Detected

**Symptoms:**
- API returns "No supported SEO plugin detected"
- Plugin detection shows RankMath as inactive

**Solutions:**
```php
// Check if RankMath is properly activated
if (!function_exists('rank_math')) {
    echo "RankMath plugin is not active\n";
    // Activate RankMath plugin
}

// Check version compatibility
$version = defined('RANK_MATH_VERSION') ? RANK_MATH_VERSION : 'unknown';
if (version_compare($version, '1.0.40', '<')) {
    echo "RankMath version $version is not supported. Please upgrade to 1.0.40+\n";
}
```

#### 2. Field Updates Not Saving

**Symptoms:**
- API returns success but fields don't update
- RankMath interface shows old values

**Solutions:**
```php
// Clear RankMath cache
if (function_exists('rank_math_clear_cache')) {
    rank_math_clear_cache();
}

// Verify field mapping
$field_handler = new PostCrafter_RankMath_Field_Handler();
$meta_key = $field_handler->get_meta_key('title');
echo "Title meta key: $meta_key\n";

// Check post meta directly
$value = get_post_meta($post_id, 'rank_math_title', true);
echo "Stored value: $value\n";
```

#### 3. Robots Meta Not Converting

**Symptoms:**
- Boolean robots values not converting to array
- RankMath shows incorrect robots settings

**Solutions:**
```php
// Check robots array format
$robots = get_post_meta($post_id, 'rank_math_robots', true);
if (!is_array($robots)) {
    // Fix corrupted robots data
    update_post_meta($post_id, 'rank_math_robots', array());
}

// Test robots conversion
$field_handler = new PostCrafter_RankMath_Field_Handler();
$field_handler->set_rankmath_meta_robots_noindex($post_id, true);

$robots = get_post_meta($post_id, 'rank_math_robots', true);
assert(in_array('noindex', $robots));
```

#### 4. Migration Issues

**Symptoms:**
- Conversion fails between plugins
- Data loss during migration

**Solutions:**
```php
// Generate migration report first
$converter = new PostCrafter_SEO_Data_Converter();
$report = $converter->create_migration_report($post_id, 'yoast', 'rankmath');

// Check for potential issues
if (!empty($report['potential_data_loss'])) {
    echo "Warning: The following fields will be lost:\n";
    foreach ($report['potential_data_loss'] as $loss) {
        echo "- {$loss['field']}: {$loss['reason']}\n";
    }
}

// Validate after conversion
$result = $converter->convert_between_plugins($post_id, 'yoast', 'rankmath');
$validation = $converter->validate_conversion_integrity($post_id, $result);

if (!$validation['is_valid']) {
    echo "Validation failed:\n";
    foreach ($validation['errors'] as $error) {
        echo "- $error\n";
    }
}
```

### Debug Mode

Enable debug logging for detailed troubleshooting:

```php
// Enable WordPress debug logging
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);

// Enable PostCrafter debug mode
define('POSTCRAFTER_SEO_DEBUG', true);

// Check debug logs
tail -f /wp-content/debug.log
```

### Performance Issues

#### 1. Slow API Responses

**Solutions:**
```php
// Enable object caching
wp_cache_set('seo_data_' . $post_id, $seo_data, 'postcrafter', 300);

// Clear conversion cache periodically
$converter = new PostCrafter_SEO_Data_Converter();
$converter->clear_conversion_cache();

// Optimize database queries
// Use get_post_meta with single=true for individual fields
$title = get_post_meta($post_id, 'rank_math_title', true);
```

#### 2. Memory Issues During Bulk Operations

**Solutions:**
```php
// Process in batches
$posts = get_posts(['numberposts' => 100]);
foreach (array_chunk($posts, 10) as $batch) {
    foreach ($batch as $post) {
        // Process post
        $converter->convert_between_plugins($post->ID, 'yoast', 'rankmath');
    }
    
    // Clear memory
    wp_cache_flush();
    if (function_exists('gc_collect_cycles')) {
        gc_collect_cycles();
    }
}
```

## Version Compatibility

### RankMath Versions

| RankMath Version | PostCrafter Support | Notes |
|------------------|-------------------|-------|
| 1.0.46+ | Full Support | Recommended version |
| 1.0.40 - 1.0.45 | Basic Support | Some features may be limited |
| < 1.0.40 | Not Supported | Please upgrade |

### WordPress Versions

| WordPress Version | Compatibility | Notes |
|------------------|---------------|-------|
| 6.0+ | Full Support | Recommended |
| 5.5 - 5.9 | Compatible | Basic testing done |
| 5.0 - 5.4 | Limited Support | May have issues |
| < 5.0 | Not Supported | Please upgrade |

### PHP Versions

| PHP Version | Compatibility | Notes |
|-------------|---------------|-------|
| 8.1+ | Full Support | Recommended |
| 8.0 | Full Support | Well tested |
| 7.4 | Compatible | Minimum supported |
| < 7.4 | Not Supported | Please upgrade |

## Best Practices

### 1. Plugin Detection

Always check plugin availability before making API calls:

```php
$detector = new PostCrafter_SEO_Plugin_Detector();
if (!$detector->has_supported_seo_plugin()) {
    return new WP_Error('no_seo_plugin', 'No supported SEO plugin detected');
}
```

### 2. Error Handling

Implement proper error handling for API calls:

```javascript
const updateSEOFields = async (postId, fields) => {
  try {
    const response = await fetch(`/wp-json/postcrafter/v1/seo-fields/${postId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': wpApiSettings.nonce
      },
      body: JSON.stringify(fields)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Update failed');
    }
    
    return result;
  } catch (error) {
    console.error('SEO update failed:', error);
    throw error;
  }
};
```

### 3. Data Validation

Always validate data before sending to the API:

```php
function validate_seo_fields($fields) {
    $errors = array();
    
    // Validate meta title length
    if (isset($fields['meta_title']) && strlen($fields['meta_title']) > 60) {
        $errors[] = 'Meta title should be 60 characters or less';
    }
    
    // Validate meta description length
    if (isset($fields['meta_description']) && strlen($fields['meta_description']) > 155) {
        $errors[] = 'Meta description should be 155 characters or less';
    }
    
    // Validate canonical URL
    if (isset($fields['canonical']) && !filter_var($fields['canonical'], FILTER_VALIDATE_URL)) {
        $errors[] = 'Invalid canonical URL format';
    }
    
    return $errors;
}
```

### 4. Caching

Implement intelligent caching for better performance:

```php
function get_cached_seo_data($post_id) {
    $cache_key = "seo_data_{$post_id}";
    $cached = wp_cache_get($cache_key, 'postcrafter');
    
    if ($cached !== false) {
        return $cached;
    }
    
    // Get fresh data
    $converter = new PostCrafter_SEO_Data_Converter();
    $data = $converter->get_normalized_data($post_id);
    
    // Cache for 5 minutes
    wp_cache_set($cache_key, $data, 'postcrafter', 300);
    
    return $data;
}
```

### 5. Batch Operations

For bulk operations, use batch processing:

```php
function bulk_update_seo_fields($posts_data) {
    $results = array();
    $batch_size = 10;
    
    foreach (array_chunk($posts_data, $batch_size) as $batch) {
        foreach ($batch as $post_data) {
            $result = update_seo_fields($post_data['id'], $post_data['fields']);
            $results[] = $result;
        }
        
        // Brief pause between batches
        usleep(100000); // 0.1 seconds
        
        // Clear caches
        wp_cache_flush();
    }
    
    return $results;
}
```

## Support and Resources

### Documentation Links
- [RankMath Documentation](https://rankmath.com/kb/)
- [WordPress REST API Handbook](https://developer.wordpress.org/rest-api/)
- [PostCrafter API Reference](./API_REFERENCE.md)

### Community Support
- [PostCrafter Support Forum](https://example.com/support)
- [RankMath Community](https://support.rankmath.com/)
- [WordPress Support Forums](https://wordpress.org/support/)

### Development Resources
- [GitHub Repository](https://github.com/example/postcrafter-seo)
- [Issue Tracker](https://github.com/example/postcrafter-seo/issues)
- [Contributing Guidelines](./CONTRIBUTING.md)

This comprehensive guide covers all aspects of the PostCrafter RankMath integration. For additional help or specific questions, please refer to the support resources above.
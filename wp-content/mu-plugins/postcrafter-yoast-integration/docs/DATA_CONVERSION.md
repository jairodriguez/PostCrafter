# PostCrafter SEO Data Conversion Guide

This document provides comprehensive information about the data conversion functionality between Yoast SEO and RankMath SEO plugins.

## Overview

The PostCrafter SEO Data Converter provides a robust system for converting, normalizing, and migrating SEO data between Yoast SEO and RankMath SEO plugins. This ensures consistent API experiences and enables seamless plugin transitions.

## Features

### ✅ Bidirectional Conversion
- **Yoast → RankMath**: Complete field conversion with format normalization
- **RankMath → Yoast**: Complete field conversion with format normalization
- **Universal Format**: Normalized data structure that works with both plugins

### 🔄 Data Type Conversions
- **Robots Meta**: Boolean strings ↔ Array formats
- **Image Fields**: Attachment IDs ↔ URLs
- **Serialized Data**: Complex arrays ↔ Simple values
- **Numeric Fields**: Type casting and validation

### 📊 Migration Support
- **Migration Reports**: Detailed analysis of convertible fields
- **Data Loss Prevention**: Identification of plugin-specific fields
- **Recommendations**: Smart suggestions for migration planning
- **Validation**: Integrity checking after conversion

## API Reference

### Core Methods

#### `convert_between_plugins($post_id, $from_plugin, $to_plugin, $fields = [])`

Converts SEO data between plugin formats.

**Parameters:**
- `$post_id` (int): WordPress post ID
- `$from_plugin` (string): Source plugin ('yoast' or 'rankmath')
- `$to_plugin` (string): Target plugin ('yoast' or 'rankmath')
- `$fields` (array): Optional. Specific fields to convert. Defaults to all mappable fields.

**Returns:**
```php
array(
    'success' => true,
    'converted_fields' => array(
        array(
            'source_field' => '_yoast_wpseo_title',
            'target_field' => 'rank_math_title',
            'source_value' => 'Original Title',
            'converted_value' => 'Original Title'
        )
    ),
    'skipped_fields' => array(),
    'errors' => array(),
    'summary' => array(
        'total_attempted' => 5,
        'successfully_converted' => 4,
        'skipped' => 1,
        'errors' => 0
    )
)
```

**Example Usage:**
```php
$converter = new PostCrafter_SEO_Data_Converter();

// Convert all mappable fields
$result = $converter->convert_between_plugins(123, 'yoast', 'rankmath');

// Convert specific fields only
$result = $converter->convert_between_plugins(
    123, 
    'yoast', 
    'rankmath',
    array('_yoast_wpseo_title', '_yoast_wpseo_metadesc')
);
```

#### `get_normalized_data($post_id, $plugin = null)`

Retrieves SEO data in a normalized, universal format.

**Parameters:**
- `$post_id` (int): WordPress post ID
- `$plugin` (string): Optional. Plugin to get data from ('yoast' or 'rankmath'). Auto-detected if not provided.

**Returns:**
```php
array(
    'meta_title' => 'Page Title',
    'meta_description' => 'Page description...',
    'focus_keywords' => 'keyword1, keyword2',
    'canonical' => 'https://example.com/page',
    'robots_noindex' => false,
    'robots_nofollow' => false,
    'opengraph_title' => 'Social Title',
    'opengraph_description' => 'Social description...',
    'twitter_title' => 'Twitter Title',
    'twitter_description' => 'Twitter description...',
    'primary_category' => 5,
    'plugin_specific' => array(
        'rank_math_pillar_content' => array(
            'value' => '1',
            'description' => 'Pillar Content Flag',
            'type' => 'boolean'
        )
    ),
    'plugin_detected' => 'rankmath',
    'conversion_info' => array(
        'timestamp' => 1642678400,
        'plugin_version' => '1.0.46',
        'converter_version' => '1.1.0'
    )
)
```

#### `create_migration_report($post_id, $from_plugin, $to_plugin)`

Generates a detailed migration analysis report.

**Returns:**
```php
array(
    'post_id' => 123,
    'from_plugin' => 'yoast',
    'to_plugin' => 'rankmath',
    'timestamp' => '2024-01-20 10:30:00',
    'mappable_fields' => array(
        array(
            'source_field' => '_yoast_wpseo_title',
            'target_field' => 'rank_math_title',
            'has_data' => true,
            'value_preview' => 'My Page Title...'
        )
    ),
    'plugin_specific_fields' => array(
        array(
            'field' => '_yoast_wpseo_linkdex',
            'description' => 'SEO Score',
            'value_preview' => '75'
        )
    ),
    'potential_data_loss' => array(
        array(
            'field' => '_yoast_wpseo_linkdex',
            'reason' => 'No equivalent in rankmath',
            'severity' => 'medium'
        )
    ),
    'recommendations' => array(
        array(
            'type' => 'warning',
            'message' => 'Some plugin-specific fields will not be migrated',
            'action' => 'Consider documenting these fields before migration'
        )
    )
)
```

#### `validate_conversion_integrity($post_id, $conversion_results)`

Validates that conversion was completed successfully.

**Returns:**
```php
array(
    'is_valid' => true,
    'errors' => array(),
    'warnings' => array(),
    'field_checks' => array(
        array(
            'field' => 'rank_math_title',
            'status' => 'valid'
        )
    )
)
```

#### `get_conversion_compatibility_matrix()`

Provides detailed information about field mapping and conversion capabilities.

**Returns:**
```php
array(
    'supported_conversions' => array(
        'yoast_to_rankmath' => array(
            'basic_seo' => 'full',
            'social_media' => 'full',
            'robots_meta' => 'full_with_conversion',
            'advanced_seo' => 'partial'
        ),
        'rankmath_to_yoast' => array(
            'basic_seo' => 'full',
            'social_media' => 'full',
            'robots_meta' => 'full_with_conversion',
            'advanced_seo' => 'partial'
        )
    ),
    'field_compatibility' => array(
        'yoast_to_rankmath' => array(
            '_yoast_wpseo_title' => 'rank_math_title',
            '_yoast_wpseo_metadesc' => 'rank_math_description'
            // ... more mappings
        ),
        'rankmath_to_yoast' => array(
            'rank_math_title' => '_yoast_wpseo_title',
            'rank_math_description' => '_yoast_wpseo_metadesc'
            // ... more mappings
        )
    ),
    'plugin_specific_fields' => array(
        'yoast_only' => array(
            '_yoast_wpseo_linkdex' => 'SEO Score',
            '_yoast_wpseo_content_score' => 'Content Score'
        ),
        'rankmath_only' => array(
            'rank_math_pillar_content' => 'Pillar Content Flag',
            'rank_math_twitter_card_type' => 'Twitter Card Type'
        )
    ),
    'conversion_notes' => array(
        'robots_meta' => 'Requires format conversion between boolean strings and arrays',
        'image_fields' => 'May require conversion between attachment IDs and URLs',
        'advanced_features' => 'Some plugin-specific features have no equivalent'
    )
)
```

## Field Mapping Reference

### Universal Fields (Bidirectionally Convertible)

| Universal Field | Description | Yoast Meta Key | RankMath Meta Key |
|----------------|-------------|----------------|-------------------|
| `meta_title` | SEO page title | `_yoast_wpseo_title` | `rank_math_title` |
| `meta_description` | Meta description | `_yoast_wpseo_metadesc` | `rank_math_description` |
| `focus_keywords` | Primary keywords | `_yoast_wpseo_focuskw` | `rank_math_focus_keyword` |
| `canonical` | Canonical URL | `_yoast_wpseo_canonical` | `rank_math_canonical_url` |
| `robots_noindex` | Robots noindex | `_yoast_wpseo_meta-robots-noindex` | `rank_math_robots` (array) |
| `robots_nofollow` | Robots nofollow | `_yoast_wpseo_meta-robots-nofollow` | `rank_math_robots` (array) |
| `opengraph_title` | OpenGraph title | `_yoast_wpseo_opengraph-title` | `rank_math_facebook_title` |
| `opengraph_description` | OpenGraph description | `_yoast_wpseo_opengraph-description` | `rank_math_facebook_description` |
| `opengraph_image` | OpenGraph image | `_yoast_wpseo_opengraph-image` | `rank_math_facebook_image` |
| `twitter_title` | Twitter title | `_yoast_wpseo_twitter-title` | `rank_math_twitter_title` |
| `twitter_description` | Twitter description | `_yoast_wpseo_twitter-description` | `rank_math_twitter_description` |
| `twitter_image` | Twitter image | `_yoast_wpseo_twitter-image` | `rank_math_twitter_image` |
| `primary_category` | Primary category | `_yoast_wpseo_primary_category` | `rank_math_primary_category` |

### Plugin-Specific Fields

#### Yoast-Only Fields
- `_yoast_wpseo_linkdex` - SEO Score
- `_yoast_wpseo_content_score` - Content Score
- `_yoast_wpseo_keyword_synonyms` - Keyword Synonyms
- `_yoast_wpseo_meta-robots-adv` - Advanced Robots
- `_yoast_wpseo_bctitle` - Breadcrumb Title

#### RankMath-Only Fields
- `rank_math_pillar_content` - Pillar Content Flag
- `rank_math_breadcrumb_title` - Breadcrumb Title
- `rank_math_twitter_card_type` - Twitter Card Type
- `rank_math_rich_snippet` - Schema Type
- `rank_math_snippet_article_type` - Article Schema Type
- `rank_math_advanced_robots` - Advanced Robots
- `rank_math_internal_links_processed` - Internal Links Processed

## Data Type Conversion Details

### Robots Meta Fields

The robots meta fields require special handling due to different storage formats:

**Yoast Format** (Boolean Strings):
```php
_yoast_wpseo_meta-robots-noindex: "1" or ""
_yoast_wpseo_meta-robots-nofollow: "1" or ""
```

**RankMath Format** (Array):
```php
rank_math_robots: ["noindex", "nofollow"]
```

**Universal Format** (Booleans):
```php
robots_noindex: true
robots_nofollow: false
```

**Conversion Logic:**
- Yoast `"1"` → RankMath array entry → Universal `true`
- Yoast `""` → RankMath array absence → Universal `false`

### Image Fields

Image fields may be stored as attachment IDs or direct URLs:

**Conversion Logic:**
- If numeric: Attempt to get URL via `wp_get_attachment_image_url()`
- If URL: Validate and sanitize with `sanitize_url()`
- If invalid: Sanitize as text field

### Category Fields

Category fields are converted to integers:
```php
intval($value)
```

## Usage Examples

### Basic Conversion

```php
// Initialize converter
$converter = new PostCrafter_SEO_Data_Converter();

// Convert all Yoast data to RankMath format
$result = $converter->convert_between_plugins(123, 'yoast', 'rankmath');

if ($result['success']) {
    echo "Converted {$result['summary']['successfully_converted']} fields successfully";
} else {
    echo "Conversion failed: {$result['error']}";
}
```

### Migration Planning

```php
// Generate migration report
$report = $converter->create_migration_report(123, 'yoast', 'rankmath');

echo "Mappable fields: " . count($report['mappable_fields']) . "\n";
echo "Potential data loss: " . count($report['potential_data_loss']) . "\n";

foreach ($report['recommendations'] as $rec) {
    echo "{$rec['type']}: {$rec['message']}\n";
}
```

### Data Normalization

```php
// Get normalized data (works with any SEO plugin)
$normalized = $converter->get_normalized_data(123);

echo "Title: " . $normalized['meta_title'] . "\n";
echo "Plugin: " . $normalized['plugin_detected'] . "\n";

// Access plugin-specific features
if (!empty($normalized['plugin_specific'])) {
    foreach ($normalized['plugin_specific'] as $field => $data) {
        echo "{$data['description']}: {$data['value']}\n";
    }
}
```

### Conversion Validation

```php
// Perform conversion
$result = $converter->convert_between_plugins(123, 'yoast', 'rankmath');

// Validate the results
$validation = $converter->validate_conversion_integrity(123, $result);

if (!$validation['is_valid']) {
    foreach ($validation['errors'] as $error) {
        echo "Error: $error\n";
    }
}
```

### Batch Processing

```php
$post_ids = array(1, 2, 3, 4, 5);
$results = array();

foreach ($post_ids as $post_id) {
    $result = $converter->convert_between_plugins($post_id, 'yoast', 'rankmath');
    $results[$post_id] = $result;
    
    // Clear cache after each conversion
    $converter->clear_conversion_cache($post_id);
}

// Summary statistics
$total_converted = 0;
foreach ($results as $result) {
    if ($result['success']) {
        $total_converted += $result['summary']['successfully_converted'];
    }
}

echo "Total fields converted: $total_converted\n";
```

## Error Handling

The converter includes comprehensive error handling:

### Common Errors

1. **Invalid Post ID**
   ```php
   array('success' => false, 'error' => 'Invalid post ID')
   ```

2. **Invalid Plugin Names**
   ```php
   array('success' => false, 'error' => 'Invalid plugin names')
   ```

3. **Same Source and Target**
   ```php
   array('success' => false, 'error' => 'Source and target plugins cannot be the same')
   ```

4. **Conversion Failures**
   - Fields with no mapping available are skipped
   - Fields with empty values are skipped
   - Database update failures are logged as errors

### Best Practices

1. **Always Check Results**
   ```php
   if (!$result['success']) {
       // Handle error
       error_log('Conversion failed: ' . $result['error']);
       return;
   }
   ```

2. **Validate After Conversion**
   ```php
   $validation = $converter->validate_conversion_integrity($post_id, $result);
   if (!$validation['is_valid']) {
       // Handle validation errors
   }
   ```

3. **Use Migration Reports**
   ```php
   $report = $converter->create_migration_report($post_id, 'yoast', 'rankmath');
   // Review recommendations before proceeding
   ```

4. **Clear Cache When Appropriate**
   ```php
   // Clear specific post cache
   $converter->clear_conversion_cache($post_id);
   
   // Clear all conversion caches
   $converter->clear_conversion_cache();
   ```

## Performance Considerations

### Caching

The converter implements intelligent caching:
- Plugin detection results are cached
- Meta queries are optimized
- Conversion results can be cached with transients

### Batch Operations

For bulk conversions:
- Process in chunks to avoid memory issues
- Clear cache periodically
- Monitor database performance
- Use background processing for large datasets

### Memory Management

```php
// Clear caches periodically during bulk operations
if ($processed % 100 === 0) {
    $converter->clear_conversion_cache();
    wp_cache_flush();
}
```

## Compatibility

### WordPress Versions
- WordPress 5.0+
- Tested with WordPress 6.0+

### Plugin Versions
- **Yoast SEO**: 14.0+ (recommended 19.0+)
- **RankMath**: 1.0.40+ (recommended 1.0.46+)

### PHP Versions
- PHP 7.4+
- Tested with PHP 8.0+

## Migration Workflow

### Recommended Migration Process

1. **Planning Phase**
   ```php
   // Generate reports for all posts
   $posts = get_posts(['post_type' => 'post', 'numberposts' => -1]);
   foreach ($posts as $post) {
       $report = $converter->create_migration_report($post->ID, 'yoast', 'rankmath');
       // Review and document potential data loss
   }
   ```

2. **Testing Phase**
   ```php
   // Test on staging environment first
   $test_posts = array(123, 456, 789); // Sample posts
   foreach ($test_posts as $post_id) {
       $result = $converter->convert_between_plugins($post_id, 'yoast', 'rankmath');
       $validation = $converter->validate_conversion_integrity($post_id, $result);
       // Verify results manually
   }
   ```

3. **Backup Phase**
   ```php
   // Create backup of all SEO meta data
   // This should be done at database level
   ```

4. **Migration Phase**
   ```php
   // Perform actual migration
   foreach ($all_posts as $post_id) {
       $result = $converter->convert_between_plugins($post_id, 'yoast', 'rankmath');
       if (!$result['success']) {
           // Log errors for manual review
           error_log("Migration failed for post $post_id: " . $result['error']);
       }
   }
   ```

5. **Validation Phase**
   ```php
   // Validate all conversions
   foreach ($migrated_posts as $post_id) {
       $validation = $converter->validate_conversion_integrity($post_id, $stored_results[$post_id]);
       if (!$validation['is_valid']) {
           // Flag for manual review
       }
   }
   ```

## Advanced Features

### Custom Field Mapping

The converter can be extended with custom field mappings:

```php
// This would require extending the converter class
class Custom_SEO_Data_Converter extends PostCrafter_SEO_Data_Converter {
    protected function add_custom_mapping() {
        $this->field_mapping['yoast_to_rankmath']['_custom_yoast_field'] = 'custom_rankmath_field';
        $this->field_mapping['rankmath_to_yoast']['custom_rankmath_field'] = '_custom_yoast_field';
    }
}
```

### Integration with REST API

The converter integrates seamlessly with the PostCrafter REST API:

```php
// Use normalized data in API responses
$normalized = $converter->get_normalized_data($post_id);
$api_response['seo_data'] = $normalized;
```

### Plugin Detection Integration

The converter works with the SEO Plugin Detector:

```php
// Automatic plugin detection
$converter = new PostCrafter_SEO_Data_Converter();
$normalized = $converter->get_normalized_data($post_id); // Auto-detects plugin
```

This comprehensive guide covers all aspects of the PostCrafter SEO Data Conversion system. For additional support or feature requests, refer to the plugin documentation or support channels.
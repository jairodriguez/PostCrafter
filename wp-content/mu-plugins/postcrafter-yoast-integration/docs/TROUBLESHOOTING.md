# PostCrafter RankMath Integration Troubleshooting Guide

Complete troubleshooting guide for resolving common issues with the PostCrafter RankMath SEO integration.

## Table of Contents

1. [Plugin Detection Issues](#plugin-detection-issues)
2. [Field Mapping Problems](#field-mapping-problems)
3. [API Response Issues](#api-response-issues)
4. [Migration Problems](#migration-problems)
5. [Performance Issues](#performance-issues)
6. [WordPress Integration Issues](#wordpress-integration-issues)
7. [Version Compatibility Issues](#version-compatibility-issues)
8. [Data Corruption Issues](#data-corruption-issues)
9. [Debugging Tools](#debugging-tools)
10. [Common Error Messages](#common-error-messages)

## Plugin Detection Issues

### Issue: RankMath Not Detected

**Symptoms:**
- API returns "No supported SEO plugin detected"
- Plugin detection shows RankMath as inactive
- Admin page shows "RankMath: Not Active"

**Diagnostic Steps:**
```php
// Check if RankMath functions are available
if (!function_exists('rank_math')) {
    echo "RankMath plugin is not activated\n";
}

// Check RankMath version
if (!defined('RANK_MATH_VERSION')) {
    echo "RankMath version constant not defined\n";
} else {
    echo "RankMath version: " . RANK_MATH_VERSION . "\n";
}

// Check plugin file existence
$plugin_file = WP_PLUGIN_DIR . '/seo-by-rank-math/rank-math.php';
if (!file_exists($plugin_file)) {
    echo "RankMath plugin files not found\n";
}
```

**Solutions:**

1. **Verify Plugin Installation:**
   ```bash
   # Check if RankMath is installed
   ls -la wp-content/plugins/ | grep rank
   
   # Check if plugin is properly activated
   wp plugin list --status=active | grep rank
   ```

2. **Manual Activation:**
   ```php
   // Activate RankMath programmatically (admin only)
   if (is_admin() && current_user_can('activate_plugins')) {
       activate_plugin('seo-by-rank-math/rank-math.php');
   }
   ```

3. **Check Plugin Dependencies:**
   ```php
   // Verify WordPress version compatibility
   global $wp_version;
   if (version_compare($wp_version, '5.0', '<')) {
       echo "WordPress version too old for RankMath\n";
   }
   
   // Check PHP version
   if (version_compare(PHP_VERSION, '7.4', '<')) {
       echo "PHP version too old for RankMath\n";
   }
   ```

### Issue: Multiple Plugin Conflict

**Symptoms:**
- Both Yoast and RankMath detected
- Inconsistent primary plugin selection
- API returns mixed data from both plugins

**Diagnostic Steps:**
```php
$detector = new PostCrafter_SEO_Plugin_Detector();

// Check all detected plugins
$results = $detector->get_api_detection_results();
foreach ($results as $plugin => $info) {
    echo "$plugin: " . ($info['active'] ? 'Active' : 'Inactive') . "\n";
}

// Check for conflicts
$conflicts = $detector->get_plugin_conflicts();
if (!empty($conflicts)) {
    foreach ($conflicts as $conflict) {
        echo "Conflict: " . $conflict['description'] . "\n";
    }
}
```

**Solutions:**

1. **Set Primary Plugin Preference:**
   ```php
   // Set RankMath as primary plugin
   update_option('postcrafter_seo_primary_plugin', 'rankmath');
   
   // Clear detection cache
   $detector->clear_detection_cache();
   ```

2. **Disable Conflicting Plugin:**
   ```bash
   # Deactivate Yoast SEO if using RankMath
   wp plugin deactivate wordpress-seo
   ```

### Issue: Version Not Supported

**Symptoms:**
- Plugin detected but marked as unsupported
- API endpoints return version compatibility errors

**Solutions:**

1. **Update RankMath:**
   ```bash
   # Update to latest version
   wp plugin update seo-by-rank-math
   ```

2. **Check Minimum Version Requirements:**
   ```php
   $detector = new PostCrafter_SEO_Plugin_Detector();
   $min_version = $detector->get_minimum_supported_version('rankmath');
   $current_version = $detector->get_plugin_version('rankmath');
   
   echo "Minimum required: $min_version\n";
   echo "Current version: $current_version\n";
   ```

## Field Mapping Problems

### Issue: Fields Not Updating

**Symptoms:**
- API returns success but fields don't change in RankMath
- RankMath interface shows old values
- Database shows correct values but not reflected in plugin

**Diagnostic Steps:**
```php
$post_id = 123; // Your post ID

// Check direct database values
$title = get_post_meta($post_id, 'rank_math_title', true);
echo "Database title: $title\n";

// Check through field handler
$handler = new PostCrafter_RankMath_Field_Handler();
$handler_title = $handler->get_rankmath_meta_title($post_id);
echo "Handler title: $handler_title\n";

// Check universal API
$integration = new PostCrafter_SEO_Integration();
$api_title = $integration->get_seo_meta_title($post_id);
echo "API title: $api_title\n";
```

**Solutions:**

1. **Clear RankMath Cache:**
   ```php
   // Clear RankMath cache
   if (function_exists('rank_math_clear_cache')) {
       rank_math_clear_cache();
   }
   
   // Clear WordPress object cache
   wp_cache_flush();
   
   // Clear PostCrafter cache
   $converter = new PostCrafter_SEO_Data_Converter();
   $converter->clear_conversion_cache();
   ```

2. **Verify Meta Key Mapping:**
   ```php
   $handler = new PostCrafter_RankMath_Field_Handler();
   $meta_key = $handler->get_meta_key('title');
   echo "Meta key for title: $meta_key\n";
   
   // Should output: rank_math_title
   ```

3. **Force Field Update:**
   ```php
   // Force update without cache
   $handler = new PostCrafter_RankMath_Field_Handler();
   $result = $handler->set_rankmath_meta_title($post_id, 'Test Title', true); // Force update
   
   if (!$result) {
       echo "Update failed - check post ID and permissions\n";
   }
   ```

### Issue: Robots Meta Not Converting

**Symptoms:**
- Boolean robots values not saving as array
- RankMath shows incorrect robots settings
- API returns wrong robots status

**Diagnostic Steps:**
```php
$post_id = 123;

// Check current robots data
$robots = get_post_meta($post_id, 'rank_math_robots', true);
echo "Robots data type: " . gettype($robots) . "\n";
echo "Robots data: " . print_r($robots, true) . "\n";

// Test conversion
$handler = new PostCrafter_RankMath_Field_Handler();
$noindex_status = $handler->get_rankmath_meta_robots_noindex($post_id);
echo "Noindex status: " . ($noindex_status ? 'true' : 'false') . "\n";
```

**Solutions:**

1. **Fix Corrupted Robots Data:**
   ```php
   $post_id = 123;
   
   // Reset robots meta to proper array format
   $robots = get_post_meta($post_id, 'rank_math_robots', true);
   if (!is_array($robots)) {
       update_post_meta($post_id, 'rank_math_robots', array());
       echo "Fixed corrupted robots data\n";
   }
   ```

2. **Proper Robots Setting:**
   ```php
   $handler = new PostCrafter_RankMath_Field_Handler();
   
   // Set noindex correctly
   $handler->set_rankmath_meta_robots_noindex($post_id, true);
   
   // Verify the result
   $robots = get_post_meta($post_id, 'rank_math_robots', true);
   if (is_array($robots) && in_array('noindex', $robots)) {
       echo "Robots noindex set correctly\n";
   }
   ```

### Issue: Social Media Fields Not Saving

**Symptoms:**
- OpenGraph/Twitter fields not updating
- Image fields not accepting URLs or attachment IDs

**Solutions:**

1. **Validate Image URLs:**
   ```php
   $image_url = 'https://example.com/image.jpg';
   
   // Validate URL format
   if (!filter_var($image_url, FILTER_VALIDATE_URL)) {
       echo "Invalid URL format\n";
   }
   
   // Check if URL is accessible
   $response = wp_remote_head($image_url);
   if (is_wp_error($response)) {
       echo "Image URL not accessible: " . $response->get_error_message() . "\n";
   }
   ```

2. **Handle Attachment IDs:**
   ```php
   $attachment_id = 123;
   
   // Verify attachment exists
   if (!get_post($attachment_id)) {
       echo "Attachment ID $attachment_id does not exist\n";
   }
   
   // Convert to URL
   $image_url = wp_get_attachment_url($attachment_id);
   if (!$image_url) {
       echo "Could not get URL for attachment $attachment_id\n";
   }
   ```

## API Response Issues

### Issue: API Endpoints Return Errors

**Symptoms:**
- REST API calls return 404 or 500 errors
- API responses missing expected fields
- Permission errors on API calls

**Diagnostic Steps:**
```bash
# Test API endpoint availability
curl -X GET "https://yoursite.com/wp-json/postcrafter/v1/seo-status" \
  -H "Content-Type: application/json"

# Test with authentication
curl -X GET "https://yoursite.com/wp-json/postcrafter/v1/seo-fields/123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Solutions:**

1. **Verify REST API Registration:**
   ```php
   // Check if routes are registered
   $routes = rest_get_server()->get_routes();
   if (isset($routes['/postcrafter/v1'])) {
       echo "PostCrafter routes registered\n";
   } else {
       echo "PostCrafter routes NOT registered\n";
   }
   ```

2. **Fix Permalink Structure:**
   ```bash
   # Flush permalink rules
   wp rewrite flush
   ```

3. **Check REST API Permissions:**
   ```php
   // Test permission callback
   $api_handler = new PostCrafter_REST_API_Handler();
   if (method_exists($api_handler, 'check_permissions')) {
       $can_access = $api_handler->check_permissions();
       echo "API access: " . ($can_access ? 'Allowed' : 'Denied') . "\n";
   }
   ```

### Issue: Inconsistent API Responses

**Symptoms:**
- API sometimes returns Yoast data, sometimes RankMath
- Field names inconsistent between calls
- Missing fields in responses

**Solutions:**

1. **Clear All Caches:**
   ```php
   // Clear all caches
   wp_cache_flush();
   
   $detector = new PostCrafter_SEO_Plugin_Detector();
   $detector->clear_detection_cache();
   
   $converter = new PostCrafter_SEO_Data_Converter();
   $converter->clear_conversion_cache();
   ```

2. **Force Primary Plugin Detection:**
   ```php
   // Force re-detection
   $detector = new PostCrafter_SEO_Plugin_Detector();
   $detector->force_redetection();
   
   $primary = $detector->get_primary_plugin();
   echo "Primary plugin: $primary\n";
   ```

## Migration Problems

### Issue: Migration Fails

**Symptoms:**
- Conversion between plugins fails
- Data loss during migration
- Migration validation errors

**Diagnostic Steps:**
```php
$post_id = 123;
$converter = new PostCrafter_SEO_Data_Converter();

// Generate migration report first
$report = $converter->create_migration_report($post_id, 'yoast', 'rankmath');

echo "Mappable fields: " . count($report['mappable_fields']) . "\n";
echo "Plugin-specific fields: " . count($report['plugin_specific_fields']) . "\n";
echo "Potential data loss: " . count($report['potential_data_loss']) . "\n";

// Check for warnings
if (!empty($report['warnings'])) {
    foreach ($report['warnings'] as $warning) {
        echo "Warning: $warning\n";
    }
}
```

**Solutions:**

1. **Fix Invalid Post Data:**
   ```php
   $post_id = 123;
   
   // Verify post exists
   $post = get_post($post_id);
   if (!$post) {
       echo "Post $post_id does not exist\n";
       return;
   }
   
   // Check post status
   if ($post->post_status === 'trash') {
       echo "Post $post_id is in trash\n";
       return;
   }
   ```

2. **Backup Before Migration:**
   ```php
   // Create backup of meta data
   $backup = array();
   $all_meta = get_post_meta($post_id);
   foreach ($all_meta as $key => $values) {
       if (strpos($key, '_yoast_wpseo_') === 0 || strpos($key, 'rank_math_') === 0) {
           $backup[$key] = $values;
       }
   }
   
   // Store backup
   update_option("postcrafter_migration_backup_$post_id", $backup);
   ```

3. **Step-by-Step Migration:**
   ```php
   $converter = new PostCrafter_SEO_Data_Converter();
   
   // Convert specific fields only
   $fields_to_convert = array('title', 'description', 'focus_keywords');
   $result = $converter->convert_between_plugins(
       $post_id, 
       'yoast', 
       'rankmath', 
       $fields_to_convert
   );
   
   if (!$result['success']) {
       echo "Migration failed: " . $result['error'] . "\n";
   }
   ```

### Issue: Data Loss During Migration

**Symptoms:**
- Some fields missing after migration
- Plugin-specific data lost
- Validation errors after conversion

**Solutions:**

1. **Identify Non-Mappable Fields:**
   ```php
   $converter = new PostCrafter_SEO_Data_Converter();
   $matrix = $converter->get_conversion_compatibility_matrix();
   
   echo "Yoast-only fields:\n";
   foreach ($matrix['yoast_specific'] as $field) {
       echo "- $field\n";
   }
   
   echo "RankMath-only fields:\n";
   foreach ($matrix['rankmath_specific'] as $field) {
       echo "- $field\n";
   }
   ```

2. **Preserve Plugin-Specific Data:**
   ```php
   // Don't delete original plugin data immediately
   $result = $converter->convert_between_plugins($post_id, 'yoast', 'rankmath');
   
   if ($result['success']) {
       // Keep original data for rollback
       echo "Migration successful, original Yoast data preserved\n";
   }
   ```

## Performance Issues

### Issue: Slow API Responses

**Symptoms:**
- API calls take several seconds
- WordPress admin becomes slow
- High database query count

**Diagnostic Steps:**
```php
// Enable query debugging
if (!defined('SAVEQUERIES')) {
    define('SAVEQUERIES', true);
}

// Check query count after API call
global $wpdb;
$before_queries = count($wpdb->queries);

// Make API call
$converter = new PostCrafter_SEO_Data_Converter();
$data = $converter->get_normalized_data(123);

$after_queries = count($wpdb->queries);
echo "Queries executed: " . ($after_queries - $before_queries) . "\n";
```

**Solutions:**

1. **Enable Object Caching:**
   ```php
   // Add to wp-config.php
   define('WP_CACHE', true);
   
   // Use Redis or Memcached if available
   if (class_exists('Redis')) {
       echo "Redis available for caching\n";
   }
   ```

2. **Optimize Database Queries:**
   ```php
   // Use single meta queries instead of multiple
   $all_meta = get_post_meta($post_id);
   
   // Instead of multiple get_post_meta calls
   $title = isset($all_meta['rank_math_title']) ? $all_meta['rank_math_title'][0] : '';
   $desc = isset($all_meta['rank_math_description']) ? $all_meta['rank_math_description'][0] : '';
   ```

3. **Implement Field-Level Caching:**
   ```php
   function get_cached_seo_field($post_id, $field) {
       $cache_key = "seo_field_{$post_id}_{$field}";
       $cached = wp_cache_get($cache_key, 'postcrafter');
       
       if ($cached === false) {
           $value = get_post_meta($post_id, $field, true);
           wp_cache_set($cache_key, $value, 'postcrafter', 300); // 5 minutes
           return $value;
       }
       
       return $cached;
   }
   ```

### Issue: Memory Usage Issues

**Symptoms:**
- PHP memory limit exceeded errors
- Slow performance during bulk operations
- WordPress crashes during migration

**Solutions:**

1. **Increase Memory Limit:**
   ```php
   // Add to wp-config.php
   ini_set('memory_limit', '512M');
   
   // Or in .htaccess
   // php_value memory_limit 512M
   ```

2. **Process in Batches:**
   ```php
   function bulk_migrate_posts($post_ids) {
       $batch_size = 10;
       $batches = array_chunk($post_ids, $batch_size);
       
       foreach ($batches as $batch) {
           foreach ($batch as $post_id) {
               $converter = new PostCrafter_SEO_Data_Converter();
               $converter->convert_between_plugins($post_id, 'yoast', 'rankmath');
           }
           
           // Clear memory between batches
           wp_cache_flush();
           if (function_exists('gc_collect_cycles')) {
               gc_collect_cycles();
           }
           
           // Brief pause
           usleep(100000); // 0.1 seconds
       }
   }
   ```

## WordPress Integration Issues

### Issue: Admin Page Not Showing

**Symptoms:**
- PostCrafter SEO menu not visible in admin
- Settings page returns 404
- Admin hooks not firing

**Solutions:**

1. **Check User Permissions:**
   ```php
   if (!current_user_can('manage_options')) {
       echo "User lacks manage_options capability\n";
   }
   ```

2. **Verify Hook Registration:**
   ```php
   // Check if admin hooks are registered
   $admin_menu_hooks = $GLOBALS['wp_filter']['admin_menu'] ?? array();
   $found_hook = false;
   
   foreach ($admin_menu_hooks as $priority => $callbacks) {
       foreach ($callbacks as $callback) {
           if (is_array($callback['function']) && 
               get_class($callback['function'][0]) === 'PostCrafter_SEO_Integration') {
               $found_hook = true;
               break 2;
           }
       }
   }
   
   echo "Admin menu hook registered: " . ($found_hook ? 'Yes' : 'No') . "\n";
   ```

3. **Force Hook Registration:**
   ```php
   // Manually trigger admin initialization
   if (is_admin()) {
       $integration = new PostCrafter_SEO_Integration();
       $integration->add_admin_menu();
   }
   ```

### Issue: Settings Not Saving

**Symptoms:**
- Settings form submissions don't persist
- Default values always shown
- No feedback on save attempts

**Solutions:**

1. **Check Nonce Verification:**
   ```php
   // Verify nonce is being checked properly
   if (isset($_POST['submit']) && isset($_POST['_wpnonce'])) {
       if (!wp_verify_nonce($_POST['_wpnonce'], 'postcrafter_seo_settings')) {
           echo "Nonce verification failed\n";
       }
   }
   ```

2. **Verify Option Updates:**
   ```php
   // Test option saving directly
   $test_value = 'test_' . time();
   $update_result = update_option('postcrafter_seo_test', $test_value);
   $retrieved_value = get_option('postcrafter_seo_test');
   
   echo "Update result: " . ($update_result ? 'Success' : 'Failed') . "\n";
   echo "Retrieved value: $retrieved_value\n";
   ```

## Version Compatibility Issues

### Issue: WordPress Version Conflicts

**Symptoms:**
- Plugin doesn't activate on older WordPress
- REST API features not working
- Hook functions not available

**Solutions:**

1. **Check WordPress Version:**
   ```php
   global $wp_version;
   $min_wp_version = '5.0';
   
   if (version_compare($wp_version, $min_wp_version, '<')) {
       echo "WordPress $wp_version is too old. Minimum required: $min_wp_version\n";
   }
   ```

2. **Feature Detection:**
   ```php
   // Check if REST API is available
   if (!function_exists('rest_get_server')) {
       echo "REST API not available\n";
   }
   
   // Check if required hooks exist
   if (!has_action('rest_api_init')) {
       echo "rest_api_init hook not available\n";
   }
   ```

### Issue: PHP Version Conflicts

**Symptoms:**
- Fatal errors on older PHP versions
- Syntax errors in plugin files
- Missing function errors

**Solutions:**

1. **Version Check:**
   ```php
   $min_php_version = '7.4';
   
   if (version_compare(PHP_VERSION, $min_php_version, '<')) {
       echo "PHP " . PHP_VERSION . " is too old. Minimum required: $min_php_version\n";
   }
   ```

2. **Feature Compatibility:**
   ```php
   // Check for required PHP features
   if (!function_exists('json_encode')) {
       echo "JSON functions not available\n";
   }
   
   if (!class_exists('Exception')) {
       echo "Exception class not available\n";
   }
   ```

## Data Corruption Issues

### Issue: Invalid Meta Data

**Symptoms:**
- SEO fields show garbled data
- Boolean fields showing as strings
- Array fields corrupted

**Solutions:**

1. **Data Validation and Repair:**
   ```php
   function repair_seo_data($post_id) {
       $repairs = array();
       
       // Fix robots meta
       $robots = get_post_meta($post_id, 'rank_math_robots', true);
       if (!is_array($robots) && !empty($robots)) {
           // Convert string to array
           $robots_array = array();
           if (strpos($robots, 'noindex') !== false) {
               $robots_array[] = 'noindex';
           }
           if (strpos($robots, 'nofollow') !== false) {
               $robots_array[] = 'nofollow';
           }
           update_post_meta($post_id, 'rank_math_robots', $robots_array);
           $repairs[] = 'Fixed robots meta format';
       }
       
       // Fix pillar content
       $pillar = get_post_meta($post_id, 'rank_math_pillar_content', true);
       if (!in_array($pillar, array('0', '1', 0, 1, false, true), true)) {
           update_post_meta($post_id, 'rank_math_pillar_content', '0');
           $repairs[] = 'Fixed pillar content format';
       }
       
       return $repairs;
   }
   ```

2. **Bulk Data Repair:**
   ```php
   function bulk_repair_seo_data() {
       $posts = get_posts(array(
           'numberposts' => -1,
           'post_type' => 'post',
           'meta_query' => array(
               array(
                   'key' => 'rank_math_robots',
                   'compare' => 'EXISTS'
               )
           )
       ));
       
       foreach ($posts as $post) {
           $repairs = repair_seo_data($post->ID);
           if (!empty($repairs)) {
               echo "Post {$post->ID}: " . implode(', ', $repairs) . "\n";
           }
       }
   }
   ```

## Debugging Tools

### Enable Debug Mode

```php
// Add to wp-config.php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);

// Enable PostCrafter specific debugging
define('POSTCRAFTER_SEO_DEBUG', true);
```

### Debug Helper Functions

```php
function debug_seo_integration($post_id = null) {
    if (!defined('POSTCRAFTER_SEO_DEBUG') || !POSTCRAFTER_SEO_DEBUG) {
        return;
    }
    
    echo "<h3>PostCrafter SEO Debug Information</h3>\n";
    
    // Plugin detection
    $detector = new PostCrafter_SEO_Plugin_Detector();
    echo "<h4>Plugin Detection</h4>\n";
    echo "<pre>" . print_r($detector->get_api_detection_results(), true) . "</pre>\n";
    
    // Primary plugin
    echo "<h4>Primary Plugin</h4>\n";
    echo "<p>Primary: " . $detector->get_primary_plugin() . "</p>\n";
    
    if ($post_id) {
        // Post meta data
        echo "<h4>Post Meta Data (Post ID: $post_id)</h4>\n";
        $all_meta = get_post_meta($post_id);
        $seo_meta = array();
        foreach ($all_meta as $key => $values) {
            if (strpos($key, 'rank_math_') === 0 || strpos($key, '_yoast_wpseo_') === 0) {
                $seo_meta[$key] = $values;
            }
        }
        echo "<pre>" . print_r($seo_meta, true) . "</pre>\n";
        
        // Normalized data
        echo "<h4>Normalized Data</h4>\n";
        $converter = new PostCrafter_SEO_Data_Converter();
        $normalized = $converter->get_normalized_data($post_id);
        echo "<pre>" . print_r($normalized, true) . "</pre>\n";
    }
    
    // System information
    echo "<h4>System Information</h4>\n";
    echo "<p>WordPress Version: " . get_bloginfo('version') . "</p>\n";
    echo "<p>PHP Version: " . PHP_VERSION . "</p>\n";
    echo "<p>PostCrafter Version: " . (defined('POSTCRAFTER_SEO_VERSION') ? POSTCRAFTER_SEO_VERSION : 'Unknown') . "</p>\n";
}

// Usage: debug_seo_integration(123);
```

### Log Analysis

```bash
# Monitor WordPress debug log
tail -f /path/to/wp-content/debug.log | grep -i postcrafter

# Search for specific errors
grep -i "rankmath\|postcrafter" /path/to/wp-content/debug.log

# Check for fatal errors
grep -i "fatal error\|parse error" /path/to/wp-content/debug.log
```

## Common Error Messages

### Error: "No supported SEO plugin detected"

**Cause:** RankMath plugin not active or not recognized
**Solution:** Verify RankMath installation and activation

### Error: "Primary plugin could not be determined"

**Cause:** Multiple SEO plugins active without clear preference
**Solution:** Set primary plugin preference in settings

### Error: "Field mapping failed for [field_name]"

**Cause:** Invalid field name or data type mismatch
**Solution:** Check field mapping configuration and data types

### Error: "Migration validation failed"

**Cause:** Data inconsistency after plugin conversion
**Solution:** Review migration report and fix data issues before retry

### Error: "API endpoint not found"

**Cause:** REST API routes not registered properly
**Solution:** Flush permalink rules and verify route registration

### Error: "Insufficient permissions for API access"

**Cause:** User lacks required capabilities
**Solution:** Verify user has `edit_posts` capability or appropriate API permissions

### Error: "Cache clearing failed"

**Cause:** Object cache or file permissions issues
**Solution:** Check cache backend status and file permissions

### Error: "Database update failed"

**Cause:** Database connectivity or permission issues
**Solution:** Check database status and WordPress database permissions

## Getting Additional Help

### Debug Information to Collect

When seeking support, provide the following information:

1. **System Information:**
   ```php
   echo "WordPress Version: " . get_bloginfo('version') . "\n";
   echo "PHP Version: " . PHP_VERSION . "\n";
   echo "PostCrafter Version: " . POSTCRAFTER_SEO_VERSION . "\n";
   echo "Active Theme: " . get_option('stylesheet') . "\n";
   ```

2. **Plugin Status:**
   ```php
   $detector = new PostCrafter_SEO_Plugin_Detector();
   print_r($detector->get_api_detection_results());
   ```

3. **Error Logs:**
   ```bash
   tail -100 /path/to/wp-content/debug.log
   ```

4. **Server Configuration:**
   ```php
   echo "Memory Limit: " . ini_get('memory_limit') . "\n";
   echo "Max Execution Time: " . ini_get('max_execution_time') . "\n";
   echo "Upload Max Filesize: " . ini_get('upload_max_filesize') . "\n";
   ```

### Support Resources

- **Documentation:** Check the [Integration Guide](./RANKMATH_INTEGRATION_GUIDE.md)
- **API Reference:** Review the [API Documentation](./API_REFERENCE.md)
- **GitHub Issues:** Report bugs and request features
- **Community Forums:** Get help from other users

### Performance Monitoring

Monitor integration performance using these metrics:

```php
function monitor_integration_performance() {
    $start_time = microtime(true);
    $start_memory = memory_get_usage();
    
    // Perform operation
    $converter = new PostCrafter_SEO_Data_Converter();
    $data = $converter->get_normalized_data(123);
    
    $end_time = microtime(true);
    $end_memory = memory_get_usage();
    
    echo "Execution time: " . round(($end_time - $start_time) * 1000, 2) . "ms\n";
    echo "Memory used: " . round(($end_memory - $start_memory) / 1024, 2) . "KB\n";
}
```

This troubleshooting guide covers the most common issues you may encounter with the PostCrafter RankMath integration. For additional help or specific issues not covered here, please refer to the support resources or create a detailed bug report with the debug information listed above.
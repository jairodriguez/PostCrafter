<?php
/**
 * SEO Data Converter Class
 * 
 * Handles data conversion and normalization between Yoast SEO and RankMath SEO formats
 * 
 * @package PostCrafter
 * @since 1.1.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class PostCrafter_SEO_Data_Converter {
    
    /**
     * SEO Plugin Detector instance
     */
    private $detector;
    
    /**
     * Conversion mapping between plugins
     */
    private $field_mapping = array(
        'yoast_to_rankmath' => array(
            '_yoast_wpseo_title' => 'rank_math_title',
            '_yoast_wpseo_metadesc' => 'rank_math_description',
            '_yoast_wpseo_focuskw' => 'rank_math_focus_keyword',
            '_yoast_wpseo_canonical' => 'rank_math_canonical_url',
            '_yoast_wpseo_meta-robots-noindex' => 'rank_math_robots',
            '_yoast_wpseo_meta-robots-nofollow' => 'rank_math_robots',
            '_yoast_wpseo_opengraph-title' => 'rank_math_facebook_title',
            '_yoast_wpseo_opengraph-description' => 'rank_math_facebook_description',
            '_yoast_wpseo_opengraph-image' => 'rank_math_facebook_image',
            '_yoast_wpseo_twitter-title' => 'rank_math_twitter_title',
            '_yoast_wpseo_twitter-description' => 'rank_math_twitter_description',
            '_yoast_wpseo_twitter-image' => 'rank_math_twitter_image',
            '_yoast_wpseo_primary_category' => 'rank_math_primary_category'
        ),
        'rankmath_to_yoast' => array(
            'rank_math_title' => '_yoast_wpseo_title',
            'rank_math_description' => '_yoast_wpseo_metadesc',
            'rank_math_focus_keyword' => '_yoast_wpseo_focuskw',
            'rank_math_canonical_url' => '_yoast_wpseo_canonical',
            'rank_math_robots' => array('_yoast_wpseo_meta-robots-noindex', '_yoast_wpseo_meta-robots-nofollow'),
            'rank_math_facebook_title' => '_yoast_wpseo_opengraph-title',
            'rank_math_facebook_description' => '_yoast_wpseo_opengraph-description',
            'rank_math_facebook_image' => '_yoast_wpseo_opengraph-image',
            'rank_math_twitter_title' => '_yoast_wpseo_twitter-title',
            'rank_math_twitter_description' => '_yoast_wpseo_twitter-description',
            'rank_math_twitter_image' => '_yoast_wpseo_twitter-image',
            'rank_math_primary_category' => '_yoast_wpseo_primary_category'
        )
    );
    
    /**
     * Universal field mapping
     */
    private $universal_fields = array(
        'meta_title' => array(
            'yoast' => '_yoast_wpseo_title',
            'rankmath' => 'rank_math_title'
        ),
        'meta_description' => array(
            'yoast' => '_yoast_wpseo_metadesc',
            'rankmath' => 'rank_math_description'
        ),
        'focus_keywords' => array(
            'yoast' => '_yoast_wpseo_focuskw',
            'rankmath' => 'rank_math_focus_keyword'
        ),
        'canonical' => array(
            'yoast' => '_yoast_wpseo_canonical',
            'rankmath' => 'rank_math_canonical_url'
        ),
        'robots_noindex' => array(
            'yoast' => '_yoast_wpseo_meta-robots-noindex',
            'rankmath' => 'rank_math_robots'
        ),
        'robots_nofollow' => array(
            'yoast' => '_yoast_wpseo_meta-robots-nofollow',
            'rankmath' => 'rank_math_robots'
        ),
        'opengraph_title' => array(
            'yoast' => '_yoast_wpseo_opengraph-title',
            'rankmath' => 'rank_math_facebook_title'
        ),
        'opengraph_description' => array(
            'yoast' => '_yoast_wpseo_opengraph-description',
            'rankmath' => 'rank_math_facebook_description'
        ),
        'opengraph_image' => array(
            'yoast' => '_yoast_wpseo_opengraph-image',
            'rankmath' => 'rank_math_facebook_image'
        ),
        'twitter_title' => array(
            'yoast' => '_yoast_wpseo_twitter-title',
            'rankmath' => 'rank_math_twitter_title'
        ),
        'twitter_description' => array(
            'yoast' => '_yoast_wpseo_twitter-description',
            'rankmath' => 'rank_math_twitter_description'
        ),
        'twitter_image' => array(
            'yoast' => '_yoast_wpseo_twitter-image',
            'rankmath' => 'rank_math_twitter_image'
        ),
        'primary_category' => array(
            'yoast' => '_yoast_wpseo_primary_category',
            'rankmath' => 'rank_math_primary_category'
        )
    );
    
    /**
     * Plugin-specific fields (no equivalent in other plugin)
     */
    private $plugin_specific_fields = array(
        'yoast_only' => array(
            '_yoast_wpseo_linkdex' => 'SEO Score',
            '_yoast_wpseo_content_score' => 'Content Score',
            '_yoast_wpseo_keyword_synonyms' => 'Keyword Synonyms',
            '_yoast_wpseo_meta-robots-adv' => 'Advanced Robots',
            '_yoast_wpseo_bctitle' => 'Breadcrumb Title'
        ),
        'rankmath_only' => array(
            'rank_math_pillar_content' => 'Pillar Content Flag',
            'rank_math_breadcrumb_title' => 'Breadcrumb Title',
            'rank_math_twitter_card_type' => 'Twitter Card Type',
            'rank_math_rich_snippet' => 'Schema Type',
            'rank_math_snippet_article_type' => 'Article Schema Type',
            'rank_math_advanced_robots' => 'Advanced Robots',
            'rank_math_internal_links_processed' => 'Internal Links Processed'
        )
    );
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->load_detector();
    }
    
    /**
     * Load SEO plugin detector
     */
    private function load_detector() {
        if (!class_exists('PostCrafter_SEO_Plugin_Detector')) {
            require_once dirname(__FILE__) . '/class-seo-plugin-detector.php';
        }
        $this->detector = new PostCrafter_SEO_Plugin_Detector();
    }
    
    /**
     * Convert data from one plugin format to another
     * 
     * @param int $post_id Post ID
     * @param string $from_plugin Source plugin (yoast|rankmath)
     * @param string $to_plugin Target plugin (yoast|rankmath)
     * @param array $fields_to_convert Optional: specific fields to convert
     * @return array Conversion results
     */
    public function convert_between_plugins($post_id, $from_plugin, $to_plugin, $fields_to_convert = array()) {
        if (!$post_id || !is_numeric($post_id)) {
            return array('success' => false, 'error' => 'Invalid post ID');
        }
        
        if (!in_array($from_plugin, array('yoast', 'rankmath')) || !in_array($to_plugin, array('yoast', 'rankmath'))) {
            return array('success' => false, 'error' => 'Invalid plugin names');
        }
        
        if ($from_plugin === $to_plugin) {
            return array('success' => false, 'error' => 'Source and target plugins cannot be the same');
        }
        
        $conversion_key = $from_plugin . '_to_' . $to_plugin;
        $mapping = $this->field_mapping[$conversion_key];
        
        if (empty($fields_to_convert)) {
            $fields_to_convert = array_keys($mapping);
        }
        
        $results = array(
            'success' => true,
            'converted_fields' => array(),
            'skipped_fields' => array(),
            'errors' => array(),
            'summary' => array(
                'total_attempted' => 0,
                'successfully_converted' => 0,
                'skipped' => 0,
                'errors' => 0
            )
        );
        
        foreach ($fields_to_convert as $source_field) {
            $results['summary']['total_attempted']++;
            
            if (!isset($mapping[$source_field])) {
                $results['skipped_fields'][] = array(
                    'field' => $source_field,
                    'reason' => 'No mapping available'
                );
                $results['summary']['skipped']++;
                continue;
            }
            
            $source_value = get_post_meta($post_id, $source_field, true);
            
            if (empty($source_value) && $source_value !== '0' && $source_value !== 0) {
                $results['skipped_fields'][] = array(
                    'field' => $source_field,
                    'reason' => 'Empty source value'
                );
                $results['summary']['skipped']++;
                continue;
            }
            
            $target_field = $mapping[$source_field];
            $converted_value = $this->convert_field_value($source_field, $source_value, $from_plugin, $to_plugin);
            
            if ($converted_value === false) {
                $results['errors'][] = array(
                    'field' => $source_field,
                    'error' => 'Conversion failed'
                );
                $results['summary']['errors']++;
                continue;
            }
            
            // Handle special cases where one field maps to multiple fields
            if (is_array($target_field)) {
                foreach ($target_field as $tf) {
                    $update_result = update_post_meta($post_id, $tf, $converted_value[$tf]);
                    if ($update_result) {
                        $results['converted_fields'][] = array(
                            'source_field' => $source_field,
                            'target_field' => $tf,
                            'source_value' => $source_value,
                            'converted_value' => $converted_value[$tf]
                        );
                    }
                }
                $results['summary']['successfully_converted']++;
            } else {
                $update_result = update_post_meta($post_id, $target_field, $converted_value);
                if ($update_result !== false) {
                    $results['converted_fields'][] = array(
                        'source_field' => $source_field,
                        'target_field' => $target_field,
                        'source_value' => $source_value,
                        'converted_value' => $converted_value
                    );
                    $results['summary']['successfully_converted']++;
                } else {
                    $results['errors'][] = array(
                        'field' => $source_field,
                        'error' => 'Database update failed'
                    );
                    $results['summary']['errors']++;
                }
            }
        }
        
        return $results;
    }
    
    /**
     * Convert field value between plugin formats
     * 
     * @param string $field_name Field name
     * @param mixed $value Original value
     * @param string $from_plugin Source plugin
     * @param string $to_plugin Target plugin
     * @return mixed Converted value or false on failure
     */
    private function convert_field_value($field_name, $value, $from_plugin, $to_plugin) {
        // Handle robots meta fields (special conversion logic)
        if (strpos($field_name, 'robots') !== false) {
            return $this->convert_robots_field($field_name, $value, $from_plugin, $to_plugin);
        }
        
        // Handle image fields (ID vs URL conversion)
        if (strpos($field_name, 'image') !== false) {
            return $this->convert_image_field($field_name, $value, $from_plugin, $to_plugin);
        }
        
        // Handle array/serialized data
        if (is_array($value)) {
            return $this->convert_array_field($field_name, $value, $from_plugin, $to_plugin);
        }
        
        // Handle numeric fields
        if (strpos($field_name, 'category') !== false || strpos($field_name, 'score') !== false) {
            return intval($value);
        }
        
        // Default: return sanitized string
        return sanitize_text_field($value);
    }
    
    /**
     * Convert robots meta field between plugin formats
     * 
     * @param string $field_name Field name
     * @param mixed $value Original value
     * @param string $from_plugin Source plugin
     * @param string $to_plugin Target plugin
     * @return mixed Converted value
     */
    private function convert_robots_field($field_name, $value, $from_plugin, $to_plugin) {
        if ($from_plugin === 'yoast' && $to_plugin === 'rankmath') {
            // Yoast stores robots as individual boolean strings
            // RankMath stores robots as an array
            $robots_array = array();
            
            if (strpos($field_name, 'noindex') !== false && $value === '1') {
                $robots_array[] = 'noindex';
            }
            if (strpos($field_name, 'nofollow') !== false && $value === '1') {
                $robots_array[] = 'nofollow';
            }
            
            return $robots_array;
            
        } elseif ($from_plugin === 'rankmath' && $to_plugin === 'yoast') {
            // RankMath stores robots as an array
            // Yoast stores robots as individual boolean strings
            if (!is_array($value)) {
                return '';
            }
            
            $result = array();
            
            if (in_array('noindex', $value)) {
                $result['_yoast_wpseo_meta-robots-noindex'] = '1';
            } else {
                $result['_yoast_wpseo_meta-robots-noindex'] = '';
            }
            
            if (in_array('nofollow', $value)) {
                $result['_yoast_wpseo_meta-robots-nofollow'] = '1';
            } else {
                $result['_yoast_wpseo_meta-robots-nofollow'] = '';
            }
            
            return $result;
        }
        
        return $value;
    }
    
    /**
     * Convert image field between plugin formats
     * 
     * @param string $field_name Field name
     * @param mixed $value Original value
     * @param string $from_plugin Source plugin
     * @param string $to_plugin Target plugin
     * @return mixed Converted value
     */
    private function convert_image_field($field_name, $value, $from_plugin, $to_plugin) {
        // Both plugins generally store image URLs as strings
        // Some advanced conversion could be done here for attachment IDs vs URLs
        
        if (empty($value)) {
            return '';
        }
        
        // If it's a URL, sanitize and return
        if (filter_var($value, FILTER_VALIDATE_URL)) {
            return sanitize_url($value);
        }
        
        // If it's an attachment ID, try to get URL
        if (is_numeric($value)) {
            $image_url = wp_get_attachment_image_url($value, 'full');
            return $image_url ? sanitize_url($image_url) : '';
        }
        
        return sanitize_text_field($value);
    }
    
    /**
     * Convert array field between plugin formats
     * 
     * @param string $field_name Field name
     * @param array $value Original value
     * @param string $from_plugin Source plugin
     * @param string $to_plugin Target plugin
     * @return mixed Converted value
     */
    private function convert_array_field($field_name, $value, $from_plugin, $to_plugin) {
        // Handle serialized arrays or special array structures
        
        if (strpos($field_name, 'robots') !== false) {
            return $this->convert_robots_field($field_name, $value, $from_plugin, $to_plugin);
        }
        
        // For most array fields, convert to comma-separated string for compatibility
        if (is_array($value)) {
            return implode(', ', array_map('sanitize_text_field', $value));
        }
        
        return $value;
    }
    
    /**
     * Get normalized data for a post (unified format)
     * 
     * @param int $post_id Post ID
     * @param string $plugin Plugin to get data from (optional, auto-detect if not provided)
     * @return array Normalized data
     */
    public function get_normalized_data($post_id, $plugin = null) {
        if (!$post_id || !is_numeric($post_id)) {
            return array();
        }
        
        if (!$plugin) {
            $plugin = $this->detector->get_primary_plugin();
        }
        
        if (!$plugin || !in_array($plugin, array('yoast', 'rankmath'))) {
            return array();
        }
        
        $normalized_data = array();
        
        foreach ($this->universal_fields as $universal_field => $mapping) {
            if (!isset($mapping[$plugin])) {
                continue;
            }
            
            $plugin_field = $mapping[$plugin];
            $raw_value = get_post_meta($post_id, $plugin_field, true);
            
            // Convert to universal format
            $normalized_data[$universal_field] = $this->normalize_field_value($universal_field, $raw_value, $plugin);
        }
        
        // Add plugin-specific fields
        $normalized_data['plugin_specific'] = $this->get_plugin_specific_data($post_id, $plugin);
        $normalized_data['plugin_detected'] = $plugin;
        $normalized_data['conversion_info'] = array(
            'timestamp' => current_time('timestamp'),
            'plugin_version' => $this->get_plugin_version($plugin),
            'converter_version' => '1.1.0'
        );
        
        return $normalized_data;
    }
    
    /**
     * Normalize field value to universal format
     * 
     * @param string $field_name Universal field name
     * @param mixed $value Raw value from plugin
     * @param string $plugin Source plugin
     * @return mixed Normalized value
     */
    private function normalize_field_value($field_name, $value, $plugin) {
        switch ($field_name) {
            case 'robots_noindex':
            case 'robots_nofollow':
                if ($plugin === 'yoast') {
                    return $value === '1';
                } elseif ($plugin === 'rankmath') {
                    $robots_type = str_replace('robots_', '', $field_name);
                    return is_array($value) ? in_array($robots_type, $value) : false;
                }
                break;
                
            case 'primary_category':
                return intval($value);
                
            case 'opengraph_image':
            case 'twitter_image':
                if (is_numeric($value)) {
                    $image_url = wp_get_attachment_image_url($value, 'full');
                    return $image_url ? $image_url : '';
                }
                return filter_var($value, FILTER_VALIDATE_URL) ? $value : '';
                
            default:
                return sanitize_text_field($value);
        }
        
        return $value;
    }
    
    /**
     * Get plugin-specific data that has no equivalent in other plugins
     * 
     * @param int $post_id Post ID
     * @param string $plugin Plugin name
     * @return array Plugin-specific data
     */
    private function get_plugin_specific_data($post_id, $plugin) {
        $specific_data = array();
        $fields_key = $plugin . '_only';
        
        if (!isset($this->plugin_specific_fields[$fields_key])) {
            return $specific_data;
        }
        
        foreach ($this->plugin_specific_fields[$fields_key] as $field_key => $field_description) {
            $value = get_post_meta($post_id, $field_key, true);
            if (!empty($value) || $value === '0' || $value === 0) {
                $specific_data[$field_key] = array(
                    'value' => $value,
                    'description' => $field_description,
                    'type' => $this->get_field_type($field_key)
                );
            }
        }
        
        return $specific_data;
    }
    
    /**
     * Get field type for validation and conversion
     * 
     * @param string $field_name Field name
     * @return string Field type
     */
    private function get_field_type($field_name) {
        if (strpos($field_name, 'score') !== false) {
            return 'integer';
        }
        if (strpos($field_name, 'robots') !== false) {
            return 'boolean_array';
        }
        if (strpos($field_name, 'image') !== false) {
            return 'url';
        }
        if (strpos($field_name, 'category') !== false) {
            return 'integer';
        }
        if (strpos($field_name, 'pillar') !== false) {
            return 'boolean';
        }
        
        return 'text';
    }
    
    /**
     * Get plugin version for conversion tracking
     * 
     * @param string $plugin Plugin name
     * @return string Plugin version
     */
    private function get_plugin_version($plugin) {
        if ($plugin === 'yoast') {
            return defined('WPSEO_VERSION') ? WPSEO_VERSION : 'unknown';
        } elseif ($plugin === 'rankmath') {
            return defined('RANK_MATH_VERSION') ? RANK_MATH_VERSION : 'unknown';
        }
        
        return 'unknown';
    }
    
    /**
     * Create migration report between plugins
     * 
     * @param int $post_id Post ID
     * @param string $from_plugin Source plugin
     * @param string $to_plugin Target plugin
     * @return array Migration report
     */
    public function create_migration_report($post_id, $from_plugin, $to_plugin) {
        $report = array(
            'post_id' => $post_id,
            'from_plugin' => $from_plugin,
            'to_plugin' => $to_plugin,
            'timestamp' => current_time('mysql'),
            'mappable_fields' => array(),
            'plugin_specific_fields' => array(),
            'potential_data_loss' => array(),
            'recommendations' => array()
        );
        
        // Analyze mappable fields
        $conversion_key = $from_plugin . '_to_' . $to_plugin;
        if (isset($this->field_mapping[$conversion_key])) {
            foreach ($this->field_mapping[$conversion_key] as $source_field => $target_field) {
                $source_value = get_post_meta($post_id, $source_field, true);
                if (!empty($source_value) || $source_value === '0' || $source_value === 0) {
                    $report['mappable_fields'][] = array(
                        'source_field' => $source_field,
                        'target_field' => $target_field,
                        'has_data' => true,
                        'value_preview' => is_string($source_value) ? substr($source_value, 0, 50) . '...' : gettype($source_value)
                    );
                }
            }
        }
        
        // Analyze plugin-specific fields
        $from_specific_key = $from_plugin . '_only';
        if (isset($this->plugin_specific_fields[$from_specific_key])) {
            foreach ($this->plugin_specific_fields[$from_specific_key] as $field_key => $field_description) {
                $value = get_post_meta($post_id, $field_key, true);
                if (!empty($value) || $value === '0' || $value === 0) {
                    $report['plugin_specific_fields'][] = array(
                        'field' => $field_key,
                        'description' => $field_description,
                        'value_preview' => is_string($value) ? substr($value, 0, 50) . '...' : gettype($value)
                    );
                    
                    $report['potential_data_loss'][] = array(
                        'field' => $field_key,
                        'reason' => 'No equivalent in ' . $to_plugin,
                        'severity' => 'medium'
                    );
                }
            }
        }
        
        // Generate recommendations
        $report['recommendations'] = $this->generate_migration_recommendations($report);
        
        return $report;
    }
    
    /**
     * Generate migration recommendations based on analysis
     * 
     * @param array $report Migration report data
     * @return array Recommendations
     */
    private function generate_migration_recommendations($report) {
        $recommendations = array();
        
        if (!empty($report['potential_data_loss'])) {
            $recommendations[] = array(
                'type' => 'warning',
                'message' => 'Some plugin-specific fields will not be migrated',
                'action' => 'Consider documenting these fields before migration'
            );
        }
        
        if (count($report['mappable_fields']) > 0) {
            $recommendations[] = array(
                'type' => 'success',
                'message' => count($report['mappable_fields']) . ' fields can be automatically migrated',
                'action' => 'Proceed with migration'
            );
        }
        
        $recommendations[] = array(
            'type' => 'info',
            'message' => 'Test migration on staging environment first',
            'action' => 'Create backup before proceeding'
        );
        
        return $recommendations;
    }
    
    /**
     * Validate converted data integrity
     * 
     * @param int $post_id Post ID
     * @param array $conversion_results Conversion results
     * @return array Validation results
     */
    public function validate_conversion_integrity($post_id, $conversion_results) {
        $validation = array(
            'is_valid' => true,
            'errors' => array(),
            'warnings' => array(),
            'field_checks' => array()
        );
        
        if (!isset($conversion_results['converted_fields'])) {
            $validation['is_valid'] = false;
            $validation['errors'][] = 'No conversion results provided';
            return $validation;
        }
        
        foreach ($conversion_results['converted_fields'] as $conversion) {
            $field_check = array(
                'field' => $conversion['target_field'],
                'status' => 'valid'
            );
            
            // Verify the field was actually saved
            $saved_value = get_post_meta($post_id, $conversion['target_field'], true);
            
            if (empty($saved_value) && $saved_value !== '0' && $saved_value !== 0) {
                $field_check['status'] = 'error';
                $validation['errors'][] = 'Field ' . $conversion['target_field'] . ' was not saved properly';
                $validation['is_valid'] = false;
            } elseif ($saved_value !== $conversion['converted_value']) {
                $field_check['status'] = 'warning';
                $validation['warnings'][] = 'Field ' . $conversion['target_field'] . ' value differs from expected';
            }
            
            $validation['field_checks'][] = $field_check;
        }
        
        return $validation;
    }
    
    /**
     * Get conversion compatibility matrix
     * 
     * @return array Compatibility matrix
     */
    public function get_conversion_compatibility_matrix() {
        return array(
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
            'field_compatibility' => $this->field_mapping,
            'plugin_specific_fields' => $this->plugin_specific_fields,
            'conversion_notes' => array(
                'robots_meta' => 'Requires format conversion between boolean strings and arrays',
                'image_fields' => 'May require conversion between attachment IDs and URLs',
                'advanced_features' => 'Some plugin-specific features have no equivalent'
            )
        );
    }
    
    /**
     * Clear conversion cache and temporary data
     * 
     * @param int $post_id Post ID (optional)
     */
    public function clear_conversion_cache($post_id = null) {
        if ($post_id) {
            delete_transient('postcrafter_conversion_cache_' . $post_id);
            wp_cache_delete($post_id, 'post_meta');
        } else {
            // Clear all conversion caches
            global $wpdb;
            $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_postcrafter_conversion_cache_%'");
        }
    }
}
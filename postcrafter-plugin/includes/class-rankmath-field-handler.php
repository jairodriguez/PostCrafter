<?php
/**
 * RankMath Field Handler Class
 * 
 * Handles RankMath SEO field operations and mapping to REST API structure
 * 
 * @package PostCrafter
 * @since 1.1.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class PostCrafter_RankMath_Field_Handler {
    
    /**
     * RankMath meta keys mapping
     */
    private $meta_keys = array(
        // Basic SEO fields
        'title' => 'rank_math_title',
        'description' => 'rank_math_description',
        'focus_keywords' => 'rank_math_focus_keyword',
        
        // Robots meta
        'robots_noindex' => 'rank_math_robots',
        'robots_nofollow' => 'rank_math_robots',
        
        // URLs and linking
        'canonical' => 'rank_math_canonical_url',
        'primary_category' => 'rank_math_primary_category',
        
        // Social media fields
        'opengraph_title' => 'rank_math_facebook_title',
        'opengraph_description' => 'rank_math_facebook_description',
        'opengraph_image' => 'rank_math_facebook_image',
        'opengraph_image_id' => 'rank_math_facebook_image_id',
        
        'twitter_title' => 'rank_math_twitter_title',
        'twitter_description' => 'rank_math_twitter_description',
        'twitter_image' => 'rank_math_twitter_image',
        'twitter_image_id' => 'rank_math_twitter_image_id',
        'twitter_card_type' => 'rank_math_twitter_card_type',
        
        // Advanced fields
        'breadcrumbs_title' => 'rank_math_breadcrumb_title',
        'advanced_robots' => 'rank_math_advanced_robots',
        'snippet_type' => 'rank_math_snippet_type',
        'snippet_shortcode' => 'rank_math_snippet_shortcode',
        
        // Schema fields
        'schema_type' => 'rank_math_rich_snippet',
        'schema_article_type' => 'rank_math_snippet_article_type',
        'schema_course_provider' => 'rank_math_snippet_course_provider',
        'schema_course_provider_type' => 'rank_math_snippet_course_provider_type',
        
        // Review fields
        'review_worst_rating' => 'rank_math_snippet_review_worst_rating',
        'review_best_rating' => 'rank_math_snippet_review_best_rating',
        'review_rating_value' => 'rank_math_snippet_review_rating_value',
        'review_count' => 'rank_math_snippet_review_count',
        
        // Product fields (WooCommerce integration)
        'product_sku' => 'rank_math_snippet_product_sku',
        'product_brand' => 'rank_math_snippet_product_brand',
        'product_currency' => 'rank_math_snippet_product_currency',
        'product_price' => 'rank_math_snippet_product_price',
        'product_price_valid' => 'rank_math_snippet_product_price_valid',
        'product_instock' => 'rank_math_snippet_product_instock',
        
        // Additional meta
        'pillar_content' => 'rank_math_pillar_content',
        'internal_links' => 'rank_math_internal_links_processed'
    );
    
    /**
     * Field type mappings for validation
     */
    private $field_types = array(
        'title' => 'text',
        'description' => 'textarea',
        'focus_keywords' => 'text',
        'robots_noindex' => 'checkbox',
        'robots_nofollow' => 'checkbox',
        'canonical' => 'url',
        'primary_category' => 'number',
        'opengraph_title' => 'text',
        'opengraph_description' => 'textarea',
        'opengraph_image' => 'url',
        'twitter_title' => 'text',
        'twitter_description' => 'textarea',
        'twitter_image' => 'url',
        'twitter_card_type' => 'select',
        'breadcrumbs_title' => 'text',
        'pillar_content' => 'checkbox'
    );
    
    /**
     * Constructor
     */
    public function __construct() {
        add_action('init', array($this, 'init'));
    }
    
    /**
     * Initialize the field handler
     */
    public function init() {
        // Add hooks for RankMath field operations
        add_action('save_post', array($this, 'save_rankmath_fields'), 10, 2);
        add_action('wp_ajax_get_rankmath_fields', array($this, 'ajax_get_rankmath_fields'));
        
        // Add filter for field mapping compatibility
        add_filter('postcrafter_rankmath_meta_keys', array($this, 'get_meta_keys'));
        add_filter('postcrafter_rankmath_field_types', array($this, 'get_field_types'));
    }
    
    /**
     * Get all RankMath fields for a post
     * 
     * @param int $post_id Post ID
     * @return array|false RankMath fields or false on error
     */
    public function get_rankmath_fields($post_id) {
        // Validate post ID
        if (!$post_id || !is_numeric($post_id)) {
            return false;
        }
        
        // Check if post exists
        $post = get_post($post_id);
        if (!$post) {
            return false;
        }
        
        $fields = array(
            // Basic SEO fields
            'meta_title' => $this->get_rankmath_meta_title($post_id),
            'meta_description' => $this->get_rankmath_meta_description($post_id),
            'focus_keywords' => $this->get_rankmath_focus_keywords($post_id),
            
            // Robots meta
            'meta_robots_noindex' => $this->get_rankmath_meta_robots_noindex($post_id),
            'meta_robots_nofollow' => $this->get_rankmath_meta_robots_nofollow($post_id),
            
            // URLs and linking
            'canonical' => $this->get_rankmath_canonical($post_id),
            'primary_category' => $this->get_rankmath_primary_category($post_id),
            
            // Social media
            'opengraph_title' => $this->get_rankmath_opengraph_title($post_id),
            'opengraph_description' => $this->get_rankmath_opengraph_description($post_id),
            'opengraph_image' => $this->get_rankmath_opengraph_image($post_id),
            'twitter_title' => $this->get_rankmath_twitter_title($post_id),
            'twitter_description' => $this->get_rankmath_twitter_description($post_id),
            'twitter_image' => $this->get_rankmath_twitter_image($post_id),
            'twitter_card_type' => $this->get_rankmath_twitter_card_type($post_id),
            
            // Advanced fields
            'breadcrumbs_title' => $this->get_rankmath_breadcrumbs_title($post_id),
            'pillar_content' => $this->get_rankmath_pillar_content($post_id),
            
            // Schema
            'schema_type' => $this->get_rankmath_schema_type($post_id),
            
            // Calculated/derived fields
            'seo_score' => $this->get_rankmath_seo_score($post_id)
        );
        
        return $fields;
    }
    
    /**
     * Get RankMath meta title
     * 
     * @param int $post_id Post ID
     * @return string Meta title
     */
    public function get_rankmath_meta_title($post_id) {
        return get_post_meta($post_id, $this->meta_keys['title'], true);
    }
    
    /**
     * Get RankMath meta description
     * 
     * @param int $post_id Post ID
     * @return string Meta description
     */
    public function get_rankmath_meta_description($post_id) {
        return get_post_meta($post_id, $this->meta_keys['description'], true);
    }
    
    /**
     * Get RankMath focus keywords
     * 
     * @param int $post_id Post ID
     * @return string Focus keywords
     */
    public function get_rankmath_focus_keywords($post_id) {
        return get_post_meta($post_id, $this->meta_keys['focus_keywords'], true);
    }
    
    /**
     * Get RankMath robots noindex setting
     * 
     * @param int $post_id Post ID
     * @return bool Noindex setting
     */
    public function get_rankmath_meta_robots_noindex($post_id) {
        $robots = get_post_meta($post_id, $this->meta_keys['robots_noindex'], true);
        
        // RankMath stores robots as an array or comma-separated string
        if (is_array($robots)) {
            return in_array('noindex', $robots);
        }
        
        if (is_string($robots)) {
            return strpos($robots, 'noindex') !== false;
        }
        
        return false;
    }
    
    /**
     * Get RankMath robots nofollow setting
     * 
     * @param int $post_id Post ID
     * @return bool Nofollow setting
     */
    public function get_rankmath_meta_robots_nofollow($post_id) {
        $robots = get_post_meta($post_id, $this->meta_keys['robots_nofollow'], true);
        
        // RankMath stores robots as an array or comma-separated string
        if (is_array($robots)) {
            return in_array('nofollow', $robots);
        }
        
        if (is_string($robots)) {
            return strpos($robots, 'nofollow') !== false;
        }
        
        return false;
    }
    
    /**
     * Get RankMath canonical URL
     * 
     * @param int $post_id Post ID
     * @return string Canonical URL
     */
    public function get_rankmath_canonical($post_id) {
        return get_post_meta($post_id, $this->meta_keys['canonical'], true);
    }
    
    /**
     * Get RankMath primary category
     * 
     * @param int $post_id Post ID
     * @return int Primary category ID
     */
    public function get_rankmath_primary_category($post_id) {
        return intval(get_post_meta($post_id, $this->meta_keys['primary_category'], true));
    }
    
    /**
     * Get RankMath OpenGraph title
     * 
     * @param int $post_id Post ID
     * @return string OpenGraph title
     */
    public function get_rankmath_opengraph_title($post_id) {
        return get_post_meta($post_id, $this->meta_keys['opengraph_title'], true);
    }
    
    /**
     * Get RankMath OpenGraph description
     * 
     * @param int $post_id Post ID
     * @return string OpenGraph description
     */
    public function get_rankmath_opengraph_description($post_id) {
        return get_post_meta($post_id, $this->meta_keys['opengraph_description'], true);
    }
    
    /**
     * Get RankMath OpenGraph image
     * 
     * @param int $post_id Post ID
     * @return string OpenGraph image URL
     */
    public function get_rankmath_opengraph_image($post_id) {
        $image_id = get_post_meta($post_id, $this->meta_keys['opengraph_image_id'], true);
        
        if ($image_id) {
            $image_url = wp_get_attachment_image_url($image_id, 'full');
            if ($image_url) {
                return $image_url;
            }
        }
        
        // Fallback to direct URL field
        return get_post_meta($post_id, $this->meta_keys['opengraph_image'], true);
    }
    
    /**
     * Get RankMath Twitter title
     * 
     * @param int $post_id Post ID
     * @return string Twitter title
     */
    public function get_rankmath_twitter_title($post_id) {
        return get_post_meta($post_id, $this->meta_keys['twitter_title'], true);
    }
    
    /**
     * Get RankMath Twitter description
     * 
     * @param int $post_id Post ID
     * @return string Twitter description
     */
    public function get_rankmath_twitter_description($post_id) {
        return get_post_meta($post_id, $this->meta_keys['twitter_description'], true);
    }
    
    /**
     * Get RankMath Twitter image
     * 
     * @param int $post_id Post ID
     * @return string Twitter image URL
     */
    public function get_rankmath_twitter_image($post_id) {
        $image_id = get_post_meta($post_id, $this->meta_keys['twitter_image_id'], true);
        
        if ($image_id) {
            $image_url = wp_get_attachment_image_url($image_id, 'full');
            if ($image_url) {
                return $image_url;
            }
        }
        
        // Fallback to direct URL field
        return get_post_meta($post_id, $this->meta_keys['twitter_image'], true);
    }
    
    /**
     * Get RankMath Twitter card type
     * 
     * @param int $post_id Post ID
     * @return string Twitter card type
     */
    public function get_rankmath_twitter_card_type($post_id) {
        return get_post_meta($post_id, $this->meta_keys['twitter_card_type'], true);
    }
    
    /**
     * Get RankMath breadcrumbs title
     * 
     * @param int $post_id Post ID
     * @return string Breadcrumbs title
     */
    public function get_rankmath_breadcrumbs_title($post_id) {
        return get_post_meta($post_id, $this->meta_keys['breadcrumbs_title'], true);
    }
    
    /**
     * Get RankMath pillar content setting
     * 
     * @param int $post_id Post ID
     * @return bool Pillar content setting
     */
    public function get_rankmath_pillar_content($post_id) {
        return (bool) get_post_meta($post_id, $this->meta_keys['pillar_content'], true);
    }
    
    /**
     * Get RankMath schema type
     * 
     * @param int $post_id Post ID
     * @return string Schema type
     */
    public function get_rankmath_schema_type($post_id) {
        return get_post_meta($post_id, $this->meta_keys['schema_type'], true);
    }
    
    /**
     * Get RankMath SEO score (calculated)
     * 
     * @param int $post_id Post ID
     * @return int SEO score
     */
    public function get_rankmath_seo_score($post_id) {
        // RankMath doesn't store a direct SEO score like Yoast
        // We can implement a basic calculation or return a placeholder
        $score = 0;
        
        // Basic scoring based on field completion
        if ($this->get_rankmath_meta_title($post_id)) $score += 25;
        if ($this->get_rankmath_meta_description($post_id)) $score += 25;
        if ($this->get_rankmath_focus_keywords($post_id)) $score += 25;
        if ($this->get_rankmath_canonical($post_id)) $score += 25;
        
        return $score;
    }
    
    /**
     * Set RankMath meta title
     * 
     * @param int $post_id Post ID
     * @param string $value Meta title value
     * @return bool Success status
     */
    public function set_rankmath_meta_title($post_id, $value) {
        if (!$post_id || !is_numeric($post_id)) {
            return false;
        }
        
        // Validate and sanitize the input
        $validation_handler = new PostCrafter_Validation_Handler();
        $validation = $validation_handler->validate_meta_title_comprehensive($value, $post_id);
        
        if (!$validation['valid']) {
            // Log validation errors
            $validation_handler->log_validation_errors($validation['errors'], $post_id);
            return false;
        }
        
        $result = update_post_meta($post_id, $this->meta_keys['title'], $validation['sanitized']);
        
        // Clear RankMath cache if available
        $this->clear_rankmath_cache($post_id);
        
        return $result;
    }
    
    /**
     * Set RankMath meta description
     * 
     * @param int $post_id Post ID
     * @param string $value Meta description value
     * @return bool Success status
     */
    public function set_rankmath_meta_description($post_id, $value) {
        if (!$post_id || !is_numeric($post_id)) {
            return false;
        }
        
        // Validate and sanitize the input
        $validation_handler = new PostCrafter_Validation_Handler();
        $validation = $validation_handler->validate_meta_description_comprehensive($value, $post_id);
        
        if (!$validation['valid']) {
            // Log validation errors
            $validation_handler->log_validation_errors($validation['errors'], $post_id);
            return false;
        }
        
        $result = update_post_meta($post_id, $this->meta_keys['description'], $validation['sanitized']);
        
        // Clear RankMath cache if available
        $this->clear_rankmath_cache($post_id);
        
        return $result;
    }
    
    /**
     * Set RankMath focus keywords
     * 
     * @param int $post_id Post ID
     * @param string $value Focus keywords value
     * @return bool Success status
     */
    public function set_rankmath_focus_keywords($post_id, $value) {
        if (!$post_id || !is_numeric($post_id)) {
            return false;
        }
        
        // Validate and sanitize the input
        $validation_handler = new PostCrafter_Validation_Handler();
        $validation = $validation_handler->validate_focus_keywords_comprehensive($value, $post_id);
        
        if (!$validation['valid']) {
            // Log validation errors
            $validation_handler->log_validation_errors($validation['errors'], $post_id);
            return false;
        }
        
        $result = update_post_meta($post_id, $this->meta_keys['focus_keywords'], $validation['sanitized']);
        
        // Clear RankMath cache if available
        $this->clear_rankmath_cache($post_id);
        
        return $result;
    }
    
    /**
     * Set RankMath robots noindex
     * 
     * @param int $post_id Post ID
     * @param bool $value Noindex value
     * @return bool Success status
     */
    public function set_rankmath_meta_robots_noindex($post_id, $value) {
        if (!$post_id || !is_numeric($post_id)) {
            return false;
        }
        
        // Get current robots settings
        $robots = get_post_meta($post_id, $this->meta_keys['robots_noindex'], true);
        
        if (!is_array($robots)) {
            $robots = array();
        }
        
        // Add or remove noindex
        if ($value) {
            if (!in_array('noindex', $robots)) {
                $robots[] = 'noindex';
            }
        } else {
            $robots = array_diff($robots, array('noindex'));
        }
        
        $result = update_post_meta($post_id, $this->meta_keys['robots_noindex'], $robots);
        
        // Clear RankMath cache if available
        $this->clear_rankmath_cache($post_id);
        
        return $result;
    }
    
    /**
     * Set RankMath robots nofollow
     * 
     * @param int $post_id Post ID
     * @param bool $value Nofollow value
     * @return bool Success status
     */
    public function set_rankmath_meta_robots_nofollow($post_id, $value) {
        if (!$post_id || !is_numeric($post_id)) {
            return false;
        }
        
        // Get current robots settings
        $robots = get_post_meta($post_id, $this->meta_keys['robots_nofollow'], true);
        
        if (!is_array($robots)) {
            $robots = array();
        }
        
        // Add or remove nofollow
        if ($value) {
            if (!in_array('nofollow', $robots)) {
                $robots[] = 'nofollow';
            }
        } else {
            $robots = array_diff($robots, array('nofollow'));
        }
        
        $result = update_post_meta($post_id, $this->meta_keys['robots_nofollow'], $robots);
        
        // Clear RankMath cache if available
        $this->clear_rankmath_cache($post_id);
        
        return $result;
    }
    
    /**
     * Set RankMath canonical URL
     * 
     * @param int $post_id Post ID
     * @param string $value Canonical URL
     * @return bool Success status
     */
    public function set_rankmath_canonical($post_id, $value) {
        if (!$post_id || !is_numeric($post_id)) {
            return false;
        }
        
        // Validate URL
        if (!empty($value) && !filter_var($value, FILTER_VALIDATE_URL)) {
            return false;
        }
        
        $result = update_post_meta($post_id, $this->meta_keys['canonical'], sanitize_url($value));
        
        // Clear RankMath cache if available
        $this->clear_rankmath_cache($post_id);
        
        return $result;
    }
    
    /**
     * Set RankMath primary category
     * 
     * @param int $post_id Post ID
     * @param int $value Category ID
     * @return bool Success status
     */
    public function set_rankmath_primary_category($post_id, $value) {
        if (!$post_id || !is_numeric($post_id)) {
            return false;
        }
        
        // Validate category ID
        if (!empty($value) && !term_exists($value, 'category')) {
            return false;
        }
        
        $result = update_post_meta($post_id, $this->meta_keys['primary_category'], intval($value));
        
        // Clear RankMath cache if available
        $this->clear_rankmath_cache($post_id);
        
        return $result;
    }
    
    /**
     * Save RankMath fields on post save
     * 
     * @param int $post_id Post ID
     * @param WP_Post $post Post object
     */
    public function save_rankmath_fields($post_id, $post) {
        // Skip auto-saves and revisions
        if (wp_is_post_autosave($post_id) || wp_is_post_revision($post_id)) {
            return;
        }
        
        // Check user permissions
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }
        
        // Process REST API field updates
        if (defined('REST_REQUEST') && REST_REQUEST) {
            // This will be handled by the REST API callbacks
            return;
        }
        
        // Process form submissions
        if (isset($_POST['rank_math_title'])) {
            $this->set_rankmath_meta_title($post_id, $_POST['rank_math_title']);
        }
        
        if (isset($_POST['rank_math_description'])) {
            $this->set_rankmath_meta_description($post_id, $_POST['rank_math_description']);
        }
        
        if (isset($_POST['rank_math_focus_keyword'])) {
            $this->set_rankmath_focus_keywords($post_id, $_POST['rank_math_focus_keyword']);
        }
    }
    
    /**
     * AJAX handler to get RankMath fields
     */
    public function ajax_get_rankmath_fields() {
        // Check nonce and permissions
        if (!wp_verify_nonce($_POST['nonce'], 'postcrafter_rankmath_nonce') || 
            !current_user_can('edit_posts')) {
            wp_die(__('Permission denied', 'postcrafter-seo'));
        }
        
        $post_id = intval($_POST['post_id']);
        $fields = $this->get_rankmath_fields($post_id);
        
        wp_send_json_success($fields);
    }
    
    /**
     * Clear RankMath cache for a post
     * 
     * @param int $post_id Post ID
     */
    private function clear_rankmath_cache($post_id) {
        // RankMath cache clearing
        if (function_exists('rank_math_flush_cache')) {
            rank_math_flush_cache();
        }
        
        // Clear object cache
        wp_cache_delete($post_id, 'post_meta');
        
        // Clear any transients related to this post
        delete_transient('rankmath_post_' . $post_id);
    }
    
    /**
     * Get meta keys mapping
     * 
     * @return array Meta keys
     */
    public function get_meta_keys() {
        return $this->meta_keys;
    }
    
    /**
     * Get field types mapping
     * 
     * @return array Field types
     */
    public function get_field_types() {
        return $this->field_types;
    }
    
    /**
     * Convert RankMath field to universal format
     * 
     * @param string $field_name Field name
     * @param mixed $value Field value
     * @return mixed Converted value
     */
    public function convert_to_universal_format($field_name, $value) {
        switch ($field_name) {
            case 'robots_noindex':
            case 'robots_nofollow':
                // Convert RankMath robots array to boolean
                if (is_array($value)) {
                    return in_array(str_replace('robots_', '', $field_name), $value);
                }
                return (bool) $value;
                
            case 'primary_category':
                return intval($value);
                
            case 'pillar_content':
                return (bool) $value;
                
            default:
                return $value;
        }
    }
    
    /**
     * Convert universal format to RankMath field
     * 
     * @param string $field_name Field name
     * @param mixed $value Field value
     * @return mixed Converted value
     */
    public function convert_from_universal_format($field_name, $value) {
        switch ($field_name) {
            case 'robots_noindex':
            case 'robots_nofollow':
                // Convert boolean to RankMath robots array format
                $robots_key = str_replace('robots_', '', $field_name);
                $current_robots = get_post_meta($this->current_post_id, $this->meta_keys[$field_name], true);
                
                if (!is_array($current_robots)) {
                    $current_robots = array();
                }
                
                if ($value) {
                    if (!in_array($robots_key, $current_robots)) {
                        $current_robots[] = $robots_key;
                    }
                } else {
                    $current_robots = array_diff($current_robots, array($robots_key));
                }
                
                return $current_robots;
                
            default:
                return $value;
        }
    }
    
    /**
     * Check if RankMath supports a specific field
     * 
     * @param string $field_name Field name
     * @return bool Support status
     */
    public function supports_field($field_name) {
        return array_key_exists($field_name, $this->meta_keys);
    }
    
    /**
     * Get RankMath field capabilities
     * 
     * @return array Capabilities
     */
    public function get_capabilities() {
        return array(
            'meta_title' => true,
            'meta_description' => true,
            'focus_keywords' => true,
            'robots_meta' => true,
            'canonical_url' => true,
            'primary_category' => true,
            'social_media' => true,
            'breadcrumbs' => true,
            'schema_markup' => true,
            'advanced_seo' => true,
            'pillar_content' => true,
            'woocommerce_integration' => true,
            'content_analysis' => true,
            'keyword_tracking' => true,
            'internal_linking' => true
        );
    }
    
    /**
     * Get all available RankMath fields
     * 
     * @return array Available fields with descriptions
     */
    public function get_available_fields() {
        return array(
            'basic' => array(
                'meta_title' => __('SEO Title', 'postcrafter-seo'),
                'meta_description' => __('Meta Description', 'postcrafter-seo'),
                'focus_keywords' => __('Focus Keywords', 'postcrafter-seo')
            ),
            'robots' => array(
                'meta_robots_noindex' => __('No Index', 'postcrafter-seo'),
                'meta_robots_nofollow' => __('No Follow', 'postcrafter-seo')
            ),
            'linking' => array(
                'canonical' => __('Canonical URL', 'postcrafter-seo'),
                'primary_category' => __('Primary Category', 'postcrafter-seo')
            ),
            'social' => array(
                'opengraph_title' => __('Facebook Title', 'postcrafter-seo'),
                'opengraph_description' => __('Facebook Description', 'postcrafter-seo'),
                'opengraph_image' => __('Facebook Image', 'postcrafter-seo'),
                'twitter_title' => __('Twitter Title', 'postcrafter-seo'),
                'twitter_description' => __('Twitter Description', 'postcrafter-seo'),
                'twitter_image' => __('Twitter Image', 'postcrafter-seo'),
                'twitter_card_type' => __('Twitter Card Type', 'postcrafter-seo')
            ),
            'advanced' => array(
                'breadcrumbs_title' => __('Breadcrumbs Title', 'postcrafter-seo'),
                'schema_type' => __('Schema Type', 'postcrafter-seo'),
                'pillar_content' => __('Pillar Content', 'postcrafter-seo')
            )
        );
    }
}
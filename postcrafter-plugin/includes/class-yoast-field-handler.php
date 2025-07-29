<?php
/**
 * Yoast Field Handler Class
 * 
 * Handles Yoast SEO field operations and compatibility
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class PostCrafter_Yoast_Field_Handler {
    
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
        // Add hooks for Yoast field operations
        add_action('save_post', array($this, 'save_yoast_fields'), 10, 2);
        add_action('wp_ajax_get_yoast_fields', array($this, 'ajax_get_yoast_fields'));
    }
    
    /**
     * Get all Yoast fields for a post
     */
    public function get_yoast_fields($post_id) {
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
            'meta_title' => $this->get_yoast_meta_title($post_id),
            'meta_description' => $this->get_yoast_meta_description($post_id),
            'focus_keywords' => $this->get_yoast_focus_keywords($post_id),
            'meta_robots_noindex' => $this->get_yoast_meta_robots_noindex($post_id),
            'meta_robots_nofollow' => $this->get_yoast_meta_robots_nofollow($post_id),
            'canonical' => $this->get_yoast_canonical($post_id),
            'primary_category' => $this->get_yoast_primary_category($post_id),
            'seo_score' => $this->get_yoast_seo_score($post_id)
        );
        
        return $fields;
    }
    
    /**
     * Get Yoast meta title
     */
    public function get_yoast_meta_title($post_id) {
        $compatibility = new PostCrafter_Yoast_Compatibility();
        $meta_key = $compatibility->get_meta_key('title');
        return get_post_meta($post_id, $meta_key, true);
    }
    
    /**
     * Get Yoast meta description
     */
    public function get_yoast_meta_description($post_id) {
        $compatibility = new PostCrafter_Yoast_Compatibility();
        $meta_key = $compatibility->get_meta_key('description');
        return get_post_meta($post_id, $meta_key, true);
    }
    
    /**
     * Get Yoast focus keywords
     */
    public function get_yoast_focus_keywords($post_id) {
        $compatibility = new PostCrafter_Yoast_Compatibility();
        $meta_key = $compatibility->get_meta_key('focus_keywords');
        return get_post_meta($post_id, $meta_key, true);
    }
    
    /**
     * Get Yoast meta robots noindex
     */
    public function get_yoast_meta_robots_noindex($post_id) {
        $compatibility = new PostCrafter_Yoast_Compatibility();
        $meta_key = $compatibility->get_meta_key('robots_noindex');
        return get_post_meta($post_id, $meta_key, true);
    }
    
    /**
     * Get Yoast meta robots nofollow
     */
    public function get_yoast_meta_robots_nofollow($post_id) {
        $compatibility = new PostCrafter_Yoast_Compatibility();
        $meta_key = $compatibility->get_meta_key('robots_nofollow');
        return get_post_meta($post_id, $meta_key, true);
    }
    
    /**
     * Get Yoast canonical URL
     */
    public function get_yoast_canonical($post_id) {
        $compatibility = new PostCrafter_Yoast_Compatibility();
        $meta_key = $compatibility->get_meta_key('canonical');
        return get_post_meta($post_id, $meta_key, true);
    }
    
    /**
     * Get Yoast primary category
     */
    public function get_yoast_primary_category($post_id) {
        $compatibility = new PostCrafter_Yoast_Compatibility();
        $meta_key = $compatibility->get_meta_key('primary_category');
        return get_post_meta($post_id, $meta_key, true);
    }
    
    /**
     * Save Yoast fields for a post
     */
    public function save_yoast_fields($post_id, $post) {
        // Only save for posts
        if ($post->post_type !== 'post') {
            return;
        }
        
        // Check if this is an autosave
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }
        
        // Check permissions
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }
        
        // Save Yoast fields if they exist in the request
        if (isset($_POST['yoast_meta_title'])) {
            $this->set_yoast_meta_title($post_id, $_POST['yoast_meta_title']);
        }
        
        if (isset($_POST['yoast_meta_description'])) {
            $this->set_yoast_meta_description($post_id, $_POST['yoast_meta_description']);
        }
        
        if (isset($_POST['yoast_focus_keywords'])) {
            $this->set_yoast_focus_keywords($post_id, $_POST['yoast_focus_keywords']);
        }
    }
    
    /**
     * Set Yoast meta title
     */
    public function set_yoast_meta_title($post_id, $value) {
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
        
        $compatibility = new PostCrafter_Yoast_Compatibility();
        $meta_key = $compatibility->get_meta_key('title');
        
        $result = update_post_meta($post_id, $meta_key, $validation['sanitized']);
        
        // Clear Yoast cache if available
        $this->clear_yoast_cache($post_id);
        
        return $result;
    }
    
    /**
     * Set Yoast meta description
     */
    public function set_yoast_meta_description($post_id, $value) {
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
        
        $compatibility = new PostCrafter_Yoast_Compatibility();
        $meta_key = $compatibility->get_meta_key('description');
        
        $result = update_post_meta($post_id, $meta_key, $validation['sanitized']);
        
        // Clear Yoast cache if available
        $this->clear_yoast_cache($post_id);
        
        return $result;
    }
    
    /**
     * Set Yoast focus keywords
     */
    public function set_yoast_focus_keywords($post_id, $value) {
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
        
        $compatibility = new PostCrafter_Yoast_Compatibility();
        $meta_key = $compatibility->get_meta_key('focus_keywords');
        
        $result = update_post_meta($post_id, $meta_key, $validation['sanitized']);
        
        // Clear Yoast cache if available
        $this->clear_yoast_cache($post_id);
        
        return $result;
    }
    
    /**
     * Set Yoast meta robots noindex
     */
    public function set_yoast_meta_robots_noindex($post_id, $value) {
        if (!$post_id || !is_numeric($post_id)) {
            return false;
        }
        
        // Validate and sanitize the input
        $validation_handler = new PostCrafter_Validation_Handler();
        $validation = $validation_handler->validate_robots_noindex($value, $post_id);
        
        if (!$validation['valid']) {
            // Log validation errors
            $validation_handler->log_validation_errors($validation['errors'], $post_id);
            return false;
        }
        
        $compatibility = new PostCrafter_Yoast_Compatibility();
        $meta_key = $compatibility->get_meta_key('robots_noindex');
        
        $result = update_post_meta($post_id, $meta_key, $validation['sanitized']);
        
        // Clear Yoast cache if available
        $this->clear_yoast_cache($post_id);
        
        return $result;
    }
    
    /**
     * Set Yoast meta robots nofollow
     */
    public function set_yoast_meta_robots_nofollow($post_id, $value) {
        if (!$post_id || !is_numeric($post_id)) {
            return false;
        }
        
        // Validate and sanitize the input
        $validation_handler = new PostCrafter_Validation_Handler();
        $validation = $validation_handler->validate_robots_nofollow($value, $post_id);
        
        if (!$validation['valid']) {
            // Log validation errors
            $validation_handler->log_validation_errors($validation['errors'], $post_id);
            return false;
        }
        
        $compatibility = new PostCrafter_Yoast_Compatibility();
        $meta_key = $compatibility->get_meta_key('robots_nofollow');
        
        $result = update_post_meta($post_id, $meta_key, $validation['sanitized']);
        
        // Clear Yoast cache if available
        $this->clear_yoast_cache($post_id);
        
        return $result;
    }
    
    /**
     * Set Yoast canonical URL
     */
    public function set_yoast_canonical($post_id, $value) {
        if (!$post_id || !is_numeric($post_id)) {
            return false;
        }
        
        // Validate and sanitize the input
        $validation_handler = new PostCrafter_Validation_Handler();
        $validation = $validation_handler->validate_canonical_url($value, $post_id);
        
        if (!$validation['valid']) {
            // Log validation errors
            $validation_handler->log_validation_errors($validation['errors'], $post_id);
            return false;
        }
        
        $compatibility = new PostCrafter_Yoast_Compatibility();
        $meta_key = $compatibility->get_meta_key('canonical');
        
        $result = update_post_meta($post_id, $meta_key, $validation['sanitized']);
        
        // Clear Yoast cache if available
        $this->clear_yoast_cache($post_id);
        
        return $result;
    }
    
    /**
     * Set Yoast primary category
     */
    public function set_yoast_primary_category($post_id, $value) {
        if (!$post_id || !is_numeric($post_id)) {
            return false;
        }
        
        // Validate and sanitize the input
        $validation_handler = new PostCrafter_Validation_Handler();
        $validation = $validation_handler->validate_primary_category($value, $post_id);
        
        if (!$validation['valid']) {
            // Log validation errors
            $validation_handler->log_validation_errors($validation['errors'], $post_id);
            return false;
        }
        
        $compatibility = new PostCrafter_Yoast_Compatibility();
        $meta_key = $compatibility->get_meta_key('primary_category');
        
        $result = update_post_meta($post_id, $meta_key, $validation['sanitized']);
        
        // Clear Yoast cache if available
        $this->clear_yoast_cache($post_id);
        
        return $result;
    }
    
    /**
     * Set multiple Yoast fields at once
     */
    public function set_yoast_fields($post_id, $fields) {
        if (!$post_id || !is_numeric($post_id)) {
            return false;
        }
        
        // Validate all fields comprehensively first
        $validation_handler = new PostCrafter_Validation_Handler();
        $validation = $validation_handler->validate_yoast_fields_comprehensive($fields, $post_id);
        
        if (!$validation['valid']) {
            // Log validation errors
            $validation_handler->log_validation_errors($validation['errors'], $post_id);
            return false;
        }
        
        $results = array();
        $sanitized_fields = $validation['sanitized'];
        
        // Set each field using the sanitized values
        foreach ($sanitized_fields as $field => $value) {
            switch ($field) {
                case 'meta_title':
                    $results[$field] = $this->set_yoast_meta_title($post_id, $value);
                    break;
                case 'meta_description':
                    $results[$field] = $this->set_yoast_meta_description($post_id, $value);
                    break;
                case 'focus_keywords':
                    $results[$field] = $this->set_yoast_focus_keywords($post_id, $value);
                    break;
                case 'canonical':
                    $results[$field] = $this->set_yoast_canonical($post_id, $value);
                    break;
                case 'primary_category':
                    $results[$field] = $this->set_yoast_primary_category($post_id, $value);
                    break;
                case 'meta_robots_noindex':
                    $results[$field] = $this->set_yoast_meta_robots_noindex($post_id, $value);
                    break;
                case 'meta_robots_nofollow':
                    $results[$field] = $this->set_yoast_meta_robots_nofollow($post_id, $value);
                    break;
            }
        }
        
        return $results;
    }
    
    /**
     * Clear Yoast cache for a post
     */
    private function clear_yoast_cache($post_id) {
        // Clear Yoast's internal cache if available
        if (class_exists('WPSEO_Utils')) {
            wp_cache_delete($post_id, 'post_meta');
        }
        
        // Clear any transients related to this post
        delete_transient('yoast_seo_score_' . $post_id);
    }
    
    /**
     * AJAX handler to get Yoast fields
     */
    public function ajax_get_yoast_fields() {
        // Check nonce
        if (!wp_verify_nonce($_POST['nonce'], 'postcrafter_yoast_nonce')) {
            wp_die('Security check failed');
        }
        
        $post_id = intval($_POST['post_id']);
        
        if (!$post_id) {
            wp_send_json_error('Invalid post ID');
        }
        
        $fields = $this->get_yoast_fields($post_id);
        wp_send_json_success($fields);
    }
    
    /**
     * Validate Yoast field values
     */
    public function validate_yoast_fields($fields) {
        $errors = array();
        
        // Validate meta title length
        if (!empty($fields['meta_title']) && strlen($fields['meta_title']) > 60) {
            $errors[] = 'Meta title should be 60 characters or less';
        }
        
        // Validate meta description length
        if (!empty($fields['meta_description']) && strlen($fields['meta_description']) > 160) {
            $errors[] = 'Meta description should be 160 characters or less';
        }
        
        // Validate focus keywords
        if (!empty($fields['focus_keywords'])) {
            $keywords = explode(',', $fields['focus_keywords']);
            if (count($keywords) > 5) {
                $errors[] = 'Focus keywords should be 5 or fewer';
            }
        }
        
        return $errors;
    }
    
    /**
     * Get Yoast SEO score for a post
     */
    public function get_yoast_seo_score($post_id) {
        $score = get_post_meta($post_id, '_yoast_wpseo_linkdex', true);
        return $score ? intval($score) : 0;
    }
    
    /**
     * Check if Yoast SEO plugin is active and compatible
     */
    public function is_yoast_compatible() {
        // Check if Yoast SEO is active
        if (!class_exists('WPSEO_Admin') && !function_exists('YoastSEO')) {
            return false;
        }
        
        // Check version compatibility (Yoast SEO 14.0+)
        if (defined('WPSEO_VERSION')) {
            $version = WPSEO_VERSION;
            if (version_compare($version, '14.0', '<')) {
                return false;
            }
        }
        
        return true;
    }
} 
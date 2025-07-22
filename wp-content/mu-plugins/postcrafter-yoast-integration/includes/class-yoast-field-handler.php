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
        $fields = array(
            'meta_title' => get_post_meta($post_id, '_yoast_wpseo_title', true),
            'meta_description' => get_post_meta($post_id, '_yoast_wpseo_metadesc', true),
            'focus_keywords' => get_post_meta($post_id, '_yoast_wpseo_focuskw', true),
            'meta_robots_noindex' => get_post_meta($post_id, '_yoast_wpseo_meta-robots-noindex', true),
            'meta_robots_nofollow' => get_post_meta($post_id, '_yoast_wpseo_meta-robots-nofollow', true),
            'canonical' => get_post_meta($post_id, '_yoast_wpseo_canonical', true),
            'primary_category' => get_post_meta($post_id, '_yoast_wpseo_primary_category', true)
        );
        
        return $fields;
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
            update_post_meta($post_id, '_yoast_wpseo_title', sanitize_text_field($_POST['yoast_meta_title']));
        }
        
        if (isset($_POST['yoast_meta_description'])) {
            update_post_meta($post_id, '_yoast_wpseo_metadesc', sanitize_textarea_field($_POST['yoast_meta_description']));
        }
        
        if (isset($_POST['yoast_focus_keywords'])) {
            update_post_meta($post_id, '_yoast_wpseo_focuskw', sanitize_text_field($_POST['yoast_focus_keywords']));
        }
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
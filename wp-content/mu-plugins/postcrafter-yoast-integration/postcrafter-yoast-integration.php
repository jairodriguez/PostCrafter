<?php
/**
 * Plugin Name: PostCrafter Yoast Integration
 * Plugin URI: https://github.com/your-username/postcrafter
 * Description: Exposes Yoast SEO meta fields via WordPress REST API for PostCrafter integration
 * Version: 1.0.0
 * Author: PostCrafter Team
 * License: GPL v2 or later
 * Text Domain: postcrafter-yoast
 * 
 * This plugin exposes Yoast SEO meta fields (meta title, meta description, focus keywords)
 * via WordPress REST API for write access, enabling PostCrafter to publish SEO-optimized
 * content directly from ChatGPT to WordPress.
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('POSTCRAFTER_YOAST_VERSION', '1.0.0');
define('POSTCRAFTER_YOAST_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('POSTCRAFTER_YOAST_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main PostCrafter Yoast Integration Class
 */
class PostCrafter_Yoast_Integration {
    
    /**
     * Constructor
     */
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('rest_api_init', array($this, 'register_rest_fields'));
    }
    
    /**
     * Initialize the plugin
     */
    public function init() {
        // Check if Yoast SEO plugin is active
        if (!$this->is_yoast_active()) {
            add_action('admin_notices', array($this, 'yoast_missing_notice'));
            return;
        }
        
        // Load dependencies
        $this->load_dependencies();
        
        // Initialize components
        $this->init_components();
    }
    
    /**
     * Check if Yoast SEO plugin is active
     */
    private function is_yoast_active() {
        return class_exists('WPSEO_Admin') || function_exists('YoastSEO');
    }
    
    /**
     * Display notice if Yoast SEO is not active
     */
    public function yoast_missing_notice() {
        ?>
        <div class="notice notice-error">
            <p><?php _e('PostCrafter Yoast Integration requires Yoast SEO plugin to be installed and activated.', 'postcrafter-yoast'); ?></p>
        </div>
        <?php
    }
    
    /**
     * Load plugin dependencies
     */
    private function load_dependencies() {
        // Load utility functions
        require_once POSTCRAFTER_YOAST_PLUGIN_DIR . 'includes/class-yoast-field-handler.php';
        require_once POSTCRAFTER_YOAST_PLUGIN_DIR . 'includes/class-rest-api-handler.php';
        require_once POSTCRAFTER_YOAST_PLUGIN_DIR . 'includes/class-validation-handler.php';
    }
    
    /**
     * Initialize plugin components
     */
    private function init_components() {
        // Initialize field handler
        new PostCrafter_Yoast_Field_Handler();
        
        // Initialize REST API handler
        new PostCrafter_REST_API_Handler();
        
        // Initialize validation handler
        new PostCrafter_Validation_Handler();
    }
    
    /**
     * Register REST API fields
     */
    public function register_rest_fields() {
        // Register fields for posts endpoint
        register_rest_field('post', 'yoast_meta_title', array(
            'get_callback' => array($this, 'get_yoast_meta_title'),
            'update_callback' => array($this, 'update_yoast_meta_title'),
            'schema' => array(
                'description' => 'Yoast SEO meta title',
                'type' => 'string',
                'context' => array('view', 'edit')
            )
        ));
        
        register_rest_field('post', 'yoast_meta_description', array(
            'get_callback' => array($this, 'get_yoast_meta_description'),
            'update_callback' => array($this, 'update_yoast_meta_description'),
            'schema' => array(
                'description' => 'Yoast SEO meta description',
                'type' => 'string',
                'context' => array('view', 'edit')
            )
        ));
        
        register_rest_field('post', 'yoast_focus_keywords', array(
            'get_callback' => array($this, 'get_yoast_focus_keywords'),
            'update_callback' => array($this, 'update_yoast_focus_keywords'),
            'schema' => array(
                'description' => 'Yoast SEO focus keywords',
                'type' => 'string',
                'context' => array('view', 'edit')
            )
        ));
    }
    
    /**
     * Get Yoast meta title
     */
    public function get_yoast_meta_title($post) {
        return get_post_meta($post['id'], '_yoast_wpseo_title', true);
    }
    
    /**
     * Update Yoast meta title
     */
    public function update_yoast_meta_title($value, $post) {
        if (is_string($value)) {
            update_post_meta($post->ID, '_yoast_wpseo_title', sanitize_text_field($value));
        }
        return $value;
    }
    
    /**
     * Get Yoast meta description
     */
    public function get_yoast_meta_description($post) {
        return get_post_meta($post['id'], '_yoast_wpseo_metadesc', true);
    }
    
    /**
     * Update Yoast meta description
     */
    public function update_yoast_meta_description($value, $post) {
        if (is_string($value)) {
            update_post_meta($post->ID, '_yoast_wpseo_metadesc', sanitize_textarea_field($value));
        }
        return $value;
    }
    
    /**
     * Get Yoast focus keywords
     */
    public function get_yoast_focus_keywords($post) {
        return get_post_meta($post['id'], '_yoast_wpseo_focuskw', true);
    }
    
    /**
     * Update Yoast focus keywords
     */
    public function update_yoast_focus_keywords($value, $post) {
        if (is_string($value)) {
            update_post_meta($post->ID, '_yoast_wpseo_focuskw', sanitize_text_field($value));
        }
        return $value;
    }
}

// Initialize the plugin
new PostCrafter_Yoast_Integration(); 
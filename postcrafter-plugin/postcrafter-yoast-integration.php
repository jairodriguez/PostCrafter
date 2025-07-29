<?php
/**
 * Plugin Name: PostCrafter SEO Integration
 * Plugin URI: https://github.com/your-username/postcrafter
 * Description: Enables AI-generated, SEO-optimized articles to be published directly from ChatGPT to WordPress with comprehensive Yoast SEO and RankMath integration.
 * Version: 1.0.0
 * Author: PostCrafter Team
 * Author URI: https://braindump.guru
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: postcrafter-seo
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.4
 * Requires PHP: 7.4
 * Network: false
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('POSTCRAFTER_SEO_VERSION', '1.0.0');
define('POSTCRAFTER_SEO_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('POSTCRAFTER_SEO_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main PostCrafter SEO Integration Class
 */
class PostCrafter_SEO_Integration {
    
    /**
     * Constructor
     */
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('rest_api_init', array($this, 'register_rest_routes'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        
        // Activation and deactivation hooks
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }
    
    /**
     * Initialize the plugin
     */
    public function init() {
        // Load text domain for translations
        load_plugin_textdomain('postcrafter-seo', false, dirname(plugin_basename(__FILE__)) . '/languages');
        
        // Include required files
        $this->include_files();
    }
    
    /**
     * Include required files
     */
    private function include_files() {
        // Include core files
        require_once POSTCRAFTER_SEO_PLUGIN_DIR . 'includes/class-seo-data-converter.php';
        require_once POSTCRAFTER_SEO_PLUGIN_DIR . 'includes/class-rankmath-field-handler.php';
        require_once POSTCRAFTER_SEO_PLUGIN_DIR . 'includes/class-rest-api-handler.php';
        require_once POSTCRAFTER_SEO_PLUGIN_DIR . 'includes/class-yoast-field-handler.php';
    }
    
    /**
     * Register REST API routes
     */
    public function register_rest_routes() {
        // Register the main PostCrafter publish endpoint
        register_rest_route('postcrafter/v1', '/publish', array(
            'methods' => 'POST',
            'callback' => array($this, 'publish_post'),
            'permission_callback' => array($this, 'check_permissions'),
            'args' => array(
                'title' => array(
                    'required' => true,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                'content' => array(
                    'required' => true,
                    'type' => 'string',
                    'sanitize_callback' => 'wp_kses_post',
                ),
                'excerpt' => array(
                    'required' => false,
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_textarea_field',
                ),
                'status' => array(
                    'required' => false,
                    'type' => 'string',
                    'enum' => array('draft', 'publish', 'private'),
                    'default' => 'publish',
                ),
                'categories' => array(
                    'required' => false,
                    'type' => 'array',
                    'items' => array(
                        'type' => 'string',
                    ),
                ),
                'tags' => array(
                    'required' => false,
                    'type' => 'array',
                    'items' => array(
                        'type' => 'string',
                    ),
                ),
                'yoast_meta' => array(
                    'required' => false,
                    'type' => 'object',
                    'properties' => array(
                        'meta_title' => array('type' => 'string'),
                        'meta_description' => array('type' => 'string'),
                        'focus_keyword' => array('type' => 'string'),
                    ),
                ),
            ),
        ));
        
        // Register health check endpoint
        register_rest_route('postcrafter/v1', '/health', array(
            'methods' => 'GET',
            'callback' => array($this, 'health_check'),
            'permission_callback' => '__return_true',
        ));
    }
    
    /**
     * Publish post endpoint
     */
    public function publish_post($request) {
        try {
            $params = $request->get_params();
            
            // Create post data
            $post_data = array(
                'post_title' => $params['title'],
                'post_content' => $params['content'],
                'post_status' => $params['status'] ?? 'publish',
                'post_excerpt' => $params['excerpt'] ?? '',
            );
            
            // Insert the post
            $post_id = wp_insert_post($post_data);
            
            if (is_wp_error($post_id)) {
                return new WP_Error('post_creation_failed', 'Failed to create post', array('status' => 500));
            }
            
            // Handle categories
            if (!empty($params['categories'])) {
                $this->handle_categories($post_id, $params['categories']);
            }
            
            // Handle tags
            if (!empty($params['tags'])) {
                $this->handle_tags($post_id, $params['tags']);
            }
            
            // Handle Yoast SEO meta
            if (!empty($params['yoast_meta'])) {
                $this->handle_yoast_meta($post_id, $params['yoast_meta']);
            }
            
            // Get the post URL
            $post_url = get_permalink($post_id);
            
            return array(
                'success' => true,
                'post_id' => $post_id,
                'post_url' => $post_url,
                'message' => 'Post published successfully!'
            );
            
        } catch (Exception $e) {
            return new WP_Error('publish_failed', $e->getMessage(), array('status' => 500));
        }
    }
    
    /**
     * Handle categories
     */
    private function handle_categories($post_id, $categories) {
        $category_ids = array();
        
        foreach ($categories as $category_name) {
            $category = get_term_by('name', $category_name, 'category');
            
            if (!$category) {
                $category = wp_insert_term($category_name, 'category');
                if (!is_wp_error($category)) {
                    $category_ids[] = $category['term_id'];
                }
            } else {
                $category_ids[] = $category->term_id;
            }
        }
        
        if (!empty($category_ids)) {
            wp_set_post_categories($post_id, $category_ids);
        }
    }
    
    /**
     * Handle tags
     */
    private function handle_tags($post_id, $tags) {
        $tag_ids = array();
        
        foreach ($tags as $tag_name) {
            $tag = get_term_by('name', $tag_name, 'post_tag');
            
            if (!$tag) {
                $tag = wp_insert_term($tag_name, 'post_tag');
                if (!is_wp_error($tag)) {
                    $tag_ids[] = $tag['term_id'];
                }
            } else {
                $tag_ids[] = $tag->term_id;
            }
        }
        
        if (!empty($tag_ids)) {
            wp_set_post_tags($post_id, $tag_ids);
        }
    }
    
    /**
     * Handle Yoast SEO meta
     */
    private function handle_yoast_meta($post_id, $yoast_meta) {
        if (class_exists('WPSEO_Meta')) {
            if (!empty($yoast_meta['meta_title'])) {
                update_post_meta($post_id, '_yoast_wpseo_title', sanitize_text_field($yoast_meta['meta_title']));
            }
            
            if (!empty($yoast_meta['meta_description'])) {
                update_post_meta($post_id, '_yoast_wpseo_metadesc', sanitize_textarea_field($yoast_meta['meta_description']));
            }
            
            if (!empty($yoast_meta['focus_keyword'])) {
                update_post_meta($post_id, '_yoast_wpseo_focuskw', sanitize_text_field($yoast_meta['focus_keyword']));
            }
        }
    }
    
    /**
     * Health check endpoint
     */
    public function health_check() {
        return array(
            'status' => 'healthy',
            'timestamp' => current_time('c'),
            'environment' => defined('WP_ENV') ? WP_ENV : 'production',
            'wordpress_version' => get_bloginfo('version'),
            'postcrafter_version' => POSTCRAFTER_SEO_VERSION,
        );
    }
    
    /**
     * Check permissions for API access
     */
    public function check_permissions($request) {
        // For now, allow all requests (you can add API key validation here)
        return true;
    }
    
    /**
     * Enqueue frontend scripts
     */
    public function enqueue_scripts() {
        // Add any frontend scripts if needed
    }
    
    /**
     * Enqueue admin scripts
     */
    public function enqueue_admin_scripts() {
        // Add any admin scripts if needed
    }
    
    /**
     * Plugin activation
     */
    public function activate() {
        // Flush rewrite rules
        flush_rewrite_rules();
        
        // Create any necessary database tables or options
        add_option('postcrafter_seo_version', POSTCRAFTER_SEO_VERSION);
    }
    
    /**
     * Plugin deactivation
     */
    public function deactivate() {
        // Flush rewrite rules
        flush_rewrite_rules();
        
        // Clean up any temporary data
        delete_option('postcrafter_seo_version');
    }
}

// Initialize the plugin
new PostCrafter_SEO_Integration(); 
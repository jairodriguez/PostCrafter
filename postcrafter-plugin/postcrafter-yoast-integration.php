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
        
        // Admin menu
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'admin_init'));
        
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
     * Add admin menu
     */
    public function add_admin_menu() {
        add_menu_page(
            __('PostCrafter', 'postcrafter-seo'),
            __('PostCrafter', 'postcrafter-seo'),
            'manage_options',
            'postcrafter',
            array($this, 'admin_dashboard'),
            'dashicons-admin-generic',
            30
        );
        
        add_submenu_page(
            'postcrafter',
            __('Dashboard', 'postcrafter-seo'),
            __('Dashboard', 'postcrafter-seo'),
            'manage_options',
            'postcrafter',
            array($this, 'admin_dashboard')
        );
        
        add_submenu_page(
            'postcrafter',
            __('Settings', 'postcrafter-seo'),
            __('Settings', 'postcrafter-seo'),
            'manage_options',
            'postcrafter-settings',
            array($this, 'admin_settings')
        );
        
        add_submenu_page(
            'postcrafter',
            __('API Testing', 'postcrafter-seo'),
            __('API Testing', 'postcrafter-seo'),
            'manage_options',
            'postcrafter-testing',
            array($this, 'admin_testing')
        );
    }
    
    /**
     * Admin initialization
     */
    public function admin_init() {
        // Register settings
        register_setting('postcrafter_settings', 'postcrafter_options');
        
        add_settings_section(
            'postcrafter_general',
            __('General Settings', 'postcrafter-seo'),
            array($this, 'settings_section_callback'),
            'postcrafter_settings'
        );
        
        add_settings_field(
            'api_key',
            __('API Key', 'postcrafter-seo'),
            array($this, 'api_key_callback'),
            'postcrafter_settings',
            'postcrafter_general'
        );
        
        add_settings_field(
            'enable_logging',
            __('Enable Logging', 'postcrafter-seo'),
            array($this, 'enable_logging_callback'),
            'postcrafter_settings',
            'postcrafter_general'
        );
    }
    
    /**
     * Admin dashboard page
     */
    public function admin_dashboard() {
        ?>
        <div class="wrap">
            <h1><?php _e('PostCrafter Dashboard', 'postcrafter-seo'); ?></h1>
            
            <div class="postcrafter-dashboard">
                <!-- Status Overview -->
                <div class="postcrafter-card">
                    <h2><?php _e('Plugin Status', 'postcrafter-seo'); ?></h2>
                    <table class="widefat">
                        <tr>
                            <td><strong><?php _e('Plugin Version:', 'postcrafter-seo'); ?></strong></td>
                            <td><?php echo POSTCRAFTER_SEO_VERSION; ?></td>
                        </tr>
                        <tr>
                            <td><strong><?php _e('WordPress Version:', 'postcrafter-seo'); ?></strong></td>
                            <td><?php echo get_bloginfo('version'); ?></td>
                        </tr>
                        <tr>
                            <td><strong><?php _e('PHP Version:', 'postcrafter-seo'); ?></strong></td>
                            <td><?php echo PHP_VERSION; ?></td>
                        </tr>
                        <tr>
                            <td><strong><?php _e('REST API Status:', 'postcrafter-seo'); ?></strong></td>
                            <td>
                                <?php 
                                $rest_url = get_rest_url();
                                if ($rest_url) {
                                    echo '<span style="color: green;">✓ ' . __('Active', 'postcrafter-seo') . '</span>';
                                } else {
                                    echo '<span style="color: red;">✗ ' . __('Inactive', 'postcrafter-seo') . '</span>';
                                }
                                ?>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <!-- SEO Plugin Detection -->
                <div class="postcrafter-card">
                    <h2><?php _e('SEO Plugin Detection', 'postcrafter-seo'); ?></h2>
                    <table class="widefat">
                        <tr>
                            <td><strong>Yoast SEO:</strong></td>
                            <td>
                                <?php 
                                if (class_exists('WPSEO_Meta')) {
                                    echo '<span style="color: green;">✓ ' . __('Active', 'postcrafter-seo') . '</span>';
                                } else {
                                    echo '<span style="color: orange;">⚠ ' . __('Not Active', 'postcrafter-seo') . '</span>';
                                }
                                ?>
                            </td>
                        </tr>
                        <tr>
                            <td><strong>RankMath SEO:</strong></td>
                            <td>
                                <?php 
                                if (class_exists('RankMath')) {
                                    echo '<span style="color: green;">✓ ' . __('Active', 'postcrafter-seo') . '</span>';
                                } else {
                                    echo '<span style="color: orange;">⚠ ' . __('Not Active', 'postcrafter-seo') . '</span>';
                                }
                                ?>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <!-- API Endpoints -->
                <div class="postcrafter-card">
                    <h2><?php _e('API Endpoints', 'postcrafter-seo'); ?></h2>
                    <table class="widefat">
                        <tr>
                            <td><strong><?php _e('Publish Endpoint:', 'postcrafter-seo'); ?></strong></td>
                            <td><code><?php echo get_rest_url(null, 'postcrafter/v1/publish'); ?></code></td>
                        </tr>
                        <tr>
                            <td><strong><?php _e('Health Check:', 'postcrafter-seo'); ?></strong></td>
                            <td><code><?php echo get_rest_url(null, 'postcrafter/v1/health'); ?></code></td>
                        </tr>
                    </table>
                </div>
                
                <!-- Quick Actions -->
                <div class="postcrafter-card">
                    <h2><?php _e('Quick Actions', 'postcrafter-seo'); ?></h2>
                    <p>
                        <a href="<?php echo admin_url('admin.php?page=postcrafter-testing'); ?>" class="button button-primary">
                            <?php _e('Test API Endpoints', 'postcrafter-seo'); ?>
                        </a>
                        <a href="<?php echo admin_url('admin.php?page=postcrafter-settings'); ?>" class="button">
                            <?php _e('Plugin Settings', 'postcrafter-seo'); ?>
                        </a>
                        <a href="<?php echo get_rest_url(null, 'postcrafter/v1/health'); ?>" class="button" target="_blank">
                            <?php _e('Health Check', 'postcrafter-seo'); ?>
                        </a>
                    </p>
                </div>
            </div>
        </div>
        
        <style>
        .postcrafter-dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .postcrafter-card {
            background: white;
            border: 1px solid #ccd0d4;
            border-radius: 4px;
            padding: 20px;
            box-shadow: 0 1px 1px rgba(0,0,0,.04);
        }
        .postcrafter-card h2 {
            margin-top: 0;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }
        </style>
        <?php
    }
    
    /**
     * Admin settings page
     */
    public function admin_settings() {
        ?>
        <div class="wrap">
            <h1><?php _e('PostCrafter Settings', 'postcrafter-seo'); ?></h1>
            
            <form method="post" action="options.php">
                <?php
                settings_fields('postcrafter_settings');
                do_settings_sections('postcrafter_settings');
                submit_button();
                ?>
            </form>
            
            <div class="postcrafter-info-card">
                <h2><?php _e('Configuration Help', 'postcrafter-seo'); ?></h2>
                <p><?php _e('Configure your PostCrafter integration settings below. These settings will be used when publishing posts from ChatGPT.', 'postcrafter-seo'); ?></p>
                
                <h3><?php _e('API Key', 'postcrafter-seo'); ?></h3>
                <p><?php _e('Set an API key to secure your endpoints. Leave empty to allow all requests (not recommended for production).', 'postcrafter-seo'); ?></p>
                
                <h3><?php _e('Logging', 'postcrafter-seo'); ?></h3>
                <p><?php _e('Enable logging to track API requests and debug issues. Logs will be stored in the WordPress debug log.', 'postcrafter-seo'); ?></p>
            </div>
        </div>
        <?php
    }
    
    /**
     * Admin testing page
     */
    public function admin_testing() {
        ?>
        <div class="wrap">
            <h1><?php _e('PostCrafter API Testing', 'postcrafter-seo'); ?></h1>
            
            <div class="postcrafter-testing">
                <!-- Health Check Test -->
                <div class="postcrafter-card">
                    <h2><?php _e('Health Check Test', 'postcrafter-seo'); ?></h2>
                    <p><?php _e('Test if the API endpoints are working correctly.', 'postcrafter-seo'); ?></p>
                    <button type="button" class="button button-primary" onclick="testHealthCheck()">
                        <?php _e('Test Health Check', 'postcrafter-seo'); ?>
                    </button>
                    <div id="health-result" style="margin-top: 10px;"></div>
                </div>
                
                <!-- Publish Test -->
                <div class="postcrafter-card">
                    <h2><?php _e('Publish Test', 'postcrafter-seo'); ?></h2>
                    <p><?php _e('Test publishing a sample post via the API.', 'postcrafter-seo'); ?></p>
                    <button type="button" class="button button-primary" onclick="testPublish()">
                        <?php _e('Test Publish', 'postcrafter-seo'); ?>
                    </button>
                    <div id="publish-result" style="margin-top: 10px;"></div>
                </div>
                
                <!-- API Documentation -->
                <div class="postcrafter-card">
                    <h2><?php _e('API Documentation', 'postcrafter-seo'); ?></h2>
                    <h3><?php _e('Publish Post', 'postcrafter-seo'); ?></h3>
                    <p><strong><?php _e('Endpoint:', 'postcrafter-seo'); ?></strong> <code>POST <?php echo get_rest_url(null, 'postcrafter/v1/publish'); ?></code></p>
                    <p><strong><?php _e('Required Fields:', 'postcrafter-seo'); ?></strong> title, content</p>
                    <p><strong><?php _e('Optional Fields:', 'postcrafter-seo'); ?></strong> excerpt, status, categories, tags, yoast_meta</p>
                    
                    <h3><?php _e('Health Check', 'postcrafter-seo'); ?></h3>
                    <p><strong><?php _e('Endpoint:', 'postcrafter-seo'); ?></strong> <code>GET <?php echo get_rest_url(null, 'postcrafter/v1/health'); ?></code></p>
                </div>
            </div>
        </div>
        
        <script>
        function testHealthCheck() {
            const resultDiv = document.getElementById('health-result');
            resultDiv.innerHTML = 'Testing...';
            
            fetch('<?php echo get_rest_url(null, 'postcrafter/v1/health'); ?>')
                .then(response => response.json())
                .then(data => {
                    resultDiv.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
                })
                .catch(error => {
                    resultDiv.innerHTML = '<div style="color: red;">Error: ' + error.message + '</div>';
                });
        }
        
        function testPublish() {
            const resultDiv = document.getElementById('publish-result');
            resultDiv.innerHTML = 'Testing...';
            
            const testData = {
                title: 'Test Post from PostCrafter',
                content: '<p>This is a test post published via the PostCrafter API.</p>',
                excerpt: 'Test post excerpt',
                status: 'draft',
                categories: ['Test'],
                tags: ['postcrafter', 'test'],
                yoast_meta: {
                    meta_title: 'Test Post - SEO Optimized',
                    meta_description: 'This is a test post with SEO optimization.',
                    focus_keyword: 'test post'
                }
            };
            
            fetch('<?php echo get_rest_url(null, 'postcrafter/v1/publish'); ?>', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(testData)
            })
            .then(response => response.json())
            .then(data => {
                resultDiv.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
            })
            .catch(error => {
                resultDiv.innerHTML = '<div style="color: red;">Error: ' + error.message + '</div>';
            });
        }
        </script>
        
        <style>
        .postcrafter-testing {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .postcrafter-card {
            background: white;
            border: 1px solid #ccd0d4;
            border-radius: 4px;
            padding: 20px;
            box-shadow: 0 1px 1px rgba(0,0,0,.04);
        }
        .postcrafter-card h2 {
            margin-top: 0;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }
        .postcrafter-info-card {
            background: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 20px;
            margin-top: 20px;
        }
        </style>
        <?php
    }
    
    /**
     * Settings section callback
     */
    public function settings_section_callback() {
        echo '<p>' . __('Configure your PostCrafter integration settings.', 'postcrafter-seo') . '</p>';
    }
    
    /**
     * API key callback
     */
    public function api_key_callback() {
        $options = get_option('postcrafter_options', array());
        $api_key = isset($options['api_key']) ? $options['api_key'] : '';
        echo '<input type="text" name="postcrafter_options[api_key]" value="' . esc_attr($api_key) . '" class="regular-text" />';
        echo '<p class="description">' . __('API key for securing endpoints (optional).', 'postcrafter-seo') . '</p>';
    }
    
    /**
     * Enable logging callback
     */
    public function enable_logging_callback() {
        $options = get_option('postcrafter_options', array());
        $enable_logging = isset($options['enable_logging']) ? $options['enable_logging'] : false;
        echo '<input type="checkbox" name="postcrafter_options[enable_logging]" value="1" ' . checked($enable_logging, true, false) . ' />';
        echo '<p class="description">' . __('Enable detailed logging for debugging.', 'postcrafter-seo') . '</p>';
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
                'yoast' => array(
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
            
            // Debug logging
            error_log("PostCrafter: Received publish request with params: " . print_r($params, true));
            
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
                error_log("PostCrafter: Failed to create post: " . $post_id->get_error_message());
                return new WP_Error('post_creation_failed', 'Failed to create post', array('status' => 500));
            }
            
            error_log("PostCrafter: Created post with ID: $post_id");
            
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
                error_log("PostCrafter: Found yoast_meta in request: " . print_r($params['yoast_meta'], true));
                $this->handle_yoast_meta($post_id, $params['yoast_meta']);
            } elseif (!empty($params['yoast'])) {
                error_log("PostCrafter: Found yoast in request: " . print_r($params['yoast'], true));
                $this->handle_yoast_meta($post_id, $params['yoast']);
            } else {
                error_log("PostCrafter: No yoast_meta or yoast found in request");
            }
            
            // Get the post URL
            $post_url = get_permalink($post_id);
            
            error_log("PostCrafter: Post published successfully. ID: $post_id, URL: $post_url");
            
            return array(
                'success' => true,
                'post_id' => $post_id,
                'post_url' => $post_url,
                'message' => 'Post published successfully!'
            );
            
        } catch (Exception $e) {
            error_log("PostCrafter: Exception in publish_post: " . $e->getMessage());
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
        // Debug logging
        error_log("PostCrafter: Handling Yoast meta for post $post_id: " . print_r($yoast_meta, true));
        
        if (class_exists('WPSEO_Meta')) {
            // Set meta title
            if (!empty($yoast_meta['meta_title'])) {
                $meta_title = sanitize_text_field($yoast_meta['meta_title']);
                update_post_meta($post_id, '_yoast_wpseo_title', $meta_title);
                error_log("PostCrafter: Set Yoast meta title: $meta_title");
            }
            
            // Set meta description
            if (!empty($yoast_meta['meta_description'])) {
                $meta_description = sanitize_textarea_field($yoast_meta['meta_description']);
                update_post_meta($post_id, '_yoast_wpseo_metadesc', $meta_description);
                error_log("PostCrafter: Set Yoast meta description: $meta_description");
            }
            
            // Set focus keyword
            if (!empty($yoast_meta['focus_keyword'])) {
                $focus_keyword = sanitize_text_field($yoast_meta['focus_keyword']);
                update_post_meta($post_id, '_yoast_wpseo_focuskw', $focus_keyword);
                error_log("PostCrafter: Set Yoast focus keyword: $focus_keyword");
            }
            
            // Force Yoast to recalculate SEO score
            if (class_exists('WPSEO_Meta')) {
                // Clear Yoast cache for this post
                wp_cache_delete($post_id, 'post_meta');
                
                // Trigger Yoast's meta update hooks
                do_action('wpseo_save_compare_data', $post_id);
                
                // Update Yoast's internal meta
                if (method_exists('WPSEO_Meta', 'set_value')) {
                    if (!empty($yoast_meta['meta_title'])) {
                        WPSEO_Meta::set_value('title', $yoast_meta['meta_title'], $post_id);
                    }
                    if (!empty($yoast_meta['meta_description'])) {
                        WPSEO_Meta::set_value('metadesc', $yoast_meta['meta_description'], $post_id);
                    }
                    if (!empty($yoast_meta['focus_keyword'])) {
                        WPSEO_Meta::set_value('focuskw', $yoast_meta['focus_keyword'], $post_id);
                    }
                }
            }
            
            error_log("PostCrafter: Yoast meta handling completed for post $post_id");
        } else {
            error_log("PostCrafter: Yoast SEO plugin not detected");
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
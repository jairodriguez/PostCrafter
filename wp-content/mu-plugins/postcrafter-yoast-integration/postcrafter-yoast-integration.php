<?php
/**
 * Plugin Name: PostCrafter SEO Integration
 * Plugin URI: https://github.com/your-username/postcrafter
 * Description: Exposes SEO meta fields via WordPress REST API for PostCrafter integration. Supports both Yoast SEO and RankMath SEO plugins.
 * Version: 1.1.0
 * Author: PostCrafter Team
 * License: GPL v2 or later
 * Text Domain: postcrafter-seo
 * 
 * This plugin exposes SEO meta fields (meta title, meta description, focus keywords)
 * via WordPress REST API for write access, enabling PostCrafter to publish SEO-optimized
 * content directly from ChatGPT to WordPress. Now supports both Yoast SEO and RankMath SEO.
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('POSTCRAFTER_SEO_VERSION', '1.1.0');
define('POSTCRAFTER_SEO_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('POSTCRAFTER_SEO_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main PostCrafter SEO Integration Class
 */
class PostCrafter_SEO_Integration {
    
    /**
     * SEO Plugin Detector instance
     */
    private $detector;
    
    /**
     * Current detection results
     */
    private $detection_results;
    
    /**
     * Constructor
     */
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('rest_api_init', array($this, 'register_rest_fields'));
        
        // Load the SEO plugin detector
        $this->load_detector();
    }
    
    /**
     * Load SEO plugin detector
     */
    private function load_detector() {
        require_once POSTCRAFTER_SEO_PLUGIN_DIR . 'includes/class-seo-plugin-detector.php';
        $this->detector = new PostCrafter_SEO_Plugin_Detector();
    }
    
    /**
     * Initialize the plugin
     */
    public function init() {
        // Get detection results
        $this->detection_results = $this->detector->get_detection_results();
        
        // Check if any supported SEO plugin is active
        if (!$this->detector->has_supported_seo_plugin()) {
            // Admin notices are handled by the detector
            return;
        }
        
        // Load dependencies based on detected plugins
        $this->load_dependencies();
        
        // Initialize components
        $this->init_components();
        
        // Add admin hooks
        add_action('admin_init', array($this, 'admin_init'));
        
        // Add REST API info endpoint
        add_action('rest_api_init', array($this, 'register_info_endpoint'));
    }
    
    /**
     * Load plugin dependencies
     */
    private function load_dependencies() {
        // Load base classes
        require_once POSTCRAFTER_SEO_PLUGIN_DIR . 'includes/class-yoast-field-handler.php';
        require_once POSTCRAFTER_SEO_PLUGIN_DIR . 'includes/class-rest-api-handler.php';
        require_once POSTCRAFTER_SEO_PLUGIN_DIR . 'includes/class-validation-handler.php';
        require_once POSTCRAFTER_SEO_PLUGIN_DIR . 'includes/class-yoast-compatibility.php';
        
        // Load RankMath handler if RankMath is detected
        if ($this->detector->is_plugin_active_and_supported('rankmath')) {
            require_once POSTCRAFTER_SEO_PLUGIN_DIR . 'includes/class-rankmath-field-handler.php';
        }
    }
    
    /**
     * Initialize plugin components
     */
    private function init_components() {
        // Get primary plugin
        $primary_plugin = $this->detector->get_primary_plugin();
        
        // Initialize compatibility handler
        $compatibility = new PostCrafter_Yoast_Compatibility();
        
        // Initialize field handlers based on detected plugins
        if ($this->detector->is_plugin_active_and_supported('yoast')) {
            new PostCrafter_Yoast_Field_Handler();
        }
        
        if ($this->detector->is_plugin_active_and_supported('rankmath')) {
            // RankMath field handler will be created in next subtask
            // For now, we'll use a placeholder
        }
        
        // Initialize REST API handler
        new PostCrafter_REST_API_Handler();
        
        // Initialize validation handler
        new PostCrafter_Validation_Handler();
    }
    
    /**
     * Admin initialization
     */
    public function admin_init() {
        // Add settings page
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // Register settings
        $this->register_settings();
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_options_page(
            __('PostCrafter SEO Settings', 'postcrafter-seo'),
            __('PostCrafter SEO', 'postcrafter-seo'),
            'manage_options',
            'postcrafter-seo',
            array($this, 'admin_page')
        );
    }
    
    /**
     * Register settings
     */
    private function register_settings() {
        register_setting('postcrafter_seo_settings', 'postcrafter_seo_options');
        
        add_settings_section(
            'postcrafter_seo_general',
            __('General Settings', 'postcrafter-seo'),
            array($this, 'settings_section_callback'),
            'postcrafter_seo_settings'
        );
        
        add_settings_field(
            'preferred_seo_plugin',
            __('Preferred SEO Plugin', 'postcrafter-seo'),
            array($this, 'preferred_plugin_callback'),
            'postcrafter_seo_settings',
            'postcrafter_seo_general'
        );
    }
    
    /**
     * Settings section callback
     */
    public function settings_section_callback() {
        echo '<p>' . __('Configure PostCrafter SEO integration settings.', 'postcrafter-seo') . '</p>';
    }
    
    /**
     * Preferred plugin callback
     */
    public function preferred_plugin_callback() {
        $options = get_option('postcrafter_seo_options', array());
        $preferred = isset($options['preferred_seo_plugin']) ? $options['preferred_seo_plugin'] : 'auto';
        $summary = $this->detection_results['summary'];
        
        echo '<select name="postcrafter_seo_options[preferred_seo_plugin]">';
        echo '<option value="auto"' . selected($preferred, 'auto', false) . '>' . __('Auto-detect', 'postcrafter-seo') . '</option>';
        
        if (in_array('yoast', $summary['supported_plugins'])) {
            echo '<option value="yoast"' . selected($preferred, 'yoast', false) . '>' . __('Yoast SEO', 'postcrafter-seo') . '</option>';
        }
        
        if (in_array('rankmath', $summary['supported_plugins'])) {
            echo '<option value="rankmath"' . selected($preferred, 'rankmath', false) . '>' . __('RankMath SEO', 'postcrafter-seo') . '</option>';
        }
        
        echo '</select>';
        echo '<p class="description">' . __('Choose which SEO plugin to use when multiple are available.', 'postcrafter-seo') . '</p>';
    }
    
    /**
     * Admin page
     */
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1><?php _e('PostCrafter SEO Integration', 'postcrafter-seo'); ?></h1>
            
            <div class="notice notice-info">
                <p><?php _e('This plugin enables PostCrafter to work with your SEO plugin to optimize content published from ChatGPT.', 'postcrafter-seo'); ?></p>
            </div>
            
            <h2><?php _e('Plugin Detection Status', 'postcrafter-seo'); ?></h2>
            <?php $this->display_detection_status(); ?>
            
            <form method="post" action="options.php">
                <?php
                settings_fields('postcrafter_seo_settings');
                do_settings_sections('postcrafter_seo_settings');
                submit_button();
                ?>
            </form>
            
            <h2><?php _e('API Information', 'postcrafter-seo'); ?></h2>
            <?php $this->display_api_info(); ?>
        </div>
        <?php
    }
    
    /**
     * Display detection status
     */
    private function display_detection_status() {
        $summary = $this->detection_results['summary'];
        $yoast = $this->detection_results['yoast'];
        $rankmath = $this->detection_results['rankmath'];
        
        echo '<table class="wp-list-table widefat fixed striped">';
        echo '<thead><tr><th>' . __('Plugin', 'postcrafter-seo') . '</th><th>' . __('Status', 'postcrafter-seo') . '</th><th>' . __('Version', 'postcrafter-seo') . '</th><th>' . __('Supported', 'postcrafter-seo') . '</th></tr></thead>';
        echo '<tbody>';
        
        // Yoast row
        echo '<tr>';
        echo '<td><strong>Yoast SEO</strong></td>';
        echo '<td>' . ($yoast['active'] ? '<span style="color: green;">Active</span>' : '<span style="color: red;">Inactive</span>') . '</td>';
        echo '<td>' . ($yoast['version'] ? $yoast['version'] : 'N/A') . '</td>';
        echo '<td>' . ($yoast['version_supported'] ? '<span style="color: green;">✓</span>' : '<span style="color: red;">✗</span>') . '</td>';
        echo '</tr>';
        
        // RankMath row
        echo '<tr>';
        echo '<td><strong>RankMath SEO</strong></td>';
        echo '<td>' . ($rankmath['active'] ? '<span style="color: green;">Active</span>' : '<span style="color: red;">Inactive</span>') . '</td>';
        echo '<td>' . ($rankmath['version'] ? $rankmath['version'] : 'N/A') . '</td>';
        echo '<td>' . ($rankmath['version_supported'] ? '<span style="color: green;">✓</span>' : '<span style="color: red;">✗</span>') . '</td>';
        echo '</tr>';
        
        echo '</tbody>';
        echo '</table>';
        
        // Summary information
        echo '<p><strong>' . __('Primary Plugin:', 'postcrafter-seo') . '</strong> ';
        if ($summary['primary_plugin']) {
            echo ucfirst($summary['primary_plugin']);
        } else {
            echo __('None detected', 'postcrafter-seo');
        }
        echo '</p>';
        
        if ($summary['conflicts']) {
            echo '<div class="notice notice-warning inline"><p>' . __('Multiple SEO plugins detected. Consider deactivating one for optimal performance.', 'postcrafter-seo') . '</p></div>';
        }
    }
    
    /**
     * Display API information
     */
    private function display_api_info() {
        echo '<p>' . __('The following REST API endpoints are available:', 'postcrafter-seo') . '</p>';
        echo '<ul>';
        echo '<li><code>GET /wp-json/postcrafter/v1/seo-status</code> - ' . __('Get SEO plugin detection status', 'postcrafter-seo') . '</li>';
        echo '<li><code>GET /wp-json/wp/v2/posts/{id}</code> - ' . __('Includes SEO meta fields in response', 'postcrafter-seo') . '</li>';
        echo '<li><code>POST /wp-json/wp/v2/posts</code> - ' . __('Create posts with SEO meta fields', 'postcrafter-seo') . '</li>';
        echo '<li><code>PUT /wp-json/wp/v2/posts/{id}</code> - ' . __('Update posts with SEO meta fields', 'postcrafter-seo') . '</li>';
        echo '</ul>';
    }
    
    /**
     * Register info endpoint
     */
    public function register_info_endpoint() {
        register_rest_route('postcrafter/v1', '/seo-status', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_seo_status'),
            'permission_callback' => array($this, 'check_api_permissions')
        ));
    }
    
    /**
     * Get SEO status via API
     */
    public function get_seo_status() {
        return $this->detector->get_api_detection_results();
    }
    
    /**
     * Check API permissions
     */
    public function check_api_permissions() {
        return current_user_can('edit_posts');
    }
    
    /**
     * Register REST API fields
     */
    public function register_rest_fields() {
        // Only register fields if we have a supported SEO plugin
        if (!$this->detector || !$this->detector->has_supported_seo_plugin()) {
            return;
        }
        
        $primary_plugin = $this->detector->get_primary_plugin();
        
        // Register universal SEO fields that work with both plugins
        $this->register_universal_seo_fields();
        
        // Register plugin-specific fields if needed
        if ($primary_plugin === 'yoast') {
            $this->register_yoast_specific_fields();
        } elseif ($primary_plugin === 'rankmath') {
            $this->register_rankmath_specific_fields();
        }
    }
    
    /**
     * Register universal SEO fields
     */
    private function register_universal_seo_fields() {
        // Meta title
        register_rest_field('post', 'seo_meta_title', array(
            'get_callback' => array($this, 'get_seo_meta_title'),
            'update_callback' => array($this, 'update_seo_meta_title'),
            'schema' => array(
                'description' => 'SEO meta title',
                'type' => 'string',
                'context' => array('view', 'edit')
            )
        ));
        
        // Meta description
        register_rest_field('post', 'seo_meta_description', array(
            'get_callback' => array($this, 'get_seo_meta_description'),
            'update_callback' => array($this, 'update_seo_meta_description'),
            'schema' => array(
                'description' => 'SEO meta description',
                'type' => 'string',
                'context' => array('view', 'edit')
            )
        ));
        
        // Focus keywords
        register_rest_field('post', 'seo_focus_keywords', array(
            'get_callback' => array($this, 'get_seo_focus_keywords'),
            'update_callback' => array($this, 'update_seo_focus_keywords'),
            'schema' => array(
                'description' => 'SEO focus keywords',
                'type' => 'string',
                'context' => array('view', 'edit')
            )
        ));
        
        // Keep legacy Yoast fields for backward compatibility
        register_rest_field('post', 'yoast_meta_title', array(
            'get_callback' => array($this, 'get_seo_meta_title'),
            'update_callback' => array($this, 'update_seo_meta_title'),
            'schema' => array(
                'description' => 'Yoast SEO meta title (legacy)',
                'type' => 'string',
                'context' => array('view', 'edit')
            )
        ));
        
        register_rest_field('post', 'yoast_meta_description', array(
            'get_callback' => array($this, 'get_seo_meta_description'),
            'update_callback' => array($this, 'update_seo_meta_description'),
            'schema' => array(
                'description' => 'Yoast SEO meta description (legacy)',
                'type' => 'string',
                'context' => array('view', 'edit')
            )
        ));
        
        register_rest_field('post', 'yoast_focus_keywords', array(
            'get_callback' => array($this, 'get_seo_focus_keywords'),
            'update_callback' => array($this, 'update_seo_focus_keywords'),
            'schema' => array(
                'description' => 'Yoast SEO focus keywords (legacy)',
                'type' => 'string',
                'context' => array('view', 'edit')
            )
        ));
    }
    
    /**
     * Register Yoast-specific fields
     */
    private function register_yoast_specific_fields() {
        // Additional Yoast-specific fields can be added here
    }
    
    /**
     * Register RankMath-specific fields
     */
    private function register_rankmath_specific_fields() {
        // Additional RankMath-specific fields can be added here
    }
    
    /**
     * Get SEO meta title
     */
    public function get_seo_meta_title($post) {
        $primary_plugin = $this->detector->get_primary_plugin();
        
        if ($primary_plugin === 'yoast') {
            return get_post_meta($post['id'], '_yoast_wpseo_title', true);
        } elseif ($primary_plugin === 'rankmath') {
            return get_post_meta($post['id'], 'rank_math_title', true);
        }
        
        return '';
    }
    
    /**
     * Update SEO meta title
     */
    public function update_seo_meta_title($value, $post) {
        $primary_plugin = $this->detector->get_primary_plugin();
        
        if ($primary_plugin === 'yoast') {
            return update_post_meta($post->ID, '_yoast_wpseo_title', sanitize_text_field($value));
        } elseif ($primary_plugin === 'rankmath') {
            return update_post_meta($post->ID, 'rank_math_title', sanitize_text_field($value));
        }
        
        return false;
    }
    
    /**
     * Get SEO meta description
     */
    public function get_seo_meta_description($post) {
        $primary_plugin = $this->detector->get_primary_plugin();
        
        if ($primary_plugin === 'yoast') {
            return get_post_meta($post['id'], '_yoast_wpseo_metadesc', true);
        } elseif ($primary_plugin === 'rankmath') {
            return get_post_meta($post['id'], 'rank_math_description', true);
        }
        
        return '';
    }
    
    /**
     * Update SEO meta description
     */
    public function update_seo_meta_description($value, $post) {
        $primary_plugin = $this->detector->get_primary_plugin();
        
        if ($primary_plugin === 'yoast') {
            return update_post_meta($post->ID, '_yoast_wpseo_metadesc', sanitize_textarea_field($value));
        } elseif ($primary_plugin === 'rankmath') {
            return update_post_meta($post->ID, 'rank_math_description', sanitize_textarea_field($value));
        }
        
        return false;
    }
    
    /**
     * Get SEO focus keywords
     */
    public function get_seo_focus_keywords($post) {
        $primary_plugin = $this->detector->get_primary_plugin();
        
        if ($primary_plugin === 'yoast') {
            return get_post_meta($post['id'], '_yoast_wpseo_focuskw', true);
        } elseif ($primary_plugin === 'rankmath') {
            return get_post_meta($post['id'], 'rank_math_focus_keyword', true);
        }
        
        return '';
    }
    
    /**
     * Update SEO focus keywords
     */
    public function update_seo_focus_keywords($value, $post) {
        $primary_plugin = $this->detector->get_primary_plugin();
        
        if ($primary_plugin === 'yoast') {
            return update_post_meta($post->ID, '_yoast_wpseo_focuskw', sanitize_text_field($value));
        } elseif ($primary_plugin === 'rankmath') {
            return update_post_meta($post->ID, 'rank_math_focus_keyword', sanitize_text_field($value));
        }
        
        return false;
    }
    
    /**
     * Get plugin version
     */
    public function get_plugin_version() {
        return POSTCRAFTER_SEO_VERSION;
    }
    
    /**
     * Get detection results
     */
    public function get_detection_results() {
        return $this->detection_results;
    }
    
    /**
     * Get SEO plugin detector
     */
    public function get_detector() {
        return $this->detector;
    }
}

// Initialize the plugin
new PostCrafter_SEO_Integration(); 
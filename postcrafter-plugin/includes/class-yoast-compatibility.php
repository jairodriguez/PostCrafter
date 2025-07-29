<?php
/**
 * Yoast Compatibility Class
 * 
 * Handles compatibility with different Yoast SEO plugin versions
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class PostCrafter_Yoast_Compatibility {
    
    /**
     * Yoast SEO version constants
     */
    const YOAST_VERSION_14 = '14.0';
    const YOAST_VERSION_15 = '15.0';
    const YOAST_VERSION_16 = '16.0';
    const YOAST_VERSION_17 = '17.0';
    const YOAST_VERSION_18 = '18.0';
    const YOAST_VERSION_19 = '19.0';
    const YOAST_VERSION_20 = '20.0';
    const YOAST_VERSION_21 = '21.0';
    const YOAST_VERSION_22 = '22.0';
    
    /**
     * Meta key mappings for different Yoast versions
     */
    private $meta_key_mappings = array(
        'title' => array(
            'legacy' => '_yoast_wpseo_title',
            'modern' => '_yoast_wpseo_title',
            'new' => '_yoast_wpseo_title'
        ),
        'description' => array(
            'legacy' => '_yoast_wpseo_metadesc',
            'modern' => '_yoast_wpseo_metadesc',
            'new' => '_yoast_wpseo_metadesc'
        ),
        'focus_keywords' => array(
            'legacy' => '_yoast_wpseo_focuskw',
            'modern' => '_yoast_wpseo_focuskw',
            'new' => '_yoast_wpseo_focuskw'
        ),
        'robots_noindex' => array(
            'legacy' => '_yoast_wpseo_meta-robots-noindex',
            'modern' => '_yoast_wpseo_meta-robots-noindex',
            'new' => '_yoast_wpseo_meta-robots-noindex'
        ),
        'robots_nofollow' => array(
            'legacy' => '_yoast_wpseo_meta-robots-nofollow',
            'modern' => '_yoast_wpseo_meta-robots-nofollow',
            'new' => '_yoast_wpseo_meta-robots-nofollow'
        ),
        'canonical' => array(
            'legacy' => '_yoast_wpseo_canonical',
            'modern' => '_yoast_wpseo_canonical',
            'new' => '_yoast_wpseo_canonical'
        ),
        'primary_category' => array(
            'legacy' => '_yoast_wpseo_primary_category',
            'modern' => '_yoast_wpseo_primary_category',
            'new' => '_yoast_wpseo_primary_category'
        )
    );
    
    /**
     * Constructor
     */
    public function __construct() {
        add_action('init', array($this, 'init'));
    }
    
    /**
     * Initialize compatibility checks
     */
    public function init() {
        // Add compatibility hooks
        add_action('admin_notices', array($this, 'display_compatibility_notices'));
        add_filter('postcrafter_yoast_compatibility_check', array($this, 'check_compatibility'));
    }
    
    /**
     * Check if Yoast SEO plugin is active
     */
    public function is_yoast_active() {
        // Check for Yoast SEO plugin using multiple methods
        $active_plugins = get_option('active_plugins');
        $yoast_plugin = 'wordpress-seo/wp-seo.php';
        
        // Check if Yoast SEO is in active plugins
        if (in_array($yoast_plugin, $active_plugins)) {
            return true;
        }
        
        // Check if Yoast SEO is active in multisite
        if (is_multisite()) {
            $network_plugins = get_site_option('active_sitewide_plugins');
            if (isset($network_plugins[$yoast_plugin])) {
                return true;
            }
        }
        
        // Check if Yoast classes exist
        if (class_exists('WPSEO_Admin') || function_exists('YoastSEO')) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Get Yoast SEO version
     */
    public function get_yoast_version() {
        if (!$this->is_yoast_active()) {
            return false;
        }
        
        // Try to get version from constant
        if (defined('WPSEO_VERSION')) {
            return WPSEO_VERSION;
        }
        
        // Try to get version from plugin data
        if (!function_exists('get_plugin_data')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }
        
        $plugin_data = get_plugin_data(WP_PLUGIN_DIR . '/wordpress-seo/wp-seo.php');
        if (isset($plugin_data['Version'])) {
            return $plugin_data['Version'];
        }
        
        // Try to get version from Yoast class
        if (class_exists('WPSEO_Utils')) {
            if (method_exists('WPSEO_Utils', 'get_version')) {
                return WPSEO_Utils::get_version();
            }
        }
        
        return false;
    }
    
    /**
     * Check if Yoast version is compatible
     */
    public function is_version_compatible($min_version = self::YOAST_VERSION_14) {
        $version = $this->get_yoast_version();
        
        if (!$version) {
            return false;
        }
        
        return version_compare($version, $min_version, '>=');
    }
    
    /**
     * Get compatibility status
     */
    public function get_compatibility_status() {
        $status = array(
            'active' => false,
            'version' => false,
            'compatible' => false,
            'recommended_version' => self::YOAST_VERSION_14,
            'current_version' => false,
            'warnings' => array()
        );
        
        // Check if Yoast is active
        $status['active'] = $this->is_yoast_active();
        
        if (!$status['active']) {
            $status['warnings'][] = 'Yoast SEO plugin is not active';
            return $status;
        }
        
        // Get current version
        $status['current_version'] = $this->get_yoast_version();
        
        if (!$status['current_version']) {
            $status['warnings'][] = 'Unable to determine Yoast SEO version';
            return $status;
        }
        
        // Check version compatibility
        $status['compatible'] = $this->is_version_compatible();
        
        if (!$status['compatible']) {
            $status['warnings'][] = sprintf(
                'Yoast SEO version %s is below recommended version %s',
                $status['current_version'],
                $status['recommended_version']
            );
        }
        
        return $status;
    }
    
    /**
     * Get meta key for specific field and version
     */
    public function get_meta_key($field, $version = null) {
        if (!$version) {
            $version = $this->get_yoast_version();
        }
        
        // Determine version category
        $version_category = $this->get_version_category($version);
        
        // Get meta key mapping
        if (isset($this->meta_key_mappings[$field][$version_category])) {
            return $this->meta_key_mappings[$field][$version_category];
        }
        
        // Fallback to modern mapping
        return $this->meta_key_mappings[$field]['modern'];
    }
    
    /**
     * Get version category (legacy, modern, new)
     */
    private function get_version_category($version) {
        if (!$version) {
            return 'modern';
        }
        
        // Legacy versions (pre-14.0)
        if (version_compare($version, self::YOAST_VERSION_14, '<')) {
            return 'legacy';
        }
        
        // New versions (20.0+)
        if (version_compare($version, self::YOAST_VERSION_20, '>=')) {
            return 'new';
        }
        
        // Modern versions (14.0-19.x)
        return 'modern';
    }
    
    /**
     * Handle fallback when Yoast is not active
     */
    public function handle_yoast_inactive() {
        // Create fallback meta fields
        add_action('add_post_meta', array($this, 'create_fallback_meta'), 10, 3);
        add_action('update_post_meta', array($this, 'update_fallback_meta'), 10, 4);
        
        // Add fallback meta boxes
        add_action('add_meta_boxes', array($this, 'add_fallback_meta_boxes'));
        add_action('save_post', array($this, 'save_fallback_meta'));
    }
    
    /**
     * Create fallback meta fields
     */
    public function create_fallback_meta($post_id, $meta_key, $meta_value) {
        // Only handle our custom meta keys
        if (strpos($meta_key, '_postcrafter_') !== 0) {
            return;
        }
        
        // Map to standard meta fields
        $fallback_mapping = array(
            '_postcrafter_meta_title' => '_yoast_wpseo_title',
            '_postcrafter_meta_description' => '_yoast_wpseo_metadesc',
            '_postcrafter_focus_keywords' => '_yoast_wpseo_focuskw'
        );
        
        if (isset($fallback_mapping[$meta_key])) {
            update_post_meta($post_id, $fallback_mapping[$meta_key], $meta_value);
        }
    }
    
    /**
     * Update fallback meta fields
     */
    public function update_fallback_meta($meta_id, $post_id, $meta_key, $meta_value) {
        // Only handle our custom meta keys
        if (strpos($meta_key, '_postcrafter_') !== 0) {
            return;
        }
        
        // Map to standard meta fields
        $fallback_mapping = array(
            '_postcrafter_meta_title' => '_yoast_wpseo_title',
            '_postcrafter_meta_description' => '_yoast_wpseo_metadesc',
            '_postcrafter_focus_keywords' => '_yoast_wpseo_focuskw'
        );
        
        if (isset($fallback_mapping[$meta_key])) {
            update_post_meta($post_id, $fallback_mapping[$meta_key], $meta_value);
        }
    }
    
    /**
     * Add fallback meta boxes
     */
    public function add_fallback_meta_boxes() {
        add_meta_box(
            'postcrafter-seo-fallback',
            'PostCrafter SEO (Fallback)',
            array($this, 'render_fallback_meta_box'),
            'post',
            'normal',
            'high'
        );
    }
    
    /**
     * Render fallback meta box
     */
    public function render_fallback_meta_box($post) {
        wp_nonce_field('postcrafter_seo_fallback', 'postcrafter_seo_nonce');
        
        $meta_title = get_post_meta($post->ID, '_yoast_wpseo_title', true);
        $meta_description = get_post_meta($post->ID, '_yoast_wpseo_metadesc', true);
        $focus_keywords = get_post_meta($post->ID, '_yoast_wpseo_focuskw', true);
        
        ?>
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="postcrafter_meta_title">Meta Title</label>
                </th>
                <td>
                    <input type="text" id="postcrafter_meta_title" name="postcrafter_meta_title" 
                           value="<?php echo esc_attr($meta_title); ?>" class="regular-text" />
                    <p class="description">SEO title for search engines (max 60 characters)</p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="postcrafter_meta_description">Meta Description</label>
                </th>
                <td>
                    <textarea id="postcrafter_meta_description" name="postcrafter_meta_description" 
                              rows="3" class="large-text"><?php echo esc_textarea($meta_description); ?></textarea>
                    <p class="description">SEO description for search engines (max 160 characters)</p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="postcrafter_focus_keywords">Focus Keywords</label>
                </th>
                <td>
                    <input type="text" id="postcrafter_focus_keywords" name="postcrafter_focus_keywords" 
                           value="<?php echo esc_attr($focus_keywords); ?>" class="regular-text" />
                    <p class="description">Primary keywords for this post (comma-separated)</p>
                </td>
            </tr>
        </table>
        <?php
    }
    
    /**
     * Save fallback meta
     */
    public function save_fallback_meta($post_id) {
        // Check nonce
        if (!isset($_POST['postcrafter_seo_nonce']) || 
            !wp_verify_nonce($_POST['postcrafter_seo_nonce'], 'postcrafter_seo_fallback')) {
            return;
        }
        
        // Check permissions
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }
        
        // Save meta fields
        if (isset($_POST['postcrafter_meta_title'])) {
            update_post_meta($post_id, '_yoast_wpseo_title', sanitize_text_field($_POST['postcrafter_meta_title']));
        }
        
        if (isset($_POST['postcrafter_meta_description'])) {
            update_post_meta($post_id, '_yoast_wpseo_metadesc', sanitize_textarea_field($_POST['postcrafter_meta_description']));
        }
        
        if (isset($_POST['postcrafter_focus_keywords'])) {
            update_post_meta($post_id, '_yoast_wpseo_focuskw', sanitize_text_field($_POST['postcrafter_focus_keywords']));
        }
    }
    
    /**
     * Display compatibility notices
     */
    public function display_compatibility_notices() {
        $status = $this->get_compatibility_status();
        
        if (!$status['active']) {
            ?>
            <div class="notice notice-warning">
                <p>
                    <strong>PostCrafter Yoast Integration:</strong> 
                    Yoast SEO plugin is not active. Some features may not work correctly. 
                    <a href="<?php echo admin_url('plugin-install.php?s=yoast+seo&tab=search&type=term'); ?>">
                        Install Yoast SEO
                    </a>
                </p>
            </div>
            <?php
            return;
        }
        
        if (!$status['compatible']) {
            ?>
            <div class="notice notice-warning">
                <p>
                    <strong>PostCrafter Yoast Integration:</strong> 
                    Yoast SEO version <?php echo esc_html($status['current_version']); ?> may not be fully compatible. 
                    Recommended version: <?php echo esc_html($status['recommended_version']); ?> or higher.
                    <a href="<?php echo admin_url('update-core.php'); ?>">
                        Update Yoast SEO
                    </a>
                </p>
            </div>
            <?php
        }
    }
    
    /**
     * Check compatibility (filter callback)
     */
    public function check_compatibility($check = null) {
        return $this->get_compatibility_status();
    }
} 
<?php
/**
 * SEO Plugin Detector Class
 * 
 * Handles detection and conditional loading of SEO plugins (Yoast SEO and RankMath)
 * 
 * @package PostCrafter
 * @since 1.1.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class PostCrafter_SEO_Plugin_Detector {
    
    /**
     * Supported SEO plugins
     */
    const PLUGIN_YOAST = 'yoast';
    const PLUGIN_RANKMATH = 'rankmath';
    
    /**
     * Plugin detection results cache
     */
    private static $detection_cache = null;
    
    /**
     * Plugin version constants
     */
    const YOAST_MIN_VERSION = '14.0';
    const RANKMATH_MIN_VERSION = '1.0.49';
    
    /**
     * Constructor
     */
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('admin_notices', array($this, 'display_plugin_notices'));
    }
    
    /**
     * Initialize the detector
     */
    public function init() {
        // Clear cache on plugin activation/deactivation
        add_action('activated_plugin', array($this, 'clear_detection_cache'));
        add_action('deactivated_plugin', array($this, 'clear_detection_cache'));
        
        // Hook for compatibility checks
        add_filter('postcrafter_seo_plugin_detection', array($this, 'get_detection_results'));
    }
    
    /**
     * Get comprehensive SEO plugin detection results
     * 
     * @return array Detection results with plugin status, versions, and capabilities
     */
    public function get_detection_results() {
        // Return cached results if available
        if (self::$detection_cache !== null) {
            return self::$detection_cache;
        }
        
        $results = array(
            'yoast' => $this->detect_yoast_seo(),
            'rankmath' => $this->detect_rankmath_seo(),
            'summary' => array(),
            'recommended_action' => '',
            'compatibility_status' => 'unknown'
        );
        
        // Generate summary and recommendations
        $results['summary'] = $this->generate_detection_summary($results);
        $results['recommended_action'] = $this->get_recommended_action($results);
        $results['compatibility_status'] = $this->determine_compatibility_status($results);
        
        // Cache the results
        self::$detection_cache = $results;
        
        return $results;
    }
    
    /**
     * Detect Yoast SEO plugin
     * 
     * @return array Yoast SEO detection results
     */
    private function detect_yoast_seo() {
        $result = array(
            'active' => false,
            'version' => null,
            'version_supported' => false,
            'class_exists' => false,
            'function_exists' => false,
            'plugin_file' => 'wordpress-seo/wp-seo.php',
            'capabilities' => array(),
            'meta_keys' => array(),
            'notices' => array()
        );
        
        // Check if Yoast SEO plugin is active using multiple methods
        $active_plugins = get_option('active_plugins', array());
        $network_plugins = is_multisite() ? get_site_option('active_sitewide_plugins', array()) : array();
        
        // Method 1: Check active plugins list
        $is_active_single = in_array($result['plugin_file'], $active_plugins);
        $is_active_network = array_key_exists($result['plugin_file'], $network_plugins);
        $result['active'] = $is_active_single || $is_active_network;
        
        // Method 2: Check for Yoast classes
        $yoast_classes = array(
            'WPSEO_Admin',
            'WPSEO_Options',
            'WPSEO_Meta',
            'Yoast\WP\SEO\Main',
            'WPSEO_Frontend'
        );
        
        foreach ($yoast_classes as $class) {
            if (class_exists($class)) {
                $result['class_exists'] = true;
                $result['active'] = true;
                break;
            }
        }
        
        // Method 3: Check for Yoast functions
        $yoast_functions = array(
            'YoastSEO',
            'wpseo_auto_load',
            'yoast_seo'
        );
        
        foreach ($yoast_functions as $function) {
            if (function_exists($function)) {
                $result['function_exists'] = true;
                $result['active'] = true;
                break;
            }
        }
        
        // Get version information if active
        if ($result['active']) {
            $result = $this->get_yoast_version_info($result);
            $result['capabilities'] = $this->get_yoast_capabilities();
            $result['meta_keys'] = $this->get_yoast_meta_keys();
        }
        
        return $result;
    }
    
    /**
     * Detect RankMath SEO plugin
     * 
     * @return array RankMath SEO detection results
     */
    private function detect_rankmath_seo() {
        $result = array(
            'active' => false,
            'version' => null,
            'version_supported' => false,
            'class_exists' => false,
            'function_exists' => false,
            'plugin_file' => 'seo-by-rank-math/rank-math.php',
            'capabilities' => array(),
            'meta_keys' => array(),
            'notices' => array()
        );
        
        // Check if RankMath SEO plugin is active using multiple methods
        $active_plugins = get_option('active_plugins', array());
        $network_plugins = is_multisite() ? get_site_option('active_sitewide_plugins', array()) : array();
        
        // Method 1: Check active plugins list
        $is_active_single = in_array($result['plugin_file'], $active_plugins);
        $is_active_network = array_key_exists($result['plugin_file'], $network_plugins);
        $result['active'] = $is_active_single || $is_active_network;
        
        // Method 2: Check for RankMath classes
        $rankmath_classes = array(
            'RankMath',
            'RankMath\Admin\Admin',
            'RankMath\Helper',
            'RankMath\Post',
            'RankMath\Frontend\Frontend'
        );
        
        foreach ($rankmath_classes as $class) {
            if (class_exists($class)) {
                $result['class_exists'] = true;
                $result['active'] = true;
                break;
            }
        }
        
        // Method 3: Check for RankMath functions
        $rankmath_functions = array(
            'rank_math',
            'rank_math_get_var',
            'rank_math_the_breadcrumbs'
        );
        
        foreach ($rankmath_functions as $function) {
            if (function_exists($function)) {
                $result['function_exists'] = true;
                $result['active'] = true;
                break;
            }
        }
        
        // Method 4: Check for RankMath constants
        $rankmath_constants = array(
            'RANK_MATH_VERSION',
            'RANK_MATH_FILE',
            'RANK_MATH_PATH'
        );
        
        foreach ($rankmath_constants as $constant) {
            if (defined($constant)) {
                $result['active'] = true;
                break;
            }
        }
        
        // Get version information if active
        if ($result['active']) {
            $result = $this->get_rankmath_version_info($result);
            $result['capabilities'] = $this->get_rankmath_capabilities();
            $result['meta_keys'] = $this->get_rankmath_meta_keys();
        }
        
        return $result;
    }
    
    /**
     * Get Yoast version information
     * 
     * @param array $result Current detection result
     * @return array Updated result with version info
     */
    private function get_yoast_version_info($result) {
        // Try to get version from different sources
        $version = null;
        
        // Method 1: From WPSEO_VERSION constant
        if (defined('WPSEO_VERSION')) {
            $version = WPSEO_VERSION;
        }
        
        // Method 2: From get_plugin_data
        if (!$version && function_exists('get_plugin_data')) {
            $plugin_file = WP_PLUGIN_DIR . '/' . $result['plugin_file'];
            if (file_exists($plugin_file)) {
                $plugin_data = get_plugin_data($plugin_file);
                $version = $plugin_data['Version'];
            }
        }
        
        // Method 3: From Yoast options
        if (!$version && function_exists('get_option')) {
            $yoast_version = get_option('wpseo_version');
            if ($yoast_version) {
                $version = $yoast_version;
            }
        }
        
        $result['version'] = $version;
        $result['version_supported'] = $version ? version_compare($version, self::YOAST_MIN_VERSION, '>=') : false;
        
        if ($version && !$result['version_supported']) {
            $result['notices'][] = sprintf(
                'Yoast SEO version %s detected. Minimum required version is %s.',
                $version,
                self::YOAST_MIN_VERSION
            );
        }
        
        return $result;
    }
    
    /**
     * Get RankMath version information
     * 
     * @param array $result Current detection result
     * @return array Updated result with version info
     */
    private function get_rankmath_version_info($result) {
        // Try to get version from different sources
        $version = null;
        
        // Method 1: From RANK_MATH_VERSION constant
        if (defined('RANK_MATH_VERSION')) {
            $version = RANK_MATH_VERSION;
        }
        
        // Method 2: From get_plugin_data
        if (!$version && function_exists('get_plugin_data')) {
            $plugin_file = WP_PLUGIN_DIR . '/' . $result['plugin_file'];
            if (file_exists($plugin_file)) {
                $plugin_data = get_plugin_data($plugin_file);
                $version = $plugin_data['Version'];
            }
        }
        
        // Method 3: From RankMath helper
        if (!$version && class_exists('RankMath\Helper')) {
            try {
                $version = \RankMath\Helper::get_plugin_version();
            } catch (Exception $e) {
                // Silently fail if method doesn't exist
            }
        }
        
        $result['version'] = $version;
        $result['version_supported'] = $version ? version_compare($version, self::RANKMATH_MIN_VERSION, '>=') : false;
        
        if ($version && !$result['version_supported']) {
            $result['notices'][] = sprintf(
                'RankMath SEO version %s detected. Minimum required version is %s.',
                $version,
                self::RANKMATH_MIN_VERSION
            );
        }
        
        return $result;
    }
    
    /**
     * Get Yoast capabilities
     * 
     * @return array Available Yoast capabilities
     */
    private function get_yoast_capabilities() {
        return array(
            'meta_title' => true,
            'meta_description' => true,
            'focus_keywords' => true,
            'robots_noindex' => true,
            'robots_nofollow' => true,
            'canonical_url' => true,
            'primary_category' => true,
            'breadcrumbs' => class_exists('WPSEO_Breadcrumbs'),
            'schema_markup' => class_exists('WPSEO_Schema_Context'),
            'social_media' => true,
            'xml_sitemaps' => true
        );
    }
    
    /**
     * Get RankMath capabilities
     * 
     * @return array Available RankMath capabilities
     */
    private function get_rankmath_capabilities() {
        return array(
            'meta_title' => true,
            'meta_description' => true,
            'focus_keywords' => true,
            'robots_noindex' => true,
            'robots_nofollow' => true,
            'canonical_url' => true,
            'primary_category' => true,
            'breadcrumbs' => class_exists('RankMath\Frontend\Breadcrumbs'),
            'schema_markup' => class_exists('RankMath\Schema\DB'),
            'social_media' => true,
            'xml_sitemaps' => true,
            'content_analysis' => true,
            'keyword_rank_tracking' => true
        );
    }
    
    /**
     * Get Yoast meta keys
     * 
     * @return array Yoast meta field mappings
     */
    private function get_yoast_meta_keys() {
        return array(
            'title' => '_yoast_wpseo_title',
            'description' => '_yoast_wpseo_metadesc',
            'focus_keywords' => '_yoast_wpseo_focuskw',
            'robots_noindex' => '_yoast_wpseo_meta-robots-noindex',
            'robots_nofollow' => '_yoast_wpseo_meta-robots-nofollow',
            'canonical' => '_yoast_wpseo_canonical',
            'primary_category' => '_yoast_wpseo_primary_category',
            'opengraph_title' => '_yoast_wpseo_opengraph-title',
            'opengraph_description' => '_yoast_wpseo_opengraph-description',
            'twitter_title' => '_yoast_wpseo_twitter-title',
            'twitter_description' => '_yoast_wpseo_twitter-description'
        );
    }
    
    /**
     * Get RankMath meta keys
     * 
     * @return array RankMath meta field mappings
     */
    private function get_rankmath_meta_keys() {
        return array(
            'title' => 'rank_math_title',
            'description' => 'rank_math_description',
            'focus_keywords' => 'rank_math_focus_keyword',
            'robots_noindex' => 'rank_math_robots',
            'robots_nofollow' => 'rank_math_robots',
            'canonical' => 'rank_math_canonical_url',
            'primary_category' => 'rank_math_primary_category',
            'opengraph_title' => 'rank_math_facebook_title',
            'opengraph_description' => 'rank_math_facebook_description',
            'twitter_title' => 'rank_math_twitter_title',
            'twitter_description' => 'rank_math_twitter_description'
        );
    }
    
    /**
     * Generate detection summary
     * 
     * @param array $results Detection results
     * @return array Summary information
     */
    private function generate_detection_summary($results) {
        $yoast = $results['yoast'];
        $rankmath = $results['rankmath'];
        
        $summary = array(
            'active_plugins' => array(),
            'total_active' => 0,
            'supported_plugins' => array(),
            'unsupported_plugins' => array(),
            'primary_plugin' => null,
            'conflicts' => false,
            'no_seo_plugin' => false
        );
        
        // Check active plugins
        if ($yoast['active']) {
            $summary['active_plugins'][] = 'yoast';
            $summary['total_active']++;
            
            if ($yoast['version_supported']) {
                $summary['supported_plugins'][] = 'yoast';
            } else {
                $summary['unsupported_plugins'][] = 'yoast';
            }
        }
        
        if ($rankmath['active']) {
            $summary['active_plugins'][] = 'rankmath';
            $summary['total_active']++;
            
            if ($rankmath['version_supported']) {
                $summary['supported_plugins'][] = 'rankmath';
            } else {
                $summary['unsupported_plugins'][] = 'rankmath';
            }
        }
        
        // Determine primary plugin and conflicts
        if ($summary['total_active'] === 0) {
            $summary['no_seo_plugin'] = true;
        } elseif ($summary['total_active'] === 1) {
            $summary['primary_plugin'] = $summary['active_plugins'][0];
        } else {
            $summary['conflicts'] = true;
            // Prefer RankMath if both are active and supported
            if (in_array('rankmath', $summary['supported_plugins'])) {
                $summary['primary_plugin'] = 'rankmath';
            } elseif (in_array('yoast', $summary['supported_plugins'])) {
                $summary['primary_plugin'] = 'yoast';
            }
        }
        
        return $summary;
    }
    
    /**
     * Get recommended action based on detection results
     * 
     * @param array $results Detection results
     * @return string Recommended action
     */
    private function get_recommended_action($results) {
        $summary = $results['summary'];
        
        if ($summary['no_seo_plugin']) {
            return 'install_seo_plugin';
        }
        
        if (!empty($summary['unsupported_plugins'])) {
            return 'update_seo_plugin';
        }
        
        if ($summary['conflicts']) {
            return 'resolve_conflicts';
        }
        
        if (!empty($summary['supported_plugins'])) {
            return 'all_good';
        }
        
        return 'unknown';
    }
    
    /**
     * Determine compatibility status
     * 
     * @param array $results Detection results
     * @return string Compatibility status
     */
    private function determine_compatibility_status($results) {
        $summary = $results['summary'];
        
        if ($summary['no_seo_plugin']) {
            return 'no_seo_plugin';
        }
        
        if (!empty($summary['unsupported_plugins']) && empty($summary['supported_plugins'])) {
            return 'incompatible';
        }
        
        if ($summary['conflicts']) {
            return 'conflicts';
        }
        
        if (!empty($summary['supported_plugins'])) {
            return 'compatible';
        }
        
        return 'unknown';
    }
    
    /**
     * Check if a specific SEO plugin is active and supported
     * 
     * @param string $plugin Plugin name ('yoast' or 'rankmath')
     * @return bool True if plugin is active and supported
     */
    public function is_plugin_active_and_supported($plugin) {
        $results = $this->get_detection_results();
        
        if (!isset($results[$plugin])) {
            return false;
        }
        
        $plugin_data = $results[$plugin];
        return $plugin_data['active'] && $plugin_data['version_supported'];
    }
    
    /**
     * Get the primary SEO plugin
     * 
     * @return string|null Primary plugin name or null if none
     */
    public function get_primary_plugin() {
        $results = $this->get_detection_results();
        return $results['summary']['primary_plugin'];
    }
    
    /**
     * Check if any SEO plugin is available
     * 
     * @return bool True if at least one supported SEO plugin is active
     */
    public function has_supported_seo_plugin() {
        $results = $this->get_detection_results();
        return !empty($results['summary']['supported_plugins']);
    }
    
    /**
     * Display admin notices based on detection results
     */
    public function display_plugin_notices() {
        $results = $this->get_detection_results();
        $summary = $results['summary'];
        
        // Don't show notices on non-admin pages
        if (!is_admin()) {
            return;
        }
        
        // Show notice if no SEO plugin is active
        if ($summary['no_seo_plugin']) {
            $this->show_no_seo_plugin_notice();
            return;
        }
        
        // Show notice for unsupported versions
        if (!empty($summary['unsupported_plugins'])) {
            $this->show_unsupported_version_notice($summary['unsupported_plugins'], $results);
        }
        
        // Show notice for conflicts
        if ($summary['conflicts']) {
            $this->show_conflict_notice($summary['active_plugins']);
        }
        
        // Show success notice for supported plugins
        if (!empty($summary['supported_plugins']) && empty($summary['unsupported_plugins']) && !$summary['conflicts']) {
            $this->show_success_notice($summary['supported_plugins']);
        }
    }
    
    /**
     * Show notice when no SEO plugin is active
     */
    private function show_no_seo_plugin_notice() {
        ?>
        <div class="notice notice-error">
            <p>
                <strong><?php _e('PostCrafter SEO Integration:', 'postcrafter-seo'); ?></strong>
                <?php _e('No supported SEO plugin detected. Please install and activate either Yoast SEO or RankMath SEO.', 'postcrafter-seo'); ?>
            </p>
            <p>
                <a href="<?php echo admin_url('plugin-install.php?s=yoast+seo&tab=search&type=term'); ?>" class="button">
                    <?php _e('Install Yoast SEO', 'postcrafter-seo'); ?>
                </a>
                <a href="<?php echo admin_url('plugin-install.php?s=seo+rank+math&tab=search&type=term'); ?>" class="button">
                    <?php _e('Install RankMath SEO', 'postcrafter-seo'); ?>
                </a>
            </p>
        </div>
        <?php
    }
    
    /**
     * Show notice for unsupported plugin versions
     * 
     * @param array $unsupported_plugins List of unsupported plugins
     * @param array $results Full detection results
     */
    private function show_unsupported_version_notice($unsupported_plugins, $results) {
        ?>
        <div class="notice notice-warning">
            <p><strong><?php _e('PostCrafter SEO Integration:', 'postcrafter-seo'); ?></strong></p>
            <?php foreach ($unsupported_plugins as $plugin): ?>
                <?php
                $plugin_data = $results[$plugin];
                $plugin_name = $plugin === 'yoast' ? 'Yoast SEO' : 'RankMath SEO';
                $min_version = $plugin === 'yoast' ? self::YOAST_MIN_VERSION : self::RANKMATH_MIN_VERSION;
                ?>
                <p>
                    <?php printf(
                        __('%s version %s is not supported. Please update to version %s or higher.', 'postcrafter-seo'),
                        $plugin_name,
                        $plugin_data['version'],
                        $min_version
                    ); ?>
                </p>
            <?php endforeach; ?>
        </div>
        <?php
    }
    
    /**
     * Show notice for plugin conflicts
     * 
     * @param array $active_plugins List of active plugins
     */
    private function show_conflict_notice($active_plugins) {
        $plugin_names = array_map(function($plugin) {
            return $plugin === 'yoast' ? 'Yoast SEO' : 'RankMath SEO';
        }, $active_plugins);
        
        ?>
        <div class="notice notice-warning">
            <p>
                <strong><?php _e('PostCrafter SEO Integration:', 'postcrafter-seo'); ?></strong>
                <?php printf(
                    __('Multiple SEO plugins detected: %s. Having multiple SEO plugins active may cause conflicts. Consider deactivating one for optimal performance.', 'postcrafter-seo'),
                    implode(', ', $plugin_names)
                ); ?>
            </p>
        </div>
        <?php
    }
    
    /**
     * Show success notice for supported plugins
     * 
     * @param array $supported_plugins List of supported plugins
     */
    private function show_success_notice($supported_plugins) {
        // Only show this notice once per session to avoid spam
        if (get_transient('postcrafter_seo_success_notice_shown')) {
            return;
        }
        
        $plugin_names = array_map(function($plugin) {
            return $plugin === 'yoast' ? 'Yoast SEO' : 'RankMath SEO';
        }, $supported_plugins);
        
        ?>
        <div class="notice notice-success is-dismissible">
            <p>
                <strong><?php _e('PostCrafter SEO Integration:', 'postcrafter-seo'); ?></strong>
                <?php printf(
                    __('Successfully detected and configured for %s. SEO fields are now available via REST API.', 'postcrafter-seo'),
                    implode(' and ', $plugin_names)
                ); ?>
            </p>
        </div>
        <?php
        
        // Set transient to avoid showing this notice repeatedly
        set_transient('postcrafter_seo_success_notice_shown', true, DAY_IN_SECONDS);
    }
    
    /**
     * Clear detection cache
     */
    public function clear_detection_cache() {
        self::$detection_cache = null;
        delete_transient('postcrafter_seo_success_notice_shown');
    }
    
    /**
     * Get plugin detection results for API
     * 
     * @return array API-formatted detection results
     */
    public function get_api_detection_results() {
        $results = $this->get_detection_results();
        
        return array(
            'status' => $results['compatibility_status'],
            'primary_plugin' => $results['summary']['primary_plugin'],
            'active_plugins' => $results['summary']['active_plugins'],
            'supported_plugins' => $results['summary']['supported_plugins'],
            'has_conflicts' => $results['summary']['conflicts'],
            'yoast' => array(
                'active' => $results['yoast']['active'],
                'version' => $results['yoast']['version'],
                'supported' => $results['yoast']['version_supported']
            ),
            'rankmath' => array(
                'active' => $results['rankmath']['active'],
                'version' => $results['rankmath']['version'],
                'supported' => $results['rankmath']['version_supported']
            ),
            'recommended_action' => $results['recommended_action']
        );
    }
}
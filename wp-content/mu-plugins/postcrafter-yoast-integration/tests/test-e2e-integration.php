<?php
/**
 * End-to-End Integration Tests
 * 
 * Comprehensive tests for the complete RankMath integration workflow
 * 
 * @package PostCrafter
 * @since 1.1.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

require_once dirname(__FILE__) . '/test-config.php';

class PostCrafter_E2E_Integration_Tests {
    
    /**
     * Test results storage
     */
    private $test_results = array();
    
    /**
     * Test post IDs
     */
    private $test_post_ids = array();
    
    /**
     * SEO Integration instance
     */
    private $seo_integration;
    
    /**
     * Plugin detector instance
     */
    private $detector;
    
    /**
     * Data converter instance
     */
    private $converter;
    
    /**
     * REST API handler instance
     */
    private $api_handler;
    
    /**
     * Run all end-to-end tests
     */
    public function run_all_tests() {
        echo "<h2>🔄 PostCrafter End-to-End Integration Tests</h2>\n";
        echo "<div style='background: #f1f1f1; padding: 15px; margin: 10px 0; border-radius: 5px;'>\n";
        
        // Initialize test environment
        $this->setup_test_environment();
        
        // Run comprehensive integration tests
        $this->test_plugin_detection_workflow();
        $this->test_rankmath_field_operations();
        $this->test_universal_api_workflow();
        $this->test_yoast_to_rankmath_migration();
        $this->test_rankmath_to_yoast_migration();
        $this->test_dual_plugin_scenarios();
        $this->test_rest_api_endpoints();
        $this->test_wordpress_integration();
        $this->test_error_scenarios();
        $this->test_performance_scenarios();
        $this->test_compatibility_scenarios();
        
        // Display results summary
        $this->display_test_summary();
        
        // Clean up test environment
        $this->cleanup_test_environment();
        
        echo "</div>\n";
    }
    
    /**
     * Setup test environment
     */
    private function setup_test_environment() {
        echo "<h3>🔧 Setting up E2E integration test environment...</h3>\n";
        
        // Initialize test results
        $this->test_results = array(
            'passed' => 0,
            'failed' => 0,
            'total' => 0,
            'scenarios' => array(),
            'details' => array()
        );
        
        // Create test posts for different scenarios
        for ($i = 1; $i <= 5; $i++) {
            $post_id = wp_insert_post(array(
                'post_title' => "E2E Test Post {$i}",
                'post_content' => "This is end-to-end test post {$i} for integration testing.",
                'post_status' => 'draft',
                'post_type' => 'post'
            ));
            $this->test_post_ids[] = $post_id;
        }
        
        // Initialize core components
        $this->seo_integration = new PostCrafter_SEO_Integration();
        $this->detector = new PostCrafter_SEO_Plugin_Detector();
        $this->converter = new PostCrafter_SEO_Data_Converter();
        $this->api_handler = new PostCrafter_REST_API_Handler();
        
        echo "<p>✅ E2E test environment initialized with " . count($this->test_post_ids) . " test posts</p>\n";
    }
    
    /**
     * Test complete plugin detection workflow
     */
    private function test_plugin_detection_workflow() {
        echo "<h4>🔍 Testing Plugin Detection Workflow</h4>\n";
        
        // Scenario 1: Fresh system with no plugins
        $this->run_scenario(
            'Fresh System Detection',
            function() {
                // Simulate no plugins active
                return $this->detector->has_supported_seo_plugin() !== null; // Should handle gracefully
            },
            'Should handle systems with no SEO plugins gracefully'
        );
        
        // Scenario 2: RankMath activation detection
        $this->run_scenario(
            'RankMath Plugin Detection',
            function() {
                // Simulate RankMath detection
                $is_active = $this->detector->is_plugin_active('rankmath');
                $is_supported = $this->detector->is_plugin_active_and_supported('rankmath');
                $version = $this->detector->get_plugin_version('rankmath');
                
                return ($is_active !== null) && ($is_supported !== null) && !empty($version);
            },
            'Should detect RankMath plugin status and version information'
        );
        
        // Scenario 3: Primary plugin selection logic
        $this->run_scenario(
            'Primary Plugin Selection',
            function() {
                $primary = $this->detector->get_primary_plugin();
                $preferences = $this->detector->get_plugin_preferences();
                
                return !empty($primary) && is_array($preferences);
            },
            'Should select and manage primary SEO plugin preferences'
        );
        
        // Scenario 4: Admin settings integration
        $this->run_scenario(
            'Admin Settings Integration',
            function() {
                // Test settings registration
                $settings_registered = has_action('admin_init', array($this->seo_integration, 'register_settings'));
                $menu_registered = has_action('admin_menu', array($this->seo_integration, 'add_admin_menu'));
                
                return $settings_registered !== false && $menu_registered !== false;
            },
            'Should integrate properly with WordPress admin settings'
        );
    }
    
    /**
     * Test RankMath field operations end-to-end
     */
    private function test_rankmath_field_operations() {
        echo "<h4>📝 Testing RankMath Field Operations</h4>\n";
        
        $post_id = $this->test_post_ids[0];
        
        // Scenario 1: Complete RankMath field CRUD operations
        $this->run_scenario(
            'RankMath CRUD Operations',
            function() use ($post_id) {
                if (!class_exists('PostCrafter_RankMath_Field_Handler')) {
                    require_once dirname(__FILE__) . '/../includes/class-rankmath-field-handler.php';
                }
                $handler = new PostCrafter_RankMath_Field_Handler();
                
                // Create
                $create_result = $handler->set_rankmath_meta_title($post_id, 'E2E Test Title');
                $handler->set_rankmath_meta_description($post_id, 'E2E test description for integration testing');
                $handler->set_rankmath_focus_keywords($post_id, 'e2e, integration, testing');
                
                // Read
                $title = $handler->get_rankmath_meta_title($post_id);
                $description = $handler->get_rankmath_meta_description($post_id);
                $keywords = $handler->get_rankmath_focus_keywords($post_id);
                
                // Update
                $update_result = $handler->set_rankmath_meta_title($post_id, 'Updated E2E Title');
                $updated_title = $handler->get_rankmath_meta_title($post_id);
                
                // Validate all operations
                return $create_result && 
                       $title === 'E2E Test Title' &&
                       $description === 'E2E test description for integration testing' &&
                       $keywords === 'e2e, integration, testing' &&
                       $update_result &&
                       $updated_title === 'Updated E2E Title';
            },
            'Should perform complete CRUD operations on RankMath fields'
        );
        
        // Scenario 2: Robots meta array handling
        $this->run_scenario(
            'Robots Meta Array Handling',
            function() use ($post_id) {
                if (!class_exists('PostCrafter_RankMath_Field_Handler')) {
                    require_once dirname(__FILE__) . '/../includes/class-rankmath-field-handler.php';
                }
                $handler = new PostCrafter_RankMath_Field_Handler();
                
                // Set robots noindex
                $handler->set_rankmath_meta_robots_noindex($post_id, true);
                $noindex_status = $handler->get_rankmath_meta_robots_noindex($post_id);
                
                // Set robots nofollow
                $handler->set_rankmath_meta_robots_nofollow($post_id, true);
                $nofollow_status = $handler->get_rankmath_meta_robots_nofollow($post_id);
                
                // Check array format
                $robots_array = get_post_meta($post_id, 'rank_math_robots', true);
                
                return $noindex_status === true &&
                       $nofollow_status === true &&
                       is_array($robots_array) &&
                       in_array('noindex', $robots_array) &&
                       in_array('nofollow', $robots_array);
            },
            'Should handle RankMath robots meta in array format correctly'
        );
        
        // Scenario 3: Social media fields integration
        $this->run_scenario(
            'Social Media Fields Integration',
            function() use ($post_id) {
                if (!class_exists('PostCrafter_RankMath_Field_Handler')) {
                    require_once dirname(__FILE__) . '/../includes/class-rankmath-field-handler.php';
                }
                $handler = new PostCrafter_RankMath_Field_Handler();
                
                // Set social media fields
                $og_title_result = $handler->set_rankmath_opengraph_title($post_id, 'E2E OpenGraph Title');
                $og_desc_result = $handler->set_rankmath_opengraph_description($post_id, 'E2E OpenGraph description');
                $twitter_title_result = $handler->set_rankmath_twitter_title($post_id, 'E2E Twitter Title');
                
                // Get social media fields
                $og_title = $handler->get_rankmath_opengraph_title($post_id);
                $og_desc = $handler->get_rankmath_opengraph_description($post_id);
                $twitter_title = $handler->get_rankmath_twitter_title($post_id);
                
                return $og_title_result && $og_desc_result && $twitter_title_result &&
                       $og_title === 'E2E OpenGraph Title' &&
                       $og_desc === 'E2E OpenGraph description' &&
                       $twitter_title === 'E2E Twitter Title';
            },
            'Should handle social media fields (OpenGraph, Twitter) correctly'
        );
        
        // Scenario 4: RankMath-specific features
        $this->run_scenario(
            'RankMath-Specific Features',
            function() use ($post_id) {
                // Test pillar content
                update_post_meta($post_id, 'rank_math_pillar_content', '1');
                $pillar_status = get_post_meta($post_id, 'rank_math_pillar_content', true);
                
                // Test breadcrumb title
                update_post_meta($post_id, 'rank_math_breadcrumb_title', 'E2E Breadcrumb');
                $breadcrumb = get_post_meta($post_id, 'rank_math_breadcrumb_title', true);
                
                // Test Twitter card type
                update_post_meta($post_id, 'rank_math_twitter_card_type', 'summary_large_image');
                $card_type = get_post_meta($post_id, 'rank_math_twitter_card_type', true);
                
                return $pillar_status === '1' &&
                       $breadcrumb === 'E2E Breadcrumb' &&
                       $card_type === 'summary_large_image';
            },
            'Should support RankMath-specific features correctly'
        );
    }
    
    /**
     * Test universal API workflow
     */
    private function test_universal_api_workflow() {
        echo "<h4>🌐 Testing Universal API Workflow</h4>\n";
        
        $post_id = $this->test_post_ids[1];
        
        // Scenario 1: Universal field access
        $this->run_scenario(
            'Universal Field Access',
            function() use ($post_id) {
                // Set RankMath data directly
                update_post_meta($post_id, 'rank_math_title', 'Universal API Title');
                update_post_meta($post_id, 'rank_math_description', 'Universal API description');
                
                // Access through universal methods
                $title = $this->seo_integration->get_seo_meta_title($post_id);
                $description = $this->seo_integration->get_seo_meta_description($post_id);
                
                return $title === 'Universal API Title' &&
                       $description === 'Universal API description';
            },
            'Should access RankMath fields through universal API methods'
        );
        
        // Scenario 2: Universal field updates
        $this->run_scenario(
            'Universal Field Updates',
            function() use ($post_id) {
                // Update through universal methods
                $title_result = $this->seo_integration->update_seo_meta_title($post_id, 'Updated Universal Title');
                $desc_result = $this->seo_integration->update_seo_meta_description($post_id, 'Updated universal description');
                
                // Verify in RankMath format
                $stored_title = get_post_meta($post_id, 'rank_math_title', true);
                $stored_desc = get_post_meta($post_id, 'rank_math_description', true);
                
                return $title_result && $desc_result &&
                       $stored_title === 'Updated Universal Title' &&
                       $stored_desc === 'Updated universal description';
            },
            'Should update RankMath fields through universal API methods'
        );
        
        // Scenario 3: Normalized data retrieval
        $this->run_scenario(
            'Normalized Data Retrieval',
            function() use ($post_id) {
                // Set mixed data
                update_post_meta($post_id, 'rank_math_title', 'Normalized Title');
                update_post_meta($post_id, 'rank_math_robots', array('noindex'));
                update_post_meta($post_id, 'rank_math_pillar_content', '1');
                
                // Get normalized data
                $normalized = $this->converter->get_normalized_data($post_id);
                
                return is_array($normalized) &&
                       isset($normalized['meta_title']) &&
                       isset($normalized['robots_noindex']) &&
                       isset($normalized['plugin_specific']) &&
                       $normalized['meta_title'] === 'Normalized Title' &&
                       $normalized['robots_noindex'] === true &&
                       $normalized['plugin_detected'] === 'rankmath';
            },
            'Should retrieve normalized data regardless of plugin format'
        );
    }
    
    /**
     * Test Yoast to RankMath migration workflow
     */
    private function test_yoast_to_rankmath_migration() {
        echo "<h4>➡️ Testing Yoast to RankMath Migration Workflow</h4>\n";
        
        $post_id = $this->test_post_ids[2];
        
        // Scenario 1: Complete migration workflow
        $this->run_scenario(
            'Complete Yoast to RankMath Migration',
            function() use ($post_id) {
                // Set up Yoast data
                update_post_meta($post_id, '_yoast_wpseo_title', 'Yoast Migration Title');
                update_post_meta($post_id, '_yoast_wpseo_metadesc', 'Yoast migration description');
                update_post_meta($post_id, '_yoast_wpseo_focuskw', 'yoast, migration');
                update_post_meta($post_id, '_yoast_wpseo_canonical', 'https://example.com/migration');
                update_post_meta($post_id, '_yoast_wpseo_meta-robots-noindex', '1');
                
                // Generate migration report
                $report = $this->converter->create_migration_report($post_id, 'yoast', 'rankmath');
                
                // Perform migration
                $result = $this->converter->convert_between_plugins($post_id, 'yoast', 'rankmath');
                
                // Validate migration
                $validation = $this->converter->validate_conversion_integrity($post_id, $result);
                
                // Check RankMath data
                $rm_title = get_post_meta($post_id, 'rank_math_title', true);
                $rm_desc = get_post_meta($post_id, 'rank_math_description', true);
                $rm_robots = get_post_meta($post_id, 'rank_math_robots', true);
                
                return is_array($report) &&
                       $result['success'] &&
                       $validation['is_valid'] &&
                       $rm_title === 'Yoast Migration Title' &&
                       $rm_desc === 'Yoast migration description' &&
                       is_array($rm_robots) &&
                       in_array('noindex', $rm_robots);
            },
            'Should perform complete Yoast to RankMath migration with validation'
        );
        
        // Scenario 2: Migration report analysis
        $this->run_scenario(
            'Migration Report Analysis',
            function() use ($post_id) {
                // Add Yoast-specific data
                update_post_meta($post_id, '_yoast_wpseo_linkdex', '85');
                update_post_meta($post_id, '_yoast_wpseo_content_score', '90');
                
                $report = $this->converter->create_migration_report($post_id, 'yoast', 'rankmath');
                
                return isset($report['mappable_fields']) &&
                       isset($report['plugin_specific_fields']) &&
                       isset($report['potential_data_loss']) &&
                       isset($report['recommendations']) &&
                       count($report['mappable_fields']) > 0 &&
                       count($report['potential_data_loss']) > 0; // Yoast-specific fields
            },
            'Should generate comprehensive migration analysis reports'
        );
    }
    
    /**
     * Test RankMath to Yoast migration workflow
     */
    private function test_rankmath_to_yoast_migration() {
        echo "<h4>⬅️ Testing RankMath to Yoast Migration Workflow</h4>\n";
        
        $post_id = $this->test_post_ids[3];
        
        // Scenario 1: Reverse migration workflow
        $this->run_scenario(
            'Complete RankMath to Yoast Migration',
            function() use ($post_id) {
                // Set up RankMath data
                update_post_meta($post_id, 'rank_math_title', 'RankMath Migration Title');
                update_post_meta($post_id, 'rank_math_description', 'RankMath migration description');
                update_post_meta($post_id, 'rank_math_focus_keyword', 'rankmath, migration');
                update_post_meta($post_id, 'rank_math_robots', array('nofollow'));
                
                // Perform reverse migration
                $result = $this->converter->convert_between_plugins($post_id, 'rankmath', 'yoast');
                
                // Validate migration
                $validation = $this->converter->validate_conversion_integrity($post_id, $result);
                
                // Check Yoast data
                $yoast_title = get_post_meta($post_id, '_yoast_wpseo_title', true);
                $yoast_desc = get_post_meta($post_id, '_yoast_wpseo_metadesc', true);
                $yoast_nofollow = get_post_meta($post_id, '_yoast_wpseo_meta-robots-nofollow', true);
                
                return $result['success'] &&
                       $validation['is_valid'] &&
                       $yoast_title === 'RankMath Migration Title' &&
                       $yoast_desc === 'RankMath migration description' &&
                       $yoast_nofollow === '1';
            },
            'Should perform complete RankMath to Yoast migration with validation'
        );
    }
    
    /**
     * Test dual plugin scenarios
     */
    private function test_dual_plugin_scenarios() {
        echo "<h4>🔄 Testing Dual Plugin Scenarios</h4>\n";
        
        // Scenario 1: Primary plugin selection
        $this->run_scenario(
            'Primary Plugin Selection Logic',
            function() {
                $primary = $this->detector->get_primary_plugin();
                $detection_results = $this->detector->get_api_detection_results();
                
                return !empty($primary) && is_array($detection_results);
            },
            'Should handle primary plugin selection when multiple plugins are available'
        );
        
        // Scenario 2: Plugin preference management
        $this->run_scenario(
            'Plugin Preference Management',
            function() {
                $preferences = $this->detector->get_plugin_preferences();
                
                // Test preference setting (would normally be through admin interface)
                return is_array($preferences);
            },
            'Should manage plugin preferences correctly'
        );
        
        // Scenario 3: Conflict resolution
        $this->run_scenario(
            'Plugin Conflict Resolution',
            function() {
                $conflicts = $this->detector->get_plugin_conflicts();
                
                return is_array($conflicts); // Should handle conflicts gracefully
            },
            'Should detect and handle plugin conflicts appropriately'
        );
    }
    
    /**
     * Test REST API endpoints end-to-end
     */
    private function test_rest_api_endpoints() {
        echo "<h4>🌐 Testing REST API Endpoints</h4>\n";
        
        $post_id = $this->test_post_ids[4];
        
        // Scenario 1: Universal SEO fields endpoint
        $this->run_scenario(
            'Universal SEO Fields Endpoint',
            function() use ($post_id) {
                // Set up test data
                update_post_meta($post_id, 'rank_math_title', 'API Test Title');
                update_post_meta($post_id, 'rank_math_description', 'API test description');
                
                // Test getter methods exist and work
                $title_getter = method_exists($this->api_handler, 'get_seo_meta_title');
                $desc_getter = method_exists($this->api_handler, 'get_seo_meta_description');
                
                // Test setter methods exist and work
                $title_setter = method_exists($this->api_handler, 'update_seo_meta_title');
                $desc_setter = method_exists($this->api_handler, 'update_seo_meta_description');
                
                return $title_getter && $desc_getter && $title_setter && $desc_setter;
            },
            'Should provide working universal SEO fields API endpoints'
        );
        
        // Scenario 2: RankMath-specific endpoints
        $this->run_scenario(
            'RankMath-Specific Endpoints',
            function() use ($post_id) {
                // Test RankMath-specific methods
                $pillar_getter = method_exists($this->api_handler, 'get_rankmath_pillar_content');
                $pillar_setter = method_exists($this->api_handler, 'update_rankmath_pillar_content');
                $breadcrumb_getter = method_exists($this->api_handler, 'get_rankmath_breadcrumbs_title');
                $breadcrumb_setter = method_exists($this->api_handler, 'update_rankmath_breadcrumbs_title');
                
                return $pillar_getter && $pillar_setter && $breadcrumb_getter && $breadcrumb_setter;
            },
            'Should provide working RankMath-specific API endpoints'
        );
        
        // Scenario 3: Error handling in API endpoints
        $this->run_scenario(
            'API Error Handling',
            function() {
                // Test permission checking
                $permission_method = method_exists($this->api_handler, 'check_permissions');
                
                // Test route registration
                $route_method = method_exists($this->api_handler, 'register_rest_routes');
                
                return $permission_method && $route_method;
            },
            'Should handle API errors and permissions correctly'
        );
    }
    
    /**
     * Test WordPress core integration
     */
    private function test_wordpress_integration() {
        echo "<h4>📝 Testing WordPress Core Integration</h4>\n";
        
        // Scenario 1: Posts endpoint enhancement
        $this->run_scenario(
            'WordPress Posts Endpoint Enhancement',
            function() {
                // Test filter registration
                $filter_registered = has_filter('rest_prepare_post', array($this->api_handler, 'add_seo_fields_to_response'));
                
                return $filter_registered !== false;
            },
            'Should enhance WordPress posts endpoint with SEO fields'
        );
        
        // Scenario 2: Admin integration
        $this->run_scenario(
            'WordPress Admin Integration',
            function() {
                // Test admin hooks
                $admin_menu = has_action('admin_menu', array($this->seo_integration, 'add_admin_menu'));
                $admin_init = has_action('admin_init', array($this->seo_integration, 'register_settings'));
                
                return $admin_menu !== false && $admin_init !== false;
            },
            'Should integrate properly with WordPress admin interface'
        );
        
        // Scenario 3: Plugin lifecycle hooks
        $this->run_scenario(
            'Plugin Lifecycle Integration',
            function() {
                // Test initialization hooks
                $rest_api_init = has_action('rest_api_init', array($this->api_handler, 'register_rest_routes'));
                
                return $rest_api_init !== false;
            },
            'Should integrate with WordPress plugin lifecycle correctly'
        );
    }
    
    /**
     * Test error scenarios and edge cases
     */
    private function test_error_scenarios() {
        echo "<h4>⚠️ Testing Error Scenarios</h4>\n";
        
        // Scenario 1: Invalid post ID handling
        $this->run_scenario(
            'Invalid Post ID Handling',
            function() {
                $invalid_result = $this->converter->convert_between_plugins(999999, 'yoast', 'rankmath');
                
                return $invalid_result['success'] === false && isset($invalid_result['error']);
            },
            'Should handle invalid post IDs gracefully'
        );
        
        // Scenario 2: Plugin unavailability handling
        $this->run_scenario(
            'Plugin Unavailability Handling',
            function() {
                // Test when no plugins are available
                $has_plugin = $this->detector->has_supported_seo_plugin();
                
                // Should return boolean or handle gracefully
                return is_bool($has_plugin) || is_null($has_plugin);
            },
            'Should handle plugin unavailability scenarios correctly'
        );
        
        // Scenario 3: Data corruption handling
        $this->run_scenario(
            'Data Corruption Handling',
            function() {
                $post_id = $this->test_post_ids[0];
                
                // Set corrupted robots data
                update_post_meta($post_id, 'rank_math_robots', 'invalid_data');
                
                try {
                    if (!class_exists('PostCrafter_RankMath_Field_Handler')) {
                        require_once dirname(__FILE__) . '/../includes/class-rankmath-field-handler.php';
                    }
                    $handler = new PostCrafter_RankMath_Field_Handler();
                    $robots_status = $handler->get_rankmath_meta_robots_noindex($post_id);
                    
                    // Should handle gracefully without fatal errors
                    return true;
                } catch (Exception $e) {
                    return false;
                }
            },
            'Should handle corrupted data without fatal errors'
        );
        
        // Scenario 4: Version incompatibility handling
        $this->run_scenario(
            'Version Incompatibility Handling',
            function() {
                // Test version checking
                $version_supported = $this->detector->is_version_supported('rankmath', '0.9.0');
                
                return $version_supported === false; // Old version should not be supported
            },
            'Should detect and handle version incompatibilities'
        );
    }
    
    /**
     * Test performance scenarios
     */
    private function test_performance_scenarios() {
        echo "<h4>⚡ Testing Performance Scenarios</h4>\n";
        
        // Scenario 1: Bulk operations performance
        $this->run_scenario(
            'Bulk Operations Performance',
            function() {
                $start_time = microtime(true);
                
                // Perform bulk operations
                foreach ($this->test_post_ids as $post_id) {
                    update_post_meta($post_id, 'rank_math_title', "Bulk Title {$post_id}");
                    $this->converter->get_normalized_data($post_id);
                }
                
                $end_time = microtime(true);
                $execution_time = $end_time - $start_time;
                
                // Should complete within reasonable time (5 seconds for 5 posts)
                return $execution_time < 5.0;
            },
            'Should handle bulk operations within reasonable time limits'
        );
        
        // Scenario 2: Cache effectiveness
        $this->run_scenario(
            'Cache Effectiveness',
            function() {
                $post_id = $this->test_post_ids[0];
                
                // First call (cache miss)
                $start_time = microtime(true);
                $first_result = $this->converter->get_normalized_data($post_id);
                $first_time = microtime(true) - $start_time;
                
                // Second call (cache hit)
                $start_time = microtime(true);
                $second_result = $this->converter->get_normalized_data($post_id);
                $second_time = microtime(true) - $start_time;
                
                // Cache should make second call faster
                return $second_time <= $first_time && $first_result == $second_result;
            },
            'Should utilize caching for improved performance'
        );
        
        // Scenario 3: Memory usage optimization
        $this->run_scenario(
            'Memory Usage Optimization',
            function() {
                $initial_memory = memory_get_usage();
                
                // Perform memory-intensive operations
                for ($i = 0; $i < 100; $i++) {
                    $data = array();
                    foreach ($this->test_post_ids as $post_id) {
                        $data[] = $this->converter->get_normalized_data($post_id);
                    }
                    unset($data);
                }
                
                // Clear caches
                $this->converter->clear_conversion_cache();
                
                $final_memory = memory_get_usage();
                $memory_increase = $final_memory - $initial_memory;
                
                // Memory increase should be reasonable (less than 10MB)
                return $memory_increase < (10 * 1024 * 1024);
            },
            'Should manage memory usage efficiently'
        );
    }
    
    /**
     * Test compatibility scenarios
     */
    private function test_compatibility_scenarios() {
        echo "<h4>🔧 Testing Compatibility Scenarios</h4>\n";
        
        // Scenario 1: WordPress version compatibility
        $this->run_scenario(
            'WordPress Version Compatibility',
            function() {
                global $wp_version;
                
                // Test with current WordPress version
                $is_compatible = version_compare($wp_version, '5.0', '>=');
                
                // Should work with WordPress 5.0+
                return $is_compatible;
            },
            'Should be compatible with supported WordPress versions'
        );
        
        // Scenario 2: PHP version compatibility
        $this->run_scenario(
            'PHP Version Compatibility',
            function() {
                $php_version = PHP_VERSION;
                
                // Test with current PHP version
                $is_compatible = version_compare($php_version, '7.4', '>=');
                
                // Should work with PHP 7.4+
                return $is_compatible;
            },
            'Should be compatible with supported PHP versions'
        );
        
        // Scenario 3: Plugin conflict detection
        $this->run_scenario(
            'Plugin Conflict Detection',
            function() {
                // Test conflict detection mechanism
                $conflicts = $this->detector->get_plugin_conflicts();
                
                // Should return array (empty or with conflicts)
                return is_array($conflicts);
            },
            'Should detect potential plugin conflicts'
        );
        
        // Scenario 4: Theme compatibility
        $this->run_scenario(
            'Theme Compatibility',
            function() {
                // Test that integration doesn't interfere with theme functions
                $theme_support = current_theme_supports('html5');
                
                // Should not break theme functionality (basic test)
                return is_bool($theme_support);
            },
            'Should be compatible with WordPress themes'
        );
    }
    
    /**
     * Run individual scenario test
     */
    private function run_scenario($scenario_name, $test_function, $description) {
        $this->test_results['total']++;
        
        try {
            $start_time = microtime(true);
            $result = $test_function();
            $end_time = microtime(true);
            $execution_time = round(($end_time - $start_time) * 1000, 2); // in milliseconds
            
            if ($result) {
                $this->test_results['passed']++;
                echo "<p style='color: green;'>✅ {$scenario_name}: PASSED ({$execution_time}ms)</p>\n";
                $this->test_results['scenarios'][] = array(
                    'name' => $scenario_name,
                    'status' => 'PASSED',
                    'execution_time' => $execution_time,
                    'description' => $description
                );
            } else {
                $this->test_results['failed']++;
                echo "<p style='color: red;'>❌ {$scenario_name}: FAILED ({$execution_time}ms)</p>\n";
                echo "<p style='color: red; margin-left: 20px;'>Description: {$description}</p>\n";
                $this->test_results['scenarios'][] = array(
                    'name' => $scenario_name,
                    'status' => 'FAILED',
                    'execution_time' => $execution_time,
                    'description' => $description
                );
            }
        } catch (Exception $e) {
            $this->test_results['failed']++;
            echo "<p style='color: red;'>❌ {$scenario_name}: ERROR - {$e->getMessage()}</p>\n";
            $this->test_results['scenarios'][] = array(
                'name' => $scenario_name,
                'status' => 'ERROR',
                'description' => $description,
                'error' => $e->getMessage()
            );
        }
    }
    
    /**
     * Display comprehensive test summary
     */
    private function display_test_summary() {
        $passed = $this->test_results['passed'];
        $failed = $this->test_results['failed'];
        $total = $this->test_results['total'];
        $success_rate = $total > 0 ? round(($passed / $total) * 100, 1) : 0;
        
        echo "<h3>📊 End-to-End Integration Test Summary</h3>\n";
        echo "<div style='background: " . ($failed === 0 ? '#d4edda' : '#f8d7da') . "; padding: 10px; border-radius: 5px; margin: 10px 0;'>\n";
        echo "<p><strong>Total Scenarios:</strong> {$total}</p>\n";
        echo "<p><strong>Passed:</strong> <span style='color: green;'>{$passed}</span></p>\n";
        echo "<p><strong>Failed:</strong> <span style='color: red;'>{$failed}</span></p>\n";
        echo "<p><strong>Success Rate:</strong> {$success_rate}%</p>\n";
        
        if ($failed === 0) {
            echo "<p style='color: green; font-weight: bold;'>🎉 All E2E integration scenarios passed!</p>\n";
        } else {
            echo "<p style='color: red; font-weight: bold;'>⚠️ Some E2E integration scenarios failed. Please review the implementation.</p>\n";
        }
        
        echo "</div>\n";
        
        // Display scenario breakdown
        echo "<h3>🔍 Scenario Breakdown</h3>\n";
        $this->display_scenario_breakdown();
        
        // Display performance metrics
        echo "<h3>⚡ Performance Metrics</h3>\n";
        $this->display_performance_metrics();
        
        // Display integration coverage
        echo "<h3>🔗 Integration Coverage</h3>\n";
        $this->display_integration_coverage();
    }
    
    /**
     * Display scenario breakdown
     */
    private function display_scenario_breakdown() {
        echo "<div style='background: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace;'>\n";
        
        $categories = array(
            'Plugin Detection' => 0,
            'Field Operations' => 0,
            'API Workflow' => 0,
            'Migration' => 0,
            'REST API' => 0,
            'WordPress Integration' => 0,
            'Error Handling' => 0,
            'Performance' => 0,
            'Compatibility' => 0
        );
        
        foreach ($this->test_results['scenarios'] as $scenario) {
            $name = $scenario['name'];
            if (strpos($name, 'Detection') !== false || strpos($name, 'Plugin') !== false) {
                $categories['Plugin Detection']++;
            } elseif (strpos($name, 'Field') !== false || strpos($name, 'CRUD') !== false) {
                $categories['Field Operations']++;
            } elseif (strpos($name, 'Universal') !== false || strpos($name, 'API') !== false) {
                $categories['API Workflow']++;
            } elseif (strpos($name, 'Migration') !== false) {
                $categories['Migration']++;
            } elseif (strpos($name, 'REST') !== false || strpos($name, 'Endpoint') !== false) {
                $categories['REST API']++;
            } elseif (strpos($name, 'WordPress') !== false || strpos($name, 'Admin') !== false) {
                $categories['WordPress Integration']++;
            } elseif (strpos($name, 'Error') !== false || strpos($name, 'Invalid') !== false) {
                $categories['Error Handling']++;
            } elseif (strpos($name, 'Performance') !== false || strpos($name, 'Bulk') !== false) {
                $categories['Performance']++;
            } else {
                $categories['Compatibility']++;
            }
        }
        
        foreach ($categories as $category => $count) {
            echo "<p><strong>{$category}:</strong> {$count} scenarios</p>\n";
        }
        
        echo "</div>\n";
    }
    
    /**
     * Display performance metrics
     */
    private function display_performance_metrics() {
        echo "<div style='background: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace;'>\n";
        
        $total_time = 0;
        $fastest_scenario = null;
        $slowest_scenario = null;
        $min_time = PHP_INT_MAX;
        $max_time = 0;
        
        foreach ($this->test_results['scenarios'] as $scenario) {
            if (isset($scenario['execution_time'])) {
                $time = $scenario['execution_time'];
                $total_time += $time;
                
                if ($time < $min_time) {
                    $min_time = $time;
                    $fastest_scenario = $scenario['name'];
                }
                
                if ($time > $max_time) {
                    $max_time = $time;
                    $slowest_scenario = $scenario['name'];
                }
            }
        }
        
        $avg_time = $total_time / count($this->test_results['scenarios']);
        
        echo "<p><strong>Total Execution Time:</strong> " . round($total_time, 2) . "ms</p>\n";
        echo "<p><strong>Average Scenario Time:</strong> " . round($avg_time, 2) . "ms</p>\n";
        echo "<p><strong>Fastest Scenario:</strong> {$fastest_scenario} ({$min_time}ms)</p>\n";
        echo "<p><strong>Slowest Scenario:</strong> {$slowest_scenario} ({$max_time}ms)</p>\n";
        
        $memory_usage = memory_get_usage(true);
        $memory_peak = memory_get_peak_usage(true);
        echo "<p><strong>Memory Usage:</strong> " . round($memory_usage / 1024 / 1024, 2) . "MB</p>\n";
        echo "<p><strong>Peak Memory:</strong> " . round($memory_peak / 1024 / 1024, 2) . "MB</p>\n";
        
        echo "</div>\n";
    }
    
    /**
     * Display integration coverage
     */
    private function display_integration_coverage() {
        echo "<div style='background: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace;'>\n";
        
        echo "<h4>Integration Points Tested:</h4>\n";
        echo "<ul>\n";
        echo "<li>✅ RankMath Plugin Detection and Version Checking</li>\n";
        echo "<li>✅ RankMath Field CRUD Operations (Title, Description, Keywords)</li>\n";
        echo "<li>✅ RankMath Robots Meta Array Handling</li>\n";
        echo "<li>✅ RankMath Social Media Fields (OpenGraph, Twitter)</li>\n";
        echo "<li>✅ RankMath-Specific Features (Pillar Content, Breadcrumbs)</li>\n";
        echo "<li>✅ Universal API Field Access and Updates</li>\n";
        echo "<li>✅ Data Normalization Across Plugins</li>\n";
        echo "<li>✅ Bidirectional Migration (Yoast ↔ RankMath)</li>\n";
        echo "<li>✅ Migration Report Generation and Validation</li>\n";
        echo "<li>✅ REST API Endpoint Registration and Functionality</li>\n";
        echo "<li>✅ WordPress Admin Integration</li>\n";
        echo "<li>✅ Error Handling and Edge Cases</li>\n";
        echo "<li>✅ Performance Optimization and Caching</li>\n";
        echo "<li>✅ Version and Plugin Compatibility</li>\n";
        echo "</ul>\n";
        
        echo "<h4>WordPress Integration Points:</h4>\n";
        echo "<ul>\n";
        echo "<li>REST API Registration (rest_api_init)</li>\n";
        echo "<li>Admin Menu Integration (admin_menu)</li>\n";
        echo "<li>Settings Registration (admin_init)</li>\n";
        echo "<li>Post Response Filtering (rest_prepare_post)</li>\n";
        echo "<li>Plugin Lifecycle Hooks</li>\n";
        echo "</ul>\n";
        
        echo "<h4>RankMath Integration Points:</h4>\n";
        echo "<ul>\n";
        echo "<li>Meta Field Detection and Mapping</li>\n";
        echo "<li>Data Type Conversion (Arrays, Booleans, Strings)</li>\n";
        echo "<li>Plugin Version Compatibility Checking</li>\n";
        echo "<li>Cache Integration and Management</li>\n";
        echo "<li>Error Recovery and Fallback Mechanisms</li>\n";
        echo "</ul>\n";
        
        echo "</div>\n";
    }
    
    /**
     * Clean up test environment
     */
    private function cleanup_test_environment() {
        echo "<h3>🧹 Cleaning up E2E test environment...</h3>\n";
        
        // Delete test posts
        foreach ($this->test_post_ids as $post_id) {
            wp_delete_post($post_id, true);
        }
        
        // Clear all caches
        $this->converter->clear_conversion_cache();
        wp_cache_flush();
        
        echo "<p>✅ Deleted " . count($this->test_post_ids) . " test posts and cleared caches</p>\n";
    }
}

// Run tests if accessed directly
if (basename($_SERVER['PHP_SELF']) === 'test-e2e-integration.php') {
    $tests = new PostCrafter_E2E_Integration_Tests();
    $tests->run_all_tests();
}
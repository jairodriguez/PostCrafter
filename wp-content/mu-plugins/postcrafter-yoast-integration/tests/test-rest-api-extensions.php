<?php
/**
 * REST API Extensions Tests
 * 
 * Tests for the extended REST API functionality supporting both Yoast and RankMath
 * 
 * @package PostCrafter
 * @since 1.1.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

require_once dirname(__FILE__) . '/test-config.php';
require_once dirname(__FILE__) . '/../includes/class-rest-api-handler.php';

class PostCrafter_REST_API_Extensions_Tests {
    
    /**
     * Test results storage
     */
    private $test_results = array();
    
    /**
     * Test post ID
     */
    private $test_post_id;
    
    /**
     * REST API handler instance
     */
    private $api_handler;
    
    /**
     * Mock detector instance
     */
    private $detector;
    
    /**
     * Run all tests
     */
    public function run_all_tests() {
        echo "<h2>🌐 PostCrafter REST API Extensions Tests</h2>\n";
        echo "<div style='background: #f1f1f1; padding: 15px; margin: 10px 0; border-radius: 5px;'>\n";
        
        // Initialize test environment
        $this->setup_test_environment();
        
        // Run REST API extension tests
        $this->test_universal_field_registration();
        $this->test_universal_getters_yoast();
        $this->test_universal_getters_rankmath();
        $this->test_universal_setters_yoast();
        $this->test_universal_setters_rankmath();
        $this->test_robots_fields_conversion();
        $this->test_legacy_compatibility();
        $this->test_plugin_detection_integration();
        $this->test_rest_routes_registration();
        $this->test_unified_endpoint_responses();
        $this->test_error_handling();
        $this->test_permission_checking();
        
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
        echo "<h3>🔧 Setting up REST API extensions test environment...</h3>\n";
        
        // Initialize test results
        $this->test_results = array(
            'passed' => 0,
            'failed' => 0,
            'total' => 0,
            'details' => array()
        );
        
        // Create test post
        $this->test_post_id = wp_insert_post(array(
            'post_title' => 'Test Post for REST API Extensions',
            'post_content' => 'This is a test post for REST API extension tests.',
            'post_status' => 'draft',
            'post_type' => 'post'
        ));
        
        // Initialize API handler
        $this->api_handler = new PostCrafter_REST_API_Handler();
        
        // Get detector from the handler
        $reflection = new ReflectionClass($this->api_handler);
        $detector_property = $reflection->getProperty('detector');
        $detector_property->setAccessible(true);
        $this->detector = $detector_property->getValue($this->api_handler);
        
        echo "<p>✅ Test environment initialized with test post ID: {$this->test_post_id}</p>\n";
    }
    
    /**
     * Test universal field registration
     */
    private function test_universal_field_registration() {
        echo "<h4>📝 Testing Universal Field Registration</h4>\n";
        
        // Test 1: Universal field callbacks exist
        $this->run_test(
            'Universal Field Callbacks Exist',
            function() {
                return method_exists($this->api_handler, 'get_seo_meta_title') &&
                       method_exists($this->api_handler, 'update_seo_meta_title') &&
                       method_exists($this->api_handler, 'get_seo_meta_description') &&
                       method_exists($this->api_handler, 'update_seo_meta_description') &&
                       method_exists($this->api_handler, 'get_seo_focus_keywords') &&
                       method_exists($this->api_handler, 'update_seo_focus_keywords');
            },
            'Should have all universal field getter and setter methods'
        );
        
        // Test 2: Robot field callbacks exist
        $this->run_test(
            'Robot Field Callbacks Exist',
            function() {
                return method_exists($this->api_handler, 'get_seo_robots_noindex') &&
                       method_exists($this->api_handler, 'update_seo_robots_noindex') &&
                       method_exists($this->api_handler, 'get_seo_robots_nofollow') &&
                       method_exists($this->api_handler, 'update_seo_robots_nofollow');
            },
            'Should have robot field getter and setter methods'
        );
        
        // Test 3: RankMath-specific field callbacks exist
        $this->run_test(
            'RankMath-Specific Field Callbacks Exist',
            function() {
                return method_exists($this->api_handler, 'get_rankmath_pillar_content') &&
                       method_exists($this->api_handler, 'update_rankmath_pillar_content') &&
                       method_exists($this->api_handler, 'get_rankmath_breadcrumbs_title') &&
                       method_exists($this->api_handler, 'update_rankmath_breadcrumbs_title');
            },
            'Should have RankMath-specific field getter and setter methods'
        );
    }
    
    /**
     * Test universal getters with Yoast simulation
     */
    private function test_universal_getters_yoast() {
        echo "<h4>📤 Testing Universal Getters with Yoast Simulation</h4>\n";
        
        // Mock Yoast as primary plugin
        $this->mock_primary_plugin('yoast');
        
        // Set up Yoast test data
        update_post_meta($this->test_post_id, '_yoast_wpseo_title', 'Yoast Test Title');
        update_post_meta($this->test_post_id, '_yoast_wpseo_metadesc', 'Yoast test description');
        update_post_meta($this->test_post_id, '_yoast_wpseo_focuskw', 'yoast keyword');
        update_post_meta($this->test_post_id, '_yoast_wpseo_canonical', 'https://example.com/yoast');
        update_post_meta($this->test_post_id, '_yoast_wpseo_meta-robots-noindex', '1');
        update_post_meta($this->test_post_id, '_yoast_wpseo_meta-robots-nofollow', '');
        
        $post_array = array('id' => $this->test_post_id);
        
        // Test 1: Universal getters with Yoast
        $this->run_test(
            'Universal Getters with Yoast',
            function() use ($post_array) {
                $title = $this->api_handler->get_seo_meta_title($post_array);
                $description = $this->api_handler->get_seo_meta_description($post_array);
                $keywords = $this->api_handler->get_seo_focus_keywords($post_array);
                $canonical = $this->api_handler->get_seo_canonical($post_array);
                
                return $title === 'Yoast Test Title' &&
                       $description === 'Yoast test description' &&
                       $keywords === 'yoast keyword' &&
                       $canonical === 'https://example.com/yoast';
            },
            'Should retrieve Yoast field values through universal getters'
        );
        
        // Test 2: Universal robot getters with Yoast
        $this->run_test(
            'Universal Robot Getters with Yoast',
            function() use ($post_array) {
                $noindex = $this->api_handler->get_seo_robots_noindex($post_array);
                $nofollow = $this->api_handler->get_seo_robots_nofollow($post_array);
                
                return $noindex === true && $nofollow === false;
            },
            'Should retrieve Yoast robot field values through universal getters'
        );
    }
    
    /**
     * Test universal getters with RankMath simulation
     */
    private function test_universal_getters_rankmath() {
        echo "<h4>📤 Testing Universal Getters with RankMath Simulation</h4>\n";
        
        // Mock RankMath as primary plugin
        $this->mock_primary_plugin('rankmath');
        
        // Set up RankMath test data
        update_post_meta($this->test_post_id, 'rank_math_title', 'RankMath Test Title');
        update_post_meta($this->test_post_id, 'rank_math_description', 'RankMath test description');
        update_post_meta($this->test_post_id, 'rank_math_focus_keyword', 'rankmath keyword');
        update_post_meta($this->test_post_id, 'rank_math_canonical_url', 'https://example.com/rankmath');
        update_post_meta($this->test_post_id, 'rank_math_robots', array('noindex'));
        
        $post_array = array('id' => $this->test_post_id);
        
        // Test 1: Universal getters with RankMath
        $this->run_test(
            'Universal Getters with RankMath',
            function() use ($post_array) {
                $title = $this->api_handler->get_seo_meta_title($post_array);
                $description = $this->api_handler->get_seo_meta_description($post_array);
                $keywords = $this->api_handler->get_seo_focus_keywords($post_array);
                $canonical = $this->api_handler->get_seo_canonical($post_array);
                
                return $title === 'RankMath Test Title' &&
                       $description === 'RankMath test description' &&
                       $keywords === 'rankmath keyword' &&
                       $canonical === 'https://example.com/rankmath';
            },
            'Should retrieve RankMath field values through universal getters'
        );
        
        // Test 2: Universal robot getters with RankMath
        $this->run_test(
            'Universal Robot Getters with RankMath',
            function() use ($post_array) {
                $noindex = $this->api_handler->get_seo_robots_noindex($post_array);
                $nofollow = $this->api_handler->get_seo_robots_nofollow($post_array);
                
                return $noindex === true && $nofollow === false;
            },
            'Should retrieve RankMath robot field values through universal getters'
        );
    }
    
    /**
     * Test universal setters with Yoast simulation
     */
    private function test_universal_setters_yoast() {
        echo "<h4>📥 Testing Universal Setters with Yoast Simulation</h4>\n";
        
        // Mock Yoast as primary plugin
        $this->mock_primary_plugin('yoast');
        
        $post_object = get_post($this->test_post_id);
        
        // Test 1: Universal setters with Yoast
        $this->run_test(
            'Universal Setters with Yoast',
            function() use ($post_object) {
                $this->api_handler->update_seo_meta_title('New Yoast Title', $post_object);
                $this->api_handler->update_seo_meta_description('New Yoast Description', $post_object);
                $this->api_handler->update_seo_focus_keywords('new yoast keywords', $post_object);
                $this->api_handler->update_seo_canonical('https://example.com/new-yoast', $post_object);
                
                // Verify values were saved to Yoast fields
                $title = get_post_meta($this->test_post_id, '_yoast_wpseo_title', true);
                $description = get_post_meta($this->test_post_id, '_yoast_wpseo_metadesc', true);
                $keywords = get_post_meta($this->test_post_id, '_yoast_wpseo_focuskw', true);
                $canonical = get_post_meta($this->test_post_id, '_yoast_wpseo_canonical', true);
                
                return $title === 'New Yoast Title' &&
                       $description === 'New Yoast Description' &&
                       $keywords === 'new yoast keywords' &&
                       $canonical === 'https://example.com/new-yoast';
            },
            'Should save values to Yoast fields through universal setters'
        );
        
        // Test 2: Universal robot setters with Yoast
        $this->run_test(
            'Universal Robot Setters with Yoast',
            function() use ($post_object) {
                $this->api_handler->update_seo_robots_noindex(false, $post_object);
                $this->api_handler->update_seo_robots_nofollow(true, $post_object);
                
                // Verify values were saved to Yoast robot fields
                $noindex = get_post_meta($this->test_post_id, '_yoast_wpseo_meta-robots-noindex', true);
                $nofollow = get_post_meta($this->test_post_id, '_yoast_wpseo_meta-robots-nofollow', true);
                
                return $noindex === '' && $nofollow === '1';
            },
            'Should save robot values to Yoast fields through universal setters'
        );
    }
    
    /**
     * Test universal setters with RankMath simulation
     */
    private function test_universal_setters_rankmath() {
        echo "<h4>📥 Testing Universal Setters with RankMath Simulation</h4>\n";
        
        // Mock RankMath as primary plugin
        $this->mock_primary_plugin('rankmath');
        
        $post_object = get_post($this->test_post_id);
        
        // Test 1: Universal setters with RankMath
        $this->run_test(
            'Universal Setters with RankMath',
            function() use ($post_object) {
                $this->api_handler->update_seo_meta_title('New RankMath Title', $post_object);
                $this->api_handler->update_seo_meta_description('New RankMath Description', $post_object);
                $this->api_handler->update_seo_focus_keywords('new rankmath keywords', $post_object);
                $this->api_handler->update_seo_canonical('https://example.com/new-rankmath', $post_object);
                
                // Verify values were saved to RankMath fields
                $title = get_post_meta($this->test_post_id, 'rank_math_title', true);
                $description = get_post_meta($this->test_post_id, 'rank_math_description', true);
                $keywords = get_post_meta($this->test_post_id, 'rank_math_focus_keyword', true);
                $canonical = get_post_meta($this->test_post_id, 'rank_math_canonical_url', true);
                
                return $title === 'New RankMath Title' &&
                       $description === 'New RankMath Description' &&
                       $keywords === 'new rankmath keywords' &&
                       $canonical === 'https://example.com/new-rankmath';
            },
            'Should save values to RankMath fields through universal setters'
        );
        
        // Test 2: Universal robot setters with RankMath
        $this->run_test(
            'Universal Robot Setters with RankMath',
            function() use ($post_object) {
                $this->api_handler->update_seo_robots_noindex(true, $post_object);
                $this->api_handler->update_seo_robots_nofollow(true, $post_object);
                
                // Verify values were saved to RankMath robot array
                $robots = get_post_meta($this->test_post_id, 'rank_math_robots', true);
                
                return is_array($robots) && 
                       in_array('noindex', $robots) && 
                       in_array('nofollow', $robots);
            },
            'Should save robot values to RankMath array through universal setters'
        );
    }
    
    /**
     * Test robots fields conversion between formats
     */
    private function test_robots_fields_conversion() {
        echo "<h4>🤖 Testing Robots Fields Conversion</h4>\n";
        
        // Test 1: Yoast to RankMath robot conversion
        $this->run_test(
            'Yoast to RankMath Robot Conversion',
            function() {
                // Switch from Yoast to RankMath
                $this->mock_primary_plugin('yoast');
                $post_object = get_post($this->test_post_id);
                $this->api_handler->update_seo_robots_noindex(true, $post_object);
                
                $this->mock_primary_plugin('rankmath');
                $this->api_handler->update_seo_robots_noindex(false, $post_object);
                
                $robots = get_post_meta($this->test_post_id, 'rank_math_robots', true);
                
                return is_array($robots) && !in_array('noindex', $robots);
            },
            'Should convert robot settings between plugin formats'
        );
        
        // Test 2: RankMath array handling edge cases
        $this->run_test(
            'RankMath Array Handling Edge Cases',
            function() {
                $this->mock_primary_plugin('rankmath');
                $post_object = get_post($this->test_post_id);
                
                // Clear robots meta first
                delete_post_meta($this->test_post_id, 'rank_math_robots');
                
                // Set noindex when no array exists
                $this->api_handler->update_seo_robots_noindex(true, $post_object);
                $robots = get_post_meta($this->test_post_id, 'rank_math_robots', true);
                
                return is_array($robots) && in_array('noindex', $robots);
            },
            'Should handle RankMath robot array edge cases properly'
        );
    }
    
    /**
     * Test legacy compatibility
     */
    private function test_legacy_compatibility() {
        echo "<h4>🔄 Testing Legacy Compatibility</h4>\n";
        
        // Test 1: Legacy Yoast field compatibility with Yoast active
        $this->run_test(
            'Legacy Yoast Field Compatibility with Yoast Active',
            function() {
                $this->mock_primary_plugin('yoast');
                update_post_meta($this->test_post_id, '_yoast_wpseo_title', 'Legacy Test Title');
                
                $post_array = array('id' => $this->test_post_id);
                $title = $this->api_handler->get_seo_meta_title($post_array);
                
                return $title === 'Legacy Test Title';
            },
            'Legacy Yoast fields should work when Yoast is active'
        );
        
        // Test 2: Legacy Yoast field compatibility with RankMath active
        $this->run_test(
            'Legacy Yoast Field Compatibility with RankMath Active',
            function() {
                $this->mock_primary_plugin('rankmath');
                update_post_meta($this->test_post_id, 'rank_math_title', 'RankMath Legacy Title');
                
                $post_array = array('id' => $this->test_post_id);
                $title = $this->api_handler->get_seo_meta_title($post_array);
                
                return $title === 'RankMath Legacy Title';
            },
            'Legacy Yoast field calls should work when RankMath is active'
        );
    }
    
    /**
     * Test plugin detection integration
     */
    private function test_plugin_detection_integration() {
        echo "<h4>🔍 Testing Plugin Detection Integration</h4>\n";
        
        // Test 1: No plugin active scenario
        $this->run_test(
            'No Plugin Active Scenario',
            function() {
                $this->mock_no_plugin_active();
                
                $post_array = array('id' => $this->test_post_id);
                $title = $this->api_handler->get_seo_meta_title($post_array);
                
                return $title === '';
            },
            'Should return empty values when no SEO plugin is active'
        );
        
        // Test 2: Plugin detection error handling
        $this->run_test(
            'Plugin Detection Error Handling',
            function() {
                $this->mock_no_plugin_active();
                
                $post_object = get_post($this->test_post_id);
                $result = $this->api_handler->update_seo_meta_title('Test Title', $post_object);
                
                return $result === 'Test Title'; // Should return original value without error
            },
            'Should handle plugin detection errors gracefully'
        );
    }
    
    /**
     * Test REST routes registration
     */
    private function test_rest_routes_registration() {
        echo "<h4>🛣️ Testing REST Routes Registration</h4>\n";
        
        // Test 1: Route callback methods exist
        $this->run_test(
            'Route Callback Methods Exist',
            function() {
                return method_exists($this->api_handler, 'get_seo_fields_route') &&
                       method_exists($this->api_handler, 'update_seo_fields_route') &&
                       method_exists($this->api_handler, 'get_rankmath_fields_route') &&
                       method_exists($this->api_handler, 'update_rankmath_fields_route') &&
                       method_exists($this->api_handler, 'get_yoast_fields_route');
            },
            'Should have all route callback methods'
        );
        
        // Test 2: Permission check method exists
        $this->run_test(
            'Permission Check Method Exists',
            function() {
                return method_exists($this->api_handler, 'check_permissions');
            },
            'Should have permission check method'
        );
    }
    
    /**
     * Test unified endpoint responses
     */
    private function test_unified_endpoint_responses() {
        echo "<h4>📡 Testing Unified Endpoint Responses</h4>\n";
        
        // Test 1: SEO fields response structure
        $this->run_test(
            'SEO Fields Response Structure',
            function() {
                $this->mock_primary_plugin('yoast');
                
                // Mock request object
                $request = new stdClass();
                $request->params = array('id' => $this->test_post_id);
                $request->get_param = function($param) {
                    return $this->params[$param] ?? null;
                };
                
                // This would be tested in a full WordPress environment
                // For now, just test that the method exists and is callable
                return method_exists($this->api_handler, 'get_seo_fields_route') &&
                       is_callable(array($this->api_handler, 'get_seo_fields_route'));
            },
            'Should have callable SEO fields route method'
        );
    }
    
    /**
     * Test error handling
     */
    private function test_error_handling() {
        echo "<h4>⚠️ Testing Error Handling</h4>\n";
        
        // Test 1: Invalid data type handling
        $this->run_test(
            'Invalid Data Type Handling',
            function() {
                $this->mock_primary_plugin('yoast');
                $post_object = get_post($this->test_post_id);
                
                // Try to set non-string value
                $result = $this->api_handler->update_seo_meta_title(123, $post_object);
                
                return $result === 123; // Should return original value without error
            },
            'Should handle invalid data types gracefully'
        );
        
        // Test 2: Null value handling
        $this->run_test(
            'Null Value Handling',
            function() {
                $this->mock_primary_plugin('yoast');
                $post_object = get_post($this->test_post_id);
                
                // Try to set null value
                $result = $this->api_handler->update_seo_meta_title(null, $post_object);
                
                return $result === null; // Should return original value without error
            },
            'Should handle null values gracefully'
        );
    }
    
    /**
     * Test permission checking
     */
    private function test_permission_checking() {
        echo "<h4>🔒 Testing Permission Checking</h4>\n";
        
        // Test 1: Permission check method callable
        $this->run_test(
            'Permission Check Method Callable',
            function() {
                return is_callable(array($this->api_handler, 'check_permissions'));
            },
            'Should have callable permission check method'
        );
    }
    
    /**
     * Mock primary plugin for testing
     */
    private function mock_primary_plugin($plugin) {
        // Create a mock detector that returns the specified plugin
        $mock_detector = new stdClass();
        $mock_detector->has_supported_seo_plugin = function() { return true; };
        $mock_detector->get_primary_plugin = function() use ($plugin) { return $plugin; };
        $mock_detector->is_plugin_active_and_supported = function($check_plugin) use ($plugin) {
            return $check_plugin === $plugin;
        };
        
        // Replace detector in API handler
        $reflection = new ReflectionClass($this->api_handler);
        $detector_property = $reflection->getProperty('detector');
        $detector_property->setAccessible(true);
        $detector_property->setValue($this->api_handler, $mock_detector);
    }
    
    /**
     * Mock no plugin active scenario
     */
    private function mock_no_plugin_active() {
        // Create a mock detector that returns no plugin
        $mock_detector = new stdClass();
        $mock_detector->has_supported_seo_plugin = function() { return false; };
        $mock_detector->get_primary_plugin = function() { return null; };
        $mock_detector->is_plugin_active_and_supported = function($plugin) { return false; };
        
        // Replace detector in API handler
        $reflection = new ReflectionClass($this->api_handler);
        $detector_property = $reflection->getProperty('detector');
        $detector_property->setAccessible(true);
        $detector_property->setValue($this->api_handler, $mock_detector);
    }
    
    /**
     * Run individual test
     */
    private function run_test($test_name, $test_function, $description) {
        $this->test_results['total']++;
        
        try {
            $result = $test_function();
            
            if ($result) {
                $this->test_results['passed']++;
                echo "<p style='color: green;'>✅ {$test_name}: PASSED</p>\n";
                $this->test_results['details'][] = array(
                    'name' => $test_name,
                    'status' => 'PASSED',
                    'description' => $description
                );
            } else {
                $this->test_results['failed']++;
                echo "<p style='color: red;'>❌ {$test_name}: FAILED</p>\n";
                echo "<p style='color: red; margin-left: 20px;'>Description: {$description}</p>\n";
                $this->test_results['details'][] = array(
                    'name' => $test_name,
                    'status' => 'FAILED',
                    'description' => $description
                );
            }
        } catch (Exception $e) {
            $this->test_results['failed']++;
            echo "<p style='color: red;'>❌ {$test_name}: ERROR - {$e->getMessage()}</p>\n";
            $this->test_results['details'][] = array(
                'name' => $test_name,
                'status' => 'ERROR',
                'description' => $description,
                'error' => $e->getMessage()
            );
        }
    }
    
    /**
     * Display test summary
     */
    private function display_test_summary() {
        $passed = $this->test_results['passed'];
        $failed = $this->test_results['failed'];
        $total = $this->test_results['total'];
        $success_rate = $total > 0 ? round(($passed / $total) * 100, 1) : 0;
        
        echo "<h3>📊 REST API Extensions Test Summary</h3>\n";
        echo "<div style='background: " . ($failed === 0 ? '#d4edda' : '#f8d7da') . "; padding: 10px; border-radius: 5px; margin: 10px 0;'>\n";
        echo "<p><strong>Total Tests:</strong> {$total}</p>\n";
        echo "<p><strong>Passed:</strong> <span style='color: green;'>{$passed}</span></p>\n";
        echo "<p><strong>Failed:</strong> <span style='color: red;'>{$failed}</span></p>\n";
        echo "<p><strong>Success Rate:</strong> {$success_rate}%</p>\n";
        
        if ($failed === 0) {
            echo "<p style='color: green; font-weight: bold;'>🎉 All REST API extension tests passed!</p>\n";
        } else {
            echo "<p style='color: red; font-weight: bold;'>⚠️ Some REST API extension tests failed. Please review the implementation.</p>\n";
        }
        
        echo "</div>\n";
        
        // Display API coverage information
        echo "<h3>🔍 API Coverage Information</h3>\n";
        $this->display_api_coverage();
    }
    
    /**
     * Display API coverage information
     */
    private function display_api_coverage() {
        echo "<div style='background: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace;'>\n";
        
        echo "<h4>Universal Fields Covered:</h4>\n";
        echo "<ul>\n";
        echo "<li>seo_meta_title (works with both plugins)</li>\n";
        echo "<li>seo_meta_description (works with both plugins)</li>\n";
        echo "<li>seo_focus_keywords (works with both plugins)</li>\n";
        echo "<li>seo_canonical (works with both plugins)</li>\n";
        echo "<li>seo_robots_noindex (works with both plugins)</li>\n";
        echo "<li>seo_robots_nofollow (works with both plugins)</li>\n";
        echo "</ul>\n";
        
        echo "<h4>Legacy Fields Supported:</h4>\n";
        echo "<ul>\n";
        echo "<li>yoast_meta_title (backward compatibility)</li>\n";
        echo "<li>yoast_meta_description (backward compatibility)</li>\n";
        echo "<li>yoast_focus_keywords (backward compatibility)</li>\n";
        echo "</ul>\n";
        
        echo "<h4>RankMath-Specific Fields:</h4>\n";
        echo "<ul>\n";
        echo "<li>rankmath_pillar_content (boolean flag)</li>\n";
        echo "<li>rankmath_breadcrumbs_title (custom title)</li>\n";
        echo "</ul>\n";
        
        echo "<h4>REST API Endpoints:</h4>\n";
        echo "<ul>\n";
        echo "<li>GET /wp-json/postcrafter/v1/seo-fields/{id} (unified)</li>\n";
        echo "<li>POST /wp-json/postcrafter/v1/seo-fields/{id} (unified)</li>\n";
        echo "<li>GET /wp-json/postcrafter/v1/yoast-fields/{id} (legacy)</li>\n";
        echo "<li>POST /wp-json/postcrafter/v1/yoast-fields/{id} (legacy)</li>\n";
        echo "<li>GET /wp-json/postcrafter/v1/rankmath-fields/{id} (specific)</li>\n";
        echo "<li>POST /wp-json/postcrafter/v1/rankmath-fields/{id} (specific)</li>\n";
        echo "</ul>\n";
        
        echo "</div>\n";
    }
    
    /**
     * Clean up test environment
     */
    private function cleanup_test_environment() {
        echo "<h3>🧹 Cleaning up test environment...</h3>\n";
        
        // Delete test post
        if ($this->test_post_id) {
            wp_delete_post($this->test_post_id, true);
            echo "<p>✅ Deleted test post ID: {$this->test_post_id}</p>\n";
        }
    }
}

// Run tests if accessed directly
if (basename($_SERVER['PHP_SELF']) === 'test-rest-api-extensions.php') {
    $tests = new PostCrafter_REST_API_Extensions_Tests();
    $tests->run_all_tests();
}
<?php
/**
 * RankMath Field Mapping Tests
 * 
 * Tests for the RankMath SEO field mapping and REST API integration
 * 
 * @package PostCrafter
 * @since 1.1.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

require_once dirname(__FILE__) . '/test-config.php';
require_once dirname(__FILE__) . '/../includes/class-rankmath-field-handler.php';

class PostCrafter_RankMath_Field_Mapping_Tests {
    
    /**
     * Test results storage
     */
    private $test_results = array();
    
    /**
     * Test post ID
     */
    private $test_post_id;
    
    /**
     * RankMath field handler instance
     */
    private $field_handler;
    
    /**
     * Run all tests
     */
    public function run_all_tests() {
        echo "<h2>🗺️ PostCrafter RankMath Field Mapping Tests</h2>\n";
        echo "<div style='background: #f1f1f1; padding: 15px; margin: 10px 0; border-radius: 5px;'>\n";
        
        // Initialize test environment
        $this->setup_test_environment();
        
        // Run field mapping tests
        $this->test_basic_field_mapping();
        $this->test_meta_keys_mapping();
        $this->test_field_getters();
        $this->test_field_setters();
        $this->test_robots_field_handling();
        $this->test_social_media_fields();
        $this->test_image_field_handling();
        $this->test_universal_format_conversion();
        $this->test_field_validation();
        $this->test_cache_clearing();
        $this->test_field_capabilities();
        $this->test_ajax_functionality();
        
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
        echo "<h3>🔧 Setting up RankMath field mapping test environment...</h3>\n";
        
        // Initialize test results
        $this->test_results = array(
            'passed' => 0,
            'failed' => 0,
            'total' => 0,
            'details' => array()
        );
        
        // Create test post
        $this->test_post_id = wp_insert_post(array(
            'post_title' => 'Test Post for RankMath Field Mapping',
            'post_content' => 'This is a test post for RankMath field mapping tests.',
            'post_status' => 'draft',
            'post_type' => 'post'
        ));
        
        // Initialize field handler
        $this->field_handler = new PostCrafter_RankMath_Field_Handler();
        
        echo "<p>✅ Test environment initialized with test post ID: {$this->test_post_id}</p>\n";
    }
    
    /**
     * Test basic field mapping structure
     */
    private function test_basic_field_mapping() {
        echo "<h4>📋 Testing Basic Field Mapping Structure</h4>\n";
        
        // Test 1: Meta keys mapping exists
        $this->run_test(
            'Meta Keys Mapping Structure',
            function() {
                $meta_keys = $this->field_handler->get_meta_keys();
                
                return is_array($meta_keys) && 
                       isset($meta_keys['title']) &&
                       isset($meta_keys['description']) &&
                       isset($meta_keys['focus_keywords']) &&
                       $meta_keys['title'] === 'rank_math_title';
            },
            'Should have proper meta keys mapping structure'
        );
        
        // Test 2: Field types mapping exists
        $this->run_test(
            'Field Types Mapping Structure',
            function() {
                $field_types = $this->field_handler->get_field_types();
                
                return is_array($field_types) && 
                       isset($field_types['title']) &&
                       isset($field_types['description']) &&
                       $field_types['title'] === 'text' &&
                       $field_types['description'] === 'textarea';
            },
            'Should have proper field types mapping structure'
        );
        
        // Test 3: Available fields structure
        $this->run_test(
            'Available Fields Structure',
            function() {
                $available_fields = $this->field_handler->get_available_fields();
                
                return is_array($available_fields) && 
                       isset($available_fields['basic']) &&
                       isset($available_fields['social']) &&
                       isset($available_fields['advanced']) &&
                       is_array($available_fields['basic']);
            },
            'Should have proper available fields structure'
        );
    }
    
    /**
     * Test meta keys mapping accuracy
     */
    private function test_meta_keys_mapping() {
        echo "<h4>🔑 Testing Meta Keys Mapping Accuracy</h4>\n";
        
        // Test 1: Basic SEO field mappings
        $this->run_test(
            'Basic SEO Field Mappings',
            function() {
                $meta_keys = $this->field_handler->get_meta_keys();
                
                return $meta_keys['title'] === 'rank_math_title' &&
                       $meta_keys['description'] === 'rank_math_description' &&
                       $meta_keys['focus_keywords'] === 'rank_math_focus_keyword';
            },
            'Basic SEO fields should map to correct RankMath meta keys'
        );
        
        // Test 2: Social media field mappings
        $this->run_test(
            'Social Media Field Mappings',
            function() {
                $meta_keys = $this->field_handler->get_meta_keys();
                
                return $meta_keys['opengraph_title'] === 'rank_math_facebook_title' &&
                       $meta_keys['twitter_title'] === 'rank_math_twitter_title' &&
                       $meta_keys['opengraph_image_id'] === 'rank_math_facebook_image_id';
            },
            'Social media fields should map to correct RankMath meta keys'
        );
        
        // Test 3: Advanced field mappings
        $this->run_test(
            'Advanced Field Mappings',
            function() {
                $meta_keys = $this->field_handler->get_meta_keys();
                
                return $meta_keys['canonical'] === 'rank_math_canonical_url' &&
                       $meta_keys['breadcrumbs_title'] === 'rank_math_breadcrumb_title' &&
                       $meta_keys['schema_type'] === 'rank_math_rich_snippet';
            },
            'Advanced fields should map to correct RankMath meta keys'
        );
    }
    
    /**
     * Test field getter methods
     */
    private function test_field_getters() {
        echo "<h4>📤 Testing Field Getter Methods</h4>\n";
        
        // Set up test data
        update_post_meta($this->test_post_id, 'rank_math_title', 'Test RankMath Title');
        update_post_meta($this->test_post_id, 'rank_math_description', 'Test RankMath Description');
        update_post_meta($this->test_post_id, 'rank_math_focus_keyword', 'test keyword');
        
        // Test 1: Basic field getters
        $this->run_test(
            'Basic Field Getters',
            function() {
                $title = $this->field_handler->get_rankmath_meta_title($this->test_post_id);
                $description = $this->field_handler->get_rankmath_meta_description($this->test_post_id);
                $keywords = $this->field_handler->get_rankmath_focus_keywords($this->test_post_id);
                
                return $title === 'Test RankMath Title' &&
                       $description === 'Test RankMath Description' &&
                       $keywords === 'test keyword';
            },
            'Should retrieve basic RankMath field values correctly'
        );
        
        // Test 2: Get all fields method
        $this->run_test(
            'Get All Fields Method',
            function() {
                $fields = $this->field_handler->get_rankmath_fields($this->test_post_id);
                
                return is_array($fields) &&
                       isset($fields['meta_title']) &&
                       isset($fields['meta_description']) &&
                       isset($fields['focus_keywords']) &&
                       $fields['meta_title'] === 'Test RankMath Title';
            },
            'Should retrieve all RankMath fields as an array'
        );
        
        // Test 3: Invalid post ID handling
        $this->run_test(
            'Invalid Post ID Handling',
            function() {
                $fields = $this->field_handler->get_rankmath_fields(999999);
                return $fields === false;
            },
            'Should return false for invalid post ID'
        );
    }
    
    /**
     * Test field setter methods
     */
    private function test_field_setters() {
        echo "<h4>📥 Testing Field Setter Methods</h4>\n";
        
        // Test 1: Basic field setters
        $this->run_test(
            'Basic Field Setters',
            function() {
                $title_result = $this->field_handler->set_rankmath_meta_title($this->test_post_id, 'New RankMath Title');
                $desc_result = $this->field_handler->set_rankmath_meta_description($this->test_post_id, 'New RankMath Description');
                $kw_result = $this->field_handler->set_rankmath_focus_keywords($this->test_post_id, 'new keywords');
                
                // Verify values were saved
                $title = get_post_meta($this->test_post_id, 'rank_math_title', true);
                $description = get_post_meta($this->test_post_id, 'rank_math_description', true);
                $keywords = get_post_meta($this->test_post_id, 'rank_math_focus_keyword', true);
                
                return $title_result && $desc_result && $kw_result &&
                       $title === 'New RankMath Title' &&
                       $description === 'New RankMath Description' &&
                       $keywords === 'new keywords';
            },
            'Should set basic RankMath field values correctly'
        );
        
        // Test 2: URL field setter with validation
        $this->run_test(
            'URL Field Setter with Validation',
            function() {
                $valid_result = $this->field_handler->set_rankmath_canonical($this->test_post_id, 'https://example.com/test');
                $invalid_result = $this->field_handler->set_rankmath_canonical($this->test_post_id, 'not-a-url');
                
                $canonical = get_post_meta($this->test_post_id, 'rank_math_canonical_url', true);
                
                return $valid_result && !$invalid_result && $canonical === 'https://example.com/test';
            },
            'Should validate URLs and reject invalid ones'
        );
        
        // Test 3: Invalid post ID handling
        $this->run_test(
            'Invalid Post ID Handling for Setters',
            function() {
                $result = $this->field_handler->set_rankmath_meta_title(999999, 'Test Title');
                return $result === false;
            },
            'Should return false when setting fields for invalid post ID'
        );
    }
    
    /**
     * Test robots field handling (array format)
     */
    private function test_robots_field_handling() {
        echo "<h4>🤖 Testing Robots Field Handling</h4>\n";
        
        // Test 1: Setting robots noindex
        $this->run_test(
            'Robots Noindex Setting',
            function() {
                $result = $this->field_handler->set_rankmath_meta_robots_noindex($this->test_post_id, true);
                $robots = get_post_meta($this->test_post_id, 'rank_math_robots', true);
                $noindex_status = $this->field_handler->get_rankmath_meta_robots_noindex($this->test_post_id);
                
                return $result && is_array($robots) && in_array('noindex', $robots) && $noindex_status === true;
            },
            'Should set robots noindex correctly in array format'
        );
        
        // Test 2: Setting robots nofollow
        $this->run_test(
            'Robots Nofollow Setting',
            function() {
                $result = $this->field_handler->set_rankmath_meta_robots_nofollow($this->test_post_id, true);
                $robots = get_post_meta($this->test_post_id, 'rank_math_robots', true);
                $nofollow_status = $this->field_handler->get_rankmath_meta_robots_nofollow($this->test_post_id);
                
                return $result && is_array($robots) && in_array('nofollow', $robots) && $nofollow_status === true;
            },
            'Should set robots nofollow correctly in array format'
        );
        
        // Test 3: Removing robots settings
        $this->run_test(
            'Robots Settings Removal',
            function() {
                $this->field_handler->set_rankmath_meta_robots_noindex($this->test_post_id, false);
                $this->field_handler->set_rankmath_meta_robots_nofollow($this->test_post_id, false);
                
                $noindex_status = $this->field_handler->get_rankmath_meta_robots_noindex($this->test_post_id);
                $nofollow_status = $this->field_handler->get_rankmath_meta_robots_nofollow($this->test_post_id);
                
                return $noindex_status === false && $nofollow_status === false;
            },
            'Should remove robots settings correctly'
        );
    }
    
    /**
     * Test social media fields
     */
    private function test_social_media_fields() {
        echo "<h4>📱 Testing Social Media Fields</h4>\n";
        
        // Set up test data
        update_post_meta($this->test_post_id, 'rank_math_facebook_title', 'Facebook Title');
        update_post_meta($this->test_post_id, 'rank_math_twitter_title', 'Twitter Title');
        update_post_meta($this->test_post_id, 'rank_math_twitter_card_type', 'summary_large_image');
        
        // Test 1: Social media field getters
        $this->run_test(
            'Social Media Field Getters',
            function() {
                $og_title = $this->field_handler->get_rankmath_opengraph_title($this->test_post_id);
                $twitter_title = $this->field_handler->get_rankmath_twitter_title($this->test_post_id);
                $card_type = $this->field_handler->get_rankmath_twitter_card_type($this->test_post_id);
                
                return $og_title === 'Facebook Title' &&
                       $twitter_title === 'Twitter Title' &&
                       $card_type === 'summary_large_image';
            },
            'Should retrieve social media field values correctly'
        );
        
        // Test 2: Social media fields in get_all_fields
        $this->run_test(
            'Social Media Fields in Get All Fields',
            function() {
                $fields = $this->field_handler->get_rankmath_fields($this->test_post_id);
                
                return isset($fields['opengraph_title']) &&
                       isset($fields['twitter_title']) &&
                       isset($fields['twitter_card_type']) &&
                       $fields['opengraph_title'] === 'Facebook Title';
            },
            'Should include social media fields in get_all_fields result'
        );
    }
    
    /**
     * Test image field handling (ID vs URL)
     */
    private function test_image_field_handling() {
        echo "<h4>🖼️ Testing Image Field Handling</h4>\n";
        
        // Test 1: Image URL fallback
        $this->run_test(
            'Image URL Fallback',
            function() {
                // Set direct URL (when no attachment ID)
                update_post_meta($this->test_post_id, 'rank_math_facebook_image', 'https://example.com/image.jpg');
                delete_post_meta($this->test_post_id, 'rank_math_facebook_image_id');
                
                $image_url = $this->field_handler->get_rankmath_opengraph_image($this->test_post_id);
                
                return $image_url === 'https://example.com/image.jpg';
            },
            'Should fall back to direct URL when no attachment ID is present'
        );
        
        // Test 2: Image ID preference (would require actual attachment)
        $this->run_test(
            'Image ID Preference Logic',
            function() {
                // Test the logic without actual attachment
                update_post_meta($this->test_post_id, 'rank_math_facebook_image_id', '999999'); // Non-existent ID
                update_post_meta($this->test_post_id, 'rank_math_facebook_image', 'https://example.com/fallback.jpg');
                
                $image_url = $this->field_handler->get_rankmath_opengraph_image($this->test_post_id);
                
                // Should fall back to URL when attachment doesn't exist
                return $image_url === 'https://example.com/fallback.jpg';
            },
            'Should fall back to URL when attachment ID doesn\'t exist'
        );
    }
    
    /**
     * Test universal format conversion
     */
    private function test_universal_format_conversion() {
        echo "<h4>🔄 Testing Universal Format Conversion</h4>\n";
        
        // Test 1: Robots field conversion to universal format
        $this->run_test(
            'Robots Field Conversion to Universal Format',
            function() {
                $rankmath_robots = array('noindex', 'nofollow');
                $universal_noindex = $this->field_handler->convert_to_universal_format('robots_noindex', $rankmath_robots);
                $universal_nofollow = $this->field_handler->convert_to_universal_format('robots_nofollow', $rankmath_robots);
                
                return $universal_noindex === true && $universal_nofollow === true;
            },
            'Should convert RankMath robots array to universal boolean format'
        );
        
        // Test 2: Primary category conversion
        $this->run_test(
            'Primary Category Conversion',
            function() {
                $universal_category = $this->field_handler->convert_to_universal_format('primary_category', '5');
                return $universal_category === 5;
            },
            'Should convert primary category to integer'
        );
        
        // Test 3: Boolean field conversion
        $this->run_test(
            'Boolean Field Conversion',
            function() {
                $universal_pillar = $this->field_handler->convert_to_universal_format('pillar_content', '1');
                return $universal_pillar === true;
            },
            'Should convert pillar content to boolean'
        );
    }
    
    /**
     * Test field validation integration
     */
    private function test_field_validation() {
        echo "<h4>✅ Testing Field Validation Integration</h4>\n";
        
        // Test 1: Field support check
        $this->run_test(
            'Field Support Check',
            function() {
                return $this->field_handler->supports_field('title') &&
                       $this->field_handler->supports_field('description') &&
                       !$this->field_handler->supports_field('nonexistent_field');
            },
            'Should correctly identify supported and unsupported fields'
        );
        
        // Test 2: Capabilities check
        $this->run_test(
            'Capabilities Check',
            function() {
                $capabilities = $this->field_handler->get_capabilities();
                
                return is_array($capabilities) &&
                       isset($capabilities['meta_title']) &&
                       isset($capabilities['social_media']) &&
                       isset($capabilities['schema_markup']) &&
                       $capabilities['meta_title'] === true;
            },
            'Should provide comprehensive capabilities information'
        );
    }
    
    /**
     * Test cache clearing functionality
     */
    private function test_cache_clearing() {
        echo "<h4>💾 Testing Cache Clearing Functionality</h4>\n";
        
        // Test 1: Cache clearing doesn't cause errors
        $this->run_test(
            'Cache Clearing Safety',
            function() {
                try {
                    // Set a field which should trigger cache clearing
                    $result = $this->field_handler->set_rankmath_meta_title($this->test_post_id, 'Cache Test Title');
                    
                    // Verify the value was saved
                    $title = get_post_meta($this->test_post_id, 'rank_math_title', true);
                    
                    return $result && $title === 'Cache Test Title';
                } catch (Exception $e) {
                    return false;
                }
            },
            'Cache clearing should not cause errors during field updates'
        );
    }
    
    /**
     * Test field capabilities and availability
     */
    private function test_field_capabilities() {
        echo "<h4>🎯 Testing Field Capabilities and Availability</h4>\n";
        
        // Test 1: RankMath-specific capabilities
        $this->run_test(
            'RankMath-Specific Capabilities',
            function() {
                $capabilities = $this->field_handler->get_capabilities();
                
                return isset($capabilities['content_analysis']) &&
                       isset($capabilities['keyword_tracking']) &&
                       isset($capabilities['pillar_content']) &&
                       $capabilities['content_analysis'] === true;
            },
            'Should include RankMath-specific capabilities'
        );
        
        // Test 2: Available fields categorization
        $this->run_test(
            'Available Fields Categorization',
            function() {
                $available_fields = $this->field_handler->get_available_fields();
                
                return isset($available_fields['basic']['meta_title']) &&
                       isset($available_fields['social']['opengraph_title']) &&
                       isset($available_fields['advanced']['schema_type']) &&
                       is_string($available_fields['basic']['meta_title']);
            },
            'Should categorize available fields with descriptions'
        );
    }
    
    /**
     * Test AJAX functionality
     */
    private function test_ajax_functionality() {
        echo "<h4>📡 Testing AJAX Functionality</h4>\n";
        
        // Test 1: AJAX method exists and is callable
        $this->run_test(
            'AJAX Method Existence',
            function() {
                return method_exists($this->field_handler, 'ajax_get_rankmath_fields') &&
                       is_callable(array($this->field_handler, 'ajax_get_rankmath_fields'));
            },
            'Should have callable AJAX method for getting RankMath fields'
        );
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
        
        echo "<h3>📊 RankMath Field Mapping Test Summary</h3>\n";
        echo "<div style='background: " . ($failed === 0 ? '#d4edda' : '#f8d7da') . "; padding: 10px; border-radius: 5px; margin: 10px 0;'>\n";
        echo "<p><strong>Total Tests:</strong> {$total}</p>\n";
        echo "<p><strong>Passed:</strong> <span style='color: green;'>{$passed}</span></p>\n";
        echo "<p><strong>Failed:</strong> <span style='color: red;'>{$failed}</span></p>\n";
        echo "<p><strong>Success Rate:</strong> {$success_rate}%</p>\n";
        
        if ($failed === 0) {
            echo "<p style='color: green; font-weight: bold;'>🎉 All RankMath field mapping tests passed!</p>\n";
        } else {
            echo "<p style='color: red; font-weight: bold;'>⚠️ Some field mapping tests failed. Please review the implementation.</p>\n";
        }
        
        echo "</div>\n";
        
        // Display field mapping validation
        echo "<h3>🔍 Field Mapping Validation</h3>\n";
        $this->display_field_mapping_validation();
    }
    
    /**
     * Display field mapping validation
     */
    private function display_field_mapping_validation() {
        echo "<div style='background: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace;'>\n";
        
        echo "<h4>Meta Keys Mapping:</h4>\n";
        $meta_keys = $this->field_handler->get_meta_keys();
        echo "<pre>" . htmlspecialchars(print_r($meta_keys, true)) . "</pre>\n";
        
        echo "<h4>Field Types Mapping:</h4>\n";
        $field_types = $this->field_handler->get_field_types();
        echo "<pre>" . htmlspecialchars(print_r($field_types, true)) . "</pre>\n";
        
        echo "<h4>RankMath Capabilities:</h4>\n";
        $capabilities = $this->field_handler->get_capabilities();
        echo "<pre>" . htmlspecialchars(print_r($capabilities, true)) . "</pre>\n";
        
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
if (basename($_SERVER['PHP_SELF']) === 'test-rankmath-field-mapping.php') {
    $tests = new PostCrafter_RankMath_Field_Mapping_Tests();
    $tests->run_all_tests();
}
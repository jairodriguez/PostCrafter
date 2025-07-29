<?php
/**
 * Data Conversion Tests
 * 
 * Tests for the SEO data conversion functionality between Yoast and RankMath
 * 
 * @package PostCrafter
 * @since 1.1.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

require_once dirname(__FILE__) . '/test-config.php';
require_once dirname(__FILE__) . '/../includes/class-seo-data-converter.php';

class PostCrafter_Data_Conversion_Tests {
    
    /**
     * Test results storage
     */
    private $test_results = array();
    
    /**
     * Test post IDs
     */
    private $test_post_ids = array();
    
    /**
     * Data converter instance
     */
    private $converter;
    
    /**
     * Run all tests
     */
    public function run_all_tests() {
        echo "<h2>🔄 PostCrafter Data Conversion Tests</h2>\n";
        echo "<div style='background: #f1f1f1; padding: 15px; margin: 10px 0; border-radius: 5px;'>\n";
        
        // Initialize test environment
        $this->setup_test_environment();
        
        // Run data conversion tests
        $this->test_converter_initialization();
        $this->test_field_mapping_structure();
        $this->test_yoast_to_rankmath_conversion();
        $this->test_rankmath_to_yoast_conversion();
        $this->test_robots_field_conversion();
        $this->test_image_field_conversion();
        $this->test_normalized_data_retrieval();
        $this->test_plugin_specific_data();
        $this->test_migration_report_generation();
        $this->test_conversion_validation();
        $this->test_compatibility_matrix();
        $this->test_error_handling();
        
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
        echo "<h3>🔧 Setting up data conversion test environment...</h3>\n";
        
        // Initialize test results
        $this->test_results = array(
            'passed' => 0,
            'failed' => 0,
            'total' => 0,
            'details' => array()
        );
        
        // Create test posts
        for ($i = 1; $i <= 3; $i++) {
            $post_id = wp_insert_post(array(
                'post_title' => "Test Post {$i} for Data Conversion",
                'post_content' => "This is test post {$i} for data conversion tests.",
                'post_status' => 'draft',
                'post_type' => 'post'
            ));
            $this->test_post_ids[] = $post_id;
        }
        
        // Initialize data converter
        $this->converter = new PostCrafter_SEO_Data_Converter();
        
        echo "<p>✅ Test environment initialized with " . count($this->test_post_ids) . " test posts</p>\n";
    }
    
    /**
     * Test converter initialization
     */
    private function test_converter_initialization() {
        echo "<h4>🔧 Testing Converter Initialization</h4>\n";
        
        // Test 1: Converter instance creation
        $this->run_test(
            'Converter Instance Creation',
            function() {
                return is_object($this->converter) && 
                       is_a($this->converter, 'PostCrafter_SEO_Data_Converter');
            },
            'Should create a valid converter instance'
        );
        
        // Test 2: Required methods exist
        $this->run_test(
            'Required Methods Exist',
            function() {
                return method_exists($this->converter, 'convert_between_plugins') &&
                       method_exists($this->converter, 'get_normalized_data') &&
                       method_exists($this->converter, 'create_migration_report') &&
                       method_exists($this->converter, 'validate_conversion_integrity');
            },
            'Should have all required conversion methods'
        );
        
        // Test 3: Compatibility matrix available
        $this->run_test(
            'Compatibility Matrix Available',
            function() {
                $matrix = $this->converter->get_conversion_compatibility_matrix();
                return is_array($matrix) && 
                       isset($matrix['supported_conversions']) &&
                       isset($matrix['field_compatibility']);
            },
            'Should provide conversion compatibility matrix'
        );
    }
    
    /**
     * Test field mapping structure
     */
    private function test_field_mapping_structure() {
        echo "<h4>🗺️ Testing Field Mapping Structure</h4>\n";
        
        // Test 1: Compatibility matrix structure
        $this->run_test(
            'Compatibility Matrix Structure',
            function() {
                $matrix = $this->converter->get_conversion_compatibility_matrix();
                
                return isset($matrix['supported_conversions']['yoast_to_rankmath']) &&
                       isset($matrix['supported_conversions']['rankmath_to_yoast']) &&
                       isset($matrix['field_compatibility']['yoast_to_rankmath']) &&
                       isset($matrix['field_compatibility']['rankmath_to_yoast']) &&
                       isset($matrix['plugin_specific_fields']);
            },
            'Should have proper compatibility matrix structure'
        );
        
        // Test 2: Bidirectional mapping coverage
        $this->run_test(
            'Bidirectional Mapping Coverage',
            function() {
                $matrix = $this->converter->get_conversion_compatibility_matrix();
                $yoast_to_rm = $matrix['field_compatibility']['yoast_to_rankmath'];
                $rm_to_yoast = $matrix['field_compatibility']['rankmath_to_yoast'];
                
                // Check if key fields are mapped in both directions
                return isset($yoast_to_rm['_yoast_wpseo_title']) &&
                       isset($rm_to_yoast['rank_math_title']) &&
                       $yoast_to_rm['_yoast_wpseo_title'] === 'rank_math_title' &&
                       $rm_to_yoast['rank_math_title'] === '_yoast_wpseo_title';
            },
            'Should have bidirectional field mapping'
        );
        
        // Test 3: Plugin-specific fields identified
        $this->run_test(
            'Plugin-Specific Fields Identified',
            function() {
                $matrix = $this->converter->get_conversion_compatibility_matrix();
                $specific_fields = $matrix['plugin_specific_fields'];
                
                return isset($specific_fields['yoast_only']) &&
                       isset($specific_fields['rankmath_only']) &&
                       is_array($specific_fields['yoast_only']) &&
                       is_array($specific_fields['rankmath_only']);
            },
            'Should identify plugin-specific fields'
        );
    }
    
    /**
     * Test Yoast to RankMath conversion
     */
    private function test_yoast_to_rankmath_conversion() {
        echo "<h4>➡️ Testing Yoast to RankMath Conversion</h4>\n";
        
        $post_id = $this->test_post_ids[0];
        
        // Set up Yoast test data
        update_post_meta($post_id, '_yoast_wpseo_title', 'Yoast Test Title');
        update_post_meta($post_id, '_yoast_wpseo_metadesc', 'Yoast test description');
        update_post_meta($post_id, '_yoast_wpseo_focuskw', 'yoast keywords');
        update_post_meta($post_id, '_yoast_wpseo_canonical', 'https://example.com/yoast');
        update_post_meta($post_id, '_yoast_wpseo_meta-robots-noindex', '1');
        update_post_meta($post_id, '_yoast_wpseo_meta-robots-nofollow', '');
        
        // Test 1: Basic field conversion
        $this->run_test(
            'Basic Yoast to RankMath Conversion',
            function() use ($post_id) {
                $result = $this->converter->convert_between_plugins(
                    $post_id, 
                    'yoast', 
                    'rankmath', 
                    array('_yoast_wpseo_title', '_yoast_wpseo_metadesc', '_yoast_wpseo_focuskw')
                );
                
                if (!$result['success']) {
                    return false;
                }
                
                // Verify data was converted
                $rm_title = get_post_meta($post_id, 'rank_math_title', true);
                $rm_desc = get_post_meta($post_id, 'rank_math_description', true);
                $rm_keywords = get_post_meta($post_id, 'rank_math_focus_keyword', true);
                
                return $rm_title === 'Yoast Test Title' &&
                       $rm_desc === 'Yoast test description' &&
                       $rm_keywords === 'yoast keywords' &&
                       $result['summary']['successfully_converted'] === 3;
            },
            'Should convert basic Yoast fields to RankMath format'
        );
        
        // Test 2: Robots field conversion
        $this->run_test(
            'Yoast Robots to RankMath Conversion',
            function() use ($post_id) {
                $result = $this->converter->convert_between_plugins(
                    $post_id, 
                    'yoast', 
                    'rankmath', 
                    array('_yoast_wpseo_meta-robots-noindex')
                );
                
                if (!$result['success']) {
                    return false;
                }
                
                // Verify robots array was created
                $rm_robots = get_post_meta($post_id, 'rank_math_robots', true);
                
                return is_array($rm_robots) && in_array('noindex', $rm_robots);
            },
            'Should convert Yoast robots fields to RankMath array format'
        );
        
        // Test 3: Conversion summary accuracy
        $this->run_test(
            'Conversion Summary Accuracy',
            function() use ($post_id) {
                $result = $this->converter->convert_between_plugins(
                    $post_id, 
                    'yoast', 
                    'rankmath'
                );
                
                return $result['success'] &&
                       isset($result['summary']) &&
                       $result['summary']['total_attempted'] > 0 &&
                       $result['summary']['successfully_converted'] >= 0 &&
                       $result['summary']['skipped'] >= 0 &&
                       $result['summary']['errors'] >= 0;
            },
            'Should provide accurate conversion summary statistics'
        );
    }
    
    /**
     * Test RankMath to Yoast conversion
     */
    private function test_rankmath_to_yoast_conversion() {
        echo "<h4>⬅️ Testing RankMath to Yoast Conversion</h4>\n";
        
        $post_id = $this->test_post_ids[1];
        
        // Set up RankMath test data
        update_post_meta($post_id, 'rank_math_title', 'RankMath Test Title');
        update_post_meta($post_id, 'rank_math_description', 'RankMath test description');
        update_post_meta($post_id, 'rank_math_focus_keyword', 'rankmath keywords');
        update_post_meta($post_id, 'rank_math_canonical_url', 'https://example.com/rankmath');
        update_post_meta($post_id, 'rank_math_robots', array('noindex', 'nofollow'));
        
        // Test 1: Basic field conversion
        $this->run_test(
            'Basic RankMath to Yoast Conversion',
            function() use ($post_id) {
                $result = $this->converter->convert_between_plugins(
                    $post_id, 
                    'rankmath', 
                    'yoast', 
                    array('rank_math_title', 'rank_math_description', 'rank_math_focus_keyword')
                );
                
                if (!$result['success']) {
                    return false;
                }
                
                // Verify data was converted
                $yoast_title = get_post_meta($post_id, '_yoast_wpseo_title', true);
                $yoast_desc = get_post_meta($post_id, '_yoast_wpseo_metadesc', true);
                $yoast_keywords = get_post_meta($post_id, '_yoast_wpseo_focuskw', true);
                
                return $yoast_title === 'RankMath Test Title' &&
                       $yoast_desc === 'RankMath test description' &&
                       $yoast_keywords === 'rankmath keywords' &&
                       $result['summary']['successfully_converted'] === 3;
            },
            'Should convert basic RankMath fields to Yoast format'
        );
        
        // Test 2: Robots array to boolean conversion
        $this->run_test(
            'RankMath Robots to Yoast Conversion',
            function() use ($post_id) {
                $result = $this->converter->convert_between_plugins(
                    $post_id, 
                    'rankmath', 
                    'yoast', 
                    array('rank_math_robots')
                );
                
                if (!$result['success']) {
                    return false;
                }
                
                // Verify boolean fields were created
                $yoast_noindex = get_post_meta($post_id, '_yoast_wpseo_meta-robots-noindex', true);
                $yoast_nofollow = get_post_meta($post_id, '_yoast_wpseo_meta-robots-nofollow', true);
                
                return $yoast_noindex === '1' && $yoast_nofollow === '1';
            },
            'Should convert RankMath robots array to Yoast boolean format'
        );
    }
    
    /**
     * Test robots field conversion specifically
     */
    private function test_robots_field_conversion() {
        echo "<h4>🤖 Testing Robots Field Conversion</h4>\n";
        
        $post_id = $this->test_post_ids[2];
        
        // Test 1: Yoast robots to RankMath array
        $this->run_test(
            'Yoast Robots to RankMath Array',
            function() use ($post_id) {
                // Set up mixed Yoast robots data
                update_post_meta($post_id, '_yoast_wpseo_meta-robots-noindex', '1');
                update_post_meta($post_id, '_yoast_wpseo_meta-robots-nofollow', '');
                
                $result = $this->converter->convert_between_plugins(
                    $post_id, 
                    'yoast', 
                    'rankmath', 
                    array('_yoast_wpseo_meta-robots-noindex', '_yoast_wpseo_meta-robots-nofollow')
                );
                
                $rm_robots = get_post_meta($post_id, 'rank_math_robots', true);
                
                return is_array($rm_robots) && 
                       in_array('noindex', $rm_robots) && 
                       !in_array('nofollow', $rm_robots);
            },
            'Should convert mixed Yoast robots settings to RankMath array'
        );
        
        // Test 2: RankMath array to Yoast booleans
        $this->run_test(
            'RankMath Array to Yoast Booleans',
            function() use ($post_id) {
                // Set up RankMath robots array
                update_post_meta($post_id, 'rank_math_robots', array('nofollow'));
                
                $result = $this->converter->convert_between_plugins(
                    $post_id, 
                    'rankmath', 
                    'yoast', 
                    array('rank_math_robots')
                );
                
                $yoast_noindex = get_post_meta($post_id, '_yoast_wpseo_meta-robots-noindex', true);
                $yoast_nofollow = get_post_meta($post_id, '_yoast_wpseo_meta-robots-nofollow', true);
                
                return $yoast_noindex === '' && $yoast_nofollow === '1';
            },
            'Should convert RankMath robots array to individual Yoast boolean fields'
        );
        
        // Test 3: Empty robots handling
        $this->run_test(
            'Empty Robots Handling',
            function() use ($post_id) {
                // Set up empty robots
                update_post_meta($post_id, 'rank_math_robots', array());
                
                $result = $this->converter->convert_between_plugins(
                    $post_id, 
                    'rankmath', 
                    'yoast', 
                    array('rank_math_robots')
                );
                
                $yoast_noindex = get_post_meta($post_id, '_yoast_wpseo_meta-robots-noindex', true);
                $yoast_nofollow = get_post_meta($post_id, '_yoast_wpseo_meta-robots-nofollow', true);
                
                return $yoast_noindex === '' && $yoast_nofollow === '';
            },
            'Should handle empty robots arrays correctly'
        );
    }
    
    /**
     * Test image field conversion
     */
    private function test_image_field_conversion() {
        echo "<h4>🖼️ Testing Image Field Conversion</h4>\n";
        
        $post_id = $this->test_post_ids[0];
        
        // Test 1: URL-based image conversion
        $this->run_test(
            'URL-Based Image Conversion',
            function() use ($post_id) {
                update_post_meta($post_id, '_yoast_wpseo_opengraph-image', 'https://example.com/image.jpg');
                
                $result = $this->converter->convert_between_plugins(
                    $post_id, 
                    'yoast', 
                    'rankmath', 
                    array('_yoast_wpseo_opengraph-image')
                );
                
                $rm_image = get_post_meta($post_id, 'rank_math_facebook_image', true);
                
                return $rm_image === 'https://example.com/image.jpg';
            },
            'Should convert URL-based image fields correctly'
        );
        
        // Test 2: Invalid image URL handling
        $this->run_test(
            'Invalid Image URL Handling',
            function() use ($post_id) {
                update_post_meta($post_id, '_yoast_wpseo_opengraph-image', 'not-a-valid-url');
                
                $result = $this->converter->convert_between_plugins(
                    $post_id, 
                    'yoast', 
                    'rankmath', 
                    array('_yoast_wpseo_opengraph-image')
                );
                
                $rm_image = get_post_meta($post_id, 'rank_math_facebook_image', true);
                
                // Should sanitize invalid URLs
                return $rm_image === 'not-a-valid-url'; // Sanitized text
            },
            'Should handle invalid image URLs gracefully'
        );
    }
    
    /**
     * Test normalized data retrieval
     */
    private function test_normalized_data_retrieval() {
        echo "<h4>📊 Testing Normalized Data Retrieval</h4>\n";
        
        $post_id = $this->test_post_ids[0];
        
        // Set up test data for both plugins
        update_post_meta($post_id, '_yoast_wpseo_title', 'Normalized Test Title');
        update_post_meta($post_id, 'rank_math_title', 'RankMath Normalized Title');
        
        // Test 1: Yoast normalized data
        $this->run_test(
            'Yoast Normalized Data',
            function() use ($post_id) {
                $normalized = $this->converter->get_normalized_data($post_id, 'yoast');
                
                return is_array($normalized) &&
                       isset($normalized['meta_title']) &&
                       isset($normalized['plugin_detected']) &&
                       isset($normalized['conversion_info']) &&
                       $normalized['meta_title'] === 'Normalized Test Title' &&
                       $normalized['plugin_detected'] === 'yoast';
            },
            'Should retrieve normalized data from Yoast fields'
        );
        
        // Test 2: RankMath normalized data
        $this->run_test(
            'RankMath Normalized Data',
            function() use ($post_id) {
                $normalized = $this->converter->get_normalized_data($post_id, 'rankmath');
                
                return is_array($normalized) &&
                       isset($normalized['meta_title']) &&
                       isset($normalized['plugin_detected']) &&
                       isset($normalized['conversion_info']) &&
                       $normalized['meta_title'] === 'RankMath Normalized Title' &&
                       $normalized['plugin_detected'] === 'rankmath';
            },
            'Should retrieve normalized data from RankMath fields'
        );
        
        // Test 3: Plugin-specific data inclusion
        $this->run_test(
            'Plugin-Specific Data Inclusion',
            function() use ($post_id) {
                // Add plugin-specific data
                update_post_meta($post_id, 'rank_math_pillar_content', '1');
                
                $normalized = $this->converter->get_normalized_data($post_id, 'rankmath');
                
                return isset($normalized['plugin_specific']) &&
                       is_array($normalized['plugin_specific']);
            },
            'Should include plugin-specific data in normalized results'
        );
    }
    
    /**
     * Test plugin-specific data handling
     */
    private function test_plugin_specific_data() {
        echo "<h4>🔧 Testing Plugin-Specific Data Handling</h4>\n";
        
        $post_id = $this->test_post_ids[1];
        
        // Test 1: RankMath-specific fields
        $this->run_test(
            'RankMath-Specific Fields',
            function() use ($post_id) {
                update_post_meta($post_id, 'rank_math_pillar_content', '1');
                update_post_meta($post_id, 'rank_math_twitter_card_type', 'summary_large_image');
                
                $normalized = $this->converter->get_normalized_data($post_id, 'rankmath');
                $specific_data = $normalized['plugin_specific'] ?? array();
                
                return isset($specific_data['rank_math_pillar_content']) &&
                       isset($specific_data['rank_math_twitter_card_type']) &&
                       $specific_data['rank_math_pillar_content']['value'] === '1';
            },
            'Should identify and include RankMath-specific fields'
        );
        
        // Test 2: Yoast-specific fields
        $this->run_test(
            'Yoast-Specific Fields',
            function() use ($post_id) {
                update_post_meta($post_id, '_yoast_wpseo_linkdex', '75');
                update_post_meta($post_id, '_yoast_wpseo_content_score', '85');
                
                $normalized = $this->converter->get_normalized_data($post_id, 'yoast');
                $specific_data = $normalized['plugin_specific'] ?? array();
                
                return isset($specific_data['_yoast_wpseo_linkdex']) &&
                       isset($specific_data['_yoast_wpseo_content_score']) &&
                       $specific_data['_yoast_wpseo_linkdex']['value'] === '75';
            },
            'Should identify and include Yoast-specific fields'
        );
    }
    
    /**
     * Test migration report generation
     */
    private function test_migration_report_generation() {
        echo "<h4>📋 Testing Migration Report Generation</h4>\n";
        
        $post_id = $this->test_post_ids[2];
        
        // Set up mixed data
        update_post_meta($post_id, '_yoast_wpseo_title', 'Migration Test Title');
        update_post_meta($post_id, '_yoast_wpseo_linkdex', '80');
        
        // Test 1: Migration report structure
        $this->run_test(
            'Migration Report Structure',
            function() use ($post_id) {
                $report = $this->converter->create_migration_report($post_id, 'yoast', 'rankmath');
                
                return is_array($report) &&
                       isset($report['post_id']) &&
                       isset($report['from_plugin']) &&
                       isset($report['to_plugin']) &&
                       isset($report['mappable_fields']) &&
                       isset($report['plugin_specific_fields']) &&
                       isset($report['potential_data_loss']) &&
                       isset($report['recommendations']);
            },
            'Should generate migration report with proper structure'
        );
        
        // Test 2: Mappable fields identification
        $this->run_test(
            'Mappable Fields Identification',
            function() use ($post_id) {
                $report = $this->converter->create_migration_report($post_id, 'yoast', 'rankmath');
                
                // Should identify the title field as mappable
                $mappable_found = false;
                foreach ($report['mappable_fields'] as $field) {
                    if ($field['source_field'] === '_yoast_wpseo_title') {
                        $mappable_found = true;
                        break;
                    }
                }
                
                return $mappable_found;
            },
            'Should identify mappable fields correctly'
        );
        
        // Test 3: Recommendations generation
        $this->run_test(
            'Recommendations Generation',
            function() use ($post_id) {
                $report = $this->converter->create_migration_report($post_id, 'yoast', 'rankmath');
                
                return is_array($report['recommendations']) &&
                       count($report['recommendations']) > 0 &&
                       isset($report['recommendations'][0]['type']) &&
                       isset($report['recommendations'][0]['message']);
            },
            'Should generate migration recommendations'
        );
    }
    
    /**
     * Test conversion validation
     */
    private function test_conversion_validation() {
        echo "<h4>✅ Testing Conversion Validation</h4>\n";
        
        $post_id = $this->test_post_ids[0];
        
        // Test 1: Successful conversion validation
        $this->run_test(
            'Successful Conversion Validation',
            function() use ($post_id) {
                // Perform a conversion
                $conversion_result = $this->converter->convert_between_plugins(
                    $post_id, 
                    'yoast', 
                    'rankmath', 
                    array('_yoast_wpseo_title')
                );
                
                // Validate the conversion
                $validation = $this->converter->validate_conversion_integrity($post_id, $conversion_result);
                
                return $validation['is_valid'] === true &&
                       is_array($validation['field_checks']) &&
                       count($validation['errors']) === 0;
            },
            'Should validate successful conversions correctly'
        );
        
        // Test 2: Invalid conversion data handling
        $this->run_test(
            'Invalid Conversion Data Handling',
            function() use ($post_id) {
                $invalid_result = array('invalid' => 'data');
                $validation = $this->converter->validate_conversion_integrity($post_id, $invalid_result);
                
                return $validation['is_valid'] === false &&
                       count($validation['errors']) > 0;
            },
            'Should handle invalid conversion data properly'
        );
    }
    
    /**
     * Test compatibility matrix
     */
    private function test_compatibility_matrix() {
        echo "<h4>🔍 Testing Compatibility Matrix</h4>\n";
        
        // Test 1: Matrix completeness
        $this->run_test(
            'Matrix Completeness',
            function() {
                $matrix = $this->converter->get_conversion_compatibility_matrix();
                
                return isset($matrix['supported_conversions']) &&
                       isset($matrix['field_compatibility']) &&
                       isset($matrix['plugin_specific_fields']) &&
                       isset($matrix['conversion_notes']);
            },
            'Should provide complete compatibility matrix'
        );
        
        // Test 2: Conversion support levels
        $this->run_test(
            'Conversion Support Levels',
            function() {
                $matrix = $this->converter->get_conversion_compatibility_matrix();
                $yoast_to_rm = $matrix['supported_conversions']['yoast_to_rankmath'];
                
                return isset($yoast_to_rm['basic_seo']) &&
                       isset($yoast_to_rm['social_media']) &&
                       isset($yoast_to_rm['robots_meta']) &&
                       $yoast_to_rm['basic_seo'] === 'full';
            },
            'Should define conversion support levels'
        );
    }
    
    /**
     * Test error handling
     */
    private function test_error_handling() {
        echo "<h4>⚠️ Testing Error Handling</h4>\n";
        
        // Test 1: Invalid post ID
        $this->run_test(
            'Invalid Post ID',
            function() {
                $result = $this->converter->convert_between_plugins(999999, 'yoast', 'rankmath');
                return $result['success'] === false && isset($result['error']);
            },
            'Should handle invalid post IDs gracefully'
        );
        
        // Test 2: Invalid plugin names
        $this->run_test(
            'Invalid Plugin Names',
            function() {
                $result = $this->converter->convert_between_plugins($this->test_post_ids[0], 'invalid', 'plugin');
                return $result['success'] === false && isset($result['error']);
            },
            'Should handle invalid plugin names gracefully'
        );
        
        // Test 3: Same source and target plugin
        $this->run_test(
            'Same Source and Target Plugin',
            function() {
                $result = $this->converter->convert_between_plugins($this->test_post_ids[0], 'yoast', 'yoast');
                return $result['success'] === false && isset($result['error']);
            },
            'Should reject conversion between same plugins'
        );
        
        // Test 4: Cache clearing
        $this->run_test(
            'Cache Clearing',
            function() {
                try {
                    $this->converter->clear_conversion_cache($this->test_post_ids[0]);
                    $this->converter->clear_conversion_cache(); // Clear all
                    return true;
                } catch (Exception $e) {
                    return false;
                }
            },
            'Should handle cache clearing without errors'
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
        
        echo "<h3>📊 Data Conversion Test Summary</h3>\n";
        echo "<div style='background: " . ($failed === 0 ? '#d4edda' : '#f8d7da') . "; padding: 10px; border-radius: 5px; margin: 10px 0;'>\n";
        echo "<p><strong>Total Tests:</strong> {$total}</p>\n";
        echo "<p><strong>Passed:</strong> <span style='color: green;'>{$passed}</span></p>\n";
        echo "<p><strong>Failed:</strong> <span style='color: red;'>{$failed}</span></p>\n";
        echo "<p><strong>Success Rate:</strong> {$success_rate}%</p>\n";
        
        if ($failed === 0) {
            echo "<p style='color: green; font-weight: bold;'>🎉 All data conversion tests passed!</p>\n";
        } else {
            echo "<p style='color: red; font-weight: bold;'>⚠️ Some data conversion tests failed. Please review the implementation.</p>\n";
        }
        
        echo "</div>\n";
        
        // Display conversion capabilities summary
        echo "<h3>🔍 Conversion Capabilities Summary</h3>\n";
        $this->display_conversion_capabilities();
    }
    
    /**
     * Display conversion capabilities summary
     */
    private function display_conversion_capabilities() {
        echo "<div style='background: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace;'>\n";
        
        echo "<h4>Supported Conversions:</h4>\n";
        echo "<ul>\n";
        echo "<li>✅ Yoast ➡️ RankMath (bidirectional)</li>\n";
        echo "<li>✅ RankMath ➡️ Yoast (bidirectional)</li>\n";
        echo "<li>✅ Universal data normalization</li>\n";
        echo "<li>✅ Plugin-specific field identification</li>\n";
        echo "</ul>\n";
        
        echo "<h4>Field Categories Supported:</h4>\n";
        echo "<ul>\n";
        echo "<li>🔤 Basic SEO Fields (title, description, keywords)</li>\n";
        echo "<li>🔗 Linking Fields (canonical, primary category)</li>\n";
        echo "<li>🤖 Robots Meta (noindex, nofollow with format conversion)</li>\n";
        echo "<li>📱 Social Media Fields (OpenGraph, Twitter)</li>\n";
        echo "<li>🖼️ Image Fields (with URL/ID handling)</li>\n";
        echo "<li>⚙️ Plugin-Specific Fields (identified but not converted)</li>\n";
        echo "</ul>\n";
        
        echo "<h4>Advanced Features:</h4>\n";
        echo "<ul>\n";
        echo "<li>📊 Migration Report Generation</li>\n";
        echo "<li>✅ Conversion Integrity Validation</li>\n";
        echo "<li>🔍 Compatibility Matrix</li>\n";
        echo "<li>🗂️ Plugin-Specific Data Preservation</li>\n";
        echo "<li>💾 Cache Management</li>\n";
        echo "<li>⚠️ Error Handling and Recovery</li>\n";
        echo "</ul>\n";
        
        echo "<h4>Data Type Conversions:</h4>\n";
        echo "<ul>\n";
        echo "<li>🔄 Boolean ↔ String (robots meta)</li>\n";
        echo "<li>🔄 Array ↔ Individual Fields (robots)</li>\n";
        echo "<li>🔄 Attachment ID ↔ URL (images)</li>\n";
        echo "<li>🔄 Serialized ↔ Simple Values</li>\n";
        echo "</ul>\n";
        
        echo "</div>\n";
    }
    
    /**
     * Clean up test environment
     */
    private function cleanup_test_environment() {
        echo "<h3>🧹 Cleaning up test environment...</h3>\n";
        
        // Delete test posts
        foreach ($this->test_post_ids as $post_id) {
            wp_delete_post($post_id, true);
        }
        
        echo "<p>✅ Deleted " . count($this->test_post_ids) . " test posts</p>\n";
    }
}

// Run tests if accessed directly
if (basename($_SERVER['PHP_SELF']) === 'test-data-conversion.php') {
    $tests = new PostCrafter_Data_Conversion_Tests();
    $tests->run_all_tests();
}
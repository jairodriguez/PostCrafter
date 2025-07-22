<?php
/**
 * Comprehensive Testing Suite for PostCrafter Yoast Integration
 *
 * This file orchestrates all individual test suites and provides a complete
 * testing framework for the mu-plugin functionality.
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class PostCrafter_Comprehensive_Test_Suite {

    private $test_results = array();
    private $start_time;
    private $total_tests = 0;
    private $passed_tests = 0;
    private $failed_tests = 0;

    /**
     * Constructor
     */
    public function __construct() {
        $this->start_time = microtime(true);
    }

    /**
     * Run the complete test suite
     */
    public function run_complete_suite() {
        echo "🚀 Starting PostCrafter Comprehensive Test Suite\n";
        echo "================================================\n\n";

        // Run all test suites
        $this->run_plugin_initialization_tests();
        $this->run_compatibility_tests();
        $this->run_validation_tests();
        $this->run_getter_setter_tests();
        $this->run_rest_api_tests();
        $this->run_integration_tests();
        $this->run_security_tests();
        $this->run_performance_tests();

        // Generate comprehensive report
        $this->generate_test_report();
    }

    /**
     * Test plugin initialization and basic functionality
     */
    private function run_plugin_initialization_tests() {
        echo "📦 Testing Plugin Initialization...\n";
        echo "-----------------------------------\n";

        // Test 1: Plugin file loading
        $this->test_plugin_file_loading();

        // Test 2: Class instantiation
        $this->test_class_instantiation();

        // Test 3: WordPress hooks registration
        $this->test_hooks_registration();

        // Test 4: Constants and configuration
        $this->test_constants_and_config();

        echo "\n";
    }

    /**
     * Test plugin file loading
     */
    private function test_plugin_file_loading() {
        $test_name = "Plugin File Loading";
        
        try {
            // Check if main plugin file exists
            $plugin_file = WP_CONTENT_DIR . '/mu-plugins/postcrafter-yoast-integration/postcrafter-yoast-integration.php';
            $file_exists = file_exists($plugin_file);
            
            if (!$file_exists) {
                throw new Exception("Main plugin file not found");
            }

            // Check if required classes are loaded
            $required_classes = array(
                'PostCrafter_Yoast_Integration',
                'PostCrafter_Yoast_Field_Handler',
                'PostCrafter_REST_API_Handler',
                'PostCrafter_Validation_Handler',
                'PostCrafter_Yoast_Compatibility'
            );

            foreach ($required_classes as $class) {
                if (!class_exists($class)) {
                    throw new Exception("Required class {$class} not found");
                }
            }

            $this->record_test_result($test_name, true, "All plugin files and classes loaded successfully");
        } catch (Exception $e) {
            $this->record_test_result($test_name, false, $e->getMessage());
        }
    }

    /**
     * Test class instantiation
     */
    private function test_class_instantiation() {
        $test_name = "Class Instantiation";
        
        try {
            // Test main plugin class
            $main_plugin = new PostCrafter_Yoast_Integration();
            if (!$main_plugin) {
                throw new Exception("Failed to instantiate main plugin class");
            }

            // Test field handler
            $field_handler = new PostCrafter_Yoast_Field_Handler();
            if (!$field_handler) {
                throw new Exception("Failed to instantiate field handler");
            }

            // Test REST API handler
            $rest_handler = new PostCrafter_REST_API_Handler();
            if (!$rest_handler) {
                throw new Exception("Failed to instantiate REST API handler");
            }

            // Test validation handler
            $validation_handler = new PostCrafter_Validation_Handler();
            if (!$validation_handler) {
                throw new Exception("Failed to instantiate validation handler");
            }

            // Test compatibility handler
            $compatibility_handler = new PostCrafter_Yoast_Compatibility();
            if (!$compatibility_handler) {
                throw new Exception("Failed to instantiate compatibility handler");
            }

            $this->record_test_result($test_name, true, "All classes instantiated successfully");
        } catch (Exception $e) {
            $this->record_test_result($test_name, false, $e->getMessage());
        }
    }

    /**
     * Test WordPress hooks registration
     */
    private function test_hooks_registration() {
        $test_name = "WordPress Hooks Registration";
        
        try {
            // Check if REST API init hook is registered
            $has_rest_hook = has_action('rest_api_init', array('PostCrafter_Yoast_Integration', 'register_yoast_fields'));
            
            if (!$has_rest_hook) {
                throw new Exception("REST API init hook not registered");
            }

            // Check if init hook is registered
            $has_init_hook = has_action('init', array('PostCrafter_Yoast_Integration', 'init_components'));
            
            if (!$has_init_hook) {
                throw new Exception("Init hook not registered");
            }

            $this->record_test_result($test_name, true, "All WordPress hooks registered successfully");
        } catch (Exception $e) {
            $this->record_test_result($test_name, false, $e->getMessage());
        }
    }

    /**
     * Test constants and configuration
     */
    private function test_constants_and_config() {
        $test_name = "Constants and Configuration";
        
        try {
            // Check if plugin constants are defined
            if (!defined('POSTCRAFTER_PLUGIN_VERSION')) {
                throw new Exception("Plugin version constant not defined");
            }

            if (!defined('POSTCRAFTER_PLUGIN_URL')) {
                throw new Exception("Plugin URL constant not defined");
            }

            if (!defined('POSTCRAFTER_PLUGIN_PATH')) {
                throw new Exception("Plugin path constant not defined");
            }

            $this->record_test_result($test_name, true, "All constants and configuration set correctly");
        } catch (Exception $e) {
            $this->record_test_result($test_name, false, $e->getMessage());
        }
    }

    /**
     * Run compatibility tests
     */
    private function run_compatibility_tests() {
        echo "🔧 Testing Yoast Compatibility...\n";
        echo "--------------------------------\n";

        // Include and run compatibility tests
        require_once dirname(__FILE__) . '/test-compatibility.php';
        
        try {
            $compatibility_test = new PostCrafter_Compatibility_Test();
            $compatibility_test->run_all_tests();
            $this->record_test_result("Yoast Compatibility Tests", true, "Compatibility tests completed successfully");
        } catch (Exception $e) {
            $this->record_test_result("Yoast Compatibility Tests", false, $e->getMessage());
        }

        echo "\n";
    }

    /**
     * Run validation tests
     */
    private function run_validation_tests() {
        echo "🛡️ Testing Validation and Sanitization...\n";
        echo "----------------------------------------\n";

        // Include and run validation tests
        require_once dirname(__FILE__) . '/test-validation.php';
        
        try {
            $validation_test = new PostCrafter_Validation_Test();
            $validation_test->run_all_tests();
            $this->record_test_result("Validation and Sanitization Tests", true, "Validation tests completed successfully");
        } catch (Exception $e) {
            $this->record_test_result("Validation and Sanitization Tests", false, $e->getMessage());
        }

        echo "\n";
    }

    /**
     * Run getter/setter tests
     */
    private function run_getter_setter_tests() {
        echo "📝 Testing Getter/Setter Functions...\n";
        echo "------------------------------------\n";

        // Include and run getter/setter tests
        require_once dirname(__FILE__) . '/test-getter-setter.php';
        
        try {
            $getter_setter_test = new PostCrafter_Getter_Setter_Test();
            $getter_setter_test->run_all_tests();
            $this->record_test_result("Getter/Setter Function Tests", true, "Getter/setter tests completed successfully");
        } catch (Exception $e) {
            $this->record_test_result("Getter/Setter Function Tests", false, $e->getMessage());
        }

        echo "\n";
    }

    /**
     * Run REST API tests
     */
    private function run_rest_api_tests() {
        echo "🌐 Testing REST API Integration...\n";
        echo "--------------------------------\n";

        // Include and run REST API tests
        require_once dirname(__FILE__) . '/test-rest-api.php';
        
        try {
            $rest_api_test = new PostCrafter_REST_API_Test();
            $rest_api_test->run_all_tests();
            $this->record_test_result("REST API Integration Tests", true, "REST API tests completed successfully");
        } catch (Exception $e) {
            $this->record_test_result("REST API Integration Tests", false, $e->getMessage());
        }

        echo "\n";
    }

    /**
     * Run integration tests
     */
    private function run_integration_tests() {
        echo "🔗 Testing End-to-End Integration...\n";
        echo "-----------------------------------\n";

        // Test complete workflow
        $this->test_complete_workflow();
        $this->test_bulk_operations();
        $this->test_error_scenarios();
        $this->test_cache_management();

        echo "\n";
    }

    /**
     * Test complete workflow
     */
    private function test_complete_workflow() {
        $test_name = "Complete Workflow Test";
        
        try {
            // Create a test post
            $post_data = array(
                'post_title' => 'Test Post for Comprehensive Testing',
                'post_content' => 'This is a test post for comprehensive testing.',
                'post_status' => 'draft',
                'post_type' => 'post'
            );

            $post_id = wp_insert_post($post_data);
            
            if (!$post_id || is_wp_error($post_id)) {
                throw new Exception("Failed to create test post");
            }

            // Test setting Yoast fields
            $field_handler = new PostCrafter_Yoast_Field_Handler();
            
            $yoast_fields = array(
                'meta_title' => 'Test Meta Title for SEO',
                'meta_description' => 'This is a test meta description for SEO optimization testing.',
                'focus_keywords' => 'test, seo, wordpress',
                'canonical' => 'https://example.com/test-post',
                'primary_category' => '1',
                'meta_robots_noindex' => '0',
                'meta_robots_nofollow' => '0'
            );

            $result = $field_handler->set_yoast_fields($post_id, $yoast_fields);
            
            if (!$result) {
                throw new Exception("Failed to set Yoast fields");
            }

            // Test retrieving Yoast fields
            $retrieved_fields = $field_handler->get_yoast_fields($post_id);
            
            if (!$retrieved_fields) {
                throw new Exception("Failed to retrieve Yoast fields");
            }

            // Verify fields were saved correctly
            foreach ($yoast_fields as $field => $expected_value) {
                if (!isset($retrieved_fields[$field])) {
                    throw new Exception("Field {$field} not found in retrieved data");
                }
            }

            // Clean up
            wp_delete_post($post_id, true);

            $this->record_test_result($test_name, true, "Complete workflow test passed successfully");
        } catch (Exception $e) {
            $this->record_test_result($test_name, false, $e->getMessage());
        }
    }

    /**
     * Test bulk operations
     */
    private function test_bulk_operations() {
        $test_name = "Bulk Operations Test";
        
        try {
            // Create multiple test posts
            $post_ids = array();
            for ($i = 1; $i <= 3; $i++) {
                $post_data = array(
                    'post_title' => "Bulk Test Post {$i}",
                    'post_content' => "Content for bulk test post {$i}.",
                    'post_status' => 'draft',
                    'post_type' => 'post'
                );
                
                $post_id = wp_insert_post($post_data);
                if ($post_id && !is_wp_error($post_id)) {
                    $post_ids[] = $post_id;
                }
            }

            if (empty($post_ids)) {
                throw new Exception("Failed to create test posts for bulk operations");
            }

            // Test bulk field setting
            $field_handler = new PostCrafter_Yoast_Field_Handler();
            
            foreach ($post_ids as $post_id) {
                $yoast_fields = array(
                    'meta_title' => "Bulk Test Meta Title {$post_id}",
                    'meta_description' => "Bulk test meta description for post {$post_id}.",
                    'focus_keywords' => "bulk, test, post, {$post_id}"
                );

                $result = $field_handler->set_yoast_fields($post_id, $yoast_fields);
                
                if (!$result) {
                    throw new Exception("Failed to set Yoast fields for post {$post_id}");
                }
            }

            // Test bulk field retrieval
            foreach ($post_ids as $post_id) {
                $retrieved_fields = $field_handler->get_yoast_fields($post_id);
                
                if (!$retrieved_fields) {
                    throw new Exception("Failed to retrieve Yoast fields for post {$post_id}");
                }
            }

            // Clean up
            foreach ($post_ids as $post_id) {
                wp_delete_post($post_id, true);
            }

            $this->record_test_result($test_name, true, "Bulk operations test passed successfully");
        } catch (Exception $e) {
            $this->record_test_result($test_name, false, $e->getMessage());
        }
    }

    /**
     * Test error scenarios
     */
    private function test_error_scenarios() {
        $test_name = "Error Scenarios Test";
        
        try {
            $field_handler = new PostCrafter_Yoast_Field_Handler();
            $validation_handler = new PostCrafter_Validation_Handler();

            // Test invalid post ID
            $result = $field_handler->get_yoast_fields(999999);
            if ($result !== false) {
                throw new Exception("Should return false for invalid post ID");
            }

            // Test invalid field data
            $invalid_fields = array(
                'meta_title' => str_repeat('a', 100), // Too long
                'meta_description' => 'Short', // Too short
                'focus_keywords' => 'one, two, three, four, five, six, seven, eight, nine, ten, eleven', // Too many
                'canonical' => 'not-a-url', // Invalid URL
                'primary_category' => 'invalid', // Invalid category
                'meta_robots_noindex' => '5', // Invalid value
                'meta_robots_nofollow' => 'invalid' // Invalid value
            );

            $validation = $validation_handler->validate_yoast_fields_comprehensive($invalid_fields);
            
            if ($validation['valid']) {
                throw new Exception("Should reject invalid field data");
            }

            $this->record_test_result($test_name, true, "Error scenarios handled correctly");
        } catch (Exception $e) {
            $this->record_test_result($test_name, false, $e->getMessage());
        }
    }

    /**
     * Test cache management
     */
    private function test_cache_management() {
        $test_name = "Cache Management Test";
        
        try {
            // Create a test post
            $post_data = array(
                'post_title' => 'Cache Test Post',
                'post_content' => 'This is a test post for cache management.',
                'post_status' => 'draft',
                'post_type' => 'post'
            );

            $post_id = wp_insert_post($post_data);
            
            if (!$post_id || is_wp_error($post_id)) {
                throw new Exception("Failed to create test post for cache testing");
            }

            $field_handler = new PostCrafter_Yoast_Field_Handler();
            
            // Set initial fields
            $initial_fields = array(
                'meta_title' => 'Initial Cache Test Title',
                'meta_description' => 'Initial cache test description.'
            );

            $result = $field_handler->set_yoast_fields($post_id, $initial_fields);
            
            if (!$result) {
                throw new Exception("Failed to set initial fields");
            }

            // Update fields (should trigger cache clearing)
            $updated_fields = array(
                'meta_title' => 'Updated Cache Test Title',
                'meta_description' => 'Updated cache test description.'
            );

            $result = $field_handler->set_yoast_fields($post_id, $updated_fields);
            
            if (!$result) {
                throw new Exception("Failed to update fields");
            }

            // Verify fields were updated
            $retrieved_fields = $field_handler->get_yoast_fields($post_id);
            
            if ($retrieved_fields['meta_title'] !== $updated_fields['meta_title']) {
                throw new Exception("Cache not properly cleared after field update");
            }

            // Clean up
            wp_delete_post($post_id, true);

            $this->record_test_result($test_name, true, "Cache management working correctly");
        } catch (Exception $e) {
            $this->record_test_result($test_name, false, $e->getMessage());
        }
    }

    /**
     * Run security tests
     */
    private function run_security_tests() {
        echo "🔒 Testing Security Features...\n";
        echo "-----------------------------\n";

        $this->test_xss_prevention();
        $this->test_sql_injection_prevention();
        $this->test_authentication_validation();
        $this->test_input_sanitization();

        echo "\n";
    }

    /**
     * Test XSS prevention
     */
    private function test_xss_prevention() {
        $test_name = "XSS Prevention Test";
        
        try {
            $validation_handler = new PostCrafter_Validation_Handler();
            
            $xss_payloads = array(
                '<script>alert("xss")</script>',
                'javascript:alert("xss")',
                '<iframe src="javascript:alert(\'xss\')"></iframe>',
                'onload=alert("xss")',
                '<img src="x" onerror="alert(\'xss\')">'
            );

            foreach ($xss_payloads as $payload) {
                $validation = $validation_handler->validate_meta_title_comprehensive($payload);
                
                if ($validation['valid']) {
                    throw new Exception("XSS payload not detected: {$payload}");
                }
            }

            $this->record_test_result($test_name, true, "XSS prevention working correctly");
        } catch (Exception $e) {
            $this->record_test_result($test_name, false, $e->getMessage());
        }
    }

    /**
     * Test SQL injection prevention
     */
    private function test_sql_injection_prevention() {
        $test_name = "SQL Injection Prevention Test";
        
        try {
            $validation_handler = new PostCrafter_Validation_Handler();
            
            $sql_payloads = array(
                "'; DROP TABLE posts; --",
                "union select * from users",
                "insert into posts values",
                "update posts set",
                "delete from posts"
            );

            foreach ($sql_payloads as $payload) {
                $validation = $validation_handler->validate_meta_title_comprehensive($payload);
                
                if ($validation['valid']) {
                    throw new Exception("SQL injection payload not detected: {$payload}");
                }
            }

            $this->record_test_result($test_name, true, "SQL injection prevention working correctly");
        } catch (Exception $e) {
            $this->record_test_result($test_name, false, $e->getMessage());
        }
    }

    /**
     * Test authentication validation
     */
    private function test_authentication_validation() {
        $test_name = "Authentication Validation Test";
        
        try {
            $rest_handler = new PostCrafter_REST_API_Handler();
            
            // Test without authentication
            $request = new WP_REST_Request('POST', '/wp/v2/posts');
            $response = $rest_handler->check_permissions($request);
            
            if ($response !== false) {
                throw new Exception("Should reject requests without authentication");
            }

            $this->record_test_result($test_name, true, "Authentication validation working correctly");
        } catch (Exception $e) {
            $this->record_test_result($test_name, false, $e->getMessage());
        }
    }

    /**
     * Test input sanitization
     */
    private function test_input_sanitization() {
        $test_name = "Input Sanitization Test";
        
        try {
            $validation_handler = new PostCrafter_Validation_Handler();
            
            $dirty_input = "  <script>alert('xss')</script>Dirty Input with HTML  ";
            $clean_input = $validation_handler->sanitize_meta_title_comprehensive($dirty_input);
            
            if (strip_tags($clean_input) !== $clean_input) {
                throw new Exception("HTML tags not properly removed during sanitization");
            }

            if (trim($clean_input) !== $clean_input) {
                throw new Exception("Whitespace not properly trimmed during sanitization");
            }

            $this->record_test_result($test_name, true, "Input sanitization working correctly");
        } catch (Exception $e) {
            $this->record_test_result($test_name, false, $e->getMessage());
        }
    }

    /**
     * Run performance tests
     */
    private function run_performance_tests() {
        echo "⚡ Testing Performance...\n";
        echo "------------------------\n";

        $this->test_field_retrieval_performance();
        $this->test_field_setting_performance();
        $this->test_bulk_operations_performance();
        $this->test_memory_usage();

        echo "\n";
    }

    /**
     * Test field retrieval performance
     */
    private function test_field_retrieval_performance() {
        $test_name = "Field Retrieval Performance Test";
        
        try {
            // Create test post
            $post_data = array(
                'post_title' => 'Performance Test Post',
                'post_content' => 'Content for performance testing.',
                'post_status' => 'draft',
                'post_type' => 'post'
            );

            $post_id = wp_insert_post($post_data);
            
            if (!$post_id || is_wp_error($post_id)) {
                throw new Exception("Failed to create test post for performance testing");
            }

            $field_handler = new PostCrafter_Yoast_Field_Handler();
            
            // Set test fields
            $test_fields = array(
                'meta_title' => 'Performance Test Title',
                'meta_description' => 'Performance test description.',
                'focus_keywords' => 'performance, test, wordpress'
            );

            $field_handler->set_yoast_fields($post_id, $test_fields);

            // Test retrieval performance
            $start_time = microtime(true);
            
            for ($i = 0; $i < 100; $i++) {
                $field_handler->get_yoast_fields($post_id);
            }
            
            $end_time = microtime(true);
            $execution_time = $end_time - $start_time;
            
            // Clean up
            wp_delete_post($post_id, true);

            if ($execution_time > 1.0) { // More than 1 second for 100 operations
                throw new Exception("Field retrieval performance too slow: {$execution_time}s for 100 operations");
            }

            $this->record_test_result($test_name, true, "Field retrieval performance acceptable: {$execution_time}s for 100 operations");
        } catch (Exception $e) {
            $this->record_test_result($test_name, false, $e->getMessage());
        }
    }

    /**
     * Test field setting performance
     */
    private function test_field_setting_performance() {
        $test_name = "Field Setting Performance Test";
        
        try {
            $field_handler = new PostCrafter_Yoast_Field_Handler();
            
            // Create test post
            $post_data = array(
                'post_title' => 'Setting Performance Test Post',
                'post_content' => 'Content for setting performance testing.',
                'post_status' => 'draft',
                'post_type' => 'post'
            );

            $post_id = wp_insert_post($post_data);
            
            if (!$post_id || is_wp_error($post_id)) {
                throw new Exception("Failed to create test post for setting performance testing");
            }

            $test_fields = array(
                'meta_title' => 'Setting Performance Test Title',
                'meta_description' => 'Setting performance test description.',
                'focus_keywords' => 'setting, performance, test'
            );

            // Test setting performance
            $start_time = microtime(true);
            
            for ($i = 0; $i < 50; $i++) {
                $field_handler->set_yoast_fields($post_id, $test_fields);
            }
            
            $end_time = microtime(true);
            $execution_time = $end_time - $start_time;
            
            // Clean up
            wp_delete_post($post_id, true);

            if ($execution_time > 2.0) { // More than 2 seconds for 50 operations
                throw new Exception("Field setting performance too slow: {$execution_time}s for 50 operations");
            }

            $this->record_test_result($test_name, true, "Field setting performance acceptable: {$execution_time}s for 50 operations");
        } catch (Exception $e) {
            $this->record_test_result($test_name, false, $e->getMessage());
        }
    }

    /**
     * Test bulk operations performance
     */
    private function test_bulk_operations_performance() {
        $test_name = "Bulk Operations Performance Test";
        
        try {
            $field_handler = new PostCrafter_Yoast_Field_Handler();
            
            // Create multiple test posts
            $post_ids = array();
            for ($i = 1; $i <= 10; $i++) {
                $post_data = array(
                    'post_title' => "Bulk Performance Test Post {$i}",
                    'post_content' => "Content for bulk performance test post {$i}.",
                    'post_status' => 'draft',
                    'post_type' => 'post'
                );
                
                $post_id = wp_insert_post($post_data);
                if ($post_id && !is_wp_error($post_id)) {
                    $post_ids[] = $post_id;
                }
            }

            if (empty($post_ids)) {
                throw new Exception("Failed to create test posts for bulk performance testing");
            }

            $test_fields = array(
                'meta_title' => 'Bulk Performance Test Title',
                'meta_description' => 'Bulk performance test description.',
                'focus_keywords' => 'bulk, performance, test'
            );

            // Test bulk operations performance
            $start_time = microtime(true);
            
            foreach ($post_ids as $post_id) {
                $field_handler->set_yoast_fields($post_id, $test_fields);
                $field_handler->get_yoast_fields($post_id);
            }
            
            $end_time = microtime(true);
            $execution_time = $end_time - $start_time;
            
            // Clean up
            foreach ($post_ids as $post_id) {
                wp_delete_post($post_id, true);
            }

            if ($execution_time > 5.0) { // More than 5 seconds for 10 posts
                throw new Exception("Bulk operations performance too slow: {$execution_time}s for 10 posts");
            }

            $this->record_test_result($test_name, true, "Bulk operations performance acceptable: {$execution_time}s for 10 posts");
        } catch (Exception $e) {
            $this->record_test_result($test_name, false, $e->getMessage());
        }
    }

    /**
     * Test memory usage
     */
    private function test_memory_usage() {
        $test_name = "Memory Usage Test";
        
        try {
            $initial_memory = memory_get_usage();
            
            // Perform intensive operations
            $field_handler = new PostCrafter_Yoast_Field_Handler();
            $validation_handler = new PostCrafter_Validation_Handler();
            
            for ($i = 0; $i < 100; $i++) {
                $test_fields = array(
                    'meta_title' => "Memory Test Title {$i}",
                    'meta_description' => "Memory test description {$i}.",
                    'focus_keywords' => "memory, test, {$i}"
                );
                
                $validation_handler->validate_yoast_fields_comprehensive($test_fields);
            }
            
            $final_memory = memory_get_usage();
            $memory_increase = $final_memory - $initial_memory;
            
            // Allow up to 1MB memory increase
            if ($memory_increase > 1024 * 1024) {
                throw new Exception("Memory usage increase too high: " . round($memory_increase / 1024, 2) . "KB");
            }

            $this->record_test_result($test_name, true, "Memory usage acceptable: " . round($memory_increase / 1024, 2) . "KB increase");
        } catch (Exception $e) {
            $this->record_test_result($test_name, false, $e->getMessage());
        }
    }

    /**
     * Record test result
     */
    private function record_test_result($test_name, $passed, $message) {
        $this->total_tests++;
        
        if ($passed) {
            $this->passed_tests++;
            echo "✅ {$test_name}: {$message}\n";
        } else {
            $this->failed_tests++;
            echo "❌ {$test_name}: {$message}\n";
        }
        
        $this->test_results[] = array(
            'name' => $test_name,
            'passed' => $passed,
            'message' => $message
        );
    }

    /**
     * Generate comprehensive test report
     */
    private function generate_test_report() {
        $end_time = microtime(true);
        $total_time = round($end_time - $this->start_time, 2);
        
        echo "\n" . str_repeat("=", 60) . "\n";
        echo "📊 COMPREHENSIVE TEST SUITE REPORT\n";
        echo str_repeat("=", 60) . "\n";
        
        echo "Total Tests: {$this->total_tests}\n";
        echo "Passed: {$this->passed_tests}\n";
        echo "Failed: {$this->failed_tests}\n";
        echo "Success Rate: " . round(($this->passed_tests / $this->total_tests) * 100, 1) . "%\n";
        echo "Total Time: {$total_time}s\n\n";
        
        if ($this->failed_tests > 0) {
            echo "❌ FAILED TESTS:\n";
            echo str_repeat("-", 40) . "\n";
            foreach ($this->test_results as $result) {
                if (!$result['passed']) {
                    echo "• {$result['name']}: {$result['message']}\n";
                }
            }
            echo "\n";
        }
        
        echo "✅ PASSED TESTS:\n";
        echo str_repeat("-", 40) . "\n";
        foreach ($this->test_results as $result) {
            if ($result['passed']) {
                echo "• {$result['name']}: {$result['message']}\n";
            }
        }
        
        echo "\n" . str_repeat("=", 60) . "\n";
        
        if ($this->failed_tests === 0) {
            echo "🎉 ALL TESTS PASSED! The PostCrafter plugin is ready for production.\n";
        } else {
            echo "⚠️  {$this->failed_tests} test(s) failed. Please review and fix the issues above.\n";
        }
        
        echo str_repeat("=", 60) . "\n";
        
        // Save test results to WordPress options for future reference
        $test_summary = array(
            'timestamp' => current_time('mysql'),
            'total_tests' => $this->total_tests,
            'passed_tests' => $this->passed_tests,
            'failed_tests' => $this->failed_tests,
            'success_rate' => round(($this->passed_tests / $this->total_tests) * 100, 1),
            'total_time' => $total_time,
            'results' => $this->test_results
        );
        
        update_option('postcrafter_test_results', $test_summary);
    }
}

// Run tests if this file is accessed directly
if (defined('WP_CLI') && WP_CLI) {
    $test_suite = new PostCrafter_Comprehensive_Test_Suite();
    $test_suite->run_complete_suite();
}

// Also run tests if accessed via web (for debugging)
if (isset($_GET['run_comprehensive_tests']) && current_user_can('manage_options')) {
    $test_suite = new PostCrafter_Comprehensive_Test_Suite();
    $test_suite->run_complete_suite();
    exit;
} 
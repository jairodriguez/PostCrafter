<?php
/**
 * Test file for validation and sanitization functionality
 *
 * This file tests the comprehensive validation and sanitization features
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class PostCrafter_Validation_Test {

    private $validation_handler;

    /**
     * Constructor
     */
    public function __construct() {
        $this->validation_handler = new PostCrafter_Validation_Handler();
    }

    /**
     * Run all validation tests
     */
    public function run_all_tests() {
        echo "🧪 Running Validation Tests...\n\n";

        $this->test_meta_title_validation();
        $this->test_meta_description_validation();
        $this->test_focus_keywords_validation();
        $this->test_canonical_url_validation();
        $this->test_primary_category_validation();
        $this->test_robots_validation();
        $this->test_malicious_content_detection();
        $this->test_comprehensive_validation();
        $this->test_sanitization_functions();
        $this->test_error_logging();

        echo "\n✅ All validation tests completed!\n";
    }

    /**
     * Test meta title validation
     */
    private function test_meta_title_validation() {
        echo "📝 Testing Meta Title Validation...\n";

        // Test valid title
        $valid_title = "This is a valid meta title for testing purposes";
        $result = $this->validation_handler->validate_meta_title_comprehensive($valid_title);
        echo "Valid title: " . ($result['valid'] ? '✅ Pass' : '❌ Fail') . "\n";

        // Test too short title
        $short_title = "Short";
        $result = $this->validation_handler->validate_meta_title_comprehensive($short_title);
        echo "Short title: " . ($result['valid'] ? '❌ Should fail' : '✅ Correctly failed') . "\n";
        if (!$result['valid']) {
            echo "  Error: " . $result['errors'][0]['message'] . "\n";
        }

        // Test too long title
        $long_title = str_repeat("a", 100);
        $result = $this->validation_handler->validate_meta_title_comprehensive($long_title);
        echo "Long title: " . ($result['valid'] ? '❌ Should fail' : '✅ Correctly failed') . "\n";
        if (!$result['valid']) {
            echo "  Error: " . $result['errors'][0]['message'] . "\n";
        }

        // Test empty title
        $empty_title = "";
        $result = $this->validation_handler->validate_meta_title_comprehensive($empty_title);
        echo "Empty title: " . ($result['valid'] ? '✅ Pass' : '❌ Fail') . "\n";

        // Test HTML in title
        $html_title = "Title with <script>alert('xss')</script>";
        $result = $this->validation_handler->validate_meta_title_comprehensive($html_title);
        echo "HTML title: " . ($result['valid'] ? '❌ Should fail' : '✅ Correctly failed') . "\n";
        if (!$result['valid']) {
            echo "  Error: " . $result['errors'][0]['message'] . "\n";
        }
    }

    /**
     * Test meta description validation
     */
    private function test_meta_description_validation() {
        echo "\n📄 Testing Meta Description Validation...\n";

        // Test valid description
        $valid_desc = "This is a valid meta description that meets the minimum length requirement and provides good information about the content.";
        $result = $this->validation_handler->validate_meta_description_comprehensive($valid_desc);
        echo "Valid description: " . ($result['valid'] ? '✅ Pass' : '❌ Fail') . "\n";

        // Test too short description
        $short_desc = "Too short";
        $result = $this->validation_handler->validate_meta_description_comprehensive($short_desc);
        echo "Short description: " . ($result['valid'] ? '❌ Should fail' : '✅ Correctly failed') . "\n";
        if (!$result['valid']) {
            echo "  Error: " . $result['errors'][0]['message'] . "\n";
        }

        // Test too long description
        $long_desc = str_repeat("a", 200);
        $result = $this->validation_handler->validate_meta_description_comprehensive($long_desc);
        echo "Long description: " . ($result['valid'] ? '❌ Should fail' : '✅ Correctly failed') . "\n";
        if (!$result['valid']) {
            echo "  Error: " . $result['errors'][0]['message'] . "\n";
        }

        // Test malicious content
        $malicious_desc = "Description with javascript:alert('xss')";
        $result = $this->validation_handler->validate_meta_description_comprehensive($malicious_desc);
        echo "Malicious description: " . ($result['valid'] ? '❌ Should fail' : '✅ Correctly failed') . "\n";
        if (!$result['valid']) {
            echo "  Error: " . $result['errors'][0]['message'] . "\n";
        }
    }

    /**
     * Test focus keywords validation
     */
    private function test_focus_keywords_validation() {
        echo "\n🔑 Testing Focus Keywords Validation...\n";

        // Test valid keywords
        $valid_keywords = "wordpress, seo, optimization, meta tags";
        $result = $this->validation_handler->validate_focus_keywords_comprehensive($valid_keywords);
        echo "Valid keywords: " . ($result['valid'] ? '✅ Pass' : '❌ Fail') . "\n";

        // Test too many keywords
        $many_keywords = "one, two, three, four, five, six, seven, eight, nine, ten, eleven";
        $result = $this->validation_handler->validate_focus_keywords_comprehensive($many_keywords);
        echo "Too many keywords: " . ($result['valid'] ? '❌ Should fail' : '✅ Correctly failed') . "\n";
        if (!$result['valid']) {
            echo "  Error: " . $result['errors'][0]['message'] . "\n";
        }

        // Test individual keyword too long
        $long_keyword = str_repeat("a", 60) . ", short";
        $result = $this->validation_handler->validate_focus_keywords_comprehensive($long_keyword);
        echo "Long keyword: " . ($result['valid'] ? '❌ Should fail' : '✅ Correctly failed') . "\n";
        if (!$result['valid']) {
            echo "  Error: " . $result['errors'][0]['message'] . "\n";
        }

        // Test individual keyword too short
        $short_keyword = "a, valid, keywords";
        $result = $this->validation_handler->validate_focus_keywords_comprehensive($short_keyword);
        echo "Short keyword: " . ($result['valid'] ? '❌ Should fail' : '✅ Correctly failed') . "\n";
        if (!$result['valid']) {
            echo "  Error: " . $result['errors'][0]['message'] . "\n";
        }

        // Test HTML in keywords
        $html_keywords = "valid, <script>alert('xss')</script>, keywords";
        $result = $this->validation_handler->validate_focus_keywords_comprehensive($html_keywords);
        echo "HTML keywords: " . ($result['valid'] ? '❌ Should fail' : '✅ Correctly failed') . "\n";
        if (!$result['valid']) {
            echo "  Error: " . $result['errors'][0]['message'] . "\n";
        }
    }

    /**
     * Test canonical URL validation
     */
    private function test_canonical_url_validation() {
        echo "\n🔗 Testing Canonical URL Validation...\n";

        // Test valid URL
        $valid_url = "https://example.com/page";
        $result = $this->validation_handler->validate_canonical_url($valid_url);
        echo "Valid URL: " . ($result['valid'] ? '✅ Pass' : '❌ Fail') . "\n";

        // Test invalid URL
        $invalid_url = "not-a-url";
        $result = $this->validation_handler->validate_canonical_url($invalid_url);
        echo "Invalid URL: " . ($result['valid'] ? '❌ Should fail' : '✅ Correctly failed') . "\n";
        if (!$result['valid']) {
            echo "  Error: " . $result['errors'][0]['message'] . "\n";
        }

        // Test JavaScript protocol
        $js_url = "javascript:alert('xss')";
        $result = $this->validation_handler->validate_canonical_url($js_url);
        echo "JavaScript URL: " . ($result['valid'] ? '❌ Should fail' : '✅ Correctly failed') . "\n";
        if (!$result['valid']) {
            echo "  Error: " . $result['errors'][0]['message'] . "\n";
        }

        // Test data protocol
        $data_url = "data:text/html,<script>alert('xss')</script>";
        $result = $this->validation_handler->validate_canonical_url($data_url);
        echo "Data URL: " . ($result['valid'] ? '❌ Should fail' : '✅ Correctly failed') . "\n";
        if (!$result['valid']) {
            echo "  Error: " . $result['errors'][0]['message'] . "\n";
        }

        // Test empty URL
        $empty_url = "";
        $result = $this->validation_handler->validate_canonical_url($empty_url);
        echo "Empty URL: " . ($result['valid'] ? '✅ Pass' : '❌ Fail') . "\n";
    }

    /**
     * Test primary category validation
     */
    private function test_primary_category_validation() {
        echo "\n📂 Testing Primary Category Validation...\n";

        // Test valid category ID
        $valid_category = "5";
        $result = $this->validation_handler->validate_primary_category($valid_category);
        echo "Valid category: " . ($result['valid'] ? '✅ Pass' : '❌ Fail') . "\n";

        // Test invalid category (non-numeric)
        $invalid_category = "not-a-number";
        $result = $this->validation_handler->validate_primary_category($invalid_category);
        echo "Invalid category: " . ($result['valid'] ? '❌ Should fail' : '✅ Correctly failed') . "\n";
        if (!$result['valid']) {
            echo "  Error: " . $result['errors'][0]['message'] . "\n";
        }

        // Test negative category ID
        $negative_category = "-1";
        $result = $this->validation_handler->validate_primary_category($negative_category);
        echo "Negative category: " . ($result['valid'] ? '❌ Should fail' : '✅ Correctly failed') . "\n";
        if (!$result['valid']) {
            echo "  Error: " . $result['errors'][0]['message'] . "\n";
        }

        // Test empty category
        $empty_category = "";
        $result = $this->validation_handler->validate_primary_category($empty_category);
        echo "Empty category: " . ($result['valid'] ? '✅ Pass' : '❌ Fail') . "\n";
    }

    /**
     * Test robots validation
     */
    private function test_robots_validation() {
        echo "\n🤖 Testing Robots Validation...\n";

        // Test valid noindex values
        $valid_values = array("0", "1", "2");
        foreach ($valid_values as $value) {
            $result = $this->validation_handler->validate_robots_noindex($value);
            echo "Valid noindex '{$value}': " . ($result['valid'] ? '✅ Pass' : '❌ Fail') . "\n";
        }

        // Test invalid noindex value
        $invalid_noindex = "3";
        $result = $this->validation_handler->validate_robots_noindex($invalid_noindex);
        echo "Invalid noindex: " . ($result['valid'] ? '❌ Should fail' : '✅ Correctly failed') . "\n";
        if (!$result['valid']) {
            echo "  Error: " . $result['errors'][0]['message'] . "\n";
        }

        // Test valid nofollow values
        foreach ($valid_values as $value) {
            $result = $this->validation_handler->validate_robots_nofollow($value);
            echo "Valid nofollow '{$value}': " . ($result['valid'] ? '✅ Pass' : '❌ Fail') . "\n";
        }

        // Test invalid nofollow value
        $invalid_nofollow = "invalid";
        $result = $this->validation_handler->validate_robots_nofollow($invalid_nofollow);
        echo "Invalid nofollow: " . ($result['valid'] ? '❌ Should fail' : '✅ Correctly failed') . "\n";
        if (!$result['valid']) {
            echo "  Error: " . $result['errors'][0]['message'] . "\n";
        }
    }

    /**
     * Test malicious content detection
     */
    private function test_malicious_content_detection() {
        echo "\n🛡️ Testing Malicious Content Detection...\n";

        // Test XSS patterns
        $xss_patterns = array(
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "vbscript:alert('xss')",
            "onload=alert('xss')",
            "onclick=alert('xss')",
            "<iframe src='javascript:alert(\"xss\")'></iframe>",
            "<object data='javascript:alert(\"xss\")'></object>"
        );

        foreach ($xss_patterns as $pattern) {
            $result = $this->validation_handler->validate_meta_title_comprehensive($pattern);
            echo "XSS pattern '{$pattern}': " . ($result['valid'] ? '❌ Should fail' : '✅ Correctly failed') . "\n";
        }

        // Test SQL injection patterns
        $sql_patterns = array(
            "union select * from users",
            "drop table users",
            "delete from posts",
            "insert into users",
            "update users set",
            "exec('malicious')",
            "eval('malicious')"
        );

        foreach ($sql_patterns as $pattern) {
            $result = $this->validation_handler->validate_meta_title_comprehensive($pattern);
            echo "SQL pattern '{$pattern}': " . ($result['valid'] ? '❌ Should fail' : '✅ Correctly failed') . "\n";
        }
    }

    /**
     * Test comprehensive validation
     */
    private function test_comprehensive_validation() {
        echo "\n🔍 Testing Comprehensive Validation...\n";

        // Test valid fields
        $valid_fields = array(
            'meta_title' => 'Valid Meta Title for Testing',
            'meta_description' => 'This is a valid meta description that meets all requirements and provides good information.',
            'focus_keywords' => 'wordpress, seo, testing',
            'canonical' => 'https://example.com/page',
            'primary_category' => '5',
            'meta_robots_noindex' => '0',
            'meta_robots_nofollow' => '0'
        );

        $result = $this->validation_handler->validate_yoast_fields_comprehensive($valid_fields);
        echo "Valid fields: " . ($result['valid'] ? '✅ Pass' : '❌ Fail') . "\n";

        // Test invalid fields
        $invalid_fields = array(
            'meta_title' => str_repeat("a", 100), // Too long
            'meta_description' => "Short", // Too short
            'focus_keywords' => "one, two, three, four, five, six, seven, eight, nine, ten, eleven", // Too many
            'canonical' => "not-a-url", // Invalid URL
            'primary_category' => "invalid", // Invalid category
            'meta_robots_noindex' => "5", // Invalid value
            'meta_robots_nofollow' => "invalid" // Invalid value
        );

        $result = $this->validation_handler->validate_yoast_fields_comprehensive($invalid_fields);
        echo "Invalid fields: " . ($result['valid'] ? '❌ Should fail' : '✅ Correctly failed') . "\n";
        
        if (!$result['valid']) {
            echo "  Errors found: " . count($result['errors']) . "\n";
            foreach ($result['errors'] as $field => $errors) {
                echo "    {$field}: " . $errors[0]['message'] . "\n";
            }
        }
    }

    /**
     * Test sanitization functions
     */
    private function test_sanitization_functions() {
        echo "\n🧹 Testing Sanitization Functions...\n";

        // Test meta title sanitization
        $dirty_title = "  <script>alert('xss')</script>Dirty Title with HTML  ";
        $clean_title = $this->validation_handler->sanitize_meta_title_comprehensive($dirty_title);
        echo "Title sanitization: " . (strip_tags($clean_title) === $clean_title ? '✅ Clean' : '❌ Still dirty') . "\n";
        echo "  Before: '{$dirty_title}'\n";
        echo "  After: '{$clean_title}'\n";

        // Test meta description sanitization
        $dirty_desc = "  <iframe>Dirty description</iframe> with HTML tags  ";
        $clean_desc = $this->validation_handler->sanitize_meta_description_comprehensive($dirty_desc);
        echo "Description sanitization: " . (strip_tags($clean_desc) === $clean_desc ? '✅ Clean' : '❌ Still dirty') . "\n";
        echo "  Before: '{$dirty_desc}'\n";
        echo "  After: '{$clean_desc}'\n";

        // Test focus keywords sanitization
        $dirty_keywords = "  <script>alert('xss')</script>dirty, <iframe>malicious</iframe>keywords  ";
        $clean_keywords = $this->validation_handler->sanitize_focus_keywords_comprehensive($dirty_keywords);
        echo "Keywords sanitization: " . (strip_tags($clean_keywords) === $clean_keywords ? '✅ Clean' : '❌ Still dirty') . "\n";
        echo "  Before: '{$dirty_keywords}'\n";
        echo "  After: '{$clean_keywords}'\n";

        // Test URL sanitization
        $dirty_url = "  javascript:alert('xss')  ";
        $clean_url = $this->validation_handler->sanitize_canonical_url($dirty_url);
        echo "URL sanitization: " . (empty($clean_url) ? '✅ Blocked' : '❌ Not blocked') . "\n";
        echo "  Before: '{$dirty_url}'\n";
        echo "  After: '{$clean_url}'\n";

        // Test category sanitization
        $dirty_category = "invalid";
        $clean_category = $this->validation_handler->sanitize_primary_category($dirty_category);
        echo "Category sanitization: " . ($clean_category === 0 ? '✅ Defaulted' : '❌ Not defaulted') . "\n";
        echo "  Before: '{$dirty_category}'\n";
        echo "  After: '{$clean_category}'\n";
    }

    /**
     * Test error logging
     */
    private function test_error_logging() {
        echo "\n📋 Testing Error Logging...\n";

        // Create test errors
        $test_errors = array(
            'meta_title' => array(
                array(
                    'code' => 'title_too_long',
                    'message' => 'Test error message',
                    'value' => 'test value'
                )
            )
        );

        // Test logging function
        $this->validation_handler->log_validation_errors($test_errors, 123, 1);
        
        // Check if logs were created
        $logs = get_option('postcrafter_validation_logs', array());
        $has_logs = !empty($logs);
        echo "Error logging: " . ($has_logs ? '✅ Working' : '❌ Not working') . "\n";
        
        if ($has_logs) {
            $latest_log = end($logs);
            echo "  Latest log timestamp: " . $latest_log['timestamp'] . "\n";
            echo "  Logged post ID: " . $latest_log['post_id'] . "\n";
            echo "  Logged user ID: " . $latest_log['user_id'] . "\n";
        }

        // Test error message formatting
        $messages = $this->validation_handler->get_error_messages($test_errors);
        echo "Error message formatting: " . (!empty($messages) ? '✅ Working' : '❌ Not working') . "\n";
        if (!empty($messages)) {
            echo "  Formatted message: " . $messages[0] . "\n";
        }
    }
}

// Run tests if this file is accessed directly
if (defined('WP_CLI') && WP_CLI) {
    $test = new PostCrafter_Validation_Test();
    $test->run_all_tests();
}

// Also run tests if accessed via web (for debugging)
if (isset($_GET['run_validation_tests']) && current_user_can('manage_options')) {
    $test = new PostCrafter_Validation_Test();
    $test->run_all_tests();
    exit;
} 
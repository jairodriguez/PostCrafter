<?php
/**
 * Test file for getter and setter functions
 * 
 * This file tests the Yoast field getter and setter functionality
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class PostCrafter_Getter_Setter_Test {
    
    private $yoast_handler;
    private $test_post_id;
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->yoast_handler = new PostCrafter_Yoast_Field_Handler();
    }
    
    /**
     * Run all tests
     */
    public function run_all_tests() {
        echo "🧪 Running Getter/Setter Tests...\n\n";
        
        $this->test_create_test_post();
        $this->test_individual_getters();
        $this->test_individual_setters();
        $this->test_bulk_operations();
        $this->test_validation_and_sanitization();
        $this->test_error_handling();
        $this->test_cache_clearing();
        $this->cleanup_test_post();
        
        echo "\n✅ All tests completed!\n";
    }
    
    /**
     * Create a test post
     */
    private function test_create_test_post() {
        echo "📝 Creating test post...\n";
        
        $this->test_post_id = wp_insert_post(array(
            'post_title' => 'Test Post for Getter/Setter',
            'post_content' => 'Test content for getter/setter functions',
            'post_status' => 'publish'
        ));
        
        if (is_wp_error($this->test_post_id)) {
            echo "❌ Failed to create test post\n";
            return false;
        }
        
        echo "✅ Test post created with ID: {$this->test_post_id}\n";
        return true;
    }
    
    /**
     * Test individual getter functions
     */
    private function test_individual_getters() {
        echo "\n🔍 Testing individual getter functions...\n";
        
        // Test meta title getter
        $meta_title = $this->yoast_handler->get_yoast_meta_title($this->test_post_id);
        echo "Meta Title Getter: " . ($meta_title === '' ? '✅ Empty (expected)' : '❌ Unexpected value') . "\n";
        
        // Test meta description getter
        $meta_description = $this->yoast_handler->get_yoast_meta_description($this->test_post_id);
        echo "Meta Description Getter: " . ($meta_description === '' ? '✅ Empty (expected)' : '❌ Unexpected value') . "\n";
        
        // Test focus keywords getter
        $focus_keywords = $this->yoast_handler->get_yoast_focus_keywords($this->test_post_id);
        echo "Focus Keywords Getter: " . ($focus_keywords === '' ? '✅ Empty (expected)' : '❌ Unexpected value') . "\n";
        
        // Test canonical getter
        $canonical = $this->yoast_handler->get_yoast_canonical($this->test_post_id);
        echo "Canonical Getter: " . ($canonical === '' ? '✅ Empty (expected)' : '❌ Unexpected value') . "\n";
        
        // Test primary category getter
        $primary_category = $this->yoast_handler->get_yoast_primary_category($this->test_post_id);
        echo "Primary Category Getter: " . ($primary_category === '' ? '✅ Empty (expected)' : '❌ Unexpected value') . "\n";
    }
    
    /**
     * Test individual setter functions
     */
    private function test_individual_setters() {
        echo "\n✏️ Testing individual setter functions...\n";
        
        // Test meta title setter
        $test_title = 'Test SEO Title for PostCrafter';
        $result = $this->yoast_handler->set_yoast_meta_title($this->test_post_id, $test_title);
        $retrieved = $this->yoast_handler->get_yoast_meta_title($this->test_post_id);
        echo "Meta Title Setter: " . ($result && $retrieved === $test_title ? '✅ Success' : '❌ Failed') . "\n";
        
        // Test meta description setter
        $test_description = 'Test SEO description for PostCrafter integration testing';
        $result = $this->yoast_handler->set_yoast_meta_description($this->test_post_id, $test_description);
        $retrieved = $this->yoast_handler->get_yoast_meta_description($this->test_post_id);
        echo "Meta Description Setter: " . ($result && $retrieved === $test_description ? '✅ Success' : '❌ Failed') . "\n";
        
        // Test focus keywords setter
        $test_keywords = 'postcrafter, wordpress, seo, automation';
        $result = $this->yoast_handler->set_yoast_focus_keywords($this->test_post_id, $test_keywords);
        $retrieved = $this->yoast_handler->get_yoast_focus_keywords($this->test_post_id);
        echo "Focus Keywords Setter: " . ($result && $retrieved === $test_keywords ? '✅ Success' : '❌ Failed') . "\n";
        
        // Test canonical setter
        $test_canonical = 'https://example.com/test-post';
        $result = $this->yoast_handler->set_yoast_canonical($this->test_post_id, $test_canonical);
        $retrieved = $this->yoast_handler->get_yoast_canonical($this->test_post_id);
        echo "Canonical Setter: " . ($result && $retrieved === $test_canonical ? '✅ Success' : '❌ Failed') . "\n";
        
        // Test primary category setter
        $test_category = 1; // Assuming category ID 1 exists
        $result = $this->yoast_handler->set_yoast_primary_category($this->test_post_id, $test_category);
        $retrieved = $this->yoast_handler->get_yoast_primary_category($this->test_post_id);
        echo "Primary Category Setter: " . ($result && $retrieved == $test_category ? '✅ Success' : '❌ Failed') . "\n";
    }
    
    /**
     * Test bulk operations
     */
    private function test_bulk_operations() {
        echo "\n📦 Testing bulk operations...\n";
        
        // Test bulk get
        $all_fields = $this->yoast_handler->get_yoast_fields($this->test_post_id);
        $expected_fields = array('meta_title', 'meta_description', 'focus_keywords', 'meta_robots_noindex', 'meta_robots_nofollow', 'canonical', 'primary_category', 'seo_score');
        
        $missing_fields = array_diff($expected_fields, array_keys($all_fields));
        echo "Bulk Get: " . (empty($missing_fields) ? '✅ All fields present' : '❌ Missing fields: ' . implode(', ', $missing_fields)) . "\n";
        
        // Test bulk set
        $test_fields = array(
            'meta_title' => 'Updated Bulk Title',
            'meta_description' => 'Updated bulk description for testing',
            'focus_keywords' => 'bulk, testing, updated',
            'canonical' => 'https://example.com/updated-post'
        );
        
        $results = $this->yoast_handler->set_yoast_fields($this->test_post_id, $test_fields);
        $updated_fields = $this->yoast_handler->get_yoast_fields($this->test_post_id);
        
        $success = true;
        foreach ($test_fields as $field => $value) {
            if ($updated_fields[$field] !== $value) {
                $success = false;
                break;
            }
        }
        
        echo "Bulk Set: " . ($success ? '✅ All fields updated' : '❌ Some fields failed to update') . "\n";
    }
    
    /**
     * Test validation and sanitization
     */
    private function test_validation_and_sanitization() {
        echo "\n🧹 Testing validation and sanitization...\n";
        
        // Test XSS prevention
        $malicious_title = '<script>alert("XSS")</script>Test Title';
        $this->yoast_handler->set_yoast_meta_title($this->test_post_id, $malicious_title);
        $retrieved = $this->yoast_handler->get_yoast_meta_title($this->test_post_id);
        $sanitized = sanitize_text_field($malicious_title);
        echo "XSS Prevention: " . ($retrieved === $sanitized ? '✅ Sanitized correctly' : '❌ XSS not prevented') . "\n";
        
        // Test URL sanitization
        $malicious_url = 'javascript:alert("XSS")';
        $this->yoast_handler->set_yoast_canonical($this->test_post_id, $malicious_url);
        $retrieved = $this->yoast_handler->get_yoast_canonical($this->test_post_id);
        echo "URL Sanitization: " . ($retrieved === '' ? '✅ Malicious URL blocked' : '❌ Malicious URL not blocked') . "\n";
        
        // Test numeric validation
        $invalid_category = 'not-a-number';
        $result = $this->yoast_handler->set_yoast_primary_category($this->test_post_id, $invalid_category);
        $retrieved = $this->yoast_handler->get_yoast_primary_category($this->test_post_id);
        echo "Numeric Validation: " . ($retrieved == 0 ? '✅ Invalid number handled' : '❌ Invalid number not handled') . "\n";
    }
    
    /**
     * Test error handling
     */
    private function test_error_handling() {
        echo "\n⚠️ Testing error handling...\n";
        
        // Test invalid post ID
        $result = $this->yoast_handler->get_yoast_fields(999999);
        echo "Invalid Post ID Get: " . ($result === false ? '✅ Handled correctly' : '❌ Not handled') . "\n";
        
        $result = $this->yoast_handler->set_yoast_meta_title(999999, 'test');
        echo "Invalid Post ID Set: " . ($result === false ? '✅ Handled correctly' : '❌ Not handled') . "\n";
        
        // Test non-numeric post ID
        $result = $this->yoast_handler->get_yoast_fields('invalid');
        echo "Non-numeric Post ID Get: " . ($result === false ? '✅ Handled correctly' : '❌ Not handled') . "\n";
        
        $result = $this->yoast_handler->set_yoast_meta_title('invalid', 'test');
        echo "Non-numeric Post ID Set: " . ($result === false ? '✅ Handled correctly' : '❌ Not handled') . "\n";
    }
    
    /**
     * Test cache clearing
     */
    private function test_cache_clearing() {
        echo "\n🗑️ Testing cache clearing...\n";
        
        // Set a value and verify it's cached
        $this->yoast_handler->set_yoast_meta_title($this->test_post_id, 'Cache Test Title');
        $cached_value = $this->yoast_handler->get_yoast_meta_title($this->test_post_id);
        
        // Update the value and check if cache is cleared
        $this->yoast_handler->set_yoast_meta_title($this->test_post_id, 'Updated Cache Test Title');
        $updated_value = $this->yoast_handler->get_yoast_meta_title($this->test_post_id);
        
        echo "Cache Clearing: " . ($updated_value === 'Updated Cache Test Title' ? '✅ Cache cleared correctly' : '❌ Cache not cleared') . "\n";
    }
    
    /**
     * Clean up test post
     */
    private function cleanup_test_post() {
        echo "\n🧹 Cleaning up test post...\n";
        
        if ($this->test_post_id) {
            $result = wp_delete_post($this->test_post_id, true);
            echo "Cleanup: " . ($result ? '✅ Test post deleted' : '❌ Failed to delete test post') . "\n";
        }
    }
}

// Run tests if this file is accessed directly
if (defined('WP_CLI') && WP_CLI) {
    $test = new PostCrafter_Getter_Setter_Test();
    $test->run_all_tests();
} 
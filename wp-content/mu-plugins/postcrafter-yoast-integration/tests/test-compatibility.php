<?php
/**
 * Test file for Yoast compatibility functionality
 *
 * This file tests the compatibility handling with different Yoast versions
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class PostCrafter_Compatibility_Test {

    private $compatibility;

    /**
     * Constructor
     */
    public function __construct() {
        $this->compatibility = new PostCrafter_Yoast_Compatibility();
    }

    /**
     * Run all compatibility tests
     */
    public function run_all_tests() {
        echo "🧪 Running Compatibility Tests...\n\n";

        $this->test_yoast_detection();
        $this->test_version_detection();
        $this->test_compatibility_status();
        $this->test_meta_key_mappings();
        $this->test_fallback_functionality();
        $this->test_version_categories();
        $this->test_admin_notices();

        echo "\n✅ All compatibility tests completed!\n";
    }

    /**
     * Test Yoast plugin detection
     */
    private function test_yoast_detection() {
        echo "🔍 Testing Yoast plugin detection...\n";

        // Test active plugin detection
        $is_active = $this->compatibility->is_yoast_active();
        echo "Yoast Active Detection: " . ($is_active ? '✅ Active' : '❌ Inactive') . "\n";

        // Test with mock active plugins
        $original_plugins = get_option('active_plugins');
        update_option('active_plugins', array('wordpress-seo/wp-seo.php'));
        
        $is_active_mock = $this->compatibility->is_yoast_active();
        echo "Mock Active Detection: " . ($is_active_mock ? '✅ Success' : '❌ Failed') . "\n";

        // Restore original plugins
        update_option('active_plugins', $original_plugins);
    }

    /**
     * Test version detection
     */
    private function test_version_detection() {
        echo "\n📋 Testing version detection...\n";

        $version = $this->compatibility->get_yoast_version();
        echo "Current Version: " . ($version ? $version : 'Not detected') . "\n";

        // Test version compatibility
        $compatible_14 = $this->compatibility->is_version_compatible('14.0');
        $compatible_15 = $this->compatibility->is_version_compatible('15.0');
        $compatible_20 = $this->compatibility->is_version_compatible('20.0');

        echo "Compatible with 14.0+: " . ($compatible_14 ? '✅ Yes' : '❌ No') . "\n";
        echo "Compatible with 15.0+: " . ($compatible_15 ? '✅ Yes' : '❌ No') . "\n";
        echo "Compatible with 20.0+: " . ($compatible_20 ? '✅ Yes' : '❌ No') . "\n";
    }

    /**
     * Test compatibility status
     */
    private function test_compatibility_status() {
        echo "\n📊 Testing compatibility status...\n";

        $status = $this->compatibility->get_compatibility_status();
        
        echo "Status Summary:\n";
        echo "- Active: " . ($status['active'] ? '✅ Yes' : '❌ No') . "\n";
        echo "- Compatible: " . ($status['compatible'] ? '✅ Yes' : '❌ No') . "\n";
        echo "- Current Version: " . ($status['current_version'] ?: 'Unknown') . "\n";
        echo "- Recommended Version: " . $status['recommended_version'] . "\n";
        
        if (!empty($status['warnings'])) {
            echo "- Warnings: " . implode(', ', $status['warnings']) . "\n";
        }
    }

    /**
     * Test meta key mappings
     */
    private function test_meta_key_mappings() {
        echo "\n🔑 Testing meta key mappings...\n";

        $test_versions = array('13.0', '14.0', '15.0', '20.0', '21.0');
        $test_fields = array('title', 'description', 'focus_keywords', 'robots_noindex');

        foreach ($test_fields as $field) {
            echo "\nField: {$field}\n";
            foreach ($test_versions as $version) {
                $meta_key = $this->compatibility->get_meta_key($field, $version);
                echo "  {$version}: {$meta_key}\n";
            }
        }
    }

    /**
     * Test fallback functionality
     */
    private function test_fallback_functionality() {
        echo "\n🔄 Testing fallback functionality...\n";

        // Test fallback meta creation
        $test_post_id = wp_insert_post(array(
            'post_title' => 'Test Post for Fallback',
            'post_content' => 'Test content',
            'post_status' => 'publish'
        ));

        if ($test_post_id) {
            // Test fallback meta creation
            $this->compatibility->create_fallback_meta($test_post_id, '_postcrafter_meta_title', 'Test Fallback Title');
            
            $retrieved_title = get_post_meta($test_post_id, '_yoast_wpseo_title', true);
            echo "Fallback Meta Creation: " . ($retrieved_title === 'Test Fallback Title' ? '✅ Success' : '❌ Failed') . "\n";

            // Test fallback meta update
            $this->compatibility->update_fallback_meta(1, $test_post_id, '_postcrafter_meta_description', 'Test Fallback Description');
            
            $retrieved_desc = get_post_meta($test_post_id, '_yoast_wpseo_metadesc', true);
            echo "Fallback Meta Update: " . ($retrieved_desc === 'Test Fallback Description' ? '✅ Success' : '❌ Failed') . "\n";

            // Cleanup
            wp_delete_post($test_post_id, true);
        } else {
            echo "❌ Failed to create test post for fallback testing\n";
        }
    }

    /**
     * Test version categories
     */
    private function test_version_categories() {
        echo "\n🏷️ Testing version categories...\n";

        $test_cases = array(
            '13.0' => 'legacy',
            '13.9' => 'legacy',
            '14.0' => 'modern',
            '15.0' => 'modern',
            '19.9' => 'modern',
            '20.0' => 'new',
            '21.0' => 'new',
            '22.0' => 'new'
        );

        foreach ($test_cases as $version => $expected_category) {
            // Use reflection to test private method
            $reflection = new ReflectionClass($this->compatibility);
            $method = $reflection->getMethod('get_version_category');
            $method->setAccessible(true);
            
            $actual_category = $method->invoke($this->compatibility, $version);
            $result = ($actual_category === $expected_category) ? '✅' : '❌';
            echo "{$version} -> {$actual_category} (expected: {$expected_category}) {$result}\n";
        }
    }

    /**
     * Test admin notices
     */
    private function test_admin_notices() {
        echo "\n📢 Testing admin notices...\n";

        // Test notice display (this will output HTML in CLI, but that's okay for testing)
        ob_start();
        $this->compatibility->display_compatibility_notices();
        $notice_output = ob_get_clean();
        
        $has_notice = !empty($notice_output);
        echo "Admin Notice Generation: " . ($has_notice ? '✅ Generated' : '❌ No notice') . "\n";
        
        if ($has_notice) {
            echo "Notice contains compatibility info: " . (strpos($notice_output, 'PostCrafter') !== false ? '✅ Yes' : '❌ No') . "\n";
        }
    }

    /**
     * Test compatibility filter
     */
    private function test_compatibility_filter() {
        echo "\n🔧 Testing compatibility filter...\n";

        $status = apply_filters('postcrafter_yoast_compatibility_check', null);
        
        if (is_array($status)) {
            echo "Filter returns status array: ✅ Success\n";
            echo "- Active: " . ($status['active'] ? 'Yes' : 'No') . "\n";
            echo "- Compatible: " . ($status['compatible'] ? 'Yes' : 'No') . "\n";
        } else {
            echo "Filter returns status: ❌ Failed\n";
        }
    }

    /**
     * Test with different Yoast versions
     */
    private function test_version_specific_functionality() {
        echo "\n🎯 Testing version-specific functionality...\n";

        $test_versions = array(
            '13.0' => 'Legacy',
            '14.0' => 'Modern',
            '20.0' => 'New'
        );

        foreach ($test_versions as $version => $category) {
            echo "\nTesting {$category} version ({$version}):\n";
            
            // Test meta key retrieval for each version
            $title_key = $this->compatibility->get_meta_key('title', $version);
            $desc_key = $this->compatibility->get_meta_key('description', $version);
            
            echo "  Title key: {$title_key}\n";
            echo "  Description key: {$desc_key}\n";
            
            // Test compatibility check
            $is_compatible = $this->compatibility->is_version_compatible('14.0');
            echo "  Compatible with 14.0+: " . ($is_compatible ? '✅ Yes' : '❌ No') . "\n";
        }
    }
}

// Run tests if this file is accessed directly
if (defined('WP_CLI') && WP_CLI) {
    $test = new PostCrafter_Compatibility_Test();
    $test->run_all_tests();
}

// Also run tests if accessed via web (for debugging)
if (isset($_GET['run_compatibility_tests']) && current_user_can('manage_options')) {
    $test = new PostCrafter_Compatibility_Test();
    $test->run_all_tests();
    exit;
} 
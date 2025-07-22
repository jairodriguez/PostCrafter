<?php
/**
 * Test file for REST API field registration
 * 
 * This file can be used to test the REST API functionality
 * Run this in a WordPress environment to verify field registration
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class PostCrafter_REST_API_Test {
    
    /**
     * Test REST API field registration
     */
    public static function test_field_registration() {
        // Test if fields are registered
        $rest_server = rest_get_server();
        $routes = $rest_server->get_routes();
        
        // Check if our custom routes are registered
        $custom_routes = array(
            '/postcrafter/v1/yoast-fields/(?P<id>\\d+)',
            '/wp/v2/posts' // Standard posts endpoint
        );
        
        foreach ($custom_routes as $route) {
            if (isset($routes[$route])) {
                echo "✅ Route registered: {$route}\n";
            } else {
                echo "❌ Route not found: {$route}\n";
            }
        }
        
        // Test field registration on posts endpoint
        $post_fields = get_registered_rest_fields('post');
        $expected_fields = array('yoast_meta_title', 'yoast_meta_description', 'yoast_focus_keywords');
        
        foreach ($expected_fields as $field) {
            if (isset($post_fields[$field])) {
                echo "✅ Field registered: {$field}\n";
            } else {
                echo "❌ Field not found: {$field}\n";
            }
        }
    }
    
    /**
     * Test REST API endpoint functionality
     */
    public static function test_endpoint_functionality() {
        // Create a test post
        $post_id = wp_insert_post(array(
            'post_title' => 'Test Post for REST API',
            'post_content' => 'Test content',
            'post_status' => 'publish'
        ));
        
        if (is_wp_error($post_id)) {
            echo "❌ Failed to create test post\n";
            return;
        }
        
        echo "✅ Test post created with ID: {$post_id}\n";
        
        // Test setting Yoast fields
        $test_data = array(
            'meta_title' => 'Test Meta Title',
            'meta_description' => 'Test meta description for SEO optimization',
            'focus_keywords' => 'test, seo, wordpress'
        );
        
        // Update fields via REST API
        $request = new WP_REST_Request('POST', "/postcrafter/v1/yoast-fields/{$post_id}");
        $request->set_param('meta_title', $test_data['meta_title']);
        $request->set_param('meta_description', $test_data['meta_description']);
        $request->set_param('focus_keywords', $test_data['focus_keywords']);
        
        $response = rest_do_request($request);
        
        if ($response->is_error()) {
            echo "❌ Failed to update Yoast fields: " . $response->get_error_message() . "\n";
        } else {
            echo "✅ Yoast fields updated successfully\n";
        }
        
        // Test getting fields
        $request = new WP_REST_Request('GET', "/postcrafter/v1/yoast-fields/{$post_id}");
        $response = rest_do_request($request);
        
        if ($response->is_error()) {
            echo "❌ Failed to get Yoast fields: " . $response->get_error_message() . "\n";
        } else {
            $data = $response->get_data();
            echo "✅ Yoast fields retrieved successfully\n";
            echo "Meta Title: " . $data['meta_title'] . "\n";
            echo "Meta Description: " . $data['meta_description'] . "\n";
            echo "Focus Keywords: " . $data['focus_keywords'] . "\n";
        }
        
        // Clean up test post
        wp_delete_post($post_id, true);
        echo "✅ Test post cleaned up\n";
    }
}

// Run tests if this file is accessed directly
if (defined('WP_CLI') && WP_CLI) {
    echo "Running REST API tests...\n";
    PostCrafter_REST_API_Test::test_field_registration();
    PostCrafter_REST_API_Test::test_endpoint_functionality();
} 
<?php
/**
 * Test Configuration for PostCrafter Yoast Integration
 * 
 * This file contains common test configuration and test data
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class PostCrafter_Test_Config {
    
    // Test post data
    public static $test_post_data = array(
        'title' => 'Test Post for PostCrafter',
        'content' => 'This is a test post content for PostCrafter Yoast integration testing.',
        'excerpt' => 'Test excerpt for SEO testing.',
        'status' => 'publish'
    );
    
    // Test Yoast meta data
    public static $test_yoast_data = array(
        'meta_title' => 'Test Meta Title - PostCrafter SEO Testing',
        'meta_description' => 'This is a test meta description for PostCrafter Yoast integration testing. It should be between 50-160 characters.',
        'focus_keywords' => 'test, postcrafter, yoast, seo, wordpress',
        'canonical' => 'https://example.com/test-post',
        'primary_category' => 1,
        'meta_robots_noindex' => 'index',
        'meta_robots_nofollow' => 'follow'
    );
    
    // Test validation data
    public static function get_test_validation_data() {
        return array(
            'valid_title' => 'Valid Meta Title for Testing',
            'invalid_title_short' => 'Short',
            'invalid_title_long' => str_repeat('A', 100),
            'valid_description' => 'This is a valid meta description that meets the length requirements for SEO testing purposes.',
            'invalid_description_short' => 'Too short',
            'invalid_description_long' => str_repeat('A', 200),
            'valid_keywords' => 'keyword1, keyword2, keyword3',
            'invalid_keywords_many' => 'keyword1, keyword2, keyword3, keyword4, keyword5, keyword6, keyword7, keyword8, keyword9, keyword10, keyword11',
            'valid_url' => 'https://example.com/valid-url',
            'invalid_url' => 'not-a-valid-url',
            'malicious_content' => '<script>alert("XSS")</script>',
            'sql_injection' => "'; DROP TABLE posts; --"
        );
    }
    
    // Test categories and tags
    public static $test_categories = array(
        'Technology',
        'WordPress',
        'SEO'
    );
    
    public static $test_tags = array(
        'postcrafter',
        'yoast',
        'testing',
        'wordpress'
    );
    
    // Test image data
    public static $test_image_data = array(
        'url' => 'https://via.placeholder.com/800x600/0066cc/ffffff?text=Test+Image',
        'alt_text' => 'Test image for PostCrafter',
        'title' => 'Test Image Title'
    );
    
    // API test data
    public static function get_test_api_data() {
        return array(
            'valid_request' => array(
                'title' => 'API Test Post',
                'content' => 'This is a test post created via API.',
                'excerpt' => 'API test excerpt.',
                'status' => 'publish',
                'categories' => array('Technology'),
                'tags' => array('api', 'test'),
                'yoast_meta_title' => 'API Test Meta Title',
                'yoast_meta_description' => 'This is a test meta description for API testing.',
                'yoast_focus_keywords' => 'api, test, wordpress'
            ),
            'invalid_request' => array(
                'title' => '',
                'content' => '',
                'yoast_meta_title' => 'A' . str_repeat('A', 99)
            )
        );
    }
    
    // Test user data
    public static $test_user_data = array(
        'username' => 'testuser',
        'email' => 'test@example.com',
        'role' => 'administrator'
    );
    
    /**
     * Get test post ID or create one
     */
    public static function get_test_post_id() {
        $posts = get_posts(array(
            'title' => self::$test_post_data['title'],
            'post_type' => 'post',
            'post_status' => 'any',
            'numberposts' => 1
        ));
        
        if (!empty($posts)) {
            return $posts[0]->ID;
        }
        
        // Create test post
        $post_id = wp_insert_post(array(
            'post_title' => self::$test_post_data['title'],
            'post_content' => self::$test_post_data['content'],
            'post_excerpt' => self::$test_post_data['excerpt'],
            'post_status' => self::$test_post_data['status'],
            'post_author' => get_current_user_id()
        ));
        
        return $post_id;
    }
    
    /**
     * Clean up test data
     */
    public static function cleanup_test_data() {
        // Delete test posts
        $posts = get_posts(array(
            'title' => self::$test_post_data['title'],
            'post_type' => 'post',
            'post_status' => 'any',
            'numberposts' => -1
        ));
        
        foreach ($posts as $post) {
            wp_delete_post($post->ID, true);
        }
        
        // Delete test categories
        foreach (self::$test_categories as $category_name) {
            $term = get_term_by('name', $category_name, 'category');
            if ($term) {
                wp_delete_term($term->term_id, 'category');
            }
        }
        
        // Delete test tags
        foreach (self::$test_tags as $tag_name) {
            $term = get_term_by('name', $tag_name, 'post_tag');
            if ($term) {
                wp_delete_term($term->term_id, 'post_tag');
            }
        }
        
        echo "🧹 Test data cleaned up successfully.\n";
    }
    
    /**
     * Setup test environment
     */
    public static function setup_test_environment() {
        // Ensure Yoast is active for testing
        if (!is_plugin_active('wordpress-seo/wp-seo.php')) {
            echo "⚠️  Warning: Yoast SEO plugin is not active. Some tests may fail.\n";
        }
        
        // Create test categories if they don't exist
        foreach (self::$test_categories as $category_name) {
            if (!term_exists($category_name, 'category')) {
                wp_insert_term($category_name, 'category');
            }
        }
        
        // Create test tags if they don't exist
        foreach (self::$test_tags as $tag_name) {
            if (!term_exists($tag_name, 'post_tag')) {
                wp_insert_term($tag_name, 'post_tag');
            }
        }
        
        echo "🔧 Test environment setup complete.\n";
    }
    
    /**
     * Get test API endpoint
     */
    public static function get_test_api_endpoint() {
        return rest_url('postcrafter/v1/yoast-fields/');
    }
    
    /**
     * Get test authentication headers
     */
    public static function get_test_auth_headers() {
        return array(
            'Authorization' => 'Basic ' . base64_encode('testuser:testpass'),
            'Content-Type' => 'application/json'
        );
    }
} 
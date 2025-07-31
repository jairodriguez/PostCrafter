<?php
/**
 * Debug test for PostCrafter plugin
 */

// Add a simple test endpoint
add_action('rest_api_init', function () {
    register_rest_route('postcrafter/v1', '/debug', array(
        'methods' => 'GET',
        'callback' => 'postcrafter_debug_test',
        'permission_callback' => '__return_true'
    ));
});

function postcrafter_debug_test() {
    // Test if our plugin is loaded
    $plugin_loaded = class_exists('PostCrafter_SEO_Integration');
    
    // Test if Yoast is available
    $yoast_available = class_exists('WPSEO_Meta');
    
    // Test creating a simple post
    $test_post_data = array(
        'post_title' => 'Debug Test Post',
        'post_content' => 'This is a test post to debug Yoast meta handling.',
        'post_status' => 'publish',
        'post_type' => 'post'
    );
    
    $post_id = wp_insert_post($test_post_data);
    
    if ($post_id && !is_wp_error($post_id)) {
        // Test setting Yoast meta manually
        update_post_meta($post_id, '_yoast_wpseo_title', 'Test SEO Title');
        update_post_meta($post_id, '_yoast_wpseo_metadesc', 'Test SEO Description');
        update_post_meta($post_id, '_yoast_wpseo_focuskw', 'test keyword');
        
        // Check if meta was set
        $meta_title = get_post_meta($post_id, '_yoast_wpseo_title', true);
        $meta_desc = get_post_meta($post_id, '_yoast_wpseo_metadesc', true);
        $focus_kw = get_post_meta($post_id, '_yoast_wpseo_focuskw', true);
        
        return array(
            'success' => true,
            'plugin_loaded' => $plugin_loaded,
            'yoast_available' => $yoast_available,
            'test_post_id' => $post_id,
            'meta_title_set' => !empty($meta_title),
            'meta_desc_set' => !empty($meta_desc),
            'focus_kw_set' => !empty($focus_kw),
            'meta_title_value' => $meta_title,
            'meta_desc_value' => $meta_desc,
            'focus_kw_value' => $focus_kw
        );
    }
    
    return array(
        'success' => false,
        'plugin_loaded' => $plugin_loaded,
        'yoast_available' => $yoast_available,
        'error' => 'Failed to create test post'
    );
} 
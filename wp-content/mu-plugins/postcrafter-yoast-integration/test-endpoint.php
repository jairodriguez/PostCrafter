<?php
/**
 * Test endpoint for PostCrafter plugin debugging
 */

add_action('rest_api_init', function () {
    register_rest_route('postcrafter/v1', '/test', array(
        'methods' => 'POST',
        'callback' => 'postcrafter_test_endpoint',
        'permission_callback' => '__return_true'
    ));
});

function postcrafter_test_endpoint($request) {
    $params = $request->get_params();
    
    error_log("PostCrafter Test: Received data: " . print_r($params, true));
    
    // Test creating a post with Yoast meta
    $post_data = array(
        'post_title' => 'Test Post from PostCrafter',
        'post_content' => 'This is a test post to verify Yoast meta handling.',
        'post_status' => 'publish',
        'post_type' => 'post'
    );
    
    $post_id = wp_insert_post($post_data);
    
    if ($post_id && !is_wp_error($post_id)) {
        // Test Yoast meta setting
        if (!empty($params['yoast'])) {
            error_log("PostCrafter Test: Setting Yoast meta for post $post_id");
            
            $yoast_meta = $params['yoast'];
            
            if (!empty($yoast_meta['meta_title'])) {
                update_post_meta($post_id, '_yoast_wpseo_title', sanitize_text_field($yoast_meta['meta_title']));
                error_log("PostCrafter Test: Set meta title: " . $yoast_meta['meta_title']);
            }
            
            if (!empty($yoast_meta['meta_description'])) {
                update_post_meta($post_id, '_yoast_wpseo_metadesc', sanitize_textarea_field($yoast_meta['meta_description']));
                error_log("PostCrafter Test: Set meta description: " . $yoast_meta['meta_description']);
            }
            
            if (!empty($yoast_meta['focus_keyword'])) {
                update_post_meta($post_id, '_yoast_wpseo_focuskw', sanitize_text_field($yoast_meta['focus_keyword']));
                error_log("PostCrafter Test: Set focus keyword: " . $yoast_meta['focus_keyword']);
            }
            
            // Force Yoast to update
            if (class_exists('WPSEO_Meta')) {
                do_action('wpseo_save_compare_data', $post_id);
                error_log("PostCrafter Test: Triggered Yoast save action");
            }
        }
        
        return array(
            'success' => true,
            'post_id' => $post_id,
            'message' => 'Test post created successfully',
            'yoast_meta_set' => !empty($params['yoast'])
        );
    }
    
    return array(
        'success' => false,
        'error' => 'Failed to create test post'
    );
} 
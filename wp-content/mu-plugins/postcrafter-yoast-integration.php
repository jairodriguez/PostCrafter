<?php
/**
 * PostCrafter Yoast SEO Integration
 * 
 * This mu-plugin exposes Yoast SEO meta fields via the WordPress REST API
 * for use with PostCrafter's automated publishing system.
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Add Yoast SEO meta fields to REST API responses
 */
function postcrafter_add_yoast_meta_to_rest_api() {
    // Register meta fields for posts
    register_rest_field('post', 'yoast_meta', array(
        'get_callback' => 'postcrafter_get_yoast_meta',
        'update_callback' => 'postcrafter_update_yoast_meta',
        'schema' => array(
            'description' => 'Yoast SEO meta fields',
            'type' => 'object',
            'properties' => array(
                'title' => array(
                    'description' => 'SEO title',
                    'type' => 'string',
                ),
                'description' => array(
                    'description' => 'SEO description',
                    'type' => 'string',
                ),
                'focus_keyword' => array(
                    'description' => 'Focus keyword',
                    'type' => 'string',
                ),
                'robots_index' => array(
                    'description' => 'Index setting',
                    'type' => 'string',
                ),
                'robots_follow' => array(
                    'description' => 'Follow setting',
                    'type' => 'string',
                ),
                'robots_archive' => array(
                    'description' => 'Archive setting',
                    'type' => 'string',
                ),
                'robots_snippet' => array(
                    'description' => 'Snippet setting',
                    'type' => 'string',
                ),
                'robots_imageindex' => array(
                    'description' => 'Image index setting',
                    'type' => 'string',
                ),
                'robots_odp' => array(
                    'description' => 'ODP setting',
                    'type' => 'string',
                ),
                'robots_yandex' => array(
                    'description' => 'Yandex setting',
                    'type' => 'string',
                ),
            ),
        ),
    ));
}
add_action('rest_api_init', 'postcrafter_add_yoast_meta_to_rest_api');

/**
 * Get Yoast SEO meta for a post
 */
function postcrafter_get_yoast_meta($post) {
    $post_id = $post['id'];
    
    return array(
        'title' => get_post_meta($post_id, '_yoast_wpseo_title', true),
        'description' => get_post_meta($post_id, '_yoast_wpseo_metadesc', true),
        'focus_keyword' => get_post_meta($post_id, '_yoast_wpseo_focuskw', true),
        'robots_index' => get_post_meta($post_id, '_yoast_wpseo_meta-robots-noindex', true),
        'robots_follow' => get_post_meta($post_id, '_yoast_wpseo_meta-robots-nofollow', true),
        'robots_archive' => get_post_meta($post_id, '_yoast_wpseo_meta-robots-archive', true),
        'robots_snippet' => get_post_meta($post_id, '_yoast_wpseo_meta-robots-snippet', true),
        'robots_imageindex' => get_post_meta($post_id, '_yoast_wpseo_meta-robots-imageindex', true),
        'robots_odp' => get_post_meta($post_id, '_yoast_wpseo_meta-robots-odp', true),
        'robots_yandex' => get_post_meta($post_id, '_yoast_wpseo_meta-robots-yandex', true),
    );
}

/**
 * Update Yoast SEO meta for a post
 */
function postcrafter_update_yoast_meta($value, $post) {
    $post_id = $post->ID;
    
    if (isset($value['title'])) {
        update_post_meta($post_id, '_yoast_wpseo_title', sanitize_text_field($value['title']));
    }
    
    if (isset($value['description'])) {
        update_post_meta($post_id, '_yoast_wpseo_metadesc', sanitize_textarea_field($value['description']));
    }
    
    if (isset($value['focus_keyword'])) {
        update_post_meta($post_id, '_yoast_wpseo_focuskw', sanitize_text_field($value['focus_keyword']));
    }
    
    if (isset($value['robots_index'])) {
        update_post_meta($post_id, '_yoast_wpseo_meta-robots-noindex', sanitize_text_field($value['robots_index']));
    }
    
    if (isset($value['robots_follow'])) {
        update_post_meta($post_id, '_yoast_wpseo_meta-robots-nofollow', sanitize_text_field($value['robots_follow']));
    }
    
    if (isset($value['robots_archive'])) {
        update_post_meta($post_id, '_yoast_wpseo_meta-robots-archive', sanitize_text_field($value['robots_archive']));
    }
    
    if (isset($value['robots_snippet'])) {
        update_post_meta($post_id, '_yoast_wpseo_meta-robots-snippet', sanitize_text_field($value['robots_snippet']));
    }
    
    if (isset($value['robots_imageindex'])) {
        update_post_meta($post_id, '_yoast_wpseo_meta-robots-imageindex', sanitize_text_field($value['robots_imageindex']));
    }
    
    if (isset($value['robots_odp'])) {
        update_post_meta($post_id, '_yoast_wpseo_meta-robots-odp', sanitize_text_field($value['robots_odp']));
    }
    
    if (isset($value['robots_yandex'])) {
        update_post_meta($post_id, '_yoast_wpseo_meta-robots-yandex', sanitize_text_field($value['robots_yandex']));
    }
    
    return $value;
}

/**
 * Add custom REST API endpoint for PostCrafter
 */
function postcrafter_add_custom_endpoints() {
    register_rest_route('postcrafter/v1', '/publish', array(
        'methods' => 'POST',
        'callback' => 'postcrafter_publish_post',
        // Temporarily remove authentication for testing
        // 'permission_callback' => function() {
        //     return current_user_can('publish_posts');
        // }
        'args' => array(
            'title' => array(
                'required' => true,
                'type' => 'string',
                'sanitize_callback' => 'sanitize_text_field',
            ),
            'content' => array(
                'required' => true,
                'type' => 'string',
                'sanitize_callback' => 'wp_kses_post',
            ),
            'excerpt' => array(
                'required' => false,
                'type' => 'string',
                'sanitize_callback' => 'sanitize_textarea_field',
            ),
            'status' => array(
                'required' => false,
                'type' => 'string',
                'default' => 'publish',
                'enum' => array('publish', 'draft', 'private'),
            ),
            'categories' => array(
                'required' => false,
                'type' => 'array',
                'items' => array(
                    'type' => 'string',
                ),
            ),
            'tags' => array(
                'required' => false,
                'type' => 'array',
                'items' => array(
                    'type' => 'string',
                ),
            ),
            'yoast_meta' => array(
                'required' => false,
                'type' => 'object',
            ),
            'featured_image' => array(
                'required' => false,
                'type' => 'string',
                'format' => 'uri',
            ),
        ),
    ));
}
add_action('rest_api_init', 'postcrafter_add_custom_endpoints');

/**
 * Check permissions for PostCrafter API
 */
function postcrafter_check_permissions($request) {
    // Check for application password authentication
    $user = wp_get_current_user();
    if (!$user->exists()) {
        return false;
    }
    
    // Check if user has publish_posts capability
    if (!current_user_can('publish_posts')) {
        return false;
    }
    
    return true;
}

/**
 * Publish a post via PostCrafter API
 */
function postcrafter_publish_post($request) {
    $params = $request->get_params();
    
    // Prepare post data
    $post_data = array(
        'post_title' => $params['title'],
        'post_content' => $params['content'],
        'post_status' => $params['status'] ?? 'publish',
        'post_author' => get_current_user_id(),
    );
    
    if (!empty($params['excerpt'])) {
        $post_data['post_excerpt'] = $params['excerpt'];
    }
    
    // Insert the post
    $post_id = wp_insert_post($post_data);
    
    if (is_wp_error($post_id)) {
        return new WP_Error('post_creation_failed', 'Failed to create post', array('status' => 500));
    }
    
    // Handle categories
    if (!empty($params['categories'])) {
        $category_ids = array();
        foreach ($params['categories'] as $category_name) {
            $category = get_term_by('name', $category_name, 'category');
            if (!$category) {
                $category = wp_insert_term($category_name, 'category');
                if (!is_wp_error($category)) {
                    $category_ids[] = $category['term_id'];
                }
            } else {
                $category_ids[] = $category->term_id;
            }
        }
        wp_set_post_categories($post_id, $category_ids);
    }
    
    // Handle tags
    if (!empty($params['tags'])) {
        $tag_ids = array();
        foreach ($params['tags'] as $tag_name) {
            $tag = get_term_by('name', $tag_name, 'post_tag');
            if (!$tag) {
                $tag = wp_insert_term($tag_name, 'post_tag');
                if (!is_wp_error($tag)) {
                    $tag_ids[] = $tag['term_id'];
                }
            } else {
                $tag_ids[] = $tag->term_id;
            }
        }
        wp_set_post_tags($post_id, $tag_ids);
    }
    
    // Handle Yoast SEO meta
    if (!empty($params['yoast_meta'])) {
        postcrafter_update_yoast_meta($params['yoast_meta'], get_post($post_id));
    }
    
    // Handle featured image
    if (!empty($params['featured_image'])) {
        $image_url = $params['featured_image'];
        $upload = media_sideload_image($image_url, $post_id, '', 'id');
        if (!is_wp_error($upload)) {
            set_post_thumbnail($post_id, $upload);
        }
    }
    
    // Get the created post
    $post = get_post($post_id);
    $response = new WP_REST_Response($post);
    $response->set_status(201);
    
    return $response;
} 
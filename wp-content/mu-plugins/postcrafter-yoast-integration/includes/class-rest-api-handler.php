<?php
/**
 * REST API Handler Class
 * 
 * Handles WordPress REST API integration for Yoast fields
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class PostCrafter_REST_API_Handler {
    
    /**
     * Constructor
     */
    public function __construct() {
        add_action('rest_api_init', array($this, 'register_rest_routes'));
        add_action('rest_api_init', array($this, 'register_yoast_fields'));
        add_filter('rest_prepare_post', array($this, 'add_yoast_fields_to_response'), 10, 3);
    }
    
    /**
     * Register custom REST API routes
     */
    public function register_rest_routes() {
        // Register route for getting Yoast fields
        register_rest_route('postcrafter/v1', '/yoast-fields/(?P<id>\d+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_yoast_fields_route'),
            'permission_callback' => array($this, 'check_permissions'),
            'args' => array(
                'id' => array(
                    'validate_callback' => function($param, $request, $key) {
                        return is_numeric($param);
                    }
                )
            )
        ));
        
        // Register route for updating Yoast fields
        register_rest_route('postcrafter/v1', '/yoast-fields/(?P<id>\d+)', array(
            'methods' => 'POST',
            'callback' => array($this, 'update_yoast_fields_route'),
            'permission_callback' => array($this, 'check_permissions'),
            'args' => array(
                'id' => array(
                    'validate_callback' => function($param, $request, $key) {
                        return is_numeric($param);
                    }
                ),
                'meta_title' => array(
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ),
                'meta_description' => array(
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_textarea_field'
                ),
                'focus_keywords' => array(
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                )
            )
        ));
    }
    
    /**
     * Check permissions for REST API access
     */
    public function check_permissions($request) {
        // Check if user is authenticated
        if (!is_user_logged_in()) {
            return false;
        }
        
        // Check if user has edit permissions
        $post_id = $request->get_param('id');
        if ($post_id) {
            return current_user_can('edit_post', $post_id);
        }
        
        return current_user_can('edit_posts');
    }
    
    /**
     * Get Yoast fields via REST API
     */
    public function get_yoast_fields_route($request) {
        $post_id = $request->get_param('id');
        
        // Check if post exists
        $post = get_post($post_id);
        if (!$post) {
            return new WP_Error('post_not_found', 'Post not found', array('status' => 404));
        }
        
        // Get Yoast fields
        $yoast_handler = new PostCrafter_Yoast_Field_Handler();
        $fields = $yoast_handler->get_yoast_fields($post_id);
        
        return rest_ensure_response($fields);
    }
    
    /**
     * Update Yoast fields via REST API
     */
    public function update_yoast_fields_route($request) {
        $post_id = $request->get_param('id');
        
        // Check if post exists
        $post = get_post($post_id);
        if (!$post) {
            return new WP_Error('post_not_found', 'Post not found', array('status' => 404));
        }
        
        // Get request parameters
        $meta_title = $request->get_param('meta_title');
        $meta_description = $request->get_param('meta_description');
        $focus_keywords = $request->get_param('focus_keywords');
        
        // Validate fields
        $yoast_handler = new PostCrafter_Yoast_Field_Handler();
        $fields = array(
            'meta_title' => $meta_title,
            'meta_description' => $meta_description,
            'focus_keywords' => $focus_keywords
        );
        
        $errors = $yoast_handler->validate_yoast_fields($fields);
        if (!empty($errors)) {
            return new WP_Error('validation_failed', 'Validation failed', array(
                'status' => 400,
                'errors' => $errors
            ));
        }
        
        // Update fields
        if ($meta_title !== null) {
            update_post_meta($post_id, '_yoast_wpseo_title', $meta_title);
        }
        
        if ($meta_description !== null) {
            update_post_meta($post_id, '_yoast_wpseo_metadesc', $meta_description);
        }
        
        if ($focus_keywords !== null) {
            update_post_meta($post_id, '_yoast_wpseo_focuskw', $focus_keywords);
        }
        
        // Return updated fields
        $updated_fields = $yoast_handler->get_yoast_fields($post_id);
        
        return rest_ensure_response(array(
            'success' => true,
            'message' => 'Yoast fields updated successfully',
            'data' => $updated_fields
        ));
    }
    
    /**
     * Add Yoast fields to post response
     */
    public function add_yoast_fields_to_response($response, $post, $request) {
        // Only add fields if requested
        if ($request->get_param('include_yoast_fields') !== 'true') {
            return $response;
        }
        
        $yoast_handler = new PostCrafter_Yoast_Field_Handler();
        $yoast_fields = $yoast_handler->get_yoast_fields($post->ID);
        
        $response->data['yoast_fields'] = $yoast_fields;
        
        return $response;
    }
    
    /**
     * Register Yoast fields with existing post endpoints
     */
    public function register_yoast_fields() {
        // Register fields for posts endpoint
        register_rest_field('post', 'yoast_meta_title', array(
            'get_callback' => array($this, 'get_yoast_meta_title'),
            'update_callback' => array($this, 'update_yoast_meta_title'),
            'schema' => array(
                'description' => 'Yoast SEO meta title',
                'type' => 'string',
                'context' => array('view', 'edit')
            )
        ));
        
        register_rest_field('post', 'yoast_meta_description', array(
            'get_callback' => array($this, 'get_yoast_meta_description'),
            'update_callback' => array($this, 'update_yoast_meta_description'),
            'schema' => array(
                'description' => 'Yoast SEO meta description',
                'type' => 'string',
                'context' => array('view', 'edit')
            )
        ));
        
        register_rest_field('post', 'yoast_focus_keywords', array(
            'get_callback' => array($this, 'get_yoast_focus_keywords'),
            'update_callback' => array($this, 'update_yoast_focus_keywords'),
            'schema' => array(
                'description' => 'Yoast SEO focus keywords',
                'type' => 'string',
                'context' => array('view', 'edit')
            )
        ));
    }
    
    /**
     * Get Yoast meta title for REST API
     */
    public function get_yoast_meta_title($post) {
        return get_post_meta($post['id'], '_yoast_wpseo_title', true);
    }
    
    /**
     * Update Yoast meta title via REST API
     */
    public function update_yoast_meta_title($value, $post) {
        if (is_string($value)) {
            update_post_meta($post->ID, '_yoast_wpseo_title', sanitize_text_field($value));
        }
        return $value;
    }
    
    /**
     * Get Yoast meta description for REST API
     */
    public function get_yoast_meta_description($post) {
        return get_post_meta($post['id'], '_yoast_wpseo_metadesc', true);
    }
    
    /**
     * Update Yoast meta description via REST API
     */
    public function update_yoast_meta_description($value, $post) {
        if (is_string($value)) {
            update_post_meta($post->ID, '_yoast_wpseo_metadesc', sanitize_textarea_field($value));
        }
        return $value;
    }
    
    /**
     * Get Yoast focus keywords for REST API
     */
    public function get_yoast_focus_keywords($post) {
        return get_post_meta($post['id'], '_yoast_wpseo_focuskw', true);
    }
    
    /**
     * Update Yoast focus keywords via REST API
     */
    public function update_yoast_focus_keywords($value, $post) {
        if (is_string($value)) {
            update_post_meta($post->ID, '_yoast_wpseo_focuskw', sanitize_text_field($value));
        }
        return $value;
    }
} 
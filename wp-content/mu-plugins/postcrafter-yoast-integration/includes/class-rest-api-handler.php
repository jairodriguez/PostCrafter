<?php
/**
 * REST API Handler Class
 * 
 * Handles WordPress REST API integration for both Yoast and RankMath SEO fields
 * 
 * @package PostCrafter
 * @since 1.1.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class PostCrafter_REST_API_Handler {
    
    /**
     * SEO Plugin Detector instance
     */
    private $detector;
    
    /**
     * Constructor
     */
    public function __construct() {
        // Load the SEO plugin detector
        $this->load_detector();
        
        add_action('rest_api_init', array($this, 'register_rest_routes'));
        add_action('rest_api_init', array($this, 'register_seo_fields'));
        add_filter('rest_prepare_post', array($this, 'add_seo_fields_to_response'), 10, 3);
    }
    
    /**
     * Load SEO plugin detector
     */
    private function load_detector() {
        if (!class_exists('PostCrafter_SEO_Plugin_Detector')) {
            require_once dirname(__FILE__) . '/class-seo-plugin-detector.php';
        }
        $this->detector = new PostCrafter_SEO_Plugin_Detector();
    }
    
    /**
     * Register custom REST API routes
     */
    public function register_rest_routes() {
        // Register unified route for getting SEO fields (works with both plugins)
        register_rest_route('postcrafter/v1', '/seo-fields/(?P<id>\d+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_seo_fields_route'),
            'permission_callback' => array($this, 'check_permissions'),
            'args' => array(
                'id' => array(
                    'validate_callback' => function($param, $request, $key) {
                        return is_numeric($param);
                    }
                )
            )
        ));
        
        // Register unified route for updating SEO fields (works with both plugins)
        register_rest_route('postcrafter/v1', '/seo-fields/(?P<id>\d+)', array(
            'methods' => 'POST',
            'callback' => array($this, 'update_seo_fields_route'),
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
                ),
                'canonical_url' => array(
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_url'
                ),
                'robots_noindex' => array(
                    'type' => 'boolean'
                ),
                'robots_nofollow' => array(
                    'type' => 'boolean'
                ),
                'opengraph_title' => array(
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ),
                'opengraph_description' => array(
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_textarea_field'
                ),
                'twitter_title' => array(
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_text_field'
                ),
                'twitter_description' => array(
                    'type' => 'string',
                    'sanitize_callback' => 'sanitize_textarea_field'
                )
            )
        ));
        
        // Legacy routes for backward compatibility
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
        
        // RankMath-specific routes
        register_rest_route('postcrafter/v1', '/rankmath-fields/(?P<id>\d+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_rankmath_fields_route'),
            'permission_callback' => array($this, 'check_permissions'),
            'args' => array(
                'id' => array(
                    'validate_callback' => function($param, $request, $key) {
                        return is_numeric($param);
                    }
                )
            )
        ));
        
        register_rest_route('postcrafter/v1', '/rankmath-fields/(?P<id>\d+)', array(
            'methods' => 'POST',
            'callback' => array($this, 'update_rankmath_fields_route'),
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
                ),
                'pillar_content' => array(
                    'type' => 'boolean'
                ),
                'breadcrumbs_title' => array(
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
     * Get SEO fields via unified REST API (works with both plugins)
     */
    public function get_seo_fields_route($request) {
        $post_id = $request->get_param('id');
        
        // Check if post exists
        $post = get_post($post_id);
        if (!$post) {
            return new WP_Error('post_not_found', 'Post not found', array('status' => 404));
        }
        
        // Check if any SEO plugin is active
        if (!$this->detector->has_supported_seo_plugin()) {
            return new WP_Error('no_seo_plugin', 'No supported SEO plugin detected', array('status' => 424));
        }
        
        $primary_plugin = $this->detector->get_primary_plugin();
        $fields = array();
        
        // Get fields from the appropriate plugin
        if ($primary_plugin === 'yoast') {
            $yoast_handler = new PostCrafter_Yoast_Field_Handler();
            $fields = $yoast_handler->get_yoast_fields($post_id);
        } elseif ($primary_plugin === 'rankmath') {
            if (!class_exists('PostCrafter_RankMath_Field_Handler')) {
                require_once dirname(__FILE__) . '/class-rankmath-field-handler.php';
            }
            $rankmath_handler = new PostCrafter_RankMath_Field_Handler();
            $fields = $rankmath_handler->get_rankmath_fields($post_id);
        }
        
        // Add plugin detection info
        $response_data = array(
            'plugin_detected' => $primary_plugin,
            'fields' => $fields,
            'detection_info' => $this->detector->get_api_detection_results()
        );
        
        return rest_ensure_response($response_data);
    }
    
    /**
     * Update SEO fields via unified REST API (works with both plugins)
     */
    public function update_seo_fields_route($request) {
        $post_id = $request->get_param('id');
        
        // Check if post exists
        $post = get_post($post_id);
        if (!$post) {
            return new WP_Error('post_not_found', 'Post not found', array('status' => 404));
        }
        
        // Check if any SEO plugin is active
        if (!$this->detector->has_supported_seo_plugin()) {
            return new WP_Error('no_seo_plugin', 'No supported SEO plugin detected', array('status' => 424));
        }
        
        $primary_plugin = $this->detector->get_primary_plugin();
        $update_results = array();
        
        // Get field values from request
        $meta_title = $request->get_param('meta_title');
        $meta_description = $request->get_param('meta_description');
        $focus_keywords = $request->get_param('focus_keywords');
        $canonical_url = $request->get_param('canonical_url');
        $robots_noindex = $request->get_param('robots_noindex');
        $robots_nofollow = $request->get_param('robots_nofollow');
        $opengraph_title = $request->get_param('opengraph_title');
        $opengraph_description = $request->get_param('opengraph_description');
        $twitter_title = $request->get_param('twitter_title');
        $twitter_description = $request->get_param('twitter_description');
        
        // Update fields based on the active plugin
        if ($primary_plugin === 'yoast') {
            $yoast_handler = new PostCrafter_Yoast_Field_Handler();
            
            if ($meta_title !== null) {
                $update_results['meta_title'] = $yoast_handler->set_yoast_meta_title($post_id, $meta_title);
            }
            if ($meta_description !== null) {
                $update_results['meta_description'] = $yoast_handler->set_yoast_meta_description($post_id, $meta_description);
            }
            if ($focus_keywords !== null) {
                $update_results['focus_keywords'] = $yoast_handler->set_yoast_focus_keywords($post_id, $focus_keywords);
            }
            if ($canonical_url !== null) {
                $update_results['canonical_url'] = $yoast_handler->set_yoast_canonical($post_id, $canonical_url);
            }
            if ($robots_noindex !== null) {
                $update_results['robots_noindex'] = $yoast_handler->set_yoast_meta_robots_noindex($post_id, $robots_noindex);
            }
            if ($robots_nofollow !== null) {
                $update_results['robots_nofollow'] = $yoast_handler->set_yoast_meta_robots_nofollow($post_id, $robots_nofollow);
            }
            
            $updated_fields = $yoast_handler->get_yoast_fields($post_id);
            
        } elseif ($primary_plugin === 'rankmath') {
            if (!class_exists('PostCrafter_RankMath_Field_Handler')) {
                require_once dirname(__FILE__) . '/class-rankmath-field-handler.php';
            }
            $rankmath_handler = new PostCrafter_RankMath_Field_Handler();
            
            if ($meta_title !== null) {
                $update_results['meta_title'] = $rankmath_handler->set_rankmath_meta_title($post_id, $meta_title);
            }
            if ($meta_description !== null) {
                $update_results['meta_description'] = $rankmath_handler->set_rankmath_meta_description($post_id, $meta_description);
            }
            if ($focus_keywords !== null) {
                $update_results['focus_keywords'] = $rankmath_handler->set_rankmath_focus_keywords($post_id, $focus_keywords);
            }
            if ($canonical_url !== null) {
                $update_results['canonical_url'] = $rankmath_handler->set_rankmath_canonical($post_id, $canonical_url);
            }
            if ($robots_noindex !== null) {
                $update_results['robots_noindex'] = $rankmath_handler->set_rankmath_meta_robots_noindex($post_id, $robots_noindex);
            }
            if ($robots_nofollow !== null) {
                $update_results['robots_nofollow'] = $rankmath_handler->set_rankmath_meta_robots_nofollow($post_id, $robots_nofollow);
            }
            
            $updated_fields = $rankmath_handler->get_rankmath_fields($post_id);
        }
        
        return rest_ensure_response(array(
            'success' => true,
            'message' => 'SEO fields updated successfully',
            'plugin_used' => $primary_plugin,
            'update_results' => $update_results,
            'data' => $updated_fields
        ));
    }
    
    /**
     * Get RankMath fields via REST API
     */
    public function get_rankmath_fields_route($request) {
        $post_id = $request->get_param('id');
        
        // Check if post exists
        $post = get_post($post_id);
        if (!$post) {
            return new WP_Error('post_not_found', 'Post not found', array('status' => 404));
        }
        
        // Check if RankMath is active
        if (!$this->detector->is_plugin_active_and_supported('rankmath')) {
            return new WP_Error('rankmath_not_active', 'RankMath SEO plugin is not active or supported', array('status' => 424));
        }
        
        // Get RankMath fields
        if (!class_exists('PostCrafter_RankMath_Field_Handler')) {
            require_once dirname(__FILE__) . '/class-rankmath-field-handler.php';
        }
        $rankmath_handler = new PostCrafter_RankMath_Field_Handler();
        $fields = $rankmath_handler->get_rankmath_fields($post_id);
        
        return rest_ensure_response(array(
            'success' => true,
            'data' => $fields
        ));
    }
    
    /**
     * Update RankMath fields via REST API
     */
    public function update_rankmath_fields_route($request) {
        $post_id = $request->get_param('id');
        
        // Check if post exists
        $post = get_post($post_id);
        if (!$post) {
            return new WP_Error('post_not_found', 'Post not found', array('status' => 404));
        }
        
        // Check if RankMath is active
        if (!$this->detector->is_plugin_active_and_supported('rankmath')) {
            return new WP_Error('rankmath_not_active', 'RankMath SEO plugin is not active or supported', array('status' => 424));
        }
        
        // Get RankMath handler
        if (!class_exists('PostCrafter_RankMath_Field_Handler')) {
            require_once dirname(__FILE__) . '/class-rankmath-field-handler.php';
        }
        $rankmath_handler = new PostCrafter_RankMath_Field_Handler();
        
        // Get field values from request
        $meta_title = $request->get_param('meta_title');
        $meta_description = $request->get_param('meta_description');
        $focus_keywords = $request->get_param('focus_keywords');
        $pillar_content = $request->get_param('pillar_content');
        $breadcrumbs_title = $request->get_param('breadcrumbs_title');
        
        $update_results = array();
        
        // Update fields
        if ($meta_title !== null) {
            $update_results['meta_title'] = $rankmath_handler->set_rankmath_meta_title($post_id, $meta_title);
        }
        if ($meta_description !== null) {
            $update_results['meta_description'] = $rankmath_handler->set_rankmath_meta_description($post_id, $meta_description);
        }
        if ($focus_keywords !== null) {
            $update_results['focus_keywords'] = $rankmath_handler->set_rankmath_focus_keywords($post_id, $focus_keywords);
        }
        // RankMath-specific fields
        if ($pillar_content !== null) {
            $update_results['pillar_content'] = update_post_meta($post_id, 'rank_math_pillar_content', (bool) $pillar_content);
        }
        if ($breadcrumbs_title !== null) {
            $update_results['breadcrumbs_title'] = update_post_meta($post_id, 'rank_math_breadcrumb_title', sanitize_text_field($breadcrumbs_title));
        }
        
        // Return updated fields
        $updated_fields = $rankmath_handler->get_rankmath_fields($post_id);
        
        return rest_ensure_response(array(
            'success' => true,
            'message' => 'RankMath fields updated successfully',
            'update_results' => $update_results,
            'data' => $updated_fields
        ));
    }
    
    /**
     * Get Yoast fields via REST API (legacy support)
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
        
        // Update fields using the field handler
        $yoast_handler = new PostCrafter_Yoast_Field_Handler();
        $update_results = array();
        
        if ($meta_title !== null) {
            $update_results['meta_title'] = $yoast_handler->set_yoast_meta_title($post_id, $meta_title);
        }
        
        if ($meta_description !== null) {
            $update_results['meta_description'] = $yoast_handler->set_yoast_meta_description($post_id, $meta_description);
        }
        
        if ($focus_keywords !== null) {
            $update_results['focus_keywords'] = $yoast_handler->set_yoast_focus_keywords($post_id, $focus_keywords);
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
     * Add SEO fields to post response (works with both plugins)
     */
    public function add_seo_fields_to_response($response, $post, $request) {
        // Check if SEO fields are requested
        $include_seo = $request->get_param('include_seo_fields') === 'true';
        $include_yoast = $request->get_param('include_yoast_fields') === 'true'; // Legacy support
        
        if (!$include_seo && !$include_yoast) {
            return $response;
        }
        
        // Get fields from active SEO plugin
        if ($this->detector->has_supported_seo_plugin()) {
            $primary_plugin = $this->detector->get_primary_plugin();
            
            if ($primary_plugin === 'yoast') {
                $yoast_handler = new PostCrafter_Yoast_Field_Handler();
                $seo_fields = $yoast_handler->get_yoast_fields($post->ID);
                $response->data['seo_fields'] = $seo_fields;
                $response->data['yoast_fields'] = $seo_fields; // Legacy support
                
            } elseif ($primary_plugin === 'rankmath') {
                if (!class_exists('PostCrafter_RankMath_Field_Handler')) {
                    require_once dirname(__FILE__) . '/class-rankmath-field-handler.php';
                }
                $rankmath_handler = new PostCrafter_RankMath_Field_Handler();
                $seo_fields = $rankmath_handler->get_rankmath_fields($post->ID);
                $response->data['seo_fields'] = $seo_fields;
                $response->data['rankmath_fields'] = $seo_fields;
                
                // Legacy support - map to Yoast field names for backward compatibility
                if ($include_yoast) {
                    $response->data['yoast_fields'] = array(
                        'meta_title' => $seo_fields['meta_title'] ?? '',
                        'meta_description' => $seo_fields['meta_description'] ?? '',
                        'focus_keywords' => $seo_fields['focus_keywords'] ?? '',
                        'seo_score' => $seo_fields['seo_score'] ?? 0
                    );
                }
            }
            
            $response->data['seo_plugin_detected'] = $primary_plugin;
        }
        
        return $response;
    }
    
    /**
     * Register SEO fields with existing post endpoints (works with both plugins)
     */
    public function register_seo_fields() {
        // Register universal SEO fields that work with both plugins
        register_rest_field('post', 'seo_meta_title', array(
            'get_callback' => array($this, 'get_seo_meta_title'),
            'update_callback' => array($this, 'update_seo_meta_title'),
            'schema' => array(
                'description' => 'SEO meta title (works with Yoast and RankMath)',
                'type' => 'string',
                'context' => array('view', 'edit')
            )
        ));
        
        register_rest_field('post', 'seo_meta_description', array(
            'get_callback' => array($this, 'get_seo_meta_description'),
            'update_callback' => array($this, 'update_seo_meta_description'),
            'schema' => array(
                'description' => 'SEO meta description (works with Yoast and RankMath)',
                'type' => 'string',
                'context' => array('view', 'edit')
            )
        ));
        
        register_rest_field('post', 'seo_focus_keywords', array(
            'get_callback' => array($this, 'get_seo_focus_keywords'),
            'update_callback' => array($this, 'update_seo_focus_keywords'),
            'schema' => array(
                'description' => 'SEO focus keywords (works with Yoast and RankMath)',
                'type' => 'string',
                'context' => array('view', 'edit')
            )
        ));
        
        register_rest_field('post', 'seo_canonical', array(
            'get_callback' => array($this, 'get_seo_canonical'),
            'update_callback' => array($this, 'update_seo_canonical'),
            'schema' => array(
                'description' => 'SEO canonical URL (works with Yoast and RankMath)',
                'type' => 'string',
                'context' => array('view', 'edit')
            )
        ));
        
        register_rest_field('post', 'seo_robots_noindex', array(
            'get_callback' => array($this, 'get_seo_robots_noindex'),
            'update_callback' => array($this, 'update_seo_robots_noindex'),
            'schema' => array(
                'description' => 'SEO robots noindex (works with Yoast and RankMath)',
                'type' => 'boolean',
                'context' => array('view', 'edit')
            )
        ));
        
        register_rest_field('post', 'seo_robots_nofollow', array(
            'get_callback' => array($this, 'get_seo_robots_nofollow'),
            'update_callback' => array($this, 'update_seo_robots_nofollow'),
            'schema' => array(
                'description' => 'SEO robots nofollow (works with Yoast and RankMath)',
                'type' => 'boolean',
                'context' => array('view', 'edit')
            )
        ));
        
        // Legacy Yoast fields for backward compatibility
        register_rest_field('post', 'yoast_meta_title', array(
            'get_callback' => array($this, 'get_seo_meta_title'), // Use universal getter
            'update_callback' => array($this, 'update_seo_meta_title'), // Use universal setter
            'schema' => array(
                'description' => 'Yoast SEO meta title (legacy - use seo_meta_title)',
                'type' => 'string',
                'context' => array('view', 'edit')
            )
        ));
        
        register_rest_field('post', 'yoast_meta_description', array(
            'get_callback' => array($this, 'get_seo_meta_description'), // Use universal getter
            'update_callback' => array($this, 'update_seo_meta_description'), // Use universal setter
            'schema' => array(
                'description' => 'Yoast SEO meta description (legacy - use seo_meta_description)',
                'type' => 'string',
                'context' => array('view', 'edit')
            )
        ));
        
        register_rest_field('post', 'yoast_focus_keywords', array(
            'get_callback' => array($this, 'get_seo_focus_keywords'), // Use universal getter
            'update_callback' => array($this, 'update_seo_focus_keywords'), // Use universal setter
            'schema' => array(
                'description' => 'Yoast SEO focus keywords (legacy - use seo_focus_keywords)',
                'type' => 'string',
                'context' => array('view', 'edit')
            )
        ));
        
        // RankMath-specific fields (only available when RankMath is active)
        if ($this->detector->is_plugin_active_and_supported('rankmath')) {
            register_rest_field('post', 'rankmath_pillar_content', array(
                'get_callback' => array($this, 'get_rankmath_pillar_content'),
                'update_callback' => array($this, 'update_rankmath_pillar_content'),
                'schema' => array(
                    'description' => 'RankMath pillar content flag',
                    'type' => 'boolean',
                    'context' => array('view', 'edit')
                )
            ));
            
            register_rest_field('post', 'rankmath_breadcrumbs_title', array(
                'get_callback' => array($this, 'get_rankmath_breadcrumbs_title'),
                'update_callback' => array($this, 'update_rankmath_breadcrumbs_title'),
                'schema' => array(
                    'description' => 'RankMath breadcrumbs title',
                    'type' => 'string',
                    'context' => array('view', 'edit')
                )
            ));
        }
    }
    
    /**
     * Universal SEO field getters and setters
     */
    
    /**
     * Get SEO meta title for REST API (works with both plugins)
     */
    public function get_seo_meta_title($post) {
        if (!$this->detector->has_supported_seo_plugin()) {
            return '';
        }
        
        $primary_plugin = $this->detector->get_primary_plugin();
        
        if ($primary_plugin === 'yoast') {
            return get_post_meta($post['id'], '_yoast_wpseo_title', true);
        } elseif ($primary_plugin === 'rankmath') {
            return get_post_meta($post['id'], 'rank_math_title', true);
        }
        
        return '';
    }
    
    /**
     * Update SEO meta title via REST API (works with both plugins)
     */
    public function update_seo_meta_title($value, $post) {
        if (!is_string($value) || !$this->detector->has_supported_seo_plugin()) {
            return $value;
        }
        
        $primary_plugin = $this->detector->get_primary_plugin();
        $sanitized_value = sanitize_text_field($value);
        
        if ($primary_plugin === 'yoast') {
            update_post_meta($post->ID, '_yoast_wpseo_title', $sanitized_value);
        } elseif ($primary_plugin === 'rankmath') {
            update_post_meta($post->ID, 'rank_math_title', $sanitized_value);
        }
        
        return $value;
    }
    
    /**
     * Get SEO meta description for REST API (works with both plugins)
     */
    public function get_seo_meta_description($post) {
        if (!$this->detector->has_supported_seo_plugin()) {
            return '';
        }
        
        $primary_plugin = $this->detector->get_primary_plugin();
        
        if ($primary_plugin === 'yoast') {
            return get_post_meta($post['id'], '_yoast_wpseo_metadesc', true);
        } elseif ($primary_plugin === 'rankmath') {
            return get_post_meta($post['id'], 'rank_math_description', true);
        }
        
        return '';
    }
    
    /**
     * Update SEO meta description via REST API (works with both plugins)
     */
    public function update_seo_meta_description($value, $post) {
        if (!is_string($value) || !$this->detector->has_supported_seo_plugin()) {
            return $value;
        }
        
        $primary_plugin = $this->detector->get_primary_plugin();
        $sanitized_value = sanitize_textarea_field($value);
        
        if ($primary_plugin === 'yoast') {
            update_post_meta($post->ID, '_yoast_wpseo_metadesc', $sanitized_value);
        } elseif ($primary_plugin === 'rankmath') {
            update_post_meta($post->ID, 'rank_math_description', $sanitized_value);
        }
        
        return $value;
    }
    
    /**
     * Get SEO focus keywords for REST API (works with both plugins)
     */
    public function get_seo_focus_keywords($post) {
        if (!$this->detector->has_supported_seo_plugin()) {
            return '';
        }
        
        $primary_plugin = $this->detector->get_primary_plugin();
        
        if ($primary_plugin === 'yoast') {
            return get_post_meta($post['id'], '_yoast_wpseo_focuskw', true);
        } elseif ($primary_plugin === 'rankmath') {
            return get_post_meta($post['id'], 'rank_math_focus_keyword', true);
        }
        
        return '';
    }
    
    /**
     * Update SEO focus keywords via REST API (works with both plugins)
     */
    public function update_seo_focus_keywords($value, $post) {
        if (!is_string($value) || !$this->detector->has_supported_seo_plugin()) {
            return $value;
        }
        
        $primary_plugin = $this->detector->get_primary_plugin();
        $sanitized_value = sanitize_text_field($value);
        
        if ($primary_plugin === 'yoast') {
            update_post_meta($post->ID, '_yoast_wpseo_focuskw', $sanitized_value);
        } elseif ($primary_plugin === 'rankmath') {
            update_post_meta($post->ID, 'rank_math_focus_keyword', $sanitized_value);
        }
        
        return $value;
    }
    
    /**
     * Get SEO canonical URL for REST API (works with both plugins)
     */
    public function get_seo_canonical($post) {
        if (!$this->detector->has_supported_seo_plugin()) {
            return '';
        }
        
        $primary_plugin = $this->detector->get_primary_plugin();
        
        if ($primary_plugin === 'yoast') {
            return get_post_meta($post['id'], '_yoast_wpseo_canonical', true);
        } elseif ($primary_plugin === 'rankmath') {
            return get_post_meta($post['id'], 'rank_math_canonical_url', true);
        }
        
        return '';
    }
    
    /**
     * Update SEO canonical URL via REST API (works with both plugins)
     */
    public function update_seo_canonical($value, $post) {
        if (!is_string($value) || !$this->detector->has_supported_seo_plugin()) {
            return $value;
        }
        
        $primary_plugin = $this->detector->get_primary_plugin();
        $sanitized_value = sanitize_url($value);
        
        if ($primary_plugin === 'yoast') {
            update_post_meta($post->ID, '_yoast_wpseo_canonical', $sanitized_value);
        } elseif ($primary_plugin === 'rankmath') {
            update_post_meta($post->ID, 'rank_math_canonical_url', $sanitized_value);
        }
        
        return $value;
    }
    
    /**
     * Get SEO robots noindex for REST API (works with both plugins)
     */
    public function get_seo_robots_noindex($post) {
        if (!$this->detector->has_supported_seo_plugin()) {
            return false;
        }
        
        $primary_plugin = $this->detector->get_primary_plugin();
        
        if ($primary_plugin === 'yoast') {
            $value = get_post_meta($post['id'], '_yoast_wpseo_meta-robots-noindex', true);
            return $value === '1';
        } elseif ($primary_plugin === 'rankmath') {
            $robots = get_post_meta($post['id'], 'rank_math_robots', true);
            if (is_array($robots)) {
                return in_array('noindex', $robots);
            }
        }
        
        return false;
    }
    
    /**
     * Update SEO robots noindex via REST API (works with both plugins)
     */
    public function update_seo_robots_noindex($value, $post) {
        if (!$this->detector->has_supported_seo_plugin()) {
            return $value;
        }
        
        $primary_plugin = $this->detector->get_primary_plugin();
        $bool_value = (bool) $value;
        
        if ($primary_plugin === 'yoast') {
            update_post_meta($post->ID, '_yoast_wpseo_meta-robots-noindex', $bool_value ? '1' : '');
        } elseif ($primary_plugin === 'rankmath') {
            $robots = get_post_meta($post->ID, 'rank_math_robots', true);
            if (!is_array($robots)) {
                $robots = array();
            }
            
            if ($bool_value) {
                if (!in_array('noindex', $robots)) {
                    $robots[] = 'noindex';
                }
            } else {
                $robots = array_diff($robots, array('noindex'));
            }
            
            update_post_meta($post->ID, 'rank_math_robots', $robots);
        }
        
        return $value;
    }
    
    /**
     * Get SEO robots nofollow for REST API (works with both plugins)
     */
    public function get_seo_robots_nofollow($post) {
        if (!$this->detector->has_supported_seo_plugin()) {
            return false;
        }
        
        $primary_plugin = $this->detector->get_primary_plugin();
        
        if ($primary_plugin === 'yoast') {
            $value = get_post_meta($post['id'], '_yoast_wpseo_meta-robots-nofollow', true);
            return $value === '1';
        } elseif ($primary_plugin === 'rankmath') {
            $robots = get_post_meta($post['id'], 'rank_math_robots', true);
            if (is_array($robots)) {
                return in_array('nofollow', $robots);
            }
        }
        
        return false;
    }
    
    /**
     * Update SEO robots nofollow via REST API (works with both plugins)
     */
    public function update_seo_robots_nofollow($value, $post) {
        if (!$this->detector->has_supported_seo_plugin()) {
            return $value;
        }
        
        $primary_plugin = $this->detector->get_primary_plugin();
        $bool_value = (bool) $value;
        
        if ($primary_plugin === 'yoast') {
            update_post_meta($post->ID, '_yoast_wpseo_meta-robots-nofollow', $bool_value ? '1' : '');
        } elseif ($primary_plugin === 'rankmath') {
            $robots = get_post_meta($post->ID, 'rank_math_robots', true);
            if (!is_array($robots)) {
                $robots = array();
            }
            
            if ($bool_value) {
                if (!in_array('nofollow', $robots)) {
                    $robots[] = 'nofollow';
                }
            } else {
                $robots = array_diff($robots, array('nofollow'));
            }
            
            update_post_meta($post->ID, 'rank_math_robots', $robots);
        }
        
        return $value;
    }
    
    /**
     * RankMath-specific field getters and setters
     */
    
    /**
     * Get RankMath pillar content for REST API
     */
    public function get_rankmath_pillar_content($post) {
        return (bool) get_post_meta($post['id'], 'rank_math_pillar_content', true);
    }
    
    /**
     * Update RankMath pillar content via REST API
     */
    public function update_rankmath_pillar_content($value, $post) {
        update_post_meta($post->ID, 'rank_math_pillar_content', (bool) $value);
        return $value;
    }
    
    /**
     * Get RankMath breadcrumbs title for REST API
     */
    public function get_rankmath_breadcrumbs_title($post) {
        return get_post_meta($post['id'], 'rank_math_breadcrumb_title', true);
    }
    
    /**
     * Update RankMath breadcrumbs title via REST API
     */
    public function update_rankmath_breadcrumbs_title($value, $post) {
        if (is_string($value)) {
            update_post_meta($post->ID, 'rank_math_breadcrumb_title', sanitize_text_field($value));
        }
        return $value;
    }
} 
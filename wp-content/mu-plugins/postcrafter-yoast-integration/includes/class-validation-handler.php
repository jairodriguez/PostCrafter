<?php
/**
 * Validation Handler Class
 * 
 * Handles input validation and sanitization for Yoast fields
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class PostCrafter_Validation_Handler {
    
    /**
     * Constructor
     */
    public function __construct() {
        add_action('init', array($this, 'init'));
    }
    
    /**
     * Initialize the validation handler
     */
    public function init() {
        // Add validation hooks
        add_filter('rest_pre_insert_post', array($this, 'validate_post_data'), 10, 2);
        add_filter('rest_pre_update_post', array($this, 'validate_post_data'), 10, 2);
    }
    
    /**
     * Validate post data before insertion/update
     */
    public function validate_post_data($prepared_post, $request) {
        // Get Yoast fields from request
        $yoast_fields = array(
            'meta_title' => $request->get_param('yoast_meta_title'),
            'meta_description' => $request->get_param('yoast_meta_description'),
            'focus_keywords' => $request->get_param('yoast_focus_keywords')
        );
        
        // Validate Yoast fields
        $errors = $this->validate_yoast_fields($yoast_fields);
        
        if (!empty($errors)) {
            return new WP_Error('yoast_validation_failed', 'Yoast field validation failed', array(
                'status' => 400,
                'errors' => $errors
            ));
        }
        
        return $prepared_post;
    }
    
    /**
     * Validate Yoast field values
     */
    public function validate_yoast_fields($fields) {
        $errors = array();
        
        // Validate meta title
        if (!empty($fields['meta_title'])) {
            $meta_title = $fields['meta_title'];
            
            // Check length
            if (strlen($meta_title) > 60) {
                $errors[] = 'Meta title should be 60 characters or less (current: ' . strlen($meta_title) . ')';
            }
            
            // Check for required characters
            if (strlen($meta_title) < 10) {
                $errors[] = 'Meta title should be at least 10 characters long';
            }
            
            // Check for special characters
            if (preg_match('/[<>]/', $meta_title)) {
                $errors[] = 'Meta title contains invalid characters (< or >)';
            }
        }
        
        // Validate meta description
        if (!empty($fields['meta_description'])) {
            $meta_description = $fields['meta_description'];
            
            // Check length
            if (strlen($meta_description) > 160) {
                $errors[] = 'Meta description should be 160 characters or less (current: ' . strlen($meta_description) . ')';
            }
            
            // Check for required characters
            if (strlen($meta_description) < 50) {
                $errors[] = 'Meta description should be at least 50 characters long';
            }
            
            // Check for special characters
            if (preg_match('/[<>]/', $meta_description)) {
                $errors[] = 'Meta description contains invalid characters (< or >)';
            }
        }
        
        // Validate focus keywords
        if (!empty($fields['focus_keywords'])) {
            $focus_keywords = $fields['focus_keywords'];
            
            // Split keywords by comma
            $keywords = array_map('trim', explode(',', $focus_keywords));
            
            // Check number of keywords
            if (count($keywords) > 5) {
                $errors[] = 'Focus keywords should be 5 or fewer (current: ' . count($keywords) . ')';
            }
            
            // Validate individual keywords
            foreach ($keywords as $keyword) {
                if (strlen($keyword) < 2) {
                    $errors[] = 'Focus keyword "' . $keyword . '" is too short (minimum 2 characters)';
                }
                
                if (strlen($keyword) > 50) {
                    $errors[] = 'Focus keyword "' . $keyword . '" is too long (maximum 50 characters)';
                }
                
                // Check for special characters
                if (preg_match('/[<>]/', $keyword)) {
                    $errors[] = 'Focus keyword "' . $keyword . '" contains invalid characters (< or >)';
                }
            }
        }
        
        return $errors;
    }
    
    /**
     * Sanitize Yoast field values
     */
    public function sanitize_yoast_fields($fields) {
        $sanitized = array();
        
        // Sanitize meta title
        if (isset($fields['meta_title'])) {
            $sanitized['meta_title'] = sanitize_text_field($fields['meta_title']);
        }
        
        // Sanitize meta description
        if (isset($fields['meta_description'])) {
            $sanitized['meta_description'] = sanitize_textarea_field($fields['meta_description']);
        }
        
        // Sanitize focus keywords
        if (isset($fields['focus_keywords'])) {
            $sanitized['focus_keywords'] = sanitize_text_field($fields['focus_keywords']);
        }
        
        return $sanitized;
    }
    
    /**
     * Validate meta title specifically
     */
    public function validate_meta_title($title) {
        $errors = array();
        
        if (empty($title)) {
            return $errors; // Empty is allowed
        }
        
        if (strlen($title) > 60) {
            $errors[] = 'Meta title exceeds 60 character limit';
        }
        
        if (strlen($title) < 10) {
            $errors[] = 'Meta title is too short (minimum 10 characters)';
        }
        
        if (preg_match('/[<>]/', $title)) {
            $errors[] = 'Meta title contains invalid HTML characters';
        }
        
        return $errors;
    }
    
    /**
     * Validate meta description specifically
     */
    public function validate_meta_description($description) {
        $errors = array();
        
        if (empty($description)) {
            return $errors; // Empty is allowed
        }
        
        if (strlen($description) > 160) {
            $errors[] = 'Meta description exceeds 160 character limit';
        }
        
        if (strlen($description) < 50) {
            $errors[] = 'Meta description is too short (minimum 50 characters)';
        }
        
        if (preg_match('/[<>]/', $description)) {
            $errors[] = 'Meta description contains invalid HTML characters';
        }
        
        return $errors;
    }
    
    /**
     * Validate focus keywords specifically
     */
    public function validate_focus_keywords($keywords) {
        $errors = array();
        
        if (empty($keywords)) {
            return $errors; // Empty is allowed
        }
        
        $keyword_array = array_map('trim', explode(',', $keywords));
        
        if (count($keyword_array) > 5) {
            $errors[] = 'Too many focus keywords (maximum 5)';
        }
        
        foreach ($keyword_array as $keyword) {
            if (strlen($keyword) < 2) {
                $errors[] = 'Focus keyword "' . $keyword . '" is too short';
            }
            
            if (strlen($keyword) > 50) {
                $errors[] = 'Focus keyword "' . $keyword . '" is too long';
            }
            
            if (preg_match('/[<>]/', $keyword)) {
                $errors[] = 'Focus keyword "' . $keyword . '" contains invalid characters';
            }
        }
        
        return $errors;
    }
    
    /**
     * Get validation rules for Yoast fields
     */
    public function get_validation_rules() {
        return array(
            'meta_title' => array(
                'max_length' => 60,
                'min_length' => 10,
                'required' => false,
                'pattern' => '/^[^<>]*$/'
            ),
            'meta_description' => array(
                'max_length' => 160,
                'min_length' => 50,
                'required' => false,
                'pattern' => '/^[^<>]*$/'
            ),
            'focus_keywords' => array(
                'max_keywords' => 5,
                'min_length' => 2,
                'max_length' => 50,
                'required' => false,
                'pattern' => '/^[^<>]*$/'
            )
        );
    }
    
    /**
     * Check if a string contains valid characters
     */
    public function has_valid_characters($string) {
        return !preg_match('/[<>]/', $string);
    }
    
    /**
     * Truncate text to specified length
     */
    public function truncate_text($text, $max_length, $suffix = '...') {
        if (strlen($text) <= $max_length) {
            return $text;
        }
        
        return substr($text, 0, $max_length - strlen($suffix)) . $suffix;
    }
} 
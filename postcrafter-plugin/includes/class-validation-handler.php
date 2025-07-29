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
     * Validation constants
     */
    const META_TITLE_MAX_LENGTH = 60;
    const META_TITLE_MIN_LENGTH = 10;
    const META_DESCRIPTION_MAX_LENGTH = 160;
    const META_DESCRIPTION_MIN_LENGTH = 50;
    const FOCUS_KEYWORDS_MAX_LENGTH = 255;
    const FOCUS_KEYWORDS_MAX_COUNT = 10;
    const FOCUS_KEYWORD_MAX_LENGTH = 50;
    const FOCUS_KEYWORD_MIN_LENGTH = 2;
    const CANONICAL_MAX_LENGTH = 2048;
    const CATEGORY_MAX_ID = 999999;
    
    /**
     * Error codes
     */
    const ERROR_TITLE_TOO_LONG = 'title_too_long';
    const ERROR_TITLE_TOO_SHORT = 'title_too_short';
    const ERROR_DESCRIPTION_TOO_LONG = 'description_too_long';
    const ERROR_DESCRIPTION_TOO_SHORT = 'description_too_short';
    const ERROR_INVALID_URL = 'invalid_url';
    const ERROR_INVALID_CATEGORY = 'invalid_category';
    const ERROR_MALICIOUS_CONTENT = 'malicious_content';
    const ERROR_INVALID_KEYWORDS = 'invalid_keywords';
    const ERROR_TOO_MANY_KEYWORDS = 'too_many_keywords';
    const ERROR_KEYWORD_TOO_LONG = 'keyword_too_long';
    const ERROR_KEYWORD_TOO_SHORT = 'keyword_too_short';
    const ERROR_HTML_NOT_ALLOWED = 'html_not_allowed';
    const ERROR_JAVASCRIPT_PROTOCOL = 'javascript_protocol';
    const ERROR_DATA_PROTOCOL = 'data_protocol';
    
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
        add_filter('postcrafter_validate_yoast_fields', array($this, 'validate_yoast_fields_comprehensive'), 10, 2);
        add_filter('postcrafter_sanitize_yoast_fields', array($this, 'sanitize_yoast_fields_comprehensive'), 10, 2);
    }
    
    /**
     * Validate post data before insertion/update
     */
    public function validate_post_data($prepared_post, $request) {
        // Get Yoast fields from request
        $yoast_fields = array(
            'meta_title' => $request->get_param('yoast_meta_title'),
            'meta_description' => $request->get_param('yoast_meta_description'),
            'focus_keywords' => $request->get_param('yoast_focus_keywords'),
            'canonical' => $request->get_param('yoast_canonical'),
            'primary_category' => $request->get_param('yoast_primary_category'),
            'meta_robots_noindex' => $request->get_param('yoast_meta_robots_noindex'),
            'meta_robots_nofollow' => $request->get_param('yoast_meta_robots_nofollow')
        );
        
        // Validate Yoast fields
        $validation = $this->validate_yoast_fields_comprehensive($yoast_fields);
        
        if (!$validation['valid']) {
            return new WP_Error('yoast_validation_failed', 'Yoast field validation failed', array(
                'status' => 400,
                'errors' => $validation['errors']
            ));
        }
        
        return $prepared_post;
    }
    
    /**
     * Comprehensive validation for Yoast fields
     */
    public function validate_yoast_fields_comprehensive($fields, $post_id = null) {
        $results = array();
        $all_valid = true;
        $all_errors = array();

        // Validate each field
        if (isset($fields['meta_title'])) {
            $results['meta_title'] = $this->validate_meta_title_comprehensive($fields['meta_title'], $post_id);
            if (!$results['meta_title']['valid']) {
                $all_valid = false;
                $all_errors['meta_title'] = $results['meta_title']['errors'];
            }
        }

        if (isset($fields['meta_description'])) {
            $results['meta_description'] = $this->validate_meta_description_comprehensive($fields['meta_description'], $post_id);
            if (!$results['meta_description']['valid']) {
                $all_valid = false;
                $all_errors['meta_description'] = $results['meta_description']['errors'];
            }
        }

        if (isset($fields['focus_keywords'])) {
            $results['focus_keywords'] = $this->validate_focus_keywords_comprehensive($fields['focus_keywords'], $post_id);
            if (!$results['focus_keywords']['valid']) {
                $all_valid = false;
                $all_errors['focus_keywords'] = $results['focus_keywords']['errors'];
            }
        }

        if (isset($fields['canonical'])) {
            $results['canonical'] = $this->validate_canonical_url($fields['canonical'], $post_id);
            if (!$results['canonical']['valid']) {
                $all_valid = false;
                $all_errors['canonical'] = $results['canonical']['errors'];
            }
        }

        if (isset($fields['primary_category'])) {
            $results['primary_category'] = $this->validate_primary_category($fields['primary_category'], $post_id);
            if (!$results['primary_category']['valid']) {
                $all_valid = false;
                $all_errors['primary_category'] = $results['primary_category']['errors'];
            }
        }

        if (isset($fields['meta_robots_noindex'])) {
            $results['meta_robots_noindex'] = $this->validate_robots_noindex($fields['meta_robots_noindex'], $post_id);
            if (!$results['meta_robots_noindex']['valid']) {
                $all_valid = false;
                $all_errors['meta_robots_noindex'] = $results['meta_robots_noindex']['errors'];
            }
        }

        if (isset($fields['meta_robots_nofollow'])) {
            $results['meta_robots_nofollow'] = $this->validate_robots_nofollow($fields['meta_robots_nofollow'], $post_id);
            if (!$results['meta_robots_nofollow']['valid']) {
                $all_valid = false;
                $all_errors['meta_robots_nofollow'] = $results['meta_robots_nofollow']['errors'];
            }
        }

        return array(
            'valid' => $all_valid,
            'errors' => $all_errors,
            'results' => $results,
            'sanitized' => $this->get_sanitized_values($results)
        );
    }
    
    /**
     * Comprehensive validation for meta title
     */
    public function validate_meta_title_comprehensive($title, $post_id = null) {
        $errors = array();

        // Check if title is empty (optional field)
        if (empty($title)) {
            return array('valid' => true, 'sanitized' => '');
        }

        // Check minimum length
        if (strlen($title) < self::META_TITLE_MIN_LENGTH) {
            $errors[] = array(
                'code' => self::ERROR_TITLE_TOO_SHORT,
                'message' => sprintf('Meta title must be at least %d characters long', self::META_TITLE_MIN_LENGTH),
                'value' => $title,
                'min_length' => self::META_TITLE_MIN_LENGTH,
                'current_length' => strlen($title)
            );
        }

        // Check maximum length
        if (strlen($title) > self::META_TITLE_MAX_LENGTH) {
            $errors[] = array(
                'code' => self::ERROR_TITLE_TOO_LONG,
                'message' => sprintf('Meta title exceeds maximum length of %d characters', self::META_TITLE_MAX_LENGTH),
                'value' => $title,
                'max_length' => self::META_TITLE_MAX_LENGTH,
                'current_length' => strlen($title)
            );
        }

        // Check for malicious content
        if ($this->contains_malicious_content($title)) {
            $errors[] = array(
                'code' => self::ERROR_MALICIOUS_CONTENT,
                'message' => 'Meta title contains potentially malicious content',
                'value' => $title
            );
        }

        // Check for HTML tags
        if (strip_tags($title) !== $title) {
            $errors[] = array(
                'code' => self::ERROR_HTML_NOT_ALLOWED,
                'message' => 'HTML tags are not allowed in meta title',
                'value' => $title
            );
        }

        return array(
            'valid' => empty($errors),
            'errors' => $errors,
            'sanitized' => $this->sanitize_meta_title_comprehensive($title)
        );
    }
    
    /**
     * Comprehensive validation for meta description
     */
    public function validate_meta_description_comprehensive($description, $post_id = null) {
        $errors = array();

        // Check if description is empty (optional field)
        if (empty($description)) {
            return array('valid' => true, 'sanitized' => '');
        }

        // Check minimum length
        if (strlen($description) < self::META_DESCRIPTION_MIN_LENGTH) {
            $errors[] = array(
                'code' => self::ERROR_DESCRIPTION_TOO_SHORT,
                'message' => sprintf('Meta description must be at least %d characters long', self::META_DESCRIPTION_MIN_LENGTH),
                'value' => $description,
                'min_length' => self::META_DESCRIPTION_MIN_LENGTH,
                'current_length' => strlen($description)
            );
        }

        // Check maximum length
        if (strlen($description) > self::META_DESCRIPTION_MAX_LENGTH) {
            $errors[] = array(
                'code' => self::ERROR_DESCRIPTION_TOO_LONG,
                'message' => sprintf('Meta description exceeds maximum length of %d characters', self::META_DESCRIPTION_MAX_LENGTH),
                'value' => $description,
                'max_length' => self::META_DESCRIPTION_MAX_LENGTH,
                'current_length' => strlen($description)
            );
        }

        // Check for malicious content
        if ($this->contains_malicious_content($description)) {
            $errors[] = array(
                'code' => self::ERROR_MALICIOUS_CONTENT,
                'message' => 'Meta description contains potentially malicious content',
                'value' => $description
            );
        }

        // Check for HTML tags
        if (strip_tags($description) !== $description) {
            $errors[] = array(
                'code' => self::ERROR_HTML_NOT_ALLOWED,
                'message' => 'HTML tags are not allowed in meta description',
                'value' => $description
            );
        }

        return array(
            'valid' => empty($errors),
            'errors' => $errors,
            'sanitized' => $this->sanitize_meta_description_comprehensive($description)
        );
    }
    
    /**
     * Comprehensive validation for focus keywords
     */
    public function validate_focus_keywords_comprehensive($keywords, $post_id = null) {
        $errors = array();

        // Check if keywords is empty (optional field)
        if (empty($keywords)) {
            return array('valid' => true, 'sanitized' => '');
        }

        // Check total length
        if (strlen($keywords) > self::FOCUS_KEYWORDS_MAX_LENGTH) {
            $errors[] = array(
                'code' => self::ERROR_INVALID_KEYWORDS,
                'message' => sprintf('Focus keywords exceed maximum length of %d characters', self::FOCUS_KEYWORDS_MAX_LENGTH),
                'value' => $keywords,
                'max_length' => self::FOCUS_KEYWORDS_MAX_LENGTH,
                'current_length' => strlen($keywords)
            );
        }

        // Check for malicious content
        if ($this->contains_malicious_content($keywords)) {
            $errors[] = array(
                'code' => self::ERROR_MALICIOUS_CONTENT,
                'message' => 'Focus keywords contain potentially malicious content',
                'value' => $keywords
            );
        }

        // Check for HTML tags
        if (strip_tags($keywords) !== $keywords) {
            $errors[] = array(
                'code' => self::ERROR_HTML_NOT_ALLOWED,
                'message' => 'HTML tags are not allowed in focus keywords',
                'value' => $keywords
            );
        }

        // Validate keyword format (comma-separated)
        $keyword_array = array_map('trim', explode(',', $keywords));
        $keyword_array = array_filter($keyword_array); // Remove empty values

        if (count($keyword_array) > self::FOCUS_KEYWORDS_MAX_COUNT) {
            $errors[] = array(
                'code' => self::ERROR_TOO_MANY_KEYWORDS,
                'message' => sprintf('Maximum %d focus keywords allowed', self::FOCUS_KEYWORDS_MAX_COUNT),
                'value' => $keywords,
                'count' => count($keyword_array),
                'max_count' => self::FOCUS_KEYWORDS_MAX_COUNT
            );
        }

        foreach ($keyword_array as $keyword) {
            if (strlen($keyword) < self::FOCUS_KEYWORD_MIN_LENGTH) {
                $errors[] = array(
                    'code' => self::ERROR_KEYWORD_TOO_SHORT,
                    'message' => sprintf('Focus keyword "%s" is too short (minimum %d characters)', $keyword, self::FOCUS_KEYWORD_MIN_LENGTH),
                    'value' => $keyword,
                    'keyword' => $keyword,
                    'min_length' => self::FOCUS_KEYWORD_MIN_LENGTH
                );
            }
            
            if (strlen($keyword) > self::FOCUS_KEYWORD_MAX_LENGTH) {
                $errors[] = array(
                    'code' => self::ERROR_KEYWORD_TOO_LONG,
                    'message' => sprintf('Focus keyword "%s" is too long (maximum %d characters)', $keyword, self::FOCUS_KEYWORD_MAX_LENGTH),
                    'value' => $keyword,
                    'keyword' => $keyword,
                    'max_length' => self::FOCUS_KEYWORD_MAX_LENGTH
                );
            }
        }

        return array(
            'valid' => empty($errors),
            'errors' => $errors,
            'sanitized' => $this->sanitize_focus_keywords_comprehensive($keywords)
        );
    }
    
    /**
     * Validate canonical URL
     */
    public function validate_canonical_url($url, $post_id = null) {
        $errors = array();

        // Check if URL is empty (optional field)
        if (empty($url)) {
            return array('valid' => true, 'sanitized' => '');
        }

        // Check length
        if (strlen($url) > self::CANONICAL_MAX_LENGTH) {
            $errors[] = array(
                'code' => 'url_too_long',
                'message' => sprintf('Canonical URL exceeds maximum length of %d characters', self::CANONICAL_MAX_LENGTH),
                'value' => $url,
                'max_length' => self::CANONICAL_MAX_LENGTH,
                'current_length' => strlen($url)
            );
        }

        // Validate URL format
        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            $errors[] = array(
                'code' => self::ERROR_INVALID_URL,
                'message' => 'Invalid URL format',
                'value' => $url
            );
        }

        // Check for malicious content
        if ($this->contains_malicious_content($url)) {
            $errors[] = array(
                'code' => self::ERROR_MALICIOUS_CONTENT,
                'message' => 'Canonical URL contains potentially malicious content',
                'value' => $url
            );
        }

        // Check for JavaScript protocol
        if (preg_match('/^javascript:/i', $url)) {
            $errors[] = array(
                'code' => self::ERROR_JAVASCRIPT_PROTOCOL,
                'message' => 'JavaScript protocol is not allowed in canonical URLs',
                'value' => $url
            );
        }

        // Check for data protocol
        if (preg_match('/^data:/i', $url)) {
            $errors[] = array(
                'code' => self::ERROR_DATA_PROTOCOL,
                'message' => 'Data protocol is not allowed in canonical URLs',
                'value' => $url
            );
        }

        return array(
            'valid' => empty($errors),
            'errors' => $errors,
            'sanitized' => $this->sanitize_canonical_url($url)
        );
    }
    
    /**
     * Validate primary category ID
     */
    public function validate_primary_category($category_id, $post_id = null) {
        $errors = array();

        // Check if category ID is empty (optional field)
        if (empty($category_id)) {
            return array('valid' => true, 'sanitized' => 0);
        }

        // Check if it's a valid number
        if (!is_numeric($category_id)) {
            $errors[] = array(
                'code' => self::ERROR_INVALID_CATEGORY,
                'message' => 'Primary category ID must be a valid number',
                'value' => $category_id
            );
        } else {
            $category_id = intval($category_id);

            // Check range
            if ($category_id < 0 || $category_id > self::CATEGORY_MAX_ID) {
                $errors[] = array(
                    'code' => self::ERROR_INVALID_CATEGORY,
                    'message' => sprintf('Primary category ID must be between 0 and %d', self::CATEGORY_MAX_ID),
                    'value' => $category_id
                );
            }

            // Check if category exists
            if ($category_id > 0 && !term_exists($category_id, 'category')) {
                $errors[] = array(
                    'code' => 'category_not_exists',
                    'message' => 'Primary category does not exist',
                    'value' => $category_id
                );
            }
        }

        return array(
            'valid' => empty($errors),
            'errors' => $errors,
            'sanitized' => $this->sanitize_primary_category($category_id)
        );
    }
    
    /**
     * Validate robots noindex setting
     */
    public function validate_robots_noindex($value, $post_id = null) {
        $errors = array();

        // Check if value is empty (optional field)
        if (empty($value)) {
            return array('valid' => true, 'sanitized' => '');
        }

        // Check for valid values
        $valid_values = array('0', '1', '2'); // 0=default, 1=noindex, 2=index
        if (!in_array($value, $valid_values)) {
            $errors[] = array(
                'code' => 'invalid_robots_value',
                'message' => 'Robots noindex value must be 0, 1, or 2',
                'value' => $value,
                'valid_values' => $valid_values
            );
        }

        return array(
            'valid' => empty($errors),
            'errors' => $errors,
            'sanitized' => $this->sanitize_robots_setting($value)
        );
    }
    
    /**
     * Validate robots nofollow setting
     */
    public function validate_robots_nofollow($value, $post_id = null) {
        $errors = array();

        // Check if value is empty (optional field)
        if (empty($value)) {
            return array('valid' => true, 'sanitized' => '');
        }

        // Check for valid values
        $valid_values = array('0', '1', '2'); // 0=default, 1=nofollow, 2=follow
        if (!in_array($value, $valid_values)) {
            $errors[] = array(
                'code' => 'invalid_robots_value',
                'message' => 'Robots nofollow value must be 0, 1, or 2',
                'value' => $value,
                'valid_values' => $valid_values
            );
        }

        return array(
            'valid' => empty($errors),
            'errors' => $errors,
            'sanitized' => $this->sanitize_robots_setting($value)
        );
    }
    
    /**
     * Comprehensive sanitization for meta title
     */
    public function sanitize_meta_title_comprehensive($title) {
        // Remove HTML tags
        $title = strip_tags($title);
        
        // Trim whitespace
        $title = trim($title);
        
        // Sanitize text field
        $title = sanitize_text_field($title);
        
        // Truncate if too long
        if (strlen($title) > self::META_TITLE_MAX_LENGTH) {
            $title = substr($title, 0, self::META_TITLE_MAX_LENGTH);
        }
        
        return $title;
    }
    
    /**
     * Comprehensive sanitization for meta description
     */
    public function sanitize_meta_description_comprehensive($description) {
        // Remove HTML tags
        $description = strip_tags($description);
        
        // Trim whitespace
        $description = trim($description);
        
        // Sanitize textarea field
        $description = sanitize_textarea_field($description);
        
        // Truncate if too long
        if (strlen($description) > self::META_DESCRIPTION_MAX_LENGTH) {
            $description = substr($description, 0, self::META_DESCRIPTION_MAX_LENGTH);
        }
        
        return $description;
    }
    
    /**
     * Comprehensive sanitization for focus keywords
     */
    public function sanitize_focus_keywords_comprehensive($keywords) {
        // Remove HTML tags
        $keywords = strip_tags($keywords);
        
        // Trim whitespace
        $keywords = trim($keywords);
        
        // Sanitize text field
        $keywords = sanitize_text_field($keywords);
        
        // Clean up keyword format
        $keyword_array = array_map('trim', explode(',', $keywords));
        $keyword_array = array_filter($keyword_array); // Remove empty values
        $keyword_array = array_slice($keyword_array, 0, self::FOCUS_KEYWORDS_MAX_COUNT); // Limit to max keywords
        
        // Truncate individual keywords
        foreach ($keyword_array as &$keyword) {
            if (strlen($keyword) > self::FOCUS_KEYWORD_MAX_LENGTH) {
                $keyword = substr($keyword, 0, self::FOCUS_KEYWORD_MAX_LENGTH);
            }
        }
        
        return implode(', ', $keyword_array);
    }
    
    /**
     * Sanitize canonical URL
     */
    public function sanitize_canonical_url($url) {
        // Remove HTML tags
        $url = strip_tags($url);
        
        // Trim whitespace
        $url = trim($url);
        
        // Sanitize URL
        $url = esc_url_raw($url);
        
        // Truncate if too long
        if (strlen($url) > self::CANONICAL_MAX_LENGTH) {
            $url = substr($url, 0, self::CANONICAL_MAX_LENGTH);
        }
        
        return $url;
    }
    
    /**
     * Sanitize primary category
     */
    public function sanitize_primary_category($category_id) {
        // Convert to integer
        $category_id = intval($category_id);
        
        // Ensure valid range
        if ($category_id < 0) {
            $category_id = 0;
        } elseif ($category_id > self::CATEGORY_MAX_ID) {
            $category_id = 0;
        }
        
        return $category_id;
    }
    
    /**
     * Sanitize robots setting
     */
    public function sanitize_robots_setting($value) {
        $valid_values = array('0', '1', '2');
        
        if (!in_array($value, $valid_values)) {
            return '0'; // Default value
        }
        
        return $value;
    }
    
    /**
     * Get sanitized values from validation results
     */
    private function get_sanitized_values($results) {
        $sanitized = array();
        
        foreach ($results as $field => $result) {
            if (isset($result['sanitized'])) {
                $sanitized[$field] = $result['sanitized'];
            }
        }
        
        return $sanitized;
    }
    
    /**
     * Check for malicious content
     */
    private function contains_malicious_content($content) {
        // Check for common XSS patterns
        $xss_patterns = array(
            '/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/mi',
            '/javascript:/i',
            '/vbscript:/i',
            '/onload\s*=/i',
            '/onerror\s*=/i',
            '/onclick\s*=/i',
            '/onmouseover\s*=/i',
            '/<iframe\b[^>]*>/i',
            '/<object\b[^>]*>/i',
            '/<embed\b[^>]*>/i'
        );
        
        foreach ($xss_patterns as $pattern) {
            if (preg_match($pattern, $content)) {
                return true;
            }
        }
        
        // Check for SQL injection patterns
        $sql_patterns = array(
            '/union\s+select/i',
            '/drop\s+table/i',
            '/delete\s+from/i',
            '/insert\s+into/i',
            '/update\s+set/i',
            '/exec\s*\(/i',
            '/eval\s*\(/i'
        );
        
        foreach ($sql_patterns as $pattern) {
            if (preg_match($pattern, $content)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Comprehensive sanitization for Yoast fields
     */
    public function sanitize_yoast_fields_comprehensive($fields, $post_id = null) {
        $validation = $this->validate_yoast_fields_comprehensive($fields, $post_id);
        return $validation['sanitized'];
    }
    
    /**
     * Get validation error messages
     */
    public function get_error_messages($errors) {
        $messages = array();
        
        foreach ($errors as $field => $field_errors) {
            foreach ($field_errors as $error) {
                $messages[] = sprintf('[%s] %s', ucfirst(str_replace('_', ' ', $field)), $error['message']);
            }
        }
        
        return $messages;
    }
    
    /**
     * Log validation errors
     */
    public function log_validation_errors($errors, $post_id = null, $user_id = null) {
        if (empty($errors)) {
            return;
        }
        
        $log_data = array(
            'timestamp' => current_time('mysql'),
            'post_id' => $post_id,
            'user_id' => $user_id ?: get_current_user_id(),
            'errors' => $errors,
            'ip_address' => $this->get_client_ip(),
            'user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : ''
        );
        
        // Log to WordPress error log
        error_log(sprintf(
            'PostCrafter Validation Error: %s',
            json_encode($log_data)
        ));
        
        // Store in WordPress options for admin review
        $existing_logs = get_option('postcrafter_validation_logs', array());
        $existing_logs[] = $log_data;
        
        // Keep only last 100 logs
        if (count($existing_logs) > 100) {
            $existing_logs = array_slice($existing_logs, -100);
        }
        
        update_option('postcrafter_validation_logs', $existing_logs);
    }
    
    /**
     * Get client IP address
     */
    private function get_client_ip() {
        $ip_keys = array('HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR');
        
        foreach ($ip_keys as $key) {
            if (array_key_exists($key, $_SERVER) === true) {
                foreach (explode(',', $_SERVER[$key]) as $ip) {
                    $ip = trim($ip);
                    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
                        return $ip;
                    }
                }
            }
        }
        
        return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
    }
} 
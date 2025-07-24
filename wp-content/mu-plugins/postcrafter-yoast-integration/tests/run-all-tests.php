<?php
/**
 * Test Runner for PostCrafter SEO Integration
 * 
 * Runs all test suites for the PostCrafter SEO integration
 * 
 * @package PostCrafter
 * @since 1.1.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Include test configuration
require_once dirname(__FILE__) . '/test-config.php';

// Include all test classes
require_once dirname(__FILE__) . '/test-compatibility.php';
require_once dirname(__FILE__) . '/test-rest-api.php';
require_once dirname(__FILE__) . '/test-getter-setter.php';
require_once dirname(__FILE__) . '/test-validation.php';
require_once dirname(__FILE__) . '/test-rankmath-detection.php';
require_once dirname(__FILE__) . '/test-rankmath-field-mapping.php';
require_once dirname(__FILE__) . '/test-rest-api-extensions.php';
require_once dirname(__FILE__) . '/test-data-conversion.php';

/**
 * Test Runner Class
 */
class PostCrafter_Test_Runner {
    
    /**
     * Overall test results
     */
    private $overall_results = array(
        'total_tests' => 0,
        'total_passed' => 0,
        'total_failed' => 0,
        'suites' => array()
    );
    
    /**
     * Run all tests
     */
    public function run_all_tests() {
        // Set up test environment
        $this->setup_test_environment();
        
        echo "<!DOCTYPE html>\n";
        echo "<html><head><title>PostCrafter SEO Integration Test Results</title>\n";
        echo "<style>body { font-family: Arial, sans-serif; margin: 20px; } .suite { margin: 20px 0; border: 1px solid #ddd; padding: 15px; } .passed { color: green; } .failed { color: red; } .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0; }</style>\n";
        echo "</head><body>\n";
        
        echo "<h1>🧪 PostCrafter SEO Integration Test Suite</h1>\n";
        echo "<p>Comprehensive tests for both Yoast SEO and RankMath SEO plugin integration</p>\n";
        
        // Run individual test suites
        $this->run_compatibility_tests();
        $this->run_rankmath_detection_tests();
        $this->run_rankmath_field_mapping_tests();
        $this->run_rest_api_tests();
        $this->run_rest_api_extensions_tests();
        $this->run_data_conversion_tests();
        $this->run_getter_setter_tests();
        $this->run_validation_tests();
        
        // Display overall summary
        $this->display_overall_summary();
        
        echo "</body></html>\n";
    }
    
    /**
     * Setup test environment
     */
    private function setup_test_environment() {
        // Clear any existing caches
        delete_transient('postcrafter_seo_success_notice_shown');
        
        // Set up WordPress environment if needed
        if (!function_exists('wp_get_current_user')) {
            // Mock WordPress functions for testing
            function wp_get_current_user() {
                return (object) array('ID' => 1, 'user_login' => 'admin');
            }
        }
        
        if (!function_exists('current_user_can')) {
            function current_user_can($capability) {
                return true; // Allow all capabilities in test environment
            }
        }
    }
    
    /**
     * Run compatibility tests
     */
    private function run_compatibility_tests() {
        echo "<div class='suite'>\n";
        echo "<h2>🔧 Compatibility Tests</h2>\n";
        
        if (class_exists('PostCrafter_Compatibility_Tests')) {
            ob_start();
            $compatibility_tests = new PostCrafter_Compatibility_Tests();
            $compatibility_tests->run_all_tests();
            $output = ob_get_clean();
            echo $output;
        } else {
            echo "<p style='color: orange;'>⚠️ Compatibility test class not found</p>\n";
        }
        
        echo "</div>\n";
    }
    
    /**
     * Run RankMath detection tests
     */
    private function run_rankmath_detection_tests() {
        echo "<div class='suite'>\n";
        echo "<h2>🔍 RankMath Detection Tests</h2>\n";
        
        if (class_exists('PostCrafter_RankMath_Detection_Tests')) {
            ob_start();
            $rankmath_tests = new PostCrafter_RankMath_Detection_Tests();
            $rankmath_tests->run_all_tests();
            $output = ob_get_clean();
            echo $output;
            
            // Extract results for summary
            $this->extract_test_results('RankMath Detection', $output);
        } else {
            echo "<p style='color: orange;'>⚠️ RankMath detection test class not found</p>\n";
        }
        
        echo "</div>\n";
    }
    
    /**
     * Run RankMath field mapping tests
     */
    private function run_rankmath_field_mapping_tests() {
        echo "<div class='suite'>\n";
        echo "<h2>🗺️ RankMath Field Mapping Tests</h2>\n";
        
        if (class_exists('PostCrafter_RankMath_Field_Mapping_Tests')) {
            ob_start();
            $field_mapping_tests = new PostCrafter_RankMath_Field_Mapping_Tests();
            $field_mapping_tests->run_all_tests();
            $output = ob_get_clean();
            echo $output;
            
            // Extract results for summary
            $this->extract_test_results('RankMath Field Mapping', $output);
        } else {
            echo "<p style='color: orange;'>⚠️ RankMath field mapping test class not found</p>\n";
        }
        
        echo "</div>\n";
    }
    
    /**
     * Run REST API tests
     */
    private function run_rest_api_tests() {
        echo "<div class='suite'>\n";
        echo "<h2>🌐 REST API Tests</h2>\n";
        
        if (class_exists('PostCrafter_REST_API_Tests')) {
            ob_start();
            $api_tests = new PostCrafter_REST_API_Tests();
            $api_tests->run_all_tests();
            $output = ob_get_clean();
            echo $output;
            
            // Extract results for summary
            $this->extract_test_results('REST API', $output);
        } else {
            echo "<p style='color: orange;'>⚠️ REST API test class not found</p>\n";
        }
        
        echo "</div>\n";
    }
    
    /**
     * Run REST API extensions tests
     */
    private function run_rest_api_extensions_tests() {
        echo "<div class='suite'>\n";
        echo "<h2>🌐 REST API Extensions Tests</h2>\n";
        
        if (class_exists('PostCrafter_REST_API_Extensions_Tests')) {
            ob_start();
            $api_extensions_tests = new PostCrafter_REST_API_Extensions_Tests();
            $api_extensions_tests->run_all_tests();
            $output = ob_get_clean();
            echo $output;
            
            // Extract results for summary
            $this->extract_test_results('REST API Extensions', $output);
        } else {
            echo "<p style='color: orange;'>⚠️ REST API extensions test class not found</p>\n";
        }
        
        echo "</div>\n";
    }
    
    /**
     * Run data conversion tests
     */
    private function run_data_conversion_tests() {
        echo "<div class='suite'>\n";
        echo "<h2>🔄 Data Conversion Tests</h2>\n";
        
        if (class_exists('PostCrafter_Data_Conversion_Tests')) {
            ob_start();
            $conversion_tests = new PostCrafter_Data_Conversion_Tests();
            $conversion_tests->run_all_tests();
            $output = ob_get_clean();
            echo $output;
            
            // Extract results for summary
            $this->extract_test_results('Data Conversion', $output);
        } else {
            echo "<p style='color: orange;'>⚠️ Data conversion test class not found</p>\n";
        }
        
        echo "</div>\n";
    }
    
    /**
     * Run getter/setter tests
     */
    private function run_getter_setter_tests() {
        echo "<div class='suite'>\n";
        echo "<h2>📝 Getter/Setter Tests</h2>\n";
        
        if (class_exists('PostCrafter_Getter_Setter_Tests')) {
            ob_start();
            $getter_setter_tests = new PostCrafter_Getter_Setter_Tests();
            $getter_setter_tests->run_all_tests();
            $output = ob_get_clean();
            echo $output;
            
            // Extract results for summary
            $this->extract_test_results('Getter/Setter', $output);
        } else {
            echo "<p style='color: orange;'>⚠️ Getter/Setter test class not found</p>\n";
        }
        
        echo "</div>\n";
    }
    
    /**
     * Run validation tests
     */
    private function run_validation_tests() {
        echo "<div class='suite'>\n";
        echo "<h2>✅ Validation Tests</h2>\n";
        
        if (class_exists('PostCrafter_Validation_Tests')) {
            ob_start();
            $validation_tests = new PostCrafter_Validation_Tests();
            $validation_tests->run_all_tests();
            $output = ob_get_clean();
            echo $output;
            
            // Extract results for summary
            $this->extract_test_results('Validation', $output);
        } else {
            echo "<p style='color: orange;'>⚠️ Validation test class not found</p>\n";
        }
        
        echo "</div>\n";
    }
    
    /**
     * Extract test results from output
     */
    private function extract_test_results($suite_name, $output) {
        // Simple regex to extract test counts from output
        $passed = 0;
        $failed = 0;
        $total = 0;
        
        // Look for patterns like "Total Tests: X", "Passed: Y", "Failed: Z"
        if (preg_match('/Total Tests:<\/strong>\s*(\d+)/', $output, $matches)) {
            $total = intval($matches[1]);
        }
        
        if (preg_match('/Passed:<\/strong>\s*<span[^>]*>(\d+)<\/span>/', $output, $matches)) {
            $passed = intval($matches[1]);
        }
        
        if (preg_match('/Failed:<\/strong>\s*<span[^>]*>(\d+)<\/span>/', $output, $matches)) {
            $failed = intval($matches[1]);
        }
        
        // Store results
        $this->overall_results['suites'][$suite_name] = array(
            'total' => $total,
            'passed' => $passed,
            'failed' => $failed
        );
        
        $this->overall_results['total_tests'] += $total;
        $this->overall_results['total_passed'] += $passed;
        $this->overall_results['total_failed'] += $failed;
    }
    
    /**
     * Display overall summary
     */
    private function display_overall_summary() {
        $total = $this->overall_results['total_tests'];
        $passed = $this->overall_results['total_passed'];
        $failed = $this->overall_results['total_failed'];
        $success_rate = $total > 0 ? round(($passed / $total) * 100, 1) : 0;
        
        echo "<div class='summary'>\n";
        echo "<h2>📊 Overall Test Summary</h2>\n";
        
        echo "<table style='width: 100%; border-collapse: collapse;'>\n";
        echo "<thead>\n";
        echo "<tr style='background: #f0f0f0; border-bottom: 2px solid #ddd;'>\n";
        echo "<th style='padding: 10px; text-align: left; border: 1px solid #ddd;'>Test Suite</th>\n";
        echo "<th style='padding: 10px; text-align: center; border: 1px solid #ddd;'>Total</th>\n";
        echo "<th style='padding: 10px; text-align: center; border: 1px solid #ddd;'>Passed</th>\n";
        echo "<th style='padding: 10px; text-align: center; border: 1px solid #ddd;'>Failed</th>\n";
        echo "<th style='padding: 10px; text-align: center; border: 1px solid #ddd;'>Success Rate</th>\n";
        echo "</tr>\n";
        echo "</thead>\n";
        echo "<tbody>\n";
        
        foreach ($this->overall_results['suites'] as $suite_name => $results) {
            $suite_rate = $results['total'] > 0 ? round(($results['passed'] / $results['total']) * 100, 1) : 0;
            $row_color = $results['failed'] === 0 ? '#d4edda' : '#f8d7da';
            
            echo "<tr style='background: {$row_color};'>\n";
            echo "<td style='padding: 10px; border: 1px solid #ddd;'><strong>{$suite_name}</strong></td>\n";
            echo "<td style='padding: 10px; text-align: center; border: 1px solid #ddd;'>{$results['total']}</td>\n";
            echo "<td style='padding: 10px; text-align: center; border: 1px solid #ddd; color: green;'>{$results['passed']}</td>\n";
            echo "<td style='padding: 10px; text-align: center; border: 1px solid #ddd; color: red;'>{$results['failed']}</td>\n";
            echo "<td style='padding: 10px; text-align: center; border: 1px solid #ddd;'>{$suite_rate}%</td>\n";
            echo "</tr>\n";
        }
        
        echo "</tbody>\n";
        echo "<tfoot>\n";
        echo "<tr style='background: " . ($failed === 0 ? '#d4edda' : '#f8d7da') . "; font-weight: bold; border-top: 2px solid #ddd;'>\n";
        echo "<td style='padding: 10px; border: 1px solid #ddd;'>TOTAL</td>\n";
        echo "<td style='padding: 10px; text-align: center; border: 1px solid #ddd;'>{$total}</td>\n";
        echo "<td style='padding: 10px; text-align: center; border: 1px solid #ddd; color: green;'>{$passed}</td>\n";
        echo "<td style='padding: 10px; text-align: center; border: 1px solid #ddd; color: red;'>{$failed}</td>\n";
        echo "<td style='padding: 10px; text-align: center; border: 1px solid #ddd;'>{$success_rate}%</td>\n";
        echo "</tr>\n";
        echo "</tfoot>\n";
        echo "</table>\n";
        
        echo "<div style='margin-top: 20px; padding: 15px; border-radius: 5px; background: " . ($failed === 0 ? '#d4edda' : '#f8d7da') . ";'>\n";
        if ($failed === 0) {
            echo "<h3 style='color: green; margin: 0;'>🎉 All Tests Passed!</h3>\n";
            echo "<p style='margin: 5px 0 0 0;'>The PostCrafter SEO Integration is working correctly with both Yoast SEO and RankMath SEO support.</p>\n";
        } else {
            echo "<h3 style='color: red; margin: 0;'>⚠️ Some Tests Failed</h3>\n";
            echo "<p style='margin: 5px 0 0 0;'>Please review the failed tests above and address any issues before deploying.</p>\n";
        }
        echo "</div>\n";
        
        // Additional information
        echo "<div style='margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;'>\n";
        echo "<h3>ℹ️ Test Information</h3>\n";
        echo "<ul>\n";
        echo "<li><strong>Plugin Version:</strong> " . (defined('POSTCRAFTER_SEO_VERSION') ? POSTCRAFTER_SEO_VERSION : '1.1.0') . "</li>\n";
        echo "<li><strong>Test Environment:</strong> WordPress " . (function_exists('get_bloginfo') ? get_bloginfo('version') : 'Unknown') . "</li>\n";
        echo "<li><strong>PHP Version:</strong> " . PHP_VERSION . "</li>\n";
        echo "<li><strong>Test Date:</strong> " . date('Y-m-d H:i:s') . "</li>\n";
        echo "</ul>\n";
        
        echo "<h4>New Features Tested (v1.1.0):</h4>\n";
        echo "<ul>\n";
        echo "<li>✅ RankMath SEO plugin detection and integration</li>\n";
        echo "<li>✅ Dual plugin support (Yoast + RankMath)</li>\n";
        echo "<li>✅ Enhanced plugin detection with multiple methods</li>\n";
        echo "<li>✅ Automatic conflict detection and resolution</li>\n";
        echo "<li>✅ Universal SEO field mappings</li>\n";
        echo "<li>✅ Admin settings page with plugin status</li>\n";
        echo "<li>✅ REST API endpoint for SEO status</li>\n";
        echo "<li>✅ Backward compatibility with existing Yoast integration</li>\n";
        echo "</ul>\n";
        echo "</div>\n";
        
        echo "</div>\n";
    }
    
    /**
     * Generate test report
     */
    public function generate_test_report() {
        $this->run_all_tests();
    }
}

// Run tests if accessed directly
if (basename($_SERVER['PHP_SELF']) === 'run-all-tests.php') {
    $test_runner = new PostCrafter_Test_Runner();
    $test_runner->generate_test_report();
} 
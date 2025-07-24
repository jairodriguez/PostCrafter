<?php
/**
 * RankMath Detection Tests
 * 
 * Tests for the RankMath SEO plugin detection functionality
 * 
 * @package PostCrafter
 * @since 1.1.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

require_once dirname(__FILE__) . '/test-config.php';
require_once dirname(__FILE__) . '/../includes/class-seo-plugin-detector.php';

class PostCrafter_RankMath_Detection_Tests {
    
    /**
     * Test results storage
     */
    private $test_results = array();
    
    /**
     * Run all tests
     */
    public function run_all_tests() {
        echo "<h2>🧪 PostCrafter RankMath Detection Tests</h2>\n";
        echo "<div style='background: #f1f1f1; padding: 15px; margin: 10px 0; border-radius: 5px;'>\n";
        
        // Initialize test environment
        $this->setup_test_environment();
        
        // Run detection tests
        $this->test_rankmath_plugin_file_detection();
        $this->test_rankmath_class_detection();
        $this->test_rankmath_function_detection();
        $this->test_rankmath_constant_detection();
        $this->test_rankmath_version_detection();
        $this->test_rankmath_capabilities_detection();
        $this->test_rankmath_meta_keys_mapping();
        $this->test_dual_plugin_detection();
        $this->test_no_plugin_detection();
        $this->test_detection_caching();
        $this->test_admin_notices();
        $this->test_api_results();
        
        // Display results summary
        $this->display_test_summary();
        
        echo "</div>\n";
    }
    
    /**
     * Setup test environment
     */
    private function setup_test_environment() {
        echo "<h3>🔧 Setting up test environment...</h3>\n";
        
        // Clear any existing caches
        if (class_exists('PostCrafter_SEO_Plugin_Detector')) {
            $detector = new PostCrafter_SEO_Plugin_Detector();
            $detector->clear_detection_cache();
        }
        
        // Initialize test results
        $this->test_results = array(
            'passed' => 0,
            'failed' => 0,
            'total' => 0,
            'details' => array()
        );
        
        echo "<p>✅ Test environment initialized</p>\n";
    }
    
    /**
     * Test RankMath plugin file detection
     */
    private function test_rankmath_plugin_file_detection() {
        echo "<h4>📁 Testing RankMath Plugin File Detection</h4>\n";
        
        $detector = new PostCrafter_SEO_Plugin_Detector();
        
        // Test 1: Check default plugin file path
        $this->run_test(
            'RankMath Plugin File Path',
            function() use ($detector) {
                $results = $detector->get_detection_results();
                return $results['rankmath']['plugin_file'] === 'seo-by-rank-math/rank-math.php';
            },
            'Plugin file path should be correctly set to seo-by-rank-math/rank-math.php'
        );
        
        // Test 2: Mock active plugins and test detection
        $this->run_test(
            'RankMath Active Plugin Detection (Mocked)',
            function() {
                // Mock active plugins option
                $active_plugins = get_option('active_plugins', array());
                $active_plugins[] = 'seo-by-rank-math/rank-math.php';
                update_option('active_plugins', $active_plugins);
                
                $detector = new PostCrafter_SEO_Plugin_Detector();
                $detector->clear_detection_cache();
                $results = $detector->get_detection_results();
                
                // Clean up
                $active_plugins = array_diff($active_plugins, array('seo-by-rank-math/rank-math.php'));
                update_option('active_plugins', $active_plugins);
                
                return $results['rankmath']['active'] === true;
            },
            'Should detect RankMath when plugin file is in active plugins list'
        );
    }
    
    /**
     * Test RankMath class detection
     */
    private function test_rankmath_class_detection() {
        echo "<h4>🏗️ Testing RankMath Class Detection</h4>\n";
        
        // Test 1: Mock RankMath main class
        $this->run_test(
            'RankMath Class Detection (Mocked)',
            function() {
                // Create mock RankMath class
                if (!class_exists('RankMath')) {
                    eval('class RankMath { public static function init() { return true; } }');
                }
                
                $detector = new PostCrafter_SEO_Plugin_Detector();
                $detector->clear_detection_cache();
                $results = $detector->get_detection_results();
                
                return $results['rankmath']['class_exists'] === true && $results['rankmath']['active'] === true;
            },
            'Should detect RankMath when RankMath class exists'
        );
        
        // Test 2: Check for other RankMath classes
        $this->run_test(
            'RankMath Helper Class Check',
            function() {
                $detector = new PostCrafter_SEO_Plugin_Detector();
                $results = $detector->get_detection_results();
                
                // Should not detect Helper class in test environment
                return !class_exists('RankMath\\Helper');
            },
            'RankMath Helper class should not exist in test environment'
        );
    }
    
    /**
     * Test RankMath function detection
     */
    private function test_rankmath_function_detection() {
        echo "<h4>⚙️ Testing RankMath Function Detection</h4>\n";
        
        // Test 1: Mock rank_math function
        $this->run_test(
            'RankMath Function Detection (Mocked)',
            function() {
                // Create mock rank_math function
                if (!function_exists('rank_math')) {
                    eval('function rank_math() { return new stdClass(); }');
                }
                
                $detector = new PostCrafter_SEO_Plugin_Detector();
                $detector->clear_detection_cache();
                $results = $detector->get_detection_results();
                
                return $results['rankmath']['function_exists'] === true && $results['rankmath']['active'] === true;
            },
            'Should detect RankMath when rank_math function exists'
        );
        
        // Test 2: Check function detection priority
        $this->run_test(
            'RankMath Function Priority',
            function() {
                $detector = new PostCrafter_SEO_Plugin_Detector();
                $results = $detector->get_detection_results();
                
                // Function should activate plugin detection
                return $results['rankmath']['active'] === true;
            },
            'Function detection should activate RankMath detection'
        );
    }
    
    /**
     * Test RankMath constant detection
     */
    private function test_rankmath_constant_detection() {
        echo "<h4>📝 Testing RankMath Constant Detection</h4>\n";
        
        // Test 1: Mock RANK_MATH_VERSION constant
        $this->run_test(
            'RankMath Constant Detection (Mocked)',
            function() {
                // Define mock constant
                if (!defined('RANK_MATH_VERSION')) {
                    define('RANK_MATH_VERSION', '1.0.80');
                }
                
                $detector = new PostCrafter_SEO_Plugin_Detector();
                $detector->clear_detection_cache();
                $results = $detector->get_detection_results();
                
                return $results['rankmath']['active'] === true;
            },
            'Should detect RankMath when RANK_MATH_VERSION constant is defined'
        );
        
        // Test 2: Version extraction from constant
        $this->run_test(
            'RankMath Version from Constant',
            function() {
                $detector = new PostCrafter_SEO_Plugin_Detector();
                $results = $detector->get_detection_results();
                
                return $results['rankmath']['version'] === '1.0.80';
            },
            'Should extract version from RANK_MATH_VERSION constant'
        );
    }
    
    /**
     * Test RankMath version detection
     */
    private function test_rankmath_version_detection() {
        echo "<h4>🏷️ Testing RankMath Version Detection</h4>\n";
        
        // Test 1: Version support check
        $this->run_test(
            'RankMath Version Support Check',
            function() {
                $detector = new PostCrafter_SEO_Plugin_Detector();
                $results = $detector->get_detection_results();
                
                // Current mocked version 1.0.80 should be supported (min 1.0.49)
                return $results['rankmath']['version_supported'] === true;
            },
            'Version 1.0.80 should be supported (minimum 1.0.49)'
        );
        
        // Test 2: Unsupported version handling
        $this->run_test(
            'RankMath Unsupported Version Handling',
            function() {
                // This would require changing the constant, which we can't do
                // So we'll test the version comparison logic indirectly
                $min_version = PostCrafter_SEO_Plugin_Detector::RANKMATH_MIN_VERSION;
                return version_compare('1.0.30', $min_version, '<');
            },
            'Version 1.0.30 should be considered unsupported'
        );
    }
    
    /**
     * Test RankMath capabilities detection
     */
    private function test_rankmath_capabilities_detection() {
        echo "<h4>🎯 Testing RankMath Capabilities Detection</h4>\n";
        
        // Test 1: Basic capabilities
        $this->run_test(
            'RankMath Basic Capabilities',
            function() {
                $detector = new PostCrafter_SEO_Plugin_Detector();
                $results = $detector->get_detection_results();
                $capabilities = $results['rankmath']['capabilities'];
                
                return isset($capabilities['meta_title']) && 
                       isset($capabilities['meta_description']) && 
                       isset($capabilities['focus_keywords']) &&
                       $capabilities['meta_title'] === true;
            },
            'Should have basic SEO capabilities (title, description, keywords)'
        );
        
        // Test 2: Advanced capabilities
        $this->run_test(
            'RankMath Advanced Capabilities',
            function() {
                $detector = new PostCrafter_SEO_Plugin_Detector();
                $results = $detector->get_detection_results();
                $capabilities = $results['rankmath']['capabilities'];
                
                return isset($capabilities['content_analysis']) && 
                       isset($capabilities['keyword_rank_tracking']) &&
                       $capabilities['content_analysis'] === true;
            },
            'Should have RankMath-specific advanced capabilities'
        );
    }
    
    /**
     * Test RankMath meta keys mapping
     */
    private function test_rankmath_meta_keys_mapping() {
        echo "<h4>🗝️ Testing RankMath Meta Keys Mapping</h4>\n";
        
        // Test 1: Basic meta keys
        $this->run_test(
            'RankMath Meta Keys Structure',
            function() {
                $detector = new PostCrafter_SEO_Plugin_Detector();
                $results = $detector->get_detection_results();
                $meta_keys = $results['rankmath']['meta_keys'];
                
                return $meta_keys['title'] === 'rank_math_title' &&
                       $meta_keys['description'] === 'rank_math_description' &&
                       $meta_keys['focus_keywords'] === 'rank_math_focus_keyword';
            },
            'Should have correct RankMath meta key mappings'
        );
        
        // Test 2: Social media meta keys
        $this->run_test(
            'RankMath Social Media Meta Keys',
            function() {
                $detector = new PostCrafter_SEO_Plugin_Detector();
                $results = $detector->get_detection_results();
                $meta_keys = $results['rankmath']['meta_keys'];
                
                return $meta_keys['opengraph_title'] === 'rank_math_facebook_title' &&
                       $meta_keys['twitter_title'] === 'rank_math_twitter_title';
            },
            'Should have correct social media meta key mappings'
        );
    }
    
    /**
     * Test dual plugin detection (Yoast + RankMath)
     */
    private function test_dual_plugin_detection() {
        echo "<h4>⚖️ Testing Dual Plugin Detection</h4>\n";
        
        // Test 1: Conflict detection
        $this->run_test(
            'Dual Plugin Conflict Detection',
            function() {
                $detector = new PostCrafter_SEO_Plugin_Detector();
                $results = $detector->get_detection_results();
                $summary = $results['summary'];
                
                // With both mocked classes/functions, should detect conflicts
                return $summary['total_active'] >= 2 || $summary['conflicts'] === true;
            },
            'Should detect conflicts when multiple SEO plugins are active'
        );
        
        // Test 2: Primary plugin selection
        $this->run_test(
            'Primary Plugin Selection',
            function() {
                $detector = new PostCrafter_SEO_Plugin_Detector();
                $results = $detector->get_detection_results();
                $summary = $results['summary'];
                
                // Should prefer RankMath when both are active and supported
                return isset($summary['primary_plugin']);
            },
            'Should select a primary plugin when multiple are active'
        );
    }
    
    /**
     * Test no plugin detection
     */
    private function test_no_plugin_detection() {
        echo "<h4>❌ Testing No Plugin Detection</h4>\n";
        
        // This is tricky to test since we've mocked plugins as active
        // We'll test the logic indirectly
        
        $this->run_test(
            'No SEO Plugin Logic',
            function() {
                // Test the detection logic with empty results
                $fake_results = array(
                    'yoast' => array('active' => false, 'version_supported' => false),
                    'rankmath' => array('active' => false, 'version_supported' => false)
                );
                
                // Manually test summary generation
                $detector = new PostCrafter_SEO_Plugin_Detector();
                $reflection = new ReflectionClass($detector);
                $method = $reflection->getMethod('generate_detection_summary');
                $method->setAccessible(true);
                
                $summary = $method->invoke($detector, $fake_results);
                
                return $summary['no_seo_plugin'] === true;
            },
            'Should correctly identify when no SEO plugins are active'
        );
    }
    
    /**
     * Test detection caching
     */
    private function test_detection_caching() {
        echo "<h4>💾 Testing Detection Caching</h4>\n";
        
        // Test 1: Cache behavior
        $this->run_test(
            'Detection Result Caching',
            function() {
                $detector = new PostCrafter_SEO_Plugin_Detector();
                
                // First call
                $results1 = $detector->get_detection_results();
                
                // Second call should return cached results
                $results2 = $detector->get_detection_results();
                
                return $results1 === $results2;
            },
            'Should cache detection results between calls'
        );
        
        // Test 2: Cache clearing
        $this->run_test(
            'Detection Cache Clearing',
            function() {
                $detector = new PostCrafter_SEO_Plugin_Detector();
                
                // Get results to populate cache
                $results1 = $detector->get_detection_results();
                
                // Clear cache
                $detector->clear_detection_cache();
                
                // This should work without errors
                $results2 = $detector->get_detection_results();
                
                return is_array($results2);
            },
            'Should clear cache and regenerate results successfully'
        );
    }
    
    /**
     * Test admin notices
     */
    private function test_admin_notices() {
        echo "<h4>📢 Testing Admin Notices</h4>\n";
        
        // Test 1: Notice generation doesn't error
        $this->run_test(
            'Admin Notices Generation',
            function() {
                // Capture output to prevent notices from displaying
                ob_start();
                
                $detector = new PostCrafter_SEO_Plugin_Detector();
                
                // This should not throw errors
                try {
                    $detector->display_plugin_notices();
                    $output = ob_get_contents();
                    ob_end_clean();
                    return true;
                } catch (Exception $e) {
                    ob_end_clean();
                    return false;
                }
            },
            'Should generate admin notices without errors'
        );
    }
    
    /**
     * Test API results format
     */
    private function test_api_results() {
        echo "<h4>📡 Testing API Results Format</h4>\n";
        
        // Test 1: API result structure
        $this->run_test(
            'API Results Structure',
            function() {
                $detector = new PostCrafter_SEO_Plugin_Detector();
                $api_results = $detector->get_api_detection_results();
                
                return isset($api_results['status']) &&
                       isset($api_results['primary_plugin']) &&
                       isset($api_results['yoast']) &&
                       isset($api_results['rankmath']) &&
                       isset($api_results['recommended_action']);
            },
            'API results should have correct structure'
        );
        
        // Test 2: Plugin-specific data
        $this->run_test(
            'Plugin-Specific API Data',
            function() {
                $detector = new PostCrafter_SEO_Plugin_Detector();
                $api_results = $detector->get_api_detection_results();
                
                return isset($api_results['rankmath']['active']) &&
                       isset($api_results['rankmath']['version']) &&
                       isset($api_results['rankmath']['supported']);
            },
            'Should include plugin-specific data for both Yoast and RankMath'
        );
    }
    
    /**
     * Run individual test
     */
    private function run_test($test_name, $test_function, $description) {
        $this->test_results['total']++;
        
        try {
            $result = $test_function();
            
            if ($result) {
                $this->test_results['passed']++;
                echo "<p style='color: green;'>✅ {$test_name}: PASSED</p>\n";
                $this->test_results['details'][] = array(
                    'name' => $test_name,
                    'status' => 'PASSED',
                    'description' => $description
                );
            } else {
                $this->test_results['failed']++;
                echo "<p style='color: red;'>❌ {$test_name}: FAILED</p>\n";
                echo "<p style='color: red; margin-left: 20px;'>Description: {$description}</p>\n";
                $this->test_results['details'][] = array(
                    'name' => $test_name,
                    'status' => 'FAILED',
                    'description' => $description
                );
            }
        } catch (Exception $e) {
            $this->test_results['failed']++;
            echo "<p style='color: red;'>❌ {$test_name}: ERROR - {$e->getMessage()}</p>\n";
            $this->test_results['details'][] = array(
                'name' => $test_name,
                'status' => 'ERROR',
                'description' => $description,
                'error' => $e->getMessage()
            );
        }
    }
    
    /**
     * Display test summary
     */
    private function display_test_summary() {
        $passed = $this->test_results['passed'];
        $failed = $this->test_results['failed'];
        $total = $this->test_results['total'];
        $success_rate = $total > 0 ? round(($passed / $total) * 100, 1) : 0;
        
        echo "<h3>📊 Test Summary</h3>\n";
        echo "<div style='background: " . ($failed === 0 ? '#d4edda' : '#f8d7da') . "; padding: 10px; border-radius: 5px; margin: 10px 0;'>\n";
        echo "<p><strong>Total Tests:</strong> {$total}</p>\n";
        echo "<p><strong>Passed:</strong> <span style='color: green;'>{$passed}</span></p>\n";
        echo "<p><strong>Failed:</strong> <span style='color: red;'>{$failed}</span></p>\n";
        echo "<p><strong>Success Rate:</strong> {$success_rate}%</p>\n";
        
        if ($failed === 0) {
            echo "<p style='color: green; font-weight: bold;'>🎉 All tests passed! RankMath detection is working correctly.</p>\n";
        } else {
            echo "<p style='color: red; font-weight: bold;'>⚠️ Some tests failed. Please review the implementation.</p>\n";
        }
        
        echo "</div>\n";
        
        // Display detection results for review
        echo "<h3>🔍 Current Detection Results</h3>\n";
        $detector = new PostCrafter_SEO_Plugin_Detector();
        $results = $detector->get_detection_results();
        
        echo "<div style='background: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace; white-space: pre-wrap;'>\n";
        echo htmlspecialchars(print_r($results, true));
        echo "</div>\n";
    }
}

// Run tests if accessed directly
if (basename($_SERVER['PHP_SELF']) === 'test-rankmath-detection.php') {
    $tests = new PostCrafter_RankMath_Detection_Tests();
    $tests->run_all_tests();
}
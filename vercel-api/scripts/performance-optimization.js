#!/usr/bin/env node

/**
 * PostCrafter Performance Optimization Script
 * Analyzes current performance and provides optimization recommendations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Performance analysis configuration
const PERFORMANCE_CONFIG = {
  targetResponseTime: 2000, // 2 seconds
  targetThroughput: 100,    // requests per second
  targetErrorRate: 0.05,    // 5%
  maxMemoryUsage: 512,      // 512MB
  maxCpuUsage: 80,          // 80%
  
  criticalEndpoints: [
    '/api/publish',
    '/api/health',
    '/api/posts/status'
  ],
  
  performanceFiles: [
    'src/middleware/rate-limiter.ts',
    'src/utils/image-optimizer.ts',
    'src/utils/wordpress.ts',
    'api/publish.ts'
  ]
};

// Performance analysis results
const performanceResults = {
  timestamp: new Date().toISOString(),
  overallScore: 0,
  totalChecks: 0,
  passedChecks: 0,
  failedChecks: 0,
  warnings: [],
  errors: [],
  recommendations: [],
  details: {}
};

/**
 * Utility functions
 */
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function readFileContent(filePath) {
  try {
    return fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');
  } catch (error) {
    return null;
  }
}

function checkPattern(content, pattern, description) {
  const matches = content.match(pattern);
  if (matches) {
    return true;
  }
  performanceResults.warnings.push(`${description}: Not found`);
  return false;
}

/**
 * Performance checks
 */
function checkRateLimitingImplementation() {
  log('Checking rate limiting implementation...');
  const rateLimitFile = readFileContent('src/middleware/rate-limiter.ts');
  
  if (!rateLimitFile) {
    performanceResults.warnings.push('Rate limiting file not found - checking CORS file');
    const corsFile = readFileContent('src/middleware/cors.ts');
    if (corsFile && corsFile.includes('rateLimit')) {
      performanceResults.details.rateLimiting = { score: 80, implemented: true };
      return true;
    } else {
      performanceResults.details.rateLimiting = { score: 0, implemented: false };
      return false;
    }
  }

  const checks = [
    { pattern: /TokenBucket/, description: 'Token bucket algorithm' },
    { pattern: /rateLimit/, description: 'Rate limiting function' },
    { pattern: /X-RateLimit/, description: 'Rate limit headers' },
    { pattern: /burst/, description: 'Burst handling' },
    { pattern: /window/, description: 'Time window configuration' }
  ];

  let passed = 0;
  checks.forEach(check => {
    if (checkPattern(rateLimitFile, check.pattern, check.description)) {
      passed++;
    }
  });

  performanceResults.details.rateLimiting = {
    score: Math.round((passed / checks.length) * 100),
    implemented: passed > 0
  };

  return passed > 0;
}

function checkImageOptimization() {
  log('Checking image optimization implementation...');
  const imageOptimizerFile = readFileContent('src/utils/image-optimizer.ts');
  
  if (!imageOptimizerFile) {
    performanceResults.errors.push('Image optimizer file not found');
    return false;
  }

  const checks = [
    { pattern: /optimizeImage/, description: 'Image optimization function' },
    { pattern: /resize/, description: 'Image resizing' },
    { pattern: /compress/, description: 'Image compression' },
    { pattern: /format/, description: 'Format conversion' },
    { pattern: /cache/, description: 'Caching mechanism' }
  ];

  let passed = 0;
  checks.forEach(check => {
    if (checkPattern(imageOptimizerFile, check.pattern, check.description)) {
      passed++;
    }
  });

  performanceResults.details.imageOptimization = {
    score: Math.round((passed / checks.length) * 100),
    checks: checks.length,
    passed: passed
  };

  return passed === checks.length;
}

function checkWordPressOptimization() {
  log('Checking WordPress integration optimization...');
  const wordpressFile = readFileContent('src/utils/wordpress.ts');
  
  if (!wordpressFile) {
    performanceResults.errors.push('WordPress integration file not found');
    return false;
  }

  const checks = [
    { pattern: /timeout/, description: 'Request timeout configuration' },
    { pattern: /retry/, description: 'Retry mechanism' },
    { pattern: /cache/, description: 'Response caching' },
    { pattern: /batch/, description: 'Batch processing' },
    { pattern: /connection/, description: 'Connection pooling' }
  ];

  let passed = 0;
  checks.forEach(check => {
    if (checkPattern(wordpressFile, check.pattern, check.description)) {
      passed++;
    }
  });

  performanceResults.details.wordpressOptimization = {
    score: Math.round((passed / checks.length) * 100),
    checks: checks.length,
    passed: passed
  };

  return passed === checks.length;
}

function checkCachingImplementation() {
  log('Checking caching implementation...');
  
  const filesToCheck = [
    'src/utils/cache.ts',
    'src/utils/wordpress.ts',
    'src/utils/image-optimizer.ts',
    'api/publish.ts'
  ];

  let cachingFeatures = 0;
  let totalFeatures = 0;
  
  filesToCheck.forEach(file => {
    const content = readFileContent(file);
    if (content) {
      const cachePatterns = [
        /LRUCache/i,
        /WordPressCache/i,
        /ConnectionPool/i,
        /cache\.set/i,
        /cache\.get/i,
        /wordPressCache/i,
        /connectionPool/i,
        /ttl/i,
        /compression/i
      ];
      
      cachePatterns.forEach(pattern => {
        totalFeatures++;
        if (content.match(pattern)) {
          cachingFeatures++;
        }
      });
    }
  });

  // Check for specific cache implementation
  const cacheFile = readFileContent('src/utils/cache.ts');
  if (cacheFile) {
    if (cacheFile.includes('class LRUCache')) cachingFeatures += 2;
    if (cacheFile.includes('class WordPressCache')) cachingFeatures += 2;
    if (cacheFile.includes('class ConnectionPool')) cachingFeatures += 2;
    if (cacheFile.includes('wordPressCache')) cachingFeatures += 1;
    if (cacheFile.includes('connectionPool')) cachingFeatures += 1;
    totalFeatures += 8;
  }

  performanceResults.details.caching = {
    score: Math.round((cachingFeatures / totalFeatures) * 100),
    features: cachingFeatures,
    total: totalFeatures
  };

  return cachingFeatures > 0;
}

function checkErrorHandling() {
  log('Checking error handling and recovery...');
  
  const filesToCheck = [
    'src/utils/circuit-breaker.ts',
    'src/utils/wordpress.ts',
    'src/utils/wordpress-error-handler.ts',
    'api/publish.ts'
  ];

  let errorHandlingFeatures = 0;
  let totalFeatures = 0;
  
  filesToCheck.forEach(file => {
    const content = readFileContent(file);
    if (content) {
      const errorPatterns = [
        /CircuitBreaker/i,
        /wordPressCircuitBreaker/i,
        /try\s*{/i,
        /catch\s*{/i,
        /finally\s*{/i,
        /retry/i,
        /fallback/i,
        /circuit.*breaker/i,
        /failureThreshold/i,
        /recoveryTimeout/i
      ];
      
      errorPatterns.forEach(pattern => {
        totalFeatures++;
        if (content.match(pattern)) {
          errorHandlingFeatures++;
        }
      });
    }
  });

  // Check for specific circuit breaker implementation
  const circuitBreakerFile = readFileContent('src/utils/circuit-breaker.ts');
  if (circuitBreakerFile) {
    if (circuitBreakerFile.includes('class CircuitBreaker')) errorHandlingFeatures += 3;
    if (circuitBreakerFile.includes('class WordPressCircuitBreaker')) errorHandlingFeatures += 2;
    if (circuitBreakerFile.includes('executeWordPressCall')) errorHandlingFeatures += 2;
    if (circuitBreakerFile.includes('failureThreshold')) errorHandlingFeatures += 1;
    if (circuitBreakerFile.includes('recoveryTimeout')) errorHandlingFeatures += 1;
    totalFeatures += 9;
  }

  performanceResults.details.errorHandling = {
    score: Math.round((errorHandlingFeatures / totalFeatures) * 100),
    features: errorHandlingFeatures,
    total: totalFeatures
  };

  return errorHandlingFeatures > 0;
}

function checkAsyncProcessing() {
  log('Checking asynchronous processing implementation...');
  
  const filesToCheck = [
    'src/utils/batch-processor.ts',
    'api/publish.ts',
    'src/utils/wordpress.ts',
    'src/utils/image-optimizer.ts'
  ];

  let asyncFeatures = 0;
  let totalFeatures = 0;
  
  filesToCheck.forEach(file => {
    const content = readFileContent(file);
    if (content) {
      const asyncPatterns = [
        /BatchProcessor/i,
        /wordPressBatchProcessor/i,
        /concurrency/i,
        /batch.*process/i,
        /Promise\.all/i,
        /async.*await/i,
        /setTimeout/i,
        /setInterval/i,
        /async/i,
        /await/i,
        /Promise/i,
        /setImmediate/i
      ];
      
      asyncPatterns.forEach(pattern => {
        totalFeatures++;
        if (content.match(pattern)) {
          asyncFeatures++;
        }
      });
    }
  });

  // Check for specific batch processing implementation
  const batchProcessorFile = readFileContent('src/utils/batch-processor.ts');
  if (batchProcessorFile) {
    if (batchProcessorFile.includes('class BatchProcessor')) asyncFeatures += 3;
    if (batchProcessorFile.includes('class WordPressBatchProcessor')) asyncFeatures += 2;
    if (batchProcessorFile.includes('maxConcurrency')) asyncFeatures += 2;
    if (batchProcessorFile.includes('batchSize')) asyncFeatures += 2;
    if (batchProcessorFile.includes('executeWithConcurrencyLimit')) asyncFeatures += 2;
    totalFeatures += 11;
  }

  performanceResults.details.asyncProcessing = {
    score: Math.round((asyncFeatures / totalFeatures) * 100),
    features: asyncFeatures,
    total: totalFeatures
  };

  return asyncFeatures > 0;
}

function checkLoadTestingSetup() {
  log('Checking load testing setup...');
  
  const loadTestFiles = [
    'load-tests/k6-load-test.js',
    'load-tests/performance-monitor.js',
    'load-tests/stress-test-scenarios.js'
  ];

  let availableTests = 0;
  
  loadTestFiles.forEach(file => {
    if (readFileContent(file)) {
      availableTests++;
    }
  });

  performanceResults.details.loadTesting = {
    score: Math.round((availableTests / loadTestFiles.length) * 100),
    available: availableTests,
    total: loadTestFiles.length
  };

  return availableTests === loadTestFiles.length;
}

function checkMonitoringSetup() {
  log('Checking performance monitoring setup...');
  
  const monitoringFiles = [
    'src/utils/monitoring.ts',
    'src/dashboard/',
    'src/services/metrics.ts'
  ];

  let monitoringFeatures = 0;
  let totalFeatures = 0;
  
  monitoringFiles.forEach(file => {
    const content = readFileContent(file);
    if (content) {
      const monitoringPatterns = [
        /metrics/i,
        /monitor/i,
        /dashboard/i,
        /analytics/i,
        /performance/i
      ];
      
      monitoringPatterns.forEach(pattern => {
        totalFeatures++;
        if (content.match(pattern)) {
          monitoringFeatures++;
        }
      });
    }
  });

  performanceResults.details.monitoring = {
    score: Math.round((monitoringFeatures / totalFeatures) * 100),
    features: monitoringFeatures,
    total: totalFeatures
  };

  return monitoringFeatures > 0;
}

function checkVercelOptimization() {
  log('Checking Vercel-specific optimizations...');
  
  const vercelConfig = readFileContent('vercel.json');
  if (!vercelConfig) {
    performanceResults.warnings.push('Vercel configuration file not found');
    return false;
  }

  const checks = [
    { pattern: /functions/i, description: 'Function configuration' },
    { pattern: /maxDuration/i, description: 'Max duration setting' },
    { pattern: /memory/i, description: 'Memory allocation' },
    { pattern: /regions/i, description: 'Region configuration' }
  ];

  let passed = 0;
  checks.forEach(check => {
    if (checkPattern(vercelConfig, check.pattern, check.description)) {
      passed++;
    }
  });

  performanceResults.details.vercelOptimization = {
    score: Math.round((passed / checks.length) * 100),
    checks: checks.length,
    passed: passed
  };

  return passed > 0;
}

/**
 * Main performance analysis function
 */
function runPerformanceAnalysis() {
  log('Starting PostCrafter Performance Analysis...', 'info');
  
  const checks = [
    { name: 'Rate Limiting', fn: checkRateLimitingImplementation },
    { name: 'Image Optimization', fn: checkImageOptimization },
    { name: 'WordPress Optimization', fn: checkWordPressOptimization },
    { name: 'Caching', fn: checkCachingImplementation },
    { name: 'Error Handling', fn: checkErrorHandling },
    { name: 'Async Processing', fn: checkAsyncProcessing },
    { name: 'Load Testing', fn: checkLoadTestingSetup },
    { name: 'Monitoring', fn: checkMonitoringSetup },
    { name: 'Vercel Optimization', fn: checkVercelOptimization }
  ];

  checks.forEach(check => {
    performanceResults.totalChecks++;
    try {
      if (check.fn()) {
        performanceResults.passedChecks++;
      } else {
        performanceResults.failedChecks++;
      }
    } catch (error) {
      performanceResults.failedChecks++;
      performanceResults.errors.push(`Error in ${check.name} check: ${error.message}`);
    }
  });

  // Calculate overall score
  performanceResults.overallScore = Math.round((performanceResults.passedChecks / performanceResults.totalChecks) * 100);

  // Generate recommendations
  if (performanceResults.overallScore < 80) {
    performanceResults.recommendations.push('Performance score below 80% - implement optimizations before deployment');
  }
  
  if (performanceResults.errors.length > 0) {
    performanceResults.recommendations.push('Critical performance issues found - must be resolved before deployment');
  }
  
  if (performanceResults.warnings.length > 3) {
    performanceResults.recommendations.push('Multiple performance warnings detected - review optimization opportunities');
  }

  return performanceResults;
}

/**
 * Generate performance report
 */
function generatePerformanceReport(results) {
  const report = {
    summary: {
      timestamp: results.timestamp,
      overallScore: results.overallScore,
      status: results.overallScore >= 90 ? 'EXCELLENT' : results.overallScore >= 80 ? 'GOOD' : results.overallScore >= 70 ? 'FAIR' : 'NEEDS_IMPROVEMENT',
      totalChecks: results.totalChecks,
      passedChecks: results.passedChecks,
      failedChecks: results.failedChecks
    },
    details: results.details,
    issues: {
      errors: results.errors,
      warnings: results.warnings
    },
    recommendations: results.recommendations,
    optimizationOpportunities: [
      'Implement response caching for frequently accessed data',
      'Add connection pooling for WordPress API calls',
      'Optimize image processing with better compression algorithms',
      'Implement circuit breaker pattern for external API calls',
      'Add request batching for multiple WordPress operations',
      'Configure Vercel function memory and duration limits',
      'Implement progressive image loading',
      'Add performance monitoring dashboards',
      'Optimize database queries if applicable',
      'Implement CDN for static assets'
    ],
    nextSteps: [
      'Run load tests to validate performance under stress',
      'Monitor response times in staging environment',
      'Implement caching strategies for WordPress responses',
      'Optimize image processing pipeline',
      'Configure proper Vercel scaling settings',
      'Set up performance monitoring and alerting',
      'Document performance benchmarks and SLAs'
    ]
  };

  return report;
}

/**
 * Main execution
 */
if (require.main === module) {
  try {
    const results = runPerformanceAnalysis();
    const report = generatePerformanceReport(results);
    
    // Output results
    console.log('\n' + '='.repeat(60));
    console.log('POSTCRAFTER PERFORMANCE ANALYSIS REPORT');
    console.log('='.repeat(60));
    
    console.log(`\nOverall Performance Score: ${report.summary.overallScore}%`);
    console.log(`Status: ${report.summary.status}`);
    console.log(`Checks: ${report.summary.passedChecks}/${report.summary.totalChecks} passed`);
    
    console.log('\nDetailed Results:');
    Object.entries(report.details).forEach(([category, details]) => {
      const score = details.score || 0;
      const status = score >= 90 ? '✅' : score >= 80 ? '✅' : score >= 70 ? '⚠️' : '❌';
      console.log(`  ${status} ${category}: ${score}%`);
    });
    
    if (report.issues.errors.length > 0) {
      console.log('\n❌ Critical Issues:');
      report.issues.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (report.issues.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      report.issues.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
    
    console.log('\n🚀 Optimization Opportunities:');
    report.optimizationOpportunities.forEach(opp => console.log(`  - ${opp}`));
    
    console.log('\n📋 Next Steps:');
    report.nextSteps.forEach(step => console.log(`  - ${step}`));
    
    // Save detailed report
    const reportPath = path.join(process.cwd(), 'performance-analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    console.log('\n' + '='.repeat(60));
    
    // Exit with appropriate code
    process.exit(report.summary.status === 'NEEDS_IMPROVEMENT' ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Performance analysis failed:', error.message);
    process.exit(1);
  }
}

module.exports = { runPerformanceAnalysis, generatePerformanceReport }; 
#!/usr/bin/env node

/**
 * End-to-End Test Runner for PostCrafter API
 * 
 * This script orchestrates the execution of the complete automated test suite,
 * including environment setup, test execution, and reporting.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const config = {
  testTimeout: 30000,
  retryCount: 2,
  environment: process.env.NODE_ENV || 'test',
  apiUrl: process.env.TEST_API_URL || 'http://localhost:3000',
  wordpressUrl: process.env.TEST_WORDPRESS_URL || 'https://test-wp.postcrafter.com',
  apiKey: process.env.TEST_API_KEY || 'test-api-key',
  outputDir: './test-results',
  coverageDir: './coverage'
};

class TestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      startTime: null,
      endTime: null,
      testSuites: []
    };
    
    this.setupOutputDirectory();
  }

  setupOutputDirectory() {
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }
    
    if (!fs.existsSync(config.coverageDir)) {
      fs.mkdirSync(config.coverageDir, { recursive: true });
    }
  }

  async run() {
    console.log('🚀 Starting PostCrafter E2E Test Suite');
    console.log('=====================================');
    console.log(`Environment: ${config.environment}`);
    console.log(`API URL: ${config.apiUrl}`);
    console.log(`WordPress URL: ${config.wordpressUrl}`);
    console.log(`Output Directory: ${config.outputDir}\n`);

    this.results.startTime = new Date();

    try {
      // Pre-test validation
      await this.validateEnvironment();
      
      // Run test suites in order
      await this.runTestSuite('Core Integration Tests', 'src/tests/e2e-integration.test.ts');
      await this.runTestSuite('API Endpoints Tests', 'src/tests/api-endpoints.test.ts');
      await this.runTestSuite('Performance Tests', 'src/tests/performance.test.ts');
      await this.runTestSuite('Existing Service Tests', 'src/services/__tests__/*.test.ts');
      
      // Generate final report
      this.results.endTime = new Date();
      await this.generateReport();
      
      // Exit with appropriate code
      const exitCode = this.results.failed > 0 ? 1 : 0;
      console.log(`\n🏁 Test suite completed with exit code: ${exitCode}`);
      process.exit(exitCode);
      
    } catch (error) {
      console.error('❌ Test suite failed with error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  async validateEnvironment() {
    console.log('🔍 Validating test environment...');
    
    // Check required environment variables
    const requiredEnvVars = ['TEST_API_URL', 'TEST_WORDPRESS_URL', 'TEST_API_KEY'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
      console.warn('Using default values for testing...');
    }

    // Verify API accessibility
    try {
      const healthCheck = await this.makeHealthCheckRequest();
      if (healthCheck.status === 'healthy') {
        console.log('✅ API health check passed');
      } else {
        throw new Error('API health check failed');
      }
    } catch (error) {
      console.warn('⚠️  API health check failed - running tests with mocked responses');
    }

    console.log('✅ Environment validation completed\n');
  }

  async makeHealthCheckRequest() {
    const axios = require('axios');
    try {
      const response = await axios.get(`${config.apiUrl}/api/health`, {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }

  async runTestSuite(suiteName, testPattern) {
    console.log(`\n📝 Running ${suiteName}...`);
    console.log(`Pattern: ${testPattern}`);
    
    const suiteResult = {
      name: suiteName,
      pattern: testPattern,
      startTime: new Date(),
      endTime: null,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      output: ''
    };

    try {
      const jestArgs = [
        '--testPathPattern', testPattern,
        '--verbose',
        '--detectOpenHandles',
        '--forceExit',
        '--maxWorkers=1',
        `--testTimeout=${config.testTimeout}`,
        '--json',
        '--outputFile', path.join(config.outputDir, `${suiteName.replace(/\s+/g, '-').toLowerCase()}-results.json`)
      ];

      if (process.env.CI) {
        jestArgs.push('--ci', '--coverage', '--watchAll=false');
      }

      const result = await this.runJest(jestArgs);
      
      suiteResult.endTime = new Date();
      suiteResult.duration = suiteResult.endTime - suiteResult.startTime;
      suiteResult.output = result.output;

      // Parse Jest results
      if (result.success && result.jsonOutput) {
        const jestResults = JSON.parse(result.jsonOutput);
        suiteResult.passed = jestResults.numPassedTests || 0;
        suiteResult.failed = jestResults.numFailedTests || 0;
        suiteResult.skipped = jestResults.numPendingTests || 0;
      } else {
        suiteResult.failed = 1; // Mark suite as failed if Jest couldn't run
      }

      // Update overall results
      this.results.total += suiteResult.passed + suiteResult.failed + suiteResult.skipped;
      this.results.passed += suiteResult.passed;
      this.results.failed += suiteResult.failed;
      this.results.skipped += suiteResult.skipped;
      this.results.testSuites.push(suiteResult);

      // Log results
      if (suiteResult.failed === 0) {
        console.log(`✅ ${suiteName} - All tests passed (${suiteResult.passed} tests)`);
      } else {
        console.log(`❌ ${suiteName} - ${suiteResult.failed} test(s) failed, ${suiteResult.passed} passed`);
      }
      
      console.log(`   Duration: ${(suiteResult.duration / 1000).toFixed(2)}s`);

    } catch (error) {
      suiteResult.endTime = new Date();
      suiteResult.duration = suiteResult.endTime - suiteResult.startTime;
      suiteResult.failed = 1;
      suiteResult.output = error.message;
      
      this.results.total += 1;
      this.results.failed += 1;
      this.results.testSuites.push(suiteResult);
      
      console.log(`❌ ${suiteName} failed: ${error.message}`);
    }
  }

  async runJest(args) {
    return new Promise((resolve, reject) => {
      const jest = spawn('npx', ['jest', ...args], {
        cwd: process.cwd(),
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let stdout = '';
      let stderr = '';
      let jsonOutput = '';

      jest.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        
        // Capture JSON output if present
        if (output.includes('"testResults"')) {
          jsonOutput += output;
        }
        
        // Real-time output for debugging
        if (!process.env.CI) {
          process.stdout.write(output);
        }
      });

      jest.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        
        if (!process.env.CI) {
          process.stderr.write(output);
        }
      });

      jest.on('close', (code) => {
        resolve({
          success: code === 0,
          output: stdout + stderr,
          jsonOutput: jsonOutput,
          exitCode: code
        });
      });

      jest.on('error', (error) => {
        reject(new Error(`Jest execution failed: ${error.message}`));
      });

      // Handle timeout
      const timeout = setTimeout(() => {
        jest.kill('SIGKILL');
        reject(new Error('Jest execution timed out'));
      }, config.testTimeout * 2); // Double the test timeout for the process

      jest.on('close', () => {
        clearTimeout(timeout);
      });
    });
  }

  async generateReport() {
    console.log('\n📊 Generating test report...');
    
    const duration = this.results.endTime - this.results.startTime;
    const passRate = this.results.total > 0 ? (this.results.passed / this.results.total * 100).toFixed(2) : 0;

    // Console summary
    console.log('\n===============================================');
    console.log('🧪 TEST EXECUTION SUMMARY');
    console.log('===============================================');
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⏭️  Skipped: ${this.results.skipped}`);
    console.log(`📈 Pass Rate: ${passRate}%`);
    console.log(`⏱️  Total Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log('===============================================');

    // Test suite breakdown
    console.log('\n📋 TEST SUITE BREAKDOWN:');
    this.results.testSuites.forEach(suite => {
      const suitePassRate = suite.passed + suite.failed > 0 
        ? (suite.passed / (suite.passed + suite.failed) * 100).toFixed(2) 
        : 0;
      
      console.log(`\n${suite.name}:`);
      console.log(`  ✅ Passed: ${suite.passed}`);
      console.log(`  ❌ Failed: ${suite.failed}`);
      console.log(`  ⏭️  Skipped: ${suite.skipped}`);
      console.log(`  📈 Pass Rate: ${suitePassRate}%`);
      console.log(`  ⏱️  Duration: ${(suite.duration / 1000).toFixed(2)}s`);
    });

    // Generate JSON report
    const jsonReport = {
      summary: {
        total: this.results.total,
        passed: this.results.passed,
        failed: this.results.failed,
        skipped: this.results.skipped,
        passRate: passRate,
        duration: duration,
        startTime: this.results.startTime.toISOString(),
        endTime: this.results.endTime.toISOString()
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        apiUrl: config.apiUrl,
        wordpressUrl: config.wordpressUrl,
        testEnvironment: config.environment
      },
      testSuites: this.results.testSuites,
      recommendations: this.generateRecommendations()
    };

    const reportPath = path.join(config.outputDir, 'e2e-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(jsonReport, null, 2));
    console.log(`\n📄 JSON report saved to: ${reportPath}`);

    // Generate HTML report
    await this.generateHTMLReport(jsonReport);
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.failed > 0) {
      recommendations.push('Review failed tests and fix underlying issues before proceeding');
    }
    
    const avgSuiteDuration = this.results.testSuites.reduce((sum, suite) => sum + suite.duration, 0) / this.results.testSuites.length;
    if (avgSuiteDuration > 60000) { // More than 1 minute average
      recommendations.push('Consider optimizing test performance - average suite duration is high');
    }
    
    if (this.results.skipped > 0) {
      recommendations.push('Review skipped tests and implement missing functionality');
    }
    
    const passRate = this.results.total > 0 ? (this.results.passed / this.results.total * 100) : 0;
    if (passRate < 95) {
      recommendations.push('Improve test coverage and reliability - pass rate is below 95%');
    }
    
    return recommendations;
  }

  async generateHTMLReport(jsonReport) {
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PostCrafter E2E Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 2em; font-weight: bold; margin: 10px 0; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .suites { margin-top: 30px; }
        .suite { background: #f8f9fa; margin-bottom: 20px; padding: 20px; border-radius: 6px; }
        .suite-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .suite-name { font-size: 1.2em; font-weight: bold; }
        .suite-stats { display: flex; gap: 15px; }
        .recommendations { background: #e3f2fd; padding: 20px; border-radius: 6px; margin-top: 30px; }
        .recommendations h3 { margin-top: 0; color: #1976d2; }
        .recommendations ul { margin: 0; padding-left: 20px; }
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.9em; }
        .badge.passed { background: #d4edda; color: #155724; }
        .badge.failed { background: #f8d7da; color: #721c24; }
        .badge.skipped { background: #fff3cd; color: #856404; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 PostCrafter E2E Test Report</h1>
            <p>Generated on ${jsonReport.summary.endTime}</p>
            <p>Environment: ${jsonReport.environment.testEnvironment} | Node: ${jsonReport.environment.nodeVersion}</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <h3>Total Tests</h3>
                <div class="value">${jsonReport.summary.total}</div>
            </div>
            <div class="metric">
                <h3>Passed</h3>
                <div class="value passed">${jsonReport.summary.passed}</div>
            </div>
            <div class="metric">
                <h3>Failed</h3>
                <div class="value failed">${jsonReport.summary.failed}</div>
            </div>
            <div class="metric">
                <h3>Pass Rate</h3>
                <div class="value ${jsonReport.summary.failed === 0 ? 'passed' : 'failed'}">${jsonReport.summary.passRate}%</div>
            </div>
            <div class="metric">
                <h3>Duration</h3>
                <div class="value">${(jsonReport.summary.duration / 1000).toFixed(2)}s</div>
            </div>
        </div>
        
        <div class="suites">
            <h2>Test Suites</h2>
            ${jsonReport.testSuites.map(suite => `
                <div class="suite">
                    <div class="suite-header">
                        <div class="suite-name">${suite.name}</div>
                        <div class="suite-stats">
                            <span class="badge passed">${suite.passed} passed</span>
                            ${suite.failed > 0 ? `<span class="badge failed">${suite.failed} failed</span>` : ''}
                            ${suite.skipped > 0 ? `<span class="badge skipped">${suite.skipped} skipped</span>` : ''}
                        </div>
                    </div>
                    <div>Duration: ${(suite.duration / 1000).toFixed(2)}s</div>
                    <div>Pattern: <code>${suite.pattern}</code></div>
                </div>
            `).join('')}
        </div>
        
        ${jsonReport.recommendations.length > 0 ? `
            <div class="recommendations">
                <h3>🎯 Recommendations</h3>
                <ul>
                    ${jsonReport.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
    </div>
</body>
</html>`;

    const htmlPath = path.join(config.outputDir, 'e2e-test-report.html');
    fs.writeFileSync(htmlPath, htmlTemplate);
    console.log(`📄 HTML report saved to: ${htmlPath}`);
  }
}

// Run the test suite
if (require.main === module) {
  const runner = new TestRunner();
  runner.run().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;
#!/usr/bin/env node

/**
 * PostCrafter Load Test Runner
 * 
 * Orchestrates comprehensive load and stress testing using k6,
 * generates performance reports, and analyzes system bottlenecks.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Test configuration
const config = {
  apiUrl: process.env.TEST_API_URL || 'http://localhost:3000',
  wordpressUrl: process.env.TEST_WORDPRESS_URL || 'https://test-wp.postcrafter.com',
  apiKey: process.env.TEST_API_KEY || 'test-api-key',
  outputDir: './load-test-results',
  k6Binary: process.env.K6_BINARY || 'k6',
  testTimeout: 3600000, // 1 hour timeout
  environment: process.env.NODE_ENV || 'test'
};

// Available test suites
const testSuites = {
  load: {
    name: 'Load Testing',
    script: 'load-tests/k6-load-test.js',
    description: 'Comprehensive load testing with gradual ramp-up',
    duration: '35m',
    maxUsers: 100
  },
  
  spike: {
    name: 'Spike Testing',
    script: 'load-tests/stress-test-scenarios.js',
    description: 'Sudden load spike testing',
    duration: '5m',
    maxUsers: 200,
    env: { STRESS_TYPE: 'spike' }
  },
  
  endurance: {
    name: 'Endurance Testing',
    script: 'load-tests/stress-test-scenarios.js',
    description: 'Extended duration load testing',
    duration: '35m',
    maxUsers: 20,
    env: { STRESS_TYPE: 'endurance' }
  },
  
  breaking_point: {
    name: 'Breaking Point Testing',
    script: 'load-tests/stress-test-scenarios.js',
    description: 'Find system breaking point',
    duration: '25m',
    maxUsers: 500,
    env: { STRESS_TYPE: 'breaking_point' }
  },
  
  memory_stress: {
    name: 'Memory Stress Testing',
    script: 'load-tests/stress-test-scenarios.js',
    description: 'Large payload memory testing',
    duration: '10m',
    maxUsers: 30,
    env: { STRESS_TYPE: 'memory_stress' }
  },
  
  monitor: {
    name: 'Performance Monitoring',
    script: 'load-tests/performance-monitor.js',
    description: 'Continuous performance monitoring',
    duration: '15m',
    maxUsers: 25
  }
};

class LoadTestRunner {
  constructor() {
    this.results = {
      startTime: null,
      endTime: null,
      testSuites: [],
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        performanceIssues: [],
        recommendations: []
      }
    };
    
    this.setupOutputDirectory();
  }

  setupOutputDirectory() {
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }
    
    // Create subdirectories
    const subdirs = ['reports', 'metrics', 'logs'];
    subdirs.forEach(dir => {
      const dirPath = path.join(config.outputDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
  }

  async run(testTypes = ['load']) {
    console.log('⚡ Starting PostCrafter Load Testing Suite');
    console.log('==========================================');
    console.log(`Environment: ${config.environment}`);
    console.log(`API URL: ${config.apiUrl}`);
    console.log(`WordPress URL: ${config.wordpressUrl}`);
    console.log(`Test Types: ${testTypes.join(', ')}`);
    console.log(`Output Directory: ${config.outputDir}\n`);

    this.results.startTime = new Date();

    try {
      // Pre-test validation
      await this.validateEnvironment();
      
      // Install k6 if needed
      await this.ensureK6Available();
      
      // Run selected test suites
      for (const testType of testTypes) {
        if (testSuites[testType]) {
          await this.runTestSuite(testType, testSuites[testType]);
        } else {
          console.warn(`⚠️ Unknown test type: ${testType}`);
        }
      }
      
      // Generate comprehensive report
      this.results.endTime = new Date();
      await this.generateLoadTestReport();
      
      // Exit with appropriate code
      const exitCode = this.results.summary.failedTests > 0 ? 1 : 0;
      console.log(`\n🏁 Load testing completed with exit code: ${exitCode}`);
      process.exit(exitCode);
      
    } catch (error) {
      console.error('❌ Load testing failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  async validateEnvironment() {
    console.log('🔍 Validating load test environment...');
    
    // Check system resources
    const totalMemory = os.totalmem() / (1024 * 1024 * 1024); // GB
    const cpuCount = os.cpus().length;
    
    console.log(`System: ${totalMemory.toFixed(1)}GB RAM, ${cpuCount} CPU cores`);
    
    if (totalMemory < 4) {
      console.warn('⚠️ Low system memory - load tests may be limited');
    }
    
    // Verify API accessibility
    try {
      const axios = require('axios');
      const response = await axios.get(`${config.apiUrl}/api/health`, {
        timeout: 10000
      });
      
      if (response.status === 200) {
        console.log('✅ API accessible for load testing');
      } else {
        throw new Error(`API health check failed: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ API accessibility check failed:', error.message);
      throw new Error('Cannot proceed with load testing - API not accessible');
    }
    
    console.log('✅ Environment validation completed\n');
  }

  async ensureK6Available() {
    console.log('🔧 Checking k6 availability...');
    
    try {
      const result = await this.runCommand(config.k6Binary, ['version'], {}, 5000);
      console.log(`✅ k6 available: ${result.output.split('\n')[0]}`);
    } catch (error) {
      console.log('📦 k6 not found, attempting to install...');
      await this.installK6();
    }
  }

  async installK6() {
    const platform = os.platform();
    let installCmd, installArgs;
    
    if (platform === 'darwin') {
      // macOS
      installCmd = 'brew';
      installArgs = ['install', 'k6'];
    } else if (platform === 'linux') {
      // Linux
      installCmd = 'sudo';
      installArgs = ['apt-get', 'update', '&&', 'sudo', 'apt-get', 'install', '-y', 'k6'];
    } else {
      throw new Error('Automatic k6 installation not supported on this platform. Please install k6 manually.');
    }
    
    try {
      await this.runCommand(installCmd, installArgs, {}, 120000); // 2 minutes timeout
      console.log('✅ k6 installed successfully');
    } catch (error) {
      throw new Error(`Failed to install k6: ${error.message}`);
    }
  }

  async runTestSuite(testType, suite) {
    console.log(`\n⚡ Running ${suite.name}...`);
    console.log(`Description: ${suite.description}`);
    console.log(`Max Users: ${suite.maxUsers}, Duration: ${suite.duration}`);
    
    const suiteResult = {
      type: testType,
      name: suite.name,
      description: suite.description,
      startTime: new Date(),
      endTime: null,
      duration: 0,
      passed: false,
      metrics: {},
      output: '',
      recommendations: []
    };

    try {
      // Prepare k6 arguments
      const k6Args = [
        'run',
        '--out', `json=${path.join(config.outputDir, 'metrics', `${testType}-metrics.json`)}`,
        '--summary-export', path.join(config.outputDir, 'reports', `${testType}-summary.json`),
        suite.script
      ];

      // Set environment variables
      const env = {
        ...process.env,
        TEST_API_URL: config.apiUrl,
        TEST_WORDPRESS_URL: config.wordpressUrl,
        TEST_API_KEY: config.apiKey,
        NODE_ENV: 'test',
        ...suite.env
      };

      // Run k6 test
      const result = await this.runCommand(config.k6Binary, k6Args, env, config.testTimeout);
      
      suiteResult.endTime = new Date();
      suiteResult.duration = suiteResult.endTime - suiteResult.startTime;
      suiteResult.output = result.output;
      suiteResult.passed = result.success;

      // Parse metrics if available
      await this.parseTestMetrics(testType, suiteResult);
      
      // Analyze results and generate recommendations
      this.analyzeTestResults(suiteResult);

      // Update summary
      this.results.summary.totalTests++;
      if (suiteResult.passed) {
        this.results.summary.passedTests++;
        console.log(`✅ ${suite.name} completed successfully`);
      } else {
        this.results.summary.failedTests++;
        console.log(`❌ ${suite.name} failed or had performance issues`);
      }
      
      console.log(`   Duration: ${(suiteResult.duration / 1000).toFixed(2)}s`);

    } catch (error) {
      suiteResult.endTime = new Date();
      suiteResult.duration = suiteResult.endTime - suiteResult.startTime;
      suiteResult.passed = false;
      suiteResult.output = error.message;
      
      this.results.summary.totalTests++;
      this.results.summary.failedTests++;
      
      console.log(`❌ ${suite.name} failed: ${error.message}`);
    }
    
    this.results.testSuites.push(suiteResult);
  }

  async parseTestMetrics(testType, suiteResult) {
    try {
      const metricsPath = path.join(config.outputDir, 'metrics', `${testType}-metrics.json`);
      const summaryPath = path.join(config.outputDir, 'reports', `${testType}-summary.json`);
      
      // Parse summary if available
      if (fs.existsSync(summaryPath)) {
        const summaryData = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
        suiteResult.metrics = summaryData.metrics || {};
      }
      
      // Parse detailed metrics if available
      if (fs.existsSync(metricsPath)) {
        const metricsData = fs.readFileSync(metricsPath, 'utf8');
        const metrics = metricsData.split('\n')
          .filter(line => line.trim())
          .map(line => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          })
          .filter(Boolean);
        
        suiteResult.detailedMetrics = metrics;
      }
      
    } catch (error) {
      console.warn(`⚠️ Could not parse metrics for ${testType}: ${error.message}`);
    }
  }

  analyzeTestResults(suiteResult) {
    const recommendations = [];
    const performanceIssues = [];
    
    // Analyze response times
    if (suiteResult.metrics.http_req_duration) {
      const p95 = suiteResult.metrics.http_req_duration.p95;
      if (p95 > 5000) {
        performanceIssues.push(`High 95th percentile response time: ${p95.toFixed(2)}ms`);
        recommendations.push('Investigate slow endpoints and optimize response times');
      }
    }
    
    // Analyze error rates
    if (suiteResult.metrics.http_req_failed) {
      const errorRate = suiteResult.metrics.http_req_failed.rate;
      if (errorRate > 0.05) {
        performanceIssues.push(`High error rate: ${(errorRate * 100).toFixed(2)}%`);
        recommendations.push('Investigate and fix high error rates');
      }
    }
    
    // Analyze throughput
    if (suiteResult.metrics.iterations) {
      const throughput = suiteResult.metrics.iterations.rate;
      if (throughput < 10) {
        performanceIssues.push(`Low request throughput: ${throughput.toFixed(2)} req/s`);
        recommendations.push('Optimize system for higher throughput');
      }
    }
    
    // Store analysis results
    suiteResult.recommendations = recommendations;
    this.results.summary.performanceIssues.push(...performanceIssues);
    this.results.summary.recommendations.push(...recommendations);
  }

  async generateLoadTestReport() {
    console.log('\n📊 Generating load test report...');
    
    const duration = this.results.endTime - this.results.startTime;
    const passRate = this.results.summary.totalTests > 0 
      ? (this.results.summary.passedTests / this.results.summary.totalTests * 100).toFixed(2) 
      : 0;

    // Console summary
    console.log('\n===============================================');
    console.log('⚡ LOAD TESTING SUMMARY');
    console.log('===============================================');
    console.log(`Total Test Suites: ${this.results.summary.totalTests}`);
    console.log(`✅ Passed: ${this.results.summary.passedTests}`);
    console.log(`❌ Failed: ${this.results.summary.failedTests}`);
    console.log(`📈 Pass Rate: ${passRate}%`);
    console.log(`⏱️ Total Duration: ${(duration / 1000 / 60).toFixed(2)} minutes`);
    console.log('===============================================');

    // Test suite breakdown
    console.log('\n📋 TEST SUITE BREAKDOWN:');
    this.results.testSuites.forEach(suite => {
      console.log(`\n${suite.name}:`);
      console.log(`  Status: ${suite.passed ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`  Duration: ${(suite.duration / 1000).toFixed(2)}s`);
      
      if (suite.metrics.http_req_duration) {
        console.log(`  Avg Response Time: ${suite.metrics.http_req_duration.avg.toFixed(2)}ms`);
        console.log(`  95th Percentile: ${suite.metrics.http_req_duration.p95.toFixed(2)}ms`);
      }
      
      if (suite.metrics.http_req_failed) {
        console.log(`  Error Rate: ${(suite.metrics.http_req_failed.rate * 100).toFixed(2)}%`);
      }
    });

    // Performance issues
    if (this.results.summary.performanceIssues.length > 0) {
      console.log('\n⚠️ PERFORMANCE ISSUES FOUND:');
      this.results.summary.performanceIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    }

    // Recommendations
    if (this.results.summary.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      [...new Set(this.results.summary.recommendations)].forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    // Generate JSON report
    const jsonReport = {
      summary: {
        ...this.results.summary,
        passRate: passRate,
        duration: duration,
        startTime: this.results.startTime.toISOString(),
        endTime: this.results.endTime.toISOString()
      },
      environment: {
        apiUrl: config.apiUrl,
        wordpressUrl: config.wordpressUrl,
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch(),
        memory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(1)}GB`,
        cpus: os.cpus().length
      },
      testSuites: this.results.testSuites
    };

    const reportPath = path.join(config.outputDir, 'load-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(jsonReport, null, 2));
    console.log(`\n📄 JSON report saved to: ${reportPath}`);

    // Generate HTML report
    await this.generateHTMLReport(jsonReport);
  }

  async generateHTMLReport(jsonReport) {
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PostCrafter Load Test Report</title>
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
        .warning { color: #ffc107; }
        .suites { margin-top: 30px; }
        .suite { background: #f8f9fa; margin-bottom: 20px; padding: 20px; border-radius: 6px; }
        .suite-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .suite-name { font-size: 1.2em; font-weight: bold; }
        .suite-status { padding: 4px 12px; border-radius: 4px; font-weight: bold; }
        .suite-status.passed { background: #d4edda; color: #155724; }
        .suite-status.failed { background: #f8d7da; color: #721c24; }
        .issues { background: #fff3cd; padding: 20px; border-radius: 6px; margin-top: 30px; border-left: 4px solid #ffc107; }
        .recommendations { background: #d1ecf1; padding: 20px; border-radius: 6px; margin-top: 20px; border-left: 4px solid #17a2b8; }
        .environment { background: #e2e3e5; padding: 15px; border-radius: 6px; margin-top: 30px; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚡ PostCrafter Load Test Report</h1>
            <p>Generated on ${jsonReport.summary.endTime}</p>
            <p>Duration: ${(jsonReport.summary.duration / 1000 / 60).toFixed(2)} minutes</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <h3>Test Suites</h3>
                <div class="value">${jsonReport.summary.totalTests}</div>
            </div>
            <div class="metric">
                <h3>Passed</h3>
                <div class="value passed">${jsonReport.summary.passedTests}</div>
            </div>
            <div class="metric">
                <h3>Failed</h3>
                <div class="value failed">${jsonReport.summary.failedTests}</div>
            </div>
            <div class="metric">
                <h3>Pass Rate</h3>
                <div class="value ${jsonReport.summary.failedTests === 0 ? 'passed' : 'failed'}">${jsonReport.summary.passRate}%</div>
            </div>
        </div>
        
        <div class="suites">
            <h2>Test Suite Results</h2>
            ${jsonReport.testSuites.map(suite => `
                <div class="suite">
                    <div class="suite-header">
                        <div class="suite-name">${suite.name}</div>
                        <div class="suite-status ${suite.passed ? 'passed' : 'failed'}">
                            ${suite.passed ? 'PASSED' : 'FAILED'}
                        </div>
                    </div>
                    <div><strong>Description:</strong> ${suite.description}</div>
                    <div><strong>Duration:</strong> ${(suite.duration / 1000).toFixed(2)}s</div>
                    ${suite.metrics.http_req_duration ? `
                        <div><strong>Avg Response Time:</strong> ${suite.metrics.http_req_duration.avg.toFixed(2)}ms</div>
                        <div><strong>95th Percentile:</strong> ${suite.metrics.http_req_duration.p95.toFixed(2)}ms</div>
                    ` : ''}
                    ${suite.metrics.http_req_failed ? `
                        <div><strong>Error Rate:</strong> ${(suite.metrics.http_req_failed.rate * 100).toFixed(2)}%</div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
        
        ${jsonReport.summary.performanceIssues.length > 0 ? `
            <div class="issues">
                <h3>⚠️ Performance Issues</h3>
                <ul>
                    ${jsonReport.summary.performanceIssues.map(issue => `<li>${issue}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
        
        ${jsonReport.summary.recommendations.length > 0 ? `
            <div class="recommendations">
                <h3>💡 Recommendations</h3>
                <ul>
                    ${[...new Set(jsonReport.summary.recommendations)].map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
        
        <div class="environment">
            <h3>Environment Information</h3>
            <p><strong>API URL:</strong> ${jsonReport.environment.apiUrl}</p>
            <p><strong>Platform:</strong> ${jsonReport.environment.platform} ${jsonReport.environment.arch}</p>
            <p><strong>Node Version:</strong> ${jsonReport.environment.nodeVersion}</p>
            <p><strong>System:</strong> ${jsonReport.environment.memory} RAM, ${jsonReport.environment.cpus} CPU cores</p>
        </div>
    </div>
</body>
</html>`;

    const htmlPath = path.join(config.outputDir, 'load-test-report.html');
    fs.writeFileSync(htmlPath, htmlTemplate);
    console.log(`📄 HTML report saved to: ${htmlPath}`);
  }

  async runCommand(command, args, env = {}, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        env: { ...process.env, ...env },
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        // Real-time output
        if (!process.env.CI) {
          process.stdout.write(output);
        }
      });

      proc.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        if (!process.env.CI) {
          process.stderr.write(output);
        }
      });

      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          output: stdout + stderr,
          exitCode: code
        });
      });

      proc.on('error', (error) => {
        reject(new Error(`Command execution failed: ${error.message}`));
      });

      // Handle timeout
      const timeoutId = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error('Command execution timed out'));
      }, timeout);

      proc.on('close', () => {
        clearTimeout(timeoutId);
      });
    });
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const testTypes = args.length > 0 ? args : ['load'];
  
  console.log(`Running load tests: ${testTypes.join(', ')}`);
  
  const runner = new LoadTestRunner();
  runner.run(testTypes).catch(error => {
    console.error('Load test runner failed:', error);
    process.exit(1);
  });
}

module.exports = LoadTestRunner;
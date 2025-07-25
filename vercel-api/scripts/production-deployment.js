#!/usr/bin/env node

/**
 * PostCrafter Production Deployment Script
 * Handles complete production deployment process
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Deployment configuration
const DEPLOYMENT_CONFIG = {
  projectName: 'postcrafter-vercel-api',
  environment: 'production',
  region: 'us-east-1',
  domain: 'api.postcrafter.com', // Replace with actual domain
  
  // Required environment variables
  requiredEnvVars: [
    'WORDPRESS_URL',
    'WORDPRESS_USERNAME',
    'WORDPRESS_APP_PASSWORD',
    'GPT_API_KEY',
    'JWT_SECRET'
  ],
  
  // Optional environment variables with defaults
  optionalEnvVars: {
    'NODE_ENV': 'production',
    'API_RATE_LIMIT_WINDOW_MS': '60000',
    'API_RATE_LIMIT_MAX_REQUESTS': '100',
    'WORDPRESS_TIMEOUT_MS': '30000',
    'LOG_LEVEL': 'info',
    'CORS_ORIGINS': 'https://chat.openai.com,https://chatgpt.com',
    'MAX_IMAGE_SIZE_MB': '10',
    'ENABLE_DEBUG_LOGGING': 'false'
  }
};

// Deployment status tracking
const deploymentStatus = {
  timestamp: new Date().toISOString(),
  steps: [],
  errors: [],
  warnings: [],
  success: false
};

/**
 * Utility functions
 */
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅';
  console.log(`${prefix} [${timestamp}] ${message}`);
  
  deploymentStatus.steps.push({
    timestamp,
    type,
    message
  });
}

function checkCommand(command, description) {
  try {
    execSync(command, { stdio: 'pipe' });
    log(`${description} - PASSED`);
    return true;
  } catch (error) {
    log(`${description} - FAILED: ${error.message}`, 'error');
    deploymentStatus.errors.push(`${description}: ${error.message}`);
    return false;
  }
}

function checkFileExists(filePath) {
  if (fs.existsSync(filePath)) {
    log(`File exists: ${filePath}`);
    return true;
  } else {
    log(`File missing: ${filePath}`, 'warning');
    deploymentStatus.warnings.push(`Missing file: ${filePath}`);
    return false;
  }
}

/**
 * Pre-deployment checks
 */
function runPreDeploymentChecks() {
  log('Starting pre-deployment checks...');
  
  // Check Node.js version
  const nodeVersion = process.version;
  log(`Node.js version: ${nodeVersion}`);
  
  // Check Vercel CLI
  if (!checkCommand('vercel --version', 'Vercel CLI installation')) {
    throw new Error('Vercel CLI not installed or not accessible');
  }
  
  // Check required files
  const requiredFiles = [
    'package.json',
    'vercel.json',
    'tsconfig.json',
    'api/publish.ts',
    'api/health.ts',
    'src/middleware/auth.ts',
    'src/middleware/cors.ts'
  ];
  
  requiredFiles.forEach(file => checkFileExists(file));
  
  // Check environment variables
  log('Checking environment variables...');
  const envFile = '.env.local';
  if (checkFileExists(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf8');
    DEPLOYMENT_CONFIG.requiredEnvVars.forEach(varName => {
      if (envContent.includes(varName)) {
        log(`Environment variable found: ${varName}`);
      } else {
        log(`Missing environment variable: ${varName}`, 'warning');
        deploymentStatus.warnings.push(`Missing env var: ${varName}`);
      }
    });
  } else {
    log('Environment file not found - will use Vercel environment variables', 'warning');
  }
  
  // Check dependencies
  if (!checkCommand('npm list --depth=0', 'Dependencies check')) {
    throw new Error('Dependencies not properly installed');
  }
  
  // Check TypeScript compilation
  if (!checkCommand('npm run type-check', 'TypeScript compilation')) {
    throw new Error('TypeScript compilation failed');
  }
  
  // Check tests
  if (!checkCommand('npm test', 'Test suite execution')) {
    log('Tests failed - continuing with deployment', 'warning');
  }
  
  log('Pre-deployment checks completed');
}

/**
 * Security validation
 */
function runSecurityValidation() {
  log('Running security validation...');
  
  // Check for exposed secrets
  const filesToCheck = [
    'package.json',
    'vercel.json',
    'README.md',
    'GPT_ACTION_SETUP.md'
  ];
  
  let secretsFound = 0;
  filesToCheck.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const secretPatterns = [
        /api[_-]?key\s*[:=]\s*['"`][^'"`]+['"`]/gi,
        /password\s*[:=]\s*['"`][^'"`]+['"`]/gi,
        /secret\s*[:=]\s*['"`][^'"`]+['"`]/gi
      ];
      
      secretPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          log(`Potential secret found in ${file}: ${matches.length} matches`, 'warning');
          secretsFound += matches.length;
        }
      });
    }
  });
  
  if (secretsFound > 0) {
    log(`Found ${secretsFound} potential secrets - review before deployment`, 'warning');
  } else {
    log('No exposed secrets found');
  }
  
  // Check file permissions
  const criticalFiles = ['.env.local', 'vercel.json'];
  criticalFiles.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        const stats = fs.statSync(file);
        const mode = stats.mode & parseInt('777', 8);
        if (mode === parseInt('600', 8) || mode === parseInt('400', 8)) {
          log(`File permissions secure: ${file} (${mode.toString(8)})`);
        } else {
          log(`Insecure file permissions: ${file} (${mode.toString(8)})`, 'warning');
        }
      } catch (error) {
        log(`Could not check permissions for ${file}`, 'warning');
      }
    }
  });
  
  log('Security validation completed');
}

/**
 * Build and deployment
 */
function runDeployment() {
  log('Starting production deployment...');
  
  // Build the project
  log('Building project...');
  if (!checkCommand('npm run build', 'Project build')) {
    throw new Error('Build failed');
  }
  
  // Deploy to Vercel
  log('Deploying to Vercel...');
  try {
    const deployCommand = 'vercel --prod --yes';
    const output = execSync(deployCommand, { encoding: 'utf8' });
    log('Deployment command executed successfully');
    
    // Extract deployment URL from output
    const urlMatch = output.match(/https:\/\/[^\s]+/);
    if (urlMatch) {
      const deploymentUrl = urlMatch[0];
      log(`Deployment URL: ${deploymentUrl}`);
      deploymentStatus.deploymentUrl = deploymentUrl;
    }
  } catch (error) {
    log(`Deployment failed: ${error.message}`, 'error');
    throw new Error(`Deployment failed: ${error.message}`);
  }
  
  log('Production deployment completed');
}

/**
 * Post-deployment verification
 */
function runPostDeploymentVerification() {
  log('Running post-deployment verification...');
  
  if (!deploymentStatus.deploymentUrl) {
    log('No deployment URL available for verification', 'warning');
    return;
  }
  
  const baseUrl = deploymentStatus.deploymentUrl;
  
  // Test health endpoint
  try {
    const healthResponse = execSync(`curl -f ${baseUrl}/api/health`, { encoding: 'utf8' });
    log('Health endpoint verification - PASSED');
    
    // Parse health response
    const healthData = JSON.parse(healthResponse);
    if (healthData.status === 'healthy') {
      log('Health status: healthy');
    } else {
      log(`Health status: ${healthData.status}`, 'warning');
    }
  } catch (error) {
    log('Health endpoint verification - FAILED', 'error');
    deploymentStatus.errors.push('Health endpoint failed');
  }
  
  // Test authentication (without valid API key)
  try {
    execSync(`curl -f -H "X-API-Key: invalid-key" ${baseUrl}/api/publish`, { encoding: 'utf8' });
    log('Authentication test - FAILED (should have rejected invalid key)', 'error');
    deploymentStatus.errors.push('Authentication not working properly');
  } catch (error) {
    if (error.status === 401) {
      log('Authentication test - PASSED (correctly rejected invalid key)');
    } else {
      log('Authentication test - UNEXPECTED RESPONSE', 'warning');
    }
  }
  
  // Test CORS headers
  try {
    const corsResponse = execSync(`curl -I ${baseUrl}/api/health`, { encoding: 'utf8' });
    if (corsResponse.includes('Access-Control-Allow-Origin')) {
      log('CORS headers verification - PASSED');
    } else {
      log('CORS headers verification - FAILED', 'warning');
    }
  } catch (error) {
    log('CORS headers verification - FAILED', 'error');
  }
  
  log('Post-deployment verification completed');
}

/**
 * Environment configuration
 */
function configureEnvironment() {
  log('Configuring production environment...');
  
  // Set production environment variables
  const envVars = {
    ...DEPLOYMENT_CONFIG.optionalEnvVars,
    NODE_ENV: 'production'
  };
  
  Object.entries(envVars).forEach(([key, value]) => {
    try {
      execSync(`vercel env add ${key} production`, { 
        input: value,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      log(`Environment variable set: ${key}`);
    } catch (error) {
      log(`Failed to set environment variable ${key}: ${error.message}`, 'warning');
    }
  });
  
  log('Environment configuration completed');
}

/**
 * Monitoring setup
 */
function setupMonitoring() {
  log('Setting up monitoring and alerting...');
  
  // Create monitoring configuration
  const monitoringConfig = {
    healthCheck: {
      endpoint: '/api/health',
      interval: '5m',
      timeout: '10s'
    },
    alerts: {
      errorRate: {
        threshold: 0.05,
        window: '5m'
      },
      responseTime: {
        threshold: 2000,
        percentile: 95
      }
    }
  };
  
  // Save monitoring configuration
  fs.writeFileSync('monitoring-config.json', JSON.stringify(monitoringConfig, null, 2));
  log('Monitoring configuration created');
  
  log('Monitoring setup completed');
}

/**
 * Generate deployment report
 */
function generateDeploymentReport() {
  const report = {
    deployment: deploymentStatus,
    configuration: DEPLOYMENT_CONFIG,
    summary: {
      success: deploymentStatus.errors.length === 0,
      totalSteps: deploymentStatus.steps.length,
      errors: deploymentStatus.errors.length,
      warnings: deploymentStatus.warnings.length,
      deploymentUrl: deploymentStatus.deploymentUrl
    },
    recommendations: []
  };
  
  // Generate recommendations
  if (deploymentStatus.warnings.length > 0) {
    report.recommendations.push('Review warnings before going live');
  }
  
  if (deploymentStatus.errors.length > 0) {
    report.recommendations.push('Fix errors before going live');
  }
  
  if (!deploymentStatus.deploymentUrl) {
    report.recommendations.push('Verify deployment URL');
  }
  
  // Save report
  fs.writeFileSync('deployment-report.json', JSON.stringify(report, null, 2));
  
  // Output summary
  console.log('\n' + '='.repeat(60));
  console.log('PRODUCTION DEPLOYMENT REPORT');
  console.log('='.repeat(60));
  
  console.log(`\nDeployment Status: ${report.summary.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Deployment URL: ${report.summary.deploymentUrl || 'Not available'}`);
  console.log(`Total Steps: ${report.summary.totalSteps}`);
  console.log(`Errors: ${report.summary.errors}`);
  console.log(`Warnings: ${report.summary.warnings}`);
  
  if (report.recommendations.length > 0) {
    console.log('\nRecommendations:');
    report.recommendations.forEach(rec => console.log(`- ${rec}`));
  }
  
  console.log('\n' + '='.repeat(60));
  
  return report;
}

/**
 * Main deployment function
 */
function runProductionDeployment() {
  try {
    log('🚀 Starting PostCrafter Production Deployment');
    log(`Project: ${DEPLOYMENT_CONFIG.projectName}`);
    log(`Environment: ${DEPLOYMENT_CONFIG.environment}`);
    log(`Timestamp: ${deploymentStatus.timestamp}`);
    
    // Run deployment steps
    runPreDeploymentChecks();
    runSecurityValidation();
    configureEnvironment();
    runDeployment();
    runPostDeploymentVerification();
    setupMonitoring();
    
    deploymentStatus.success = true;
    log('🎉 Production deployment completed successfully!');
    
  } catch (error) {
    log(`❌ Deployment failed: ${error.message}`, 'error');
    deploymentStatus.success = false;
  } finally {
    const report = generateDeploymentReport();
    
    // Exit with appropriate code
    process.exit(report.summary.success ? 0 : 1);
  }
}

/**
 * Main execution
 */
if (require.main === module) {
  runProductionDeployment();
}

module.exports = {
  runProductionDeployment,
  DEPLOYMENT_CONFIG,
  deploymentStatus
}; 
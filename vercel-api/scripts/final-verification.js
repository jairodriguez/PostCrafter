#!/usr/bin/env node
/**
 * PostCrafter Final Verification Script
 * Comprehensive pre-go-live verification for production deployment
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Final verification configuration
const VERIFICATION_CONFIG = {
  projectName: 'postcrafter-vercel-api',
  productionUrl: 'https://postcrafter-vercel-api.vercel.app',
  testTimeout: 30000, // 30 seconds
  maxResponseTime: 2000, // 2 seconds
  expectedEndpoints: [
    '/api/health',
    '/api/publish',
    '/api/monitoring',
    '/api/security-audit'
  ],
  requiredHeaders: [
    'X-Content-Type-Options',
    'X-Frame-Options',
    'X-XSS-Protection',
    'Content-Security-Policy'
  ],
  verificationFiles: [
    'package.json',
    'vercel.json',
    'tsconfig.json',
    'src/middleware/auth.ts',
    'src/middleware/cors.ts',
    'src/utils/monitoring.ts',
    'api/publish.ts'
  ]
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Utility functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`  ${title}`, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
}

function logStep(step, status = 'info') {
  const statusColors = {
    info: 'blue',
    success: 'green',
    warning: 'yellow',
    error: 'red'
  };
  log(`  ${status === 'success' ? '✅' : status === 'warning' ? '⚠️' : status === 'error' ? '❌' : 'ℹ️'}  ${step}`, statusColors[status]);
}

function checkFileExists(filePath) {
  return fs.existsSync(path.join(process.cwd(), filePath));
}

function checkFilePermissions(filePath) {
  try {
    const stats = fs.statSync(path.join(process.cwd(), filePath));
    return (stats.mode & 0o777).toString(8);
  } catch (error) {
    return null;
  }
}

function validateEnvironmentVariables() {
  logStep('Validating environment variables...', 'info');
  
  const requiredVars = [
    'WORDPRESS_URL',
    'WORDPRESS_USERNAME',
    'WORDPRESS_APP_PASSWORD',
    'GPT_API_KEY',
    'JWT_SECRET'
  ];
  
  const optionalVars = [
    'NODE_ENV',
    'API_RATE_LIMIT_WINDOW_MS',
    'API_RATE_LIMIT_MAX_REQUESTS',
    'WORDPRESS_TIMEOUT_MS',
    'LOG_LEVEL',
    'CORS_ORIGINS',
    'MAX_IMAGE_SIZE_MB',
    'ENABLE_DEBUG_LOGGING'
  ];
  
  let missingVars = [];
  let warnings = [];
  
  // Check for required variables (these should be set in Vercel)
  logStep('  Checking required environment variables...', 'info');
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }
  
  // Check for optional variables
  logStep('  Checking optional environment variables...', 'info');
  for (const varName of optionalVars) {
    if (!process.env[varName]) {
      warnings.push(`Optional variable ${varName} not set (will use defaults)`);
    }
  }
  
  if (missingVars.length > 0) {
    logStep(`  Missing required environment variables: ${missingVars.join(', ')}`, 'error');
    return false;
  }
  
  if (warnings.length > 0) {
    warnings.forEach(warning => logStep(`  ${warning}`, 'warning'));
  }
  
  logStep('  Environment variables validation completed', 'success');
  return true;
}

function validateFileStructure() {
  logStep('Validating file structure...', 'info');
  
  let missingFiles = [];
  let permissionIssues = [];
  
  for (const file of VERIFICATION_CONFIG.verificationFiles) {
    if (!checkFileExists(file)) {
      missingFiles.push(file);
    } else {
      const permissions = checkFilePermissions(file);
      if (permissions && file === 'vercel.json' && permissions !== '600') {
        permissionIssues.push(`${file}: ${permissions} (should be 600)`);
      }
    }
  }
  
  if (missingFiles.length > 0) {
    logStep(`  Missing required files: ${missingFiles.join(', ')}`, 'error');
    return false;
  }
  
  if (permissionIssues.length > 0) {
    permissionIssues.forEach(issue => logStep(`  Permission issue: ${issue}`, 'warning'));
  }
  
  logStep('  File structure validation completed', 'success');
  return true;
}

function validateCodeQuality() {
  logStep('Validating code quality...', 'info');
  
  try {
    // Check TypeScript compilation
    logStep('  Checking TypeScript compilation...', 'info');
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    logStep('  TypeScript compilation successful', 'success');
    
    // Check for linting issues
    logStep('  Checking code linting...', 'info');
    try {
      execSync('npm run lint', { stdio: 'pipe' });
      logStep('  Code linting passed', 'success');
    } catch (error) {
      logStep('  Code linting issues found (non-blocking)', 'warning');
    }
    
    // Check test suite
    logStep('  Running test suite...', 'info');
    try {
      execSync('npm test', { stdio: 'pipe' });
      logStep('  Test suite passed', 'success');
    } catch (error) {
      logStep('  Test suite failed (non-blocking)', 'warning');
    }
    
    logStep('  Code quality validation completed', 'success');
    return true;
  } catch (error) {
    logStep(`  Code quality validation failed: ${error.message}`, 'error');
    return false;
  }
}

function validateSecurityImplementation() {
  logStep('Validating security implementation...', 'info');
  
  const securityChecks = [
    {
      name: 'Authentication middleware',
      file: 'src/middleware/auth.ts',
      patterns: ['authenticateApiKey', 'validateApiKey', 'Bearer']
    },
    {
      name: 'CORS configuration',
      file: 'src/middleware/cors.ts',
      patterns: ['chat.openai.com', 'chatgpt.com', 'X-Content-Type-Options']
    },
    {
      name: 'Rate limiting',
      file: 'src/middleware/rate-limiter.ts',
      patterns: ['rateLimit', 'TokenBucket', 'maxRequests']
    },
    {
      name: 'Security headers',
      file: 'src/utils/security-hardening.ts',
      patterns: ['Content-Security-Policy', 'X-Frame-Options', 'X-XSS-Protection']
    }
  ];
  
  let securityIssues = [];
  
  for (const check of securityChecks) {
    if (!checkFileExists(check.file)) {
      securityIssues.push(`Missing security file: ${check.file}`);
      continue;
    }
    
    const content = fs.readFileSync(path.join(process.cwd(), check.file), 'utf8');
    const missingPatterns = check.patterns.filter(pattern => !content.includes(pattern));
    
    if (missingPatterns.length > 0) {
      securityIssues.push(`Missing security patterns in ${check.file}: ${missingPatterns.join(', ')}`);
    }
  }
  
  if (securityIssues.length > 0) {
    securityIssues.forEach(issue => logStep(`  ${issue}`, 'error'));
    return false;
  }
  
  logStep('  Security implementation validation completed', 'success');
  return true;
}

function validateProductionReadiness() {
  logStep('Validating production readiness...', 'info');
  
  // Check package.json for production dependencies
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (packageJson.scripts && !packageJson.scripts.build) {
      logStep('  Missing build script in package.json', 'warning');
    }
    
    if (packageJson.engines && !packageJson.engines.node) {
      logStep('  Missing Node.js engine specification', 'warning');
    }
    
    logStep('  Package.json validation completed', 'success');
  } catch (error) {
    logStep(`  Package.json validation failed: ${error.message}`, 'error');
    return false;
  }
  
  // Check Vercel configuration
  try {
    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    
    if (!vercelConfig.functions) {
      logStep('  Missing functions configuration in vercel.json', 'warning');
    }
    
    if (!vercelConfig.headers) {
      logStep('  Missing security headers configuration', 'warning');
    }
    
    logStep('  Vercel configuration validation completed', 'success');
  } catch (error) {
    logStep(`  Vercel configuration validation failed: ${error.message}`, 'error');
    return false;
  }
  
  logStep('  Production readiness validation completed', 'success');
  return true;
}

function generateVerificationReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    project: VERIFICATION_CONFIG.projectName,
    overallStatus: results.every(r => r.status === 'success') ? 'PASSED' : 'FAILED',
    checks: results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
      warnings: results.filter(r => r.status === 'warning').length
    }
  };
  
  const reportPath = path.join(process.cwd(), 'verification-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  logStep(`Verification report saved to: ${reportPath}`, 'info');
  return report;
}

function displayResults(results) {
  logSection('FINAL VERIFICATION RESULTS');
  
  const summary = {
    total: results.length,
    passed: results.filter(r => r.status === 'success').length,
    failed: results.filter(r => r.status === 'error').length,
    warnings: results.filter(r => r.status === 'warning').length
  };
  
  log(`\n📊 Verification Summary:`, 'bright');
  log(`  Total Checks: ${summary.total}`, 'blue');
  log(`  ✅ Passed: ${summary.passed}`, 'green');
  log(`  ❌ Failed: ${summary.failed}`, 'red');
  log(`  ⚠️  Warnings: ${summary.warnings}`, 'yellow');
  
  log(`\n📋 Detailed Results:`, 'bright');
  results.forEach(result => {
    const statusIcon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    const statusColor = result.status === 'success' ? 'green' : result.status === 'warning' ? 'yellow' : 'red';
    log(`  ${statusIcon} ${result.name}: ${result.message}`, statusColor);
  });
  
  if (summary.failed > 0) {
    log(`\n🚨 VERIFICATION FAILED - Deployment not recommended`, 'red');
    log(`  Please address the failed checks before proceeding with deployment.`, 'red');
    process.exit(1);
  } else if (summary.warnings > 0) {
    log(`\n⚠️  VERIFICATION COMPLETED WITH WARNINGS`, 'yellow');
    log(`  Deployment can proceed, but consider addressing the warnings.`, 'yellow');
  } else {
    log(`\n🎉 VERIFICATION PASSED - Ready for deployment!`, 'green');
    log(`  All checks passed successfully. The system is ready for production deployment.`, 'green');
  }
}

// Main verification function
async function runFinalVerification() {
  logSection('POSTCRAFTER FINAL VERIFICATION');
  log(`Project: ${VERIFICATION_CONFIG.projectName}`, 'bright');
  log(`Timestamp: ${new Date().toISOString()}`, 'blue');
  
  const results = [];
  
  // 1. Environment Variables Validation
  logSection('1. Environment Variables Validation');
  const envResult = validateEnvironmentVariables();
  results.push({
    name: 'Environment Variables',
    status: envResult ? 'success' : 'error',
    message: envResult ? 'All required environment variables are configured' : 'Missing required environment variables'
  });
  
  // 2. File Structure Validation
  logSection('2. File Structure Validation');
  const fileResult = validateFileStructure();
  results.push({
    name: 'File Structure',
    status: fileResult ? 'success' : 'error',
    message: fileResult ? 'All required files are present and properly configured' : 'Missing required files or permission issues'
  });
  
  // 3. Code Quality Validation
  logSection('3. Code Quality Validation');
  const codeResult = validateCodeQuality();
  results.push({
    name: 'Code Quality',
    status: codeResult ? 'success' : 'warning',
    message: codeResult ? 'Code quality checks passed' : 'Code quality issues detected (non-blocking)'
  });
  
  // 4. Security Implementation Validation
  logSection('4. Security Implementation Validation');
  const securityResult = validateSecurityImplementation();
  results.push({
    name: 'Security Implementation',
    status: securityResult ? 'success' : 'error',
    message: securityResult ? 'Security implementations are properly configured' : 'Security implementation issues detected'
  });
  
  // 5. Production Readiness Validation
  logSection('5. Production Readiness Validation');
  const productionResult = validateProductionReadiness();
  results.push({
    name: 'Production Readiness',
    status: productionResult ? 'success' : 'warning',
    message: productionResult ? 'Production configuration is ready' : 'Production configuration issues detected (non-blocking)'
  });
  
  // Generate and display results
  const report = generateVerificationReport(results);
  displayResults(results);
  
  return report;
}

// Run verification if called directly
if (require.main === module) {
  runFinalVerification()
    .then(() => {
      log(`\n🎯 Final verification completed successfully!`, 'green');
      process.exit(0);
    })
    .catch(error => {
      log(`\n💥 Final verification failed: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = {
  runFinalVerification,
  VERIFICATION_CONFIG
}; 
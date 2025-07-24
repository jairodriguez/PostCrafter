# PostCrafter Load Testing Guide

This guide explains how to perform comprehensive load and stress testing on the PostCrafter system to identify performance bottlenecks and ensure reliability under various load conditions.

## Overview

The PostCrafter load testing suite uses **k6** as the primary load testing tool to simulate realistic user scenarios and measure system performance under stress. The testing framework includes:

- **Load Testing**: Gradual ramp-up to test normal operational capacity
- **Spike Testing**: Sudden load increases to test system resilience
- **Endurance Testing**: Extended duration testing for memory leaks and stability
- **Breaking Point Testing**: Finding the maximum system capacity
- **Memory Stress Testing**: Large payload testing for resource management
- **Performance Monitoring**: Continuous monitoring with detailed metrics

## Prerequisites

### System Requirements

- **Minimum**: 4GB RAM, 2 CPU cores
- **Recommended**: 8GB RAM, 4+ CPU cores
- **Operating System**: Linux, macOS, or Windows with WSL
- **Node.js**: Version 16 or higher
- **k6**: Automatically installed if not present

### Environment Setup

1. **API Configuration**:
   ```bash
   export TEST_API_URL="http://localhost:3000"
   export TEST_WORDPRESS_URL="https://your-wordpress-site.com"
   export TEST_API_KEY="your-test-api-key"
   ```

2. **Optional k6 Installation**:
   ```bash
   # macOS
   brew install k6
   
   # Linux (Ubuntu/Debian)
   sudo apt-get update
   sudo apt-get install k6
   
   # Manual installation
   # Download from https://k6.io/docs/get-started/installation/
   ```

## Load Test Types

### 1. Load Testing (`load`)
**Purpose**: Test normal operational capacity with realistic user patterns.

**Characteristics**:
- Duration: ~35 minutes
- Max Users: 100 concurrent
- Gradual ramp-up with steady-state testing
- Mixed scenarios: 40% simple posts, 25% image posts, 20% SEO posts, 10% complex posts, 5% large posts

**Run Command**:
```bash
npm run load:test
```

**Use When**:
- Validating normal operational capacity
- Performance regression testing
- Baseline performance measurement

### 2. Spike Testing (`spike`)
**Purpose**: Test system resilience to sudden traffic spikes.

**Characteristics**:
- Duration: ~5 minutes
- Normal load: 10 users → Spike: 200 users → Back to normal
- Tests rate limiting and error handling
- Rapid fire scenarios during spike

**Run Command**:
```bash
npm run load:spike
```

**Use When**:
- Testing auto-scaling capabilities
- Validating rate limiting effectiveness
- Preparing for traffic surges (product launches, viral content)

### 3. Endurance Testing (`endurance`)
**Purpose**: Test system stability over extended periods.

**Characteristics**:
- Duration: ~35 minutes
- Sustained load: 20 concurrent users
- Tests for memory leaks and resource degradation
- Consistent request patterns

**Run Command**:
```bash
npm run load:endurance
```

**Use When**:
- Testing for memory leaks
- Validating long-running stability
- Preparing for sustained high traffic

### 4. Breaking Point Testing (`breaking_point`)
**Purpose**: Find the maximum system capacity before failure.

**Characteristics**:
- Duration: ~25 minutes
- Progressive load: 20 → 50 → 100 → 150 → 200 → 300 → 500 users
- Identifies system breaking point
- Higher error tolerance (up to 30%)

**Run Command**:
```bash
npm run load:breaking
```

**Use When**:
- Capacity planning
- Understanding system limits
- Preparing for extreme load scenarios

### 5. Memory Stress Testing (`memory_stress`)
**Purpose**: Test system behavior with large payloads and memory-intensive operations.

**Characteristics**:
- Duration: ~10 minutes
- Large content: ~250KB posts with multiple images
- 30 concurrent users with heavy payloads
- Tests memory allocation and garbage collection

**Run Command**:
```bash
npm run load:memory
```

**Use When**:
- Testing large content handling
- Validating memory management
- Preparing for content-heavy scenarios

### 6. Performance Monitoring (`monitor`)
**Purpose**: Continuous performance monitoring with detailed metrics.

**Characteristics**:
- Duration: ~15 minutes
- Light load: 25 concurrent users
- Detailed timing and resource analysis
- Health check and endpoint monitoring

**Run Command**:
```bash
npm run load:monitor
```

**Use When**:
- Performance profiling
- Identifying slow endpoints
- Monitoring system health

## Running Load Tests

### Single Test Type
```bash
# Run specific test type
npm run load:test      # Load testing
npm run load:spike     # Spike testing
npm run load:endurance # Endurance testing
npm run load:breaking  # Breaking point testing
npm run load:memory    # Memory stress testing
npm run load:monitor   # Performance monitoring
```

### Multiple Test Types
```bash
# Run comprehensive test suite
npm run load:all

# Run custom combination
node scripts/run-load-tests.js load spike monitor
```

### Direct k6 Execution
```bash
# Run k6 tests directly (advanced)
k6 run load-tests/k6-load-test.js
k6 run -e STRESS_TYPE=spike load-tests/stress-test-scenarios.js
k6 run load-tests/performance-monitor.js
```

## Performance Benchmarks

### Response Time Targets
- **Simple Posts**: < 3 seconds (95th percentile)
- **Posts with Images**: < 5 seconds (95th percentile)
- **Posts with Multiple Images**: < 10 seconds (95th percentile)
- **Health Checks**: < 500ms (95th percentile)
- **Status Queries**: < 1 second (95th percentile)

### Error Rate Thresholds
- **Normal Operations**: < 5% error rate
- **Spike Conditions**: < 15% error rate
- **Breaking Point**: < 30% error rate (expected at limits)

### Throughput Expectations
- **Minimum**: 10 requests/second sustained
- **Target**: 25+ requests/second sustained
- **Peak**: 50+ requests/second during spikes

### Resource Usage Limits
- **Memory**: < 512MB per request
- **CPU**: < 80% peak usage
- **Network**: < 1MB response sizes

## Test Results and Analysis

### Output Files
Load test results are saved to `./load-test-results/`:

```
load-test-results/
├── reports/
│   ├── load-summary.json      # Test summary metrics
│   ├── spike-summary.json     # Spike test metrics
│   └── ...
├── metrics/
│   ├── load-metrics.json      # Detailed metrics data
│   ├── spike-metrics.json     # Spike test details
│   └── ...
├── logs/
│   └── test-execution.log     # Execution logs
├── load-test-report.html      # Visual report
└── load-test-report.json      # Complete test data
```

### HTML Report
The HTML report (`load-test-report.html`) provides:
- **Executive Summary**: Pass/fail rates, duration, key metrics
- **Test Suite Results**: Individual test performance and status
- **Performance Issues**: Identified bottlenecks and problems
- **Recommendations**: Suggested optimizations and fixes
- **Environment Information**: System specs and configuration

### Key Metrics to Monitor

#### Response Times
- **Average**: Overall system responsiveness
- **95th Percentile**: User experience consistency
- **Maximum**: Worst-case performance
- **Trend Analysis**: Performance degradation over time

#### Error Rates
- **4xx Errors**: Client-side issues (validation, authentication)
- **5xx Errors**: Server-side issues (crashes, overload)
- **Timeouts**: Network or processing delays
- **Rate Limiting**: 429 status codes

#### Throughput
- **Requests/Second**: System capacity
- **Data Transfer**: Network utilization
- **Success Rate**: Effective throughput

#### Resource Usage (Estimated)
- **Memory Usage**: Per-request memory consumption
- **CPU Usage**: Processing intensity
- **Network Latency**: External service dependencies

## Interpreting Results

### Success Criteria
✅ **Test Passed** if:
- All response time thresholds met
- Error rates below acceptable limits
- No system crashes or failures
- Graceful handling of load increases

❌ **Test Failed** if:
- Response times exceed thresholds
- High error rates (>5% normal, >15% spike)
- System crashes or becomes unresponsive
- Memory leaks or resource exhaustion

### Performance Issues

#### High Response Times
**Symptoms**: 95th percentile > thresholds
**Causes**:
- Database query optimization needed
- WordPress API bottlenecks
- Image processing delays
- Network latency issues

**Solutions**:
- Optimize slow database queries
- Implement caching strategies
- Resize/compress images before processing
- Use CDN for static assets

#### High Error Rates
**Symptoms**: >5% request failures
**Causes**:
- Rate limiting activation
- Resource exhaustion
- External service failures
- Authentication issues

**Solutions**:
- Implement exponential backoff
- Add circuit breakers
- Increase resource allocation
- Improve error handling

#### Low Throughput
**Symptoms**: <10 requests/second
**Causes**:
- CPU bottlenecks
- Memory constraints
- I/O blocking operations
- Inefficient algorithms

**Solutions**:
- Optimize CPU-intensive operations
- Increase memory allocation
- Implement async processing
- Profile and optimize code

### Breaking Point Analysis
When system reaches breaking point:
1. **Identify Failure Mode**: Memory, CPU, or network limits
2. **Analyze Error Patterns**: Rate limiting vs. crashes
3. **Review Resource Usage**: Memory leaks vs. legitimate growth
4. **Plan Scaling Strategy**: Horizontal vs. vertical scaling

## Optimization Recommendations

### Based on Test Results

#### Response Time Optimization
- **Database**: Index optimization, query caching
- **API**: Response compression, pagination
- **Images**: Pre-processing, format optimization
- **Network**: CDN, connection pooling

#### Error Rate Reduction
- **Validation**: Early input validation
- **Rate Limiting**: Graceful degradation
- **Retry Logic**: Exponential backoff
- **Monitoring**: Real-time error tracking

#### Throughput Improvement
- **Caching**: Redis/Memcached implementation
- **Async Processing**: Queue-based operations
- **Connection Pooling**: Database and HTTP connections
- **Load Balancing**: Request distribution

#### Resource Optimization
- **Memory**: Garbage collection tuning
- **CPU**: Algorithm optimization
- **I/O**: Batch operations
- **Network**: Request batching

## Continuous Integration

### Automated Load Testing
Integrate load testing into CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Run Load Tests
  run: |
    npm run load:test
    npm run load:spike
  env:
    TEST_API_URL: ${{ secrets.STAGING_API_URL }}
    TEST_API_KEY: ${{ secrets.LOAD_TEST_API_KEY }}
```

### Performance Regression Detection
- **Baseline**: Establish performance baselines
- **Comparison**: Compare results against previous runs
- **Alerts**: Notify on performance degradation
- **Gates**: Block deployments on performance failures

### Scheduled Testing
- **Daily**: Light monitoring tests
- **Weekly**: Comprehensive load testing
- **Pre-deployment**: Full test suite execution
- **Post-deployment**: Smoke testing and monitoring

## Troubleshooting

### Common Issues

#### k6 Installation Fails
```bash
# Manual installation
curl -s https://dl.k6.io/install.sh | bash

# Or download binary directly
wget https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz
```

#### API Not Accessible
```bash
# Check API health
curl -f http://localhost:3000/api/health

# Verify environment variables
echo $TEST_API_URL
echo $TEST_API_KEY
```

#### High Resource Usage
- **Memory**: Reduce concurrent users
- **CPU**: Limit test duration
- **Network**: Use local WordPress instance

#### Inconsistent Results
- **System Load**: Run on dedicated machine
- **Network**: Use stable connection
- **Timing**: Account for system warm-up

### Debug Mode
Enable detailed logging for troubleshooting:

```bash
# Set debug environment
export DEBUG=true
export K6_LOG_LEVEL=debug

# Run with verbose output
npm run load:test
```

## Best Practices

### Test Environment
- **Isolation**: Use dedicated test environment
- **Consistency**: Standardize test data and conditions
- **Monitoring**: Track system resources during tests
- **Cleanup**: Reset environment between tests

### Test Design
- **Realistic Scenarios**: Mirror production usage patterns
- **Gradual Increases**: Avoid sudden load jumps
- **Mixed Workloads**: Combine different request types
- **Error Handling**: Test failure scenarios

### Result Analysis
- **Trending**: Compare results over time
- **Context**: Consider system changes and updates
- **Documentation**: Record findings and optimizations
- **Action Items**: Create specific improvement tasks

### Performance Culture
- **Regular Testing**: Make load testing routine
- **Team Training**: Ensure team understands performance
- **Metrics**: Establish and track KPIs
- **Optimization**: Continuous performance improvement

## Advanced Scenarios

### Custom Test Scenarios
Create custom k6 scripts for specific scenarios:

```javascript
// custom-scenario.js
import { check } from 'k6';
import http from 'k6/http';

export let options = {
  stages: [
    { duration: '5m', target: 20 },
    { duration: '10m', target: 20 },
    { duration: '5m', target: 0 },
  ],
};

export default function () {
  // Custom test logic
  const response = http.post(/* ... */);
  check(response, {
    'custom check': (r) => r.status === 200,
  });
}
```

### WordPress-Specific Testing
Test WordPress-specific scenarios:

```bash
# Test with different WordPress versions
export WORDPRESS_VERSION=6.0
npm run load:test

# Test with various plugins
export WORDPRESS_PLUGINS="yoast-seo,woocommerce"
npm run load:test
```

### Performance Profiling
Combine load testing with profiling:

```bash
# Enable profiling
export PROFILE_MODE=true
npm run load:monitor

# Analyze results
node --prof-process isolate-*.log > profile.txt
```

## Conclusion

The PostCrafter load testing suite provides comprehensive tools for validating system performance under various conditions. Regular load testing helps ensure the system can handle production traffic while maintaining acceptable response times and error rates.

Key takeaways:
- **Regular Testing**: Make load testing part of development workflow
- **Multiple Scenarios**: Test different load patterns and edge cases
- **Continuous Improvement**: Use results to drive optimization efforts
- **Production Readiness**: Validate system before deployment

For questions or issues, refer to the troubleshooting section or consult the development team.
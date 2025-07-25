# PostCrafter Troubleshooting Guide

This guide provides comprehensive troubleshooting procedures for the PostCrafter API, including common issues, debugging tools, and operator guidance.

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Common Issues](#common-issues)
3. [Debugging Tools](#debugging-tools)
4. [Error Codes and Messages](#error-codes-and-messages)
5. [Performance Issues](#performance-issues)
6. [WordPress Integration Issues](#wordpress-integration-issues)
7. [Authentication Issues](#authentication-issues)
8. [Monitoring and Alerts](#monitoring-and-alerts)
9. [Emergency Procedures](#emergency-procedures)
10. [Contact Information](#contact-information)

## Quick Diagnostics

### Health Check Endpoint

Use the health check endpoint to quickly assess system status:

```bash
curl -X GET https://your-api.vercel.app/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "checks": {
    "wordPress": { "status": "ok", "responseTime": 150 },
    "memory": { "status": "ok", "usage": 45.2 },
    "disk": { "status": "ok", "usage": 30.1 }
  },
  "metrics": {
    "uptime": 3600,
    "totalRequests": 1000,
    "errorRate": 0.5,
    "averageResponseTime": 250
  }
}
```

### Debug Status Overview

For a comprehensive system overview:

```bash
curl -X GET "https://your-api.vercel.app/api/debug/status?type=overview" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Common Issues

### 1. Setup and Deployment Issues

**WordPress Plugin Installation Problems:**
- **Issue**: Plugin installation fails or doesn't work properly
- **Solution**: Follow the [WordPress Installation Guide](./WORDPRESS_INSTALLATION_GUIDE.md) for step-by-step instructions
- **Common Fixes**: 
  - Verify WordPress version compatibility
  - Check file permissions for mu-plugins directory
  - Ensure REST API is enabled

**Vercel Deployment Issues:**
- **Issue**: Deployment fails or environment variables not working
- **Solution**: Refer to the [Vercel Deployment Guide](./VERCEL_DEPLOYMENT_GUIDE.md) for detailed troubleshooting
- **Common Fixes**:
  - Verify environment variables are set correctly
  - Check Vercel function timeout settings
  - Ensure proper CORS configuration

**GPT Action Configuration Problems:**
- **Issue**: GPT Action fails to connect or authenticate
- **Solution**: Follow the [GPT Action Setup Guide](./gpt-action-setup.md) for configuration steps
- **Common Fixes**:
  - Verify API key format and validity
  - Check OpenAPI schema import
  - Ensure proper authentication headers

### 2. High Error Rate

**Symptoms:**
- Error rate > 5% in health check
- Multiple failed requests
- Alerts triggered

**Diagnosis:**
```bash
# Check error rate
curl -X GET "https://your-api.vercel.app/api/debug/status?type=metrics" \
  -H "Authorization: Bearer YOUR_API_KEY"

# Check recent errors
curl -X GET "https://your-api.vercel.app/api/debug/status?type=logs&level=error" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Common Causes:**
- WordPress API connectivity issues
- Invalid API keys
- Rate limiting
- Malformed requests

**Solutions:**
1. Verify WordPress URL and API key configuration
2. Check WordPress site status
3. Review recent request logs for patterns
4. Implement request validation

### 2. Slow Response Times

**Symptoms:**
- Average response time > 5 seconds
- Timeout errors
- Performance alerts

**Diagnosis:**
```bash
# Check performance metrics
curl -X GET "https://your-api.vercel.app/api/debug/status?type=metrics" \
  -H "Authorization: Bearer YOUR_API_KEY"

# Check WordPress response times
curl -X GET "https://your-api.vercel.app/api/debug/status?type=wordpress" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Common Causes:**
- WordPress site performance issues
- Network latency
- Large image processing
- Database queries

**Solutions:**
1. Optimize WordPress site performance
2. Implement caching
3. Optimize image processing
4. Review database queries

### 3. WordPress API Failures

**Symptoms:**
- WordPress status shows "error"
- Authentication failures
- 404/500 errors from WordPress

**Diagnosis:**
```bash
# Check WordPress connectivity
curl -X GET "https://your-api.vercel.app/api/debug/status?type=wordpress" \
  -H "Authorization: Bearer YOUR_API_KEY"

# Test WordPress API directly
curl -X GET "https://your-wordpress-site.com/wp-json/wp/v2/posts?per_page=1" \
  -H "Authorization: Bearer YOUR_WORDPRESS_API_KEY"
```

**Common Causes:**
- Incorrect WordPress URL
- Invalid API key
- WordPress site down
- CORS issues
- Plugin conflicts

**Solutions:**
1. Verify WordPress URL and API key
2. Check WordPress site status
3. Test WordPress REST API directly
4. Review WordPress error logs
5. Check for plugin conflicts

## Debugging Tools

### Debug Endpoints

The API provides several debugging endpoints for troubleshooting:

#### 1. System Overview
```bash
curl -X GET "https://your-api.vercel.app/api/debug/status?type=overview" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### 2. Health Check
```bash
curl -X GET "https://your-api.vercel.app/api/debug/status?type=health" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### 3. Metrics
```bash
curl -X GET "https://your-api.vercel.app/api/debug/status?type=metrics&timeRange=1h" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### 4. WordPress Status
```bash
curl -X GET "https://your-api.vercel.app/api/debug/status?type=wordpress" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### 5. Active Alerts
```bash
curl -X GET "https://your-api.vercel.app/api/debug/status?type=alerts" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### 6. System Information
```bash
curl -X GET "https://your-api.vercel.app/api/debug/status?type=system" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Log Correlation

All debug endpoints return a `requestId` that can be used to correlate logs:

```bash
# Search logs for specific request
curl -X GET "https://your-api.vercel.app/api/debug/status?type=logs&correlationId=debug_status_1234567890" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Error Codes and Messages

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Invalid request format, missing required fields |
| 401 | Unauthorized | Missing or invalid API key |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Endpoint not found, WordPress post not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Application error, WordPress API error |
| 502 | Bad Gateway | WordPress site unavailable |
| 503 | Service Unavailable | Maintenance mode, overloaded |

### Common Error Messages

#### Authentication Errors
```
"Authentication required for debug access"
```
**Solution:** Include valid API key in Authorization header

#### WordPress API Errors
```
"WordPress API returned 401: Unauthorized"
```
**Solution:** Verify WordPress API key and permissions

#### Validation Errors
```
"Validation failed: title is required"
```
**Solution:** Check request payload for required fields

#### Rate Limiting
```
"Rate limit exceeded: 100 requests per minute"
```
**Solution:** Implement request throttling or contact support

## Performance Issues

### High Memory Usage

**Symptoms:**
- Memory usage > 80%
- Out of memory errors
- Slow response times

**Diagnosis:**
```bash
curl -X GET "https://your-api.vercel.app/api/debug/status?type=system" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Solutions:**
1. Optimize image processing
2. Implement request size limits
3. Add memory monitoring
4. Scale up resources if needed

### Slow Image Processing

**Symptoms:**
- Long response times for image uploads
- Timeout errors
- High CPU usage

**Solutions:**
1. Optimize image formats
2. Implement image compression
3. Use CDN for image delivery
4. Implement async processing

## WordPress Integration Issues

### REST API Not Available

**Symptoms:**
- 404 errors from WordPress
- "WordPress API not responding" errors

**Solutions:**
1. Enable WordPress REST API
2. Check permalink settings
3. Disable conflicting plugins
4. Verify WordPress version

### Authentication Issues

**Symptoms:**
- 401 errors from WordPress
- "Invalid API key" errors

**Solutions:**
1. Generate new WordPress API key
2. Check API key permissions
3. Verify WordPress user role
4. Test API key manually

### CORS Issues

**Symptoms:**
- CORS errors in browser
- Preflight request failures

**Solutions:**
1. Configure WordPress CORS headers
2. Use server-side requests
3. Implement CORS middleware
4. Check domain whitelist

## Authentication Issues

### API Key Problems

**Symptoms:**
- 401 Unauthorized errors
- "Invalid API key" messages

**Diagnosis:**
```bash
# Test API key
curl -X GET "https://your-api.vercel.app/api/health" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Solutions:**
1. Verify API key format
2. Check API key permissions
3. Generate new API key
4. Update client configuration

### WordPress Authentication

**Symptoms:**
- WordPress API authentication failures
- 401 errors from WordPress

**Solutions:**
1. Verify WordPress API key
2. Check WordPress user permissions
3. Test WordPress authentication manually
4. Regenerate WordPress API key

## Monitoring and Alerts

### Alert Types

The system generates alerts for:

- **Critical:** WordPress API unavailable, system errors
- **Error:** High error rate, authentication failures
- **Warning:** High response times, memory usage
- **Info:** System events, configuration changes

### Alert Management

#### View Active Alerts
```bash
curl -X GET "https://your-api.vercel.app/api/debug/status?type=alerts" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### Acknowledge Alerts
```bash
curl -X POST "https://your-api.vercel.app/api/debug/alerts/acknowledge" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"alertId": "alert_123", "acknowledgedBy": "operator"}'
```

### Monitoring Configuration

Configure monitoring via environment variables:

```bash
# Enable alerting
ENABLE_ALERTING=true

# Configure thresholds
RESPONSE_TIME_THRESHOLD=5000
ERROR_RATE_THRESHOLD=5
MEMORY_USAGE_THRESHOLD=80

# External monitoring
DATADOG_API_KEY=your_datadog_key
NEW_RELIC_LICENSE_KEY=your_newrelic_key
```

## Emergency Procedures

### System Overload

**Symptoms:**
- High error rates
- Slow response times
- Memory exhaustion

**Emergency Actions:**
1. Enable rate limiting
2. Implement request queuing
3. Scale up resources
4. Contact support

### WordPress Site Down

**Symptoms:**
- WordPress API errors
- 502 Bad Gateway errors
- Critical alerts

**Emergency Actions:**
1. Check WordPress site status
2. Verify WordPress configuration
3. Contact WordPress hosting provider
4. Implement fallback procedures

### Security Breach

**Symptoms:**
- Unusual authentication patterns
- Suspicious requests
- Security alerts

**Emergency Actions:**
1. Rotate API keys
2. Review access logs
3. Implement additional security measures
4. Contact security team

## Contact Information

### Support Channels

- **Technical Support:** support@postcrafter.com
- **Security Issues:** security@postcrafter.com
- **Emergency:** +1-555-0123 (24/7)

### Escalation Procedures

1. **Level 1:** Check documentation and common solutions
2. **Level 2:** Contact technical support
3. **Level 3:** Escalate to development team
4. **Level 4:** Emergency contact for critical issues

### Useful Resources

- [API Documentation](./API_DOCUMENTATION.md)
- [WordPress Installation Guide](./WORDPRESS_INSTALLATION_GUIDE.md)
- [Vercel Deployment Guide](./VERCEL_DEPLOYMENT_GUIDE.md)
- [GPT Action Setup Guide](./gpt-action-setup.md)
- [Authentication Guide](./authentication.md)
- [Performance Optimization Guide](./LOAD_TESTING_GUIDE.md)
- [Security Best Practices](./SECURITY_CHECKLIST.md)

## Maintenance Procedures

### Regular Maintenance

#### Daily
- Review health check status
- Monitor error rates
- Check alert status

#### Weekly
- Review performance metrics
- Analyze error patterns
- Update monitoring thresholds

#### Monthly
- Review security logs
- Update documentation
- Performance optimization

### Backup Procedures

#### Configuration Backup
```bash
# Export configuration
curl -X GET "https://your-api.vercel.app/api/debug/status?type=system" \
  -H "Authorization: Bearer YOUR_API_KEY" > config_backup.json
```

#### Metrics Backup
```bash
# Export metrics
curl -X GET "https://your-api.vercel.app/api/debug/status?type=metrics&format=csv" \
  -H "Authorization: Bearer YOUR_API_KEY" > metrics_backup.csv
```

---

**Last Updated:** January 2024  
**Version:** 1.0  
**Maintainer:** PostCrafter Development Team
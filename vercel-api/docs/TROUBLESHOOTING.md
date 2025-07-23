# PostCrafter API Troubleshooting Guide

This guide provides step-by-step troubleshooting procedures for common issues encountered with the PostCrafter API.

## Quick Diagnostics

### Health Check
```bash
# Basic health check
curl https://your-api-domain.vercel.app/api/health

# Detailed health check with metrics and alerts
curl "https://your-api-domain.vercel.app/api/health?detailed=true&metrics=true&alerts=true"
```

### Debug Information
```bash
# Full debug information (development only, or with debug token in production)
curl "https://your-api-domain.vercel.app/api/debug?metrics=true&health=true&errors=true&wordpress=true&alerts=true&system=true"

# Production debug (requires X-Debug-Token header)
curl -H "X-Debug-Token: your-debug-token" "https://your-api-domain.vercel.app/api/debug"
```

## Common Issues

### 1. Authentication Failures

#### Symptoms
- 401 Unauthorized responses
- "Authentication failed" error messages
- WordPress API connection failures

#### Diagnosis
```bash
# Check WordPress API credentials
curl "https://your-api-domain.vercel.app/api/debug?wordpress=true&errors=true"
```

#### Common Causes & Solutions

**Invalid WordPress Application Password**
```bash
# Verify WordPress credentials are set correctly
curl -H "X-Debug-Token: your-debug-token" "https://your-api-domain.vercel.app/api/debug?config=true"
```
- Ensure `WORDPRESS_APP_PASSWORD` is generated correctly in WordPress
- Verify username has proper permissions (Editor or Administrator)
- Check WordPress Application Passwords are enabled

**Expired or Invalid GPT API Key**
- Verify `GPT_API_KEY` environment variable is set
- Check API key hasn't expired or been revoked
- Ensure proper API key format

**WordPress URL Issues**
- Verify `WORDPRESS_URL` is accessible from Vercel
- Check for trailing slashes or HTTP vs HTTPS
- Ensure WordPress REST API is enabled

### 2. WordPress API Errors

#### Symptoms
- 502 Bad Gateway responses
- WordPress connection timeouts
- Publishing failures

#### Diagnosis
```bash
# Check WordPress health and error statistics
curl "https://your-api-domain.vercel.app/api/debug?wordpress=true&errors=true"

# Check recent WordPress errors
curl "https://your-api-domain.vercel.app/api/health?detailed=true"
```

#### Common Error Codes

**rest_forbidden (403)**
- User lacks sufficient permissions
- Check WordPress user role (should be Editor or Administrator)
- Verify Application Password scope

**rest_invalid_param (400)**
- Invalid request parameters
- Check post data format and required fields
- Verify taxonomy IDs exist

**Connection timeout**
- WordPress site is slow or overloaded
- Network connectivity issues
- Increase `WORDPRESS_TIMEOUT_MS` environment variable

#### Solutions

**WordPress Site Issues**
1. Check WordPress site accessibility:
   ```bash
   curl -I https://your-wordpress-site.com/wp-json/wp/v2/
   ```

2. Verify REST API is enabled:
   ```bash
   curl https://your-wordpress-site.com/wp-json/wp/v2/posts
   ```

3. Test authentication:
   ```bash
   curl -u "username:app_password" https://your-wordpress-site.com/wp-json/wp/v2/users/me
   ```

**Performance Issues**
- Monitor response times: Check `/api/health?metrics=true`
- Increase timeouts if needed
- Consider WordPress optimization plugins

### 3. High Error Rates

#### Symptoms
- Health status shows "degraded" or "unhealthy"
- High number of 5xx responses
- Alert notifications for error rate

#### Diagnosis
```bash
# Check current error rates and metrics
curl "https://your-api-domain.vercel.app/api/health?metrics=true"

# Get detailed error statistics
curl "https://your-api-domain.vercel.app/api/debug?errors=true&metrics=true"
```

#### Investigation Steps

1. **Check Error Patterns**
   - Look at error categories in debug output
   - Identify if errors are authentication, validation, or server-related

2. **Review Recent Changes**
   - Check recent deployments
   - Verify environment variable changes
   - Review WordPress plugin updates

3. **Monitor Resource Usage**
   ```bash
   curl "https://your-api-domain.vercel.app/api/debug?system=true"
   ```

#### Solutions

**Rate Limiting Issues**
- Reduce request frequency
- Implement request queuing
- Contact WordPress hosting provider about limits

**WordPress Plugin Conflicts**
- Disable recently installed plugins
- Check WordPress error logs
- Test with minimal plugin set

### 4. Performance Issues

#### Symptoms
- Slow response times (>5 seconds)
- Timeout errors
- Performance alerts

#### Diagnosis
```bash
# Check performance metrics
curl "https://your-api-domain.vercel.app/api/debug?metrics=true&system=true"

# Monitor over time
watch -n 30 'curl -s "https://your-api-domain.vercel.app/api/health?metrics=true" | jq .metrics'
```

#### Performance Metrics to Monitor
- Average response time
- 95th percentile response time
- Memory usage
- CPU usage
- WordPress API call duration

#### Optimization Steps

1. **WordPress Optimization**
   - Enable caching plugins (WP Rocket, W3 Total Cache)
   - Optimize database
   - Use CDN for media files
   - Minimize plugins

2. **API Configuration**
   - Tune timeout values
   - Optimize request payloads
   - Review error retry logic

3. **Monitoring Thresholds**
   ```bash
   # Update alert thresholds if needed
   # Check current configuration
   curl "https://your-api-domain.vercel.app/api/debug?config=true"
   ```

### 5. Memory Issues

#### Symptoms
- Critical memory usage alerts
- 503 Service Unavailable errors
- Function timeouts

#### Diagnosis
```bash
# Check memory usage
curl "https://your-api-domain.vercel.app/api/debug?system=true"
```

#### Solutions

1. **Optimize Request Payloads**
   - Reduce image sizes before upload
   - Limit post content length
   - Minimize metadata

2. **Review Memory Configuration**
   - Check Vercel function memory limits
   - Monitor memory usage patterns
   - Consider splitting large operations

### 6. Alert Investigation

#### Symptoms
- Receiving alert notifications
- Health status degraded

#### Diagnosis
```bash
# Check active alerts
curl "https://your-api-domain.vercel.app/api/debug?alerts=true"

# Get alert details
curl "https://your-api-domain.vercel.app/api/health?alerts=true"
```

#### Alert Types

**High Error Rate**
- Check WordPress connectivity
- Review recent deployments
- Monitor error patterns

**Slow Response Time**
- Check WordPress performance
- Review system resources
- Monitor network connectivity

**Critical Memory Usage**
- Reduce request payloads
- Check for memory leaks
- Monitor usage patterns

## Log Analysis

### Structured Logging
The API uses structured logging with correlation IDs for request tracking.

#### Log Levels
- **ERROR**: Critical errors requiring immediate attention
- **WARN**: Issues that may indicate problems
- **INFO**: Normal operation information
- **DEBUG**: Detailed debugging information

#### Request Correlation
All logs include `requestId` for tracking requests across the system:
```json
{
  "level": "error",
  "message": "WordPress API error",
  "requestId": "req_1234567890_abc123",
  "error": {
    "name": "WordPressError",
    "message": "Connection timeout"
  }
}
```

### Log Analysis Tools

**Find Related Logs**
```bash
# In centralized logging system (e.g., CloudWatch, Datadog)
# Search by requestId
grep "req_1234567890_abc123" logs/application.log

# Search by error type
grep "WordPress API error" logs/error.log
```

**Performance Analysis**
```bash
# Find slow requests
grep "Slow operation detected" logs/application.log

# Find authentication failures
grep "Authentication failed" logs/application.log
```

## Environment Variables Checklist

### Required Variables
- [ ] `WORDPRESS_URL` - WordPress site URL
- [ ] `WORDPRESS_USERNAME` - WordPress username
- [ ] `WORDPRESS_APP_PASSWORD` - WordPress application password
- [ ] `GPT_API_KEY` - OpenAI API key
- [ ] `JWT_SECRET` - JWT signing secret

### Optional Configuration
- [ ] `WORDPRESS_TIMEOUT_MS` - Request timeout (default: 30000)
- [ ] `LOG_LEVEL` - Logging level (error, warn, info, debug)
- [ ] `ENABLE_DEBUG_LOGGING` - Enable detailed debug logs
- [ ] `SLACK_WEBHOOK_URL` - Slack notifications
- [ ] `DISCORD_WEBHOOK_URL` - Discord notifications
- [ ] `DEBUG_TOKEN` - Production debug access token

### Verification
```bash
# Check environment configuration
curl -H "X-Debug-Token: your-debug-token" "https://your-api-domain.vercel.app/api/debug?config=true"
```

## Monitoring Setup

### Health Check Monitoring
Set up external monitoring to check `/api/health` endpoint:
- Monitor every 30-60 seconds
- Alert on non-200 responses
- Track response time trends

### Alert Configuration
Configure webhook URLs for notifications:
```bash
# Environment variables
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### Metrics Dashboard
Create dashboards monitoring:
- Request count and error rate
- Response time percentiles
- WordPress API health
- System resource usage

## Security Considerations

### Production Debug Access
- Never expose debug endpoint without authentication in production
- Use strong `DEBUG_TOKEN` values
- Rotate debug tokens regularly
- Monitor debug endpoint access

### Log Security
- Logs automatically mask sensitive data
- API keys and passwords are redacted
- Use secure log storage and access controls

## Support Information

### Request Correlation
When reporting issues, include:
- Request ID from error responses
- Timestamp of the issue
- Error messages received
- Steps to reproduce

### Performance Baselines
Normal performance ranges:
- Response time: < 2 seconds (95th percentile)
- Error rate: < 5%
- Memory usage: < 80%
- WordPress API calls: < 10 seconds

### Contact Information
For additional support:
1. Check this troubleshooting guide
2. Review application logs with request correlation
3. Use debug endpoints for real-time diagnostics
4. Provide specific error details and reproduction steps

## Automated Diagnostics

### Health Check Script
```bash
#!/bin/bash
# health-check.sh
API_URL="https://your-api-domain.vercel.app"
DEBUG_TOKEN="your-debug-token"

echo "=== API Health Check ==="
curl -s "$API_URL/api/health?detailed=true&metrics=true" | jq .

echo -e "\n=== Error Statistics ==="
curl -s -H "X-Debug-Token: $DEBUG_TOKEN" "$API_URL/api/debug?errors=true&wordpress=true" | jq .errors

echo -e "\n=== Active Alerts ==="
curl -s "$API_URL/api/health?alerts=true" | jq .alerts
```

### Performance Monitoring
```bash
#!/bin/bash
# performance-monitor.sh
while true; do
    echo "$(date): $(curl -s "$API_URL/api/health?metrics=true" | jq -r '.metrics.averageResponseTime')"
    sleep 60
done
```

This troubleshooting guide provides comprehensive coverage of common issues and diagnostic procedures. Regular monitoring and proactive maintenance will help prevent most issues from occurring.
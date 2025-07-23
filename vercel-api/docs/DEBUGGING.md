# PostCrafter API Debugging Guide

This guide provides detailed debugging procedures and tools for developers and operators working with the PostCrafter API.

## Debug Endpoints

### Health Check Endpoint

The health endpoint provides real-time system status and metrics.

**Endpoint**: `GET /api/health`

**Query Parameters**:
- `detailed=true` - Include detailed service health checks
- `metrics=true` - Include performance metrics
- `alerts=true` - Include active alerts

**Example Requests**:
```bash
# Basic health check
curl https://your-domain.vercel.app/api/health

# Full health information
curl "https://your-domain.vercel.app/api/health?detailed=true&metrics=true&alerts=true"
```

**Response Structure**:
```json
{
  "status": "healthy|degraded|unhealthy|critical",
  "message": "System status message",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600.5,
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "application": {
      "status": "healthy",
      "message": "Application is healthy",
      "responseTime": 15,
      "details": { "metrics": "..." }
    },
    "wordpress": {
      "status": "healthy", 
      "message": "WordPress API is healthy",
      "responseTime": 250
    },
    "system": {
      "status": "healthy",
      "message": "System resources are healthy", 
      "responseTime": 5
    }
  },
  "metrics": {
    "requestCount": 1543,
    "errorCount": 23,
    "averageResponseTime": 1250,
    "p95ResponseTime": 2100,
    "p99ResponseTime": 3500,
    "successRate": 98.51,
    "wordPressApiCalls": 892,
    "wordPressApiErrors": 12
  }
}
```

### Debug Endpoint

The debug endpoint provides comprehensive diagnostic information.

**Endpoint**: `GET /api/debug`

**Authentication**: 
- Development: No authentication required
- Production: Requires `X-Debug-Token` header

**Query Parameters**:
- `logs=true` - Include recent log information
- `metrics=true` - Include detailed metrics
- `health=true` - Include health check results
- `errors=true` - Include error statistics
- `config=true` - Include configuration (masked)
- `wordpress=true` - Include WordPress API information
- `requests=true` - Include request logging configuration
- `alerts=true` - Include alert information
- `system=true` - Include system resource information

**Example Requests**:
```bash
# Development environment
curl "https://your-domain.vercel.app/api/debug?metrics=true&health=true&errors=true"

# Production environment (requires debug token)
curl -H "X-Debug-Token: your-secret-token" \
     "https://your-domain.vercel.app/api/debug?wordpress=true&errors=true"

# Full debug information
curl -H "X-Debug-Token: your-secret-token" \
     "https://your-domain.vercel.app/api/debug?logs=true&metrics=true&health=true&errors=true&config=true&wordpress=true&requests=true&alerts=true&system=true"
```

## Debugging Workflow

### 1. Initial Diagnosis

Start with a health check to get overall system status:

```bash
curl "https://your-domain.vercel.app/api/health?detailed=true&metrics=true&alerts=true"
```

**Key indicators to check**:
- Overall health status
- Error rate and count
- Response time metrics
- Active alerts
- Service-specific health

### 2. Error Investigation

If errors are detected, get detailed error information:

```bash
curl "https://your-domain.vercel.app/api/debug?errors=true&wordpress=true"
```

**Error patterns to analyze**:
- Error categories and frequencies
- Recent error timestamps
- WordPress-specific error codes
- Retry attempt statistics

### 3. Performance Analysis

For performance issues, examine metrics and system resources:

```bash
curl "https://your-domain.vercel.app/api/debug?metrics=true&system=true"
```

**Performance indicators**:
- Response time percentiles
- Memory usage patterns
- CPU utilization
- Request volume trends

### 4. Configuration Verification

Verify system configuration (sensitive data is masked):

```bash
curl -H "X-Debug-Token: your-token" \
     "https://your-domain.vercel.app/api/debug?config=true"
```

## Request Correlation

All requests generate unique correlation IDs for tracking across logs and systems.

### Request ID Format
```
req_{timestamp}_{random_string}
```

### Using Request IDs

**In API Responses**:
```json
{
  "error": {
    "requestId": "req_1704067200_abc123",
    "message": "Error details"
  }
}
```

**In Logs**:
```json
{
  "level": "error",
  "message": "WordPress API error",
  "requestId": "req_1704067200_abc123",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Correlation Across Services**:
- Error handler uses same request ID
- Monitoring system tracks by request ID  
- Log aggregation can filter by request ID

## Verbose Logging Mode

Enable detailed logging for troubleshooting:

### Environment Configuration
```bash
# Enable debug logging
ENABLE_DEBUG_LOGGING=true
LOG_LEVEL=debug
```

### Runtime Log Level Changes
```bash
# Check current log level
curl "https://your-domain.vercel.app/api/debug?config=true" | jq .config.logger

# Note: Log level changes require redeployment for serverless functions
```

### Log Structure

All logs follow structured format for easy parsing:

```json
{
  "level": "info|warn|error|debug",
  "message": "Human readable message",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "requestId": "req_1704067200_abc123", 
  "metadata": {
    "component": "wordpress-api",
    "operation": "create_post",
    "duration": 1250,
    "statusCode": 201
  }
}
```

## Common Debug Scenarios

### Scenario 1: API Request Failures

**Symptoms**: 5xx errors, timeouts, or authentication failures

**Debug Steps**:
1. Check health status:
   ```bash
   curl "https://your-domain.vercel.app/api/health?detailed=true"
   ```

2. Examine error patterns:
   ```bash
   curl "https://your-domain.vercel.app/api/debug?errors=true&wordpress=true"
   ```

3. Test WordPress connectivity:
   ```bash
   curl -u "username:app_password" https://your-wordpress-site.com/wp-json/wp/v2/users/me
   ```

### Scenario 2: Performance Degradation

**Symptoms**: Slow response times, timeouts

**Debug Steps**:
1. Check performance metrics:
   ```bash
   curl "https://your-domain.vercel.app/api/debug?metrics=true&system=true"
   ```

2. Monitor response times over time:
   ```bash
   watch -n 30 'curl -s "https://your-domain.vercel.app/api/health?metrics=true" | jq .metrics.p95ResponseTime'
   ```

3. Check WordPress site performance:
   ```bash
   time curl -I https://your-wordpress-site.com/wp-json/wp/v2/
   ```

### Scenario 3: Authentication Issues

**Symptoms**: 401/403 errors, authentication failures

**Debug Steps**:
1. Verify credentials configuration:
   ```bash
   curl -H "X-Debug-Token: your-token" \
        "https://your-domain.vercel.app/api/debug?config=true" | jq .config.environment.sensitiveConfigPresent
   ```

2. Test WordPress authentication:
   ```bash
   curl -u "username:app_password" \
        https://your-wordpress-site.com/wp-json/wp/v2/users/me
   ```

3. Check authentication error patterns:
   ```bash
   curl "https://your-domain.vercel.app/api/debug?errors=true" | jq .errors.wordpress.errorsByCategory.authentication
   ```

## Log Analysis

### Centralized Logging

For production deployments, integrate with centralized logging:

**Recommended Services**:
- AWS CloudWatch
- Google Cloud Logging
- Azure Monitor
- Datadog
- New Relic

### Log Queries

**Find all logs for a request**:
```bash
# CloudWatch example
aws logs filter-log-events \
  --log-group-name "/aws/lambda/postcrafter-api" \
  --filter-pattern "req_1704067200_abc123"
```

**Find authentication failures**:
```bash
# Generic grep example
grep "Authentication failed" logs/application.log | tail -20
```

**Find performance issues**:
```bash
# Find slow operations
grep "Slow operation detected" logs/application.log
```

## Monitoring Integration

### External Monitoring Setup

**Health Check Monitoring**:
```bash
# Uptime monitoring
curl -f "https://your-domain.vercel.app/api/health" || exit 1

# Performance monitoring
RESPONSE_TIME=$(curl -w "%{time_total}" -s -o /dev/null "https://your-domain.vercel.app/api/health")
if (( $(echo "$RESPONSE_TIME > 5.0" | bc -l) )); then
  echo "ALERT: Slow response time: ${RESPONSE_TIME}s"
fi
```

**Metrics Collection**:
```bash
# Collect metrics for dashboard
curl -s "https://your-domain.vercel.app/api/health?metrics=true" | \
  jq '.metrics | {requests: .requestCount, errors: .errorCount, responseTime: .averageResponseTime}'
```

### Alert Configuration

**Webhook Testing**:
```bash
# Test Slack webhook
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test alert from PostCrafter API"}' \
  YOUR_SLACK_WEBHOOK_URL

# Test Discord webhook  
curl -X POST -H 'Content-type: application/json' \
  --data '{"content":"Test alert from PostCrafter API"}' \
  YOUR_DISCORD_WEBHOOK_URL
```

## Security Considerations

### Debug Token Management

**Generate Secure Tokens**:
```bash
# Generate random debug token
openssl rand -hex 32
```

**Environment Variable Setup**:
```bash
# Set in Vercel environment variables
DEBUG_TOKEN=your-generated-token
```

**Token Rotation**:
- Rotate tokens regularly (monthly)
- Use different tokens for different environments
- Monitor debug endpoint access logs

### Sensitive Data Protection

The debug endpoint automatically masks sensitive information:

**Masked Data**:
- API keys and passwords
- Authentication tokens
- Database connection strings
- Webhook URLs (domain shown, path masked)

**Configuration Verification**:
```json
{
  "sensitiveConfigPresent": {
    "WORDPRESS_URL": true,
    "WORDPRESS_USERNAME": true, 
    "WORDPRESS_APP_PASSWORD": true,
    "GPT_API_KEY": true,
    "JWT_SECRET": true
  }
}
```

## Best Practices

### Regular Health Checks
- Monitor `/api/health` every 30-60 seconds
- Set up alerts for status changes
- Track metrics trends over time

### Request Correlation
- Always include request IDs when reporting issues
- Use request IDs to trace issues across logs
- Implement request ID propagation in client applications

### Structured Logging
- Use consistent log formats
- Include relevant context in log messages  
- Implement log level appropriately

### Error Handling
- Provide clear error messages to clients
- Log detailed error information for debugging
- Implement proper retry logic for transient failures

### Security
- Restrict debug endpoint access in production
- Rotate debug tokens regularly
- Monitor for unauthorized debug access attempts
- Never log sensitive data in plain text

This debugging guide provides comprehensive tools and procedures for diagnosing and resolving issues with the PostCrafter API. Regular monitoring and proactive debugging help maintain system reliability and performance.
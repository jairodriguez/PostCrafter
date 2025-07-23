# PostCrafter API Authentication Guide

This guide covers all authentication methods supported by the PostCrafter API, with specific instructions for GPT Action integration and general API usage.

## Overview

The PostCrafter API supports multiple authentication methods to accommodate different use cases:

- **API Key Authentication** (Recommended for GPT Actions)
- **Bearer Token Authentication** (For direct API calls)
- **Basic Authentication** (Development only)

All authenticated endpoints require a valid API key. The health check endpoint (`/health`) is publicly accessible and doesn't require authentication.

## API Key Format

PostCrafter API keys follow a specific format for security and identification:

```
pc_sk_{environment}_{identifier}
```

- **Prefix**: `pc_sk_` (PostCrafter Secret Key)
- **Environment**: 
  - `live_` for production environments
  - `test_` for development/testing environments
- **Identifier**: 16-character alphanumeric string

**Examples:**
- Production: `pc_sk_live_a1b2c3d4e5f6g7h8`
- Development: `pc_sk_test_x9y8z7w6v5u4t3s2`

## Authentication Methods

### 1. API Key Authentication (Recommended for GPT Actions)

**Method**: Custom header `x-api-key`

**Usage:**
```http
POST /api/publish
Content-Type: application/json
x-api-key: pc_sk_live_a1b2c3d4e5f6g7h8

{
  "post": {
    "title": "Example Post",
    "content": "Post content here..."
  }
}
```

**GPT Action Configuration:**
1. In ChatGPT, go to your GPT configuration
2. Navigate to Actions → Authentication
3. Select "API Key"
4. Set Auth Type to "Custom"
5. Add header: `x-api-key`
6. Enter your API key as the value

**Advantages:**
- Simple integration with GPT Actions
- Clear separation from standard Authorization headers
- Easy to identify in logs and monitoring
- No encoding required

### 2. Bearer Token Authentication

**Method**: Authorization header with Bearer scheme

**Usage:**
```http
POST /api/publish
Content-Type: application/json
Authorization: Bearer pc_sk_live_a1b2c3d4e5f6g7h8

{
  "post": {
    "title": "Example Post",
    "content": "Post content here..."
  }
}
```

**When to Use:**
- Direct API integrations
- Server-to-server communication
- API testing tools (Postman, Insomnia)
- Custom applications and scripts

**Advantages:**
- Standard HTTP authentication method
- Compatible with all HTTP clients
- Follows OAuth 2.0 conventions
- Well-supported by API tools

### 3. Basic Authentication (Development Only)

**Method**: Authorization header with Basic scheme

**⚠️ WARNING**: Only use in development environments with HTTPS

**Usage:**
```http
POST /api/publish
Content-Type: application/json
Authorization: Basic cGNfc2tfbGl2ZV9hMWIyYzNkNGU1ZjZnN2g4Og==

{
  "post": {
    "title": "Example Post",
    "content": "Post content here..."
  }
}
```

**Format:**
- Username: Your API key
- Password: (leave empty)
- Encode as Base64: `base64(api_key:)`

**Security Considerations:**
- Base64 is encoding, not encryption
- Credentials are easily decoded
- Only use with HTTPS
- Not recommended for production

## GPT Action Integration

### Step-by-Step Setup

1. **Obtain API Key**
   - Generate a new API key from your PostCrafter dashboard
   - Use a `live_` key for production or `test_` key for development

2. **Configure Authentication in ChatGPT**
   - Go to your GPT configuration
   - Navigate to Actions section
   - Click "Create new action" or edit existing
   - Import the OpenAPI specification from: `https://your-domain.vercel.app/api/openapi.yaml`

3. **Set Up Authentication**
   - In the Authentication section, select "API Key"
   - Choose "Custom" as the auth type
   - Set header name: `x-api-key`
   - Enter your API key as the value
   - Save the configuration

4. **Test the Integration**
   - Use the test feature in ChatGPT to verify authentication
   - Try a simple publish request to confirm connectivity

### Authentication Headers in GPT Actions

When properly configured, ChatGPT will automatically include the authentication header in all API requests:

```http
x-api-key: pc_sk_live_a1b2c3d4e5f6g7h8
```

### Troubleshooting GPT Actions

**Common Issues:**

1. **401 Unauthorized Error**
   - Verify API key is correct and active
   - Check that header name is exactly `x-api-key`
   - Ensure no extra spaces in the API key

2. **Authentication Header Missing**
   - Re-save the GPT Action configuration
   - Verify the auth type is set to "Custom"
   - Check that the header name matches exactly

3. **Invalid API Key Format**
   - Ensure key starts with `pc_sk_`
   - Verify environment suffix (`live_` or `test_`)
   - Check for typos in the identifier

## Security Best Practices

### API Key Management

1. **Keep Keys Secret**
   - Never commit API keys to version control
   - Use environment variables for key storage
   - Rotate keys regularly (recommended: every 90 days)

2. **Environment Separation**
   - Use `test_` keys for development/staging
   - Use `live_` keys only for production
   - Never mix environments

3. **Access Control**
   - Limit API key access to necessary personnel
   - Monitor API key usage for unusual activity
   - Revoke unused or compromised keys immediately

4. **Network Security**
   - Always use HTTPS in production
   - Implement rate limiting on your endpoints
   - Consider IP whitelisting for sensitive operations

### Rate Limiting

The API implements rate limiting to prevent abuse:

- **Standard Rate Limit**: 100 requests per hour per API key
- **Burst Limit**: 10 requests per minute
- **Rate Limit Headers**: Included in responses

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312800
Retry-After: 3600
```

### Error Handling

**Authentication Errors:**

```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "Authentication required",
    "details": "Missing or invalid API key",
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req_1705312200_abc123",
    "help_url": "https://docs.postcrafter.com/errors/authentication"
  }
}
```

**Rate Limit Errors:**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_ERROR",
    "message": "Rate limit exceeded",
    "details": "Maximum 100 requests per hour exceeded",
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req_1705312200_abc123",
    "retry_after": 3600,
    "help_url": "https://docs.postcrafter.com/errors/rate-limit"
  }
}
```

## Testing Authentication

### Using curl

**API Key Method:**
```bash
curl -X POST https://your-domain.vercel.app/api/publish \
  -H "Content-Type: application/json" \
  -H "x-api-key: pc_sk_live_a1b2c3d4e5f6g7h8" \
  -d '{
    "post": {
      "title": "Test Post",
      "content": "This is a test post.",
      "status": "draft"
    }
  }'
```

**Bearer Token Method:**
```bash
curl -X POST https://your-domain.vercel.app/api/publish \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer pc_sk_live_a1b2c3d4e5f6g7h8" \
  -d '{
    "post": {
      "title": "Test Post",
      "content": "This is a test post.",
      "status": "draft"
    }
  }'
```

### Using JavaScript

**API Key Method:**
```javascript
const response = await fetch('https://your-domain.vercel.app/api/publish', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'pc_sk_live_a1b2c3d4e5f6g7h8'
  },
  body: JSON.stringify({
    post: {
      title: 'Test Post',
      content: 'This is a test post.',
      status: 'draft'
    }
  })
});

const result = await response.json();
console.log(result);
```

**Bearer Token Method:**
```javascript
const response = await fetch('https://your-domain.vercel.app/api/publish', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer pc_sk_live_a1b2c3d4e5f6g7h8'
  },
  body: JSON.stringify({
    post: {
      title: 'Test Post',
      content: 'This is a test post.',
      status: 'draft'
    }
  })
});

const result = await response.json();
console.log(result);
```

### Health Check (No Authentication)

The health check endpoint is publicly accessible:

```bash
curl https://your-domain.vercel.app/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "environment": "production",
  "dependencies": {
    "wordpress": "connected",
    "database": "healthy"
  }
}
```

## Migration and Updates

### API Key Rotation

When rotating API keys:

1. Generate a new API key in your dashboard
2. Test the new key in a development environment
3. Update your GPT Action configuration with the new key
4. Test the GPT Action functionality
5. Revoke the old API key after confirming the new one works

### Version Updates

The API supports versioning to maintain backward compatibility:

- Current version: `v1`
- Future versions will be available at different paths
- Authentication methods remain consistent across versions
- Deprecated versions will have 6-month sunset periods

## Support and Documentation

### Resources

- **API Documentation**: [https://docs.postcrafter.com/api](https://docs.postcrafter.com/api)
- **OpenAPI Specification**: [https://your-domain.vercel.app/api/openapi.yaml](https://your-domain.vercel.app/api/openapi.yaml)
- **GPT Action Guide**: [https://docs.postcrafter.com/gpt-actions](https://docs.postcrafter.com/gpt-actions)
- **Security Best Practices**: [https://docs.postcrafter.com/security](https://docs.postcrafter.com/security)

### Getting Help

- **Support Email**: support@postcrafter.com
- **GitHub Issues**: [https://github.com/postcrafter/api/issues](https://github.com/postcrafter/api/issues)
- **Community Forum**: [https://community.postcrafter.com](https://community.postcrafter.com)
- **Status Page**: [https://status.postcrafter.com](https://status.postcrafter.com)
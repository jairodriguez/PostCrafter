# PostCrafter API Documentation

## Overview

The PostCrafter API is a serverless REST API built with TypeScript and deployed on Vercel. It provides seamless integration between ChatGPT and WordPress, enabling AI-powered content creation and publishing.

## Base URL

```
Production: https://your-vercel-app.vercel.app
Development: http://localhost:3000
```

## Authentication

All API requests require authentication using an API key in the `X-API-Key` header:

```bash
curl -H "X-API-Key: your-api-key" \
     -H "Content-Type: application/json" \
     https://your-api.vercel.app/api/publish
```

### API Key Format

API keys should be in the format: `sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Endpoints

### 1. Health Check

**GET** `/api/health`

Check the API health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-07-25T01:30:00.000Z",
  "version": "1.0.0",
  "environment": "production"
}
```

### 2. Publish Post

**POST** `/api/publish`

Create and publish a new WordPress post.

**Request Body:**
```json
{
  "title": "Your Post Title",
  "content": "Your post content in HTML or Markdown format.",
  "status": "draft",
  "categories": ["Technology", "AI"],
  "tags": ["chatgpt", "wordpress"],
  "images": [
    {
      "url": "https://example.com/image.jpg",
      "alt": "Image description",
      "is_featured": true
    }
  ],
  "yoast_meta": {
    "meta_title": "SEO Optimized Title",
    "meta_description": "SEO meta description",
    "focus_keywords": ["keyword1", "keyword2"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "post_id": 123,
  "post_url": "https://your-wordpress-site.com/2025/07/25/your-post-title/",
  "message": "Post created successfully",
  "wordpress_response": {
    "id": 123,
    "link": "https://your-wordpress-site.com/2025/07/25/your-post-title/",
    "status": "draft"
  }
}
```

### 3. Post Status

**GET** `/api/posts/status`

Get the status of recent posts.

**Response:**
```json
{
  "success": true,
  "posts": [
    {
      "id": 123,
      "title": "Your Post Title",
      "status": "draft",
      "link": "https://your-wordpress-site.com/2025/07/25/your-post-title/",
      "created_at": "2025-07-25T01:30:00.000Z"
    }
  ],
  "total_posts": 1
}
```

### 4. Monitoring

**GET** `/api/monitoring`

Get API monitoring and performance metrics.

**Response:**
```json
{
  "success": true,
  "metrics": {
    "total_requests": 150,
    "successful_requests": 145,
    "error_rate": 0.033,
    "average_response_time": 450,
    "uptime": 99.8
  },
  "security_events": {
    "total_events": 5,
    "blocked_ips": 2,
    "rate_limit_violations": 3
  }
}
```

## Data Models

### Post Data

```typescript
interface PostData {
  title: string;                    // Required: Post title
  content: string;                  // Required: Post content (HTML/Markdown)
  status?: 'draft' | 'publish';     // Optional: Post status (default: draft)
  categories?: string[];            // Optional: Category names
  tags?: string[];                  // Optional: Tag names
  images?: ImageData[];             // Optional: Images to include
  yoast_meta?: YoastMetaData;       // Optional: Yoast SEO metadata
  excerpt?: string;                 // Optional: Post excerpt
  featured_image?: string;          // Optional: Featured image URL
}
```

### Image Data

```typescript
interface ImageData {
  url: string;                      // Required: Image URL or base64 data
  alt?: string;                     // Optional: Alt text for accessibility
  is_featured?: boolean;            // Optional: Set as featured image
  caption?: string;                 // Optional: Image caption
}
```

### Yoast SEO Metadata

```typescript
interface YoastMetaData {
  meta_title?: string;              // Optional: SEO title
  meta_description?: string;        // Optional: SEO description
  focus_keywords?: string[];        // Optional: Focus keywords
  canonical_url?: string;           // Optional: Canonical URL
  og_title?: string;                // Optional: Open Graph title
  og_description?: string;          // Optional: Open Graph description
  og_image?: string;                // Optional: Open Graph image
}
```

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid post data provided",
    "details": {
      "field": "title",
      "issue": "Title is required"
    }
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `AUTHENTICATION_ERROR` | Invalid or missing API key |
| `VALIDATION_ERROR` | Invalid request data |
| `WORDPRESS_ERROR` | WordPress API communication error |
| `RATE_LIMIT_ERROR` | Too many requests |
| `IMAGE_PROCESSING_ERROR` | Image upload/processing failed |
| `INTERNAL_ERROR` | Server error |

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Default Limit**: 100 requests per minute per API key
- **Headers**: Rate limit information is included in response headers
- **Exceeded**: Returns `429 Too Many Requests` with retry-after header

## Image Processing

### Supported Formats

- **URL Images**: Direct URLs to images
- **Base64 Images**: Base64 encoded image data
- **Formats**: JPEG, PNG, GIF, WebP

### Image Optimization

Images are automatically:
- Resized to optimal dimensions
- Compressed for web delivery
- Converted to WebP when possible
- Cached for performance

## WordPress Integration

### Requirements

- WordPress site with REST API enabled
- Application password for authentication
- Proper CORS configuration

### Supported WordPress Features

- Post creation and publishing
- Category and tag management
- Featured image upload
- Yoast SEO integration
- Custom fields support
- Draft and publish status

## Security Features

### Authentication

- API key-based authentication
- JWT token validation
- Secure key storage

### Data Validation

- Input sanitization
- XSS protection
- SQL injection prevention
- File upload validation

### Monitoring

- Security event logging
- IP blacklisting
- Rate limiting
- Request/response logging

## Usage Examples

### Basic Post Creation

```bash
curl -X POST https://your-api.vercel.app/api/publish \
  -H "X-API-Key: sk-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First AI-Generated Post",
    "content": "<p>This is my first post created with AI assistance.</p>",
    "status": "draft"
  }'
```

### Post with Images and SEO

```bash
curl -X POST https://your-api.vercel.app/api/publish \
  -H "X-API-Key: sk-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "AI and Content Creation",
    "content": "<p>Exploring the future of AI-powered content creation...</p>",
    "status": "draft",
    "categories": ["Technology", "AI"],
    "tags": ["artificial-intelligence", "content-creation"],
    "images": [
      {
        "url": "https://example.com/ai-image.jpg",
        "alt": "AI and content creation",
        "is_featured": true
      }
    ],
    "yoast_meta": {
      "meta_title": "AI and Content Creation - The Future of Writing",
      "meta_description": "Discover how AI is revolutionizing content creation and what it means for writers.",
      "focus_keywords": ["AI", "content creation", "writing"]
    }
  }'
```

### Check Post Status

```bash
curl -H "X-API-Key: sk-your-api-key" \
     https://your-api.vercel.app/api/posts/status
```

## Testing

### Health Check

```bash
curl https://your-api.vercel.app/api/health
```

### Authentication Test

```bash
curl -H "X-API-Key: sk-your-api-key" \
     https://your-api.vercel.app/api/monitoring
```

## Troubleshooting

### Common Issues

1. **Authentication Error**
   - Verify API key is correct
   - Check API key format (starts with `sk-`)
   - Ensure API key is included in `X-API-Key` header

2. **WordPress Connection Error**
   - Verify WordPress URL is correct
   - Check WordPress REST API is enabled
   - Ensure application password is valid

3. **Image Upload Error**
   - Check image URL is accessible
   - Verify image format is supported
   - Ensure image size is within limits

4. **Rate Limit Error**
   - Wait for rate limit window to reset
   - Reduce request frequency
   - Check rate limit headers for retry timing

### Debug Mode

Enable debug logging by setting `ENABLE_DEBUG_LOGGING=true` in environment variables.

## Support

For technical support and questions:

1. Check the troubleshooting guide
2. Review error logs
3. Contact the development team
4. Check GitHub issues

## Version History

- **v1.0.0**: Initial release with basic post creation
- **v1.1.0**: Added image processing and Yoast SEO support
- **v1.2.0**: Enhanced security and monitoring features
- **v1.3.0**: Performance optimizations and load testing 
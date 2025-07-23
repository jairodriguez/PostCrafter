# PostCrafter API Documentation

This directory contains the OpenAPI specification for the PostCrafter API.

## Overview

PostCrafter provides a seamless integration between ChatGPT and WordPress, allowing users to publish AI-generated, SEO-optimized articles directly from ChatGPT conversations to their WordPress sites.

## Files

- `openapi.yaml` - Complete OpenAPI 3.0 specification for the PostCrafter API
- `README.md` - This documentation file

## API Specification

The OpenAPI specification defines:

### Endpoints

1. **POST `/api/publish`** - Main endpoint for publishing posts to WordPress
2. **GET `/api/health`** - Health check endpoint for monitoring

### Key Features

- **Authentication**: API key-based authentication via headers
- **Post Publishing**: Complete post creation with title, content, excerpt, and status
- **SEO Optimization**: Yoast SEO metadata integration
- **Image Handling**: Support for URL-based and base64 image uploads
- **Taxonomy Management**: Automatic category and tag creation/assignment
- **Content Security**: Input validation and sanitization
- **Error Handling**: Comprehensive error responses with detailed messages

### Request/Response Examples

#### Basic Post Creation

```json
{
  "post": {
    "title": "My First Post",
    "content": "This is the content of my first post.",
    "status": "draft"
  }
}
```

#### Complete Post with SEO and Images

```json
{
  "post": {
    "title": "Complete Guide to API Development",
    "content": "# API Development Best Practices\n\nThis guide covers...",
    "excerpt": "A comprehensive guide covering API development best practices.",
    "status": "publish",
    "categories": ["Technology", "Development"],
    "tags": ["API", "REST", "Best Practices"],
    "yoast_meta": {
      "meta_title": "Complete API Development Guide 2024",
      "meta_description": "Learn API development best practices and security.",
      "focus_keywords": "API development, REST API, API security"
    },
    "images": [
      {
        "url": "https://example.com/api-diagram.png",
        "alt_text": "API architecture diagram",
        "featured": true
      }
    ]
  },
  "options": {
    "include_images": true,
    "optimize_images": true,
    "validate_content": true
  }
}
```

## Validation

The OpenAPI specification can be validated using:

```bash
npm run validate:openapi
```

This script validates the specification syntax and structure using `swagger-parser`.

## Usage in Development

### Tools for Testing

- **Swagger UI**: Import `openapi.yaml` into Swagger UI for interactive testing
- **Postman**: Import the OpenAPI spec into Postman for API testing
- **Insomnia**: Load the specification for API development
- **curl**: Use the examples in the spec for command-line testing

### GPT Action Integration

This OpenAPI specification is designed specifically for ChatGPT's GPT Actions feature. The schema includes:

- Clear parameter descriptions for GPT understanding
- Comprehensive examples for different use cases
- Detailed error responses for troubleshooting
- Security configuration for API key authentication

## Schema Components

### Request Schemas

- `PublishRequest` - Main request wrapper
- `PostData` - Post content and metadata
- `YoastMeta` - SEO metadata fields
- `ImageData` - Image upload information
- `PublishOptions` - Publishing configuration

### Response Schemas

- `PublishResponse` - Success/error response wrapper
- `PublishResponseData` - Successful publish response data
- `ErrorResponse` - Error response structure
- `ErrorDetails` - Detailed error information

## Security

The API uses API key authentication with support for:

- `x-api-key` header
- `Authorization: Bearer <token>` header
- Rate limiting with appropriate headers
- Input validation and sanitization
- CORS configuration for web applications

## Error Handling

The API provides detailed error responses with:

- Machine-readable error codes
- Human-readable error messages
- Additional error details for debugging
- Request tracking IDs for support
- Timestamp information

## Content Validation

All content is automatically:

- Validated for length and format requirements
- Sanitized to prevent XSS and injection attacks
- Checked for malicious content patterns
- Optimized for WordPress compatibility

## Next Steps

1. **Implementation**: Use this specification to implement client libraries
2. **Testing**: Validate API behavior against the specification
3. **Documentation**: Generate additional documentation from the OpenAPI spec
4. **Monitoring**: Use the health endpoint for service monitoring
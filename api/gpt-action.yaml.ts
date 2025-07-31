import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'text/yaml');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const gptActionSpec = `openapi: 3.1.0
info:
  title: PostCrafter API
  description: |
    AI-generated, SEO-optimized articles published directly from ChatGPT to WordPress.
    
    This API allows ChatGPT to publish posts to WordPress with comprehensive SEO optimization,
    media uploads, and Yoast SEO integration.
    
    ## Features
    - WordPress post creation with SEO optimization
    - Media upload support (URL and base64)
    - Yoast SEO meta field management
    - Category and tag management
    - Featured image assignment
    - Comprehensive error handling
    
    ## Authentication
    API key authentication is required for all endpoints.
  version: 1.0.0

servers:
  - url: https://postcrafter-one.vercel.app
    description: Production server

paths:
  /api/publish:
    post:
      operationId: publishPost
      summary: Publish a post to WordPress with SEO optimization
      description: |
        Publishes a complete post to WordPress with SEO meta fields, categories, tags, and media.
        Supports Yoast SEO integration for meta title, description, and focus keyword.
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PostPublishRequest'
      responses:
        '200':
          description: Post published successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PostPublishResponse'
        '400':
          description: Bad request - missing required fields
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthorized - invalid API key
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /api/health:
    get:
      operationId: healthCheck
      summary: Check API health status
      description: Returns the current health status of the PostCrafter API
      security:
        - ApiKeyAuth: []
      responses:
        '200':
          description: API is healthy
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthResponse'

components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
      description: API key for authentication

  schemas:
    PostPublishRequest:
      type: object
      required:
        - title
        - content
      properties:
        title:
          type: string
          description: Post title (required)
          example: "Getting Started with PostCrafter"
        content:
          type: string
          description: Post content in HTML format (required)
          example: "<h2>Introduction</h2><p>This is the main content...</p>"
        excerpt:
          type: string
          description: Post excerpt/summary
          example: "A brief summary of the post content"
        status:
          type: string
          enum: [publish, draft]
          description: Post status (default: publish)
          example: "publish"
        categories:
          type: array
          items:
            type: string
          description: List of category names
          example: ["Technology", "AI"]
        tags:
          type: array
          items:
            type: string
          description: List of tag names
          example: ["wordpress", "seo"]
        yoast:
          $ref: '#/components/schemas/YoastData'
          description: Yoast SEO meta fields
        images:
          type: array
          items:
            $ref: '#/components/schemas/ImageData'
          description: List of images to upload and attach to the post

    ImageData:
      type: object
      properties:
        url:
          type: string
          description: URL of the image to download and upload
          example: "https://example.com/image.jpg"
        base64:
          type: string
          description: Base64 encoded image data
          example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
        alt_text:
          type: string
          description: Alt text for the image
          example: "PostCrafter logo"
        caption:
          type: string
          description: Image caption
          example: "PostCrafter makes WordPress publishing easy"
        featured:
          type: boolean
          description: Whether to set as featured image
          example: true

    YoastData:
      type: object
      properties:
        meta_title:
          type: string
          description: SEO meta title (max 55 characters for optimal display)
          example: "Getting Started with PostCrafter | PostCrafter"
        meta_description:
          type: string
          description: SEO meta description (max 150 characters for optimal display)
          example: "Learn how to use PostCrafter to create and publish AI-generated content with SEO optimization."
        focus_keyword:
          type: string
          description: Primary focus keyword for SEO (should be 1-5 words, max 60 characters)
          example: "AI content creation"

    PostPublishResponse:
      type: object
      properties:
        success:
          type: boolean
          description: Whether the post was published successfully
          example: true
        post_id:
          type: integer
          description: WordPress post ID
          example: 1234
        post_url:
          type: string
          description: URL of the published post
          example: "https://example.com/getting-started-with-postcrafter/"
        message:
          type: string
          description: Success message
          example: "Post created successfully"

    ErrorResponse:
      type: object
      properties:
        error:
          type: string
          description: Error message
          example: "Title and content are required"
        details:
          type: string
          description: Additional error details
          example: "Missing required field: title"

    HealthResponse:
      type: object
      properties:
        status:
          type: string
          description: Health status
          example: "healthy"
        timestamp:
          type: string
          format: date-time
          description: Current timestamp
          example: "2024-01-15T10:30:00Z"
        version:
          type: string
          description: API version
          example: "1.0.0"`;

  res.status(200).send(gptActionSpec);
} 
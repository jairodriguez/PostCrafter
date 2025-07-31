import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
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
  - url: https://postcrafter-nextjs-2jufbv2wn-jairo-rodriguezs-projects-77445a5f.vercel.app
    description: Production server

paths:
  /api/publish:
    post:
      operationId: publishPost
      summary: Publish a new post to WordPress
      description: Creates a new WordPress post with optional media uploads, SEO optimization, and category/tag management.
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
          description: Bad request - validation error
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
      summary: Health check endpoint
      description: Returns the health status of the API
      responses:
        '200':
          description: API is healthy
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthResponse'

components:
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
          example: "<h2>Introduction</h2><p>PostCrafter is an AI-powered tool...</p>"
        excerpt:
          type: string
          description: Post excerpt/summary
          example: "Learn how to use PostCrafter to create and publish AI-generated content."
        status:
          type: string
          enum: [draft, publish, private]
          default: "publish"
          description: Post status
        categories:
          type: array
          items:
            type: string
          description: Category names (will be created if they don't exist)
          example: ["Technology", "AI"]
        tags:
          type: array
          items:
            type: string
          description: Tag names (will be created if they don't exist)
          example: ["content-creation", "seo"]
        images:
          type: array
          items:
            $ref: '#/components/schemas/ImageData'
          description: Images to upload and attach to the post
        yoast:
          $ref: '#/components/schemas/YoastData'
          description: Yoast SEO meta fields

    ImageData:
      type: object
      required:
        - url
      properties:
        url:
          type: string
          description: Image URL to download and upload
          example: "https://example.com/image.jpg"
        base64:
          type: string
          description: Base64 encoded image data (alternative to URL)
          example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
        alt_text:
          type: string
          description: Alt text for accessibility
          example: "AI Content Creation"
        title:
          type: string
          description: Image title
          example: "AI Content Creation Process"
        caption:
          type: string
          description: Image caption
          example: "The AI content creation process involves multiple steps..."
        featured:
          type: boolean
          default: false
          description: Whether this image should be the featured image
      oneOf:
        - required: [url]
        - required: [base64]

    YoastData:
      type: object
      properties:
        meta_title:
          type: string
          description: SEO meta title
          example: "Getting Started with PostCrafter | PostCrafter"
        meta_description:
          type: string
          description: SEO meta description
          example: "Learn how to use PostCrafter to create and publish AI-generated content with SEO optimization."
        focus_keyword:
          type: string
          description: Primary focus keyword for SEO
          example: "AI content creation"
        keywords:
          type: array
          items:
            type: string
          description: Additional keywords for SEO
          example: ["content creation", "wordpress", "seo"]
        og_title:
          type: string
          description: Open Graph title
          example: "Getting Started with PostCrafter"
        og_description:
          type: string
          description: Open Graph description
          example: "Learn how to use PostCrafter for AI content creation"
        og_image:
          type: string
          description: Open Graph image URL
          example: "https://example.com/og-image.jpg"
        twitter_title:
          type: string
          description: Twitter Card title
          example: "Getting Started with PostCrafter"
        twitter_description:
          type: string
          description: Twitter Card description
          example: "Learn how to use PostCrafter for AI content creation"
        twitter_image:
          type: string
          description: Twitter Card image URL
          example: "https://example.com/twitter-image.jpg"

    PostPublishResponse:
      type: object
      properties:
        success:
          type: boolean
          description: Whether the operation was successful
          example: true
        post_id:
          type: integer
          description: WordPress post ID
          example: 123
        post_url:
          type: string
          description: Published post URL
          example: "https://braindump.guru/getting-started-with-postcrafter/"
        message:
          type: string
          description: Success message
          example: "Post published successfully!"

    ErrorResponse:
      type: object
      properties:
        success:
          type: boolean
          example: false
        error:
          type: string
          description: Human-readable error message
          example: "Invalid post data: Title is required and must be between 1 and 200 characters"

    HealthResponse:
      type: object
      properties:
        status:
          type: string
          example: "healthy"
        timestamp:
          type: string
          format: date-time
        environment:
          type: string
          example: "production"

  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
      description: API key for authentication

security:
  - ApiKeyAuth: []`;

  res.setHeader('Content-Type', 'application/yaml');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  res.status(200).send(gptActionSpec);
} 
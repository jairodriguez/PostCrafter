import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const openApiSpec = `openapi: 3.0.3
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
    
    ## Rate Limiting
    Rate limiting is applied based on API key tier and usage patterns.
  version: 1.0.0
  contact:
    name: PostCrafter Support
    email: support@postcrafter.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://postcrafter-nextjs-8rd3ehcy4-jairo-rodriguezs-projects-77445a5f.vercel.app
    description: Production server (Working PostCrafter API)

security:
  - ApiKeyAuth: []

paths:
  /api/publish:
    post:
      summary: Publish a new post to WordPress
      description: |
        Creates a new WordPress post with optional media uploads, SEO optimization,
        and category/tag management. This endpoint is designed for ChatGPT integration
        and supports comprehensive post data including Yoast SEO fields.
      operationId: publishPost
      tags:
        - Posts
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PostPublishRequest'
            examples:
              basic_post:
                summary: Basic post with title and content
                value:
                  title: "Getting Started with PostCrafter"
                  content: "PostCrafter is an AI-powered tool that helps you create and publish SEO-optimized content directly to WordPress..."
                  excerpt: "Learn how to use PostCrafter to create and publish AI-generated content with SEO optimization."
              full_post:
                summary: Complete post with all features
                value:
                  title: "Complete Guide to AI Content Creation"
                  content: "<h2>Introduction</h2><p>AI content creation is revolutionizing how we produce digital content...</p>",
                  excerpt: "A comprehensive guide to using AI for content creation with SEO best practices.",
                  categories: ["Technology", "AI"],
                  tags: ["content-creation", "seo", "wordpress"],
                  images:
                    - url: "https://example.com/featured-image.jpg"
                      alt_text: "AI Content Creation"
                      featured: true
                  yoast:
                    meta_title: "Complete Guide to AI Content Creation | PostCrafter"
                    meta_description: "Learn how to create AI-generated content with SEO optimization. Discover best practices for content creation and WordPress publishing."
                    focus_keyword: "AI content creation"
      responses:
        '200':
          description: Post published successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PostPublishResponse'
              examples:
                success:
                  summary: Successful post publication
                  value:
                    success: true
                    post_id: 123
                    post_url: "https://braindump.guru/getting-started-with-postcrafter/"
                    message: "Post published successfully!"
        '400':
          description: Bad request - validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
              examples:
                validation_error:
                  summary: Validation error
                  value:
                    success: false
                    error: "Invalid post data: Title is required and must be between 1 and 200 characters"
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
      summary: Health check endpoint
      description: Returns the health status of the API
      operationId: healthCheck
      tags:
        - System
      responses:
        '200':
          description: API is healthy
          content:
            application/json:
              schema:
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

components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
      description: |
        API key for authentication. Include this header with all requests.
        
        Example: \`X-API-Key: your-api-key-here\`
        
        Rate limits and features are determined by your API key tier.

  schemas:
    PostPublishRequest:
      type: object
      required:
        - title
        - content
      properties:
        title:
          type: string
          minLength: 1
          maxLength: 200
          description: Post title (required)
          example: "Getting Started with PostCrafter"
        content:
          type: string
          minLength: 1
          maxLength: 50000
          description: Post content in HTML format (required)
          example: "<h2>Introduction</h2><p>PostCrafter is an AI-powered tool...</p>"
        excerpt:
          type: string
          maxLength: 500
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
          format: uri
          description: Image URL to download and upload
          example: "https://example.com/image.jpg"
        base64:
          type: string
          description: Base64 encoded image data (alternative to URL)
          example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
        alt_text:
          type: string
          maxLength: 500
          description: Alt text for accessibility
          example: "AI Content Creation"
        title:
          type: string
          maxLength: 200
          description: Image title
          example: "AI Content Creation Process"
        caption:
          type: string
          maxLength: 1000
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
          maxLength: 60
          description: SEO meta title
          example: "Getting Started with PostCrafter | PostCrafter"
        meta_description:
          type: string
          maxLength: 160
          description: SEO meta description
          example: "Learn how to use PostCrafter to create and publish AI-generated content with SEO optimization."
        focus_keyword:
          type: string
          maxLength: 100
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
          maxLength: 60
          description: Open Graph title
          example: "Getting Started with PostCrafter"
        og_description:
          type: string
          maxLength: 160
          description: Open Graph description
          example: "Learn how to use PostCrafter for AI content creation"
        og_image:
          type: string
          format: uri
          description: Open Graph image URL
          example: "https://example.com/og-image.jpg"
        twitter_title:
          type: string
          maxLength: 60
          description: Twitter Card title
          example: "Getting Started with PostCrafter"
        twitter_description:
          type: string
          maxLength: 160
          description: Twitter Card description
          example: "Learn how to use PostCrafter for AI content creation"
        twitter_image:
          type: string
          format: uri
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
          format: uri
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

tags:
  - name: Posts
    description: Post publishing operations
  - name: System
    description: System health and status endpoints`;

  res.setHeader('Content-Type', 'application/yaml');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  res.status(200).send(openApiSpec);
} 
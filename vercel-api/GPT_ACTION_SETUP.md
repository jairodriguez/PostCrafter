# PostCrafter GPT Action Setup Guide

This guide explains how to configure the PostCrafter GPT Action in ChatGPT to enable AI-powered content publishing directly to WordPress.

## Overview

The PostCrafter GPT Action allows ChatGPT to publish AI-generated, SEO-optimized articles directly to WordPress with:
- Comprehensive media uploads (URL and base64)
- Yoast SEO meta field management
- Category and tag management
- Featured image assignment
- Automatic SEO optimization

## Prerequisites

1. **WordPress Site**: A WordPress site with the PostCrafter plugin installed
2. **API Key**: A valid PostCrafter API key
3. **ChatGPT Plus**: ChatGPT Plus subscription (required for GPT Actions)

## Step 1: Configure the GPT Action

### 1.1 Access GPT Actions
1. Open ChatGPT
2. Click on your profile picture in the bottom left
3. Select "Settings & Beta"
4. Click on "Beta features"
5. Enable "GPT Actions" if not already enabled

### 1.2 Add the Action
1. In ChatGPT, click the "+" button to start a new conversation
2. Click on "GPTs" in the left sidebar
3. Click "Create a GPT"
4. In the GPT builder, click "Actions" in the left sidebar
5. Click "Add actions"
6. Select "Import from URL" or "Import from file"

### 1.3 Import the OpenAPI Specification
- **Option A - URL Import**: Use the URL to your OpenAPI spec
- **Option B - File Import**: Upload the `gpt-action-config.json` file

## Step 2: Configure Authentication

### 2.1 Add API Key
1. In the Actions configuration, you'll see a "Schema" section
2. Look for the "ApiKeyAuth" security scheme
3. Add your PostCrafter API key in the authentication field
4. The key will be automatically included in the `X-API-Key` header

### 2.2 Test Authentication
1. Save the GPT configuration
2. Test the action with a simple request to verify authentication works

## Step 3: Usage Examples

### 3.1 Basic Post Publishing
```
Publish a post with the title "Getting Started with AI Content Creation" and content about how AI is revolutionizing content creation. Include SEO optimization and publish it as a draft first.
```

### 3.2 Advanced Post with Media
```
Create a comprehensive guide about WordPress SEO optimization. Include:
- Title: "Complete WordPress SEO Guide 2024"
- Content with proper HTML formatting
- Categories: "WordPress", "SEO", "Digital Marketing"
- Tags: "wordpress-seo", "optimization", "ranking"
- A featured image from a relevant URL
- Yoast SEO meta title and description
- Focus keyword: "WordPress SEO"
Publish this as a draft for review.
```

### 3.3 SEO-Optimized Post
```
Write an SEO-optimized blog post about "AI Content Creation Tools" with:
- Meta title: "Best AI Content Creation Tools 2024 | Complete Guide"
- Meta description: "Discover the top AI content creation tools for 2024. Compare features, pricing, and find the perfect tool for your content strategy."
- Focus keyword: "AI content creation tools"
- Categories: "Technology", "AI", "Content Marketing"
- Include 2-3 relevant images with proper alt text
- Optimize for featured snippets
Publish as a draft.
```

## Step 4: Best Practices

### 4.1 Content Guidelines
- **Title Length**: Keep titles between 50-60 characters for optimal SEO
- **Meta Descriptions**: Aim for 150-160 characters
- **Content Structure**: Use proper HTML headings (H1, H2, H3)
- **Images**: Always include alt text for accessibility and SEO

### 4.2 SEO Optimization
- **Focus Keywords**: Choose one primary keyword per post
- **Meta Titles**: Include the focus keyword near the beginning
- **Meta Descriptions**: Make them compelling and include the keyword
- **Content Length**: Aim for at least 1,500 words for comprehensive posts

### 4.3 Media Management
- **Featured Images**: Use high-quality, relevant images
- **Alt Text**: Descriptive alt text for all images
- **Image Optimization**: Use compressed images for faster loading
- **Captions**: Add informative captions when relevant

## Step 5: Error Handling

### 5.1 Common Errors
- **401 Unauthorized**: Check your API key is correct
- **400 Bad Request**: Validate your request data
- **429 Rate Limited**: Wait before making more requests
- **500 Server Error**: Contact support if persistent

### 5.2 Troubleshooting
1. **Authentication Issues**: Verify API key is valid and active
2. **Validation Errors**: Check required fields and data formats
3. **WordPress Issues**: Ensure WordPress site is accessible
4. **Media Upload Failures**: Verify image URLs are accessible

## Step 6: Advanced Configuration

### 6.1 Custom Instructions
Add these instructions to your GPT for better results:

```
You are a content creation assistant that publishes posts to WordPress using the PostCrafter API. 

When creating posts:
1. Always include SEO-optimized meta titles and descriptions
2. Use proper HTML formatting with headings and paragraphs
3. Include relevant categories and tags
4. Add alt text for all images
5. Optimize content for search engines
6. Use the focus keyword naturally throughout the content
7. Create compelling, informative content that provides value

When publishing:
1. Start with draft status for review
2. Include comprehensive Yoast SEO fields
3. Add relevant images with proper metadata
4. Use descriptive file names and alt text
5. Include social media meta tags when relevant
```

### 6.2 Workflow Integration
1. **Content Planning**: Use ChatGPT to plan content strategy
2. **Draft Creation**: Create initial drafts with ChatGPT
3. **SEO Optimization**: Optimize for search engines
4. **Review Process**: Publish as drafts for human review
5. **Final Publishing**: Publish approved content

## Step 7: Monitoring and Analytics

### 7.1 Track Performance
- Monitor post performance in WordPress analytics
- Track SEO rankings for published content
- Analyze engagement metrics
- Review conversion rates

### 7.2 Quality Assurance
- Review all AI-generated content before publishing
- Verify SEO optimization is working correctly
- Check media uploads and formatting
- Ensure proper categorization and tagging

## Support and Resources

### Documentation
- [PostCrafter API Documentation](https://docs.postcrafter.com)
- [WordPress REST API Reference](https://developer.wordpress.org/rest-api/)
- [Yoast SEO Documentation](https://yoast.com/help/)

### Contact Information
- **Email**: support@postcrafter.com
- **Documentation**: https://docs.postcrafter.com
- **GitHub**: https://github.com/postcrafter/postcrafter

### Troubleshooting
If you encounter issues:
1. Check the API status at `/api/health`
2. Verify your WordPress site is accessible
3. Ensure all required plugins are installed
4. Contact support with error details

## Security Considerations

### API Key Management
- Keep your API key secure and private
- Rotate keys regularly
- Monitor API usage for unusual activity
- Use environment variables in production

### Content Validation
- Review all AI-generated content before publishing
- Verify links and media are safe
- Check for inappropriate content
- Validate SEO optimization

### Rate Limiting
- Respect API rate limits
- Implement proper error handling
- Use exponential backoff for retries
- Monitor usage patterns

---

**Note**: This GPT Action is designed for content creators who want to leverage AI for WordPress content publishing while maintaining quality and SEO standards. Always review AI-generated content before publishing to ensure it meets your quality standards. 
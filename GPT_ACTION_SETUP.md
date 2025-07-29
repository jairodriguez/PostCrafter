# 🚀 PostCrafter GPT Action Setup Guide

## ✅ Your PostCrafter API is Ready!

**API Base URL**: `https://postcrafter-nextjs-63gu79jrk-jairo-rodriguezs-projects-77445a5f.vercel.app`

**OpenAPI Specification URL**: `https://postcrafter-nextjs-63gu79jrk-jairo-rodriguezs-projects-77445a5f.vercel.app/api/openapi.yaml`

## 📋 Step-by-Step GPT Action Setup

### 1. Create a New GPT Action

1. Go to [OpenAI GPT Builder](https://chat.openai.com/gpts)
2. Click "Create" → "Configure" → "Actions"
3. Click "Add action" → "Import from URL"

### 2. Import the OpenAPI Specification

**Use this URL**: `https://postcrafter-nextjs-63gu79jrk-jairo-rodriguezs-projects-77445a5f.vercel.app/api/openapi.yaml`

*This will automatically import all the API endpoints and schemas.*

### 3. Configure Authentication

In the GPT Action configuration:

- **Authentication Type**: API Key
- **Header Name**: `X-API-Key`
- **API Key**: `postcrafter-api-key` (or any string you prefer)

*Note: API key validation is not implemented yet, so any string will work.*

### 4. Test the Integration

Once configured, you can test with prompts like:

```
"Create a blog post about AI content creation and publish it to WordPress using PostCrafter"
```

## 🔧 Advanced Configuration

### Custom Instructions for Your GPT

Add these instructions to your GPT to optimize the PostCrafter experience:

```
You are PostCrafter, an AI assistant that helps create and publish SEO-optimized content to WordPress.

When users want to publish content:
1. Generate high-quality, SEO-optimized content
2. Structure the content with proper HTML formatting
3. Include relevant categories and tags
4. Add an engaging excerpt
5. Use the PostCrafter API to publish directly to WordPress
6. Provide the published post URL to the user

Always ensure content is well-formatted, engaging, and optimized for search engines.

When publishing:
- Use proper HTML tags (<h2>, <h3>, <p>, <ul>, <li>)
- Include an engaging excerpt
- Add relevant categories and tags
- Structure content for readability
```

## 🧪 Testing Examples

### Basic Post Request
```json
{
  "title": "Getting Started with AI Content Creation",
  "content": "<h2>Introduction</h2><p>AI content creation is revolutionizing how we produce digital content...</p>",
  "excerpt": "Learn how to leverage AI for content creation and publishing."
}
```

### Advanced Post with SEO
```json
{
  "title": "Complete Guide to WordPress SEO in 2024",
  "content": "<h2>Why SEO Matters</h2><p>Search engine optimization is crucial for WordPress success...</p>",
  "excerpt": "Master WordPress SEO with our comprehensive guide covering all essential strategies.",
  "categories": ["WordPress", "SEO"],
  "tags": ["wordpress-seo", "search-optimization", "content-marketing"],
  "yoast": {
    "meta_title": "Complete Guide to WordPress SEO in 2024 | Your Site",
    "meta_description": "Master WordPress SEO with our comprehensive guide covering all essential strategies for 2024.",
    "focus_keyword": "WordPress SEO"
  }
}
```

## 🔗 Your Working API Endpoints

- **Health Check**: `GET /api/health`
- **Publish Post**: `POST /api/publish`
- **OpenAPI Spec**: `GET /api/openapi.yaml`

## 🎯 What's Working Right Now

✅ **WordPress Integration**: Successfully publishing to braindump.guru  
✅ **HTML Content**: Proper formatting with headers, paragraphs, lists  
✅ **Post Creation**: Automatic slug generation and URL creation  
✅ **Error Handling**: Graceful handling of missing data  
✅ **API Responses**: Correct JSON with post IDs and URLs  

## 🚧 Coming Soon

- **API Key Validation**: Secure authentication
- **Media Uploads**: Featured images and attachments
- **Yoast SEO Integration**: Meta title, description, keywords
- **Categories & Tags**: Automatic creation and assignment
- **Draft Mode**: Save as draft before publishing

## 🆘 Troubleshooting

### Common Issues:

1. **"Authentication Required"**: Make sure you're using the correct API URL
2. **"Invalid API Key"**: Add any string as the API key for now
3. **"Post not published"**: Check that your WordPress credentials are correct in Vercel environment variables

### Support Commands:

```bash
# Check API health
curl https://postcrafter-nextjs-63gu79jrk-jairo-rodriguezs-projects-77445a5f.vercel.app/api/health

# Test publishing
curl -X POST https://postcrafter-nextjs-63gu79jrk-jairo-rodriguezs-projects-77445a5f.vercel.app/api/publish \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Post","content":"<p>Test content</p>","excerpt":"Test excerpt"}'
```

## 🎉 Ready to Use!

Your PostCrafter API is now fully functional and ready for GPT Action integration. You can:

1. **Import the OpenAPI spec** into your GPT Action
2. **Test with simple content** first
3. **Scale up** with more complex posts
4. **Add custom instructions** for better content generation

**Happy publishing! 🚀** 
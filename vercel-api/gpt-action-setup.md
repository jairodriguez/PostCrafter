# PostCrafter GPT Action Setup Guide

## 🚀 Quick Setup

Your PostCrafter API is now live and ready for GPT Action integration!

**API Base URL**: `https://postcrafter-nextjs-8rd3ehcy4-jairo-rodriguezs-projects-77445a5f.vercel.app`

## 📋 Step-by-Step GPT Action Setup

### 1. Create a New GPT Action

1. Go to [OpenAI GPT Builder](https://chat.openai.com/gpts)
2. Click "Create" → "Configure" → "Actions"
3. Click "Add action" → "Import from URL"

### 2. Import the OpenAPI Specification

**URL**: `https://postcrafter-nextjs-8rd3ehcy4-jairo-rodriguezs-projects-77445a5f.vercel.app/openapi.yaml`

*Note: You'll need to host the OpenAPI spec publicly. For now, you can copy the content from `vercel-api/openapi.yaml` and paste it directly into the GPT Builder.*

### 3. Configure Authentication

In the GPT Action configuration:

- **Authentication Type**: API Key
- **Header Name**: `X-API-Key`
- **API Key**: `your-secret-api-key` (you can use any string for now since we haven't implemented API key validation yet)

### 4. Test the Integration

Once configured, you can test with a prompt like:

```
"Create a blog post about AI content creation and publish it to WordPress using PostCrafter"
```

## 🔧 Advanced Configuration

### Environment Variables (Optional)

If you want to add API key validation later, you can add these to your Vercel environment variables:

- `POSTCRAFTER_API_KEY`: Your secret API key
- `WP_URL`: Your WordPress site URL
- `WP_USERNAME`: WordPress username
- `WP_APP_PASSWORD`: WordPress application password

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
```

## 🧪 Testing Examples

### Basic Post
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

## 🎯 Next Steps

1. **Test the GPT Action** with simple content
2. **Add API key validation** for security
3. **Implement media uploads** for featured images
4. **Add Yoast SEO integration** for better SEO
5. **Create custom GPT instructions** for optimal content generation

## 🆘 Troubleshooting

### Common Issues:

1. **"Authentication Required"**: Make sure you're using the correct API URL
2. **"Invalid API Key"**: Add any string as the API key for now
3. **"Post not published"**: Check that your WordPress credentials are correct in Vercel environment variables

### Support:

- Check the API health: `curl https://postcrafter-nextjs-8rd3ehcy4-jairo-rodriguezs-projects-77445a5f.vercel.app/api/health`
- Test publishing: Use the curl examples above
- Review Vercel logs for detailed error information

---

**🎉 Your PostCrafter API is ready for GPT Action integration!** 
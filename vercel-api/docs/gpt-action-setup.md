# PostCrafter GPT Action Setup Guide

This guide walks you through setting up PostCrafter as a GPT Action in ChatGPT, enabling you to publish AI-generated content directly to your WordPress site.

## Prerequisites

Before setting up the GPT Action, ensure you have:

1. **ChatGPT Plus or Team subscription** (GPT Actions require a paid subscription)
2. **PostCrafter API key** (get from your PostCrafter dashboard)
3. **WordPress site** with REST API enabled
4. **WordPress user account** with post creation permissions

## Step 1: Prepare Your API Key

1. **Generate API Key**:
   - Log into your PostCrafter dashboard
   - Navigate to Settings → API Keys
   - Click "Generate New Key"
   - Choose environment: `live` for production, `test` for development
   - Copy the generated key (format: `pc_sk_live_xxxxxxxxxxxxxx`)

2. **Test API Key** (Optional but recommended):
   ```bash
   curl -X GET https://your-domain.vercel.app/api/health \
     -H "x-api-key: pc_sk_live_your_key_here"
   ```

## Step 2: Create a New GPT

1. **Access GPT Builder**:
   - Go to [ChatGPT](https://chat.openai.com)
   - Click on your profile in the bottom left
   - Select "My GPTs"
   - Click "Create a GPT"

2. **Configure Basic Settings**:
   - **Name**: "PostCrafter"
   - **Description**: "Publish SEO-optimized articles directly to WordPress"
   - **Instructions**: Copy the system prompt from [gpt-action-config.json](./gpt-action-config.json)

3. **Set Conversation Starters**:
   ```
   - Write and publish a blog post about modern web development trends
   - Create an SEO-optimized article about WordPress security best practices  
   - Write a technical guide about API development and publish it as a draft
   - Generate a post with images about digital marketing strategies
   - Create a comprehensive tutorial about JavaScript frameworks
   ```

## Step 3: Add the PostCrafter Action

1. **Navigate to Actions**:
   - In the GPT configuration, scroll down to "Actions"
   - Click "Create new action"

2. **Import OpenAPI Schema**:
   - **Method 1 - Direct Import**:
     - In the schema field, paste the URL: `https://your-domain.vercel.app/api/openapi.yaml`
     - Click "Import from URL"
   
   - **Method 2 - Manual Schema**:
     - Copy the OpenAPI specification from [openapi.yaml](./openapi.yaml)
     - Paste it into the schema field

3. **Verify Schema Import**:
   - Ensure you see operations like:
     - `POST /publish` - publishPost
     - `GET /health` - healthCheck
   - Check that security schemes are properly imported

## Step 4: Configure Authentication

1. **Select Authentication Type**:
   - Click on "Authentication"
   - Select "API Key"

2. **Configure API Key Settings**:
   - **Auth Type**: Custom
   - **Custom Header Name**: `x-api-key`
   - **API Key**: Enter your PostCrafter API key (`pc_sk_live_xxxxxxxxxxxxxx`)

3. **Test Authentication**:
   - Click "Test" to verify the authentication works
   - You should see a successful connection to the API

## Step 5: Configure Privacy Settings

1. **Set Privacy Level**:
   - Choose "Only me" for testing
   - Change to "Anyone with a link" when ready to share
   - Use "Public" for maximum visibility (optional)

2. **Review Capabilities**:
   - Ensure "Actions" is enabled
   - Verify that web browsing and code interpreter are configured as needed

## Step 6: Test the GPT Action

1. **Basic Functionality Test**:
   ```
   Test Message: "Can you check if the PostCrafter API is working?"
   Expected: The GPT should call the health endpoint and report status
   ```

2. **Content Creation Test**:
   ```
   Test Message: "Write a short blog post about AI and save it as a draft"
   Expected: The GPT should create content and publish it to WordPress as a draft
   ```

3. **SEO Features Test**:
   ```
   Test Message: "Create an SEO-optimized post about web performance with proper meta tags"
   Expected: The GPT should include Yoast SEO fields and optimization
   ```

## Step 7: Advanced Configuration

### Custom Instructions

Add these instructions to optimize the GPT's behavior:

```
CONTENT CREATION GUIDELINES:
- Always ask for confirmation before publishing content
- Default to "draft" status unless user specifically requests immediate publishing
- Include proper SEO optimization (meta titles, descriptions, keywords)
- Use clear heading hierarchy (H1, H2, H3)
- Add relevant categories and tags
- Include alt text for all images
- Optimize content for readability and engagement

ERROR HANDLING:
- If API calls fail, explain the issue clearly
- Offer solutions for common problems
- Suggest retrying with different parameters if needed
- Provide helpful debugging information

SEO OPTIMIZATION:
- Research relevant keywords for the topic
- Create compelling meta titles under 60 characters
- Write meta descriptions under 160 characters
- Use focus keywords naturally throughout content
- Suggest internal linking opportunities
- Optimize for featured snippets when possible
```

### Conversation Flow

Configure the GPT to follow this typical interaction pattern:

1. **Content Request**: User asks for content creation
2. **Clarification**: GPT asks about topic, length, style, publishing preferences
3. **Content Generation**: GPT creates SEO-optimized content
4. **Review**: GPT presents content for user approval
5. **Publishing**: GPT publishes to WordPress with confirmation
6. **Follow-up**: GPT provides post URL and suggests next steps

## Troubleshooting Common Issues

### Authentication Problems

**Issue**: "Authentication failed" error
**Solutions**:
- Verify API key format: `pc_sk_live_` or `pc_sk_test_`
- Check that key is active in PostCrafter dashboard
- Ensure header name is exactly `x-api-key`
- Try regenerating the API key

### Schema Import Issues

**Issue**: OpenAPI schema fails to import
**Solutions**:
- Verify the URL is accessible: `https://your-domain.vercel.app/api/openapi.yaml`
- Check that your Vercel deployment is live
- Try manual schema copy-paste instead of URL import
- Validate schema using online OpenAPI validators

### Publishing Failures

**Issue**: Content creation works but publishing fails
**Solutions**:
- Verify WordPress REST API is enabled
- Check WordPress user permissions
- Confirm PostCrafter is connected to your WordPress site
- Test with smaller content first
- Check for content validation errors

### Rate Limiting

**Issue**: "Rate limit exceeded" errors
**Solutions**:
- Wait for rate limit reset (shown in error message)
- Reduce frequency of requests
- Batch multiple changes into single requests
- Consider upgrading to higher rate limit plan

## Security Best Practices

### API Key Management

1. **Environment Separation**:
   - Use `pc_sk_test_` keys for development/testing
   - Use `pc_sk_live_` keys only for production
   - Never mix environments

2. **Key Rotation**:
   - Rotate keys every 90 days
   - Generate new key before revoking old one
   - Test new key before updating GPT Action

3. **Access Control**:
   - Limit GPT Action sharing to trusted users
   - Monitor API usage in PostCrafter dashboard
   - Revoke keys immediately if compromised

### Content Security

1. **Content Review**:
   - Always review generated content before publishing
   - Use draft mode for content that needs approval
   - Set up content moderation workflows

2. **WordPress Security**:
   - Keep WordPress updated
   - Use strong user passwords
   - Enable two-factor authentication
   - Regular security audits

## Optimization Tips

### Performance

1. **Content Efficiency**:
   - Request specific content lengths
   - Use draft mode for iterative improvements
   - Batch category/tag creation

2. **API Usage**:
   - Combine multiple changes in single requests
   - Use health check sparingly
   - Monitor rate limit usage

### SEO Enhancement

1. **Keyword Strategy**:
   - Provide target keywords to the GPT
   - Ask for competitor analysis
   - Request semantic keyword inclusion

2. **Content Structure**:
   - Specify desired heading structure
   - Request specific content sections
   - Ask for internal linking suggestions

### User Experience

1. **Clear Communication**:
   - Be specific about content requirements
   - Provide context about target audience
   - Specify publishing preferences clearly

2. **Quality Control**:
   - Review generated content before publishing
   - Request revisions for better optimization
   - Use feedback to improve future content

## Example Workflows

### Blog Post Creation

```
User: "Write a comprehensive blog post about React hooks for beginner developers"

GPT Response:
"I'll create a beginner-friendly blog post about React hooks. Let me clarify a few details:

1. Target length: ~1500 words?
2. Should I include code examples?
3. Publishing status: Draft for review or publish immediately?
4. Any specific hooks to focus on?
5. Should I include images/diagrams?

Based on your preferences, I'll create SEO-optimized content with:
- Meta title: 'React Hooks Guide: Complete Tutorial for Beginners'
- Focus keyword: 'React hooks tutorial'
- Categories: ['Web Development', 'React']
- Tags: ['JavaScript', 'React', 'Hooks', 'Frontend']
"
```

### Technical Documentation

```
User: "Create technical documentation for our new API and publish it"

GPT Response:
"I'll create comprehensive API documentation. To ensure accuracy:

1. What's the API's main purpose?
2. Which endpoints should I document?
3. Are there specific authentication methods?
4. Should I include code examples in multiple languages?
5. Any specific formatting requirements?

I'll structure it with:
- Overview and getting started
- Authentication guide
- Endpoint documentation
- Code examples
- Error handling
- Rate limiting information

Publishing as draft first for technical review?"
```

## Support and Resources

### Documentation
- **Full API Documentation**: [https://docs.postcrafter.com/api](https://docs.postcrafter.com/api)
- **Authentication Guide**: [authentication.md](./authentication.md)
- **Schema Reference**: [schemas/README.md](./schemas/README.md)

### Support Channels
- **Email Support**: support@postcrafter.com
- **Community Forum**: [https://community.postcrafter.com](https://community.postcrafter.com)
- **GitHub Issues**: [https://github.com/postcrafter/api/issues](https://github.com/postcrafter/api/issues)

### Updates and Maintenance
- **Status Page**: [https://status.postcrafter.com](https://status.postcrafter.com)
- **Changelog**: [https://docs.postcrafter.com/changelog](https://docs.postcrafter.com/changelog)
- **Version Updates**: Monitor for OpenAPI schema updates

---

## Quick Setup Checklist

- [ ] ChatGPT Plus/Team subscription active
- [ ] PostCrafter API key generated
- [ ] WordPress site connected to PostCrafter
- [ ] GPT created with PostCrafter name and description
- [ ] OpenAPI schema imported successfully
- [ ] Authentication configured with API key
- [ ] Test API connection successful
- [ ] Basic content creation test passed
- [ ] Privacy settings configured
- [ ] Custom instructions added
- [ ] Conversation starters configured
- [ ] Error handling tested
- [ ] Security best practices implemented

**Congratulations!** Your PostCrafter GPT Action is ready to use. Start creating and publishing amazing content directly from ChatGPT to WordPress!
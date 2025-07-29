# 🚀 PostCrafter OpenAPI Setup Guide

## ✅ **Fixed OpenAPI Specification**

The OpenAPI specification has been corrected and is now valid for GPT Actions!

**Updated URL**: `https://postcrafter-nextjs-cggwzrark-jairo-rodriguezs-projects-77445a5f.vercel.app/api/openapi.yaml`

## 📋 **Step-by-Step Setup**

### 1. Create Your GPT Action

1. Go to [OpenAI GPT Builder](https://chat.openai.com/gpts)
2. Click "Create" → "Configure" → "Actions"
3. Click "Add action" → "Import from URL"

### 2. Import the Corrected OpenAPI Spec

**Use this exact URL**:
```
https://postcrafter-nextjs-cggwzrark-jairo-rodriguezs-projects-77445a5f.vercel.app/api/openapi.yaml
```

### 3. Configure Authentication

- **Authentication Type**: API Key
- **Header Name**: `X-API-Key`
- **API Key**: `postcrafter-api-key` (or any string)

### 4. Test the Integration

Try this prompt in your GPT:
```
"Create a blog post about AI content creation and publish it to WordPress using PostCrafter"
```

## 🔧 **What Was Fixed**

✅ **YAML Formatting**: Removed trailing commas and fixed syntax  
✅ **Server URL**: Updated to the correct production URL  
✅ **Schema References**: Fixed all component references  
✅ **Examples**: Cleaned up JSON examples  
✅ **Descriptions**: Removed problematic backticks  

## 🧪 **Test Your Setup**

### **Test the API Directly**
```bash
# Test health endpoint
curl https://postcrafter-nextjs-cggwzrark-jairo-rodriguezs-projects-77445a5f.vercel.app/api/health

# Test publishing
curl -X POST https://postcrafter-nextjs-cggwzrark-jairo-rodriguezs-projects-77445a5f.vercel.app/api/publish \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Post","content":"<p>Test content</p>","excerpt":"Test excerpt"}'
```

### **Test in GPT**
Once configured, try these prompts:

1. **Basic Post**: "Write a blog post about WordPress SEO"
2. **Detailed Post**: "Create a comprehensive guide about AI content creation with SEO optimization"
3. **Business Post**: "Write a company announcement about our new AI features"

## 🎯 **Expected Behavior**

When working correctly, your GPT should:

1. **Generate high-quality content** with proper HTML formatting
2. **Ask clarifying questions** about your content needs
3. **Use the PostCrafter API** to publish directly to WordPress
4. **Provide the published URL** after successful publishing
5. **Handle errors gracefully** if something goes wrong

## 🆘 **Troubleshooting**

### **If you still get parsing errors:**

1. **Check the URL**: Make sure you're using the exact URL above
2. **Clear cache**: Try refreshing the GPT Builder page
3. **Manual import**: Copy the OpenAPI spec content and paste it directly
4. **Check format**: Ensure you're importing as "URL" not "File"

### **If the API doesn't work:**

1. **Test the health endpoint** first
2. **Check your WordPress credentials** in Vercel environment variables
3. **Verify the API key** (any string should work for now)
4. **Check the published posts** on braindump.guru

## 🎉 **Success Indicators**

✅ **OpenAPI imports without errors**  
✅ **GPT can access the API endpoints**  
✅ **Content gets published to WordPress**  
✅ **You receive published post URLs**  
✅ **Posts appear on braindump.guru**  

## 📞 **Need Help?**

If you're still having issues:

1. **Test the API directly** using the curl commands above
2. **Check the health endpoint** to ensure the API is running
3. **Verify your WordPress setup** is working correctly
4. **Try a simple test post** first before complex content

---

**Your PostCrafter API is now ready for GPT Action integration! 🚀** 
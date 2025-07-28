#!/bin/bash

echo "🧪 Testing PostCrafter API with braindump.guru"
echo ""

# Get the new deployment URL
DEPLOY_URL="https://public-deploy-jk5fqi58l-jairo-rodriguezs-projects-77445a5f.vercel.app"

echo "📡 API Endpoint: $DEPLOY_URL/api/publish"
echo ""

# Test data
TEST_DATA='{
  "title": "Test Post from PostCrafter API",
  "content": "<p>This is a test post created by the PostCrafter API integration.</p><p>If you see this post in your WordPress admin, the integration is working perfectly!</p>",
  "excerpt": "A test post to verify PostCrafter integration with braindump.guru",
  "status": "draft",
  "categories": ["test"],
  "tags": ["postcrafter", "api", "test"]
}'

echo "📝 Test Post Data:"
echo "$TEST_DATA" | jq '.'
echo ""

echo "🔗 To test the API:"
echo "1. Go to your Vercel dashboard"
echo "2. Find the deployment: $DEPLOY_URL"
echo "3. Use the Functions tab to test the API"
echo ""
echo "Or use curl directly:"
echo "curl -X POST \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '$TEST_DATA' \\"
echo "  \"$DEPLOY_URL/api/publish\""
echo ""
echo "📋 After testing:"
echo "1. Check if the post was created at https://braindump.guru/wp-admin"
echo "2. If successful, the integration is working!"
echo "3. You can now use this API with ChatGPT/GPT Actions" 
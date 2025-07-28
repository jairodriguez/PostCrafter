#!/bin/bash

echo "🧪 Testing PostCrafter Integration with braindump.guru"
echo ""

# Get the deployment URL
DEPLOY_URL="https://public-deploy-paw9a6uvu-jairo-rodriguezs-projects-77445a5f.vercel.app"

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
echo "1. Go to: $DEPLOY_URL"
echo "2. Authenticate with Vercel"
echo "3. Navigate to: $DEPLOY_URL/api/publish"
echo "4. Send a POST request with the test data above"
echo ""
echo "📋 Expected Result:"
echo "- A new draft post should appear in https://braindump.guru/wp-admin"
echo "- The API should return a success response with post_id and post_url"
echo ""
echo "🎉 Once working, you can use this API with ChatGPT/GPT Actions!" 
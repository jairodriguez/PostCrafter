#!/bin/bash

echo "🧪 Testing PostCrafter API with Environment Variables"
echo ""

# Get the deployment URL
DEPLOY_URL="https://public-deploy-paw9a6uvu-jairo-rodriguezs-projects-77445a5f.vercel.app"

echo "📡 Testing API endpoint: $DEPLOY_URL/api/publish"
echo ""

# Test data
TEST_DATA='{
  "title": "Test Post from PostCrafter API",
  "content": "<p>This is a test post created by the PostCrafter API.</p><p>If you see this post in your WordPress admin, the integration is working!</p>",
  "excerpt": "A test post to verify PostCrafter integration",
  "status": "draft",
  "categories": ["test"],
  "tags": ["postcrafter", "test"]
}'

echo "📝 Sending test post..."
echo ""

# Send test request
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$TEST_DATA" \
  "$DEPLOY_URL/api/publish" | jq '.'

echo ""
echo "✅ Test complete!"
echo ""
echo "📋 Next steps:"
echo "1. Check if the post was created at https://braindump.guru/wp-admin"
echo "2. If successful, the integration is working!"
echo "3. You can now use this API with ChatGPT/GPT Actions" 
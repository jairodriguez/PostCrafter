#!/bin/bash

echo "🧪 Testing PostCrafter API with braindump.guru"
echo ""

# Get the latest deployment URL
DEPLOY_URL=$(vercel ls --json | jq -r '.deployments[0].url' 2>/dev/null || echo "https://minimal-deploy-l88bm644a-jairo-rodriguezs-projects-77445a5f.vercel.app")

echo "📡 Testing API endpoint: $DEPLOY_URL/api/publish-simple"
echo ""

# Test data
TEST_DATA='{
  "title": "Test Post from PostCrafter",
  "content": "<p>This is a test post created by the PostCrafter API.</p><p>If you see this post, the integration is working!</p>",
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
  "$DEPLOY_URL/api/publish-simple" | jq '.'

echo ""
echo "✅ Test complete!"
echo ""
echo "📋 Next steps:"
echo "1. Check if the post was created at https://braindump.guru/wp-admin"
echo "2. If successful, the integration is working!"
echo "3. You can now use this API with ChatGPT/GPT Actions" 
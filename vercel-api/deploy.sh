#!/bin/bash

echo "🚀 Deploying PostCrafter Vercel API..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the vercel-api directory"
    exit 1
fi

echo "📋 Current directory: $(pwd)"
echo "📦 Project name: postcrafter-vercel-api"

# Set environment variables for Vercel
echo "🔧 Setting up environment variables..."

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod --name postcrafter-vercel-api

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set up environment variables in Vercel dashboard"
echo "2. Configure WordPress URL to point to your Docker instance"
echo "3. Test the API endpoints"
echo ""
echo "🔗 Your API will be available at: https://postcrafter-vercel-api.vercel.app" 
#!/bin/bash

echo "🔧 Setting up PostCrafter environment variables for braindump.guru"
echo ""

# Set WordPress URL
echo "Setting WORDPRESS_URL..."
vercel env add WORDPRESS_URL production <<< "https://braindump.guru"

echo ""
echo "📋 Next steps:"
echo "1. You need to provide your WordPress username"
echo "2. You need to create an Application Password"
echo ""
echo "To create an Application Password:"
echo "1. Go to https://braindump.guru/wp-admin"
echo "2. Navigate to Users → Profile → Application Passwords"
echo "3. Create a new application password for 'PostCrafter'"
echo "4. Copy the generated password"
echo ""
echo "Then run these commands:"
echo "vercel env add WORDPRESS_USERNAME production"
echo "vercel env add WORDPRESS_APP_PASSWORD production"
echo ""
echo "After setting the environment variables, redeploy with:"
echo "vercel --prod --yes" 
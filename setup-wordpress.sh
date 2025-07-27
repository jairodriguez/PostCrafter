#!/bin/bash

echo "🚀 Setting up WordPress for PostCrafter testing..."

# Wait for WordPress to be ready
echo "⏳ Waiting for WordPress to be ready..."
until curl -s http://localhost:12345 > /dev/null; do
    echo "Waiting for WordPress..."
    sleep 5
done

echo "✅ WordPress is ready!"

# Get WordPress site URL
WP_URL="http://localhost:12345"

echo "🔧 Configuring WordPress..."

# Create wp-config.php if it doesn't exist (WordPress should handle this)
echo "📝 WordPress configuration ready"

echo "🔌 Installing and activating Yoast SEO plugin..."
# Install Yoast SEO plugin via WP-CLI
docker-compose exec -T wordpress wp plugin install wordpress-seo --activate --allow-root

echo "🔌 Installing and activating REST API extensions..."
# Copy our mu-plugin to the WordPress container
docker-compose exec -T wordpress mkdir -p /var/www/html/wp-content/mu-plugins
docker cp wp-content/mu-plugins/postcrafter-yoast-integration wordpress:/var/www/html/wp-content/mu-plugins/

echo "🔑 Creating application password for API access..."
# Create an application password for API access
docker-compose exec -T wordpress wp user create postcrafter postcrafter@example.com --role=administrator --user_pass=postcrafter123 --allow-root

# Generate application password (we'll need to do this manually or via WP-CLI)
echo "📋 Manual steps required:"
echo "1. Visit http://localhost:12345/wp-admin"
echo "2. Login with: postcrafter / postcrafter123"
echo "3. Go to Users > Profile > Application Passwords"
echo "4. Create a new application password named 'PostCrafter API'"
echo "5. Copy the generated password for use in your Vercel environment variables"

echo "🎉 WordPress setup complete!"
echo "📊 Access points:"
echo "   - WordPress: http://localhost:12345"
echo "   - WordPress Admin: http://localhost:12345/wp-admin"
echo "   - REST API: http://localhost:12345/wp-json/wp/v2/"

echo "🔧 Next steps:"
echo "1. Complete the application password setup above"
echo "2. Update your Vercel environment variables with the WordPress URL and credentials"
echo "3. Test the API endpoints" 
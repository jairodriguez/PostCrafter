#!/bin/bash

echo "🔧 Configuring WordPress..."

# Install WP-CLI in the container
echo "📦 Installing WP-CLI..."
docker-compose exec -T wordpress curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
docker-compose exec -T wordpress chmod +x wp-cli.phar
docker-compose exec -T wordpress mv wp-cli.phar /usr/local/bin/wp

# Test WP-CLI
echo "✅ Testing WP-CLI..."
docker-compose exec -T wordpress wp --version

# Set permalinks to pretty URLs
echo "🔗 Setting permalinks to pretty URLs..."
docker-compose exec -T wordpress wp rewrite structure '/%postname%/' --hard --allow-root

# Install and activate Yoast SEO plugin
echo "🔌 Installing Yoast SEO plugin..."
docker-compose exec -T wordpress wp plugin install wordpress-seo --activate --allow-root

# Install and activate REST API plugin if needed
echo "🔌 Installing REST API plugin..."
docker-compose exec -T wordpress wp plugin install rest-api --activate --allow-root

# Test REST API
echo "🧪 Testing REST API..."
REST_RESPONSE=$(curl -s http://localhost:12345/wp-json/wp/v2/)
if echo "$REST_RESPONSE" | grep -q "posts"; then
    echo "✅ REST API is working!"
else
    echo "❌ REST API not working yet. Let's try alternative URL..."
    REST_RESPONSE=$(curl -s http://localhost:12345/index.php?rest_route=/wp/v2/)
    if echo "$REST_RESPONSE" | grep -q "posts"; then
        echo "✅ REST API working with alternative URL!"
    else
        echo "❌ REST API still not working"
    fi
fi

echo "🎉 WordPress configuration complete!"
echo "📊 Access points:"
echo "   - WordPress: http://localhost:12345"
echo "   - WordPress Admin: http://localhost:12345/wp-admin"
echo "   - Login: postcrafter / postcrafter123"
echo "   - REST API: http://localhost:12345/wp-json/wp/v2/"
echo "   - Alternative REST API: http://localhost:12345/index.php?rest_route=/wp/v2/"

echo "🔧 Next steps:"
echo "1. Visit http://localhost:12345/wp-admin"
echo "2. Login with: postcrafter / postcrafter123"
echo "3. Go to Users > Profile > Application Passwords"
echo "4. Create a new application password named 'PostCrafter API'"
echo "5. Copy the generated password for use in your Vercel environment variables" 
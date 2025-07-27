#!/bin/bash

echo "🚀 Installing WordPress..."

# Step 1: Get the installation form to extract nonce
echo "📋 Getting installation form..."
INSTALL_PAGE=$(curl -s "http://localhost:12345/wp-admin/install.php?step=1")

# Extract the nonce from the form
NONCE=$(echo "$INSTALL_PAGE" | grep -o 'name="_wpnonce" value="[^"]*"' | sed 's/.*value="\([^"]*\)".*/\1/')

if [ -z "$NONCE" ]; then
    echo "❌ Could not extract nonce from installation form"
    echo "Trying alternative method..."
    NONCE=$(echo "$INSTALL_PAGE" | grep -o '_wpnonce" value="[^"]*"' | sed 's/.*value="\([^"]*\)".*/\1/')
fi

if [ -z "$NONCE" ]; then
    echo "❌ Still could not extract nonce. Let's try without nonce..."
    NONCE=""
fi

echo "✅ Nonce extracted: $NONCE"

# Step 2: Submit the installation form
echo "📝 Submitting installation form..."
INSTALL_RESPONSE=$(curl -s -X POST "http://localhost:12345/wp-admin/install.php?step=2" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "weblog_title=PostCrafter+Test+Site" \
    -d "user_name=postcrafter" \
    -d "admin_password=postcrafter123" \
    -d "admin_password2=postcrafter123" \
    -d "admin_email=postcrafter@example.com" \
    -d "Submit=Install+WordPress" \
    -d "_wpnonce=$NONCE" \
    -d "pw_weak=1")

# Check if installation was successful
if echo "$INSTALL_RESPONSE" | grep -q "WordPress has been installed"; then
    echo "✅ WordPress installation successful!"
elif echo "$INSTALL_RESPONSE" | grep -q "Success"; then
    echo "✅ WordPress installation successful!"
else
    echo "❌ WordPress installation failed"
    echo "Response preview:"
    echo "$INSTALL_RESPONSE" | head -20
    echo "..."
    exit 1
fi

echo "🎉 WordPress is now ready!"
echo "📊 Access points:"
echo "   - WordPress: http://localhost:12345"
echo "   - WordPress Admin: http://localhost:12345/wp-admin"
echo "   - Login: postcrafter / postcrafter123"
echo "   - REST API: http://localhost:12345/wp-json/wp/v2/"

echo "🔧 Next steps:"
echo "1. Visit http://localhost:12345/wp-admin"
echo "2. Login with: postcrafter / postcrafter123"
echo "3. Go to Users > Profile > Application Passwords"
echo "4. Create a new application password named 'PostCrafter API'"
echo "5. Copy the generated password for use in your Vercel environment variables" 
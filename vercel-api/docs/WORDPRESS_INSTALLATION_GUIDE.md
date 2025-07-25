# PostCrafter WordPress Plugin Installation Guide

This comprehensive guide walks you through installing and configuring the PostCrafter WordPress plugin, including the mu-plugin component and API key setup.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [System Requirements](#system-requirements)
3. [Installation Steps](#installation-steps)
4. [API Key Configuration](#api-key-configuration)
5. [Verification and Testing](#verification-and-testing)
6. [Troubleshooting](#troubleshooting)
7. [Next Steps](#next-steps)

## Prerequisites

Before installing PostCrafter, ensure you have:

- **WordPress 5.0+** installed and running
- **Yoast SEO plugin** (version 14.0+) or **RankMath SEO plugin** (version 1.0.50+)
- **Administrator access** to your WordPress site
- **File system access** (FTP, SSH, or file manager)
- **PHP 7.4+** with the following extensions:
  - `curl`
  - `json`
  - `mbstring`
  - `openssl`

## System Requirements

### Minimum Requirements
- **WordPress:** 5.0 or higher
- **PHP:** 7.4 or higher
- **MySQL:** 5.6 or higher
- **Memory Limit:** 256MB
- **Upload Limit:** 10MB

### Recommended Requirements
- **WordPress:** 6.0 or higher
- **PHP:** 8.0 or higher
- **MySQL:** 8.0 or higher
- **Memory Limit:** 512MB
- **Upload Limit:** 64MB

## Installation Steps

### Step 1: Download the Plugin

1. **Download the mu-plugin files** from the PostCrafter repository:
   ```bash
   # Clone the repository (if you have Git access)
   git clone https://github.com/your-org/postcrafter.git
   
   # Or download the ZIP file from the releases page
   ```

2. **Locate the mu-plugin directory**:
   ```
   postcrafter/wp-content/mu-plugins/postcrafter-yoast-integration/
   ```

### Step 2: Upload to WordPress

#### Method A: Using FTP/SFTP

1. **Connect to your WordPress server** using an FTP client (FileZilla, WinSCP, etc.)

2. **Navigate to your WordPress installation** and locate the `wp-content` directory

3. **Create the mu-plugins directory** (if it doesn't exist):
   ```
   wp-content/mu-plugins/
   ```

4. **Upload the plugin files**:
   - Upload the entire `postcrafter-yoast-integration` folder to `wp-content/mu-plugins/`
   - Ensure the final path is: `wp-content/mu-plugins/postcrafter-yoast-integration/`

#### Method B: Using File Manager (cPanel)

1. **Access your hosting control panel** (cPanel, Plesk, etc.)

2. **Open the File Manager** and navigate to your WordPress installation

3. **Navigate to `wp-content`** and create the `mu-plugins` directory if it doesn't exist

4. **Upload the plugin files**:
   - Extract the plugin ZIP file
   - Upload the `postcrafter-yoast-integration` folder to `wp-content/mu-plugins/`

#### Method C: Using SSH (Advanced)

1. **Connect to your server** via SSH:
   ```bash
   ssh username@your-server.com
   ```

2. **Navigate to your WordPress directory**:
   ```bash
   cd /path/to/your/wordpress/wp-content
   ```

3. **Create mu-plugins directory**:
   ```bash
   mkdir -p mu-plugins
   ```

4. **Copy the plugin files**:
   ```bash
   cp -r /path/to/postcrafter/wp-content/mu-plugins/postcrafter-yoast-integration/ mu-plugins/
   ```

### Step 3: Verify Installation

1. **Check the plugin directory structure**:
   ```
   wp-content/mu-plugins/postcrafter-yoast-integration/
   ├── postcrafter-yoast-integration.php
   ├── README.md
   ├── includes/
   │   ├── class-rest-api-handler.php
   │   ├── class-yoast-field-handler.php
   │   ├── class-rankmath-field-handler.php
   │   ├── class-validation-handler.php
   │   └── class-seo-plugin-detector.php
   ├── docs/
   └── tests/
   ```

2. **Verify file permissions**:
   ```bash
   # Set proper permissions
   chmod 755 wp-content/mu-plugins/postcrafter-yoast-integration/
   chmod 644 wp-content/mu-plugins/postcrafter-yoast-integration/*.php
   ```

## API Key Configuration

### Step 1: Generate WordPress API Key

1. **Access your WordPress admin panel** and navigate to **Users → Profile**

2. **Scroll down to "Application Passwords"** section

3. **Create a new application password**:
   - **Name:** `PostCrafter API`
   - **Description:** `API access for PostCrafter integration`
   - Click **"Add New Application Password"**

4. **Copy the generated password** (it will only be shown once):
   ```
   Example: abcd 1234 efgh 5678 ijkl 9012 mnop 3456
   ```

### Step 2: Configure WordPress Settings

1. **Navigate to Settings → General** in your WordPress admin

2. **Note your WordPress URL** (Site URL):
   ```
   https://your-wordpress-site.com
   ```

3. **Ensure REST API is enabled**:
   - Test by visiting: `https://your-wordpress-site.com/wp-json/`
   - You should see a JSON response

### Step 3: Test API Access

1. **Test the REST API endpoint**:
   ```bash
   curl -X GET "https://your-wordpress-site.com/wp-json/wp/v2/posts" \
     -H "Authorization: Basic $(echo -n 'your-username:your-app-password' | base64)"
   ```

2. **Test the PostCrafter endpoint**:
   ```bash
   curl -X GET "https://your-wordpress-site.com/wp-json/postcrafter/v1/status" \
     -H "Authorization: Basic $(echo -n 'your-username:your-app-password' | base64)"
   ```

## Verification and Testing

### Step 1: Run Plugin Tests

1. **Access the test suite** via browser:
   ```
   https://your-wordpress-site.com/wp-content/mu-plugins/postcrafter-yoast-integration/tests/run-all-tests.php
   ```

2. **Or run via WP-CLI** (if available):
   ```bash
   wp eval-file wp-content/mu-plugins/postcrafter-yoast-integration/tests/run-all-tests.php
   ```

### Step 2: Verify REST API Endpoints

1. **Test Yoast SEO fields endpoint**:
   ```bash
   curl -X GET "https://your-wordpress-site.com/wp-json/wp/v2/posts/1" \
     -H "Authorization: Basic $(echo -n 'your-username:your-app-password' | base64)"
   ```

2. **Check for Yoast fields in response**:
   ```json
   {
     "id": 1,
     "title": "Sample Post",
     "yoast_head_json": {
       "title": "SEO Title",
       "description": "SEO Description",
       "robots": {...}
     },
     "yoast_meta": {
       "focuskw": "focus keyword",
       "metadesc": "meta description"
     }
   }
   ```

### Step 3: Test SEO Plugin Detection

1. **Verify Yoast SEO detection**:
   ```bash
   curl -X GET "https://your-wordpress-site.com/wp-json/postcrafter/v1/seo-status"
   ```

2. **Expected response**:
   ```json
   {
     "seo_plugin": "yoast",
     "version": "21.0",
     "status": "active",
     "fields_available": ["title", "description", "focuskw", "robots"]
   }
   ```

## Troubleshooting

### Common Issues

#### Issue 1: Plugin Not Loading
**Symptoms:** REST API endpoints not available, no Yoast fields in responses

**Solutions:**
1. **Check file permissions**:
   ```bash
   ls -la wp-content/mu-plugins/postcrafter-yoast-integration/
   ```

2. **Verify PHP syntax**:
   ```bash
   php -l wp-content/mu-plugins/postcrafter-yoast-integration/postcrafter-yoast-integration.php
   ```

3. **Check WordPress debug log**:
   ```php
   // Add to wp-config.php
   define('WP_DEBUG', true);
   define('WP_DEBUG_LOG', true);
   ```

#### Issue 2: API Authentication Fails
**Symptoms:** 401 Unauthorized errors

**Solutions:**
1. **Verify application password**:
   - Generate a new application password
   - Ensure username is correct
   - Check for extra spaces in password

2. **Test basic authentication**:
   ```bash
   curl -u "username:app-password" "https://your-site.com/wp-json/wp/v2/posts"
   ```

#### Issue 3: Yoast Fields Not Available
**Symptoms:** Yoast SEO fields missing from REST API responses

**Solutions:**
1. **Verify Yoast SEO plugin is active**:
   - Check WordPress admin → Plugins
   - Ensure Yoast SEO is activated

2. **Check Yoast version compatibility**:
   - Yoast SEO 14.0+ required
   - Update if necessary

3. **Test REST API registration**:
   ```bash
   curl -X GET "https://your-site.com/wp-json/postcrafter/v1/test-yoast"
   ```

### Debug Mode

Enable debug mode for detailed error information:

1. **Add to wp-config.php**:
   ```php
   define('WP_DEBUG', true);
   define('WP_DEBUG_LOG', true);
   define('WP_DEBUG_DISPLAY', false);
   ```

2. **Check debug log**:
   ```bash
   tail -f wp-content/debug.log
   ```

## Next Steps

After successful installation:

1. **Configure Vercel deployment** - See [Vercel Deployment Guide](./VERCEL_DEPLOYMENT_GUIDE.md)
2. **Set up GPT Action** - See [GPT Action Setup Guide](./gpt-action-setup.md)
3. **Test complete workflow** - Create a test post via GPT Action
4. **Review security settings** - Ensure proper access controls

## Support

If you encounter issues:

1. **Check the troubleshooting section** above
2. **Review the plugin logs** in WordPress debug log
3. **Test with the provided test suite**
4. **Contact support** with detailed error information

## Security Notes

- **Keep application passwords secure** - Don't share or commit to version control
- **Use HTTPS** - Always use HTTPS for production sites
- **Regular updates** - Keep WordPress, plugins, and PostCrafter updated
- **Access control** - Limit API access to trusted applications only

---

**Need help?** Check our [Troubleshooting Guide](./TROUBLESHOOTING.md) or contact support. 
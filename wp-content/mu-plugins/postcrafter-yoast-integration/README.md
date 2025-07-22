# PostCrafter Yoast Integration

A WordPress mu-plugin that exposes Yoast SEO meta fields via WordPress REST API for PostCrafter integration.

## Overview

This plugin enables PostCrafter to publish SEO-optimized content directly from ChatGPT to WordPress by exposing Yoast SEO meta fields (meta title, meta description, focus keywords) via the WordPress REST API.

## Features

- **REST API Integration**: Exposes Yoast SEO fields via WordPress REST API
- **Field Validation**: Comprehensive validation for SEO field values
- **Security**: Proper sanitization and permission checks
- **Compatibility**: Works with Yoast SEO plugin versions 14.0+
- **Error Handling**: Graceful error handling and user feedback

## Installation

### Manual Installation

1. **Upload the plugin** to your WordPress `wp-content/mu-plugins/` directory:
   ```
   wp-content/mu-plugins/postcrafter-yoast-integration/
   ```

2. **Ensure Yoast SEO plugin** is installed and activated on your WordPress site

3. **Verify installation** by checking if the plugin loads without errors

### Requirements

- WordPress 5.0 or higher
- Yoast SEO plugin 14.0 or higher
- PHP 7.4 or higher

## Usage

### REST API Endpoints

The plugin exposes the following REST API endpoints:

#### Get Yoast Fields
```
GET /wp-json/postcrafter/v1/yoast-fields/{post_id}
```

#### Update Yoast Fields
```
POST /wp-json/postcrafter/v1/yoast-fields/{post_id}
```

**Request Body:**
```json
{
  "meta_title": "Your SEO Title",
  "meta_description": "Your SEO description",
  "focus_keywords": "keyword1, keyword2, keyword3"
}
```

### REST API Fields

The plugin adds the following fields to the WordPress posts REST API endpoint:

- `yoast_meta_title` - Yoast SEO meta title
- `yoast_meta_description` - Yoast SEO meta description  
- `yoast_focus_keywords` - Yoast SEO focus keywords

### Example Usage

#### Get Yoast fields for a post
```bash
curl -X GET \
  "https://your-site.com/wp-json/postcrafter/v1/yoast-fields/123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Update Yoast fields for a post
```bash
curl -X POST \
  "https://your-site.com/wp-json/postcrafter/v1/yoast-fields/123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "meta_title": "Optimized SEO Title",
    "meta_description": "This is an optimized meta description for better search engine visibility.",
    "focus_keywords": "seo, optimization, wordpress"
  }'
```

## Field Validation

The plugin includes comprehensive validation for Yoast SEO fields:

### Meta Title
- Maximum length: 60 characters
- Minimum length: 10 characters
- No HTML tags allowed

### Meta Description
- Maximum length: 160 characters
- Minimum length: 50 characters
- No HTML tags allowed

### Focus Keywords
- Maximum 5 keywords
- Each keyword: 2-50 characters
- Comma-separated format
- No HTML tags allowed

## Security

- **Authentication Required**: All endpoints require user authentication
- **Permission Checks**: Users must have edit permissions for posts
- **Input Sanitization**: All input is properly sanitized
- **Nonce Verification**: AJAX requests include nonce verification

## Troubleshooting

### Common Issues

1. **Plugin not loading**
   - Ensure the plugin is in the correct directory: `wp-content/mu-plugins/`
   - Check file permissions (should be readable by web server)
   - Verify PHP syntax by checking error logs

2. **Yoast SEO not detected**
   - Ensure Yoast SEO plugin is installed and activated
   - Check Yoast SEO version (requires 14.0+)
   - Verify Yoast SEO is working properly

3. **REST API endpoints not accessible**
   - Check user authentication and permissions
   - Verify REST API is enabled in WordPress
   - Check for conflicts with other plugins

4. **Validation errors**
   - Review field validation rules
   - Ensure input meets length and character requirements
   - Check for special characters in input

### Debug Mode

Enable WordPress debug mode to see detailed error messages:

```php
// In wp-config.php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

## Development

### File Structure

```
postcrafter-yoast-integration/
├── postcrafter-yoast-integration.php    # Main plugin file
├── includes/
│   ├── class-yoast-field-handler.php    # Yoast field operations
│   ├── class-rest-api-handler.php       # REST API integration
│   └── class-validation-handler.php     # Input validation
└── README.md                            # This file
```

### Hooks and Filters

The plugin provides several hooks for customization:

- `postcrafter_yoast_validation_errors` - Filter validation errors
- `postcrafter_yoast_field_save` - Action when fields are saved
- `postcrafter_yoast_field_get` - Filter when fields are retrieved

### Adding Custom Fields

To add support for additional Yoast fields, modify the `get_yoast_fields()` method in `class-yoast-field-handler.php`.

## Support

For support and questions:

1. Check the troubleshooting section above
2. Review WordPress and Yoast SEO documentation
3. Check plugin error logs
4. Verify REST API functionality

## Changelog

### Version 1.0.0
- Initial release
- REST API integration for Yoast SEO fields
- Comprehensive validation and sanitization
- Security features and permission checks

## License

This plugin is licensed under the GPL v2 or later.

## Credits

Developed for PostCrafter - AI-powered WordPress publishing from ChatGPT. 
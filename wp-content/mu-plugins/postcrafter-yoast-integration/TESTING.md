# Testing REST API Field Registration

This document explains how to test the REST API field registration for the PostCrafter Yoast Integration plugin.

## Overview

The plugin registers Yoast SEO fields with the WordPress REST API, allowing external applications (like PostCrafter) to read and write Yoast meta fields via API calls.

## Registered Fields

The following fields are registered with the WordPress posts endpoint:

- `yoast_meta_title` - Yoast SEO meta title
- `yoast_meta_description` - Yoast SEO meta description  
- `yoast_focus_keywords` - Yoast SEO focus keywords

## Testing Methods

### 1. Using WordPress REST API Explorer

1. Install a REST API testing tool like "REST API Test" plugin
2. Navigate to your WordPress admin panel
3. Go to Tools > REST API Test
4. Test the following endpoints:

**Get a post with Yoast fields:**
```
GET /wp/v2/posts/{post_id}?include_yoast_fields=true
```

**Update Yoast fields via custom endpoint:**
```
POST /postcrafter/v1/yoast-fields/{post_id}
Content-Type: application/json

{
  "meta_title": "Your SEO Title",
  "meta_description": "Your SEO description",
  "focus_keywords": "keyword1, keyword2, keyword3"
}
```

### 2. Using cURL

**Get Yoast fields:**
```bash
curl -X GET "https://your-site.com/wp-json/postcrafter/v1/yoast-fields/123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Update Yoast fields:**
```bash
curl -X POST "https://your-site.com/wp-json/postcrafter/v1/yoast-fields/123" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "meta_title": "New SEO Title",
    "meta_description": "New SEO description",
    "focus_keywords": "new, keywords, here"
  }'
```

### 3. Using WordPress CLI

Run the test file using WP-CLI:

```bash
wp eval-file wp-content/mu-plugins/postcrafter-yoast-integration/tests/test-rest-api.php
```

### 4. Using JavaScript/Fetch

```javascript
// Get Yoast fields
fetch('/wp-json/postcrafter/v1/yoast-fields/123', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(response => response.json())
.then(data => console.log(data));

// Update Yoast fields
fetch('/wp-json/postcrafter/v1/yoast-fields/123', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    meta_title: 'New Title',
    meta_description: 'New Description',
    focus_keywords: 'new, keywords'
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

## Expected Responses

### Successful GET Response
```json
{
  "meta_title": "Your SEO Title",
  "meta_description": "Your SEO description",
  "focus_keywords": "keyword1, keyword2, keyword3"
}
```

### Successful POST Response
```json
{
  "success": true,
  "message": "Yoast fields updated successfully",
  "data": {
    "meta_title": "Updated SEO Title",
    "meta_description": "Updated SEO description",
    "focus_keywords": "updated, keywords"
  }
}
```

### Error Response
```json
{
  "code": "validation_failed",
  "message": "Validation failed",
  "data": {
    "status": 400,
    "errors": ["Error details here"]
  }
}
```

## Troubleshooting

### Common Issues

1. **Fields not appearing in response**
   - Ensure the plugin is properly activated
   - Check that Yoast SEO plugin is installed and active
   - Verify user permissions (must be logged in with edit permissions)

2. **Authentication errors**
   - Ensure you're using a valid authentication token
   - Check that the user has appropriate permissions

3. **Validation errors**
   - Check field length limits (meta title: 60 chars, meta description: 160 chars)
   - Ensure focus keywords are properly formatted

### Debug Mode

Enable WordPress debug mode to see detailed error messages:

```php
// Add to wp-config.php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

Check the debug log at `wp-content/debug.log` for detailed error information.

## Security Considerations

- All endpoints require authentication
- Input is sanitized and validated
- User permissions are checked before allowing access
- Rate limiting should be implemented in production

## Performance Notes

- Field registration happens once during plugin initialization
- REST API calls are cached by WordPress when possible
- Consider implementing caching for frequently accessed fields 
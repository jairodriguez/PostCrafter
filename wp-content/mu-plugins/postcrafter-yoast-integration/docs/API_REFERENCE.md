# PostCrafter SEO Integration API Reference

Complete API reference for the PostCrafter SEO integration, covering both Yoast SEO and RankMath SEO support.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Universal Endpoints](#universal-endpoints)
4. [Plugin-Specific Endpoints](#plugin-specific-endpoints)
5. [Data Conversion Endpoints](#data-conversion-endpoints)
6. [Admin and Status Endpoints](#admin-and-status-endpoints)
7. [Field Reference](#field-reference)
8. [Error Handling](#error-handling)
9. [Rate Limiting](#rate-limiting)
10. [Examples](#examples)

## Overview

The PostCrafter SEO Integration provides a comprehensive REST API for managing SEO metadata across different SEO plugins. The API supports both universal endpoints that work with any detected plugin, and plugin-specific endpoints for advanced features.

### Base URL
```
https://your-wordpress-site.com/wp-json/postcrafter/v1/
```

### Supported Plugins
- **Yoast SEO** (v3.0+)
- **RankMath SEO** (v1.0.40+)

### API Versioning
Current API version: `v1`

## Authentication

### WordPress Authentication
All endpoints require appropriate WordPress authentication. Supported methods:

1. **Cookie Authentication** (for same-domain requests)
2. **Application Passwords** (WordPress 5.6+)
3. **JWT Tokens** (with JWT plugin)
4. **OAuth** (with OAuth plugin)

### Required Capabilities
Most endpoints require the `edit_posts` capability. Admin endpoints require `manage_options`.

### Example Authentication
```bash
# Using Application Password
curl -u "username:app_password" \
  https://yoursite.com/wp-json/postcrafter/v1/seo-status

# Using JWT Token
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://yoursite.com/wp-json/postcrafter/v1/seo-status
```

## Universal Endpoints

These endpoints work with any supported SEO plugin and provide a consistent interface.

### Get SEO Plugin Status

**Endpoint:** `GET /seo-status`

**Description:** Returns information about detected SEO plugins and current configuration.

**Parameters:** None

**Response:**
```json
{
  "success": true,
  "primary_plugin": "rankmath",
  "detected_plugins": {
    "rankmath": {
      "active": true,
      "supported": true,
      "version": "1.0.46",
      "supported_version": "1.0.40+"
    },
    "yoast": {
      "active": false,
      "supported": true,
      "version": null,
      "supported_version": "3.0+"
    }
  },
  "capabilities": {
    "field_mapping": true,
    "data_conversion": true,
    "migration_support": true,
    "universal_api": true
  },
  "settings": {
    "preferred_plugin": "rankmath",
    "auto_detection": true,
    "cache_enabled": true
  }
}
```

### Get Universal SEO Fields

**Endpoint:** `GET /seo-fields/{post_id}`

**Description:** Retrieves SEO fields for a post using universal field names, regardless of the active plugin.

**Parameters:**
- `post_id` (integer): WordPress post ID

**Query Parameters:**
- `fields` (string): Comma-separated list of fields to retrieve (optional)
- `include_plugin_specific` (boolean): Include plugin-specific fields (default: false)

**Response:**
```json
{
  "success": true,
  "post_id": 123,
  "plugin_detected": "rankmath",
  "fields": {
    "meta_title": "Your SEO-Optimized Title",
    "meta_description": "Compelling meta description that drives clicks...",
    "focus_keywords": "seo, optimization, content",
    "canonical_url": "https://example.com/your-post",
    "robots_noindex": false,
    "robots_nofollow": false,
    "opengraph_title": "Social Media Title",
    "opengraph_description": "Social media description...",
    "opengraph_image": "https://example.com/social-image.jpg",
    "twitter_title": "Twitter Title",
    "twitter_description": "Twitter description...",
    "twitter_image": "https://example.com/twitter-image.jpg"
  },
  "plugin_specific": {
    "rankmath": {
      "pillar_content": true,
      "breadcrumbs_title": "Custom Breadcrumb",
      "twitter_card_type": "summary_large_image",
      "schema_type": "Article"
    }
  },
  "meta": {
    "last_modified": "2024-01-15T10:30:00Z",
    "plugin_version": "1.0.46",
    "conversion_applied": false
  }
}
```

### Update Universal SEO Fields

**Endpoint:** `POST /seo-fields/{post_id}`

**Description:** Updates SEO fields for a post using universal field names.

**Parameters:**
- `post_id` (integer): WordPress post ID

**Request Body:**
```json
{
  "meta_title": "Updated SEO Title",
  "meta_description": "Updated meta description for better SEO performance",
  "focus_keywords": "updated, keywords, seo",
  "canonical_url": "https://example.com/updated-post",
  "robots_noindex": false,
  "robots_nofollow": false,
  "opengraph_title": "Updated Social Title",
  "opengraph_description": "Updated social description",
  "twitter_title": "Updated Twitter Title"
}
```

**Response:**
```json
{
  "success": true,
  "message": "SEO fields updated successfully",
  "post_id": 123,
  "plugin_used": "rankmath",
  "updated_fields": [
    "meta_title",
    "meta_description",
    "focus_keywords",
    "canonical_url",
    "opengraph_title",
    "opengraph_description",
    "twitter_title"
  ],
  "failed_fields": [],
  "warnings": [],
  "meta": {
    "cache_cleared": true,
    "conversion_applied": false,
    "update_timestamp": "2024-01-15T10:35:00Z"
  }
}
```

### Bulk SEO Fields Operation

**Endpoint:** `POST /seo-fields/bulk`

**Description:** Update SEO fields for multiple posts in a single request.

**Request Body:**
```json
{
  "posts": [
    {
      "post_id": 123,
      "fields": {
        "meta_title": "Bulk Title 1",
        "meta_description": "Bulk description 1"
      }
    },
    {
      "post_id": 124,
      "fields": {
        "meta_title": "Bulk Title 2",
        "meta_description": "Bulk description 2"
      }
    }
  ],
  "options": {
    "continue_on_error": true,
    "clear_cache": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk update completed",
  "results": [
    {
      "post_id": 123,
      "success": true,
      "updated_fields": ["meta_title", "meta_description"],
      "failed_fields": []
    },
    {
      "post_id": 124,
      "success": true,
      "updated_fields": ["meta_title", "meta_description"],
      "failed_fields": []
    }
  ],
  "summary": {
    "total_posts": 2,
    "successful_posts": 2,
    "failed_posts": 0,
    "total_fields_updated": 4
  }
}
```

## Plugin-Specific Endpoints

### RankMath Endpoints

#### Get RankMath Fields

**Endpoint:** `GET /rankmath-fields/{post_id}`

**Description:** Retrieves RankMath-specific fields with native field names.

**Response:**
```json
{
  "success": true,
  "post_id": 123,
  "fields": {
    "meta_title": "RankMath Title",
    "meta_description": "RankMath description",
    "focus_keywords": "rankmath, seo",
    "pillar_content": true,
    "breadcrumbs_title": "Custom Breadcrumb",
    "twitter_card_type": "summary_large_image",
    "schema_type": "Article",
    "advanced_robots": ["noimageindex"],
    "internal_links_processed": true
  }
}
```

#### Update RankMath Fields

**Endpoint:** `POST /rankmath-fields/{post_id}`

**Description:** Updates RankMath-specific fields using native field names.

**Request Body:**
```json
{
  "meta_title": "New RankMath Title",
  "pillar_content": true,
  "breadcrumbs_title": "New Breadcrumb",
  "twitter_card_type": "summary"
}
```

### Yoast Endpoints

#### Get Yoast Fields

**Endpoint:** `GET /yoast-fields/{post_id}`

**Description:** Retrieves Yoast-specific fields with native field names.

#### Update Yoast Fields

**Endpoint:** `POST /yoast-fields/{post_id}`

**Description:** Updates Yoast-specific fields using native field names.

## Data Conversion Endpoints

### Convert Between Plugins

**Endpoint:** `POST /convert/{post_id}`

**Description:** Converts SEO data between Yoast and RankMath formats.

**Request Body:**
```json
{
  "from_plugin": "yoast",
  "to_plugin": "rankmath",
  "fields": ["title", "description", "focus_keywords"],
  "options": {
    "preserve_original": true,
    "validate_conversion": true,
    "clear_cache": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Conversion completed successfully",
  "post_id": 123,
  "conversion": {
    "from_plugin": "yoast",
    "to_plugin": "rankmath",
    "converted_fields": [
      {
        "field": "title",
        "from_value": "Yoast Title",
        "to_value": "Yoast Title",
        "conversion_type": "direct"
      },
      {
        "field": "robots_noindex",
        "from_value": "1",
        "to_value": ["noindex"],
        "conversion_type": "format_change"
      }
    ],
    "failed_conversions": [],
    "plugin_specific_preserved": [
      "_yoast_wpseo_linkdex",
      "_yoast_wpseo_content_score"
    ]
  },
  "validation": {
    "is_valid": true,
    "errors": [],
    "warnings": ["Some Yoast-specific fields will not be available in RankMath"]
  },
  "meta": {
    "conversion_id": "conv_123_1642248000",
    "timestamp": "2024-01-15T10:40:00Z"
  }
}
```

### Get Normalized Data

**Endpoint:** `GET /normalized-data/{post_id}`

**Description:** Returns SEO data in a normalized format, regardless of the source plugin.

**Response:**
```json
{
  "success": true,
  "post_id": 123,
  "plugin_detected": "rankmath",
  "normalized_data": {
    "meta_title": "Normalized Title",
    "meta_description": "Normalized description",
    "focus_keywords": "keywords",
    "canonical_url": "https://example.com/post",
    "robots_noindex": false,
    "robots_nofollow": false,
    "social_media": {
      "opengraph": {
        "title": "OG Title",
        "description": "OG Description",
        "image": "https://example.com/og-image.jpg"
      },
      "twitter": {
        "title": "Twitter Title",
        "description": "Twitter Description",
        "image": "https://example.com/twitter-image.jpg",
        "card_type": "summary_large_image"
      }
    }
  },
  "plugin_specific": {
    "fields": {
      "pillar_content": true,
      "schema_type": "Article"
    },
    "non_mappable": [
      "rank_math_internal_links_processed"
    ]
  }
}
```

### Migration Report

**Endpoint:** `GET /migration-report/{post_id}`

**Description:** Generates a detailed report for migrating between plugins.

**Query Parameters:**
- `from_plugin` (string): Source plugin (yoast|rankmath)
- `to_plugin` (string): Target plugin (yoast|rankmath)

**Response:**
```json
{
  "success": true,
  "post_id": 123,
  "migration_report": {
    "from_plugin": "yoast",
    "to_plugin": "rankmath",
    "analysis": {
      "mappable_fields": [
        {
          "field": "title",
          "from_key": "_yoast_wpseo_title",
          "to_key": "rank_math_title",
          "conversion_type": "direct",
          "data_loss_risk": "none"
        },
        {
          "field": "robots_noindex",
          "from_key": "_yoast_wpseo_meta-robots-noindex",
          "to_key": "rank_math_robots",
          "conversion_type": "format_change",
          "data_loss_risk": "low"
        }
      ],
      "plugin_specific_fields": {
        "yoast_only": [
          {
            "field": "SEO Score",
            "key": "_yoast_wpseo_linkdex",
            "action": "preserve"
          },
          {
            "field": "Content Score",
            "key": "_yoast_wpseo_content_score",
            "action": "preserve"
          }
        ],
        "rankmath_only": [
          {
            "field": "Pillar Content",
            "key": "rank_math_pillar_content",
            "action": "available_after_migration"
          }
        ]
      },
      "potential_data_loss": [
        {
          "field": "Keyword Synonyms",
          "reason": "Not supported in RankMath",
          "recommendation": "Document manually before migration"
        }
      ]
    },
    "recommendations": [
      "Backup SEO data before migration",
      "Review Yoast-specific settings that won't transfer",
      "Test migration on staging environment first"
    ],
    "estimated_completion_time": "2-3 minutes",
    "compatibility_score": 85
  }
}
```

## Admin and Status Endpoints

### Plugin Configuration

**Endpoint:** `GET /config`

**Description:** Returns current plugin configuration and settings.

**Response:**
```json
{
  "success": true,
  "configuration": {
    "version": "1.1.0",
    "primary_plugin": "rankmath",
    "detected_plugins": ["rankmath"],
    "features": {
      "universal_api": true,
      "data_conversion": true,
      "migration_support": true,
      "bulk_operations": true,
      "caching": true
    },
    "settings": {
      "cache_duration": 300,
      "batch_size": 10,
      "auto_clear_cache": true,
      "conversion_validation": true
    },
    "limits": {
      "bulk_posts_per_request": 50,
      "api_rate_limit": 100,
      "max_execution_time": 30
    }
  }
}
```

### Update Configuration

**Endpoint:** `POST /config`

**Description:** Updates plugin configuration (requires `manage_options` capability).

**Request Body:**
```json
{
  "primary_plugin": "rankmath",
  "settings": {
    "cache_duration": 600,
    "batch_size": 20
  }
}
```

### Health Check

**Endpoint:** `GET /health`

**Description:** Performs comprehensive health check of the integration.

**Response:**
```json
{
  "success": true,
  "health_status": "healthy",
  "checks": {
    "plugin_detection": {
      "status": "pass",
      "message": "RankMath detected and supported"
    },
    "database_connectivity": {
      "status": "pass",
      "message": "Database accessible"
    },
    "rest_api": {
      "status": "pass",
      "message": "REST API functioning"
    },
    "cache_system": {
      "status": "pass",
      "message": "Cache system operational"
    },
    "permissions": {
      "status": "pass",
      "message": "Required capabilities available"
    }
  },
  "performance": {
    "average_response_time": "45ms",
    "cache_hit_rate": "78%",
    "memory_usage": "12MB"
  },
  "warnings": [],
  "recommendations": [
    "Consider enabling object caching for improved performance"
  ]
}
```

## Field Reference

### Universal Field Names

| Field Name | Type | Description | Yoast Key | RankMath Key |
|------------|------|-------------|-----------|--------------|
| `meta_title` | string | SEO page title | `_yoast_wpseo_title` | `rank_math_title` |
| `meta_description` | string | Meta description | `_yoast_wpseo_metadesc` | `rank_math_description` |
| `focus_keywords` | string | Primary focus keyword | `_yoast_wpseo_focuskw` | `rank_math_focus_keyword` |
| `canonical_url` | string | Canonical URL | `_yoast_wpseo_canonical` | `rank_math_canonical_url` |
| `robots_noindex` | boolean | Robots noindex | `_yoast_wpseo_meta-robots-noindex` | `rank_math_robots` |
| `robots_nofollow` | boolean | Robots nofollow | `_yoast_wpseo_meta-robots-nofollow` | `rank_math_robots` |
| `opengraph_title` | string | OpenGraph title | `_yoast_wpseo_opengraph-title` | `rank_math_facebook_title` |
| `opengraph_description` | string | OpenGraph description | `_yoast_wpseo_opengraph-description` | `rank_math_facebook_description` |
| `opengraph_image` | string | OpenGraph image URL | `_yoast_wpseo_opengraph-image` | `rank_math_facebook_image` |
| `twitter_title` | string | Twitter title | `_yoast_wpseo_twitter-title` | `rank_math_twitter_title` |
| `twitter_description` | string | Twitter description | `_yoast_wpseo_twitter-description` | `rank_math_twitter_description` |
| `twitter_image` | string | Twitter image URL | `_yoast_wpseo_twitter-image` | `rank_math_twitter_image` |

### RankMath-Specific Fields

| Field Name | Type | Description | Meta Key |
|------------|------|-------------|----------|
| `pillar_content` | boolean | Pillar content flag | `rank_math_pillar_content` |
| `breadcrumbs_title` | string | Custom breadcrumb title | `rank_math_breadcrumb_title` |
| `twitter_card_type` | string | Twitter card type | `rank_math_twitter_card_type` |
| `schema_type` | string | Schema markup type | `rank_math_rich_snippet` |
| `advanced_robots` | array | Advanced robots settings | `rank_math_advanced_robots` |

### Yoast-Specific Fields

| Field Name | Type | Description | Meta Key |
|------------|------|-------------|----------|
| `seo_score` | integer | Yoast SEO score | `_yoast_wpseo_linkdex` |
| `content_score` | integer | Content readability score | `_yoast_wpseo_content_score` |
| `keyword_synonyms` | string | Keyword synonyms | `_yoast_wpseo_keywordsynonyms` |

### Field Value Formats

#### Robots Meta
- **Yoast**: Boolean strings (`'1'` for true, `''` for false)
- **RankMath**: Array of strings (`['noindex', 'nofollow']`)
- **API**: Boolean values (`true`/`false`)

#### Images
- **Input**: URL string or attachment ID
- **Storage**: URL string (IDs converted to URLs)
- **Validation**: URL format and accessibility checked

#### Schema Types
Supported values: `Article`, `BlogPosting`, `Product`, `Review`, `Course`, `Recipe`, `Event`, `Person`, `Organization`

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "invalid_post_id",
    "message": "The specified post ID does not exist",
    "details": {
      "post_id": 999999,
      "attempted_action": "get_seo_fields"
    }
  },
  "debug": {
    "timestamp": "2024-01-15T10:45:00Z",
    "request_id": "req_123456789",
    "plugin_version": "1.1.0"
  }
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `invalid_post_id` | Post ID doesn't exist | 404 |
| `plugin_not_detected` | No supported SEO plugin found | 503 |
| `insufficient_permissions` | User lacks required capabilities | 403 |
| `invalid_field_name` | Unknown field name provided | 400 |
| `field_update_failed` | Database update failed | 500 |
| `conversion_failed` | Plugin conversion failed | 500 |
| `validation_failed` | Data validation failed | 422 |
| `rate_limit_exceeded` | Too many requests | 429 |

### Error Handling Best Practices

1. **Check Response Status**: Always check the `success` field
2. **Handle Specific Errors**: Use error codes for specific handling
3. **Implement Retry Logic**: For transient errors (500, 503)
4. **Log Errors**: Include request_id for debugging
5. **Graceful Degradation**: Provide fallbacks for non-critical features

## Rate Limiting

### Default Limits
- **Standard Users**: 100 requests per hour
- **Administrators**: 1000 requests per hour
- **Bulk Operations**: 10 posts per request

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

### Handling Rate Limits
When rate limited, the API returns HTTP 429 with:
```json
{
  "success": false,
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Try again later.",
    "details": {
      "limit": 100,
      "reset_time": "2024-01-15T11:00:00Z"
    }
  }
}
```

## Examples

### JavaScript/Node.js

```javascript
class PostCrafterSEO {
  constructor(baseUrl, auth) {
    this.baseUrl = baseUrl;
    this.auth = auth;
  }

  async getSEOFields(postId) {
    const response = await fetch(`${this.baseUrl}/seo-fields/${postId}`, {
      headers: {
        'Authorization': `Bearer ${this.auth.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }

  async updateSEOFields(postId, fields) {
    const response = await fetch(`${this.baseUrl}/seo-fields/${postId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.auth.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fields)
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error.message);
    }
    
    return result;
  }

  async convertPlugin(postId, fromPlugin, toPlugin) {
    const response = await fetch(`${this.baseUrl}/convert/${postId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.auth.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from_plugin: fromPlugin,
        to_plugin: toPlugin,
        options: {
          preserve_original: true,
          validate_conversion: true
        }
      })
    });
    
    return await response.json();
  }
}

// Usage
const seo = new PostCrafterSEO('https://example.com/wp-json/postcrafter/v1', {
  token: 'your-jwt-token'
});

// Get SEO fields
const fields = await seo.getSEOFields(123);
console.log('Current SEO fields:', fields);

// Update SEO fields
const updateResult = await seo.updateSEOFields(123, {
  meta_title: 'New SEO Title',
  meta_description: 'New meta description'
});
console.log('Update result:', updateResult);
```

### PHP

```php
class PostCrafterSEOClient {
    private $baseUrl;
    private $auth;
    
    public function __construct($baseUrl, $auth) {
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->auth = $auth;
    }
    
    public function getSEOFields($postId) {
        $url = $this->baseUrl . '/seo-fields/' . $postId;
        
        $response = wp_remote_get($url, array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $this->auth['token'],
                'Content-Type' => 'application/json'
            )
        ));
        
        if (is_wp_error($response)) {
            throw new Exception($response->get_error_message());
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (!$data['success']) {
            throw new Exception($data['error']['message']);
        }
        
        return $data;
    }
    
    public function updateSEOFields($postId, $fields) {
        $url = $this->baseUrl . '/seo-fields/' . $postId;
        
        $response = wp_remote_post($url, array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $this->auth['token'],
                'Content-Type' => 'application/json'
            ),
            'body' => json_encode($fields)
        ));
        
        if (is_wp_error($response)) {
            throw new Exception($response->get_error_message());
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (!$data['success']) {
            throw new Exception($data['error']['message']);
        }
        
        return $data;
    }
}

// Usage
$client = new PostCrafterSEOClient('https://example.com/wp-json/postcrafter/v1', array(
    'token' => 'your-jwt-token'
));

// Get SEO fields
$fields = $client->getSEOFields(123);
echo "Current SEO title: " . $fields['fields']['meta_title'];

// Update SEO fields
$result = $client->updateSEOFields(123, array(
    'meta_title' => 'Updated SEO Title',
    'meta_description' => 'Updated meta description'
));
echo "Updated fields: " . implode(', ', $result['updated_fields']);
```

### Python

```python
import requests
import json

class PostCrafterSEO:
    def __init__(self, base_url, auth_token):
        self.base_url = base_url.rstrip('/')
        self.auth_token = auth_token
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {auth_token}',
            'Content-Type': 'application/json'
        })
    
    def get_seo_fields(self, post_id):
        """Get SEO fields for a post"""
        url = f"{self.base_url}/seo-fields/{post_id}"
        response = self.session.get(url)
        response.raise_for_status()
        
        data = response.json()
        if not data['success']:
            raise Exception(data['error']['message'])
        
        return data
    
    def update_seo_fields(self, post_id, fields):
        """Update SEO fields for a post"""
        url = f"{self.base_url}/seo-fields/{post_id}"
        response = self.session.post(url, json=fields)
        response.raise_for_status()
        
        data = response.json()
        if not data['success']:
            raise Exception(data['error']['message'])
        
        return data
    
    def convert_plugin(self, post_id, from_plugin, to_plugin):
        """Convert SEO data between plugins"""
        url = f"{self.base_url}/convert/{post_id}"
        payload = {
            'from_plugin': from_plugin,
            'to_plugin': to_plugin,
            'options': {
                'preserve_original': True,
                'validate_conversion': True
            }
        }
        
        response = self.session.post(url, json=payload)
        response.raise_for_status()
        
        return response.json()

# Usage
seo = PostCrafterSEO('https://example.com/wp-json/postcrafter/v1', 'your-jwt-token')

# Get SEO fields
fields = seo.get_seo_fields(123)
print(f"Current title: {fields['fields']['meta_title']}")

# Update SEO fields
result = seo.update_seo_fields(123, {
    'meta_title': 'Python Updated Title',
    'meta_description': 'Updated via Python API client'
})
print(f"Update successful: {result['success']}")
```

This comprehensive API reference provides all the information needed to integrate with the PostCrafter SEO API, whether using Yoast SEO, RankMath SEO, or both plugins together.
# PostCrafter Yoast Integration - Compatibility Guide

This document provides comprehensive information about the compatibility features of the PostCrafter Yoast Integration plugin.

## Overview

The PostCrafter Yoast Integration plugin is designed to work with various versions of the Yoast SEO plugin, from legacy versions to the latest releases. It includes robust compatibility handling, fallback mechanisms, and comprehensive testing capabilities.

## Supported Yoast Versions

### Version Categories

The plugin categorizes Yoast SEO versions into three main groups:

1. **Legacy Versions** (pre-14.0)
   - Versions: 1.0 - 13.x
   - Support: Basic compatibility with fallback mechanisms
   - Features: Core meta field support

2. **Modern Versions** (14.0 - 19.x)
   - Versions: 14.0, 15.0, 16.0, 17.0, 18.0, 19.x
   - Support: Full compatibility with all features
   - Features: Complete meta field support, REST API integration

3. **New Versions** (20.0+)
   - Versions: 20.0, 21.0, 22.0+
   - Support: Full compatibility with enhanced features
   - Features: All modern features plus latest Yoast enhancements

### Recommended Versions

- **Minimum Recommended**: Yoast SEO 14.0+
- **Optimal Performance**: Yoast SEO 15.0+
- **Latest Features**: Yoast SEO 20.0+

## Compatibility Features

### 1. Automatic Version Detection

The plugin automatically detects the installed Yoast SEO version using multiple methods:

```php
$compatibility = new PostCrafter_Yoast_Compatibility();
$version = $compatibility->get_yoast_version();
```

**Detection Methods:**
- WordPress constant `WPSEO_VERSION`
- Plugin data from WordPress admin
- Yoast utility class methods
- Active plugin list verification

### 2. Meta Key Mapping

Different Yoast versions may use different meta key formats. The plugin automatically maps to the correct keys:

```php
$meta_key = $compatibility->get_meta_key('title', '15.0');
// Returns: '_yoast_wpseo_title'
```

**Supported Fields:**
- `title` - Meta title
- `description` - Meta description
- `focus_keywords` - Focus keywords
- `robots_noindex` - Robots noindex setting
- `robots_nofollow` - Robots nofollow setting
- `canonical` - Canonical URL
- `primary_category` - Primary category

### 3. Fallback Mechanisms

When Yoast SEO is not active, the plugin provides fallback functionality:

#### Fallback Meta Fields
- Creates standard meta fields even without Yoast
- Maps PostCrafter meta keys to WordPress standard keys
- Maintains data integrity across plugin states

#### Fallback Admin Interface
- Provides SEO meta boxes in WordPress admin
- Allows manual editing of SEO fields
- Maintains functionality when Yoast is inactive

### 4. Admin Notices

The plugin displays helpful admin notices for compatibility issues:

#### Yoast Not Active Notice
```
PostCrafter Yoast Integration: Yoast SEO plugin is not active. 
Some features may not work correctly. [Install Yoast SEO]
```

#### Version Compatibility Notice
```
PostCrafter Yoast Integration: Yoast SEO version X.X may not be fully compatible. 
Recommended version: 14.0 or higher. [Update Yoast SEO]
```

## Testing Compatibility

### Running Compatibility Tests

#### Via WP-CLI
```bash
wp eval-file wp-content/mu-plugins/postcrafter-yoast-integration/tests/test-compatibility.php
```

#### Via Web Interface
```
https://yoursite.com/wp-content/mu-plugins/postcrafter-yoast-integration/tests/test-compatibility.php?run_compatibility_tests=1
```

### Test Coverage

The compatibility test suite covers:

1. **Plugin Detection Tests**
   - Active plugin detection
   - Multisite compatibility
   - Class existence verification

2. **Version Detection Tests**
   - Version number extraction
   - Compatibility checking
   - Version comparison logic

3. **Meta Key Mapping Tests**
   - Field mapping for different versions
   - Key format validation
   - Fallback key resolution

4. **Fallback Functionality Tests**
   - Meta field creation
   - Data persistence
   - Admin interface functionality

5. **Admin Notice Tests**
   - Notice generation
   - Content validation
   - Display logic

## Configuration Options

### Compatibility Settings

The plugin provides several configuration options:

```php
// Check compatibility status
$status = $compatibility->get_compatibility_status();

// Force specific version compatibility
$meta_key = $compatibility->get_meta_key('title', '16.0');

// Check minimum version requirement
$is_compatible = $compatibility->is_version_compatible('14.0');
```

### Filter Hooks

Customize compatibility behavior using WordPress filters:

```php
// Modify compatibility check
add_filter('postcrafter_yoast_compatibility_check', function($status) {
    // Custom logic here
    return $status;
});
```

## Troubleshooting

### Common Issues

#### 1. Yoast Not Detected
**Problem**: Plugin reports Yoast as inactive when it's actually active.

**Solutions**:
- Check if Yoast is properly installed in `/wp-content/plugins/wordpress-seo/`
- Verify Yoast is activated in WordPress admin
- Check for multisite configuration issues

#### 2. Version Detection Fails
**Problem**: Plugin cannot determine Yoast version.

**Solutions**:
- Ensure Yoast plugin files are readable
- Check WordPress file permissions
- Verify Yoast plugin integrity

#### 3. Meta Keys Not Working
**Problem**: Custom meta fields are not being saved or retrieved.

**Solutions**:
- Check compatibility status
- Verify meta key mappings
- Test with fallback functionality

### Debug Information

Enable debug mode to get detailed compatibility information:

```php
// Add to wp-config.php for debugging
define('POSTCRAFTER_DEBUG', true);
```

Debug information includes:
- Detected Yoast version
- Meta key mappings
- Compatibility status
- Fallback activation status

## Migration Guide

### Upgrading from Legacy Versions

1. **Backup Data**: Always backup your WordPress database before upgrading
2. **Test Compatibility**: Run compatibility tests before upgrading
3. **Update Yoast**: Update to recommended version (14.0+)
4. **Verify Functionality**: Test all PostCrafter features after upgrade

### Handling Version Conflicts

If you encounter version conflicts:

1. **Check Compatibility Status**: Use the compatibility test suite
2. **Review Admin Notices**: Check for specific compatibility warnings
3. **Use Fallback Mode**: Temporarily use fallback functionality
4. **Contact Support**: If issues persist, check plugin documentation

## Performance Considerations

### Caching

The plugin includes intelligent caching for compatibility checks:

- Version detection is cached
- Meta key mappings are cached
- Compatibility status is cached

### Optimization Tips

1. **Use Compatible Versions**: Stick to recommended Yoast versions
2. **Minimize Fallback Usage**: Keep Yoast active for optimal performance
3. **Regular Testing**: Run compatibility tests after updates
4. **Monitor Performance**: Watch for any performance impacts

## Security Considerations

### Input Validation

All compatibility features include proper input validation:

- Version number sanitization
- Meta key validation
- File path verification
- Permission checking

### Data Integrity

The plugin ensures data integrity across different Yoast versions:

- Consistent meta field handling
- Proper data migration
- Fallback data preservation
- Error handling and recovery

## Support and Maintenance

### Regular Updates

The plugin is regularly updated to support new Yoast versions:

- Monitor Yoast SEO releases
- Test with new versions
- Update compatibility mappings
- Maintain backward compatibility

### Community Support

For additional support:

- Check plugin documentation
- Review compatibility test results
- Test with your specific setup
- Report issues with detailed information

## Conclusion

The PostCrafter Yoast Integration plugin provides comprehensive compatibility support for various Yoast SEO versions. With robust fallback mechanisms, automatic version detection, and extensive testing capabilities, it ensures reliable functionality across different WordPress and Yoast configurations.

For the best experience, maintain Yoast SEO at version 14.0 or higher and regularly run compatibility tests to ensure optimal performance. 
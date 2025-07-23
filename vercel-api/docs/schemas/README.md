# PostCrafter Schema Validation

This directory contains JSON Schema definitions and validation examples for the PostCrafter API.

## Files

- `post-data-schema.json` - Complete JSON Schema for post data validation
- `validation-examples.json` - Comprehensive test cases for schema validation
- `README.md` - This documentation file

## Post Data Schema

The `post-data-schema.json` file defines a comprehensive validation schema for post data input in the PostCrafter API. It ensures data integrity and provides clear validation rules for all post fields.

### Schema Features

#### Required Fields
- **title**: Post title (1-200 characters)
- **content**: Post content (1-50,000 characters)

#### Optional Fields
- **excerpt**: Post excerpt (max 500 characters)
- **status**: Publication status (`draft`, `publish`, `private`)
- **categories**: Array of category names (max 10, unique)
- **tags**: Array of tag names (max 20, unique)
- **featured_media**: WordPress media ID for featured image
- **yoast_meta**: SEO metadata object
- **images**: Array of image objects (max 10)

#### Yoast Meta Fields
- **meta_title**: SEO title (max 60 characters)
- **meta_description**: Meta description (max 160 characters)
- **focus_keywords**: Focus keywords (comma-separated, max 200 characters)
- **canonical**: Canonical URL (valid URI)
- **primary_category**: Primary category ID (positive integer)
- **meta_robots_noindex**: Robots noindex directive (`0`, `1`, or empty)
- **meta_robots_nofollow**: Robots nofollow directive (`0`, `1`, or empty)

#### Image Fields
- **url**: Image URL (alternative to base64)
- **base64**: Base64-encoded image data (alternative to URL)
- **alt_text**: Alternative text (max 255 characters)
- **caption**: Image caption (max 500 characters)
- **featured**: Whether image is featured (boolean)
- **filename**: Custom filename (max 255 characters, valid filename format)
- **mime_type**: MIME type (supported image formats only)

### Validation Rules

#### String Validation
- Length limits enforced for all text fields
- Pattern matching for specific formats (URLs, filenames)
- Whitespace validation to prevent empty content
- Unicode character support

#### Array Validation
- Maximum item limits for categories, tags, and images
- Unique item validation for categories and tags
- Individual item validation within arrays

#### Object Validation
- Required field validation
- Additional properties restrictions
- Nested object validation for complex fields

#### Image Validation
- Either URL or base64 data required (but not both)
- MIME type restrictions to supported image formats
- File size and format validation
- Filename pattern validation

## Validation Examples

The `validation-examples.json` file contains comprehensive test cases organized into three categories:

### Valid Examples (5 tests)
- **Minimal Valid Post**: Basic post with only required fields
- **Complete Blog Post**: Full-featured post with all optional fields
- **SEO-Optimized Article**: Article with comprehensive SEO metadata
- **Multiple Images Post**: Post with multiple images including featured image
- **Base64 Image Post**: Post with base64-encoded image data

### Invalid Examples (19 tests)
- Missing required fields
- Empty or whitespace-only content
- Length limit violations
- Invalid enum values
- Duplicate array items
- Invalid URLs and formats
- Unsupported MIME types
- Too many items in arrays

### Edge Cases (5 tests)
- Unicode characters support
- HTML content handling
- Markdown formatting
- Empty optional arrays
- Boundary length values

## Usage

### Validation Script

Run the validation test suite:

```bash
npm run validate:schema
```

This script:
1. Loads and compiles the JSON schema
2. Runs all test cases from validation examples
3. Checks schema compatibility with OpenAPI specification
4. Provides detailed test results and performance metrics

### In API Code

The schema can be used with validation libraries like AJV:

```javascript
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const addErrors = require('ajv-errors');
const schema = require('./docs/schemas/post-data-schema.json');

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
addErrors(ajv);

const validate = ajv.compile(schema);

// Validate post data
const isValid = validate(postData);
if (!isValid) {
  console.log('Validation errors:', validate.errors);
}
```

### Integration with Zod

The schema rules match the existing Zod validation in the API:

```javascript
// The JSON schema validation rules correspond to these Zod rules:
const postSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
  excerpt: z.string().max(500).optional(),
  status: z.enum(['draft', 'publish', 'private']).optional(),
  // ... additional fields
});
```

## Benefits

### For Development
- **Type Safety**: Clear validation rules prevent runtime errors
- **Documentation**: Self-documenting schema with examples
- **Testing**: Comprehensive test cases ensure reliability
- **Debugging**: Detailed error messages help identify issues

### For API Users
- **Predictability**: Clear expectations for data format
- **Error Prevention**: Client-side validation reduces API calls
- **Examples**: Real-world usage examples for integration
- **Standards Compliance**: JSON Schema standard for interoperability

### For GPT Actions
- **Clear Constraints**: GPT understands field limitations
- **Format Guidance**: Examples help generate proper requests
- **Error Handling**: Validation feedback improves request quality
- **Schema Documentation**: OpenAPI integration for automatic understanding

## Maintenance

### Updating the Schema
1. Modify `post-data-schema.json` with new validation rules
2. Add corresponding test cases to `validation-examples.json`
3. Run `npm run validate:schema` to ensure tests pass
4. Update OpenAPI specification to match schema changes
5. Update Zod validation in API code accordingly

### Adding Test Cases
1. Add new examples to appropriate category in `validation-examples.json`
2. Include expected validation result and error messages
3. Add descriptive notes explaining the test purpose
4. Run validation script to verify test behavior

### Schema Versioning
- Use semantic versioning for schema changes
- Document breaking changes in schema updates
- Maintain backward compatibility when possible
- Coordinate schema updates with API version releases
// Simple test for WordPress validation service
const { createWordPressValidationService } = require('./dist/utils/wordpress-validation');

async function testValidation() {
  try {
    console.log('Testing WordPress validation service...');
    
    const validationService = createWordPressValidationService();
    
    // Test valid post data
    const validPostData = {
      title: 'Valid Post Title',
      content: 'This is valid content for the post.',
      excerpt: 'Valid excerpt',
      status: 'draft',
      author: 1,
      slug: 'valid-post-slug'
    };
    
    console.log('\n1. Testing valid post data:');
    const validResult = validationService.validateAndSanitizePostData(validPostData);
    console.log('Valid:', validResult.valid);
    console.log('Errors:', validResult.errors);
    console.log('Warnings:', validResult.warnings);
    
    // Test invalid post data
    const invalidPostData = {
      title: '', // Empty title
      content: '<script>alert("xss")</script>', // Malicious content
      status: 'invalid-status',
      author: -1 // Invalid author ID
    };
    
    console.log('\n2. Testing invalid post data:');
    const invalidResult = validationService.validateAndSanitizePostData(invalidPostData);
    console.log('Valid:', invalidResult.valid);
    console.log('Errors:', invalidResult.errors);
    console.log('Warnings:', invalidResult.warnings);
    
    console.log('\n✅ WordPress validation service test completed!');
    
  } catch (error) {
    console.error('❌ Error testing validation service:', error.message);
  }
}

testValidation(); 
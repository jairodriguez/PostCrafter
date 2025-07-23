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
    console.log('Sanitized data:', validResult.sanitizedData);
    
    // Test invalid post data
    const invalidPostData = {
      title: '',
      content: 'Content without title'
    };
    
    console.log('\n2. Testing invalid post data:');
    const invalidResult = validationService.validateAndSanitizePostData(invalidPostData);
    console.log('Valid:', invalidResult.valid);
    console.log('Errors:', invalidResult.errors);
    console.log('Warnings:', invalidResult.warnings);
    
    // Test HTML sanitization
    const htmlPostData = {
      title: 'Post with HTML',
      content: '<p>This is <script>alert("xss")</script> content with <strong>HTML</strong>.</p>',
      excerpt: '<em>HTML excerpt</em>'
    };
    
    console.log('\n3. Testing HTML sanitization:');
    const htmlResult = validationService.validateAndSanitizePostData(htmlPostData);
    console.log('Valid:', htmlResult.valid);
    console.log('Sanitized content:', htmlResult.sanitizedData?.content);
    console.log('Sanitized excerpt:', htmlResult.sanitizedData?.excerpt);
    
    console.log('\n✅ Validation service test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testValidation(); 
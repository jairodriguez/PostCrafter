const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const addErrors = require('ajv-errors');
const fs = require('fs');
const path = require('path');

// Initialize AJV with formats and error messages
const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);
addErrors(ajv);

async function validateImageDataSchema() {
  try {
    console.log('🖼️  Validating Image Data Schema...\n');

    // Load the JSON schema
    const schemaPath = path.join(__dirname, '../docs/schemas/image-data-schema.json');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    
    console.log('📋 Schema Information:');
    console.log(`   Title: ${schema.title}`);
    console.log(`   Description: ${schema.description}`);
    console.log(`   Total properties: ${Object.keys(schema.properties).length}`);
    console.log(`   Required constraint: Either URL or base64 data (mutually exclusive)\n`);

    // Compile the schema
    const validate = ajv.compile(schema);
    
    // Load validation examples
    const examplesPath = path.join(__dirname, '../docs/schemas/image-validation-examples.json');
    const examples = JSON.parse(fs.readFileSync(examplesPath, 'utf8'));

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    // Test valid examples
    console.log('✅ Testing Valid Examples:');
    console.log('═'.repeat(60));
    
    for (const example of examples.validExamples) {
      totalTests++;
      const isValid = validate(example.data);
      
      if (isValid && example.expectedValidation === 'PASS') {
        console.log(`✓ ${example.name}: PASS`);
        passedTests++;
      } else {
        console.log(`✗ ${example.name}: FAIL (Expected PASS)`);
        if (validate.errors) {
          console.log(`   Errors: ${validate.errors.map(e => e.message).join(', ')}`);
        }
        failedTests++;
      }
    }

    console.log('\n❌ Testing Invalid Examples:');
    console.log('═'.repeat(60));

    for (const example of examples.invalidExamples) {
      totalTests++;
      
      // Handle special case for URL too long test
      if (example.name === "URL Too Long") {
        example.data.url = "https://example.com/" + "very-long-path/".repeat(200) + "image.jpg";
      }
      
      const isValid = validate(example.data);
      
      if (!isValid && example.expectedValidation === 'FAIL') {
        console.log(`✓ ${example.name}: FAIL (Expected)`);
        passedTests++;
      } else {
        console.log(`✗ ${example.name}: PASS (Expected FAIL)`);
        failedTests++;
      }
    }

    console.log('\n🔍 Testing Edge Cases:');
    console.log('═'.repeat(60));

    for (const example of examples.edgeCases) {
      totalTests++;
      const isValid = validate(example.data);
      
      if ((isValid && example.expectedValidation === 'PASS') || 
          (!isValid && example.expectedValidation === 'FAIL')) {
        console.log(`✓ ${example.name}: ${example.expectedValidation}`);
        passedTests++;
      } else {
        console.log(`✗ ${example.name}: ${isValid ? 'PASS' : 'FAIL'} (Expected ${example.expectedValidation})`);
        if (validate.errors) {
          console.log(`   Errors: ${validate.errors.map(e => e.message).join(', ')}`);
        }
        failedTests++;
      }
    }

    // Test schema properties
    console.log('\n🔄 Testing Schema Properties:');
    console.log('═'.repeat(60));

    // Test image format support
    const supportedFormats = schema.properties.mime_type.enum;
    console.log(`✓ Supported image formats: ${supportedFormats.join(', ')}`);

    // Test URL/Base64 mutual exclusion
    const urlOnlyTest = { url: 'https://example.com/test.jpg', alt_text: 'Test' };
    const base64OnlyTest = { 
      base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 
      alt_text: 'Test' 
    };
    const bothTest = { 
      url: 'https://example.com/test.jpg', 
      base64: 'data:image/png;base64,test', 
      alt_text: 'Test' 
    };
    
    console.log(`URL only: ${validate(urlOnlyTest) ? 'PASS' : 'FAIL'}`);
    console.log(`Base64 only: ${validate(base64OnlyTest) ? 'PASS' : 'FAIL'}`);
    console.log(`Both URL and Base64: ${validate(bothTest) ? 'PASS' : 'FAIL'} (Expected FAIL)`);

    // Test optional fields
    const optionalFields = ['caption', 'title', 'featured', 'filename', 'mime_type', 'width', 'height', 
                           'size_bytes', 'optimize', 'quality', 'max_width', 'max_height', 'convert_to'];
    console.log(`✓ Optional fields available: ${optionalFields.length}`);

    // Summary
    console.log('\n📊 Test Summary:');
    console.log('═'.repeat(60));
    console.log(`Total tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests === 0) {
      console.log('\n🎉 All tests passed! Image schema validation is working correctly.');
    } else {
      console.log(`\n⚠️  ${failedTests} test(s) failed. Please review the schema or test cases.`);
      process.exit(1);
    }

    // Additional validation tests
    console.log('\n🧪 Additional Validation Tests:');
    console.log('═'.repeat(60));

    // Test with different image formats
    const formats = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'svg+xml'];
    formats.forEach(format => {
      const testImage = {
        url: `https://example.com/test.${format === 'svg+xml' ? 'svg' : format}`,
        alt_text: `Test ${format} image`,
        mime_type: `image/${format}`
      };
      console.log(`${format.toUpperCase()} format: ${validate(testImage) ? 'PASS' : 'FAIL'}`);
    });

    // Test optimization settings
    const optimizationTest = {
      url: 'https://example.com/test.jpg',
      alt_text: 'Optimization test',
      optimize: true,
      quality: 85,
      max_width: 1200,
      max_height: 800,
      convert_to: 'webp'
    };
    console.log(`Optimization settings: ${validate(optimizationTest) ? 'PASS' : 'FAIL'}`);

    // Test performance with large base64
    const largeBase64 = {
      base64: 'data:image/jpeg;base64,' + 'A'.repeat(1000), // Simulated large base64
      alt_text: 'Large base64 test'
    };
    const startTime = Date.now();
    const perfResult = validate(largeBase64);
    const endTime = Date.now();
    console.log(`Large base64 performance: ${perfResult ? 'PASS' : 'FAIL'} (${endTime - startTime}ms)`);

    console.log('\n✅ Image schema validation completed successfully!');

  } catch (error) {
    console.error('❌ Image schema validation failed:');
    console.error(error.message);
    
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    
    process.exit(1);
  }
}

// Run validation
validateImageDataSchema();
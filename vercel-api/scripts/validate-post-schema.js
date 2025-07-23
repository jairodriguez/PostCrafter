const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const addErrors = require('ajv-errors');
const fs = require('fs');
const path = require('path');

// Initialize AJV with formats and error messages
const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);
addErrors(ajv);

async function validatePostDataSchema() {
  try {
    console.log('🔍 Validating Post Data Schema...\n');

    // Load the JSON schema
    const schemaPath = path.join(__dirname, '../docs/schemas/post-data-schema.json');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    
    console.log('📋 Schema Information:');
    console.log(`   Title: ${schema.title}`);
    console.log(`   Description: ${schema.description}`);
    console.log(`   Required fields: ${schema.required.join(', ')}`);
    console.log(`   Total properties: ${Object.keys(schema.properties).length}\n`);

    // Compile the schema
    const validate = ajv.compile(schema);
    
    // Load validation examples
    const examplesPath = path.join(__dirname, '../docs/schemas/validation-examples.json');
    const examples = JSON.parse(fs.readFileSync(examplesPath, 'utf8'));

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    // Test valid examples
    console.log('✅ Testing Valid Examples:');
    console.log('═'.repeat(50));
    
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
    console.log('═'.repeat(50));

    for (const example of examples.invalidExamples) {
      totalTests++;
      
      // Handle special case for content too long test
      if (example.name === "Content Too Long") {
        example.data.content = 'x'.repeat(50001); // Generate content exceeding 50,000 chars
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
    console.log('═'.repeat(50));

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

    // Test schema against OpenAPI specification
    console.log('\n🔄 Testing Schema Compatibility:');
    console.log('═'.repeat(50));

    // Test basic structure matches OpenAPI PostData schema
    const requiredFields = ['title', 'content'];
    const optionalFields = ['excerpt', 'status', 'categories', 'tags', 'featured_media', 'yoast_meta', 'images'];
    
    const schemaFields = Object.keys(schema.properties);
    const missingRequired = requiredFields.filter(field => !schemaFields.includes(field));
    const missingOptional = optionalFields.filter(field => !schemaFields.includes(field));
    
    if (missingRequired.length === 0) {
      console.log('✓ All required fields present in schema');
    } else {
      console.log(`✗ Missing required fields: ${missingRequired.join(', ')}`);
    }
    
    if (missingOptional.length === 0) {
      console.log('✓ All expected optional fields present in schema');
    } else {
      console.log(`! Missing optional fields: ${missingOptional.join(', ')}`);
    }

    // Summary
    console.log('\n📊 Test Summary:');
    console.log('═'.repeat(50));
    console.log(`Total tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests === 0) {
      console.log('\n🎉 All tests passed! Schema validation is working correctly.');
    } else {
      console.log(`\n⚠️  ${failedTests} test(s) failed. Please review the schema or test cases.`);
      process.exit(1);
    }

    // Additional validation tests
    console.log('\n🧪 Additional Validation Tests:');
    console.log('═'.repeat(50));

    // Test minimum valid object
    const minValid = { title: 'Test', content: 'Test content' };
    console.log(`Minimum valid object: ${validate(minValid) ? 'PASS' : 'FAIL'}`);

    // Test with all fields
    const maxValid = {
      title: 'Complete Post',
      content: 'Full content here',
      excerpt: 'Short excerpt',
      status: 'publish',
      categories: ['Category 1'],
      tags: ['Tag 1'],
      featured_media: 123,
      yoast_meta: {
        meta_title: 'SEO Title',
        meta_description: 'SEO description',
        focus_keywords: 'keyword1, keyword2'
      },
      images: [{
        url: 'https://example.com/image.jpg',
        alt_text: 'Alt text'
      }]
    };
    console.log(`Maximum valid object: ${validate(maxValid) ? 'PASS' : 'FAIL'}`);

    // Test performance with large content
    const performanceTest = {
      title: 'Performance Test',
      content: 'x'.repeat(10000) // 10KB content
    };
    const startTime = Date.now();
    const perfResult = validate(performanceTest);
    const endTime = Date.now();
    console.log(`Performance test (10KB): ${perfResult ? 'PASS' : 'FAIL'} (${endTime - startTime}ms)`);

    console.log('\n✅ Schema validation completed successfully!');

  } catch (error) {
    console.error('❌ Schema validation failed:');
    console.error(error.message);
    
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    
    process.exit(1);
  }
}

// Run validation
validatePostDataSchema();
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const addErrors = require('ajv-errors');
const fs = require('fs');
const path = require('path');

// Initialize AJV with formats and error messages
const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);
addErrors(ajv);

async function validateResponseSchema() {
  try {
    console.log('📊 Validating Response Schema...\n');

    // Load the JSON schema
    const schemaPath = path.join(__dirname, '../docs/schemas/response-schema.json');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    
    console.log('📋 Schema Information:');
    console.log(`   Title: ${schema.title}`);
    console.log(`   Description: ${schema.description}`);
    console.log(`   Response types: Success and Error responses with oneOf validation`);
    console.log(`   Success data fields: ${Object.keys(schema.definitions.ResponseData.properties).length}`);
    console.log(`   Error detail fields: ${Object.keys(schema.definitions.ErrorDetails.properties).length}`);
    console.log(`   Error codes: ${schema.definitions.ErrorDetails.properties.code.enum.length}\n`);

    // Compile the schema
    const validate = ajv.compile(schema);
    
    // Load validation examples
    const examplesPath = path.join(__dirname, '../docs/schemas/response-validation-examples.json');
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

    // Test response structure properties
    console.log('\n🔄 Testing Response Structure:');
    console.log('═'.repeat(60));

    // Test success response structure
    const successExample = {
      success: true,
      data: {
        post_id: 123,
        post_url: 'https://example.com/test/',
        post_title: 'Test Post',
        post_status: 'publish'
      }
    };
    console.log(`Success response structure: ${validate(successExample) ? 'PASS' : 'FAIL'}`);

    // Test error response structure
    const errorExample = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Test error'
      }
    };
    console.log(`Error response structure: ${validate(errorExample) ? 'PASS' : 'FAIL'}`);

    // Test oneOf validation (can't have both data and error)
    const invalidBothExample = {
      success: true,
      data: { post_id: 123, post_url: 'https://example.com/test/', post_title: 'Test', post_status: 'draft' },
      error: { code: 'VALIDATION_ERROR', message: 'Test' }
    };
    console.log(`Both data and error (invalid): ${validate(invalidBothExample) ? 'PASS' : 'FAIL'} (Expected FAIL)`);

    // Test error codes validation
    const errorCodes = schema.definitions.ErrorDetails.properties.code.enum;
    console.log(`✓ Supported error codes: ${errorCodes.length}`);
    console.log(`✓ Post statuses: ${schema.definitions.ResponseData.properties.post_status.enum.join(', ')}`);

    // Test required fields
    const requiredSuccessFields = schema.definitions.ResponseData.required;
    const requiredErrorFields = schema.definitions.ErrorDetails.required;
    console.log(`✓ Required success fields: ${requiredSuccessFields.join(', ')}`);
    console.log(`✓ Required error fields: ${requiredErrorFields.join(', ')}`);

    // Summary
    console.log('\n📊 Test Summary:');
    console.log('═'.repeat(60));
    console.log(`Total tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests === 0) {
      console.log('\n🎉 All tests passed! Response schema validation is working correctly.');
    } else {
      console.log(`\n⚠️  ${failedTests} test(s) failed. Please review the schema or test cases.`);
      process.exit(1);
    }

    // Additional validation tests
    console.log('\n🧪 Additional Response Validation Tests:');
    console.log('═'.repeat(60));

    // Test all error codes
    const testErrorCodes = ['VALIDATION_ERROR', 'AUTHENTICATION_ERROR', 'RATE_LIMIT_ERROR', 'WORDPRESS_API_ERROR'];
    testErrorCodes.forEach(code => {
      const testError = {
        success: false,
        error: { code, message: `Test ${code.toLowerCase().replace('_', ' ')}` }
      };
      console.log(`${code}: ${validate(testError) ? 'PASS' : 'FAIL'}`);
    });

    // Test all post statuses
    const postStatuses = ['draft', 'publish', 'private', 'pending'];
    postStatuses.forEach(status => {
      const testSuccess = {
        success: true,
        data: {
          post_id: 123,
          post_url: 'https://example.com/test/',
          post_title: 'Test Post',
          post_status: status
        }
      };
      console.log(`Post status '${status}': ${validate(testSuccess) ? 'PASS' : 'FAIL'}`);
    });

    // Test performance with large response
    const largeResponse = {
      success: true,
      data: {
        post_id: 123456,
        post_url: 'https://example.com/very-long-url-path-for-performance-testing/',
        post_title: 'Performance test post with a reasonably long title',
        post_status: 'publish',
        created_at: '2024-01-15T10:30:00Z',
        modified_at: '2024-01-15T10:30:00Z',
        author: 1,
        featured_media: 789,
        categories: [1, 2, 3, 4, 5],
        tags: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
        yoast_applied: true,
        images_uploaded: 10,
        image_ids: [100, 101, 102, 103, 104, 105, 106, 107, 108, 109],
        processing_time_ms: 5000,
        request_id: 'req_1705312200_performance',
        warnings: ['Performance test warning 1', 'Performance test warning 2']
      }
    };
    const startTime = Date.now();
    const perfResult = validate(largeResponse);
    const endTime = Date.now();
    console.log(`Large response performance: ${perfResult ? 'PASS' : 'FAIL'} (${endTime - startTime}ms)`);

    // Test data type validation
    console.log('\n🔍 Data Type Validation:');
    console.log('═'.repeat(60));
    
    // Test integer validation
    const integerTest = {
      success: true,
      data: {
        post_id: '123', // String instead of integer
        post_url: 'https://example.com/test/',
        post_title: 'Test Post',
        post_status: 'publish'
      }
    };
    console.log(`String post_id (should fail): ${validate(integerTest) ? 'PASS' : 'FAIL'} (Expected FAIL)`);

    // Test boolean validation
    const booleanTest = {
      success: 'true', // String instead of boolean
      data: {
        post_id: 123,
        post_url: 'https://example.com/test/',
        post_title: 'Test Post',
        post_status: 'publish'
      }
    };
    console.log(`String success flag (should fail): ${validate(booleanTest) ? 'PASS' : 'FAIL'} (Expected FAIL)`);

    // Test array validation
    const arrayTest = {
      success: true,
      data: {
        post_id: 123,
        post_url: 'https://example.com/test/',
        post_title: 'Test Post',
        post_status: 'publish',
        categories: 'not-an-array'
      }
    };
    console.log(`String categories (should fail): ${validate(arrayTest) ? 'PASS' : 'FAIL'} (Expected FAIL)`);

    console.log('\n✅ Response schema validation completed successfully!');

  } catch (error) {
    console.error('❌ Response schema validation failed:');
    console.error(error.message);
    
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    
    process.exit(1);
  }
}

// Run validation
validateResponseSchema();
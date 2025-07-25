const fs = require('fs');
const path = require('path');

async function validateGPTActionConfiguration() {
  try {
    console.log('🤖 Validating GPT Action Configuration...\n');

    // Load GPT Action configuration
    const configPath = path.join(__dirname, '../docs/gpt-action-config.json');
    let config;
    
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log('✅ GPT Action configuration loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load GPT Action configuration:');
      console.error(error.message);
      process.exit(1);
    }

    // Validate configuration structure
    console.log('\n📋 Configuration Information:');
    console.log(`   Action Name: ${config.action_name}`);
    console.log(`   Description Length: ${config.description.length} characters`);
    console.log(`   OpenAPI URL: ${config.openapi_url}`);
    console.log(`   Version: ${config.version}`);
    console.log(`   Last Updated: ${config.last_updated}\n`);

    let validationErrors = [];
    let validationWarnings = [];

    // Validate required fields
    console.log('🔍 Validating Required Fields:');
    console.log('═'.repeat(60));

    const requiredFields = [
      'action_name',
      'description',
      'authentication',
      'openapi_url',
      'conversation_starters',
      'instructions'
    ];

    for (const field of requiredFields) {
      if (config[field]) {
        console.log(`✓ ${field}: Present`);
      } else {
        console.log(`✗ ${field}: Missing`);
        validationErrors.push(`Missing required field: ${field}`);
      }
    }

    // Validate authentication configuration
    console.log('\n🔐 Validating Authentication:');
    console.log('═'.repeat(60));

    if (config.authentication) {
      const auth = config.authentication;
      
      if (auth.type === 'api_key') {
        console.log('✓ Authentication type: API Key');
        
        if (auth.auth_type === 'custom') {
          console.log('✓ Auth type: Custom');
          
          if (auth.custom_header_name === 'x-api-key') {
            console.log('✓ Header name: x-api-key');
          } else {
            console.log(`✗ Header name: ${auth.custom_header_name} (should be x-api-key)`);
            validationErrors.push('Custom header should be x-api-key');
          }
        } else {
          console.log(`✗ Auth type: ${auth.auth_type} (should be custom)`);
          validationErrors.push('Auth type should be custom for API key');
        }
        
        if (auth.instructions && auth.instructions.length > 10) {
          console.log('✓ Authentication instructions: Present');
        } else {
          console.log('✗ Authentication instructions: Missing or too short');
          validationWarnings.push('Authentication instructions should be more detailed');
        }
      } else {
        console.log(`✗ Authentication type: ${auth.type} (should be api_key)`);
        validationErrors.push('Authentication type should be api_key');
      }
    } else {
      console.log('✗ Authentication configuration missing');
      validationErrors.push('Authentication configuration is required');
    }

    // Validate conversation starters
    console.log('\n💬 Validating Conversation Starters:');
    console.log('═'.repeat(60));

    if (config.conversation_starters && Array.isArray(config.conversation_starters)) {
      const starters = config.conversation_starters;
      console.log(`✓ Conversation starters count: ${starters.length}`);
      
      if (starters.length >= 3 && starters.length <= 8) {
        console.log('✓ Conversation starters count: Appropriate range');
      } else {
        console.log(`⚠️  Conversation starters count: ${starters.length} (recommended: 3-8)`);
        validationWarnings.push('Recommended to have 3-8 conversation starters');
      }

      starters.forEach((starter, index) => {
        if (starter.length >= 10 && starter.length <= 100) {
          console.log(`✓ Starter ${index + 1}: Good length (${starter.length} chars)`);
        } else {
          console.log(`⚠️  Starter ${index + 1}: ${starter.length} chars (recommended: 10-100)`);
          validationWarnings.push(`Conversation starter ${index + 1} length should be 10-100 characters`);
        }
      });
    } else {
      console.log('✗ Conversation starters: Missing or invalid format');
      validationErrors.push('Conversation starters should be an array');
    }

    // Validate instructions
    console.log('\n📝 Validating Instructions:');
    console.log('═'.repeat(60));

    if (config.instructions) {
      const instructions = config.instructions;
      
      if (instructions.system_prompt) {
        const promptLength = instructions.system_prompt.length;
        console.log(`✓ System prompt: Present (${promptLength} characters)`);
        
        if (promptLength >= 500 && promptLength <= 8000) {
          console.log('✓ System prompt length: Appropriate');
        } else {
          console.log(`⚠️  System prompt length: ${promptLength} (recommended: 500-8000)`);
          validationWarnings.push('System prompt should be 500-8000 characters for optimal performance');
        }
      } else {
        console.log('✗ System prompt: Missing');
        validationErrors.push('System prompt is required');
      }

      const guidelineTypes = ['usage_guidelines', 'content_guidelines', 'seo_guidelines'];
      guidelineTypes.forEach(type => {
        if (instructions[type] && Array.isArray(instructions[type])) {
          console.log(`✓ ${type}: Present (${instructions[type].length} items)`);
        } else {
          console.log(`⚠️  ${type}: Missing or invalid`);
          validationWarnings.push(`${type} should be included for better GPT behavior`);
        }
      });
    } else {
      console.log('✗ Instructions: Missing');
      validationErrors.push('Instructions section is required');
    }

    // Validate capabilities
    console.log('\n🚀 Validating Capabilities:');
    console.log('═'.repeat(60));

    if (config.capabilities) {
      const capabilities = config.capabilities;
      const expectedCapabilities = ['content_creation', 'seo_optimization', 'wordpress_integration', 'content_formats'];
      
      expectedCapabilities.forEach(cap => {
        if (capabilities[cap]) {
          const count = Object.keys(capabilities[cap]).length;
          console.log(`✓ ${cap}: Present (${count} features)`);
        } else {
          console.log(`⚠️  ${cap}: Missing`);
          validationWarnings.push(`${cap} capabilities should be documented`);
        }
      });
    } else {
      console.log('⚠️  Capabilities: Missing');
      validationWarnings.push('Capabilities section helps users understand GPT features');
    }

    // Validate example interactions
    console.log('\n💡 Validating Example Interactions:');
    console.log('═'.repeat(60));

    if (config.example_interactions && Array.isArray(config.example_interactions)) {
      const examples = config.example_interactions;
      console.log(`✓ Example interactions: ${examples.length} examples`);
      
      examples.forEach((example, index) => {
        if (example.user_request && example.ai_response) {
          console.log(`✓ Example ${index + 1}: Complete (request + response)`);
        } else {
          console.log(`⚠️  Example ${index + 1}: Incomplete`);
          validationWarnings.push(`Example interaction ${index + 1} should have both user_request and ai_response`);
        }
      });
    } else {
      console.log('⚠️  Example interactions: Missing');
      validationWarnings.push('Example interactions help users understand how to use the GPT');
    }

    // Validate error handling
    console.log('\n🚨 Validating Error Handling:');
    console.log('═'.repeat(60));

    if (config.error_handling) {
      const errorTypes = ['authentication_errors', 'publishing_errors', 'rate_limiting', 'validation_errors'];
      errorTypes.forEach(type => {
        if (config.error_handling[type]) {
          console.log(`✓ ${type}: Documented`);
        } else {
          console.log(`⚠️  ${type}: Not documented`);
          validationWarnings.push(`${type} should be documented for better user experience`);
        }
      });
    } else {
      console.log('⚠️  Error handling: Missing');
      validationWarnings.push('Error handling documentation is important for user support');
    }

    // Validate support information
    console.log('\n🆘 Validating Support Information:');
    console.log('═'.repeat(60));

    if (config.support) {
      const supportChannels = ['documentation', 'support_email', 'community'];
      supportChannels.forEach(channel => {
        if (config.support[channel]) {
          console.log(`✓ ${channel}: Provided`);
        } else {
          console.log(`⚠️  ${channel}: Missing`);
          validationWarnings.push(`${channel} should be provided for user support`);
        }
      });
    } else {
      console.log('⚠️  Support information: Missing');
      validationWarnings.push('Support information helps users get help when needed');
    }

    // Validate OpenAPI URL format
    console.log('\n🔗 Validating OpenAPI URL:');
    console.log('═'.repeat(60));

    if (config.openapi_url) {
      const url = config.openapi_url;
      if (url.startsWith('https://') && url.endsWith('/openapi.yaml')) {
        console.log('✓ OpenAPI URL: Valid format');
      } else {
        console.log(`⚠️  OpenAPI URL: ${url}`);
        validationWarnings.push('OpenAPI URL should use HTTPS and end with /openapi.yaml');
      }
      
      if (url.includes('your-domain.vercel.app')) {
        console.log('⚠️  OpenAPI URL: Contains placeholder domain');
        validationWarnings.push('Replace placeholder domain with actual deployment URL');
      }
    } else {
      console.log('✗ OpenAPI URL: Missing');
      validationErrors.push('OpenAPI URL is required for schema import');
    }

    // Test JSON validity
    console.log('\n🧪 Additional Validation Tests:');
    console.log('═'.repeat(60));

    try {
      JSON.stringify(config);
      console.log('✓ JSON validity: Valid JSON structure');
    } catch (error) {
      console.log('✗ JSON validity: Invalid JSON');
      validationErrors.push('Configuration must be valid JSON');
    }

    // Check file sizes
    const configSize = fs.statSync(configPath).size;
    console.log(`✓ Configuration file size: ${(configSize / 1024).toFixed(1)}KB`);
    
    if (configSize > 50000) { // 50KB
      validationWarnings.push('Configuration file is quite large, consider optimizing');
    }

    // Summary
    console.log('\n📊 Validation Summary:');
    console.log('═'.repeat(60));
    console.log(`Total errors: ${validationErrors.length}`);
    console.log(`Total warnings: ${validationWarnings.length}`);

    if (validationErrors.length > 0) {
      console.log('\n❌ Validation Errors:');
      validationErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    if (validationWarnings.length > 0) {
      console.log('\n⚠️  Validation Warnings:');
      validationWarnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }

    if (validationErrors.length === 0) {
      console.log('\n🎉 GPT Action configuration is valid!');
      
      if (validationWarnings.length === 0) {
        console.log('✨ No warnings - configuration is optimized!');
      } else {
        console.log(`📝 Consider addressing ${validationWarnings.length} warning(s) for optimal performance.`);
      }

      // Additional setup information
      console.log('\n🚀 Ready for GPT Action Setup:');
      console.log('═'.repeat(60));
      console.log('1. Import OpenAPI schema from:', config.openapi_url);
      console.log('2. Configure authentication with API key header: x-api-key');
      console.log('3. Use provided conversation starters and instructions');
      console.log('4. Test with health check and content creation');
      console.log('5. Refer to setup guide: docs/gpt-action-setup.md');

    } else {
      console.log('\n❌ GPT Action configuration has errors that must be fixed.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ GPT Action configuration validation failed:');
    console.error(error.message);
    
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    
    process.exit(1);
  }
}

// Run validation
validateGPTActionConfiguration();
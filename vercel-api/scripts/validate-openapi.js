const SwaggerParser = require('swagger-parser');
const path = require('path');

async function validateOpenAPISpec() {
  try {
    console.log('🔍 Validating OpenAPI specification...');
    
    const specPath = path.join(__dirname, '../docs/openapi.yaml');
    console.log(`📁 Reading spec from: ${specPath}`);
    
    // Parse and validate the OpenAPI spec
    const api = await SwaggerParser.validate(specPath);
    
    console.log('✅ OpenAPI specification is valid!');
    console.log(`📋 API Title: ${api.info.title}`);
    console.log(`📝 Version: ${api.info.version}`);
    console.log(`🔗 Servers: ${api.servers.map(s => s.url).join(', ')}`);
    
    // Count endpoints
    const pathCount = Object.keys(api.paths).length;
    console.log(`🛣️  Paths defined: ${pathCount}`);
    
    // List all paths and methods
    Object.entries(api.paths).forEach(([path, methods]) => {
      const methodList = Object.keys(methods).filter(m => m !== 'parameters').join(', ').toUpperCase();
      console.log(`   ${methodList} ${path}`);
    });
    
    // Count schemas
    const schemaCount = Object.keys(api.components?.schemas || {}).length;
    console.log(`📊 Schemas defined: ${schemaCount}`);
    
    // List schemas
    if (api.components?.schemas) {
      Object.keys(api.components.schemas).forEach(schema => {
        console.log(`   📄 ${schema}`);
      });
    }
    
    // Check security schemes
    const securitySchemes = Object.keys(api.components?.securitySchemes || {});
    console.log(`🔐 Security schemes: ${securitySchemes.join(', ')}`);
    
    console.log('\n🎉 Validation completed successfully!');
    
  } catch (error) {
    console.error('❌ OpenAPI specification validation failed:');
    console.error(error.message);
    
    if (error.details) {
      console.error('\nDetailed errors:');
      error.details.forEach(detail => {
        console.error(`  - ${detail.message} (${detail.path})`);
      });
    }
    
    process.exit(1);
  }
}

// Run validation
validateOpenAPISpec();
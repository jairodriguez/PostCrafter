const https = require('https');

const testData = {
  title: "Test Post from Programmatic API Call",
  content: "<p>This is a test post created by a programmatic API call.</p><p>If you see this post in your WordPress admin, the API is working for ChatGPT!</p>",
  excerpt: "A test post to verify programmatic API access",
  status: "draft",
  categories: ["test"],
  tags: ["postcrafter", "api", "test"]
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'public-deploy-jk5fqi58l-jairo-rodriguezs-projects-77445a5f.vercel.app',
  port: 443,
  path: '/api/publish',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🧪 Testing programmatic API access...');
console.log('📡 URL:', `https://${options.hostname}${options.path}`);
console.log('📝 Data:', JSON.stringify(testData, null, 2));

const req = https.request(options, (res) => {
  console.log('📊 Status:', res.statusCode);
  console.log('📋 Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 Response:');
    try {
      const jsonResponse = JSON.parse(data);
      console.log(JSON.stringify(jsonResponse, null, 2));
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Error:', e.message);
});

req.write(postData);
req.end();

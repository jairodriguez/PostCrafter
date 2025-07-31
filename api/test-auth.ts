import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get environment variables
    const wordpressUrl = process.env.WORDPRESS_URL;
    const username = process.env.WORDPRESS_USERNAME;
    const appPassword = process.env.WORDPRESS_APP_PASSWORD;

    if (!wordpressUrl || !username || !appPassword) {
      return res.status(500).json({ 
        error: 'WordPress credentials not configured',
        wordpressUrl: wordpressUrl ? 'SET' : 'NOT SET',
        username: username ? 'SET' : 'NOT SET',
        appPassword: appPassword ? 'SET' : 'NOT SET'
      });
    }

    // Create basic auth header
    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');

    // Test the exact same request as the publish endpoint
    const response = await fetch(`${wordpressUrl}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        title: 'Test Post from API',
        content: 'This is a test post from the PostCrafter API',
        status: 'draft'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WordPress API error:', errorText);
      return res.status(response.status).json({ 
        error: 'Failed to create post in WordPress',
        details: errorText,
        status: response.status,
        statusText: response.statusText
      });
    }

    const wpResponse = await response.json() as any;
    
    return res.status(200).json({
      success: true,
      post_id: wpResponse.id,
      post_url: wpResponse.link,
      message: 'Post created successfully'
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
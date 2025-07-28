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
    const { title, content, excerpt, status = 'draft', categories = [], tags = [] } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Get environment variables
    const wordpressUrl = process.env.WORDPRESS_URL;
    const username = process.env.WORDPRESS_USERNAME;
    const appPassword = process.env.WORDPRESS_APP_PASSWORD;

    if (!wordpressUrl || !username || !appPassword) {
      return res.status(500).json({ error: 'WordPress credentials not configured' });
    }

    // Create basic auth header
    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');

    // Prepare post data for WordPress
    const postData = {
      title,
      content,
      excerpt,
      status,
      categories: categories.length > 0 ? categories : undefined,
      tags: tags.length > 0 ? tags : undefined
    };

    // Make request to WordPress REST API
    const response = await fetch(`${wordpressUrl}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WordPress API error:', errorText);
      return res.status(response.status).json({ 
        error: 'Failed to create post in WordPress',
        details: errorText
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
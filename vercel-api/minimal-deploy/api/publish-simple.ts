import type { VercelRequest, VercelResponse } from '@vercel/node';

interface PublishRequest {
  title: string;
  content: string;
  excerpt?: string;
  status?: 'draft' | 'publish';
  categories?: string[];
  tags?: string[];
  yoast_meta?: {
    title?: string;
    description?: string;
    focus_keyword?: string;
  };
}

interface PublishResponse {
  success: boolean;
  post_id?: number;
  post_url?: string;
  error?: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ 
      success: false, 
      error: `Method ${req.method} not allowed` 
    });
    return;
  }

  try {
    const body: PublishRequest = req.body;

    // Basic validation
    if (!body.title || !body.content) {
      res.status(400).json({
        success: false,
        error: 'Title and content are required'
      });
      return;
    }

    // WordPress configuration from environment variables
    const wpUrl = process.env.WORDPRESS_URL;
    const wpUsername = process.env.WORDPRESS_USERNAME;
    const wpPassword = process.env.WORDPRESS_APP_PASSWORD;

    if (!wpUrl || !wpUsername || !wpPassword) {
      res.status(500).json({
        success: false,
        error: 'WordPress configuration missing. Please set WORDPRESS_URL, WORDPRESS_USERNAME, and WORDPRESS_APP_PASSWORD environment variables.'
      });
      return;
    }

    // Create WordPress post
    const postData = {
      title: body.title,
      content: body.content,
      excerpt: body.excerpt || '',
      status: body.status || 'publish',
      categories: body.categories || [],
      tags: body.tags || []
    };

    console.log('Publishing to WordPress:', wpUrl);
    console.log('Post data:', { title: postData.title, status: postData.status });

    // Make request to WordPress REST API
    const response = await fetch(`${wpUrl}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${wpUsername}:${wpPassword}`).toString('base64')}`
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WordPress API error:', response.status, errorText);
      res.status(response.status).json({
        success: false,
        error: `WordPress API error: ${response.status} - ${errorText}`
      });
      return;
    }

    const wpResponse = await response.json() as any;
    console.log('WordPress response:', { id: wpResponse.id, link: wpResponse.link });

    // Handle Yoast SEO meta if provided
    if (body.yoast_meta) {
      try {
        await fetch(`${wpUrl}/wp-json/postcrafter/v1/yoast-meta/${wpResponse.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(`${wpUsername}:${wpPassword}`).toString('base64')}`
          },
          body: JSON.stringify(body.yoast_meta)
        });
      } catch (yoastError) {
        console.warn('Yoast meta update failed:', yoastError);
      }
    }

    res.status(200).json({
      success: true,
      post_id: wpResponse.id,
      post_url: wpResponse.link,
      message: 'Post published successfully!'
    });

  } catch (error) {
    console.error('Publish error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
} 
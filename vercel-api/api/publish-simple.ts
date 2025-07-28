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
        error: 'WordPress configuration missing'
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

    // Make request to WordPress REST API
    const response = await fetch(`${wpUrl}/index.php?rest_route=/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${wpUsername}:${wpPassword}`).toString('base64')}`
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(response.status).json({
        success: false,
        error: `WordPress API error: ${errorText}`
      });
      return;
    }

    const wpResponse = await response.json();

    // Handle Yoast SEO meta if provided
    if (body.yoast_meta) {
      try {
        await fetch(`${wpUrl}/index.php?rest_route=/postcrafter/v1/yoast-meta/${wpResponse.id}`, {
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
      post_url: wpResponse.link
    });

  } catch (error) {
    console.error('Publish error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
} 
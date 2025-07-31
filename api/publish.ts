import type { VercelRequest, VercelResponse } from '@vercel/node';

type PublishRequest = {
  title: string;
  content: string;
  excerpt?: string;
  status?: "publish" | "draft";
  categories?: string[];
  tags?: string[];
  yoast?: {
    meta_title?: string;
    meta_description?: string;
    focus_keyword?: string;
  };
};

type PublishResponse = {
  success: boolean;
  post_id?: number;
  post_url?: string;
  error?: string;
  message?: string;
};

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
    const { title, content, excerpt, status = 'publish', categories = [], tags = [], yoast } = req.body as PublishRequest;

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
    const postData: any = {
      title,
      content,
      excerpt,
      status,
      ...(categories.length > 0 && { categories }),
      ...(tags.length > 0 && { tags })
    };

    // Add Yoast meta fields to the post data if provided
    if (yoast && (yoast.meta_title || yoast.meta_description || yoast.focus_keyword)) {
      postData.yoast = {
        meta_title: yoast.meta_title,
        meta_description: yoast.meta_description,
        focus_keyword: yoast.focus_keyword
      };
    }

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

    // If Yoast data was provided, set the meta fields directly as a fallback
    if (yoast && (yoast.meta_title || yoast.meta_description || yoast.focus_keyword)) {
      try {
        const metaUpdateData: any = {};
        
        if (yoast.meta_title) {
          metaUpdateData['_yoast_wpseo_title'] = yoast.meta_title;
        }
        if (yoast.meta_description) {
          metaUpdateData['_yoast_wpseo_metadesc'] = yoast.meta_description;
        }
        if (yoast.focus_keyword) {
          metaUpdateData['_yoast_wpseo_focuskw'] = yoast.focus_keyword;
        }

        // Update the post meta directly
        const metaResponse = await fetch(`${wordpressUrl}/wp-json/wp/v2/posts/${wpResponse.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`
          },
          body: JSON.stringify({
            meta: metaUpdateData
          })
        });

        if (!metaResponse.ok) {
          console.error("Failed to update meta fields:", await metaResponse.text());
        }
      } catch (metaError) {
        console.error("Error updating meta fields:", metaError);
      }
    }
    
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
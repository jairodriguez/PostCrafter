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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get environment variables (without exposing sensitive data)
    const wordpressUrl = process.env.WORDPRESS_URL;
    const username = process.env.WORDPRESS_USERNAME;
    const appPassword = process.env.WORDPRESS_APP_PASSWORD;

    const debugInfo: any = {
      wordpressUrl: wordpressUrl ? `${wordpressUrl} (configured)` : 'NOT SET',
      username: username ? `${username} (configured)` : 'NOT SET', 
      appPassword: appPassword ? 'SET (hidden)' : 'NOT SET',
      timestamp: new Date().toISOString()
    };

    // Test WordPress connection if credentials are available
    if (wordpressUrl && username && appPassword) {
      try {
        const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
        const response = await fetch(`${wordpressUrl}/wp-json/wp/v2/posts`, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`
          }
        });

        debugInfo.wordpressTest = {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        };
      } catch (error) {
        debugInfo.wordpressTest = {
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return res.status(200).json(debugInfo);

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
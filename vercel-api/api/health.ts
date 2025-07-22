import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getEnvVars } from '@/utils/env';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: `Method ${req.method} not allowed`,
      },
    });
    return;
  }

  try {
    // Validate environment variables
    const envVars = getEnvVars();

    // Basic health check response
    res.status(200).json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: envVars.NODE_ENV,
        version: '1.0.0',
        services: {
          wordpress: {
            url: envVars.WORDPRESS_URL,
            configured: true,
          },
          gpt: {
            configured: !!envVars.GPT_API_KEY,
          },
        },
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
} 
import { NextApiRequest, NextApiResponse } from 'next';
import { ImageOptimizer } from '../src/utils/image-optimizer';
import fetch from 'node-fetch';

// Helper to download image from URL
async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to download image');
  return Buffer.from(await response.arrayBuffer());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, base64, alt, featured } = req.body;
  let imageBuffer: Buffer | null = null;

  try {
    if (url && base64) {
      return res.status(400).json({ error: 'Provide either url or base64, not both' });
    }
    if (!url && !base64) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    if (url) {
      imageBuffer = await downloadImage(url);
    } else if (base64) {
      const matches = base64.match(/^data:(.+);base64,(.+)$/);
      if (!matches) throw new Error('Invalid base64 format');
      imageBuffer = Buffer.from(matches[2], 'base64');
    }

    // Validate and optimize image
    const optimizer = new ImageOptimizer();
    const validation = await optimizer.validateImage(imageBuffer!);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Image validation failed', details: validation });
    }
    const optimized = await optimizer.optimizeImage(imageBuffer!);

    // TODO: Save image to storage (e.g., local, S3, or WordPress media library)
    // For now, just return success with metadata
    const imageMeta = {
      alt: alt || '',
      featured: !!featured,
      size: optimized.size,
      format: optimized.format,
      width: optimized.width,
      height: optimized.height,
    };

    // TODO: Integrate with post creation/update for featured image assignment

    return res.status(200).json({ success: true, image: imageMeta });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
} 
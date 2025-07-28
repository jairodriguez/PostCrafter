import type { NextApiRequest, NextApiResponse } from 'next'

type PublishRequest = {
  title: string
  content: string
  excerpt?: string
  status?: 'publish' | 'draft'
}

type PublishResponse = {
  success: boolean
  post_id?: number
  post_url?: string
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PublishResponse>
) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method Not Allowed' 
    })
  }

  try {
    const { title, content, excerpt, status = 'publish' } = req.body as PublishRequest

    // Basic validation
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Title and content are required'
      })
    }

    // Get WordPress credentials from environment
    const wordpressUrl = process.env.WORDPRESS_URL
    const username = process.env.WORDPRESS_USERNAME
    const appPassword = process.env.WORDPRESS_APP_PASSWORD

    if (!wordpressUrl || !username || !appPassword) {
      return res.status(500).json({
        success: false,
        error: 'WordPress credentials not configured'
      })
    }

    // Prepare the post data
    const postData = {
      title,
      content,
      status,
      ...(excerpt && { excerpt })
    }

    // Make request to WordPress REST API
    const response = await fetch(`${wordpressUrl}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${username}:${appPassword}`).toString('base64')}`
      },
      body: JSON.stringify(postData)
    })

    if (!response.ok) {
      const errorData = await response.text()
      return res.status(response.status).json({
        success: false,
        error: `WordPress API error: ${response.status} - ${errorData}`
      })
    }

    const post = await response.json()

    return res.status(200).json({
      success: true,
      post_id: post.id,
      post_url: post.link
    })

  } catch (error) {
    console.error('Publish error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
} 
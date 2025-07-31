import type { NextApiRequest, NextApiResponse } from "next";

type PublishRequest = {
  title: string;
  content: string;
  excerpt?: string;
  status?: "publish" | "draft";
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
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PublishResponse>
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  try {
    const { title, content, excerpt, status = "publish", yoast } = req.body as PublishRequest;

    if (!title || !content) {
      return res.status(400).json({ success: false, error: "Title and content are required" });
    }

    const wordpressUrl = process.env.WORDPRESS_URL;
    const username = process.env.WORDPRESS_USERNAME;
    const appPassword = process.env.WORDPRESS_APP_PASSWORD;

    if (!wordpressUrl || !username || !appPassword) {
      return res.status(500).json({ success: false, error: "WordPress credentials not configured" });
    }

    const postData: any = {
      title,
      content,
      status,
      ...(excerpt && { excerpt })
    };

    // Add Yoast meta fields to the post data if provided
    if (yoast && (yoast.meta_title || yoast.meta_description || yoast.focus_keyword)) {
      postData.yoast = {
        meta_title: yoast.meta_title,
        meta_description: yoast.meta_description,
        focus_keyword: yoast.focus_keyword
      };
    }

    // Create the post with Yoast meta fields included
    const response = await fetch(`${wordpressUrl}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${Buffer.from(`${username}:${appPassword}`).toString("base64")}`
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).json({ success: false, error: `WordPress API error: ${response.status} - ${errorData}` });
    }

    const post = await response.json();

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
        const metaResponse = await fetch(`${wordpressUrl}/wp-json/wp/v2/posts/${post.id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${Buffer.from(`${username}:${appPassword}`).toString("base64")}`
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
      post_id: post.id,
      post_url: post.link
    });
  } catch (error) {
    console.error("Publish error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

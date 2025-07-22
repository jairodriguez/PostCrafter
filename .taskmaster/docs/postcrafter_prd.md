# PostCrafter - Product Requirements Document (PRD)

## Overview
PostCrafter enables AI-generated, SEO-optimized articles to be published directly from ChatGPT to WordPress with a single custom GPT action. It solves the complexity of AI-to-WordPress automation for non-technical creators and marketing teams who want faster content delivery with less manual overhead. It is especially valuable for content teams, solopreneurs, and agencies who already use WordPress and GPT-based content workflows.

## Core Features

### 1. GPT-to-WordPress Direct Publishing
- **What it does:** Publishes complete articles from ChatGPT to WordPress in one action.
- **Why it's important:** Eliminates manual copy-pasting, reduces human error, speeds up publishing.
- **How it works:** GPT sends structured JSON to a secure Vercel endpoint, which handles WordPress REST API calls.

### 2. Media Handling (Images, Alt Text)
- **What it does:** Automates featured image upload, setting alt text, and attaching media to posts.
- **Why it's important:** Saves time, improves SEO, and ensures posts are visually complete.
- **How it works:** Images from URLs or base64 are uploaded to WordPress via REST endpoints.

### 3. SEO Meta (Yoast / RankMath Integration)
- **What it does:** Publishes meta title, meta description, and focus keywords.
- **Why it's important:** Critical for SEO ranking and visibility.
- **How it works:** Uses custom REST fields to expose hidden meta fields for write-access.

### 4. Serverless API (Vercel)
- **What it does:** A Vercel-hosted TypeScript function acts as the middle layer between GPT and WordPress.
- **Why it's important:** Keeps credentials secure, simplifies deployment.
- **How it works:** GPT calls the endpoint with a secure API key; Vercel handles media uploads, metadata, and final post publishing.

## User Experience

### User Personas
- **Content Managers:** Looking to scale SEO publishing with minimal effort.
- **Solo Creators:** Non-technical users who want their AI-generated posts live fast.
- **Agencies:** Managing multiple WordPress sites, aiming to streamline client content delivery.

### Key User Flows
1. Chat with PostCrafter GPT, generate article content.
2. Confirm "Publish to WordPress" intent.
3. GPT calls secure API; returns post URL.
4. User views live post immediately.

### UI/UX Considerations
- GPT prompts must encourage clean, structured outputs.
- Clear post-publish feedback: URL, status ("published").
- Simple onboarding instructions for WordPress setup (API keys, plugin snippet).

## Technical Architecture

### System Components
- GPT Action (OpenAPI Spec)
- Vercel Function (TypeScript, Node 18+)
- WordPress REST API
- Yoast/RankMath REST Field Exposures (mu-plugin)

### Data Models
- PostPayload: title, slug, excerpt, content_html, categories, tags, yoast fields, images.

### APIs and Integrations
- WordPress REST API: posts, media, categories, tags endpoints
- Vercel HTTPS endpoint for secure publishing
- GPT Action (OpenAPI)

### Infrastructure Requirements
- Vercel for serverless function
- Environment variables for credentials (WP URL, User, App Password, GPT API key)

## Development Roadmap

### MVP Requirements
- Single API endpoint with auth
- GPT Action integrated in GPT Builder
- Image upload support
- Yoast meta exposure via mu-plugin
- Successful post publishing end-to-end

### Future Enhancements
- Draft vs. publish toggle
- Support for custom post types
- Advanced media library management
- Multi-site support
- User dashboards / logs

## Logical Dependency Chain
1. Expose Yoast meta via WordPress REST.
2. Build and deploy Vercel API (auth, post creation).
3. Connect GPT Action.
4. Media upload support.
5. Final testing end-to-end.

## Risks and Mitigations
| Risk                     | Mitigation                                 |
|---------------------------|--------------------------------------------|
| API changes in WordPress  | Keep mu-plugin updated, monitor WP docs.   |
| GPT JSON inconsistencies  | Enforce schema with OpenAPI strict typing. |
| Security of credentials   | Keep keys in Vercel env vars only.         |
| User adoption friction    | Clear setup docs, minimize user steps.     |

## Appendix
- Research shows GPTPress, FlowPress are crowded names.
- “PostCrafter” selected for uniqueness, clarity, SEO-friendliness.
- Technical references: WordPress REST API, Vercel docs, GPT Actions docs.


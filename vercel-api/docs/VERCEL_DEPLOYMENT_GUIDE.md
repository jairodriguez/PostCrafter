# PostCrafter Vercel Deployment Guide

This guide provides step-by-step instructions for deploying the PostCrafter serverless API to Vercel, including environment setup, configuration, and testing.

## Prerequisites

Before deploying to Vercel, ensure you have:

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub/GitLab/Bitbucket Account**: For repository hosting
3. **WordPress Site**: With REST API enabled and user credentials
4. **OpenAI API Key**: For GPT integration (optional but recommended)
5. **Node.js**: Version 18+ installed locally (for testing)

## Step 1: Prepare Your Repository

### 1.1 Clone the Repository

```bash
# Clone the PostCrafter repository
git clone https://github.com/your-username/postcrafter.git
cd postcrafter/vercel-api

# Install dependencies
npm install

# Verify the project structure
ls -la
```

### 1.2 Verify Project Structure

Ensure your project contains:
```
vercel-api/
├── api/                    # API endpoints
├── src/                    # Source code
├── docs/                   # Documentation
├── package.json           # Dependencies
├── vercel.json           # Vercel configuration
├── tsconfig.json         # TypeScript config
└── .env.example          # Environment template
```

## Step 2: Configure Environment Variables

### 2.1 Create Environment File

```bash
# Copy the example environment file
cp .env.example .env.local

# Edit the environment file
nano .env.local
```

### 2.2 Required Environment Variables

```bash
# WordPress Configuration
WORDPRESS_URL=https://your-wordpress-site.com
WORDPRESS_USERNAME=your-username
WORDPRESS_APP_PASSWORD=your-app-password

# API Security
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# OpenAI Configuration (Optional)
GPT_API_KEY=sk-your-openai-api-key

# Application Settings
NODE_ENV=production
LOG_LEVEL=info
```

### 2.3 Optional Environment Variables

```bash
# Rate Limiting
API_RATE_LIMIT_WINDOW_MS=60000
API_RATE_LIMIT_MAX_REQUESTS=100

# WordPress Timeout
WORDPRESS_TIMEOUT_MS=30000

# CORS Configuration
CORS_ORIGINS=https://chat.openai.com,https://chatgpt.com

# Image Processing
MAX_IMAGE_SIZE_MB=10

# Debug Settings
ENABLE_DEBUG_LOGGING=false
```

### 2.4 WordPress App Password Setup

1. **Access WordPress Admin**:
   - Log into your WordPress admin panel
   - Navigate to Users → Profile

2. **Generate App Password**:
   - Scroll down to "Application Passwords"
   - Enter a name: "PostCrafter API"
   - Click "Add New Application Password"
   - Copy the generated password

3. **Test WordPress Connection**:
   ```bash
   curl -X GET https://your-wordpress-site.com/wp-json/wp/v2/posts \
     -u "your-username:your-app-password"
   ```

## Step 3: Deploy to Vercel

### 3.1 Install Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login
```

### 3.2 Deploy the Application

```bash
# Navigate to the vercel-api directory
cd vercel-api

# Deploy to Vercel
vercel

# Follow the prompts:
# - Set up and deploy? → Yes
# - Which scope? → Select your account
# - Link to existing project? → No
# - What's your project's name? → postcrafter-api
# - In which directory is your code located? → ./
# - Want to override the settings? → No
```

### 3.3 Configure Environment Variables in Vercel

1. **Access Vercel Dashboard**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Select your project

2. **Add Environment Variables**:
   - Go to Settings → Environment Variables
   - Add each variable from your `.env.local` file
   - Set environment to "Production"

3. **Required Variables for Production**:
   ```
   WORDPRESS_URL=https://your-wordpress-site.com
   WORDPRESS_USERNAME=your-username
   WORDPRESS_APP_PASSWORD=your-app-password
   JWT_SECRET=your-super-secret-jwt-key
   NODE_ENV=production
   ```

### 3.4 Redeploy with Environment Variables

```bash
# Redeploy to apply environment variables
vercel --prod
```

## Step 4: Verify Deployment

### 4.1 Test Health Endpoint

```bash
# Test the health endpoint
curl https://your-project.vercel.app/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

### 4.2 Test WordPress Integration

```bash
# Test WordPress connection
curl -X GET https://your-project.vercel.app/api/posts/status \
  -H "Content-Type: application/json"

# Expected response:
{
  "status": "connected",
  "wordpress_url": "https://your-wordpress-site.com",
  "posts_count": 42
}
```

### 4.3 Test API Authentication

```bash
# Generate a test API key (if implemented)
curl -X POST https://your-project.vercel.app/api/auth/generate-key \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "test"}'
```

## Step 5: Configure Custom Domain (Optional)

### 5.1 Add Custom Domain

1. **Access Vercel Dashboard**:
   - Go to your project settings
   - Navigate to Domains

2. **Add Domain**:
   - Enter your custom domain (e.g., `api.yourdomain.com`)
   - Follow DNS configuration instructions

3. **Update DNS Records**:
   - Add CNAME record pointing to your Vercel deployment
   - Wait for DNS propagation (up to 48 hours)

### 5.2 Update Environment Variables

```bash
# Update CORS origins with your custom domain
CORS_ORIGINS=https://chat.openai.com,https://chatgpt.com,https://yourdomain.com
```

## Step 6: Production Configuration

### 6.1 Vercel Configuration File

Create or update `vercel.json`:

```json
{
  "version": 2,
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "NODE_ENV": "production"
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### 6.2 Performance Optimization

1. **Enable Edge Functions** (if applicable):
   ```json
   {
     "functions": {
       "api/health.ts": {
         "runtime": "edge"
       }
     }
   }
   ```

2. **Configure Caching**:
   ```json
   {
     "headers": [
       {
         "source": "/api/health",
         "headers": [
           {
             "key": "Cache-Control",
             "value": "public, max-age=60"
           }
         ]
       }
     ]
   }
   ```

## Step 7: Monitoring and Logs

### 7.1 Access Vercel Logs

```bash
# View deployment logs
vercel logs

# View function logs
vercel logs --function=api/posts

# Follow logs in real-time
vercel logs --follow
```

### 7.2 Set Up Monitoring

1. **Vercel Analytics**:
   - Enable in project settings
   - Monitor API performance and errors

2. **External Monitoring**:
   - Set up uptime monitoring (e.g., UptimeRobot)
   - Configure alerts for downtime

## Troubleshooting

### Common Issues

#### 1. Environment Variables Not Working

```bash
# Verify environment variables are set
vercel env ls

# Redeploy after adding variables
vercel --prod
```

#### 2. WordPress Connection Fails

```bash
# Test WordPress credentials
curl -X GET https://your-wordpress-site.com/wp-json/wp/v2/posts \
  -u "username:app-password"

# Check CORS configuration
curl -H "Origin: https://your-project.vercel.app" \
  https://your-wordpress-site.com/wp-json/wp/v2/posts
```

#### 3. Function Timeout

```json
// Increase timeout in vercel.json
{
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 60
    }
  }
}
```

#### 4. Memory Issues

```json
// Increase memory allocation
{
  "functions": {
    "api/**/*.ts": {
      "memory": 3008
    }
  }
}
```

### Debug Mode

Enable debug logging for troubleshooting:

```bash
# Set debug environment variable
ENABLE_DEBUG_LOGGING=true
LOG_LEVEL=debug

# Redeploy
vercel --prod
```

## Security Best Practices

### 1. Environment Variable Security

- ✅ Use strong, unique JWT secrets
- ✅ Rotate API keys regularly
- ✅ Never commit secrets to version control
- ✅ Use Vercel's environment variable encryption

### 2. API Security

- ✅ Implement rate limiting
- ✅ Use HTTPS for all communications
- ✅ Validate all input data
- ✅ Set appropriate CORS headers

### 3. WordPress Security

- ✅ Use application passwords instead of user passwords
- ✅ Limit API access to necessary endpoints
- ✅ Regularly update WordPress and plugins
- ✅ Monitor for suspicious activity

## Next Steps

After successful deployment:

1. **Test the GPT Action**: Follow the [GPT Action Setup Guide](./gpt-action-setup.md)
2. **Configure Monitoring**: Set up alerts and monitoring
3. **Document Your Setup**: Update internal documentation
4. **Plan for Scaling**: Consider performance optimization

## Support

If you encounter issues:

1. Check the [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. Review Vercel deployment logs
3. Verify environment variable configuration
4. Test WordPress connectivity
5. Check API endpoint responses

For additional help, refer to:
- [Vercel Documentation](https://vercel.com/docs)
- [WordPress REST API Handbook](https://developer.wordpress.org/rest-api/)
- [PostCrafter API Documentation](./API_DOCUMENTATION.md) 
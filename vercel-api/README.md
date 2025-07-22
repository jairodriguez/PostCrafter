# PostCrafter Vercel API

A serverless API built with TypeScript and Vercel for handling GPT-to-WordPress communication in the PostCrafter project.

## 🚀 Features

- **TypeScript Support**: Full TypeScript implementation with strict type checking
- **Serverless Architecture**: Built on Vercel's serverless platform
- **WordPress Integration**: REST API integration with WordPress
- **Yoast SEO Support**: Handles Yoast SEO meta fields
- **Image Upload**: Supports both URL and base64 image uploads
- **Security**: Authentication, validation, and rate limiting
- **Error Handling**: Comprehensive error handling and logging
- **Testing**: Jest-based testing suite

## 📋 Prerequisites

- Node.js 18+ 
- Vercel CLI
- WordPress site with REST API enabled
- Yoast SEO plugin (optional but recommended)

## 🛠️ Installation

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd vercel-api
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp env.template .env.local
   # Edit .env.local with your actual values
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

## 🔧 Environment Variables

The API requires several environment variables to function properly. Copy `env.template` to `.env.local` and fill in your values.

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `WORDPRESS_URL` | Your WordPress site URL (must include protocol) | `https://your-wordpress-site.com` |
| `WORDPRESS_USERNAME` | WordPress username for API authentication | `admin` |
| `WORDPRESS_APP_PASSWORD` | WordPress application password (not regular password) | `abcd 1234 efgh 5678` |
| `GPT_API_KEY` | OpenAI GPT API key for authentication | `sk-1234567890abcdef1234567890abcdef` |
| `JWT_SECRET` | Secret key for JWT token generation (32+ characters) | `your-super-secret-jwt-key-that-is-very-long-and-secure` |

### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `NODE_ENV` | Application environment | `development` | `production` |
| `API_RATE_LIMIT_WINDOW_MS` | Rate limiting window in milliseconds | `60000` | `120000` |
| `API_RATE_LIMIT_MAX_REQUESTS` | Maximum requests per rate limit window | `100` | `50` |
| `WORDPRESS_TIMEOUT_MS` | WordPress API request timeout in milliseconds | `30000` | `60000` |
| `LOG_LEVEL` | Application logging level | `info` | `debug` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated or * for all) | `*` | `https://chat.openai.com,https://your-domain.com` |
| `MAX_IMAGE_SIZE_MB` | Maximum image file size in megabytes | `10` | `20` |
| `ENABLE_DEBUG_LOGGING` | Enable detailed debug logging | `false` | `true` |

### Environment Validation

The API includes comprehensive environment variable validation:

```bash
# Check environment configuration
npm run type-check

# Run tests to validate environment
npm test
```

### Production Configuration

For production deployment, ensure:

1. **Set `NODE_ENV=production`**
2. **Use a strong JWT_SECRET** (at least 64 characters)
3. **Restrict CORS origins** to specific domains
4. **Set appropriate log levels** (avoid debug in production)
5. **Configure rate limiting** based on expected traffic

## 🚀 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run deploy` - Deploy to Vercel
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run type-check` - Run TypeScript type checking
- `npm run clean` - Clean build artifacts

### Project Structure

```
vercel-api/
├── api/                    # Vercel serverless functions
│   ├── health.ts          # Health check endpoint
│   └── publish.ts         # Main publish endpoint
├── src/
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts
│   └── utils/             # Utility functions
│       ├── env.ts         # Environment variable handling
│       ├── env-validator.ts # Environment validation
│       └── __tests__/     # Test files
├── package.json
├── tsconfig.json
├── vercel.json
├── .eslintrc.js
├── .prettierrc
├── env.template           # Environment variables template
└── README.md
```

## 🧪 Testing

The project includes comprehensive tests for environment variable validation:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- env.test.ts
```

### Test Coverage

- Environment variable validation
- Configuration object generation
- Production readiness checks
- Error handling scenarios

## 🔒 Security

### Environment Variable Security

- **Never commit `.env.local`** to version control
- **Use strong secrets** for JWT_SECRET and API keys
- **Validate all inputs** before processing
- **Use HTTPS** for all external communications
- **Implement rate limiting** to prevent abuse

### Production Security Checklist

- [ ] All required environment variables are set
- [ ] JWT_SECRET is at least 64 characters long
- [ ] CORS origins are restricted to specific domains
- [ ] Debug logging is disabled
- [ ] Rate limiting is configured appropriately
- [ ] WordPress credentials are secure
- [ ] API keys are properly secured

## 📊 Monitoring

### Health Check Endpoint

The API provides a comprehensive health check endpoint at `/api/health` that includes:

- Environment validation status
- Production readiness check
- Configuration overview
- Service status information

### Example Health Check Response

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "environment": {
      "nodeEnv": "configured",
      "productionReady": true,
      "issues": []
    },
    "version": "1.0.0",
    "services": {
      "wordpress": {
        "url": "configured",
        "timeout": 30000
      },
      "rateLimiting": {
        "windowMs": 60000,
        "maxRequests": 100
      },
      "cors": {
        "origins": ["*"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
      },
      "logging": {
        "level": "info",
        "debugEnabled": false
      }
    },
    "validation": {
      "valid": true,
      "errors": [],
      "warnings": [],
      "missing": [],
      "invalid": [],
      "suggestions": []
    }
  }
}
```

## 🚀 Deployment

### Vercel Deployment

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Set environment variables in Vercel**:
   ```bash
   vercel env add WORDPRESS_URL
   vercel env add WORDPRESS_USERNAME
   vercel env add WORDPRESS_APP_PASSWORD
   vercel env add GPT_API_KEY
   vercel env add JWT_SECRET
   ```

4. **Deploy**:
   ```bash
   vercel --prod
   ```

### Environment Variables in Vercel

Set the following environment variables in your Vercel project settings:

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each required variable with appropriate values
4. Ensure variables are set for Production, Preview, and Development environments

## 🔧 Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**
   - Ensure `.env.local` exists in project root
   - Check variable names match exactly
   - Verify no extra spaces or quotes

2. **WordPress Authentication Failures**
   - Verify WordPress URL is correct and accessible
   - Ensure application password is used (not regular password)
   - Check WordPress REST API is enabled

3. **CORS Issues**
   - Verify CORS_ORIGINS includes your domain
   - Check if using wildcard (*) in production
   - Ensure proper protocol (http/https)

4. **Rate Limiting**
   - Adjust API_RATE_LIMIT_MAX_REQUESTS if hitting limits
   - Increase API_RATE_LIMIT_WINDOW_MS for longer windows
   - Monitor usage patterns

### Debug Mode

Enable debug logging for troubleshooting:

```bash
# Set in .env.local
ENABLE_DEBUG_LOGGING=true
LOG_LEVEL=debug
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📞 Support

For support and questions:

1. Check the troubleshooting section
2. Review environment variable configuration
3. Run the health check endpoint
4. Check Vercel deployment logs
5. Open an issue with detailed error information 
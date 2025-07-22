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
   Create a `.env.local` file in the project root:
   ```env
   WORDPRESS_URL=https://your-wordpress-site.com
   WORDPRESS_USERNAME=your-username
   WORDPRESS_APP_PASSWORD=your-app-password
   GPT_API_KEY=your-gpt-api-key
   JWT_SECRET=your-32-character-jwt-secret
   NODE_ENV=development
   ```

4. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

## 🚀 Development

### Local Development

1. **Start development server**:
   ```bash
   npm run dev
   ```

2. **Run tests**:
   ```bash
   npm test
   ```

3. **Lint code**:
   ```bash
   npm run lint
   ```

4. **Type checking**:
   ```bash
   npm run type-check
   ```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build TypeScript code
- `npm run start` - Start production server
- `npm run deploy` - Deploy to Vercel
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Lint code
- `npm run lint:fix` - Fix linting issues
- `npm run type-check` - Type checking
- `npm run clean` - Clean build artifacts

## 📁 Project Structure

```
vercel-api/
├── api/                    # Vercel API routes
│   ├── health.ts          # Health check endpoint
│   └── publish.ts         # Main publish endpoint
├── src/                   # Source code
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts       # Main type definitions
│   ├── utils/             # Utility functions
│   │   └── env.ts         # Environment configuration
│   ├── middleware/        # Express middleware
│   ├── services/          # Business logic services
│   └── controllers/       # Request handlers
├── __tests__/             # Test files
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vercel.json            # Vercel configuration
├── .eslintrc.js           # ESLint configuration
├── .prettierrc            # Prettier configuration
└── README.md              # This file
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `WORDPRESS_URL` | Your WordPress site URL | Yes | `https://example.com` |
| `WORDPRESS_USERNAME` | WordPress username | Yes | `admin` |
| `WORDPRESS_APP_PASSWORD` | WordPress application password | Yes | `abcd 1234 efgh 5678` |
| `GPT_API_KEY` | OpenAI GPT API key | Yes | `sk-...` |
| `JWT_SECRET` | JWT secret (32+ chars) | Yes | `your-secret-key-here` |
| `NODE_ENV` | Environment mode | No | `development` |

### Vercel Configuration

The `vercel.json` file configures:
- Build settings for TypeScript
- Route handling
- Function timeouts
- Security headers
- CORS settings

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Test Structure

- **Unit Tests**: Test individual functions and utilities
- **Integration Tests**: Test API endpoints and WordPress integration
- **E2E Tests**: Test complete workflows

## 🚀 Deployment

### Deploy to Vercel

1. **Login to Vercel**:
   ```bash
   vercel login
   ```

2. **Deploy**:
   ```bash
   npm run deploy
   ```

3. **Set environment variables in Vercel dashboard**:
   - Go to your project in Vercel dashboard
   - Navigate to Settings > Environment Variables
   - Add all required environment variables

### Environment Setup

1. **Development**: Uses `.env.local` file
2. **Production**: Set environment variables in Vercel dashboard
3. **Preview**: Uses Vercel preview environment variables

## 📡 API Endpoints

### Health Check

```http
GET /api/health
```

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "environment": "production",
    "version": "1.0.0",
    "services": {
      "wordpress": {
        "url": "https://example.com",
        "configured": true
      },
      "gpt": {
        "configured": true
      }
    }
  }
}
```

### Publish Post

```http
POST /api/publish
Content-Type: application/json
Authorization: Bearer <api-key>

{
  "post": {
    "title": "Post Title",
    "content": "Post content...",
    "excerpt": "Post excerpt",
    "status": "publish",
    "categories": ["Technology"],
    "tags": ["api", "test"],
    "yoast_meta": {
      "meta_title": "SEO Title",
      "meta_description": "SEO description",
      "focus_keywords": "keyword1, keyword2"
    },
    "images": [
      {
        "url": "https://example.com/image.jpg",
        "alt_text": "Image description",
        "featured": true
      }
    ]
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "post_id": 123,
    "post_url": "https://example.com/post-123",
    "featured_image_id": 456,
    "yoast_meta": {
      "meta_title": "SEO Title",
      "meta_description": "SEO description",
      "focus_keywords": "keyword1, keyword2"
    }
  }
}
```

## 🔒 Security

### Authentication

- API key authentication for all endpoints
- JWT token validation
- Rate limiting to prevent abuse

### Input Validation

- Request body validation using Zod
- Sanitization of all inputs
- XSS and injection prevention

### Security Headers

- Content Security Policy
- X-Frame-Options
- X-XSS-Protection
- Referrer Policy
- Permissions Policy

## 🐛 Troubleshooting

### Common Issues

1. **Environment Variables Missing**:
   - Ensure all required environment variables are set
   - Check Vercel dashboard for production environment variables

2. **WordPress API Errors**:
   - Verify WordPress REST API is enabled
   - Check application password permissions
   - Ensure WordPress URL is correct

3. **TypeScript Errors**:
   - Run `npm run type-check` to identify issues
   - Ensure all types are properly defined

4. **Deployment Issues**:
   - Check Vercel build logs
   - Verify TypeScript compilation
   - Ensure all dependencies are installed

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` in your environment variables.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run linting and tests
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the troubleshooting section
- Review the API documentation
- Open an issue on GitHub
- Contact the development team 
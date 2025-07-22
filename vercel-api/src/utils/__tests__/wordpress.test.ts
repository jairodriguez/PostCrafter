import axios, { AxiosError, AxiosResponse } from 'axios';
import { WordPressClient, createWordPressClient, validateWordPressUrl, buildWordPressEndpoint, getAllPages } from '../wordpress';
import { WordPressError } from '../../types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock environment variables
jest.mock('../env', () => ({
  getEnvVars: jest.fn(() => ({
    WORDPRESS_URL: 'https://example.com',
    WORDPRESS_USERNAME: 'testuser',
    WORDPRESS_APP_PASSWORD: 'testpassword',
    WORDPRESS_TIMEOUT_MS: 30000,
  })),
  secureLog: jest.fn(),
}));

describe('WordPress API Client', () => {
  let client: WordPressClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock axios instance
    mockAxiosInstance = {
      create: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
      request: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      defaults: {
        headers: {},
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    // Create client instance
    client = new WordPressClient();
  });

  describe('WordPressClient constructor', () => {
    it('should create axios instance with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://example.com',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PostCrafter/1.0',
        },
        auth: {
          username: 'testuser',
          password: 'testpassword',
        },
      });
    });

    it('should set up request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        baseUrl: 'https://custom.com',
        username: 'customuser',
        appPassword: 'custompass',
        timeout: 60000,
        retryAttempts: 5,
        retryDelay: 2000,
      };

      new WordPressClient(customConfig);

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://custom.com',
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PostCrafter/1.0',
        },
        auth: {
          username: 'customuser',
          password: 'custompass',
        },
      });
    });
  });

  describe('GET requests', () => {
    it('should make successful GET request', async () => {
      const mockResponse: AxiosResponse = {
        data: { id: 1, title: 'Test Post' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await client.get('/wp/v2/posts/1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, title: 'Test Post' });
      expect(result.statusCode).toBe(200);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/wp/v2/posts/1',
        data: undefined,
        params: undefined,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PostCrafter/1.0',
        },
      });
    });

    it('should handle GET request with parameters', async () => {
      const mockResponse: AxiosResponse = {
        data: [{ id: 1, title: 'Post 1' }, { id: 2, title: 'Post 2' }],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const params = { per_page: 10, status: 'publish' };
      const result = await client.get('/wp/v2/posts', params);

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/wp/v2/posts',
        data: undefined,
        params,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PostCrafter/1.0',
        },
      });
    });
  });

  describe('POST requests', () => {
    it('should make successful POST request', async () => {
      const postData = {
        title: 'New Post',
        content: 'Post content',
        status: 'draft',
      };

      const mockResponse: AxiosResponse = {
        data: { id: 123, ...postData },
        status: 201,
        statusText: 'Created',
        headers: {},
        config: {} as any,
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await client.post('/wp/v2/posts', postData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 123, ...postData });
      expect(result.statusCode).toBe(201);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/wp/v2/posts',
        data: postData,
        params: undefined,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PostCrafter/1.0',
        },
      });
    });
  });

  describe('PUT requests', () => {
    it('should make successful PUT request', async () => {
      const updateData = {
        title: 'Updated Post',
        content: 'Updated content',
      };

      const mockResponse: AxiosResponse = {
        data: { id: 123, ...updateData },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await client.put('/wp/v2/posts/123', updateData);

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'PUT',
        url: '/wp/v2/posts/123',
        data: updateData,
        params: undefined,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PostCrafter/1.0',
        },
      });
    });
  });

  describe('DELETE requests', () => {
    it('should make successful DELETE request', async () => {
      const mockResponse: AxiosResponse = {
        data: { deleted: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await client.delete('/wp/v2/posts/123');

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'DELETE',
        url: '/wp/v2/posts/123',
        data: undefined,
        params: undefined,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PostCrafter/1.0',
        },
      });
    });
  });

  describe('Error handling', () => {
    it('should handle authentication errors', async () => {
      const axiosError = new AxiosError(
        'Request failed with status code 401',
        '401',
        {} as any,
        {},
        {
          status: 401,
          statusText: 'Unauthorized',
          data: { code: 'rest_forbidden', message: 'Sorry, you are not allowed to do that.' },
          headers: {},
          config: {} as any,
        }
      );

      mockAxiosInstance.request.mockRejectedValue(axiosError);

      const result = await client.get('/wp/v2/posts');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WORDPRESS_AUTHENTICATION_ERROR');
      expect(result.error?.message).toContain('WordPress authentication failed');
      expect(result.statusCode).toBe(401);
    });

    it('should handle permission errors', async () => {
      const axiosError = new AxiosError(
        'Request failed with status code 403',
        '403',
        {} as any,
        {},
        {
          status: 403,
          statusText: 'Forbidden',
          data: { code: 'rest_forbidden', message: 'Insufficient permissions' },
          headers: {},
          config: {} as any,
        }
      );

      mockAxiosInstance.request.mockRejectedValue(axiosError);

      const result = await client.post('/wp/v2/posts', {});

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WORDPRESS_PERMISSION_ERROR');
      expect(result.error?.message).toContain('Insufficient permissions');
      expect(result.statusCode).toBe(403);
    });

    it('should handle timeout errors', async () => {
      const axiosError = new AxiosError(
        'timeout of 30000ms exceeded',
        'ECONNABORTED',
        {} as any,
        {},
        {} as any
      );

      mockAxiosInstance.request.mockRejectedValue(axiosError);

      const result = await client.get('/wp/v2/posts');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WORDPRESS_TIMEOUT');
      expect(result.error?.message).toContain('WordPress API request timed out');
      expect(result.statusCode).toBe(408);
    });

    it('should handle connection errors', async () => {
      const axiosError = new AxiosError(
        'connect ECONNREFUSED',
        'ECONNREFUSED',
        {} as any,
        {},
        {} as any
      );

      mockAxiosInstance.request.mockRejectedValue(axiosError);

      const result = await client.get('/wp/v2/posts');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WORDPRESS_CONNECTION_ERROR');
      expect(result.error?.message).toContain('Unable to connect to WordPress site');
      expect(result.statusCode).toBe(503);
    });

    it('should handle rate limiting', async () => {
      const axiosError = new AxiosError(
        'Request failed with status code 429',
        '429',
        {} as any,
        {},
        {
          status: 429,
          statusText: 'Too Many Requests',
          data: { message: 'Rate limit exceeded' },
          headers: {},
          config: {} as any,
        }
      );

      mockAxiosInstance.request.mockRejectedValue(axiosError);

      const result = await client.get('/wp/v2/posts');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WORDPRESS_RATE_LIMIT');
      expect(result.error?.message).toContain('WordPress API rate limit exceeded');
      expect(result.statusCode).toBe(429);
    });
  });

  describe('Retry logic', () => {
    it('should retry on server errors', async () => {
      const serverError = new AxiosError(
        'Request failed with status code 500',
        '500',
        {} as any,
        {},
        {
          status: 500,
          statusText: 'Internal Server Error',
          data: { message: 'Server error' },
          headers: {},
          config: {} as any,
        }
      );

      const successResponse: AxiosResponse = {
        data: { id: 1, title: 'Test Post' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      // Fail twice, then succeed
      mockAxiosInstance.request
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce(successResponse);

      const result = await client.get('/wp/v2/posts/1');

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);
    });

    it('should not retry on client errors', async () => {
      const clientError = new AxiosError(
        'Request failed with status code 400',
        '400',
        {} as any,
        {},
        {
          status: 400,
          statusText: 'Bad Request',
          data: { message: 'Bad request' },
          headers: {},
          config: {} as any,
        }
      );

      mockAxiosInstance.request.mockRejectedValue(clientError);

      const result = await client.get('/wp/v2/posts');

      expect(result.success).toBe(false);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1);
    });

    it('should retry on rate limiting', async () => {
      const rateLimitError = new AxiosError(
        'Request failed with status code 429',
        '429',
        {} as any,
        {},
        {
          status: 429,
          statusText: 'Too Many Requests',
          data: { message: 'Rate limit exceeded' },
          headers: {},
          config: {} as any,
        }
      );

      const successResponse: AxiosResponse = {
        data: { id: 1, title: 'Test Post' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      // Fail once, then succeed
      mockAxiosInstance.request
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(successResponse);

      const result = await client.get('/wp/v2/posts/1');

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2);
    });
  });

  describe('Utility methods', () => {
    it('should test connection successfully', async () => {
      const mockResponse: AxiosResponse = {
        data: { routes: { '/wp/v2/': {} } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await client.testConnection();

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/wp/v2/',
        data: undefined,
        params: undefined,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PostCrafter/1.0',
        },
      });
    });

    it('should get site information', async () => {
      const mockResponse: AxiosResponse = {
        data: { routes: { '/wp/v2/': {} } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await client.getSiteInfo();

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/wp/v2/',
        data: undefined,
        params: undefined,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PostCrafter/1.0',
        },
      });
    });

    it('should get current user information', async () => {
      const mockResponse: AxiosResponse = {
        data: { id: 1, name: 'Test User', email: 'test@example.com' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await client.getCurrentUser();

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/wp/v2/users/me',
        data: undefined,
        params: undefined,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PostCrafter/1.0',
        },
      });
    });
  });

  describe('createWordPressClient', () => {
    it('should create WordPress client with default configuration', () => {
      const client = createWordPressClient();
      expect(client).toBeInstanceOf(WordPressClient);
    });

    it('should create WordPress client with custom configuration', () => {
      const customConfig = {
        baseUrl: 'https://custom.com',
        username: 'customuser',
        appPassword: 'custompass',
      };

      const client = createWordPressClient(customConfig);
      expect(client).toBeInstanceOf(WordPressClient);
    });
  });

  describe('validateWordPressUrl', () => {
    it('should validate correct HTTP URLs', () => {
      expect(validateWordPressUrl('http://example.com')).toBe(true);
      expect(validateWordPressUrl('https://example.com')).toBe(true);
      expect(validateWordPressUrl('https://example.com/wp-admin')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateWordPressUrl('not-a-url')).toBe(false);
      expect(validateWordPressUrl('ftp://example.com')).toBe(false);
      expect(validateWordPressUrl('')).toBe(false);
    });
  });

  describe('buildWordPressEndpoint', () => {
    it('should build endpoint without parameters', () => {
      expect(buildWordPressEndpoint('/wp/v2/posts')).toBe('/wp/v2/posts');
      expect(buildWordPressEndpoint('wp/v2/posts')).toBe('/wp/v2/posts');
    });

    it('should build endpoint with parameters', () => {
      const params = { per_page: 10, status: 'publish' };
      expect(buildWordPressEndpoint('/wp/v2/posts', params)).toBe('/wp/v2/posts?per_page=10&status=publish');
    });

    it('should handle undefined and null parameters', () => {
      const params = { per_page: 10, status: undefined, category: null };
      expect(buildWordPressEndpoint('/wp/v2/posts', params)).toBe('/wp/v2/posts?per_page=10');
    });
  });

  describe('getAllPages', () => {
    it('should fetch all pages of data', async () => {
      const page1Response: AxiosResponse = {
        data: [{ id: 1, title: 'Post 1' }, { id: 2, title: 'Post 2' }],
        status: 200,
        statusText: 'OK',
        headers: { 'x-wp-totalpages': '2' },
        config: {} as any,
      };

      const page2Response: AxiosResponse = {
        data: [{ id: 3, title: 'Post 3' }],
        status: 200,
        statusText: 'OK',
        headers: { 'x-wp-totalpages': '2' },
        config: {} as any,
      };

      mockAxiosInstance.request
        .mockResolvedValueOnce(page1Response)
        .mockResolvedValueOnce(page2Response);

      const result = await getAllPages(client, '/wp/v2/posts');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ id: 1, title: 'Post 1' });
      expect(result[1]).toEqual({ id: 2, title: 'Post 2' });
      expect(result[2]).toEqual({ id: 3, title: 'Post 3' });
    });

    it('should handle single page of data', async () => {
      const response: AxiosResponse = {
        data: [{ id: 1, title: 'Post 1' }],
        status: 200,
        statusText: 'OK',
        headers: { 'x-wp-totalpages': '1' },
        config: {} as any,
      };

      mockAxiosInstance.request.mockResolvedValue(response);

      const result = await getAllPages(client, '/wp/v2/posts');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: 1, title: 'Post 1' });
    });

    it('should throw error on failed request', async () => {
      const axiosError = new AxiosError(
        'Request failed with status code 500',
        '500',
        {} as any,
        {},
        {
          status: 500,
          statusText: 'Internal Server Error',
          data: { message: 'Server error' },
          headers: {},
          config: {} as any,
        }
      );

      mockAxiosInstance.request.mockRejectedValue(axiosError);

      await expect(getAllPages(client, '/wp/v2/posts')).rejects.toThrow(WordPressError);
    });
  });
}); 
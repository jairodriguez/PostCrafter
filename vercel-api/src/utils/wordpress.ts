import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { getEnvVars, secureLog } from './env';
import { WordPressError, ValidationError, WordPressErrorContext } from '../types';
import { wordPressErrorHandler } from './wordpress-error-handler';

/**
 * WordPress API client configuration
 */
export interface WordPressConfig {
  baseUrl: string;
  username: string;
  appPassword: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * WordPress API response wrapper
 */
export interface WordPressResponse<T = any> {
  success: boolean;
  data?: T;
  error?: WordPressError;
  statusCode: number;
  headers?: Record<string, string>;
}

/**
 * WordPress API request options
 */
export interface WordPressRequestOptions {
  timeout?: number;
  retryAttempts?: number;
  headers?: Record<string, string>;
  validateResponse?: boolean;
}

/**
 * WordPress API client class
 */
export class WordPressClient {
  private axiosInstance: AxiosInstance;
  private config: WordPressConfig;
  private requestId: string;

  constructor(config?: Partial<WordPressConfig>) {
    const envVars = getEnvVars();
    
    this.config = {
      baseUrl: config?.baseUrl || envVars.WORDPRESS_URL,
      username: config?.username || envVars.WORDPRESS_USERNAME,
      appPassword: config?.appPassword || envVars.WORDPRESS_APP_PASSWORD,
      timeout: config?.timeout || envVars.WORDPRESS_TIMEOUT_MS,
      retryAttempts: config?.retryAttempts || 3,
      retryDelay: config?.retryDelay || 1000,
    };

    this.requestId = `wp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create axios instance with WordPress configuration
    this.axiosInstance = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PostCrafter/1.0',
      },
      auth: {
        username: this.config.username,
        password: this.config.appPassword,
      },
    });

    // Add request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        secureLog('info', `WordPress API request started: ${config.method?.toUpperCase()} ${config.url}`, {
          requestId: this.requestId,
          method: config.method,
          url: config.url,
          timeout: config.timeout,
        });
        return config;
      },
      (error) => {
        secureLog('error', 'WordPress API request interceptor error', {
          requestId: this.requestId,
          error: error.message,
        });
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging and error handling
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        secureLog('info', `WordPress API request completed: ${response.status}`, {
          requestId: this.requestId,
          status: response.status,
          statusText: response.statusText,
          url: response.config.url,
          method: response.config.method,
        });
        return response;
      },
      (error: AxiosError) => {
        this.handleAxiosError(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Make a GET request to WordPress API
   */
  async get<T = any>(
    endpoint: string,
    params?: Record<string, any>,
    options?: WordPressRequestOptions
  ): Promise<WordPressResponse<T>> {
    try {
      const response = await this.makeRequest<T>('GET', endpoint, undefined, params, options);
      return this.formatResponse<T>(response);
    } catch (error) {
      return this.handleError<T>(error);
    }
  }

  /**
   * Make a POST request to WordPress API
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    options?: WordPressRequestOptions
  ): Promise<WordPressResponse<T>> {
    try {
      const response = await this.makeRequest<T>('POST', endpoint, data, undefined, options);
      return this.formatResponse<T>(response);
    } catch (error) {
      return this.handleError<T>(error);
    }
  }

  /**
   * Make a PUT request to WordPress API
   */
  async put<T = any>(
    endpoint: string,
    data?: any,
    options?: WordPressRequestOptions
  ): Promise<WordPressResponse<T>> {
    try {
      const response = await this.makeRequest<T>('PUT', endpoint, data, undefined, options);
      return this.formatResponse<T>(response);
    } catch (error) {
      return this.handleError<T>(error);
    }
  }

  /**
   * Make a DELETE request to WordPress API
   */
  async delete<T = any>(
    endpoint: string,
    options?: WordPressRequestOptions
  ): Promise<WordPressResponse<T>> {
    try {
      const response = await this.makeRequest<T>('DELETE', endpoint, undefined, undefined, options);
      return this.formatResponse<T>(response);
    } catch (error) {
      return this.handleError<T>(error);
    }
  }

  /**
   * Make a request with retry logic
   */
  private async makeRequest<T>(
    method: string,
    endpoint: string,
    data?: any,
    params?: Record<string, any>,
    options?: WordPressRequestOptions
  ): Promise<AxiosResponse<T>> {
    const retryConfig = wordPressErrorHandler.getRetryConfig();
    const maxRetries = options?.retryAttempts || retryConfig.maxRetries;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check circuit breaker
        if (wordPressErrorHandler.isCircuitBreakerOpen()) {
          throw new WordPressError(
            'WORDPRESS_CIRCUIT_BREAKER_OPEN',
            'WordPress API circuit breaker is open',
            503,
            'Service temporarily unavailable due to repeated failures'
          );
        }

        const config = {
          method,
          url: endpoint,
          data,
          params,
          timeout: options?.timeout || this.config.timeout,
          headers: {
            ...this.axiosInstance.defaults.headers,
            ...options?.headers,
          },
        };

        const response = await this.axiosInstance.request<T>(config);
        
        // Record success to close circuit breaker
        wordPressErrorHandler.recordSuccess();
        
        // Validate response if requested
        if (options?.validateResponse !== false) {
          this.validateResponse(response);
        }

        return response;
      } catch (error) {
        lastError = error;
        
        // Handle error through the error handler
        const wordPressError = wordPressErrorHandler.handleError(error, {
          requestId: this.requestId,
          endpoint,
          method,
          retryCount: attempt - 1
        });

        // Don't retry if error is not retryable or circuit breaker is open
        if (!wordPressErrorHandler.shouldRetry(wordPressError) || attempt === maxRetries) {
          throw wordPressError;
        }

        // Log retry attempt
        const retryDelay = wordPressErrorHandler.calculateRetryDelay(attempt);
        secureLog('warn', `WordPress API request failed, retrying (${attempt}/${maxRetries})`, {
          requestId: this.requestId,
          method,
          endpoint,
          status: wordPressError.statusCode,
          error: wordPressError.message,
          attempt,
          retryDelay,
          retryable: wordPressError.retryable
        });

        // Wait before retrying
        await this.delay(retryDelay);
      }
    }

    throw lastError!;
  }

  /**
   * Format successful response
   */
  private formatResponse<T>(response: AxiosResponse<T>): WordPressResponse<T> {
    return {
      success: true,
      data: response.data,
      statusCode: response.status,
      headers: response.headers as Record<string, string>,
    };
  }

  /**
   * Handle and format errors
   */
  private handleError<T>(error: any): WordPressResponse<T> {
    const context: WordPressErrorContext = {
      requestId: this.requestId,
      endpoint: error.config?.url,
      method: error.config?.method,
      statusCode: error.response?.status,
      responseData: error.response?.data,
      requestData: error.config?.data,
      timestamp: new Date().toISOString(),
      userAgent: 'PostCrafter/1.0'
    };

    const wordPressError = wordPressErrorHandler.handleError(error, context);
    
    return {
      success: false,
      error: {
        code: wordPressError.code,
        message: wordPressError.message,
        details: wordPressError.details,
        statusCode: wordPressError.statusCode,
      },
      statusCode: wordPressError.statusCode,
    };
  }



  /**
   * Handle Axios error in interceptor
   */
  private handleAxiosError(error: AxiosError): void {
    const statusCode = error.response?.status || 0;
    const method = error.config?.method?.toUpperCase();
    const url = error.config?.url;

    secureLog('error', 'WordPress API request failed', {
      requestId: this.requestId,
      method,
      url,
      status: statusCode,
      statusText: error.response?.statusText,
      error: error.message,
      responseData: error.response?.data,
    });
  }

  /**
   * Validate WordPress API response
   */
  private validateResponse(response: AxiosResponse): void {
    // Check for WordPress-specific error indicators
    if (response.data && typeof response.data === 'object') {
      if (response.data.error || response.data.errors) {
        throw new ValidationError(
          'WordPress API returned validation errors',
          JSON.stringify(response.data.error || response.data.errors)
        );
      }
    }
  }



  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test WordPress API connectivity
   */
  async testConnection(): Promise<WordPressResponse<any>> {
    try {
      const response = await this.get('/wp/v2/');
      return response;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get WordPress site information
   */
  async getSiteInfo(): Promise<WordPressResponse<any>> {
    try {
      const response = await this.get('/wp/v2/');
      return response;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<WordPressResponse<any>> {
    try {
      const response = await this.get('/wp/v2/users/me');
      return response;
    } catch (error) {
      return this.handleError(error);
    }
  }
}

/**
 * Create a WordPress client instance
 */
export function createWordPressClient(config?: Partial<WordPressConfig>): WordPressClient {
  return new WordPressClient(config);
}

/**
 * Utility function to validate WordPress URL
 */
export function validateWordPressUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Utility function to build WordPress API endpoint
 */
export function buildWordPressEndpoint(path: string, params?: Record<string, any>): string {
  const endpoint = path.startsWith('/') ? path : `/${path}`;
  
  if (!params || Object.keys(params).length === 0) {
    return endpoint;
  }

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  return `${endpoint}?${searchParams.toString()}`;
}

/**
 * Utility function to handle WordPress pagination
 */
export async function getAllPages<T>(
  client: WordPressClient,
  endpoint: string,
  params?: Record<string, any>
): Promise<T[]> {
  const allItems: T[] = [];
  let page = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    const response = await client.get<T[]>(endpoint, {
      ...params,
      page,
      per_page: 100, // WordPress default max
    });

    if (!response.success || !response.data) {
      throw new WordPressError(
        'WORDPRESS_PAGINATION_ERROR',
        'Failed to fetch paginated data',
        response.statusCode,
        response.error?.details
      );
    }

    allItems.push(...response.data);

    // Check if there are more pages
    const totalPages = parseInt(response.headers?.['x-wp-totalpages'] || '1');
    hasMorePages = page < totalPages;
    page++;
  }

  return allItems;
} 
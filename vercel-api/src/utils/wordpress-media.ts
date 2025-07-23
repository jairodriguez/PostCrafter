import axios from 'axios';
import { createWordPressClient, WordPressClient } from './wordpress';
import { validateImageData } from './validation';
import { secureLog } from './env';
import { 
  ImageData, 
  WordPressMediaResponse, 
  WordPressError,
  WordPressErrorType,
  WordPressResponse,
  PostCreationResult
} from '../types';
import { wordPressErrorHandler } from './wordpress-error-handler';

/**
 * Media upload configuration
 */
export interface MediaUploadConfig {
  maxFileSize: number; // in bytes
  allowedMimeTypes: string[];
  downloadTimeout: number;
  retryAttempts: number;
  enableOptimization: boolean;
  optimizationQuality: number; // 0-100
}

/**
 * Media upload result
 */
export interface MediaUploadResult {
  success: boolean;
  mediaId?: number;
  mediaUrl?: string;
  mediaData?: WordPressMediaResponse;
  error?: WordPressError;
  warnings?: string[];
  processingTime?: number;
}

/**
 * Featured image assignment result
 */
export interface FeaturedImageResult {
  success: boolean;
  postId?: number;
  mediaId?: number;
  error?: WordPressError;
}

/**
 * WordPress Media Service
 * Handles media uploads, featured image assignment, and metadata management
 */
export class WordPressMediaService {
  private client: WordPressClient;
  private config: MediaUploadConfig;
  private requestId: string;

  constructor(config?: Partial<MediaUploadConfig>) {
    this.client = createWordPressClient();
    this.requestId = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.config = {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
      downloadTimeout: 30000, // 30 seconds
      retryAttempts: 3,
      enableOptimization: true,
      optimizationQuality: 85,
      ...config
    };
  }

  /**
   * Upload image from URL
   */
  async uploadFromUrl(imageData: ImageData): Promise<MediaUploadResult> {
    const startTime = Date.now();
    
    try {
      secureLog('info', 'Starting URL-based image upload', {
        requestId: this.requestId,
        url: imageData.url,
        altText: imageData.alt_text
      });

      // Validate image data
      const validation = validateImageData(imageData);
      if (!validation.valid) {
        return {
          success: false,
          error: new WordPressError(
            WordPressErrorType.VALIDATION_ERROR,
            'Invalid image data',
            400,
            validation.error
          )
        };
      }

      // Download image from URL
      const imageBuffer = await this.downloadImageFromUrl(imageData.url!);
      
      // Determine filename and MIME type
      const filename = this.generateFilename(imageData.url!, imageData.filename);
      const mimeType = await this.detectMimeType(imageBuffer);
      
      // Validate MIME type
      if (!this.config.allowedMimeTypes.includes(mimeType)) {
        return {
          success: false,
          error: new WordPressError(
            WordPressErrorType.INVALID_CONTENT_TYPE,
            'Unsupported image format',
            400,
            `MIME type ${mimeType} is not supported`
          )
        };
      }

      // Upload to WordPress
      const uploadResult = await this.uploadToWordPress(imageBuffer, filename, mimeType, imageData);
      
      const processingTime = Date.now() - startTime;
      
      secureLog('info', 'URL-based image upload completed', {
        requestId: this.requestId,
        success: uploadResult.success,
        mediaId: uploadResult.mediaId,
        processingTime
      });

      return {
        ...uploadResult,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      secureLog('error', 'URL-based image upload failed', {
        requestId: this.requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime
      });

      return {
        success: false,
        error: wordPressErrorHandler.handleError(error),
        processingTime
      };
    }
  }

  /**
   * Upload image from base64 data
   */
  async uploadFromBase64(imageData: ImageData): Promise<MediaUploadResult> {
    const startTime = Date.now();
    
    try {
      secureLog('info', 'Starting base64 image upload', {
        requestId: this.requestId,
        hasBase64: !!imageData.base64,
        altText: imageData.alt_text
      });

      // Validate image data
      const validation = validateImageData(imageData);
      if (!validation.valid) {
        return {
          success: false,
          error: new WordPressError(
            WordPressErrorType.VALIDATION_ERROR,
            'Invalid image data',
            400,
            validation.error
          )
        };
      }

      // Decode base64 data
      const imageBuffer = this.decodeBase64Image(imageData.base64!);
      
      // Determine filename and MIME type
      const filename = this.generateFilename('base64', imageData.filename);
      const mimeType = await this.detectMimeType(imageBuffer);
      
      // Validate MIME type
      if (!this.config.allowedMimeTypes.includes(mimeType)) {
        return {
          success: false,
          error: new WordPressError(
            WordPressErrorType.INVALID_CONTENT_TYPE,
            'Unsupported image format',
            400,
            `MIME type ${mimeType} is not supported`
          )
        };
      }

      // Upload to WordPress
      const uploadResult = await this.uploadToWordPress(imageBuffer, filename, mimeType, imageData);
      
      const processingTime = Date.now() - startTime;
      
      secureLog('info', 'Base64 image upload completed', {
        requestId: this.requestId,
        success: uploadResult.success,
        mediaId: uploadResult.mediaId,
        processingTime
      });

      return {
        ...uploadResult,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      secureLog('error', 'Base64 image upload failed', {
        requestId: this.requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime
      });

      return {
        success: false,
        error: wordPressErrorHandler.handleError(error),
        processingTime
      };
    }
  }

  /**
   * Set featured image for a post
   */
  async setFeaturedImage(postId: number, mediaId: number): Promise<FeaturedImageResult> {
    try {
      secureLog('info', 'Setting featured image', {
        requestId: this.requestId,
        postId,
        mediaId
      });

      const response = await this.client.put(`/wp/v2/posts/${postId}`, {
        featured_media: mediaId
      });

      if (!response.success) {
        return {
          success: false,
          error: response.error || new WordPressError(
            WordPressErrorType.API_ERROR,
            'Failed to set featured image',
            500
          )
        };
      }

      secureLog('info', 'Featured image set successfully', {
        requestId: this.requestId,
        postId,
        mediaId
      });

      return {
        success: true,
        postId,
        mediaId
      };

    } catch (error) {
      secureLog('error', 'Failed to set featured image', {
        requestId: this.requestId,
        postId,
        mediaId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: wordPressErrorHandler.handleError(error)
      };
    }
  }

  /**
   * Update media metadata (alt text, title, caption, description)
   */
  async updateMediaMetadata(
    mediaId: number, 
    metadata: {
      alt_text?: string;
      title?: string;
      caption?: string;
      description?: string;
    }
  ): Promise<MediaUploadResult> {
    try {
      secureLog('info', 'Updating media metadata', {
        requestId: this.requestId,
        mediaId,
        metadata
      });

      const response = await this.client.put(`/wp/v2/media/${mediaId}`, metadata);

      if (!response.success) {
        return {
          success: false,
          error: response.error || new WordPressError(
            WordPressErrorType.API_ERROR,
            'Failed to update media metadata',
            500
          )
        };
      }

      secureLog('info', 'Media metadata updated successfully', {
        requestId: this.requestId,
        mediaId
      });

      return {
        success: true,
        mediaId,
        mediaData: response.data,
        mediaUrl: response.data?.source_url
      };

    } catch (error) {
      secureLog('error', 'Failed to update media metadata', {
        requestId: this.requestId,
        mediaId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: wordPressErrorHandler.handleError(error)
      };
    }
  }

  /**
   * Download image from URL
   */
  private async downloadImageFromUrl(url: string): Promise<Buffer> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: this.config.downloadTimeout,
        maxContentLength: this.config.maxFileSize,
        headers: {
          'User-Agent': 'PostCrafter/1.0'
        }
      });

      const buffer = Buffer.from(response.data);
      
      // Validate file size
      if (buffer.length > this.config.maxFileSize) {
        throw new WordPressError(
          WordPressErrorType.CONTENT_TOO_LARGE,
          'Image file too large',
          413,
          `File size ${buffer.length} bytes exceeds limit of ${this.config.maxFileSize} bytes`
        );
      }

      return buffer;

    } catch (error) {
      if (error instanceof WordPressError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new WordPressError(
            WordPressErrorType.TIMEOUT_ERROR,
            'Image download timed out',
            408,
            error.message
          );
        }
        
        if (error.response?.status === 404) {
          throw new WordPressError(
            WordPressErrorType.RESOURCE_NOT_FOUND,
            'Image not found',
            404,
            `Image at ${url} not found`
          );
        }
      }

      throw new WordPressError(
        WordPressErrorType.CONNECTION_ERROR,
        'Failed to download image',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Decode base64 image data
   */
  private decodeBase64Image(base64Data: string): Buffer {
    try {
      // Remove data URL prefix if present
      const base64String = base64Data.includes(',') 
        ? base64Data.split(',')[1] 
        : base64Data;

      const buffer = Buffer.from(base64String, 'base64');
      
      // Validate file size
      if (buffer.length > this.config.maxFileSize) {
        throw new WordPressError(
          WordPressErrorType.CONTENT_TOO_LARGE,
          'Image file too large',
          413,
          `File size ${buffer.length} bytes exceeds limit of ${this.config.maxFileSize} bytes`
        );
      }

      return buffer;

    } catch (error) {
      if (error instanceof WordPressError) {
        throw error;
      }

      throw new WordPressError(
        WordPressErrorType.VALIDATION_ERROR,
        'Invalid base64 image data',
        400,
        error instanceof Error ? error.message : 'Failed to decode base64 data'
      );
    }
  }

  /**
   * Detect MIME type from buffer
   */
  private async detectMimeType(buffer: Buffer): Promise<string> {
    // Simple MIME type detection based on file signatures
    const signatures = {
      '/9j/': 'image/jpeg',
      'iVBORw0KGgo': 'image/png',
      'R0lGODlh': 'image/gif',
      'UklGRiI': 'image/webp'
    };

    const base64 = buffer.toString('base64');
    
    for (const [signature, mimeType] of Object.entries(signatures)) {
      if (base64.startsWith(signature)) {
        return mimeType;
      }
    }

    // Fallback to default
    return 'image/jpeg';
  }

  /**
   * Generate filename for upload
   */
  private generateFilename(source: string, customFilename?: string): string {
    if (customFilename) {
      return customFilename;
    }

    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    
    if (source.startsWith('http')) {
      const url = new URL(source);
      const pathname = url.pathname;
      const extension = pathname.split('.').pop() || 'jpg';
      return `upload_${timestamp}_${random}.${extension}`;
    }

    return `upload_${timestamp}_${random}.jpg`;
  }

  /**
   * Upload image to WordPress
   */
  private async uploadToWordPress(
    imageBuffer: Buffer,
    filename: string,
    mimeType: string,
    imageData: ImageData
  ): Promise<MediaUploadResult> {
    try {
      // Create FormData for multipart upload
      const FormData = require('form-data');
      const form = new FormData();
      
      form.append('file', imageBuffer, {
        filename,
        contentType: mimeType
      });

      // Add metadata
      if (imageData.alt_text) {
        form.append('alt_text', imageData.alt_text);
      }
      if (imageData.caption) {
        form.append('caption', imageData.caption);
      }

      // Upload to WordPress
      const response = await this.client.post('/wp/v2/media', form, {
        headers: {
          ...form.getHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });

      if (!response.success) {
        return {
          success: false,
          error: response.error || new WordPressError(
            WordPressErrorType.API_ERROR,
            'Failed to upload image to WordPress',
            500
          )
        };
      }

      return {
        success: true,
        mediaId: response.data?.id,
        mediaUrl: response.data?.source_url,
        mediaData: response.data
      };

    } catch (error) {
      throw new WordPressError(
        WordPressErrorType.API_ERROR,
        'Failed to upload image to WordPress',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}

/**
 * Create WordPress media service instance
 */
export function createWordPressMediaService(config?: Partial<MediaUploadConfig>): WordPressMediaService {
  return new WordPressMediaService(config);
}

/**
 * Default media service instance
 */
export const wordPressMediaService = createWordPressMediaService(); 
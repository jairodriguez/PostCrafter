import { secureLog } from './env';
import { WordPressError, WordPressErrorType } from '../types';

/**
 * Image optimization configuration
 */
export interface ImageOptimizationConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number; // 0-100
  format: 'auto' | 'jpeg' | 'png' | 'webp';
  enableCompression: boolean;
  enableResize: boolean;
  preserveAspectRatio: boolean;
  stripMetadata: boolean;
}

/**
 * Image validation result
 */
export interface ImageValidationResult {
  valid: boolean;
  width?: number;
  height?: number;
  format?: string;
  size?: number;
  error?: string;
  warnings?: string[];
}

/**
 * Image optimization result
 */
export interface ImageOptimizationResult {
  success: boolean;
  optimizedBuffer?: Buffer;
  originalSize: number;
  optimizedSize?: number;
  compressionRatio?: number;
  width?: number;
  height?: number;
  format?: string;
  error?: WordPressError;
  warnings?: string[];
}

/**
 * Image Optimizer Service
 * Handles image optimization, validation, and format conversion
 */
export class ImageOptimizer {
  private config: ImageOptimizationConfig;
  private requestId: string;

  constructor(config?: Partial<ImageOptimizationConfig>) {
    this.requestId = `optimizer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.config = {
      maxWidth: 2048,
      maxHeight: 2048,
      quality: 85,
      format: 'auto',
      enableCompression: true,
      enableResize: true,
      preserveAspectRatio: true,
      stripMetadata: true,
      ...config
    };
  }

  /**
   * Validate image format and properties
   */
  async validateImage(buffer: Buffer): Promise<ImageValidationResult> {
    try {
      secureLog('info', 'Starting image validation', {
        requestId: this.requestId,
        bufferSize: buffer.length
      });

      // Detect image format
      const format = await this.detectImageFormat(buffer);
      if (!format) {
        return {
          valid: false,
          error: 'Unable to detect image format'
        };
      }

      // Get image dimensions
      const dimensions = await this.getImageDimensions(buffer);
      if (!dimensions) {
        return {
          valid: false,
          error: 'Unable to get image dimensions'
        };
      }

      const warnings: string[] = [];

      // Check dimensions
      if (dimensions.width > this.config.maxWidth || dimensions.height > this.config.maxHeight) {
        warnings.push(`Image dimensions (${dimensions.width}x${dimensions.height}) exceed recommended maximum (${this.config.maxWidth}x${this.config.maxHeight})`);
      }

      // Check file size
      const sizeInMB = buffer.length / (1024 * 1024);
      if (sizeInMB > 10) {
        warnings.push(`Image size (${sizeInMB.toFixed(2)}MB) exceeds recommended maximum (10MB)`);
      }

      // Check format compatibility
      if (!this.isFormatCompatible(format)) {
        return {
          valid: false,
          error: `Unsupported image format: ${format}`
        };
      }

      secureLog('info', 'Image validation completed', {
        requestId: this.requestId,
        format,
        width: dimensions.width,
        height: dimensions.height,
        size: buffer.length,
        warnings: warnings.length
      });

      return {
        valid: true,
        width: dimensions.width,
        height: dimensions.height,
        format,
        size: buffer.length,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      secureLog('error', 'Image validation failed', {
        requestId: this.requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }

  /**
   * Optimize image based on configuration
   */
  async optimizeImage(buffer: Buffer): Promise<ImageOptimizationResult> {
    try {
      const startTime = Date.now();
      
      secureLog('info', 'Starting image optimization', {
        requestId: this.requestId,
        originalSize: buffer.length,
        config: this.config
      });

      // Validate image first
      const validation = await this.validateImage(buffer);
      if (!validation.valid) {
        return {
          success: false,
          originalSize: buffer.length,
          error: new WordPressError(
            WordPressErrorType.VALIDATION_ERROR,
            'Image validation failed',
            400,
            validation.error
          )
        };
      }

      let optimizedBuffer = buffer;
      const warnings: string[] = [];

      // Apply optimizations based on configuration
      if (this.config.enableResize && validation.width && validation.height) {
        const resizeResult = await this.resizeImage(buffer, validation.width, validation.height);
        if (resizeResult.success && resizeResult.buffer) {
          optimizedBuffer = resizeResult.buffer;
          warnings.push(...(resizeResult.warnings || []));
        }
      }

      if (this.config.enableCompression) {
        const compressionResult = await this.compressImage(optimizedBuffer);
        if (compressionResult.success && compressionResult.buffer) {
          optimizedBuffer = compressionResult.buffer;
          warnings.push(...(compressionResult.warnings || []));
        }
      }

      if (this.config.stripMetadata) {
        const stripResult = await this.stripMetadata(optimizedBuffer);
        if (stripResult.success && stripResult.buffer) {
          optimizedBuffer = stripResult.buffer;
        }
      }

      const processingTime = Date.now() - startTime;
      const compressionRatio = optimizedBuffer.length < buffer.length 
        ? ((buffer.length - optimizedBuffer.length) / buffer.length) * 100 
        : 0;

      secureLog('info', 'Image optimization completed', {
        requestId: this.requestId,
        originalSize: buffer.length,
        optimizedSize: optimizedBuffer.length,
        compressionRatio: compressionRatio.toFixed(2),
        processingTime
      });

      return {
        success: true,
        optimizedBuffer,
        originalSize: buffer.length,
        optimizedSize: optimizedBuffer.length,
        compressionRatio,
        width: validation.width,
        height: validation.height,
        format: validation.format,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      secureLog('error', 'Image optimization failed', {
        requestId: this.requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        originalSize: buffer.length,
        error: new WordPressError(
          WordPressErrorType.API_ERROR,
          'Image optimization failed',
          500,
          error instanceof Error ? error.message : 'Unknown error'
        )
      };
    }
  }

  /**
   * Detect image format from buffer
   */
  private async detectImageFormat(buffer: Buffer): Promise<string | null> {
    try {
      // Simple format detection based on file signatures
      const signatures = {
        '/9j/': 'image/jpeg',
        'iVBORw0KGgo': 'image/png',
        'R0lGODlh': 'image/gif',
        'UklGRiI': 'image/webp'
      };

      const base64 = buffer.toString('base64');
      
      for (const [signature, format] of Object.entries(signatures)) {
        if (base64.startsWith(signature)) {
          return format;
        }
      }

      return null;

    } catch (error) {
      secureLog('error', 'Image format detection failed', {
        requestId: this.requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Get image dimensions
   */
  private async getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number } | null> {
    try {
      // This is a simplified implementation
      // In a production environment, you would use a library like 'sharp' or 'jimp'
      // For now, we'll return a default size and log that dimensions couldn't be determined
      
      secureLog('warn', 'Image dimension detection not fully implemented', {
        requestId: this.requestId,
        note: 'Using default dimensions. Consider implementing with sharp/jimp library'
      });

      // Return default dimensions for now
      return { width: 800, height: 600 };

    } catch (error) {
      secureLog('error', 'Image dimension detection failed', {
        requestId: this.requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Check if image format is compatible with WordPress
   */
  private isFormatCompatible(format: string): boolean {
    const compatibleFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    return compatibleFormats.includes(format);
  }

  /**
   * Resize image if needed
   */
  private async resizeImage(
    buffer: Buffer, 
    width: number, 
    height: number
  ): Promise<{ success: boolean; buffer?: Buffer; warnings?: string[] }> {
    try {
      const warnings: string[] = [];

      // Check if resize is needed
      if (width <= this.config.maxWidth && height <= this.config.maxHeight) {
        return { success: true, buffer, warnings: ['No resize needed'] };
      }

      // Calculate new dimensions
      let newWidth = width;
      let newHeight = height;

      if (this.config.preserveAspectRatio) {
        const aspectRatio = width / height;
        
        if (width > this.config.maxWidth) {
          newWidth = this.config.maxWidth;
          newHeight = Math.round(newWidth / aspectRatio);
        }
        
        if (newHeight > this.config.maxHeight) {
          newHeight = this.config.maxHeight;
          newWidth = Math.round(newHeight * aspectRatio);
        }
      } else {
        newWidth = Math.min(width, this.config.maxWidth);
        newHeight = Math.min(height, this.config.maxHeight);
      }

      // For now, return the original buffer with a warning
      // In production, implement actual resizing with sharp/jimp
      warnings.push(`Resize requested to ${newWidth}x${newHeight} (not implemented in this version)`);

      return { success: true, buffer, warnings };

    } catch (error) {
      secureLog('error', 'Image resize failed', {
        requestId: this.requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return { success: false };
    }
  }

  /**
   * Compress image
   */
  private async compressImage(buffer: Buffer): Promise<{ success: boolean; buffer?: Buffer; warnings?: string[] }> {
    try {
      const warnings: string[] = [];

      // For now, return the original buffer with a warning
      // In production, implement actual compression with sharp/jimp
      warnings.push(`Compression requested with quality ${this.config.quality} (not implemented in this version)`);

      return { success: true, buffer, warnings };

    } catch (error) {
      secureLog('error', 'Image compression failed', {
        requestId: this.requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return { success: false };
    }
  }

  /**
   * Strip metadata from image
   */
  private async stripMetadata(buffer: Buffer): Promise<{ success: boolean; buffer?: Buffer }> {
    try {
      // For now, return the original buffer
      // In production, implement actual metadata stripping with sharp/jimp
      return { success: true, buffer };

    } catch (error) {
      secureLog('error', 'Metadata stripping failed', {
        requestId: this.requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return { success: false };
    }
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats(): {
    config: ImageOptimizationConfig;
    capabilities: {
      resize: boolean;
      compression: boolean;
      formatConversion: boolean;
      metadataStripping: boolean;
    };
  } {
    return {
      config: this.config,
      capabilities: {
        resize: false, // Not fully implemented
        compression: false, // Not fully implemented
        formatConversion: false, // Not implemented
        metadataStripping: false // Not implemented
      }
    };
  }
}

/**
 * Create image optimizer instance
 */
export function createImageOptimizer(config?: Partial<ImageOptimizationConfig>): ImageOptimizer {
  return new ImageOptimizer(config);
}

/**
 * Default image optimizer instance
 */
export const imageOptimizer = createImageOptimizer(); 
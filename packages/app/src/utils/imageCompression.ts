/**
 * Image Compression Utility
 * Compresses and resizes images to reduce file size
 */

export interface CompressionOptions {
  /** Maximum width in pixels (default: 1920) */
  maxWidth?: number;
  /** Maximum height in pixels (default: 1080) */
  maxHeight?: number;
  /** Quality 0-1 (default: 0.8) */
  quality?: number;
}

/**
 * Compress an image blob to reduce file size
 * Maintains aspect ratio and converts to JPEG
 *
 * @param blob - Original image blob
 * @param options - Compression settings
 * @returns Compressed image blob
 *
 * @example
 * ```typescript
 * const compressed = await compressImage(photoBlob, {
 *   maxWidth: 1920,
 *   maxHeight: 1080,
 *   quality: 0.8
 * });
 * console.log(`Reduced from ${photoBlob.size} to ${compressed.size} bytes`);
 * ```
 */
export async function compressImage(
  blob: Blob,
  options: CompressionOptions = {},
): Promise<Blob> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      try {
        // Calculate new dimensions (maintain aspect ratio)
        let { width, height } = img;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Round dimensions to integers
        width = Math.round(width);
        height = Math.round(height);

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (compressedBlob) => {
            URL.revokeObjectURL(url);

            if (compressedBlob) {
              console.log(
                `[Image Compression] ${blob.size} → ${compressedBlob.size} bytes ` +
                `(${Math.round((1 - compressedBlob.size / blob.size) * 100)}% reduction)`,
              );
              resolve(compressedBlob);
            } else {
              reject(new Error('Compression failed'));
            }
          },
          'image/jpeg',
          quality,
        );
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Generate a thumbnail from an image blob
 *
 * @param blob - Original image blob
 * @param size - Thumbnail size (default: 200px)
 * @returns Thumbnail blob
 */
export async function generateThumbnail(
  blob: Blob,
  size: number = 200,
): Promise<Blob> {
  return compressImage(blob, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.7,
  });
}

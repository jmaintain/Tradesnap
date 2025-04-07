/**
 * Utility functions for image compression and handling
 */

/**
 * Compresses an image to a target size (approximately)
 * 
 * @param imageDataUrl - The original image as a data URL
 * @param targetSizeKB - Target size in kilobytes (default 100KB)
 * @param maxWidth - Maximum width of the resulting image (default 1200px)
 * @returns A promise that resolves to the compressed image as a data URL
 */
export const compressImage = async (
  imageDataUrl: string, 
  targetSizeKB: number = 100, 
  maxWidth: number = 1200
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Create an image element to load the data URL
    const img = new Image();
    img.onload = () => {
      // Start with a quality of 0.9
      let quality = 0.9;
      let canvas: HTMLCanvasElement;
      let ctx: CanvasRenderingContext2D | null;
      let dataUrl: string;
      
      // Calculate new dimensions while maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      
      // If the image is larger than maxWidth, scale it down
      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = Math.floor(height * ratio);
      }
      
      // Create a canvas with the new dimensions
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Draw the image on the canvas
      ctx.drawImage(img, 0, 0, width, height);
      
      // Try to compress the image with decreasing quality until target size is reached
      const targetSizeBytes = targetSizeKB * 1024;
      
      const compressWithQuality = (q: number) => {
        dataUrl = canvas.toDataURL('image/jpeg', q);
        
        // Calculate size in bytes
        // dataUrl format: data:image/jpeg;base64,/9j/4AAQSkZJRg...
        const base64str = dataUrl.split(',')[1];
        const sizeInBytes = Math.round((base64str.length * 3) / 4);
        
        console.log(`Compressed image to ${Math.round(sizeInBytes / 1024)}KB with quality ${q}`);
        
        if (sizeInBytes <= targetSizeBytes || q <= 0.1) {
          // We've reached target size or minimum quality
          resolve(dataUrl);
        } else {
          // Reduce quality and try again
          quality -= 0.1;
          compressWithQuality(quality);
        }
      };
      
      // Start compression with initial quality
      compressWithQuality(quality);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageDataUrl;
  });
};

/**
 * Converts a File object to a data URL
 * 
 * @param file - The file to convert
 * @returns A promise that resolves to the data URL
 */
export const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to data URL'));
      }
    };
    reader.onerror = () => {
      reject(reader.error);
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Processes and compresses an image file
 * 
 * @param file - The image file to process
 * @param targetSizeKB - Target size in kilobytes 
 * @returns A promise that resolves to the compressed image as a data URL
 */
export const processImageFile = async (file: File, targetSizeKB: number = 100): Promise<string> => {
  try {
    // Check if the file is already small enough
    if (file.size <= targetSizeKB * 1024) {
      // Convert to data URL and return without compression
      return await fileToDataURL(file);
    }
    
    // Convert file to data URL
    const dataUrl = await fileToDataURL(file);
    
    // Compress the image
    return await compressImage(dataUrl, targetSizeKB);
  } catch (error) {
    console.error('Error processing image file:', error);
    throw error;
  }
};
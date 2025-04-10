/**
 * Utility functions for processing images
 */

import { compressImage, fileToDataURL } from './imageCompression';

/**
 * Process an image file by compressing it
 * @param file The image file to process
 * @returns A new File object with the compressed image
 */
export async function processImageFile(file: File): Promise<File> {
  try {
    // If the file is already small (less than 100KB), return it as is
    if (file.size <= 100 * 1024) {
      return file;
    }

    // Convert file to data URL
    const dataUrl = await fileToDataURL(file);
    
    // Compress the image to target size (100KB)
    const compressedDataUrl = await compressImage(dataUrl, 100);
    
    // Convert the compressed data URL back to a file
    const response = await fetch(compressedDataUrl);
    const blob = await response.blob();
    
    // Create a new file with the original name but compressed content
    return new File([blob], file.name, { 
      type: 'image/jpeg',
      lastModified: new Date().getTime() 
    });
  } catch (error) {
    console.error('Error processing image file:', error);
    throw error;
  }
}
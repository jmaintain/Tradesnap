/**
 * Utility functions for processing images
 */

/**
 * Process an image file by compressing it
 * @param file The image file to process
 * @returns A new File object with the compressed image
 */
export async function processImageFile(file: File): Promise<File> {
  // Return a promise that resolves with the processed file
  return new Promise((resolve, reject) => {
    // If the file is not an image, return it as is
    if (!file.type.startsWith('image/')) {
      return resolve(file);
    }

    // Create a new FileReader
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    // When the reader loads the file
    reader.onload = (event) => {
      // Create a new Image element
      const img = new Image();
      
      // When the image loads
      img.onload = () => {
        // Create a canvas element
        const canvas = document.createElement('canvas');
        
        // Set the canvas dimensions
        // Max dimensions of 1200px width/height while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 1200;
        
        if (width > height && width > MAX_SIZE) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw the image on the canvas
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert the canvas to a data URL (JPEG at 85% quality)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          
          // Convert the data URL to a Blob
          fetch(dataUrl)
            .then(res => res.blob())
            .then(blob => {
              // Create a new File object with the processed image
              const processedFile = new File(
                [blob], 
                file.name.replace(/\.[^/.]+$/, ".jpg"), 
                { type: 'image/jpeg' }
              );
              
              // Resolve the promise with the processed file
              resolve(processedFile);
            })
            .catch(err => {
              console.error('Error processing image:', err);
              reject(err);
            });
        } else {
          reject(new Error('Could not get canvas context'));
        }
      };
      
      // If there's an error loading the image
      img.onerror = (error) => {
        console.error('Error loading image:', error);
        reject(error);
      };
      
      // Set the image source to the data URL
      img.src = event.target?.result as string;
    };
    
    // If there's an error reading the file
    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      reject(error);
    };
  });
}
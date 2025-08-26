import { DetectedFace } from './FaceDetection';
import { CensorType } from './CensorOptions';

export const processImage = (
  originalImage: HTMLImageElement,
  faces: DetectedFace[],
  censorType: CensorType
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not get canvas context');
  
  // Set canvas size to match original image
  canvas.width = originalImage.naturalWidth;
  canvas.height = originalImage.naturalHeight;
  
  // Draw original image
  ctx.drawImage(originalImage, 0, 0);
  
  // Apply censoring to each detected face
  faces.forEach(face => {
    applyCensoring(ctx, face, censorType);
  });
  
  return canvas;
};

const applyCensoring = (
  ctx: CanvasRenderingContext2D, 
  face: DetectedFace, 
  censorType: CensorType
) => {
  const { x, y, width, height } = face;
  
  switch (censorType) {
    case 'black-square':
      ctx.fillStyle = '#000000';
      ctx.fillRect(x, y, width, height);
      break;
      
    case 'eye-bar':
      const eyeBarHeight = height * 0.3;
      const eyeBarY = y + height * 0.25;
      ctx.fillStyle = '#000000';
      ctx.fillRect(x, eyeBarY, width, eyeBarHeight);
      break;
      
    case 'pixelated-eyes':
      const eyeRegionHeight = height * 0.4;
      const eyeRegionY = y + height * 0.2;
      pixelateRegion(ctx, x, eyeRegionY, width, eyeRegionHeight, 8);
      break;
      
    case 'pixelated-face':
      pixelateRegion(ctx, x, y, width, height, 12);
      break;
  }
};

const pixelateRegion = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  pixelSize: number
) => {
  // Get the image data for the region
  const imageData = ctx.getImageData(x, y, width, height);
  const data = imageData.data;
  
  // Pixelate by averaging colors in blocks
  for (let blockY = 0; blockY < height; blockY += pixelSize) {
    for (let blockX = 0; blockX < width; blockX += pixelSize) {
      let r = 0, g = 0, b = 0, a = 0;
      let count = 0;
      
      // Average the colors in this block
      for (let py = blockY; py < Math.min(blockY + pixelSize, height); py++) {
        for (let px = blockX; px < Math.min(blockX + pixelSize, width); px++) {
          const idx = (py * width + px) * 4;
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          a += data[idx + 3];
          count++;
        }
      }
      
      if (count > 0) {
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        a = Math.round(a / count);
        
        // Fill the entire block with the average color
        for (let py = blockY; py < Math.min(blockY + pixelSize, height); py++) {
          for (let px = blockX; px < Math.min(blockX + pixelSize, width); px++) {
            const idx = (py * width + px) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = a;
          }
        }
      }
    }
  }
  
  // Put the pixelated data back
  ctx.putImageData(imageData, x, y);
};
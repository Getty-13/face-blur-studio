import { DetectedFace } from './FaceDetection';
import { CensorType } from './CensorOptions';

export const processImage = (
  originalImage: HTMLImageElement,
  faces: DetectedFace[],
  censorType: CensorType,
  pixelIntensity: number = 12,
  sortIntensity: number = 50
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
    applyCensoring(ctx, face, censorType, pixelIntensity, sortIntensity);
  });
  
  return canvas;
};

const applyCensoring = (
  ctx: CanvasRenderingContext2D, 
  face: DetectedFace, 
  censorType: CensorType,
  pixelIntensity: number = 12,
  sortIntensity: number = 50
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
      pixelateRegion(ctx, x, eyeRegionY, width, eyeRegionHeight, pixelIntensity);
      break;
      
    case 'pixelated-face':
      pixelateRegion(ctx, x, y, width, height, pixelIntensity);
      break;
      
    case 'pixel-sort':
      pixelSortRegion(ctx, x, y, width, height, sortIntensity);
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
  // Ensure we're working with integer coordinates
  x = Math.round(x);
  y = Math.round(y);
  width = Math.round(width);
  height = Math.round(height);
  
  // Get the image data for the region with proper bounds checking
  const imageData = ctx.getImageData(x, y, width, height);
  const data = imageData.data;
  
  // Pixelate by averaging colors in blocks
  for (let blockY = 0; blockY < height; blockY += pixelSize) {
    for (let blockX = 0; blockX < width; blockX += pixelSize) {
      let r = 0, g = 0, b = 0, a = 0;
      let count = 0;
      
      // Calculate actual block bounds to prevent overflow
      const blockWidth = Math.min(pixelSize, width - blockX);
      const blockHeight = Math.min(pixelSize, height - blockY);
      
      // Average the colors in this block
      for (let py = blockY; py < blockY + blockHeight; py++) {
        for (let px = blockX; px < blockX + blockWidth; px++) {
          const idx = (py * width + px) * 4;
          if (idx >= 0 && idx + 3 < data.length) {
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            a += data[idx + 3];
            count++;
          }
        }
      }
      
      if (count > 0) {
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        a = Math.round(a / count);
        
        // Fill the entire block with the average color
        for (let py = blockY; py < blockY + blockHeight; py++) {
          for (let px = blockX; px < blockX + blockWidth; px++) {
            const idx = (py * width + px) * 4;
            if (idx >= 0 && idx + 3 < data.length) {
              data[idx] = r;
              data[idx + 1] = g;
              data[idx + 2] = b;
              data[idx + 3] = a;
            }
          }
        }
      }
    }
  }
  
  // Put the pixelated data back
  ctx.putImageData(imageData, x, y);
};

const pixelSortRegion = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  intensity: number
) => {
  const imageData = ctx.getImageData(x, y, width, height);
  const data = imageData.data;
  
  const sortLength = Math.round((intensity / 100) * width);
  
  // Sort pixels horizontally
  for (let row = 0; row < height; row += 2) {
    for (let col = 0; col < width; col += sortLength) {
      const sortWidth = Math.min(sortLength, width - col);
      const pixels: Array<{r: number, g: number, b: number, a: number, brightness: number}> = [];
      
      // Extract pixels to sort
      for (let i = 0; i < sortWidth; i++) {
        const idx = (row * width + col + i) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
        pixels.push({ r, g, b, a, brightness });
      }
      
      // Sort by brightness
      pixels.sort((a, b) => a.brightness - b.brightness);
      
      // Put sorted pixels back
      for (let i = 0; i < sortWidth; i++) {
        const idx = (row * width + col + i) * 4;
        data[idx] = pixels[i].r;
        data[idx + 1] = pixels[i].g;
        data[idx + 2] = pixels[i].b;
        data[idx + 3] = pixels[i].a;
      }
    }
  }
  
  ctx.putImageData(imageData, x, y);
};
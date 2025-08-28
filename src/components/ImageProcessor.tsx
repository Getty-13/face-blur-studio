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
      
    case 'wireframe':
      drawWireframeOverlay(ctx, face);
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
  
  // Create vertical columns for sorting (like the reference image)
  const columnWidth = Math.max(1, Math.round(2 + (intensity / 100) * 8)); // Thicker columns at higher intensity
  const sortHeight = Math.round((intensity / 100) * height * 0.9); // How much of each column to sort
  
  for (let col = 0; col < width; col += columnWidth) {
    const actualColumnWidth = Math.min(columnWidth, width - col);
    
    // Sort each column
    for (let colOffset = 0; colOffset < actualColumnWidth; colOffset++) {
      const currentCol = col + colOffset;
      if (currentCol >= width) break;
      
      // Create segments to sort within the column
      for (let segmentStart = 0; segmentStart < height; segmentStart += sortHeight) {
        const segmentEnd = Math.min(segmentStart + sortHeight, height);
        const segmentHeight = segmentEnd - segmentStart;
        
        if (segmentHeight < 2) continue;
        
        const pixels: Array<{r: number, g: number, b: number, a: number, hue: number}> = [];
        
        // Extract pixels from this segment
        for (let row = segmentStart; row < segmentEnd; row++) {
          const idx = (row * width + currentCol) * 4;
          if (idx >= 0 && idx + 3 < data.length) {
            const r = data[idx] / 255;
            const g = data[idx + 1] / 255;
            const b = data[idx + 2] / 255;
            const a = data[idx + 3];
            
            // Convert to HSL for hue-based sorting
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const diff = max - min;
            
            let hue = 0;
            if (diff !== 0) {
              if (max === r) {
                hue = ((g - b) / diff) % 6;
              } else if (max === g) {
                hue = (b - r) / diff + 2;
              } else {
                hue = (r - g) / diff + 4;
              }
            }
            hue = hue * 60;
            if (hue < 0) hue += 360;
            
            pixels.push({ 
              r: data[idx], 
              g: data[idx + 1], 
              b: data[idx + 2], 
              a, 
              hue 
            });
          }
        }
        
        // Sort by hue for colorful vertical stripes effect
        pixels.sort((a, b) => a.hue - b.hue);
        
        // Put sorted pixels back
        for (let i = 0; i < pixels.length; i++) {
          const row = segmentStart + i;
          const idx = (row * width + currentCol) * 4;
          if (idx >= 0 && idx + 3 < data.length) {
            data[idx] = pixels[i].r;
            data[idx + 1] = pixels[i].g;
            data[idx + 2] = pixels[i].b;
            data[idx + 3] = pixels[i].a;
          }
        }
      }
    }
  }
  
  ctx.putImageData(imageData, x, y);
};

const drawWireframeOverlay = (
  ctx: CanvasRenderingContext2D,
  face: DetectedFace
) => {
  if (!face.landmarks || face.landmarks.length === 0) return;
  
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 1;
  ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
  
  const landmarks = face.landmarks;
  
  // Draw triangular mesh by connecting nearby points
  for (let i = 0; i < landmarks.length; i++) {
    for (let j = i + 1; j < landmarks.length; j++) {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      const distance = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
      
      // Only connect points that are reasonably close
      if (distance < face.width * 0.3) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
  }
  
  // Draw landmark points
  landmarks.forEach(point => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });
};
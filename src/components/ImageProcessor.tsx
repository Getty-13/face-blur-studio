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
      // Use landmarks if available for precise eye positioning
      if (face.landmarks && face.landmarks.length > 0) {
        // Find eye landmarks (typically the first few points are eyes)
        const eyeLandmarks = face.landmarks.slice(0, 6); // Get first 6 landmarks which include eyes
        
        if (eyeLandmarks.length >= 2) {
          // Calculate eye region bounds from landmarks
          const eyeYPositions = eyeLandmarks.map(p => p.y);
          const minEyeY = Math.min(...eyeYPositions);
          const maxEyeY = Math.max(...eyeYPositions);
          
          // Add some padding around the eye area
          const eyePadding = height * 0.05;
          const eyeBarY = minEyeY - eyePadding;
          const eyeBarHeight = (maxEyeY - minEyeY) + (eyePadding * 2);
          
          ctx.fillStyle = '#000000';
          ctx.fillRect(x, eyeBarY, width, eyeBarHeight);
        } else {
          // Fallback to proportional positioning
          const eyeBarHeight = height * 0.25;
          const eyeBarY = y + height * 0.3;
          ctx.fillStyle = '#000000';
          ctx.fillRect(x, eyeBarY, width, eyeBarHeight);
        }
      } else {
        // Fallback when no landmarks available
        const eyeBarHeight = height * 0.25;
        const eyeBarY = y + height * 0.3;
        ctx.fillStyle = '#000000';
        ctx.fillRect(x, eyeBarY, width, eyeBarHeight);
      }
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
      
    case 'show-landmarks':
      drawLandmarksOnly(ctx, face);
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

// Enhanced pixel sorting based on lenssort/pixelsort Python library approach
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
  
  // Process each row of pixels (horizontal sorting like in Python version)
  for (let row = 0; row < height; row++) {
    // Random chance to sort this row based on intensity
    if (Math.random() * 100 > intensity) {
      continue; // Skip this row
    }
    
    // Pick random start and end points for sorting within the row
    const minSort = Math.max(3, Math.floor(Math.random() * (width * 0.3)));
    const maxSort = Math.min(width - 1, minSort + Math.floor(Math.random() * (width - minSort)));
    
    if (maxSort - minSort < 3) continue; // Skip if segment too small
    
    // Extract pixels from this row segment
    const rowPixels: Array<{r: number, g: number, b: number, a: number, brightness: number}> = [];
    for (let col = minSort; col < maxSort; col++) {
      const pixelIndex = (row * width + col) * 4;
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];
      const a = data[pixelIndex + 3];
      
      rowPixels.push({
        r, g, b, a,
        brightness: r + g + b // Python version sorts by R + G + B
      });
    }
    
    // Sort pixels by brightness (same as Python quicksort approach)
    rowPixels.sort((a, b) => a.brightness - b.brightness);
    
    // Put sorted pixels back
    for (let i = 0; i < rowPixels.length; i++) {
      const col = minSort + i;
      const pixelIndex = (row * width + col) * 4;
      const sortedPixel = rowPixels[i];
      
      data[pixelIndex] = sortedPixel.r;
      data[pixelIndex + 1] = sortedPixel.g;
      data[pixelIndex + 2] = sortedPixel.b;
      data[pixelIndex + 3] = sortedPixel.a;
    }
  }
  
  ctx.putImageData(imageData, x, y);
};

const drawLandmarksOnly = (
  ctx: CanvasRenderingContext2D,
  face: DetectedFace
) => {
  if (!face.landmarks || face.landmarks.length === 0) {
    // If no landmarks, draw a simple indicator showing the face bounds
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(face.x, face.y, face.width, face.height);
    ctx.setLineDash([]);
    
    // Add text indicating no landmarks
    ctx.fillStyle = '#ff0000';
    ctx.font = '12px Arial';
    ctx.fillText('No landmarks detected', face.x + 5, face.y + 15);
    return;
  }
  
  const landmarks = face.landmarks;
  
  // Draw landmark points with different colors and sizes for better visibility
  landmarks.forEach((point, index) => {
    // Color code different landmark groups
    let color = '#00ff00'; // Default green
    let size = 3;
    
    if (index < 6) {
      color = '#ff0000'; // Red for eye area landmarks
      size = 4;
    } else if (index < 12) {
      color = '#0000ff'; // Blue for nose area
      size = 3;
    } else {
      color = '#ffff00'; // Yellow for mouth area
      size = 3;
    }
    
    // Draw a circle for each landmark
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
    ctx.fill();
    
    // Add a small outline for better visibility
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Add landmark number for debugging
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px Arial';
    ctx.fillText(index.toString(), point.x + 5, point.y - 5);
  });
  
  // Draw face bounding box for reference
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);
  ctx.strokeRect(face.x, face.y, face.width, face.height);
  ctx.setLineDash([]);
  
  // Add face info text
  ctx.fillStyle = '#00ff00';
  ctx.font = '10px Arial';
  ctx.fillText(`Face: ${landmarks.length} landmarks`, face.x, face.y - 5);
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
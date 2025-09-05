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
      drawRotatedEyeBar(ctx, face, width, height);
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
      
    case 'pixelsort-eye-bar':
      pixelSortEyeRegion(ctx, face, sortIntensity);
      break;
      
    case 'wireframe':
      drawWireframeOverlay(ctx, face);
      break;
      
    case 'blur-face':
      blurRegion(ctx, x, y, width, height, 8);
      break;
      
    case 'blur-eyes':
      const blurEyeRegionHeight = height * 0.4;
      const blurEyeRegionY = y + height * 0.2;
      blurRegion(ctx, x, blurEyeRegionY, width, blurEyeRegionHeight, 6);
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

// True lenssort/pixelsort horizontal streaking effect
const pixelSortRegion = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  intensity: number
) => {
  // Round and clamp region to integer pixel grid
  const ix = Math.max(0, Math.floor(x));
  const iy = Math.max(0, Math.floor(y));
  const iw = Math.max(1, Math.floor(width));
  const ih = Math.max(1, Math.floor(height));

  const imageData = ctx.getImageData(ix, iy, iw, ih);
  const data = imageData.data;
  
  // Convert intensity to useful parameters
  const brightnessThreshold = 60 + (intensity * 0.6); // Dynamic threshold based on intensity
  const rowStep = Math.max(1, Math.floor(4 - (intensity / 30))); // Process more rows at higher intensity
  
  // Process rows with horizontal streaking effect
  for (let row = 0; row < ih; row += rowStep) {
    // Extract entire row of pixels
    const rowPixels: Array<{r: number, g: number, b: number, a: number, brightness: number, originalIndex: number}> = [];
    
    for (let col = 0; col < iw; col++) {
      const pixelIndex = (row * iw + col) * 4;
      if (pixelIndex + 3 < data.length) {
        const r = data[pixelIndex];
        const g = data[pixelIndex + 1];
        const b = data[pixelIndex + 2];
        const a = data[pixelIndex + 3];
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
        
        rowPixels.push({
          r, g, b, a, brightness,
          originalIndex: col
        });
      }
    }
    
    if (rowPixels.length === 0) continue;
    
    // Find intervals to sort based on brightness thresholds (lenssort approach)
    const intervals: Array<{start: number, end: number}> = [];
    let intervalStart = -1;
    
    for (let i = 0; i < rowPixels.length; i++) {
      const pixel = rowPixels[i];
      const shouldSort = pixel.brightness > brightnessThreshold || 
                        pixel.brightness < (255 - brightnessThreshold);
      
      if (shouldSort && intervalStart === -1) {
        intervalStart = i;
      } else if (!shouldSort && intervalStart !== -1) {
        // End of interval
        if (i - intervalStart > 5) { // Only sort if interval is meaningful
          intervals.push({start: intervalStart, end: i - 1});
        }
        intervalStart = -1;
      }
    }
    
    // Close final interval if needed
    if (intervalStart !== -1 && rowPixels.length - intervalStart > 5) {
      intervals.push({start: intervalStart, end: rowPixels.length - 1});
    }
    
    // If no natural intervals found, create some based on intensity
    if (intervals.length === 0 && intensity > 30) {
      const segmentSize = Math.floor(iw * (intensity / 200)); // Smaller segments at lower intensity
      for (let start = 0; start < rowPixels.length - segmentSize; start += segmentSize * 2) {
        intervals.push({
          start: start,
          end: Math.min(start + segmentSize, rowPixels.length - 1)
        });
      }
    }
    
    // Sort each interval by brightness to create horizontal streaks
    intervals.forEach(interval => {
      if (interval.end > interval.start) {
        const intervalPixels = rowPixels.slice(interval.start, interval.end + 1);
        intervalPixels.sort((a, b) => a.brightness - b.brightness);
        
        // Put sorted pixels back into the row
        for (let i = 0; i < intervalPixels.length; i++) {
          const targetIndex = interval.start + i;
          if (targetIndex < rowPixels.length) {
            rowPixels[targetIndex] = intervalPixels[i];
          }
        }
      }
    });
    
    // Write the sorted row back to image data
    for (let col = 0; col < Math.min(iw, rowPixels.length); col++) {
      const pixelIndex = (row * iw + col) * 4;
      if (pixelIndex + 3 < data.length) {
        const pixel = rowPixels[col];
        data[pixelIndex] = pixel.r;
        data[pixelIndex + 1] = pixel.g;
        data[pixelIndex + 2] = pixel.b;
        data[pixelIndex + 3] = pixel.a;
      }
    }
  }
  
  ctx.putImageData(imageData, ix, iy);
};

// Pixel sort specifically for eye region with precise targeting
const pixelSortEyeRegion = (
  ctx: CanvasRenderingContext2D,
  face: DetectedFace,
  intensity: number
) => {
  const { x, y, width, height } = face;
  
  // Calculate eye region bounds - more precise targeting
  let eyeBarY, eyeBarHeight;
  
  if (face.landmarks && face.landmarks.length > 0) {
    // Use landmarks for precise eye positioning
    const eyeLandmarks = face.landmarks.slice(0, 6);
    
    if (eyeLandmarks.length >= 2) {
      const eyeYPositions = eyeLandmarks.map(p => p.y);
      const minEyeY = Math.min(...eyeYPositions);
      const maxEyeY = Math.max(...eyeYPositions);
      
      // Slightly smaller padding for more precise targeting
      const eyePadding = height * 0.08;
      eyeBarY = minEyeY - eyePadding;
      eyeBarHeight = (maxEyeY - minEyeY) + (eyePadding * 2);
    } else {
      // Fallback to proportional positioning
      eyeBarHeight = height * 0.3;
      eyeBarY = y + height * 0.25;
    }
  } else {
    // Fallback when no landmarks available
    eyeBarHeight = height * 0.3;
    eyeBarY = y + height * 0.25;
  }
  
  // Ensure bounds are within the face region
  eyeBarY = Math.max(y, eyeBarY);
  eyeBarHeight = Math.min(height, eyeBarHeight);
  
  // Apply aggressive pixel sorting to the eye region
  const ix = Math.max(0, Math.floor(x));
  const iy = Math.max(0, Math.floor(eyeBarY));
  const iw = Math.max(1, Math.floor(width));
  const ih = Math.max(1, Math.floor(eyeBarHeight));

  const imageData = ctx.getImageData(ix, iy, iw, ih);
  const data = imageData.data;
  
  // More aggressive settings for eye bar effect
  const brightnessThreshold = 40 + (intensity * 0.4); // Lower threshold for more sorting
  const rowStep = 1; // Process every row for dense streaking
  
  // Process every row for maximum horizontal streaking density
  for (let row = 0; row < ih; row += rowStep) {
    const rowPixels: Array<{r: number, g: number, b: number, a: number, brightness: number}> = [];
    
    // Extract row pixels
    for (let col = 0; col < iw; col++) {
      const pixelIndex = (row * iw + col) * 4;
      if (pixelIndex + 3 < data.length) {
        const r = data[pixelIndex];
        const g = data[pixelIndex + 1];
        const b = data[pixelIndex + 2];
        const a = data[pixelIndex + 3];
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
        
        rowPixels.push({ r, g, b, a, brightness });
      }
    }
    
    if (rowPixels.length === 0) continue;
    
    // Create smaller, more frequent intervals for denser streaking
    const intervals: Array<{start: number, end: number}> = [];
    const segmentSize = Math.max(8, Math.floor(iw * (30 / intensity))); // Smaller segments at higher intensity
    
    // Always create intervals for eye bar effect - don't rely on brightness detection alone
    for (let start = 0; start < rowPixels.length; start += segmentSize) {
      const end = Math.min(start + segmentSize * 2, rowPixels.length - 1);
      if (end > start + 4) { // Only sort meaningful intervals
        intervals.push({ start, end });
      }
    }
    
    // Also add brightness-based intervals for natural edge detection
    let intervalStart = -1;
    for (let i = 0; i < rowPixels.length; i++) {
      const pixel = rowPixels[i];
      const shouldSort = pixel.brightness > brightnessThreshold || 
                        pixel.brightness < (255 - brightnessThreshold);
      
      if (shouldSort && intervalStart === -1) {
        intervalStart = i;
      } else if (!shouldSort && intervalStart !== -1) {
        if (i - intervalStart > 3) { // Smaller minimum interval
          intervals.push({start: intervalStart, end: i - 1});
        }
        intervalStart = -1;
      }
    }
    
    if (intervalStart !== -1 && rowPixels.length - intervalStart > 3) {
      intervals.push({start: intervalStart, end: rowPixels.length - 1});
    }
    
    // Sort each interval by brightness for horizontal streaking
    intervals.forEach(interval => {
      if (interval.end > interval.start) {
        const intervalPixels = rowPixels.slice(interval.start, interval.end + 1);
        intervalPixels.sort((a, b) => a.brightness - b.brightness);
        
        // Put sorted pixels back
        for (let i = 0; i < intervalPixels.length; i++) {
          const targetIndex = interval.start + i;
          if (targetIndex < rowPixels.length) {
            rowPixels[targetIndex] = intervalPixels[i];
          }
        }
      }
    });
    
    // Write the sorted row back
    for (let col = 0; col < Math.min(iw, rowPixels.length); col++) {
      const pixelIndex = (row * iw + col) * 4;
      if (pixelIndex + 3 < data.length) {
        const pixel = rowPixels[col];
        data[pixelIndex] = pixel.r;
        data[pixelIndex + 1] = pixel.g;
        data[pixelIndex + 2] = pixel.b;
        data[pixelIndex + 3] = pixel.a;
      }
    }
  }
  
  ctx.putImageData(imageData, ix, iy);
};

// Rotated eye bar that follows head tilt
const drawRotatedEyeBar = (
  ctx: CanvasRenderingContext2D,
  face: DetectedFace,
  faceWidth: number,
  faceHeight: number
) => {
  if (face.landmarks && face.landmarks.length >= 2) {
    const leftEye = face.landmarks[0];
    const rightEye = face.landmarks[1];
    
    // Calculate angle between eyes
    const dx = rightEye.x - leftEye.x;
    const dy = rightEye.y - leftEye.y;
    const angle = Math.atan2(dy, dx);
    
    // Calculate center point between eyes
    const centerX = (leftEye.x + rightEye.x) / 2;
    const centerY = (leftEye.y + rightEye.y) / 2;
    
    // Calculate bar dimensions
    const eyeBarHeight = Math.max(10, faceHeight * 0.096);
    const eyeDistance = Math.sqrt(dx * dx + dy * dy);
    const eyeBarWidth = eyeDistance + (faceWidth * 0.36); // Padding on both sides
    
    // Save canvas state
    ctx.save();
    
    // Translate to center and rotate
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    
    // Draw rotated rectangle centered at origin
    ctx.fillStyle = '#000000';
    ctx.fillRect(-eyeBarWidth / 2, -eyeBarHeight / 2, eyeBarWidth, eyeBarHeight);
    
    // Restore canvas state
    ctx.restore();
  } else {
    // Fallback to regular horizontal bar
    const { x, y, width, height } = face;
    const eyeBarHeight = height * 0.144;
    const eyeBarY = y + height * 0.35;
    const eyeBarX = x + width * 0.08;
    const eyeBarWidth = width * 0.84;
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(eyeBarX, eyeBarY, eyeBarWidth, eyeBarHeight);
  }
};

// Simple blur effect using box blur approximation
const blurRegion = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  // Round and clamp region
  const ix = Math.max(0, Math.floor(x));
  const iy = Math.max(0, Math.floor(y));
  const iw = Math.max(1, Math.floor(width));
  const ih = Math.max(1, Math.floor(height));

  const imageData = ctx.getImageData(ix, iy, iw, ih);
  const data = imageData.data;
  const original = new Uint8ClampedArray(data);
  
  // Apply multiple passes of box blur for Gaussian approximation
  for (let pass = 0; pass < 3; pass++) {
    // Horizontal pass
    for (let row = 0; row < ih; row++) {
      for (let col = 0; col < iw; col++) {
        let r = 0, g = 0, b = 0, a = 0, count = 0;
        
        for (let k = -radius; k <= radius; k++) {
          const sampleCol = Math.max(0, Math.min(iw - 1, col + k));
          const idx = (row * iw + sampleCol) * 4;
          
          r += original[idx];
          g += original[idx + 1];
          b += original[idx + 2];
          a += original[idx + 3];
          count++;
        }
        
        const idx = (row * iw + col) * 4;
        data[idx] = r / count;
        data[idx + 1] = g / count;
        data[idx + 2] = b / count;
        data[idx + 3] = a / count;
      }
    }
    
    // Copy blurred data back for next pass
    original.set(data);
    
    // Vertical pass
    for (let col = 0; col < iw; col++) {
      for (let row = 0; row < ih; row++) {
        let r = 0, g = 0, b = 0, a = 0, count = 0;
        
        for (let k = -radius; k <= radius; k++) {
          const sampleRow = Math.max(0, Math.min(ih - 1, row + k));
          const idx = (sampleRow * iw + col) * 4;
          
          r += original[idx];
          g += original[idx + 1];
          b += original[idx + 2];
          a += original[idx + 3];
          count++;
        }
        
        const idx = (row * iw + col) * 4;
        data[idx] = r / count;
        data[idx + 1] = g / count;
        data[idx + 2] = b / count;
        data[idx + 3] = a / count;
      }
    }
    
    // Copy blurred data back for next pass
    original.set(data);
  }
  
  ctx.putImageData(imageData, ix, iy);
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
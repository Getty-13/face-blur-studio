import { DetectedFace } from './FaceDetection';
import { CensorType } from './CensorOptions';

export const processImage = (
  originalImage: HTMLImageElement,
  faces: DetectedFace[],
  censorType: CensorType,
  pixelIntensity: number = 12,
  sortIntensity: number = 50,
  selectedEmoji: string = '😀'
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
    applyCensoring(ctx, face, censorType, pixelIntensity, sortIntensity, selectedEmoji);
  });
  
  return canvas;
};

const applyCensoring = (
  ctx: CanvasRenderingContext2D, 
  face: DetectedFace, 
  censorType: CensorType,
  pixelIntensity: number = 12,
  sortIntensity: number = 50,
  selectedEmoji: string = '😀'
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
      pixelateEyeRegionPrecise(ctx, face, width, height, pixelIntensity);
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
      blurEyeRegionPrecise(ctx, face, width, height);
      break;
      
    case 'show-landmarks':
      drawLandmarksOnly(ctx, face);
      break;
      
    case 'landmarks-clean':
      drawCleanLandmarks(ctx, face);
      break;
      
    case 'emoji-face':
      drawEmojiFace(ctx, face, width, height, selectedEmoji);
      break;
      
    case 'contour-face':
      drawContourFace(ctx, face, width, height);
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

// Enhanced eye region calculation using precise landmark detection
const getEyeRegionBounds = (face: DetectedFace) => {
  if (face.landmarks && face.landmarks.length >= 2) {
    const leftEye = face.landmarks[0];
    const rightEye = face.landmarks[1];
    
    // Calculate eye region based on actual eye positions
    const eyeDistance = Math.sqrt(Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2));
    const eyePadding = eyeDistance * 0.4;
    
    const centerX = (leftEye.x + rightEye.x) / 2;
    const centerY = (leftEye.y + rightEye.y) / 2;
    
    return {
      x: Math.min(leftEye.x, rightEye.x) - eyePadding,
      y: centerY - eyePadding * 0.5,
      width: Math.abs(rightEye.x - leftEye.x) + eyePadding * 2,
      height: eyePadding,
      angle: Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x)
    };
  } else {
    // Fallback to proportional positioning
    const { x, y, width, height } = face;
    return {
      x: x + width * 0.15,
      y: y + height * 0.25,
      width: width * 0.7,
      height: height * 0.3,
      angle: 0
    };
  }
};

// Pixel sort specifically for eye region with precise targeting
const pixelSortEyeRegion = (
  ctx: CanvasRenderingContext2D,
  face: DetectedFace,
  intensity: number
) => {
  const eyeRegion = getEyeRegionBounds(face);
  
  // Apply aggressive pixel sorting to the eye region
  const ix = Math.max(0, Math.floor(eyeRegion.x));
  const iy = Math.max(0, Math.floor(eyeRegion.y));
  const iw = Math.max(1, Math.floor(eyeRegion.width));
  const ih = Math.max(1, Math.floor(eyeRegion.height));

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

// Precise eye region blur using enhanced landmark detection
const blurEyeRegionPrecise = (
  ctx: CanvasRenderingContext2D,
  face: DetectedFace,
  faceWidth: number,
  faceHeight: number
) => {
  const eyeRegion = getEyeRegionBounds(face);
  
  // Apply blur with slightly larger padding for smooth effect
  const blurPadding = Math.max(eyeRegion.width, eyeRegion.height) * 0.1;
  blurRegion(
    ctx, 
    eyeRegion.x - blurPadding, 
    eyeRegion.y - blurPadding, 
    eyeRegion.width + blurPadding * 2, 
    eyeRegion.height + blurPadding * 2, 
    8
  );
};

// Precise eye region pixelation using enhanced landmark detection
const pixelateEyeRegionPrecise = (
  ctx: CanvasRenderingContext2D,
  face: DetectedFace,
  faceWidth: number,
  faceHeight: number,
  pixelIntensity: number
) => {
  const eyeRegion = getEyeRegionBounds(face);
  pixelateRegion(ctx, eyeRegion.x, eyeRegion.y, eyeRegion.width, eyeRegion.height, pixelIntensity);
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

// Advanced wireframe with sophisticated triangulated mesh in bright yellow
const drawWireframeOverlay = (ctx: CanvasRenderingContext2D, face: DetectedFace) => {
  if (!face.landmarks || face.landmarks.length === 0) {
    console.log('No landmarks available for wireframe');
    return;
  }

  ctx.save();
  
  // Bright yellow wireframe styling to match reference
  ctx.strokeStyle = '#FFFF00';
  ctx.lineWidth = 1.2;
  ctx.shadowColor = 'rgba(255, 255, 0, 0.6)';
  ctx.shadowBlur = 3;

  const landmarks = face.landmarks;

  // Create sophisticated triangulation patterns
  ctx.beginPath();

  // Face contour triangulation (points 0-16)
  for (let i = 0; i < Math.min(16, landmarks.length - 1); i++) {
    ctx.moveTo(landmarks[i].x, landmarks[i].y);
    ctx.lineTo(landmarks[i + 1].x, landmarks[i + 1].y);
    
    // Create triangular connections to inner facial features
    if (i % 2 === 0 && landmarks.length > 27) {
      ctx.moveTo(landmarks[i].x, landmarks[i].y);
      ctx.lineTo(landmarks[27 + (i % 9)].x, landmarks[27 + (i % 9)].y); // Connect to nose
    }
  }

  // Eyebrow triangulation (points 17-26)
  for (let i = 17; i < Math.min(26, landmarks.length); i++) {
    if (i < 21 && i + 1 < landmarks.length) {
      // Right eyebrow internal structure
      ctx.moveTo(landmarks[i].x, landmarks[i].y);
      ctx.lineTo(landmarks[i + 1].x, landmarks[i + 1].y);
      if (landmarks.length > 36 && 36 + (i - 17) < landmarks.length) {
        ctx.moveTo(landmarks[i].x, landmarks[i].y);
        ctx.lineTo(landmarks[36 + (i - 17)].x, landmarks[36 + (i - 17)].y); // Connect to right eye
      }
    } else if (i < 26 && i + 1 < landmarks.length) {
      // Left eyebrow internal structure
      ctx.moveTo(landmarks[i].x, landmarks[i].y);
      ctx.lineTo(landmarks[i + 1].x, landmarks[i + 1].y);
      if (landmarks.length > 42 && 42 + (i - 22) < landmarks.length) {
        ctx.moveTo(landmarks[i].x, landmarks[i].y);
        ctx.lineTo(landmarks[42 + (i - 22)].x, landmarks[42 + (i - 22)].y); // Connect to left eye
      }
    }
  }

  // Nose bridge and tip triangulation (points 27-35)
  for (let i = 27; i < Math.min(35, landmarks.length - 1); i++) {
    ctx.moveTo(landmarks[i].x, landmarks[i].y);
    ctx.lineTo(landmarks[i + 1].x, landmarks[i + 1].y);
    
    // Create radial connections from nose tip
    if (i > 30 && landmarks.length > 48 && 48 + ((i - 31) * 2) % 12 < landmarks.length) {
      ctx.moveTo(landmarks[33].x, landmarks[33].y); // Nose tip
      ctx.lineTo(landmarks[48 + ((i - 31) * 2) % 12].x, landmarks[48 + ((i - 31) * 2) % 12].y); // To mouth
    }
  }

  // Eye triangulation with detailed internal structure
  if (landmarks.length > 47) {
    // Right eye (36-41)
    for (let i = 36; i < Math.min(41, landmarks.length); i++) {
      ctx.moveTo(landmarks[i].x, landmarks[i].y);
      ctx.lineTo(landmarks[i + 1].x, landmarks[i + 1].y);
      // Create triangular mesh within eye
      if (landmarks.length > 39) {
        ctx.moveTo(landmarks[i].x, landmarks[i].y);
        ctx.lineTo(landmarks[39].x, landmarks[39].y); // Connect to eye center
      }
    }
    if (landmarks.length > 41 && landmarks.length > 36) {
      ctx.moveTo(landmarks[41].x, landmarks[41].y);
      ctx.lineTo(landmarks[36].x, landmarks[36].y); // Close eye
    }

    // Left eye (42-47)
    for (let i = 42; i < Math.min(47, landmarks.length); i++) {
      ctx.moveTo(landmarks[i].x, landmarks[i].y);
      ctx.lineTo(landmarks[i + 1].x, landmarks[i + 1].y);
      // Create triangular mesh within eye
      if (landmarks.length > 45) {
        ctx.moveTo(landmarks[i].x, landmarks[i].y);
        ctx.lineTo(landmarks[45].x, landmarks[45].y); // Connect to eye center
      }
    }
    if (landmarks.length > 47 && landmarks.length > 42) {
      ctx.moveTo(landmarks[47].x, landmarks[47].y);
      ctx.lineTo(landmarks[42].x, landmarks[42].y); // Close eye
    }
  }

  // Mouth triangulation with complex internal geometry
  if (landmarks.length > 67) {
    // Outer mouth (48-59)
    for (let i = 48; i < Math.min(59, landmarks.length); i++) {
      ctx.moveTo(landmarks[i].x, landmarks[i].y);
      ctx.lineTo(landmarks[i + 1].x, landmarks[i + 1].y);
      
      // Connect outer to inner mouth points
      if (i < 55 && landmarks.length > 60 + (i - 48)) {
        ctx.moveTo(landmarks[i].x, landmarks[i].y);
        ctx.lineTo(landmarks[60 + (i - 48)].x, landmarks[60 + (i - 48)].y);
      }
    }
    if (landmarks.length > 59 && landmarks.length > 48) {
      ctx.moveTo(landmarks[59].x, landmarks[59].y);
      ctx.lineTo(landmarks[48].x, landmarks[48].y); // Close outer mouth
    }

    // Inner mouth (60-67)
    for (let i = 60; i < Math.min(67, landmarks.length); i++) {
      ctx.moveTo(landmarks[i].x, landmarks[i].y);
      ctx.lineTo(landmarks[i + 1].x, landmarks[i + 1].y);
    }
    if (landmarks.length > 67 && landmarks.length > 60) {
      ctx.moveTo(landmarks[67].x, landmarks[67].y);
      ctx.lineTo(landmarks[60].x, landmarks[60].y); // Close inner mouth
    }
  }

  // Cross-facial triangulation for structural integrity
  // Major structural lines
  if (landmarks.length > 30) {
    // Vertical center line
    if (landmarks.length > 27 && landmarks.length > 8) {
      ctx.moveTo(landmarks[27].x, landmarks[27].y); // Nose bridge
      ctx.lineTo(landmarks[8].x, landmarks[8].y);   // Chin center
    }
    
    // Horizontal eye line
    if (landmarks.length > 45 && landmarks.length > 36) {
      ctx.moveTo(landmarks[36].x, landmarks[36].y); // Right eye corner
      ctx.lineTo(landmarks[45].x, landmarks[45].y); // Left eye corner
    }
  }

  ctx.stroke();

  // Draw enhanced landmark points with yellow glow
  ctx.fillStyle = '#FFFF00';
  ctx.shadowBlur = 6;
  landmarks.forEach((landmark, index) => {
    ctx.beginPath();
    // Vary dot size based on importance
    const dotSize = (index >= 36 && index <= 47) ? 2.5 : 2; // Eyes slightly larger
    ctx.arc(landmark.x, landmark.y, dotSize, 0, 2 * Math.PI);
    ctx.fill();
  });

  ctx.restore();
};

// Draw emoji over eyes using same positioning as eye bar
const drawEmojiEyes = (
  ctx: CanvasRenderingContext2D,
  face: DetectedFace,
  faceWidth: number,
  faceHeight: number
) => {
  const emojis = ['😎', '🤓', '😵', '🙈', '👀', '🔒'];
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];
  
  if (face.landmarks && face.landmarks.length >= 2) {
    const leftEye = face.landmarks[0];
    const rightEye = face.landmarks[1];
    
    // Calculate center position between eyes
    const centerX = (leftEye.x + rightEye.x) / 2;
    const centerY = (leftEye.y + rightEye.y) / 2;
    
    // Calculate emoji size based on face width
    const emojiSize = Math.max(24, faceWidth * 0.3);
    
    ctx.font = `${emojiSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Add background for better visibility
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const textWidth = ctx.measureText(emoji).width;
    ctx.fillRect(
      centerX - textWidth / 2 - 4,
      centerY - emojiSize / 2 - 4,
      textWidth + 8,
      emojiSize + 8
    );
    
    ctx.fillStyle = 'black';
    ctx.fillText(emoji, centerX, centerY);
  } else {
    // Fallback positioning
    const centerX = face.x + faceWidth / 2;
    const centerY = face.y + faceHeight * 0.4;
    const emojiSize = Math.max(24, faceWidth * 0.3);
    
    ctx.font = `${emojiSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const textWidth = ctx.measureText(emoji).width;
    ctx.fillRect(
      centerX - textWidth / 2 - 4,
      centerY - emojiSize / 2 - 4,
      textWidth + 8,
      emojiSize + 8
    );
    
    ctx.fillStyle = 'black';
    ctx.fillText(emoji, centerX, centerY);
  }
};

// Draw emoji over entire face
const drawEmojiFace = (
  ctx: CanvasRenderingContext2D,
  face: DetectedFace,
  faceWidth: number,
  faceHeight: number,
  selectedEmoji: string = '😀'
) => {
  const emoji = selectedEmoji;
  
  const centerX = face.x + faceWidth / 2;
  const centerY = face.y + faceHeight / 2;
  const emojiSize = Math.max(32, Math.min(faceWidth, faceHeight) * 0.8);
  
  ctx.font = `${emojiSize}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Add background circle for better visibility
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(centerX, centerY, emojiSize / 2 + 8, 0, 2 * Math.PI);
  ctx.fill();
  
  ctx.fillStyle = 'black';
  ctx.fillText(emoji, centerX, centerY);
};

// Draw contour lines over face region
const drawContourFace = (
  ctx: CanvasRenderingContext2D,
  face: DetectedFace,
  faceWidth: number,
  faceHeight: number
) => {
  const { x, y } = face;
  
  // Get image data for the face region
  const imageData = ctx.getImageData(x, y, faceWidth, faceHeight);
  const data = imageData.data;
  
  // Create a luminance map
  const luminanceMap: number[][] = [];
  for (let row = 0; row < faceHeight; row++) {
    luminanceMap[row] = [];
    for (let col = 0; col < faceWidth; col++) {
      const idx = (row * faceWidth + col) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const luminance = (r * 0.299 + g * 0.587 + b * 0.114);
      luminanceMap[row][col] = luminance;
    }
  }
  
  // Set drawing style for contour lines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  
  // Draw contour lines at different luminance levels with better spacing
  const contourLevels = [40, 65, 90, 115, 140, 165, 190, 215];
  
  contourLevels.forEach(level => {
    ctx.beginPath();
    
    // Horizontal passes
    for (let row = 2; row < faceHeight - 2; row += 3) {
      let inContour = false;
      let contourStart = 0;
      
      for (let col = 1; col < faceWidth - 1; col++) {
        const currentLum = luminanceMap[row][col];
        const prevLum = luminanceMap[row][col - 1];
        
        // Check if we're crossing the contour level
        const crossing = (currentLum >= level && prevLum < level) || 
                        (currentLum < level && prevLum >= level);
        
        if (crossing && !inContour) {
          // Start a new contour segment
          contourStart = col;
          inContour = true;
        } else if ((crossing || col === faceWidth - 2) && inContour) {
          // End the contour segment
          const segmentLength = col - contourStart;
          if (segmentLength > 4) {
            // Draw curved contour line
            const startX = x + contourStart;
            const endX = x + col;
            const centerY = y + row;
            
            // Add slight curve based on surrounding luminance
            const curveFactor = (luminanceMap[Math.max(0, row - 1)][Math.floor((contourStart + col) / 2)] - level) * 0.02;
            
            ctx.moveTo(startX, centerY);
            ctx.quadraticCurveTo(
              startX + segmentLength / 2, 
              centerY + curveFactor, 
              endX, 
              centerY
            );
          }
          inContour = false;
        }
      }
    }
    
    // Vertical passes for more complete contours
    for (let col = 2; col < faceWidth - 2; col += 4) {
      let inContour = false;
      let contourStart = 0;
      
      for (let row = 1; row < faceHeight - 1; row++) {
        const currentLum = luminanceMap[row][col];
        const prevLum = luminanceMap[row - 1][col];
        
        const crossing = (currentLum >= level && prevLum < level) || 
                        (currentLum < level && prevLum >= level);
        
        if (crossing && !inContour) {
          contourStart = row;
          inContour = true;
        } else if ((crossing || row === faceHeight - 2) && inContour) {
          const segmentLength = row - contourStart;
          if (segmentLength > 4) {
            const startY = y + contourStart;
            const endY = y + row;
            const centerX = x + col;
            
            const curveFactor = (luminanceMap[Math.floor((contourStart + row) / 2)][Math.max(0, col - 1)] - level) * 0.02;
            
            ctx.moveTo(centerX, startY);
            ctx.quadraticCurveTo(
              centerX + curveFactor,
              startY + segmentLength / 2,
              centerX,
              endY
            );
          }
          inContour = false;
        }
      }
    }
    
    ctx.stroke();
  });
  
  // Add some subtle flowing organic curves for depth
  ctx.strokeStyle = 'rgba(100, 100, 100, 0.4)';
  ctx.lineWidth = 0.8;
  
  for (let i = 0; i < 4; i++) {
    const startX = x + (faceWidth * 0.2) + Math.random() * (faceWidth * 0.6);
    const startY = y + (faceHeight * 0.2) + Math.random() * (faceHeight * 0.6);
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    
    // Create organic flowing curves
    let currentX = startX;
    let currentY = startY;
    
    for (let j = 0; j < 6; j++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 15 + Math.random() * 25;
      const nextX = currentX + Math.cos(angle) * distance;
      const nextY = currentY + Math.sin(angle) * distance;
      
      // Keep within face bounds
      if (nextX >= x && nextX <= x + faceWidth && nextY >= y && nextY <= y + faceHeight) {
        const cpX = currentX + (nextX - currentX) * 0.5 + (Math.random() - 0.5) * 10;
        const cpY = currentY + (nextY - currentY) * 0.5 + (Math.random() - 0.5) * 10;
        
        ctx.quadraticCurveTo(cpX, cpY, nextX, nextY);
        currentX = nextX;
        currentY = nextY;
      }
    }
    
    ctx.stroke();
  }
};

// Enhanced clean landmark visualization with bright yellow dots and glow
const drawCleanLandmarks = (ctx: CanvasRenderingContext2D, face: DetectedFace) => {
  if (!face.landmarks || face.landmarks.length === 0) {
    console.log('No landmarks available for clean landmarks display');
    return;
  }

  ctx.save();
  
  // Enhanced glow effect with yellow
  ctx.shadowColor = 'rgba(255, 255, 0, 0.9)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Draw dense landmark points with varying sizes for depth
  face.landmarks.forEach((landmark, index) => {
    // Determine dot size based on landmark importance
    let dotSize = 3;
    if (index < 17) dotSize = 2.5; // Face contour - smaller
    else if (index >= 36 && index <= 47) dotSize = 3.5; // Eyes - larger
    else if (index >= 48 && index <= 67) dotSize = 3; // Mouth - medium
    else if (index >= 27 && index <= 35) dotSize = 2.5; // Nose - smaller
    
    // Outer glow ring
    ctx.fillStyle = 'rgba(255, 255, 0, 0.4)';
    ctx.beginPath();
    ctx.arc(landmark.x, landmark.y, dotSize + 2, 0, 2 * Math.PI);
    ctx.fill();
    
    // Main bright yellow dot
    ctx.fillStyle = '#FFFF00';
    ctx.beginPath();
    ctx.arc(landmark.x, landmark.y, dotSize, 0, 2 * Math.PI);
    ctx.fill();
    
    // Inner bright core
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(landmark.x, landmark.y, dotSize * 0.4, 0, 2 * Math.PI);
    ctx.fill();
  });

  ctx.restore();
  ctx.shadowBlur = 0;
};
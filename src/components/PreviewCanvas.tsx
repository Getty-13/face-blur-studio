import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { DetectedFace } from './FaceDetection';
import { CensorType } from './CensorOptions';
import { processImage } from './ImageProcessor';

interface PreviewCanvasProps {
  originalImage: HTMLImageElement | null;
  faces: DetectedFace[];
  censorType: CensorType;
  isProcessing: boolean;
  pixelIntensity: number;
  sortIntensity: number;
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  originalImage,
  faces,
  censorType,
  isProcessing,
  pixelIntensity,
  sortIntensity,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [processedCanvas, setProcessedCanvas] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!originalImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set display size (responsive)
    const maxWidth = 600;
    const maxHeight = 400;
    const aspectRatio = originalImage.naturalWidth / originalImage.naturalHeight;
    
    let displayWidth = maxWidth;
    let displayHeight = maxWidth / aspectRatio;
    
    if (displayHeight > maxHeight) {
      displayHeight = maxHeight;
      displayWidth = maxHeight * aspectRatio;
    }
    
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    
    // If no faces detected yet, just show original image
    if (faces.length === 0) {
      ctx.drawImage(originalImage, 0, 0, displayWidth, displayHeight);
      return;
    }

    // Process the image with censoring
    const processed = processImage(originalImage, faces, censorType, pixelIntensity, sortIntensity);
    setProcessedCanvas(processed);
    
    // Draw processed image to preview canvas (scaled down)
    ctx.drawImage(processed, 0, 0, displayWidth, displayHeight);
  }, [originalImage, faces, censorType, pixelIntensity, sortIntensity]);

  const handleDownload = () => {
    if (!processedCanvas) return;
    
    processedCanvas.toBlob((blob) => {
      if (!blob) return;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `censored-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png', 1.0);
  };

  return (
    <Card className="p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Preview</h3>
        {processedCanvas && (
          <Button
            variant="default"
            size="sm"
            onClick={handleDownload}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
        )}
      </div>
      
      <div className="relative bg-muted rounded-lg overflow-hidden flex items-center justify-center min-h-64">
        {isProcessing ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            Detecting faces...
          </div>
        ) : originalImage ? (
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <p className="text-muted-foreground">Upload an image to see preview</p>
        )}
      </div>
    </Card>
  );
};
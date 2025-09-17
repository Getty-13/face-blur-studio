import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Download, X, Loader2 } from 'lucide-react';
import { DetectedFace, detectFaces } from './FaceDetection';
import { CensorType } from './CensorOptions';
import { processImage } from './ImageProcessor';
import { toast } from '@/components/ui/use-toast';

interface CombinedUploadPreviewProps {
  onImageLoad: (image: HTMLImageElement, url: string) => void;
  onFacesDetected: (faces: DetectedFace[]) => void;
  onClearImage: () => void;
  originalImage: HTMLImageElement | null;
  faces: DetectedFace[];
  censorType: CensorType;
  isProcessing: boolean;
  pixelIntensity: number;
  sortIntensity: number;
  selectedEmoji: string;
}

export const CombinedUploadPreview: React.FC<CombinedUploadPreviewProps> = ({
  onImageLoad,
  onFacesDetected,
  onClearImage,
  originalImage,
  faces,
  censorType,
  isProcessing,
  pixelIntensity,
  sortIntensity,
  selectedEmoji,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [processedCanvas, setProcessedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const img = new Image();
      img.onload = async () => {
        const url = e.target?.result as string;
        onImageLoad(img, url);
        
        try {
          const detectedFaces = await detectFaces(img);
          onFacesDetected(detectedFaces);
          
          toast({
            title: "Faces detected",
            description: `Found ${detectedFaces.length} face${detectedFaces.length !== 1 ? 's' : ''} in the image.`
          });
        } catch (error) {
          console.error('Error detecting faces:', error);
          toast({
            title: "Face detection failed",
            description: "Could not detect faces. You can still use the app manually.",
            variant: "destructive"
          });
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [onImageLoad, onFacesDetected]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  // Canvas rendering effect
  useEffect(() => {
    if (!originalImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to fit container while maintaining aspect ratio
    const containerWidth = canvas.parentElement?.clientWidth || 600;
    const containerHeight = canvas.parentElement?.clientHeight || 400;
    const aspectRatio = originalImage.naturalWidth / originalImage.naturalHeight;
    
    let displayWidth = containerWidth;
    let displayHeight = containerWidth / aspectRatio;
    
    if (displayHeight > containerHeight) {
      displayHeight = containerHeight;
      displayWidth = containerHeight * aspectRatio;
    }
    
    canvas.width = displayWidth;
    canvas.height = displayHeight;

    if (faces.length > 0) {
      // Process the image with censoring
      const processed = processImage(originalImage, faces, censorType, pixelIntensity, sortIntensity, selectedEmoji);
      setProcessedCanvas(processed);
      
      // Scale and draw processed image
      const scaleX = displayWidth / originalImage.naturalWidth;
      const scaleY = displayHeight / originalImage.naturalHeight;
      
      ctx.clearRect(0, 0, displayWidth, displayHeight);
      ctx.drawImage(processed, 0, 0, displayWidth, displayHeight);
    } else {
      // Draw original image
      ctx.clearRect(0, 0, displayWidth, displayHeight);
      ctx.drawImage(originalImage, 0, 0, displayWidth, displayHeight);
      setProcessedCanvas(null);
    }
  }, [originalImage, faces, censorType, pixelIntensity, sortIntensity, selectedEmoji]);

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
      
      toast({
        title: "Image downloaded",
        description: "The processed image has been saved to your downloads."
      });
    }, 'image/png');
  };

  if (!originalImage) {
    return (
      <Card className="h-full min-h-[500px] flex items-center justify-center">
        <div
          className={`w-full h-full min-h-[500px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
            isDragOver 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50 hover:bg-accent/50'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Upload an Image</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Drag and drop an image here, or click to select a file. 
            The AI will automatically detect faces for censoring.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Supports JPG, PNG, WebP
          </p>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
            className="hidden"
          />
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="text-lg font-semibold">Preview</h3>
        <div className="flex items-center gap-2">
          {processedCanvas && (
            <Button onClick={handleDownload} size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          )}
          <Button 
            onClick={onClearImage} 
            variant="outline" 
            size="sm"
          >
            <X className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>
      
      <div className="p-4 h-full">
        {isProcessing ? (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Processing image...</span>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <canvas 
              ref={canvasRef}
              className="max-w-full max-h-full border border-border rounded-lg shadow-sm"
            />
          </div>
        )}
      </div>
    </Card>
  );
};
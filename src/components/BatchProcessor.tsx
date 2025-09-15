import React, { useRef, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, Download, X, Loader2, FileImage } from 'lucide-react';
import { DetectedFace, detectFaces } from './FaceDetection';
import { CensorType } from './CensorOptions';
import { processImage } from './ImageProcessor';
import { toast } from '@/components/ui/use-toast';

interface BatchImage {
  id: string;
  file: File;
  image: HTMLImageElement;
  faces: DetectedFace[];
  processed?: HTMLCanvasElement;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

interface BatchProcessorProps {
  censorType: CensorType;
  pixelIntensity: number;
  sortIntensity: number;
  confidenceThreshold: number;
  minFaceSize: number;
}

export const BatchProcessor: React.FC<BatchProcessorProps> = ({
  censorType,
  pixelIntensity,
  sortIntensity,
  confidenceThreshold,
  minFaceSize,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<BatchImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = useCallback(async (files: FileList) => {
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );

    if (imageFiles.length === 0) {
      toast({
        title: "No valid images",
        description: "Please select image files (JPG, PNG, WebP).",
        variant: "destructive"
      });
      return;
    }

    const newImages: BatchImage[] = [];

    for (const file of imageFiles) {
      const image = new Image();
      const url = URL.createObjectURL(file);
      
      await new Promise((resolve) => {
        image.onload = () => {
          const id = `${file.name}-${Date.now()}-${Math.random()}`;
          newImages.push({
            id,
            file,
            image,
            faces: [],
            status: 'pending'
          });
          URL.revokeObjectURL(url);
          resolve(void 0);
        };
        image.src = url;
      });
    }

    setImages(prev => [...prev, ...newImages]);
    
    toast({
      title: "Images loaded",
      description: `Added ${newImages.length} image${newImages.length !== 1 ? 's' : ''} to batch.`
    });
  }, []);

  const processBatch = useCallback(async () => {
    if (images.length === 0) return;

    setIsProcessing(true);
    setProgress(0);

    for (let i = 0; i < images.length; i++) {
      const imageData = images[i];
      
      setImages(prev => prev.map(img => 
        img.id === imageData.id 
          ? { ...img, status: 'processing' }
          : img
      ));

      try {
        // Detect faces
        const detectedFaces = await detectFaces(imageData.image);
        
        // Apply confidence and size filters
        const filteredFaces = detectedFaces.filter(face => 
          face.confidence >= confidenceThreshold &&
          face.width >= minFaceSize && 
          face.height >= minFaceSize
        );

        // Process image
        const processed = processImage(
          imageData.image, 
          filteredFaces, 
          censorType, 
          pixelIntensity, 
          sortIntensity
        );

        setImages(prev => prev.map(img => 
          img.id === imageData.id 
            ? { 
                ...img, 
                faces: filteredFaces, 
                processed, 
                status: 'completed' 
              }
            : img
        ));

      } catch (error) {
        console.error('Error processing image:', error);
        setImages(prev => prev.map(img => 
          img.id === imageData.id 
            ? { ...img, status: 'error' }
            : img
        ));
      }

      setProgress(((i + 1) / images.length) * 100);
    }

    setIsProcessing(false);
    
    const completedCount = images.filter(img => 
      img.status === 'completed' || 
      images.find(i => i.id === img.id)?.status === 'completed'
    ).length;
    
    toast({
      title: "Batch processing completed",
      description: `Successfully processed ${completedCount} of ${images.length} images.`
    });
  }, [images, censorType, pixelIntensity, sortIntensity, confidenceThreshold, minFaceSize]);

  const downloadAll = useCallback(() => {
    const completedImages = images.filter(img => img.processed);
    
    if (completedImages.length === 0) {
      toast({
        title: "No images to download",
        description: "Process the batch first.",
        variant: "destructive"
      });
      return;
    }

    completedImages.forEach((imageData, index) => {
      imageData.processed!.toBlob((blob) => {
        if (!blob) return;
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `censored-${imageData.file.name.replace(/\.[^/.]+$/, '')}-${index + 1}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png');
    });

    toast({
      title: "Download started",
      description: `Downloading ${completedImages.length} processed images.`
    });
  }, [images]);

  const clearBatch = useCallback(() => {
    setImages([]);
    setProgress(0);
  }, []);

  return (
    <Card className="p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Batch Processing</h3>
        {images.length > 0 && (
          <Button 
            onClick={clearBatch} 
            variant="outline" 
            size="sm"
            disabled={isProcessing}
          >
            <X className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {images.length === 0 ? (
        <div
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Select multiple images for batch processing
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Click here or drag and drop
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Progress bar */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Processing batch...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={processBatch}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileImage className="w-4 h-4 mr-2" />
              )}
              Process Batch ({images.length})
            </Button>
            
            <Button 
              onClick={downloadAll}
              variant="outline"
              disabled={isProcessing || !images.some(img => img.processed)}
            >
              <Download className="w-4 h-4 mr-2" />
              Download All
            </Button>
          </div>

          {/* Image list */}
          <div className="max-h-60 overflow-y-auto space-y-2">
            {images.map((imageData) => (
              <div 
                key={imageData.id}
                className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileImage className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium truncate max-w-48">
                      {imageData.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {imageData.status === 'completed' && `${imageData.faces.length} faces detected`}
                      {imageData.status === 'processing' && 'Processing...'}
                      {imageData.status === 'pending' && 'Pending'}
                      {imageData.status === 'error' && 'Error'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {imageData.status === 'processing' && (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  )}
                  {imageData.status === 'completed' && (
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  )}
                  {imageData.status === 'error' && (
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          if (e.target.files) handleFileSelect(e.target.files);
        }}
        className="hidden"
      />
    </Card>
  );
};
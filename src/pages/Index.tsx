import React, { useState, useCallback } from 'react';
import { DetectedFace } from '@/components/FaceDetection';
import { CensorType } from '@/components/CensorOptions';
import { CombinedUploadPreview } from '@/components/CombinedUploadPreview';
import { CensorOptions } from '@/components/CensorOptions';
import { toast } from '@/components/ui/use-toast';

const Index = () => {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('');
  const [faces, setFaces] = useState<DetectedFace[]>([]);
  const [censorType, setCensorType] = useState<CensorType>('black-square');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixelIntensity, setPixelIntensity] = useState(12);
  const [sortIntensity, setSortIntensity] = useState(50);

  const handleImageLoad = useCallback(async (image: HTMLImageElement, url: string) => {
    setOriginalImage(image);
    setOriginalImageUrl(url);
    setIsProcessing(true);
    
    setIsProcessing(false);
  }, []);

  const handleFacesDetected = useCallback((detectedFaces: DetectedFace[]) => {
    setFaces(detectedFaces);
  }, []);

  const handleClearImage = useCallback(() => {
    setOriginalImage(null);
    setOriginalImageUrl('');
    setFaces([]);
    setIsProcessing(false);
    setPixelIntensity(12);
    setSortIntensity(50);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-4">
            Face Blur Studio
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            AI-powered face detection and censoring with pixelation, sorting, and masking effects. 
            Privacy-focused processing happens entirely in your browser.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-250px)] min-h-[600px]">
          {/* Options Panel - Left Side */}
          <div className="lg:col-span-1">
            <CensorOptions
              selectedType={censorType}
              onTypeChange={setCensorType}
              facesDetected={faces.length}
              pixelIntensity={pixelIntensity}
              onPixelIntensityChange={setPixelIntensity}
              sortIntensity={sortIntensity}
              onSortIntensityChange={setSortIntensity}
            />
          </div>
          
          {/* Combined Upload/Preview - Right Side */}
          <div className="lg:col-span-3">
            <CombinedUploadPreview
              onImageLoad={handleImageLoad}
              onFacesDetected={handleFacesDetected}
              onClearImage={handleClearImage}
              originalImage={originalImage}
              faces={faces}
              censorType={censorType}
              isProcessing={isProcessing}
              pixelIntensity={pixelIntensity}
              sortIntensity={sortIntensity}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
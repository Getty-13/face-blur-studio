import React, { useState, useCallback } from 'react';
import { ImageUpload } from '@/components/ImageUpload';
import { CensorOptions, CensorType } from '@/components/CensorOptions';
import { PreviewCanvas } from '@/components/PreviewCanvas';
import { detectFaces, DetectedFace } from '@/components/FaceDetection';
import { toast } from 'sonner';

const Index = () => {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('');
  const [faces, setFaces] = useState<DetectedFace[]>([]);
  const [censorType, setCensorType] = useState<CensorType>('black-square');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageLoad = useCallback(async (file: File, imageElement: HTMLImageElement) => {
    setOriginalImage(imageElement);
    setOriginalImageUrl(URL.createObjectURL(file));
    setIsProcessing(true);
    
    try {
      toast.info('Detecting faces in image...');
      const detectedFaces = await detectFaces(imageElement);
      setFaces(detectedFaces);
      
      if (detectedFaces.length > 0) {
        toast.success(`Found ${detectedFaces.length} face${detectedFaces.length > 1 ? 's' : ''}`);
      } else {
        toast.warning('No faces detected in image');
      }
    } catch (error) {
      console.error('Face detection failed:', error);
      toast.error('Face detection failed');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleClearImage = useCallback(() => {
    setOriginalImage(null);
    setOriginalImageUrl('');
    setFaces([]);
    setIsProcessing(false);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2 gradient-primary bg-clip-text text-transparent">
              Face Blur Studio
            </h1>
            <p className="text-muted-foreground">
              Professional face censoring tool with AI-powered detection
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Image Upload */}
          <div className="lg:col-span-2 space-y-6">
            <ImageUpload
              onImageLoad={handleImageLoad}
              currentImage={originalImageUrl}
              onClear={handleClearImage}
            />
            
            <PreviewCanvas
              originalImage={originalImage}
              faces={faces}
              censorType={censorType}
              isProcessing={isProcessing}
            />
          </div>

          {/* Right Column - Controls */}
          <div className="space-y-6">
            <CensorOptions
              selectedType={censorType}
              onTypeChange={setCensorType}
              facesDetected={faces.length}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;

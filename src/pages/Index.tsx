import React, { useState, useCallback } from 'react';
import { DetectedFace } from '@/components/FaceDetection';
import { CensorType } from '@/components/CensorOptions';
import { CombinedUploadPreview } from '@/components/CombinedUploadPreview';
import { CensorOptions } from '@/components/CensorOptions';
import { BatchProcessor } from '@/components/BatchProcessor';
import { DetectionControls } from '@/components/DetectionControls';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';

const Index = () => {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('');
  const [faces, setFaces] = useState<DetectedFace[]>([]);
  const [filteredFaces, setFilteredFaces] = useState<DetectedFace[]>([]);
  const [censorType, setCensorType] = useState<CensorType>('black-square');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixelIntensity, setPixelIntensity] = useState(12);
  const [sortIntensity, setSortIntensity] = useState(50);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
  const [minFaceSize, setMinFaceSize] = useState(50);
  const [selectedEmoji, setSelectedEmoji] = useState('😀');

  const handleImageLoad = useCallback(async (image: HTMLImageElement, url: string) => {
    setOriginalImage(image);
    setOriginalImageUrl(url);
    setIsProcessing(true);
    
    setIsProcessing(false);
  }, []);

  const handleFacesDetected = useCallback((detectedFaces: DetectedFace[]) => {
    setFaces(detectedFaces);
    
    // Apply filters to detected faces
    const filtered = detectedFaces.filter(face => 
      face.confidence >= confidenceThreshold &&
      face.width >= minFaceSize && 
      face.height >= minFaceSize
    );
    setFilteredFaces(filtered);
  }, [confidenceThreshold, minFaceSize]);

  // Update filtered faces when detection controls change
  const updateFilteredFaces = useCallback(() => {
    const filtered = faces.filter(face => 
      face.confidence >= confidenceThreshold &&
      face.width >= minFaceSize && 
      face.height >= minFaceSize
    );
    setFilteredFaces(filtered);
  }, [faces, confidenceThreshold, minFaceSize]);

  const handleClearImage = useCallback(() => {
    setOriginalImage(null);
    setOriginalImageUrl('');
    setFaces([]);
    setFilteredFaces([]);
    setIsProcessing(false);
    setPixelIntensity(12);
    setSortIntensity(50);
  }, []);

  // Update filtered faces when controls change
  React.useEffect(() => {
    updateFilteredFaces();
  }, [updateFilteredFaces]);

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
        
        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="single">Single Image</TabsTrigger>
            <TabsTrigger value="batch">Batch Processing</TabsTrigger>
          </TabsList>
          
          <TabsContent value="single">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-300px)] min-h-[600px]">
              {/* Options Panel - Left Side */}
              <div className="lg:col-span-1 space-y-4">
                <CensorOptions
                  selectedType={censorType}
                  onTypeChange={setCensorType}
                  facesDetected={filteredFaces.length}
                  pixelIntensity={pixelIntensity}
                  onPixelIntensityChange={setPixelIntensity}
                  sortIntensity={sortIntensity}
                  onSortIntensityChange={setSortIntensity}
                  selectedEmoji={selectedEmoji}
                  onEmojiChange={setSelectedEmoji}
                />
                
                <DetectionControls
                  confidenceThreshold={confidenceThreshold}
                  onConfidenceChange={setConfidenceThreshold}
                  minFaceSize={minFaceSize}
                  onMinFaceSizeChange={setMinFaceSize}
                  facesDetected={faces.length}
                  facesFiltered={filteredFaces.length}
                />
              </div>
              
              {/* Combined Upload/Preview - Right Side */}
              <div className="lg:col-span-3">
                <CombinedUploadPreview
                  onImageLoad={handleImageLoad}
                  onFacesDetected={handleFacesDetected}
                  onClearImage={handleClearImage}
                  originalImage={originalImage}
                  faces={filteredFaces}
                  censorType={censorType}
                  isProcessing={isProcessing}
                  pixelIntensity={pixelIntensity}
                  sortIntensity={sortIntensity}
                  selectedEmoji={selectedEmoji}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="batch">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1 space-y-4">
                <CensorOptions
                  selectedType={censorType}
                  onTypeChange={setCensorType}
                  facesDetected={0}
                  pixelIntensity={pixelIntensity}
                  onPixelIntensityChange={setPixelIntensity}
                  sortIntensity={sortIntensity}
                  onSortIntensityChange={setSortIntensity}
                  selectedEmoji={selectedEmoji}
                  onEmojiChange={setSelectedEmoji}
                />
                
                <DetectionControls
                  confidenceThreshold={confidenceThreshold}
                  onConfidenceChange={setConfidenceThreshold}
                  minFaceSize={minFaceSize}
                  onMinFaceSizeChange={setMinFaceSize}
                  facesDetected={0}
                  facesFiltered={0}
                />
              </div>
              
              <div className="lg:col-span-3">
                <BatchProcessor
                  censorType={censorType}
                  pixelIntensity={pixelIntensity}
                  sortIntensity={sortIntensity}
                  confidenceThreshold={confidenceThreshold}
                  minFaceSize={minFaceSize}
                  selectedEmoji={selectedEmoji}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
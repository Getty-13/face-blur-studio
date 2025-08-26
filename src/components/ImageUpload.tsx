import React, { useCallback, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  onImageLoad: (file: File, imageElement: HTMLImageElement) => void;
  currentImage?: string;
  onClear: () => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  onImageLoad, 
  currentImage, 
  onClear 
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      console.error('Please select an image file');
      return;
    }

    const img = new Image();
    img.onload = () => {
      onImageLoad(file, img);
    };
    img.src = URL.createObjectURL(file);
  }, [onImageLoad]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files[0]) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  return (
    <Card className="relative overflow-hidden shadow-card transition-smooth">
      {currentImage ? (
        <div className="relative group">
          <img 
            src={currentImage} 
            alt="Selected image" 
            className="w-full h-auto max-h-96 object-contain bg-muted"
          />
          <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-smooth flex items-center justify-center">
            <Button
              variant="destructive"
              size="sm"
              onClick={onClear}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Remove Image
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "border-2 border-dashed border-border rounded-lg p-8 text-center transition-smooth",
            "hover:border-primary/50 hover:bg-secondary/30",
            isDragging && "border-primary bg-primary/10"
          )}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
        >
          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Upload an Image</h3>
          <p className="text-muted-foreground mb-6">
            Drag and drop your image here, or click to select
          </p>
          
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
            id="image-upload"
          />
          <label htmlFor="image-upload">
            <Button variant="studio" className="gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              Select Image
            </Button>
          </label>
        </div>
      )}
    </Card>
  );
};
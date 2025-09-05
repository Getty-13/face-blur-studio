import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Square, Minus, Eye, User, Shuffle, Zap, MapPin, ScanLine, Focus } from 'lucide-react';

export type CensorType = 'black-square' | 'eye-bar' | 'pixelated-eyes' | 'pixelated-face' | 'pixel-sort' | 'pixelsort-eye-bar' | 'blur-face' | 'blur-eyes' | 'wireframe' | 'show-landmarks';

interface CensorOptionsProps {
  selectedType: CensorType;
  onTypeChange: (type: CensorType) => void;
  facesDetected: number;
  pixelIntensity: number;
  onPixelIntensityChange: (value: number) => void;
  sortIntensity: number;
  onSortIntensityChange: (value: number) => void;
}

const censorOptions = [
  {
    type: 'black-square' as CensorType,
    label: 'Black Square',
    description: 'Cover entire face with black square',
    icon: Square,
  },
  {
    type: 'eye-bar' as CensorType,
    label: 'Eye Bar',
    description: 'Black bar over eyes',
    icon: Minus,
  },
  {
    type: 'pixelated-eyes' as CensorType,
    label: 'Pixelated Eyes',
    description: 'Pixelate eye area only',
    icon: Eye,
  },
  {
    type: 'pixelated-face' as CensorType,
    label: 'Pixelated Face',
    description: 'Pixelate entire face',
    icon: User,
  },
  {
    type: 'pixel-sort' as CensorType,
    label: 'Pixel Sort (JS)',
    description: 'Brightness-based horizontal sorting',
    icon: Shuffle,
  },
  {
    type: 'pixelsort-eye-bar' as CensorType,
    label: 'Pixelsort Eye Bar',
    description: 'Horizontal streaks over eyes',
    icon: ScanLine,
  },
  {
    type: 'blur-face' as CensorType,
    label: 'Blur Face',
    description: 'Gaussian blur over entire face',
    icon: Focus,
  },
  {
    type: 'blur-eyes' as CensorType,
    label: 'Blur Eyes',
    description: 'Gaussian blur over eye area',
    icon: Focus,
  },
  {
    type: 'wireframe' as CensorType,
    label: 'Wireframe',
    description: 'Geometric mesh overlay',
    icon: Zap,
  },
  {
    type: 'show-landmarks' as CensorType,
    label: 'Show Landmarks',
    description: 'Display detected facial points',
    icon: MapPin,
  },
];

export const CensorOptions: React.FC<CensorOptionsProps> = ({
  selectedType,
  onTypeChange,
  facesDetected,
  pixelIntensity,
  onPixelIntensityChange,
  sortIntensity,
  onSortIntensityChange,
}) => {
  const needsPixelSlider = ['pixelated-eyes', 'pixelated-face'].includes(selectedType);
  const needsSortSlider = ['pixel-sort', 'pixelsort-eye-bar'].includes(selectedType);
  return (
    <Card className="p-6 shadow-card">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Censor Options</h3>
        {facesDetected > 0 ? (
          <p className="text-sm text-muted-foreground">
            {facesDetected} face{facesDetected > 1 ? 's' : ''} detected
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Upload an image to detect faces
          </p>
        )}
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        {censorOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedType === option.type;
          
          return (
            <Button
              key={option.type}
              variant={isSelected ? "default" : "studio"}
              className="h-auto p-4 justify-start text-left"
              onClick={() => onTypeChange(option.type)}
              disabled={facesDetected === 0}
            >
              <div className="flex items-center gap-3 w-full">
                <Icon className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs opacity-80 truncate">
                    {option.description}
                  </div>
                </div>
              </div>
            </Button>
          );
        })}
      </div>
      
      {(needsPixelSlider || needsSortSlider) && facesDetected > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          {needsPixelSlider && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Pixel Intensity</label>
              <Slider
                value={[pixelIntensity]}
                onValueChange={(value) => onPixelIntensityChange(value[0])}
                min={4}
                max={20}
                step={2}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                Size: {pixelIntensity}px
              </div>
            </div>
          )}
          
          {needsSortSlider && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort Intensity</label>
              <Slider
                value={[sortIntensity]}
                onValueChange={(value) => onSortIntensityChange(value[0])}
                min={10}
                max={100}
                step={10}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                Strength: {sortIntensity}%
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
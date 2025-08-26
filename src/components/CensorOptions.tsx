import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Square, Minus, Eye, User } from 'lucide-react';

export type CensorType = 'black-square' | 'eye-bar' | 'pixelated-eyes' | 'pixelated-face';

interface CensorOptionsProps {
  selectedType: CensorType;
  onTypeChange: (type: CensorType) => void;
  facesDetected: number;
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
];

export const CensorOptions: React.FC<CensorOptionsProps> = ({
  selectedType,
  onTypeChange,
  facesDetected,
}) => {
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
    </Card>
  );
};
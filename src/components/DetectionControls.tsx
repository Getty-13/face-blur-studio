import React from 'react';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Eye, Target } from 'lucide-react';

interface DetectionControlsProps {
  confidenceThreshold: number;
  onConfidenceChange: (value: number) => void;
  minFaceSize: number;
  onMinFaceSizeChange: (value: number) => void;
  facesDetected: number;
  facesFiltered: number;
}

export const DetectionControls: React.FC<DetectionControlsProps> = ({
  confidenceThreshold,
  onConfidenceChange,
  minFaceSize,
  onMinFaceSizeChange,
  facesDetected,
  facesFiltered,
}) => {
  return (
    <Card className="p-6 shadow-card">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Target className="w-5 h-5" />
          Detection Controls
        </h3>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary">
            {facesDetected} detected
          </Badge>
          {facesFiltered !== facesDetected && (
            <Badge variant="outline">
              {facesFiltered} filtered
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Confidence Threshold */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Confidence Threshold
            </label>
            <span className="text-xs text-muted-foreground">
              {Math.round(confidenceThreshold * 100)}%
            </span>
          </div>
          
          <Slider
            value={[confidenceThreshold]}
            onValueChange={(value) => onConfidenceChange(value[0])}
            min={0.1}
            max={1.0}
            step={0.05}
            className="w-full"
          />
          
          <p className="text-xs text-muted-foreground">
            Higher values detect only more certain faces, lower values detect more faces but may include false positives.
          </p>
        </div>

        {/* Minimum Face Size */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              Minimum Face Size
            </label>
            <span className="text-xs text-muted-foreground">
              {minFaceSize}px
            </span>
          </div>
          
          <Slider
            value={[minFaceSize]}
            onValueChange={(value) => onMinFaceSizeChange(value[0])}
            min={20}
            max={200}
            step={10}
            className="w-full"
          />
          
          <p className="text-xs text-muted-foreground">
            Filter out faces smaller than this size. Useful for removing distant or unclear faces.
          </p>
        </div>

        {/* Detection Tips */}
        <div className="pt-3 border-t border-border">
          <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            Detection Tips
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Lower confidence for group photos with multiple faces</li>
            <li>• Higher confidence for clear, front-facing portraits</li>
            <li>• Increase minimum size to ignore background faces</li>
            <li>• Decrease minimum size for close-up shots</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};
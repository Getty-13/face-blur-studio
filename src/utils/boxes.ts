export type BoxLike = {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  landmarks?: Array<{ x: number; y: number }>;
};

export const iou = (a: BoxLike, b: BoxLike): number => {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);

  const interW = Math.max(0, x2 - x1);
  const interH = Math.max(0, y2 - y1);
  const intersection = interW * interH;

  const union = a.width * a.height + b.width * b.height - intersection;
  return union > 0 ? intersection / union : 0;
};

// Simple Non-Maximum Suppression: keep highest confidence boxes, drop overlaps above threshold
export const nms = (boxes: BoxLike[], iouThreshold = 0.35): BoxLike[] => {
  const sorted = [...boxes].sort((a, b) => b.confidence - a.confidence);
  const kept: BoxLike[] = [];

  for (const cand of sorted) {
    let overlaps = false;
    for (const k of kept) {
      if (iou(cand, k) > iouThreshold) {
        overlaps = true;
        break;
      }
    }
    if (!overlaps) kept.push(cand);
  }
  return kept;
};

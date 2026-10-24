import React from "react";
import { PerDetectorScores } from "@/lib/types";

interface DetectorMatrixProps {
  scores: PerDetectorScores;
}

export const DetectorMatrix: React.FC<DetectorMatrixProps> = ({ scores }) => {
  const breakdowns =
    scores.breakdown && scores.breakdown.length > 0
      ? scores.breakdown
      : [
          { name: "Pixel Patterns", score: scores.pixel_patterns },
          { name: "Face & Lighting", score: scores.face_lighting },
          { name: "Metadata & EXIF", score: scores.metadata_exif },
        ];

  return (
    <div className="space-y-3">
      <div className="pb-1">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
          Detector Breakdown
        </h3>
      </div>

      <div className="space-y-2.5">
        {breakdowns.map((detector, index) => (
          <div
            key={index}
            className="p-3.5 rounded-subpanel bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3"
          >
            <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs truncate">
              {detector.name}
            </span>
            <span className="font-mono font-bold text-sm tabular-nums text-neutral-900 dark:text-neutral-100 flex-shrink-0">
              {detector.score.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

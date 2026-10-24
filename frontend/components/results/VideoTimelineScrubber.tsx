"use client";

import React, { useState } from "react";
import { VideoFrameAnalysis } from "@/lib/types";

interface VideoTimelineScrubberProps {
  timeline: VideoFrameAnalysis[];
  mediaUrl?: string | null;
}

export const VideoTimelineScrubber: React.FC<VideoTimelineScrubberProps> = ({
  timeline,
  mediaUrl,
}) => {
  const [selectedFrame, setSelectedFrame] = useState<VideoFrameAnalysis | null>(
    timeline.find((f) => f.flagged) || timeline[0] || null
  );

  if (!timeline || timeline.length === 0) {
    return (
      <div className="p-4 rounded-subpanel bg-neutral-100 dark:bg-neutral-800/40 text-xs text-neutral-500 text-center">
        No frame-by-frame timeline available for this asset.
      </div>
    );
  }

  const flaggedCount = timeline.filter((t) => t.flagged).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            Frame Analysis
          </h3>
          <p className="text-xs text-neutral-500 max-w-[65ch]">
            Identifies sudden optical flow warping, landmark shearing, and irregular blink cadences
          </p>
        </div>
        <span className="text-xs font-mono font-bold tabular-nums px-2 py-1 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700">
          {flaggedCount} ANOMALOUS INTERVAL{flaggedCount === 1 ? "" : "S"} FLAGGED
        </span>
      </div>

      {/* Frame Timeline Bar */}
      <div className="p-4 rounded-subpanel bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
        <div className="flex items-end justify-between h-24 gap-2 pt-4">
          {timeline.map((item) => {
            const isSelected = selectedFrame?.frame_number === item.frame_number;
            const heightPct = Math.max(15, Math.min(100, item.score));
            return (
              <button
                key={item.frame_number}
                type="button"
                onClick={() => setSelectedFrame(item)}
                className="flex-1 flex flex-col items-center h-full justify-end group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-t active:scale-[0.97] transition-transform duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none"
              >
                <div
                  className={`w-full rounded-t transition-colors ${
                    item.flagged
                      ? "bg-red-600 dark:bg-red-500"
                      : item.score > 40
                      ? "bg-amber-600 dark:bg-amber-500"
                      : "bg-emerald-600 dark:bg-emerald-500"
                  } ${isSelected ? "ring-2 ring-neutral-900 dark:ring-white" : "opacity-80"}`}
                  style={{ height: `${heightPct}%` }}
                />
                <span className="text-[9px] font-mono tabular-nums text-neutral-500 mt-1">
                  {item.timestamp_seconds.toFixed(0)}s
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Frame Detail Callout */}
        {selectedFrame && (
          <div className="p-3 rounded-control bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs flex items-center justify-between">
            <div className="min-w-0">
              <span className="font-bold text-neutral-900 dark:text-neutral-100 font-mono tabular-nums">
                Frame #{selectedFrame.frame_number} ({selectedFrame.timestamp_seconds.toFixed(1)}s)
              </span>
              <span className="text-neutral-500 ml-2 font-mono tabular-nums">
                Synthetic Score: <b>{selectedFrame.score.toFixed(1)}%</b>
              </span>
            </div>

            {selectedFrame.anomaly_type ? (
              <span className="text-[11px] font-mono font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/60 px-2 py-1 rounded border border-red-300 dark:border-red-800 flex-shrink-0">
                [{selectedFrame.anomaly_type.toUpperCase()}]
              </span>
            ) : (
              <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300 flex-shrink-0">
                [COHERENT MOTION]
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

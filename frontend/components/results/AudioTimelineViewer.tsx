"use client";

import React, { useRef } from "react";
import { Volume2, Clock } from "lucide-react";
import { VideoFrameAnalysis } from "@/lib/types";
import { resolveMediaUrl } from "@/lib/utils";

interface AudioTimelineViewerProps {
  timeline: VideoFrameAnalysis[];
  mediaUrl?: string | null;
}

export const AudioTimelineViewer: React.FC<AudioTimelineViewerProps> = ({
  timeline,
  mediaUrl,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  const seekTo = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      audioRef.current.play().catch(() => {});
    }
  };

  const flaggedSegments = timeline.filter((t) => t.flagged || t.score >= 50.0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center space-x-2">
          <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Audio Timeline</span>
        </h3>
        <span className="text-xs font-mono text-neutral-500">
          {flaggedSegments.length} flagged segment(s)
        </span>
      </div>

      {/* Audio Playback Bar */}
      {mediaUrl ? (
        <div className="p-3 rounded-input bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60">
          <audio ref={audioRef} controls src={resolveMediaUrl(mediaUrl)} className="w-full h-10" />
        </div>
      ) : (
        <div className="p-4 text-center text-xs text-neutral-500 rounded-input bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
          Audio stream stored in secure vault.
        </div>
      )}

      {/* Flagged Timestamp Markers */}
      {flaggedSegments.length > 0 ? (
        <div className="space-y-2">
          <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
            Flagged Segments:
          </span>
          <div className="space-y-2">
            {flaggedSegments.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => seekTo(item.timestamp_seconds)}
                className="w-full p-3 rounded-input border border-neutral-200 dark:border-neutral-800 hover:border-blue-400 dark:hover:border-blue-600 bg-white dark:bg-neutral-900 text-left flex items-start justify-between gap-3 text-xs transition-colors duration-150"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3.5 h-3.5 text-neutral-500" />
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {item.timestamp_seconds.toFixed(2)}s
                    </span>
                    <span className="text-neutral-400">•</span>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {item.anomaly_type || "Vocoder spectral marker detected"}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Click to jump audio playback to this acoustic anomaly timestamp.
                  </p>
                </div>
                <span className="font-mono tabular-nums text-[11px] px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 flex-shrink-0">
                  {item.score.toFixed(1)}% suspicion
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-3 text-xs text-neutral-500 rounded-input bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-center">
          No localized synthetic vocoder anomalies or abrupt digital dropouts detected.
        </div>
      )}
    </div>
  );
};

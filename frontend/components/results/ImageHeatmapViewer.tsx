"use client";

import React, { useState } from "react";
import { resolveMediaUrl, cn } from "@/lib/utils";
import { Eye, Layers, Sliders, AlertCircle, Sparkles, Columns2 } from "lucide-react";

interface ImageHeatmapViewerProps {
  originalUrl?: string | null;
  heatmapUrl?: string | null;
  fileName?: string | null;
}

export const ImageHeatmapViewer: React.FC<ImageHeatmapViewerProps> = ({
  originalUrl,
  heatmapUrl,
  fileName,
}) => {
  const [opacity, setOpacity] = useState<number>(65); // Default 65% thermal opacity
  const [viewMode, setViewMode] = useState<"overlay" | "side_by_side" | "original">("overlay");
  const [origFailed, setOrigFailed] = useState(false);
  const [heatmapFailed, setHeatmapFailed] = useState(false);

  const effectiveOrig = resolveMediaUrl(originalUrl);
  const effectiveHeatmap = resolveMediaUrl(heatmapUrl);

  const hasAnyImage = effectiveOrig || effectiveHeatmap;

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Heatmap Overlay</span>
          </h3>
          <p className="text-xs text-neutral-500 max-w-[65ch]">
            Highlights denote high-frequency sensor noise anomalies and boundary seams.
          </p>
        </div>

        {/* View Mode Segmented Controls */}
        <div
          role="tablist"
          aria-label="Heatmap display mode"
          className="inline-flex p-1 rounded-xl bg-neutral-200/80 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-xs shadow-inner"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "overlay"}
            onClick={() => setViewMode("overlay")}
            className={cn(
              "flex items-center space-x-1.5 px-3 py-1.5 min-h-[34px] rounded-lg font-medium active:scale-[0.97] transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              viewMode === "overlay"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold shadow-sm border border-neutral-300/80 dark:border-neutral-700"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-300/40 dark:hover:bg-neutral-900/60"
            )}
          >
            <Layers className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Thermal Overlay</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "side_by_side"}
            onClick={() => setViewMode("side_by_side")}
            className={cn(
              "flex items-center space-x-1.5 px-3 py-1.5 min-h-[34px] rounded-lg font-medium active:scale-[0.97] transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              viewMode === "side_by_side"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold shadow-sm border border-neutral-300/80 dark:border-neutral-700"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-300/40 dark:hover:bg-neutral-900/60"
            )}
          >
            <Columns2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Side by Side</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "original"}
            onClick={() => setViewMode("original")}
            className={cn(
              "flex items-center space-x-1.5 px-3 py-1.5 min-h-[34px] rounded-lg font-medium active:scale-[0.97] transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              viewMode === "original"
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold shadow-sm border border-neutral-300/80 dark:border-neutral-700"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-300/40 dark:hover:bg-neutral-900/60"
            )}
          >
            <Eye className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Original</span>
          </button>
        </div>
      </div>

      {/* Main Visual Display */}
      {viewMode === "overlay" && (
        <div className="space-y-3">
          <div className="relative w-full aspect-[4/3] max-h-[480px] rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-300 dark:border-neutral-800 flex items-center justify-center shadow-inner">
            {/* Base Evidence Image */}
            {effectiveOrig && !origFailed && (
              <img
                src={effectiveOrig}
                alt="Submitted Evidence"
                className="absolute inset-0 w-full h-full object-contain"
                onError={() => setOrigFailed(true)}
              />
            )}

            {/* Thermal Anomaly Heatmap */}
            {effectiveHeatmap && !heatmapFailed && (
              <img
                src={effectiveHeatmap}
                alt="Anomaly Heatmap"
                className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-100 pointer-events-none ${
                  effectiveOrig && !origFailed ? "mix-blend-screen" : ""
                }`}
                style={{ opacity: effectiveOrig && !origFailed ? opacity / 100 : 1 }}
                onError={() => setHeatmapFailed(true)}
              />
            )}

            {/* Empty / Error Fallback */}
            {(!hasAnyImage || (origFailed && heatmapFailed)) && (
              <div className="text-center p-6 space-y-2 text-neutral-400">
                <AlertCircle className="w-8 h-8 mx-auto text-amber-500" />
                <p className="text-xs font-semibold">Evidence Asset Stored in Secure Local Vault</p>
                <p className="text-[11px] text-neutral-500 max-w-sm">
                  Binary evidence file is indexed on disk ({fileName || "Questioned Media"}).
                </p>
              </div>
            )}

            {/* Inset Badge */}
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white text-[11px] font-medium flex items-center space-x-2 pointer-events-none shadow-sm">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
              <span>Spectral Gradient ELA</span>
              <span className="text-neutral-300 font-mono font-bold tabular-nums">({opacity}%)</span>
            </div>
          </div>

          {/* Opacity Slider Control */}
          <div className="flex items-center space-x-3 px-3.5 py-2.5 bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <label
              htmlFor="thermal-blend-slider"
              className="flex items-center space-x-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200 select-none whitespace-nowrap"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span>Thermal Blend</span>
            </label>

            <div className="relative flex-1 flex items-center mx-1">
              <input
                id="thermal-blend-slider"
                type="range"
                min={0}
                max={100}
                step={1}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                aria-label="Thermal Blend Opacity"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={opacity}
                aria-valuetext={`${opacity}%`}
                className="w-full h-2 rounded-lg cursor-pointer appearance-none bg-neutral-200 dark:bg-neutral-800 accent-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all touch-none"
                style={{
                  background: `linear-gradient(to right, #2563eb 0%, #2563eb ${opacity}%, rgb(163 163 163 / 0.25) ${opacity}%, rgb(163 163 163 / 0.25) 100%)`,
                }}
              />
            </div>

            <span className="font-mono tabular-nums text-xs font-bold text-neutral-900 dark:text-neutral-100 min-w-[3rem] text-right select-none">
              {opacity}%
            </span>
          </div>
        </div>
      )}

      {viewMode === "side_by_side" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              Original Image
            </div>
            <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-300 dark:border-neutral-800 flex items-center justify-center">
              {effectiveOrig && !origFailed ? (
                <img
                  src={effectiveOrig}
                  alt="Original"
                  className="w-full h-full object-contain"
                  onError={() => setOrigFailed(true)}
                />
              ) : (
                <span className="text-xs text-neutral-500">Original image preview in vault</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              Anomaly Heatmap
            </div>
            <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-300 dark:border-neutral-800 flex items-center justify-center">
              {effectiveHeatmap && !heatmapFailed ? (
                <img
                  src={effectiveHeatmap}
                  alt="Heatmap"
                  className="w-full h-full object-contain"
                  onError={() => setHeatmapFailed(true)}
                />
              ) : (
                <span className="text-xs text-neutral-500">Forensic heatmap in vault</span>
              )}
            </div>
          </div>
        </div>
      )}

      {viewMode === "original" && (
        <div className="w-full aspect-[4/3] max-h-[480px] rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-300 dark:border-neutral-800 flex items-center justify-center">
          {effectiveOrig && !origFailed ? (
            <img
              src={effectiveOrig}
              alt="Original"
              className="w-full h-full object-contain"
              onError={() => setOrigFailed(true)}
            />
          ) : (
            <span className="text-xs text-neutral-500">Original evidence stored in vault</span>
          )}
        </div>
      )}
    </div>
  );
};

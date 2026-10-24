"use client";

import React from "react";

export interface LoadingBarProps {
  /** Numerical percentage (0 to 100). */
  progress?: number;
  /** Primary status message or title. */
  label?: string;
  /** Secondary or technical stage description. */
  subLabel?: string;
  /** Whether to show percentage number on the right (defaults to true). */
  showPercentage?: boolean;
  /** Indeterminate mode when exact progress cannot be calculated. */
  indeterminate?: boolean;
  /** Size variant: "sm" (6px), "md" (10px), "lg" (14px). */
  size?: "sm" | "md" | "lg";
  /** Optional custom container class name. */
  className?: string;
  /** Visual theme variant */
  variant?: "brand" | "emerald" | "amber" | "neutral";
}

export const LoadingBar: React.FC<LoadingBarProps> = ({
  progress = 0,
  label,
  subLabel,
  showPercentage = true,
  indeterminate = false,
  size = "md",
  className = "",
  variant = "brand",
}) => {
  const clampedProgress = Math.min(100, Math.max(0, Math.round(progress)));

  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-3.5",
  }[size];

  const variantGradients = {
    brand:
      "bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 dark:from-blue-500 dark:via-blue-400 dark:to-cyan-300 shadow-[0_0_12px_rgba(10,132,255,0.4)]",
    emerald:
      "bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 dark:from-emerald-500 dark:via-emerald-400 dark:to-teal-300 shadow-[0_0_12px_rgba(16,185,129,0.4)]",
    amber:
      "bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 dark:from-amber-500 dark:via-amber-400 dark:to-yellow-300 shadow-[0_0_12px_rgba(245,158,11,0.4)]",
    neutral:
      "bg-gradient-to-r from-neutral-600 via-neutral-500 to-neutral-400 dark:from-neutral-400 dark:via-neutral-300 dark:to-neutral-200",
  }[variant];

  return (
    <div
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : clampedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || "Loading progress"}
      className={`w-full space-y-2 ${className}`}
    >
      {(label || (showPercentage && !indeterminate)) && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 min-w-0 pr-2">
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 motion-reduce:hidden" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600 dark:bg-blue-400" />
            </span>
            {label && (
              <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                {label}
              </span>
            )}
          </div>
          {showPercentage && !indeterminate && (
            <span className="font-mono tabular-nums font-bold text-neutral-900 dark:text-neutral-100 flex-shrink-0">
              {clampedProgress}%
            </span>
          )}
        </div>
      )}

      {/* Bar Track */}
      <div
        className={`relative w-full ${sizeClasses} rounded-full overflow-hidden bg-neutral-200/80 dark:bg-neutral-800/80 border border-neutral-300/70 dark:border-neutral-700/60 shadow-inner`}
      >
        {indeterminate ? (
          /* Indeterminate Animated Sweep */
          <div
            className={`animate-progress-indeterminate rounded-full ${variantGradients}`}
          />
        ) : (
          /* Determinate Progress Fill */
          <div
            className={`h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden ${variantGradients}`}
            style={{ width: `${clampedProgress}%` }}
          >
            {/* Shimmer Highlight */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-progress-shimmer pointer-events-none" />
          </div>
        )}
      </div>

      {subLabel && (
        <div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 flex items-center justify-between pt-0.5">
          <span className="truncate">{subLabel}</span>
          <span className="text-[10px] uppercase tracking-wider text-neutral-400">
            Forensic Engine Active
          </span>
        </div>
      )}
    </div>
  );
};

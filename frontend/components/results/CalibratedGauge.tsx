import React from "react";

interface CalibratedGaugeProps {
  confidence: number;
  ciLow: number;
  ciHigh: number;
  verdict?: string;
}

export const CalibratedGauge: React.FC<CalibratedGaugeProps> = ({
  confidence,
  ciLow,
  ciHigh,
  verdict,
}) => {
  // In the forensic gauge:
  // Zone 1: Authentic (<35%)
  // Zone 2: Inconclusive (35 - 65%)
  // Zone 3: AI-Generated (>65%)
  // The gauge measures Synthetic / AI Manipulation Suspicion Score (0 to 100).
  // If a case has verdict === 'likely_authentic' but confidence was passed as > 50 (e.g. 88.2%),
  // the synthetic risk score on the 0-100 gauge is (100 - confidence) so it sits in the authentic zone.
  const syntheticScore = verdict === "likely_authentic" 
    ? (confidence > 50 ? 100 - confidence : confidence)
    : confidence;

  // Clamped percentages
  const pointPct = Math.max(0, Math.min(100, syntheticScore));
  const rawLow = verdict === "likely_authentic" && confidence > 50 ? 100 - ciHigh : ciLow;
  const rawHigh = verdict === "likely_authentic" && confidence > 50 ? 100 - ciLow : ciHigh;
  const lowPct = Math.max(0, Math.min(100, rawLow));
  const spanPct = Math.max(2, Math.min(100 - lowPct, rawHigh - lowPct));

  return (
    <div className="w-full space-y-2">
      {/* Gauge Header */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
          Forensic Uncertainty Gauge
        </span>
        <span className="font-mono text-neutral-500 text-[11px]">
          Synthetic Risk Index: <strong className="text-neutral-900 dark:text-neutral-100">{pointPct.toFixed(1)}%</strong>
        </span>
      </div>

      {/* Threshold Indicator Bar */}
      <div className="relative h-8 w-full rounded-full bg-neutral-200/90 dark:bg-neutral-800/90 p-1 flex items-center overflow-hidden border border-neutral-300 dark:border-neutral-700 shadow-inner">
        {/* Zone 1: Authentic (<35%) */}
        <div
          className="h-full rounded-l-full bg-emerald-500/25 flex items-center justify-start pl-3 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 select-none"
          style={{ width: "35%" }}
        >
          Authentic (&lt;35%)
        </div>

        {/* Zone 2: Inconclusive (35 - 65%) */}
        <div
          className="h-full bg-amber-500/25 flex items-center justify-center text-[11px] font-semibold text-amber-800 dark:text-amber-300 border-x border-amber-500/30 select-none"
          style={{ width: "30%" }}
        >
          Inconclusive (35%–65%)
        </div>

        {/* Zone 3: AI-Generated (>65%) */}
        <div
          className="h-full rounded-r-full bg-red-500/25 flex items-center justify-end pr-3 text-[11px] font-semibold text-red-800 dark:text-red-300 select-none"
          style={{ width: "35%" }}
        >
          AI-Generated (&gt;65%)
        </div>

        {/* Confidence Interval Shaded Span */}
        <div
          className="absolute top-1 bottom-1 bg-neutral-900/25 dark:bg-white/30 rounded-full pointer-events-none transition-all duration-150 ease-out motion-reduce:transition-none"
          style={{
            left: `${lowPct}%`,
            width: `${spanPct}%`,
          }}
          title={`95% Interval: ${ciLow.toFixed(1)}% – ${ciHigh.toFixed(1)}%`}
        />

        {/* Point Estimate Needle Marker */}
        <div
          className="absolute top-0 bottom-0 w-1.5 bg-neutral-950 dark:bg-white rounded-full shadow-md pointer-events-none transition-all duration-150 ease-out motion-reduce:transition-none transform -translate-x-1/2 z-10"
          style={{ left: `${pointPct}%` }}
        />
      </div>
    </div>
  );
};

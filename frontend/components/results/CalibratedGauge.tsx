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
}) => {
  // Clamped percentages
  const pointPct = Math.max(0, Math.min(100, confidence));
  const lowPct = Math.max(0, Math.min(100, ciLow));
  const spanPct = Math.max(2, Math.min(100 - lowPct, ciHigh - lowPct));

  return (
    <div className="w-full py-0.5">
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

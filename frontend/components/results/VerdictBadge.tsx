import React from "react";
import { Verdict } from "@/lib/types";

interface VerdictBadgeProps {
  verdict: Verdict;
  confidence: number;
  ciLow: number;
  ciHigh: number;
}

export const VerdictBadge: React.FC<VerdictBadgeProps> = ({
  verdict,
  confidence,
  ciLow,
  ciHigh,
}) => {
  const configs = {
    likely_authentic: {
      label: "Likely authentic",
      sublabel: "No significant generative artifacts detected in spectral or lighting subbands.",
    },
    inconclusive: {
      label: "Inconclusive",
      sublabel: "Conflicting signals or severe compression loss prevents definitive classification.",
    },
    likely_ai_generated: {
      label: "Likely AI-generated",
      sublabel: "Synthetic high-frequency lattices, illumination vector contradictions, or generative markers detected.",
    },
  };

  const config = configs[verdict] || configs.inconclusive;
  const isAuthentic = verdict === "likely_authentic";
  const displayPct = isAuthentic
    ? (confidence > 50 ? confidence : 100 - confidence)
    : confidence;
  const syntheticScore = isAuthentic
    ? (confidence > 50 ? 100 - confidence : confidence)
    : confidence;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-subpanel bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
      <div className="space-y-1 min-w-0">
        <div className="flex items-center space-x-3">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
            isAuthentic ? "bg-emerald-500" : verdict === "likely_ai_generated" ? "bg-red-500" : "bg-amber-500"
          }`} />
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 truncate">
            {config.label}
          </h2>
        </div>
        <p className="text-xs text-neutral-500 max-w-[65ch] pt-1">
          {config.sublabel}
        </p>
      </div>

      <div className="text-left sm:text-right sm:border-l sm:border-neutral-200 dark:sm:border-neutral-800 sm:pl-6 flex-shrink-0">
        <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 dark:text-neutral-400 font-mono mb-0.5">
          {isAuthentic ? "Authenticity Confidence" : verdict === "likely_ai_generated" ? "Synthetic Risk Score" : "Ambiguity Score"}
        </div>
        <div className={`text-2xl font-bold tracking-tight font-mono tabular-nums ${
          isAuthentic ? "text-emerald-600 dark:text-emerald-400" : verdict === "likely_ai_generated" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
        }`}>
          {displayPct.toFixed(1)}%
        </div>
        <div className="text-[11px] text-neutral-500 font-mono tabular-nums">
          {isAuthentic
            ? `Synthetic Risk: ${syntheticScore.toFixed(1)}% (Low / Authentic)`
            : `95% CI: [${ciLow.toFixed(1)}% – ${ciHigh.toFixed(1)}%]`}
        </div>
      </div>
    </div>
  );
};

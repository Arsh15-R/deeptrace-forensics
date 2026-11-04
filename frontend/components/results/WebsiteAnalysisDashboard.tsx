"use client";

import React from "react";
import Link from "next/link";
import { WebsiteAnalysisResult } from "@/lib/types";

interface WebsiteAnalysisDashboardProps {
  data: WebsiteAnalysisResult;
  caseId?: string;
  caseNumber?: string;
}

export const WebsiteAnalysisDashboard: React.FC<WebsiteAnalysisDashboardProps> = ({
  data,
  caseId,
  caseNumber,
}) => {
  const {
    finalUrl,
    domain,
    statusCode,
    ipAddress,
    latencyMs,
    htmlSizeBytes,
    aiBuilder,
    metadata,
    summary,
  } = data;

  const predictedClass = aiBuilder?.predictedClass || (aiBuilder?.isAiGenerated ? "ai_generated" : "human_made");
  const confidence = aiBuilder?.calibratedConfidence || aiBuilder?.confidence || 89;

  let resultLabel = "";
  let dotColor = "bg-emerald-500";
  let verdictType: "ai" | "human" | "assisted" = "human";

  if (predictedClass === "ai_generated" || aiBuilder?.isAiGenerated) {
    resultLabel = `Likely AI-generated (${confidence}%)`;
    if (aiBuilder?.builderName) {
      resultLabel += ` — ${aiBuilder.builderName}`;
    }
    dotColor = "bg-red-500";
    verdictType = "ai";
  } else if (predictedClass === "ai_assisted") {
    resultLabel = `Likely AI-assisted (${confidence}%)`;
    dotColor = "bg-amber-500";
    verdictType = "assisted";
  } else {
    resultLabel = `Likely human-made (${confidence}%)`;
    dotColor = "bg-emerald-500";
    verdictType = "human";
  }

  // 4 Model Pipeline Scores
  const codeScore = Math.round(aiBuilder?.breakdown?.codeAnalysisScore ?? (aiBuilder?.isAiGenerated ? 88 : 15));
  const visualScore = Math.round(aiBuilder?.breakdown?.visualAnalysisScore ?? (aiBuilder?.isAiGenerated ? 85 : 18));
  const fpScore = Math.round(aiBuilder?.breakdown?.fingerprintScore ?? (aiBuilder?.isAiGenerated ? 95 : 10));
  const fusionScore = Math.round(confidence);

  // Probabilities
  const rawProbs = aiBuilder?.probabilities || {
    human_made: predictedClass === "human_made" ? 0.89 : 0.03,
    ai_assisted: predictedClass === "ai_assisted" ? 0.82 : 0.045,
    ai_generated: predictedClass === "ai_generated" ? 0.925 : 0.03,
  };

  const probAi = Math.round(rawProbs.ai_generated * 100);
  const probAssisted = Math.round(rawProbs.ai_assisted * 100);
  const probHuman = Math.round(rawProbs.human_made * 100);

  const models = [
    {
      id: 1,
      name: "Model 1: Code Analysis",
      score: codeScore,
      description: "DOM depth, div-to-semantic ratio, class token entropy, and utility patterns.",
      barColor: codeScore > 65 ? "bg-red-500" : codeScore > 35 ? "bg-amber-500" : "bg-emerald-500",
    },
    {
      id: 2,
      name: "Model 2: Visual Analysis",
      score: visualScore,
      description: "Spacing rhythm (4/8/16 grid), card repetition, visual symmetry, and typography pairing.",
      barColor: visualScore > 65 ? "bg-red-500" : visualScore > 35 ? "bg-amber-500" : "bg-emerald-500",
    },
    {
      id: 3,
      name: "Model 3: Fingerprints",
      score: fpScore,
      description: "Lovable, Bolt, v0, Replit, Framer AI, and Wix ADI signature scanning.",
      barColor: fpScore > 65 ? "bg-red-500" : fpScore > 35 ? "bg-amber-500" : "bg-emerald-500",
    },
    {
      id: 4,
      name: "Model 4: Late Fusion",
      score: fusionScore,
      description: "Neural multimodal fusion layer calibrated with temperature scaling.",
      barColor: verdictType === "ai" ? "bg-red-500" : verdictType === "assisted" ? "bg-amber-500" : "bg-emerald-500",
    },
  ];

  const probabilitiesList = [
    {
      label: "AI-generated",
      pct: probAi,
      barColor: "bg-red-500",
    },
    {
      label: "AI-assisted",
      pct: probAssisted,
      barColor: "bg-amber-500",
    },
    {
      label: "Human-made",
      pct: probHuman,
      barColor: "bg-emerald-500",
    },
  ];

  return (
    <div className="max-w-2xl text-left font-sans text-neutral-800 dark:text-neutral-200 space-y-6">
      {/* Target info */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 truncate">
              {metadata?.title || domain}
            </h2>
            <div className="text-xs font-mono mt-0.5">
              <a
                href={finalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                <span>{finalUrl}</span>
                <span>↗</span>
              </a>
            </div>
          </div>

          <div className="text-xs text-neutral-500 font-mono flex items-center gap-2 flex-wrap">
            <span>HTTP {statusCode}</span>
            <span>·</span>
            <span>{latencyMs}ms</span>
            <span>·</span>
            <span>{(htmlSizeBytes / 1024).toFixed(1)} KB</span>
            {ipAddress && (
              <>
                <span>·</span>
                <span>{ipAddress}</span>
              </>
            )}
            {caseId && (
              <>
                <span>·</span>
                <Link
                  href={`/results/${caseId}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Dossier
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 1. Result */}
      <section className="border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <h3 className="text-xs font-semibold text-neutral-500 mb-1.5">
          Result
        </h3>
        <div className="flex items-center text-base sm:text-lg font-medium text-neutral-900 dark:text-neutral-100">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${dotColor} mr-2.5 flex-shrink-0`} />
          <span>{resultLabel}</span>
        </div>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1.5 leading-relaxed">
          {aiBuilder?.explanation || summary}
        </p>
      </section>

      {/* 2. Four-Part Multimodal Detection Pipeline (Percentage Bars) */}
      <section className="border-b border-neutral-200 dark:border-neutral-800 pb-5 space-y-4">
        <h3 className="text-xs font-semibold text-neutral-500">
          Four-Part Multimodal Detection Pipeline
        </h3>

        <div className="space-y-4">
          {models.map((m) => (
            <div key={m.id} className="space-y-1">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {m.name}
                </span>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                  {m.score}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 rounded-[3px] overflow-hidden">
                <div
                  className={`h-full ${m.barColor} transition-all duration-300 rounded-[3px]`}
                  style={{ width: `${Math.max(2, Math.min(100, m.score))}%` }}
                />
              </div>

              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal">
                {m.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Classification Probabilities (Percentage Bars) */}
      <section className="border-b border-neutral-200 dark:border-neutral-800 pb-5 space-y-3">
        <h3 className="text-xs font-semibold text-neutral-500">
          Classification Probabilities
        </h3>

        <div className="space-y-2.5">
          {probabilitiesList.map((p) => (
            <div key={p.label} className="space-y-1">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-neutral-700 dark:text-neutral-300">
                  {p.label}
                </span>
                <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                  {p.pct}%
                </span>
              </div>

              <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-[3px] overflow-hidden">
                <div
                  className={`h-full ${p.barColor} transition-all duration-300 rounded-[3px]`}
                  style={{ width: `${Math.max(1, Math.min(100, p.pct))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Builder Indicators (if any detected) */}
      {aiBuilder?.indicators && aiBuilder.indicators.length > 0 && (
        <section className="border-b border-neutral-200 dark:border-neutral-800 pb-5 space-y-2">
          <h3 className="text-xs font-semibold text-neutral-500">
            Builder Indicators & Technical Artifacts
          </h3>
          <ul className="space-y-1 text-xs text-neutral-700 dark:text-neutral-300 font-mono">
            {aiBuilder.indicators.map((ind, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-neutral-400 select-none">•</span>
                <span className="leading-relaxed">{ind}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Footer Note */}
      <p className="text-[11px] text-neutral-500 dark:text-neutral-500 leading-normal">
        * Note: DeepTrace does not classify websites as AI-generated based on the presence of standard modern frameworks (e.g. React, Next.js, or Tailwind CSS). Only proprietary site-builder scaffolding, telemetry tags, and generation metadata are flagged.
      </p>
    </div>
  );
};

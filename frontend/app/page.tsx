"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ImageUploader } from "@/components/media-input/ImageUploader";
import { VideoUploader } from "@/components/media-input/VideoUploader";
import { AudioUploader } from "@/components/media-input/AudioUploader";
import { LinkInput } from "@/components/media-input/LinkInput";
import { TextInput } from "@/components/media-input/TextInput";
import { MediaType, CaseRecord } from "@/lib/types";
import { listCases } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<MediaType>("image");
  const [recentCases, setRecentCases] = useState<CaseRecord[]>([]);

  useEffect(() => {
    // Fetch recent cases for quick reopening
    listCases()
      .then((data) => setRecentCases(data.slice(0, 3)))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4 sm:py-8">
      {/* Title & Section Header */}
      <div className="space-y-2 text-center sm:text-left">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-bold border border-neutral-300 dark:border-neutral-700">
          <span>Department of Police • Forensic Evidence Screening</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          Media Authenticity Verification
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-[65ch] leading-relaxed">
          Submit questioned media to evaluate high-frequency sensor noise, facial illumination consistency, metadata provenance, and optical flow anomalies. Results are calibrated to quantify uncertainty.
        </p>
      </div>

      {/* Main Glassmorphic Submission Panel */}
      <GlassCard variant="main" className="space-y-6">
        {/* Segmented Control */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-neutral-200/60 dark:border-neutral-800/60 pb-5">
          <SegmentedControl activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {/* Tab View Panels */}
        <div className="pt-2">
          {activeTab === "image" && <ImageUploader />}
          {activeTab === "video" && <VideoUploader />}
          {activeTab === "audio" && <AudioUploader />}
          {activeTab === "link" && <LinkInput />}
          {activeTab === "text" && <TextInput />}
        </div>
      </GlassCard>

      {/* Recent Screenings Ledger */}
      {recentCases.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 font-medium px-1">
            <span>Recent Screenings</span>
            <Link
              href="/history"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              View full case history
            </Link>
          </div>

          <div className="rounded-subpanel border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800">
            {recentCases.map((item) => (
              <div
                key={item.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="font-mono tabular-nums font-bold text-neutral-900 dark:text-neutral-100 flex-shrink-0">
                      {item.case_number}
                    </span>
                    <span className="text-neutral-400 flex-shrink-0">•</span>
                    <span className="text-neutral-600 dark:text-neutral-400 truncate max-w-xs block">
                      {item.file_name || (item.source_url ? "Remote URL" : "Linguistic Statement")}
                    </span>
                  </div>
                  <div className="font-mono tabular-nums text-[11px] text-neutral-500">
                    {formatDate(item.created_at)}
                  </div>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0">
                  <span
                    className={`font-mono tabular-nums font-bold text-[11px] px-2 py-1 rounded-full border ${
                      item.verdict === "likely_authentic"
                        ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border-neutral-300 dark:border-neutral-700"
                        : item.verdict === "likely_ai_generated"
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white"
                        : "bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-400 dark:border-neutral-600"
                    }`}
                  >
                    {item.verdict === "inconclusive"
                      ? "INCONCLUSIVE"
                      : `${item.calibrated_confidence.toFixed(1)}% SYNTHETIC`}
                  </span>

                  <Link
                    href={`/results/${item.id}`}
                    className="px-3 py-2 min-h-[44px] inline-flex items-center rounded-full border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-[0.97] transition-transform duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none text-neutral-800 dark:text-neutral-200 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    Open record
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getCase } from "@/lib/api";
import { CaseRecord } from "@/lib/types";
import { GlassCard } from "@/components/ui/GlassCard";
import { VerdictBadge } from "@/components/results/VerdictBadge";
import { CalibratedGauge } from "@/components/results/CalibratedGauge";
import { DetectorMatrix } from "@/components/results/DetectorMatrix";
import { ImageHeatmapViewer } from "@/components/results/ImageHeatmapViewer";
import { VideoTimelineScrubber } from "@/components/results/VideoTimelineScrubber";
import { AudioTimelineViewer } from "@/components/results/AudioTimelineViewer";
import { EvidenceLedgerCard } from "@/components/results/EvidenceLedgerCard";
import { InvestigativeNotice } from "@/components/results/InvestigativeNotice";
import { InTextMetadataCard } from "@/components/results/InTextMetadataCard";
import { ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";
import { LoadingBar } from "@/components/ui/LoadingBar";

export default function CaseResultsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [caseData, setCaseData] = useState<CaseRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cachedPreview, setCachedPreview] = useState<string | null>(null);

  useEffect(() => {
    if (id && typeof window !== "undefined") {
      try {
        const item = sessionStorage.getItem(`evidence_preview_${id}`);
        if (item) setCachedPreview(item);
      } catch {}

      try {
        const cachedStr = sessionStorage.getItem(`case_record_${id}`);
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          if (cached && (cached.id === id || cached.case_number === id)) {
            setCaseData(cached);
            setLoading(false);
          }
        }
      } catch {}
    }
  }, [id]);

  const loadCaseRecord = React.useCallback(() => {
    if (!id) return;
    setCaseData((prev) => {
      if (!prev) setLoading(true);
      return prev;
    });
    setError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      setCaseData((prev) => {
        if (!prev) {
          setError("Request timed out loading case record. Please retry.");
          setLoading(false);
        }
        return prev;
      });
    }, 12000);

    getCase(id, controller.signal)
      .then((data) => {
        clearTimeout(timeout);
        setCaseData(data);
        setLoading(false);
      })
      .catch((err) => {
        clearTimeout(timeout);
        if (err.name === "AbortError") return;
        setCaseData((prev) => {
          if (!prev) {
            setError(err.message || "Failed to load case record from database.");
            setLoading(false);
            return null;
          }
          // Already have cached case record from current session, keep it
          setLoading(false);
          return prev;
        });
      });
  }, [id]);

  useEffect(() => {
    loadCaseRecord();
  }, [loadCaseRecord]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center max-w-md mx-auto px-4">
        <GlassCard variant="main" className="w-full p-6 text-center space-y-4">
          <LoadingBar
            indeterminate
            label="Loading Case Record..."
            subLabel="Retrieving evidence hashes, detectors, and custody ledger"
            size="md"
            variant="brand"
          />
        </GlassCard>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <GlassCard variant="main" className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            Case Record Unavailable
          </h2>
          <p className="text-xs text-neutral-500">{error || "Case record not found."}</p>
          <div className="pt-2 flex items-center justify-center space-x-3">
            <button
              type="button"
              onClick={loadCaseRecord}
              className="inline-flex items-center space-x-2 px-4 py-2 min-h-[44px] rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold active:scale-[0.97] transition-all shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Load</span>
            </button>
            <Link
              href="/"
              className="inline-flex items-center space-x-2 px-5 py-2 min-h-[44px] rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold active:scale-[0.97] transition-transform duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Media Screening</span>
            </Link>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            aria-label="Back to Verify Evidence"
            className="p-2 min-h-[44px] min-w-[44px] rounded-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-[0.97] transition-transform duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ArrowLeft className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 truncate">
                Case Record: <span className="font-mono tabular-nums">{caseData.case_number}</span>
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-1 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex-shrink-0">
                {caseData.media_type}
              </span>
            </div>
            <p className="text-xs text-neutral-500 truncate">
              Examined by {caseData.officer_name} (<span className="font-mono tabular-nums">{caseData.officer_badge}</span>) • {caseData.department}
            </p>
          </div>
        </div>
      </div>

      {/* Top Verdict Overview Banner */}
      <VerdictBadge
        verdict={caseData.verdict}
        confidence={caseData.calibrated_confidence}
        ciLow={caseData.confidence_interval_low}
        ciHigh={caseData.confidence_interval_high}
      />

      {/* Asymmetric Dual Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Media Inspector, Heatmap or Video Scrubber */}
        <div className="lg:col-span-7 space-y-6">
          <GlassCard variant="main" className="space-y-5">
            {((caseData.media_type === "image" || (caseData.media_type === "document" && caseData.heatmap_url))) && (
              <ImageHeatmapViewer
                caseId={caseData.id}
                originalUrl={caseData.media_url}
                heatmapUrl={caseData.heatmap_url}
                fileName={caseData.file_name}
                cachedPreviewUrl={cachedPreview}
              />
            )}

            {caseData.media_type === "video" && (
              <VideoTimelineScrubber
                timeline={caseData.timeline_scores}
                mediaUrl={caseData.media_url}
              />
            )}

            {caseData.media_type === "audio" && (
              <AudioTimelineViewer
                timeline={caseData.timeline_scores}
                mediaUrl={caseData.media_url}
              />
            )}

            {(caseData.media_type === "text" || caseData.media_type === "document") && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    {caseData.media_type === "document" ? "Extracted Document Corpus" : "Submitted Text"}
                  </h3>
                  <div className="p-4 rounded-subpanel bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 font-mono text-xs text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                    {caseData.text_snippet || "Text transcript recorded in vault."}
                  </div>
                </div>

                <InTextMetadataCard metadata={caseData.per_detector_scores?.inTextMetadata} />
              </div>
            )}
          </GlassCard>

          {/* Detector Breakdown Matrix */}
          <GlassCard variant="main">
            <DetectorMatrix scores={caseData.per_detector_scores} />
          </GlassCard>
        </div>

        {/* Right Column (5 cols): Calibrated Gauge, Custody Ledger & Legal Advisory */}
        <div className="lg:col-span-5 space-y-6">
          {/* Calibrated Uncertainty Gauge */}
          <GlassCard variant="main">
            <CalibratedGauge
              confidence={caseData.calibrated_confidence}
              ciLow={caseData.confidence_interval_low}
              ciHigh={caseData.confidence_interval_high}
              verdict={caseData.verdict}
            />
          </GlassCard>

          {/* Evidence Chain of Custody & PDF Export */}
          <GlassCard variant="main">
            <EvidenceLedgerCard caseData={caseData} />
          </GlassCard>

          {/* Investigative Lead Disclaimer & Error Rates */}
          <InvestigativeNotice
            fpr={caseData.known_error_rate_fpr}
            fnr={caseData.known_error_rate_fnr}
            limitations={caseData.limitations_notes}
          />
        </div>
      </div>
    </div>
  );
}

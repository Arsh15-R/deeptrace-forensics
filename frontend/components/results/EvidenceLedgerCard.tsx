"use client";

import React, { useState } from "react";
import { CaseRecord } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { downloadReportPdf } from "@/lib/api";

interface EvidenceLedgerCardProps {
  caseData: CaseRecord;
}

export const EvidenceLedgerCard: React.FC<EvidenceLedgerCardProps> = ({ caseData }) => {
  const [downloading, setDownloading] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      await downloadReportPdf(caseData.id, caseData.case_number);
    } catch (err: any) {
      setDownloadError(err.message || "Failed to download PDF report");
    } finally {
      setDownloading(false);
    }
  };

  const copyFullHash = () => {
    navigator.clipboard.writeText(caseData.sha256_hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-1">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
          Chain of Custody
        </h3>
        <span className="font-mono tabular-nums text-xs text-neutral-500">
          Ref: <b className="text-neutral-900 dark:text-neutral-100">{caseData.case_number}</b>
        </span>
      </div>

      {/* Grid of Essential Evidence Attributes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Source File */}
        <div className="p-3 rounded-subpanel bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1 sm:col-span-2 min-w-0">
          <span className="text-neutral-500">Source File</span>
          <div
            className="font-bold text-neutral-900 dark:text-neutral-100 truncate block max-w-full"
            title={caseData.file_name || caseData.source_url || "Direct Statement Input"}
          >
            {caseData.file_name || caseData.source_url || "Direct Statement Input"}
          </div>
        </div>

        {/* Analysis Date & Time */}
        <div className="p-3 rounded-subpanel bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1 min-w-0">
          <span className="text-neutral-500">Analysis Date & Time</span>
          <div className="font-bold text-neutral-900 dark:text-neutral-100">
            {formatDate(caseData.created_at)}
          </div>
        </div>

        {/* Examiner */}
        <div className="p-3 rounded-subpanel bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1 min-w-0">
          <span className="text-neutral-500">Examiner</span>
          <div className="font-bold text-neutral-900 dark:text-neutral-100 truncate">
            {caseData.officer_name}
          </div>
        </div>

        {/* SHA-256 Hash with Copy Button */}
        <div className="p-3 rounded-subpanel bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1.5 sm:col-span-2 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">SHA-256 Hash</span>
            <button
              onClick={copyFullHash}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-bold active:scale-[0.97] transition-transform duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-2.5 py-1 min-h-[36px] inline-flex items-center"
            >
              {copiedHash ? "Copied" : "Copy hash"}
            </button>
          </div>
          <div className="font-mono tabular-nums text-[11px] text-neutral-900 dark:text-neutral-100 break-all select-all bg-neutral-100 dark:bg-neutral-800 p-2.5 rounded-control border border-neutral-200 dark:border-neutral-700 leading-relaxed">
            {caseData.sha256_hash}
          </div>
        </div>
      </div>

      {/* Primary Action Button: Download Report */}
      <div className="pt-1">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full py-3 px-6 min-h-[44px] rounded-full bg-neutral-900 hover:bg-black dark:bg-neutral-100 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-neutral-900 font-bold text-sm active:scale-[0.97] transition-transform duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none border border-neutral-900 dark:border-neutral-100 flex items-center justify-center space-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {downloading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating forensic PDF...</span>
            </>
          ) : (
            <span>Download report</span>
          )}
        </button>
        {downloadError && (
          <div className="mt-3 p-3 rounded-control bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs text-center">
            {downloadError}
          </div>
        )}
      </div>
    </div>
  );
};

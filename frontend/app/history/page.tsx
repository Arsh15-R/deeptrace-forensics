"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { CaseHistoryTable } from "@/components/history/CaseHistoryTable";
import { listCases } from "@/lib/api";
import { CaseRecord } from "@/lib/types";
import { Loader2, Plus, AlertCircle, RefreshCw, FileQuestion } from "lucide-react";

export default function HistoryPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadData = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    // Hard safety timeout: Guarantee spinner resolves within 12s even if network is completely stalled
    const timer = setTimeout(() => {
      if (controller.signal.aborted) return;
      controller.abort();
      setError("The examination records request timed out. Please check network connectivity and retry.");
      setLoading(false);
    }, 12000);

    listCases(undefined, undefined, undefined, controller.signal)
      .then((data) => {
        clearTimeout(timer);
        setCases(data || []);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        clearTimeout(timer);
        if (err.name === "AbortError") {
          return; // Ignore intentional user / timeout aborts
        }
        console.error("Failed to load cases:", err);
        setError(err.message || "Failed to retrieve case records from evidence database.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener("deeptrace_role_changed", loadData);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      window.removeEventListener("deeptrace_role_changed", loadData);
    };
  }, [loadData]);

  return (
    <div className="space-y-4 pt-2 pb-10 max-w-7xl mx-auto">
      {/* Page Heading & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-0.5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Case History
          </h1>
          <p className="text-xs text-neutral-500">
            Past media examinations and forensic chain-of-custody records.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            title="Refresh case history"
            className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold active:scale-[0.97] transition-all duration-150 ease-out border border-neutral-300 dark:border-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/"
            className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-1.5 min-h-[36px] rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold active:scale-[0.97] transition-all duration-150 ease-out border border-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Examination</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-sm shadow-xs">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <div className="text-center space-y-1">
            <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Querying Evidence Database...
            </p>
            <p className="text-[11px] text-neutral-400">
              Resolving case records, cryptographic hashes, and custody ledgers
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="p-5 rounded-2xl bg-red-50/90 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 space-y-3">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <div className="flex-1 space-y-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-red-800 dark:text-red-200">
                Case Records Query Notice
              </h2>
              <p className="text-xs leading-relaxed text-red-700 dark:text-red-300">
                {error}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 pt-1 pl-8">
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 min-h-[34px] rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold active:scale-[0.97] transition-all shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Request</span>
            </button>
            <Link
              href="/"
              className="inline-flex items-center px-3 py-1.5 min-h-[34px] rounded-lg bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-medium hover:bg-neutral-50 dark:hover:bg-neutral-750"
            >
              Start New Examination
            </Link>
          </div>
        </div>
      ) : cases.length === 0 ? (
        <div className="py-16 px-4 text-center rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mx-auto flex items-center justify-center">
            <FileQuestion className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              No Examination Cases Recorded
            </h2>
            <p className="text-xs text-neutral-500">
              No media authenticity examinations have been executed yet. Submit image, video, audio, or text evidence to generate a certified forensic case.
            </p>
          </div>
          <div>
            <Link
              href="/"
              className="inline-flex items-center space-x-1.5 px-4 py-2 min-h-[38px] rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold active:scale-[0.97] transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Examine First Evidence File</span>
            </Link>
          </div>
        </div>
      ) : (
        <CaseHistoryTable cases={cases} onRefresh={loadData} />
      )}
    </div>
  );
}
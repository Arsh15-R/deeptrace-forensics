"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  AlertCircle,
  Loader2,
  RefreshCw,
  XCircle,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
} from "lucide-react";
import { analyzeWebsite, checkServerHealth } from "@/lib/api";
import { LoadingBar } from "@/components/ui/LoadingBar";
import { CaseRecord, WebsiteAnalysisResult } from "@/lib/types";
import { WebsiteAnalysisDashboard } from "@/components/results/WebsiteAnalysisDashboard";

export const WebsiteAnalysisInput: React.FC = () => {
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const userCancelledRef = useRef<boolean>(false);

  const [url, setUrl] = useState<string>("");
  const [caseRef, setCaseRef] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressLabel, setProgressLabel] = useState<string>("");
  const [progressDetail, setProgressDetail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Completed website analysis preview state
  const [analysisResult, setAnalysisResult] = useState<CaseRecord | null>(null);

  const cleanupTimers = () => {
    timersRef.current.forEach((t) => {
      clearTimeout(t);
      clearInterval(t);
    });
    timersRef.current = [];
  };

  useEffect(() => {
    return () => {
      cleanupTimers();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const cancelAnalysis = useCallback(() => {
    if (process.env.NODE_ENV !== "production") {
      console.log("[DeepTrace Client] Operator cancelled website analysis.");
    }
    userCancelledRef.current = true;
    cleanupTimers();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setProgress(0);
    setProgressLabel("");
    setProgressDetail("");
    setError("Website inspection was cancelled by operator.");
  }, []);

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUrl = url.trim();
    if (!cleanUrl) return;

    // Validate format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(cleanUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        setError("Please enter a valid HTTP or HTTPS website URL (e.g. https://example.com).");
        return;
      }
    } catch {
      setError("Please provide a valid, well-formed URL (e.g. https://example.com).");
      return;
    }

    userCancelledRef.current = false;
    cleanupTimers();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Strict 120-second client-side timeout
    const timeoutId = setTimeout(() => {
      if (!userCancelledRef.current) {
        controller.abort(new DOMException("Website analysis timed out after 120 seconds.", "TimeoutError"));
      }
    }, 120000);
    timersRef.current.push(timeoutId);

    setLoading(true);
    setError(null);
    setAnalysisResult(null);

    // Stage 1: Connectivity & SSRF Isolation Guard
    setProgress(15);
    setProgressLabel("Evaluating target host & SSRF isolation...");
    setProgressDetail("Stage 1 of 4: DNS Resolution & Private Subnet Guard");

    timersRef.current.push(
      setTimeout(() => {
        if (!userCancelledRef.current) {
          setProgress(40);
          setProgressLabel("Retrieving public headers, DOM structure & SSL certificates...");
          setProgressDetail("Stage 2 of 4: Async HTTP Stream & Security Observational Audit");
        }
      }, 500)
    );

    timersRef.current.push(
      setTimeout(() => {
        if (!userCancelledRef.current) {
          setProgress(68);
          setProgressLabel("Scanning technology stack & AI website builder fingerprints...");
          setProgressDetail("Stage 3 of 4: Frameworks, CMS, Edge CDN & AI Generator Verification");
        }
      }, 1200)
    );

    timersRef.current.push(
      setTimeout(() => {
        if (!userCancelledRef.current) {
          setProgress(88);
          setProgressLabel("Synthesizing metadata, robots.txt & security posture grade...");
          setProgressDetail("Stage 4 of 4: Aggregating Forensic Ledger Record");
        }
      }, 2000)
    );

    try {
      const result = await analyzeWebsite(cleanUrl, caseRef.trim() || undefined, controller.signal);
      cleanupTimers();

      if (userCancelledRef.current) {
        setLoading(false);
        return;
      }

      // Cache full verified case record in sessionStorage for instant dossier rendering
      try {
        sessionStorage.setItem(`case_record_${result.id}`, JSON.stringify(result));
      } catch (cacheErr) {
        console.warn("[DeepTrace Client] Case record cache notice:", cacheErr);
      }

      setProgress(100);
      setProgressLabel("Website analysis complete. Presenting findings...");
      setProgressDetail("Forensic Ledger Certified");
      setAnalysisResult(result);
      setLoading(false);
    } catch (err: any) {
      cleanupTimers();
      setLoading(false);
      setProgress(0);
      setProgressLabel("");
      setProgressDetail("");

      if (userCancelledRef.current) return;

      console.error("[DeepTrace Client] Website analysis error:", err);
      const isTimeout =
        err?.name === "TimeoutError" ||
        err?.message?.includes("timed out") ||
        (err?.name === "AbortError" && !userCancelledRef.current);

      const errorMessage = isTimeout
        ? "Website request timed out after 120 seconds. The target domain took too long to respond."
        : err?.message || "Failed to inspect and analyze the specified website.";

      setError(errorMessage);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const handleReset = () => {
    setUrl("");
    setCaseRef("");
    setAnalysisResult(null);
    setError(null);
    setProgress(0);
  };

  const websiteData: WebsiteAnalysisResult | undefined =
    analysisResult?.per_detector_scores?.inTextMetadata?.websiteAnalysis;

  return (
    <div className="space-y-6">
      {/* Website Input Form */}
      <form onSubmit={handleAnalyze} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="website-url-input"
            className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300"
          >
            Public Website URL
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400">
              <Globe className="w-4 h-4" />
            </div>
            <input
              id="website-url-input"
              type="url"
              disabled={loading}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
              className="w-full pl-10 pr-4 py-2 min-h-[44px] rounded-input bg-white/70 dark:bg-slate-900/70 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60"
            />
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Inspect public technologies, AI site builders (Lovable, Bolt.new, v0, Replit, Framer AI), CMS, and security headers.
          </p>
        </div>

        {/* Case Reference & Submit Action */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:w-2/3">
            <input
              type="text"
              value={caseRef}
              disabled={loading}
              onChange={(e) => setCaseRef(e.target.value)}
              placeholder="Case Reference / Incident Number (optional)"
              className="w-full px-4 py-2 min-h-[44px] rounded-input bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60"
            />
          </div>

          <div className="w-full sm:w-1/3 flex items-center gap-2">
            {loading ? (
              <button
                type="button"
                onClick={cancelAnalysis}
                className="w-full py-2 px-4 min-h-[44px] rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs active:scale-[0.97] transition-all flex items-center justify-center space-x-2 shadow-xs"
              >
                <XCircle className="w-4 h-4" />
                <span>Cancel Analysis</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!url.trim()}
                className="w-full py-2 px-6 min-h-[44px] rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm active:scale-[0.97] transition-all flex items-center justify-center space-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shadow-xs"
              >
                <Globe className="w-4 h-4" />
                <span>Analyze Website</span>
              </button>
            )}
          </div>
        </div>

        {/* Loading Progress Bar */}
        {loading && (
          <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-50/70 dark:bg-blue-950/40 backdrop-blur-sm space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                SSRF Guard & Website Inspection Engine Active
              </span>
              <button
                type="button"
                onClick={cancelAnalysis}
                className="text-[11px] font-bold text-red-600 hover:text-red-700 dark:text-red-400 underline"
              >
                Cancel
              </button>
            </div>
            <LoadingBar
              progress={progress}
              label={progressLabel}
              subLabel={progressDetail}
              size="md"
              variant="brand"
            />
          </div>
        )}

        {/* Error Notice */}
        {error && !loading && (
          <div className="rounded-xl p-4 bg-red-50/90 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs space-y-2.5">
            <div className="flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <div className="flex-1 space-y-0.5">
                <p className="font-bold">Website Inspection Notice</p>
                <p className="text-[11px] leading-relaxed">{error}</p>
              </div>
            </div>
            <div className="pl-6 pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAnalyze()}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 min-h-[32px] rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold active:scale-[0.97] transition-all shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Inspection</span>
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Analysis Results Dashboard */}
      {analysisResult && websiteData && (
        <div className="pt-4 border-t border-neutral-200/60 dark:border-neutral-800/60 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Inspection Report
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                {analysisResult.case_number}
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
              >
                Inspect Another URL
              </button>
              <button
                type="button"
                onClick={() => router.push(`/results/${analysisResult.id}`)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold hover:opacity-90 transition-opacity"
              >
                <span>View Full Case Dossier</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <WebsiteAnalysisDashboard
            data={websiteData}
            caseId={analysisResult.id}
            caseNumber={analysisResult.case_number}
          />
        </div>
      )}
    </div>
  );
};

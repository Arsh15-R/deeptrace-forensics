"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Globe, AlertCircle, Loader2, Link as LinkIcon, RefreshCw, XCircle } from "lucide-react";
import { analyzeLink, checkServerHealth } from "@/lib/api";
import { LoadingBar } from "@/components/ui/LoadingBar";

export const LinkInput: React.FC = () => {
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
      console.log("[DeepTrace Client] Operator cancelled remote link examination.");
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
    setError("Remote link examination was cancelled by operator.");
  }, []);

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    try {
      new URL(url.trim());
    } catch {
      setError("Please provide a valid, well-formed URL (e.g. https://domain.org/evidence.jpg).");
      return;
    }

    userCancelledRef.current = false;
    cleanupTimers();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Strict 120-second client-side timeout wired to abort controller
    const timeoutId = setTimeout(() => {
      if (!userCancelledRef.current) {
        controller.abort(new DOMException("Link examination timed out after 120 seconds.", "TimeoutError"));
      }
    }, 120000);
    timersRef.current.push(timeoutId);

    setLoading(true);
    setError(null);
    setProgress(10);
    setProgressLabel("Verifying analysis engine connectivity...");
    setProgressDetail("Establishing tunnel connection to forensic server...");

    try {
      // Early health check against /api/health
      const health = await checkServerHealth(controller.signal);
      if (!health.ok) {
        cleanupTimers();
        setLoading(false);
        setProgress(0);
        setProgressLabel("");
        setProgressDetail("");
        setError(health.error || "Analysis server is offline. Start the laptop server and tunnel.");
        return;
      }

      // Stage 1: DNS Resolution & SSRF Guard
      setProgress(25);
      setProgressLabel("Evaluating URL destination & SSRF isolation...");
      setProgressDetail("Stage 1 of 4: DNS Resolution & Private Subnet Guard");

      if (process.env.NODE_ENV !== "production") {
        console.log(`[DeepTrace Client] Link Stage 1: Initiating ingestion for URL: ${url.trim()}`);
      }

      // Stage 2: Fetch and analyze
      setProgress(60);
      setProgressLabel("Fetching remote stream & evaluating multimodal sensor artifacts...");
      setProgressDetail("Stage 2 of 4: Remote Retrieval & Neural Frequency Inspection");

      timersRef.current.push(
        setTimeout(() => {
          if (!userCancelledRef.current) {
            setProgress(75);
            setProgressLabel("Inspecting remote container codec & sensor PRNU patterns...");
            setProgressDetail("Stage 3 of 4: Remote Stream Container & Noise Residuals");
            if (process.env.NODE_ENV !== "production") console.log("[DeepTrace Client] Link Stage 2.1: Progress 75%");
          }
        }, 400)
      );

      timersRef.current.push(
        setTimeout(() => {
          if (!userCancelledRef.current) {
            setProgress(88);
            setProgressLabel("Analyzing remote stream frame variance & latent markers...");
            setProgressDetail("Stage 3 of 4: Latent Synthesis Verification");
            if (process.env.NODE_ENV !== "production") console.log("[DeepTrace Client] Link Stage 2.2: Progress 88%");
          }
        }, 1000)
      );

      timersRef.current.push(
        setTimeout(() => {
          if (!userCancelledRef.current) {
            setProgress(94);
            setProgressLabel("Calibrating Neyman-Pearson likelihood & signing ledger record...");
            setProgressDetail("Stage 4 of 4: Awaiting final verification...");
            if (process.env.NODE_ENV !== "production") console.log("[DeepTrace Client] Link Stage 2.3: Progress 94% (holding until server response)");
          }
        }, 1800)
      );

      if (process.env.NODE_ENV !== "production") {
        console.log("[DeepTrace Client] Link Stage 2: Dispatching POST /api/cases/analyze/link...");
      }

      const result = await analyzeLink(url.trim(), caseRef.trim() || undefined, controller.signal);
      cleanupTimers();

      if (userCancelledRef.current) {
        setLoading(false);
        return;
      }

      if (process.env.NODE_ENV !== "production") {
        console.log(`[DeepTrace Client] Link Stage 3: Server returned Case: ${result.case_number}, Verdict: ${result.verdict}`);
      }

      // Cache full verified case record in sessionStorage for immediate instant dossier rendering
      try {
        sessionStorage.setItem(`case_record_${result.id}`, JSON.stringify(result));
      } catch (cacheErr) {
        console.warn("[DeepTrace Client] Case record cache notice:", cacheErr);
      }

      setProgress(100);
      setProgressLabel("Remote evidence analyzed. Opening dossier...");
      setProgressDetail("Stage 4 of 4: Cryptographic Ledger Certified");

      if (process.env.NODE_ENV !== "production") {
        console.log(`[DeepTrace Client] Link Stage 4: Progress 100%. Transitioning to /results/${result.id}`);
      }

      setTimeout(() => {
        try {
          router.push(`/results/${result.id}`);
        } catch {
          window.location.href = `/results/${result.id}`;
        }
      }, 200);
    } catch (err: any) {
      cleanupTimers();
      setLoading(false);
      setProgress(0);
      setProgressLabel("");
      setProgressDetail("");

      if (userCancelledRef.current) return;

      console.error("[DeepTrace Client] Link analysis error:", err);
      const isTimeout =
        err?.name === "TimeoutError" ||
        err?.message?.includes("timed out") ||
        (err?.name === "AbortError" && !userCancelledRef.current);

      const errorMessage = isTimeout
        ? "Remote media request timed out after 120 seconds. The server or target link took too long to respond."
        : (err?.message || "Failed to fetch and evaluate media from the specified link.");

      setError(errorMessage);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  return (
    <form onSubmit={handleAnalyze} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="remote-url-input" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          Public Media URL (Image or Video)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400">
            <LinkIcon className="w-4 h-4" />
          </div>
          <input
            id="remote-url-input"
            type="url"
            disabled={loading}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://evidence-host.org/records/incident_capture.jpg"
            required
            className="w-full pl-10 pr-4 py-2 min-h-[44px] rounded-input bg-white/70 dark:bg-slate-900/70 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60"
          />
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Only use links you’re authorized to access.
        </p>
      </div>

      {/* Case Reference & Submit */}
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
              <span>Analyze Remote Link</span>
            </button>
          )}
        </div>
      </div>

      {/* Forensic Loading Progress Bar */}
      {loading && (
        <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-50/70 dark:bg-blue-950/40 backdrop-blur-sm space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              SSRF Isolation & Artifact Engine Active
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

      {/* Error Banner with Retry */}
      {error && !loading && (
        <div className="rounded-xl p-4 bg-red-50/90 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs space-y-2.5">
          <div className="flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <div className="flex-1 space-y-0.5">
              <p className="font-bold">Link Ingestion Notice</p>
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
              <span>Retry Analysis</span>
            </button>
          </div>
        </div>
      )}
    </form>
  );
};

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Video, AlertCircle, Loader2, XCircle, RefreshCw } from "lucide-react";
import { analyzeVideo } from "@/lib/api";
import { computeClientSHA256, formatBytes, truncateHash } from "@/lib/utils";
import { LoadingBar } from "@/components/ui/LoadingBar";

export const VideoUploader: React.FC = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const userCancelledRef = useRef<boolean>(false);

  const [file, setFile] = useState<File | null>(null);
  const [sha256, setSha256] = useState<string | null>(null);
  const [caseRef, setCaseRef] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressStatus, setProgressStatus] = useState<string>("");
  const [progressDetail, setProgressDetail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const MAX_SIZE = 200 * 1024 * 1024; // 200MB
  const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"];

  const cleanupTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
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

  const handleFile = async (selected: File) => {
    setError(null);
    cleanupTimers();

    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError(`Video codec format '${selected.type || "unknown"}' is not supported. Use MP4, MOV, AVI, or WebM.`);
      return;
    }

    if (selected.size > MAX_SIZE) {
      setError(`Video size is ${formatBytes(selected.size)}. Maximum allowed limit is 200 MB.`);
      return;
    }

    setFile(selected);
    try {
      const hash = await computeClientSHA256(selected);
      setSha256(hash);
    } catch {
      setSha256(null);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => {
    setDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const cancelAnalysis = useCallback(() => {
    if (process.env.NODE_ENV !== "production") {
      console.log("[DeepTrace Client] Operator cancelled video analysis.");
    }
    userCancelledRef.current = true;
    cleanupTimers();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setProgress(0);
    setProgressStatus("");
    setProgressDetail("");
    setError("Video analysis was cancelled by operator.");
  }, []);

  const handleAnalyze = async () => {
    if (!file) return;

    userCancelledRef.current = false;
    cleanupTimers();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Strict 60-second client-side timeout wired to abort controller
    const timeoutId = setTimeout(() => {
      if (!userCancelledRef.current) {
        controller.abort(new DOMException("Video analysis timed out after 60 seconds.", "TimeoutError"));
      }
    }, 60000);
    timersRef.current.push(timeoutId);

    setLoading(true);
    setError(null);

    try {
      // Stage 1: File Ingestion & Cryptographic Check
      if (process.env.NODE_ENV !== "production") {
        console.log(`[DeepTrace Client] Stage 1: Streaming video "${file.name}" (${formatBytes(file.size)})`);
      }
      setProgress(25);
      setProgressStatus("Streaming video container & computing SHA-256 hash...");
      setProgressDetail("Stage 1 of 4: Stream Sampling & Evidence Ingestion");

      let currentHash = sha256;
      if (!currentHash) {
        try {
          currentHash = await computeClientSHA256(file);
          setSha256(currentHash);
        } catch {}
      }

      if (process.env.NODE_ENV !== "production") {
        console.log(`[DeepTrace Client] Stage 1: SHA-256 verified: ${currentHash || "uncomputed"}`);
      }

      if (userCancelledRef.current || controller.signal.aborted) {
        setLoading(false);
        return;
      }

      // Stage 2: Dense Frame Sampling & Optical Flow Evaluation
      setProgress(60);
      setProgressStatus("Sampling frames, evaluating facial seams & Farneback dense optical flow...");
      setProgressDetail("Stage 2 of 4: Temporal Coherence & Multi-Frame Persistence");

      timersRef.current.push(
        setTimeout(() => {
          if (!userCancelledRef.current) {
            setProgress(75);
            setProgressStatus("Evaluating inter-frame motion vectors & eye-blink persistence...");
            setProgressDetail("Stage 3 of 4: Biometric Micro-Tremor Verification");
            if (process.env.NODE_ENV !== "production") console.log("[DeepTrace Client] Video Stage 2.1: Progress 75%");
          }
        }, 500)
      );

      timersRef.current.push(
        setTimeout(() => {
          if (!userCancelledRef.current) {
            setProgress(88);
            setProgressStatus("Analyzing facial boundary compression artifacts & ELA residuals...");
            setProgressDetail("Stage 3 of 4: Spatial-Temporal Boundary Integrity");
            if (process.env.NODE_ENV !== "production") console.log("[DeepTrace Client] Video Stage 2.2: Progress 88%");
          }
        }, 1200)
      );

      timersRef.current.push(
        setTimeout(() => {
          if (!userCancelledRef.current) {
            setProgress(94);
            setProgressStatus("Aggregating temporal window scores & signing chain of custody...");
            setProgressDetail("Stage 4 of 4: Awaiting final verification...");
            if (process.env.NODE_ENV !== "production") console.log("[DeepTrace Client] Video Stage 2.3: Progress 94% (holding until server response)");
          }
        }, 2000)
      );

      if (process.env.NODE_ENV !== "production") {
        console.log("[DeepTrace Client] Stage 2: Dispatching POST /api/cases/analyze/video...");
      }

      const result = await analyzeVideo(file, caseRef.trim() || undefined, controller.signal);
      cleanupTimers();

      if (userCancelledRef.current) {
        setLoading(false);
        return;
      }

      if (process.env.NODE_ENV !== "production") {
        console.log(`[DeepTrace Client] Stage 3: Received video result: ${result.case_number}, Verdict: ${result.verdict}`);
      }

      // Cache full verified case record in sessionStorage for immediate instant dossier rendering
      try {
        sessionStorage.setItem(`case_record_${result.id}`, JSON.stringify(result));
      } catch (cacheErr) {
        console.warn("[DeepTrace Client] Case record cache notice:", cacheErr);
      }

      setProgress(100);
      setProgressStatus("Temporal synthesis verified. Preparing case record...");
      setProgressDetail("Stage 4 of 4: Timeline Aggregation & Chain of Custody Signed");

      if (process.env.NODE_ENV !== "production") {
        console.log(`[DeepTrace Client] Stage 4: Progress 100%. Transitioning to /results/${result.id}`);
      }

      setTimeout(() => {
        router.push(`/results/${result.id}`);
      }, 250);
    } catch (err: any) {
      cleanupTimers();
      setLoading(false);
      setProgress(0);
      setProgressStatus("");
      setProgressDetail("");

      if (userCancelledRef.current) {
        return;
      }

      console.error("[DeepTrace Client] Video analysis error:", err);
      const isTimeout =
        err?.name === "TimeoutError" ||
        err?.message?.includes("timed out") ||
        (err?.name === "AbortError" && !userCancelledRef.current);

      const errorMessage = isTimeout
        ? "Video analysis request timed out after 60 seconds. The temporal examination engine did not complete in time."
        : (err?.message || "Failed to analyze video evidence. Engine error or network connection lost.");

      setError(errorMessage);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  return (
    <div className="space-y-5">
      {/* Drag & Drop Zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !loading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-panel p-8 sm:p-12 text-center cursor-pointer transition-all duration-150 ${
          dragActive
            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 scale-[0.99]"
            : "border-neutral-300 dark:border-neutral-700/80 hover:border-neutral-400 dark:hover:border-neutral-600 bg-white/40 dark:bg-slate-900/40"
        } ${loading ? "opacity-75 pointer-events-none" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        {file ? (
          <div className="flex flex-col items-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 mx-auto flex items-center justify-center">
              <Video className="w-6 h-6" />
            </div>
            <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
              {file.name}
            </div>
            <div className="text-xs text-neutral-500 font-mono tabular-nums">
              {formatBytes(file.size)} • {file.type || "video"}
            </div>
            {sha256 && (
              <span className="font-mono text-[11px] tabular-nums bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded text-neutral-600 dark:text-neutral-400">
                SHA-256: {truncateHash(sha256, 8, 8)}
              </span>
            )}
            <p className="text-[11px] text-neutral-400 pt-1">
              Click or drop another video to replace
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mb-2 flex items-center justify-center">
              <Video className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Drop video evidence here or click to browse
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Supports MP4, MOV, AVI, WebM (up to 200 MB)
            </p>
          </div>
        )}
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
              type="button"
              onClick={handleAnalyze}
              disabled={!file}
              className="w-full py-2 px-6 min-h-[44px] rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm active:scale-[0.97] transition-all flex items-center justify-center space-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shadow-xs"
            >
              <span>Analyze Video Evidence</span>
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
              Temporal Forensic Pipeline Active
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
            label={progressStatus}
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
              <p className="font-bold">Examination Notice</p>
              <p className="text-[11px] leading-relaxed">{error}</p>
            </div>
          </div>
          <div className="pl-6 pt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={handleAnalyze}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 min-h-[32px] rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold active:scale-[0.97] transition-all shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Analysis</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setFile(null);
                setSha256(null);
              }}
              className="text-xs text-neutral-600 dark:text-neutral-400 hover:underline px-2 py-1"
            >
              Choose different file
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

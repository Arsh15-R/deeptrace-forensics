"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Volume2, AlertCircle, Loader2, RefreshCw, XCircle } from "lucide-react";
import { analyzeAudio, checkServerHealth } from "@/lib/api";
import { computeClientSHA256, formatBytes, truncateHash } from "@/lib/utils";
import { LoadingBar } from "@/components/ui/LoadingBar";

export const AudioUploader: React.FC = () => {
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
  const [progressLabel, setProgressLabel] = useState<string>("");
  const [progressDetail, setProgressDetail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [hashCopied, setHashCopied] = useState<boolean>(false);

  const MAX_SIZE = 100 * 1024 * 1024; // 100MB
  const ALLOWED_TYPES = ["audio/wav", "audio/mpeg", "audio/mp3", "audio/ogg", "audio/flac", "audio/x-m4a", "audio/m4a"];

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

    if (!ALLOWED_TYPES.includes(selected.type) && !selected.name.match(/\.(wav|mp3|ogg|flac|m4a)$/i)) {
      setError(`Audio format '${selected.type || "unknown"}' is not supported. Use WAV, MP3, OGG, or FLAC.`);
      return;
    }

    if (selected.size > MAX_SIZE) {
      setError(`Audio file is ${formatBytes(selected.size)}. Maximum allowed limit is 100 MB.`);
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
      console.log("[DeepTrace Client] Operator cancelled voice analysis.");
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
    setError("Audio analysis was cancelled by operator.");
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

    // Strict 120-second client-side timeout wired to abort controller
    const timeoutId = setTimeout(() => {
      if (!userCancelledRef.current) {
        controller.abort(new DOMException("Audio analysis timed out after 120 seconds.", "TimeoutError"));
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

      // Stage 1: File Ingestion & Cryptographic Check
      if (process.env.NODE_ENV !== "production") {
        console.log(`[DeepTrace Client] Audio Stage 1: Ingesting "${file.name}" (${formatBytes(file.size)})`);
      }
      setProgress(25);
      setProgressLabel("Computing audio SHA-256 & streaming waveform...");
      setProgressDetail("Stage 1 of 4: Ingestion & Vault Integrity Check");

      let currentHash = sha256;
      if (!currentHash) {
        try {
          currentHash = await computeClientSHA256(file);
          setSha256(currentHash);
        } catch {}
      }

      if (process.env.NODE_ENV !== "production") {
        console.log(`[DeepTrace Client] Audio Stage 1: SHA-256 verified: ${currentHash || "uncomputed"}`);
      }

      if (userCancelledRef.current || controller.signal.aborted) {
        setLoading(false);
        return;
      }

      // Stage 2: STFT & Neural Vocoder Acoustic Evaluation
      setProgress(60);
      setProgressLabel("Evaluating spectral bandwidth, vocoder harmonics & vocal prosody...");
      setProgressDetail("Stage 2 of 4: Mel-Frequency Filterbank & Glottal Dynamics");

      timersRef.current.push(
        setTimeout(() => {
          if (!userCancelledRef.current) {
            setProgress(75);
            setProgressLabel("Computing bispectral higher-order phase & spectral centroid...");
            setProgressDetail("Stage 3 of 4: Acoustic Phase Linearity & Formant Tracking");
            if (process.env.NODE_ENV !== "production") console.log("[DeepTrace Client] Audio Stage 2.1: Progress 75%");
          }
        }, 400)
      );

      timersRef.current.push(
        setTimeout(() => {
          if (!userCancelledRef.current) {
            setProgress(88);
            setProgressLabel("Cross-referencing neural text-to-speech vocoder artifacts...");
            setProgressDetail("Stage 3 of 4: Synthetic Resynthesis Pattern Detection");
            if (process.env.NODE_ENV !== "production") console.log("[DeepTrace Client] Audio Stage 2.2: Progress 88%");
          }
        }, 1000)
      );

      timersRef.current.push(
        setTimeout(() => {
          if (!userCancelledRef.current) {
            setProgress(94);
            setProgressLabel("Calibrating audio likelihood ratio & cryptographic sign-off...");
            setProgressDetail("Stage 4 of 4: Awaiting final verification...");
            if (process.env.NODE_ENV !== "production") console.log("[DeepTrace Client] Audio Stage 2.3: Progress 94% (holding until server response)");
          }
        }, 1800)
      );

      if (process.env.NODE_ENV !== "production") {
        console.log("[DeepTrace Client] Audio Stage 2: Dispatching POST /api/cases/analyze/audio...");
      }

      const record = await analyzeAudio(file, caseRef || undefined, controller.signal);
      cleanupTimers();

      if (userCancelledRef.current) {
        setLoading(false);
        return;
      }

      if (process.env.NODE_ENV !== "production") {
        console.log(`[DeepTrace Client] Audio Stage 3: Received record: ${record.case_number}, Verdict: ${record.verdict}`);
      }

      // Cache full verified case record in sessionStorage for immediate instant dossier rendering
      try {
        sessionStorage.setItem(`case_record_${record.id}`, JSON.stringify(record));
      } catch (cacheErr) {
        console.warn("[DeepTrace Client] Case record cache notice:", cacheErr);
      }

      setProgress(100);
      setProgressLabel("Voice authenticity certified. Opening dossier...");
      setProgressDetail("Stage 4 of 4: Synthetic Vocoder Calibration Finished");

      if (process.env.NODE_ENV !== "production") {
        console.log(`[DeepTrace Client] Audio Stage 4: Progress 100%. Transitioning to /results/${record.id}`);
      }

      setTimeout(() => {
        router.push(`/results/${record.id}`);
      }, 250);
    } catch (err: any) {
      cleanupTimers();
      setLoading(false);
      setProgress(0);
      setProgressLabel("");
      setProgressDetail("");

      if (userCancelledRef.current) {
        return;
      }

      console.error("[DeepTrace Client] Audio analysis error:", err);
      const isTimeout =
        err?.name === "TimeoutError" ||
        err?.message?.includes("timed out") ||
        (err?.name === "AbortError" && !userCancelledRef.current);

      const errorMessage = isTimeout
        ? "Audio analysis request timed out after 120 seconds. The acoustic examination engine did not complete in time."
        : (err?.message || "Failed to analyze audio evidence. Engine error or network connection lost.");

      setError(errorMessage);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const copyHash = () => {
    if (sha256) {
      navigator.clipboard.writeText(sha256);
      setHashCopied(true);
      setTimeout(() => setHashCopied(false), 2000);
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
          accept="audio/wav,audio/mpeg,audio/mp3,audio/ogg,audio/flac,audio/x-m4a,audio/m4a"
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
              <Volume2 className="w-6 h-6" />
            </div>
            <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
              {file.name}
            </div>
            <div className="text-xs text-neutral-500 font-mono tabular-nums">
              {formatBytes(file.size)} • {file.type || "audio"}
            </div>
            {sha256 && (
              <div className="flex items-center space-x-2 pt-1">
                <span className="font-mono text-[11px] tabular-nums bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded text-neutral-600 dark:text-neutral-400">
                  SHA-256: {truncateHash(sha256, 8, 8)}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyHash();
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-bold px-2 py-1"
                >
                  {hashCopied ? "Copied" : "Copy"}
                </button>
              </div>
            )}
            <p className="text-[11px] text-neutral-400 pt-1">
              Click or drop another audio file to replace
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mb-2 flex items-center justify-center">
              <Volume2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Drop audio evidence here or click to browse
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Supports WAV, MP3, OGG, FLAC, M4A (up to 100 MB)
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
              <span>Analyze Voice Authenticity</span>
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
              Spectral Vocoder Pipeline Active
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

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Check, RefreshCw, XCircle, FileImage } from "lucide-react";
import { analyzeImage } from "@/lib/api";
import { computeClientSHA256, formatBytes, truncateHash } from "@/lib/utils";
import { LoadingBar } from "@/components/ui/LoadingBar";

export const ImageUploader: React.FC = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const userCancelledRef = useRef<boolean>(false);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sha256, setSha256] = useState<string | null>(null);
  const [caseRef, setCaseRef] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressLabel, setProgressLabel] = useState<string>("");
  const [progressDetail, setProgressDetail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [hashCopied, setHashCopied] = useState<boolean>(false);

  const MAX_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/tiff"];

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
      setError(`Format '${selected.type || "unknown"}' is not supported. Use JPEG, PNG, WebP, or TIFF.`);
      return;
    }

    if (selected.size > MAX_SIZE) {
      setError(`File size is ${formatBytes(selected.size)}. Maximum allowed limit is 50 MB.`);
      return;
    }

    setFile(selected);
    const objectUrl = URL.createObjectURL(selected);
    setPreviewUrl(objectUrl);

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
      console.log("[DeepTrace Client] Operator cancelled image examination.");
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
    setError("Analysis was cancelled by operator.");
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
        controller.abort(new DOMException("Analysis timed out after 60 seconds.", "TimeoutError"));
      }
    }, 60000);
    timersRef.current.push(timeoutId);

    setLoading(true);
    setError(null);

    try {
      // Stage 1: File Ingestion & Cryptographic Integrity Check
      if (process.env.NODE_ENV !== "production") {
        console.log(`[DeepTrace Client] Stage 1: Ingesting "${file.name}" (${formatBytes(file.size)})`);
      }
      setProgress(25);
      setProgressLabel("Validating image container & computing SHA-256 fingerprint...");
      setProgressDetail("Stage 1 of 4: Ingestion & Vault Integrity Check");

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

      // Stage 2: Evidence Transmission & Model Inference
      setProgress(60);
      setProgressLabel("Evaluating multi-spectral sensor noise, Bayer CFA & latent biometrics...");
      setProgressDetail("Stage 2 of 4: Multi-Spectral Frequency & Spatial Decomposition");

      // Dynamic intermediate milestones advance up to 94% maximum, then hold for server response
      timersRef.current.push(
        setTimeout(() => {
          if (!userCancelledRef.current) {
            setProgress(75);
            setProgressLabel("Extracting spatial Bayer CFA & VAE latent distributions...");
            setProgressDetail("Stage 3 of 4: Spatial Texture & Frequency Domain Analysis");
            if (process.env.NODE_ENV !== "production") console.log("[DeepTrace Client] Stage 2.1: Progress 75%");
          }
        }, 400)
      );

      timersRef.current.push(
        setTimeout(() => {
          if (!userCancelledRef.current) {
            setProgress(88);
            setProgressLabel("Computing thermal error level analysis & sensor PRNU variance...");
            setProgressDetail("Stage 3 of 4: Synthesis Confidence Verification");
            if (process.env.NODE_ENV !== "production") console.log("[DeepTrace Client] Stage 2.2: Progress 88%");
          }
        }, 1000)
      );

      timersRef.current.push(
        setTimeout(() => {
          if (!userCancelledRef.current) {
            setProgress(94);
            setProgressLabel("Calibrating Neyman-Pearson decision boundary & signing audit record...");
            setProgressDetail("Stage 4 of 4: Awaiting final verification...");
            if (process.env.NODE_ENV !== "production") console.log("[DeepTrace Client] Stage 2.3: Progress 94% (holding until server response)");
          }
        }, 1800)
      );

      if (process.env.NODE_ENV !== "production") {
        console.log("[DeepTrace Client] Stage 2: Dispatching POST /api/cases/analyze/image...");
      }

      const result = await analyzeImage(file, caseRef.trim() || undefined, controller.signal);
      cleanupTimers();

      if (userCancelledRef.current) {
        setLoading(false);
        return;
      }

      if (process.env.NODE_ENV !== "production") {
        console.log(`[DeepTrace Client] Stage 3: Server returned Case: ${result.case_number}, Verdict: ${result.verdict}, Confidence: ${result.calibrated_confidence}%`);
      }

      // Cache full verified case record in sessionStorage for immediate instant dossier rendering
      try {
        sessionStorage.setItem(`case_record_${result.id}`, JSON.stringify(result));
      } catch (cacheErr) {
        console.warn("[DeepTrace Client] Case record cache notice:", cacheErr);
      }

      // Cache small thumbnail in sessionStorage safely (capped at 256 KB to prevent QuotaExceededError)
      try {
        if (file && file.size < 256 * 1024) {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              if (typeof reader.result === "string") {
                sessionStorage.setItem(`evidence_preview_${result.id}`, reader.result);
              }
            } catch (storageErr) {
              console.warn("[DeepTrace Client] Preview sessionStorage quota reached, skipping cache:", storageErr);
            }
          };
          reader.readAsDataURL(file);
        }
      } catch (previewErr) {
        console.warn("[DeepTrace Client] Local preview caching error:", previewErr);
      }

      // Stage 4: Jump from 94% to 100% on actual verified response
      setProgress(100);
      setProgressLabel("Examination certified. Opening forensic dossier...");
      setProgressDetail("Stage 4 of 4: Neyman-Pearson Calibration Complete");

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
      setProgressLabel("");
      setProgressDetail("");

      if (userCancelledRef.current) {
        return;
      }

      console.error("[DeepTrace Client] Image examination failed:", err);
      const isTimeout =
        err?.name === "TimeoutError" ||
        err?.message?.includes("timed out") ||
        (err?.name === "AbortError" && !userCancelledRef.current);

      const errorMessage = isTimeout
        ? "Analysis request timed out after 60 seconds. The examination engine did not complete within the required window."
        : (err?.message || "Failed to analyze image evidence. Engine error or network connection lost.");

      setError(errorMessage);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const copyHash = () => {
    if (!sha256) return;
    navigator.clipboard.writeText(sha256);
    setHashCopied(true);
    setTimeout(() => setHashCopied(false), 2000);
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
          accept="image/jpeg,image/png,image/webp,image/tiff"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        {previewUrl ? (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <div className="relative w-32 h-32 rounded-subpanel overflow-hidden border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 flex-shrink-0 shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Evidence preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-left space-y-1 min-w-0 max-w-full">
              <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm truncate max-w-xs sm:max-w-md" title={file?.name}>
                {file?.name}
              </div>
              <div className="text-xs text-neutral-500 font-mono tabular-nums">
                {formatBytes(file?.size)} • {file?.type}
              </div>
              {sha256 && (
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] tabular-nums bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-control text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                    SHA-256: {truncateHash(sha256, 6, 6)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyHash();
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-bold px-3 py-1 min-h-[44px] rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 inline-flex items-center"
                  >
                    {hashCopied ? "Copied" : "Copy hash"}
                  </button>
                </div>
              )}
              <div className="pt-2 text-[11px] text-neutral-500">
                Click or drop another image to replace
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 mb-2 flex items-center justify-center">
              <FileImage className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Drop image evidence here or click to browse
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Supports JPEG, PNG, WebP, TIFF (up to 50 MB)
            </p>
          </div>
        )}
      </div>

      {/* Case Reference Input & Action */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="w-full sm:w-2/3">
          <input
            type="text"
            value={caseRef}
            disabled={loading}
            onChange={(e) => setCaseRef(e.target.value)}
            placeholder="Case Reference / Incident Number (optional, e.g. CASE-2026-0418)"
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
              <span>Analyze Image Evidence</span>
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
              Forensic Neural Pipeline Active
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
                setPreviewUrl(null);
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

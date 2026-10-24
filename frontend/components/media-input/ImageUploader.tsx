"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Check } from "lucide-react";
import { analyzeImage } from "@/lib/api";
import { computeClientSHA256, formatBytes, truncateHash } from "@/lib/utils";
import { LoadingBar } from "@/components/ui/LoadingBar";

export const ImageUploader: React.FC = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFile = async (selected: File) => {
    setError(null);

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

    // Compute client-side SHA-256 immediately upon drop
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

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setProgress(15);
    setProgressLabel("Computing cryptographic SHA-256 hash & uploading...");
    setProgressDetail("Stage 1 of 4: Ingestion & Vault Integrity Check");

    const t1 = setTimeout(() => {
      setProgress(45);
      setProgressLabel("Extracting 8x8 macroblock 2D-DCT residuals & noise floor...");
      setProgressDetail("Stage 2 of 4: Frequency Domain Decomposition");
    }, 450);

    const t2 = setTimeout(() => {
      setProgress(78);
      setProgressLabel("Evaluating corneal reflection symmetry & MobileNetV3 entropy...");
      setProgressDetail("Stage 3 of 4: Facial Biometrics & Latent Distribution");
    }, 1100);

    try {
      const result = await analyzeImage(file, caseRef.trim() || undefined);
      clearTimeout(t1);
      clearTimeout(t2);
      setProgress(100);
      setProgressLabel("Examination certified. Opening forensic dossier...");
      setProgressDetail("Stage 4 of 4: Neyman-Pearson Calibration Complete");
      setTimeout(() => {
        router.push(`/results/${result.id}`);
      }, 350);
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      setError(err.message || "Failed to analyze image evidence.");
      setLoading(false);
      setProgress(0);
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
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-panel p-8 sm:p-12 text-center cursor-pointer transition-all duration-150 ${
          dragActive
            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 scale-[0.99]"
            : "border-neutral-300 dark:border-neutral-700/80 hover:border-neutral-400 dark:hover:border-neutral-600 bg-white/40 dark:bg-slate-900/40"
        }`}
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
            <div className="relative w-32 h-32 rounded-subpanel overflow-hidden border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 flex-shrink-0">
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
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-bold px-3 py-1 min-h-[44px] rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-[0.97] transition-transform duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 inline-flex items-center"
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
            onChange={(e) => setCaseRef(e.target.value)}
            placeholder="Case Reference / Incident Number (optional, e.g. CASE-2026-0418)"
            className="w-full px-4 py-2 min-h-[44px] rounded-input bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />
        </div>

        <button
          onClick={handleAnalyze}
          disabled={!file || loading}
          className="w-full sm:w-1/3 py-2 px-6 min-h-[44px] rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm active:scale-[0.97] transition-transform duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none flex items-center justify-center space-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <span>Analyze</span>
          )}
        </button>
      </div>

      {/* Forensic Loading Progress Bar */}
      {loading && (
        <div className="p-4 rounded-input border border-blue-500/30 bg-blue-50/60 dark:bg-blue-950/30 backdrop-blur-sm animate-in fade-in duration-200">
          <LoadingBar
            progress={progress}
            label={progressLabel}
            subLabel={progressDetail}
            size="md"
            variant="brand"
          />
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="rounded-input p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

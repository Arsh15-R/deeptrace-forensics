"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Video, AlertCircle, Loader2 } from "lucide-react";
import { analyzeVideo } from "@/lib/api";
import { computeClientSHA256, formatBytes, truncateHash } from "@/lib/utils";
import { LoadingBar } from "@/components/ui/LoadingBar";

export const VideoUploader: React.FC = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFile = async (selected: File) => {
    setError(null);

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

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setProgress(15);
    setProgressStatus("Streaming video container & computing SHA-256 hash...");
    setProgressDetail("Stage 1 of 4: Stream Sampling & Evidence Ingestion");

    const t1 = setTimeout(() => {
      setProgress(40);
      setProgressStatus("Sampling frames (~1 frame/0.75s) & detecting facial boundaries...");
      setProgressDetail("Stage 2 of 4: Spatial Haar Detection & Boundary Cropping");
    }, 600);

    const t2 = setTimeout(() => {
      setProgress(72);
      setProgressStatus("Calculating Farneback dense optical flow inter-frame shear...");
      setProgressDetail("Stage 3 of 4: Motion Coherence & Multi-Frame Persistence");
    }, 1500);

    try {
      const result = await analyzeVideo(file, caseRef.trim() || undefined);
      clearTimeout(t1);
      clearTimeout(t2);
      setProgress(100);
      setProgressStatus("Temporal synthesis verified. Preparing case record...");
      setProgressDetail("Stage 4 of 4: Timeline Aggregation & Chain of Custody Signed");
      setTimeout(() => {
        router.push(`/results/${result.id}`);
      }, 400);
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      setError(err.message || "Failed to analyze video evidence.");
      setLoading(false);
      setProgress(0);
      setProgressStatus("");
      setProgressDetail("");
    }
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
          accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        {file ? (
          <div className="flex flex-col items-center justify-center space-y-2 min-w-0 max-w-full">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Video className="w-6 h-6" />
            </div>
            <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm truncate max-w-xs sm:max-w-md" title={file.name}>
              {file.name}
            </div>
            <div className="text-xs text-neutral-500 font-mono tabular-nums">
              {formatBytes(file.size)} • {file.type || "video/mp4"}
            </div>
            {sha256 && (
              <span className="font-mono text-[11px] tabular-nums bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-control text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                SHA-256: {truncateHash(sha256, 8, 8)}
              </span>
            )}
            <p className="text-[11px] text-neutral-500 pt-1">
              Click or drop another video to replace
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Drop surveillance or video evidence here
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
            onChange={(e) => setCaseRef(e.target.value)}
            placeholder="Case Reference / Incident Number (optional)"
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
              <span>Analyzing frames...</span>
            </>
          ) : (
            <span>Analyze video</span>
          )}
        </button>
      </div>

      {/* Forensic Loading Progress Bar */}
      {loading && (
        <div className="p-4 rounded-input border border-blue-500/30 bg-blue-50/60 dark:bg-blue-950/30 backdrop-blur-sm animate-in fade-in duration-200">
          <LoadingBar
            progress={progress}
            label={progressStatus}
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

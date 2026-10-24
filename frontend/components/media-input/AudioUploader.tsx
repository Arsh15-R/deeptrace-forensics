"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Volume2, AlertCircle, Loader2, Check } from "lucide-react";
import { analyzeAudio } from "@/lib/api";
import { computeClientSHA256, formatBytes, truncateHash } from "@/lib/utils";
import { LoadingBar } from "@/components/ui/LoadingBar";

export const AudioUploader: React.FC = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
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
  const ALLOWED_EXTS = [".wav", ".mp3", ".m4a", ".ogg", ".flac", ".aac"];

  const handleFile = async (selected: File) => {
    setError(null);
    const ext = "." + (selected.name.split(".").pop() || "").toLowerCase();

    if (!ALLOWED_EXTS.includes(ext) && !selected.type.startsWith("audio/")) {
      setError(`Format '${selected.name}' is not supported. Use WAV, MP3, M4A, OGG, or FLAC.`);
      return;
    }

    if (selected.size > MAX_SIZE) {
      setError(`File size is ${formatBytes(selected.size)}. Maximum allowed limit is 50 MB.`);
      return;
    }

    setFile(selected);
    const objectUrl = URL.createObjectURL(selected);
    setAudioUrl(objectUrl);

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
    setProgress(18);
    setProgressLabel("Computing audio SHA-256 & streaming waveform...");
    setProgressDetail("Stage 1 of 4: Ingestion & Vault Upload");

    const t1 = setTimeout(() => {
      setProgress(48);
      setProgressLabel("Computing Short-Time Fourier Transform (STFT) spectrogram...");
      setProgressDetail("Stage 2 of 4: Mel-Frequency Filterbank Decomposition");
    }, 500);

    const t2 = setTimeout(() => {
      setProgress(76);
      setProgressLabel("Analyzing >8 kHz vocoder brickwall cutoffs & SNR floor...");
      setProgressDetail("Stage 3 of 4: Phase Coherence & Silence Dropouts");
    }, 1300);

    try {
      const record = await analyzeAudio(file, caseRef || undefined);
      clearTimeout(t1);
      clearTimeout(t2);
      setProgress(100);
      setProgressLabel("Voice authenticity evaluated. Opening dossier...");
      setProgressDetail("Stage 4 of 4: Synthetic Vocoder Calibration Finished");
      setTimeout(() => {
        router.push(`/results/${record.id}`);
      }, 350);
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      setError(err.message || "Failed to analyze audio evidence.");
      setLoading(false);
      setProgress(0);
      setProgressLabel("");
      setProgressDetail("");
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
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-panel p-6 text-center cursor-pointer transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          dragActive
            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
            : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 bg-white/40 dark:bg-neutral-900/40"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        <div className="space-y-2">
          <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 mx-auto flex items-center justify-center">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
              Drag and drop questioned voice clip or audio file
            </span>
            <p className="text-[11px] text-neutral-500 mt-1">
              Supports WAV, MP3, M4A, OGG, and FLAC (Up to 50 MB)
            </p>
          </div>
        </div>
      </div>

      {/* Selected File Details & Audio Preview */}
      {file && (
        <div className="p-4 rounded-input border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-neutral-900 dark:text-neutral-100 block">
                {file.name}
              </span>
              <span className="text-neutral-500 font-mono text-[11px]">
                {formatBytes(file.size)}
              </span>
            </div>
            {sha256 && (
              <button
                type="button"
                onClick={copyHash}
                className="font-mono text-[11px] px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center space-x-1"
                title="Click to copy full SHA-256 hash"
              >
                <span>SHA-256: {truncateHash(sha256, 6)}</span>
                {hashCopied && <Check className="w-3 h-3 text-green-600" />}
              </button>
            )}
          </div>

          {audioUrl && (
            <div className="pt-2">
              <audio controls src={audioUrl} className="w-full h-10 rounded" />
            </div>
          )}
        </div>
      )}

      {/* Case Reference Input */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
          Case Reference or Evidence Tag (Optional)
        </label>
        <input
          type="text"
          value={caseRef}
          onChange={(e) => setCaseRef(e.target.value)}
          placeholder="e.g. CASE-2026-9042 or WIRE-TAP-01"
          className="w-full px-3 py-2 rounded-input border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
      </div>

      {error && (
        <div className="p-3 rounded-input bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Submission Action Button */}
      <button
        onClick={handleAnalyze}
        disabled={!file || loading}
        className="w-full py-2.5 px-4 min-h-[44px] rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center space-x-2 active:scale-[0.98] transition-transform duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Analyzing Voice Harmonics...</span>
          </>
        ) : (
          <span>Analyze Voice Authenticity</span>
        )}
      </button>

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

      <p className="text-[11px] text-neutral-500 text-center">
        Note: Ambient room noise and low microphone SNR are calibrated separately from neural speech vocoder artifacts.
      </p>
    </div>
  );
};

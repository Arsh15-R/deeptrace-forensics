"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Link as LinkIcon, AlertCircle, Loader2 } from "lucide-react";
import { analyzeLink } from "@/lib/api";
import { LoadingBar } from "@/components/ui/LoadingBar";

export const LinkInput: React.FC = () => {
  const router = useRouter();

  const [url, setUrl] = useState<string>("");
  const [caseRef, setCaseRef] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressLabel, setProgressLabel] = useState<string>("");
  const [progressDetail, setProgressDetail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setError(null);

    // Quick client-side check
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      setError("Please provide a complete URL beginning with https:// or http://");
      return;
    }

    setLoading(true);
    setProgress(20);
    setProgressLabel("Evaluating URL destination & SSRF isolation...");
    setProgressDetail("Stage 1 of 4: DNS Resolution & Private Subnet Guard");

    const t1 = setTimeout(() => {
      setProgress(50);
      setProgressLabel("Streaming remote binary container & hashing...");
      setProgressDetail("Stage 2 of 4: Media Header & Payload Validation");
    }, 450);

    const t2 = setTimeout(() => {
      setProgress(80);
      setProgressLabel("Running multimodal forensic sensor artifact analysis...");
      setProgressDetail("Stage 3 of 4: Neural Feature & Frequency Inspection");
    }, 1100);

    try {
      const result = await analyzeLink(url.trim(), caseRef.trim() || undefined);
      clearTimeout(t1);
      clearTimeout(t2);
      setProgress(100);
      setProgressLabel("Remote evidence analyzed. Opening dossier...");
      setProgressDetail("Stage 4 of 4: Cryptographic Ledger Certified");
      setTimeout(() => {
        router.push(`/results/${result.id}`);
      }, 350);
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      setError(err.message || "Failed to fetch and evaluate media from the specified link.");
      setLoading(false);
      setProgress(0);
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
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://evidence-host.org/records/incident_capture.jpg"
            required
            className="w-full pl-10 pr-4 py-2 min-h-[44px] rounded-input bg-white/70 dark:bg-slate-900/70 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
            onChange={(e) => setCaseRef(e.target.value)}
            placeholder="Case Reference / Incident Number (optional)"
            className="w-full px-4 py-2 min-h-[44px] rounded-input bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={!url.trim() || loading}
          className="w-full sm:w-1/3 py-2 px-6 min-h-[44px] rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm active:scale-[0.97] transition-transform duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none flex items-center justify-center space-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Fetching media...</span>
            </>
          ) : (
            <span>Fetch and analyze</span>
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
    </form>
  );
};

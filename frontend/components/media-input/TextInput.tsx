"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, AlertCircle, Loader2, Upload } from "lucide-react";
import { analyzeText, submitAnalysisJob, getAnalysisJobStatus } from "@/lib/api";
import { LoadingBar } from "@/components/ui/LoadingBar";

export const TextInput: React.FC = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState<string>("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [caseRef, setCaseRef] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState<string>("Analyzing syntax...");
  const [progressDetail, setProgressDetail] = useState<string>("");

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  const handleDocumentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDocFile(file);
      setError(null);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !docFile) return;

    if (!docFile && text.trim().length < 20) {
      setError("Please provide at least 20 characters of text for statistical evaluation.");
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(15);
    setProgressMsg("Submitting text analysis job...");
    setProgressDetail("Stage 1 of 4: Ingestion & Corpus Tokenization");

    try {
      if (docFile) {
        // Upload document via unified job endpoint
        setProgress(30);
        setProgressMsg("Parsing document structure & stylometry...");
        setProgressDetail("Stage 2 of 4: PyPDF / DOCX Structural Text Extraction");
        const job = await submitAnalysisJob({
          file: docFile,
          mediaType: "text"
        });
        
        // Poll job status
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts += 1;
          try {
            const st = await getAnalysisJobStatus(job.jobId);
            if (st.progress) {
              setProgress(st.progress);
            }
            if (st.status === "completed") {
              clearInterval(interval);
              setProgress(100);
              setProgressMsg("Document examination complete.");
              setProgressDetail("Stage 4 of 4: Stylometric Verdict Certified");
              setTimeout(() => {
                router.push(`/results/${job.jobId}`);
              }, 300);
            } else if (st.status === "failed") {
              clearInterval(interval);
              setError(st.error || "Analysis failed.");
              setLoading(false);
              setProgress(0);
            } else {
              setProgressMsg("Evaluating Shannon entropy & sentence burstiness...");
              setProgressDetail("Stage 3 of 4: Perplexity & Transition Phrase Density");
            }
          } catch {
            if (attempts > 20) {
              clearInterval(interval);
              router.push(`/results/${job.jobId}`);
            }
          }
        }, 800);
      } else {
        const t1 = setTimeout(() => {
          setProgress(50);
          setProgressMsg("Evaluating Shannon entropy & Type-Token Ratio (TTR)...");
          setProgressDetail("Stage 2 of 4: Vocabulary Diversity & N-Gram Distribution");
        }, 400);

        const t2 = setTimeout(() => {
          setProgress(80);
          setProgressMsg("Calculating sentence length variance & burstiness...");
          setProgressDetail("Stage 3 of 4: Formulaic Phrase Filtering & Calibration");
        }, 800);

        const result = await analyzeText(text.trim(), caseRef.trim() || undefined);
        clearTimeout(t1);
        clearTimeout(t2);
        setProgress(100);
        setProgressMsg("Linguistic evaluation certified.");
        setProgressDetail("Stage 4 of 4: Forensic Uncertainty Calibrated");
        setTimeout(() => {
          router.push(`/results/${result.id}`);
        }, 300);
      }
    } catch (err: any) {
      setError(err.message || "Failed to analyze textual statement.");
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <form onSubmit={handleAnalyze} className="space-y-4">
      {/* Prominent Text Detection Reliability Advisory */}
      <div className="rounded-input p-4 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start space-x-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed max-w-[65ch]">
          <strong className="font-semibold text-amber-950 dark:text-amber-100">
            Important Reliability Notice:
          </strong>{" "}
          Statistical text detection (burstiness, perplexity, and syntax variance) is substantially less reliable than image or video sensor artifact detection. False positive rates can be elevated on formal, technical, or non-native English writing. Results must be treated with heightened caution and corroborated by physical or testamentary evidence.
        </div>
      </div>

      {/* Document File Uploader Option */}
      <div className="flex items-center justify-between p-3 rounded-input border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 text-xs">
        <div className="flex items-center space-x-2">
          <Upload className="w-4 h-4 text-neutral-500" />
          <span className="text-neutral-700 dark:text-neutral-300">
            {docFile ? `Selected document: ${docFile.name}` : "Or upload statement document (.pdf, .docx, .txt)"}
          </span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,application/pdf,text/plain"
          className="hidden"
          onChange={handleDocumentSelect}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          {docFile ? "Change file" : "Browse file"}
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs text-neutral-500">
          <label className="font-semibold text-neutral-700 dark:text-neutral-300">
            Statement, Transcript, or Written Evidence
          </label>
          <span className="font-mono tabular-nums">
            {wordCount} words • {charCount} chars
          </span>
        </div>

        <textarea
          rows={7}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (docFile) setDocFile(null);
          }}
          placeholder="Paste suspect statement, witness transcript, email text, or social media narrative for linguistic burstiness and syntactic regularity evaluation..."
          className="w-full px-4 py-3 rounded-input bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 resize-y"
        />
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
          disabled={(!text.trim() && !docFile) || loading}
          className="w-full sm:w-1/3 py-2 px-6 min-h-[44px] rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm active:scale-[0.97] transition-transform duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none flex items-center justify-center space-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{progressMsg}</span>
            </>
          ) : (
            <span>Analyze text</span>
          )}
        </button>
      </div>

      {/* Forensic Loading Progress Bar */}
      {loading && (
        <div className="p-4 rounded-input border border-blue-500/30 bg-blue-50/60 dark:bg-blue-950/30 backdrop-blur-sm animate-in fade-in duration-200">
          <LoadingBar
            progress={progress}
            label={progressMsg}
            subLabel={progressDetail}
            size="md"
            variant="brand"
          />
        </div>
      )}

      {error && (
        <div className="p-3 rounded-input bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </form>
  );
};

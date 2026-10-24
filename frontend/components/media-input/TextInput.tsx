"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, AlertCircle, Loader2, Upload, RefreshCw, XCircle } from "lucide-react";
import { analyzeText, submitAnalysisJob, getAnalysisJobStatus, checkServerHealth } from "@/lib/api";
import { LoadingBar } from "@/components/ui/LoadingBar";

export const TextInput: React.FC = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const userCancelledRef = useRef<boolean>(false);

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

  const handleDocumentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDocFile(file);
      setError(null);
    }
  };

  const cancelAnalysis = useCallback(() => {
    userCancelledRef.current = true;
    cleanupTimers();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setProgress(0);
    setProgressMsg("");
    setProgressDetail("");
    setError("Text analysis was cancelled by operator.");
  }, []);

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() && !docFile) return;

    if (!docFile && wordCount < 20) {
      setError(
        `Linguistic stylometry requires at least 20 words of natural text for authorial analysis (currently ${wordCount} word${wordCount === 1 ? "" : "s"}). Please enter a complete statement or paragraph.`
      );
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
        controller.abort(new DOMException("Text analysis timed out after 120 seconds.", "TimeoutError"));
      }
    }, 120000);
    timersRef.current.push(timeoutId);

    setLoading(true);
    setError(null);
    setProgress(10);
    setProgressMsg("Verifying analysis engine connectivity...");
    setProgressDetail("Establishing tunnel connection to forensic server...");

    try {
      // Early health check against /api/health
      const health = await checkServerHealth(controller.signal);
      if (!health.ok) {
        cleanupTimers();
        setLoading(false);
        setProgress(0);
        setProgressMsg("");
        setProgressDetail("");
        setError(health.error || "Analysis server is offline. Start the laptop server and tunnel.");
        return;
      }

      setProgress(25);
      setProgressMsg("Tokenizing statement corpus & calculating Shannon entropy...");
      setProgressDetail("Stage 1 of 4: Ingestion & Corpus Tokenization");

      if (process.env.NODE_ENV !== "production") {
        console.log(`[DeepTrace Client] Text Stage 1: Ingesting text/doc payload`);
      }
      if (docFile) {
        setProgress(50);
        setProgressMsg("Parsing document structure & stylometry...");
        setProgressDetail("Stage 2 of 4: PyPDF / DOCX Structural Text Extraction");

        const job = await submitAnalysisJob(
          { file: docFile, mediaType: "text" },
          controller.signal
        );

        let attempts = 0;
        const intervalId = setInterval(async () => {
          attempts += 1;
          try {
            const st = await getAnalysisJobStatus(job.jobId, controller.signal);
            if (st.progress) {
              setProgress(st.progress);
            }
            if (st.status === "completed") {
              cleanupTimers();
              setProgress(100);
              setProgressMsg("Document examination complete.");
              setProgressDetail("Stage 4 of 4: Stylometric Verdict Certified");
              setTimeout(() => {
                router.push(`/results/${job.jobId}`);
              }, 300);
            } else if (st.status === "failed") {
              cleanupTimers();
              setError(st.error || "Document analysis failed.");
              setLoading(false);
              setProgress(0);
            }
          } catch {
            if (attempts > 15) {
              cleanupTimers();
              router.push(`/results/${job.jobId}`);
            }
          }
        }, 800);
        timersRef.current.push(intervalId);
      } else {
        setProgress(60);
        setProgressMsg("Evaluating Shannon entropy, Zipfian slope & sentence burstiness...");
        setProgressDetail("Stage 2 of 4: Perplexity & Transition Cliché Density");

        timersRef.current.push(
          setTimeout(() => {
            if (!userCancelledRef.current) {
              setProgress(75);
              setProgressMsg("Analyzing lexical diversity & Zipfian frequency rank distribution...");
              setProgressDetail("Stage 3 of 4: Lexical Diversity & Vocabulary Ranks");
              if (process.env.NODE_ENV !== "production") console.log("[DeepTrace Client] Text Stage 2.1: Progress 75%");
            }
          }, 400)
        );

        timersRef.current.push(
          setTimeout(() => {
            if (!userCancelledRef.current) {
              setProgress(88);
              setProgressMsg("Evaluating sentence burstiness & formulaic transition markers...");
              setProgressDetail("Stage 3 of 4: Syntactic Rhythm & Stylometric Markers");
              if (process.env.NODE_ENV !== "production") console.log("[DeepTrace Client] Text Stage 2.2: Progress 88%");
            }
          }, 1000)
        );

        timersRef.current.push(
          setTimeout(() => {
            if (!userCancelledRef.current) {
              setProgress(94);
              setProgressMsg("Calibrating linguistic likelihood ratio & signing audit record...");
              setProgressDetail("Stage 4 of 4: Awaiting final verification...");
              if (process.env.NODE_ENV !== "production") console.log("[DeepTrace Client] Text Stage 2.3: Progress 94% (holding until server response)");
            }
          }, 1800)
        );

        if (process.env.NODE_ENV !== "production") {
          console.log("[DeepTrace Client] Text Stage 2: Dispatching POST /api/cases/analyze/text...");
        }

        const result = await analyzeText(text, caseRef.trim() || undefined, controller.signal);
        cleanupTimers();

        if (userCancelledRef.current) {
          setLoading(false);
          return;
        }

        if (process.env.NODE_ENV !== "production") {
          console.log(`[DeepTrace Client] Text Stage 3: Server returned Case: ${result.case_number}, Verdict: ${result.verdict}`);
        }

        // Cache full verified case record in sessionStorage for immediate instant dossier rendering
        try {
          sessionStorage.setItem(`case_record_${result.id}`, JSON.stringify(result));
        } catch (cacheErr) {
          console.warn("[DeepTrace Client] Case record cache notice:", cacheErr);
        }

        setProgress(100);
        setProgressMsg("Linguistic evaluation certified. Opening dossier...");
        setProgressDetail("Stage 4 of 4: Forensic Uncertainty Calibrated");

        if (process.env.NODE_ENV !== "production") {
          console.log(`[DeepTrace Client] Text Stage 4: Progress 100%. Transitioning to /results/${result.id}`);
        }

        setTimeout(() => {
          try {
            router.push(`/results/${result.id}`);
          } catch {
            window.location.href = `/results/${result.id}`;
          }
        }, 200);
      }
    } catch (err: any) {
      cleanupTimers();
      setLoading(false);
      setProgress(0);
      setProgressMsg("");
      setProgressDetail("");

      if (userCancelledRef.current) return;

      console.error("[DeepTrace Client] Text analysis error:", err);
      const isTimeout =
        err?.name === "TimeoutError" ||
        err?.message?.includes("timed out") ||
        (err?.name === "AbortError" && !userCancelledRef.current);

      const errorMessage = isTimeout
        ? "Text analysis request timed out after 120 seconds. The stylometric engine did not respond in time."
        : (err?.message || "Failed to evaluate text statement.");

      setError(errorMessage);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  return (
    <form onSubmit={handleAnalyze} className="space-y-4">
      {/* Textarea or Uploaded Document */}
      <div className="relative">
        <textarea
          rows={8}
          value={text}
          disabled={loading}
          onChange={(e) => {
            setText(e.target.value);
            if (docFile) setDocFile(null);
          }}
          placeholder="Paste suspect statement, witness testimony, email transcript, or synthetic speech script for stylometric verification..."
          className="w-full p-4 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white/70 dark:bg-neutral-900/70 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono disabled:opacity-60"
        />

        {/* Counter & Document Upload Button */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-2 px-1 text-xs text-neutral-500">
          <div className="flex items-center space-x-3">
            <span>
              <b>{wordCount}</b> words
            </span>
            <span>•</span>
            <span>
              <b>{charCount}</b> characters
            </span>
            {wordCount < 20 && wordCount > 0 ? (
              <span className="text-amber-500 font-medium">
                (Need &ge; 20 words for forensic evaluation)
              </span>
            ) : wordCount >= 20 ? (
              <span className="text-emerald-500 font-medium">
                (&ge; 20 words: Valid corpus for stylometry)
              </span>
            ) : null}
          </div>

          <div className="flex items-center space-x-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              className="hidden"
              onChange={handleDocumentSelect}
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium transition-colors text-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{docFile ? docFile.name : "Or Upload Document (.pdf, .docx, .txt)"}</span>
            </button>
            {docFile && (
              <button
                type="button"
                onClick={() => setDocFile(null)}
                className="text-red-500 hover:underline text-xs"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Case Reference & Submit */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
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
              disabled={!text.trim() && !docFile}
              className="w-full py-2 px-6 min-h-[44px] rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm active:scale-[0.97] transition-all flex items-center justify-center space-x-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shadow-xs"
            >
              <span>Analyze Text Authenticity</span>
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
              Stylometric Syntactic Pipeline Active
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
            label={progressMsg}
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
              <p className="font-bold">Linguistic Evaluation Notice</p>
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

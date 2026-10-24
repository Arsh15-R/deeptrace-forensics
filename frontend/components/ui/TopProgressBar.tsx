"use client";

import React, { useEffect, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export const TopProgressBar: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [, startTransition] = useTransition();

  // Trigger loading sweep on route changes
  useEffect(() => {
    setLoading(true);
    setProgress(20);

    const timer1 = setTimeout(() => setProgress(65), 100);
    const timer2 = setTimeout(() => setProgress(90), 250);
    const timer3 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 200);
    }, 400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [pathname, searchParams]);

  // Listen for custom forensic events
  useEffect(() => {
    const handleStart = () => {
      setLoading(true);
      setProgress(25);
    };

    const handleProgress = (e: Event) => {
      const customEvent = e as CustomEvent<{ progress: number }>;
      if (customEvent.detail && typeof customEvent.detail.progress === "number") {
        setLoading(true);
        setProgress(customEvent.detail.progress);
      }
    };

    const handleComplete = () => {
      setProgress(100);
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 250);
    };

    window.addEventListener("truthlens:start", handleStart);
    window.addEventListener("truthlens:progress", handleProgress);
    window.addEventListener("truthlens:complete", handleComplete);

    return () => {
      window.removeEventListener("truthlens:start", handleStart);
      window.removeEventListener("truthlens:progress", handleProgress);
      window.removeEventListener("truthlens:complete", handleComplete);
    };
  }, []);

  if (!loading && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none overflow-hidden bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-500 transition-all duration-200 ease-out shadow-[0_0_10px_rgba(10,132,255,0.8)]"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transition: "width 200ms ease-out, opacity 250ms ease-in",
        }}
      />
    </div>
  );
};

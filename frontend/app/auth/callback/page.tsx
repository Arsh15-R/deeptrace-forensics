"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { supabase, syncUserFromSession } from "@/lib/supabaseClient";
import { ShieldCheck, Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function handleAuth() {
      // 1. Check for URL error parameters from Google OAuth provider
      const errorParam = searchParams.get("error");
      const errorDesc = searchParams.get("error_description");

      if (errorParam || errorDesc) {
        if (isMounted) {
          setStatus("error");
          setErrorMessage(
            errorDesc ||
            errorParam ||
            "Google authentication was cancelled or could not be completed."
          );
        }
        return;
      }

      if (!supabase) {
        if (isMounted) {
          setStatus("error");
          setErrorMessage("Supabase authentication client is not initialized.");
        }
        return;
      }

      try {
        // 2. Exchange authorization code for session (PKCE flow)
        const code = searchParams.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        // 3. Verify session exists & sync user details to persistent storage
        let { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!session && typeof window !== "undefined" && window.location.hash) {
          // Give Supabase a moment to parse the URL hash fragment (implicit OAuth flow)
          await new Promise((resolve) => setTimeout(resolve, 600));
          const { data: retrySession } = await supabase.auth.getSession();
          if (retrySession?.session) {
            session = retrySession.session;
          }
        }

        if (!session) {
          const { data: retryData } = await supabase.auth.getUser();
          if (!retryData?.user) {
            throw new Error("No active authentication session detected. Please sign in again.");
          }
        }

        await syncUserFromSession();

        if (isMounted) {
          setStatus("success");
        }

        // 4. Safe destination redirect
        const nextParam = searchParams.get("next");
        let target = "/";
        if (nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")) {
          target = nextParam;
        }

        // Brief delay for smooth UX transition
        setTimeout(() => {
          if (isMounted) {
            router.replace(target);
          }
        }, 800);
      } catch (err: any) {
        console.error("Auth callback error:", err);
        if (isMounted) {
          setStatus("error");
          setErrorMessage(err.message || "Failed to finalize authentication session.");
        }
      }
    }

    handleAuth();

    return () => {
      isMounted = false;
    };
  }, [searchParams, router]);

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <GlassCard variant="main" className="text-center space-y-6">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-blue-500/20">
          <ShieldCheck className="w-6 h-6" />
        </div>

        {status === "loading" && (
          <div className="space-y-3">
            <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
              Authenticating Credentials
            </h1>
            <p className="text-xs text-neutral-500 max-w-[65ch]">
              Verifying Google OAuth token with Department Identity Vault...
            </p>
            <div className="flex items-center justify-center pt-4">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
              Authentication Approved
            </h1>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Identity verified. Establishing encrypted forensic session...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-start space-x-2 text-left">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Authentication Failed</p>
                <p className="mt-0.5 text-[11px] leading-relaxed">{errorMessage}</p>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center space-x-2 w-full py-2.5 px-4 min-h-[44px] rounded-full bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-white text-white dark:text-neutral-900 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto py-16 px-4">
          <GlassCard variant="main" className="text-center space-y-4 py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
            <p className="text-xs text-neutral-500">Initializing secure session...</p>
          </GlassCard>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}

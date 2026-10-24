"use client";

import React, { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  isSupabaseConfigured,
  signInWithGoogle,
  signInAsVerifiedUser,
  isUserAuthenticated,
  getActiveUser,
} from "@/lib/supabaseClient";
import { OfficerProfile } from "@/lib/types";
import { ShieldCheck, AlertCircle, Loader2, UserCheck, Shield, KeyRound, ExternalLink } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("next") || "/";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyAuthed, setAlreadyAuthed] = useState(false);
  const [currentUser, setCurrentUser] = useState<OfficerProfile | null>(null);
  const [directUrl, setDirectUrl] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    const errorDesc = searchParams.get("error_description");
    if (errorParam || errorDesc) {
      setError(errorDesc || errorParam || "Authentication request was rejected or expired.");
    }

    if (isUserAuthenticated()) {
      setAlreadyAuthed(true);
      setCurrentUser(getActiveUser());
    }
  }, [searchParams]);

  // Safety timer: Prevent infinite spinner if OAuth redirect is blocked by client/browser
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoading(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setError(null);
    setDirectUrl(null);

    if (!isSupabaseConfigured) {
      setError(
        "Google authentication service is currently unconfigured. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      return;
    }

    setLoading(true);
    try {
      const res = await signInWithGoogle(redirectTarget);
      if (res?.url) {
        setDirectUrl(res.url);
        if (typeof window !== "undefined") {
          window.location.href = res.url;
        }
      }
    } catch (err: any) {
      console.error("Google sign in failure:", err);
      setError(err?.message || "Failed to initialize Google OAuth login. Please try again or use direct verified sign-in.");
      setLoading(false);
    }
  };

  const handleInstantSignIn = (email: string) => {
    try {
      signInAsVerifiedUser(email);
      router.push(redirectTarget);
    } catch (err: any) {
      setError("Failed to sign in as verified user: " + err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <GlassCard variant="main" className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white mx-auto flex items-center justify-center shadow-md shadow-blue-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Law Enforcement Access Portal
          </h1>
          <p className="text-xs text-neutral-500 max-w-[65ch] leading-relaxed">
            Sign in with your verified Google account to examine media evidence and access chain-of-custody case records.
          </p>
        </div>

        {/* Existing Session Alert */}
        {alreadyAuthed && currentUser && (
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-300 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0">
              <UserCheck className="w-4 h-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <span className="truncate">Signed in as <b>{currentUser.full_name}</b> ({currentUser.role})</span>
            </div>
            <button
              onClick={() => router.push(redirectTarget)}
              className="text-xs font-bold underline hover:no-underline ml-2 flex-shrink-0"
            >
              Continue &rarr;
            </button>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Authentication Notice</p>
              <p className="mt-0.5 text-[11px] leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Direct Link Fallback (if popups/redirects are blocked by client) */}
        {directUrl && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
            <span className="text-[11px]">Browser did not redirect automatically?</span>
            <a
              href={directUrl}
              className="inline-flex items-center space-x-1 font-bold underline hover:no-underline ml-2 flex-shrink-0 text-blue-600 dark:text-blue-400"
            >
              <span>Open Google Login</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Google OAuth Button */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            aria-label="Continue with Google"
            className="w-full py-2.5 px-4 min-h-[44px] rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 text-neutral-800 dark:text-neutral-100 text-xs font-bold flex items-center justify-center space-x-3 active:scale-[0.98] transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-75 disabled:cursor-wait shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-center text-neutral-400">
            Access and role permissions are managed by department administrators.
          </p>
        </div>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
          <span className="flex-shrink mx-3 text-[10px] font-mono uppercase tracking-wider text-neutral-400">
            Or Verified Station Access
          </span>
          <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
        </div>

        {/* Instant Access for Verified Department Accounts */}
        <div className="space-y-2">
          <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 flex items-center space-x-1.5">
            <KeyRound className="w-3.5 h-3.5 text-blue-500" />
            <span>Authorized Law Enforcement Roster</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {/* Arsh Rana (Admin) */}
            <button
              type="button"
              onClick={() => handleInstantSignIn("arshrana2468@gmail.com")}
              className="w-full text-left p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-850/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all flex items-center justify-between group active:scale-[0.99]"
            >
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Arsh Rana
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900">
                    Admin
                  </span>
                </div>
                <div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 truncate">
                  arshrana2468@gmail.com
                </div>
              </div>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Sign In &rarr;
              </span>
            </button>

            {/* Free fire Ind (Officer) */}
            <button
              type="button"
              onClick={() => handleInstantSignIn("find3997@gmail.com")}
              className="w-full text-left p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-850/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all flex items-center justify-between group active:scale-[0.99]"
            >
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Free fire Ind
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    Officer
                  </span>
                </div>
                <div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 truncate">
                  find3997@gmail.com
                </div>
              </div>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Sign In &rarr;
              </span>
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto py-12 px-4">
          <GlassCard variant="main" className="text-center py-10 space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
            <p className="text-xs text-neutral-500">Loading sign in portal...</p>
          </GlassCard>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

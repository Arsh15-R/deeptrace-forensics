"use client";

import React, { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  isSupabaseConfigured,
  signInWithGoogle,
  isUserAuthenticated,
  getActiveUser,
} from "@/lib/supabaseClient";
import { OfficerProfile } from "@/lib/types";
import { UserPlus, AlertCircle, Loader2, UserCheck } from "lucide-react";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("next") || "/";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyAuthed, setAlreadyAuthed] = useState(false);
  const [currentUser, setCurrentUser] = useState<OfficerProfile | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    const errorDesc = searchParams.get("error_description");
    if (errorParam || errorDesc) {
      setError(errorDesc || errorParam || "Registration request encountered an issue.");
    }

    if (isUserAuthenticated()) {
      setAlreadyAuthed(true);
      setCurrentUser(getActiveUser());
    }
  }, [searchParams]);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoading(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const handleGoogleSignUp = async () => {
    if (loading) return;
    setError(null);

    if (!isSupabaseConfigured) {
      setError(
        "Google authentication service is currently unconfigured. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      return;
    }

    setLoading(true);
    try {
      const res = await signInWithGoogle(redirectTarget);
      if (res?.url && typeof window !== "undefined") {
        window.location.href = res.url;
      }
    } catch (err: any) {
      console.error("Google sign up failure:", err);
      setError(err?.message || "Failed to initialize Google OAuth registration.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <GlassCard variant="main" className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white mx-auto flex items-center justify-center shadow-md shadow-blue-500/20">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Officer Registration
          </h1>
          <p className="text-xs text-neutral-500 max-w-[65ch] leading-relaxed">
            Register your authorized Google account. New accounts are created with Viewer access until promoted to Officer by an administrator.
          </p>
        </div>

        {/* Existing Session Alert */}
        {alreadyAuthed && currentUser && (
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-300 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0">
              <UserCheck className="w-4 h-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <span className="truncate">Signed in as <b>{currentUser.full_name}</b></span>
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
              <p className="font-semibold">Registration Notice</p>
              <p className="mt-0.5 text-[11px] leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Google OAuth Only */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={loading}
            aria-label="Register with Google"
            className="w-full py-2.5 px-4 min-h-[44px] rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 text-neutral-800 dark:text-neutral-100 text-xs font-bold flex items-center justify-center space-x-3 active:scale-[0.98] transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
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
                <span>Register with Google</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-center text-neutral-400">
            Already have an officer account?{" "}
            <Link href="/login" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </GlassCard>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto py-12 px-4">
          <GlassCard variant="main" className="text-center py-10 space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
            <p className="text-xs text-neutral-500">Loading registration portal...</p>
          </GlassCard>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}

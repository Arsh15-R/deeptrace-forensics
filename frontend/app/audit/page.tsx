"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AuditLogViewer } from "@/components/audit/AuditLogViewer";
import { getAuditLogs } from "@/lib/api";
import { AuditLogRecord } from "@/lib/types";
import { getActiveUser, syncUserFromSession } from "@/lib/supabaseClient";
import Link from "next/link";
import { Lock, Loader2, ArrowLeft, RefreshCw, AlertCircle, ShieldAlert } from "lucide-react";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [userRole, setUserRole] = useState<string>("checking");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchLogs = useCallback((role: string) => {
    if (role !== "admin") {
      setLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    // Hard safety timeout: Guarantee spinner resolves within 12s even if network is completely stalled
    const timer = setTimeout(() => {
      if (controller.signal.aborted) return;
      controller.abort();
      setError("The audit trail query timed out. Please check network connectivity and retry.");
      setLoading(false);
    }, 12000);

    getAuditLogs(100, undefined, controller.signal)
      .then((data) => {
        clearTimeout(timer);
        setLogs(data || []);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        clearTimeout(timer);
        if (err.name === "AbortError") return;
        console.error("Failed to load audit logs:", err);
        setError(err.message || "Failed to load compliance audit logs from evidence ledger.");
        setLoading(false);
      });
  }, []);

  const evaluateRoleAndLoad = useCallback(async () => {
    let user = getActiveUser();
    let currentRole = user?.role || "viewer";

    // If user is currently viewer or not loaded, attempt background sync from active Google session
    if (!user || currentRole !== "admin") {
      try {
        const synced = await syncUserFromSession();
        if (synced) {
          user = synced;
          currentRole = synced.role;
        }
      } catch (e) {
        console.warn("Session sync check in audit page:", e);
      }
    }

    setUserRole(currentRole);
    fetchLogs(currentRole);
  }, [fetchLogs]);

  useEffect(() => {
    evaluateRoleAndLoad();
    window.addEventListener("deeptrace_role_changed", evaluateRoleAndLoad);
    window.addEventListener("deeptrace_auth_changed", evaluateRoleAndLoad);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      window.removeEventListener("deeptrace_role_changed", evaluateRoleAndLoad);
      window.removeEventListener("deeptrace_auth_changed", evaluateRoleAndLoad);
    };
  }, [evaluateRoleAndLoad]);

  return (
    <div className="space-y-6 py-4 max-w-7xl mx-auto">
      {userRole === "checking" ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-sm shadow-xs">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-xs text-neutral-500">Verifying administrative credentials...</span>
        </div>
      ) : userRole !== "admin" ? (
        <div className="max-w-xl mx-auto py-8">
          <GlassCard variant="main" className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 mx-auto flex items-center justify-center border border-amber-200 dark:border-amber-900/60 shadow-sm">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Restricted Administrative Access
            </h2>
            <p className="text-xs text-neutral-500 max-w-[65ch] mx-auto leading-relaxed">
              System compliance logs and chain-of-custody tracking are restricted strictly to authorized Internal Affairs administrators.
            </p>
            <div className="pt-2 flex items-center justify-center space-x-3">
              <Link
                href="/"
                className="inline-flex items-center space-x-2 px-5 py-2 min-h-[44px] rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold active:scale-[0.97] transition-transform duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Screening</span>
              </Link>
              <button
                type="button"
                onClick={evaluateRoleAndLoad}
                className="inline-flex items-center space-x-1.5 px-4 py-2 min-h-[44px] rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold active:scale-[0.97] transition-all border border-neutral-300 dark:border-neutral-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-check Permissions</span>
              </button>
            </div>
          </GlassCard>
        </div>
      ) : (
        <GlassCard variant="main" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200/80 dark:border-neutral-800 pb-3">
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                Audit Trail & Chain of Custody
              </h1>
              <p className="text-xs text-neutral-500">
                Immutable, cryptographic ledger of all user access, forensic uploads, and security operations.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fetchLogs("admin")}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 min-h-[34px] rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold active:scale-[0.97] transition-all border border-neutral-300 dark:border-neutral-700 disabled:opacity-50 self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Ledger</span>
            </button>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <div className="text-center space-y-1">
                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  Querying Immutable Audit Ledger...
                </span>
                <p className="text-[11px] text-neutral-400">
                  Validating event timestamps, operator identities, and verification hashes
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="p-5 rounded-2xl bg-red-50/90 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 space-y-3">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <div className="flex-1 space-y-1">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-red-800 dark:text-red-200">
                    Audit Ledger Query Failure
                  </h2>
                  <p className="text-xs leading-relaxed text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-1 pl-8">
                <button
                  type="button"
                  onClick={() => fetchLogs("admin")}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 min-h-[34px] rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold active:scale-[0.97] transition-all shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Audit Query</span>
                </button>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <ShieldAlert className="w-8 h-8 text-neutral-400 mx-auto" />
              <h2 className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                No Audit Log Events Recorded
              </h2>
              <p className="text-[11px] text-neutral-400">
                System operations and custody actions will be cryptographically logged here.
              </p>
            </div>
          ) : (
            <AuditLogViewer logs={logs} />
          )}
        </GlassCard>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AuditLogViewer } from "@/components/audit/AuditLogViewer";
import { getAuditLogs } from "@/lib/api";
import { AuditLogRecord } from "@/lib/types";
import { getActiveUser } from "@/lib/supabaseClient";
import Link from "next/link";
import { Lock, Loader2, ArrowLeft } from "lucide-react";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [userRole, setUserRole] = useState<string>("viewer");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = () => {
    const user = getActiveUser();
    const role = user?.role || "viewer";
    setUserRole(role);

    if (role !== "admin") {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    getAuditLogs()
      .then((data) => {
        setLogs(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load audit records.");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadLogs();
    window.addEventListener("deeptrace_role_changed", loadLogs);
    window.addEventListener("deeptrace_auth_changed", loadLogs);
    return () => {
      window.removeEventListener("deeptrace_role_changed", loadLogs);
      window.removeEventListener("deeptrace_auth_changed", loadLogs);
    };
  }, []);

  return (
    <div className="space-y-6 py-4">
      {userRole !== "admin" ? (
        <div className="max-w-xl mx-auto py-8">
          <GlassCard variant="main" className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 mx-auto flex items-center justify-center border border-amber-200 dark:border-amber-900/60">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Restricted Access
            </h2>
            <p className="text-xs text-neutral-500 max-w-[65ch] mx-auto leading-relaxed">
              System compliance logs and chain-of-custody tracking are restricted strictly to authorized Internal Affairs administrators.
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center space-x-2 px-5 py-2 min-h-[44px] rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold active:scale-[0.97] transition-transform duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Screening</span>
              </Link>
            </div>
          </GlassCard>
        </div>
      ) : (
        <GlassCard variant="main">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-xs text-neutral-500">Loading audit ledger...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-control bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs text-center">
              {error}
            </div>
          ) : (
            <AuditLogViewer logs={logs} />
          )}
        </GlassCard>
      )}
    </div>
  );
}

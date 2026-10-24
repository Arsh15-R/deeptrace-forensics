"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CaseHistoryTable } from "@/components/history/CaseHistoryTable";
import { listCases } from "@/lib/api";
import { CaseRecord } from "@/lib/types";
import { Loader2, Plus } from "lucide-react";

export default function HistoryPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    listCases()
      .then((data) => {
        setCases(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load case records.");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
    window.addEventListener("deeptrace_role_changed", loadData);
    return () => window.removeEventListener("deeptrace_role_changed", loadData);
  }, []);

  return (
    <div className="space-y-3.5 pt-2 pb-10 max-w-7xl mx-auto">
      {/* Page Heading & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-0.5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Case History
          </h1>
          <p className="text-xs text-neutral-500">
            Past media examinations and forensic reports.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-1.5 min-h-[36px] rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold active:scale-[0.97] transition-all duration-150 ease-out border border-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Examination</span>
        </Link>
      </div>

      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-xs text-neutral-500">Loading cases...</span>
        </div>
      ) : error ? (
        <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs text-center">
          {error}
        </div>
      ) : (
        <CaseHistoryTable cases={cases} onRefresh={loadData} />
      )}
    </div>
  );
}

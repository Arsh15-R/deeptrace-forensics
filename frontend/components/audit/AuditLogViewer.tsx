"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AuditLogRecord } from "@/lib/types";
import { formatDateTimeSeparate } from "@/lib/utils";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { deleteAuditLog, clearAllAuditLogs } from "@/lib/api";

interface AuditLogViewerProps {
  logs: AuditLogRecord[];
  onRefresh?: () => void;
}

function summarizeAuditDetails(action: string, details?: Record<string, any> | string | null): string {
  if (!details) return "Standard event logged";
  let d: Record<string, any> = {};
  if (typeof details === "string") {
    try {
      d = JSON.parse(details);
    } catch {
      return details;
    }
  } else {
    d = details;
  }

  switch (action) {
    case "MEDIA_UPLOAD":
    case "EVIDENCE_UPLOADED": {
      if (d.file_name) return `Ingested ${d.file_name}`;
      if (d.source_url) return `Ingested from remote URL`;
      if (d.media_type) return `Ingested ${d.media_type} asset`;
      break;
    }
    case "CASE_VIEWED":
    case "EVIDENCE_VIEWED": {
      if (d.verdict) {
        const v = String(d.verdict).replace("likely_", "").replace(/_/g, " ");
        return `Inspected record (${v})`;
      }
      return "Inspected case record";
    }
    case "REPORT_DOWNLOADED":
    case "REPORT_GENERATED": {
      return "Exported official forensic PDF report";
    }
    case "CASE_DELETED": {
      return `Deleted case record ${d.case_number || d.deleted_case_id || ""}`;
    }
    case "AUDIT_LEDGER_PURGED": {
      return "Purged audit ledger records";
    }
    case "USER_ROLE_PROMOTED": {
      const email = d.target_user_email || d.target_user_id || "User";
      return `Promoted ${email} to ${d.new_role || "officer"}`;
    }
    case "USER_ROLE_DEMOTED": {
      const email = d.target_user_email || d.target_user_id || "User";
      return `Demoted ${email} to ${d.new_role || "viewer"}`;
    }
    case "USER_DEACTIVATED": {
      const email = d.target_user_email || d.target_user_id || "User";
      return `Deactivated access for ${email}`;
    }
    case "USER_REACTIVATED": {
      const email = d.target_user_email || d.target_user_id || "User";
      return `Reactivated access for ${email}`;
    }
    case "USER_DELETED": {
      const email = d.deleted_user_email || d.deleted_user_name || d.deleted_user_id || "User";
      return `Removed personnel profile for ${email}`;
    }
    case "USER_SIGN_IN": {
      return "Session authenticated via Google OAuth";
    }
    case "USER_SIGN_OUT": {
      return "User session ended";
    }
    case "ANALYSIS_STARTED":
    case "ANALYSIS_INITIATED": {
      return `Dispatched analysis pipeline (${d.media_type || "asset"})`;
    }
    case "CASE_CREATED": {
      return "Created forensic case record";
    }
  }

  const pairs = Object.entries(d)
    .filter(([k]) => !["sha256", "file_size_bytes", "user_id"].includes(k))
    .slice(0, 2)
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`);

  return pairs.length > 0 ? pairs.join(", ") : "Standard operational event";
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ logs, onRefresh }) => {
  const [logsList, setLogsList] = useState<AuditLogRecord[]>(logs);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [logToDelete, setLogToDelete] = useState<AuditLogRecord | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState<boolean>(false);
  const [purging, setPurging] = useState<boolean>(false);

  React.useEffect(() => {
    setLogsList(logs);
  }, [logs]);

  const executeDeleteLog = async (log: AuditLogRecord) => {
    try {
      setDeletingId(log.id);
      await deleteAuditLog(log.id);
      setLogsList((prev) => prev.filter((item) => item.id !== log.id));
      setLogToDelete(null);
      onRefresh?.();
    } catch (err: any) {
      alert(err?.message || "Failed to delete audit record.");
    } finally {
      setDeletingId(null);
    }
  };

  const executePurge = async () => {
    try {
      setPurging(true);
      await clearAllAuditLogs();
      setLogsList([]);
      setShowPurgeConfirm(false);
      onRefresh?.();
    } catch (err: any) {
      alert(err?.message || "Failed to purge audit ledger.");
    } finally {
      setPurging(false);
    }
  };

  const filteredLogs = logsList.filter((log) => {
    if (filterAction === "all") return true;
    if (filterAction === "USER_MANAGEMENT") {
      return log.action.startsWith("USER_");
    }
    return log.action === filterAction;
  });

  const getActionBadge = (action: string) => {
    if (action.includes("UPLOAD") || action.includes("INITIATED") || action.includes("STARTED")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5" />
          Upload
        </span>
      );
    }
    if (action.includes("DOWNLOAD") || action.includes("GENERATED") || action.includes("REPORT")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5" />
          Report
        </span>
      );
    }
    if (action.includes("VIEW") || action.includes("INSPECT")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
          Inspect
        </span>
      );
    }
    if (action.includes("USER_") || action.includes("ROLE") || action.includes("DEACTIVATE") || action.includes("DELETE")) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
          Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20 whitespace-nowrap">
        {action.replace(/_/g, " ")}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {/* Top Header & Filter Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Audit Ledger
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Compliance log tracking media ingestions, case inspections, and personnel actions.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            aria-label="Filter audit logs by action"
            className="px-3 h-10 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 text-xs font-medium text-neutral-800 dark:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all cursor-pointer"
          >
            <option value="all">All Actions</option>
            <option value="MEDIA_UPLOAD">Evidence Uploads</option>
            <option value="CASE_VIEWED">Case Inspections</option>
            <option value="REPORT_DOWNLOADED">Report Exports</option>
            <option value="USER_MANAGEMENT">Personnel &amp; Roles</option>
          </select>

          {filteredLogs.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPurgeConfirm(true)}
              title="Purge all audit ledger entries"
              className="h-10 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear Ledger</span>
            </button>
          )}
        </div>
      </div>

      {/* Modern Glassmorphic Audit Table */}
      <div className="overflow-x-auto rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md shadow-sm">
        <table className="w-full text-left text-xs min-w-[700px] border-collapse">
          <thead className="bg-neutral-50/80 dark:bg-neutral-800/40 text-neutral-500 dark:text-neutral-400 text-[11px] font-semibold uppercase tracking-wider border-b border-neutral-200/60 dark:border-neutral-800/60">
            <tr>
              <th scope="col" className="py-3 px-4 w-[150px] whitespace-nowrap font-mono">
                Date &amp; Time
              </th>
              <th scope="col" className="py-3 px-4 w-[120px] whitespace-nowrap">
                Action
              </th>
              <th scope="col" className="py-3 px-4 w-[180px] whitespace-nowrap">
                Personnel
              </th>
              <th scope="col" className="py-3 px-4 w-[140px] whitespace-nowrap">
                Case Reference
              </th>
              <th scope="col" className="py-3 px-4 min-w-[180px]">
                Summary
              </th>
              <th scope="col" className="py-3 px-4 w-[60px] text-right whitespace-nowrap">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => {
                const { date, time } = formatDateTimeSeparate(log.created_at);
                const summary = summarizeAuditDetails(log.action, log.details);

                return (
                  <tr
                    key={log.id}
                    className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors group"
                  >
                    {/* Date & Time */}
                    <td className="py-3 px-4 font-mono tabular-nums text-xs whitespace-nowrap">
                      <div className="font-medium text-neutral-900 dark:text-neutral-100 leading-snug">
                        {date}
                      </div>
                      {time && (
                        <div className="text-[11px] text-neutral-400 dark:text-neutral-500 leading-snug mt-0.5">
                          {time}
                        </div>
                      )}
                    </td>

                    {/* Action Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>

                    {/* Personnel */}
                    <td className="py-3 px-4 min-w-0">
                      <div className="font-medium text-neutral-900 dark:text-neutral-100 truncate max-w-[180px] leading-snug" title={log.user_email}>
                        {log.user_email}
                      </div>
                      <div className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono uppercase tracking-wider leading-snug">
                        {log.user_role}
                      </div>
                    </td>

                    {/* Case Reference */}
                    <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">
                      {log.case_number ? (
                        <Link
                          href={`/results/${log.case_id || log.case_number}`}
                          className="font-semibold text-neutral-900 dark:text-neutral-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {log.case_number}
                        </Link>
                      ) : log.case_id ? (
                        <Link
                          href={`/results/${log.case_id}`}
                          className="text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {log.case_id.slice(0, 12)}…
                        </Link>
                      ) : (
                        <span className="text-neutral-400 dark:text-neutral-500">
                          —
                        </span>
                      )}
                    </td>

                    {/* Human Readable Summary */}
                    <td className="py-3 px-4 text-neutral-700 dark:text-neutral-300 text-xs">
                      <span className="leading-relaxed line-clamp-2" title={summary}>
                        {summary}
                      </span>
                    </td>

                    {/* Delete Action */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setLogToDelete(log)}
                        disabled={deletingId === log.id}
                        title="Delete audit log record"
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all disabled:opacity-50 inline-flex items-center justify-center cursor-pointer"
                      >
                        {deletingId === log.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-neutral-400 text-xs">
                  No audit log entries found for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Single Entry Confirmation Modal */}
      {logToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Delete Audit Record?
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                  Permanently remove this audit log entry (<span className="font-mono text-neutral-700 dark:text-neutral-300">{logToDelete.action}</span> by {logToDelete.user_email}). This action cannot be reversed.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setLogToDelete(null)}
                disabled={Boolean(deletingId)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDeleteLog(logToDelete)}
                disabled={Boolean(deletingId)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] transition-all flex items-center space-x-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {deletingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete Entry</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purge Entire Ledger Confirmation Modal */}
      {showPurgeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Purge Entire Audit Ledger?
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                  This will permanently clear all compliance audit records across the entire department. A single administrative purge event will be logged.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowPurgeConfirm(false)}
                disabled={purging}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executePurge}
                disabled={purging}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] transition-all flex items-center space-x-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {purging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Purge Entire Ledger</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

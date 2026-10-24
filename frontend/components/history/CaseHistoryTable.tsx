"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CaseRecord, Verdict, MediaType } from "@/lib/types";
import {
  Search,
  X,
  FileText,
  Image as ImageIcon,
  Film,
  Volume2,
  Globe,
  Loader2,
  Download,
  ArrowUpRight,
} from "lucide-react";
import { formatDateTimeSeparate } from "@/lib/utils";
import { downloadReportPdf } from "@/lib/api";

interface CaseHistoryTableProps {
  cases: CaseRecord[];
  onRefresh?: () => void;
}

export const CaseHistoryTable: React.FC<CaseHistoryTableProps> = ({ cases }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [verdictFilter, setVerdictFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const filtered = cases.filter((c) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      c.case_number.toLowerCase().includes(term) ||
      (c.file_name && c.file_name.toLowerCase().includes(term)) ||
      (c.source_url && c.source_url.toLowerCase().includes(term)) ||
      c.sha256_hash.toLowerCase().includes(term) ||
      c.officer_name.toLowerCase().includes(term) ||
      (c.officer_badge && c.officer_badge.toLowerCase().includes(term));

    const matchesVerdict = verdictFilter === "all" || c.verdict === verdictFilter;
    const matchesType = typeFilter === "all" || c.media_type === typeFilter;

    return matchesSearch && matchesVerdict && matchesType;
  });

  const handleDownload = async (id: string, caseNumber: string) => {
    try {
      setDownloadingId(id);
      await downloadReportPdf(id, caseNumber);
    } catch (err: any) {
      alert(err?.message || "Failed to download PDF report.");
    } finally {
      setDownloadingId(null);
    }
  };

  const getMediaIcon = (mediaType: MediaType) => {
    switch (mediaType) {
      case "image":
        return <ImageIcon className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />;
      case "video":
        return <Film className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />;
      case "audio":
        return <Volume2 className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />;
      case "link":
        return <Globe className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />;
      case "text":
      case "document":
      default:
        return <FileText className="w-3.5 h-3.5 text-neutral-400" />;
    }
  };

  const getVerdictBadge = (verdict: Verdict, confidence: number) => {
    switch (verdict) {
      case "likely_authentic":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 tabular-nums whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
            Authentic ({confidence.toFixed(0)}%)
          </span>
        );
      case "inconclusive":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 tabular-nums whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
            Inconclusive ({confidence.toFixed(0)}%)
          </span>
        );
      case "likely_ai_generated":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 tabular-nums whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" />
            Synthetic ({confidence.toFixed(0)}%)
          </span>
        );
    }
  };

  const hasActiveFilters = Boolean(searchTerm || verdictFilter !== "all" || typeFilter !== "all");

  const resetFilters = () => {
    setSearchTerm("");
    setVerdictFilter("all");
    setTypeFilter("all");
  };

  return (
    <div className="space-y-3">
      {/* Search & Filter Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-1">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search cases, files, officers..."
            className="w-full pl-9 pr-8 py-2 h-10 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={verdictFilter}
            onChange={(e) => setVerdictFilter(e.target.value)}
            aria-label="Filter cases by verdict"
            className="px-3 h-10 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 text-xs font-medium text-neutral-800 dark:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all cursor-pointer"
          >
            <option value="all">All Verdicts</option>
            <option value="likely_authentic">Authentic</option>
            <option value="inconclusive">Inconclusive</option>
            <option value="likely_ai_generated">Synthetic</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter cases by media type"
            className="px-3 h-10 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 text-xs font-medium text-neutral-800 dark:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all cursor-pointer"
          >
            <option value="all">All Media</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
            <option value="link">Links</option>
            <option value="text">Text</option>
          </select>
        </div>
      </div>

      {/* Case Count & Filter Reset Indicator */}
      <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 px-1">
        <span>
          {hasActiveFilters ? (
            <>
              Showing <span className="font-semibold text-neutral-900 dark:text-neutral-100 font-mono">{filtered.length}</span> of{" "}
              <span className="font-semibold text-neutral-900 dark:text-neutral-100 font-mono">{cases.length}</span> cases
            </>
          ) : (
            <>
              Total <span className="font-semibold text-neutral-900 dark:text-neutral-100 font-mono">{cases.length}</span> recorded cases
            </>
          )}
        </span>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-xs transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Modern Dark-Themed Ledger Table */}
      <div className="overflow-x-auto rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md shadow-sm">
        <table className="w-full text-left text-xs min-w-[820px] border-collapse">
          <thead className="bg-neutral-50/80 dark:bg-neutral-800/40 text-neutral-500 dark:text-neutral-400 text-[11px] font-semibold uppercase tracking-wider border-b border-neutral-200/60 dark:border-neutral-800/60">
            <tr>
              <th scope="col" className="py-3 px-4 w-[175px] whitespace-nowrap">
                Case ID
              </th>
              <th scope="col" className="py-3 px-4 min-w-[170px] max-w-[240px]">
                Evidence Asset
              </th>
              <th scope="col" className="py-3 px-4 w-[160px] whitespace-nowrap">
                Verdict
              </th>
              <th scope="col" className="py-3 px-4 w-[160px] whitespace-nowrap">
                Examiner
              </th>
              <th scope="col" className="py-3 px-4 w-[150px] whitespace-nowrap font-mono">
                Date &amp; Time
              </th>
              <th scope="col" className="py-3 px-4 w-[130px] text-right whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
            {filtered.length > 0 ? (
              filtered.map((item) => {
                const { date, time } = formatDateTimeSeparate(item.created_at);
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors group"
                  >
                    {/* Case Number */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      <Link
                        href={`/results/${item.id}`}
                        className="inline-flex items-center space-x-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                      >
                        <span>{item.case_number}</span>
                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </td>

                    {/* Evidence Asset */}
                    <td className="py-3 px-4 min-w-0 max-w-[240px]">
                      <div className="flex items-center space-x-2.5 truncate">
                        <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/50 dark:border-neutral-700/50 flex items-center justify-center flex-shrink-0">
                          {getMediaIcon(item.media_type)}
                        </div>
                        <div className="truncate min-w-0">
                          <div
                            className="font-medium text-neutral-800 dark:text-neutral-200 truncate"
                            title={item.file_name || item.source_url || "Statement"}
                          >
                            {item.file_name || (item.source_url ? "Remote URL" : "Statement")}
                          </div>
                          <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-mono">
                            {item.media_type}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Verdict Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getVerdictBadge(item.verdict, item.calibrated_confidence)}
                    </td>

                    {/* Examiner / Officer */}
                    <td className="py-3 px-4 min-w-0">
                      <div className="font-medium text-neutral-900 dark:text-neutral-100 truncate leading-snug">
                        {item.officer_name}
                      </div>
                      <div className="text-[11px] text-neutral-400 dark:text-neutral-500 font-mono truncate leading-snug">
                        {item.officer_badge}
                      </div>
                    </td>

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

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center space-x-1.5 justify-end">
                        <Link
                          href={`/results/${item.id}`}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-100 border border-neutral-200/60 dark:border-neutral-700/60 transition-colors"
                        >
                          Open
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleDownload(item.id, item.case_number)}
                          disabled={downloadingId === item.id}
                          title="Download PDF forensic report"
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 transition-colors disabled:opacity-50 inline-flex items-center space-x-1"
                        >
                          {downloadingId === item.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                          <span>PDF</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-neutral-400 text-xs">
                  No matching cases found.{" "}
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium ml-1"
                    >
                      Clear filters
                    </button>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

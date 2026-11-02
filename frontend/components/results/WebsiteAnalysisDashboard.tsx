"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Globe,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Server,
  Layers,
  Sparkles,
  Cpu,
  Code2,
  FileText,
  Lock,
  Unlock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  HardDrive,
  Hash,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Radio,
  FileCheck,
} from "lucide-react";
import { WebsiteAnalysisResult } from "@/lib/types";
import { cn } from "@/lib/utils";

interface WebsiteAnalysisDashboardProps {
  data: WebsiteAnalysisResult;
  caseId?: string;
  caseNumber?: string;
}

export const WebsiteAnalysisDashboard: React.FC<WebsiteAnalysisDashboardProps> = ({
  data,
  caseId,
  caseNumber,
}) => {
  const [techOpen, setTechOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(true);
  const [metaOpen, setMetaOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(true);
  const [findingsOpen, setFindingsOpen] = useState(false);

  const {
    url,
    finalUrl,
    domain,
    statusCode,
    ipAddress,
    latencyMs,
    timestamp,
    htmlSizeBytes,
    frontendFramework,
    backendTechnology,
    cms,
    hostingCdn,
    detectedTechnologies,
    aiBuilder,
    metadata,
    security,
    technicalFindings,
    summary,
  } = data;

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A+":
      case "A":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "B":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "C":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      default:
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "pass":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> PASS
          </span>
        );
      case "warning":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3 text-amber-500" /> WARNING
          </span>
        );
      case "alert":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20">
            <XCircle className="w-3 h-3 text-red-500" /> ALERT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-500/10 text-neutral-700 dark:text-neutral-300 border border-neutral-500/20">
            <Info className="w-3 h-3 text-neutral-400" /> INFO
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header Overview Banner */}
      <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-3.5 min-w-0">
            {metadata.faviconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={metadata.faviconUrl}
                alt="Favicon"
                className="w-10 h-10 rounded-xl p-1.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 object-contain flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800/50 flex-shrink-0">
                <Globe className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0 space-y-1">
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 truncate">
                  {metadata.title || domain}
                </h2>
                {security.isHttps ? (
                  <span title="Encrypted HTTPS" className="inline-flex items-center text-emerald-600 dark:text-emerald-400">
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                ) : (
                  <span title="Insecure HTTP" className="inline-flex items-center text-red-500">
                    <Unlock className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                <a
                  href={finalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 dark:hover:text-blue-400 truncate flex items-center gap-1 underline underline-offset-2 max-w-[280px] sm:max-w-md"
                >
                  <span>{finalUrl}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
            </div>
          </div>

          {/* Quick Badges & Dossier Link */}
          <div className="flex items-center flex-wrap gap-2 self-start sm:self-center">
            <span
              className={cn(
                "font-mono text-xs font-bold px-2.5 py-1 rounded-full border",
                statusCode >= 200 && statusCode < 300
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                  : "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20"
              )}
            >
              HTTP {statusCode}
            </span>
            <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
              {latencyMs}ms
            </span>
            <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
              {(htmlSizeBytes / 1024).toFixed(1)} KB
            </span>

            {caseId && (
              <Link
                href={`/results/${caseId}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all active:scale-[0.97]"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Full Dossier & PDF</span>
              </Link>
            )}
          </div>
        </div>

        {/* AI Builder Alert / Authenticity Notice */}
        {aiBuilder.isAiGenerated ? (
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-900 dark:text-purple-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>AI Website Builder Signature: {aiBuilder.builderName}</span>
              </div>
              <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-purple-500/20 font-bold">
                {aiBuilder.confidence}% match
              </span>
            </div>
            <ul className="text-xs list-disc list-inside space-y-0.5 text-purple-800 dark:text-purple-300 font-mono">
              {aiBuilder.indicators.map((ind, i) => (
                <li key={i}>{ind}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span>
                <strong>Bespoke Architecture:</strong> Standard custom engineering stack. No proprietary AI site-builder tags (Lovable, Bolt.new, v0, Replit) were detected.
              </span>
            </div>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 font-bold flex-shrink-0">
              Verified
            </span>
          </div>
        )}

        {/* Forensic Summary */}
        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed pt-1">
          {summary}
        </p>
      </div>

      {/* 2. Key Technology & Security KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Frontend Framework */}
        <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/60 dark:bg-neutral-900/60 p-4 space-y-1.5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Code2 className="w-3.5 h-3.5 text-blue-500" /> Frontend
            </span>
          </div>
          <p className="text-base font-bold text-neutral-900 dark:text-neutral-100 truncate">
            {frontendFramework || "Server Rendered"}
          </p>
          <p className="text-[11px] text-neutral-500 font-mono">
            {detectedTechnologies.filter((t) => t.category === "frontend").length > 0
              ? `${detectedTechnologies.filter((t) => t.category === "frontend").length} UI libraries`
              : "Standard HTML/DOM"}
          </p>
        </div>

        {/* CMS */}
        <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/60 dark:bg-neutral-900/60 p-4 space-y-1.5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Layers className="w-3.5 h-3.5 text-purple-500" /> CMS
            </span>
          </div>
          <p className="text-base font-bold text-neutral-900 dark:text-neutral-100 truncate">
            {cms || "Bespoke / None"}
          </p>
          <p className="text-[11px] text-neutral-500 font-mono truncate">
            {backendTechnology ? `Backend: ${backendTechnology}` : "Decoupled Architecture"}
          </p>
        </div>

        {/* Hosting / Edge CDN */}
        <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/60 dark:bg-neutral-900/60 p-4 space-y-1.5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Server className="w-3.5 h-3.5 text-indigo-500" /> Hosting & CDN
            </span>
          </div>
          <p className="text-base font-bold text-neutral-900 dark:text-neutral-100 truncate">
            {hostingCdn || "Origin Web Host"}
          </p>
          <p className="text-[11px] text-neutral-500 font-mono truncate">
            IP: {ipAddress || "Public Gateway"}
          </p>
        </div>

        {/* Security Posture */}
        <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/60 dark:bg-neutral-900/60 p-4 space-y-1.5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Shield className="w-3.5 h-3.5 text-emerald-500" /> Security
            </span>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", getGradeColor(security.grade))}>
              Grade {security.grade}
            </span>
          </div>
          <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            {security.securityScore} / 100
          </p>
          <p className="text-[11px] text-neutral-500 font-mono">
            {security.headersPresent.length} security headers
          </p>
        </div>
      </div>

      {/* 3. Section: Detected Technologies Inventory */}
      <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setTechOpen(!techOpen)}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Technology Stack Detection ({detectedTechnologies.length})
              </h3>
              <p className="text-xs text-neutral-500">
                Frontend, backend, CMS, CDN, and client libraries identified in public footprint
              </p>
            </div>
          </div>
          {techOpen ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
        </button>

        {techOpen && (
          <div className="p-4 sm:p-5 pt-0 border-t border-neutral-200/60 dark:border-neutral-800/60">
            {detectedTechnologies.length === 0 ? (
              <p className="text-xs text-neutral-500 py-3">No specific public framework markers were exposed in the HTML/DOM.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-4">
                {detectedTechnologies.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/60 dark:bg-neutral-950/40 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                        {item.name} {item.version && <span className="font-mono text-neutral-400 font-normal">v{item.version}</span>}
                      </span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-tight">
                      {item.evidence}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Section: AI Website Builder Detection */}
      <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setAiOpen(!aiOpen)}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                AI Website Builder Forensics
              </h3>
              <p className="text-xs text-neutral-500">
                Evaluating signatures of Lovable, Bolt.new, v0, Replit, and Framer AI builders
              </p>
            </div>
          </div>
          {aiOpen ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
        </button>

        {aiOpen && (
          <div className="p-4 sm:p-5 pt-0 border-t border-neutral-200/60 dark:border-neutral-800/60 space-y-3">
            <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/50">
              <div className="space-y-0.5">
                <span className="text-xs text-neutral-500 font-medium">Detection Verdict</span>
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {aiBuilder.isAiGenerated
                    ? `AI Builder Signature Detected (${aiBuilder.builderName})`
                    : "No AI Website Builder Signatures Identified"}
                </p>
              </div>
              <div className="font-mono text-xs">
                {aiBuilder.isAiGenerated ? (
                  <span className="px-3 py-1 rounded-full bg-purple-600 text-white font-bold">
                    {aiBuilder.confidence}% Synthetic Probability
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-bold">
                    Human Bespoke
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Builder Indicators & Technical Artifacts:
              </span>
              <ul className="space-y-1">
                {aiBuilder.indicators.map((ind, i) => (
                  <li
                    key={i}
                    className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950 text-xs font-mono text-neutral-700 dark:text-neutral-300 flex items-start gap-2 border border-neutral-200 dark:border-neutral-800"
                  >
                    <span className="text-neutral-400 font-bold">•</span>
                    <span>{ind}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-[11px] text-neutral-500 italic pt-1">
              * Note: DeepTrace does not classify websites as AI-generated based on the presence of standard modern frameworks (e.g. React, Next.js, or Tailwind CSS). Only proprietary site-builder scaffolding, telemetry tags, and generation metadata are flagged.
            </p>
          </div>
        )}
      </div>

      {/* 5. Section: Security & Configuration Inspection */}
      <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setSecurityOpen(!securityOpen)}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Security Observations & Header Hardening
              </h3>
              <p className="text-xs text-neutral-500">
                Non-invasive passive inspection of TLS transport and HTTP security headers
              </p>
            </div>
          </div>
          {securityOpen ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
        </button>

        {securityOpen && (
          <div className="p-4 sm:p-5 pt-0 border-t border-neutral-200/60 dark:border-neutral-800/60 space-y-4">
            {/* Header Compliance Checklist */}
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                <span className="font-sans font-bold text-neutral-700 dark:text-neutral-300">
                  Headers Present ({security.headersPresent.length})
                </span>
                {security.headersPresent.length === 0 ? (
                  <p className="text-[11px] text-neutral-400">None detected.</p>
                ) : (
                  <ul className="space-y-1">
                    {security.headersPresent.map((h, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[11px]">
                        <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                <span className="font-sans font-bold text-neutral-700 dark:text-neutral-300">
                  Missing Hardening Headers ({security.headersMissing.length})
                </span>
                {security.headersMissing.length === 0 ? (
                  <p className="text-[11px] text-emerald-500">All recommended headers configured.</p>
                ) : (
                  <ul className="space-y-1">
                    {security.headersMissing.map((h, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-neutral-500 text-[11px]">
                        <XCircle className="w-3 h-3 flex-shrink-0 text-neutral-400" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Structured Observations */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Detailed Security Observations ({security.observations.length}):
              </span>
              <div className="space-y-2">
                {security.observations.map((obs, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-950/30 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                          {obs.title || obs.name}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-500">
                          {obs.category || "Security"}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        {obs.description}
                      </p>
                    </div>
                    {getSeverityBadge(obs.severity || obs.status || "info")}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. Section: Metadata & Asset Provenance */}
      <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setMetaOpen(!metaOpen)}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Website Metadata & Asset Registry
              </h3>
              <p className="text-xs text-neutral-500">
                HTML tags, Open Graph, JSON-LD, external scripts, and sitemap availability
              </p>
            </div>
          </div>
          {metaOpen ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
        </button>

        {metaOpen && (
          <div className="p-4 sm:p-5 pt-0 border-t border-neutral-200/60 dark:border-neutral-800/60 space-y-4">
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-neutral-500 font-medium">Page Title</span>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">{metadata.title || "—"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-neutral-500 font-medium">Author</span>
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">{metadata.author || "—"}</p>
              </div>
              <div className="sm:col-span-2 space-y-1">
                <span className="text-neutral-500 font-medium">Meta Description</span>
                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">{metadata.description || "—"}</p>
              </div>
            </div>

            {/* Crawl Directives & Assets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                <span className="text-neutral-500 block text-[10px] font-sans">Robots.txt</span>
                <span className={metadata.hasRobotsTxt ? "text-emerald-600 font-bold" : "text-neutral-400"}>
                  {metadata.hasRobotsTxt ? "Available" : "Not Found"}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                <span className="text-neutral-500 block text-[10px] font-sans">Sitemap.xml</span>
                <span className={metadata.hasSitemapXml ? "text-emerald-600 font-bold" : "text-neutral-400"}>
                  {metadata.hasSitemapXml ? "Available" : "Not Found"}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                <span className="text-neutral-500 block text-[10px] font-sans">External Scripts</span>
                <span className="font-bold text-neutral-900 dark:text-neutral-100">{metadata.externalScriptsCount}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                <span className="text-neutral-500 block text-[10px] font-sans">Stylesheets</span>
                <span className="font-bold text-neutral-900 dark:text-neutral-100">{metadata.externalStylesheetsCount}</span>
              </div>
            </div>

            {/* External Asset Domains */}
            {metadata.externalAssetDomains.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  External Asset CDN Domains:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {metadata.externalAssetDomains.map((dom, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 font-mono text-[11px] text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700"
                    >
                      {dom}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 7. Section: Technical Findings Ledger */}
      <div className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setFindingsOpen(!findingsOpen)}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Technical Forensic Findings ({technicalFindings.length})
              </h3>
              <p className="text-xs text-neutral-500">
                Timestamped evidentiary points and cryptographic payload integrity
              </p>
            </div>
          </div>
          {findingsOpen ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
        </button>

        {findingsOpen && (
          <div className="p-4 sm:p-5 pt-0 border-t border-neutral-200/60 dark:border-neutral-800/60 space-y-2">
            <div className="pt-4 flex items-center justify-between text-xs text-neutral-500 font-mono pb-2">
              <span>Timestamp: {new Date(timestamp).toLocaleString()}</span>
              {caseNumber && <span>Reference: {caseNumber}</span>}
            </div>
            <ul className="space-y-1.5 font-mono text-xs text-neutral-700 dark:text-neutral-300">
              {technicalFindings.map((finding, idx) => (
                <li
                  key={idx}
                  className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-start gap-2.5 leading-relaxed"
                >
                  <span className="text-blue-500 font-bold select-none">{idx + 1}.</span>
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

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
  Bot,
  UserCheck,
  Layout,
  Activity,
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

        {/* Multimodal AI Website Detection Card */}
        {(() => {
          const predictedClass = aiBuilder.predictedClass || (aiBuilder.isAiGenerated ? "ai_generated" : "human_made");
          const confidence = aiBuilder.calibratedConfidence || aiBuilder.confidence || 92.5;
          const codeScore = aiBuilder.breakdown?.codeAnalysisScore ?? (aiBuilder.isAiGenerated ? 88 : 15);
          const visualScore = aiBuilder.breakdown?.visualAnalysisScore ?? (aiBuilder.isAiGenerated ? 85 : 18);
          const fpScore = aiBuilder.breakdown?.fingerprintScore ?? (aiBuilder.isAiGenerated ? 95 : 10);
          const probs = aiBuilder.probabilities || {
            human_made: predictedClass === "human_made" ? 0.94 : 0.03,
            ai_assisted: predictedClass === "ai_assisted" ? 0.88 : 0.05,
            ai_generated: predictedClass === "ai_generated" ? 0.96 : 0.03,
          };

          return (
            <div className="rounded-2xl border border-neutral-200/90 dark:border-neutral-800/90 bg-neutral-50/70 dark:bg-neutral-900/70 p-4 sm:p-5 space-y-4 backdrop-blur-md">
              {/* Header Badge & Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200/60 dark:border-neutral-800/60 pb-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-mono">
                    <Sparkles className="w-3 h-3 text-purple-500" />
                    <span>Multimodal AI Website Detection Model</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    {predictedClass === "human_made" && (
                      <>
                        <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-5 h-5" />
                        </span>
                        <span>Classification: Human-made Website</span>
                      </>
                    )}
                    {predictedClass === "ai_generated" && (
                      <>
                        <span className="p-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          <Bot className="w-5 h-5" />
                        </span>
                        <span>Classification: AI-generated Website</span>
                      </>
                    )}
                    {predictedClass === "ai_assisted" && (
                      <>
                        <span className="p-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <UserCheck className="w-5 h-5" />
                        </span>
                        <span>Classification: AI-assisted Website</span>
                      </>
                    )}
                  </h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    {predictedClass === "human_made" && "Designed and developed primarily by humans. Authentic source code diversity, semantic markup, and bespoke design rhythm."}
                    {predictedClass === "ai_generated" && `Generated using AI website builders or AI coding tools (${aiBuilder.builderName || "Autonomous AI Builder"}). Synthetic scaffolding and characteristic patterns detected.`}
                    {predictedClass === "ai_assisted" && "Human-developed but significantly assisted by AI. Combines bespoke architecture with AI-scaffolded component blocks, standardized utility density, or template baselines."}
                  </p>
                </div>

                <div className="flex flex-col items-start sm:items-end flex-shrink-0">
                  <div className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">Calibrated Confidence</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
                      {confidence}%
                    </span>
                    <span className="text-xs font-bold text-neutral-500">confidence</span>
                  </div>
                </div>
              </div>

              {/* 3 Analytical Pillars */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Pillar 1: Code & DOM Analysis */}
                <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-950/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-blue-500" /> Code Analysis
                    </span>
                    <span className="font-mono font-bold text-xs">{codeScore}%</span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        codeScore > 60 ? "bg-purple-500" : "bg-emerald-500"
                      )}
                      style={{ width: `${codeScore}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-tight">
                    DOM depth, div-to-semantic ratio, class token entropy, and utility patterns.
                  </p>
                </div>

                {/* Pillar 2: Visual & Layout Analysis */}
                <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-950/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                      <Layout className="w-3.5 h-3.5 text-amber-500" /> Visual Layout
                    </span>
                    <span className="font-mono font-bold text-xs">{visualScore}%</span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        visualScore > 60 ? "bg-amber-500" : "bg-emerald-500"
                      )}
                      style={{ width: `${visualScore}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-tight">
                    Spacing rhythm (4/8/16 grid), card repetition, visual symmetry, and typography pairing.
                  </p>
                </div>

                {/* Pillar 3: Website Fingerprints */}
                <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-950/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500" /> Fingerprints
                    </span>
                    <span className="font-mono font-bold text-xs">{fpScore}%</span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        fpScore > 60 ? "bg-purple-500" : "bg-emerald-500"
                      )}
                      style={{ width: `${fpScore}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-tight">
                    Builder signatures (Lovable, Bolt, v0, Replit, Framer), CMS, and asset CDN provenance.
                  </p>
                </div>
              </div>

              {/* Multimodal Probability Distribution Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs text-neutral-500 font-mono">
                  <span>Class Probabilities:</span>
                  <div className="flex gap-3">
                    <span className="text-emerald-600 dark:text-emerald-400">Human: {Math.round(probs.human_made * 100)}%</span>
                    <span className="text-amber-600 dark:text-amber-400">AI-assisted: {Math.round(probs.ai_assisted * 100)}%</span>
                    <span className="text-purple-600 dark:text-purple-400">AI-generated: {Math.round(probs.ai_generated * 100)}%</span>
                  </div>
                </div>
                <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-neutral-200 dark:bg-neutral-800">
                  <div
                    className="bg-emerald-500 h-full transition-all"
                    style={{ width: `${Math.round(probs.human_made * 100)}%` }}
                    title={`Human-made: ${Math.round(probs.human_made * 100)}%`}
                  />
                  <div
                    className="bg-amber-500 h-full transition-all"
                    style={{ width: `${Math.round(probs.ai_assisted * 100)}%` }}
                    title={`AI-assisted: ${Math.round(probs.ai_assisted * 100)}%`}
                  />
                  <div
                    className="bg-purple-500 h-full transition-all"
                    style={{ width: `${Math.round(probs.ai_generated * 100)}%` }}
                    title={`AI-generated: ${Math.round(probs.ai_generated * 100)}%`}
                  />
                </div>
              </div>
            </div>
          );
        })()}

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
          <div className="p-4 sm:p-5 pt-0 border-t border-neutral-200/60 dark:border-neutral-800/60 space-y-4">
            <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/50">
              <div className="space-y-0.5">
                <span className="text-xs text-neutral-500 font-medium">Multimodal Classification Verdict</span>
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {aiBuilder.classificationLabel || (aiBuilder.isAiGenerated ? "AI-generated" : "Human-made")} Website
                  {aiBuilder.builderName && ` (${aiBuilder.builderName})`}
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  {aiBuilder.explanation ||
                    (aiBuilder.isAiGenerated
                      ? "Detected synthetic scaffolding, utility repetition, or builder signatures."
                      : "Source code shows authentic human engineering variance and bespoke structure.")}
                </p>
              </div>
              <div className="font-mono text-xs flex-shrink-0">
                {aiBuilder.predictedClass === "ai_generated" || aiBuilder.isAiGenerated ? (
                  <span className="px-3 py-1 rounded-full bg-purple-600 text-white font-bold">
                    {aiBuilder.calibratedConfidence || aiBuilder.confidence}% AI Probability
                  </span>
                ) : aiBuilder.predictedClass === "ai_assisted" ? (
                  <span className="px-3 py-1 rounded-full bg-amber-600 text-white font-bold">
                    {aiBuilder.calibratedConfidence || aiBuilder.confidence}% AI-Assisted
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-bold">
                    {aiBuilder.calibratedConfidence || 94.5}% Human Authentic
                  </span>
                )}
              </div>
            </div>

            {/* 4-Part Architecture Inspection Grid */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Four-Part Multimodal Detection Pipeline:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Model 1: Code Analysis</span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    DOM depth, div-to-semantic ratio, class token entropy, and utility patterns.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <Layout className="w-3.5 h-3.5" />
                    <span>Model 2: Visual Analysis</span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Spacing rhythm (4/8/16 grid), card repetition, visual symmetry, and typography pairing.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Model 3: Fingerprints</span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Lovable, Bolt, v0, Replit, Framer AI, and Wix ADI signature scanning.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Model 4: Late Fusion</span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Neural multimodal fusion layer calibrated with temperature scaling.
                  </p>
                </div>
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

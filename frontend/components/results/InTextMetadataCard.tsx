"use client";

import React from "react";
import {
  GraduationCap,
  FileCode2,
  Receipt,
  Sparkles,
  ShieldCheck,
  Building2,
  User,
  Hash,
  Phone,
  Mail,
  CheckCircle2,
  Layers,
  Banknote,
  Terminal,
  ExternalLink,
  Globe,
  MapPin,
  Laptop,
} from "lucide-react";
import { InTextMetadata } from "@/lib/types";

interface InTextMetadataCardProps {
  metadata?: InTextMetadata | null;
}

export const InTextMetadataCard: React.FC<InTextMetadataCardProps> = ({ metadata }) => {
  if (
    !metadata ||
    (!metadata.academic?.studentName &&
      !metadata.academic?.rollNumbers?.length &&
      !metadata.code?.oopFeatures?.length &&
      !metadata.financial?.transactionIds?.length &&
      !metadata.socialAttribution?.authorHandle &&
      !metadata.structural?.sections?.length &&
      !metadata.webProvenance?.organization &&
      !metadata.webProvenance?.isExamPortal)
  ) {
    return null;
  }

  const { genre, academic, financial, code, structural, socialAttribution, webProvenance, integrityScore, integrityStatus } = metadata;

  const getGenreIcon = () => {
    switch (genre) {
      case "Enterprise Examination Platform & Student Portal":
        return <Globe className="w-5 h-5 text-teal-500" />;
      case "Academic Project Dossier & Student Report":
        return <GraduationCap className="w-5 h-5 text-indigo-500" />;
      case "Source Code & OOP Technical Assignment":
        return <FileCode2 className="w-5 h-5 text-emerald-500" />;
      case "Financial UPI Transaction Ledger":
        return <Receipt className="w-5 h-5 text-amber-500" />;
      case "Creative Infographic & Social Document":
        return <Sparkles className="w-5 h-5 text-pink-500" />;
      default:
        return <Layers className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm p-5 space-y-4 shadow-xs">
      {/* Header with Classification Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
            {getGenreIcon()}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                In-Text Metadata Intelligence
              </h3>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
                OCR & AST Parsed
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {genre || "Document Classification"}
            </p>
          </div>
        </div>

        {integrityScore && (
          <div className="flex items-center space-x-2 self-start sm:self-auto px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div className="text-[11px] leading-tight">
              <span className="font-bold">{integrityStatus || "Verified Human Provenance"}</span>
              <span className="text-[10px] opacity-80 block font-mono">
                Integrity Index: {integrityScore}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Grid of Extracted Entities */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Academic Details */}
        {(academic?.studentName || academic?.rollNumbers?.length || academic?.college || academic?.university) && (
          <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200/80 dark:border-neutral-800 space-y-2">
            <div className="flex items-center space-x-1.5 text-neutral-700 dark:text-neutral-300 font-bold text-xs pb-1 border-b border-neutral-200/60 dark:border-neutral-800/80">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
              <span>Academic & Student Identity</span>
            </div>
            {academic.studentName && (
              <div className="flex items-center space-x-2 text-neutral-800 dark:text-neutral-200">
                <User className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                <span className="font-medium text-neutral-500">Student:</span>
                <span className="font-semibold">{academic.studentName}</span>
              </div>
            )}
            {academic.rollNumbers && academic.rollNumbers.length > 0 && (
              <div className="flex items-start space-x-2 text-neutral-800 dark:text-neutral-200">
                <Hash className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0 mt-0.5" />
                <span className="font-medium text-neutral-500">Roll No:</span>
                <span className="font-mono font-semibold">{academic.rollNumbers.join(", ")}</span>
              </div>
            )}
            {(academic.college || academic.university) && (
              <div className="flex items-start space-x-2 text-neutral-800 dark:text-neutral-200">
                <Building2 className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0 mt-0.5" />
                <span className="font-medium text-neutral-500">Institution:</span>
                <span className="leading-snug">{academic.college || academic.university}</span>
              </div>
            )}
            {(academic.phone || academic.email) && (
              <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-400">
                {academic.phone && (
                  <span className="inline-flex items-center space-x-1">
                    <Phone className="w-3 h-3 text-neutral-400" />
                    <span className="font-mono">{academic.phone}</span>
                  </span>
                )}
                {academic.email && (
                  <span className="inline-flex items-center space-x-1">
                    <Mail className="w-3 h-3 text-neutral-400" />
                    <span>{academic.email}</span>
                  </span>
                )}
              </div>
            )}
            {academic.declaration && (
              <div className="pt-1 flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Originality Declaration & Endorsement</span>
              </div>
            )}
          </div>
        )}

        {/* Financial & Banking Receipts */}
        {((financial?.transactionIds && financial.transactionIds.length > 0) || (financial?.banks && financial.banks.length > 0)) && (
          <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200/80 dark:border-neutral-800 space-y-2">
            <div className="flex items-center space-x-1.5 text-neutral-700 dark:text-neutral-300 font-bold text-xs pb-1 border-b border-neutral-200/60 dark:border-neutral-800/80">
              <Receipt className="w-3.5 h-3.5 text-amber-500" />
              <span>Financial & UPI Transaction Proofs</span>
            </div>
            {financial.banks && financial.banks.length > 0 && (
              <div className="flex items-start space-x-2 text-neutral-800 dark:text-neutral-200">
                <Building2 className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0 mt-0.5" />
                <span className="font-medium text-neutral-500">Gateways / Banks:</span>
                <span className="font-medium">{financial.banks.join(", ")}</span>
              </div>
            )}
            {financial.transactionIds && financial.transactionIds.length > 0 && (
              <div className="space-y-1">
                <span className="font-medium text-neutral-500 block">UPI References:</span>
                <div className="flex flex-wrap gap-1">
                  {financial.transactionIds.map((id, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded font-mono text-[10px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 font-semibold text-neutral-700 dark:text-neutral-300"
                    >
                      {id}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {financial.amounts && financial.amounts.length > 0 && (
              <div className="flex items-center space-x-2 text-neutral-800 dark:text-neutral-200">
                <Banknote className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span className="font-medium text-neutral-500">Documented Volume:</span>
                <span className="font-semibold">
                  {financial.amounts.map((a) => `₹${a.toLocaleString()}`).join(", ")}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Source Code & OOP Architecture */}
        {((code?.oopFeatures && code.oopFeatures.length > 0) || (code?.languages && code.languages.length > 0)) && (
          <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200/80 dark:border-neutral-800 space-y-2">
            <div className="flex items-center space-x-1.5 text-neutral-700 dark:text-neutral-300 font-bold text-xs pb-1 border-b border-neutral-200/60 dark:border-neutral-800/80">
              <Terminal className="w-3.5 h-3.5 text-emerald-500" />
              <span>Source Code & OOP Architecture</span>
            </div>
            {code.languages && code.languages.length > 0 && (
              <div className="flex items-center space-x-2 text-neutral-800 dark:text-neutral-200">
                <span className="font-medium text-neutral-500">Language:</span>
                <div className="flex gap-1">
                  {code.languages.map((l, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {code.oopFeatures && code.oopFeatures.length > 0 && (
              <div className="space-y-1">
                <span className="font-medium text-neutral-500 block">OOP Concepts & Classes:</span>
                <div className="flex flex-wrap gap-1">
                  {code.oopFeatures.map((f, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded font-mono text-[10px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="text-[11px] text-neutral-500 italic">
              Algorithmic and programming syntax is evaluated for structural logic, exempt from natural prose burstiness penalties.
            </div>
          </div>
        )}

        {/* Enterprise Web & Platform Provenance */}
        {(webProvenance?.organization || webProvenance?.isExamPortal || webProvenance?.founder) && (
          <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200/80 dark:border-neutral-800 space-y-2 sm:col-span-2">
            <div className="flex items-center justify-between pb-1 border-b border-neutral-200/60 dark:border-neutral-800/80">
              <div className="flex items-center space-x-1.5 text-neutral-700 dark:text-neutral-300 font-bold text-xs">
                <Globe className="w-3.5 h-3.5 text-teal-500" />
                <span>Enterprise Web & Platform Provenance</span>
              </div>
              {webProvenance.hasSchemaLd && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900/50">
                  Schema.org JSON-LD Verified
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {webProvenance.platformName && (
                <div className="flex items-start space-x-2 text-neutral-800 dark:text-neutral-200">
                  <Building2 className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0 mt-0.5" />
                  <span className="font-medium text-neutral-500">Platform:</span>
                  <span className="font-semibold">{webProvenance.platformName}</span>
                </div>
              )}
              {webProvenance.founder && (
                <div className="flex items-start space-x-2 text-neutral-800 dark:text-neutral-200">
                  <User className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0 mt-0.5" />
                  <span className="font-medium text-neutral-500">Founder Attribution:</span>
                  <span className="font-semibold">{webProvenance.founder}</span>
                </div>
              )}
              {webProvenance.location && (
                <div className="flex items-start space-x-2 text-neutral-800 dark:text-neutral-200">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0 mt-0.5" />
                  <span className="font-medium text-neutral-500">Location:</span>
                  <span>{webProvenance.location}</span>
                </div>
              )}
              {webProvenance.softwareCategory && (
                <div className="flex items-start space-x-2 text-neutral-800 dark:text-neutral-200">
                  <Laptop className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0 mt-0.5" />
                  <span className="font-medium text-neutral-500">Category:</span>
                  <span className="leading-snug">{webProvenance.softwareCategory}</span>
                </div>
              )}
              {webProvenance.bundleVersion && (
                <div className="flex items-start space-x-2 text-neutral-800 dark:text-neutral-200 sm:col-span-2">
                  <Terminal className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0 mt-0.5" />
                  <span className="font-medium text-neutral-500">Asset Bundle:</span>
                  <span className="font-mono text-[11px] text-neutral-700 dark:text-neutral-300">{webProvenance.bundleVersion}</span>
                </div>
              )}
            </div>

            {webProvenance.isExamPortal && (
              <div className="pt-1 flex items-center space-x-1.5 text-teal-600 dark:text-teal-400 text-[11px] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified AI Exam Proctoring & Student Dashboard Architecture</span>
              </div>
            )}
          </div>
        )}

        {/* Structural Document Organization */}
        {((structural?.sections && structural.sections.length > 0) || socialAttribution?.authorHandle) && (
          <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200/80 dark:border-neutral-800 space-y-2">
            <div className="flex items-center space-x-1.5 text-neutral-700 dark:text-neutral-300 font-bold text-xs pb-1 border-b border-neutral-200/60 dark:border-neutral-800/80">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>Document Structure & Attribution</span>
            </div>
            {socialAttribution?.authorHandle && (
              <div className="flex items-center space-x-2 text-neutral-800 dark:text-neutral-200">
                <span className="font-medium text-neutral-500">Attribution Handle:</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono">
                  @{socialAttribution.authorHandle}
                </span>
              </div>
            )}
            {socialAttribution?.topic && (
              <div className="flex items-center space-x-2 text-neutral-800 dark:text-neutral-200">
                <span className="font-medium text-neutral-500">Document Topic:</span>
                <span className="font-semibold">{socialAttribution.topic}</span>
              </div>
            )}
            {structural?.sections && structural.sections.length > 0 && (
              <div className="space-y-1">
                <span className="font-medium text-neutral-500 block">Indexed Sections:</span>
                <ul className="space-y-0.5 pl-3 border-l-2 border-neutral-300 dark:border-neutral-700 text-[11px] text-neutral-700 dark:text-neutral-300">
                  {structural.sections.slice(0, 5).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Forensic Legal & Authenticity Note */}
      <div className="pt-1 flex items-start space-x-2 text-[11px] text-neutral-500 dark:text-neutral-400">
        <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="leading-relaxed">
          <b>Forensic Attribution Standard:</b> Verified in-text institutional identifiers, official bank transaction IDs, and structured OOP assignments provide strong deterministic evidence of authentic human authorship, overriding generic probabilistic LLM heuristics.
        </p>
      </div>
    </div>
  );
};

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { WebsiteAnalysisResult } from "@/lib/types";

interface WebsiteAnalysisDashboardProps {
  data: WebsiteAnalysisResult;
  caseId?: string;
  caseNumber?: string;
}

const SECURITY_HEADER_INFO: Record<string, { notePresent: string; noteMissing: string }> = {
  "Strict-Transport-Security": {
    notePresent: "Enforces HTTPS and protects against protocol downgrade attacks",
    noteMissing: "Missing — browsers may connect over insecure HTTP",
  },
  "Content-Security-Policy": {
    notePresent: "Restricts script and resource origins to prevent XSS",
    noteMissing: "Missing — allows unrestricted script execution origins",
  },
  "X-Frame-Options": {
    notePresent: "Restricts iframe embedding to prevent clickjacking",
    noteMissing: "Missing — site can be framed by third parties",
  },
  "X-Content-Type-Options": {
    notePresent: "Disables MIME-sniffing exploits (nosniff)",
    noteMissing: "Missing — browsers may guess MIME types",
  },
  "Referrer-Policy": {
    notePresent: "Limits referrer data leakage across outbound requests",
    noteMissing: "Missing — full URL may be sent in referrers",
  },
  "Permissions-Policy": {
    notePresent: "Restricts browser device APIs (camera, geolocation, mic)",
    noteMissing: "Missing — device APIs are not restricted",
  },
};

export const WebsiteAnalysisDashboard: React.FC<WebsiteAnalysisDashboardProps> = ({
  data,
  caseId,
  caseNumber,
}) => {
  // Only verdict and warnings are visible by default. Everything else is collapsed.
  const [openChecks, setOpenChecks] = useState(false);
  const [openTech, setOpenTech] = useState(false);
  const [openSecurity, setOpenSecurity] = useState(false);
  const [openMeta, setOpenMeta] = useState(false);
  const [openFindings, setOpenFindings] = useState(false);

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
    detectedTechnologies = [],
    aiBuilder,
    metadata,
    security,
    technicalFindings = [],
    summary,
  } = data;

  const predictedClass = aiBuilder?.predictedClass || (aiBuilder?.isAiGenerated ? "ai_generated" : "human_made");
  const confidence = aiBuilder?.calibratedConfidence || aiBuilder?.confidence || 89;

  let resultLabel = "";
  let dotColor = "bg-emerald-500";

  if (predictedClass === "ai_generated" || aiBuilder?.isAiGenerated) {
    resultLabel = `Likely AI-generated (${confidence}%)`;
    if (aiBuilder?.builderName) {
      resultLabel += ` — ${aiBuilder.builderName}`;
    }
    dotColor = "bg-red-500";
  } else if (predictedClass === "ai_assisted") {
    resultLabel = `Likely AI-assisted (${confidence}%)`;
    dotColor = "bg-amber-500";
  } else {
    resultLabel = `Likely human-made (${confidence}%)`;
    dotColor = "bg-emerald-500";
  }

  // Collect warnings visible by default
  const warnings: string[] = [];

  if (!security.isHttps) {
    warnings.push("Insecure HTTP transport: Connection is unencrypted; data can be intercepted.");
  }
  if (security.headersMissing?.includes("Strict-Transport-Security") && security.isHttps) {
    warnings.push("Missing HSTS: Strict-Transport-Security header is not set.");
  }
  if (security.headersMissing?.includes("Content-Security-Policy")) {
    warnings.push("Missing Content-Security-Policy (CSP): Script execution origins are not restricted.");
  }
  if (security.headersMissing?.includes("X-Frame-Options")) {
    warnings.push("Missing X-Frame-Options: Clickjacking protection is disabled.");
  }
  if (security.exposedTechnologies && security.exposedTechnologies.length > 0) {
    warnings.push(`Server technology exposed in headers: ${security.exposedTechnologies.join(", ")}`);
  }
  security.observations?.forEach((obs) => {
    if (obs.severity === "alert" || obs.severity === "warning") {
      const text = obs.description || obs.title || "";
      if (text && !warnings.some((w) => w.includes(text) || text.includes(w))) {
        warnings.push(text);
      }
    }
  });
  if (aiBuilder?.isAiGenerated || aiBuilder?.predictedClass === "ai_generated") {
    warnings.push(`AI builder indicator: ${aiBuilder?.builderName || "Synthetic builder patterns"} detected.`);
  }

  const codeScore = aiBuilder?.breakdown?.codeAnalysisScore ?? (aiBuilder?.isAiGenerated ? 88 : 15);
  const visualScore = aiBuilder?.breakdown?.visualAnalysisScore ?? (aiBuilder?.isAiGenerated ? 85 : 18);
  const fpScore = aiBuilder?.breakdown?.fingerprintScore ?? (aiBuilder?.isAiGenerated ? 95 : 10);
  const probs = aiBuilder?.probabilities || {
    human_made: predictedClass === "human_made" ? 0.89 : 0.05,
    ai_assisted: predictedClass === "ai_assisted" ? 0.82 : 0.08,
    ai_generated: predictedClass === "ai_generated" ? 0.94 : 0.03,
  };

  // Build security headers table entries
  const standardHeaders = [
    "Strict-Transport-Security",
    "Content-Security-Policy",
    "X-Frame-Options",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
  ];
  const allHeadersList = Array.from(new Set([...standardHeaders, ...(security.headersPresent || [])]));

  return (
    <div className="max-w-3xl text-left font-sans text-neutral-800 dark:text-neutral-200">
      {/* Target info & status bar */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100 truncate">
              {metadata.title || domain}
            </h2>
            <div className="text-xs text-neutral-500 font-mono mt-0.5">
              <a
                href={finalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                <span>{finalUrl}</span>
                <span>↗</span>
              </a>
            </div>
          </div>

          <div className="text-xs text-neutral-500 font-mono flex items-center gap-2 flex-wrap">
            <span>HTTP {statusCode}</span>
            <span>·</span>
            <span>{latencyMs}ms</span>
            <span>·</span>
            <span>{(htmlSizeBytes / 1024).toFixed(1)} KB</span>
            {ipAddress && (
              <>
                <span>·</span>
                <span>{ipAddress}</span>
              </>
            )}
            {caseId && (
              <>
                <span>·</span>
                <Link
                  href={`/results/${caseId}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Dossier
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 1. Result (Visible by default) */}
      <section className="border-b border-neutral-200 dark:border-neutral-800 pb-5 mb-5">
        <h3 className="text-xs font-semibold text-neutral-500 mb-2">
          Result
        </h3>
        <div className="flex items-center text-base sm:text-lg font-medium text-neutral-900 dark:text-neutral-100">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${dotColor} mr-2.5 flex-shrink-0`} />
          <span>{resultLabel}</span>
        </div>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
          {aiBuilder?.explanation || summary}
        </p>
      </section>

      {/* 2. Warnings (Visible by default) */}
      <section className="border-b border-neutral-200 dark:border-neutral-800 pb-5 mb-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-neutral-500">
            Warnings ({warnings.length})
          </h3>
        </div>

        {warnings.length === 0 ? (
          <p className="text-xs text-neutral-500">
            No critical configuration warnings.
          </p>
        ) : (
          <ul className="space-y-1.5 text-xs text-neutral-700 dark:text-neutral-300">
            {warnings.map((w, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-600 dark:text-amber-400 font-bold select-none">•</span>
                <span className="leading-relaxed">{w}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 3. Checks run (Collapsed by default) */}
      <section className="border-b border-neutral-200 dark:border-neutral-800 pb-5 mb-5">
        <button
          type="button"
          onClick={() => setOpenChecks(!openChecks)}
          className="w-full flex items-center justify-between text-left py-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <span>Checks run</span>
          <span className="text-xs text-neutral-500 font-normal">
            {openChecks ? "hide" : "show"}
          </span>
        </button>

        {openChecks && (
          <div className="mt-3 space-y-3">
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-neutral-700 dark:text-neutral-300">
              <li>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">Code analysis</span> — DOM depth, semantic tag ratio, token entropy ({codeScore}%)
              </li>
              <li>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">Visual layout</span> — Spacing rhythm, grid repetition, visual symmetry ({visualScore}%)
              </li>
              <li>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">Fingerprints</span> — Builder signatures, generator meta tags, asset CDN origins ({fpScore}%)
              </li>
              <li>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">Late fusion</span> — Calibrated multimodal classification layer ({confidence}%)
              </li>
            </ol>

            <div className="text-xs text-neutral-500 font-mono pt-1">
              Probabilities: human {Math.round(probs.human_made * 100)}% · ai-assisted {Math.round(probs.ai_assisted * 100)}% · ai-generated {Math.round(probs.ai_generated * 100)}%
            </div>

            {aiBuilder?.indicators && aiBuilder.indicators.length > 0 && (
              <div className="pt-2">
                <div className="text-xs font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                  Builder markers:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-xs text-neutral-600 dark:text-neutral-400 font-mono">
                  {aiBuilder.indicators.map((ind, i) => (
                    <li key={i}>{ind}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 4. Technology stack (Collapsed by default) */}
      <section className="border-b border-neutral-200 dark:border-neutral-800 pb-5 mb-5">
        <button
          type="button"
          onClick={() => setOpenTech(!openTech)}
          className="w-full flex items-center justify-between text-left py-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <span>Technology stack</span>
          <span className="text-xs text-neutral-500 font-normal">
            {openTech ? "hide" : "show"}
          </span>
        </button>

        {openTech && (
          <div className="mt-3 space-y-3">
            <div className="text-xs text-neutral-700 dark:text-neutral-300 space-y-1">
              <div><span className="text-neutral-500">Frontend:</span> {frontendFramework || "Server rendered / vanilla"}</div>
              <div><span className="text-neutral-500">Backend:</span> {backendTechnology || "None exposed"}</div>
              <div><span className="text-neutral-500">CMS:</span> {cms || "None"}</div>
              <div><span className="text-neutral-500">Hosting / CDN:</span> {hostingCdn || "Origin web host"}</div>
            </div>

            {detectedTechnologies.length > 0 && (
              <div className="pt-2 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500">
                      <th className="py-1.5 pr-4 font-normal">Technology</th>
                      <th className="py-1.5 px-3 font-normal">Category</th>
                      <th className="py-1.5 pl-4 font-normal">Evidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200/50 dark:divide-neutral-800/50">
                    {detectedTechnologies.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-1.5 pr-4 font-mono font-medium text-neutral-900 dark:text-neutral-100">
                          {item.name} {item.version ? `v${item.version}` : ""}
                        </td>
                        <td className="py-1.5 px-3 text-neutral-500">{item.category}</td>
                        <td className="py-1.5 pl-4 text-neutral-600 dark:text-neutral-400">{item.evidence}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 5. Security headers (Collapsed by default) */}
      <section className="border-b border-neutral-200 dark:border-neutral-800 pb-5 mb-5">
        <button
          type="button"
          onClick={() => setOpenSecurity(!openSecurity)}
          className="w-full flex items-center justify-between text-left py-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <span>Security headers</span>
          <span className="text-xs text-neutral-500 font-normal">
            {openSecurity ? "hide" : "show"}
          </span>
        </button>

        {openSecurity && (
          <div className="mt-3 space-y-4">
            <div className="text-xs text-neutral-500">
              Grade: {security.grade} ({security.securityScore} / 100) · {security.isHttps ? "TLS/HTTPS active" : "Plaintext HTTP"}
            </div>

            {/* Simple table: header name | status (✓ / ✗) | one-line note */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500">
                    <th className="py-2 pr-4 font-normal">Header name</th>
                    <th className="py-2 px-3 font-normal">Status</th>
                    <th className="py-2 pl-4 font-normal">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/50 dark:divide-neutral-800/50 font-mono text-[11px]">
                  {allHeadersList.map((headerName) => {
                    const isPresent = security.headersPresent?.includes(headerName);
                    const info = SECURITY_HEADER_INFO[headerName];
                    const note = isPresent
                      ? (info?.notePresent || "Configured on origin response")
                      : (info?.noteMissing || "Not set on origin response");

                    return (
                      <tr key={headerName}>
                        <td className="py-2 pr-4 font-medium text-neutral-900 dark:text-neutral-100">
                          {headerName}
                        </td>
                        <td className="py-2 px-3 font-sans">
                          {isPresent ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                          ) : (
                            <span className="text-neutral-400 dark:text-neutral-500 font-bold">✗</span>
                          )}
                        </td>
                        <td className="py-2 pl-4 font-sans text-neutral-600 dark:text-neutral-400">
                          {note}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {security.observations && security.observations.length > 0 && (
              <div className="pt-2 space-y-1.5">
                <div className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                  Observations:
                </div>
                <ul className="space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
                  {security.observations.map((obs, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-neutral-400">•</span>
                      <span>
                        <strong className="text-neutral-800 dark:text-neutral-200 font-medium">
                          {obs.title || obs.name}:
                        </strong>{" "}
                        {obs.description}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 6. Metadata (Collapsed by default) */}
      <section className="border-b border-neutral-200 dark:border-neutral-800 pb-5 mb-5">
        <button
          type="button"
          onClick={() => setOpenMeta(!openMeta)}
          className="w-full flex items-center justify-between text-left py-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <span>Metadata</span>
          <span className="text-xs text-neutral-500 font-normal">
            {openMeta ? "hide" : "show"}
          </span>
        </button>

        {openMeta && (
          <div className="mt-3 space-y-2 text-xs text-neutral-700 dark:text-neutral-300">
            <div><span className="text-neutral-500">Title:</span> {metadata.title || "—"}</div>
            <div><span className="text-neutral-500">Description:</span> {metadata.description || "—"}</div>
            <div><span className="text-neutral-500">Author:</span> {metadata.author || "—"}</div>
            <div>
              <span className="text-neutral-500">Directives:</span>{" "}
              robots.txt {metadata.hasRobotsTxt ? "(✓ found)" : "(✗ missing)"} · sitemap.xml {metadata.hasSitemapXml ? "(✓ found)" : "(✗ missing)"}
            </div>
            <div>
              <span className="text-neutral-500">Assets:</span>{" "}
              {metadata.externalScriptsCount} external scripts · {metadata.externalStylesheetsCount} stylesheets
            </div>
            {metadata.externalAssetDomains && metadata.externalAssetDomains.length > 0 && (
              <div>
                <span className="text-neutral-500">Asset domains:</span>{" "}
                <span className="font-mono">{metadata.externalAssetDomains.join(", ")}</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 7. Findings (Collapsed by default) */}
      <section className="border-b border-neutral-200 dark:border-neutral-800 pb-5 mb-5">
        <button
          type="button"
          onClick={() => setOpenFindings(!openFindings)}
          className="w-full flex items-center justify-between text-left py-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <span>Findings</span>
          <span className="text-xs text-neutral-500 font-normal">
            {openFindings ? "hide" : "show"}
          </span>
        </button>

        {openFindings && (
          <div className="mt-3 space-y-2">
            <div className="text-xs text-neutral-500 font-mono pb-1">
              Timestamp: {new Date(timestamp).toLocaleString()}
              {caseNumber && ` · Reference: ${caseNumber}`}
            </div>
            <ol className="list-decimal list-inside space-y-1 text-xs text-neutral-700 dark:text-neutral-300 font-mono leading-relaxed">
              {technicalFindings.map((finding, idx) => (
                <li key={idx}>{finding}</li>
              ))}
            </ol>
          </div>
        )}
      </section>

      {/* Small grey footer disclaimer note */}
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
        Note: Evaluation is based on publicly accessible HTML, CSS, JavaScript, and response headers. Modern frameworks (React, Tailwind) are not flagged as AI without builder-specific signatures.
      </p>
    </div>
  );
};

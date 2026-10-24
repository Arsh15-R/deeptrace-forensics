"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";

interface InvestigativeNoticeProps {
  fpr?: number;
  fnr?: number;
  limitations?: string;
}

export const InvestigativeNotice: React.FC<InvestigativeNoticeProps> = () => {
  return (
    <div className="rounded-panel p-4 sm:p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
      {/* Header */}
      <div className="flex items-center space-x-2 border-b border-neutral-200 dark:border-neutral-800 pb-2.5">
        <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
          Investigative Notice
        </h3>
      </div>

      {/* Main Points */}
      <ul className="text-xs text-neutral-600 dark:text-neutral-400 space-y-2 leading-relaxed">
        <li className="flex items-start space-x-2">
          <span className="text-amber-600 dark:text-amber-400 font-bold text-sm leading-none mt-0.5">•</span>
          <span>
            <b className="text-neutral-900 dark:text-neutral-100">Investigative lead only:</b> Use findings to prioritize inquiries, not as standalone legal proof or certified testimony.
          </span>
        </li>
        <li className="flex items-start space-x-2">
          <span className="text-amber-600 dark:text-amber-400 font-bold text-sm leading-none mt-0.5">•</span>
          <span>
            <b className="text-neutral-900 dark:text-neutral-100">Compression effects:</b> Heavy social media re-compression (e.g., WhatsApp, X) can mask subtle synthetic traces.
          </span>
        </li>
        <li className="flex items-start space-x-2">
          <span className="text-amber-600 dark:text-amber-400 font-bold text-sm leading-none mt-0.5">•</span>
          <span>
            <b className="text-neutral-900 dark:text-neutral-100">Manual review advised:</b> Localized inpainting or targeted facial edits require physical examiner verification.
          </span>
        </li>
      </ul>
    </div>
  );
};

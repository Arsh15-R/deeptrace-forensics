import React from "react";
import { MediaType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SegmentedControlProps {
  activeTab: MediaType;
  onChange: (tab: MediaType) => void;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  activeTab,
  onChange,
}) => {
  const tabs: { id: MediaType; label: string }[] = [
    { id: "image", label: "Image" },
    { id: "video", label: "Video" },
    { id: "audio", label: "Audio" },
    { id: "text", label: "Text / Doc" },
    { id: "link", label: "Remote Link" },
  ];

  return (
    <div
      role="tablist"
      aria-label="Evidence input type selector"
      className="inline-flex p-1 rounded-full bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 w-full sm:w-auto overflow-x-auto"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex-1 sm:flex-initial flex items-center justify-center px-4 py-2 min-h-[44px] text-xs sm:text-sm font-medium rounded-full whitespace-nowrap active:scale-[0.97] transition-transform duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              isActive
                ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 border border-neutral-300 dark:border-neutral-700 font-bold shadow-sm"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
            )}
          >
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

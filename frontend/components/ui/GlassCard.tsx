import React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "main" | "sub" | "input";
  children: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  variant = "main",
  className,
  children,
  ...props
}) => {
  const variantStyles = {
    main: "rounded-panel bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8",
    sub: "rounded-subpanel bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 p-4 sm:p-5",
    input: "rounded-input bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 p-3",
  };

  return (
    <div className={cn(variantStyles[variant], className)} {...props}>
      {children}
    </div>
  );
};

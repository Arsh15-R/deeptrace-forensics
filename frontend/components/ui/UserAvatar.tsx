"use client";

import React, { useState, useEffect, useMemo } from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  variant?: "brand" | "neutral";
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  email,
  size = "md",
  className,
  variant = "brand",
}) => {
  const [hasError, setHasError] = useState<boolean>(false);

  // Reset error state when image source changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  // Dimensions & font size mappings
  const sizeClasses = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-7 h-7 text-[11px]",
    md: "w-9 h-9 text-xs",
    lg: "w-10 h-10 text-sm",
    xl: "w-12 h-12 text-base",
  };

  const iconSizeClasses = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
    xl: "w-6 h-6",
  };

  // Extract clean 1-2 letter uppercase initials
  const initials = useMemo(() => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const first = parts[0][0];
        const last = parts[parts.length - 1][0];
        if (first && last && /[a-zA-Z0-9]/.test(first) && /[a-zA-Z0-9]/.test(last)) {
          return `${first}${last}`.toUpperCase();
        }
      }
      if (parts[0] && parts[0][0] && /[a-zA-Z0-9]/.test(parts[0][0])) {
        return parts[0][0].toUpperCase();
      }
    }
    if (email && email.trim()) {
      const char = email.trim()[0];
      if (char && /[a-zA-Z0-9]/.test(char)) {
        return char.toUpperCase();
      }
    }
    return "";
  }, [name, email]);

  const altText = name
    ? `${name}'s Google profile photo`
    : email
    ? `${email}'s profile photo`
    : "User account avatar";

  const fallbackBackground =
    variant === "brand"
      ? "bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-900/60"
      : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700";

  // Use authenticated photo when URL is present and has not errored
  const hasValidPhoto = Boolean(src && src.trim() && !hasError);

  if (hasValidPhoto && src) {
    return (
      <img
        src={src}
        alt={altText}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onError={() => setHasError(true)}
        className={cn(
          "rounded-full object-cover flex-shrink-0 border border-neutral-200 dark:border-neutral-700 select-none shadow-2xs",
          sizeClasses[size],
          className
        )}
      />
    );
  }

  // Graceful fallback to user initials or neutral icon
  return (
    <div
      role="img"
      aria-label={altText}
      className={cn(
        "rounded-full flex items-center justify-center font-bold flex-shrink-0 select-none border shadow-2xs",
        fallbackBackground,
        sizeClasses[size],
        className
      )}
    >
      {initials ? (
        <span className="font-bold tracking-tight leading-none uppercase font-mono">
          {initials}
        </span>
      ) : (
        <User className={cn("flex-shrink-0", iconSizeClasses[size])} />
      )}
    </div>
  );
};

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  if (i === 0) return `${Math.round(bytes)} B`;
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function formatDate(isoString?: string | null): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(d) + " UTC";
  } catch {
    return isoString;
  }
}

export function formatDateTimeSeparate(isoString?: string | null): { date: string; time: string } {
  if (!isoString) return { date: "—", time: "" };
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { date: isoString, time: "" };
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = String(d.getFullYear()).slice(-2);
    const date = `${day}/${month}/${year}`;
    const time = d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    return { date, time };
  } catch {
    return { date: isoString, time: "" };
  }
}

export function truncateHash(hash?: string | null, start = 8, end = 8): string {
  if (!hash) return "—";
  if (hash.length <= start + end) return hash;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

/**
 * Calculates cryptographic SHA-256 fingerprint in browser using Web Crypto API.
 */
export async function computeClientSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const isBrowser = typeof window !== "undefined";
const isLocalhost =
  isBrowser &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL.includes("localhost") && !isLocalhost
    ? ""
    : process.env.NEXT_PUBLIC_API_URL
  : isLocalhost
  ? "http://127.0.0.1:8000"
  : "";

export function resolveMediaUrl(url?: string | null): string {
  if (!url) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }
  const prefix = API_BASE ? (API_BASE.endsWith("/") ? API_BASE.slice(0, -1) : API_BASE) : "";
  const normalizedUrl = url.startsWith("/") ? url : `/${url}`;
  return `${prefix}${normalizedUrl}`;
}

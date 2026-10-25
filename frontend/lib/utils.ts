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

const SUPABASE_STORAGE_VAULT = "https://kqllmwzftudlxswtnqtg.supabase.co/storage/v1/object/public/evidence-vault";

/**
 * Resolves an API path against the active backend URL.
 * Priority order:
 * 1. If running on localhost/127.0.0.1 -> direct local relative path
 * 2. localStorage override "deeptrace_api_url" (allows dynamic discovery / manual updates without redeploy)
 * 3. window.__DEEPTRACE_DISCOVERED_TUNNEL__ (auto-discovered live tunnel from Supabase)
 * 4. NEXT_PUBLIC_API_URL environment variable
 * 5. Fallback for Vercel production to active Cloudflare Tunnel
 */
export function apiUrl(path: string): string {
  // If running locally in browser (localhost / 127.0.0.1), use direct local relative path
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return path.startsWith("/") ? path : `/${path}`;
    }
  }

  // Priority 1: localStorage override or runtime discovered tunnel
  let base = "";
  if (typeof window !== "undefined") {
    base = localStorage.getItem("deeptrace_api_url")?.trim() || (window as any).__DEEPTRACE_DISCOVERED_TUNNEL__ || "";
  }

  // Priority 2: Baked-in NEXT_PUBLIC_API_URL environment variable
  if (!base) {
    base = process.env.NEXT_PUBLIC_API_URL?.trim() || "";
  }

  // Priority 3: Fallback for Vercel production to active Cloudflare Tunnel
  if (!base && typeof window !== "undefined" && window.location.hostname.includes("vercel.app")) {
    base = "https://chapters-profit-springfield-marketing.trycloudflare.com";
  }

  if (!base) return path.startsWith("/") ? path : `/${path}`;
  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

export function resolveMediaUrl(url?: string | null): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  if (trimmed.startsWith("evidence/") || trimmed.startsWith("heatmaps/")) {
    return `${SUPABASE_STORAGE_VAULT}/${trimmed}`;
  }
  if (trimmed.startsWith("/evidence/") || trimmed.startsWith("/heatmaps/")) {
    return `${SUPABASE_STORAGE_VAULT}${trimmed}`;
  }
  // Return resolved API path for /api/media/...
  const clean = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (clean.startsWith("/api/")) {
    return apiUrl(clean);
  }
  return clean;
}

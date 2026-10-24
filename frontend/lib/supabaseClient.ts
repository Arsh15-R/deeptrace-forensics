import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { OfficerProfile } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

async function fetchServerProfile(token: string): Promise<OfficerProfile> {
  // 1. Direct query from Supabase Realtime Database (profiles table)
  if (supabase) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          const rawRole = (profile.role || "viewer").toLowerCase().trim();
          const role =
            user.email?.toLowerCase() === "arshrana2468@gmail.com" || rawRole === "admin"
              ? "admin"
              : rawRole === "officer"
              ? "officer"
              : "viewer";

          return {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name || user.user_metadata?.full_name || "Authorized Personnel",
            badge_number: profile.badge_number || `GOOG-${profile.id.slice(0, 4).toUpperCase()}`,
            department: profile.department || "Cyber Forensics & Evidence Unit",
            role,
            avatar_url: profile.avatar_url || user.user_metadata?.avatar_url || null,
            provider: profile.provider || "google",
          };
        }
      }
    } catch (sbErr) {
      console.warn("Direct Supabase profile fetch fallback to API route:", sbErr);
    }
  }

  // 2. Query relative or configured API endpoint (/api/auth/me)
  const isBrowser = typeof window !== "undefined";
  const isLocalhost =
    isBrowser &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const apiBase = process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.includes("localhost") && !isLocalhost
      ? ""
      : process.env.NEXT_PUBLIC_API_URL
    : isLocalhost
    ? "http://127.0.0.1:8000"
    : "";

  const endpoint = apiBase ? `${apiBase}/api/auth/me` : "/api/auth/me";
  const res = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Access verification rejected." }));
    throw new Error(errorData.detail || `Server authentication failed (HTTP ${res.status})`);
  }

  const data = await res.json();
  return {
    id: data.id,
    email: data.email,
    full_name: data.full_name,
    badge_number: data.badge_number,
    department: data.department,
    role: data.role,
    avatar_url: data.avatar_url || null,
    provider: "google",
  };
}

function formatUserProfile(user: any): OfficerProfile {
  const meta = user.user_metadata || {};
  const appMeta = user.app_metadata || {};
  const fullName =
    meta.full_name ||
    meta.name ||
    (user.email ? user.email.split("@")[0] : "Authorized Personnel");
  const avatarUrl = meta.avatar_url || meta.picture || null;
  const rawRole = appMeta.role || meta.role;
  const role = (user.email === "arshrana2468@gmail.com" || rawRole === "admin") ? "admin" : (rawRole === "viewer" ? "viewer" : "officer");
  const badge = meta.badge_number || `GOOG-${user.id.slice(0, 4).toUpperCase()}`;
  const department = meta.department || "Cyber Forensics Unit";

  return {
    id: user.id,
    email: user.email || "",
    full_name: fullName,
    badge_number: badge,
    department,
    role,
    avatar_url: avatarUrl,
    provider: "google",
  };
}

export function getActiveUser(): OfficerProfile | null {
  if (typeof window === "undefined") return null;

  const storedAuthUser = localStorage.getItem("deeptrace_auth_user");
  if (storedAuthUser) {
    try {
      const parsed = JSON.parse(storedAuthUser);
      if (parsed && parsed.id && parsed.email) {
        return parsed;
      }
    } catch {
      localStorage.removeItem("deeptrace_auth_user");
    }
  }

  return null;
}

export function isUserAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return getActiveUser() !== null;
}

export async function syncUserFromSession(): Promise<OfficerProfile | null> {
  if (!supabase) return null;
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error || !session?.user) {
      return null;
    }

    let profile: OfficerProfile;
    try {
      // Authoritatively resolve role and profile directly from the persistent server record
      profile = await fetchServerProfile(session.access_token);
    } catch (serverErr: any) {
      // If server explicitly deactivated or rejected account
      if (serverErr?.message && serverErr.message.toLowerCase().includes("deactivated")) {
        await signOutUser();
        throw new Error("Your account has been deactivated by an administrator.");
      }
      // If server is temporarily unreachable (e.g. initial setup or offline dev), fallback to claims
      console.warn("Server auth sync warning, fallback to claims:", serverErr);
      profile = formatUserProfile(session.user);
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("deeptrace_auth_user", JSON.stringify(profile));
      localStorage.removeItem("deeptrace_active_role");
      window.dispatchEvent(new Event("deeptrace_role_changed"));
      window.dispatchEvent(new Event("deeptrace_auth_changed"));
    }
    return profile;
  } catch (err) {
    console.error("Failed to sync session user:", err);
    throw err;
  }
}

export async function signInWithGoogle(redirectPath: string = "/") {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      "Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) are not configured."
    );
  }

  const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
    redirectPath
  )}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    throw error;
  }

  // Guarantee browser navigation to Google OAuth URL if returned
  if (data?.url && typeof window !== "undefined") {
    window.location.assign(data.url);
  }

  return data;
}

export async function signOutUser() {
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Sign out from Supabase failed:", e);
    }
  }

  if (typeof window !== "undefined") {
    localStorage.removeItem("deeptrace_auth_user");
    localStorage.removeItem("deeptrace_active_role");
    window.dispatchEvent(new Event("deeptrace_role_changed"));
    window.dispatchEvent(new Event("deeptrace_auth_changed"));
  }
}

export async function getAuthToken(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch {
    return null;
  }
}

// Client-side initialization to maintain auth session across tabs & refreshes
if (typeof window !== "undefined" && supabase) {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN" && session?.user) {
      await syncUserFromSession().catch(console.error);
    } else if (event === "SIGNED_OUT") {
      localStorage.removeItem("deeptrace_auth_user");
      window.dispatchEvent(new Event("deeptrace_role_changed"));
      window.dispatchEvent(new Event("deeptrace_auth_changed"));
    }
  });

  // Initial check on module evaluation
  syncUserFromSession().catch(() => {});
}

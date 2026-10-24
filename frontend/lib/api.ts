import { CaseRecord, AuditLogRecord, StandardizedAnalysisResult, AdminUserRecord, UserRole } from "./types";
import { getAuthToken, supabase } from "./supabaseClient";

const isBrowser = typeof window !== "undefined";
const isLocalhost = isBrowser && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

// On client in production (e.g. Vercel), default to relative URL ("") so same-origin API routes are hit without mixed-content
const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? (process.env.NEXT_PUBLIC_API_URL.includes("localhost") && !isLocalhost ? "" : process.env.NEXT_PUBLIC_API_URL)
  : (isLocalhost ? "http://127.0.0.1:8000" : "");

async function getHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    ...extra,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

export async function analyzeImage(file: File, caseRef?: string): Promise<CaseRecord> {
  const formData = new FormData();
  formData.append("file", file);
  if (caseRef) formData.append("case_ref", caseRef);

  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/api/cases/analyze/image`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Analysis failed" }));
    throw new Error(errorData.detail || `Server responded with ${res.status}`);
  }

  return res.json();
}

export async function analyzeVideo(file: File, caseRef?: string): Promise<CaseRecord> {
  const formData = new FormData();
  formData.append("file", file);
  if (caseRef) formData.append("case_ref", caseRef);

  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/api/cases/analyze/video`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Video analysis failed" }));
    throw new Error(errorData.detail || `Server responded with ${res.status}`);
  }

  return res.json();
}

export async function analyzeAudio(file: File, caseRef?: string): Promise<CaseRecord> {
  const formData = new FormData();
  formData.append("file", file);
  if (caseRef) formData.append("case_ref", caseRef);

  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/api/cases/analyze/audio`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Audio analysis failed" }));
    throw new Error(errorData.detail || `Server responded with ${res.status}`);
  }

  return res.json();
}

export async function analyzeLink(url: string, caseRef?: string): Promise<CaseRecord> {
  const headers = await getHeaders({ "Content-Type": "application/json" });
  const res = await fetch(`${API_BASE}/api/cases/analyze/link`, {
    method: "POST",
    headers,
    body: JSON.stringify({ url, case_reference: caseRef }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Link ingestion failed" }));
    throw new Error(errorData.detail || `Server responded with ${res.status}`);
  }

  return res.json();
}

export async function analyzeText(text: string, caseRef?: string): Promise<CaseRecord> {
  const headers = await getHeaders({ "Content-Type": "application/json" });
  const res = await fetch(`${API_BASE}/api/cases/analyze/text`, {
    method: "POST",
    headers,
    body: JSON.stringify({ text, case_reference: caseRef }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Text analysis failed" }));
    throw new Error(errorData.detail || `Server responded with ${res.status}`);
  }

  return res.json();
}

// Unified Detection API
export async function submitAnalysisJob(params: {
  file?: File;
  text?: string;
  url?: string;
  mediaType?: string;
}): Promise<{ jobId: string; status: string; progress: number; mediaType: string }> {
  const formData = new FormData();
  if (params.file) {
    formData.append("file", params.file);
  }
  if (params.text) {
    formData.append("text", params.text);
  }
  if (params.url) {
    formData.append("url", params.url);
  }
  if (params.mediaType) {
    formData.append("media_type", params.mediaType);
  }

  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/api/analysis/jobs`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Submission failed" }));
    throw new Error(err.detail || `Failed to submit analysis job (${res.status})`);
  }

  return res.json();
}

export async function getAnalysisJobStatus(jobId: string): Promise<{
  jobId: string;
  status: "processing" | "completed" | "failed";
  progress: number;
  error?: string;
  mediaType: string;
}> {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/api/analysis/jobs/${jobId}`, {
    headers,
  });

  if (!res.ok) {
    throw new Error(`Job ${jobId} not found`);
  }

  return res.json();
}

export async function getAnalysisJobResult(jobId: string): Promise<StandardizedAnalysisResult> {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/api/analysis/jobs/${jobId}/result`, {
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to fetch result" }));
    throw new Error(err.detail || `Result unavailable (HTTP ${res.status})`);
  }

  return res.json();
}

export async function getPipelineBenchmark(): Promise<any> {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/api/analysis/benchmark`, {
    headers,
  });
  if (!res.ok) throw new Error("Benchmark unavailable");
  return res.json();
}

export async function getCase(caseId: string): Promise<CaseRecord> {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/api/cases/${caseId}`, {
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: `Failed to load case ${caseId}` }));
    throw new Error(errorData.detail || `Server responded with ${res.status}`);
  }

  return res.json();
}

export async function listCases(
  search?: string,
  verdict?: string,
  mediaType?: string
): Promise<CaseRecord[]> {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (verdict) params.append("verdict", verdict);
  if (mediaType) params.append("media_type", mediaType);

  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/api/cases?${params.toString()}`, {
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to retrieve examination cases" }));
    throw new Error(errorData.detail || `Server responded with ${res.status}`);
  }

  return res.json();
}

export async function getAuditLogs(limit = 100, action?: string): Promise<AuditLogRecord[]> {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (action) params.append("action", action);

  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/api/audit/logs?${params.toString()}`, {
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Audit access forbidden" }));
    throw new Error(err.detail || "Administrative access required.");
  }

  return res.json();
}

export async function downloadReportPdf(caseId: string, caseNumber: string): Promise<void> {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE}/api/reports/${caseId}/pdf`, {
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to compile and download PDF report." }));
    throw new Error(errorData.detail || `Report export error (HTTP ${res.status})`);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `DeepTrace_Forensic_Report_${caseNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    if (a.parentNode) {
      a.parentNode.removeChild(a);
    }
  }, 100);
}

export async function listAdminUsers(): Promise<AdminUserRecord[]> {
  // 1. Direct query from Supabase Realtime Database (PostgreSQL public.profiles)
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const nowUtc = Date.now();
        const records: AdminUserRecord[] = data.map((p: any) => {
          const lastActiveIso = p.updated_at || p.created_at || new Date().toISOString();
          const lastActiveMs = new Date(lastActiveIso).getTime();
          const isOnline = nowUtc - lastActiveMs <= 300000;

          const rawRole = (p.role || "viewer").toLowerCase().trim();
          let roleDisplay: UserRole = "viewer";
          if (p.email?.toLowerCase() === "arshrana2468@gmail.com" || rawRole === "admin") {
            roleDisplay = "admin";
          } else if (rawRole === "officer") {
            roleDisplay = "officer";
          } else {
            roleDisplay = "viewer";
          }

          return {
            id: p.id,
            email: p.email,
            full_name: p.full_name || p.email?.split("@")[0] || "Authorized Personnel",
            badge_number: p.badge_number || `GOOG-${p.id.slice(0, 4).toUpperCase()}`,
            department: p.department || "Cyber Forensics & Evidence Unit",
            role: roleDisplay,
            is_active: p.is_active !== false,
            avatar_url: p.avatar_url || null,
            provider: p.provider || "google",
            last_active_at: lastActiveIso,
            is_online: isOnline,
            created_at: p.created_at || new Date().toISOString(),
            updated_at: p.updated_at || new Date().toISOString(),
          };
        });

        records.sort((a, b) => {
          if (a.role === "admin" && b.role !== "admin") return -1;
          if (b.role === "admin" && a.role !== "admin") return 1;
          return new Date(b.last_active_at).getTime() - new Date(a.last_active_at).getTime();
        });

        return records;
      }
    } catch (sbErr) {
      console.warn("Direct Supabase query fallback to API route:", sbErr);
    }
  }

  // 2. Fallback to API endpoint (/api/admin/users)
  const headers = await getHeaders();
  const endpoint = API_BASE ? `${API_BASE}/api/admin/users` : "/api/admin/users";
  const res = await fetch(endpoint, { headers });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to load personnel roster." }));
    throw new Error(errorData.detail || `Access denied (HTTP ${res.status})`);
  }

  return res.json();
}

export async function updateUserRole(userId: string, role: string): Promise<AdminUserRecord> {
  const dbRole = role === "viewer" ? "analyst" : role;
  const nowIso = new Date().toISOString();

  // 1. Direct update to Supabase Realtime Database
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ role: dbRole, updated_at: nowIso })
        .eq("id", userId)
        .select()
        .single();

      if (!error && data) {
        const roleDisplay: UserRole = data.role === "analyst" ? "viewer" : (data.role as UserRole);
        return {
          id: data.id,
          email: data.email,
          full_name: data.full_name,
          badge_number: data.badge_number,
          department: data.department,
          role: roleDisplay,
          is_active: data.is_active !== false,
          avatar_url: data.avatar_url,
          provider: data.provider || "google",
          last_active_at: data.updated_at,
          is_online: true,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      }
    } catch (sbErr) {
      console.warn("Direct Supabase role update fallback to API route:", sbErr);
    }
  }

  // 2. Fallback to API endpoint
  const headers = await getHeaders({ "Content-Type": "application/json" });
  const endpoint = API_BASE ? `${API_BASE}/api/admin/users/${userId}/role` : `/api/admin/users/${userId}/role`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ role }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Role modification rejected." }));
    throw new Error(errorData.detail || `Role update failed (HTTP ${res.status})`);
  }

  return res.json();
}

export async function updateUserStatus(userId: string, isActive: boolean): Promise<AdminUserRecord> {
  const nowIso = new Date().toISOString();

  // 1. Direct update to Supabase Realtime Database
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ is_active: isActive, updated_at: nowIso })
        .eq("id", userId)
        .select()
        .single();

      if (!error && data) {
        const roleDisplay: UserRole = data.role === "analyst" ? "viewer" : (data.role as UserRole);
        return {
          id: data.id,
          email: data.email,
          full_name: data.full_name,
          badge_number: data.badge_number,
          department: data.department,
          role: roleDisplay,
          is_active: isActive,
          avatar_url: data.avatar_url,
          provider: data.provider || "google",
          last_active_at: data.updated_at,
          is_online: false,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      }
    } catch (sbErr) {
      console.warn("Direct Supabase status update fallback to API route:", sbErr);
    }
  }

  // 2. Fallback to API endpoint
  const headers = await getHeaders({ "Content-Type": "application/json" });
  const endpoint = API_BASE ? `${API_BASE}/api/admin/users/${userId}/status` : `/api/admin/users/${userId}/status`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ is_active: isActive }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Status change rejected." }));
    throw new Error(errorData.detail || `Status update failed (HTTP ${res.status})`);
  }

  return res.json();
}

export async function deleteAdminUser(userId: string): Promise<{ deleted_id: string }> {
  // 1. Direct delete from Supabase Realtime Database
  if (supabase) {
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (!error) {
        return { deleted_id: userId };
      }
    } catch (sbErr) {
      console.warn("Direct Supabase delete fallback to API route:", sbErr);
    }
  }

  // 2. Fallback to API endpoint
  const headers = await getHeaders();
  const endpoint = API_BASE ? `${API_BASE}/api/admin/users/${userId}` : `/api/admin/users/${userId}`;
  const res = await fetch(endpoint, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "User deletion failed." }));
    throw new Error(errorData.detail || `Delete failed (HTTP ${res.status})`);
  }

  return res.json();
}

export async function fetchAuthMe(tokenOverride?: string): Promise<{
  id: string;
  email: string;
  full_name: string;
  badge_number: string;
  department: string;
  role: "admin" | "officer" | "viewer";
  is_active: boolean;
  avatar_url?: string | null;
  provider: string;
}> {
  const token = tokenOverride || (await getAuthToken());
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const endpoint = API_BASE ? `${API_BASE}/api/auth/me` : "/api/auth/me";
  const res = await fetch(endpoint, { headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Authentication verification failed." }));
    throw new Error(errorData.detail || `Server rejected credentials (HTTP ${res.status})`);
  }

  return res.json();
}

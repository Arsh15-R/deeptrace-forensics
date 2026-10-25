import { CaseRecord, AuditLogRecord, StandardizedAnalysisResult, AdminUserRecord, UserRole } from "./types";
import { getAuthToken, supabase } from "./supabaseClient";
import { apiUrl } from "./utils";
import { generateForensicPdfBuffer } from "./pdfReportGenerator";

export { apiUrl };

/**
 * Lightweight health verification against /api/health.
 * Auto-discovers the active Cloudflare Tunnel from Supabase (/api/tunnel-status)
 * if the default or baked-in tunnel URL is unreachable.
 */
export async function checkServerHealth(signal?: AbortSignal): Promise<{ ok: boolean; error?: string }> {
  let endpoint = apiUrl("/api/health");

  // Step 1: Probe current endpoint
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    if (signal) {
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    const res = await fetch(endpoint, {
      method: "GET",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (res.ok) {
      return { ok: true };
    }
  } catch {}

  // Step 2: Auto-discovery fallback if running on Vercel
  if (typeof window !== "undefined" && window.location.hostname.includes("vercel.app")) {
    try {
      const discoRes = await fetch("/api/tunnel-status", { method: "GET" });
      if (discoRes.ok) {
        const discoData = await discoRes.json();
        const activeTunnel = discoData?.tunnel_url?.trim();
        if (activeTunnel && !endpoint.startsWith(activeTunnel)) {
          const retryEndpoint = `${activeTunnel.replace(/\/+$/, "")}/api/health`;
          const controller2 = new AbortController();
          const timeoutId2 = setTimeout(() => controller2.abort(), 4000);
          const retryRes = await fetch(retryEndpoint, {
            method: "GET",
            signal: controller2.signal,
          }).finally(() => clearTimeout(timeoutId2));

          if (retryRes.ok) {
            localStorage.setItem("deeptrace_api_url", activeTunnel);
            (window as any).__DEEPTRACE_DISCOVERED_TUNNEL__ = activeTunnel;
            console.log(`[DeepTrace Client] Auto-discovered active laptop tunnel: ${activeTunnel}`);
            return { ok: true };
          }
        }
      }
    } catch {}
  }

  const isRemote = Boolean(endpoint && !endpoint.startsWith("/"));
  return {
    ok: false,
    error: isRemote
      ? "Analysis server is offline. Start the laptop server and tunnel."
      : "Forensic service is temporarily unreachable.",
  };
}

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

function createRequestSignal(userSignal?: AbortSignal, timeoutMs = 120000): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new DOMException("Analysis request timed out after " + Math.round(timeoutMs / 1000) + " seconds.", "TimeoutError"));
  }, timeoutMs);

  if (userSignal) {
    if (userSignal.aborted) {
      clearTimeout(timer);
      controller.abort(userSignal.reason);
    } else {
      userSignal.addEventListener("abort", () => {
        clearTimeout(timer);
        controller.abort(userSignal.reason);
      }, { once: true });
    }
  }

  return controller.signal;
}

async function parseApiResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    let errorDetail = fallbackMessage;
    try {
      const parsed = JSON.parse(text);
      if (parsed.detail) errorDetail = parsed.detail;
      else if (parsed.message) errorDetail = parsed.message;
    } catch {
      if (text && text.length < 250 && !text.includes("<html")) {
        errorDetail = text;
      } else {
        errorDetail = `${fallbackMessage} (HTTP ${res.status})`;
      }
    }
    throw new Error(errorDetail);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Invalid response format received from forensic server. Expected JSON.");
  }
}

function formatNetworkError(err: any, defaultMsg: string): Error {
  if (err?.name === "TimeoutError" || err?.message?.includes("timed out")) {
    return new Error("Analysis request timed out after 120 seconds. The examination engine did not complete within the required window.");
  }
  if (err?.name === "AbortError") {
    return err;
  }
  const isRemote = Boolean(process.env.NEXT_PUBLIC_API_URL);
  if (isRemote && (err?.name === "TypeError" || err?.message?.includes("fetch") || err?.message?.includes("NetworkError"))) {
    return new Error("Analysis server is offline. Start the laptop server and tunnel.");
  }
  return err instanceof Error ? err : new Error(defaultMsg);
}

export async function analyzeImage(
  file: File,
  caseRef?: string,
  signal?: AbortSignal
): Promise<CaseRecord> {
  const formData = new FormData();
  formData.append("file", file);
  if (caseRef) formData.append("case_ref", caseRef);

  const headers = await getHeaders();
  const endpoint = apiUrl("/api/cases/analyze/image");
  if (typeof window !== "undefined") {
    console.log(`[DeepTrace Client] POST ${endpoint} (File: ${file.name}, Size: ${file.size}B)`);
  }
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: formData,
      signal: createRequestSignal(signal, 120000),
    });

    return await parseApiResponse<CaseRecord>(res, "Image analysis failed");
  } catch (err: any) {
    throw formatNetworkError(err, "Failed to analyze image evidence.");
  }
}

export async function analyzeVideo(
  file: File,
  caseRef?: string,
  signal?: AbortSignal
): Promise<CaseRecord> {
  const formData = new FormData();
  formData.append("file", file);
  if (caseRef) formData.append("case_ref", caseRef);

  const headers = await getHeaders();
  const endpoint = apiUrl("/api/cases/analyze/video");
  if (typeof window !== "undefined") {
    console.log(`[DeepTrace Client] POST ${endpoint} (File: ${file.name}, Size: ${file.size}B)`);
  }
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: formData,
      signal: createRequestSignal(signal, 120000),
    });

    return await parseApiResponse<CaseRecord>(res, "Video analysis failed");
  } catch (err: any) {
    throw formatNetworkError(err, "Failed to analyze video evidence.");
  }
}

export async function analyzeAudio(
  file: File,
  caseRef?: string,
  signal?: AbortSignal
): Promise<CaseRecord> {
  const formData = new FormData();
  formData.append("file", file);
  if (caseRef) formData.append("case_ref", caseRef);

  const headers = await getHeaders();
  const endpoint = apiUrl("/api/cases/analyze/audio");
  if (typeof window !== "undefined") {
    console.log(`[DeepTrace Client] POST ${endpoint} (File: ${file.name}, Size: ${file.size}B)`);
  }
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: formData,
      signal: createRequestSignal(signal, 120000),
    });

    return await parseApiResponse<CaseRecord>(res, "Audio analysis failed");
  } catch (err: any) {
    throw formatNetworkError(err, "Failed to analyze audio evidence.");
  }
}

export async function analyzeLink(
  url: string,
  caseRef?: string,
  signal?: AbortSignal
): Promise<CaseRecord> {
  const headers = await getHeaders({ "Content-Type": "application/json" });
  const endpoint = apiUrl("/api/cases/analyze/link");
  if (typeof window !== "undefined") {
    console.log(`[DeepTrace Client] POST ${endpoint} (URL: ${url})`);
  }
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ url, case_reference: caseRef }),
      signal: createRequestSignal(signal, 120000),
    });

    return await parseApiResponse<CaseRecord>(res, "Link ingestion failed");
  } catch (err: any) {
    throw formatNetworkError(err, "Failed to analyze remote link.");
  }
}

export async function analyzeText(
  text: string,
  caseRef?: string,
  signal?: AbortSignal
): Promise<CaseRecord> {
  const headers = await getHeaders({ "Content-Type": "application/json" });
  const endpoint = apiUrl("/api/cases/analyze/text");
  if (typeof window !== "undefined") {
    console.log(`[DeepTrace Client] POST ${endpoint} (Length: ${text.length} chars)`);
  }
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ text, case_reference: caseRef }),
      signal: createRequestSignal(signal, 120000),
    });

    return await parseApiResponse<CaseRecord>(res, "Text analysis failed");
  } catch (err: any) {
    throw formatNetworkError(err, "Failed to analyze text corpus.");
  }
}

// Unified Detection API
export async function submitAnalysisJob(
  params: {
    file?: File;
    text?: string;
    url?: string;
    mediaType?: string;
  },
  signal?: AbortSignal
): Promise<{ jobId: string; status: string; progress: number; mediaType: string }> {
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
  const res = await fetch(apiUrl("/api/analysis/jobs"), {
    method: "POST",
    headers,
    body: formData,
    signal: createRequestSignal(signal, 35000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Submission failed" }));
    throw new Error(err.detail || `Failed to submit analysis job (${res.status})`);
  }

  return res.json();
}

export async function getAnalysisJobStatus(
  jobId: string,
  signal?: AbortSignal
): Promise<{
  jobId: string;
  status: "processing" | "completed" | "failed";
  progress: number;
  error?: string;
  mediaType: string;
}> {
  const headers = await getHeaders();
  const res = await fetch(apiUrl(`/api/analysis/jobs/${jobId}`), {
    headers,
    signal: createRequestSignal(signal, 15000),
  });

  if (!res.ok) {
    throw new Error(`Job ${jobId} not found`);
  }

  return res.json();
}

export async function getAnalysisJobResult(jobId: string): Promise<StandardizedAnalysisResult> {
  const headers = await getHeaders();
  const res = await fetch(apiUrl(`/api/analysis/jobs/${jobId}/result`), {
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
  const res = await fetch(apiUrl("/api/analysis/benchmark"), {
    headers,
  });
  if (!res.ok) throw new Error("Benchmark unavailable");
  return res.json();
}

function mapSupabaseCaseRow(row: any): CaseRecord {
  let perDetector = row.per_detector_scores;
  if (typeof perDetector === "string") {
    try {
      perDetector = JSON.parse(perDetector);
    } catch {}
  }
  let timeline = row.timeline_scores;
  if (typeof timeline === "string") {
    try {
      timeline = JSON.parse(timeline);
    } catch {}
  }

    const supabaseStorageBase = "https://kqllmwzftudlxswtnqtg.supabase.co/storage/v1/object/public/evidence-vault";
    const cleanStorage = row.storage_path ? (row.storage_path.startsWith("/") ? row.storage_path.slice(1) : row.storage_path) : null;
    const cleanHeatmap = row.heatmap_storage_path ? (row.heatmap_storage_path.startsWith("/") ? row.heatmap_storage_path.slice(1) : row.heatmap_storage_path) : null;

    const resolvedMediaUrl = (row.media_url && (row.media_url.startsWith("http://") || row.media_url.startsWith("https://")))
      ? row.media_url
      : (cleanStorage ? `${supabaseStorageBase}/${cleanStorage}` : apiUrl(`/api/media/evidence/${row.id}`));

    const resolvedHeatmapUrl = (row.heatmap_url && (row.heatmap_url.startsWith("http://") || row.heatmap_url.startsWith("https://")))
      ? row.heatmap_url
      : (cleanHeatmap ? `${supabaseStorageBase}/${cleanHeatmap}` : (row.media_type === "image" ? apiUrl(`/api/media/heatmap/${row.id}`) : null));

    return {
      id: row.id,
      case_number: row.case_number || `CASE-${row.id.slice(0, 8)}`,
      officer_id: row.officer_id || "unassigned",
      officer_name: row.officer_name || "Investigating Officer",
      officer_badge: row.officer_badge || "UNASSIGNED",
      department: row.department || "Cyber Forensics & Evidence Unit",
      media_type: row.media_type || "image",
      file_name: row.file_name,
      source_url: row.source_url,
      storage_path: row.storage_path,
      file_size_bytes: row.file_size_bytes,
      sha256_hash: row.sha256_hash || "",
      mime_type: row.mime_type,
      verdict: row.verdict || "inconclusive",
      calibrated_confidence: Number(row.calibrated_confidence || 50),
      confidence_interval_low: Number(row.confidence_interval_low || 45),
      confidence_interval_high: Number(row.confidence_interval_high || 55),
      per_detector_scores: perDetector || {
        pixel_patterns: 50,
        face_lighting: 50,
        metadata_exif: 50,
        breakdown: [],
      },
      heatmap_url: resolvedHeatmapUrl,
      heatmap_path: row.heatmap_storage_path || row.heatmap_path,
      media_url: resolvedMediaUrl,
      timeline_scores: Array.isArray(timeline) ? timeline : [],
      text_snippet: row.text_snippet,
      model_name: row.model_name || "TruthLens Multi-Modal Ensemble",
      model_version: row.model_version || "v2.4",
      known_error_rate_fpr: Number(row.known_error_rate_fpr || 4.2),
      known_error_rate_fnr: Number(row.known_error_rate_fnr || 6.8),
      limitations_notes: row.notes || row.limitations_notes || "Neyman-Pearson calibrated forensic evaluation.",
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || row.created_at || new Date().toISOString(),
    };
}

export async function getCase(caseId: string, signal?: AbortSignal): Promise<CaseRecord> {
  // 1. Direct query from Supabase Realtime Database
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .or(`id.eq.${caseId},case_number.eq.${caseId}`)
        .maybeSingle();

      if (!error && data) {
        return mapSupabaseCaseRow(data);
      }
    } catch (sbErr) {
      console.warn("Direct Supabase case lookup fallback to API route:", sbErr);
    }
  }

  // 2. Fallback to API route
  const headers = await getHeaders();
  const endpoint = apiUrl(`/api/cases/${caseId}`);
  const res = await fetch(endpoint, {
    headers,
    signal: createRequestSignal(signal, 12000),
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
  mediaType?: string,
  signal?: AbortSignal
): Promise<CaseRecord[]> {
  // 1. Direct query from Supabase Realtime Database (PostgreSQL cases table)
  if (supabase) {
    try {
      let query = supabase
        .from("cases")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (verdict && verdict !== "all") {
        query = query.eq("verdict", verdict);
      }
      if (mediaType && mediaType !== "all") {
        query = query.eq("media_type", mediaType);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        let records = data.map(mapSupabaseCaseRow);
        if (search) {
          const term = search.trim().toLowerCase();
          records = records.filter(
            (c) =>
              c.case_number.toLowerCase().includes(term) ||
              (c.file_name && c.file_name.toLowerCase().includes(term)) ||
              (c.source_url && c.source_url.toLowerCase().includes(term)) ||
              c.sha256_hash.toLowerCase().includes(term) ||
              c.officer_name.toLowerCase().includes(term) ||
              (c.officer_badge && c.officer_badge.toLowerCase().includes(term))
          );
        }
        return records;
      }
    } catch (sbErr) {
      console.warn("Direct Supabase listCases fallback to API route:", sbErr);
    }
  }

  // 2. Fallback to API endpoint
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (verdict) params.append("verdict", verdict);
  if (mediaType) params.append("media_type", mediaType);

  const headers = await getHeaders();
  const endpoint = apiUrl(`/api/cases?${params.toString()}`);
  const res = await fetch(endpoint, {
    headers,
    signal: createRequestSignal(signal, 12000),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to retrieve examination cases" }));
    throw new Error(errorData.detail || `Server responded with ${res.status}`);
  }

  return res.json();
}

export async function getAuditLogs(
  limit = 100,
  action?: string,
  signal?: AbortSignal
): Promise<AuditLogRecord[]> {
  // 1. Direct query from Supabase Realtime Database
  if (supabase) {
    try {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (action && action !== "all") {
        query = query.eq("action", action);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return data.map((row: any) => {
          let details = row.details;
          if (typeof details === "string") {
            try { details = JSON.parse(details); } catch {}
          }
          return {
            id: row.id,
            case_id: row.case_id || null,
            case_number: row.case_number || null,
            user_id: row.user_id || "system",
            user_email: row.user_email || "system@police.dept.gov",
            user_role: row.user_role === "admin" ? "admin" : "officer",
            action: row.action || "EVENT_LOGGED",
            ip_address: row.ip_address || "127.0.0.1",
            user_agent: row.user_agent || "System",
            details: details || {},
            created_at: row.created_at || new Date().toISOString(),
          };
        });
      }
    } catch (sbErr) {
      console.warn("Direct Supabase audit logs fallback to API route:", sbErr);
    }
  }

  // 2. Fallback to API route
  const params = new URLSearchParams({ limit: limit.toString() });
  if (action) params.append("action", action);

  const headers = await getHeaders();
  const endpoint = apiUrl(`/api/audit/logs?${params.toString()}`);
  const res = await fetch(endpoint, {
    headers,
    signal: createRequestSignal(signal, 12000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Audit access forbidden" }));
    throw new Error(err.detail || "Administrative access required.");
  }

  return res.json();
}

export async function deleteCase(id: string): Promise<{ success: boolean; deleted_id: string }> {
  // 1. Direct Supabase delete if client is authenticated
  if (supabase) {
    try {
      const { error } = await supabase.from("cases").delete().or(`id.eq.${id},case_number.eq.${id}`);
      if (!error) {
        return { success: true, deleted_id: id };
      }
    } catch {}
  }

  // 2. Fallback to API route
  const headers = await getHeaders();
  const endpoint = apiUrl(`/api/cases/${id}`);
  const res = await fetch(endpoint, {
    method: "DELETE",
    headers,
    signal: createRequestSignal(undefined, 15000),
  });

  return parseApiResponse<{ success: boolean; deleted_id: string }>(res, "Failed to delete case record");
}

export async function deleteAuditLog(id: string): Promise<{ success: boolean; deleted_id: string }> {
  // 1. Direct Supabase delete if client is authenticated
  if (supabase) {
    try {
      const { error } = await supabase.from("audit_logs").delete().eq("id", id);
      if (!error) {
        return { success: true, deleted_id: id };
      }
    } catch {}
  }

  // 2. Fallback to API route
  const headers = await getHeaders();
  const endpoint = apiUrl(`/api/audit/logs?id=${id}`);
  const res = await fetch(endpoint, {
    method: "DELETE",
    headers,
    signal: createRequestSignal(undefined, 15000),
  });

  return parseApiResponse<{ success: boolean; deleted_id: string }>(res, "Failed to delete audit log");
}

export async function clearAllAuditLogs(): Promise<{ success: boolean }> {
  const headers = await getHeaders();
  const endpoint = apiUrl("/api/audit/logs?all=true");
  const res = await fetch(endpoint, {
    method: "DELETE",
    headers,
    signal: createRequestSignal(undefined, 20000),
  });

  return parseApiResponse<{ success: boolean }>(res, "Failed to purge audit ledger");
}

export async function downloadReportPdf(
  caseId: string,
  caseNumber: string,
  fallbackCaseData?: CaseRecord
): Promise<void> {
  const triggerDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      if (a.parentNode) {
        a.parentNode.removeChild(a);
      }
    }, 100);
  };

  const filename = `DeepTrace_Forensic_Report_${caseNumber}.pdf`;

  // 1. Primary Strategy: Server API route
  try {
    const headers = await getHeaders();
    const endpoint = apiUrl(`/api/reports/${encodeURIComponent(caseId)}/pdf`);
    let res = await fetch(endpoint, { headers });

    // Fallback if cross-origin or tunnel hit returned non-ok
    if (!res.ok && typeof window !== "undefined" && endpoint.startsWith("http")) {
      const relEndpoint = `/api/reports/${encodeURIComponent(caseId)}/pdf`;
      res = await fetch(relEndpoint, { headers });
    }

    if (res.ok) {
      const blob = await res.blob();
      triggerDownload(blob, filename);
      return;
    }
  } catch (netErr) {
    console.warn("[downloadReportPdf] Network request to server failed:", netErr);
  }

  // 2. Client-side compilation fallback
  if (fallbackCaseData) {
    try {
      console.log("[downloadReportPdf] Compiling forensic PDF report client-side fallback...");
      const pdfBytes = generateForensicPdfBuffer(fallbackCaseData);
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      triggerDownload(blob, filename);
      return;
    } catch (clientErr: any) {
      console.error("[downloadReportPdf] Client-side compilation error:", clientErr);
    }
  }

  throw new Error("Failed to compile and download PDF report. Please verify server connection.");
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
  const endpoint = apiUrl("/api/admin/users");
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
  const endpoint = apiUrl(`/api/admin/users/${userId}/role`);
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
  const endpoint = apiUrl(`/api/admin/users/${userId}/status`);
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
  const endpoint = apiUrl(`/api/admin/users/${userId}`);
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

  const endpoint = apiUrl("/api/auth/me");
  const res = await fetch(endpoint, { headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Authentication verification failed." }));
    throw new Error(errorData.detail || `Server rejected credentials (HTTP ${res.status})`);
  }

  return res.json();
}

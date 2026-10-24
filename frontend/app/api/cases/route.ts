import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { CaseRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const verdict = searchParams.get("verdict") || "";
    const mediaType = searchParams.get("media_type") || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 200);

    let query = supabaseServer
      .from("cases")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (verdict && verdict !== "all") {
      query = query.eq("verdict", verdict);
    }
    if (mediaType && mediaType !== "all") {
      query = query.eq("media_type", mediaType);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase cases query error:", error);
      return NextResponse.json(
        { detail: `Failed to retrieve case records: ${error.message}` },
        { status: 500 }
      );
    }

    let records: CaseRecord[] = (data || []).map((row: any) => {
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
        heatmap_url: row.heatmap_url || (row.heatmap_storage_path ? `/api/media/heatmap/${row.id}` : null),
        heatmap_path: row.heatmap_storage_path || row.heatmap_path,
        media_url: row.media_url || (row.storage_path ? `/api/media/evidence/${row.id}` : null),
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
    });

    if (search) {
      records = records.filter(
        (c) =>
          c.case_number.toLowerCase().includes(search) ||
          (c.file_name && c.file_name.toLowerCase().includes(search)) ||
          (c.source_url && c.source_url.toLowerCase().includes(search)) ||
          c.sha256_hash.toLowerCase().includes(search) ||
          c.officer_name.toLowerCase().includes(search) ||
          (c.officer_badge && c.officer_badge.toLowerCase().includes(search))
      );
    }

    return NextResponse.json(records);
  } catch (err: any) {
    console.error("API cases handler error:", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to retrieve examination cases." },
      { status: 500 }
    );
  }
}

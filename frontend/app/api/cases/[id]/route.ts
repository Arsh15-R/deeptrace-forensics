import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { CaseRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const caseId = params.id;
    if (!caseId) {
      return NextResponse.json({ detail: "Case ID is required." }, { status: 400 });
    }

    const { data: row, error } = await supabaseServer
      .from("cases")
      .select("*")
      .or(`id.eq.${caseId},case_number.eq.${caseId}`)
      .maybeSingle();

    if (error) {
      console.error(`Error querying case ${caseId}:`, error);
      return NextResponse.json({ detail: `Database error: ${error.message}` }, { status: 500 });
    }

    if (!row) {
      return NextResponse.json({ detail: `Case record ${caseId} not found.` }, { status: 404 });
    }

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
      : (cleanStorage ? `${supabaseStorageBase}/${cleanStorage}` : `/api/media/evidence/${row.id}`);

    const resolvedHeatmapUrl = (row.heatmap_url && (row.heatmap_url.startsWith("http://") || row.heatmap_url.startsWith("https://")))
      ? row.heatmap_url
      : (cleanHeatmap ? `${supabaseStorageBase}/${cleanHeatmap}` : (row.media_type === "image" ? `/api/media/heatmap/${row.id}` : null));

    const caseRecord: CaseRecord = {
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

    return NextResponse.json(caseRecord);
  } catch (err: any) {
    console.error("API get case handler error:", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to load case record." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const caseId = params.id;
    if (!caseId) {
      return NextResponse.json({ detail: "Case ID is required." }, { status: 400 });
    }

    // 1. Fetch case record to find file paths for storage cleanup
    const { data: row } = await supabaseServer
      .from("cases")
      .select("id, case_number, storage_path, heatmap_storage_path, file_name")
      .or(`id.eq.${caseId},case_number.eq.${caseId}`)
      .maybeSingle();

    if (!row) {
      return NextResponse.json({ detail: `Case record ${caseId} not found.` }, { status: 404 });
    }

    // 2. Clean up associated files from evidence-vault storage
    const filesToRemove: string[] = [];
    if (row.storage_path) {
      const cleanPath = row.storage_path.startsWith("/") ? row.storage_path.slice(1) : row.storage_path;
      filesToRemove.push(cleanPath);
    }
    if (row.heatmap_storage_path) {
      const cleanHeatmap = row.heatmap_storage_path.startsWith("/") ? row.heatmap_storage_path.slice(1) : row.heatmap_storage_path;
      filesToRemove.push(cleanHeatmap);
    }

    if (filesToRemove.length > 0) {
      try {
        await supabaseServer.storage.from("evidence-vault").remove(filesToRemove);
      } catch (storageErr) {
        console.warn(`Storage removal notice for case ${caseId}:`, storageErr);
      }
    }

    // 3. Delete case from cases table
    const { error: deleteErr } = await supabaseServer
      .from("cases")
      .delete()
      .or(`id.eq.${row.id},case_number.eq.${row.case_number}`);

    if (deleteErr) {
      console.error(`Error deleting case ${caseId}:`, deleteErr);
      return NextResponse.json({ detail: `Failed to delete case: ${deleteErr.message}` }, { status: 500 });
    }

    // 4. Log the deletion in audit_logs
    try {
      await supabaseServer.from("audit_logs").insert({
        id: crypto.randomUUID(),
        case_id: row.id,
        case_number: row.case_number,
        user_id: "admin",
        user_email: "admin@police.dept.gov",
        user_role: "admin",
        action: "CASE_DELETED",
        ip_address: "127.0.0.1",
        user_agent: "DeepTrace-NextApp/v4.3",
        details: {
          deleted_case_id: row.id,
          case_number: row.case_number,
          file_name: row.file_name,
        },
        created_at: new Date().toISOString(),
      });
    } catch (auditErr) {
      console.warn("Audit log creation notice on case delete:", auditErr);
    }

    return NextResponse.json({
      success: true,
      deleted_id: row.id,
      case_number: row.case_number,
    });
  } catch (err: any) {
    console.error("API delete case handler error:", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to delete case record." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

declare global {
  var _jobStore: Map<string, any> | undefined;
}

const jobStore = global._jobStore || new Map<string, any>();

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const jobId = params.jobId;

  // Try memory first
  if (jobStore.has(jobId)) {
    const job = jobStore.get(jobId);
    return NextResponse.json({
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      mediaType: job.mediaType,
    });
  }

  // Try proxy to backend
  const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const backendRes = await fetch(`${backendUrl}/api/analysis/jobs/${jobId}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (backendRes.ok) {
      const data = await backendRes.json();
      return NextResponse.json(data);
    }
  } catch {
    // Backend not running
  }

  // Check Supabase cases table
  const { data: row } = await supabaseServer
    .from("cases")
    .select("id, media_type")
    .or(`id.eq.${jobId},case_number.eq.${jobId}`)
    .maybeSingle();

  if (row) {
    return NextResponse.json({
      jobId: row.id,
      status: "completed",
      progress: 100,
      mediaType: row.media_type || "text",
    });
  }

  return NextResponse.json({ detail: `Job ${jobId} not found.` }, { status: 404 });
}

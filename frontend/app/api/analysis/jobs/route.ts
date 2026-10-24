import { NextRequest, NextResponse } from "next/server";
import { executeForensicAnalysis } from "@/lib/analysisEngineServer";
import { MediaType } from "@/lib/types";

export const dynamic = "force-dynamic";

// In-memory job registry for serverless polling fallback
declare global {
  var _jobStore: Map<string, any> | undefined;
}

const jobStore = global._jobStore || new Map<string, any>();
global._jobStore = jobStore;

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let file: File | null = null;
    let text: string | null = null;
    let url: string | null = null;
    let mediaType: MediaType = "text";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      file = formData.get("file") as File | null;
      text = formData.get("text") as string | null;
      url = formData.get("url") as string | null;
      const m = formData.get("media_type") as string | null;
      if (m) mediaType = m as MediaType;
    } else {
      const body = await request.json().catch(() => ({}));
      text = body.text;
      url = body.url;
      if (body.media_type) mediaType = body.media_type;
    }

    // Try proxying to backend if available
    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const proxyRes = await fetch(`${backendUrl}/api/analysis/jobs`, {
        method: "POST",
        headers: { "Content-Type": contentType },
        body: request.body,
        signal: controller.signal,
        // @ts-ignore
        duplex: "half",
      });
      clearTimeout(timeout);
      if (proxyRes.ok) {
        const data = await proxyRes.json();
        return NextResponse.json(data, { status: 202 });
      }
    } catch {
      // Backend not running
    }

    let buffer: Buffer | undefined;
    let filename = "evidence.txt";
    if (file) {
      const ab = await file.arrayBuffer();
      buffer = Buffer.from(ab);
      filename = file.name;
    }

    const caseRecord = await executeForensicAnalysis({
      mediaType,
      filename,
      buffer,
      text: text || undefined,
      sourceUrl: url || undefined,
    });

    jobStore.set(caseRecord.id, {
      jobId: caseRecord.id,
      status: "completed",
      progress: 100,
      mediaType,
      result: caseRecord,
    });

    return NextResponse.json(
      {
        jobId: caseRecord.id,
        status: "completed",
        progress: 100,
        mediaType,
      },
      { status: 202 }
    );
  } catch (err: any) {
    console.error("Jobs API error:", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to submit analysis job." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ status: "active", total_jobs: jobStore.size });
}

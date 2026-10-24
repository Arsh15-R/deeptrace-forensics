import { NextRequest, NextResponse } from "next/server";
import { executeForensicAnalysis } from "@/lib/analysisEngineServer";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const caseRef = formData.get("case_ref") as string | null;

    if (!file) {
      return NextResponse.json({ detail: "No video file provided." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Try proxying to FastAPI backend if available
    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const proxyForm = new FormData();
      proxyForm.append("file", file);
      if (caseRef) proxyForm.append("case_ref", caseRef);

      const backendRes = await fetch(`${backendUrl}/api/cases/analyze/video`, {
        method: "POST",
        body: proxyForm,
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

    const caseRecord = await executeForensicAnalysis({
      mediaType: "video",
      filename: file.name || "evidence_video.mp4",
      buffer,
      caseRef: caseRef || undefined,
    });

    return NextResponse.json(caseRecord);
  } catch (err: any) {
    console.error("Video analysis endpoint error:", err);
    return NextResponse.json(
      { detail: err?.message || "Internal server error during video analysis." },
      { status: 500 }
    );
  }
}

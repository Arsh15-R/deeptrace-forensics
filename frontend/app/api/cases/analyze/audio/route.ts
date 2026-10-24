import { NextRequest, NextResponse } from "next/server";
import { executeForensicAnalysis } from "@/lib/analysisEngineServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const reqStart = Date.now();
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const caseRef = formData.get("case_ref") as string | null;

    if (!file) {
      return NextResponse.json({ detail: "No audio file provided." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`[API /analyze/audio] Ingested ${file.name} (${buffer.length} bytes)`);

    const backendUrl = process.env.USE_PYTHON_BACKEND === "true" ? (process.env.BACKEND_URL || "http://127.0.0.1:8000") : undefined;
    if (backendUrl) {
      try {
        console.log(`[API /analyze/audio] Attempting proxy to backend: ${backendUrl}`);
        const proxyForm = new FormData();
        proxyForm.append("file", file);
        if (caseRef) proxyForm.append("case_ref", caseRef);

        const backendRes = await fetch(`${backendUrl}/api/cases/analyze/audio`, {
          method: "POST",
          body: proxyForm,
          signal: AbortSignal.timeout(5000),
        });

        if (backendRes.ok) {
          const rawText = await backendRes.text();
          try {
            const data = JSON.parse(rawText);
            console.log(`[API /analyze/audio] Backend proxy completed in ${Date.now() - reqStart}ms`);
            return NextResponse.json(data);
          } catch {
            console.warn("[API /analyze/audio] Backend returned non-JSON; falling back to local engine");
          }
        } else {
          console.warn(`[API /analyze/audio] Backend returned HTTP ${backendRes.status}; falling back to local engine`);
        }
      } catch (backendErr: any) {
        console.warn(`[API /analyze/audio] Backend proxy failed (${backendErr?.message || backendErr}); falling back to local engine`);
      }
    }

    const caseRecord = await executeForensicAnalysis({
      mediaType: "audio",
      filename: file.name || "evidence_audio.wav",
      buffer,
      caseRef: caseRef || undefined,
    });

    console.log(`[API /analyze/audio] Successfully processed ${caseRecord.case_number} in ${Date.now() - reqStart}ms`);
    return NextResponse.json(caseRecord);
  } catch (err: any) {
    console.error(`[API /analyze/audio] Fatal error after ${Date.now() - reqStart}ms:`, err);
    return NextResponse.json(
      { detail: err?.message || "Internal server error during audio analysis." },
      { status: 500 }
    );
  }
}

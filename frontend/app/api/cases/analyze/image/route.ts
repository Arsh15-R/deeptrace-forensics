import { NextRequest, NextResponse } from "next/server";
import { executeForensicAnalysis } from "@/lib/analysisEngineServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const reqStart = Date.now();
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const caseRef = formData.get("case_ref") as string | null;

    if (!file) {
      return NextResponse.json({ detail: "No image file provided." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`[API /analyze/image] Ingested ${file.name} (${buffer.length} bytes)`);

    // Try proxying to FastAPI backend only if explicitly configured
    const backendUrl = process.env.BACKEND_URL;
    if (backendUrl) {
      try {
        console.log(`[API /analyze/image] Attempting proxy to backend: ${backendUrl}`);
        const proxyForm = new FormData();
        proxyForm.append("file", file);
        if (caseRef) proxyForm.append("case_ref", caseRef);

        const backendRes = await fetch(`${backendUrl}/api/cases/analyze/image`, {
          method: "POST",
          body: proxyForm,
          signal: AbortSignal.timeout(5000),
        });

        if (backendRes.ok) {
          const rawText = await backendRes.text();
          try {
            const data = JSON.parse(rawText);
            console.log(`[API /analyze/image] Backend proxy completed in ${Date.now() - reqStart}ms`);
            return NextResponse.json(data);
          } catch {
            console.warn("[API /analyze/image] Backend returned non-JSON; falling back to local engine");
          }
        } else {
          console.warn(`[API /analyze/image] Backend returned HTTP ${backendRes.status}; falling back to local engine`);
        }
      } catch (backendErr: any) {
        console.warn(`[API /analyze/image] Backend proxy failed (${backendErr?.message || backendErr}); falling back to local engine`);
      }
    }

    const caseRecord = await executeForensicAnalysis({
      mediaType: "image",
      filename: file.name || "evidence_image.jpg",
      buffer,
      caseRef: caseRef || undefined,
    });

    console.log(`[API /analyze/image] Successfully processed ${caseRecord.case_number} in ${Date.now() - reqStart}ms`);
    return NextResponse.json(caseRecord);
  } catch (err: any) {
    console.error(`[API /analyze/image] Fatal error after ${Date.now() - reqStart}ms:`, err);
    return NextResponse.json(
      { detail: err?.message || "Internal server error during image analysis." },
      { status: 500 }
    );
  }
}

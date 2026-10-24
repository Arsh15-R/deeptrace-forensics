import { NextRequest, NextResponse } from "next/server";
import { executeForensicAnalysis } from "@/lib/analysisEngineServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const reqStart = Date.now();
  try {
    const body = await request.json().catch(() => ({}));
    const url = body.url;
    const caseRef = body.case_reference || body.case_ref;

    if (!url || typeof url !== "string" || !url.trim()) {
      return NextResponse.json({ detail: "No target URL provided." }, { status: 400 });
    }

    console.log(`[API /analyze/link] Ingested remote URL: ${url}`);

    const backendUrl = process.env.BACKEND_URL || (process.env.NODE_ENV !== "production" ? "http://127.0.0.1:8000" : undefined);
    if (backendUrl) {
      try {
        console.log(`[API /analyze/link] Attempting proxy to backend: ${backendUrl}`);
        const backendRes = await fetch(`${backendUrl}/api/cases/analyze/link`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, case_reference: caseRef }),
          signal: AbortSignal.timeout(5000),
        });

        if (backendRes.ok) {
          const rawText = await backendRes.text();
          try {
            const data = JSON.parse(rawText);
            console.log(`[API /analyze/link] Backend proxy completed in ${Date.now() - reqStart}ms`);
            return NextResponse.json(data);
          } catch {
            console.warn("[API /analyze/link] Backend returned non-JSON; falling back to local engine");
          }
        } else {
          console.warn(`[API /analyze/link] Backend returned HTTP ${backendRes.status}; falling back to local engine`);
        }
      } catch (backendErr: any) {
        console.warn(`[API /analyze/link] Backend proxy failed (${backendErr?.message || backendErr}); falling back to local engine`);
      }
    }

    const caseRecord = await executeForensicAnalysis({
      mediaType: "link",
      filename: "remote_evidence.html",
      sourceUrl: url.trim(),
      caseRef: caseRef || undefined,
    });

    console.log(`[API /analyze/link] Successfully processed ${caseRecord.case_number} in ${Date.now() - reqStart}ms`);
    return NextResponse.json(caseRecord);
  } catch (err: any) {
    console.error(`[API /analyze/link] Fatal error after ${Date.now() - reqStart}ms:`, err);
    return NextResponse.json(
      { detail: err?.message || "Internal server error during link analysis." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { executeForensicAnalysis } from "@/lib/analysisEngineServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const reqStart = Date.now();
  try {
    const body = await request.json().catch(() => ({}));
    const text = body.text;
    const caseRef = body.case_reference || body.case_ref;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ detail: "No text provided for analysis." }, { status: 400 });
    }

    console.log(`[API /analyze/text] Ingested text statement (${text.length} chars)`);

    const backendUrl = process.env.USE_PYTHON_BACKEND === "true" ? (process.env.BACKEND_URL || "http://127.0.0.1:8000") : undefined;
    if (backendUrl) {
      try {
        console.log(`[API /analyze/text] Attempting proxy to backend: ${backendUrl}`);
        const backendRes = await fetch(`${backendUrl}/api/cases/analyze/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, case_reference: caseRef }),
          signal: AbortSignal.timeout(5000),
        });

        if (backendRes.ok) {
          const rawText = await backendRes.text();
          try {
            const data = JSON.parse(rawText);
            console.log(`[API /analyze/text] Backend proxy completed in ${Date.now() - reqStart}ms`);
            return NextResponse.json(data);
          } catch {
            console.warn("[API /analyze/text] Backend returned non-JSON; falling back to local engine");
          }
        } else {
          console.warn(`[API /analyze/text] Backend returned HTTP ${backendRes.status}; falling back to local engine`);
        }
      } catch (backendErr: any) {
        console.warn(`[API /analyze/text] Backend proxy failed (${backendErr?.message || backendErr}); falling back to local engine`);
      }
    }

    const caseRecord = await executeForensicAnalysis({
      mediaType: "text",
      filename: "statement.txt",
      text: text.trim(),
      caseRef: caseRef || undefined,
    });

    console.log(`[API /analyze/text] Successfully processed ${caseRecord.case_number} in ${Date.now() - reqStart}ms`);
    return NextResponse.json(caseRecord);
  } catch (err: any) {
    console.error(`[API /analyze/text] Fatal error after ${Date.now() - reqStart}ms:`, err);
    return NextResponse.json(
      { detail: err?.message || "Internal server error during text analysis." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { executeForensicAnalysis } from "@/lib/analysisEngineServer";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const text = body.text;
    const caseRef = body.case_reference || body.case_ref;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ detail: "No text provided for analysis." }, { status: 400 });
    }

    const backendUrl = process.env.BACKEND_URL;
    if (backendUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);

        const backendRes = await fetch(`${backendUrl}/api/cases/analyze/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, case_reference: caseRef }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (backendRes.ok) {
          const data = await backendRes.json();
          return NextResponse.json(data);
        }
      } catch {
        // Backend offline; proceed with high-precision serverless engine
      }
    }

    const caseRecord = await executeForensicAnalysis({
      mediaType: "text",
      filename: "statement.txt",
      text: text.trim(),
      caseRef: caseRef || undefined,
    });

    return NextResponse.json(caseRecord);
  } catch (err: any) {
    console.error("Text analysis endpoint error:", err);
    return NextResponse.json(
      { detail: err?.message || "Internal server error during text analysis." },
      { status: 500 }
    );
  }
}

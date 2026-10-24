import { NextRequest, NextResponse } from "next/server";
import { executeForensicAnalysis } from "@/lib/analysisEngineServer";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const url = body.url;
    const caseRef = body.case_reference || body.case_ref;

    if (!url || typeof url !== "string" || !url.trim()) {
      return NextResponse.json({ detail: "No target URL provided." }, { status: 400 });
    }

    const backendUrl = process.env.BACKEND_URL;
    if (backendUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);

        const backendRes = await fetch(`${backendUrl}/api/cases/analyze/link`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, case_reference: caseRef }),
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
      mediaType: "link",
      filename: "remote_evidence.html",
      sourceUrl: url.trim(),
      caseRef: caseRef || undefined,
    });

    return NextResponse.json(caseRecord);
  } catch (err: any) {
    console.error("Link analysis endpoint error:", err);
    return NextResponse.json(
      { detail: err?.message || "Internal server error during link analysis." },
      { status: 500 }
    );
  }
}

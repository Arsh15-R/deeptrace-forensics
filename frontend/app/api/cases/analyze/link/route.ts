import { NextRequest, NextResponse } from "next/server";
import { analyzeWebsiteServer } from "@/lib/websiteAnalysisServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Backward compatibility alias for deprecated /api/cases/analyze/link.
 * Routes directly to the new dedicated Website Analysis Engine.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const url = body.url;
    const caseRef = body.case_reference || body.case_ref;

    if (!url || typeof url !== "string" || !url.trim()) {
      return NextResponse.json({ detail: "No target URL provided." }, { status: 400 });
    }

    const caseRecord = await analyzeWebsiteServer(url.trim(), caseRef || undefined);
    return NextResponse.json(caseRecord);
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message || "Internal server error during website analysis." },
      { status: 500 }
    );
  }
}

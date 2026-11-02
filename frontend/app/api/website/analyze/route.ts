import { NextRequest, NextResponse } from "next/server";
import { analyzeWebsiteServer, validateSafeOutboundUrl } from "@/lib/websiteAnalysisServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const reqStart = Date.now();
  try {
    const body = await request.json().catch(() => ({}));
    const rawUrl = body.url;
    const caseRef = body.case_reference || body.case_ref;

    if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
      return NextResponse.json({ detail: "No target website URL provided." }, { status: 400 });
    }

    const trimmedUrl = rawUrl.trim();

    // Protocol check
    let parsed: URL;
    try {
      parsed = new URL(trimmedUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return NextResponse.json(
          { detail: "Invalid protocol. Only HTTP and HTTPS website URLs are permitted." },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { detail: "Please provide a valid, well-formed URL (e.g. https://example.com)." },
        { status: 400 }
      );
    }

    // SSRF Pre-validation
    const validation = await validateSafeOutboundUrl(trimmedUrl);
    if (!validation.safe) {
      return NextResponse.json(
        { detail: validation.error || "Security policy violation: Target destination is restricted." },
        { status: 400 }
      );
    }

    console.log(`[API /api/website/analyze] Inspecting website: ${trimmedUrl}`);

    // If Python backend is explicitly enabled and available, attempt backend proxy
    const backendUrl =
      process.env.USE_PYTHON_BACKEND === "true"
        ? process.env.BACKEND_URL || "http://127.0.0.1:8000"
        : undefined;

    if (backendUrl) {
      try {
        console.log(`[API /api/website/analyze] Attempting proxy to backend: ${backendUrl}`);
        const backendRes = await fetch(`${backendUrl}/api/website/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmedUrl, case_reference: caseRef }),
          signal: AbortSignal.timeout(10000),
        });

        if (backendRes.ok) {
          const data = await backendRes.json();
          console.log(`[API /api/website/analyze] Backend proxy completed in ${Date.now() - reqStart}ms`);
          return NextResponse.json(data);
        } else {
          console.warn(`[API /api/website/analyze] Backend returned HTTP ${backendRes.status}; falling back to local engine`);
        }
      } catch (backendErr: any) {
        console.warn(`[API /api/website/analyze] Backend proxy failed (${backendErr?.message || backendErr}); running local engine`);
      }
    }

    // Execute server engine
    const caseRecord = await analyzeWebsiteServer(trimmedUrl, caseRef || undefined);

    console.log(`[API /api/website/analyze] Successfully analyzed ${trimmedUrl} in ${Date.now() - reqStart}ms`);
    return NextResponse.json(caseRecord);
  } catch (err: any) {
    console.error(`[API /api/website/analyze] Error after ${Date.now() - reqStart}ms:`, err);
    return NextResponse.json(
      { detail: err?.message || "Internal server error during website analysis." },
      { status: 500 }
    );
  }
}

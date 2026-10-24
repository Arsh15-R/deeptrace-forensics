import { NextRequest, NextResponse } from "next/server";
import { executeForensicAnalysis } from "@/lib/analysisEngineServer";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const caseRef = formData.get("case_ref") as string | null;

    if (!file) {
      return NextResponse.json({ detail: "No image file provided." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Try proxying to FastAPI backend only if explicitly configured
    const backendUrl = process.env.BACKEND_URL;
    if (backendUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const proxyForm = new FormData();
        proxyForm.append("file", file);
        if (caseRef) proxyForm.append("case_ref", caseRef);

        const backendRes = await fetch(`${backendUrl}/api/cases/analyze/image`, {
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
        // Backend offline; proceed with high-precision serverless engine
      }
    }

    const caseRecord = await executeForensicAnalysis({
      mediaType: "image",
      filename: file.name || "evidence_image.jpg",
      buffer,
      caseRef: caseRef || undefined,
    });

    return NextResponse.json(caseRecord);
  } catch (err: any) {
    console.error("Image analysis endpoint error:", err);
    return NextResponse.json(
      { detail: err?.message || "Internal server error during image analysis." },
      { status: 500 }
    );
  }
}

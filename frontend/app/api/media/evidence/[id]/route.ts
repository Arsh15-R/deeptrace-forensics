import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const caseId = params.id;
    if (!caseId) {
      return NextResponse.json({ detail: "Case ID required" }, { status: 400 });
    }

    // 1. Fetch case record from Supabase
    const { data: caseRow } = await supabaseServer
      .from("cases")
      .select("*")
      .or(`id.eq.${caseId},case_number.eq.${caseId}`)
      .maybeSingle();

    const storagePath = caseRow?.storage_path;
    const mimeType = caseRow?.mime_type || "image/jpeg";
    const bucket = "evidence-vault";

    // 2. Attempt to stream from Supabase Storage
    if (storagePath) {
      try {
        const { data: fileBlob, error: downloadError } = await supabaseServer.storage
          .from(bucket)
          .download(storagePath);

        if (!downloadError && fileBlob) {
          const arrayBuffer = await fileBlob.arrayBuffer();
          return new Response(new Uint8Array(arrayBuffer), {
            status: 200,
            headers: {
              "Content-Type": mimeType,
              "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
            },
          });
        }
      } catch (err) {
        console.warn(`Supabase storage download failed for ${storagePath}:`, err);
      }
    }

    // 3. Fallback: check local storage directory if running in hybrid local mode
    const localCandidates = [
      path.resolve(process.cwd(), "..", "backend", "storage", storagePath || ""),
      path.resolve(process.cwd(), "..", "backend", "storage", "evidence", `${caseId}.jpg`),
      path.resolve(process.cwd(), "..", "backend", "storage", "evidence", `${caseId}.png`),
    ];

    for (const localPath of localCandidates) {
      if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
        const fileBuffer = fs.readFileSync(localPath);
        return new Response(new Uint8Array(fileBuffer), {
          status: 200,
          headers: {
            "Content-Type": mimeType,
            "Cache-Control": "public, max-age=86400",
          },
        });
      }
    }

    // 4. Fallback redirect to public Supabase Storage URL if path exists
    if (storagePath) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kqllmwzftudlxswtnqtg.supabase.co";
      const cleanPath = storagePath.startsWith("/") ? storagePath.slice(1) : storagePath;
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
      return NextResponse.redirect(publicUrl);
    }

    return NextResponse.json({ detail: "Evidence file not found in vault." }, { status: 404 });
  } catch (error: any) {
    console.error("Evidence media retrieval error:", error);
    return NextResponse.json({ detail: error?.message || "Internal server error" }, { status: 500 });
  }
}

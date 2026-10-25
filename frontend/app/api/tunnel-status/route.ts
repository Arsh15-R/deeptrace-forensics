import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("audit_logs")
      .select("details, created_at")
      .eq("action", "tunnel_heartbeat")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return NextResponse.json({
        ok: false,
        tunnel_url: process.env.NEXT_PUBLIC_API_URL || null,
      });
    }

    const latest = data[0];
    const tunnelUrl = latest.details?.tunnel_url;
    return NextResponse.json({
      ok: Boolean(tunnelUrl),
      tunnel_url: tunnelUrl,
      updated_at: latest.created_at,
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err?.message,
      tunnel_url: process.env.NEXT_PUBLIC_API_URL || null,
    });
  }
}

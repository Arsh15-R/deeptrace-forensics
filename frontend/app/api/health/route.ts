import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

let lastHeartbeatTime = 0;

export async function GET() {
  const now = Date.now();
  let liveTunnel: string | null = null;

  // If running on local server, check local cloudflared metrics and update Supabase heartbeat
  try {
    const qtRes = await fetch("http://127.0.0.1:20241/quicktunnel", {
      signal: AbortSignal.timeout(600),
    });
    if (qtRes.ok) {
      const qtData = await qtRes.json();
      if (qtData.hostname) {
        liveTunnel = `https://${qtData.hostname}`;
        // Debounced heartbeat to Supabase (max once every 45s)
        if (now - lastHeartbeatTime > 45000) {
          lastHeartbeatTime = now;
          supabaseServer
            .from("audit_logs")
            .insert({
              user_id: "system-laptop",
              user_email: "laptop@forensics.local",
              user_role: "admin",
              action: "tunnel_heartbeat",
              details: {
                tunnel_url: liveTunnel,
                status: "online",
                updated_at: new Date().toISOString(),
              },
            })
            .then(() => {});
        }
      }
    }
  } catch {}

  return NextResponse.json({
    status: "ok",
    service: "DeepTrace Forensic Engine",
    timestamp: new Date().toISOString(),
    tunnel: liveTunnel,
  });
}

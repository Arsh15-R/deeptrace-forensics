import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { AuditLogRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);

    let query = supabaseServer
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (action && action !== "all") {
      query = query.eq("action", action);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase audit_logs query error:", error);
      return NextResponse.json(
        { detail: `Failed to retrieve audit records: ${error.message}` },
        { status: 500 }
      );
    }

    const records: AuditLogRecord[] = (data || []).map((row: any) => {
      let details = row.details;
      if (typeof details === "string") {
        try {
          details = JSON.parse(details);
        } catch {}
      }

      return {
        id: row.id,
        case_id: row.case_id || null,
        case_number: row.case_number || null,
        user_id: row.user_id || "system",
        user_email: row.user_email || "authorized@police.dept.gov",
        user_role: row.user_role === "admin" ? "admin" : "officer",
        action: row.action || "EVENT_LOGGED",
        ip_address: row.ip_address || "127.0.0.1",
        user_agent: row.user_agent || "System",
        details: details || {},
        created_at: row.created_at || new Date().toISOString(),
      };
    });

    return NextResponse.json(records);
  } catch (err: any) {
    console.error("API audit logs handler error:", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to retrieve audit records." },
      { status: 500 }
    );
  }
}

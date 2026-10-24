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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const logId = searchParams.get("id");
    const clearAll = searchParams.get("all") === "true";

    // Also check body if JSON was provided
    let bodyId: string | undefined;
    let bodyAll = false;
    try {
      const body = await request.json().catch(() => ({}));
      bodyId = body?.id;
      bodyAll = body?.all === true;
    } catch {}

    const targetId = logId || bodyId;
    const shouldClearAll = clearAll || bodyAll;

    if (shouldClearAll) {
      // Purge all audit logs
      const { error } = await supabaseServer
        .from("audit_logs")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) {
        console.error("Error clearing audit logs:", error);
        return NextResponse.json({ detail: error.message }, { status: 500 });
      }

      // Record a single log entry indicating the ledger was purged
      try {
        await supabaseServer.from("audit_logs").insert({
          id: crypto.randomUUID(),
          case_id: null,
          case_number: null,
          user_id: "admin",
          user_email: "admin@police.dept.gov",
          user_role: "admin",
          action: "AUDIT_LEDGER_PURGED",
          ip_address: "127.0.0.1",
          user_agent: "DeepTrace-NextApp/v4.3",
          details: { purged_at: new Date().toISOString() },
          created_at: new Date().toISOString(),
        });
      } catch {}

      return NextResponse.json({ success: true, cleared: true });
    }

    if (!targetId) {
      return NextResponse.json({ detail: "Audit log ID is required." }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from("audit_logs")
      .delete()
      .eq("id", targetId);

    if (error) {
      console.error(`Error deleting audit log ${targetId}:`, error);
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted_id: targetId });
  } catch (err: any) {
    console.error("API delete audit log handler error:", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to delete audit log entry." },
      { status: 500 }
    );
  }
}

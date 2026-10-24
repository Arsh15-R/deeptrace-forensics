import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const logId = params.id;
    if (!logId) {
      return NextResponse.json({ detail: "Audit log ID is required." }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from("audit_logs")
      .delete()
      .eq("id", logId);

    if (error) {
      console.error(`Error deleting audit log ${logId}:`, error);
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted_id: logId });
  } catch (err: any) {
    console.error("API delete audit log item error:", err);
    return NextResponse.json(
      { detail: err?.message || "Failed to delete audit log entry." },
      { status: 500 }
    );
  }
}

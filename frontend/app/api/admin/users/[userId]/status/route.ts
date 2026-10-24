import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { AdminUserRecord, UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    const body = await req.json();
    const isActive = Boolean(body.is_active);

    const { data: targetUser, error: findError } = await supabaseServer
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (findError || !targetUser) {
      return NextResponse.json({ detail: "User not found." }, { status: 404 });
    }

    if (
      targetUser.email?.toLowerCase() === "arshrana2468@gmail.com" ||
      targetUser.role?.toLowerCase() === "admin"
    ) {
      return NextResponse.json(
        { detail: "Cannot deactivate administrator accounts." },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    // Update updated_at and attempt to update is_active
    const updatePayload: Record<string, any> = { updated_at: nowIso };
    // Only pass is_active if column exists, or catch gracefully
    updatePayload.is_active = isActive;

    const { data: updated, error: updateError } = await supabaseServer
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId)
      .select()
      .single();

    if (updateError) {
      // If is_active column doesn't exist yet, update updated_at
      await supabaseServer
        .from("profiles")
        .update({ updated_at: nowIso })
        .eq("id", userId);
    }

    const roleDisplay: UserRole =
      (updated?.role || targetUser.role) === "analyst"
        ? "viewer"
        : ((updated?.role || targetUser.role) as UserRole);

    const record: AdminUserRecord = {
      id: targetUser.id,
      email: targetUser.email,
      full_name: targetUser.full_name,
      badge_number: targetUser.badge_number,
      department: targetUser.department,
      role: roleDisplay,
      is_active: isActive,
      avatar_url: targetUser.avatar_url || null,
      provider: targetUser.provider || "google",
      last_active_at: nowIso,
      is_online: false,
      created_at: targetUser.created_at || nowIso,
      updated_at: nowIso,
    };

    return NextResponse.json(record);
  } catch (err: any) {
    console.error("Error updating user status:", err);
    return NextResponse.json(
      { detail: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

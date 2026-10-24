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
    const targetRole = (body.role || "").trim().toLowerCase();

    if (targetRole === "admin") {
      return NextResponse.json(
        { detail: "Promotion to Admin is strictly prohibited via the panel." },
        { status: 400 }
      );
    }

    if (!["officer", "viewer", "analyst"].includes(targetRole)) {
      return NextResponse.json(
        { detail: "Invalid role specified. Only 'officer' and 'viewer' are permitted." },
        { status: 400 }
      );
    }

    // Check target user in Supabase
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
        { detail: "Cannot alter roles of existing administrators." },
        { status: 400 }
      );
    }

    // Map 'viewer' to 'analyst' for Supabase schema constraint compliance
    const dbRole = targetRole === "viewer" ? "analyst" : targetRole;
    const nowIso = new Date().toISOString();

    const { data: updated, error: updateError } = await supabaseServer
      .from("profiles")
      .update({ role: dbRole, updated_at: nowIso })
      .eq("id", userId)
      .select()
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { detail: `Failed to update role: ${updateError?.message}` },
        { status: 500 }
      );
    }

    const roleDisplay: UserRole = updated.role === "analyst" ? "viewer" : (updated.role as UserRole);

    const record: AdminUserRecord = {
      id: updated.id,
      email: updated.email,
      full_name: updated.full_name,
      badge_number: updated.badge_number,
      department: updated.department,
      role: roleDisplay,
      is_active: updated.is_active !== false,
      avatar_url: updated.avatar_url || null,
      provider: updated.provider || "google",
      last_active_at: updated.updated_at || nowIso,
      is_online: true,
      created_at: updated.created_at || nowIso,
      updated_at: updated.updated_at || nowIso,
    };

    return NextResponse.json(record);
  } catch (err: any) {
    console.error("Error updating user role:", err);
    return NextResponse.json(
      { detail: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

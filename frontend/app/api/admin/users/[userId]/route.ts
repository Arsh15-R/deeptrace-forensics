import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

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
        { detail: "Cannot delete administrator accounts." },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabaseServer
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (deleteError) {
      return NextResponse.json(
        { detail: `Failed to remove user: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ deleted_id: userId });
  } catch (err: any) {
    console.error("Error deleting user:", err);
    return NextResponse.json(
      { detail: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

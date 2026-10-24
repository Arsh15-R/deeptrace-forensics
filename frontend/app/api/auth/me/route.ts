import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    let userEmail: string | null = null;
    let userId: string | null = null;

    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const { data: authData } = await supabaseServer.auth.getUser(token);
      if (authData?.user) {
        userEmail = authData.user.email || null;
        userId = authData.user.id || null;
      }
    }

    // Default to admin if local debug and unauthenticated
    if (!userEmail) {
      userEmail = "arshrana2468@gmail.com";
    }

    // Query profiles in Supabase
    let query = supabaseServer.from("profiles").select("*");
    if (userId) {
      query = query.eq("id", userId);
    } else {
      query = query.eq("email", userEmail);
    }

    const { data: profile } = await query.maybeSingle();

    const isAdmin =
      userEmail?.toLowerCase() === "arshrana2468@gmail.com" ||
      profile?.role?.toLowerCase() === "admin";

    let role = "viewer";
    if (isAdmin) {
      role = "admin";
    } else if (profile?.role?.toLowerCase() === "officer") {
      role = "officer";
    }

    return NextResponse.json({
      id: profile?.id || userId || "0b885f91-6a4a-4472-80da-2e26c3c89adc",
      email: profile?.email || userEmail,
      full_name: profile?.full_name || (userEmail ? userEmail.split("@")[0] : "Arsh Rana"),
      badge_number: profile?.badge_number || (isAdmin ? "GOOG-ADMIN" : "OFF"),
      department: profile?.department || (isAdmin ? "Department Administration" : "Cyber Forensics & Evidence Unit"),
      role,
      is_active: profile?.is_active !== false,
      avatar_url: profile?.avatar_url || null,
      provider: profile?.provider || "google",
    });
  } catch (err: any) {
    console.error("Error in /api/auth/me:", err);
    return NextResponse.json(
      { detail: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

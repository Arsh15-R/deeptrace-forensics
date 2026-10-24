import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { AdminUserRecord, UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase profiles query error:", error);
      return NextResponse.json(
        { detail: `Database query error: ${error.message}` },
        { status: 500 }
      );
    }

    const nowUtc = Date.now();

    const users: AdminUserRecord[] = (data || []).map((p: any) => {
      const lastActiveIso = p.updated_at || p.created_at || new Date().toISOString();
      const lastActiveMs = new Date(lastActiveIso).getTime();
      const isOnline = nowUtc - lastActiveMs <= 300000; // 5 minutes

      const rawRole = (p.role || "viewer").toLowerCase().trim();
      let roleDisplay: UserRole = "viewer";
      if (p.email?.toLowerCase() === "arshrana2468@gmail.com" || rawRole === "admin") {
        roleDisplay = "admin";
      } else if (rawRole === "officer") {
        roleDisplay = "officer";
      } else {
        roleDisplay = "viewer";
      }

      return {
        id: p.id,
        email: p.email,
        full_name: p.full_name || p.email?.split("@")[0] || "Authorized Personnel",
        badge_number: p.badge_number || `GOOG-${p.id.slice(0, 4).toUpperCase()}`,
        department: p.department || "Cyber Forensics & Evidence Unit",
        role: roleDisplay,
        is_active: p.is_active !== false,
        avatar_url: p.avatar_url || null,
        provider: p.provider || "google",
        last_active_at: lastActiveIso,
        is_online: isOnline,
        created_at: p.created_at || new Date().toISOString(),
        updated_at: p.updated_at || new Date().toISOString(),
      };
    });

    // Sort: Admins first, then recently active
    users.sort((a, b) => {
      if (a.role === "admin" && b.role !== "admin") return -1;
      if (b.role === "admin" && a.role !== "admin") return 1;
      return new Date(b.last_active_at).getTime() - new Date(a.last_active_at).getTime();
    });

    return NextResponse.json(users);
  } catch (err: any) {
    console.error("Failed to fetch admin users roster:", err);
    return NextResponse.json(
      { detail: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

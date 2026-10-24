"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { AdminUserManagement } from "@/components/admin/AdminUserManagement";
import { getActiveUser } from "@/lib/supabaseClient";
import { Lock, ArrowLeft, Loader2 } from "lucide-react";

export default function AdminPage() {
  const [mounted, setMounted] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const user = getActiveUser();
    setIsAdmin(user?.role === "admin");

    const onAuthChange = () => {
      const u = getActiveUser();
      setIsAdmin(u?.role === "admin");
    };

    window.addEventListener("deeptrace_role_changed", onAuthChange);
    window.addEventListener("deeptrace_auth_changed", onAuthChange);

    return () => {
      window.removeEventListener("deeptrace_role_changed", onAuthChange);
      window.removeEventListener("deeptrace_auth_changed", onAuthChange);
    };
  }, []);

  if (!mounted) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="text-xs text-neutral-500">Checking credentials...</span>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <GlassCard variant="main" className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 mx-auto flex items-center justify-center border border-amber-200 dark:border-amber-900/60">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            Restricted Admin Access
          </h2>
          <p className="text-xs text-neutral-500 max-w-[65ch] mx-auto leading-relaxed">
            The personnel administration panel is restricted strictly to authorized department administrators. All unauthorized access attempts are logged to the forensic audit ledger.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 px-5 py-2 min-h-[44px] rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold active:scale-[0.97] transition-transform duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Screening</span>
            </Link>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-6 pb-12 max-w-7xl mx-auto">
      <AdminUserManagement />
    </div>
  );
}

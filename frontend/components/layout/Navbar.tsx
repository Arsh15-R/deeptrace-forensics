"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldCheck,
  ChevronDown,
  LogOut,
  LogIn,
  CheckCircle2,
  Users,
} from "lucide-react";
import {
  getActiveUser,
  signOutUser,
  isUserAuthenticated,
  syncUserFromSession,
} from "@/lib/supabaseClient";
import { OfficerProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/UserAvatar";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<OfficerProfile | null>(null);
  const [isAuth, setIsAuth] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updateUserState = () => {
    const user = getActiveUser();
    setCurrentUser(user);
    setIsAuth(isUserAuthenticated());
  };

  useEffect(() => {
    setMounted(true);
    updateUserState();

    // Background sync from Google OAuth session
    syncUserFromSession().then((user) => {
      if (user) {
        setCurrentUser(user);
        setIsAuth(true);
      }
    });

    const onAuthChange = () => updateUserState();
    window.addEventListener("deeptrace_role_changed", onAuthChange);
    window.addEventListener("deeptrace_auth_changed", onAuthChange);

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("deeptrace_role_changed", onAuthChange);
      window.removeEventListener("deeptrace_auth_changed", onAuthChange);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    await signOutUser();
    updateUserState();
    setMenuOpen(false);
    router.push("/login");
  };

  const navLinks = [
    { href: "/", label: "Verify Evidence" },
    { href: "/history", label: "Case History" },
    { href: "/audit", label: "Audit Ledger" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full px-4 sm:px-8 py-3 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 backdrop-blur-md bg-white/95 dark:bg-neutral-900/95">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base tracking-tight text-neutral-900 dark:text-neutral-50">
                DeepTrace
              </span>
              <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700">
                Forensics
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 hidden sm:block">
              Police Media Authenticity
            </p>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 sm:space-x-2">
          {navLinks.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2 min-h-[44px] rounded-full text-xs sm:text-sm font-medium active:scale-[0.97] transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  isActive
                    ? "bg-neutral-900 text-white dark:bg-neutral-800 dark:text-white font-bold border border-neutral-800 dark:border-neutral-700 shadow-sm"
                    : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
                )}
              >
                <span className={isActive ? "text-white font-bold" : "text-current"}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User Account / Google Auth */}
        <div className="relative" ref={dropdownRef}>
          {mounted && isAuth && currentUser ? (
            <div>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="User Account Menu"
                aria-expanded={menuOpen}
                className="flex items-center space-x-2 px-3 py-1.5 min-h-[44px] rounded-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-left active:scale-[0.97] transition-all duration-150 ease-out hover:border-neutral-400 dark:hover:border-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shadow-sm"
              >
                <UserAvatar
                  src={currentUser.avatar_url}
                  name={currentUser.full_name}
                  email={currentUser.email}
                  size="sm"
                />
                <div className="hidden lg:block text-xs leading-tight min-w-0 pr-1">
                  <div className="font-bold text-neutral-900 dark:text-neutral-100 truncate max-w-[130px]">
                    {currentUser.full_name}
                  </div>
                  <div className="text-[10px] text-neutral-500 font-mono tabular-nums truncate max-w-[130px]">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {currentUser.role.toUpperCase()}
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 ml-0.5 flex-shrink-0" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 p-2 z-50 shadow-xl">
                  {/* Account Header */}
                  <div className="px-3 py-2.5 text-xs border-b border-neutral-200 dark:border-neutral-800 space-y-2">
                    <div className="flex items-center space-x-2.5">
                      <UserAvatar
                        src={currentUser.avatar_url}
                        name={currentUser.full_name}
                        email={currentUser.email}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate text-xs">
                          {currentUser.full_name}
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                          {currentUser.email}
                        </p>
                      </div>
                    </div>

                    {/* Metadata: Role & Verified Google ID */}
                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500 dark:text-neutral-400">Role</span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono tracking-wide border",
                            currentUser.role === "admin"
                              ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-neutral-900 dark:border-neutral-100"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                          )}
                        >
                          {currentUser.role}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500 dark:text-neutral-400">Google ID</span>
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                          <span
                            className="text-neutral-700 dark:text-neutral-300 truncate max-w-[130px]"
                            title={currentUser.id}
                          >
                            {currentUser.id
                              ? currentUser.id.length > 14
                                ? `${currentUser.id.slice(0, 12)}…`
                                : currentUser.id
                              : currentUser.badge_number || "Verified"}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-1 space-y-0.5">
                    {currentUser.role === "admin" && (
                      <Link
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center space-x-2 transition-colors font-medium"
                      >
                        <Users className="w-4 h-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                        <span>Personnel Management</span>
                      </Link>
                    )}

                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center space-x-2 transition-colors font-medium"
                    >
                      <LogOut className="w-4 h-4 flex-shrink-0" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center space-x-2 px-4 py-2 min-h-[44px] rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold active:scale-[0.97] transition-transform duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In with Google</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

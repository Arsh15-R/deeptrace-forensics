"use client";

import React, { useState, useEffect } from "react";
import { AdminUserRecord, UserRole } from "@/lib/types";
import { listAdminUsers, updateUserRole, updateUserStatus, deleteAdminUser } from "@/lib/api";
import {
  ShieldCheck,
  UserCheck,
  Search,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ArrowDownRight,
  Trash2,
  X,
  Lock,
} from "lucide-react";
import { formatDateTimeSeparate, cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/UserAvatar";

interface ConfirmationState {
  isOpen: boolean;
  type: "promote" | "demote" | "status" | "delete";
  user: AdminUserRecord | null;
  targetRole?: UserRole;
  targetActive?: boolean;
}

export const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    isOpen: false,
    type: "promote",
    user: null,
  });

  const loadRoster = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAdminUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err?.message || "Failed to retrieve personnel roster.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoster();
  }, []);

  const openConfirmation = (
    type: "promote" | "demote" | "status" | "delete",
    user: AdminUserRecord,
    targetRole?: UserRole,
    targetActive?: boolean
  ) => {
    setActionError(null);
    setConfirmation({
      isOpen: true,
      type,
      user,
      targetRole,
      targetActive,
    });
  };

  const closeConfirmation = () => {
    if (actionLoading) return;
    setConfirmation({
      isOpen: false,
      type: "promote",
      user: null,
    });
    setActionError(null);
  };

  const handleExecuteAction = async () => {
    if (!confirmation.user) return;
    setActionLoading(true);
    setActionError(null);

    try {
      if (confirmation.type === "promote" || confirmation.type === "demote") {
        if (!confirmation.targetRole) throw new Error("No target role specified.");
        const updated = await updateUserRole(confirmation.user.id, confirmation.targetRole);
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      } else if (confirmation.type === "status") {
        if (confirmation.targetActive === undefined) throw new Error("No status specified.");
        const updated = await updateUserStatus(confirmation.user.id, confirmation.targetActive);
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      } else if (confirmation.type === "delete") {
        const deletedUserId = confirmation.user.id;
        await deleteAdminUser(deletedUserId);
        setUsers((prev) => prev.filter((u) => u.id !== deletedUserId));
      }
      closeConfirmation();
    } catch (err: any) {
      setActionError(err?.message || "Action failed to execute.");
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.badge_number && u.badge_number.toLowerCase().includes(q)) ||
      (u.department && u.department.toLowerCase().includes(q));

    const matchesRole = roleFilter === "all" || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Overview metrics
  const totalCount = users.length;
  const officerCount = users.filter((u) => u.role === "officer" && u.is_active).length;
  const onlineCount = users.filter((u) => u.is_online && u.is_active).length;
  const deactivatedCount = users.filter((u) => !u.is_active).length;
  const hasActiveFilters = Boolean(search.trim() || roleFilter !== "all");

  const resetFilters = () => {
    setSearch("");
    setRoleFilter("all");
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "admin":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border border-neutral-800 dark:border-neutral-200">
            Admin
          </span>
        );
      case "officer":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            Officer
          </span>
        );
      case "viewer":
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20">
            Viewer
          </span>
        );
    }
  };

  const renderActivityStatus = (user: AdminUserRecord) => {
    if (!user.is_active) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" />
          Deactivated
        </span>
      );
    }

    if (user.is_online) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5" />
          Online
        </span>
      );
    }

    const { date, time } = formatDateTimeSeparate(user.last_active_at);

    return (
      <div className="font-mono tabular-nums text-xs whitespace-nowrap">
        <div className="flex items-center space-x-1.5 font-medium text-neutral-700 dark:text-neutral-300 leading-snug">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500" />
          <span>{date}</span>
        </div>
        {time && (
          <div className="text-[11px] text-neutral-400 dark:text-neutral-500 pl-3 leading-snug mt-0.5">
            {time}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Personnel Administration
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Manage authenticated department accounts, officer promotions, and permissions.
          </p>
        </div>

        <button
          onClick={loadRoster}
          disabled={loading}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white/70 dark:bg-neutral-800/70 hover:bg-neutral-100 dark:hover:bg-neutral-750 text-xs font-semibold text-neutral-800 dark:text-neutral-200 active:scale-[0.97] transition-all shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="px-4 py-3 rounded-2xl bg-white/70 dark:bg-neutral-900/70 border border-neutral-200/80 dark:border-neutral-800/80 backdrop-blur-md flex items-center justify-between shadow-xs">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Total Personnel</span>
          <span className="text-base font-bold font-mono text-neutral-900 dark:text-neutral-100">
            {totalCount}
          </span>
        </div>

        <div className="px-4 py-3 rounded-2xl bg-white/70 dark:bg-neutral-900/70 border border-neutral-200/80 dark:border-neutral-800/80 backdrop-blur-md flex items-center justify-between shadow-xs">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Active Officers</span>
          <span className="text-base font-bold font-mono text-blue-600 dark:text-blue-400">
            {officerCount}
          </span>
        </div>

        <div className="px-4 py-3 rounded-2xl bg-white/70 dark:bg-neutral-900/70 border border-neutral-200/80 dark:border-neutral-800/80 backdrop-blur-md flex items-center justify-between shadow-xs">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Online Now</span>
          <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {onlineCount}
          </span>
        </div>

        <div className="px-4 py-3 rounded-2xl bg-white/70 dark:bg-neutral-900/70 border border-neutral-200/80 dark:border-neutral-800/80 backdrop-blur-md flex items-center justify-between shadow-xs">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Deactivated</span>
          <span className="text-base font-bold font-mono text-rose-600 dark:text-rose-400">
            {deactivatedCount}
          </span>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search personnel by name, email, or badge..."
            className="w-full pl-9 pr-9 h-10 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 text-xs font-medium text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-0.5"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Filter personnel by role"
            className="px-3 h-10 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 text-xs font-medium text-neutral-800 dark:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrators</option>
            <option value="officer">Forensic Officers</option>
            <option value="viewer">Viewers</option>
          </select>
        </div>
      </div>

      {/* Count & Reset Indicator */}
      <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 px-1">
        <span>
          {hasActiveFilters ? (
            <>
              Showing{" "}
              <span className="font-semibold text-neutral-900 dark:text-neutral-100 font-mono">
                {filteredUsers.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-neutral-900 dark:text-neutral-100 font-mono">
                {users.length}
              </span>{" "}
              personnel
            </>
          ) : (
            <>
              Total{" "}
              <span className="font-semibold text-neutral-900 dark:text-neutral-100 font-mono">
                {users.length}
              </span>{" "}
              registered personnel
            </>
          )}
        </span>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-xs transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadRoster} className="font-semibold underline ml-2">
            Retry
          </button>
        </div>
      )}

      {/* Modern Glassmorphic Personnel Table */}
      <div className="overflow-x-auto rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md shadow-sm">
        <table className="w-full text-left text-xs min-w-[760px] border-collapse">
          <thead className="bg-neutral-50/80 dark:bg-neutral-800/40 text-neutral-500 dark:text-neutral-400 text-[11px] font-semibold uppercase tracking-wider border-b border-neutral-200/60 dark:border-neutral-800/60">
            <tr>
              <th scope="col" className="py-3 px-4 w-[220px]">
                Personnel
              </th>
              <th scope="col" className="py-3 px-4 min-w-[200px]">
                Google Account
              </th>
              <th scope="col" className="py-3 px-4 w-[110px] whitespace-nowrap">
                Role
              </th>
              <th scope="col" className="py-3 px-4 w-[140px] whitespace-nowrap">
                Activity Status
              </th>
              <th scope="col" className="py-3 px-4 min-w-[200px] text-right whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-neutral-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="text-xs">Loading personnel roster...</span>
                  </div>
                </td>
              </tr>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className={cn(
                    "hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors group",
                    !user.is_active && "opacity-60 bg-neutral-50/30 dark:bg-neutral-950/30"
                  )}
                >
                  {/* Personnel Info */}
                  <td className="py-3 px-4 min-w-0">
                    <div className="flex items-center space-x-2.5">
                      <UserAvatar
                        src={user.avatar_url}
                        name={user.full_name}
                        email={user.email}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100 truncate text-xs">
                          {user.full_name}
                        </div>
                        <div className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono truncate">
                          {user.badge_number || "NO BADGE"} • {user.department || "General"}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Google Account */}
                  <td className="py-3 px-4 font-mono text-xs text-neutral-700 dark:text-neutral-300">
                    {user.email}
                  </td>

                  {/* Role Badge */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {getRoleBadge(user.role)}
                  </td>

                  {/* Activity Status */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {renderActivityStatus(user)}
                  </td>

                  {/* Contextual Action Controls */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {user.role === "admin" ? (
                      /* Protected Account: No mutative controls */
                      <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-neutral-100/80 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <span>Protected Account</span>
                      </div>
                    ) : (
                      /* Contextual Actions (only applicable actions per user) */
                      <div className="inline-flex items-center justify-end space-x-1.5">
                        {/* Role Controls: Show only applicable direction */}
                        {user.is_active && user.role === "viewer" && (
                          <button
                            type="button"
                            onClick={() => openConfirmation("promote", user, "officer")}
                            className="h-7 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium active:scale-[0.97] transition-all inline-flex items-center space-x-1 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            title="Promote to Forensic Officer"
                          >
                            <UserCheck className="w-3 h-3 flex-shrink-0" />
                            <span>Promote to Officer</span>
                          </button>
                        )}

                        {user.is_active && user.role === "officer" && (
                          <button
                            type="button"
                            onClick={() => openConfirmation("demote", user, "viewer")}
                            className="h-7 px-2.5 rounded-lg border border-neutral-300/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-200 text-xs font-medium active:scale-[0.97] transition-all inline-flex items-center space-x-1 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            title="Demote to Viewer"
                          >
                            <ArrowDownRight className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                            <span>Demote to Viewer</span>
                          </button>
                        )}

                        {/* Status Controls: Deactivate if active, Reactivate if inactive */}
                        {user.is_active ? (
                          <button
                            type="button"
                            onClick={() => openConfirmation("status", user, undefined, false)}
                            className="h-7 px-2.5 rounded-lg border border-neutral-300/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-750 text-neutral-600 dark:text-neutral-300 text-xs font-medium active:scale-[0.97] transition-all inline-flex items-center space-x-1 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                            title="Deactivate account"
                          >
                            <span>Deactivate</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openConfirmation("status", user, undefined, true)}
                            className="h-7 px-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium active:scale-[0.97] transition-all inline-flex items-center space-x-1 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                            title="Reactivate account"
                          >
                            <RefreshCw className="w-3 h-3 flex-shrink-0" />
                            <span>Reactivate</span>
                          </button>
                        )}

                        {/* Delete Account */}
                        <button
                          type="button"
                          onClick={() => openConfirmation("delete", user)}
                          className="h-7 px-2 rounded-lg border border-rose-300/60 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-medium active:scale-[0.97] transition-all inline-flex items-center space-x-1 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                          title={`Permanently delete ${user.full_name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-10 text-center text-neutral-500 dark:text-neutral-400 text-xs">
                  No personnel matching this criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal */}
      {confirmation.isOpen && confirmation.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 space-y-5 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border",
                    confirmation.type === "promote"
                      ? "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                      : confirmation.type === "demote"
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                      : confirmation.type === "delete"
                      ? "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                      : confirmation.targetActive
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                  )}
                >
                  {confirmation.type === "promote" ? (
                    <UserCheck className="w-5 h-5" />
                  ) : confirmation.type === "demote" ? (
                    <ArrowDownRight className="w-5 h-5" />
                  ) : confirmation.type === "delete" ? (
                    <Trash2 className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    {confirmation.type === "promote" && "Promote to Officer"}
                    {confirmation.type === "demote" && "Demote to Viewer"}
                    {confirmation.type === "delete" && "Permanently Delete User"}
                    {confirmation.type === "status" &&
                      (confirmation.targetActive
                        ? "Confirm Account Reactivation"
                        : "Confirm Account Deactivation")}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {confirmation.type === "delete"
                      ? "Irreversible account removal"
                      : "Access & permission management"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeConfirmation}
                className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Account Summary */}
            <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/70 dark:bg-neutral-800/40 p-4 space-y-3">
              <div className="flex items-center space-x-3 pb-3 border-b border-neutral-200/80 dark:border-neutral-750">
                <UserAvatar
                  src={confirmation.user.avatar_url}
                  name={confirmation.user.full_name}
                  email={confirmation.user.email}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm text-neutral-900 dark:text-neutral-50 truncate">
                    {confirmation.user.full_name}
                  </div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400 font-mono truncate">
                    {confirmation.user.email}
                  </div>
                </div>
              </div>

              <div className="text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed font-medium">
                {confirmation.type === "promote" && (
                  <p>
                    Promote this user to{" "}
                    <span className="font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      Officer
                    </span>
                    . They will gain authorization to upload evidence and perform forensic analyses.
                  </p>
                )}
                {confirmation.type === "demote" && (
                  <p>
                    Demote this user to{" "}
                    <span className="font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20">
                      Viewer
                    </span>
                    . They will have read-only access to completed cases and public reports.
                  </p>
                )}
                {confirmation.type === "delete" && (
                  <div className="space-y-1.5">
                    <p>
                      Are you sure you want to permanently delete <b>{confirmation.user.full_name}</b>?
                    </p>
                    <p className="text-rose-600 dark:text-rose-400 font-semibold leading-relaxed">
                      This will revoke all permissions and delete the account record. This action cannot be undone.
                    </p>
                  </div>
                )}
                {confirmation.type === "status" && !confirmation.targetActive && (
                  <p>
                    Deactivating <b>{confirmation.user.full_name}</b> will immediately suspend their account access.
                  </p>
                )}
                {confirmation.type === "status" && confirmation.targetActive && (
                  <p>
                    Reactivating <b>{confirmation.user.full_name}</b> will restore their account permissions.
                  </p>
                )}
              </div>
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
                {actionError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-2.5 pt-1">
              <button
                type="button"
                onClick={closeConfirmation}
                disabled={actionLoading}
                className="px-4 py-2 min-h-[38px] rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-750 text-xs font-semibold text-neutral-800 dark:text-neutral-200 active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteAction}
                disabled={actionLoading}
                className={cn(
                  "px-5 py-2 min-h-[38px] rounded-xl text-xs font-bold active:scale-[0.97] transition-all flex items-center space-x-2 shadow-xs focus-visible:outline-none focus-visible:ring-2",
                  confirmation.type === "delete" ||
                    (confirmation.type === "status" && !confirmation.targetActive)
                    ? "bg-rose-600 hover:bg-rose-700 text-white focus-visible:ring-rose-500"
                    : "bg-blue-600 hover:bg-blue-700 text-white focus-visible:ring-blue-500"
                )}
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {confirmation.type === "promote" && "Promote to Officer"}
                  {confirmation.type === "demote" && "Demote to Viewer"}
                  {confirmation.type === "delete" && "Delete Account"}
                  {confirmation.type === "status" &&
                    (confirmation.targetActive ? "Reactivate Account" : "Deactivate Account")}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

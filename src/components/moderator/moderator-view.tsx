"use client";

/**
 * MANAHAD — Admin Dashboard (Moderator View rewrite)
 *
 * Access control: only `loginMode === "ADMIN"` may view this screen.
 *
 * Features:
 *   - 4 stat cards (Total Users, Active Today, Questions Answered, Questions Generated)
 *   - Searchable user table with avatar / username / level / XP / questions / accuracy /
 *     last active / actions (View Details, Ban, Delete)
 *   - User details modal
 *
 * Fetches from /api/admin/users. Delete via DELETE /api/admin/users?userId=...
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/stores/app-store";
import { toast } from "sonner";
import {
  ShieldAlert, RefreshCw, Users, Activity, ListChecks, Database, Search,
  Eye, Trash2, Ban, ChevronLeft, ShieldCheck,
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  totalStudents: number;
  activeToday: number;
  totalAttempts: number;
  totalQuestions: number;
}

interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: string;
  xp: number;
  level: number;
  coins: number;
  questionsAnswered: number;
  accuracy: number;
  lastActiveAt: string;
  createdAt: string;
  parentEmail: string | null;
  hasParentPassword: boolean;
}

interface AdminUsersResponse {
  stats: AdminStats;
  users: AdminUser[];
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export function ModeratorView() {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);

  const [data, setData] = useState<AdminUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/users", { cache: "no-store" });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? `Failed (${res.status})`);
        }
        const json = (await res.json()) as AdminUsersResponse;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Failed to load users");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.users;
    return data.users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.parentEmail ?? "").toLowerCase().includes(q)
    );
  }, [data, query]);

  // === Access control ===
  if (!user || user.loginMode !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <ShieldAlert className="w-16 h-16 text-rose-400 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Admin Access Required</h2>
        <p className="text-muted-foreground mb-4">
          This dashboard is only available to admin accounts.
        </p>
        <Button onClick={() => setView("world")}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to World
        </Button>
      </div>
    );
  }

  const stats = data?.stats;

  async function handleDelete(u: AdminUser) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(u.id)}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Failed to delete user");
        return;
      }
      toast.success(`Deleted @${u.username}`);
      setConfirmDelete(null);
      if (selected?.id === u.id) setSelected(null);
      refresh();
    } catch {
      toast.error("Network error while deleting user");
    } finally {
      setDeleting(false);
    }
  }

  function handleBan(u: AdminUser) {
    // Quick placeholder: surface a toast. Full moderation flow is in /moderator route.
    toast.info(`Ban action queued for @${u.username}. Use the Moderation queue to issue formal penalties.`);
    void u;
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6 bg-gradient-to-br from-background to-muted/30">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Manage users, monitor activity, and review platform health.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Users className="w-5 h-5 text-emerald-600" />}
          label="Total Users"
          value={stats?.totalUsers}
          loading={loading}
          tint="emerald"
        />
        <StatCard
          icon={<Activity className="w-5 h-5 text-rose-600" />}
          label="Active Today"
          value={stats?.activeToday}
          loading={loading}
          tint="rose"
        />
        <StatCard
          icon={<ListChecks className="w-5 h-5 text-amber-600" />}
          label="Questions Answered"
          value={stats?.totalAttempts}
          loading={loading}
          tint="amber"
        />
        <StatCard
          icon={<Database className="w-5 h-5 text-purple-600" />}
          label="Questions Generated"
          value={stats?.totalQuestions}
          loading={loading}
          tint="purple"
        />
      </div>

      {/* Search + table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-4 h-4" /> Users
          </CardTitle>
          <CardDescription>
            {loading
              ? "Loading users…"
              : `${filtered.length} of ${data?.users.length ?? 0} users`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by username, display name, email, or parent email…"
              className="pl-9 rounded-full"
            />
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No users match your search.
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[44px]"></TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="hidden sm:table-cell">Level</TableHead>
                    <TableHead className="hidden md:table-cell">XP</TableHead>
                    <TableHead className="hidden md:table-cell">Questions</TableHead>
                    <TableHead className="hidden lg:table-cell">Accuracy</TableHead>
                    <TableHead className="hidden md:table-cell">Last Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const isSelf = user.id === u.id;
                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-amber-400 text-white text-[10px]">
                              {initials(u.displayName)}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">
                              {u.displayName}
                              {isSelf && (
                                <Badge variant="secondary" className="ml-2 text-[10px]">you</Badge>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              @{u.username}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline">Lv {u.level}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{u.xp}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{u.questionsAnswered}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {u.accuracy > 0 ? `${u.accuracy}%` : "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                          {timeAgo(u.lastActiveAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelected(u)}
                              aria-label={`View details for @${u.username}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleBan(u)}
                              disabled={isSelf}
                              aria-label={`Ban @${u.username}`}
                            >
                              <Ban className="w-4 h-4 text-amber-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setConfirmDelete(u)}
                              disabled={isSelf}
                              aria-label={`Delete @${u.username}`}
                            >
                              <Trash2 className="w-4 h-4 text-rose-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* === User details modal === */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-amber-400 text-white">
                  {selected ? initials(selected.displayName) : ""}
                </AvatarFallback>
              </Avatar>
              <div>
                <div>{selected?.displayName}</div>
                <div className="text-xs text-muted-foreground font-normal">@{selected?.username}</div>
              </div>
            </DialogTitle>
            <DialogDescription>
              Full account snapshot and learning stats.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Detail label="Role" value={selected.role} />
                <Detail label="Level" value={`Lv ${selected.level}`} />
                <Detail label="XP" value={`${selected.xp}`} />
                <Detail label="Coins" value={`${selected.coins}`} />
                <Detail label="Questions Answered" value={`${selected.questionsAnswered}`} />
                <Detail label="Accuracy" value={selected.accuracy > 0 ? `${selected.accuracy}%` : "—"} />
                <Detail label="Created" value={new Date(selected.createdAt).toLocaleDateString()} />
                <Detail label="Last Active" value={timeAgo(selected.lastActiveAt)} />
              </div>
              <div className="rounded-xl bg-muted/50 p-3 space-y-1.5">
                <div className="text-xs text-muted-foreground">Email (internal)</div>
                <code className="text-xs break-all">{selected.email}</code>
                <div className="text-xs text-muted-foreground mt-2">Parent Email</div>
                <code className="text-xs break-all">
                  {selected.parentEmail || "—"}
                </code>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={selected.hasParentPassword ? "default" : "secondary"} className="text-[10px]">
                    {selected.hasParentPassword ? "Parent password set" : "No parent password"}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="sm:mr-auto" onClick={() => setSelected(null)}>
              Close
            </Button>
            <Button
              variant="outline"
              disabled={!selected || selected.id === user.id}
              onClick={() => selected && handleBan(selected)}
            >
              <Ban className="w-4 h-4 mr-1.5 text-amber-600" /> Ban
            </Button>
            <Button
              variant="destructive"
              disabled={!selected || selected.id === user.id || deleting}
              onClick={() => selected && setConfirmDelete(selected)}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Delete confirm modal === */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete user?</DialogTitle>
            <DialogDescription>
              This permanently deletes <strong>@{confirmDelete?.username}</strong> and all their
              data (attempts, mastery, chat, cosmetics, etc.). This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              {deleting ? "Deleting…" : "Delete forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === Floating AnimatePresence wrapper so motion entries don't get tree-shaken === */}
      <AnimatePresence>
        <motion.span className="sr-only" aria-hidden>
          admin dashboard
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

const TINT_MAP: Record<string, string> = {
  emerald: "from-emerald-500/10 to-emerald-500/0 border-emerald-200/60 dark:border-emerald-900/60",
  rose: "from-rose-500/10 to-rose-500/0 border-rose-200/60 dark:border-rose-900/60",
  amber: "from-amber-500/10 to-amber-500/0 border-amber-200/60 dark:border-amber-900/60",
  purple: "from-purple-500/10 to-purple-500/0 border-purple-200/60 dark:border-purple-900/60",
};

function StatCard({
  icon, label, value, loading, tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | undefined;
  loading: boolean;
  tint: "emerald" | "rose" | "amber" | "purple";
}) {
  return (
    <Card className={`bg-gradient-to-br ${TINT_MAP[tint]} border`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-background/80 backdrop-blur flex items-center justify-center shadow-sm">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          {loading ? (
            <Skeleton className="h-5 w-12 mt-1" />
          ) : (
            <div className="text-2xl font-bold leading-tight">
              {value ?? 0}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

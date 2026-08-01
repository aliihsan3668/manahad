"use client";

/**
 * MathVerse — Moderator Dashboard
 *
 * Auth-gated (MODERATOR / ADMIN). Tabs:
 *   - Reports: open ChatReports → Take Action dialog
 *   - Flagged Messages: BLOCKED / ESCALATED / REWRITTEN messages
 *   - Active Penalties: active MUTE/SUSPEND/BAN → Lift
 *   - Appeals: open Appeals → Approve / Deny
 *
 * Table-heavy, color-coded severity.
 */

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/stores/app-store";
import { toast } from "sonner";
import {
  ShieldAlert, ArrowLeft, Loader2, RefreshCw, Flag, MessageSquareWarning,
  Gavel, Scale, Check, X, AlertTriangle, UserCircle, Ban, MicOff, Pause, Bell,
} from "lucide-react";

interface ReportItem {
  id: string;
  messageId: string;
  reason: string;
  notes: string | null;
  status: string;
  createdAt: string;
  message: {
    id: string;
    rawContent: string;
    displayedContent: string;
    moderationStatus: string;
  };
  reportedUser: { id: string; username: string; displayName: string };
}

interface FlaggedMessage {
  id: string;
  rawContent: string;
  displayedContent: string;
  moderationStatus: string;
  moderationReason: string | null;
  createdAt: string;
  user: { id: string; username: string; displayName: string };
}

interface ActiveAction {
  id: string;
  actionType: string;
  reason: string;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
  user: { id: string; username: string; displayName: string };
}

interface AppealItem {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  user: { id: string; username: string; displayName: string };
  action: { id: string; actionType: string; reason: string; active: boolean };
}

interface ModData {
  openReports: ReportItem[];
  recentModerationActions: unknown[];
  recentFlaggedMessages: FlaggedMessage[];
  activeMutesSuspensions: ActiveAction[];
  openAppeals: AppealItem[];
}

const ACTION_COLOR: Record<string, string> = {
  WARNING: "bg-amber-100 text-amber-700 border-amber-300",
  MUTE: "bg-orange-100 text-orange-700 border-orange-300",
  SUSPEND: "bg-rose-100 text-rose-700 border-rose-300",
  BAN: "bg-red-200 text-red-800 border-red-400",
  UNMUTE: "bg-emerald-100 text-emerald-700 border-emerald-300",
  UNSUSPEND: "bg-emerald-100 text-emerald-700 border-emerald-300",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  BLOCKED: "bg-rose-100 text-rose-700",
  HIDDEN: "bg-slate-200 text-slate-700",
  REWRITTEN: "bg-amber-100 text-amber-700",
  ESCALATED: "bg-purple-100 text-purple-700",
  OPEN: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-emerald-100 text-emerald-700",
};

const ACTION_ICON: Record<string, typeof Ban> = {
  WARNING: Bell,
  MUTE: MicOff,
  SUSPEND: Pause,
  BAN: Ban,
  UNMUTE: MicOff,
  UNSUSPEND: Pause,
};

export function ModeratorView() {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);
  const [data, setData] = useState<ModData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState<{ userId: string; displayName: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/moderator/dashboard");
      const d = await res.json();
      if (res.ok) setData(d);
      else toast.error(d.error ?? "Could not load dashboard");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function takeAction(params: {
    actionType: string; userId: string; reason: string; durationMinutes: number;
  }) {
    setBusyId(params.userId);
    try {
      const res = await fetch("/api/moderator/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Action failed");
      toast.success(`✅ ${params.actionType} applied to user`);
      setActionTarget(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  async function reviewAppeal(appealId: string, status: "APPROVED" | "DENIED") {
    setBusyId(appealId);
    try {
      const res = await fetch("/api/moderator/appeal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appealId, status }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Appeal review failed");
      toast.success(`Appeal ${status.toLowerCase()}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not review appeal");
    } finally {
      setBusyId(null);
    }
  }

  if (user?.role !== "MODERATOR" && user?.role !== "ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-rose-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="w-5 h-5" /> Access Denied
            </CardTitle>
            <CardDescription>
              Moderator or Admin privileges are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setView("auth")} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-rose-600" /> Moderator Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review reports, manage penalties, and resolve appeals.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setView("auth")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard icon={Flag} label="Open Reports" value={data?.openReports.length ?? 0} color="text-rose-600" />
        <SummaryCard icon={MessageSquareWarning} label="Flagged Msgs" value={data?.recentFlaggedMessages.length ?? 0} color="text-amber-600" />
        <SummaryCard icon={Gavel} label="Active Penalties" value={data?.activeMutesSuspensions.length ?? 0} color="text-purple-600" />
        <SummaryCard icon={Scale} label="Open Appeals" value={data?.openAppeals.length ?? 0} color="text-sky-600" />
      </div>

      {loading || !data ? (
        <div className="space-y-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <Tabs defaultValue="reports">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-4">
            <TabsTrigger value="reports"><Flag className="w-4 h-4 mr-1" /> Reports</TabsTrigger>
            <TabsTrigger value="flagged"><MessageSquareWarning className="w-4 h-4 mr-1" /> Flagged</TabsTrigger>
            <TabsTrigger value="penalties"><Gavel className="w-4 h-4 mr-1" /> Penalties</TabsTrigger>
            <TabsTrigger value="appeals"><Scale className="w-4 h-4 mr-1" /> Appeals</TabsTrigger>
          </TabsList>

          {/* ============== REPORTS ============== */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Open Reports</CardTitle>
                <CardDescription>User-flagged chat messages awaiting review.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.openReports.length === 0 ? (
                  <EmptyState text="No open reports. 🎉" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reported User</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead className="hidden md:table-cell">Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.openReports.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <UserCircle className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">{r.reportedUser.displayName}</p>
                                <p className="text-[10px] text-muted-foreground">@{r.reportedUser.username}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <p className="text-xs line-clamp-2">{r.message.displayedContent || r.message.rawContent}</p>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs">{r.reason}</TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${STATUS_COLOR[r.status] ?? STATUS_COLOR.OPEN}`}>{r.status}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <TakeActionDialog
                              target={{ userId: r.reportedUser.id, displayName: r.reportedUser.displayName }}
                              onConfirm={takeAction}
                              busy={busyId === r.reportedUser.id}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============== FLAGGED MESSAGES ============== */}
          <TabsContent value="flagged">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Flagged Messages</CardTitle>
                <CardDescription>Recent messages blocked, escalated, or rewritten by AI.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.recentFlaggedMessages.length === 0 ? (
                  <EmptyState text="No flagged messages." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Raw Content</TableHead>
                        <TableHead>Displayed</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentFlaggedMessages.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell>
                            <p className="font-medium text-sm">{m.user.displayName}</p>
                            <p className="text-[10px] text-muted-foreground">@{m.user.username}</p>
                          </TableCell>
                          <TableCell className="max-w-[180px] text-xs">
                            <p className="line-clamp-2 text-rose-700 dark:text-rose-400">{m.rawContent}</p>
                          </TableCell>
                          <TableCell className="max-w-[180px] text-xs">
                            <p className="line-clamp-2">{m.displayedContent || "—"}</p>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${STATUS_COLOR[m.moderationStatus] ?? STATUS_COLOR.PENDING}`}>
                              {m.moderationStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground line-clamp-1">
                            {m.moderationReason ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(m.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============== ACTIVE PENALTIES ============== */}
          <TabsContent value="penalties">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Penalties</CardTitle>
                <CardDescription>Currently enforced mutes, suspensions, and bans.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.activeMutesSuspensions.length === 0 ? (
                  <EmptyState text="No active penalties. 🎉" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.activeMutesSuspensions.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>
                            <p className="font-medium text-sm">{a.user.displayName}</p>
                            <p className="text-[10px] text-muted-foreground">@{a.user.username}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${ACTION_COLOR[a.actionType] ?? ""}`}>
                              {a.actionType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs line-clamp-1 max-w-[180px]">{a.reason}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {a.expiresAt ? new Date(a.expiresAt).toLocaleString() : "Permanent"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(a.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === a.id}
                              onClick={async () => {
                                const liftAction = a.actionType === "MUTE" ? "UNMUTE" : a.actionType === "SUSPEND" ? "UNSUSPEND" : null;
                                if (!liftAction) {
                                  toast.error("Cannot lift a ban via this button — use appeals process.");
                                  return;
                                }
                                setBusyId(a.id);
                                try {
                                  const res = await fetch("/api/moderator/action", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      actionType: liftAction,
                                      userId: a.user.id,
                                      reason: `Lifted by moderator (${user?.username ?? "unknown"})`,
                                    }),
                                  });
                                  const d = await res.json();
                                  if (!res.ok) throw new Error(d.error ?? "Lift failed");
                                  toast.success(`${liftAction} applied`);
                                  await load();
                                } catch (e) {
                                  toast.error(e instanceof Error ? e.message : "Could not lift penalty");
                                } finally {
                                  setBusyId(null);
                                }
                              }}
                            >
                              {busyId === a.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                              Lift
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============== APPEALS ============== */}
          <TabsContent value="appeals">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Open Appeals</CardTitle>
                <CardDescription>Users contesting moderation actions.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.openAppeals.length === 0 ? (
                  <EmptyState text="No open appeals." />
                ) : (
                  <div className="space-y-3">
                    {data.openAppeals.map((a) => (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-lg border p-3"
                      >
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="flex-1 min-w-[200px]">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={`text-[10px] ${ACTION_COLOR[a.action.actionType] ?? ""}`}>
                                {a.action.actionType}
                              </Badge>
                              <span className="font-medium text-sm">{a.user.displayName}</span>
                              <span className="text-[10px] text-muted-foreground">@{a.user.username}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Original reason: <span className="text-foreground">{a.action.reason}</span>
                            </p>
                            <p className="text-sm mt-1">{a.reason}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Filed {new Date(a.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                              disabled={busyId === a.id}
                              onClick={() => reviewAppeal(a.id, "APPROVED")}
                            >
                              <Check className="w-3 h-3 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-rose-300 text-rose-700 hover:bg-rose-50"
                              disabled={busyId === a.id}
                              onClick={() => reviewAppeal(a.id, "DENIED")}
                            >
                              <X className="w-3 h-3 mr-1" /> Deny
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Inline action target launcher (used by Take Action dialog) */}
      {actionTarget && (
        <TakeActionDialog
          open
          target={actionTarget}
          onConfirm={takeAction}
          busy={busyId === actionTarget.userId}
          onClose={() => setActionTarget(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// Summary Card
// ============================================================
function SummaryCard({ icon: Icon, label, value, color }: {
  icon: typeof Flag; label: string; value: number; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`w-9 h-9 ${color}`} />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Take Action Dialog
// ============================================================
function TakeActionDialog({
  open, target, onConfirm, busy, onClose,
}: {
  open?: boolean;
  target: { userId: string; displayName: string };
  onConfirm: (p: { actionType: string; userId: string; reason: string; durationMinutes: number }) => void;
  busy: boolean;
  onClose?: () => void;
}) {
  const [actionType, setActionType] = useState("WARNING");
  const [reason, setReason] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = open ?? internalOpen;

  function handleSubmit() {
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    onConfirm({
      actionType,
      userId: target.userId,
      reason: reason.trim(),
      durationMinutes: actionType === "MUTE" || actionType === "SUSPEND" ? durationMinutes : 0,
    });
    setReason("");
    setActionType("WARNING");
    setDurationMinutes(60);
    setInternalOpen(false);
    onClose?.();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => {
      setInternalOpen(v);
      if (!v) onClose?.();
    }}>
      <DialogTrigger asChild>
        {open ? undefined : (
          <Button size="sm" variant="destructive">
            <Gavel className="w-3 h-3 mr-1" /> Take Action
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Take Moderation Action</DialogTitle>
          <DialogDescription>
            Acting on <span className="font-semibold">{target.displayName}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Action Type</Label>
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["WARNING", "MUTE", "SUSPEND", "BAN"].map((a) => {
                  const Icon = ACTION_ICON[a] ?? Bell;
                  return (
                    <SelectItem key={a} value={a}>
                      <span className="flex items-center gap-1">
                        <Icon className="w-3 h-3" /> {a}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          {(actionType === "MUTE" || actionType === "SUSPEND") && (
            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                min={1}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value || "0", 10))}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Set 0 for permanent (not recommended for first offenses).
              </p>
            </div>
          )}
          <div>
            <Label>Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this action is being taken..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setInternalOpen(false); onClose?.(); }} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Gavel className="w-4 h-4 mr-1" />}
            Apply Action
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Empty state
// ============================================================
function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-12 text-sm text-muted-foreground">{text}</div>
  );
}

export default ModeratorView;

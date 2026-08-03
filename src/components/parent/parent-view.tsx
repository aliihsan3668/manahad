"use client";

/**
 * MANAHAD — Parent Dashboard
 *
 * Auth-gated (role PARENT/ADMIN). For each linked child shows:
 *   - Avatar + name + level + XP
 *   - Stats: questions answered, accuracy %, time spent last 7d
 *   - Recent chat messages with moderation badges
 *   - Recent moderation actions
 *   - Weak topics
 *   - Expandable detailed mastery report
 *
 * Settings panel: edit ParentSettings (toggles + numeric inputs).
 */

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/stores/app-store";
import { toast } from "sonner";
import {
  Shield, ArrowLeft, Loader2, ChevronDown, ChevronUp, Settings, AlertTriangle,
  CheckCircle2, MessageSquare, TrendingDown, Clock, Target, Zap, Coins,
  Save, RefreshCw,
} from "lucide-react";
import type { ParentSettings } from "@/lib/types";

interface ChildData {
  userId: string;
  displayName: string;
  username: string;
  level: number;
  xp: number;
  accuracy: number;
  questionsAnswered: number;
  timeSpentMin7d: number;
  recentModerationActions: {
    id: string; actionType: string; reason: string; active: boolean; createdAt: string;
  }[];
  recentChatMessages: {
    id: string; rawContent: string; displayedContent: string;
    moderationStatus: string; createdAt: string;
  }[];
  masteryWeakTopics: {
    topicSlug: string; topicName: string; masteryScore: number;
  }[];
}

const MOD_BADGE: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  BLOCKED: "bg-rose-100 text-rose-700",
  HIDDEN: "bg-slate-200 text-slate-700",
  REWRITTEN: "bg-amber-100 text-amber-700",
  ESCALATED: "bg-purple-100 text-purple-700",
};

const ACTION_COLOR: Record<string, string> = {
  WARNING: "bg-amber-100 text-amber-700 border-amber-300",
  MUTE: "bg-orange-100 text-orange-700 border-orange-300",
  SUSPEND: "bg-rose-100 text-rose-700 border-rose-300",
  BAN: "bg-red-200 text-red-800 border-red-400",
  UNMUTE: "bg-emerald-100 text-emerald-700 border-emerald-300",
  UNSUSPEND: "bg-emerald-100 text-emerald-700 border-emerald-300",
};

const DEFAULT_SETTINGS: ParentSettings = {
  chatEnabled: true,
  approvedFriendsOnly: false,
  friendApprovalRequired: true,
  playtimeMinutesPerDay: 120,
  playtimeMinutesPerSession: 45,
  weeklyReportEmail: true,
  alertOnModeration: true,
  alertOnFriendRequest: true,
  realNameSharing: false,
};

export function ParentView() {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);

  const [children, setChildren] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ParentSettings>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [expandedChild, setExpandedChild] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/parent/dashboard");
      const d = await res.json();
      if (res.ok) setChildren(d.children ?? []);
      else toast.error(d.error ?? "Could not load dashboard");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveSettings() {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/parent/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Save failed");
      toast.success("Settings saved");
      if (d.settings) setSettings(d.settings);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save settings");
    } finally {
      setSavingSettings(false);
    }
  }

  if (user?.role !== "PARENT" && user?.role !== "ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-rose-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="w-5 h-5" /> Access Denied
            </CardTitle>
            <CardDescription>
              You need a Parent or Admin account to view this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setView("world")} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to World
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Shield className="w-7 h-7 text-purple-600" /> Parent Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoring your children&apos;s learning and safety.
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

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard icon={Shield} label="Children" value={children.length} color="text-purple-600" />
        <SummaryCard icon={Target} label="Total Questions" value={children.reduce((s, c) => s + c.questionsAnswered, 0)} color="text-emerald-600" />
        <SummaryCard icon={AlertTriangle} label="Open Actions" value={children.reduce((s, c) => s + c.recentModerationActions.filter((a) => a.active).length, 0)} color="text-rose-600" />
        <SummaryCard icon={Clock} label="Time 7d (min)" value={children.reduce((s, c) => s + c.timeSpentMin7d, 0)} color="text-sky-600" />
      </div>

      {/* Children list */}
      <div className="space-y-4 mb-6">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-48" />)
        ) : children.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No children linked to your account yet.
              Have your child register and add your email during sign-up.
            </CardContent>
          </Card>
        ) : (
          children.map((child) => (
            <ChildCard
              key={child.userId}
              child={child}
              expanded={expandedChild === child.userId}
              onToggle={() => setExpandedChild((p) => (p === child.userId ? null : child.userId))}
            />
          ))
        )}
      </div>

      {/* Settings */}
      <SettingsPanel
        settings={settings}
        onChange={setSettings}
        onSave={saveSettings}
        saving={savingSettings}
      />
    </div>
  );
}

// ============================================================
// Summary Card
// ============================================================
function SummaryCard({ icon: Icon, label, value, color }: {
  icon: typeof Shield; label: string; value: number; color: string;
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
// Child Card
// ============================================================
function ChildCard({ child, expanded, onToggle }: {
  child: ChildData; expanded: boolean; onToggle: () => void;
}) {
  const accuracyPct = Math.round(child.accuracy * 100);
  const activeActions = child.recentModerationActions.filter((a) => a.active);

  return (
    <Card className={`border-2 ${activeActions.length > 0 ? "border-rose-300" : "border-border"}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-xl text-white">
              🧒
            </div>
            <div>
              <CardTitle className="text-lg">{child.displayName}</CardTitle>
              <CardDescription className="text-xs">@{child.username}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Zap className="w-3 h-3 text-amber-500" /> Lvl {child.level}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Coins className="w-3 h-3 text-yellow-500" /> {child.xp} XP
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Stat icon={Target} label="Questions" value={`${child.questionsAnswered}`} color="text-emerald-600" />
          <Stat icon={CheckCircle2} label="Accuracy" value={`${accuracyPct}%`} color="text-amber-600" />
          <Stat icon={Clock} label="Time 7d" value={`${child.timeSpentMin7d}m`} color="text-sky-600" />
        </div>

        {/* Active moderation actions (if any) */}
        {activeActions.length > 0 && (
          <div className="rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 p-3">
            <p className="text-xs font-medium text-rose-700 dark:text-rose-400 mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Active Moderation Actions
            </p>
            <div className="space-y-1">
              {activeActions.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-xs">
                  <Badge variant="outline" className={`text-[10px] ${ACTION_COLOR[a.actionType] ?? ""}`}>
                    {a.actionType}
                  </Badge>
                  <span className="text-muted-foreground line-clamp-1 ml-2 flex-1">{a.reason}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weak topics */}
        {child.masteryWeakTopics.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> Needs Practice
            </p>
            <div className="flex flex-wrap gap-1">
              {child.masteryWeakTopics.map((t) => (
                <Badge key={t.topicSlug} variant="outline" className="text-[10px] text-rose-700 border-rose-300">
                  {t.topicName} ({Math.round(t.masteryScore * 100)}%)
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recent chat */}
        {child.recentChatMessages.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Recent Chat
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {child.recentChatMessages.slice(0, 5).map((m) => (
                <div key={m.id} className="text-xs flex items-start gap-2">
                  <Badge className={`text-[9px] ${MOD_BADGE[m.moderationStatus] ?? MOD_BADGE.PENDING}`}>
                    {m.moderationStatus}
                  </Badge>
                  <span className="text-muted-foreground line-clamp-1 flex-1">
                    {m.displayedContent || m.rawContent}
                  </span>
                  <span className="text-[9px] text-muted-foreground flex-shrink-0">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expand toggle */}
        <Collapsible open={expanded} onOpenChange={onToggle}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full">
              {expanded ? (
                <><ChevronUp className="w-4 h-4 mr-1" /> Hide detailed report</>
              ) : (
                <><ChevronDown className="w-4 h-4 mr-1" /> View detailed report</>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-3"
                >
                  <Separator className="mb-3" />
                  <p className="text-xs font-medium mb-2">Full moderation history</p>
                  {child.recentModerationActions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No moderation actions recorded. 🎉</p>
                  ) : (
                    <div className="space-y-1">
                      {child.recentModerationActions.map((a) => (
                        <div key={a.id} className="text-xs flex items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] ${ACTION_COLOR[a.actionType] ?? ""}`}>
                            {a.actionType}
                          </Badge>
                          <span className="text-muted-foreground flex-1 line-clamp-1">{a.reason}</span>
                          <span className={`text-[10px] ${a.active ? "text-rose-600 font-medium" : "text-muted-foreground"}`}>
                            {a.active ? "ACTIVE" : "resolved"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

function Stat({ icon: Icon, label, value, color }: {
  icon: typeof Target; label: string; value: string; color: string;
}) {
  return (
    <div className="rounded-lg bg-muted/40 p-2 text-center">
      <Icon className={`w-5 h-5 mx-auto ${color}`} />
      <p className="font-bold text-sm mt-0.5">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

// ============================================================
// Settings Panel
// ============================================================
function SettingsPanel({ settings, onChange, onSave, saving }: {
  settings: ParentSettings;
  onChange: (s: ParentSettings) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [open, setOpen] = useState(false);

  function update<K extends keyof ParentSettings>(key: K, value: ParentSettings[K]) {
    onChange({ ...settings, [key]: value });
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="w-5 h-5 text-purple-600" /> Parental Controls
                </CardTitle>
                <CardDescription>Manage chat, playtime, and notifications.</CardDescription>
              </div>
              <Button variant="ghost" size="sm">
                {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <Separator />
            {/* Toggles */}
            <div className="grid md:grid-cols-2 gap-3">
              <ToggleRow
                label="Enable chat"
                description="Allow your child to chat with other players"
                checked={settings.chatEnabled}
                onChange={(v) => update("chatEnabled", v)}
              />
              <ToggleRow
                label="Approved friends only"
                description="Restrict chat to pre-approved friends"
                checked={settings.approvedFriendsOnly}
                onChange={(v) => update("approvedFriendsOnly", v)}
              />
              <ToggleRow
                label="Friend approval required"
                description="You must approve new friend requests"
                checked={settings.friendApprovalRequired}
                onChange={(v) => update("friendApprovalRequired", v)}
              />
              <ToggleRow
                label="Weekly report email"
                description="Get a weekly progress summary by email"
                checked={settings.weeklyReportEmail}
                onChange={(v) => update("weeklyReportEmail", v)}
              />
              <ToggleRow
                label="Alert on moderation"
                description="Notify me if my child receives a moderation action"
                checked={settings.alertOnModeration}
                onChange={(v) => update("alertOnModeration", v)}
              />
              <ToggleRow
                label="Alert on friend request"
                description="Notify me when my child gets a friend request"
                checked={settings.alertOnFriendRequest}
                onChange={(v) => update("alertOnFriendRequest", v)}
              />
              <ToggleRow
                label="Share real name"
                description="Allow your child's real name to be visible to friends"
                checked={settings.realNameSharing}
                onChange={(v) => update("realNameSharing", v)}
              />
            </div>

            <Separator />

            {/* Numeric inputs */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="playtime-day">Playtime per day (minutes)</Label>
                <Input
                  id="playtime-day"
                  type="number"
                  min={0}
                  max={1440}
                  value={settings.playtimeMinutesPerDay}
                  onChange={(e) => update("playtimeMinutesPerDay", parseInt(e.target.value || "0", 10))}
                />
              </div>
              <div>
                <Label htmlFor="playtime-session">Playtime per session (minutes)</Label>
                <Input
                  id="playtime-session"
                  type="number"
                  min={0}
                  max={600}
                  value={settings.playtimeMinutesPerSession}
                  onChange={(e) => update("playtimeMinutesPerSession", parseInt(e.target.value || "0", 10))}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="outline" onClick={() => onChange(DEFAULT_SETTINGS)}>Reset</Button>
            <Button onClick={onSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save Settings
            </Button>
          </CardFooter>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

export default ParentView;

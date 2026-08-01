"use client";

/**
 * MathVerse — App Shell
 *
 * Wraps every authenticated view with:
 *   - Top bar: logo, brain energy, level/XP, coins, notifications, user menu
 *   - Left sidebar: navigation between World / Practice / Tutor / Avatar / Progress / Quests / Leaderboard
 *                  + Parent / Moderator (role-gated) + Settings + Logout
 *   - Main content area: renders the active view
 *   - Floating notifications (achievement unlocks, etc.)
 *
 * Accessibility:
 *   - Keyboard-navigable sidebar (Tab + Enter)
 *   - ARIA labels on all nav items
 *   - Dyslexia-font / reduced-motion / high-contrast / colorblind mode applied via CSS classes
 *   - Mobile-friendly: sidebar collapses to a slide-out drawer
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetTrigger, SheetTitle,
} from "@/components/ui/sheet";
import {
  Globe, Zap, Trophy, Coins, Bell, Settings, LogOut, User, Menu,
  Sparkles, GraduationCap, Shield, Users, Gamepad2, BookOpen, Target,
  Accessibility, Moon, Sun, Trophy as TrophyIcon, ChevronRight, X,
  Award, Crown, Brain,
} from "lucide-react";
import { useAppStore, type AppView } from "@/stores/app-store";
import { toast } from "sonner";
import { useTheme } from "next-themes";

import { AuthView } from "@/components/auth/auth-view";
import { WorldView } from "@/components/world/world-view";
import { PracticeView } from "@/components/practice/practice-view";
import { AvatarView } from "@/components/avatar/avatar-view";
import { ProgressView } from "@/components/dashboard/progress-view";
import { QuestsView } from "@/components/dashboard/quests-view";
import { LeaderboardView } from "@/components/dashboard/leaderboard-view";
import { ParentView } from "@/components/parent/parent-view";
import { ModeratorView } from "@/components/moderator/moderator-view";

interface NavItem {
  view: AppView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[]; // if specified, only show for these roles
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { view: "world", label: "World", icon: Globe, description: "Explore Mathville" },
  { view: "practice", label: "Practice", icon: Target, description: "Solve math problems" },
  { view: "progress", label: "Progress", icon: Trophy, description: "Your stats & mastery" },
  { view: "quests", label: "Quests", icon: Sparkles, description: "Daily & weekly challenges" },
  { view: "avatar", label: "Avatar", icon: User, description: "Customize your look" },
  { view: "leaderboard", label: "Leaderboard", icon: Crown, description: "Top players" },
  { view: "parent", label: "Parent Dashboard", icon: Shield, roles: ["PARENT"], description: "Monitor your children" },
  { view: "moderator", label: "Moderation", icon: Users, roles: ["MODERATOR", "ADMIN"], description: "Review reports" },
];

export function AppShell() {
  const {
    user, view, setView, dyslexiaFont, reducedMotion, highContrast, colorblindMode,
    toggleDyslexiaFont, toggleReducedMotion, toggleHighContrast, setColorblindMode,
    notifications, dismissNotification, updateUser,
  } = useAppStore();

  const { theme, setTheme } = useTheme();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // === Apply accessibility classes to body ===
  useEffect(() => {
    const body = document.body;
    body.classList.toggle("dyslexia-font", dyslexiaFont);
    body.classList.toggle("reduced-motion", reducedMotion);
    body.classList.toggle("high-contrast", highContrast);
    body.classList.remove("cb-protanopia", "cb-deuteranopia", "cb-tritanopia");
    if (colorblindMode !== "off") body.classList.add(`cb-${colorblindMode}`);
  }, [dyslexiaFont, reducedMotion, highContrast, colorblindMode]);

  // === If not logged in, show auth ===
  if (!user || view === "auth") {
    return <AuthView />;
  }

  const filteredNav = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user.role)
  );

  // Level progress calculation
  const levelXpRequired = (level: number) => Math.floor(100 * Math.pow(level - 1, 1.4));
  const currentLevelXp = levelXpRequired(user.level);
  const nextLevelXp = levelXpRequired(user.level + 1);
  const xpIntoLevel = user.xp - currentLevelXp;
  const xpForNext = nextLevelXp - currentLevelXp;
  const levelProgress = xpForNext > 0 ? (xpIntoLevel / xpForNext) * 100 : 0;

  async function logout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    useAppStore.getState().setUser(null);
    useAppStore.getState().setView("auth");
    toast.success("Logged out. See you soon!");
  }

  // Render the active view
  function renderView() {
    switch (view) {
      case "world": return <WorldView />;
      case "practice": return <PracticeView />;
      case "avatar": return <AvatarView />;
      case "progress": return <ProgressView />;
      case "quests": return <QuestsView />;
      case "leaderboard": return <LeaderboardView />;
      case "parent": return user.role === "PARENT" ? <ParentView /> : <AccessDenied />;
      case "moderator": return (user.role === "MODERATOR" || user.role === "ADMIN") ? <ModeratorView /> : <AccessDenied />;
      default: return <WorldView />;
    }
  }

  const isWorldView = view === "world";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ===== Top Bar ===== */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 gap-2">
          {/* Left: mobile nav + logo */}
          <div className="flex items-center gap-2">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="w-5 h-5" />
                  <span className="sr-only">Open navigation</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <SidebarContent
                  items={filteredNav}
                  activeView={view}
                  onSelect={(v) => { setView(v); setMobileNavOpen(false); }}
                  user={user}
                />
              </SheetContent>
            </Sheet>

            <button
              onClick={() => setView("world")}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 via-amber-400 to-rose-500 flex items-center justify-center text-lg shadow-md">
                🧮
              </div>
              <div className="hidden sm:block text-left">
                <div className="font-extrabold text-base leading-tight bg-gradient-to-r from-emerald-600 to-amber-600 bg-clip-text text-transparent">
                  MathVerse
                </div>
                <div className="text-[10px] text-muted-foreground leading-tight">Where math meets magic</div>
              </div>
            </button>
          </div>

          {/* Center: Level + XP bar */}
          {!isWorldView && (
            <div className="hidden md:flex items-center gap-3 flex-1 max-w-md">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-xs font-bold">
                  {user.level}
                </div>
                <div className="flex-1 min-w-[120px]">
                  <div className="text-[10px] text-muted-foreground leading-none mb-0.5">Level {user.level}</div>
                  <div className="h-2 rounded-full bg-emerald-100 dark:bg-emerald-900 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-emerald-500 to-amber-500"
                      animate={{ width: `${levelProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {xpIntoLevel}/{xpForNext} XP
                </div>
              </div>
            </div>
          )}

          {/* Right: stats + user menu */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Brain Energy */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              <Brain className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{user.brainEnergy}</span>
            </div>

            {/* Coins */}
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800">
              <Coins className="w-3.5 h-3.5 text-yellow-600" />
              <span className="text-xs font-bold text-yellow-700 dark:text-yellow-300">{user.coins}</span>
            </div>

            {/* Streak */}
            {user.streak > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800">
                <Zap className="w-3.5 h-3.5 text-orange-600" />
                <span className="text-xs font-bold text-orange-700 dark:text-orange-300">{user.streak}</span>
              </div>
            )}

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-4 h-4" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No new notifications
                  </div>
                ) : (
                  notifications.slice(-10).reverse().map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      className="flex flex-col items-start gap-1 p-3"
                      onClick={() => dismissNotification(n.id)}
                    >
                      <div className="flex items-center gap-2 w-full">
                        {n.icon && <span className="text-lg">{n.icon}</span>}
                        <span className="font-semibold text-sm flex-1">{n.title}</span>
                        <X className="w-3 h-3 text-muted-foreground" />
                      </div>
                      {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-amber-400 text-white text-xs">
                      {user.displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span>{user.displayName}</span>
                  <span className="text-xs text-muted-foreground font-normal">@{user.username}</span>
                  <Badge variant="secondary" className="w-fit mt-1 text-[10px]">{user.role}</Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Settings submenu */}
                <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Accessibility className="w-3 h-3" /> Accessibility
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={toggleDyslexiaFont} className="flex items-center justify-between">
                  <span>Dyslexia-friendly font</span>
                  {dyslexiaFont && <span className="text-emerald-600">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleReducedMotion} className="flex items-center justify-between">
                  <span>Reduced motion</span>
                  {reducedMotion && <span className="text-emerald-600">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleHighContrast} className="flex items-center justify-between">
                  <span>High contrast</span>
                  {highContrast && <span className="text-emerald-600">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Colorblind mode</DropdownMenuLabel>
                {(["off", "protanopia", "deuteranopia", "tritanopia"] as const).map((m) => (
                  <DropdownMenuItem
                    key={m}
                    onClick={() => setColorblindMode(m)}
                    className="flex items-center justify-between"
                  >
                    <span className="capitalize">{m === "off" ? "Off" : m}</span>
                    {colorblindMode === m && <span className="text-emerald-600">✓</span>}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />

                {/* Theme toggle */}
                <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  {theme === "dark" ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                  {theme === "dark" ? "Light mode" : "Dark mode"}
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-rose-600 focus:text-rose-700">
                  <LogOut className="w-4 h-4 mr-2" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ===== Body: sidebar + main content ===== */}
      <div className="flex-1 flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-60 flex-col border-r border-border bg-sidebar">
          <SidebarContent
            items={filteredNav}
            activeView={view}
            onSelect={setView}
            user={user}
          />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className={`h-full ${isWorldView ? "" : "overflow-y-auto"}`}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ===== Floating notifications (achievements etc.) ===== */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {notifications.filter((n) => n.type === "achievement").slice(-3).map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 30, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.8 }}
              className="pointer-events-auto"
            >
              <div className="bg-gradient-to-r from-amber-400 to-rose-500 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-[280px] max-w-sm border-2 border-white/30">
                <div className="text-3xl">{n.icon ?? "🏆"}</div>
                <div className="flex-1">
                  <div className="text-xs opacity-90 font-medium">Achievement Unlocked!</div>
                  <div className="font-bold text-sm">{n.title}</div>
                  {n.body && <div className="text-xs opacity-90">{n.body}</div>}
                </div>
                <button
                  onClick={() => dismissNotification(n.id)}
                  className="text-white/80 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================
// SIDEBAR CONTENT (shared between desktop + mobile sheet)
// ============================================================

function SidebarContent({
  items, activeView, onSelect, user,
}: {
  items: NavItem[];
  activeView: AppView;
  onSelect: (v: AppView) => void;
  user: { displayName: string; username: string; role: string; level: number; xp: number };
}) {
  return (
    <div className="flex flex-col h-full">
      {/* User card at top */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-amber-400 text-white">
              {user.displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{user.displayName}</div>
            <div className="text-xs text-muted-foreground truncate">Lv {user.level} · {user.xp} XP</div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto mv-scroll">
        {items.map((item) => {
          const isActive = activeView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => onSelect(item.view)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  : "hover:bg-sidebar-accent text-sidebar-foreground"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "" : "text-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{item.label}</div>
                <div className={`text-[10px] truncate ${isActive ? "opacity-80" : "text-muted-foreground"}`}>
                  {item.description}
                </div>
              </div>
              {isActive && <ChevronRight className="w-3 h-3" />}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="text-[10px] text-muted-foreground text-center">
          MathVerse v1.0 · Child-safe ✨
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ACCESS DENIED (for role-gated views)
// ============================================================

function AccessDenied() {
  const setView = useAppStore((s) => s.setView);
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <Shield className="w-16 h-16 text-rose-400 mb-4" />
      <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
      <p className="text-muted-foreground mb-4">
        You don&apos;t have permission to view this page.
      </p>
      <Button onClick={() => setView("world")}>
        Back to World
      </Button>
    </div>
  );
}

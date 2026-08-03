"use client";

/**
 * MANAHAD — Auth Screen
 *
 * Two-tab cozy card:  🧒 Student   |   🔒 Admin
 *
 *   Student tab
 *     - Login:     username + password (student or parent password both work)
 *     - Register:  username (required), student password (4+), parent password (6+, optional),
 *                  parent email (optional)
 *
 *   Admin tab
 *     - Login:     username + password → opens Admin Dashboard
 *
 * After login, route by `loginMode`:
 *   STUDENT → world,  PARENT → parent,  ADMIN → moderator
 *
 * Cozy aesthetic: rounded-3xl cards, rounded-full buttons, soft gradients.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAppStore } from "@/stores/app-store";
import { toast } from "sonner";
import {
  Brain, Trophy, Users, Shield, LogIn, UserPlus, Zap, GraduationCap, Lock,
} from "lucide-react";
import type { UserSession } from "@/lib/types";

type TopTab = "student" | "admin";
type StudentMode = "login" | "register";

export function AuthView() {
  const [topTab, setTopTab] = useState<TopTab>("student");
  const [studentMode, setStudentMode] = useState<StudentMode>("login");

  // Student login fields
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Student register fields
  const [regUsername, setRegUsername] = useState("");
  const [regStudentPassword, setRegStudentPassword] = useState("");
  const [regParentPassword, setRegParentPassword] = useState("");
  const [regParentEmail, setRegParentEmail] = useState("");

  // Admin login fields
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const setUser = useAppStore((s) => s.setUser);
  const setView = useAppStore((s) => s.setView);

  function routeByLoginMode(user: UserSession) {
    if (user.loginMode === "ADMIN") setView("moderator");
    else if (user.loginMode === "PARENT") setView("parent");
    else setView("world");
  }

  async function submitStudentLogin(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          username: loginUsername.trim(),
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Login failed");
        return;
      }
      setUser(data.user);
      toast.success(`Welcome, ${data.user.displayName}!`);
      routeByLoginMode(data.user as UserSession);
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function submitStudentRegister(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          username: regUsername.trim(),
          studentPassword: regStudentPassword,
          parentPassword: regParentPassword || undefined,
          parentEmail: regParentEmail || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Registration failed");
        return;
      }
      setUser(data.user);
      toast.success(`Welcome to MANAHAD, ${data.user.displayName}!`);
      routeByLoginMode(data.user as UserSession);
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function submitAdminLogin(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          username: adminUsername.trim(),
          password: adminPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Admin login failed");
        return;
      }
      const u = data.user as UserSession;
      if (u.loginMode !== "ADMIN") {
        toast.error("This account is not an admin.");
        return;
      }
      setUser(u);
      toast.success(`Welcome back, Admin.`);
      routeByLoginMode(u);
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function quickStudentLogin() {
    setLoginUsername("alex");
    setLoginPassword("password123");
    setStudentMode("login");
    // Defer so state has settled before we fire the request.
    setTimeout(() => {
      void quickFire("alex", "password123");
    }, 50);
  }

  async function quickFire(username: string, password: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        // If the quick-login user doesn't exist, register them on the fly.
        if ((data.error ?? "").toLowerCase().includes("not found")) {
          const regRes = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "register",
              username,
              studentPassword: password,
            }),
          });
          const regData = await regRes.json();
          if (!regRes.ok) {
            toast.error(regData.error ?? "Quick login failed");
            return;
          }
          setUser(regData.user);
          toast.success(`Welcome to MANAHAD, ${regData.user.displayName}!`);
          routeByLoginMode(regData.user as UserSession);
          return;
        }
        toast.error(data.error ?? "Login failed");
        return;
      }
      setUser(data.user);
      toast.success(`Welcome, ${data.user.displayName}!`);
      routeByLoginMode(data.user as UserSession);
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-amber-50 to-rose-50 dark:from-slate-900 dark:via-emerald-950 dark:to-slate-900 relative overflow-hidden">
      {/* Floating math symbols */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[
          { icon: "+", x: "10%", y: "15%", delay: 0 },
          { icon: "×", x: "85%", y: "20%", delay: 0.3 },
          { icon: "÷", x: "15%", y: "75%", delay: 0.6 },
          { icon: "√", x: "80%", y: "70%", delay: 0.9 },
          { icon: "π", x: "50%", y: "8%", delay: 1.2 },
          { icon: "∑", x: "92%", y: "45%", delay: 1.5 },
          { icon: "∞", x: "5%", y: "45%", delay: 1.8 },
        ].map((s, i) => (
          <motion.div
            key={i}
            className="absolute text-5xl opacity-15 dark:opacity-25 font-bold text-emerald-700"
            style={{ left: s.x, top: s.y }}
            animate={{ y: [0, -20, 0], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 6, delay: s.delay, repeat: Infinity }}
          >
            {s.icon}
          </motion.div>
        ))}
      </div>

      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 relative z-10">
        {/* Left: hero copy */}
        <div className="flex flex-col justify-center space-y-6 p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500 via-amber-400 to-rose-500 flex items-center justify-center text-3xl shadow-xl mv-float">
                🧮
              </div>
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 via-amber-600 to-rose-600 bg-clip-text text-transparent">
                  MANAHAD
                </h1>
                <p className="text-sm text-muted-foreground">Where math meets magic ✨</p>
              </div>
            </div>
            <h2 className="text-3xl font-bold leading-tight">
              The multiplayer world where <span className="text-emerald-600">learning feels like play</span>.
            </h2>
            <p className="text-lg text-muted-foreground">
              Hang out with friends. Customize your avatar. Explore magical worlds.
              Master math — all without it ever feeling like homework.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {[
                { icon: Brain, label: "Brain Energy", color: "text-emerald-600" },
                { icon: Trophy, label: "Achievements", color: "text-amber-600" },
                { icon: Users, label: "Play with Friends", color: "text-rose-600" },
                { icon: Shield, label: "Child-Safe", color: "text-purple-600" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-2 p-2 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-white/40 dark:border-white/10">
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                  <span className="text-sm font-medium">{f.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right: auth card */}
        <Card className="shadow-2xl border-2 border-white/50 dark:border-white/10 backdrop-blur-md bg-white/80 dark:bg-card/80 rounded-3xl">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to MANAHAD</CardTitle>
            <CardDescription>
              Pick a path to continue your adventure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={topTab} onValueChange={(v) => setTopTab(v as TopTab)}>
              <TabsList className="grid w-full grid-cols-2 mb-4 rounded-full">
                <TabsTrigger value="student" className="rounded-full">
                  <GraduationCap className="w-4 h-4 mr-1.5" /> Student
                </TabsTrigger>
                <TabsTrigger value="admin" className="rounded-full">
                  <Lock className="w-4 h-4 mr-1.5" /> Admin
                </TabsTrigger>
              </TabsList>

              {/* === STUDENT TAB === */}
              <TabsContent value="student" className="space-y-3">
                <Tabs value={studentMode} onValueChange={(v) => setStudentMode(v as StudentMode)}>
                  <TabsList className="grid w-full grid-cols-2 mb-4 rounded-full">
                    <TabsTrigger value="login" className="rounded-full">
                      <LogIn className="w-4 h-4 mr-1.5" /> Login
                    </TabsTrigger>
                    <TabsTrigger value="register" className="rounded-full">
                      <UserPlus className="w-4 h-4 mr-1.5" /> Register
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="space-y-3">
                    <form onSubmit={submitStudentLogin} className="space-y-3">
                      <div>
                        <Label htmlFor="stu-username">Username</Label>
                        <Input
                          id="stu-username"
                          value={loginUsername}
                          onChange={(e) => setLoginUsername(e.target.value)}
                          placeholder="alex"
                          autoComplete="username"
                          required
                          className="rounded-2xl"
                        />
                      </div>
                      <div>
                        <Label htmlFor="stu-password">Password</Label>
                        <Input
                          id="stu-password"
                          type="password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Use your student or parent password"
                          autoComplete="current-password"
                          required
                          className="rounded-2xl"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full rounded-full"
                        disabled={loading}
                      >
                        {loading ? "Signing in..." : "Sign In"}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="register" className="space-y-3">
                    <form onSubmit={submitStudentRegister} className="space-y-3">
                      <div>
                        <Label htmlFor="reg-username">Username <span className="text-rose-500">*</span></Label>
                        <Input
                          id="reg-username"
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value)}
                          placeholder="cool_math_kid"
                          required
                          minLength={3}
                          className="rounded-2xl"
                        />
                      </div>
                      <div>
                        <Label htmlFor="reg-student-password">Student Password <span className="text-rose-500">*</span></Label>
                        <Input
                          id="reg-student-password"
                          type="password"
                          value={regStudentPassword}
                          onChange={(e) => setRegStudentPassword(e.target.value)}
                          placeholder="At least 4 characters"
                          required
                          minLength={4}
                          className="rounded-2xl"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Used by the student to log in.
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="reg-parent-password">Parent Password (optional)</Label>
                        <Input
                          id="reg-parent-password"
                          type="password"
                          value={regParentPassword}
                          onChange={(e) => setRegParentPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          minLength={6}
                          className="rounded-2xl"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">
                          If set, parents can log in with the same username to view reports.
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="reg-parent-email">Parent Email (optional)</Label>
                        <Input
                          id="reg-parent-email"
                          type="email"
                          value={regParentEmail}
                          onChange={(e) => setRegParentEmail(e.target.value)}
                          placeholder="parent@example.com"
                          className="rounded-2xl"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full rounded-full"
                        disabled={loading}
                      >
                        {loading ? "Creating account..." : "Create Account"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>

                {/* Demo hint */}
                <div className="mt-6 pt-4 border-t rounded-2xl bg-muted/40 -mx-2 px-4 py-3">
                  <p className="text-xs text-muted-foreground text-center mb-2 flex items-center justify-center gap-1">
                    <Zap className="w-3 h-3" /> Quick demo
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={quickStudentLogin}
                    className="w-full rounded-full flex items-center justify-center gap-2"
                  >
                    <GraduationCap className="w-4 h-4 text-emerald-600" />
                    <span>Try: alex / password123</span>
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center mt-2">
                    We&apos;ll create the demo account for you if it doesn&apos;t exist yet.
                  </p>
                </div>
              </TabsContent>

              {/* === ADMIN TAB === */}
              <TabsContent value="admin" className="space-y-3">
                <form onSubmit={submitAdminLogin} className="space-y-3">
                  <div>
                    <Label htmlFor="admin-username">Admin Username</Label>
                    <Input
                      id="admin-username"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="admin username"
                      autoComplete="username"
                      required
                      className="rounded-2xl"
                    />
                  </div>
                  <div>
                    <Label htmlFor="admin-password">Password</Label>
                    <Input
                      id="admin-password"
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      className="rounded-2xl"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full rounded-full"
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : (
                      <span className="flex items-center justify-center gap-2">
                        <Lock className="w-4 h-4" /> Access Admin Dashboard
                      </span>
                    )}
                  </Button>
                </form>

                <div className="mt-4 pt-4 border-t">
                  <p className="text-[11px] text-muted-foreground text-center">
                    Admins manage users, view platform stats, and review moderation actions.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

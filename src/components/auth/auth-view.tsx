"use client";

/**
 * MathVerse — Auth Screen
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
  Brain, Trophy, Users, Shield, GraduationCap, LogIn, UserPlus, Zap,
} from "lucide-react";

type Role = "CHILD" | "PARENT" | "MODERATOR";

export function AuthView() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<Role>("CHILD");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const setUser = useAppStore((s) => s.setUser);
  const setView = useAppStore((s) => s.setView);

  async function submit(e?: React.FormEvent, overrideEmail?: string, overridePassword?: string, overrideMode?: "login" | "register") {
    e?.preventDefault();
    setLoading(true);
    const emailToUse = overrideEmail ?? email;
    const passwordToUse = overridePassword ?? password;
    const modeToUse = overrideMode ?? mode;
    try {
      const body =
        modeToUse === "login"
          ? { action: "login", email: emailToUse, password: passwordToUse }
          : {
              action: "register",
              email: emailToUse,
              password: passwordToUse,
              username,
              displayName: displayName || username,
              role,
              parentEmail: role === "CHILD" ? parentEmail : undefined,
            };

      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Authentication failed");
        return;
      }
      setUser(data.user);
      toast.success(`Welcome, ${data.user.displayName}!`);
      if (data.user.role === "PARENT") setView("parent");
      else if (data.user.role === "MODERATOR") setView("moderator");
      else setView("world");
    } catch (err) {
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function quickLogin(em: string) {
    setEmail(em);
    setPassword("password123");
    setMode("login");
    // Pass all values directly to submit to avoid stale state
    setTimeout(() => submit(undefined, em, "password123", "login"), 100);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-amber-50 to-rose-50 dark:from-slate-900 dark:via-emerald-950 dark:to-slate-900 relative overflow-hidden">
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
        <div className="flex flex-col justify-center space-y-6 p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 via-amber-400 to-rose-500 flex items-center justify-center text-3xl shadow-xl mv-float">
                🧮
              </div>
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 via-amber-600 to-rose-600 bg-clip-text text-transparent">
                  MathVerse
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
                <div key={f.label} className="flex items-center gap-2 p-2 rounded-lg bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-white/40 dark:border-white/10">
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                  <span className="text-sm font-medium">{f.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <Card className="shadow-2xl border-2 border-white/50 dark:border-white/10 backdrop-blur-md bg-white/80 dark:bg-card/80">
          <CardHeader>
            <CardTitle className="text-2xl">{mode === "login" ? "Welcome Back!" : "Join MathVerse"}</CardTitle>
            <CardDescription>
              {mode === "login" ? "Sign in to continue your adventure" : "Create an account to start playing and learning"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "register")}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login"><LogIn className="w-4 h-4 mr-1" /> Login</TabsTrigger>
                <TabsTrigger value="register"><UserPlus className="w-4 h-4 mr-1" /> Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-3">
                <form onSubmit={submit} className="space-y-3">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@mathverse.demo" required />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-3">
                <form onSubmit={submit} className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {(["CHILD", "PARENT", "MODERATOR"] as Role[]).map((r) => (
                      <Button
                        key={r}
                        type="button"
                        variant={role === r ? "default" : "outline"}
                        size="sm"
                        onClick={() => setRole(r)}
                        className="flex flex-col gap-1 h-auto py-2"
                      >
                        {r === "CHILD" ? <GraduationCap className="w-4 h-4" /> : r === "PARENT" ? <Shield className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                        <span className="text-xs">{r === "CHILD" ? "Child" : r === "PARENT" ? "Parent" : "Moderator"}</span>
                      </Button>
                    ))}
                  </div>
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="cool_math_kid" required minLength={3} />
                  </div>
                  <div>
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Alex" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@example.com" required />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} />
                  </div>
                  {role === "CHILD" && (
                    <div>
                      <Label htmlFor="parentEmail">Parent&apos;s Email (optional)</Label>
                      <Input id="parentEmail" type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} placeholder="parent@example.com" />
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center mb-2 flex items-center justify-center gap-1">
                <Zap className="w-3 h-3" /> Quick demo logins:
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" onClick={() => quickLogin("alex@mathverse.demo")} className="flex flex-col gap-0.5 h-auto py-2">
                  <GraduationCap className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs">Child</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => quickLogin("parent@mathverse.demo")} className="flex flex-col gap-0.5 h-auto py-2">
                  <Shield className="w-4 h-4 text-purple-600" />
                  <span className="text-xs">Parent</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => quickLogin("mod@mathverse.demo")} className="flex flex-col gap-0.5 h-auto py-2">
                  <Users className="w-4 h-4 text-rose-600" />
                  <span className="text-xs">Mod</span>
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Password: <code className="bg-muted px-1 py-0.5 rounded">password123</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

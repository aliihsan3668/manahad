"use client";

import { useEffect, useState } from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "@/components/shell/app-shell";
import { useAppStore } from "@/stores/app-store";

/**
 * MANAHAD — Main Page
 *
 * Single-page application entry point.
 * On mount, fetches the current session and renders the AppShell.
 */

function Inner() {
  const setUser = useAppStore((s) => s.setUser);
  const setView = useAppStore((s) => s.setView);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) {
          if (data.user) {
            setUser(data.user);
            // Route by loginMode (defaulting to STUDENT if absent).
            const mode = data.user.loginMode ?? "STUDENT";
            if (mode === "ADMIN") setView("moderator");
            else if (mode === "PARENT") setView("parent");
            else setView("world");
          } else {
            setUser(null);
            setView("auth");
          }
        }
      } catch {
        // Network error — show auth as fallback
        if (!cancelled) setView("auth");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [setUser, setView]);

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-amber-50 to-rose-50 dark:from-slate-900 dark:via-emerald-950 dark:to-slate-900">
        <div className="text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 via-amber-400 to-rose-500 flex items-center justify-center text-4xl shadow-xl mv-float mx-auto mb-4">
            🧮
          </div>
          <div className="text-2xl font-extrabold bg-gradient-to-r from-emerald-600 via-amber-600 to-rose-600 bg-clip-text text-transparent">
            MANAHAD
          </div>
          <div className="text-sm text-muted-foreground mt-2">Loading the magic...</div>
          <div className="mt-4 w-48 h-1 rounded-full bg-emerald-100 dark:bg-emerald-900 overflow-hidden mx-auto">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 mv-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  return <AppShell />;
}

export default function Home() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <Inner />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

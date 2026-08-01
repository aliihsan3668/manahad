/**
 * MathVerse — Global UI Store (Zustand)
 *
 * Tracks:
 *   - Current user session
 *   - Active view (world / practice / tutor / avatar / progress / parent / moderator)
 *   - Theme + accessibility settings (dyslexia font, reduced motion, colorblind mode, high contrast)
 *   - Brain Energy + XP + level (live updates during play)
 *   - Notifications (toast queue)
 */

import { create } from "zustand";
import type { UserSession } from "@/lib/types";

export type AppView =
  | "auth"
  | "world"
  | "practice"
  | "tutor"
  | "avatar"
  | "progress"
  | "quests"
  | "parent"
  | "moderator"
  | "leaderboard";

export interface AppNotification {
  id: string;
  type: "success" | "error" | "info" | "achievement";
  title: string;
  body?: string;
  icon?: string;
}

interface AppState {
  // session
  user: UserSession | null;
  setUser: (user: UserSession | null) => void;
  updateUser: (patch: Partial<UserSession>) => void;

  // navigation
  view: AppView;
  setView: (v: AppView) => void;

  // accessibility
  dyslexiaFont: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  colorblindMode: "off" | "protanopia" | "deuteranopia" | "tritanopia";
  toggleDyslexiaFont: () => void;
  toggleReducedMotion: () => void;
  toggleHighContrast: () => void;
  setColorblindMode: (m: AppState["colorblindMode"]) => void;

  // notifications
  notifications: AppNotification[];
  pushNotification: (n: Omit<AppNotification, "id">) => void;
  dismissNotification: (id: string) => void;

  // practice state (active topic, difficulty)
  activeTopicSlug: string | null;
  activeDifficulty: number;
  setActivePractice: (slug: string, difficulty: number) => void;

  // world state
  currentArea: string;
  setCurrentArea: (area: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  updateUser: (patch) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...patch } : null,
    })),

  view: "auth",
  setView: (view) => set({ view }),

  dyslexiaFont: false,
  reducedMotion: false,
  highContrast: false,
  colorblindMode: "off",
  toggleDyslexiaFont: () => set((s) => ({ dyslexiaFont: !s.dyslexiaFont })),
  toggleReducedMotion: () => set((s) => ({ reducedMotion: !s.reducedMotion })),
  toggleHighContrast: () => set((s) => ({ highContrast: !s.highContrast })),
  setColorblindMode: (m) => set({ colorblindMode: m }),

  notifications: [],
  pushNotification: (n) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { ...n, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
      ],
    })),
  dismissNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  activeTopicSlug: null,
  activeDifficulty: 3,
  setActivePractice: (slug, difficulty) =>
    set({ activeTopicSlug: slug, activeDifficulty: difficulty }),

  currentArea: "town",
  setCurrentArea: (area) => set({ currentArea: area }),
}));

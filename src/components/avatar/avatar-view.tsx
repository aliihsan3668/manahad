"use client";

/**
 * MANAHAD — Avatar Customization View
 *
 * Left: large emoji-based avatar preview that updates live with equipped items.
 * Right: tabbed grid of all cosmetics per category. Owned items highlight and
 * can be equipped. Unowned items show a "Buy" button with the price.
 */

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/stores/app-store";
import { toast } from "sonner";
import {
  Coins, Check, Lock, Sparkles, ArrowLeft, Loader2, ShoppingBag,
  Shirt, Crown, Footprints, Backpack, Cat, Sparkle, Smile, Glasses,
} from "lucide-react";
import {
  COSMETICS, getCosmeticBySlug, getCosmeticsByCategory,
} from "@/lib/game/cosmetics";
import type { CosmeticDef } from "@/lib/game/cosmetics";
import type { AvatarConfig } from "@/lib/types";

const CATEGORIES: { id: CosmeticDef["category"]; label: string; icon: typeof Shirt }[] = [
  { id: "HAIR", label: "Hair", icon: Sparkle },
  { id: "HAT", label: "Hat", icon: Crown },
  { id: "OUTFIT", label: "Outfit", icon: Shirt },
  { id: "ACCESSORY", label: "Accessory", icon: Glasses },
  { id: "SHOES", label: "Shoes", icon: Footprints },
  { id: "BACKPACK", label: "Backpack", icon: Backpack },
  { id: "PET", label: "Pet", icon: Cat },
  { id: "TRAIL", label: "Trail", icon: Sparkles },
  { id: "EMOTE", label: "Emote", icon: Smile },
];

const RARITY_COLORS: Record<CosmeticDef["rarity"], string> = {
  COMMON: "border-slate-300 dark:border-slate-600",
  RARE: "border-sky-400",
  EPIC: "border-purple-400",
  LEGENDARY: "border-amber-400",
};

const RARITY_BADGE: Record<CosmeticDef["rarity"], string> = {
  COMMON: "bg-slate-100 text-slate-700",
  RARE: "bg-sky-100 text-sky-700",
  EPIC: "bg-purple-100 text-purple-700",
  LEGENDARY: "bg-amber-100 text-amber-700",
};

interface OwnedItem {
  slug: string;
  isEquipped: boolean;
}

export function AvatarView() {
  const user = useAppStore((s) => s.user);
  const updateUser = useAppStore((s) => s.updateUser);
  const setView = useAppStore((s) => s.setView);

  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | null>(user?.avatarConfig ?? null);
  const [owned, setOwned] = useState<OwnedItem[]>([]);
  const [coins, setCoins] = useState<number>(user?.coins ?? 0);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CosmeticDef["category"]>("HAIR");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/avatar");
      const data = await res.json();
      if (res.ok) {
        setAvatarConfig(data.avatarConfig);
        setOwned((data.ownedCosmetics ?? []).map((o: { slug: string; isEquipped: boolean }) => ({
          slug: o.slug,
          isEquipped: o.isEquipped,
        })));
        // Default cosmetics are always "owned" (auto)
        for (const c of COSMETICS) {
          if (c.isDefault && !data.ownedCosmetics.some((o: { slug: string }) => o.slug === c.slug)) {
            setOwned((prev) => [...prev, { slug: c.slug, isEquipped: false }]);
          }
        }
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function isOwned(slug: string): boolean {
    return owned.some((o) => o.slug === slug);
  }
  function isEquipped(slug: string): boolean {
    return owned.some((o) => o.slug === slug && o.isEquipped);
  }

  async function buy(cosmetic: CosmeticDef) {
    if (isOwned(cosmetic.slug)) return;
    if (coins < cosmetic.price) {
      toast.error("Not enough coins — keep practicing to earn more!");
      return;
    }
    if (cosmetic.unlockCriteria?.type === "level") {
      const req = parseInt(cosmetic.unlockCriteria.value, 10);
      if ((user?.level ?? 0) < req) {
        toast.error(`Requires level ${req} to unlock`);
        return;
      }
    }
    setBusySlug(cosmetic.slug);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "buy", cosmeticSlug: cosmetic.slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not buy");
      toast.success(`🎉 Purchased ${cosmetic.name}!`);
      setCoins((c) => c - cosmetic.price);
      updateUser({ coins: (user?.coins ?? 0) - cosmetic.price });
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setBusySlug(null);
    }
  }

  async function equip(cosmetic: CosmeticDef) {
    if (!isOwned(cosmetic.slug)) return;
    setBusySlug(cosmetic.slug);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "equip", cosmeticSlug: cosmetic.slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not equip");
      // Optimistic local update
      setOwned((prev) => prev.map((o) => {
        if (o.slug === cosmetic.slug) return { ...o, isEquipped: true };
        const other = getCosmeticBySlug(o.slug);
        if (other && other.category === cosmetic.category) return { ...o, isEquipped: false };
        return o;
      }));
      // Also update avatarConfig locally for preview
      if (avatarConfig) {
        const cat = cosmetic.category.toLowerCase();
        const key = (cat === "hair" || cat === "outfit" || cat === "shoes") ? cat : cat as keyof AvatarConfig;
        setAvatarConfig({ ...avatarConfig, [key]: cosmetic.slug } as AvatarConfig);
      }
      toast.success(`✅ Equipped ${cosmetic.name}`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Equip failed");
    } finally {
      setBusySlug(null);
    }
  }

  const equippedEmoji = (cat: CosmeticDef["category"]): string => {
    const slug = owned.find((o) => o.isEquipped && getCosmeticBySlug(o.slug)?.category === cat)?.slug;
    if (!slug) {
      const def = COSMETICS.find((c) => c.category === cat && c.isDefault);
      return def?.emoji ?? "✨";
    }
    return getCosmeticBySlug(slug)?.emoji ?? "✨";
  };

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-purple-600" /> Avatar Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dress up your avatar — looks never affect gameplay, just style!
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1 text-base px-3 py-1">
            <Coins className="w-4 h-4 text-yellow-500" /> {coins}
          </Badge>
          <Button variant="ghost" onClick={() => setView("world")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* Avatar preview */}
        <div className="lg:sticky lg:top-6 h-fit">
          <Card className="border-2 bg-gradient-to-b from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/20">
            <CardHeader>
              <CardTitle className="text-lg">Preview</CardTitle>
              <CardDescription>{user?.displayName ?? "Your avatar"}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <AvatarPreview emoji={user?.avatarConfig ? undefined : "🧒"} avatarConfig={avatarConfig} equippedEmoji={equippedEmoji} />
              <div className="mt-4 grid grid-cols-3 gap-2 w-full text-xs text-center">
                <div>
                  <p className="text-muted-foreground">Level</p>
                  <p className="font-bold text-amber-600">{user?.level ?? 1}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">XP</p>
                  <p className="font-bold">{user?.xp ?? 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Coins</p>
                  <p className="font-bold text-yellow-600">{coins}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 text-center">
                Items update instantly when equipped.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Cosmetic catalog */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Wardrobe</CardTitle>
            <CardDescription>Browse, buy, and equip cosmetics.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as CosmeticDef["category"])}>
              <ScrollArea className="w-full whitespace-nowrap">
                <TabsList className="inline-flex h-auto">
                  {CATEGORIES.map((c) => (
                    <TabsTrigger key={c.id} value={c.id} className="flex flex-col items-center gap-1 px-3 py-2">
                      <c.icon className="w-4 h-4" />
                      <span className="text-[10px]">{c.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </ScrollArea>

              {CATEGORIES.map((cat) => (
                <TabsContent key={cat.id} value={cat.id} className="mt-4">
                  <CosmeticGrid
                    cosmetics={getCosmeticsByCategory(cat.id)}
                    owned={isOwned}
                    equipped={isEquipped}
                    coins={coins}
                    busySlug={busySlug}
                    onBuy={buy}
                    onEquip={equip}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// Avatar Preview (emoji stack)
// ============================================================
function AvatarPreview({
  emoji, avatarConfig, equippedEmoji,
}: {
  emoji?: string;
  avatarConfig: AvatarConfig | null;
  equippedEmoji: (cat: CosmeticDef["category"]) => string;
}) {
  // Render layered emojis that suggest the equipped items
  const hat = equippedEmoji("HAT");
  const accessory = equippedEmoji("ACCESSORY");
  const pet = equippedEmoji("PET");
  const trail = equippedEmoji("TRAIL");
  const trailSlug = avatarConfig?.trail;
  const showTrail = trailSlug && trailSlug !== "trail-none";

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="relative w-40 h-40 rounded-full bg-gradient-to-b from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 flex items-center justify-center shadow-inner"
    >
      {/* Trail ring */}
      {showTrail && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: "conic-gradient(from 0deg, #fbbf24, #ef4444, #ec4899, #8b5cf6, #fbbf24)",
            opacity: 0.4,
            filter: "blur(8px)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
      )}
      <div className="relative flex flex-col items-center">
        <div className="text-3xl -mb-2">{hat}</div>
        <div className="text-6xl">{emoji ?? "🧒"}</div>
        <div className="text-2xl -mt-2">{accessory}</div>
      </div>
      {/* Pet */}
      <div className="absolute -bottom-1 -right-1 text-3xl">{pet}</div>
    </motion.div>
  );
}

// ============================================================
// Cosmetic Grid
// ============================================================
function CosmeticGrid({
  cosmetics, owned, equipped, coins, busySlug, onBuy, onEquip,
}: {
  cosmetics: CosmeticDef[];
  owned: (slug: string) => boolean;
  equipped: (slug: string) => boolean;
  coins: number;
  busySlug: string | null;
  onBuy: (c: CosmeticDef) => void;
  onEquip: (c: CosmeticDef) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {cosmetics.map((c) => {
        const isOwned = owned(c.slug);
        const isEquipped = equipped(c.slug);
        const locked = c.unlockCriteria?.type === "level" && !isOwned;
        const canAfford = coins >= c.price;
        return (
          <motion.div
            key={c.slug}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            className={`rounded-xl border-2 bg-card p-3 flex flex-col items-center text-center transition-shadow hover:shadow-md ${RARITY_COLORS[c.rarity]} ${isEquipped ? "ring-2 ring-emerald-500 ring-offset-2" : ""}`}
          >
            <div className="relative">
              <div className="text-4xl mb-1">{c.emoji}</div>
              {isEquipped && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </div>
              )}
              {locked && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-400 text-white flex items-center justify-center">
                  <Lock className="w-3 h-3" />
                </div>
              )}
            </div>
            <p className="text-xs font-semibold mt-1 line-clamp-1">{c.name}</p>
            <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2 min-h-[28px]">
              {c.description}
            </p>
            <Badge className={`text-[10px] mb-2 ${RARITY_BADGE[c.rarity]}`}>{c.rarity}</Badge>

            {isOwned ? (
              isEquipped ? (
                <Button size="sm" variant="secondary" disabled className="w-full">
                  <Check className="w-3 h-3 mr-1" /> Equipped
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEquip(c)}
                  disabled={busySlug === c.slug}
                  className="w-full"
                >
                  {busySlug === c.slug ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                  Equip
                </Button>
              )
            ) : (
              <Button
                size="sm"
                onClick={() => onBuy(c)}
                disabled={busySlug === c.slug || !canAfford || locked}
                className="w-full"
                variant={canAfford && !locked ? "default" : "outline"}
              >
                {busySlug === c.slug ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : locked ? (
                  <Lock className="w-3 h-3 mr-1" />
                ) : (
                  <Coins className="w-3 h-3 mr-1 text-yellow-500" />
                )}
                {locked ? `Lvl ${c.unlockCriteria?.value}` : c.price}
              </Button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

export default AvatarView;

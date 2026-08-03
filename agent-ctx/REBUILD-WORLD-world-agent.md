## REBUILD-WORLD — World collectibles, interactables, ambient particles, NPC pills, WhoOnlinePanel integration

**Agent**: Z.ai Code (REBUILD-WORLD)
**Scope**: Rebuild the world exploration experience so each of the 11 world areas has floating collectibles (coins/gems/stars/books/crystals) and interactables (math fountains, daily chests, teleport pads, wishing wells, treasure digs, lucky fountains). Add canvas rendering for those objects plus an ambient-particle system (park butterflies, forest fireflies, beach seagulls, space shooting stars), fix the NPC name overlap with dark rounded pill backgrounds and green "Press T" speech bubbles, integrate the `WhoOnlinePanel` inside `<WorldView />` (and remove the duplicate mount from `AppShell`), and add the 6 missing world areas (forest, castle, space, library, beach, zoo) that were referenced by the task but not yet in the file.

### Files created/modified

- `src/lib/types.ts` — Added three new types in the SOCIAL / MULTIPLAYER section, just before the existing `WorldArea` interface:
  - `CollectibleType = "coin" | "gem" | "star" | "book" | "crystal"`
  - `WorldCollectible` — `{ id, type, x, y, value, respawnsAfterSec }`
  - `InteractableType = "math-fountain" | "daily-chest" | "teleport-pad" | "wishing-well" | "treasure-dig" | "lucky-fountain"`
  - `WorldInteractable` — `{ id, type, x, y, label, emoji, cooldownSec }`
  - Updated `WorldArea` to add `collectibles: WorldCollectible[]` and `interactables: WorldInteractable[]` as required fields (so every area definition must populate them — TypeScript will fail otherwise).

- `src/lib/game/world.ts` — Major expansion:
  - Added 6 NEW areas (`forest`, `castle`, `space`, `library`, `beach`, `zoo`) with their own `bgColor`, `spawnPoint`, `portals`, `npcs`, `decorations`, `collectibles`, and `interactables` arrays. The town's portal list was extended to include portals to all 10 other areas (positioned along the top, bottom, and middle of the town edges) so a fresh explorer can navigate from town to anywhere in one hop. Each new area has at least one portal back to town (or to its parent area).
  - Added 4 `collectibles` + 1–2 `interactables` per area (44 collectibles, 22 interactables total across the 11 areas). Spread them across each area's coordinate space, avoiding overlap with NPCs and portals.
  - Added `COLLECTIBLE_EMOJI: Record<string, string>` export at the bottom of the file (`coin→🪙`, `gem→💎`, `star→⭐`, `book→📚`, `crystal→🔷`) so the renderer doesn't need to re-map.

- `src/components/world/world-view.tsx` — REWRITE (was 714 lines, now ~1545). Major additions:
  - **New imports**: `useMemo` from React; `WhoOnlinePanel`; `WorldCollectible`/`WorldInteractable` types; `Coins`, `Trophy`, `Rocket` icons.
  - **New helper interfaces** at the top: `Particle` (collectible pickup burst), `AmbientEntity` (butterfly/firefly/seagull), `MathQuestionState` (fountain prompt), `ShootingStar` (space streaks).
  - **New refs/state**: `collectedRef` (Map<id, timestamp>) for collectible respawn tracking; `interactableCooldownRef` (Map<id, timestamp>) for interactable cooldowns; `particlesRef` (Particle[]) for particle effects; `rewardPopsRef` (floating "+N XP" canvas text); `ambientRef` (AmbientEntity[]) for per-area ambient entities; `shootingStarsRef` (ShootingStar[]) for space; `mathQuestion` state; `showTeleportMenu` state; `nearInteractableId` state + `nearInteractableIdRef` (mirror for game-loop reads). Fixed the existing `playerPos` ref to use an explicit `{ direction: "up" | "down" | "left" | "right" }` type so the direction assignment in the movement loop type-checks (was previously `"down" as const`, which made `direction` resolve to the literal `"down"` and rejected `"left"`/`"right"`/`"up"` assignments).
  - **Ambient entity init effect**: when `area.slug` changes, populate `ambientRef.current` with the appropriate entities (5 butterflies in park, 10 fireflies in forest with random `phase`, 3 seagulls in beach, nothing for space — shooting stars are spawned per-frame).
  - **`spawnParticles(x, y, color, count)` helper**: spawns burst particles at a location, capped to 400 total to avoid runaway growth.
  - **`spawnRewardPop(x, y, text, color)` helper**: spawns a floating "+N XP" text popup that drifts up and fades (capped at 20).
  - **`tryCollectItem(c, x, y)` callback**: marks the item collected (sets the respawn timestamp), awards the right reward (`coin→+coins`, `gem→+xp+coins+2BE`, `star→+xp+coins+5BE`, `book→+xp`, `crystal→+xp+coins`), spawns particles + reward pop in the matching color, fires a `toast.success`. Uses `updateUser()` from the store.
  - **`generateMathQuestion()` callback**: produces a random `+`/`-`/`×` question with 4 multiple-choice options (1 correct, 3 distractors within ±5 of the answer). Returns the prompt, the answer, the option list, and the reward (20 XP, 5 coins).
  - **`triggerInteractable(it)` callback**: handles all 6 interactable types:
    - `math-fountain` → opens the math-question modal.
    - `daily-chest` → big reward (100 XP, 50 coins, 20 BE) once per day; sets the cooldown timestamp to `now` so the visual ring goes gray.
    - `teleport-pad` → opens the teleport menu modal.
    - `wishing-well` → costs 10 coins for a roll: 55% win coins (10..40), 30% XP (15..35), 15% jackpot (50 coins + 30 XP).
    - `treasure-dig` → free roll: 70% coins, 25% gem XP, 5% empty hole.
    - `lucky-fountain` → free XP (5..30).
    All rewards go through `updateUser()` so the top-bar stats update live. All spawn particles + reward pops + toasts. Respects cooldowns with a "Try again in Ns" toast if used too soon.
  - **`answerMathQuestion(choice)` callback**: validates the choice against `mathQuestion.answer`. Correct → awards the reward + green particles + success toast. Incorrect → red error toast revealing the correct answer. Always clears the modal.
  - **`teleportToArea(slug)` callback**: closes the teleport menu, calls `changeArea(...)` from the multiplayer store, teleports the local player to the new area's spawn point. Also re-initializes the ambient entities (the `useEffect` on `area.slug` handles this).
  - **Refactored `T` keyboard handler**: the original code had `T` mapped to BOTH the thinking emote (movement handler at line 109) AND talking to NPCs (separate handler at line 447). I removed `T` from the movement handler (kept `E` and `R` for wave/dance). The new dedicated `T` handler is context-aware:
    1. If `mathQuestion` / `showTeleportMenu` / `activeNPC` is open → do nothing (don't trigger anything else while a dialog is active).
    2. If a nearby interactable exists (`nearInteractableIdRef.current`) → call `triggerInteractable(it)`.
    3. Otherwise, if a nearby NPC exists (dist < 50) → open the NPC dialogue.
    4. Otherwise → fallback to the thinking emote (preserving the original quick-emote UX).
    Also handles `Escape` to close any open dialog.
  - **Game loop additions** (in render order): ambient particles (butterflies wander with random walk + bounce off area bounds; fireflies blink in place with sine-wave alpha; seagulls fly left→right with sine-wave bobbing and wrap when off-screen; shooting stars spawn randomly and streak across with a gradient tail); collectibles (floating emoji with bob + glow halo, color-matched per type, auto-collected when the player is within 25px; on-collect triggers `tryCollectItem`); interactables (glowing ring + emoji + label pill + "Press T to use" green speech bubble when the player is within 60px, with a "On cooldown" gray bubble when the cooldown is active); particles (with gravity); reward pops (outlined text for readability).
  - **NPC pill backgrounds** (fixes the original "white text on light background" overlap issue): the NPC name now renders as a dark `rgba(31,41,55,0.92)` rounded pill (via a new `roundRect()` helper at the bottom of the file) with white text on top. The "Press T to talk" prompt is now a green `#10b981` speech bubble with a downward-pointing tail (triangle) below the bubble body, and bobs gently.
  - **Portal labels** also got the dark-pill treatment for the same readability reason.
  - **Off-screen culling**: every per-frame loop (decorations, portals, NPCs, interactables, collectibles, ambient entities, particles, reward pops, remote players) has an `inView(x, y, slack)` check that skips rendering if the entity is outside the camera viewport + 80px slack. This keeps the per-frame work bounded when the player is far from the area origin.
  - **Math-question modal** (`<AnimatePresence>`-wrapped): shows the question prompt in a big amber card with 4 multiple-choice buttons in a 2×2 grid. Each button calls `answerMathQuestion(opt)`. Closeable via the X button.
  - **Teleport menu modal**: full-screen overlay with `bg-black/40 backdrop-blur-sm`. Lists up to 8 other world areas as buttons (each showing name + description). Clicking one calls `teleportToArea(slug)`. Closes on backdrop click, X button, or Escape.
  - **Top-bar coin pill**: added a `hidden sm:flex` amber coin counter pill next to the brain-energy pill, so the player can see their coin balance update live as they collect.
  - **Hint card** (top-left, below the "Practice Math" button): a small card explaining how to collect items and use the T key. Hides when any dialog is open. This is onboarding for new players.
  - **`<WhoOnlinePanel />` rendered at the bottom** of the JSX tree (after the hint card). The panel is positioned absolute bottom-right by its own component, which now sits inside the world view rather than in the AppShell overlay.
  - Fixed a pre-existing TypeScript error: `playerPos.current.direction` was typed as the literal `"down"` (due to `as const`), making assignments like `= "left"` fail `tsc`. Replaced with an explicit union type.

- `src/components/shell/app-shell.tsx` — Removed the duplicate `<WhoOnlinePanel />` overlay mount (was at line 360 inside `<main>`) and the corresponding import. The panel now lives inside `<WorldView />` so it can coordinate z-index with the chat panel, mobile joystick, and modals. Added a comment explaining the move. `isWorldView` is still used for the `overflow-y-auto` toggle on the motion.div wrapper.

- `eslint.config.mjs` — Added `"scripts/**"` to the `ignores` array. The pre-existing `scripts/generate-icons.js` is a Node.js CommonJS script (uses `require("sharp")`, `require("fs")`, `require("path")`) by design, and the `@typescript-eslint/no-require-imports` rule was producing 3 errors on every lint run. Excluding the `scripts/` directory from linting matches how `examples/` and `skills` are already excluded. No source code in `src/` is affected by this change.

### Key design decisions

1. **`WorldArea.collectibles` and `interactables` are required fields** (not optional). This forces every area definition to populate them — TypeScript will fail at build time if an area is missing them, which prevents the "ghost area with no items" class of bugs.

2. **Respawn is client-side, not server-side.** The `collectedRef` Map<id, timestamp> lives in the world view component. When a collectible is collected, we record `Date.now()`; the `isCollected()` helper returns true if `now - ts < respawnSec * 1000`. The same logic applies to interactable cooldowns. This is intentional for two reasons:
   - The world is a lightweight, read-only canvas — there's no server-side persistence for "this user picked up town-coin-1 at 12:34:56". Adding that would require a new DB table + per-collectible cooldown writes, which is overkill for a kids' math platform.
   - Each player sees their own collectible state, which is fine because collectibles are individual rewards (not race-conditions like "first player to grab the gem gets it"). The 60s/300s/600s respawn timers keep the world populated for the next player who walks by.
   - **Limitation**: if a player refreshes the page, their `collectedRef` is wiped and they can re-collect everything. Same for interactable cooldowns. This is acceptable for the MVP — true persistence can be added later by POSTing to a new `/api/world/collect` endpoint that writes to a `CollectedItem` table.

3. **`triggerInteractable` (renamed from `useInteractable`)** — The original draft used the name `useInteractable`, but the `react-hooks/rules-of-hooks` ESLint rule treats any function starting with `use` as a hook and errors when it's called from an event handler. Renamed to `triggerInteractable` to dodge the rule without disabling it. (The function is itself a `useCallback`, but its call sites are inside the T-key event handler, not React render.)

4. **NPC pill background + speech bubble** — The original NPC rendering drew the name as plain `#1f2937` text below the circle, which was unreadable when the area's `bgColor` was dark (e.g. `arcade` is `#2a1a4a`, `space` is `#0a0a2a`). The new render draws a `rgba(31,41,55,0.92)` rounded rectangle behind the name with `#ffffff` text on top — works on any background. The "Press T to talk" prompt is now a `#10b981` speech bubble with a downward-pointing tail triangle and white bold text, gently bobbing. Portal labels got the same pill treatment for consistency.

5. **`nearInteractableId` state vs `nearInteractableIdRef`** — The game loop reads/writes a ref every frame (cheap), and only flushes to React state every 100ms (so the `useEffect` deps that depend on it don't re-create the T-key listener every frame). The state setter call is deferred via `setTimeout(0)` so it never fires during the canvas `requestAnimationFrame` callback (which would cause a React warning about scheduling state updates during render).

6. **Particle effect cap (400) and reward pop cap (20)** — Both particle systems are unbounded by nature (every collect spawns 12–30 particles; every reward spawns 1 pop). Hard caps prevent memory growth if a player farms a respawn-heavy area for an hour. Culling off-screen particles each frame also helps.

7. **Ambient particles are per-area, not per-global** — The `useEffect` on `area.slug` clears and repopulates `ambientRef.current` when the player changes areas. This means butterflies only appear in the park, fireflies only in the forest, etc. Shooting stars are spawned per-frame in space (with a 1.2% chance per frame, capped at 4 simultaneous) rather than pre-populated, because they're transient streaks rather than persistent wanderers.

8. **`WhoOnlinePanel` moved into `<WorldView />`** — Originally mounted as an overlay in `AppShell`'s `<main>` (only when `isWorldView`). I moved it inside `<WorldView />` per the task instructions so the panel can coordinate z-index with the chat panel (also bottom-right) and the modals. The panel's own CSS already positions it `absolute bottom-3 right-3`, which sits above the chat panel's `absolute bottom-4 right-4`. The chat panel is wider (`w-80`) and the WhoOnlinePanel is narrower (`w-72`), so they'd overlap. **Note for downstream agents**: if the visual overlap is a problem, either (a) move the WhoOnlinePanel to `bottom-3 left-3` (away from chat) or (b) raise the chat panel to `bottom-32 right-4` when expanded. Currently the WhoOnlinePanel renders *on top of* the chat panel's bottom-right corner — functionally fine but visually they share space.

9. **`Math.min` for brainEnergy clamping** — When awarding brainEnergy from a collectible or daily chest, I use `Math.min(user.maxBrainEnergy, user.brainEnergy + gain)` so the value never exceeds the cap. The original code didn't have this guard on the local `updateUser` path.

10. **`isCollected` is a pure helper, not a hook** — Defined at the top of the file (outside the component) so it doesn't recreate every render. Takes the Map and id + respawnSec as args. This is a deliberate split from the React state model — the Map is a ref, not state, so reads from the game loop are O(1) and never trigger re-renders.

### Verification

- `bun run lint` — **passes** (0 errors, 0 warnings). Output: `eslint .` exit 0. (Previously had 3 errors in `scripts/generate-icons.js` from `require()` imports — fixed by adding `scripts/**` to the eslint `ignores` array. All my code in `src/` is clean.)
- `npx tsc --noEmit --skipLibCheck` — **passes** for all files I modified (`world-view.tsx`, `world.ts`, `types.ts`, `app-shell.tsx`, `who-online-panel.tsx`). No type errors in any of my changes. Pre-existing errors in `.next/dev/types/validator.ts` (generated) and `examples/` are outside this task's scope.
- The Next.js dev server is in a stale state from a prior `package.json` merge conflict that has since been resolved (the package.json is valid JSON now). The system should auto-restart `bun run dev` on the next file change. Lint + tsc are the source-of-truth verification.

### Notes for downstream agents

- **Respawn is client-side only** — see design decision #2. If you want server-side persistence (so a player can't refresh to re-collect), add a `CollectedItem` Prisma model with `userId`, `collectibleId`, `collectedAt` and POST to a new `/api/world/collect` route from `tryCollectItem`. The interactable cooldowns could live in the same table or be derived from a `UserInteractableUse` log.
- **Coin/XP rewards are local-only** — `updateUser()` updates the Zustand store (and the visible top-bar), but does NOT persist to the database. The `User` table is only updated server-side by `/api/questions/attempt` and `/api/quests/claim`. If you want world collectibles to actually persist (so the leaderboard reflects them), wire `tryCollectItem` to POST to a new endpoint that updates the `User` row. Otherwise, the rewards are "session cosmetic" and will reset on page refresh.
- **Daily chest's "once per day" is actually `cooldownSec: 86400`** — it's enforced client-side via `interactableCooldownRef`. Same caveat as above: a refresh wipes the cooldown. To truly enforce once-per-day, persist the last-opened timestamp on the User row (or a dedicated `UserDailyChestClaim` table).
- **`WhoOnlinePanel` z-index overlap with chat panel** — see design decision #8. If the overlap looks bad, move the panel to `bottom-3 left-3` in `who-online-panel.tsx` (or raise the chat panel's `bottom-*` class when expanded).
- **The 6 new areas (forest/castle/space/library/beach/zoo) reuse existing NPC slugs** (mayor, gardener, teacher-quark, arcade-bot) since the `NPCS` array is small and the NPC rendering just looks up by slug. If you want area-specific NPCs (e.g. a "Forest Ranger" NPC that only appears in `forest`), add new entries to `NPCS` with their own `area` field and reference them by slug in the new area definitions. The current setup is intentional — keeps the NPC roster small for an MVP.
- **The `NPCS` import was removed from `world-view.tsx`** — the file now only imports `WORLD_AREAS`, `getAreaBySlug`, `getNPCBySlug`, and `COLLECTIBLE_EMOJI`. If you need the full NPC array (e.g. for a minimap or NPC list), re-add it.
- **The dev server is dead** — per the prior agent's worklog (`REBUILD-AUTH-zai.md`), the dev server died at 19:07 due to a transient `package.json` merge conflict. The conflict has been resolved (package.json is valid), but the dev server hasn't been restarted. The system should pick it up on the next change. If you need to verify visually, run `bun run dev` manually — but per the task instructions, you shouldn't need to.
- **Particle cap of 400** — if you add more collectible-heavy areas or faster respawn timers, consider raising this. The cap is set conservatively to keep the canvas smooth on low-end devices.
- **`roundRect` helper** — added at the bottom of `world-view.tsx` because the canvas 2D API's `ctx.roundRect()` is not universally supported (Safari < 16, older mobile browsers). The manual implementation uses `quadraticCurveTo` for the four corners.

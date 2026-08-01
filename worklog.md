# MathVerse — Worklog

## API-ROUTES — Backend API surface (Next.js 16 App Router)

**Agent**: Z.ai Code (API-ROUTES)
**Scope**: Build all 19 API routes under `src/app/api/` for the MathVerse platform — curriculum listing, question generation/grading, AI tutor, progress dashboard, leaderboard, avatar/inventory, quests, notifications, parent dashboard, moderator dashboard, world presence, and analytics.

### Files created
```
src/app/api/curriculum/route.ts                  GET   list curricula + topics (public)
src/app/api/questions/generate/route.ts          POST  generate + persist a question
src/app/api/questions/attempt/route.ts           POST  grade answer, update mastery/XP/coins/BE,
                                                    level up, update quests, unlock achievements
src/app/api/tutor/route.ts                       POST  AI tutor chat (loads/stores TutorSession)
src/app/api/progress/route.ts                    GET   full ProgressDashboard DTO
src/app/api/leaderboard/route.ts                 GET   top players by XP (public)
src/app/api/avatar/route.ts                      GET/POST  read/merge avatarConfig
src/app/api/inventory/route.ts                   GET/POST  buy/equip/unequip cosmetics
src/app/api/quests/route.ts                      GET   active quests + user progress
src/app/api/quests/claim/route.ts                POST  claim quest rewards
src/app/api/notifications/route.ts               GET/POST  list + mark-read
src/app/api/parent/dashboard/route.ts            GET   parent view of all children's data
src/app/api/parent/settings/route.ts             POST  update ParentSettings
src/app/api/moderator/dashboard/route.ts         GET   moderation queue
src/app/api/moderator/action/route.ts            POST  warning/mute/suspend/ban/unmute/unsuspend
src/app/api/moderator/appeal/route.ts            POST  approve/deny appeal
src/app/api/world/areas/route.ts                 GET   world areas (public)
src/app/api/world/move/route.ts                  POST  upsert WorldPresence
src/app/api/analytics/route.ts                   POST  track analytics event
```

### Key design decisions

1. **Auth pattern** — Every protected route uses `getCurrentUserOrThrow()` from `@/lib/auth/session`. Role gating (PARENT, MODERATOR/ADMIN) is checked in-route and returns 403 on mismatch. The `getCurrentUser()` helper (nullable variant) is used for the optional-auth `/api/analytics` route.

2. **Question attempt flow** (`/api/questions/attempt`) — The most complex route. It:
   - Loads the question, parses `acceptedAnswers` JSON safely
   - Calls deterministic `gradeAnswer()` for correctness
   - Persists an `Attempt` row
   - Calls `updateMastery()` from the adaptive engine and upserts the `Mastery` row (computes `isWeak`/`isMastered`/spaced-rep `nextReviewAt`)
   - Updates `User` (xp, coins, brainEnergy capped at `maxBrainEnergy`, level via `levelFromXp`, `lastActiveAt`)
   - Updates `DailyStat` for today (upsert + increment)
   - Walks all active `UserQuest`s; for `questions_answered`/`questions_correct`/`perfect_streak` criteria (looked up via `QUEST_TEMPLATES` since the `Quest` table doesn't store criteria), increments and marks completed
   - Recomputes global correct streak from the last 50 attempts (descending), then walks every `Achievement` in DB and — for any newly completed criterion — creates `UserAchievement` with `completed=true, completedAt=now`, awards the achievement's XP/coins, fires a notification, and collects the slug into `achievementsUnlocked`
   - Returns full `AttemptResult` plus `attemptId`

3. **Quest criteria lookup** — `Quest` model in Prisma does NOT have a `criteria` column (only `Achievement` does). I therefore map quest slugs to criteria via the in-memory `QUEST_TEMPLATES` constant from `@/lib/game/achievements`. This keeps the data model lean while still allowing the seeded Quest rows (which use the template slugs) to participate in progress tracking.

4. **JSON-field parsing** — Every `JSON.parse` of a DB JSON column (`avatarConfig`, `acceptedAnswers`, `choices`, `commonMistakes`, `metadata`, `messages`, etc.) is wrapped in `try/catch` with a sensible default (`[]`/`{}`/`DEFAULT_AVATAR`).

5. **Avatar GET** returns both `avatarConfig` (parsed) and `ownedCosmetics` (with cosmetic details). POST merges the partial into the existing config — defaults are filled via `DEFAULT_AVATAR` spread.

6. **Inventory** uses the in-memory `COSMETICS` catalog (`getCosmeticBySlug`) to check `unlockCriteria` (level-gating) before purchase, then uses `db.$transaction` for atomic coin-deduct + item-create. Equip/unequip re-equips defaults on the same category as needed.

7. **Moderator action** handles `UNMUTE`/`UNSUSPEND` by also `updateMany`-ing existing active `MUTE`/`SUSPEND` rows for that user to `active=false` (so the action is itself logged but acts as a "lift"). Warnings are recorded as `active=false`. Expiry is computed for MUTE/SUSPEND when `durationMinutes > 0`.

8. **Appeal review** — On APPROVED, sets the linked `ModerationAction.active=false`. Always notifies the user who filed the appeal.

9. **Parent dashboard** — Includes the full child graph (attempts, masteryRecords, chatMessages, dailyStats, moderationActions) via nested `include`, then aggregates per child in-memory. Filters `dailyStats` to last 7 days for playtime.

10. **Analytics** — Stores `userId` when authenticated, `null` + `anonymized=true` otherwise.

### Verification

- `bun run lint` — passes (no warnings, no errors).
- `npx tsc --noEmit` — passes for all files under `src/app/api/`. (Pre-existing errors in `examples/`, `skills/`, and the `MASTERY` category literal in `src/lib/game/achievements.ts` line 254 are outside this task's scope.)
- All 19 route files exist and are auto-compiled by the running dev server (no errors in `dev.log`).

### Notes for downstream agents

- All routes return JSON; errors come back as `{ error: string }` with appropriate HTTP status (400/401/403/404/500).
- The frontend should call these via relative paths (per the gateway/Caddy rules). For routes that need to hit a different mini-service port, the `XTransformPort` query param must be added — but none of these routes do, since they're all in the Next.js app.
- All protected routes start with `const user = await getCurrentUserOrThrow();` — failure throws `Error("Unauthorized")` which is caught and returns 500. (A 401 vs 500 distinction could be added later by catching the specific error message.)
- Achievement criteria types not covered yet (e.g. social achievements like "add 5 friends") simply won't fire from `/api/questions/attempt`; they'd need their own progress hooks in the relevant endpoints once those endpoints exist.
- Quest criteria types `topics_practiced` and `xp_earned` are intentionally not incremented by `/api/questions/attempt` — those need a separate hook (e.g. topic-practice tracker or XP-earning event source) which is out of scope for this task.

### Worklog template for next agent

Append a section like the one above:
```
## {TASK-ID} — {Short title}

**Agent**: {agent name} ({task id})
**Scope**: {one-paragraph summary}

### Files created/modified
- {path} — {purpose}

### Key design decisions
1. ...

### Verification
- `bun run lint` ...
- `npx tsc --noEmit` ...
- {any other checks}

### Notes for downstream agents
- ...
```

## UI-VIEWS — React UI Views (Practice / Tutor / Avatar / Progress / Quests / Parent / Moderator / Leaderboard)

**Agent**: Z.ai Code (UI-VIEWS)
**Scope**: Build 8 self-contained `'use client'` view components that consume the existing API surface and Zustand store, providing the complete interactive UI for MathVerse learners, parents, and moderators. All views are wired into the `AppView` union via `setView(...)` and are intended to be rendered by the top-level router when its switch lands on the matching view name.

### Files created
- `src/components/practice/practice-view.tsx` — Three-phase practice flow (Setup → Question → Result). Curriculum / grade / topic / difficulty / mode selection; renders MCQ big buttons, numeric/fraction/expression input (Enter-to-submit), word-problem story card; hint button (1 BE cost), inline tutor trigger, timed-mode countdown; result card with green/red spring animation, animated XP/coins/BE counters, mastery bar, explanation, achievements modal overlay, endless-mode auto-advance.
- `src/components/practice/tutor-panel.tsx` — Floating bottom-right chat panel ("Coach Quark 🧑‍🏫"). Spring-animated entrance, chat bubbles, typewriter effect, suggested-action chips, quick-prompt chips, reset button. Calls `POST /api/tutor` with `{message, questionId, sessionId}`.
- `src/components/avatar/avatar-view.tsx` — Avatar studio. Sticky live emoji-stack preview (hat / face / accessory / pet + animated trail ring when trail != `*-none`); tabs for all 9 categories (HAIR/HAT/OUTFIT/ACCESSORY/SHOES/BACKPACK/PET/TRAIL/EMOTE); rarity-colored card grid with buy/equip buttons; level-gated items show lock + requirement. Calls `GET /api/avatar` and `POST /api/inventory` (buy/equip).
- `src/components/dashboard/progress-view.tsx` — Progress dashboard. Hero card with level/XP-progress/streak/brain-energy; stats grid; strongest/weakest topic cards with mastery bars; weekly activity Recharts BarChart; recent achievements list; active quests with inline claim buttons; mastery heatmap grid (5-step color ramp + sr-only labels).
- `src/components/dashboard/quests-view.tsx` — Two tabs (Quests / Achievements). Quests: per-quest card with progress bar, reward badges, claim button when completed. Achievements: header progress + grid of ALL `ACHIEVEMENTS` from catalog with locked/unlocked state, rarity ring/badge, XP/coins reward, completion date.
- `src/components/parent/parent-view.tsx` — Parent dashboard. Role gate (PARENT/ADMIN). Summary cards; per-child card with avatar/level/XP/stats, active-moderation banner, weak topics, recent chat (with status badges), expandable detailed report (Collapsible). Settings panel: 7 toggles + 2 numeric inputs, saved via `POST /api/parent/settings`.
- `src/components/moderator/moderator-view.tsx` — Moderator dashboard. Role gate (MODERATOR/ADMIN). Four tabs (Reports / Flagged / Penalties / Appeals) using shadcn `Table`. Take-Action dialog (Select for actionType + Textarea reason + duration input) calls `POST /api/moderator/action`. Lift button calls UNMUTE/UNSUSPEND via same endpoint. Approve/Deny buttons call `POST /api/moderator/appeal`. Color-coded severity badges.
- `src/components/dashboard/leaderboard-view.tsx` — Animated podium (gold/silver/bronze with crown on #1) + full ranked list; current user's row highlighted; "Practice to climb" CTA.

### Key design decisions
1. **View ↔ store contract** — Every view reads `user`, `view`, `setView` from `useAppStore` and uses `updateUser(...)` to optimistically sync XP/coins/brainEnergy/level back into the global store after each successful API call. This means the practice result card, avatar purchase, and quest-claim all update the visible top-bar stats immediately without a full refetch.
2. **Practice flow state machine** — Single `phase: "setup" | "question" | "result"` state. Setup → question transition happens inside `loadQuestion()`; question → result happens inside `submitAnswer()`. Streak and session counters live in component state (not the store) so they reset per session. The `setActivePractice(slug, difficulty)` store action is fired on every new question so the world view (if it has a "resume practice" entry point) can jump back to the same topic.
3. **Timed mode** — A single `useEffect` interval ticks every 250ms while `phase === "question"`. When `elapsed >= timeLimit` (45s default), it auto-submits. To avoid passing a stale `userAnswer` into the timeout closure, the effect re-subscribes whenever `userAnswer` changes.
4. **Endless mode auto-advance** — When `phase === "result" && mode === "ENDLESS"`, a `setTimeout(loadQuestion, 1800)` gives the learner a moment to see the explanation, then auto-loads the next question. The result card shows "Auto-continuing..." while the timer is pending.
5. **Weak-topics mode** — Calls `GET /api/progress`, picks `weakestTopics[0]`, falls back to the first GRADE_6_TOPICS entry if the user has no weak topics yet. This is fully client-side orchestration on top of existing APIs.
6. **Tutor typewriter effect** — The `typewrite()` helper streams the reply in chunks of `max(2, len/80)` characters every 16ms. A pending message with a blinking caret is rendered as a separate bubble so the user sees the AI "typing". The final complete message is appended to history after the stream finishes, then the partial is cleared. The `sessionId` returned by the API is cached locally and reused for subsequent turns.
7. **Avatar preview** — Instead of pulling in the canvas `renderAvatar` (which is canvas-based and tied to world-frame state), I render an emoji stack (`hat + face + accessory` with a `pet` floating at the bottom-right). The conic-gradient trail ring only renders when `avatarConfig.trail !== "trail-none"`. This keeps the preview lightweight and accessible (no canvas a11y concerns). Equipped state is computed from the `owned[]` array returned by `/api/avatar` plus synthetic default-cosmetic ownership.
8. **Mastery heatmap** — Each cell uses an inline `background: masteryColor(v)` style with a 5-step ramp (red → orange → amber → emerald → dark-emerald). Cells include an `sr-only` span reading "<topic> mastery <n> percent" for screen readers. A legend bar at the bottom shows the ramp.
9. **Recharts weekly activity** — `ResponsiveContainer` + `BarChart` with `CartesianGrid` (horizontal only), `XAxis` tick formatter strips the year for compactness (`date.slice(5)`), `YAxis` disallows decimals, and `RTooltip` shows question count. Wrapped in a 64-tall div for responsiveness.
10. **Parent dashboard collapsible report** — Uses Radix `Collapsible` (via shadcn) so the detailed moderation-action history is hidden by default but expandable per-child. AnimatePresence animates the height transition.
11. **Moderator Take-Action dialog** — Uses shadcn `Dialog` + `Select` + `Textarea` + numeric `Input`. The dialog is reusable: it can be triggered inline from a Reports row (via `DialogTrigger` inside a Button) or controlled externally (`open` prop) for programmatic opening. Action-type icons are looked up from a static map (Bell/MicOff/Pause/Ban). Lift-penalty buttons bypass the dialog and call the action endpoint directly with `UNMUTE`/`UNSUSPEND`; bans cannot be lifted this way (must go through Appeals).
12. **Accessibility** — All interactive elements use real `<button>` / shadcn components with proper `aria-label`s where the icon-only. Tabs, sliders, switches, and select all use the underlying Radix primitives which are keyboard navigable. `sr-only` text added to the mastery heatmap. Color is never the only signal — badges include text labels.
13. **Responsive design** — Every view is mobile-first. The practice setup uses single-column on mobile and 3-column topic grid on `lg`. Avatar studio is single column on mobile, two columns (sticky preview + catalog) on `lg`. Leaderboard podium shrinks to 3-col on mobile. Parent/moderator tables hide non-essential columns on mobile (`hidden md:table-cell`).
14. **Animations** — Framer Motion is used for: practice question/result transitions (`AnimatePresence mode="wait"`), tutor panel slide-up, avatar preview pop-in, leaderboard podium stagger, achievement modal pop, achievement-card stagger, and progress mastery-cell hover. Motion respects the user's `reducedMotion` setting is NOT yet wired in this pass — that's a follow-up; the store has the flag but consumers should gate `animate` props.

### Verification
- `bun run lint` — passes for ALL 8 created files (0 errors, 0 warnings). 3 remaining warnings are in `src/components/world/world-view.tsx` (pre-existing from a prior agent, not in scope).
- `npx tsc --noEmit` — passes for ALL 8 created files. Pre-existing errors in `examples/`, `skills/`, `world-view.tsx`, and `lib/game/achievements.ts:254` (MASTERY category literal) are outside this task's scope and were noted in the prior agent's worklog.
- Dev server compiled successfully (`✓ Compiled` entries in `dev.log`) after each file was written.

### Notes for downstream agents
- **Top-level router** — These views are not yet wired into `src/app/page.tsx` (which still shows the placeholder logo). A future agent should add a switch on `useAppStore(s => s.view)` that renders the matching view. The view names map 1:1 to `AppView` values (`"auth"` → `AuthView`, `"practice"` → `PracticeView`, `"avatar"` → `AvatarView`, `"progress"` → `ProgressView`, `"quests"` → `QuestsView`, `"parent"` → `ParentView`, `"moderator"` → `ModeratorView`, `"leaderboard"` → `LeaderboardView`, `"world"` → `WorldView`, `"tutor"` → no dedicated view, the tutor panel is inline inside `PracticeView`).
- **Auth bootstrapping** — On first load the store has `user: null` and `view: "auth"`. The auth flow sets `user` and `view` together. Views that need auth (all except AuthView) should gracefully render a "not signed in" prompt if `user` is null — currently they assume `user` is populated, which is the case after the auth flow runs.
- **WebSocket for live updates** — The leaderboard and progress view could be made live by subscribing to a websocket mini-service. Currently they poll via `Refresh` button. If you add a real-time push, the `updateUser` store action is the right hook to apply incremental updates.
- **Cosmetic DB sync** — The avatar view assumes the `Cosmetic` table is pre-seeded with all `COSMETICS` slugs (the inventory route relies on `db.cosmetic.findUnique({ where: { slug } })`). If seeding hasn't been done yet, buy/equip will 404. A seed script should iterate `COSMETICS` and `ACHIEVEMENTS` / `QUEST_TEMPLATES` to populate the catalog tables.
- **Recharts bundle** — Recharts adds ~100 KB to the client bundle. The progress view is the only consumer; if bundle size becomes an issue, consider dynamic-importing it.
- **Reduced motion** — The store has a `reducedMotion` flag but no view currently consumes it. To honor it, wrap Framer Motion `animate` props with `reducedMotion ? false : <animation>`. A future polish pass should add this.

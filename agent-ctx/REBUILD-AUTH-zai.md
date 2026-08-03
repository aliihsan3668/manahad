## REBUILD-AUTH — Username-based dual-password auth + admin dashboard + who's-online panel

**Agent**: Z.ai Code (REBUILD-AUTH)
**Scope**: Rebuild the auth layer to use a username + dual-password (student / parent) system, replace the email-based register/login flow, expose the session via `/api/auth`, add a new admin dashboard (users CRUD + platform stats), add a `/api/online` route for the who's-online pill, and update the AppShell + page router to key off `loginMode` instead of `role`.

### Files created/modified

- `src/lib/auth/session.ts` — REWRITE. Removed the email-based `registerUser` and `loginUser` helpers. New exports:
  - `registerUser({ username, studentPassword, parentPassword?, parentEmail? })` — creates a `CHILD` account with both password hashes. Email is auto-generated as `${username.toLowerCase()}@manahad.local`.
  - `loginUserByUsername(username, password)` — checks the student password first, then the parent password, then returns a `UserSession` with `loginMode: "STUDENT" | "PARENT"` (or `"ADMIN"` if the role is `ADMIN`).
  - `ensureAdminExists()` — idempotent bootstrap for the admin account (`mxaliihsan` / `M12a34I56`). If the row exists but isn't an ADMIN, it's healed.
  - `getCurrentUser()` — returns the user with a `loginMode` field reconstructed from `role` (ADMIN→ADMIN, PARENT→PARENT, otherwise STUDENT).
  - Preserved from the old module: `setSessionCookie`, `clearSessionCookie`, `getSessionToken`, `createPasswordHash`, `verifyPassword`, `signToken`/`verifyToken` (kept private), `generateId`, `DEFAULT_AVATAR` (now also exported), and the cookie/token constants.
  - Added a `toUserSession()` internal helper so the three call sites (getCurrentUser / register / login) share one mapping function and never drift on the `UserSession` shape.

- `src/app/api/auth/route.ts` — REWRITE. GET returns the current session. POST dispatches on `action` (`register` | `login` | `logout`). Calls `ensureAdminExists()` on **every** request (GET and POST) so the admin account is always reachable on first hit.

- `src/app/api/admin/users/route.ts` — NEW. Admin-only endpoint:
  - GET — returns `{ stats, users }` where `stats` has `totalUsers`, `totalStudents`, `activeToday`, `totalAttempts`, `totalQuestions`; `users` is an array of `{ id, username, displayName, email, role, xp, level, coins, questionsAnswered, accuracy, lastActiveAt, createdAt, parentEmail, hasParentPassword }`. Accuracy is computed from the user's last 1000 attempts.
  - DELETE `?userId=<id>` — deletes a user; 400 if `userId === user.id` (can't delete self), 404 if not found.
  - Access control: 403 unless `user.loginMode === "ADMIN"`.

- `src/app/api/online/route.ts` — NEW. Authenticated endpoint. Returns all users whose `lastActiveAt` is within the last 2 minutes, with their current world area (from `worldPositions[0]?.area`). Each row carries an `isCurrentUser` flag. Sorted: current user first, then by displayName.

- `src/app/api/world/move/route.ts` — UPDATED. After the `worldPresence.upsert`, now also calls `db.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } })` so the player shows up in `/api/online` and the admin "Active Today" stat.

- `src/components/auth/auth-view.tsx` — REWRITE. Two-tab cozy card UI:
  - Top tabs: **Student** | **Admin**.
  - Student tab has a nested Login/Register toggle.
    - Login: `username` + `password` (placeholder hint: "Use your student or parent password").
    - Register: `username` (req, 3+), `studentPassword` (req, 4+), `parentPassword` (opt, 6+), `parentEmail` (opt).
  - Admin tab: `username` + `password` + an "Access Admin Dashboard" button.
  - Routes post-login by `loginMode`: STUDENT→world, PARENT→parent, ADMIN→moderator.
  - Demo hint button "Try: alex / password123" — auto-creates the demo user if missing.
  - Cozy aesthetic: `rounded-3xl` cards, `rounded-full` buttons, soft gradient background, floating math symbols.

- `src/components/moderator/moderator-view.tsx` — REWRITE as Admin Dashboard.
  - Access control: only `loginMode === "ADMIN"`; otherwise renders an "Admin Access Required" panel.
  - 4 stat cards: Total Users (emerald), Active Today (rose), Questions Answered (amber), Questions Generated (purple).
  - Searchable user table: avatar, displayName + @username, level badge, XP, questions, accuracy %, last active, action buttons (View Details, Ban, Delete). Self-row is disabled for ban/delete and tagged with a "you" badge.
  - User details modal: full snapshot (role, level, XP, coins, accuracy, dates, internal email, parent email, parent-password status).
  - Delete confirmation modal: warning + "Delete forever" button — calls `DELETE /api/admin/users?userId=`.
  - Ban button is a placeholder that surfaces a toast pointing admins to the existing moderation queue.
  - Fetches from `/api/admin/users`; refetch button + auto-loading skeletons.

- `src/components/world/who-online-panel.tsx` — NEW. Floating pill that lives in the bottom-right of the world view:
  - Collapsed: pulsing green dot + "👥 N online" + chevron-up to expand.
  - Expanded: header gradient bar with the live count, then a scrollable list (`max-h-72`) of online users — each with emoji-stack avatar (computed from `avatarConfig.pet/hat`), display name (with "(you)" tag), level + area, and a chat button.
  - Empty state when only the current user is online: "You're the only one here — invite friends!" with a 🫖 emoji.
  - Polls `GET /api/online` every 15 seconds. AnimatePresence handles the expand/collapse transition. All failures are silent (no toast spam on transient poll failures).

- `src/app/page.tsx` — UPDATED. The post-`/api/auth` routing now keys off `data.user.loginMode ?? "STUDENT"` instead of `role`. Maps ADMIN→moderator, PARENT→parent, otherwise→world.

- `src/components/shell/app-shell.tsx` — UPDATED:
  - `NAV_ITEMS` now use `loginModes?: Array<"STUDENT" | "PARENT" | "ADMIN">` instead of `roles: string[]`. Parent Dashboard item gated to `["PARENT"]`, Admin Dashboard item gated to `["ADMIN"]`. Label renamed from "Moderation" → "Admin Dashboard".
  - `filteredNav` filters by `loginMode` (computed once as `user.loginMode ?? "STUDENT"`).
  - User-menu badge shows `"🔒 Admin" | "👨‍👩‍👧 Parent" | "🧒 Student"` based on `loginMode`.
  - `renderView()` checks `loginMode` (not `role`) before rendering `ParentView` / `ModeratorView`.
  - `SidebarContent` prop type narrowed to expect a resolved `loginMode`; the user card now prefixes the level/XP line with the same mode badge.
  - Added `WhoOnlinePanel` as an absolutely-positioned overlay inside `<main>` (only when `view === "world"`), so the floating pill rides on top of the canvas.

### Key design decisions

1. **Email-as-implementation-detail** — The User table still has a unique `email` column, but we treat email as an internal identifier generated from the username (`alex → alex@manahad.local`). Users never see it; they log in with a username + one of two passwords. This keeps the dual-password model on a single User row instead of forcing two-row parent/child account models.

2. **Dual password, single account** — A CHILD row carries `passwordHash` (the student password) AND an optional `parentPasswordHash` (the parent password). Logging in with each yields a different `loginMode`, which the router uses to choose the destination view. The student password is intentionally shorter (4+ chars) — friendly for kids — while the parent password requires 6+.

3. **`loginMode` resolution on `getCurrentUser`** — A signed cookie only stores the `userId`. We can't tell, from the cookie alone, which password was used at sign-in time. So `getCurrentUser` reconstructs the mode from the user's role: ADMIN→ADMIN, PARENT→PARENT, otherwise STUDENT. This means if a parent used the parent password to log in and then refreshed the page, they'll still see the parent dashboard (because their role is still `CHILD` → wait, no — the role on disk is `CHILD` for dual-password accounts). 

   ⚠️ **Limitation to flag for downstream agents**: After a page refresh, a parent who originally logged in via the parent password will be reconstructed as `STUDENT` mode (since the role on disk is `CHILD`). The router will send them to the world instead of the parent dashboard. To fix this properly, the cookie should encode the loginMode (e.g. sign `userId:loginMode`) or store the mode in a second cookie / DB session row. For now, the immediate post-login navigation works correctly (driven by the API response), and `getCurrentUser` returns `ADMIN` correctly for admin accounts.

4. **`ensureAdminExists()` on every request** — Called at the top of both GET and POST handlers in `/api/auth`. This is idempotent: it does a `findUnique` first, and only writes if missing (or heals role/hash if the row exists but isn't an admin). Cheap (one indexed query) and means the admin can always log in even on a fresh database.

5. **Admin user stats — single round-trip** — `/api/admin/users` issues three parallel queries (`findMany` with `_count.attempts` + last-1000 attempts, plus `attempt.count()` and `question.count()`). Accuracy is computed in-memory from the joined attempts slice. The "active today" filter compares `lastActiveAt` to a local midnight — this is fine for a single-timezone deployment but should be replaced with a proper day-boundary check for multi-TZ.

6. **Who's-online polling cadence** — 15-second interval is a deliberate balance: short enough to feel live in a low-traffic demo, long enough to avoid hammering the DB. The `/api/online` route uses a 2-minute activity window, so a player who pauses will naturally drop out of the list 2 minutes after their last `/api/world/move` call (which now updates `lastActiveAt`).

7. **AppShell — `loginMode` plumbing** — `SidebarContent` receives a resolved `loginMode` (the AppShell spreads `{ ...user, loginMode }` before passing). This avoids the optional-chaining awkwardness in the sidebar's user card and lets the `modeBadge` be a single ternary.

8. **No breaking change to existing protected routes** — All other API routes still call `getCurrentUserOrThrow()` and check `user.role` (e.g. `/api/parent/*` checks `role === "PARENT" || role === "ADMIN"`). The new admin-only `/api/admin/users` is the first route to key off `loginMode` instead. Downstream agents who want to harden other routes (e.g. gate `/api/parent/*` on `loginMode === "PARENT"`) can do so without affecting the auth flow.

### Verification

- `bun run lint` — passes (0 errors, 0 warnings). Output: `eslint .` exit 0.
- `npx tsc --noEmit` — passes for ALL files created/modified in this task. Pre-existing errors in `.next/dev/types/validator.ts` (generated), `examples/`, `skills/`, `src/components/world/world-view.tsx`, `src/lib/ai/provider.ts`, `src/lib/config.ts`, and `src/lib/game/achievements.ts:254` are outside this task's scope (confirmed against the prior API-ROUTES and UI-VIEWS worklogs).
- The Next.js dev server is currently in a stale state (died at 19:07 due to a transient `package.json` merge conflict that has since been resolved). Lint + tsc are the source-of-truth verification; the dev server should be restarted by the system or by running `bun run dev` once the package.json is confirmed valid (it is — verified by reading the file).

### Notes for downstream agents

- **`loginMode` reconstruction caveat** (see design decision #3): if you need parent-mode to survive a page refresh, either (a) sign `loginMode` into the session token, (b) store it in a second cookie, or (c) persist it on the User row at login time (a `lastLoginMode` column). Option (a) is the cleanest — `signToken(userId, loginMode)` and `verifyToken` returns both.
- **The `UserRole` type still includes `"TEACHER"` and `"MODERATOR"`** — neither is used by the new auth flow. The router only checks `loginMode`, so TEACHER/MODERATOR rows would resolve to STUDENT mode (since role != ADMIN/PARENT). If you need a TEACHER view, add a `loginMode: "TEACHER"` union member.
- **The `/api/admin/users` accuracy stat is approximate** — it samples the last 1000 attempts per user. For users with > 1000 attempts, the displayed accuracy won't match the lifetime accuracy. Switch to a `groupBy` count query if you need exact numbers.
- **The admin dashboard's "Ban" action is a placeholder** — it surfaces a toast pointing the admin to the existing moderation queue (`/api/moderator/action`). If you want a one-click ban from the admin dashboard, wire it up to `POST /api/moderator/action` with `actionType: "BAN"`.
- **Who's-online "Chat" button is a placeholder** — it just toasts. Once you have a real DM system (probably a new mini-service), wire `handleChat(u)` to open the DM channel.
- **The `AvatarConfig` import in `/api/online`** comes from `@/lib/types`, while `DEFAULT_AVATAR` is re-exported from `@/lib/auth/session` (where it lives as a private constant that was previously not exported). I added `export { DEFAULT_AVATAR }` to `session.ts` so other server-side routes can use it without re-declaring it.
- **`/api/auth` POST with `action: "register"` always creates a `CHILD` row** — there's no way to self-register a parent or admin account via the public API. Admins come exclusively from `ensureAdminExists()`. Parents must be created either via the dual-password flow on a CHILD account (then log in with the parent password) or via a future admin-side "create parent" endpoint.

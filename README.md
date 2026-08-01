# MathVerse

> A multiplayer mathematics learning platform for children aged 8-13, where math becomes the natural requirement for participating in a magical world — not the primary focus.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2d3748)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

## What is MathVerse?

MathVerse combines the engagement of a multiplayer game world (inspired by Roblox, Club Penguin, Animal Crossing) with rigorous mathematics learning. Children explore a persistent online world with friends, customize avatars, complete quests, and chat — and **everything** is powered by learning mathematics.

**Core Philosophy**: Learning should feel invisible. Social interaction should be the reward. Curiosity should drive progress.

## Key Features

### Multiplayer World
- Real-time 2D world rendered on HTML5 canvas (no game engine bloat)
- Walk around, jump, chat, emote, visit friends
- 5+ world areas (Town, School, Park, Arcade, Market) with portals
- NPCs with dialogue and quests
- WebSocket-based presence + position sync + chat

### Mathematics System
- **AI Question Generator** — unlimited questions, randomized scenarios, never repeats
- **Deterministic Grading Engine** — accepts mathematically equivalent answers (1/2 == 0.5 == 50%, 2x+1 == 1+2x)
- **AI Tutor** — Socratic, never shames, asks guiding questions, adapts to age
- **Adaptive Learning** — spaced repetition (SM-2 inspired), mastery tracking, confidence scoring
- **5 Curricula** — Pakistan National, Cambridge, IB, Common Core, CBSE
- **Grade 6 fully populated** (24 topics); architecture supports K-12

### Child Safety (Highest Priority)
Multi-layer moderation pipeline:
1. **Rule-based filter** — profanity, slurs, hate speech (regex patterns)
2. **PII detection** — phone numbers, emails, addresses, social media handles, links, school names, passwords
3. **Grooming detection** — meetup requests, secret-keeping, gift offers
4. **Spam detection** — rate limiting, repeated content, caps, pattern spam
5. **AI moderation** — bullying, harassment, self-harm, violence, phishing, scams, sexual content
6. **Escalating penalties** — warning → mute → suspend → ban (with appeals)

### Parent & Moderator Tools
- **Parent Dashboard** — monitor all children's progress, chat history, moderation actions, playtime
- **Parental Controls** — disable chat, approve friends, set playtime limits, receive alerts
- **Moderator Dashboard** — review reports, flag messages, manage penalties, approve appeals

### Gamification
- **Brain Energy** — math restores energy that powers chat, emotes, teleportation
- **XP & Levels** — exponential level curve
- **Streaks** — daily practice incentives
- **41 Cosmetics** — hats, hair, outfits, accessories, pets, trails, emotes (cosmetic-only, no pay-to-win)
- **13 Achievements** — Common to Legendary rarity
- **7 Quests** — daily, weekly, monthly templates

### Accessibility
- Dyslexia-friendly font (Lexend)
- Reduced motion mode
- High contrast mode
- Colorblind modes (protanopia, deuteranopia, tritanopia) via SVG filters
- Keyboard navigation throughout
- Screen reader compatible (ARIA labels, semantic HTML)
- Touch-friendly mobile controls (virtual joystick)

## Technology Stack

### Frontend
- **Next.js 16** with App Router (Turbopack)
- **React 19** + **TypeScript 5** (strict)
- **Tailwind CSS 4** with custom theme tokens
- **shadcn/ui** (New York style) component library
- **Framer Motion** for animations
- **Zustand** for client state
- **TanStack Query** for server state
- **Recharts** for data visualization
- **socket.io-client** for realtime

### Backend
- **Next.js API Routes** (21 endpoints)
- **Prisma ORM** with SQLite (portable to Postgres/Supabase)
- **Custom session auth** (signed cookies, SHA-256 HMAC)
- **Socket.io** mini-service for realtime (port 3003)

### AI Abstraction Layer
Supports multiple providers — switch via `AI_PROVIDER` env var:
- **ZAI** (default, works out-of-box via `z-ai-web-dev-sdk`)
- **Gemini** (Google Generative AI REST API)
- **OpenRouter** (OpenAI-compatible)
- **DeepSeek**
- **Qwen** (Alibaba DashScope)
- **Mistral**
- **Llama** (via Together.xyz)
- **Ollama** (local development)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   World     │  │  Practice   │  │   Parent / Mod      │  │
│  │   Canvas    │  │   Center    │  │   Dashboards        │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                    │             │
│  ┌──────┴────────────────┴────────────────────┴──────────┐  │
│  │            Zustand Store (state)                       │  │
│  └──────┬────────────────┬────────────────────┬──────────┘  │
│         │ HTTP           │ WebSocket          │             │
└─────────┼────────────────┼────────────────────┼─────────────┘
          │                │                    │
┌─────────┼────────────────┼────────────────────┼─────────────┐
│         ▼                ▼                    ▼             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Next.js API │  │  Realtime   │  │   Static Assets     │  │
│  │   Routes    │  │   Service   │  │                     │  │
│  │  (port 3000)│  │  (port 3003)│  │                     │  │
│  └──────┬──────┘  └─────────────┘  └─────────────────────┘  │
│         │                                                    │
│  ┌──────┴────────────────────────────────────────────────┐  │
│  │              Application Layer                        │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │  │
│  │  │   Auth   │ │   Math   │ │Moderation│ │ Adaptive │ │  │
│  │  │ (session)│ │ (grading)│ │ (pipeline)│ │ (mastery)│ │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │  │
│  └──────┬────────────────────────────────────────────────┘  │
│         │                                                    │
│  ┌──────┴──────┐                                     ┌─────┐ │
│  │   Prisma    │                                     │ AI  │ │
│  │ (SQLite/PG) │                                     │Provider│
│  └─────────────┘                                     └─────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites
- Node.js 18+ or Bun 1.0+
- An AI provider (defaults to ZAI which works without API keys)

### Installation

```bash
# Install dependencies
bun install

# Set up the database
bun run db:push

# Seed demo data (curricula, cosmetics, achievements, NPCs, demo users)
bun run scripts/seed.ts

# Start the realtime WebSocket service (in a separate terminal)
cd mini-services/mathverse-realtime
bun install
bun run dev

# Start the main app (in another terminal)
bun run dev
```

### Demo Accounts

| Role     | Email                     | Password       |
|----------|---------------------------|----------------|
| Child    | alex@mathverse.demo       | password123    |
| Child    | mia@mathverse.demo        | password123    |
| Child    | zain@mathverse.demo       | password123    |
| Parent   | parent@mathverse.demo     | password123    |
| Moderator| mod@mathverse.demo        | password123    |

### Environment Variables

Create a `.env` file (or copy from `.env.example`):

```bash
# Database
DATABASE_URL=file:./db/custom.db

# AI Provider (defaults to "zai" which works without API keys)
AI_PROVIDER=zai  # zai | gemini | openrouter | deepseek | qwen | mistral | llama | ollama

# Optional API keys (only needed if using that provider)
GEMINI_API_KEY=
OPENROUTER_API_KEY=
DEEPSEEK_API_KEY=
QWEN_API_KEY=
MISTRAL_API_KEY=
OLLAMA_URL=http://localhost:11434

# Auth
NEXTAUTH_SECRET=your-secret-here  # generate with: openssl rand -hex 32

# Realtime
WS_PORT=3003
```

## Project Structure

```
mathverse/
├── prisma/
│   └── schema.prisma              # 24 models, fully normalized
├── scripts/
│   └── seed.ts                    # Database seeder
├── mini-services/
│   └── mathverse-realtime/        # Socket.io service (port 3003)
│       ├── index.ts
│       └── package.json
├── src/
│   ├── app/
│   │   ├── api/                   # 21 API route files
│   │   │   ├── auth/
│   │   │   ├── avatar/
│   │   │   ├── curriculum/
│   │   │   ├── inventory/
│   │   │   ├── leaderboard/
│   │   │   ├── moderator/
│   │   │   ├── notifications/
│   │   │   ├── parent/
│   │   │   ├── progress/
│   │   │   ├── questions/
│   │   │   ├── quests/
│   │   │   ├── tutor/
│   │   │   └── world/
│   │   ├── globals.css            # Theme tokens + animations + a11y
│   │   ├── layout.tsx             # Root layout with fonts + toaster
│   │   └── page.tsx               # Main page (auth gate + shell)
│   ├── components/
│   │   ├── auth/                  # Login/register
│   │   ├── avatar/                # Avatar customization
│   │   ├── dashboard/             # Progress, quests, leaderboard
│   │   ├── moderator/             # Moderator dashboard
│   │   ├── parent/                # Parent dashboard
│   │   ├── practice/              # Practice center + AI tutor
│   │   ├── shell/                 # App shell + sidebar nav
│   │   ├── ui/                    # shadcn/ui components
│   │   └── world/                 # World canvas + avatar renderer
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── provider.ts        # Multi-provider abstraction
│   │   │   ├── question-generator.ts
│   │   │   └── tutor.ts
│   │   ├── auth/
│   │   │   └── session.ts
│   │   ├── curriculum/
│   │   │   └── data.ts            # 5 curricula, 24 grade-6 topics
│   │   ├── game/
│   │   │   ├── world.ts           # World areas + NPCs
│   │   │   ├── cosmetics.ts       # 41 cosmetics
│   │   │   └── achievements.ts    # 13 achievements + 7 quests
│   │   ├── learning/
│   │   │   └── adaptive.ts        # SM-2 spaced repetition
│   │   ├── math/
│   │   │   └── grading.ts         # Deterministic math equivalence
│   │   ├── moderation/
│   │   │   └── pipeline.ts        # Multi-layer safety pipeline
│   │   ├── config.ts
│   │   ├── db.ts
│   │   ├── types.ts               # Shared domain types
│   │   └── utils.ts
│   ├── stores/
│   │   ├── app-store.ts           # Zustand global state
│   │   └── multiplayer-store.ts   # Socket.io connection
│   └── hooks/
│       ├── use-mobile.ts
│       └── use-toast.ts
├── .env
├── Caddyfile                      # Gateway config
├── components.json                # shadcn/ui config
├── eslint.config.mjs
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Key Architectural Decisions

### 1. AI Provider Abstraction
The app NEVER talks to a specific AI provider directly. All requests go through `generateCompletion()` which routes to the configured provider. Adding a new provider is a 30-line change in `src/lib/ai/provider.ts`.

### 2. Deterministic Grading (No AI for Math)
The grading engine uses pure TypeScript math — no AI calls. This ensures:
- Deterministic results (same answer always grades the same way)
- Fast (<1ms per grade)
- Free (no API costs)
- Supports: integers, decimals, fractions, mixed numbers, percentages, scientific notation, units, algebraic expressions

AI is only used as a fallback for complex symbolic parsing (rare).

### 3. Multi-Layer Moderation
Every chat message passes through:
1. Rule-based filter (regex, ~5ms)
2. Spam detection (in-memory rate limiting)
3. AI moderation (only if rules don't catch it, ~500ms)

This ensures:
- Fast responses for most messages (rules catch 90%)
- AI only invoked for ambiguous cases (saves cost)
- Critical threats blocked immediately (grooming, PII)

### 4. Session-Based Auth (Not NextAuth)
Custom signed-cookie auth (`src/lib/auth/session.ts`) for:
- Full control over the auth flow
- No external dependencies
- Easy to swap for Supabase Auth later (just change this one file)

### 5. SQLite for Dev, Postgres for Prod
The Prisma schema works with both SQLite and Postgres. To deploy to Supabase:
1. Change `provider = "sqlite"` to `provider = "postgresql"` in `schema.prisma`
2. Set `DATABASE_URL` to your Supabase connection string
3. Run `bun run db:push`

### 6. Single-Page App with View Routing
All views live under `/` and switch via Zustand state. This:
- Avoids Next.js route compilation overhead during development
- Allows smooth animated transitions between views
- Keeps the preview environment simple

## Database Schema

24 models covering:
- **Users**: User, ChildParentLink, ParentSettings
- **Social**: Friendship
- **Chat**: ChatMessage, ChatReport, ModerationAction, Appeal
- **Curriculum**: Curriculum, Grade, CurriculumTopic
- **Questions**: Question, Attempt, Mastery
- **AI**: TutorSession
- **Gamification**: Achievement, UserAchievement, Quest, UserQuest
- **Economy**: Cosmetic, InventoryItem, House
- **World**: WorldPresence, NPC
- **Analytics**: AnalyticsEvent, DailyStat, Notification

Run `bun run db:push` to create all tables, then `bun run scripts/seed.ts` to populate demo data.

## Deployment

### Vercel + Supabase (Production)

1. **Database**: Create a Supabase project, copy the connection string
2. **Schema**: Set `provider = "postgresql"` in `prisma/schema.prisma`, run `bun run db:push`
3. **Realtime**: Deploy the `mini-services/mathverse-realtime` as a separate service (Render, Railway, or Supabase Edge Functions)
4. **Frontend**: Deploy to Vercel — `vercel --prod`
5. **Environment**: Set all env vars in Vercel project settings

### Docker

```dockerfile
# Dockerfile (illustrative)
FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
EXPOSE 3000
CMD ["bun", "run", "start"]
```

### CI/CD (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run lint
```

## Testing

The codebase is structured for testability:
- **Pure functions** in `lib/math/grading.ts`, `lib/learning/adaptive.ts`, `lib/moderation/pipeline.ts` are easily unit-testable
- **API routes** are thin wrappers around service functions
- **Components** are isolated and use props (not context) where possible

Recommended test setup:
```bash
bun add -d vitest @testing-library/react @testing-library/jest-dom
```

## Performance Considerations

- **Canvas rendering** at 60fps with throttled position sync (30Hz)
- **Code splitting** via Next.js App Router (each route is a separate chunk)
- **Image optimization** via Next.js `<Image>` (when images are added)
- **In-memory caching** for hot paths (spam detector, presence list)
- **Lazy AI calls** — only invoke AI when rules don't catch the issue
- **SQLite** for dev is fast enough; Postgres recommended for >100 concurrent users

## Security

- **HTTP-only cookies** with `SameSite=Lax`
- **SHA-256 HMAC** session tokens (timing-safe comparison)
- **Rate limiting** on chat (12 msgs/min) and question generation (20/min)
- **Input validation** on all API routes
- **SQL injection prevention** via Prisma parameterized queries
- **XSS prevention** via React's automatic escaping
- **CSRF protection** via SameSite cookies
- **Secrets management** via environment variables (never committed)

## Roadmap

- [ ] Add grades K-5 and 7-12 curriculum
- [ ] Implement guilds/clubs
- [ ] Add trading cosmetics
- [ ] Build housing decoration system
- [ ] Add cooperative math missions
- [ ] Implement private messaging
- [ ] Add seasonal events
- [ ] Build mobile app (PWA)
- [ ] Add voice chat with real-time moderation
- [ ] Implement teacher dashboard

## License

MIT — see [LICENSE](LICENSE)

---

**MathVerse** — Where math meets magic. ✨

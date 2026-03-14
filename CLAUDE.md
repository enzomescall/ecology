# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ecology is an async online card game where 2-6 players build 4×5 nature-themed boards across 2 rounds of 10 turns each. React frontend, Express backend, in-memory data store.

## Commands

### Client (`client/`)
- `npm run dev` — Start Vite dev server
- `npm run build` — TypeScript check + Vite build
- `npm run lint` — ESLint

### Server (`server/`)
- `npm run dev` — Start with tsx watch (hot reload), runs on port 4000
- `npm run build` — TypeScript compilation
- `npm run start` — Run compiled output

No test framework is configured. Server uses `verbatimModuleSyntax` — all type imports must use `import type`.

## Architecture

### Server — Layered architecture
```
Routes (src/routes/games.ts, auth.ts)    — Express routes, Zod validation
  ↓
Services (gameService, deckService,      — Business logic, card drafting, scoring
          ecosystemService, authService,
          emailService)
  ↓
Data Stores (gameStore, userStore,       — In-memory Maps (designed for SQL migration)
             inviteStore)
```

**Key files:**
- `server/src/types/card.ts` — `CardType` (11 types), `Card`, `Coord`, `PlacedCard`
- `server/src/types/game.ts` — `Game`, `EcoMove`, `ScoreBreakdown`, `GameStateResponse`
- `server/src/services/scoring/` — One file per scoring category (10 + orchestrator `index.ts`)

**API paths:** `/api/game` (game endpoints), `/api/auth` (OTC login)

### Game Flow
```
CREATE → LOBBY (invite + join) → START (deal 10 cards each)
→ ACTIVE: Round 1 (turns 1-10, pass left) → Round 2 (turns 1-10, pass right)
→ FINISHED (auto-scored)
```

All players submit moves simultaneously. Turn resolves when all have submitted: cards placed, rabbit swaps applied, hands passed. No sequential turns.

### Scoring Engine (`server/src/services/scoring/`)
10 categories: Stream (competitive 8/5pts), Meadow (group sizes), Wolf (competitive 12/8/4pts), Fox, Bear, Trout, Dragonfly, Bee, Eagle, Deer. Plus diversity penalty. Each category is a pure function in its own file. `computeScores()` orchestrates.

### Client — Screen-based SPA (no router)
Navigation is state-driven via a `Screen` discriminated union in `App.tsx`. Screens: `landing → email-sent → home → create-game → game-board → end-game`.

**Key components:**
- `GameBoard.tsx` — Dynamic ecosystem grid, card hand, rabbit swap mode, opponent thumbnails
- `EcosystemGrid.tsx` — Renders placed cards with valid placement cells
- `CardTile.tsx` — Card type → color + emoji mapping
- `Home.tsx` — Game list, pending invites, hide finished toggle

**Auth:** OTC (one-time code) sent to email. Codes logged to server console in dev (no SMTP configured). Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` env vars for real email.

**Invites:** When creating a game, invite emails are stored server-side. Invited users see pending invites on their Home page and can accept/decline.

API calls go through `src/services/gameApi.ts` (client-side type duplicates, not shared with server).

Styling uses custom CSS in `src/styles/` — semantic class names (Tailwind-inspired but plain CSS).

## What's Not Yet Implemented
- Real email sending (needs SMTP env vars configured)
- Persistent storage (currently in-memory, schema in `server/src/db/schema.sql`)
- Game spec details in `docs/turn-spec.md` and `docs/scoring-spec.md`

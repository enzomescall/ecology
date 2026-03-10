# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ecosystem is a turn-based multiplayer game with a React frontend and Express backend. The game follows a lifecycle: lobby → active (players take turns) → finished.

## Commands

### Client (`client/`)
- `npm run dev` — Start Vite dev server
- `npm run build` — TypeScript check + Vite build
- `npm run lint` — ESLint

### Server (`server/`)
- `npm run dev` — Start with tsx watch (hot reload), runs on port 4000
- `npm run build` — TypeScript compilation
- `npm run start` — Run compiled output

No test framework is configured in either package.

## Architecture

### Server — Layered architecture
```
Routes (src/routes/games.ts)      — Express routes, input validation with Zod
  ↓
Services (src/services/gameService.ts) — Business logic, state transitions, turn management
  ↓
Data Store (src/data/gameStore.ts)     — In-memory Maps (designed for SQL migration, schema in src/db/schema.sql)
```

API base path: `/api/game`. Full endpoint docs in `server/API.md`.

Game state flow: `CREATE → LOBBY (join) → ACTIVE (moves) → FINISHED`

Turn progression cycles through players by index; turnNumber increments when it wraps back to player 0.

Types are defined in `server/src/types/game.ts` — core interfaces: `Game`, `GamePlayer`, `GameMove`, `TurnState`.

### Client — Screen-based SPA (no router)
Navigation is state-driven via a `Screen` discriminated union in `App.tsx`. Screens: `landing → email-sent → home → create-game → game-board → end-game`.

User session is persisted in `localStorage` under key `gameUser`.

API calls go through `src/services/gameApi.ts` which wraps all fetch calls to the backend. The client duplicates game type definitions (not shared with server).

Styling uses custom CSS classes in `src/styles/` (semantic class names like `min-h-screen`, `bg-stone-50` — Tailwind-inspired but plain CSS).

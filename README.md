# PiksPeak

AI-powered football prediction platform with Bun/Hono backend and Expo mobile app.

KI-gestuetzte Fussball-Vorhersage-Plattform mit Bun/Hono-Backend und Expo-Mobile-App.

## Project Status / Projektstatus

- Current phase: **Phase 0/1 transition** (internalization + foundation).
- API versioning target is active at **`/v1`**.
- This codebase currently lives in the `dexter-sports` fork and is being prepared for standalone extraction.

## Monorepo Structure / Struktur

```text
packages/
  backend/   # Hono API (Bun, Drizzle, Postgres, Redis)
  mobile/    # Expo React Native app
docs/
  PiksPeak-Blueprint-Zusammenfassung.md
  summaries/
```

## Tech Stack

- Backend: Bun, Hono v4, Drizzle ORM, PostgreSQL 16, Redis 7, Zod
- Mobile: React Native 0.83, Expo 55, React Navigation v7, Zustand v5, react-native-paper v5
- Infra: Docker Compose, GitHub Actions, Railway (planned target)

## Quick Start / Schnellstart

1. Install dependencies

```bash
bun install
cd packages/backend && bun install
cd ../mobile && npm install
```

2. Configure environment

```bash
cp env.example .env
```

Environment profiles / Umgebungsprofile:

- `env.development.example` (local development)
- `env.staging.example` (staging/pre-production)
- `env.production.example` (production)

Examples / Beispiele:

```bash
cp env.development.example .env
# or
cp env.staging.example .env
# or
cp env.production.example .env
```

3. Run backend (local)

```bash
cd packages/backend
bun dev
```

4. Run mobile app

```bash
cd packages/mobile
npx expo start
```

5. Run local infra (Postgres + Redis + Backend container)

```bash
docker compose up
```

## API

- Base URL: `http://localhost:3000`
- Version prefix: **`/v1`**
- Health: `GET /health` and `GET /v1/health`
- OpenAPI JSON: `GET /v1/docs` (also `GET /v1/docs/openapi.json`)

## Core Commands

Backend:

```bash
cd packages/backend
bun dev
bun test
bun db:generate
bun db:migrate
bunx tsc --noEmit
```

Mobile:

```bash
cd packages/mobile
npx expo start
npx tsc --noEmit
```

CSV import (football-data.co.uk):

```bash
curl -X POST "http://localhost:3000/v1/admin/sync-hybrid-fixtures?include_csv=true&include_live=false&dry_run=false" \
  -H "X-Admin-Key: $(grep '^ADMIN_API_KEY=' .env | cut -d= -f2-)"
```

The command uses `CSV_FIXTURE_FILES` from `.env`.

Delta import shortcut (latest season, rolling window):

```bash
cd packages/backend
bun run csv:import:delta
# optional:
# bun run csv:import:delta:dry
# bun run csv:import:delta -- --season=2526 --window-days=30
```

## Documentation

- Blueprint: `docs/PiksPeak-Blueprint-Zusammenfassung.md`
- Session summaries: `docs/summaries/`
- Project operating system: `CLAUDE.md`

## Notes

- Mobile client automatically prefixes API calls with `/v1`.
- Existing root `src/` contains legacy Dexter code and is not part of the target standalone PiksPeak backend runtime.

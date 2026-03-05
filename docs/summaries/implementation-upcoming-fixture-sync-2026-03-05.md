# Implementation Summary: Upcoming Match Hydration via Daily Fixture Sync

**Date:** 2026-03-05  
**Scope:** Added dedicated fixture sync service + cron/admin integration to hydrate `matches` independently from prediction runs.

## Changes made

1. Added new fixture sync service:
   - `packages/backend/src/services/fixture-sync.ts`
   - Implements:
     - `syncUpcomingFixtures({ horizonDays, leagueIds, dryRun })`
     - Top-5 default leagues + 7-day horizon
     - API-Football fetch via `/fixtures` (`from/to/league/season/status`)
     - Idempotent upsert keyed by `apiFootballId`
     - Status mapping (`scheduled/live/finished/postponed/cancelled/abandoned/unknown`)
     - Cleanup rule: old `scheduled` (`kickoff < now-24h`) -> `unknown`
     - Fail-open behavior when all API calls fail
     - Payload-level API error parsing (important for free-plan restrictions)

2. Added cron integration:
   - `packages/backend/src/cron.ts`
   - New daily task at **03:00 UTC**: `triggerFixtureSync()`
   - Added scheduler state fields:
     - `fixtureSyncRunning`
     - `lastFixtureSyncRun`

3. Added admin trigger + API docs entry:
   - `packages/backend/src/index.ts`
   - New endpoint:
     - `POST /v1/admin/sync-fixtures`
   - Existing `GET /v1/admin/status` now includes fixture-sync status via scheduler object.

4. Fixed upcoming route filtering:
   - `packages/backend/src/routes/matches.ts`
   - `league_id` now actively filters results.
   - Added parser helper:
     - `parseLeagueIdParam(...)`

5. Updated pipeline source strategy:
   - `packages/backend/src/services/prediction-pipeline.ts`
   - Pipeline now:
     - first reads upcoming scheduled matches from DB (next 48h, top-5),
     - then falls back to direct API-Football fetch if DB has none.
   - Added payload-level API error logging for fallback fetch.

6. Added tests:
   - `packages/backend/src/services/fixture-sync.test.ts`
   - `packages/backend/src/routes/matches.test.ts`

## Validation commands and results

```bash
cd packages/backend && bun test
cd packages/backend && bunx tsc --noEmit
```

- Backend tests: **pass (131/131)**
- Backend typecheck: **pass**

## Runtime smoke checks

1. Started backend with local `.env`.
2. Triggered `POST /v1/admin/sync-fixtures`.
3. Verified `GET /v1/admin/status` includes:
   - `fixtureSyncRunning`
   - `lastFixtureSyncRun`
4. Verified `GET /v1/matches/upcoming?league_id=39` path works and remains backward-compatible.

Observed environment note:
- Current API-Football plan blocks season 2025 (returns payload error: `"Free plans do not have access to this season"`).  
- Service now reports these as structured sync errors instead of silently treating calls as successful.

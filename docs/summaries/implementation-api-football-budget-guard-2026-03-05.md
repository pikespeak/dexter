# Implementation Summary: API-Football Budget Guard (100-call Protection)

**Date:** 2026-03-05  
**Scope:** Added hard runtime guardrails so the backend cannot exceed configured API-Football request budget per process.

## Changes made

1. Added env config key:
   - `packages/backend/src/config.ts`
   - New key: `API_FOOTBALL_MAX_REQUESTS` (default `0` = unlimited).

2. Added budget enforcement in API client:
   - `packages/backend/src/lib/sports-api.ts`
   - `callFootballApi(...)` now checks and consumes budget on real outbound calls (cache hits do not consume budget).
   - Added exported status helper:
     - `getApiFootballBudgetStatus() -> { maxRequests, usedRequests, remainingRequests }`

3. Exposed budget status in API responses:
   - `packages/backend/src/index.ts`
   - `GET /health` and `GET /v1/health` now include `apiFootballBudget`.
   - `GET /v1/admin/status` now includes `apiFootballBudget`.

4. Updated env defaults:
   - `.env` + all env templates now include:
     - `API_FOOTBALL_MAX_REQUESTS=100`
   - Active `.env` was also hardened to reduce automatic API usage:
     - `FIXTURE_SYNC_ENABLED=false`
     - `PIPELINE_DIRECT_FETCH_ENABLED=false`

## Validation

1. Typecheck/tests:
   - `cd packages/backend && bunx tsc --noEmit` ✅
   - `cd packages/backend && bun test src/services/fixture-sync.test.ts src/routes/matches.test.ts` ✅

2. Runtime checks:
   - `GET /v1/health` shows:
     - `"apiFootballBudget":{"maxRequests":100,"usedRequests":0,"remainingRequests":100}` ✅

3. Guard behavior proof:
   - One-off script with `API_FOOTBALL_MAX_REQUESTS=1`:
     - first API call succeeds
     - second call is blocked with:
       - `[API-Football] request budget exhausted ...` ✅

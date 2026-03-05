# Implementation Summary: Backend Sports API Internalization

**Date:** 2026-03-05  
**Scope:** Close critical blocker "Dexter dependency in backend services"

## What changed

1. Added internal sports API client with Redis-backed cache:
   - `packages/backend/src/lib/sports-api.ts`
   - Exposes `callFootballApi()` and `callOddsApi()`
   - Uses backend cache service (`cacheGet` / `cacheSet`)
   - Keeps response contract `{ data, url }`

2. Replaced all backend imports that pointed to Dexter root:
   - `packages/backend/src/services/prediction-pipeline.ts`
   - `packages/backend/src/services/prediction-agent.ts`
   - `packages/backend/src/services/result-tracker.ts`
   - `packages/backend/src/services/calibration.ts` (dynamic import path)

3. Removed now-unneeded root-source copy from backend Dockerfile:
   - `packages/backend/Dockerfile`

4. Updated backend deploy workflow path triggers:
   - `.github/workflows/deploy-backend.yml`
   - Removed `src/**` trigger because backend no longer depends on root `src/`

5. Fixed repository ignore rule so backend `src/lib` can be committed:
   - `.gitignore`
   - Added unignore rules for `packages/backend/src/lib/**`

## Validation

- `rg "src/tools/sports/api"` in backend code: **no remaining references**
- `cd packages/backend && bun test`: **pass (120/120)**
- `cd packages/backend && bunx tsc --noEmit`: still fails, but current errors are pre-existing route typing issues (no remaining `rootDir` / cross-package import errors)

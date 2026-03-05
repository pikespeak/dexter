# Implementation Summary: CSV + Live API Hybrid Fixture Sync

**Date:** 2026-03-05  
**Scope:** Added a hybrid sync path that combines CSV historical fixtures with live API upcoming fixtures in one run.

## Changes made

1. New CSV import service:
   - `packages/backend/src/services/csv-fixture-import.ts`
   - Features:
     - CSV parsing (comma/semicolon, quoted values)
     - League code mapping (`Div` -> `leagueId`) via env
     - Date/time parsing for common football-data formats
     - Deterministic synthetic IDs (negative `apiFootballId`, negative team IDs)
     - Upsert into `matches` via shared upsert function
     - Optional filters: league IDs, from/to range, max rows, dry-run

2. Shared upsert function exported:
   - `packages/backend/src/services/fixture-sync.ts`
   - Added `upsertMatchValues(...)` export.
   - Existing API-based sync now reuses this shared upsert path.

3. New hybrid orchestrator:
   - `packages/backend/src/services/hybrid-fixture-sync.ts`
   - `syncHybridFixtures(...)` can run:
     - CSV import
     - live upcoming sync
     - either or both, in sequence

4. New admin endpoint:
   - `POST /v1/admin/sync-hybrid-fixtures`
   - File: `packages/backend/src/index.ts`
   - Supports query options:
     - `include_csv`, `include_live`, `dry_run`
     - `csv_files`, `csv_league_ids`, `csv_from`, `csv_to`, `csv_max_rows`
     - `live_league_ids`, `live_horizon_days`, `live_status_filter`
     - `live_cache_ttl_seconds`, `live_stale_scheduled_hours`

5. New config/env keys:
   - `CSV_FIXTURE_IMPORT_ENABLED`
   - `CSV_FIXTURE_FILES`
   - `CSV_FIXTURE_LEAGUE_MAP`
   - `CSV_FIXTURE_FROM`
   - `CSV_FIXTURE_TO`
   - `CSV_FIXTURE_MAX_ROWS`
   - Added to:
     - `.env`
     - `env.example`
     - `env.development.example`
     - `env.staging.example`
     - `env.production.example`

## Validation

1. Typecheck/tests:
   - `cd packages/backend && bunx tsc --noEmit` ✅
   - `cd packages/backend && bun test` ✅

2. Runtime smoke tests:
   - Hybrid endpoint with sample CSV and `include_live=false` ✅
   - Hybrid endpoint with sample CSV and `include_live=true` (limited league/horizon) ✅
   - API budget meter increments only for live API calls as expected ✅

3. Test data cleanup:
   - Removed temporary negative-ID sample rows after validation.

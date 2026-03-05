# Implementation Summary: Match CSV Intelligence Export v1

**Date:** 2026-03-05  
**Scope:** Added prediction-version history storage + full denormalized CSV export per prediction version (including prompt, council trace, final prediction, and post-match outcome).

## Changes made

1. Added append-only prediction version history table:
   - `packages/backend/src/db/schema.ts`
   - New table: `prediction_versions`
   - Includes prompt fields (`systemPrompt`, `userPrompt`, `promptHash`), council trace, full snapshot JSON, scalar probabilities, version number, and timestamps.
   - Added unique/index constraints for `(match_id, version_no)` and query paths.

2. Added migration for prediction versions:
   - `packages/backend/drizzle/0002_tricky_bishop.sql`
   - `packages/backend/drizzle/meta/0002_snapshot.json`
   - Updated `packages/backend/drizzle/meta/_journal.json`

3. Persisted prompt context at prediction time:
   - `packages/backend/src/services/prediction-agent.ts`
   - Added `analysis.promptContext = { systemPrompt, userPrompt, promptHash }`.
   - `promptHash` generated via SHA-256.
   - Extended `PredictionResultSchema.analysis` to accept `promptContext`.

4. Captured prediction versions on every pipeline write:
   - `packages/backend/src/services/prediction-pipeline.ts`
   - Existing `predictions` upsert behavior kept (latest/current API contract unchanged).
   - Added insert into `prediction_versions` after every prediction save.
   - Version strategy: `max(versionNo) + 1` with one retry on unique collision.

5. Added CSV export service:
   - `packages/backend/src/services/match-csv-export.ts`
   - New function: `exportMatchPredictionVersionsCsv(options)`
   - Output: one row per prediction version (denormalized), including:
     - IDs/meta, match context, prompt fields
     - full council member/decider raw+parsed JSON
     - usage JSON
     - final prediction JSON + scalar mirrors
     - actual results + computed per-version evaluation metrics
     - timing fields (`predicted_at`, `kickoff`, `hours_to_kickoff`)
     - current value bets JSON + explicit `value_bets_versioned=false`
     - data completeness flags
   - Uses chunked reads and atomic write (`*.tmp` -> rename) to latest file.

6. Added automatic and manual triggers:
   - `packages/backend/src/cron.ts`
     - On successful `triggerResultTracking()`, exporter runs when enabled.
     - Fail-open: CSV export failure logs warning but does not fail result-tracking run.
   - `packages/backend/src/index.ts`
     - New admin endpoint: `POST /v1/admin/export-match-csv`
   - `packages/backend/src/scripts/export-match-csv.ts`
     - CLI trigger script for on-demand exports.
   - `packages/backend/package.json`
     - New script: `csv:export:matches`

7. Added config + env keys:
   - `packages/backend/src/config.ts`
   - `env.example`
   - `env.development.example`
   - `env.staging.example`
   - `env.production.example`
   - New keys:
     - `MATCH_CSV_EXPORT_ENABLED`
     - `MATCH_CSV_EXPORT_DIR`
     - `MATCH_CSV_EXPORT_FILENAME`
     - `MATCH_CSV_EXPORT_INCLUDE_PENDING`
     - `MATCH_CSV_EXPORT_INCLUDE_FINISHED`
     - `MATCH_CSV_EXPORT_SNAPSHOT_ENABLED`
     - `MATCH_CSV_EXPORT_TIMEZONE`

8. Added/extended tests:
   - `packages/backend/src/services/match-csv-export.test.ts`
     - CSV escaping, row serialization, outcome helper behavior, council extraction fallback.
   - `packages/backend/src/services/prediction-agent.test.ts`
     - Schema acceptance for `analysis.promptContext`.

## Validation commands and results

```bash
cd packages/backend && bun run db:generate
cd packages/backend && bunx tsc --noEmit
cd packages/backend && bun test src/services/match-csv-export.test.ts src/services/prediction-agent.test.ts
cd packages/backend && bun test
```

- Drizzle migration generation: **pass**
- Backend typecheck: **pass**
- Targeted tests: **pass (23/23)**
- Full backend tests: **pass (146/146)**

## Notes

- CSV export row model is one row per **prediction version** (not one row per match).
- Pending + finished predictions are both supported by config filters.
- Existing mobile/API reads from `predictions` remain unchanged.

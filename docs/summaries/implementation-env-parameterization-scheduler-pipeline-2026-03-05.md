# Implementation Summary: Env-Parametrization for Scheduler, Fixture Sync, Pipeline

**Date:** 2026-03-05  
**Scope:** Made key runtime knobs configurable via env/config instead of hardcoded constants.

## What is now parameterized

1. Scheduler / cron times:
   - `CRON_FIXTURE_SYNC_HOUR_UTC`
   - `CRON_PIPELINE_HOUR_UTC`
   - `CRON_REPREDICTION_HOUR_UTC`
   - `CRON_RESULT_TRACKER_MINUTE_UTC`
   - `CRON_METRICS_HOUR_UTC`
   - `CRON_CLOSING_ODDS_MINUTE_UTC`
   - `CRON_CLOSING_ODDS_INTERVAL_HOURS`

2. Fixture sync:
   - `FIXTURE_SYNC_ENABLED`
   - `FIXTURE_SYNC_HORIZON_DAYS`
   - `FIXTURE_SYNC_LEAGUE_IDS`
   - `FIXTURE_SYNC_STATUS_FILTER`
   - `FIXTURE_SYNC_CACHE_TTL_SECONDS`
   - `FIXTURE_SYNC_STALE_SCHEDULED_HOURS`

3. Prediction pipeline:
   - `PIPELINE_MATCH_LOOKAHEAD_HOURS`
   - `PIPELINE_DIRECT_FETCH_ENABLED`
   - `PIPELINE_API_STATUS_FILTER`
   - `PIPELINE_LEAGUE_IDS` (override; fallback to fixture sync league IDs)
   - `VALUE_BET_EDGE_THRESHOLD`
   - `VALUE_BET_LOOKAHEAD_DAYS`
   - `VALUE_BET_KELLY_MULTIPLIER`
   - `VALUE_BET_MAX_STAKE`
   - `ODDS_API_REGIONS`
   - `ODDS_API_MARKETS`
   - `ODDS_API_ODDS_FORMAT`
   - `ODDS_API_SPORT_KEYS`

4. Calibration:
   - `CLOSING_ODDS_LOOKAHEAD_HOURS`

## Files changed

- `env.example`
- `packages/backend/src/config.ts`
- `packages/backend/src/cron.ts`
- `packages/backend/src/services/fixture-sync.ts`
- `packages/backend/src/services/prediction-pipeline.ts`
- `packages/backend/src/services/calibration.ts`
- `packages/backend/src/services/fixture-sync.test.ts`

## Behavior changes

1. Scheduler now evaluates all timing conditions against env-configured UTC values.
2. Fixture sync and pipeline league scope are driven by configurable CSV lists.
3. Pipeline DB lookahead and API fallback behavior are configurable.
4. Value-bet thresholds and staking controls are configurable.
5. Closing-odds capture lookahead is configurable.

## Validation

```bash
cd packages/backend && bunx tsc --noEmit
cd packages/backend && bun test
cd packages/mobile && npx tsc --noEmit
```

- Backend typecheck: **pass**
- Backend tests: **pass (133/133)**
- Mobile typecheck: **pass**

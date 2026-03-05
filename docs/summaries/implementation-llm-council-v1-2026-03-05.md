# Implementation Summary: LLM Council v1 (Direct Replacement)

**Date:** 2026-03-05  
**Scope:** Replaced single/ensemble prediction generation with a 4-member + 1-decider council flow, with quorum and deterministic fallback.

## Changes made

1. Added council engine service:
   - `packages/backend/src/services/llm-council.ts`
   - Implements:
     - parallel member calls (`COUNCIL_MEMBER_MODELS`)
     - quorum enforcement (`COUNCIL_QUORUM`)
     - decider synthesis call (`COUNCIL_DECIDER_MODEL`)
     - deterministic weighted fallback on decider failure
     - full council trace capture (members, durations, attempts, usage, decider input/output)
   - Uses AI Gateway `chat/completions` with JSON response enforcement and variant fallback for reasoning/search payload compatibility.

2. Rewired prediction generation to council:
   - `packages/backend/src/services/prediction-agent.ts`
   - `generateMatchPrediction(...)` now calls `runPredictionCouncil(...)`.
   - Keeps existing full prompt context (Poisson + API + web intel) and post-processing (normalization/default fills/web-intel cap adjustments).
   - Adds council trace to output via:
     - `analysis.council`
     - `analysis.councilSummary`
     - `analysis.councilDisagreement`

3. Extended prediction schema:
   - `packages/backend/src/services/prediction-agent.ts`
   - `PredictionResultSchema.analysis` now supports optional council fields.

4. Added council env config keys:
   - `packages/backend/src/config.ts`
   - Added:
     - `COUNCIL_MEMBER_MODELS`
     - `COUNCIL_DECIDER_MODEL`
     - `COUNCIL_QUORUM`
     - `COUNCIL_MEMBER_TIMEOUT_MS`
     - `COUNCIL_DECIDER_TIMEOUT_MS`
     - `COUNCIL_MAX_RETRIES`
     - `COUNCIL_REASONING_EFFORT`
     - `COUNCIL_WEB_SEARCH_ENABLED`
     - `COUNCIL_TRACE_FULL_JSON`

5. Updated env templates:
   - `env.example`
   - `env.development.example`
   - `env.staging.example`
   - `env.production.example`
   - Added default council settings using:
     - `anthropic/claude-opus-4.6`
     - `xai/grok-4`
     - `google/gemini-3.1-pro-preview`
     - `openai/gpt-5.2`

6. Versioned stored predictions for analytics split:
   - `packages/backend/src/services/prediction-pipeline.ts`
   - Stored `modelVersion: 'council-v1'` for upserted predictions.

7. Added tests:
   - `packages/backend/src/services/llm-council.test.ts`
     - decider success path
     - decider failure fallback path
     - quorum failure path
     - fallback normalization behavior
   - `packages/backend/src/services/prediction-agent.test.ts`
     - schema acceptance for council trace fields

## Validation commands and results

```bash
cd packages/backend && bunx tsc --noEmit
cd packages/backend && bun test src/services/llm-council.test.ts src/services/prediction-agent.test.ts
cd packages/backend && bun test
```

- Backend typecheck: **pass**
- Targeted tests: **pass (21/21)**
- Full backend tests: **pass (140/140)**

## Notes

- Council is now the active prediction flow (direct replacement).
- Fallback only triggers if decider fails and quorum is met.
- If quorum is not met, match prediction fails with explicit quorum error.
- Full trace storage increases `prediction_data` payload size by design.

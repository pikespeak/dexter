# Analysis: Zod Migration & Type Safety Plan

**Completed:** 2026-03-05
**Analysis Type:** technical / migration
**Sources Used:** Full repository scan (backend, mobile, infrastructure, Dexter sports API)
**Confidence:** high — all source files read and analyzed

---

## 1. Executive Summary

### Current Safety Level: LOW

| Metric | Status |
|--------|--------|
| External API response validation | NONE — all `as` casts |
| API route input validation | PARTIAL — auth routes have basic checks, predictions/stats have none |
| Environment variable validation | PARTIAL — `config.ts` uses Zod, but not all vars covered |
| Database write validation | NONE — data flows from API to DB without validation |
| Mobile API response validation | NONE — all `as unknown as X` casts |
| Form validation | AD-HOC — manual `if` checks in screens |
| Shared types between packages | NONE — independently defined |

### Key Risks

1. **Double type casting** (`as unknown as X`) in prediction-pipeline.ts — complete type erasure
2. **No validation of external API responses** (API-Football, Odds API, AI Gateway) — invalid data reaches DB
3. **LLM response parsing** has no null safety — `choices[0].message.content` crashes if empty
4. **Math operations** (Kelly, edge) can produce NaN/Infinity — no bounds checks
5. **Mobile and backend types duplicated** — drift risk, no shared contract

### Quick Wins

1. Validate `config.ts` env vars comprehensively (already partially Zod)
2. Add Zod schemas for API-Football and Odds API response shapes
3. Replace `as unknown as X` casts with `.parse()` calls
4. Create shared types package for User, Prediction, Match

### Migration Complexity: MEDIUM

- ~15 files need schema additions
- 1 existing Zod schema (`PredictionResultSchema`) proves pattern works
- Drizzle ORM already provides type-safe DB operations — need validation layer on top
- Mobile has zero Zod — needs `zod` added as dependency

---

## 2. Boundary Inventory

### Interface Layer (API Routes)

| Path | Boundary | Current Validation | Risk | Proposed Schema |
|------|----------|-------------------|------|-----------------|
| `routes/auth.ts` POST `/auth/register` | email, password, displayName from client | Manual `if (!email \|\| !password)` | HIGH | `RegisterInputSchema` |
| `routes/auth.ts` POST `/auth/login` | email, password from client | Manual `if` checks | HIGH | `LoginInputSchema` |
| `routes/auth.ts` POST `/auth/refresh` | Authorization header (JWT) | Middleware `verifyAuth` | MEDIUM | Already handled |
| `routes/predictions.ts` GET `/predictions/today` | Auth header, no body | Middleware auth | LOW | Response schema only |
| `routes/predictions.ts` GET `/predictions/free` | No auth, no body | None needed | LOW | Response schema only |
| `routes/predictions.ts` GET `/predictions/:matchId` | URL param `matchId` | None | MEDIUM | `MatchIdParamSchema` (UUID) |
| `routes/predictions.ts` GET `/predictions/history` | Query params `limit`, `offset` | None | MEDIUM | `PaginationSchema` |
| `routes/matches.ts` GET `/matches/upcoming` | Query param `limit` | None | LOW | `LimitParamSchema` |
| `routes/matches.ts` GET `/matches/:id` | URL param `id` | None | MEDIUM | `MatchIdParamSchema` |
| `routes/stats.ts` GET `/stats/performance` | No input | None needed | LOW | Response schema only |
| `routes/push.ts` POST `/push/register` | token, platform from client | None | HIGH | `PushTokenSchema` |
| `routes/push.ts` POST `/push/unregister` | token from client | None | MEDIUM | `PushUnregisterSchema` |
| `routes/webhooks.ts` POST `/webhooks/revenuecat` | Webhook payload + signature | HMAC check only | HIGH | `RevenueCatWebhookSchema` |
| `routes/subscriptions.ts` GET `/subscriptions/status` | Auth header | Middleware | LOW | Response schema |
| `routes/subscriptions.ts` GET `/subscriptions/plans` | None | None needed | LOW | Response schema |
| `index.ts` POST `/admin/trigger-pipeline` | Admin API key header | Manual check | MEDIUM | `AdminAuthSchema` |
| `index.ts` POST `/admin/trigger-results` | Admin API key header | Manual check | MEDIUM | `AdminAuthSchema` |

### Application Layer (Services)

| Path | Boundary | Current Validation | Risk | Proposed Schema |
|------|----------|-------------------|------|-----------------|
| `prediction-agent.ts` | AI Gateway JSON response | `as` cast, no null check | HIGH | `AiGatewayResponseSchema` |
| `prediction-agent.ts` | LLM output JSON parsing | `JSON.parse()` + Zod (already) | LOW | `PredictionResultSchema` exists |
| `prediction-pipeline.ts` | API-Football fixtures response | `as { response?: FixtureResponse[] }` | HIGH | `FootballFixturesResponseSchema` |
| `prediction-pipeline.ts` | Odds API events response | `as unknown as OddsEvent[]` | HIGH | `OddsEventsResponseSchema` |
| `result-tracker.ts` | API-Football finished fixtures | `as { response?: FinishedFixture[] }` | HIGH | `FinishedFixturesResponseSchema` |
| `push-notifications.ts` | Expo Push API response | `as { data: Array<...> }` | MEDIUM | `ExpoPushResponseSchema` |
| `statistical-model.ts` | Team stats extraction from API | Raw object traversal | HIGH | `TeamStatsResponseSchema` |
| `cache.ts` `cacheGet<T>()` | Redis deserialization | `JSON.parse() as T` — no validation | MEDIUM | Generic `cacheGet` with schema param |

### Persistence Layer (Database Writes)

| Path | Operation | Current Validation | Risk | Proposed Schema |
|------|-----------|-------------------|------|-----------------|
| `prediction-pipeline.ts:232` | INSERT matches | None — raw API data | HIGH | `MatchInsertSchema` |
| `prediction-pipeline.ts:221` | UPDATE matches | None | HIGH | `MatchUpdateSchema` |
| `prediction-pipeline.ts:284` | INSERT predictions | Partial (PredictionResultSchema on LLM output) | MEDIUM | `PredictionInsertSchema` |
| `prediction-pipeline.ts:541` | INSERT value_bets | None — math results | MEDIUM | `ValueBetInsertSchema` |
| `result-tracker.ts:94` | UPDATE matches (scores) | None | MEDIUM | `MatchScoreUpdateSchema` |
| `result-tracker.ts:162` | INSERT performance | None — calculated values | MEDIUM | `PerformanceInsertSchema` |
| `push-notifications.ts:43` | INSERT push_tokens | None — client input | HIGH | `PushTokenInsertSchema` |

### Integration Layer (External APIs)

| Path | Integration | Current Validation | Risk | Proposed Schema |
|------|-------------|-------------------|------|-----------------|
| `sports-api.ts` (Dexter) | API-Football | None — returns `Record<string, unknown>` | HIGH | `FootballApiResponseSchema` |
| `sports-api.ts` (Dexter) | The Odds API | None — returns `Record<string, unknown>` | HIGH | `OddsApiResponseSchema` |
| `prediction-agent.ts` | Vercel AI Gateway | `as` cast | HIGH | `AiGatewayResponseSchema` |
| `push-notifications.ts` | Expo Push API | `as` cast | MEDIUM | `ExpoPushResponseSchema` |
| `purchases.ts` (Mobile) | RevenueCat SDK | SDK-typed (adequate) | LOW | Not needed |

### Environment Variables

| Package | File | Current Validation | Proposed |
|---------|------|-------------------|----------|
| Backend | `config.ts` | Zod partial (some vars) | `EnvSchema` — all vars |
| Backend | `docker-compose.yml` | Hardcoded defaults | N/A (compose-level) |
| Mobile | `api.ts` | `process.env.EXPO_PUBLIC_API_URL \|\| fallback` | `MobileEnvSchema` |
| Mobile | `app.json` | Hardcoded extra keys | Validated at build time |
| Root | `src/tools/sports/api.ts` | Direct `process.env` access | Will be replaced in internalization |

---

## 3. Target Architecture Proposal

### Shared Schema Package

```
packages/
  shared/
    package.json
    tsconfig.json
    src/
      index.ts                    # Re-exports all schemas
      schemas/
        user.ts                   # UserSchema, LoginInputSchema, RegisterInputSchema
        prediction.ts             # PredictionSchema, PredictionResultSchema (moved from agent)
        match.ts                  # MatchSchema, FixtureResponseSchema
        value-bet.ts              # ValueBetSchema, OddsEventSchema
        performance.ts            # PerformanceSchema
        push.ts                   # PushTokenSchema, PushPreferencesSchema
        subscription.ts           # SubscriptionSchema, PlanSchema
        stats.ts                  # PerformanceStatsSchema
      env/
        backend.ts                # BackendEnvSchema
        mobile.ts                 # MobileEnvSchema
      api/
        responses.ts              # API response wrappers
        football-api.ts           # FootballApiResponseSchema, FixtureResponseSchema
        odds-api.ts               # OddsApiResponseSchema, OddsEventSchema
        ai-gateway.ts             # AiGatewayResponseSchema
        expo-push.ts              # ExpoPushResponseSchema
      dto/
        auth.ts                   # LoginDTO, RegisterDTO, TokenResponseDTO
        predictions.ts            # PredictionListDTO, PredictionDetailDTO
        matches.ts                # MatchListDTO, MatchDetailDTO
```

### Validation Architecture

```
Client (Mobile)
  │ .safeParse() for form inputs
  │ Response schemas for API responses
  ▼
API Routes (Hono Middleware)
  │ .parse() on request body/params/query
  │ Zod error → 400 JSON response with i18n keys
  ▼
Services
  │ .parse() on external API responses
  │ .parse() before DB writes
  ▼
Database (Drizzle ORM)
  │ Type-safe via Drizzle + validated input
  ▼
Cache (Redis)
  │ Schema-validated on read (cacheGet with schema param)
```

### Key Design Decisions

- **Schemas live in `packages/shared/`** — single source of truth
- **Types inferred from schemas**: `export type User = z.infer<typeof UserSchema>`
- **No duplicate interfaces** — remove all manually typed interfaces once schemas exist
- **Boundary validation only** — no deep internal parsing
- **i18n error keys** — all Zod custom errors use translation keys

---

## 4. Migration Phases

### Phase 1: Environment Validation (Quick Win)

**Scope:** `config.ts` (backend), env usage in mobile
**Risk:** LOW — no behavioral change, only validation added
**Effort:** Small (1-2 files)
**Safety Impact:** HIGH — catches misconfiguration at startup
**Tests:** Config loads correctly with valid env, throws on missing required vars

**Changes:**
- Extend existing `config.ts` Zod schema to cover ALL env vars
- Add `MobileEnvSchema` for mobile build-time validation
- Replace all direct `process.env` / `Bun.env` access with validated config

### Phase 2: Shared Schema Package + Core Models

**Scope:** Create `packages/shared/`, define User, Match, Prediction schemas
**Risk:** LOW — additive, no behavioral change
**Effort:** Medium (new package + ~8 schema files)
**Safety Impact:** HIGH — eliminates type duplication, single source of truth
**Tests:** Schema validation tests (valid + invalid payloads)

**Changes:**
- Create `packages/shared/` with package.json, tsconfig
- Move `PredictionResultSchema` from prediction-agent.ts to shared
- Define MatchSchema, UserSchema, ValueBetSchema, PerformanceSchema
- Define API response schemas (FootballApi, OddsApi, AiGateway, ExpoPush)
- Update workspace config

### Phase 3: API Route Input Validation

**Scope:** All Hono routes
**Risk:** MEDIUM — invalid requests now rejected (could break clients sending bad data)
**Effort:** Medium (~8 route files)
**Safety Impact:** HIGH — prevents invalid data at system boundary
**Tests:** Route tests with valid + invalid payloads

**Changes:**
- Add Zod `.parse()` to request body/params in all POST routes
- Add UUID validation for `:matchId` and `:id` params
- Add pagination validation for `limit`/`offset` query params
- Create Hono middleware for Zod validation error formatting
- Error responses use i18n keys

### Phase 4: External API Response Validation

**Scope:** API-Football, Odds API, AI Gateway responses
**Risk:** MEDIUM — if API returns unexpected shape, now fails loudly vs silently
**Effort:** Medium (~4 service files)
**Safety Impact:** CRITICAL — the biggest gap; invalid data currently reaches DB
**Tests:** Mock API responses (valid + malformed)

**Changes:**
- Replace all `as` casts on API responses with `.parse()` / `.safeParse()`
- Add `FootballFixturesResponseSchema` for fixture data
- Add `OddsEventsResponseSchema` for odds data
- Add `AiGatewayResponseSchema` for LLM responses
- Add null checks for `choices[0]` access
- Add bounds checking for math operations (Kelly, edge)

### Phase 5: Database Write Validation

**Scope:** All `db.insert()` and `db.update()` calls
**Risk:** LOW — Drizzle already type-checks, this adds runtime validation
**Effort:** Small (~4 files)
**Safety Impact:** MEDIUM — defense in depth
**Tests:** Insert/update with valid + invalid data

**Changes:**
- Create insert schemas derived from Drizzle table schemas
- Validate before every `db.insert()` / `db.update()`
- Add NaN/Infinity guards on calculated values (probabilities, Kelly, edge)

### Phase 6: Mobile Integration

**Scope:** Mobile API client, stores, forms
**Risk:** LOW — validation additive, `.safeParse()` never throws
**Effort:** Medium (~6 files)
**Safety Impact:** MEDIUM — catches API response drift, improves form validation
**Tests:** Store tests with mock API responses

**Changes:**
- Add `zod` dependency to mobile package
- Import shared schemas from `packages/shared/`
- Replace `as unknown as Prediction[]` casts with `.parse()`
- Replace ad-hoc form validation with `.safeParse()` + i18n error keys
- Add email format validation to register/login forms

### Phase 7: Cache Safety + Cleanup

**Scope:** Redis cache, remaining internal models
**Risk:** LOW
**Effort:** Small
**Safety Impact:** LOW-MEDIUM

**Changes:**
- Update `cacheGet<T>()` to accept schema param: `cacheGet(key, schema)`
- Remove all remaining duplicate type/interface declarations
- Final sweep for any `as` casts or `any` types

---

## 5. Quick Wins (High ROI)

| # | Change | Files | Impact | Effort |
|---|--------|-------|--------|--------|
| 1 | Extend `config.ts` env validation to all vars | 1 file | Catches misconfig at boot | 30 min |
| 2 | Add null check on AI Gateway `choices[0]` | 1 file | Prevents crash | 5 min |
| 3 | Add `Array.isArray()` + length check on API-Football responses | 2 files | Prevents silent failures | 15 min |
| 4 | Add NaN/Infinity guards on Kelly/edge calculations | 1 file | Prevents invalid DB writes | 15 min |
| 5 | Validate push token format before DB insert | 1 file | Prevents garbage tokens | 10 min |
| 6 | Add UUID validation on `:matchId` route params | 2 files | Prevents invalid DB lookups | 10 min |

---

## 6. Test & Build Safety Strategy

### Correctness Guarantees

1. **After every phase**: Run `bunx tsc --noEmit` (backend) + `npx tsc --noEmit` (mobile)
2. **After every phase**: Run `bun test` (backend)
3. **Schema tests**: Each new schema file gets a test with valid + invalid payloads
4. **Integration tests**: Route tests verify 400 on invalid input, 200 on valid
5. **No skipping**: If tests fail, fix immediately or revert

### CI Enforcement (Proposed)

- **PR gate**: `bunx tsc --noEmit` + `bun test` must pass
- **Lint rule**: Grep for `as unknown as` — flag as warning, then error after Phase 4
- **Lint rule**: Grep for direct `process.env` usage outside `config.ts` — flag
- **Lint rule**: Grep for `as {` patterns in service files — flag after Phase 4

### Build Commands Per Phase

```bash
# Backend
cd packages/backend && bunx tsc --noEmit && bun test

# Mobile
cd packages/mobile && npx tsc --noEmit

# Shared (after Phase 2)
cd packages/shared && bunx tsc --noEmit && bun test
```

---

## 7. Open Questions

1. **Shared package format**: Should `packages/shared/` be a Bun workspace member or a standalone npm package? **Recommendation**: Bun workspace member (simpler, no publishing needed).

2. **API-Football response schema strictness**: Should we use `.strict()` (reject unknown fields) or `.passthrough()` (allow extra fields)? **Recommendation**: `.passthrough()` — API-Football may add fields we don't use.

3. **Error response format**: Should Zod validation errors return field-level errors or a single message? **Recommendation**: Field-level errors with i18n keys for mobile form integration.

4. **Internalization timing**: Should the Dexter `sports-api.ts` internalization (Phase 0.3 of Blueprint) happen before or after the Zod migration? **Recommendation**: Before — so we validate the internalized version, not the Dexter import.

---

## STOP

**This plan is complete. Awaiting approval before any code changes.**

**Proposed execution order:**
1. Phase 1 (Env) → Phase 2 (Shared schemas) → Phase 3 (API inputs) → Phase 4 (External API responses) → Phase 5 (DB writes) → Phase 6 (Mobile) → Phase 7 (Cache cleanup)

Quick wins #2-#6 can be bundled into Phase 4 for efficiency.

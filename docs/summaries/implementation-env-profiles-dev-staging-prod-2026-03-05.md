# Implementation Summary: Environment Profiles (Dev / Staging / Production)

**Date:** 2026-03-05  
**Scope:** Added ready-to-use env profile templates with recommended values for scheduler, fixture sync, pipeline and cost-sensitive settings.

## Added files

1. `env.development.example`
2. `env.staging.example`
3. `env.production.example`

## Documentation update

1. `README.md`
   - Added profile selection section with copy examples:
     - `cp env.development.example .env`
     - `cp env.staging.example .env`
     - `cp env.production.example .env`

## Profile intent

1. Development:
   - Reduced scope/cost defaults
   - Fixture sync disabled by default
   - Web intel disabled by default

2. Staging:
   - Production-like runtime
   - Feature validation enabled with conservative limits
   - Slightly reduced horizon/risk settings

3. Production:
   - Full top-5 scope
   - 7-day fixture sync horizon
   - Standard cron windows and value-bet limits

## Validation

```bash
cd packages/backend && bunx tsc --noEmit
cd packages/backend && bun test
cd packages/mobile && npx tsc --noEmit
```

- Backend typecheck: **pass**
- Backend tests: **pass (133/133)**
- Mobile typecheck: **pass**

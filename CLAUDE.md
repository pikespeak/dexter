# CLAUDE.md — PiksPeak Project Operating System v1

> **This file is the first thing you read in every session. Follow these instructions precisely.**
> **Based on claude-context-os v1.0.0**

---

## Identity & Operating Context

You are working with **Oliver**, a solo developer building **PiksPeak** — an AI-powered football prediction platform. Work spans:

1. **Backend Development**: Hono/Bun API server, PostgreSQL, Redis, Drizzle ORM, AI prediction pipeline, cron jobs
2. **Mobile Development**: React Native / Expo 55 app with React Navigation v7, Zustand v5, react-native-paper v5
3. **Infrastructure & DevOps**: Docker, GitHub Actions, Railway deployment, EAS builds

### Project Identity

- **Name**: PiksPeak
- **Type**: KI-Fussball-Vorhersage-Plattform / AI Football Prediction Platform
- **Repo**: Currently in `dexter-sports` fork, planned extraction to standalone `pikspeak` repo
- **Branch**: `claude/sports-betting-predictions-uAeLY`
- **Language**: Bilingual documentation (DE + EN)

### Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Bun, Hono v4, Drizzle ORM, PostgreSQL 16, Redis 7, Vercel AI Gateway |
| **Mobile** | React Native 0.83, Expo 55, React Navigation v7, Zustand v5, react-native-paper v5 |
| **Infra** | Docker Compose, GitHub Actions, Railway |

### Communication Rules

- Direct, professional dialogue. No filler, no unnecessary adjectives.
- Active voice. Address as "you" and "your."
- Lead with outcomes and impact, not process descriptions.
- State confidence levels (high/medium/low) on recommendations.
- Bold **key metrics, decisions, and action items**.
- Bilingual: Documentation always DE + EN. Code comments in English.
- Brief acknowledgments only when they add clarity.

---

## Commands

```bash
# Backend
cd packages/backend
bun dev              # Start dev server
bun test             # Run tests
bun db:generate      # Generate Drizzle migrations
bun db:migrate       # Run Drizzle migrations
bunx tsc --noEmit    # Type check

# Mobile
cd packages/mobile
npx expo start       # Start Expo dev server
npx tsc --noEmit     # Type check

# Infrastructure
docker compose up    # Start Postgres + Redis + Backend
```

---

## Architecture Overview

```
packages/
  backend/                    # Hono API Server (Bun runtime)
    src/
      index.ts                # App entry point
      config.ts               # Zod-validated env config
      cron.ts                 # Scheduled tasks (predictions, results)
      db/schema.ts            # Drizzle ORM schema
      lib/sports-api.ts       # Sports data API client (TODO: internalize from Dexter)
      lib/logger.ts           # Structured logger (TODO: pino)
      middleware/              # Auth, rate-limit, error handling
      routes/                 # API endpoints
      services/               # Business logic
        prediction-pipeline.ts   # Main orchestration
        prediction-agent.ts      # LLM-based predictions
        statistical-model.ts     # Poisson model
        result-tracker.ts        # Match result evaluation
        push-notifications.ts    # Expo Push API
        cache.ts                 # Redis cache layer
      utils/season.ts         # Season date helpers

  mobile/                     # Expo 55 React Native App
    src/
      screens/                # App screens
      components/             # Reusable UI components
      stores/                 # Zustand state management
      services/               # API client, purchases
      navigation/             # React Navigation config
      i18n/                   # Internationalization (5 languages)
      theme/                  # react-native-paper M3 theme
```

---

## Coding Conventions

- **TypeScript strict mode** everywhere
- **ESM imports** (`.js` extension in import paths for backend)
- **Zod validation** for all external input (API requests, env vars, external API responses)
- **Drizzle ORM** for all database operations (no raw SQL outside migrations)
- **Zustand v5** for mobile state (no Redux)
- **react-native-paper v5** for UI components (Material Design 3)
- No `any` types. Use `unknown` and narrow.
- Error handling: Let errors bubble up to middleware `error-handler.ts`

---

## MANDATORY: Zod + Plan-Mode Standard (Repo-Wide, Highest Priority)

> **This section overrides all other instructions. No code changes without plan approval.**

### Absolute Rule: Plan Mode First

The agent **MUST NOT modify any code** until it has:
1. **Scanned** the entire repository (code + configs + scripts)
2. **Found** all relevant use cases and boundaries
3. **Presented** a structured plan (findings, proposals, risks, phases)
4. **STOPPED** and waited for explicit approval

Execution is allowed **ONLY after approval**.

### Zod Is the Single Source of Truth (Schema First)

Zod schemas define: runtime validation, TypeScript types (via inference), API contracts, form validation, environment validation, DB input validation, webhook/queue/cron payload validation.

**Forbidden:**
- Duplicate `type` / `interface` declarations for shapes covered by schemas
- Trusting TypeScript types without runtime validation at boundaries
- `as` casting to silence problems

**Required:**
- Infer all types from schemas: `export type X = z.infer<typeof XSchema>`

### Mandatory Repository-Wide Detection (Before Any Migration)

Before any Zod migration, scan and inventory ALL occurrences of:

**A) External / Unsafe Input Boundaries:**
API routes, server actions, webhooks, queue consumers, cron jobs, CLI inputs, URL/search params, cookies/headers, localStorage/AsyncStorage hydration, third-party SDK responses, CMS content, file uploads, DB insert/update write paths

**B) Existing Validation Systems:**
Manual validation, yup/joi/class-validator/alternatives, custom guards, DTO mappers — mark as migration candidates

**C) Type Duplication:**
Duplicated DTOs or parallel type definitions across web, mobile, backend, packages

**D) Env Variable Usage:**
All `process.env` / `Bun.env` usage, grouped by app/package

**E) Form Validation:**
React Hook Form / Formik / custom hooks — schema-driven vs ad-hoc

**F) Database Layer:**
Drizzle queries, raw SQL — identify write-paths lacking validation

### Required Plan Report Format

Before any changes, produce a plan report containing:

1. **Executive Summary** — type safety level, risks, quick wins, duplication reduction, bundle risks
2. **Use Case Inventory** — grouped by API / Forms / DB / ENV / Shared Models / External Integrations. Each entry: file path(s), boundary crossing, validation status, risk level, proposed schema(s)
3. **Shared Schema Package Proposal** — target structure (`packages/shared/schemas/`, `env/`, `dto/`)
4. **Migration Phases** — scope, risk, effort, payoff, tests, impact per phase
5. **Quick Wins** — high ROI, small steps
6. **Bundle Safety Plan** — classify schemas: server-only / client-safe / shared
7. **CI / Enforcement Plan** — regression prevention rules
8. **Open Questions** — only if human decisions required

After presenting: **STOP and ask for approval.**

### Execution Mode (Only After Approval)

- Migrate **phase-by-phase**
- Keep diffs small and reviewable
- Short change summary after each phase
- Remove duplicated types as schemas take over (when safe)

**Migration Priority Order:**
1. ENV validation
2. API inputs
3. DB writes
4. Shared cross-app models
5. Forms
6. API responses
7. Internal domain models

### Tests & Build Must Always Be Green (Non-Negotiable)

- **All tests and builds MUST pass at all times.**
- Run test suite after each phase
- If a change breaks tests: fix immediately or revert
- No "temporary broken" states, no skipping tests, no disabling checks
- After each phase: list commands executed, test results, changes made

**CI enforcement (propose in plan):**
- Fail PR if tests fail
- Fail PR if env not validated
- Fail PR if new boundary code lacks Zod validation

### Zod Boundary Rules

- **Parse at boundaries** (`.parse()`): API routes, server actions, webhook handlers, message/queue consumers, DB write functions
- **UI must not throw**: Use `.safeParse()` and return structured errors
- **i18n-friendly errors**: Use i18n keys (e.g. `"error.user.name.tooShort"`), not hardcoded strings

### Definition of Done (Per Module)

- All external inputs validated via Zod
- Types inferred (no duplicate interfaces)
- Tests cover valid + invalid payloads
- App builds and tests green
- Schema modules in shared package, used consistently

### Anti-Patterns (Forbidden)

- Duplicating DTO types instead of inference
- Validating manually when a schema exists
- `as` casts to bypass typing issues
- Exposing DB entity schema directly as public API output
- Deep internal parsing (parsing belongs at boundaries)
- Importing server-only schemas into client bundles

### Agent Stop Condition

If any instruction conflicts with "just change code quickly":
- **This standard wins**
- Agent must enforce Plan Mode first
- Require approval before execution

---

## Blueprint & Phase Tracker

Full blueprint: `docs/PiksPeak-Blueprint-Zusammenfassung.md`

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 0: Housekeeping | **In Progress** | Commit work, internalize Dexter dependency, extract repo |
| Phase 1: Foundation | Not Started | CLAUDE.md, docs, .env.example, API versioning, README |
| Phase 2: Backend | Not Started | Push notifications, referrals, closing odds, tests, logging |
| Phase 3: Mobile | Not Started | Notification settings, privacy/terms, RevenueCat, assets |
| Phase 4: Deployment | Not Started | Railway, CI/CD, migrations, monitoring |
| Phase 5: Pre-Launch | Not Started | App Store submission, legal, QA |
| Phase 6: Post-Launch | Not Started | Analytics, calibration, expansion |

### Critical Blocker

3 files import `../../../../src/tools/sports/api.js` (Dexter dependency):
- `prediction-pipeline.ts`, `prediction-agent.ts`, `result-tracker.ts`
- **Action**: Create `packages/backend/src/lib/sports-api.ts` as standalone replacement with Redis cache

### Key Decisions

Decision records in `docs/decisions/`:

| ID | Decision | Status |
|---|---|---|
| DR-001 | Standalone `pikspeak` repo (no subtree split) | Planned |
| DR-002 | Railway deployment (managed Docker + Postgres + Redis) | Planned |
| DR-003 | API versioning with `/v1/` prefix | Planned |
| DR-004 | Expo Push API for notifications | Planned |
| DR-005 | Sentry + pino + BetterStack monitoring | Planned |
| DR-006 | Drizzle Kit migrations before app start | Planned |

---

## Session Startup Protocol

**Execute this sequence at the start of EVERY session:**

### Step 1: Orientation (Always)

Read this file completely. Then check if `./docs/summaries/` has files.

- **If summaries exist**: Read all files in `./docs/summaries/`. These are compressed state from previous sessions. Do NOT read source documents unless specifically needed.
- **If no summaries**: This is a new session context. Check the Phase Tracker above.

### Step 2: Context Budget Check (Always)

- Total context window: ~200K tokens
- This CLAUDE.md: ~4K tokens
- Plan approach to stay within 60-70% total capacity
- Use Document Processing Protocol for multiple/large files

### Step 3: State Your Understanding (Always)

Before doing any work, tell the user:
- Current project state and phase
- What you plan to do in this session
- Any questions or ambiguities

**Do NOT start work without completing Steps 1-3.**

---

## Context Management Rules

**These rules override all other instincts.**

### Rule 1: Never Bulk-Read Documents
Process documents one at a time. Use Document Processing Protocol from `templates/claude-templates.md`.

### Rule 2: Write State to Disk, Not Conversation
After meaningful work, write summary to `./docs/summaries/` using templates.

### Rule 3: Manual Compaction at 60-70%
Run `/compact` proactively. ALWAYS write state first.

### Rule 4: One Concern Per Session
Research OR writing OR review — not all three. Split with handoff when switching phases.

### Rule 5: CLAUDE.md Is an Index, Not an Encyclopedia
Project context lives in `./docs/summaries/`. Never bloat this file.

### Rule 6: Monitor Context Continuously
Estimate usage every 3-4 exchanges. Proactively suggest splits.

---

## Subagent Deployment Rules

| Task | Approach | Why |
|------|----------|-----|
| Reading/analyzing documents | **Subagent** | Keeps source out of main context |
| Research and competitive analysis | **Subagent** | Heavy reading, return summary only |
| Writing deliverables | **Main agent** | Needs full context |
| Schema/architecture design | **Main agent** | Needs holistic understanding |
| Code generation (isolated) | **Subagent** | Isolated implementation |
| Review and QA | **Subagent** | Fresh perspective |
| Test writing | **Subagent** | Isolated, return result |

Subagent output must conform to Output Contracts in `templates/claude-templates.md`.

---

## Quality Gates

Before delivering any output:

- [ ] Matches actual request, not assumptions
- [ ] All claims backed by data or rationale
- [ ] Direct, active voice language
- [ ] TypeScript compiles without errors (`bunx tsc --noEmit`)
- [ ] No `any` types introduced
- [ ] Zod validation on external boundaries
- [ ] Summary file written for session work
- [ ] Open questions marked OPEN/ASSUMED
- [ ] Decisions reference rationale and rejected alternatives

---

## Error Recovery

### If Context Gets Corrupted
1. Write to `./docs/summaries/recovery-[date].md`
2. Tell user: "Context degraded. Saved state. Recommend fresh session."

### If Auto-Compact Fires
1. Re-read `./docs/summaries/` to rebuild context
2. Re-read this CLAUDE.md
3. Report what may have been lost

### If Task Will Exceed Context
Warn upfront with phased approach. Never silently attempt more than you can handle.

---

## File Organization

```
project-root/
├── CLAUDE.md                          <- This file
├── agents.md                          <- Symlink to CLAUDE.md
├── templates/
│   └── claude-templates.md            <- Summary, handoff, decision templates
├── docs/
│   ├── summaries/                     <- ALL active session state
│   │   ├── 00-project-brief.md
│   │   ├── source-[filename].md
│   │   ├── analysis-[topic].md
│   │   ├── decision-[num]-[topic].md
│   │   └── handoff-[date]-[topic].md
│   ├── decisions/                     <- Decision records (DR-*)
│   ├── handoffs/                      <- Session handoff templates
│   ├── discovery/                     <- Raw inputs
│   ├── research/                      <- Research sources
│   ├── archive/                       <- Processed files (DO NOT read)
│   │   └── handoffs/                  <- Superseded handoffs
│   └── api/                           <- OpenAPI spec
├── packages/
│   ├── backend/                       <- Hono API server
│   └── mobile/                        <- Expo React Native app
└── .claude/
    └── agents/                        <- Custom subagent definitions
```

---

## End of CLAUDE.md

**This file is your operating system. Follow it precisely. For all structured templates, read `templates/claude-templates.md` on demand.**

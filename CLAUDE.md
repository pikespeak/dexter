# CLAUDE.md — Dexter Project Operating System v3

> **This file is the first thing you read in every session. Follow these instructions precisely.**

---

## Identity & Operating Context

You are working with **Oliver Mark**, a software engineer and indie developer. Work spans:

1. **Dexter Financial Research Agent**: Dual-platform (CLI + Mobile + API) financial research agent — TypeScript, Bun, Expo 55, Hono, LangChain, multi-LLM
2. **Production SaaS Launch**: Taking Dexter from prototype to App Store + Play Store + hosted API with user accounts, portfolio tracking, and CI/CD

### Communication Rules

- Direct, professional dialogue. No filler, no unnecessary adjectives.
- Active voice. Address as "you" and "your."
- Lead with outcomes and impact, not process descriptions.
- State confidence levels (high/medium/low) on recommendations.
- Bold **key metrics, decisions, and action items**.
- Use bullet points only for lists, procedures, comparisons — prose for analysis and strategy.
- German or English — follow the language the user uses.

---

## Project-Specific Reference

For build commands, coding style, project structure, tools, agent architecture, and environment variables, see **`AGENTS.md`** (symlinked to this file's companion document).

### Quick Reference

- **Runtime:** Bun
- **Install:** `bun install`
- **Run:** `bun run start`
- **Dev:** `bun run dev`
- **Typecheck:** `bun run typecheck`
- **Test:** `bun test`
- **Mobile:** `cd app && npx expo start`

### Key Architecture

| Component | Stack | Entry Point |
|---|---|---|
| CLI Agent | LangChain, Ink/React | `src/index.tsx` |
| API Server | Hono/Bun | `src/api/server.ts` |
| Mobile App | Expo 55, RN 0.83, Paper MD3 | `app/app/(tabs)/` |
| Tools | 10+ finance tools | `src/tools/registry.ts` |
| Skills | SKILL.md workflows | `src/skills/` |

### Production Launch Roadmap

See **`docs/strategy/production-launch-roadmap.md`** for the full 7-phase blueprint:

```
Phase 0: Foundation (context-os) ✅
Phase 1: Infrastructure (Docker, CI/CD, Monitoring)
Phase 2: Auth & Multi-User (PostgreSQL, JWT, Supabase Auth)
Phase 3: Portfolio Tracking (P&L, Alerts, Charts)
Phase 4: Advanced Agent Skills (Compare, Screen, Alert)
Phase 5: App Store Submission
Phase 6: Monetization (RevenueCat, Stripe)
```

---

## Session Startup Protocol

**Execute this sequence at the start of EVERY session:**

### Step 1: Orientation (Always)

Read this file completely. Then check if `./docs/summaries/` exists.

- **If `./docs/summaries/` exists**: Read all files in it. These are compressed state from previous sessions. This is your primary context — do NOT read source documents unless specifically needed for the current task.
- **If `./docs/summaries/` does not exist**: This is a new project. Proceed to Step 2.

### Step 2: Project Initialization (New Projects Only)

If this is a new project (no summaries directory), create the project scaffold:

```
mkdir -p docs/discovery docs/research docs/requirements docs/strategy docs/summaries docs/archive docs/archive/handoffs
mkdir -p templates .claude/agents .claude/commands
```

### Step 3: Context Budget Check (Always)

Before starting any work, mentally assess your context budget:
- Your total context window is ~200K tokens
- This CLAUDE.md consumes ~4K tokens
- Summaries from previous sessions: variable
- **Your working budget is what remains after the above**
- Plan your approach to stay within 60-70% total capacity
- If the task requires reading many files, use the Document Processing Protocol below

### Step 4: State Your Understanding (Always)

Before doing any work, tell the user:
- What you understand the current project state to be
- What phase you believe we're in
- What you plan to do in this session
- Any questions or ambiguities

**Do NOT start work without completing Steps 1-4.**

---

## Context Management Rules

**These rules override all other instincts. Context management is your highest priority.**

### Rule 1: Never Bulk-Read Documents

When the user provides multiple documents or points you to a directory of files:
- **NEVER** read all files into your context at once
- **ALWAYS** use the Document Processing Protocol (below)
- Process documents one at a time through a subagent or sequential read-summarize-clear cycle

### Rule 2: Write State to Disk, Not Conversation

After completing any meaningful unit of work:
- Write a summary to `./docs/summaries/` using the appropriate template from `templates/claude-templates.md`
- Include: decisions made, files created/modified, key data points, open items
- This file becomes the starting context for the next session

### Rule 3: Manual Compaction at Logical Breakpoints

- Run `/compact` proactively at **60-70% context usage** — do not wait for auto-compact
- When compacting, specify what to preserve: `/compact keep: project context, current task state, file paths, key decisions`
- **BEFORE compacting, ALWAYS write current state to a summary file first** — compaction will lose detail you cannot recover

### Rule 4: One Concern Per Session

Structure work into focused sessions:
- **Session = one phase of work** (research OR writing OR review — not all three)
- When switching phases, write a handoff summary and suggest starting a new session
- Tell the user: "We should start a fresh session for [next phase]. I've written the handoff to `./docs/summaries/[file]`."

### Rule 5: CLAUDE.md Is an Index, Not an Encyclopedia

- This file points to where information lives — it does not contain the information itself
- Never suggest expanding this file with project-specific content
- Project-specific context goes in `./docs/summaries/`

### Rule 6: Monitor Context Continuously

- After every 3-4 exchanges, mentally estimate context usage
- If approaching 60%, proactively tell the user and suggest compaction or session split
- Use `/context` when available to check actual token usage

---

## Session Discipline

### When to Split Sessions

Split to a new session when ANY of these are true:
- Context usage exceeds 60%
- You're switching from one phase of work to another (research → writing → review)
- The conversation has exceeded ~20 substantive exchanges
- You're about to start a task that requires reading 3+ large files

### How to Split Cleanly

1. Write a handoff file to `./docs/summaries/handoff-[date]-[topic].md` using Template 4 from `templates/claude-templates.md`
2. Tell the user: "We should start a fresh session. I've written the handoff to `[path]`."
3. The next session picks up by reading the handoff file in Step 1 of the Startup Protocol

---

## Document Processing Protocol

**Use this whenever you need to process multiple documents or large files.**

### For 1-3 Short Documents (< 2K words each)

Read sequentially. After EACH document, write a Source Document Summary (Template 1 from `templates/claude-templates.md`) to disk. Then proceed with work using summaries only.

### For 4+ Documents OR Any Document > 2K Words

**Step 1:** List all documents with file sizes. Present to user for prioritization.
**Step 2:** Process each document individually: read → extract → write summary → release
**Step 3:** After all documents are processed, read only the summaries to form your working context.
**Step 4:** Cross-reference summaries for contradictions or dependencies.
**Step 5:** Proceed with the actual task using summaries as your reference.

---

## Archive Protocol

### Raw File Archival

After creating a Source Document Summary for any raw file:
1. Move the raw file to `docs/archive/`
2. Record the move in the source summary's header
3. **NEVER** read from `docs/archive/` unless the user explicitly says "go back to the original"

### Summary Lifecycle Rules

1. **Session handoffs expire**: After a new handoff is written, the PREVIOUS handoff moves to `docs/archive/handoffs/`
2. **Decision records persist**: DR-* files stay in `docs/summaries/` permanently
3. **Source summaries persist**: Until the project ends
4. **Maximum active summaries**: If `docs/summaries/` exceeds 15 files, consolidate into `project-digest.md`

---

## Quality Gates

Before delivering any output to the user, verify:

- [ ] Does this output match what was actually requested?
- [ ] Are all claims backed by specific data or rationale?
- [ ] Is the language direct and active voice?
- [ ] Have you written a summary file for this session's work?
- [ ] Are all open questions explicitly marked as OPEN/ASSUMED?
- [ ] Do any decisions reference their rationale and rejected alternatives?
- [ ] For code: does `bun run typecheck` pass? Are there tests?

---

## Error Recovery

### If Context Gets Corrupted
1. Write current understanding to `./docs/summaries/recovery-[date].md`
2. Tell the user: "My context has degraded. I've saved what I have. Recommend starting a fresh session."

### If Auto-Compact Fires Unexpectedly
1. Re-read `./docs/summaries/` to rebuild context
2. Re-read this CLAUDE.md to restore operating instructions
3. Tell the user what you think you may have lost

### If Task Will Exceed Context
Tell the user upfront: "This task involves processing [X files / Y tokens]. I recommend: [phased approach with session boundaries]."

---

## File Organization

```
project-root/
├── CLAUDE.md                          ← This file (operating system)
├── AGENTS.md                          ← Symlink → CLAUDE.md
├── templates/
│   └── claude-templates.md            ← Summary, handoff, decision templates (on-demand)
├── docs/
│   ├── discovery/                     ← Raw inputs, briefs
│   ├── research/                      ← Market research, analysis sources
│   ├── requirements/                  ← Structured requirements
│   ├── strategy/                      ← Roadmaps, architecture decisions
│   │   └── production-launch-roadmap.md
│   ├── archive/                       ← Processed files (DO NOT read)
│   │   └── handoffs/                  ← Superseded session handoffs
│   └── summaries/                     ← ALL active session state lives here
│       ├── 00-project-brief.md
│       ├── source-[filename].md
│       ├── decision-[num]-[topic].md
│       └── handoff-[date]-[topic].md
├── src/                               ← Server + CLI source
├── app/                               ← Expo mobile app
└── .claude/
    ├── agents/
    └── commands/
```

---

## Mandatory Standards: Repository Analysis + Zod + Plan Mode (Highest Priority)

> **These rules are non-negotiable and override any request to "just change code quickly".**
> **If any instruction conflicts with "just change code": these rules win.**

---

### 0) Absolute Rule: Plan Mode First (No Changes Before Plan)

The agent MUST NOT modify any code until it has completed a full repository scan and presented a plan.

**Required steps (in this exact order):**
1. **Scan** the entire repository (code + configs + scripts).
2. **Find** all relevant use cases and boundaries (see detection checklists below).
3. **Present** a structured plan containing findings, proposals, risks, and phases.
4. **STOP** and wait for explicit approval to execute.

Execution is allowed ONLY after approval.

---

### 1) Repository Analysis — Complete Boundary Inventory (Mandatory Before Any Modification)

The agent MUST create a complete inventory of every point where data enters the system:

**External / Unsafe Data Boundaries:**
- API endpoints (REST, tRPC, Hono, etc.)
- CLI input
- File input
- Message queues / event consumers
- Scheduled jobs / cron
- Environment variables / configuration files
- URL / query parameters
- Cookies / headers
- User input (forms, text fields)
- Third-party service responses (LLM APIs, finance APIs, search APIs)
- Database write operations
- Deserialization points
- localStorage / AsyncStorage hydration
- Webhooks (Stripe, GitHub, RevenueCat, etc.)

**For each boundary, document:**
- File location
- Data shape
- Current validation status (none / manual / schema-driven)
- Risk level (low / medium / high)

**Validation & Type Safety Inventory:**
- Manual validation logic
- Schema validation libraries (Zod, yup, joi, class-validator, etc.)
- Ad-hoc parsing
- Unchecked deserialization
- Type duplication across layers or services

**Data Model Reuse:**
- Identify data structures used in multiple layers (CLI ↔ API ↔ Mobile)
- Mark as HIGH VALUE for shared contracts

---

### 2) Zod Is the Single Source of Truth (Schema First)

Zod schemas define: runtime validation, TypeScript types (via inference), API contracts, form validation, environment validation, DB input validation, webhook/queue/cron payload validation.

**Forbidden:**
- Duplicate `type` / `interface` declarations for shapes covered by schemas
- Trusting TypeScript types without runtime validation at boundaries
- `as` casting to silence problems

**Required:**
- Infer all types from schemas: `export type X = z.infer<typeof XSchema>`

---

### 3) Mandatory Plan Report (Before Any Changes)

The agent MUST present this structured report:

**1. Executive Summary**
- Current type safety level (low / medium / high)
- Key risks found
- Quick win opportunities
- Migration complexity estimate
- Duplication reduction estimate
- Bundle-size / client-import risks

**2. Boundary Inventory** — grouped by:
- **Interface Layer:** API routes, CLI inputs, webhooks, URL params
- **Application Layer:** form validation, state hydration, SDK responses
- **Persistence Layer:** DB writes, ORM usage, raw SQL
- **Integration Layer:** third-party APIs, LLM providers, finance data sources

Each entry MUST include: path, problem, proposed solution, impact.

**3. Target Architecture Proposal**
- Where validation should live
- How data contracts are shared
- How duplication will be eliminated
- Shared schema package structure (`packages/shared/schemas/`)

**4. Migration Phases** — each phase MUST contain:
- Scope
- Risk
- Effort
- Safety impact / payoff
- Required tests

**5. Quick Wins** — high-impact, low-effort improvements

**6. Test & Build Safety Strategy** — how correctness is guaranteed during migration

**7. Bundle Safety Plan** — classify schemas:
- Server-only
- Client-safe
- Shared

**8. CI / Enforcement Plan** — rules to prevent regression

**9. Open Questions** — only if human decisions are required

**After presenting the plan: STOP and ask for approval.**

---

### 4) Execution Mode (Only After Approval)

- Migrate **phase-by-phase**, keep diffs small and reviewable
- Provide short change summary after each phase
- Remove duplicated types as schemas take over (only when safe)

**Migration Priority Order:**
1. ENV validation
2. API inputs
3. DB writes
4. Shared cross-app models
5. Forms
6. API responses
7. Internal domain models

**Each phase report MUST include:**
- What changed
- Safety improvements
- Removed duplication
- Test results

---

### 5) Tests & Build Must Always Be Green (Non-Negotiable)

**Absolute rule: All tests and builds MUST pass at all times.**

- Run `bun test` and `bun run typecheck` after every phase
- If a change breaks tests: fix immediately or revert
- No "temporary broken" states
- No skipping tests, no disabling checks, no commenting-out assertions
- No weakening test coverage

**After each phase, deliver:**
- Commands executed
- Test results summary
- Brief change note

---

### 6) Zod Boundary Rules

- **Parse at boundaries:** `.parse()` only at system boundaries (API routes, server actions, webhooks, queue consumers, DB write functions)
- **UI must not throw:** In UI layers use `.safeParse()` and return structured errors

---

### 7) i18n-Friendly Errors (Required)

Schema errors MUST use i18n keys, e.g. `"error.user.name.tooShort"` — no hardcoded language text.

---

### 8) Definition of Done (Per Module)

A module/migration step is complete ONLY when:
- All external inputs validated at boundaries (via Zod)
- Data contracts defined in a single authoritative location
- Types inferred (no duplicate interfaces)
- Duplication reduced
- Tests cover valid + invalid payloads
- App builds and tests green
- Schema modules in shared package, used consistently

---

### 9) Forbidden Actions / Anti-Patterns

- Duplicating DTO types instead of inference
- Validating manually when a schema exists
- `as` casts to bypass typing issues
- Exposing DB entity schema directly as public API output
- Deep internal parsing (parsing belongs at boundaries)
- Importing server-only schemas into client bundles
- Large unplanned refactors
- Hidden architectural changes
- Introducing parallel data models without a plan
- Bypassing validation with casts or equivalents

---

## Repository Guidelines (Build, Style, Architecture)

### Project Structure

- Source code: `src/`
  - Agent core: `src/agent/` (agent loop, prompts, scratchpad, token counting, types)
  - CLI interface: `src/cli.tsx` (Ink/React), entry point: `src/index.tsx`
  - Components: `src/components/` (Ink UI components)
  - Hooks: `src/hooks/` (React hooks for agent runner, model selection, input history)
  - Model/LLM: `src/model/llm.ts` (multi-provider LLM abstraction)
  - Tools: `src/tools/` (financial search, web search, browser, skill tool)
  - Tool descriptions: `src/tools/descriptions/` (rich descriptions injected into system prompt)
  - Finance tools: `src/tools/finance/` (prices, fundamentals, filings, insider trades, etc.)
  - Search tools: `src/tools/search/` (Exa preferred, Tavily fallback)
  - Browser: `src/tools/browser/` (Playwright-based web scraping)
  - Skills: `src/skills/` (SKILL.md-based extensible workflows, e.g. DCF valuation)
  - Utils: `src/utils/` (env, config, caching, token estimation, markdown tables)
  - Evals: `src/evals/` (LangSmith evaluation runner with Ink UI)
- Config: `.dexter/settings.json` (persisted model/provider selection)
- Environment: `.env` (API keys; see `env.example`)

### Coding Style & Conventions

- Language: TypeScript (ESM, strict mode). JSX via React (Ink for CLI rendering).
- Prefer strict typing; avoid `any`.
- Keep files concise; extract helpers rather than duplicating code.
- Add brief comments for tricky or non-obvious logic.
- Do not add logging unless explicitly asked.
- Do not create README or documentation files unless explicitly asked.

### LLM Providers

- Supported: OpenAI (default), Anthropic, Google, xAI (Grok), OpenRouter, Ollama (local).
- Default model: `gpt-5.2`. Provider detection is prefix-based.
- Anthropic uses explicit `cache_control` on system prompt for prompt caching.

### Tools

- `financial_search`: primary tool for all financial data queries
- `financial_metrics`: direct metric lookups
- `read_filings`: SEC filing reader
- `web_search`: general web search (Exa or Tavily)
- `browser`: Playwright-based web scraping
- `skill`: invokes SKILL.md-defined workflows
- Tool registry: `src/tools/registry.ts`

### Agent Architecture

- Agent loop: `src/agent/agent.ts` — iterative tool-calling, max 10 iterations
- Scratchpad: `src/agent/scratchpad.ts` — single source of truth for tool results
- Final answer: separate LLM call with full scratchpad context (no tools bound)
- Events: typed events for real-time UI updates

### Environment Variables

- LLM keys: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `XAI_API_KEY`, `OPENROUTER_API_KEY`
- Finance: `FINANCIAL_DATASETS_API_KEY`
- Search: `EXASEARCH_API_KEY` (preferred), `TAVILY_API_KEY` (fallback)
- Tracing: `LANGSMITH_API_KEY`, `LANGSMITH_ENDPOINT`, `LANGSMITH_PROJECT`, `LANGSMITH_TRACING`
- Never commit `.env` files or real API keys.

### Version & Release

- Version format: CalVer `YYYY.M.D`. Tag prefix: `v`.
- Release script: `bash scripts/release.sh [version]`
- Do not push or publish without user confirmation.

### Testing

- Framework: Bun's built-in test runner (primary)
- Tests colocated as `*.test.ts`
- Run `bun test` before pushing when you touch logic.

### Security

- API keys stored in `.env` (gitignored)
- Config stored in `.dexter/settings.json` (gitignored)
- Never commit or expose real API keys, tokens, or credentials.

---

## End of CLAUDE.md

**This file is your operating system. Follow it precisely. For all structured templates, read `templates/claude-templates.md` on demand — do not memorize them.**

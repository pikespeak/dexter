# Project Brief: Dexter Financial Research Agent
**Created:** 2026-03-05
**Last Updated:** 2026-03-05

## Client
- **Name:** Oliver Mark (Solo Developer / Indie)
- **Industry:** FinTech / Financial Research
- **Relationship:** Owner / Creator

## Engagement
- **Type:** Agent Development + SaaS Product Launch
- **Scope:** Take Dexter from functional prototype to production SaaS — App Store + Play Store + hosted API — with user accounts, portfolio tracking, advanced agent skills, full CI/CD, and monetization.
- **Target Deliverable:** Production-ready multi-platform financial research agent (CLI + Mobile + Web + API)
- **Timeline:** Multi-phase, see `docs/strategy/production-launch-roadmap.md`

## Input Documents
| Document | Path | Processed? | Summary At |
|----------|------|-----------|------------|
| Production Launch Blueprint | `docs/strategy/production-launch-roadmap.md` | Yes | This file |
| AGENTS.md (original) | Merged into `CLAUDE.md` | Yes | `CLAUDE.md` |

## Success Criteria
- App published on App Store + Play Store
- User accounts with JWT auth, per-user data in PostgreSQL
- Portfolio tracking with P&L, alerts, push notifications
- Agent extended with comparison, screening, alert skills
- Freemium monetization via RevenueCat + Stripe
- CI/CD: Docker → GHCR → staging/production deploy
- Zero TypeScript errors, tests green at all times
- Zod schemas as single source of truth at all boundaries

## Known Constraints
- Solo developer — phases must be sequential (except Phase 3 + 4 parallel)
- Apple App Store review requires disclaimers ("Research" not "Advice") + demo mode
- LLM API costs scale with multi-user — need per-user limits
- Bun runtime — not all Node.js packages compatible

## Project Phase Tracker
| Phase | Status | Summary File | Date |
|-------|--------|-------------|------|
| Phase 0: Foundation (context-os) | Complete | This file + `CLAUDE.md` | 2026-03-05 |
| Phase 1: Infrastructure | Not Started | | |
| Phase 2: Auth & Multi-User | Not Started | | |
| Phase 3: Portfolio Tracking | Not Started | | |
| Phase 4: Advanced Agent Skills | Not Started | | |
| Phase 5: App Store Submission | Not Started | | |
| Phase 6: Monetization | Not Started | | |

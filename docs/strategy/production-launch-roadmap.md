# Dexter — Production Launch Blueprint
# Dexter — Produktions-Launch Blueprint

---

## Context / Kontext

**EN:** Dexter is a dual-platform financial research agent (CLI + Mobile + API). The current prototype is functional: Expo 55 app with MD3 theme, Hono API on Bun, LangChain agent with 10+ finance tools, multi-LLM support. The goal is to take Dexter from prototype to production SaaS — App Store + Play Store + hosted API — with user accounts, portfolio tracking, advanced agent skills, and full CI/CD infrastructure. Additionally, the project adopts `claude-context-os` as its operating system for structured session management and persistent project knowledge.

**DE:** Dexter ist ein Dual-Platform Financial Research Agent (CLI + Mobile + API). Der aktuelle Prototyp funktioniert: Expo 55 App mit MD3-Theme, Hono API auf Bun, LangChain Agent mit 10+ Finanz-Tools, Multi-LLM-Support. Ziel: Dexter vom Prototyp zum Produktions-SaaS bringen — App Store + Play Store + gehostete API — mit User-Accounts, Portfolio-Tracking, erweiterten Agent-Skills und vollständiger CI/CD-Infrastruktur. Zusätzlich wird `claude-context-os` als Operating System für strukturiertes Session-Management und persistentes Projektwissen eingeführt.

---

## Current State / Aktueller Stand

| Component / Komponente | Status | Details |
|---|---|---|
| Mobile App | Prototype / Prototyp | Expo 55, RN 0.83, Paper MD3, 4 Tabs + Onboarding + Ticker Detail |
| API Server | Prototype / Prototyp | Hono/Bun, 8 Route-Gruppen, Bearer-Token-Auth, Rate Limiting |
| CLI Agent | Functional / Funktional | LangChain, Ink UI, 10+ Tools, DCF Skill, Multi-LLM |
| Auth | Minimal | Einfache API-Keys via Env-Var, kein User-System |
| Database | None / Keine | Alles in-memory (Server) oder AsyncStorage (Mobile) |
| CI/CD | Basic | GitHub Actions: typecheck + test |
| Monitoring | None / Keine | console.log only |
| Portfolio | None / Keine | — |
| App Store | Not submitted / Nicht eingereicht | — |

**Branch:** `claude/create-mobile-api-vVTpn` | **TS Errors:** 0 | **Web Export:** OK

---

## Architecture Decisions / Architektur-Entscheidungen

| Decision / Entscheidung | Choice / Wahl | Rationale / Begründung |
|---|---|---|
| Database | PostgreSQL + Drizzle ORM | Multi-User braucht concurrent writes, JSON columns, Full-Text Search. Drizzle ist TS-nativ, SQL-first, Bun-kompatibel |
| Auth | Supabase Auth | Schnellster Weg zu Production Auth (Email, OAuth, MFA, Password Reset). RN-Support. Kein Vendor-Lock-in bei Data Layer |
| Hosting API | Railway oder Fly.io | Docker + Bun nativ, Managed Platform, zero Ops |
| Hosting Web | Vercel | Expo Web Export ist statisch, Vercel ideal |
| Payments | RevenueCat (Mobile) + Stripe (Web) | RevenueCat handled App Store / Play Store Subscription-Complexity |
| Push Notifications | Expo Push Notifications | Bereits im Expo-Ökosystem |
| CI/CD | GitHub Actions + EAS Build | CI existiert bereits, EAS für Mobile Builds |

---

## Dependency Graph / Abhängigkeiten

```
Phase 0: Foundation (context-os Setup)
    │
    ▼
Phase 1: Infrastructure (CI/CD, Docker, Monitoring)
    │
    ▼
Phase 2: Auth & Multi-User (DB, JWT, Per-User Data)
   ╱ ╲
  ▼   ▼
Phase 3: Portfolio    Phase 4: Agent Skills  ← parallel möglich
  ╲   ╱
   ▼ ▼
Phase 5: App Store Submission
    │
    ▼
Phase 6: Monetization
```

---

## Phase 0: Foundation — claude-context-os Setup

**EN:** Establish the operating system for structured session management before any feature work.
**DE:** Operating System für strukturiertes Session-Management etablieren, bevor Feature-Arbeit beginnt.

**Complexity / Komplexität:** M

| # | Task | Size | Files |
|---|------|------|-------|
| 0.1 | `CLAUDE.md` nach context-os Konventionen erstellen (6 Regeln, Session-Protokoll, Quality Gates). `AGENTS.md` bleibt als Build/Style-Referenz | S | `/CLAUDE.md` |
| 0.2 | `docs/` Verzeichnisstruktur anlegen | S | `docs/{discovery,research,requirements,strategy,archive,summaries}/` |
| 0.3 | `docs/summaries/00-project-brief.md` — Vision, Constraints, Success Criteria | S | `docs/summaries/00-project-brief.md` |
| 0.4 | Production-Launch-Roadmap committen | S | `docs/strategy/production-launch-roadmap.md` |
| 0.5 | Session-Handoff-Template anlegen | S | `docs/summaries/SESSION-TEMPLATE.md` |

**Verification / Verifikation:**
- `CLAUDE.md` folgt den 6 context-os Regeln
- `docs/` Struktur matcht context-os Spec
- Alles committed

---

## Phase 1: Infrastructure / Infrastruktur

**EN:** Production-ready API server with CI/CD, monitoring, and environment management.
**DE:** Produktionsreifer API-Server mit CI/CD, Monitoring und Environment-Management.

**Complexity / Komplexität:** L

### 1A. Docker & Environments

| # | Task | Size | Files |
|---|------|------|-------|
| 1A.1 | `docker-compose.yml` mit API Service + DB Placeholder + Reverse Proxy | M | `/docker-compose.yml` |
| 1A.2 | `docker-compose.prod.yml` Override für Production | S | `/docker-compose.prod.yml` |
| 1A.3 | Environment Config Loader (dev/staging/prod Profiles) | M | `/src/utils/env.ts` (modify) |
| 1A.4 | Health Endpoint verbessern (Readiness + Liveness Probes) | S | `/src/api/routes/health.ts` (modify) |
| 1A.5 | Multi-Stage Dockerfile (Build + Prod Layer, Non-Root User) | S | `/Dockerfile` (modify) |

### 1B. CI/CD Pipeline

| # | Task | Size | Files |
|---|------|------|-------|
| 1B.1 | CI erweitern: Docker Build + Push zu GHCR | M | `/.github/workflows/ci.yml` (modify) |
| 1B.2 | Deploy Workflow (Staging auf Merge, Prod auf Tag) | M | `/.github/workflows/deploy.yml` |
| 1B.3 | EAS Build Workflow für Mobile | M | `/.github/workflows/eas-build.yml` |
| 1B.4 | Expo Web Export Deploy Workflow | S | `/.github/workflows/web-deploy.yml` |

### 1C. Monitoring & Observability

| # | Task | Size | Files |
|---|------|------|-------|
| 1C.1 | Structured JSON Logger (ersetze console.log/error) | M | `/src/utils/logger.ts`, `/src/api/server.ts` |
| 1C.2 | Request-ID Middleware für Tracing | S | `/src/api/middleware/request-id.ts` |
| 1C.3 | Metrics Endpoint (Request Count, Latenz, Error Rates) | M | `/src/api/middleware/metrics.ts` |
| 1C.4 | Error Tracking (Sentry, konfiguriert via Env) | M | `/src/utils/error-tracking.ts` |

**Verification / Verifikation:**
- `docker compose up` startet API mit Health Checks
- CI baut Docker Image + pusht zu GHCR
- Deploy Workflow deployed zu Staging/Production
- Structured Logs sichtbar in Host-Platform
- Request-IDs propagieren durch den Stack

---

## Phase 2: Auth & Multi-User

**EN:** Replace anonymous single-user model with real accounts, JWT auth, and per-user data in PostgreSQL.
**DE:** Anonymes Single-User-Modell ersetzen durch echte Accounts, JWT Auth und Per-User-Daten in PostgreSQL.

**Complexity / Komplexität:** XL

### 2A. Database Setup

| # | Task | Size | Files |
|---|------|------|-------|
| 2A.1 | Drizzle ORM + pg Driver installieren | S | `/package.json` |
| 2A.2 | DB Schema: users, watchlists, search_history, chat_sessions, chat_messages, api_keys, user_settings | L | `/src/db/schema.ts` |
| 2A.3 | Drizzle Config + Migration Tooling | S | `/drizzle.config.ts`, `/src/db/index.ts` |
| 2A.4 | Initial Migration | S | `/src/db/migrations/0001_initial.sql` |
| 2A.5 | DB Health Check im Health Endpoint | S | `/src/api/routes/health.ts` |
| 2A.6 | PostgreSQL in docker-compose | S | `/docker-compose.yml` |

### 2B. Auth Implementation

| # | Task | Size | Files |
|---|------|------|-------|
| 2B.1 | Auth Middleware: JWT Validation (ersetzt Bearer-Key-Auth) | M | `/src/api/middleware/auth.ts` (rewrite) |
| 2B.2 | Auth Routes: register, login, refresh, forgot-password | L | `/src/api/routes/auth.ts` |
| 2B.3 | User Context Middleware (User an Request-Context) | S | `/src/api/middleware/user-context.ts` |
| 2B.4 | Per-User API Key Management Routes | M | `/src/api/routes/user.ts` |
| 2B.5 | Rate Limiter auf User-ID umstellen | S | `/src/api/middleware/rate-limit.ts` |

### 2C. Per-User Data Routes

| # | Task | Size | Files |
|---|------|------|-------|
| 2C.1 | Watchlist CRUD: GET/POST/DELETE /user/watchlist | M | `/src/api/routes/user-watchlist.ts` |
| 2C.2 | Search History Routes | S | `/src/api/routes/user-history.ts` |
| 2C.3 | Chat Session Routes (Sessions + Messages) | M | `/src/api/routes/user-chat.ts` |
| 2C.4 | User Settings Routes | S | `/src/api/routes/user-settings.ts` |
| 2C.5 | Agent Route: Chat Messages in DB persistieren | M | `/src/api/routes/agent.ts` (modify) |

### 2D. Mobile App Auth

| # | Task | Size | Files |
|---|------|------|-------|
| 2D.1 | Auth Screens: Login, Register, Forgot Password | L | `/app/app/auth/{login,register,forgot-password}.tsx` |
| 2D.2 | Auth Store (Zustand Slice für Session/Tokens) | M | `/app/lib/auth-store.ts` |
| 2D.3 | API Client: JWT Tokens aus Auth Store nutzen | M | `/app/lib/api-client.ts` (modify) |
| 2D.4 | Auth Guard in _layout.tsx (Redirect zu Login) | M | `/app/app/_layout.tsx` (modify) |
| 2D.5 | Store.ts: Watchlist/History mit Server syncen | L | `/app/lib/store.ts` (modify) |
| 2D.6 | Token Refresh Logic (Auto-Refresh vor Expiry) | M | `/app/lib/api-client.ts` (modify) |
| 2D.7 | Secure Token Storage (expo-secure-store) | S | `/app/lib/secure-store.ts` |

### 2E. CLI Auth

| # | Task | Size | Files |
|---|------|------|-------|
| 2E.1 | `dexter login` / `dexter logout` Commands | M | `/src/cli.tsx` (modify) |
| 2E.2 | JWT Token in `.dexter/auth.json` speichern | S | `/src/utils/config.ts` (modify) |

**Verification / Verifikation:**
- User kann registrieren, einloggen, JWT erhalten
- JWT wird auf allen geschützten Endpoints validiert
- Watchlist, History, Chat persistieren per User in Postgres
- Mobile Login/Register Flow funktioniert E2E
- Mock-Data-Modus funktioniert weiterhin offline
- CLI kann authentifizieren

---

## Phase 3: Portfolio Tracking

**EN:** Track positions, calculate P&L, compare vs benchmarks, receive price alerts.
**DE:** Positionen tracken, P&L berechnen, Benchmark-Vergleich, Preis-Alerts.

**Complexity / Komplexität:** XL | **Depends on / Abhängig von:** Phase 2

### 3A. Database

| # | Task | Size | Files |
|---|------|------|-------|
| 3A.1 | Portfolio Tables: portfolios, positions, transactions, alerts | M | `/src/db/schema.ts`, `/src/db/migrations/0002_portfolio.sql` |

### 3B. API Routes

| # | Task | Size | Files |
|---|------|------|-------|
| 3B.1 | Portfolio CRUD | M | `/src/api/routes/portfolio.ts` |
| 3B.2 | Transaction Recording | M | `/src/api/routes/portfolio-transactions.ts` |
| 3B.3 | P&L Calculation Engine (FIFO/Avg, Realized + Unrealized) | L | `/src/services/portfolio-pnl.ts` |
| 3B.4 | Performance Endpoint (Time-Series + Benchmark Comparison) | L | `/src/api/routes/portfolio-performance.ts` |
| 3B.5 | Portfolio Overview (Holdings, Total Value, Allocation) | M | `/src/api/routes/portfolio.ts` |

### 3C. Alerts

| # | Task | Size | Files |
|---|------|------|-------|
| 3C.1 | Alert CRUD Routes | M | `/src/api/routes/alerts.ts` |
| 3C.2 | Alert Evaluation Worker (periodischer Price Check) | L | `/src/workers/alert-worker.ts` |
| 3C.3 | Push Notification Integration (Expo Push) | M | `/src/services/push-notifications.ts` |
| 3C.4 | `expo-notifications` in Mobile App | M | `/app/lib/notifications.ts` |

### 3D. Mobile Screens

| # | Task | Size | Files |
|---|------|------|-------|
| 3D.1 | Portfolio Tab (Dashboard: Holdings, Value, Daily P&L) | L | `/app/app/(tabs)/portfolio.tsx` |
| 3D.2 | Add Transaction Screen (Buy/Sell Form) | M | `/app/app/portfolio/add-transaction.tsx` |
| 3D.3 | Position Detail Screen (Per-Stock P&L, History) | M | `/app/app/portfolio/position/[symbol].tsx` |
| 3D.4 | Performance Chart (Portfolio vs Benchmark Overlay) | L | `/app/components/PerformanceChart.tsx` |
| 3D.5 | Alerts Management Screen | M | `/app/app/settings/alerts.tsx` |
| 3D.6 | Portfolio Store (Zustand Slice) | M | `/app/lib/portfolio-store.ts` |
| 3D.7 | Tab Navigator um Portfolio-Tab erweitern | S | `/app/app/(tabs)/_layout.tsx` (modify) |

**Verification / Verifikation:**
- Portfolio erstellen, Buy/Sell Transactions hinzufügen
- P&L berechnet korrekt (mit bekannten Testdaten)
- Performance Chart zeigt Portfolio vs S&P 500
- Price Alerts triggern Push Notifications
- Portfolio Overview zeigt korrekte Allocations

---

## Phase 4: Advanced Agent Skills

**EN:** Extend agent with comparison, screening, alert creation, and improved multi-step reasoning.
**DE:** Agent erweitern mit Vergleich, Screening, Alert-Erstellung und verbessertem Multi-Step Reasoning.

**Complexity / Komplexität:** L | **Kann parallel zu Phase 3 starten**

### 4A. New Skills / Neue Skills

| # | Task | Size | Files |
|---|------|------|-------|
| 4A.1 | Comparison Skill (2+ Stocks Side-by-Side) | M | `/src/skills/compare/SKILL.md` |
| 4A.2 | Screening Skill (Filter nach Kriterien: P/E, Revenue Growth, etc.) | L | `/src/skills/screen/SKILL.md`, `/src/tools/finance/screener.ts` |
| 4A.3 | Alert Skill (Agent erstellt Alerts für User) | M | `/src/skills/alert/SKILL.md` |
| 4A.4 | DCF Skill erweitern (Sektor-WACC, bessere Validation) | S | `/src/skills/dcf/SKILL.md` |

### 4B. New Tools / Neue Tools

| # | Task | Size | Files |
|---|------|------|-------|
| 4B.1 | Screener Tool für Stock Screening | L | `/src/tools/finance/screener.ts` |
| 4B.2 | Portfolio Tool (Agent liest User-Portfolio) | M | `/src/tools/portfolio.ts` |
| 4B.3 | Alert Tool (Agent erstellt/ändert Alerts) | M | `/src/tools/alert.ts` |

### 4C. Reasoning Improvements

| # | Task | Size | Files |
|---|------|------|-------|
| 4C.1 | Multi-Step Planning Prompt (Agent deklariert Plan vor Ausführung) | M | `/src/agent/prompts.ts` |
| 4C.2 | Chain-of-Thought Structuring für komplexe Queries | S | `/src/agent/prompts.ts` |
| 4C.3 | Konfigurierbare Max Iterations pro Skill | S | `/src/agent/agent.ts` |

**Verification / Verifikation:**
- "Compare AAPL and MSFT" → strukturierter Side-by-Side Vergleich
- "Find stocks with P/E under 15" → gefilterte Ergebnisse
- "Alert me when AAPL drops below $150" → persistenter Alert
- Agent plant Multi-Step Research und führt kohärent aus

---

## Phase 5: App Store Submission

**EN:** Prepare and submit to Apple App Store and Google Play Store.
**DE:** Vorbereiten und Einreichen bei Apple App Store und Google Play Store.

**Complexity / Komplexität:** L | **Depends on / Abhängig von:** Phases 1–3

| # | Task | Size | Files |
|---|------|------|-------|
| 5.1 | `bundleIdentifier` (iOS) + `package` (Android) in app.json | S | `/app/app.json` |
| 5.2 | EAS Config (`eas.json`) mit Build Profiles | M | `/app/eas.json` |
| 5.3 | Production App Icons (1024x1024 iOS, Adaptive Android) | M | `/app/assets/` |
| 5.4 | Splash Screen finalisieren | S | `/app/app.json` |
| 5.5 | Privacy Policy + Terms of Service | M | Web Pages |
| 5.6 | `expo-updates` für OTA Updates | M | `/app/app.json`, `/app/package.json` |
| 5.7 | Apple Developer + App Store Connect Setup | M | External |
| 5.8 | Google Play Console Setup | M | External |
| 5.9 | Financial Data Disclaimers in App | S | UI Changes |
| 5.10 | Demo Mode für App Review sicherstellen | S | `/app/lib/mock-data.ts` (verify) |

**Verification / Verifikation:**
- EAS Build produziert signierte IPA + AAB
- App installiert und läuft auf physischen iOS/Android Geräten
- Demo Mode funktioniert E2E
- Financial Disclaimers sichtbar
- Eingereicht bei beiden Stores

---

## Phase 6: Monetization

**EN:** Free/Premium tiers with in-app subscriptions.
**DE:** Free/Premium Stufen mit In-App Subscriptions.

**Complexity / Komplexität:** L | **Depends on / Abhängig von:** Phases 2 + 5

**Modell:** Freemium
- **Free:** 5 Agent Queries/Tag, 1 Portfolio, 10 Watchlist Items, keine Alerts
- **Premium ($9.99/Mo oder $79.99/Jahr):** Unlimited Queries, Portfolios, Watchlist, 50 Alerts, Priority API

| # | Task | Size | Files |
|---|------|------|-------|
| 6.1 | RevenueCat Integration (In-App Purchases) | L | `/app/lib/purchases.ts` |
| 6.2 | Subscription Status im User Model | S | `/src/db/schema.ts` |
| 6.3 | Subscription Webhook Endpoint (RevenueCat → API) | M | `/src/api/routes/webhooks.ts` |
| 6.4 | Tier-Based Feature Gating Middleware | M | `/src/api/middleware/feature-gate.ts` |
| 6.5 | Paywall Screen in Mobile App | M | `/app/app/paywall.tsx` |
| 6.6 | Usage Tracking (Agent Queries/Tag/User) | M | `/src/services/usage-tracking.ts` |
| 6.7 | Stripe Integration für Web/API Subscriptions | L | `/src/api/routes/billing.ts` |

**Verification / Verifikation:**
- Free User sieht Paywall nach 5 Queries
- Premium Subscription via App Store / Play Store funktioniert
- Webhook aktualisiert User-Tier korrekt
- Feature Gates blocken korrekt basierend auf Tier

---

## Risk Register / Risiken

| Risk / Risiko | Mitigation / Maßnahme |
|---|---|
| Apple lehnt App ab (Financial Advice) | Disclaimers, "Research" statt "Advice", Demo Mode für Review |
| Agent-Kosten explodieren bei Multi-User | Per-User Daily Limits, Query Caching, Fast Models für einfache Tasks |
| DB Migration bricht Production | Versioned SQL Migrations, Staging-Test, nullable Columns |
| Rate Limiting bei Scale unzureichend | In-Memory → Redis migrieren (docker-compose Service) |
| LLM API Keys bei Multi-User: Wer zahlt? | Phase 1: Server-Side Keys. Phase 6: Premium = mehr Queries. Zukunft: BYOK |

---

## Critical Files / Kritische Dateien

Diese Dateien werden über mehrere Phasen hinweg modifiziert:

| File | Phases | Role |
|---|---|---|
| `/src/api/server.ts` | 1,2,3,4 | Core API Server — neue Routes, Middleware, DB Connection |
| `/src/api/middleware/auth.ts` | 2 | Bearer-Key → JWT Rewrite |
| `/app/lib/store.ts` | 2,3 | Client State — Auth, Portfolio, Server Sync |
| `/app/app/_layout.tsx` | 2 | Auth Guard, Login Redirect |
| `/src/agent/agent.ts` | 4 | Reasoning, User Context, konfigurierbare Iterations |
| `/src/agent/prompts.ts` | 4 | Planning Prompt, Chain-of-Thought |
| `/docker-compose.yml` | 1,2 | Services: API, DB, Redis |
| `/.github/workflows/ci.yml` | 1 | Docker Build + Push |

---

## Execution Order (Solo Developer) / Ausführungsreihenfolge

**Phase 0 → 1 → 2 → 3 → 4 → 5 → 6**

Jede Phase hat klare Verification Criteria die bestanden sein müssen bevor die nächste beginnt.

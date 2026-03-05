# PiksPeak — Blueprint Zusammenfassung

## Projektübersicht

**PiksPeak** ist eine KI-gestützte Fußball-Vorhersage-Plattform bestehend aus einer Expo 55 Mobile App und einem Hono/Bun Backend. Der Code lebt aktuell in einem Fork des "Dexter"-Projekts und muss in ein eigenständiges Repository extrahiert, vervollständigt und deployed werden.

### Technologie-Stack

| Bereich | Technologien |
|---|---|
| **Backend** | Bun, Hono v4, Drizzle ORM, PostgreSQL 16, Redis 7, Vercel AI Gateway |
| **Mobile** | React Native 0.83, Expo 55, React Navigation v7, Zustand v5, react-native-paper v5 |
| **Infrastruktur** | Docker Compose, GitHub Actions, Railway |

---

## Getroffene Entscheidungen

| Nr. | Entscheidung | Status |
|---|---|---|
| DR-001 | Eigenständiges `pikspeak` Repository (kein Subtree-Split) | Geplant |
| DR-002 | Deployment-Ziel: Railway (Managed Docker + Postgres + Redis) | Geplant |
| DR-003 | API-Versionierung mit URL-Prefix `/v1/` | Geplant |
| DR-004 | Push-Notifications über Expo Push API | Geplant |
| DR-005 | Monitoring: Sentry + pino Logging + BetterStack Uptime | Geplant |
| DR-006 | Datenbank-Migrationen: Drizzle Kit vor App-Start | Geplant |

---

## Phasen-Übersicht

### Phase 0 — Aufräumen

**Ziel:** Alle Arbeit committen, Branch stabilisieren, Extraktion vorbereiten.

- **5 geänderte** und **3 neue Dateien** committen
- Neues GitHub-Repo `pikspeak` erstellen
- **Kritischer Blocker:** 3 Backend-Dateien importieren Dexter-Code (`../../../../src/tools/sports/api.js`). Diese Abhängigkeit muss durch eine eigenständige `sports-api.ts` mit Redis-Cache ersetzt werden.
- Workspace-Setup mit Bun Workspaces

---

### Phase 1 — Fundament

**Ziel:** Projektdokumentation, Umgebungskonfiguration, Entwickler-Onboarding.

- `CLAUDE.md` als Projekt-Betriebssystem erstellen
- Dokumentationsstruktur anlegen (`docs/summaries/`, `docs/decisions/`, `docs/handoffs/`, `docs/api/`)
- `.env.example` mit allen Umgebungsvariablen
- API-Versionierung: Alle Routen unter `/v1/` Prefix
- Zweisprachige README (DE + EN)

---

### Phase 2 — Backend-Vervollständigung

**Ziel:** Alle TODOs abschließen, produktionskritische Features ergänzen.

| Feature | Beschreibung |
|---|---|
| **Push-Notifications** | `sendPushToAll()` existiert bereits, wird aber nicht aufgerufen. Pipeline muss nach Vorhersage-Generierung Notifications senden. Neue DB-Tabelle `notification_preferences`. |
| **Referral-Tracking** | Aktuell nur lokal im Mobile Store. Neue DB-Tabelle `referrals`, serverseitige Validierung, neue API-Endpoints. |
| **Closing Odds** | `closingOdds`-Spalte existiert, wird nie befüllt. Cron-Task 5 Min vor Kickoff + CLV-Berechnung. |
| **Test-Suite** | Keine Tests vorhanden. Priorität: Poisson-Berechnungen, Result-Tracker, Auth-Integration, Season-Utils. |
| **API-Dokumentation** | OpenAPI 3.1 Spec, verfügbar unter `/v1/docs`. |
| **Strukturiertes Logging** | `console.log` durch pino ersetzen (JSON-Output mit Request-ID). |
| **Erweiterte Statistiken** | Brier Score, Liga-Aufschlüsselung, Markt-Aufschlüsselung, Value Bet P/L, Trends. |

---

### Phase 3 — Mobile-Vervollständigung

**Ziel:** Mobile App produktionsreif machen.

| Feature | Beschreibung |
|---|---|
| **Notification Settings** | Toggle-Buttons mit Backend-API verbinden (aktuell nur Display). |
| **Datenschutz & AGB** | `PrivacyScreen.tsx` und `TermsScreen.tsx` erstellen, zweisprachig, DSGVO-konform. |
| **RevenueCat-Integration** | Platzhalter-Keys durch echte Keys ersetzen. Produkte: Weekly €2,99 / Monthly €9,99 / Yearly €49,99. |
| **App Store Assets** | Icons, Splash Screen, Screenshots, Feature Graphics für iOS + Android. |
| **Deep Links** | `pikspeak://prediction/:id`, Universal Links, Notification-Tap Navigation. |

---

### Phase 4 — Deployment & CI/CD

**Ziel:** Produktions-Deployment-Infrastruktur.

- **Railway:** 3 Services (Backend Docker, PostgreSQL 16, Redis 7), Custom Domain `api.pikspeak.app`
- **GitHub Actions:**
  - CI: Type-Check + Tests bei jedem PR
  - Deploy: Auto-Deploy auf `main` Push
  - Mobile: EAS Build bei Version-Tags
- **Migrationen:** `drizzle-kit migrate` vor App-Start, Check im Health-Endpoint
- **Monitoring:** Sentry (Backend + Mobile), BetterStack Uptime (60s Interval), Pipeline-Alert bei >26h Inaktivität

---

### Phase 5 — Vor dem Start

**Ziel:** App Store Submission und rechtliche Bereitschaft.

- EAS-Konfiguration mit echten Werten
- Apple App Store: Bundle ID, Listing, In-App Purchases, Review-Info (17+ Altersfreigabe)
- Google Play Store: Listing, Billing, Content Rating, Data Safety
- **Rechtlich:** Datenschutzerklärung (DSGVO), Nutzungsbedingungen, Impressum, Responsible Gambling Disclaimer
- Finale QA: Vollständiger User Flow, Push, Pipeline, Auth, Offline-States, 5 Sprachen, Dark Mode

---

### Phase 6 — Nach dem Start

**Ziel:** Iteration basierend auf User-Feedback und Daten.

- **Analytics:** PostHog/Mixpanel für Onboarding, Conversion, Retention
- **Kalibrierungs-Dashboard:** Hit Rates, Brier Score Trends, ROI nach Liga, CLV-Analyse
- **Liga-Erweiterung:** Primeira Liga → Eredivisie → Süper Lig → Pro League → Scottish Premiership → Champions League
- **Social Features:** Leaderboard, Vorhersage-Cards teilen, Community-Tipps
- **A/B Testing:** Paywall-Varianten, Onboarding-Flow, Notification-Timing
- **Modell-Verbesserungen:** Form-gewichtete Poisson, xG/xPoints, Motivationsfaktoren, Wetter

---

## Phasen-Abhängigkeiten

```
Phase 0 (Aufräumen)
  │
  ▼
Phase 1 (Fundament)
  │
  ├──▶ Phase 2 (Backend)
  │       │
  │       ▼
  ├──▶ Phase 3 (Mobile) ◀── braucht Phase 2 APIs
          │
          ▼
        Phase 4 (Deployment)
          │
          ▼
        Phase 5 (Pre-Launch)
          │
          ▼
        Phase 6 (Post-Launch)
```

> Phase 2 und 3 sind teilweise parallelisierbar — Mobile UI-Arbeit braucht keine Backend-Endpoints, die Verdrahtung schon.

---

## Risikoregister

### Externe Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmaßnahme |
|---|---|---|---|
| API-Football Rate Limit | Mittel | Hoch | Aggressives Caching (24h für Team-Stats) |
| Odds API Quota erschöpft | Mittel | Mittel | Paid Plan (~$20/Mo), Fallback auf API-Football |
| AI Gateway Downtime | Niedrig | Hoch | 2 Retries mit Backoff, Fallback auf Poisson-only |
| App Store Ablehnung | Mittel | Hoch | Glücksspiel-Disclaimer, keine Echtgeld-Transaktionen |

### Interne Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmaßnahme |
|---|---|---|---|
| Vorhersage-Genauigkeit zu niedrig | Mittel | Hoch | Brier Score Tracking, A/B Modelle |
| LLM-Kosten | Mittel | Mittel | ~$2,50/Tag bei 50 Spielen |
| Bus Factor (Einzelentwickler) | Hoch | Hoch | Blueprint, CLAUDE.md, Session-Handoffs |
| Schema-Migration bricht Produktion | Niedrig | Hoch | Staging-DB, keine Drop-Columns |

### Regulatorische Risiken

| Risiko | Wahrscheinlichkeit | Auswirkung | Gegenmaßnahme |
|---|---|---|---|
| DSGVO-Compliance Lücke | Mittel | Hoch | Privacy Policy, Export/Löschung-Endpoints |
| Glücksspiel-Regulierung | Niedrig | Hoch | Nur Analyse, keine Wettplatzierung |
| App Store Policy Änderung | Niedrig | Mittel | "Information/Analyse" Positionierung |

---

## Kritische Dateien

| Datei | Bedeutung |
|---|---|
| `src/tools/sports/api.ts` (Dexter) | Muss internalisiert werden — Extraktions-Blockade |
| `prediction-pipeline.ts` | Haupt-Orchestrierung, Notifications fehlen |
| `push-notifications.ts` | `sendPushToAll()` fertig, wird nicht aufgerufen |
| `schema.ts` | Braucht neue Tabellen |
| `Dockerfile` | Muss nach Internalisierung vereinfacht werden |
| `app.json` (Mobile) | Alle Platzhalter-Config |
| `config.ts` | Zod-Schema für alle Env Vars |

---

*Erstellt am 04.03.2026 — PiksPeak Blueprint v1.0*

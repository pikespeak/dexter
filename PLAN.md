# Multi-Platform Prediction App — Architekturplan

## Vision

**Dexter** wird von einer reinen Finanz-CLI-App zu einer **Multi-Domänen-Vorhersage-Plattform** erweitert, die über iOS, Android und Web zugänglich ist. Alle Plattformen greifen auf eine gemeinsame **Backend-API** zu.

---

## 1. Neue Vorhersage-Domänen

Das bestehende Skill-Framework (SKILL.md + LLM + externe Daten-APIs) ist **ideal generalisierbar**. Jede neue Domäne wird als eigenständiger Skill + zugehörige Tools implementiert:

### 1.1 Immobilien (Real Estate)
- **Vorhersagen:** Immobilienbewertung, Mietpreis-Prognosen, Markttrend-Analysen
- **Datenquellen:** Zillow API, Redfin API, OpenStreetMap, Census Data
- **Skill:** `real-estate-valuation` — Vergleichswertverfahren, Ertragswertverfahren
- **Tools:** `property_search`, `market_data`, `demographics`

### 1.2 Wetter & Klima
- **Vorhersagen:** Lokale Wetterprognosen, saisonale Trends, Extremwetter-Risiken
- **Datenquellen:** OpenWeatherMap API, NOAA, Visual Crossing Weather API
- **Skill:** `weather-forecast` — Mehrtages-Vorhersage mit Kontext-Analyse
- **Tools:** `weather_current`, `weather_forecast`, `climate_history`

### 1.3 Sport-Prognosen
- **Vorhersagen:** Spielausgänge, Saison-Prognosen, Spieler-Performance
- **Datenquellen:** ESPN API, SportsData.io, The Odds API
- **Skill:** `sports-prediction` — Statistische Analyse + LLM-Reasoning
- **Tools:** `team_stats`, `player_stats`, `odds_data`, `match_history`

### 1.4 Gesundheit & Wellness
- **Vorhersagen:** Fitness-Ziel-Prognosen, Ernährungsoptimierung, Schlafqualität
- **Datenquellen:** Nutritionix API, Apple HealthKit (via App), USDA Food Data
- **Skill:** `health-forecast` — Personalisierte Gesundheitsprognosen
- **Tools:** `nutrition_lookup`, `health_metrics`, `fitness_analysis`

### 1.5 Energie & Rohstoffe
- **Vorhersagen:** Strompreis-Prognosen, Ölpreis-Trends, erneuerbare Energie Produktion
- **Datenquellen:** EIA API, ENTSO-E (EU-Strom), World Bank Commodities
- **Skill:** `energy-forecast` — Preisvorhersagen mit Fundamentalanalyse
- **Tools:** `energy_prices`, `commodity_data`, `production_stats`

---

## 2. Backend-API Architektur

### Tech-Stack
- **Framework:** Hono (leichtgewichtig, Bun-nativ, Edge-ready)
- **Runtime:** Bun (bereits im Einsatz)
- **Auth:** JWT-basierte Authentifizierung
- **Streaming:** Server-Sent Events (SSE) für LLM-Antworten
- **Datenbank:** SQLite (via Bun) für User-Management, PostgreSQL für Produktion

### API-Endpunkte

```
POST   /api/v1/auth/register     — Registrierung
POST   /api/v1/auth/login        — Login → JWT Token
POST   /api/v1/auth/refresh      — Token Refresh

POST   /api/v1/predict           — Neue Vorhersage starten (SSE-Stream)
GET    /api/v1/predict/:id       — Vorhersage-Status/Ergebnis abrufen
GET    /api/v1/predictions       — Bisherige Vorhersagen auflisten

GET    /api/v1/domains           — Verfügbare Domänen auflisten
GET    /api/v1/domains/:id/skills — Skills einer Domäne

GET    /api/v1/user/profile      — Benutzerprofil
PUT    /api/v1/user/preferences  — Einstellungen aktualisieren
```

### Architektur-Diagramm

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   iOS App   │  │ Android App │  │   Web App   │
│ (Expo/RN)   │  │ (Expo/RN)   │  │ (Expo Web)  │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        │ HTTPS / SSE
                        ▼
              ┌─────────────────┐
              │   Hono API      │
              │   (Bun Runtime) │
              ├─────────────────┤
              │  Auth Middleware │
              │  Rate Limiter   │
              │  Session Mgmt   │
              └────────┬────────┘
                       │
              ┌────────┴────────┐
              │  Dexter Agent   │
              │  (LangChain)    │
              ├─────────────────┤
              │ Tools Registry  │
              │ Skills Registry │
              └────────┬────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Finance  │  │ Weather  │  │ Sports   │
  │ APIs     │  │ APIs     │  │ APIs     │
  └──────────┘  └──────────┘  └──────────┘
```

---

## 3. Multi-Plattform Frontend (Expo/React Native)

### Warum Expo?
- **Eine Codebase** für iOS, Android UND Web
- **TypeScript/React** — passt perfekt zum bestehenden Stack
- **Expo Router** — File-based Routing wie Next.js
- **EAS Build** — Cloud-Builds für App Store/Play Store
- **OTA Updates** — Updates ohne Store-Review

### App-Struktur

```
apps/mobile/
├── app/                    # Expo Router (file-based routing)
│   ├── (tabs)/
│   │   ├── _layout.tsx     # Tab-Navigation
│   │   ├── index.tsx       # Home/Dashboard
│   │   ├── predict.tsx     # Neue Vorhersage
│   │   ├── history.tsx     # Vergangene Vorhersagen
│   │   └── profile.tsx     # Profil/Einstellungen
│   ├── predict/
│   │   └── [id].tsx        # Vorhersage-Detail
│   ├── auth/
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── _layout.tsx         # Root Layout
├── components/
│   ├── PredictionCard.tsx
│   ├── DomainSelector.tsx
│   ├── StreamingResponse.tsx
│   └── ChartView.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── usePrediction.ts
│   └── useStreaming.ts
├── services/
│   └── api.ts              # API Client
├── app.json
└── package.json
```

---

## 4. Implementierungs-Phasen

### Phase 1: Backend-API (2-3 Wochen)
- [ ] Hono API Server Setup mit Bun
- [ ] Agent als API-Service exponieren (POST /predict mit SSE)
- [ ] JWT Auth + User Management
- [ ] Rate Limiting + API Keys

### Phase 2: Neue Domänen-Skills (2-3 Wochen pro Domäne)
- [ ] Tool-Abstraktion für externe Daten-APIs generalisieren
- [ ] Immobilien-Skill + Tools
- [ ] Wetter-Skill + Tools
- [ ] Sport-Skill + Tools
- [ ] Energie-Skill + Tools
- [ ] Gesundheits-Skill + Tools

### Phase 3: Expo App (3-4 Wochen)
- [ ] Expo Projekt Setup mit Router
- [ ] Auth Flow (Login/Register)
- [ ] Chat-Interface mit SSE Streaming
- [ ] Domänen-Auswahl UI
- [ ] Vorhersage-Historie
- [ ] Charts/Visualisierungen

### Phase 4: App Store Release (1-2 Wochen)
- [ ] EAS Build Konfiguration
- [ ] iOS App Store Submission
- [ ] Google Play Store Submission
- [ ] Web Deployment (Vercel/Cloudflare)

### Phase 5: Monetarisierung & Skalierung
- [ ] Pricing Tiers (Free/Pro/Enterprise)
- [ ] PostgreSQL Migration für Produktion
- [ ] Deployment auf Cloudflare Workers / Fly.io
- [ ] Analytics & Monitoring

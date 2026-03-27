# tPlan — AI Training Coach

## Overview
Research project exploring how AI agents can interpret training methodology books and generate personalized, progressive workout programs. Phase 1 (offline HTML workouts) is complete; Phase 2 is a React web app with Azure backend.

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite 8, React Router, i18next, Chart.js
- **Backend**: Azure Functions (Node.js 20, TypeScript)
- **Database**: Azure Table Storage
- **Auth**: Azure SWA built-in Google OAuth
- **Hosting**: Azure Static Web Apps
- **Languages**: EN, RU, LV, ES

## Project Structure
```
tPlan/
├── materials/                # Source training books (CC Vol1, Vol2, Dumbbell)
├── logs/                     # Training log JSON files (one per day)
├── workouts/                 # Generated HTML workout pages (Phase 1)
├── template/                 # Shared workout engine (app.js, styles.css)
├── WeeklyPlan.md             # Current week schedule & progression
└── tplan-app/                # Phase 2 — React web app
    ├── src/
    │   ├── pages/            # Landing, Dashboard, WorkoutPage, History, Challenges, Profile
    │   ├── components/       # workout/, dashboard/, feedback/, social/
    │   ├── services/api.ts   # REST client
    │   ├── context/AuthContext.tsx  # Google OAuth
    │   ├── utils/progression.ts    # Deterministic level-up logic (critical — needs tests)
    │   ├── i18n/             # Translation files (en, ru, lv, es)
    │   └── types/            # TypeScript interfaces
    ├── api/                  # Azure Functions backend
    │   ├── src/db.ts         # Table Storage client + auth helpers
    │   └── src/functions/    # user, workouts, logs, schedule, programs, challenges, feedback
    └── staticwebapp.config.json  # SWA routing & auth
```

## Coding Standards
- TypeScript strict mode enabled
- ESLint + Prettier enforced
- Functional React components with hooks only
- Pure functions for game/progression logic (no side effects)
- Use `console.warn` / `console.error` — no `console.log` in production
- i18n: All user-facing text via `useTranslation()` hook

## Environment
- Azure subscription: Visual Studio Enterprise (146099412+samoletovs@users.noreply.github.com)
- Azure region: northeurope
- GitHub: samoletovs/tplan (private)
- Push to `main` branch
- Config template: `tplan-app/.env.example`

## Commands (from tplan-app/)
```bash
npm run dev        # Start Vite dev server
npm run build      # TypeScript check + Vite build + copy SWA config
npm run lint       # ESLint
npm run format     # Prettier
npm run preview    # Preview production build
```

## Deployment
- Push to `main` triggers GitHub Actions → Azure SWA deploy
- Frontend built with Vite, API built with tsc
- Domain: tplan.naurolabs.com

## Key Rules
- Training materials in `/materials/` are READ-ONLY reference — never modify
- Progression logic in `utils/progression.ts` is deterministic — must be testable
- Log files (`/logs/*.json`) are the source of truth for progress
- `WeeklyPlan.md` is auto-generated from logs + progression rules

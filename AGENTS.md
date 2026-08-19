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
- Azure subscription: Visual Studio Enterprise
- Azure region: northeurope
- GitHub: samoletovs/tPlan (private)
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

## Memory

tPlan remembers per-user facts between sessions. The shared contract lives in
[`.github/skills/agent-memory/SKILL.md`](../.github/skills/agent-memory/SKILL.md);
this is how tPlan implements it.

- **Store**: Azure Table Storage, table `tplanMemory`, partitioned by user id.
- **Generated files** — `api/src/memory/memory-core.ts` and `memory-store-table.ts` are
  copied from `.github/config/memory/` by `install-memory.ps1`. Edit the canonical copy
  and re-run the installer; a governance test compares them byte-for-byte.
- **tPlan's own files** — `observations.ts` (what a workout reveals, pure) and
  `index.ts` (store wiring, fences, graceful degradation).

Call sites:

| Path | Where | What |
|------|-------|------|
| write | `functions/logs.ts` → `rememberWorkout` | user notes, and unanimous per-exercise difficulty verdicts |
| read | `functions/workouts.ts` → `recallForPrompt` | injected into the coaching prompt, fenced |
| control | `functions/memory.ts`, `components/MemoryCard.tsx` | list and delete |

Rules that are not negotiable:

- **Never interpolate memory or a user note into a prompt unfenced.** Both go through
  `formatForPrompt()` / `fenceUserText()`, which label them as data with a fresh nonce.
  Memory is an instruction surface (CVE-2025-53773).
- **Memory is an enhancement, never a dependency.** Every entry point degrades to "no
  memory" — a user must be able to log a workout and get a plan with storage down.
- **Do not widen `decideWrite`.** It exists to stop the store becoming a junk drawer.
  If something is worth remembering, distil it into one sentence rather than logging
  everything and filtering later.
- **Do not parse the user's note for keywords.** tPlan is EN/RU/LV/ES; keyword matching
  would work in English and silently fail for everyone else. Store what the user wrote
  and let the model interpret it.

## Key Rules
- Training materials in `/materials/` are READ-ONLY reference — never modify
- Progression logic in `utils/progression.ts` is deterministic — must be testable
- Log files (`/logs/*.json`) are the source of truth for progress
- `WeeklyPlan.md` is auto-generated from logs + progression rules

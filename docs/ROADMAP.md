# tPlan — Implementation Roadmap

> Last updated: 2026-03-30
> Derived from: [VISION.md](VISION.md)

## Current State

Phase 2 web app is **~70% complete** for personal use:

| Area | Status | Notes |
|------|--------|-------|
| Core workout loop | ✅ Working | Generate → train → feedback → progress |
| Pages | 7/9 functional | Challenges stub, no leaderboard |
| API | 10/13 endpoints | Dashboard partial, feedback partial, challenges missing |
| Progression logic | ✅ Complete | Deterministic, pure functions |
| Auth | ✅ Working | Google OAuth via SWA |
| i18n | ✅ 4 languages | EN, RU, LV, ES |
| Deployment | ✅ Working | GitHub Actions → tplan.naurolabs.com |
| Tests | ❌ Zero | vitest configured, no test files |
| Design | ⚠️ Functional | Not yet aligned with vision (Strava/Apple Fitness aesthetic) |
| Programs | 3 built-in | Convict Conditioning A/B, Dumbbell Gymnastics |

**Key gap**: the app works but doesn't feel professional. Design, polish, and reliability need work before it can be used daily as the primary training tool (Phase 2 success criteria).

---

## Phase 2 — Core Loop Polish

**Goal**: Make tPlan good enough that the founder uses it daily instead of the Phase 1 HTML pages.

**Success criteria**: Daily use for 2+ weeks, all core flows smooth, no crashes.

### 2.1 — Design Overhaul (HIGH PRIORITY)

Apply the "Strava meets Apple Fitness" aesthetic from the vision. Current UI is functional but generic.

| Task | Files | Effort |
|------|-------|--------|
| Define CSS design tokens (colors, typography, spacing, radii) | `src/index.css` | S |
| Apply Inter font family, professional typography scale | `src/index.css`, `index.html` | S |
| Redesign Dashboard — clean stat cards, polished charts, breathing space | `pages/Dashboard.tsx` | M |
| Redesign WorkoutPage — large tap targets, clear exercise flow, mid-workout usability | `pages/WorkoutPage.tsx`, `components/workout/*` | M |
| Redesign History — clean timeline, expandable cards | `pages/History.tsx` | S |
| Redesign Schedule — visual weekly calendar, drag-friendly | `pages/Schedule.tsx` | M |
| Redesign Programs — card grid, program type indicators | `pages/Programs.tsx` | S |
| Redesign Profile — minimal, clean settings | `pages/Profile.tsx` | S |
| Redesign Landing — professional hero, feature showcase, social proof placeholder | `pages/Landing.tsx` | M |
| Bottom nav refinement — clean icons, active state, no clutter | `pages/AppShell.tsx` | S |
| Mobile-first responsive pass (375px primary breakpoint) | All pages | M |

### 2.2 — Reliability & Quality (HIGH PRIORITY)

| Task | Files | Effort |
|------|-------|--------|
| Add React error boundary wrapping AppShell | `pages/AppShell.tsx`, new `ErrorBoundary.tsx` | S |
| Add loading states to all async operations | All pages with API calls | S |
| Fix getDashboard API — complete stats aggregation | `api/src/functions/dashboard.ts` | M |
| Add input validation on API boundaries (zod) | `api/src/functions/*.ts` | M |
| Handle offline/error states gracefully (no blank pages) | All pages | S |
| Add rate limiting to API endpoints | `api/src/functions/*.ts` or middleware | S |

### 2.3 — Core Loop Refinements (MEDIUM PRIORITY)

| Task | Files | Effort |
|------|-------|--------|
| AI-generated workout explanation — "Why this plan?" | `WorkoutPage.tsx`, `api/functions/workouts.ts` | S |
| Post-workout progress insights — "Bridge: 2 easy in a row → next session advances" | `WorkoutSummary.tsx`, `api/functions/logs.ts` | M |
| Previous performance display during exercise — show last session's reps/difficulty | `ExerciseStepCard.tsx` | S |
| Smart rest timer — auto-adjust based on exercise intensity | `RestTimer.tsx` | S |
| Sound/vibration on timer complete (respecting user preference) | `RestTimer.tsx`, `InlineTimer.tsx` | S |

### 2.4 — Testing (MEDIUM PRIORITY)

| Task | Files | Effort |
|------|-------|--------|
| Unit tests for progression.ts (critical — determinism must be proven) | `tests/progression.test.ts` | M |
| Unit tests for workout generation logic | `tests/workout-gen.test.ts` | M |
| API integration tests (mocked Table Storage) | `tests/api/*.test.ts` | L |
| Smoke test — build passes, app loads, login works | `tests/smoke.test.ts` | S |

### 2.5 — Remove Dead Weight (LOW PRIORITY)

| Task | Files | Effort |
|------|-------|--------|
| Remove Challenges page and nav item (per vision: no gamification) | `Challenges.tsx`, `AppShell.tsx`, types | S |
| Remove challenge types from data model | `types/index.ts` | S |
| Simplify nav to 4 items: Dashboard, Workout, History, Profile | `AppShell.tsx` | S |
| Remove LV/ES i18n files (vision: EN + RU only for now) | `i18n/lv.json`, `i18n/es.json` | S |

**Phase 2 deliverable**: A polished, reliable, professional-looking personal training app deployed to tplan.naurolabs.com.

---

## Phase 3 — Book Upload + AI Extraction

**Goal**: The killer feature. Users upload a training book → AI extracts a structured program → tPlan becomes a coach for that methodology.

**Success criteria**: Upload Starting Strength (PDF) → get a usable progressive program without manual configuration.

### 3.1 — Book Upload Infrastructure

| Task | Files | Effort |
|------|-------|--------|
| Azure Blob Storage setup for file uploads | `infrastructure/`, `api/src/db.ts` | M |
| Upload API endpoint — accept PDF/markdown, store in Blob | `api/src/functions/upload.ts` | M |
| Upload UI — drag-and-drop or file picker on Programs page | `pages/Programs.tsx` | M |
| File type validation (PDF, MD, TXT only), size limit (20MB) | API + frontend | S |
| Upload progress indicator | Frontend | S |

### 3.2 — AI Extraction Pipeline

| Task | Files | Effort |
|------|-------|--------|
| PDF text extraction (pdf-parse or similar) | `api/src/services/extractor.ts` | M |
| Azure OpenAI GPT-4o integration for program extraction | `api/src/services/ai.ts` | L |
| Extraction prompt engineering — exercises, levels, progression rules, technique, periodization | Prompt templates | L |
| Structured output validation (extracted program → Program type) | `api/src/services/validator.ts` | M |
| Extraction status tracking (processing → ready → failed) | `types/`, API | M |
| User review UI — show extracted program, allow corrections before saving | New page or modal | L |

### 3.3 — Program Management

| Task | Files | Effort |
|------|-------|--------|
| Create program from extraction results | `api/src/functions/programs.ts` | M |
| Edit program — adjust exercises, levels, rules after extraction | New page | L |
| Delete/archive a program | API + UI | S |
| Program metadata — source book, creation date, exercise count | `types/`, UI | S |

**Phase 3 deliverable**: Working book-to-program pipeline. Upload a PDF → review extracted program → start training.

---

## Phase 4 — Dynamic Interface (The Core Experiment)

**Goal**: The UI adapts to the methodology. Different programs = different experiences. This is tPlan's core NauroLabs research question — it belongs right after book upload makes multiple program types possible.

**Success criteria**: Visually distinct, methodology-appropriate interfaces for 3+ program types (e.g., calisthenics, barbell training, yoga).

### 4.1 — Research & Archetypes

| Task | Effort |
|------|--------|
| Define interface archetypes: strength (sets/reps), timed (yoga/plank), interval (HIIT), flow (martial arts) | Research |
| Map extracted program metadata to archetypes (exercise type distribution → archetype selection) | M |
| Prototype dynamic component selection based on program type | L |

### 4.2 — Pluggable Renderers

| Task | Effort |
|------|--------|
| Pluggable workout step renderers (reps-based, timer-based, flow-based, interval-based) | XL |
| Archetype-specific layouts — exercise count, rest patterns, session duration shape the UI | L |
| Program-specific color themes / visual identity (subtle, not jarring) | M |
| Technique media integration — photos, short videos, animations per exercise | L |

### 4.3 — AI-Driven UI Decisions

| Task | Effort |
|------|--------|
| During extraction (Phase 3), AI also tags exercises with UI hints (type, tempo, rest style) | M |
| AI-suggested UI layout from extracted program structure | XL |
| User testing — does a yoga program FEEL different from a barbell program? | Research |

**Phase 4 deliverable**: tPlan proves (or disproves) that a content-driven UI is better than a fixed app. The NauroLabs experiment has a result.

---

## Phase 5 — Multi-User + Public Launch

**Goal**: Open tPlan to other people. Auth, isolation, onboarding.

**Success criteria**: 5+ external users training regularly.

### 5.1 — Multi-User Hardening

| Task | Files | Effort |
|------|-------|--------|
| Audit all API endpoints for user isolation (partition key checks) | All API functions | M |
| Database migration: Table Storage → Cosmos DB (scale + querying) | `api/src/db.ts`, infrastructure | L |
| User onboarding flow — pick a program or upload, set schedule | New onboarding page | M |
| Public program library — curated starter programs | Seed data | M |

### 5.2 — Onboarding UX

| Task | Files | Effort |
|------|-------|--------|
| First-login wizard: pick language → select program → set weekly schedule → first workout | New flow | L |
| Landing page with product story, screenshots, CTA | `pages/Landing.tsx` | M |
| "How it works" explainer (3 steps: upload → train → progress) | Landing page section | S |

### 5.3 — Analytics & Monitoring

| Task | Files | Effort |
|------|-------|--------|
| Application Insights integration | `api/`, infrastructure | M |
| User activity tracking (anonymous — workout completion rate, retention) | API middleware | M |
| Error tracking and alerting | Application Insights | S |
| Performance monitoring (API latency, frontend load time) | Application Insights | S |

### 5.4 — External Quality

| Task | Files | Effort |
|------|-------|--------|
| E2E tests with Playwright (core flow: login → generate → workout → complete) | `tests/e2e/` | L |
| Accessibility audit — keyboard nav, screen reader, contrast | All pages | M |
| Performance audit — Lighthouse 90+ on mobile | All pages | M |
| Security audit — OWASP basics, input sanitization, auth edge cases | All | M |

**Phase 5 deliverable**: tPlan is publicly accessible, onboards new users smoothly, and is monitored for reliability.

---

## Phase 6 — Shared Programs + Monetization

**Goal**: Users share programs, freemium paywall covers hosting costs.

**Success criteria**: Measurable subscription revenue.

### 6.1 — Program Sharing

| Task | Effort |
|------|--------|
| "Publish" a program to the public library | M |
| Program detail page — description, exercise list, reviews, "Start this program" CTA | L |
| Auto-evaluation — AI rates program quality (completeness, progression logic, structure) | L |
| Program discovery — browse by type (strength, flexibility, endurance, martial arts) | M |
| Program versioning — update a published program without breaking active users | L |

### 6.2 — Freemium Model

| Task | Effort |
|------|--------|
| Tier system: Free (built-in programs) vs Pro (upload + AI scheduling + analytics) | M |
| Stripe integration for subscriptions | L |
| Paywall enforcement in API (check tier before upload/AI features) | M |
| Subscription management UI (profile page) | M |
| Free trial period (14 days of Pro) | S |

### 6.3 — Advanced Analytics (Pro)

| Task | Effort |
|------|--------|
| Progress charts — per-exercise level history over time | M |
| Volume tracking — total reps/sets per muscle group per week | M |
| Body composition trends (if tracked) | S |
| Exportable training reports (PDF) | M |

**Phase 6 deliverable**: Sustainable revenue from Pro subscriptions, growing public program library.

---

## Immediate Next Steps (What to Build Now)

**Priority order for Phase 2 completion:**

1. **Design tokens + Inter font** — 1 hour. Immediate visual upgrade across all pages.
2. **Remove Challenges page + simplify nav** — 30 min. Align with "no gamification" vision.
3. **Dashboard redesign** — the first thing users see after login. Must look professional.
4. **WorkoutPage polish** — the core experience. Large tap targets, clear flow, previous results shown.
5. **Progression tests** — prove the most critical logic works deterministically.
6. **Error boundary + loading states** — prevent blank-screen crashes.
7. **getDashboard fix** — complete the stats aggregation.
8. **Landing page redesign** — needed before sharing with anyone.

**Estimated time to Phase 2 complete**: focused effort over multiple sessions.

---

## Architecture Decisions Log

| Decision | Rationale | Date |
|----------|-----------|------|
| Table Storage → Cosmos DB (Phase 5) | Table Storage works for single user but lacks flexible querying for multi-user analytics | 2026-03-30 |
| Dynamic Interface = Phase 4 | Core NauroLabs experiment — answer the research question before scaling to users | 2026-03-30 |
| Remove Challenges | Vision says "no gamification" — professional minimalism | 2026-03-30 |
| EN + RU only (for now) | Simplify maintenance, re-enable LV/ES when expanding | 2026-03-30 |
| Azure OpenAI for extraction | Already in NauroLabs subscription, GPT-4o handles book parsing well | 2026-03-30 |
| PWA, no native app | Vision says mobile-first web — native wrapper only if traction justifies | 2026-03-30 |
| No social features in MVP | Vision says solo first, community programs in Phase 5 | 2026-03-30 |

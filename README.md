# tPlan

tPlan is an AI-assisted training coach that turns structured training
methodologies into progressive workout plans.

## Research question

tPlan tests the NauroLabs question **"Where's the AI-human boundary?"** It asks
whether AI can act as a coach by interpreting a methodology, adapting a plan
from workout feedback, and explaining progress without taking control away
from the athlete.

## What it does

- Generates and schedules workouts from structured program definitions.
- Tracks reps, difficulty, notes, body weight, and progression.
- Applies deterministic progression rules and remembers selected user facts.
- Supports English, Russian, Latvian, and Spanish.
- Includes social challenges and leaderboards as motivation experiments.

## Coaching and program contracts

Workout structure is deterministic. The optional note requests coaching style or
encouragement, not exercise, set, repetition, or schedule changes. The model must
return an explicit supported/unsupported decision; structural requests it identifies
are rejected before saving. An unavailable or invalid decision with a note also
prevents saving, so the note is not silently ignored. Remove the note to generate
the unchanged program without coaching.

Without a note, unavailable or invalid AI display fields are discarded and the
workout remains usable with a localized status notice. Tips are bounded strings
aligned to the complete step list; the model cannot modify the exercises.

Reviewed program extractions preserve training-day mappings, default schedules, and
exercise slots through save/read/generate. Inconsistent mappings and unintentionally
empty training sessions are rejected. Legacy unrestricted programs and explicit
rest days remain supported.

## Stack

- React 19, TypeScript, Vite, i18next, and Chart.js
- Azure Functions (Node.js 20)
- Azure Table Storage
- Azure Static Web Apps authentication and hosting

## Run locally

Use Node.js 22 (22.13.0 or later) for frontend development and CI, meeting
ESLint's minimum version. Vitest 5 no longer supports Node.js 20; the hosted
API runtime is configured separately.

```powershell
npm install
Copy-Item .env.example .env
Copy-Item api\local.settings.json.example api\local.settings.json
npm run dev
```

Before submitting a change:

```powershell
npm run lint
npm test
npm run build --prefix api
npm run build
```

`tests/workout-contracts.test.ts` runs actual extraction, program, and workout
handlers with synthetic responses and in-memory storage, plus React renderer
checks. It does not contact the model or storage services.

## Status

**Active research prototype.** Workout generation, logging, deterministic
progression, multilingual UI, memory controls, and social experiments are
implemented, including user-uploaded program extraction and review.

## License

MIT

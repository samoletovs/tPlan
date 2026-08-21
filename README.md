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

## Stack

- React 19, TypeScript, Vite, i18next, and Chart.js
- Azure Functions (Node.js 20)
- Azure Table Storage
- Azure Static Web Apps authentication and hosting

## Run locally

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
npm run build
```

## Status

**Active research prototype.** Workout generation, logging, deterministic
progression, multilingual UI, memory controls, and social experiments are
implemented. User-uploaded program extraction remains planned.

## License

MIT

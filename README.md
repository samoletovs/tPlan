# Tplan Web App — NauroLabs Research Lab

> Phase 2 of the Tplan research project: a multi-user web application exploring AI-driven workout generation from training methodology books.

## Research Context

This app is part of a lab experiment investigating whether AI agents can read training books and produce correct, progressive workout programs. See the [main README](../README.md) for the full research framing.

## What This App Does

- **Generates workouts** from parsed training methodology (Convict Conditioning, Dumbbell Gymnastics)
- **Tracks progress** with difficulty ratings, reps, notes, and body weight
- **Auto-progresses** exercises based on the source book's transition rules
- **Supports 4 languages** (English, Russian, Latvian, Spanish)
- **Social features** — challenges and leaderboards for motivation research

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Vite |
| Backend | Azure Functions (Node.js) |
| Database | Azure Cosmos DB |
| Hosting | Azure Static Web Apps |
| Auth | Google OAuth via SWA |

## Development

```bash
npm install
npm run dev
```

## Deployment

Deployed to Azure SWA: [tplan.naurolabs.com](https://tplan.naurolabs.com)

## Next: User-Uploaded Programs (Phase 3)

The planned next step is allowing users to upload their own training books (PDF/markdown) and have the system extract a structured program — exercises, levels, progression rules — that others can follow.

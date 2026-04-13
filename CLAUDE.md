# tPlan — Claude Code Instructions

## Project Overview

tPlan is an AI coaching app that generates progressive training plans.

## Architecture

- `src/` — React client application
- `api/` — backend/API handlers
- `tests/` — automated tests
- `infrastructure/` — Azure infrastructure templates

## Key Rules

- Keep training progression logic consistent and auditable.
- Ensure UI text is localized through i18n keys.
- Follow existing TypeScript and lint standards.

## Validation

- `npm run lint`
- `npm run build`
- `npm run test`

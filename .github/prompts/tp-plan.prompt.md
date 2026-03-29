---
mode: agent
description: Generate today's training plan
---

# Generate today's workout

Follow the instructions from `.github/copilot-instructions.md`:

## Steps

### Phase 1 — Sync previous results

1. **Read ALL log files** from `/logs/*.json`
2. **Compare with `/logs/data.js`** — if any log files are missing from the LOGS array:
   - Add the new entries to data.js (keep sorted by date)
   - Mark completed days as ✅ in WeeklyPlan.md
   - Report what was synced: exercises, difficulty trends, notes worth attention, weight trend
3. **Progression analysis** for synced logs:
   - Which exercises were easy/hard
   - Suggestions for today's session
   - Current streak count

### Phase 2 — Check if new week needed

4. **Read WeeklyPlan.md** — check the week date range
5. **If today falls outside the current week** (i.e. the week is over):
   - Analyze ALL logs from the completed week: difficulty trends, progression, notes
   - Apply progression rules to update exercise levels and rep targets:
     - "easy" 2+ times → +2 reps (or next level if at target)
     - "hard" → keep same or reduce
     - "normal" → follow standard plan
     - Check log notes for explicit user requests (level changes, new exercises, etc.)
   - Check Convict Conditioning transition conditions from `/materials/` when an exercise hits its target reps
   - **Generate a new WeeklyPlan.md** for the upcoming week:
     - Increment week number
     - Set new date range (Monday–Sunday or matching the current pattern)
     - Update "Текущие уровни" table with new levels/reps
     - Create fresh schedule with all days ⬜
     - Update "Подробности по дням" with new rep counts
     - Keep the same structure and format as the previous plan
   - Report all changes: what progressed, what stayed, what the user requested

### Phase 3 — Generate today's workout

6. **Read WeeklyPlan.md** — determine what is scheduled for today (current date)
7. **Assess progress** from all logs:
   - Check each exercise's difficulty history across ALL logs
   - If exercise rated "easy" 2+ times in a row → plan +2 reps (mark with 📈)
   - If rated "hard" → keep same reps, do not increase
   - If rated "normal" → follow standard plan
   - **Read notes in each log** — user may request level changes, extra reps, new exercises
8. **Calculate streak** — count consecutive training days from log dates
9. **Build previousResults** — from the last workout that had the same exercises
10. **Read technique** from `/materials/` for each exercise — use the book's descriptions
11. **Generate the workout HTML** file at `/workouts/YYYY-MM-DD.html` following the Workout HTML Template from copilot-instructions.md:
   - Link to `../template/styles.css` — never inline CSS
   - Include `../template/app.js` — never inline JS
   - Only the WORKOUT data object changes per day
   - Include full HTML scaffold: header, progress bar, summary section with weight input, notes, and export button
12. **Report** what was generated: exercises, reps, changes from last time, streak

## Important

- Use today's actual date (not hardcoded)
- Warmup and cooldown should have relevant items with technique descriptions
- Each exercise step needs: name, meta (level + set info), technique (detailed), tempo, planned reps, rest time
- For timer-based exercises (plank), use `planned` for seconds
- Mark progression changes clearly with 📈 in meta

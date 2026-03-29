---
mode: agent
description: Show training progress and weekly summary
---

# Training Dashboard & Progress Report

## Steps

1. **Read ALL log files** from `/logs/*.json`
2. **Read WeeklyPlan.md** for current week structure
3. **Generate a progress report** including:

### Overall Stats
- Total workouts completed
- Current streak (consecutive days)
- Weight trend (first → latest, change)
- Total training time (sum of duration_min)

### Exercise Progression
For each exercise, show:
- Current level and reps
- Difficulty trend (easy/normal/hard across sessions)
- Whether ready for progression (+2 reps or next level)
- Comparison: first session → latest session

### Weekly Status
- Which days are done ✅ vs remaining ⬜
- Adherence rate (completed / planned)

### Suggestions
- Exercises ready for rep increase (2+ consecutive "easy")
- Exercises that need attention ("hard" ratings)
- Level transition recommendations based on Convict Conditioning criteria
- Any insights from user notes in logs

### Next Week Preview
- If it's end of week: suggest WeeklyPlan.md updates for next week
- Recommended rep adjustments based on this week's performance

## Output Format
Present as a clear, readable summary — use tables and bullet points. Keep it concise but complete.

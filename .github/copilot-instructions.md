# Tplan — AI Training Program Generator (NauroLabs Research Lab)

You are assisting with a research project that explores how AI agents can interpret training methodology books and generate personalized, progressive workout programs. You help plan workouts, track progress, and suggest improvements — all based on source training materials.

## Project Structure

- `/WeeklyPlan.md` — current weekly schedule with exercise levels, reps, and daily status
- `/logs/*.json` — one file per training day (the source of truth for progress)
- `/logs/data.js` — aggregated log data for the dashboard (you maintain this)
- `/materials/` — reference books:
  - `ConvictConditioning_Vol1.md` — Convict Conditioning (Big Six bodyweight exercises, 10 levels each)
  - `ConvictConditioning_Vol2.md` — Convict Conditioning Vol 2
  - `DumbbellGymnastics.md` — Dumbbell exercise complexes
- `/template/app.js` — workout app engine (timers, reps, difficulty, export)
- `/template/styles.css` — shared styles
- `/workouts/YYYY-MM-DD.html` — generated daily workout pages

## Workout HTML Template

Each workout file must be lightweight — all logic and styles live in `/template/`. Only the `WORKOUT` data object changes per day.

```html
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Тренировка — Дд ДД.ММ</title>
<link rel="stylesheet" href="../template/styles.css">
</head>
<body>

<h1>🏋️ День недели, ДД Месяц</h1>
<div class="sub">Неделя N · Название тренировки · Фаза адаптации</div>

<div id="streak" class="streak hidden"></div>

<div class="prog">
  <div class="prog-bar"><div class="prog-fill" id="pFill" style="width:0%"></div></div>
  <div class="prog-text" id="pText">0 / 0</div>
</div>

<div id="steps"></div>

<!-- Итоги -->
<div id="summary" class="hidden">
  <div style="text-align:center;margin:20px 0">
    <div style="font-size:2.5em">🎉</div>
    <h2 style="margin:8px 0">Готово!</h2>
    <div class="sub">Отличная работа. Вот твои результаты.</div>
  </div>
  <div id="summaryBody"></div>
  <div class="weight-row">
    <label>⚖️ Вес:</label>
    <input type="number" class="weight-input" id="bodyWeight" placeholder="0" min="30" max="250" step="0.1">
    <span class="weight-unit">кг</span>
  </div>
  <label style="font-size:.82em;color:var(--muted)">Заметки / как ощущения:</label>
  <textarea class="final-notes" id="finalNotes" placeholder="Любые комментарии..."></textarea>
  <button class="btn btn-save" onclick="exportResults()">📤 Экспортировать JSON</button>
  <div id="saveMsg" style="text-align:center;margin-top:10px;font-size:.82em;color:var(--accent)"></div>
</div>

<script>
const WORKOUT = {
  date: "ГГГГ-ММ-ДД",
  day: "День недели",
  week: N,
  title: "Название тренировки",
  streak: N,
  previousResults: [ ... ],
  steps: [
    {
      type: "warmup",       // warmup | cooldown
      name: "Разминка",
      items: [
        { text: "Ходьба на месте — 1 мин", desc: "Описание техники", timer: 60 },
        { text: "Круговые вращения руками — по 10", desc: "Описание техники" }
      ]
    },
    {
      type: "exercise",
      name: "Полные отжимания",
      meta: "Уровень 5 · Подход 1 из 2",
      technique: "Подробное описание техники выполнения...",
      tempo: "2-1-2",       // секунды: вниз-пауза-вверх
      planned: 5,           // целевое кол-во повторений
      rest: 60              // отдых после подхода (сек), 0 если не нужен
    },
    {
      type: "cooldown",
      name: "Растяжка и заминка",
      items: [
        { text: "Растяжка груди — 20 сек", desc: "Описание", timer: 40 },
        { text: "Наклон вперёд — 30 сек", desc: "Описание", timer: 30 }
      ]
    }
  ]
};
</script>
<script src="../template/app.js"></script>
</body>
</html>
```

### previousResults format (from log)

```json
[
  { "name": "Полные отжимания", "set": "Уровень 5 · Подход 1 из 2", "planned": 5, "actual": 5, "difficulty": "normal" },
  { "name": "Полные отжимания", "set": "Уровень 5 · Подход 2 из 2", "planned": 5, "actual": 5, "difficulty": "normal" }
]
```

### Output JSON format (saved to localStorage automatically)

```json
{
  "date": "2026-02-21",
  "day": "Суббота",
  "week": 1,
  "workout": "Название тренировки",
  "duration_min": 45,
  "body_weight_kg": 85,
  "streak": 1,
  "exercises": [
    { "name": "Полные отжимания", "set": "Уровень 5 · Подход 1 из 2", "planned": 5, "actual": 5, "difficulty": "normal", "notes": "" }
  ],
  "notes": "",
  "timestamp": "2026-02-21T10:30:00"
}
```

Results are saved automatically to localStorage (key `tplan_all_logs`) after workout completion. The dashboard reads data from localStorage via `logs/data.js`.

## Progression Rules

1. If an exercise was rated "easy" **2+ times in a row** → add **+2 reps** to the plan
2. If rated "hard" → keep same reps, do NOT increase
3. If rated "normal" → follow the standard plan
4. **Read user notes in logs** — they often contain requests (e.g., "switch to next level", "add more reps")
5. Plank progression: 30s → 45s → 60s → 90s → 2min (increase when current feels easy)
6. Convict Conditioning levels: follow the book's transition conditions (listed per exercise)
7. When beginning of a new week → automatically generate a new WeeklyPlan.md with updated levels, reps, and fresh schedule based on previous week's results

## Key Behaviors

- Always read ALL log files before generating a plan — progression depends on history
- Calculate streak (consecutive training days) from log dates
- Build `previousResults` from the last similar workout (same type/day)
- Use technique descriptions from `/materials/` — cite the book
- Never embed CSS/JS inline in workout HTML — use `/template/styles.css` and `/template/app.js`
- Keep workout HTML lightweight — only WORKOUT data object changes per day
- After saving a log, always update `/logs/data.js` with the new entry
- Communicate in the same language the user writes in

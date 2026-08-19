import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { getTable, getUserId } from '../db.js';
import { LANGUAGE_NAMES, resolveLocale, t, type Locale } from '../i18n.js';
import { recallForPrompt, fenceUserText } from '../memory/index.js';
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const STREAK_GAP_TOLERANCE_DAYS = 1.5;

// GET /api/workouts — list user's workouts
app.http('getWorkouts', {
  methods: ['GET'],
  route: 'workouts',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const userId = getUserId(req.headers);
    if (!userId) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    const table = getTable('tplanWorkouts');
    const workouts: any[] = [];
    for await (const entity of table.listEntities({
      queryOptions: { filter: `PartitionKey eq '${userId}'` },
    })) {
      workouts.push({
        id: entity.rowKey,
        ...JSON.parse(entity.data as string || '{}'),
      });
    }
    workouts.sort((a, b) => b.date.localeCompare(a.date));
    return { jsonBody: workouts.slice(0, 20) };
  },
});

// DELETE /api/workouts/:id — cancel/delete a generated workout
app.http('deleteWorkout', {
  methods: ['DELETE'],
  route: 'workouts/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const userId = getUserId(req.headers);
    if (!userId) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    const id = req.params.id;
    if (!id) return { status: 400, jsonBody: { error: 'Missing workout ID' } };

    const table = getTable('tplanWorkouts');
    try {
      await table.deleteEntity(userId, id);
    } catch {
      return { status: 404, jsonBody: { error: 'Workout not found' } };
    }
    return { jsonBody: { deleted: true } };
  },
});

// POST /api/workouts/generate — generate today's workout based on schedule + logs
app.http('generateWorkout', {
  methods: ['POST'],
  route: 'workouts/generate',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const userId = getUserId(req.headers);
    if (!userId) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    const body = await req.json() as { date: string; session?: 'morning' | 'evening'; userNote?: string };
    const date = body.date;
    const session = body.session; // optional: 'morning' or 'evening'
    const userNote = body.userNote || ''; // user's pre-workout note/adjustment request
    const dayIdx = new Date(date).getDay();
    const dayKey = DAY_KEYS[dayIdx];
    const acceptLanguage = req.headers.get('accept-language');

    // 1. Get user profile + levels
    const userTable = getTable('tplanUsers');
    let user: any;
    let locale: Locale;
    try {
      const entity = await userTable.getEntity(userId, 'profile');
      user = {
        locale: entity.locale as string || undefined,
        currentLevels: JSON.parse(entity.currentLevels as string || '{}'),
        preferences: JSON.parse(entity.preferences as string || '{}'),
      };
      locale = resolveLocale(user.locale, acceptLanguage);
    } catch {
      const fallbackLocale = resolveLocale(undefined, acceptLanguage);
      return { status: 404, jsonBody: { error: t(fallbackLocale, 'error.userNotFound') } };
    }

    // 2. Get schedule for this day
    const schedTable = getTable('tplanSchedules');
    let schedule: any;
    try {
      const entity = await schedTable.getEntity(userId, 'current');
      schedule = {
        weeklySchedule: JSON.parse(entity.weeklySchedule as string || '{}'),
        programs: JSON.parse(entity.programs as string || '[]'),
      };
    } catch {
      return { status: 400, jsonBody: { error: t(locale, 'error.noSchedule') } };
    }

    let todaySlots = schedule.weeklySchedule[dayKey] || [];
    // Filter by session if specified
    if (session === 'morning') {
      todaySlots = todaySlots.filter((s: any) => s.slot !== 'evening');
    } else if (session === 'evening') {
      todaySlots = todaySlots.filter((s: any) => s.slot === 'evening');
    }
    if (todaySlots.length === 0) {
      return {
        status: 200,
        jsonBody: {
          restDay: true,
          rest: true,
          date,
          day: t(locale, `day.${dayIdx}`),
          message: t(locale, 'workout.restDay'),
        },
      };
    }

    // 3. Get programs data
    const progTable = getTable('tplanPrograms');
    const programsMap: Record<string, any> = {};
    for (const slot of todaySlots) {
      for (const pk of ['global', userId]) {
        try {
          const entity = await progTable.getEntity(pk, slot.programId);
          programsMap[slot.programId] = {
            id: entity.rowKey,
            name: entity.name,
            type: entity.type,
            exercises: JSON.parse(entity.exercises as string || '[]'),
            levels: JSON.parse(entity.levels as string || '[]'),
            progressionRules: JSON.parse(entity.progressionRules as string || '{}'),
            trainingDays: JSON.parse(entity.trainingDays as string || '{}'),
            defaultSchedule: JSON.parse(entity.defaultSchedule as string || '{}'),
          };
          break;
        } catch { continue; }
      }
    }

    // 4. Get recent logs for progression + exercise rest tracking
    const logsTable = getTable('tplanLogs');
    const recentLogs: any[] = [];
    for await (const entity of logsTable.listEntities({
      queryOptions: { filter: `PartitionKey eq '${userId}'` },
    })) {
      recentLogs.push(JSON.parse(entity.data as string || '{}'));
    }
    recentLogs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const last5 = recentLogs.slice(0, 5);

    // Build per-exercise last-done date map from recent logs
    const exerciseLastDone: Record<string, string> = {}; // exerciseId → date string
    for (const log of recentLogs.slice(0, 14)) { // look back ~2 weeks
      for (const ex of (log.exercises || [])) {
        const exId = ex.exerciseId || ex.name;
        if (exId && !exerciseLastDone[exId]) {
          exerciseLastDone[exId] = log.date;
        }
      }
    }

    // 5. Calculate streak
    const logDates = [...new Set(recentLogs.map(l => l.date))].sort((a, b) => b.localeCompare(a));
    let streak = 0;
    if (logDates.length > 0) {
      const yesterday = getLocalDateKey(new Date(new Date(date).getTime() - MS_PER_DAY));
      if (logDates[0] === date || logDates[0] === yesterday) {
        streak = 1;
        for (let i = 1; i < logDates.length; i++) {
          const d1 = new Date(logDates[i - 1]).getTime();
          const d2 = new Date(logDates[i]).getTime();
          if ((d1 - d2) / MS_PER_DAY <= STREAK_GAP_TOLERANCE_DAYS) streak++;
          else break;
        }
      }
    }

    // 6. Build workout steps for each scheduled program
    const allSteps: any[] = [];
    const titles: string[] = [];
    const todayMs = new Date(date).getTime();

    for (const slot of todaySlots) {
      const program = programsMap[slot.programId];
      if (!program) continue;

      const levels = user.currentLevels[slot.programId] || {};

      // Resolve training day type: use program's defaultSchedule to find
      // which trainingDay type applies today (e.g. "push_core", "pull_legs")
      let trainingDayType = program.defaultSchedule?.[dayKey];

      // If the program's default schedule doesn't cover this day (e.g. user
      // scheduled CC on a day not in the "Good Behavior" 3-day split), cycle
      // through the program's training day types based on position.
      if (!trainingDayType && program.trainingDays) {
        const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        const tdKeys = Object.keys(program.trainingDays);
        if (tdKeys.length > 0) {
          // Find all days this program is scheduled in the user's weekly plan
          const scheduledDays = dayOrder.filter(dk =>
            (schedule.weeklySchedule[dk] || []).some((s: any) => s.programId === slot.programId)
          );
          const dayPos = scheduledDays.indexOf(dayKey);
          if (dayPos >= 0) {
            trainingDayType = tdKeys[dayPos % tdKeys.length];
          } else {
            // Workout generated for an unscheduled day — use first type
            trainingDayType = tdKeys[0];
          }
        }
      }

      // Final fallback
      trainingDayType = trainingDayType || slot.slot;

      // Find last log with this program for previousResults
      const lastLog = last5.find((l: any) => l.programId === slot.programId);
      const previousResults = lastLog?.exercises || [];

      // Apply progression rules, rest filtering, and rotation
      const maxPerSession = program.progressionRules?.maxExercisesPerSession || 10;
      const defaultRestDays = program.progressionRules?.restDaysBetweenSameMuscle ?? 1;
      const steps = buildProgramSteps(program, levels, trainingDayType, previousResults, exerciseLastDone, todayMs, maxPerSession, defaultRestDays, locale);
      allSteps.push(...steps);
      titles.push(`${program.name}${trainingDayType ? ` (${program.trainingDays?.[trainingDayType]?.label || trainingDayType})` : ''}`);
    }

    // Add warmup at start, cooldown at end
    const steps = [
      buildWarmup(locale),
      ...allSteps,
      buildCooldown(locale),
    ];

    const weekNum = Math.ceil(
      (new Date(date).getTime() - new Date('2026-02-16').getTime()) / (7 * 86400000)
    );

    const workout: any = {
      id: `${userId}-${date}`,
      userId,
      date,
      day: t(locale, `day.${dayIdx}`),
      week: weekNum,
      title: titles.join(' + '),
      type: todaySlots[0]?.slot || 'custom',
      streak: streak + 1,
      previousResults: last5.flatMap((l: any) => l.exercises || []).slice(0, 10),
      steps,
      programIds: todaySlots.map((s: any) => s.programId),
      createdAt: new Date().toISOString(),
      completed: false,
      locale,
      userNote: userNote || undefined,
    };

    // 7. Try AI enhancement
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const key = process.env.AZURE_OPENAI_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;

    if (endpoint && key && deployment) {
      try {
        // The query is what today's session is about, so recall surfaces memories
        // relevant to these exercises rather than the user's whole history.
        const memory = await recallForPrompt(
          userId,
          `${titles.join(' ')} ${userNote || ''} ${allSteps.map((s: any) => s.name || '').join(' ')}`,
        );
        const enhanced = await enhanceWithAI(endpoint, key, deployment, workout, user, locale, memory.block);
        if (enhanced) {
          // AI only adds motivational notes, doesn't change structure
          for (let i = 0; i < workout.steps.length; i++) {
            if (enhanced.tips?.[i] && workout.steps[i].type === 'exercise') {
              workout.steps[i].aiTip = enhanced.tips[i];
            }
          }
          if (enhanced.motivation) workout.motivation = enhanced.motivation;
        }
      } catch { /* AI enhancement is optional */ }
    }

    // 8. Save workout
    const workoutTable = getTable('tplanWorkouts');
    await workoutTable.upsertEntity({
      partitionKey: userId,
      rowKey: workout.id,
      data: JSON.stringify(workout),
    }, 'Replace');

    return { status: 201, jsonBody: workout };
  },
});

function buildProgramSteps(
  program: any,
  levels: any,
  slot: string,
  previousResults: any[],
  exerciseLastDone: Record<string, string>,
  todayMs: number,
  maxPerSession: number,
  defaultRestDays: number,
  locale: Locale,
): any[] {
  const DAY_MS = 86400000;

  // 1. Filter exercises for this slot/day type
  let eligible = program.exercises.filter((exercise: any) => {
    if (exercise.slots && exercise.slots.length > 0 && slot) {
      return exercise.slots.includes(slot);
    }
    return true; // no slot filter or no slots defined
  });

  // 2. Separate into "rested" (ready) and "needs rest" (too recent)
  const ready: any[] = [];
  const needsRest: any[] = [];
  for (const exercise of eligible) {
    const lastDone = exerciseLastDone[exercise.id];
    if (lastDone) {
      const daysSince = (todayMs - new Date(lastDone).getTime()) / DAY_MS;
      const restRequired = exercise.restDaysBetween ?? defaultRestDays;
      if (daysSince <= restRequired) {
        needsRest.push(exercise);
        continue;
      }
    }
    ready.push(exercise);
  }

  // 3. If we have more exercises ready than maxPerSession, rotate
  //    Use a deterministic rotation based on today's date so the same day
  //    always picks the same subset (but different days rotate through)
  let selected = ready;
  if (selected.length > maxPerSession) {
    // Sort by: least recently done first (prioritize exercises not done in a while)
    selected.sort((a: any, b: any) => {
      const aDate = exerciseLastDone[a.id] || '2000-01-01';
      const bDate = exerciseLastDone[b.id] || '2000-01-01';
      return aDate.localeCompare(bDate); // oldest first
    });
    selected = selected.slice(0, maxPerSession);
  }

  // 4. If after rest filtering we have very few exercises, pull some from needsRest
  //    that have the longest rest already (least fatigued)
  const MIN_EXERCISES = 3;
  if (selected.length < MIN_EXERCISES && needsRest.length > 0) {
    needsRest.sort((a: any, b: any) => {
      const aDate = exerciseLastDone[a.id] || '2000-01-01';
      const bDate = exerciseLastDone[b.id] || '2000-01-01';
      return aDate.localeCompare(bDate); // most rested first
    });
    const needed = MIN_EXERCISES - selected.length;
    selected.push(...needsRest.slice(0, needed));
  }

  // 5. Build steps for selected exercises
  const steps: any[] = [];
  for (const exercise of selected) {
    const exLevel = levels[exercise.id] || { level: exercise.startLevel || 1, sets: exercise.defaultSets || 2, reps: exercise.defaultReps || 5 };

    const levelDef = (program.levels || []).find((l: any) =>
      l.exerciseId === exercise.id && l.level === exLevel.level
    );

    const name = levelDef?.name || exercise.name;
    const technique = levelDef?.technique || exercise.technique || '';

    if (exercise.type === 'timed') {
      steps.push({
        type: 'exercise',
        name,
        meta: t(locale, 'meta.hold', { seconds: exLevel.durationSec || exLevel.reps }),
        technique,
        tempo: 'hold',
        timer: exLevel.durationSec || exLevel.reps,
        planned: exLevel.durationSec || exLevel.reps,
        rest: 0,
        exerciseId: exercise.id,
        programId: program.id,
      });
    } else {
      for (let s = 1; s <= exLevel.sets; s++) {
        steps.push({
          type: 'exercise',
          name,
          meta: t(locale, 'meta.set', { level: exLevel.level, set: s, total: exLevel.sets }),
          technique: s === 1
            ? technique
            : t(locale, 'technique.tempo', { tempo: exercise.tempo || '2-1-2' }),
          tempo: exercise.tempo || '2-1-2',
          planned: exLevel.reps,
          rest: exercise.restBetweenSets || 60,
          exerciseId: exercise.id,
          programId: program.id,
        });
      }
    }
  }

  return steps;
}

function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function buildWarmup(locale: Locale): any {
  return {
    type: 'warmup',
    name: t(locale, 'warmup.name'),
    items: [
      { text: t(locale, 'warmup.1.text'), desc: t(locale, 'warmup.1.desc'), timer: 60 },
      { text: t(locale, 'warmup.2.text'), desc: t(locale, 'warmup.2.desc') },
      { text: t(locale, 'warmup.3.text'), desc: t(locale, 'warmup.3.desc') },
      { text: t(locale, 'warmup.4.text'), desc: t(locale, 'warmup.4.desc') },
      { text: t(locale, 'warmup.5.text'), desc: t(locale, 'warmup.5.desc') },
    ],
  };
}

function buildCooldown(locale: Locale): any {
  return {
    type: 'cooldown',
    name: t(locale, 'cooldown.name'),
    items: [
      { text: t(locale, 'cooldown.1.text'), desc: t(locale, 'cooldown.1.desc'), timer: 40 },
      { text: t(locale, 'cooldown.2.text'), desc: t(locale, 'cooldown.2.desc'), timer: 40 },
      { text: t(locale, 'cooldown.3.text'), desc: t(locale, 'cooldown.3.desc'), timer: 30 },
      { text: t(locale, 'cooldown.4.text'), desc: t(locale, 'cooldown.4.desc'), timer: 40 },
      { text: t(locale, 'cooldown.5.text'), desc: t(locale, 'cooldown.5.desc') },
      { text: t(locale, 'cooldown.6.text'), desc: t(locale, 'cooldown.6.desc'), timer: 40 },
      { text: t(locale, 'cooldown.7.text'), desc: t(locale, 'cooldown.7.desc'), timer: 30 },
    ],
  };
}

async function enhanceWithAI(endpoint: string, key: string, deployment: string, workout: any, user: any, locale: Locale, memoryBlock = '') {
  // The note is the user's own words, so it is untrusted input even though the user is
  // the person it is shown to. It goes in fenced, exactly like recalled memory.
  const userNoteSection = workout.userNote
    ? `\n${fenceUserText("The user's note for today", workout.userNote)}\nTake the note above into consideration in your tips.`
    : '';
  const memorySection = memoryBlock ? `\n${memoryBlock}\nUse these remembered facts when they are relevant - especially injuries and limitations.` : '';
  const prompt = `Add brief motivational coaching tips to this workout.
Write every value of the returned JSON in ${LANGUAGE_NAMES[locale]} — the user reads the app in that language.
Return JSON with:
- "motivation": a short motivational message for today
- "tips": array of strings (one per step, empty string for warmup/cooldown)
Workout: ${workout.title}, streak: ${workout.streak}, date: ${workout.date}${userNoteSection}${memorySection}
Exercises: ${workout.steps.filter((s: any) => s.type === 'exercise').map((s: any) => `${s.name} ${s.planned} reps`).join(', ')}`;

  const res = await fetch(`${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': key },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) return null;
  const data: any = await res.json();
  return JSON.parse(data.choices?.[0]?.message?.content || 'null');
}

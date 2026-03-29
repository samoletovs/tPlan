import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { getTable, getUserId } from '../db.js';

// POST /api/logs — save completed workout log + update progression
app.http('saveLogs', {
  methods: ['POST'],
  route: 'logs',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const userId = getUserId(req.headers);
    if (!userId) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    const body = await req.json() as Record<string, unknown>;
    const logId = `${body.date}-${Date.now()}`;

    const log = {
      ...body,
      id: logId,
      userId,
      timestamp: new Date().toISOString(),
    };

    // Save log
    const logsTable = getTable('tplanLogs');
    await logsTable.upsertEntity({
      partitionKey: userId,
      rowKey: logId,
      data: JSON.stringify(log),
    }, 'Replace');

    // Update user's current levels based on exercise difficulty
    await updateProgression(userId, log);

    // Mark workout as completed
    if (body.workoutId) {
      const workoutTable = getTable('tplanWorkouts');
      try {
        const entity = await workoutTable.getEntity(userId, body.workoutId as string);
        const data = JSON.parse(entity.data as string || '{}');
        data.completed = true;
        await workoutTable.updateEntity({
          ...entity,
          data: JSON.stringify(data),
        } as any, 'Merge');
      } catch { /* non-critical */ }
    }

    return { status: 201, jsonBody: log };
  },
});

// GET /api/logs
app.http('getLogs', {
  methods: ['GET'],
  route: 'logs',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const userId = getUserId(req.headers);
    if (!userId) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    const logs: any[] = [];
    const table = getTable('tplanLogs');
    for await (const entity of table.listEntities({
      queryOptions: { filter: `PartitionKey eq '${userId}'` },
    })) {
      logs.push(JSON.parse(entity.data as string || '{}'));
    }
    logs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const limit = parseInt(req.query.get('limit') || '50');
    const offset = parseInt(req.query.get('offset') || '0');
    return { jsonBody: logs.slice(offset, offset + limit) };
  },
});

// GET /api/dashboard — aggregated stats from logs
app.http('getDashboard', {
  methods: ['GET'],
  route: 'dashboard',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const userId = getUserId(req.headers);
    if (!userId) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    const table = getTable('tplanLogs');
    const logs: any[] = [];
    for await (const entity of table.listEntities({
      queryOptions: { filter: `PartitionKey eq '${userId}'` },
    })) {
      logs.push(JSON.parse(entity.data as string || '{}'));
    }
    logs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (logs.length === 0) {
      return {
        jsonBody: {
          totalWorkouts: 0, totalMinutes: 0, totalSets: 0, totalReps: 0,
          currentStreak: 0, maxStreak: 0, lastWeight: null,
          weightHistory: [], repsPerExercise: [], difficultyDistribution: [],
        },
      };
    }

    let totalMinutes = 0, totalSets = 0, totalReps = 0;
    let lastWeight: number | null = null;
    const weightHistory: any[] = [];

    for (const log of logs) {
      totalMinutes += log.durationMin || 0;
      const exercises = log.exercises || [];
      totalSets += exercises.length;
      totalReps += exercises.reduce((s: number, e: any) => s + (e.actual || 0), 0);
      if (log.bodyWeightKg && !lastWeight) lastWeight = log.bodyWeightKg;
      if (log.bodyWeightKg) weightHistory.push({ date: log.date, weight: log.bodyWeightKg });
    }

    // Streak
    const dates = [...new Set(logs.map(l => l.date))].sort((a, b) => b.localeCompare(a));
    let currentStreak = 0, maxStreak = 0, tempStreak = 1;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (dates[0] === today || dates[0] === yesterday) {
      currentStreak = 1;
      for (let i = 1; i < dates.length; i++) {
        const diff = (new Date(dates[i - 1]).getTime() - new Date(dates[i]).getTime()) / 86400000;
        if (diff <= 1.5) currentStreak++;
        else break;
      }
    }

    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i - 1]).getTime() - new Date(dates[i]).getTime()) / 86400000;
      if (diff <= 1.5) { tempStreak++; maxStreak = Math.max(maxStreak, tempStreak); }
      else tempStreak = 1;
    }
    maxStreak = Math.max(maxStreak, currentStreak);

    return {
      jsonBody: {
        totalWorkouts: logs.length,
        totalMinutes,
        totalSets,
        totalReps,
        currentStreak,
        maxStreak,
        lastWeight,
        weightHistory: weightHistory.slice(0, 20),
        repsPerExercise: [],
        difficultyDistribution: [],
      },
    };
  },
});

/**
 * Progressive overload: check logged difficulty and update user levels.
 * Rule: 2 consecutive "easy" → +2 reps (or +1 level if at max reps)
 * "hard" → no change
 */
async function updateProgression(userId: string, log: any) {
  const exercises = log.exercises || [];
  if (exercises.length === 0) return;

  // Group by exerciseId + programId
  const grouped = new Map<string, any[]>();
  for (const ex of exercises) {
    const key = `${ex.programId || 'default'}:${ex.exerciseId || ex.name}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(ex);
  }

  // For each exercise, check if ALL sets were "easy"
  const updates: Record<string, Record<string, any>> = {};

  for (const [key, sets] of grouped) {
    const [programId, exerciseId] = key.split(':');
    const allEasy = sets.every((s: any) => s.difficulty === 'easy');
    const anyHard = sets.some((s: any) => s.difficulty === 'hard');

    if (!updates[programId]) updates[programId] = {};

    // Get current levels from user
    const userTable = getTable('tplanUsers');
    try {
      const userEntity = await userTable.getEntity(userId, 'profile');
      const currentLevels = JSON.parse(userEntity.currentLevels as string || '{}');
      const progLevels = currentLevels[programId] || {};
      const exLevel = progLevels[exerciseId] || { level: 1, sets: 2, reps: 5, consecutiveEasy: 0 };

      if (allEasy) {
        exLevel.consecutiveEasy = (exLevel.consecutiveEasy || 0) + 1;
        if (exLevel.consecutiveEasy >= 2) {
          exLevel.reps += 2;
          exLevel.consecutiveEasy = 0;
        }
      } else if (anyHard) {
        exLevel.consecutiveEasy = 0;
      } else {
        // Normal — reset consecutive but keep reps
        exLevel.consecutiveEasy = 0;
      }

      progLevels[exerciseId] = exLevel;
      currentLevels[programId] = progLevels;

      await userTable.updateEntity({
        ...userEntity,
        currentLevels: JSON.stringify(currentLevels),
      } as any, 'Merge');
    } catch { /* non-critical */ }
  }
}

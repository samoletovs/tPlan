import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { getTable, getUserId, getUserEmail } from '../db.js';

const SUPPORTED_LOCALES = ['en', 'ru', 'lv', 'es'];

const DEFAULT_PREFERENCES = {
  defaultDifficulty: 'easy',
  restTimerEnabled: true,
  soundEnabled: true,
  weekStartsOn: 'monday',
  locale: 'en',
};

// GET /api/user
app.http('getUser', {
  methods: ['GET'],
  route: 'user',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const userId = getUserId(req.headers);
    if (!userId) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    const table = getTable('tplanUsers');
    try {
      const entity = await table.getEntity(userId, 'profile');
      const rawLevels = JSON.parse(entity.currentLevels as string || '{}');
      const user = {
        userId: entity.partitionKey,
        email: entity.email as string || '',
        displayName: entity.displayName as string || 'User',
        locale: entity.locale as string || 'en',
        createdAt: entity.createdAt as string || new Date().toISOString(),
        enrolledPrograms: JSON.parse(entity.enrolledPrograms as string || '[]'),
        currentLevels: normalizeLevels(rawLevels),
        preferences: JSON.parse(entity.preferences as string || JSON.stringify(DEFAULT_PREFERENCES)),
      };
      return { jsonBody: user };
    } catch (err: any) {
      if (err.statusCode === 404) {
        // First login — create user
        const email = getUserEmail(req.headers) || '';
        const newUser = {
          partitionKey: userId,
          rowKey: 'profile',
          email,
          displayName: email.split('@')[0] || 'User',
          locale: 'en',
          createdAt: new Date().toISOString(),
          enrolledPrograms: '[]',
          currentLevels: '{}',
          preferences: JSON.stringify(DEFAULT_PREFERENCES),
        };
        await table.createEntity(newUser);
        return {
          jsonBody: {
            userId,
            email,
            displayName: newUser.displayName,
            locale: 'en',
            createdAt: newUser.createdAt,
            enrolledPrograms: [],
            currentLevels: {},
            preferences: DEFAULT_PREFERENCES,
          },
        };
      }
      return { status: 500, jsonBody: { error: 'Internal error' } };
    }
  },
});

// PUT /api/user
app.http('updateUser', {
  methods: ['PUT'],
  route: 'user',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const userId = getUserId(req.headers);
    if (!userId) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    const updates = await req.json() as Record<string, unknown>;
    const table = getTable('tplanUsers');

    try {
      const entity = await table.getEntity(userId, 'profile');
      const merged: Record<string, unknown> = { ...entity };

      if (updates.displayName) merged.displayName = updates.displayName;
      if (typeof updates.locale === 'string' && SUPPORTED_LOCALES.includes(updates.locale)) {
        merged.locale = updates.locale;
      }
      if (updates.preferences) merged.preferences = JSON.stringify(updates.preferences);
      if (updates.currentLevels) merged.currentLevels = JSON.stringify(updates.currentLevels);
      if (updates.enrolledPrograms) merged.enrolledPrograms = JSON.stringify(updates.enrolledPrograms);

      await table.updateEntity(merged as any, 'Merge');
      return { jsonBody: { ok: true } };
    } catch {
      return { status: 404, jsonBody: { error: 'User not found' } };
    }
  },
});

/**
 * Normalize currentLevels from per-program storage format to flat frontend format.
 * Storage: { "convict-conditioning": { "pushups": {...} }, "dumbbell-gymnastics": { "bicep-curl": {...} } }
 * Frontend: { "pushups": {...}, "legRaises": {...}, "plank": {...}, "dumbbells": { weightKg, reps, consecutiveEasy } }
 */
function normalizeLevels(raw: Record<string, any>): Record<string, any> {
  // If already in flat format (legacy), return as-is
  if (raw.pushups || raw.legRaises || raw.squats) return raw;

  const cc = raw['convict-conditioning'] || {};
  const db = raw['dumbbell-gymnastics'] || {};

  const flat: Record<string, any> = {
    pushups: cc.pushups || { level: 1, sets: 2, reps: 5, consecutiveEasy: 0 },
    legRaises: cc.legRaises || { level: 1, sets: 2, reps: 5, consecutiveEasy: 0 },
    squats: cc.squats || { level: 1, sets: 2, reps: 5, consecutiveEasy: 0 },
    bridges: cc.bridges || { level: 1, sets: 2, reps: 10, consecutiveEasy: 0 },
    plank: cc.plank || { durationSec: 30, consecutiveEasy: 0 },
    dumbbells: {
      weightKg: 3.5,
      reps: {} as Record<string, number>,
      consecutiveEasy: {} as Record<string, number>,
    },
  };

  const DB_NAMES: Record<string, string> = {
    'tennis-ball': 'Tennis Ball Squeeze', 'bicep-curl': 'Bicep Curl', 'reverse-curl': 'Reverse Curl',
    'french-press': 'French Press', 'front-raise': 'Front Raise', 'bench-press': 'Dumbbell Bench Press',
    'neck-raise': 'Neck Raise', 'back-extension': 'Back Extension', 'side-bend': 'Side Bend',
    'db-squat': 'Dumbbell Squat', 'calf-raise': 'Calf Raise', 'wrist-curl': 'Wrist Curl',
    'reverse-wrist': 'Reverse Wrist Curl',
  };

  for (const [id, data] of Object.entries(db)) {
    const name = DB_NAMES[id] || id;
    flat.dumbbells.reps[name] = (data as any).reps || 5;
    flat.dumbbells.consecutiveEasy[name] = (data as any).consecutiveEasy || 0;
  }

  return flat;
}

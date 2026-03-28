import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { getTable, getUserId, getUserEmail } from '../db.js';

const SEED_SCHEDULE = {
  mon: [{ programId: 'convict-conditioning', slot: 'B' }],
  tue: [{ programId: 'convict-conditioning', slot: 'A' }],
  wed: [{ programId: 'convict-conditioning', slot: 'B' }, { programId: 'dumbbell-gymnastics', slot: 'evening' }],
  thu: [{ programId: 'convict-conditioning', slot: 'A' }],
  fri: [{ programId: 'convict-conditioning', slot: 'B' }],
  sat: [{ programId: 'convict-conditioning', slot: 'A' }, { programId: 'dumbbell-gymnastics', slot: 'evening' }],
  sun: [{ programId: 'convict-conditioning', slot: 'B' }],
};

const SEED_PROGRAMS = [
  {
    programId: 'convict-conditioning',
    currentLevels: {
      pushups: { level: 5, sets: 2, reps: 11, consecutiveEasy: 0 },
      legRaises: { level: 5, sets: 2, reps: 5, consecutiveEasy: 0 },
      squats: { level: 5, sets: 2, reps: 11, consecutiveEasy: 0 },
      bridges: { level: 1, sets: 2, reps: 10, consecutiveEasy: 0 },
      plank: { level: 1, sets: 1, reps: 60, durationSec: 60, consecutiveEasy: 0 },
    },
  },
  {
    programId: 'dumbbell-gymnastics',
    currentLevels: {
      'tennis-ball': { level: 1, sets: 1, reps: 8, consecutiveEasy: 0 },
      'bicep-curl': { level: 1, sets: 1, reps: 5, consecutiveEasy: 0 },
      'reverse-curl': { level: 1, sets: 1, reps: 5, consecutiveEasy: 0 },
      'french-press': { level: 1, sets: 1, reps: 5, consecutiveEasy: 0 },
      'front-raise': { level: 1, sets: 1, reps: 5, consecutiveEasy: 0 },
      'bench-press': { level: 1, sets: 1, reps: 5, consecutiveEasy: 0 },
      'neck-raise': { level: 1, sets: 1, reps: 5, consecutiveEasy: 0 },
      'back-extension': { level: 1, sets: 1, reps: 5, consecutiveEasy: 0 },
      'side-bend': { level: 1, sets: 1, reps: 6, consecutiveEasy: 0 },
      'db-squat': { level: 1, sets: 1, reps: 5, consecutiveEasy: 0 },
      'calf-raise': { level: 1, sets: 1, reps: 10, consecutiveEasy: 0 },
      'wrist-curl': { level: 1, sets: 1, reps: 8, consecutiveEasy: 0 },
      'reverse-wrist': { level: 1, sets: 1, reps: 8, consecutiveEasy: 0 },
    },
  },
];

const SEED_LEVELS: Record<string, any> = {
  'convict-conditioning': SEED_PROGRAMS[0].currentLevels,
  'dumbbell-gymnastics': SEED_PROGRAMS[1].currentLevels,
};

app.http('seedUser', {
  methods: ['POST'],
  route: 'seed',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const userId = getUserId(req.headers);
    if (!userId) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    const schedTable = getTable('tplanSchedules');

    // Check if user already has a schedule
    try {
      const existing = await schedTable.getEntity(userId, 'current');
      const ws = existing.weeklySchedule as string;
      if (ws && ws !== '{}' && ws !== '[]') {
        return { jsonBody: { message: 'Schedule already exists', seeded: false } };
      }
    } catch { /* No schedule — proceed */ }

    // Apply schedule
    await schedTable.upsertEntity({
      partitionKey: userId,
      rowKey: 'current',
      weeklySchedule: JSON.stringify(SEED_SCHEDULE),
      programs: JSON.stringify(SEED_PROGRAMS),
      updatedAt: new Date().toISOString(),
    }, 'Replace');

    // Update user profile
    const userTable = getTable('tplanUsers');
    const email = getUserEmail(req.headers) || '';

    await userTable.upsertEntity({
      partitionKey: userId,
      rowKey: 'profile',
      email,
      displayName: email.split('@')[0] || 'User',
      locale: 'en',
      createdAt: new Date().toISOString(),
      currentLevels: JSON.stringify(SEED_LEVELS),
      enrolledPrograms: JSON.stringify(['convict-conditioning', 'dumbbell-gymnastics']),
      preferences: JSON.stringify({
        defaultDifficulty: 'easy',
        restTimerEnabled: true,
        soundEnabled: true,
        weekStartsOn: 'monday',
      }),
    }, 'Replace');

    // Remap any migrated logs from 'migrate-pending' to this user
    const remapped = await remapMigratedLogs(userId);

    return { jsonBody: { message: 'Seeded: Convict Conditioning + Dumbbell Gymnastics', seeded: true, remappedLogs: remapped } };
  },
});

// Remap migrated logs from 'migrate-pending' to real userId
async function remapMigratedLogs(userId: string): Promise<number> {
  const logsTable = getTable('tplanLogs');
  let count = 0;
  try {
    const entities: any[] = [];
    for await (const entity of logsTable.listEntities({
      queryOptions: { filter: `PartitionKey eq 'migrate-pending'` },
    })) {
      entities.push(entity);
    }
    for (const entity of entities) {
      const data = JSON.parse(entity.data as string || '{}');
      data.userId = userId;
      // Create new entity under real userId
      await logsTable.upsertEntity({
        partitionKey: userId,
        rowKey: entity.rowKey as string,
        data: JSON.stringify(data),
      }, 'Replace');
      // Delete old entity
      await logsTable.deleteEntity('migrate-pending', entity.rowKey as string);
      count++;
    }
  } catch { /* non-critical */ }
  return count;
}

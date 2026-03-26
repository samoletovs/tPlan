import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { getTable, getUserId, getUserEmail } from '../db.js';
import { readFileSync } from 'fs';
import { join } from 'path';

// POST /api/seed — apply seed data (schedule + levels) to the current user
// Only works if the user has no schedule yet
app.http('seedUser', {
  methods: ['POST'],
  route: 'seed',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const userId = getUserId(req.headers);
    if (!userId) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    // Check if user already has a schedule
    const schedTable = getTable('tplanSchedules');
    try {
      const existing = await schedTable.getEntity(userId, 'current');
      if (existing.weeklySchedule && existing.weeklySchedule !== '{}') {
        return { jsonBody: { message: 'User already has a schedule. Skipping seed.', seeded: false } };
      }
    } catch { /* No schedule — proceed with seed */ }

    // Load seed data
    let seedData: any;
    try {
      const raw = readFileSync(join(__dirname, '..', 'seed-data.json'), 'utf8');
      seedData = JSON.parse(raw);
    } catch {
      // Try from request body as fallback
      try {
        seedData = await req.json();
      } catch {
        return { status: 400, jsonBody: { error: 'No seed data available' } };
      }
    }

    // Apply schedule
    await schedTable.upsertEntity({
      partitionKey: userId,
      rowKey: 'current',
      weeklySchedule: JSON.stringify(seedData.schedule),
      programs: JSON.stringify(seedData.programs),
      updatedAt: new Date().toISOString(),
    }, 'Replace');

    // Update user profile with levels + programs
    const userTable = getTable('tplanUsers');
    const email = getUserEmail(req.headers) || '';

    try {
      const entity = await userTable.getEntity(userId, 'profile');
      await userTable.updateEntity({
        ...entity,
        email,
        displayName: email.split('@')[0] || 'User',
        currentLevels: JSON.stringify(seedData.currentLevels),
        enrolledPrograms: JSON.stringify(['convict-conditioning', 'dumbbell-gymnastics']),
      } as any, 'Merge');
    } catch {
      // User doesn't exist yet — create
      await userTable.upsertEntity({
        partitionKey: userId,
        rowKey: 'profile',
        email,
        displayName: email.split('@')[0] || 'User',
        locale: 'en',
        createdAt: new Date().toISOString(),
        currentLevels: JSON.stringify(seedData.currentLevels),
        enrolledPrograms: JSON.stringify(['convict-conditioning', 'dumbbell-gymnastics']),
        preferences: JSON.stringify({
          defaultDifficulty: 'easy',
          restTimerEnabled: true,
          soundEnabled: true,
          weekStartsOn: 'monday',
          locale: 'en',
        }),
      }, 'Replace');
    }

    return { jsonBody: { message: 'User seeded with Convict Conditioning + Dumbbell Gymnastics schedule', seeded: true } };
  },
});

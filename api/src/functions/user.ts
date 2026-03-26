import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { getTable, getUserId, getUserEmail } from '../db.js';

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
      const user = {
        userId: entity.partitionKey,
        email: entity.email as string || '',
        displayName: entity.displayName as string || 'User',
        locale: entity.locale as string || 'en',
        createdAt: entity.createdAt as string || new Date().toISOString(),
        enrolledPrograms: JSON.parse(entity.enrolledPrograms as string || '[]'),
        currentLevels: JSON.parse(entity.currentLevels as string || '{}'),
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
      if (updates.locale) merged.locale = updates.locale;
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

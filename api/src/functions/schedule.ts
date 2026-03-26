import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { getTable, getUserId } from '../db.js';

// GET /api/schedule — get user's weekly schedule
app.http('getSchedule', {
  methods: ['GET'],
  route: 'schedule',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const userId = getUserId(req.headers);
    if (!userId) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    const table = getTable('tplanSchedules');
    try {
      const entity = await table.getEntity(userId, 'current');
      return {
        jsonBody: {
          userId,
          weeklySchedule: JSON.parse(entity.weeklySchedule as string || '{}'),
          programs: JSON.parse(entity.programs as string || '[]'),
          updatedAt: entity.updatedAt,
        },
      };
    } catch (err: any) {
      if (err.statusCode === 404) {
        return { jsonBody: { userId, weeklySchedule: {}, programs: [], updatedAt: null } };
      }
      return { status: 500, jsonBody: { error: 'Internal error' } };
    }
  },
});

// PUT /api/schedule — update weekly schedule
// Body: { weeklySchedule: { mon: [{programId, slot}], tue: [...], ... }, programs: [{programId, currentLevels}] }
app.http('updateSchedule', {
  methods: ['PUT'],
  route: 'schedule',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const userId = getUserId(req.headers);
    if (!userId) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    const body = await req.json() as {
      weeklySchedule: Record<string, { programId: string; slot: string }[]>;
      programs: { programId: string; currentLevels: Record<string, any> }[];
    };

    const table = getTable('tplanSchedules');
    const entity = {
      partitionKey: userId,
      rowKey: 'current',
      weeklySchedule: JSON.stringify(body.weeklySchedule),
      programs: JSON.stringify(body.programs),
      updatedAt: new Date().toISOString(),
    };

    await table.upsertEntity(entity, 'Replace');

    // Also update user's currentLevels per program
    const userTable = getTable('tplanUsers');
    try {
      const userEntity = await userTable.getEntity(userId, 'profile');
      const currentLevels = body.programs.reduce((acc, p) => {
        acc[p.programId] = p.currentLevels;
        return acc;
      }, {} as Record<string, any>);
      await userTable.updateEntity({
        ...userEntity,
        currentLevels: JSON.stringify(currentLevels),
        enrolledPrograms: JSON.stringify(body.programs.map(p => p.programId)),
      } as any, 'Merge');
    } catch {
      // User update failed — non-critical
    }

    return { jsonBody: { ok: true } };
  },
});

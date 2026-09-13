import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { getTable, getUserId } from '../db.js';
import { readProgramSchedule, ProgramScheduleError } from '../services/program-schedule.js';
import { resolveLocale, t } from '../i18n.js';

function invalidProgram(req: HttpRequest): HttpResponseInit {
  return { status: 422, jsonBody: {
    code: 'invalid_program',
    error: t(resolveLocale(undefined, req.headers.get('accept-language')), 'error.invalidProgram'),
  } };
}

// GET /api/programs — list all programs (global + user-uploaded)
app.http('getPrograms', {
  methods: ['GET'],
  route: 'programs',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const userId = getUserId(req.headers);
    if (!userId) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    const table = getTable('tplanPrograms');
    const programs: Record<string, unknown>[] = [];

    // Get global programs (partitionKey = "global") and user's programs
    for await (const entity of table.listEntities({
      queryOptions: {
        filter: `PartitionKey eq 'global' or PartitionKey eq '${userId}'`,
      },
    })) {
      const identity = {
        id: entity.rowKey,
        owner: entity.partitionKey === 'global' ? 'global' : userId,
        name: typeof entity.name === 'string' ? entity.name : entity.rowKey,
        description: typeof entity.description === 'string' ? entity.description : '',
        type: typeof entity.type === 'string' ? entity.type : 'custom',
        source: typeof entity.source === 'string' ? entity.source : '',
        createdAt: typeof entity.createdAt === 'string' ? entity.createdAt : '',
      };
      try {
        const schedule = readProgramSchedule(entity);
        const levels: unknown = JSON.parse(String(entity.levels ?? '[]'));
        const progressionRules: unknown = JSON.parse(String(entity.progressionRules ?? '{}'));
        if (!Array.isArray(levels) || !progressionRules || typeof progressionRules !== 'object' || Array.isArray(progressionRules)) {
          throw new ProgramScheduleError();
        }
        programs.push({ ...identity, ...schedule, levels, progressionRules, availability: 'ready' });
      } catch {
        // Keep the identity available for repair/deletion without presenting damaged data as runnable.
        programs.push({
          ...identity, availability: 'repair_required',
          exercises: [], levels: [], trainingDays: {}, defaultSchedule: {},
          progressionRules: {},
        });
      }
    }

    return { jsonBody: programs };
  },
});

// GET /api/programs/:id
app.http('getProgram', {
  methods: ['GET'],
  route: 'programs/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const userId = getUserId(req.headers);
    if (!userId) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    const id = req.params.id;
    const table = getTable('tplanPrograms');

    // Try global first, then user
    for (const pk of ['global', userId]) {
      try {
        const entity = await table.getEntity(pk, id);
        return {
          jsonBody: {
            id: entity.rowKey,
            owner: entity.partitionKey === 'global' ? 'global' : userId,
            name: entity.name,
            description: entity.description,
            type: entity.type,
            ...readProgramSchedule(entity),
            levels: JSON.parse(entity.levels as string || '[]'),
            progressionRules: JSON.parse(entity.progressionRules as string || '{}'),
            source: entity.source,
            createdAt: entity.createdAt,
          },
        };
      } catch (error) {
        if (error instanceof ProgramScheduleError) return invalidProgram(req);
        continue;
      }
    }
    return { status: 404, jsonBody: { error: 'Program not found' } };
  },
});

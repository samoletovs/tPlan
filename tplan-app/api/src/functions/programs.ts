import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { getTable, getUserId } from '../db.js';

// GET /api/programs — list all programs (global + user-uploaded)
app.http('getPrograms', {
  methods: ['GET'],
  route: 'programs',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const userId = getUserId(req.headers);
    if (!userId) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    const table = getTable('tplanPrograms');
    const programs: any[] = [];

    // Get global programs (partitionKey = "global") and user's programs
    for await (const entity of table.listEntities({
      queryOptions: {
        filter: `PartitionKey eq 'global' or PartitionKey eq '${userId}'`,
      },
    })) {
      programs.push({
        id: entity.rowKey,
        owner: entity.partitionKey === 'global' ? 'global' : userId,
        name: entity.name,
        description: entity.description,
        type: entity.type, // 'calisthenics' | 'weights' | 'cardio' | 'flexibility'
        exercises: JSON.parse(entity.exercises as string || '[]'),
        levels: JSON.parse(entity.levels as string || '[]'),
        progressionRules: JSON.parse(entity.progressionRules as string || '{}'),
        source: entity.source, // original file name
        createdAt: entity.createdAt,
      });
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
            exercises: JSON.parse(entity.exercises as string || '[]'),
            levels: JSON.parse(entity.levels as string || '[]'),
            progressionRules: JSON.parse(entity.progressionRules as string || '{}'),
            source: entity.source,
            createdAt: entity.createdAt,
          },
        };
      } catch {
        continue;
      }
    }
    return { status: 404, jsonBody: { error: 'Program not found' } };
  },
});

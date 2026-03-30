import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { getTable, getUserId } from '../db.js';
import { extractProgram } from '../services/extraction.js';

// POST /api/programs/extract — upload book text, get extracted program structure
app.http('extractProgram', {
  methods: ['POST'],
  route: 'programs/extract',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const userId = getUserId(req.headers);
    if (!userId) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    let body: { text?: string; fileName?: string };
    try {
      body = await req.json() as { text?: string; fileName?: string };
    } catch {
      return { status: 400, jsonBody: { error: 'Invalid JSON body' } };
    }

    const { text, fileName } = body;

    if (!text || typeof text !== 'string') {
      return { status: 400, jsonBody: { error: 'Missing "text" field — the book content to extract from' } };
    }
    if (!fileName || typeof fileName !== 'string') {
      return { status: 400, jsonBody: { error: 'Missing "fileName" field' } };
    }

    // Limit text size (500KB ≈ large book)
    if (text.length > 500_000) {
      return { status: 413, jsonBody: { error: 'Text too large. Maximum 500,000 characters.' } };
    }

    try {
      const result = await extractProgram(text, fileName);
      return { jsonBody: result };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Extraction failed';
      console.error('Extraction error:', message);
      return { status: 502, jsonBody: { error: message } };
    }
  },
});

// POST /api/programs — save a new program (from extraction review or manual creation)
app.http('createProgram', {
  methods: ['POST'],
  route: 'programs',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const userId = getUserId(req.headers);
    if (!userId) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    let program: any;
    try {
      program = await req.json();
    } catch {
      return { status: 400, jsonBody: { error: 'Invalid JSON body' } };
    }

    if (!program.name || typeof program.name !== 'string') {
      return { status: 400, jsonBody: { error: 'Program must have a name' } };
    }
    if (!program.exercises || !Array.isArray(program.exercises) || program.exercises.length === 0) {
      return { status: 400, jsonBody: { error: 'Program must have at least one exercise' } };
    }

    const id = generateId(program.name);
    const now = new Date().toISOString();

    const table = getTable('tplanPrograms');
    await table.upsertEntity({
      partitionKey: userId,
      rowKey: id,
      name: program.name,
      description: program.description || '',
      type: program.type || 'custom',
      source: program.source || 'manual',
      exercises: JSON.stringify(program.exercises),
      levels: JSON.stringify(program.levels || []),
      progressionRules: JSON.stringify(program.progressionRules || {
        repsIncrement: 2,
        consecutiveEasyThreshold: 2,
        levelUpAtMaxReps: true,
      }),
      createdAt: now,
    }, 'Replace');

    return {
      status: 201,
      jsonBody: {
        id,
        owner: userId,
        name: program.name,
        description: program.description || '',
        type: program.type || 'custom',
        source: program.source || 'manual',
        exercises: program.exercises,
        levels: program.levels || [],
        progressionRules: program.progressionRules || {
          repsIncrement: 2,
          consecutiveEasyThreshold: 2,
          levelUpAtMaxReps: true,
        },
        createdAt: now,
      },
    };
  },
});

// DELETE /api/programs/:id — delete a user's custom program
app.http('deleteProgram', {
  methods: ['DELETE'],
  route: 'programs/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const userId = getUserId(req.headers);
    if (!userId) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    const id = req.params.id;
    if (!id) return { status: 400, jsonBody: { error: 'Missing program ID' } };

    const table = getTable('tplanPrograms');

    // Only allow deleting user's own programs (not global)
    try {
      await table.getEntity(userId, id);
    } catch {
      return { status: 404, jsonBody: { error: 'Program not found or not owned by you' } };
    }

    await table.deleteEntity(userId, id);
    return { status: 200, jsonBody: { deleted: true } };
  },
});

function generateId(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40);
  const suffix = Date.now().toString(36).slice(-4);
  return `${base}-${suffix}`;
}

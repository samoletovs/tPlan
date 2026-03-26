import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { getTable, getUserId } from '../db.js';

app.http('submitFeedback', {
  methods: ['POST'],
  route: 'feedback',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const userId = getUserId(req.headers);
    if (!userId) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    const body = await req.json() as { type: string; description: string };
    // For now just log it — could create GitHub issue later
    console.log(`[feedback] user=${userId} type=${body.type} desc=${body.description}`);
    return { jsonBody: { data: null } };
  },
});

/**
 * User-facing control over what tPlan remembers.
 *
 * Memory the user cannot see is memory they cannot correct, and a coach that acts on
 * an invisible belief is worse than one that forgets. These routes are the reason the
 * store is allowed to exist at all, so they ship with the write path, not after it.
 */

import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { getUserId } from '../db.js';
import { getMemoryStore } from '../memory/index.js';
import { isExpired, type MemoryRecord } from '../memory/memory-core.js';

/** Only the fields a user needs; `source` is internal provenance, not user-facing. */
function toPublic(record: MemoryRecord) {
  return {
    id: record.id,
    kind: record.kind,
    text: record.text,
    confidence: record.confidence,
    importance: record.importance,
    createdAt: record.createdAt,
    lastUsedAt: record.lastUsedAt,
    useCount: record.useCount,
  };
}

// GET /api/memory — everything tPlan currently believes about this user
app.http('getMemory', {
  methods: ['GET'],
  route: 'memory',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const userId = getUserId(req.headers);
    if (!userId) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    try {
      const now = new Date();
      const all = await getMemoryStore().list(userId);

      // Superseded records stay in the store as an audit trail of corrections, but
      // showing them would imply tPlan still believes them.
      const superseded = new Set(
        all.map((record) => record.supersedes).filter((id): id is string => Boolean(id)),
      );

      const active = all
        .filter((record) => !superseded.has(record.id) && !isExpired(record, now))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))
        .map(toPublic);

      return { jsonBody: active };
    } catch (err) {
      console.warn('Memory list failed:', { userId, error: err });
      return { jsonBody: [] };
    }
  },
});

// DELETE /api/memory/{id} — forget one thing
app.http('deleteMemory', {
  methods: ['DELETE'],
  route: 'memory/{id}',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const userId = getUserId(req.headers);
    if (!userId) return { status: 401, jsonBody: { error: 'Unauthorized' } };

    const id = req.params.id;
    if (!id) return { status: 400, jsonBody: { error: 'Missing id' } };

    try {
      // The store partitions by user, so this can only ever reach the caller's own
      // memories - a guessed id from another account resolves to nothing.
      await getMemoryStore().delete(userId, id);
      return { status: 204 };
    } catch (err) {
      console.warn('Memory delete failed:', { userId, id, error: err });
      return { status: 500, jsonBody: { error: 'Could not forget that' } };
    }
  },
});

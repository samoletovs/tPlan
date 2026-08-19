/**
 * Azure Table Storage adapter for the shared memory core.
 *
 * CANONICAL COPY: `.github/config/memory/memory-store-table.ts` (see PLATFORM.md §18).
 * For projects on Table Storage: tPlan, agentMode.
 *
 * Table Storage is the cheapest store the lab uses and has no per-hour cost, which is
 * why several projects are on it. The trade-offs that shape this adapter:
 *   - PartitionKey/RowKey are the only indexed columns, so `userId` is the partition
 *     and the memory id is the row. Every query here is a partition scan at worst.
 *   - There is no JSON column type; entities are flat. Records are therefore stored
 *     with primitive fields only.
 *   - RowKey forbids  / \ # ? and control characters, so ids are sanitised.
 */

import { TableClient, odata } from '@azure/data-tables';
// The `.js` extension is required by projects on moduleResolution node16/nodenext
// (atlas, tPlan) and understood by those on bundler (era, golazo). Extensionless
// compiles in the second group and fails in the first, so this is the portable form.
import type { MemoryRecord, MemoryStore } from './memory-core.js';

interface MemoryEntity {
  partitionKey: string;
  rowKey: string;
  kind: string;
  text: string;
  source: string;
  confidence: number;
  importance: number;
  createdAt: string;
  lastUsedAt: string;
  useCount: number;
  supersedes?: string;
  expiresAt?: string;
}

/** RowKey cannot contain / \ # ? or control characters. */
export function sanitizeKey(id: string): string {
  return id.replace(/[/\\#?\u0000-\u001F\u007F-\u009F]/g, '-');
}

function toEntity(record: MemoryRecord): MemoryEntity {
  return {
    partitionKey: record.userId,
    rowKey: sanitizeKey(record.id),
    kind: record.kind,
    text: record.text,
    source: record.source,
    confidence: record.confidence,
    importance: record.importance,
    createdAt: record.createdAt,
    lastUsedAt: record.lastUsedAt,
    useCount: record.useCount,
    ...(record.supersedes ? { supersedes: record.supersedes } : {}),
    ...(record.expiresAt ? { expiresAt: record.expiresAt } : {}),
  };
}

function fromEntity(entity: MemoryEntity): MemoryRecord {
  return {
    id: entity.rowKey,
    userId: entity.partitionKey,
    kind: entity.kind as MemoryRecord['kind'],
    text: entity.text,
    source: entity.source,
    confidence: entity.confidence,
    importance: entity.importance,
    createdAt: entity.createdAt,
    lastUsedAt: entity.lastUsedAt,
    useCount: entity.useCount ?? 0,
    ...(entity.supersedes ? { supersedes: entity.supersedes } : {}),
    ...(entity.expiresAt ? { expiresAt: entity.expiresAt } : {}),
  };
}

export function createTableMemoryStore(client: TableClient): MemoryStore {
  return {
    async list(userId: string): Promise<MemoryRecord[]> {
      const records: MemoryRecord[] = [];
      const entities = client.listEntities<MemoryEntity>({
        queryOptions: { filter: odata`PartitionKey eq ${userId}` },
      });
      for await (const entity of entities) records.push(fromEntity(entity));
      return records;
    },

    async put(record: MemoryRecord): Promise<void> {
      await client.upsertEntity(toEntity(record), 'Replace');
    },

    async delete(userId: string, id: string): Promise<void> {
      try {
        await client.deleteEntity(userId, sanitizeKey(id));
      } catch (error: unknown) {
        // Deleting something already gone is the desired end state, not an error -
        // and a user-facing "forget this" must never fail on a double-click.
        if ((error as { statusCode?: number })?.statusCode !== 404) throw error;
      }
    },
  };
}

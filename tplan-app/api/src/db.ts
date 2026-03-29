import { TableClient } from '@azure/data-tables';

const connectionString = process.env.STORAGE_CONNECTION_STRING || '';

const clients = new Map<string, TableClient>();

export function getTable(name: string): TableClient {
  if (!clients.has(name)) {
    clients.set(name, TableClient.fromConnectionString(connectionString, name));
  }
  return clients.get(name)!;
}

export function getUserId(headers: Headers): string | null {
  const header = headers.get('x-ms-client-principal');
  if (!header) return null;
  try {
    const decoded = JSON.parse(Buffer.from(header, 'base64').toString('utf8'));
    return decoded.userId || null;
  } catch {
    return null;
  }
}

export function getUserEmail(headers: Headers): string | null {
  const header = headers.get('x-ms-client-principal');
  if (!header) return null;
  try {
    const decoded = JSON.parse(Buffer.from(header, 'base64').toString('utf8'));
    return decoded.userDetails || null;
  } catch {
    return null;
  }
}

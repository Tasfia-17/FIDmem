import { createClient, type Client } from "@libsql/client/web";
import type { Env, Memory } from "../types";

// Module-level singleton — persists across warm requests in the same Worker isolate
let _db: Client | null = null;

export function getDb(env: Env): Client {
  if (_db) return _db;
  _db = createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
  return _db;
}

export async function upsertMemory(
  db: Client,
  data: {
    owner_fid: number;
    agent_id: string;
    key: string;
    value: string;
    type?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await db.execute({
    sql: `INSERT INTO memories (owner_fid, agent_id, key, value, type, metadata)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(owner_fid, agent_id, key) DO UPDATE SET
            value      = excluded.value,
            type       = excluded.type,
            metadata   = excluded.metadata,
            updated_at = unixepoch()`,
    args: [
      data.owner_fid,
      data.agent_id,
      data.key,
      data.value,
      data.type ?? "preference",
      JSON.stringify(data.metadata ?? {}),
    ],
  });
}

export async function getMemories(
  db: Client,
  owner_fid: number,
  agent_id?: string
): Promise<Memory[]> {
  const result = agent_id
    ? await db.execute({
        sql: `SELECT * FROM memories WHERE owner_fid = ? AND agent_id = ? ORDER BY updated_at DESC`,
        args: [owner_fid, agent_id],
      })
    : await db.execute({
        sql: `SELECT * FROM memories WHERE owner_fid = ? ORDER BY updated_at DESC`,
        args: [owner_fid],
      });
  return result.rows.map(rowToMemory);
}

export async function getMemoryByKey(
  db: Client,
  owner_fid: number,
  agent_id: string,
  key: string
): Promise<Memory | null> {
  const result = await db.execute({
    sql: `SELECT * FROM memories WHERE owner_fid = ? AND agent_id = ? AND key = ?`,
    args: [owner_fid, agent_id, key],
  });
  return result.rows[0] ? rowToMemory(result.rows[0]) : null;
}

export async function deleteMemory(db: Client, owner_fid: number, id: string): Promise<void> {
  await db.execute({
    sql: `DELETE FROM memories WHERE id = ? AND owner_fid = ?`,
    args: [id, owner_fid],
  });
}

export async function getAgentAccess(
  db: Client,
  owner_fid: number,
  agent_id: string
): Promise<{ can_read: boolean; can_write: boolean } | null> {
  const result = await db.execute({
    sql: `SELECT can_read, can_write FROM agent_access WHERE owner_fid = ? AND agent_id = ?`,
    args: [owner_fid, agent_id],
  });
  if (!result.rows[0]) return null;
  return {
    can_read: Boolean(result.rows[0].can_read),
    can_write: Boolean(result.rows[0].can_write),
  };
}

export async function setAgentAccess(
  db: Client,
  owner_fid: number,
  agent_id: string,
  can_read: boolean,
  can_write: boolean
): Promise<void> {
  await db.execute({
    sql: `INSERT INTO agent_access (owner_fid, agent_id, can_read, can_write)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(owner_fid, agent_id) DO UPDATE SET
            can_read  = excluded.can_read,
            can_write = excluded.can_write`,
    args: [owner_fid, agent_id, can_read ? 1 : 0, can_write ? 1 : 0],
  });
}

export async function listAgentAccess(
  db: Client,
  owner_fid: number
): Promise<{ agent_id: string; can_read: boolean; can_write: boolean }[]> {
  const result = await db.execute({
    sql: `SELECT agent_id, can_read, can_write FROM agent_access WHERE owner_fid = ?`,
    args: [owner_fid],
  });
  return result.rows.map((r) => ({
    agent_id: r.agent_id as string,
    can_read: Boolean(r.can_read),
    can_write: Boolean(r.can_write),
  }));
}

function rowToMemory(r: Record<string, unknown>): Memory {
  return {
    id: r.id as string,
    owner_fid: r.owner_fid as number,
    agent_id: r.agent_id as string,
    key: r.key as string,
    value: r.value as string,
    type: r.type as string,
    metadata: JSON.parse((r.metadata as string) ?? "{}"),
    created_at: r.created_at as number,
    updated_at: r.updated_at as number,
  };
}

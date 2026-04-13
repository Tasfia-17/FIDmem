import { Hono } from "hono";
import type { Env } from "../types";
import { agentAuthMiddleware } from "../middleware/agent-auth";
import {
  getDb,
  upsertMemory,
  getMemories,
  getMemoryByKey,
  deleteMemory,
  setAgentAccess,
  listAgentAccess,
} from "../lib/db";

const memory = new Hono<{ Bindings: Env }>();

// GET /memory/:fid — list memories or exact key lookup
// x402 payment required ($0.001 USDC) — configured in main app
memory.get("/:fid", agentAuthMiddleware, async (c) => {
  const ownerFid: number = c.get("ownerFid");
  const agentId: string = c.get("agentId");
  const db = getDb(c.env);

  const key = c.req.query("key");

  if (key) {
    // Fast path: exact key lookup
    const mem = await getMemoryByKey(db, ownerFid, agentId, key);
    return c.json({ memory: mem ?? null });
  }

  // List all memories for this FID (optionally filtered by agent)
  const memories = await getMemories(
    db,
    ownerFid,
    agentId !== "self" ? agentId : undefined
  );
  return c.json({ memories });
});

// POST /memory/:fid — write a memory
// x402 payment required ($0.002 USDC) — configured in main app
memory.post("/:fid", agentAuthMiddleware, async (c) => {
  const ownerFid: number = c.get("ownerFid");
  const agentId: string = c.get("agentId");
  const db = getDb(c.env);

  const body = await c.req.json<{
    key: string;
    value: string;
    type?: string;
    metadata?: Record<string, unknown>;
  }>();

  if (!body.key || !body.value) {
    return c.json({ error: "key and value are required" }, 400);
  }

  await upsertMemory(db, {
    owner_fid: ownerFid,
    agent_id: agentId,
    key: body.key,
    value: body.value,
    type: body.type,
    metadata: body.metadata,
  });

  return c.json({ ok: true, key: body.key });
});

// DELETE /memory/:fid/:id — delete a specific memory
memory.delete("/:fid/:id", agentAuthMiddleware, async (c) => {
  const ownerFid: number = c.get("ownerFid");
  const id = c.req.param("id");
  const db = getDb(c.env);
  await deleteMemory(db, ownerFid, id);
  return c.json({ ok: true });
});

// GET /memory/:fid/access — list agent access grants (free, user-facing)
memory.get("/:fid/access", async (c) => {
  const ownerFid = parseInt(c.req.param("fid"), 10);
  const db = getDb(c.env);
  const access = await listAgentAccess(db, ownerFid);
  return c.json({ access });
});

// POST /memory/:fid/access — grant/revoke agent access (free, called by Snap)
memory.post("/:fid/access", async (c) => {
  const ownerFid = parseInt(c.req.param("fid"), 10);
  const body = await c.req.json<{
    agent_id: string;
    can_read: boolean;
    can_write: boolean;
  }>();

  if (!body.agent_id) return c.json({ error: "agent_id required" }, 400);

  const db = getDb(c.env);
  await setAgentAccess(db, ownerFid, body.agent_id, body.can_read, body.can_write);
  return c.json({ ok: true });
});

export default memory;

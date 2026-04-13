import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env, Variables } from "../types";
import { agentAuthMiddleware } from "../middleware/agent-auth";
import {
  getDb,
  upsertMemory,
  getMemories,
  getMemoryByKey,
  getMemoryByKeyAnyAgent,
  deleteMemory,
  setAgentAccess,
  listAgentAccess,
} from "../lib/db";

const memory = new Hono<{ Bindings: Env; Variables: Variables }>();

const writeSchema = z.object({
  key: z.string().min(1).max(64),
  value: z.string().min(1).max(1000),
  type: z.enum(["preference", "fact", "episode", "skill"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const accessSchema = z.object({
  agent_id: z.string().min(1),
  can_read: z.boolean(),
  can_write: z.boolean(),
});

// GET /memory/:fid — list memories or exact key lookup
// ?key=X          — lookup by key (scoped to calling agent)
// ?key=X&any=1    — lookup by key across ALL agents (cross-agent sharing)
memory.get("/:fid", agentAuthMiddleware, async (c) => {
  const ownerFid = c.get("ownerFid");
  const agentId = c.get("agentId");
  const db = getDb(c.env);
  const key = c.req.query("key");
  const any = c.req.query("any") === "1";

  if (key) {
    // Cross-agent read: return most recent value for this key across all agents
    if (any || agentId === "self") {
      const mem = await getMemoryByKeyAnyAgent(db, ownerFid, key);
      return c.json({ memory: mem ?? null });
    }
    const mem = await getMemoryByKey(db, ownerFid, agentId, key);
    return c.json({ memory: mem ?? null });
  }

  const memories = await getMemories(db, ownerFid, agentId !== "self" ? agentId : undefined);
  return c.json({ memories });
});

// POST /memory/:fid — write a memory
memory.post("/:fid", agentAuthMiddleware, zValidator("json", writeSchema), async (c) => {
  const ownerFid = c.get("ownerFid");
  const agentId = c.get("agentId");
  const body = c.req.valid("json");
  const db = getDb(c.env);

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

// DELETE /memory/:fid/:id
memory.delete("/:fid/:id", agentAuthMiddleware, async (c) => {
  const ownerFid = c.get("ownerFid");
  const id = c.req.param("id");
  if (!id) return c.json({ error: "id required" }, 400);
  await deleteMemory(getDb(c.env), ownerFid, id);
  return c.json({ ok: true });
});

// GET /memory/:fid/access — list agent access grants (free, no auth)
memory.get("/:fid/access", async (c) => {
  const ownerFid = parseInt(c.req.param("fid"), 10);
  const access = await listAgentAccess(getDb(c.env), ownerFid);
  return c.json({ access });
});

// POST /memory/:fid/access — grant/revoke agent access
// Requires x-agent-id: self (only the user via Snap can manage their own grants)
memory.post("/:fid/access", zValidator("json", accessSchema), async (c) => {
  const ownerFid = parseInt(c.req.param("fid"), 10);
  const agentId = c.req.header("x-agent-id");

  // Only the user themselves (via Snap, agentId="self") can manage access grants
  if (agentId !== "self") {
    return c.json({ error: "Only the account owner can manage agent access" }, 403);
  }

  const { agent_id, can_read, can_write } = c.req.valid("json");
  await setAgentAccess(getDb(c.env), ownerFid, agent_id, can_read, can_write);
  return c.json({ ok: true });
});

export default memory;

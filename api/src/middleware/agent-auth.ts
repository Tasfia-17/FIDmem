import type { Context, Next } from "hono";
import type { Env } from "../types";
import { getDb, getAgentAccess } from "../lib/db";
import { getUserByFid } from "../lib/neynar";
import { isRegisteredAgent } from "../lib/erc8004";

/**
 * Verifies the requesting agent has ERC-8004 identity and access to the FID's memories.
 *
 * Required headers:
 *   X-Agent-Id:  ERC-8004 agentId (uint256 as string), or "self" for user via Snap
 *   X-Agent-Fid: Farcaster FID of the agent
 */
export async function agentAuthMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next
) {
  const agentId = c.req.header("x-agent-id");
  const agentFidStr = c.req.header("x-agent-fid");
  const ownerFidStr = c.req.param("fid");

  if (!agentId || !agentFidStr || !ownerFidStr) {
    return c.json({ error: "Missing X-Agent-Id, X-Agent-Fid, or :fid param" }, 401);
  }

  const ownerFid = parseInt(ownerFidStr, 10);
  const agentFid = parseInt(agentFidStr, 10);

  if (isNaN(ownerFid) || isNaN(agentFid)) {
    return c.json({ error: "Invalid FID" }, 400);
  }

  // "self" = user accessing their own memories via Snap — skip ERC-8004 check
  if (agentId !== "self") {
    // 1. Verify agent FID exists on Farcaster
    const agentUser = await getUserByFid(agentFid, c.env);
    if (!agentUser) {
      return c.json({ error: "Agent FID not found on Farcaster" }, 403);
    }

    // 2. Verify agent has a registered ERC-8004 identity on Base
    const verified = await isRegisteredAgent(BigInt(agentId), agentUser.custody_address, c.env);
    if (!verified) {
      return c.json({ error: "Agent not registered on ERC-8004 Identity Registry" }, 403);
    }

    // 3. Check access permissions granted by the user
    const db = getDb(c.env);
    const access = await getAgentAccess(db, ownerFid, agentId);
    const isWrite = c.req.method === "POST" || c.req.method === "DELETE";

    if (!access) {
      return c.json({ error: "Agent has no access. User must grant access via FIDmem Snap." }, 403);
    }
    if (isWrite && !access.can_write) {
      return c.json({ error: "Agent does not have write access" }, 403);
    }
    if (!isWrite && !access.can_read) {
      return c.json({ error: "Agent does not have read access" }, 403);
    }
  }

  c.set("ownerFid", ownerFid);
  c.set("agentId", agentId);
  await next();
}

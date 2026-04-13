import type { Context, Next } from "hono";
import type { Env, Variables } from "../types";
import { getDb, getAgentAccess } from "../lib/db";
import { getUserByFid } from "../lib/neynar";
import { isRegisteredAgent } from "../lib/erc8004";

export async function agentAuthMiddleware(
  c: Context<{ Bindings: Env; Variables: Variables }>,
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

  // "self" = user via Snap — skip all agent checks
  if (agentId !== "self") {
    const isProd = c.env.ENVIRONMENT === "production";

    if (isProd) {
      // Validate agentId is a valid integer before BigInt conversion
      if (!/^\d+$/.test(agentId)) {
        return c.json({ error: "Agent ID must be a numeric ERC-8004 token ID" }, 400);
      }

      const agentUser = await getUserByFid(agentFid, c.env);
      if (!agentUser) {
        return c.json({ error: "Agent FID not found on Farcaster" }, 403);
      }

      const verified = await isRegisteredAgent(BigInt(agentId), agentUser.custody_address, c.env);
      if (!verified) {
        return c.json({ error: "Agent not registered on ERC-8004 Identity Registry" }, 403);
      }
    }

    // Access control always enforced (dev + prod)
    const db = getDb(c.env);
    const access = await getAgentAccess(db, ownerFid, agentId);
    const isWrite = c.req.method === "POST" || c.req.method === "DELETE";

    if (!access) {
      return c.json({ error: "Agent has no access. Grant access via FIDmem Snap." }, 403);
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

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import type { SnapHandlerResult } from "@farcaster/snap";
import {
  homePage,
  addPage,
  grantPage,
  messagePage,
  fetchMemories,
} from "./pages/home";

// Minimal local types to avoid zod v3/v4 peer dep mismatch
interface GetAction { type: "get" }
interface PostAction {
  type: "post";
  user: { fid: number };
  inputs: Record<string, string | number | boolean | string[]>;
}
type AnyAction = GetAction | PostAction;
interface SnapCtx { action: AnyAction; request: Request }

const API_BASE = process.env.FIDMEM_API_URL ?? "http://localhost:8787";

const app = new Hono();

function base(req: Request): string {
  const fromEnv = process.env.SNAP_PUBLIC_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    "localhost:3003";
  const proto = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? "http" : "https";
  return `${proto}://${host}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
registerSnapHandler(app, async (rawCtx: any): Promise<SnapHandlerResult> => {
  const ctx = rawCtx as SnapCtx;
  const url = new URL(ctx.request.url);
  const b = base(ctx.request);
  const path = url.pathname;

  // GET: render pages
  if (ctx.action.type === "get") {
    if (path === "/add") return addPage(b);
    if (path === "/grant") return grantPage(b);

    const fid = parseInt(url.searchParams.get("fid") ?? "0", 10);
    if (!fid) {
      return messagePage("FIDmem", "Open this snap from a Farcaster cast to load your memories.", b);
    }
    const { memories, agents } = await fetchMemories(fid);
    return homePage(memories, agents, b);
  }

  // POST: handle actions
  const post = ctx.action as PostAction;
  const fid = post.user.fid;
  const inputs = post.inputs ?? {};
  const actionParam = url.searchParams.get("action");

  if (actionParam === "add") {
    const key = String(inputs["key"] ?? "").trim();
    const value = String(inputs["value"] ?? "").trim();
    const type = String(inputs["type"] ?? "preference");

    if (!key || !value) return messagePage("Error", "Key and value are required.", b);

    const res = await fetch(`${API_BASE}/memory/${fid}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agent-id": "self",
        "x-agent-fid": String(fid),
      },
      body: JSON.stringify({ key, value, type }),
    });

    if (!res.ok) return messagePage("Error", "Failed to save memory.", b);
    const { memories, agents } = await fetchMemories(fid);
    return homePage(memories, agents, b);
  }

  if (actionParam === "delete") {
    const id = url.searchParams.get("id") ?? "";
    await fetch(`${API_BASE}/memory/${fid}/${id}`, {
      method: "DELETE",
      headers: { "x-agent-id": "self", "x-agent-fid": String(fid) },
    });
    const { memories, agents } = await fetchMemories(fid);
    return homePage(memories, agents, b);
  }

  if (actionParam === "grant") {
    const agent_id = String(inputs["agent_id"] ?? "").trim();
    const can_read = inputs["can_read"] !== "false";
    const can_write = inputs["can_write"] === "true";

    if (!agent_id) return messagePage("Error", "Agent ID is required.", b);

    await fetch(`${API_BASE}/memory/${fid}/access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent_id, can_read, can_write }),
    });

    return messagePage(
      "Done!",
      `Agent ${agent_id} now has ${can_read ? "read" : ""}${can_write ? " + write" : ""} access.`,
      b
    );
  }

  const { memories, agents } = await fetchMemories(fid);
  return homePage(memories, agents, b);
});

const port = parseInt(process.env.PORT ?? "3003", 10);
serve({ fetch: app.fetch, port }, () => {
  console.log(`FIDmem Snap running at http://localhost:${port}`);
});

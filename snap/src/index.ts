import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { registerSnapHandler } from "@farcaster/snap-hono";
import {
  homePage,
  addPage,
  grantPage,
  messagePage,
  fetchMemories,
} from "./pages/home";

const API_BASE = process.env.FIDMEM_API_URL ?? "http://localhost:8787";

const app = new Hono();

function base(req: Request): string {
  const fromEnv = process.env.SNAP_PUBLIC_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    "localhost:3003";
  const proto = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)
    ? "http"
    : "https";
  return `${proto}://${host}`;
}

registerSnapHandler(app, async (ctx) => {
  const url = new URL(ctx.request.url);
  const b = base(ctx.request);
  const path = url.pathname;

  // ── GET: render pages ──────────────────────────────────────────────────────
  if (ctx.action.type === "get") {
    if (path === "/add") return addPage(b);
    if (path === "/grant") return grantPage(b);

    // Default: home dashboard
    // In a real Snap, FID comes from the cast context.
    // For demo, we use a query param ?fid=X or fall back to 0.
    const fid = parseInt(url.searchParams.get("fid") ?? "0", 10);
    if (!fid) {
      return messagePage(
        "FIDmem",
        "Open this snap from a Farcaster cast to load your memories.",
        b
      );
    }
    const { memories, agents } = await fetchMemories(fid);
    return homePage(memories, agents, b);
  }

  // ── POST: handle actions ───────────────────────────────────────────────────
  const fid = ctx.action.user.fid; // verified by JFS
  const inputs = ctx.action.inputs ?? {};
  const action = url.searchParams.get("action");

  if (action === "add") {
    const key = (inputs["key"] as string)?.trim();
    const value = (inputs["value"] as string)?.trim();
    const type = (inputs["type"] as string) ?? "preference";

    if (!key || !value) {
      return messagePage("Error", "Key and value are required.", b);
    }

    const res = await fetch(`${API_BASE}/memory/${fid}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agent-id": "self",
        "x-agent-fid": String(fid),
      },
      body: JSON.stringify({ key, value, type }),
    });

    if (!res.ok) {
      return messagePage("Error", "Failed to save memory.", b);
    }

    const { memories, agents } = await fetchMemories(fid);
    return homePage(memories, agents, b);
  }

  if (action === "delete") {
    const id = url.searchParams.get("id") ?? "";
    await fetch(`${API_BASE}/memory/${fid}/${id}`, {
      method: "DELETE",
      headers: { "x-agent-id": "self", "x-agent-fid": String(fid) },
    });
    const { memories, agents } = await fetchMemories(fid);
    return homePage(memories, agents, b);
  }

  if (action === "grant") {
    const agent_id = (inputs["agent_id"] as string)?.trim();
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

  // Fallback: reload home
  const { memories, agents } = await fetchMemories(fid);
  return homePage(memories, agents, b);
});

const port = parseInt(process.env.PORT ?? "3003", 10);
serve({ fetch: app.fetch, port }, () => {
  console.log(`FIDmem Snap running at http://localhost:${port}`);
});

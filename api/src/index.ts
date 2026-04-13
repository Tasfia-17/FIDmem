import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { HTTPException } from "hono/http-exception";
import { paymentMiddleware } from "@x402/hono";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import type { RoutesConfig } from "@x402/core/server";
import type { Env, Variables } from "./types";
import memoryRoutes from "./routes/memory";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ── Global middleware ─────────────────────────────────────────────────────────
app.use("*", requestId());
app.use("*", logger());
app.use("*", cors());

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/", (c) =>
  c.json({
    name: "FIDmem",
    tagline: "Persistent memory for every Farcaster agent, keyed by FID",
    version: "1.0.0",
  })
);

// ── x402 payment middleware ───────────────────────────────────────────────────
// Agents auto-pay $0.001 USDC (read) or $0.002 USDC (write) on Base
// Skips payment for /access endpoints and "self" (user via Snap)
app.use("/memory/:fid", async (c, next) => {
  const path = c.req.path;
  const agentId = c.req.header("x-agent-id");

  if (path.endsWith("/access") || agentId === "self") {
    return next();
  }

  const payTo = c.env.PAYMENT_WALLET as `0x${string}`;
  const facilitatorUrl =
    c.env.ENVIRONMENT === "production"
      ? "https://api.cdp.coinbase.com/platform/v2/x402"
      : "https://x402.org/facilitator";

  const facilitator = new HTTPFacilitatorClient({ url: facilitatorUrl });
  const { x402ResourceServer } = await import("@x402/core/server");
  const server = new x402ResourceServer(facilitator).register(
    "eip155:*",
    new ExactEvmScheme()
  );

  const routes: RoutesConfig = {
    "GET /memory/:fid": {
      accepts: { scheme: "exact", payTo, price: "$0.001", network: "eip155:8453" },
      description: "Read agent memories for FID",
    },
    "POST /memory/:fid": {
      accepts: { scheme: "exact", payTo, price: "$0.002", network: "eip155:8453" },
      description: "Write agent memory for FID",
    },
  };

  return paymentMiddleware(routes, server)(c, next);
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.route("/memory", memoryRoutes);

// ── Error handling ────────────────────────────────────────────────────────────
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error("[unhandled error]", err);
  return c.json({ error: "Internal server error" }, 500);
});

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;

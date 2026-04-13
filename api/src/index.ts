import { Hono } from "hono";
import { cors } from "hono/cors";
import { paymentMiddleware, Resource } from "@x402/hono";
import type { Env } from "./types";
import memoryRoutes from "./routes/memory";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

// Health check — free, no payment
app.get("/", (c) =>
  c.json({
    name: "FIDmem",
    tagline: "Persistent memory for every Farcaster agent, keyed by FID",
    version: "1.0.0",
    docs: "https://github.com/your-handle/fidmem",
  })
);

// x402 payment middleware — agents auto-pay USDC on Base per API call
// GET /memory/:fid  → $0.001 per read
// POST /memory/:fid → $0.002 per write
app.use("/memory/:fid", async (c, next) => {
  // Skip payment for access control endpoints and "self" (user via Snap)
  const path = c.req.path;
  if (path.endsWith("/access") || c.req.header("x-agent-id") === "self") {
    return next();
  }

  const payTo = c.env.PAYMENT_WALLET as `0x${string}`;
  const facilitatorUrl =
    c.env.ENVIRONMENT === "production"
      ? "https://api.cdp.coinbase.com/platform/v2/x402"
      : "https://x402.org/facilitator";

  const middleware = paymentMiddleware(payTo, {
    "GET /memory/:fid": {
      price: "$0.001",
      network: "base",
      description: "Read agent memories for FID",
    } as Resource,
    "POST /memory/:fid": {
      price: "$0.002",
      network: "base",
      description: "Write agent memory for FID",
    } as Resource,
  }, { url: facilitatorUrl });

  return middleware(c, next);
});

app.route("/memory", memoryRoutes);

export default app;

/**
 * Agent Bob — News Agent Demo
 *
 * Reads memories written by Agent Alice — cross-agent memory sharing.
 * Uses ?any=1 query param to read across all agent namespaces (not just Bob's own).
 * Uses @x402/fetch to automatically pay for API calls in production.
 *
 * Usage:
 *   OWNER_FID=12345 AGENT_ID=2 AGENT_FID=88888 WALLET_PRIVATE_KEY=0x... pnpm start
 *
 * WALLET_PRIVATE_KEY is only required in production (when API enforces x402 payment).
 * The wallet must hold USDC on Base mainnet.
 */

import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";

const API_BASE = process.env.FIDMEM_API_URL ?? "http://localhost:8787";
const OWNER_FID = parseInt(process.env.OWNER_FID ?? "0", 10);
const AGENT_ID = process.env.AGENT_ID ?? "2";
const AGENT_FID = process.env.AGENT_FID ?? "88888";
const IS_PROD = process.env.ENVIRONMENT === "production";

// Set up x402-enabled fetch — auto-pays 402 responses with USDC on Base
const fetch402 = IS_PROD && process.env.WALLET_PRIVATE_KEY
  ? wrapFetchWithPaymentFromConfig(fetch, {
      schemes: [{
        network: "eip155:8453",
        client: new ExactEvmScheme(privateKeyToAccount(process.env.WALLET_PRIVATE_KEY as `0x${string}`)),
      }],
    })
  : fetch;

const headers = {
  "Content-Type": "application/json",
  "x-agent-id": AGENT_ID,
  "x-agent-fid": AGENT_FID,
};

// Read a key across ALL agents (cross-agent sharing via ?any=1)
async function readKey(key: string): Promise<string | null> {
  const res = await fetch402(
    `${API_BASE}/memory/${OWNER_FID}?key=${encodeURIComponent(key)}&any=1`,
    { headers }
  );
  const data = await res.json() as { memory: { value: string; agent_id: string } | null };
  const value = data.memory?.value ?? null;
  const from = data.memory?.agent_id ?? null;
  console.log(`  Read "${key}" -> ${value ? `"${value}" (from agent:${from})` : "not found"}`);
  return value;
}

async function write(key: string, value: string) {
  await fetch402(`${API_BASE}/memory/${OWNER_FID}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ key, value, type: "episode" }),
  });
}

async function main() {
  if (!OWNER_FID) { console.error("Set OWNER_FID env var"); process.exit(1); }
  if (IS_PROD && !process.env.WALLET_PRIVATE_KEY) {
    console.error("Set WALLET_PRIVATE_KEY env var for production (Base wallet with USDC)");
    process.exit(1);
  }

  console.log("\nAgent Bob (News Agent)");
  console.log(`First time meeting FID ${OWNER_FID}. Reading shared memory...\n`);

  const risk = await readKey("risk_tolerance");
  const chains = await readKey("preferred_chains");
  const tokens = await readKey("favorite_tokens");

  const headline = `Top ${risk ?? "medium"}-risk opportunities on ${chains ?? "Base"} for ${tokens ?? "ETH"} holders today`;

  console.log("\n--- Bob's personalized response (from shared memory) ---");
  console.log(`"${headline}"`);
  console.log("\nBob knew this without ever asking the user.");
  console.log("Alice stored it. Bob read it. That's FIDmem.\n");

  await write("last_content_shown", headline);
}

main().catch(console.error);

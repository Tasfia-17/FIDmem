/**
 * Agent Alice — Trading Agent Demo
 *
 * Writes user preferences to FIDmem.
 * Uses @x402/fetch to automatically pay for API calls in production.
 * In dev mode (ENVIRONMENT != production), x402 payment is skipped by the API.
 *
 * Usage:
 *   OWNER_FID=12345 AGENT_ID=1 AGENT_FID=99999 WALLET_PRIVATE_KEY=0x... pnpm start
 *
 * WALLET_PRIVATE_KEY is only required in production (when API enforces x402 payment).
 * The wallet must hold USDC on Base mainnet.
 */

import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";

const API_BASE = process.env.FIDMEM_API_URL ?? "http://localhost:8787";
const OWNER_FID = parseInt(process.env.OWNER_FID ?? "0", 10);
const AGENT_ID = process.env.AGENT_ID ?? "1";
const AGENT_FID = process.env.AGENT_FID ?? "99999";
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

async function write(key: string, value: string, type = "preference") {
  console.log(`  Writing: ${key} = "${value}"`);
  const res = await fetch402(`${API_BASE}/memory/${OWNER_FID}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ key, value, type }),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error(`Write failed: ${JSON.stringify(data)}`);
  console.log(`  Stored (${res.status})`);
}

async function main() {
  if (!OWNER_FID) { console.error("Set OWNER_FID env var"); process.exit(1); }
  if (IS_PROD && !process.env.WALLET_PRIVATE_KEY) {
    console.error("Set WALLET_PRIVATE_KEY env var for production (Base wallet with USDC)");
    process.exit(1);
  }

  console.log("\nAgent Alice (Trading Agent)");
  console.log(`Storing preferences for FID ${OWNER_FID}...\n`);

  await write("risk_tolerance", "medium");
  await write("preferred_chains", "Base, Ethereum");
  await write("favorite_tokens", "ETH, USDC, DEGEN");
  await write("max_trade_size_usd", "500");

  console.log("\nDone. Run Agent Bob to see cross-agent memory sharing.\n");
}

main().catch(console.error);

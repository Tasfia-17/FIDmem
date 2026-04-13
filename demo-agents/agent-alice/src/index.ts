/**
 * Agent Alice — Trading Agent Demo
 *
 * THE DEMO MOMENT:
 * Alice asks the user ONE question, stores the answer in FIDmem.
 * Agent Bob (different codebase, never spoke to this user) reads it and adapts.
 * The user never told Bob anything. Bob just knew.
 *
 * Usage:
 *   OWNER_FID=12345 AGENT_ID=1 AGENT_FID=99999 PRIVATE_KEY=0x... tsx src/index.ts
 */

import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const API_BASE = process.env.FIDMEM_API_URL ?? "http://localhost:8787";
const OWNER_FID = parseInt(process.env.OWNER_FID ?? "0", 10);
const AGENT_ID = process.env.AGENT_ID ?? "1";
const AGENT_FID = process.env.AGENT_FID ?? "99999";
const PRIVATE_KEY = (process.env.PRIVATE_KEY ?? "0x" + "a".repeat(64)) as `0x${string}`;

// x402: agent auto-pays USDC on Base for each API call
const signer = privateKeyToAccount(PRIVATE_KEY);
const client = new x402Client();
client.register("eip155:*", new ExactEvmScheme(signer));
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

const headers = {
  "Content-Type": "application/json",
  "x-agent-id": AGENT_ID,
  "x-agent-fid": AGENT_FID,
};

async function write(key: string, value: string, type = "preference") {
  console.log(`  📝 Writing: ${key} = "${value}"`);
  const res = await fetchWithPayment(`${API_BASE}/memory/${OWNER_FID}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ key, value, type }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Write failed: ${JSON.stringify(data)}`);
  console.log(`     ✓ Stored (paid $0.002 USDC via x402)`);
}

async function main() {
  if (!OWNER_FID) { console.error("Set OWNER_FID env var"); process.exit(1); }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🤖 Agent Alice (Trading Agent)");
  console.log(`   Storing preferences for FID ${OWNER_FID} in FIDmem...`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await write("risk_tolerance", "medium");
  await write("preferred_chains", "Base, Ethereum");
  await write("favorite_tokens", "ETH, USDC, DEGEN");
  await write("max_trade_size_usd", "500");

  console.log("\n✅ Alice stored 4 memories for this user.");
  console.log("   Now run Agent Bob — a completely different agent.");
  console.log("   Bob has never spoken to this user. Watch what happens.\n");
}

main().catch(console.error);

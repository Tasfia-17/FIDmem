/**
 * Agent Bob — News/Content Agent Demo
 *
 * THE DEMO MOMENT:
 * Bob has NEVER spoken to this user before.
 * Bob reads Alice's memories from FIDmem and adapts its response.
 * This is cross-agent memory sharing — the core value of FIDmem.
 *
 * Usage:
 *   OWNER_FID=12345 AGENT_ID=2 AGENT_FID=88888 PRIVATE_KEY=0x... tsx src/index.ts
 */

import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const API_BASE = process.env.FIDMEM_API_URL ?? "http://localhost:8787";
const OWNER_FID = parseInt(process.env.OWNER_FID ?? "0", 10);
const AGENT_ID = process.env.AGENT_ID ?? "2";
const AGENT_FID = process.env.AGENT_FID ?? "88888";
const PRIVATE_KEY = (process.env.PRIVATE_KEY ?? "0x" + "b".repeat(64)) as `0x${string}`;

const signer = privateKeyToAccount(PRIVATE_KEY);
const client = new x402Client();
client.register("eip155:*", new ExactEvmScheme(signer));
const fetchWithPayment = wrapFetchWithPayment(fetch, client);

const headers = {
  "Content-Type": "application/json",
  "x-agent-id": AGENT_ID,
  "x-agent-fid": AGENT_FID,
};

async function readKey(key: string): Promise<string | null> {
  const res = await fetchWithPayment(
    `${API_BASE}/memory/${OWNER_FID}?key=${encodeURIComponent(key)}`,
    { headers }
  );
  const data = (await res.json()) as { memory: { value: string } | null };
  const value = data.memory?.value ?? null;
  console.log(`  🔍 Read "${key}" → ${value ? `"${value}"` : "not found"} (paid $0.001 USDC via x402)`);
  return value;
}

async function write(key: string, value: string) {
  await fetchWithPayment(`${API_BASE}/memory/${OWNER_FID}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ key, value, type: "episode" }),
  });
  console.log(`  📝 Wrote "${key}" = "${value}"`);
}

async function main() {
  if (!OWNER_FID) { console.error("Set OWNER_FID env var"); process.exit(1); }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🤖 Agent Bob (News/Content Agent)");
  console.log(`   First time meeting FID ${OWNER_FID}.`);
  console.log("   Reading shared memory from FIDmem...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Bob reads what Alice stored — cross-agent memory sharing
  const risk = await readKey("risk_tolerance");
  const chains = await readKey("preferred_chains");
  const tokens = await readKey("favorite_tokens");

  // Bob adapts its response based on shared memory
  const riskLabel = risk ?? "medium";
  const chainLabel = chains ?? "Base";
  const tokenLabel = tokens ?? "ETH";

  const headline = `Top ${riskLabel}-risk opportunities on ${chainLabel} for ${tokenLabel} holders today`;

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📰 Bob's personalized response (based on shared memory):");
  console.log(`\n   "${headline}"\n`);
  console.log("   Bob knew this without ever asking the user.");
  console.log("   Alice stored it. Bob read it. That's FIDmem.");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Bob writes back what it showed the user (episode memory)
  await write("last_content_shown", headline);

  console.log("\n✅ Cross-agent memory demo complete.");
  console.log("   Open the FIDmem Snap in Farcaster to see all memories.");
  console.log("   You can delete entries and control which agents have access.\n");
}

main().catch(console.error);

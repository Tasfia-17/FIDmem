import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import type { Env } from "../types";

const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as const;

const ABI = [
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

export async function isRegisteredAgent(
  agentId: bigint,
  custodyAddress: string,
  env: Env
): Promise<boolean> {
  try {
    const client = createPublicClient({
      chain: base,
      transport: http(env.BASE_RPC_URL),
    });
    const owner = await client.readContract({
      address: IDENTITY_REGISTRY,
      abi: ABI,
      functionName: "ownerOf",
      args: [agentId],
    });
    return owner.toLowerCase() === custodyAddress.toLowerCase();
  } catch {
    return false;
  }
}

export interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  NEYNAR_API_KEY: string;
  BASE_RPC_URL: string;
  PAYMENT_WALLET: string;
  ENVIRONMENT: string;
}

// Typed Hono context variables — fixes c.get/c.set "never" errors
export interface Variables {
  ownerFid: number;
  agentId: string;
}

export interface Memory {
  id: string;
  owner_fid: number;
  agent_id: string;
  key: string;
  value: string;
  type: string;
  metadata: Record<string, unknown>;
  created_at: number;
  updated_at: number;
}

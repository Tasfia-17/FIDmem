import type { Env } from "../types";

export interface NeynarUser {
  fid: number;
  username: string;
  custody_address: string;
  score: number;
}

export async function getUserByFid(
  fid: number,
  env: Env
): Promise<NeynarUser | null> {
  const res = await fetch(
    `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
    { headers: { "x-api-key": env.NEYNAR_API_KEY } }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { users: NeynarUser[] };
  return data.users[0] ?? null;
}

-- FIDmem schema — run once against your Turso DB
-- Simplified for MVP: no embeddings, no TTL, clean and fast

CREATE TABLE IF NOT EXISTS memories (
  id         TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  owner_fid  INTEGER NOT NULL,          -- FID of the human user who owns this memory
  agent_id   TEXT    NOT NULL,          -- ERC-8004 agentId or "self" for user-written
  key        TEXT    NOT NULL,          -- e.g. "risk_tolerance", "preferred_chains"
  value      TEXT    NOT NULL,          -- the memory content
  type       TEXT    NOT NULL DEFAULT 'preference', -- preference | fact | episode | skill
  metadata   TEXT    NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(owner_fid, agent_id, key)
);

CREATE INDEX IF NOT EXISTS idx_mem_owner  ON memories(owner_fid);
CREATE INDEX IF NOT EXISTS idx_mem_agent  ON memories(owner_fid, agent_id);

-- Agent access control: which agents can read/write a user's memories
CREATE TABLE IF NOT EXISTS agent_access (
  owner_fid  INTEGER NOT NULL,
  agent_id   TEXT    NOT NULL,
  can_read   INTEGER NOT NULL DEFAULT 1,
  can_write  INTEGER NOT NULL DEFAULT 0,
  granted_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (owner_fid, agent_id)
);

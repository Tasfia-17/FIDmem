import type { SnapHandlerResult } from "@farcaster/snap";

const API_BASE = process.env.FIDMEM_API_URL ?? "http://localhost:8787";

type MemoryItem = { id: string; agent_id: string; key: string; value: string; type: string };
type AgentAccess = { agent_id: string; can_read: boolean; can_write: boolean };

// ── Home dashboard ────────────────────────────────────────────────────────────
export function homePage(
  memories: MemoryItem[],
  agents: AgentAccess[],
  base: string,
  fid: number
): SnapHandlerResult {
  const visible = memories.slice(0, 5);
  const memElements: Record<string, object> = {};
  const memIds: string[] = [];

  visible.forEach((m, i) => {
    const itemId = `mi-${i}`;
    const delId = `md-${i}`;
    memIds.push(itemId);
    memElements[itemId] = {
      type: "item",
      props: {
        title: m.key,
        description: `${m.value.slice(0, 80)} · ${m.agent_id === "self" ? "you" : `agent:${m.agent_id.slice(0, 6)}`}`,
      },
      children: [delId],
    };
    memElements[delId] = {
      type: "button",
      props: { label: "Delete", icon: "x", size: "sm" },
      on: {
        press: {
          action: "submit",
          params: { target: `${base}/?fid=${fid}&action=delete&id=${m.id}` },
        },
      },
    };
  });

  const agentElements: Record<string, object> = {};
  const agentIds: string[] = [];
  agents.slice(0, 3).forEach((a, i) => {
    const id = `ai-${i}`;
    agentIds.push(id);
    agentElements[id] = {
      type: "item",
      props: {
        title: `Agent ${a.agent_id.slice(0, 8)}`,
        description: `read:${a.can_read ? "yes" : "no"}  write:${a.can_write ? "yes" : "no"}`,
      },
    };
  });

  return {
    version: "2.0",
    theme: { accent: "purple" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: {},
          children: ["header", "mem-section", "sep", "agent-section", "add-btn", "grant-btn"],
        },
        header: {
          type: "item",
          props: {
            title: "FIDmem",
            description: `${memories.length} memories · ${agents.length} agents`,
          },
        },
        "mem-section": memIds.length > 0
          ? { type: "item_group", props: { title: "Your Memories", border: true, separator: true }, children: memIds }
          : { type: "text", props: { content: "No memories yet. Add one below.", size: "sm" } },
        sep: { type: "separator", props: {} },
        "agent-section": agentIds.length > 0
          ? { type: "item_group", props: { title: "Agent Access", border: true, separator: true }, children: agentIds }
          : { type: "text", props: { content: "No agents have access yet.", size: "sm" } },
        "add-btn": {
          type: "button",
          props: { label: "Add Memory", variant: "primary", icon: "plus" },
          on: { press: { action: "submit", params: { target: `${base}/add?fid=${fid}` } } },
        },
        "grant-btn": {
          type: "button",
          props: { label: "Grant Agent Access", icon: "user-plus" },
          on: { press: { action: "submit", params: { target: `${base}/grant?fid=${fid}` } } },
        },
        ...memElements,
        ...agentElements,
      },
    },
  };
}

// ── Add memory page ───────────────────────────────────────────────────────────
export function addPage(base: string, fid: number): SnapHandlerResult {
  return {
    version: "2.0",
    theme: { accent: "purple" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: {},
          children: ["title", "key-input", "value-input", "type-toggle", "save-btn", "back-btn"],
        },
        title: { type: "text", props: { content: "Add Memory", weight: "bold" } },
        "key-input": {
          type: "input",
          props: { name: "key", label: "Key", placeholder: "e.g. risk_tolerance", maxLength: 64 },
        },
        "value-input": {
          type: "input",
          props: { name: "value", label: "Value", placeholder: "e.g. medium", maxLength: 280 },
        },
        "type-toggle": {
          type: "toggle_group",
          props: {
            name: "type",
            label: "Type",
            // options must be string[] per Farcaster Snap spec v2.0
            options: ["preference", "fact", "skill"],
            defaultValue: "preference",
          },
        },
        "save-btn": {
          type: "button",
          props: { label: "Save", variant: "primary" },
          on: { press: { action: "submit", params: { target: `${base}/?fid=${fid}&action=add` } } },
        },
        "back-btn": {
          type: "button",
          props: { label: "Back" },
          on: { press: { action: "submit", params: { target: `${base}/?fid=${fid}` } } },
        },
      },
    },
  };
}

// ── Grant access page ─────────────────────────────────────────────────────────
export function grantPage(base: string, fid: number): SnapHandlerResult {
  return {
    version: "2.0",
    theme: { accent: "purple" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: {},
          children: ["title", "agent-input", "read-switch", "write-switch", "grant-btn", "back-btn"],
        },
        title: { type: "text", props: { content: "Grant Agent Access", weight: "bold" } },
        "agent-input": {
          type: "input",
          props: { name: "agent_id", label: "ERC-8004 Agent ID", placeholder: "e.g. 42", maxLength: 78 },
        },
        "read-switch": {
          type: "switch",
          props: { name: "can_read", label: "Allow reading memories", defaultChecked: true },
        },
        "write-switch": {
          type: "switch",
          props: { name: "can_write", label: "Allow writing memories", defaultChecked: false },
        },
        "grant-btn": {
          type: "button",
          props: { label: "Grant Access", variant: "primary" },
          on: { press: { action: "submit", params: { target: `${base}/?fid=${fid}&action=grant` } } },
        },
        "back-btn": {
          type: "button",
          props: { label: "Back" },
          on: { press: { action: "submit", params: { target: `${base}/?fid=${fid}` } } },
        },
      },
    },
  };
}

// ── Success / error page ──────────────────────────────────────────────────────
export function messagePage(title: string, message: string, base: string, fid: number): SnapHandlerResult {
  return {
    version: "2.0",
    theme: { accent: "purple" },
    ...(title === "Done!" ? { effects: ["confetti"] } : {}),
    ui: {
      root: "page",
      elements: {
        page: { type: "stack", props: {}, children: ["title", "msg", "back-btn"] },
        title: { type: "text", props: { content: title, weight: "bold" } },
        msg: { type: "text", props: { content: message } },
        "back-btn": {
          type: "button",
          props: { label: "Back to Dashboard", variant: "primary" },
          on: { press: { action: "submit", params: { target: `${base}/?fid=${fid}` } } },
        },
      },
    },
  };
}

// ── API helpers ───────────────────────────────────────────────────────────────
export async function fetchMemories(fid: number): Promise<{ memories: MemoryItem[]; agents: AgentAccess[] }> {
  const [accessRes, memRes] = await Promise.all([
    fetch(`${API_BASE}/memory/${fid}/access`),
    fetch(`${API_BASE}/memory/${fid}`, {
      headers: { "x-agent-id": "self", "x-agent-fid": String(fid) },
    }),
  ]);

  const { access } = accessRes.ok
    ? ((await accessRes.json()) as { access: AgentAccess[] })
    : { access: [] };

  const { memories } = memRes.ok
    ? ((await memRes.json()) as { memories: MemoryItem[] })
    : { memories: [] };

  return { memories, agents: access };
}

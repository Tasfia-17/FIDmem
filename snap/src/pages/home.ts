import type { SnapResponse } from "@farcaster/snap";

const API_BASE = process.env.FIDMEM_API_URL ?? "http://localhost:8787";

// ── Main dashboard page ──────────────────────────────────────────────────────
export function homePage(
  memories: Array<{ id: string; agent_id: string; key: string; value: string; type: string }>,
  agents: Array<{ agent_id: string; can_read: boolean; can_write: boolean }>,
  base: string
): SnapResponse {
  const visibleMems = memories.slice(0, 5);
  const memElements: Record<string, object> = {};
  const memIds: string[] = [];

  visibleMems.forEach((m, i) => {
    const itemId = `mi-${i}`;
    const delId = `md-${i}`;
    memIds.push(itemId);
    memElements[itemId] = {
      type: "item",
      props: {
        title: m.key,
        subtitle: m.value.slice(0, 80),
        label: m.agent_id === "self" ? "you" : `agent:${m.agent_id.slice(0, 6)}`,
      },
      children: [delId],
    };
    memElements[delId] = {
      type: "button",
      props: { label: "Delete", icon: "x", size: "sm" },
      on: {
        press: {
          action: "submit",
          params: { target: `${base}/?action=delete&id=${m.id}` },
        },
      },
    };
  });

  const visibleAgents = agents.slice(0, 3);
  const agentElements: Record<string, object> = {};
  const agentIds: string[] = [];

  visibleAgents.forEach((a, i) => {
    const itemId = `ai-${i}`;
    agentIds.push(itemId);
    agentElements[itemId] = {
      type: "item",
      props: {
        title: `Agent ${a.agent_id.slice(0, 8)}`,
        subtitle: `read:${a.can_read ? "✓" : "✗"}  write:${a.can_write ? "✓" : "✗"}`,
      },
    };
  });

  const hasMemories = memIds.length > 0;
  const hasAgents = agentIds.length > 0;

  return {
    version: "2.0",
    theme: { accent: "purple" },
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: {},
          children: ["header", "mem-section", "sep", "agent-section", "add-btn"],
        },
        header: {
          type: "item",
          props: {
            title: "FIDmem",
            subtitle: `${memories.length} memories · ${agents.length} agents`,
          },
        },
        "mem-section": hasMemories
          ? {
              type: "item_group",
              props: { title: "Your Memories", border: true, separator: true },
              children: memIds,
            }
          : {
              type: "text",
              props: { content: "No memories yet. Add one below.", size: "sm" },
            },
        sep: { type: "separator", props: {} },
        "agent-section": hasAgents
          ? {
              type: "item_group",
              props: { title: "Agent Access", border: true, separator: true },
              children: agentIds,
            }
          : {
              type: "text",
              props: { content: "No agents have access yet.", size: "sm" },
            },
        "add-btn": {
          type: "button",
          props: { label: "Add Memory", variant: "primary", icon: "plus" },
          on: {
            press: {
              action: "submit",
              params: { target: `${base}/add` },
            },
          },
        },
        ...memElements,
        ...agentElements,
      },
    },
  };
}

// ── Add memory page ──────────────────────────────────────────────────────────
export function addPage(base: string): SnapResponse {
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
        title: {
          type: "text",
          props: { content: "Add Memory", weight: "bold" },
        },
        "key-input": {
          type: "input",
          props: {
            name: "key",
            label: "Key",
            placeholder: "e.g. risk_tolerance, preferred_chains",
            maxLength: 64,
          },
        },
        "value-input": {
          type: "input",
          props: {
            name: "value",
            label: "Value",
            placeholder: "e.g. medium, Base and Ethereum",
            maxLength: 280,
          },
        },
        "type-toggle": {
          type: "toggle_group",
          props: {
            name: "type",
            label: "Type",
            options: [
              { label: "Fact", value: "fact" },
              { label: "Preference", value: "preference" },
              { label: "Skill", value: "skill" },
            ],
            defaultValue: "preference",
          },
        },
        "save-btn": {
          type: "button",
          props: { label: "Save", variant: "primary" },
          on: {
            press: {
              action: "submit",
              params: { target: `${base}/?action=add` },
            },
          },
        },
        "back-btn": {
          type: "button",
          props: { label: "Back" },
          on: {
            press: {
              action: "submit",
              params: { target: `${base}/` },
            },
          },
        },
      },
    },
  };
}

// ── Grant agent access page ──────────────────────────────────────────────────
export function grantPage(base: string): SnapResponse {
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
        title: {
          type: "text",
          props: { content: "Grant Agent Access", weight: "bold" },
        },
        "agent-input": {
          type: "input",
          props: {
            name: "agent_id",
            label: "ERC-8004 Agent ID",
            placeholder: "e.g. 42",
            maxLength: 78,
          },
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
          on: {
            press: {
              action: "submit",
              params: { target: `${base}/?action=grant` },
            },
          },
        },
        "back-btn": {
          type: "button",
          props: { label: "Back" },
          on: {
            press: {
              action: "submit",
              params: { target: `${base}/` },
            },
          },
        },
      },
    },
  };
}

// ── Success / error page ─────────────────────────────────────────────────────
export function messagePage(
  title: string,
  message: string,
  base: string
): SnapResponse {
  return {
    version: "2.0",
    effects: title === "Done!" ? ["confetti"] : [],
    ui: {
      root: "page",
      elements: {
        page: {
          type: "stack",
          props: {},
          children: ["title", "msg", "back-btn"],
        },
        title: { type: "text", props: { content: title, weight: "bold" } },
        msg: { type: "text", props: { content: message } },
        "back-btn": {
          type: "button",
          props: { label: "Back to Dashboard", variant: "primary" },
          on: {
            press: {
              action: "submit",
              params: { target: `${base}/` },
            },
          },
        },
      },
    },
  };
}

// ── API helpers ──────────────────────────────────────────────────────────────
export async function fetchMemories(fid: number) {
  const res = await fetch(`${API_BASE}/memory/${fid}/access`);
  if (!res.ok) return { memories: [], agents: [] };
  const { access } = (await res.json()) as {
    access: Array<{ agent_id: string; can_read: boolean; can_write: boolean }>;
  };

  // Fetch memories as "self" (no x402 payment for user's own access)
  const memRes = await fetch(`${API_BASE}/memory/${fid}`, {
    headers: {
      "x-agent-id": "self",
      "x-agent-fid": String(fid),
    },
  });
  const { memories } = memRes.ok
    ? ((await memRes.json()) as { memories: Array<{ id: string; agent_id: string; key: string; value: string; type: string }> })
    : { memories: [] };

  return { memories, agents: access };
}

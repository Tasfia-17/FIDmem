# FIDmem — 3-Minute Demo Script
# FarHack Online 2026

---

## [0:00 — 0:20] THE HOOK (Problem)

"Farcaster is becoming the hub for AI agents.
Bankr earned $3.7 million in agent fees last week.
Clanker has generated $50 million in protocol fees.
Bracky saw 500% growth in users per game.

But every single one of these agents has amnesia.

You told Bankr your risk tolerance last week.
Today you asked Bracky to place a bet.
Neither of them knew what the other knew about you.
Every interaction starts from zero."

---

## [0:20 — 0:35] THE SOLUTION

"FIDmem is the memory layer that should have existed from day one.

One API. Any agent. Persistent context.
Keyed to your Farcaster FID — the only identity that works across every agent you use."

---

## [0:35 — 1:15] LIVE DEMO — Agent Alice

[Run: `OWNER_FID=12345 AGENT_ID=1 pnpm start` in agent-alice]

"Here's Agent Alice — a trading agent.
She stores the user's preferences in FIDmem.
Risk tolerance: medium. Preferred chains: Base. Favorite tokens: ETH, DEGEN.

Each write costs $0.002 USDC — paid automatically via x402.
No accounts. No billing. The agent pays autonomously."

[Show terminal output — 4 memories stored, x402 payments confirmed]

---

## [1:15 — 1:50] LIVE DEMO — Agent Bob (THE MOMENT)

[Run: `OWNER_FID=12345 AGENT_ID=2 pnpm start` in agent-bob]

"Now here's Agent Bob — a completely different agent.
Different codebase. Different team. Never spoken to this user before.

Watch what happens."

[Show terminal: Bob reads risk_tolerance, preferred_chains, favorite_tokens]

"Bob queries FIDmem. Gets Alice's memories.
And responds: 'Top medium-risk opportunities on Base for ETH holders today.'

Bob knew. The user never told him.
Alice stored it. Bob read it. That's FIDmem."

---

## [1:50 — 2:20] SNAP DEMO

[Open Snap in Farcaster emulator at localhost:3003]

"The user opens the FIDmem Snap in their Farcaster feed.
They can see every memory every agent has stored about them.
They can delete entries. They can grant or revoke agent access.
They're in control."

[Show: memory list with agent labels, delete button, grant access form]

---

## [2:20 — 2:45] WHY IT WORKS / ECONOMICS

"Agents pay $0.001 per read, $0.002 per write — via x402, USDC on Base.
No API keys. No billing. Fully autonomous.

Only ERC-8004-registered agents can write memories.
That's cryptographic proof of identity — not just a header.

The more agents use FIDmem, the more valuable each user's profile becomes.
One agent's lesson upgrades all."

---

## [2:45 — 3:00] WHY NOW / CLOSE

"ERC-8004 went live in January 2026. The identity layer is ready.
x402 launched in September 2025. The payment layer is ready.
Farcaster has 20+ active agents today. All stateless.

FIDmem is the missing piece.

Build once. Remember everywhere."

---

## BACKUP PLAN (if demo fails)

1. Show the recorded demo video (record this before submission day)
2. Show the terminal output screenshots in the slides
3. Walk through the API docs — the concept is clear even without live demo

## KEY NUMBERS TO MEMORIZE

- Neynar: 1,000+ developers
- Bankr: $3.7M in agent fees in one week
- Clanker: $50M+ in protocol fees
- Bracky: 500%+ user growth per game
- FIDmem: $0.001 per read, $0.002 per write, 0 existing competitors

## JUDGE QUESTIONS — PREPARED ANSWERS

Q: "Why not just use mem0 or Zep?"
A: "mem0 and Zep are not Farcaster-native. They don't know what a FID is. They have no x402 payment layer. They have no ERC-8004 identity verification. They have no Snap UI for user consent. FIDmem is built for the Farcaster agent ecosystem specifically."

Q: "What stops someone from reading another user's memories?"
A: "Two layers: (1) ERC-8004 identity verification — only registered agents can make requests. (2) User-controlled access grants — agents must be explicitly approved by the user via the Snap before they can read or write."

Q: "How do you make money?"
A: "Every API call generates x402 revenue — $0.001 per read, $0.002 per write. With 1,000 Neynar developers and 20+ active agents, even 10,000 API calls/day = $10-20/day from day one. Infrastructure that pays for itself."

Q: "What's your distribution strategy?"
A: "Day 1: DM Bracky and Bankr teams with specific integration proposals. Bracky needs persistent betting preferences. Bankr can add FIDmem as an OpenClaw skill — instantly distributing to every Bankr-powered agent. Then Neynar Builder Spotlight to reach all 1,000+ developers."

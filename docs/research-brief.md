# Horizon OS — Deep Research Brief

Hand this to Claude Code (Opus 4.8) or Codex (xhigh) to research how to evolve Horizon from a
project-tracking loop into a true **financial OS that yields money**. The agent must read the repo
first and produce a decision doc — not rewrite anything.

## Context (where Horizon stands)

Local-first, money-focused operating loop. Sweeps `~/Desktop/bolting/*` for git changes → generates
revenue actions → enriches them into runnable specs (Gemini) → surfaces what's ready → operator
dispatches to Jules (plan-gated). React+Vite dashboard, Node API on `127.0.0.1:8787`, SQLite,
Obsidian vault for durable memory. Autonomous loop: `npm run horizon:watch`. Per-project screen:
`/project/:id` with live git status + controls.

**Competitor snapshot (already pulled):** OpenClaw = multi-agent orchestration via ACP protocol +
ClawHub skills marketplace (TS/Node). Hermes = SQLite-FTS5 learning-loop memory that models the user
across sessions. NanoClaw = stripped-down OpenClaw core. **None are money-focused** — that is our
wedge. There is **no dominant integrated "financial OS" for solo founders**; the market is fragmented
point tools (Taskade, Supabase, Lemon Squeezy, Cursor).

## The 5 questions to answer

1. **Build vs borrow (per component):** which parts of OpenClaw / Hermes / NanoClaw to copy vs build
   fresh — their multi-agent routing, memory model, skill system. Give GitHub URLs worth cloning into
   `~/Desktop/bolting/_external` for scanning.
2. **Money instrumentation:** minimal money layer — payment-provider webhook ingestion
   (Razorpay/Stripe/Lemon Squeezy/Paddle) → MRR/cash/runway → per-project ROI → a "money-relevance"
   score that ranks actions by expected revenue impact.
3. **Continuous tracking:** real-time vs polling (git hooks, file watchers, GitHub webhooks) and the
   cadence/signal model that updates project status without noise.
4. **Memory/learning:** should we add a Hermes-style FTS5 + summarization memory on top of the
   Obsidian vault so the loop learns the operator and improves action quality? Sketch schema +
   write/recall path.
5. **Distribution:** instrument the varbees build-in-public funnel (posts → signals → followers →
   leads) inside Horizon.

## Copy-paste prompt

```
You are doing deep strategic research for "Horizon OS", a local-first, money-focused operating
system for a solo, faceless founder (no calls, no jobs, two identities: varbees builder + Antharmaya
Labs). Read these first, in order, and treat them as ground truth:
- COMMAND_CENTER.md
- docs/operating-loop.md, docs/portfolio-monetization-map.md, docs/agent-prompts.md
- scripts/horizon-loop.mjs, scripts/git-detail.mjs, scripts/project-sweep.mjs

Goal: tell me how to evolve Horizon from a project-tracking loop into a true FINANCIAL OS that yields
money, grounded in what already exists. Do NOT rewrite anything; produce a decision doc.

Research and answer these 5 questions with specific, cited recommendations:
1. BUILD VS BORROW: For OpenClaw (ACP multi-agent orchestration + ClawHub skills), Hermes
   (SQLite-FTS5 learning-loop memory), and NanoClaw (minimal core) — for each, name the exact
   components worth copying into Horizon vs building fresh. If a repo is worth scanning, give the
   GitHub URL and I will clone it into ~/Desktop/bolting/_external for inspection.
2. MONEY INSTRUMENTATION: Design the minimal money layer — payment-provider webhook ingestion
   (Razorpay/Stripe/Lemon Squeezy/Paddle), MRR/cash/runway, per-project ROI, and a "money-relevance"
   score that ranks actions by expected revenue impact.
3. CONTINUOUS TRACKING: Recommend real-time-vs-polling (git hooks, file watchers, GitHub webhooks)
   and the cadence/signal model that updates project status without noise.
4. MEMORY/LEARNING: Should we add a Hermes-style FTS5 + summarization memory on top of the Obsidian
   vault so the loop learns the operator and improves action quality? Sketch the schema + write/recall.
5. DISTRIBUTION: How to instrument the varbees build-in-public funnel (posts -> signals -> followers
   -> leads) inside Horizon.

For each: current state in this repo, the gap, the recommended approach, effort (S/M/L), and the
single highest-leverage first slice. Rank all recommendations by money impact. End with a 1-page
"next 3 builds" plan. Cite sources for every external claim.
```

## Hand back to the builder

The decision doc's **"next 3 builds" ranking** + any **GitHub URLs to clone into `_external`**. The
builder resumes on the highest-money-impact slice first.

Research grounding already used:
- https://www.ycombinator.com/blog/ycs-essential-startup-advice
- https://stripe.com/guides/atlas/saas-pricing
- https://handbook.opencoreventures.com/open-core-business-model/
- https://www.bvp.com/assets/uploads/2026/02/The_AI_pricing_playbook_for_founders_Bessemer_Venture_Partners_2026.pdf
- https://thenewstack.io/persistent-ai-agents-compared/ (OpenClaw vs Hermes)

# Horizon OS — Deep Research Prompt (v4, enterprise-grade system design)

Paste the block below into a **fresh deep-research chat** in each tool (Claude Code, Perplexity,
Gemini, ChatGPT). It is self-contained. The goal is no longer "should I build this" — that decision
is made. The goal is a **buildable, end-to-end, enterprise-grade design for Horizon OS** as the durable
backbone of a solo founder's multi-year money journey.

---

```
ROLE
You are a principal systems architect and skeptical operating-partner. Design the end-to-end,
enterprise-grade architecture for a personal "money operating system" called Horizon OS, owned and run
by a single solo, faceless developer-founder. This is his backbone for the next 2+ years: a system that
continuously ingests his own work across his projects and helps him convert that work into income, with
him in control. It must be a true system that works end to end — not a pile of scripts, not a bloated
enterprise SaaS clone. Enterprise-grade means: durable, reliable, secure, observable, configurable, and
extensible by one person over years — at a solo operator's scale.

If you can read a local repository (e.g. you are a coding agent), read these first and ground every
claim in the real code, citing file paths: COMMAND_CENTER.md, docs/operating-loop.md,
docs/portfolio-monetization-map.md, docs/agent-prompts.md, scripts/horizon-loop.mjs,
scripts/project-sweep.mjs, scripts/git-detail.mjs, scripts/horizon-api.mjs, src/. If you are web-only,
use the ground truth below and do not assume capabilities that aren't described.

GROUND TRUTH — the founder and his real assets (he is starting at zero money, not at nothing)
- Solo, faceless developer-founder. No team, no sales calls, no jobs, no paid ads, low burn. 2+ year horizon.
- Real shipped infrastructure with real traffic (NOT pre-product): multiple live domains and products on
  Cloudflare (a flagship B2B SaaS with tens of thousands of monthly hits, plus several other live sites),
  deployed Workers/Pages, R2 storage, status pages, scoped API tokens.
- Pre-monetization: strong traffic and infra, but no paying customer yet, and a near-zero public audience.
- Two priority products: a live B2B SaaS (his revenue engine) and an open-core developer SDK (fast cash).
- Many additional repos/projects of varying value, already organized on disk.
- An existing, working version of Horizon OS he wants to evolve — local-first: a React+Vite dashboard, a
  Node API on 127.0.0.1, SQLite, an Obsidian vault for durable memory, and an hourly "loop" that:
  sweeps his git projects, ranks them by a money verdict, shows per-project git status, and queues tasks
  that can be enriched by an LLM and dispatched to coding agents (plan-gated).
- Known failure mode to design against: he is a builder, so he is tempted to keep polishing the tool
  instead of shipping product. The system must fight this, not feed it.

THE SYSTEM'S NORTH STAR (anchor every recommendation to this)
Horizon's one job: continuously turn the founder's own work into money, by (a) always knowing the true,
current state of everything he is building, and (b) routing his limited time and his AI agents to the
highest-money-leverage next move — with him steering. Today his work sources are hardcoded to one folder;
the system must become configurable (arbitrary project sources, identities, lanes, later money/providers)
without a rewrite.

THE BAR (what "enterprise-grade, end-to-end" means here — at solo scale)
- Durable: a stable data model and core that survive 2 years of monthly evolution without rewrites.
- Reliable: the loop never blocks, failures are isolated, remote/LLM/quota outages degrade gracefully.
- Secure: it will hold API keys and (later) payment/webhook secrets; local-first threat model; secrets
  never reach the browser; any borrowed code is read-and-audited, never blindly installed.
- Observable: heartbeats, logs, and status a solo operator can trust at a glance.
- Configurable & extensible: config-driven sources/identities/lanes; a minimal, safe extension/skill model
  so new capabilities slot in monthly without touching the core.
- Honest about sequencing: design the full architecture, but rank what to BUILD NOW vs GATE behind concrete
  triggers, so the system grows with real need and never becomes instrumentation for data that doesn't exist yet.

RIGOR RULES (this matters — five prior research runs failed here)
- Do not pad. A sharp, sequenced answer beats a long feature catalogue. Five earlier tools each produced
  near-identical money-dashboard / memory / funnel architectures for capabilities the founder has no data
  for yet; do not repeat that. Design those layers' INTERFACES so they slot in cleanly later, but do not
  build dashboards for revenue/audience/history that don't exist yet — gate them behind triggers instead.
- Rank everything by leverage toward the 2-year money goal. Separate "founder execution a tool can't do"
  from "what the system can genuinely accelerate," and say which proposed features are theater.
- Specify durable contracts concretely (the canonical data model, the action lifecycle, the source/ingestion
  interface, the agent-dispatch contract) — these are worth pinning down. Avoid speculative UI.
- Build-vs-borrow = read-for-patterns, audit-before-trust. Assume popular agent frameworks carry real CVEs
  and malicious community plugins; never propose importing a runtime/marketplace into a secrets-holding
  system. Cite sources for external claims.

DESIGN THE SYSTEM ACROSS THESE LAYERS (frame each as: current state → the gap → the durable design →
build-now vs gate-later → smallest first slice)
1. System thesis & scope: the durable core vs the evolving edge; what Horizon must be and must never become;
   how it stays sharp for 2 years and resists becoming procrastination.
2. Canonical data & state model: the schema for projects, work-events, actions, outcomes, identities, and
   (interface-only for now) money; how it migrates safely over years; local-first SQLite + the Obsidian vault.
3. Work-ingestion engine: make project sources CONFIGURABLE (arbitrary git repos, deploy/host signals,
   file watchers, manual entry) instead of one hardcoded folder; the signal model that updates status in
   near-real-time without noise; multi-machine reality.
4. Agentic execution layer: the action lifecycle (capture → enrich → plan-gate → dispatch → verify →
   record); how it safely drives multiple coding agents; the orchestration/owned-vs-borrowed boundary;
   sandboxing/least-privilege for agent-run code.
5. Money/outcome layer (INTERFACE NOW, DATA LATER): how the system will represent revenue, map it to
   projects, and rank work by money — designed so it activates the moment real revenue exists, without
   instrumenting emptiness today.
6. Memory/learning layer (GATED): how the system accumulates and recalls the founder's decisions and what
   has worked; markdown vault now; indexed/learned memory only past a concrete trigger.
7. Interface & operator UX: the command-center surface that makes the true state legible and lowers operator
   overhead; the per-project view; the "works with me" loop.
8. Configurability & extensibility: config-driven sources/identities/lanes/providers; a minimal, secure
   extension/skill model enabling safe monthly evolution without core rewrites.
9. Security & secrets: the local-first threat model; secret handling; audit posture for any external code.
10. Reliability & observability: heartbeats, failure isolation, graceful degradation, the trust surface.
11. Sequencing & roadmap: given his REAL situation (real traffic + infra, pre-revenue, deliberately building
    the backbone), the leverage-ranked order of what to build now, next, and gate — always tied to the
    2-year money goal.

REQUIRED DELIVERABLES (in this order)
A. One-paragraph system thesis: Horizon's single durable job and the line it must never cross.
B. The end-to-end architecture: the layers above as one coherent system, with the durable contracts
   (data model, action lifecycle, source-ingestion interface, agent-dispatch contract) specified concretely.
C. Durable core vs evolving edge: what is frozen-stable vs what is meant to change monthly.
D. Sequenced roadmap ranked by money leverage: build-now (next ~2–4 weeks), next, and explicitly deferred —
   each item with its smallest first slice.
E. Trigger table: each deferred capability → the concrete revenue/audience/usage threshold that unlocks it →
   its first slice when it unlocks.
F. Build-vs-borrow read-list: only audited patterns/sources worth studying, each with a one-line "why" and a
   security/maintenance caveat. Cite sources.
G. Risks & anti-patterns: the specific ways this system could rot, bloat, or become procrastination, and the
   tripwires that catch it early.

Be specific to THIS founder and THIS system. Where you must assume, state the assumption. Prefer durable
contracts and honest sequencing over breadth. End with the single highest-leverage thing to build first and why.
```

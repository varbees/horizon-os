# TrustClaw — verdict & bounded integration (FINAL)

Researched from the source repo + cost verification, 2026-06-06. Decision is closed.

## Verdict: B, but gated — operationally C this week

**Keep Horizon. Do not adopt TrustClaw, do not run both.** Borrow only the security *principle* now,
build nothing this week, **ship PhotoSelect.** Add **Composio** as a single plan-gated adapter behind
the executor registry the first time a queued action must touch an OAuth app you don't already hold a
key for — and only after PhotoSelect has its first paying studio. Sequence: **C now → B on trigger.**

Adopting the app (option A) is the documented failure mode at maximum: re-platforming a tool whose v2
shipped 24 hours ago, to ship zero product. The value is **Composio, not the Vercel app.**

## What TrustClaw actually is (verified from source)

`github.com/ComposioHQ/trustclaw` (MIT) — Composio's self-hostable assistant; OpenClaw rebuilt
security-first. Stack: TypeScript, **Next.js 15 + React 19, tRPC, Prisma + Postgres + pgvector, Redis,
Better Auth**; LLM via **Vercel AI Gateway** (no direct provider keys); tools via **Composio SDK** (1000+
OAuth apps); `ToolLoopAgent` with 3-layer context mgmt; **cloud-native, Vercel-deploy**, cron scheduler.
Security model: **"No raw API keys handed to the agent" / "No code runs on your machine" / "No
long-lived shell access"** — execution in Composio's remote sandboxes. Hosted signups CLOSED.
It is NOT a laptop daemon and never touches your machine — the "autonomous laptop cofounder" never existed.

## Why (money-ranked, verified facts)

1. **~70% duplicate of Horizon; the 30% runs the wrong way.** Same shape (assistant+memory+tools+cron),
   but Horizon has what TrustClaw structurally can't: local git sweep of your repos, money-leverage
   ranking of *your* portfolio, the WIP tripwire tuned to *your* failure mode. Running both = two
   drifting memories + two surfaces = attention tax for one person. TrustClaw is strictly better at
   exactly one thing: brokered OAuth to 1000+ apps with no raw keys — and that thing is Composio.
2. **The Composio cut = ~90% value at ~10% cost.** Composio standalone (SDK/CLI/MCP, already in env):
   free 20K tool calls/mo, $29/mo for 200K. Wire it as one adapter behind the registry you already built.
   The Vercel app adds a chat UI (you have a dashboard), pgvector memory (you have Obsidian + work_events),
   cron (you have a loop) — none beat what you have pre-revenue.
3. **TCO/lock-in: TrustClaw costs a rewrite + a permanent 2nd system; Horizon+Composio costs $0 now.**
   "Real 24/7" needs Vercel Pro ($20/seat/mo for sub-daily cron; Hobby = once/day) + separate Postgres +
   tokens, plus migration off local-first and welding your money-OS to Vercel + AI Gateway + their cron.
   AI Gateway is pay-as-you-go (no markup) but lateral — you already call Gemini free + direct.
4. **Security: adopt the principle, keep the ceiling.** Routing a call through Composio's OAuth broker
   lets you *remove* a raw key from `.env` (compounds the redaction work). But "no raw keys" shrinks blast
   radius; it does NOT make unsupervised action safe. **Plan-gating stays; every Composio tool stays
   human-confirmed; never auto-approve** (MCP tool-poisoning / prompt-injection risk class).
5. **24/7 host — the one good idea, with a wrinkle.** Core ingestion is a LOCAL git sweep; Cloudflare
   Workers / Vercel functions have **no filesystem** (free Workers also cap 10ms CPU) — they cannot see
   your repos. So cron can only move *remote* tasks (Jules poll/reconcile, signal refresh), never the
   sweep. Honest design = split: sweep stays on laptop; a tiny cron polls Jules. Host = **Cloudflare
   (free: 5 cron triggers, 100K req/day, 1-min interval) — NOT Vercel Pro.** Building now = instrumenting
   emptiness; a laptop-open loop is sufficient at zero customers.
6. **Sequencing: nothing here beats the first paying studio.** "Pivot" is the tell — it's a re-platform
   of a 24-hour-old tool. Skip the app, ship PhotoSelect.

## Deferred → trigger → smallest first slice

| Deferred | Trigger | Smallest first slice |
|---|---|---|
| Composio adapter (the B move) | First queued action whose done_criteria needs an OAuth app you don't hold a key for (Gmail/Notion/Calendar/WhatsApp/social) **AND** PhotoSelect has ≥1 paying studio | One Composio tool behind the executor registry, plan-gated, reusing the Jules outbox shape (dispatch→store ref→poll/confirm→work_event). No new UI beyond the trust strip. |
| Off-laptop 24/7 | A genuinely time-critical event exists (paying customer webhook, or a Jules job that must reconcile within minutes while asleep) | One free Cloudflare Worker cron polling open Jules dispatches → pokes the local reconcile endpoint. Sweep stays local. |
| pgvector / learned memory | work_events volume makes manual recall slow | Embed work_events + vault; semantic search endpoint. |

## The tripwire that matters
If a "migrate to TrustClaw" or "build 24/7 host" action is opened while PhotoSelect actions sit in the
queue, **the WIP tripwire should fire — let it.** One money-OS, one memory; Composio is a tool *inside*
it, never a second brain. See [[trustclaw-is-composio-adapter]], [[executor-adapter-registry]],
[[horizon-now-photoselect-next]].

## Highest-leverage thing to build first
**Nothing in Horizon — ship PhotoSelect's first paying studio.** The only TrustClaw-adjacent move worth
anything is tiny and deferred: next time you add any tool needing a key, route it through Composio so you
*drop* a raw key instead of adding one — a one-adapter change made when a real action demands it.

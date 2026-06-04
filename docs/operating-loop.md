# Horizon Operating Loop

`scripts/horizon-loop.mjs` is Horizon's single autonomous orchestrator — the thing that
makes the separate capabilities behave like one owned agent loop ("openclaw/hermes, but
managed by me"). It chains the pieces that already existed into one quota-safe cycle and
emits a heartbeat the dashboard reads.

## One cycle

1. **sweep** — `runProjectSweep`: scan `~/Desktop/bolting/*` for new commits / dirty repos.
2. **generate** — `generateRevenueActions` (rule-based, always works, reuses the sweep).
3. **enrich** — `autoEnrich` via Gemini: rough actions → runnable specs. Quota-safe: stops
   cleanly on a 429 (`stoppedForQuota: true`); skipped entirely if no `GEMINI_API_KEY`.
4. **ready** — count enriched actions awaiting the operator's reviewed dispatch.

It **never throws** (each stage isolated) and **never blocks on a remote model** — enrichment
is optional polish; the rule-based generator keeps the queue moving offline or out of quota.

## What the loop deliberately does NOT do

It does **not** auto-dispatch to Jules. Jules changes real repositories, so dispatch stays
**operator-triggered and plan-gated** (`requirePlanApproval: true`) — the "managed by me"
line. The loop only reports how many enriched actions are *ready*; you review and send them
via the action drawer's **Send to Jules** button (see `docs/gemini-jules-setup.md`).

## Run it

- `npm run horizon` — run one cycle now.
- `npm run horizon:watch` — daemon; runs every `HORIZON_LOOP_INTERVAL_MINUTES` (default 60).
- `POST /api/loop/run` `{ "enrichLimit": 6 }` — trigger a cycle from the UI / a scheduler.
- `GET /api/loop/status` — latest heartbeat for the dashboard.

## Heartbeat

- `.horizon/loop-status.json` — the full latest cycle (stages, errors, ok, timestamps).
- `.horizon/loop-log.tsv` — one row per cycle: `started_at, projects, dirty, generated,
  enriched, ready, ok, notes`.

## Keys

Both live server-side in `.env`, loaded by `scripts/env.mjs`, never shipped to the browser:
`GEMINI_API_KEY` (enrichment), `JULES_API_KEY` (operator dispatch). A 429 means the
integration is correct but quota is spent — it clears on reset.

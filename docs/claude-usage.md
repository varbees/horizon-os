# Claude Usage Panel (v1.1)

The Command Center shows a Claude usage panel (the reel's most prominent widget), read locally from
your `~/.claude` session logs via `ccusage`. No account login or external API.

## What it shows

- **Today** and **This week** token totals with cost.
- **Cache hit %** (today and week) — cache-read tokens over total context tokens.
- **Lifetime cost** and total tokens.
- **Last 7 days** token bar chart.
- **Model mix (7d)** — share per model (Opus, Sonnet, and any other agents ccusage detects).

## How it works

`scripts/usage.mjs` spawns `npx ccusage daily --json`, parses the `daily[]` + `totals`, and computes
a compact summary, cached in memory for 5 minutes (the spawn takes a few seconds). The API exposes:

- `GET /api/usage` — cached summary.
- `GET /api/usage?refresh=1` — force a fresh ccusage run.

If ccusage is missing or errors, the endpoint returns `{ available: false }` and the panel shows a
graceful message instead of breaking.

Frontend: `src/components/UsagePanel.jsx`, mounted on `/command` between the scorecard and the action
queue. Refresh button re-runs ccusage.

## Notes

- ccusage reads all detected agent CLIs (Claude Code, and others like Codex/OpenClaw if present), so
  the model mix can include non-Claude agents. That is intentional: it reflects total agent spend.
- First call after a cold start downloads ccusage via npx; subsequent calls use the npx cache.

## Exit gate

- `npm run build` passes.
- With `npm run dev:full` running, `/command` shows real token, cost, and cache-hit figures.

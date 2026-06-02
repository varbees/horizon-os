# Horizon Command Center Plan (10x)

Expansion of Horizon OS into a full-width, tightly-integrated, actionable operator command center.
Reference: the Obsidian + Claude command-center reel (`handroai__2026-05-26`, analysed frame by frame)
and the OpenClaw layout. The goal is a single source of truth that is controllable: from Horizon you
can deploy Codex/Claude tasks into any `~/Desktop/bolting/*` project and watch usage, signals, and
intelligence in one place.

## Reference teardown (from the reel)

Layout: one full-width dashboard embedded in Obsidian, live Claude Code terminal in the right split.

- **Operator hero**: cinematic wide banner, identity line (`handro - operator`), live clock, status
  line `N skills armed - N active engagements - N suggestions in queue`.
- **Tabs**: Command Center | News & Signals | Intelligence, plus a global cmd-K vault/skills/clients search.
- **Command Center tab**: Claude Usage (today / session / week tokens, cache-hit %, list-price $,
  7-day bars, model-mix donut, when-you-work histogram, lifetime), Scorecard (active threads, open
  tasks, decisions), and an **Action Queue** of suggestions each with an OPEN/execute button.
- **News & Signals tab**: RSS feed (~48 sources), category chips with counts, Grid/List/Saved +
  24H/Week/All filters, article and video cards.
- **Intelligence tab**: filter across Gmail / Slack / Meetings; Timeline with counts, Gmail
  Highlights, Slack Activity, Meeting Extractions (Fireflies transcripts).

## Feasibility in this environment

| Feature | Local now | Mechanism |
| --- | --- | --- |
| Full-width shell + operator hero + status line | Yes | Tailwind layout on existing tokens |
| Action Queue (deploy agent tasks to any project) | Yes | `action_queue` table + horizon-api; deploy writes a prompt file + command_log |
| News & Signals (RSS) | Yes | server-side RSS fetch endpoint in horizon-api (avoids browser CORS) |
| Intelligence: Gmail, Calendar, Drive | Agent-fed | MCP tools exist for an agent, not the React app; an agent run writes to `intelligence_items`, the dashboard reads it |
| Intelligence: Slack, Fireflies, ClickUp | Gated | no tooling present; needs the operator's connectors |
| Claude Usage | Gated | needs a reader for local `~/.claude` usage logs (ccusage-style) |

## Agent-fed integration pattern

The React dashboard is local-first and cannot call MCP servers directly. The durable pattern:

1. An agent (Claude Code / Codex) runs a connector tool (Gmail, Calendar, ...).
2. The agent POSTs normalized rows to a Horizon API table (`intelligence_items`, `signals`, ...).
3. The dashboard reads and displays them, and can queue follow-up actions.

This keeps Horizon controllable and offline-capable while still surfacing live external context when an
agent run refreshes it.

## Action Queue = the actionable core

Each queue item: title, summary, source, target project (`~/Desktop/bolting/*`), agent
(`claude` | `codex`), a ready-to-run prompt, status (`suggested -> queued -> deployed -> done -> dismissed`),
and impact. "Deploy" writes the prompt to a per-project file and logs the intent so the operator (or an
agent) can execute it in that project. This is how Horizon deploys work into any project.

## Version slices

| Version | Slice | Gate |
| --- | --- | --- |
| v0.7 | Full-width OpenClaw-inspired shell + operator hero/status banner | none |
| v0.8 | Action Queue (DB-backed, deploy-to-project) + Scorecard on the Command home | none |
| v0.9 | News & Signals (RSS fetch endpoint, sources, category counts, filters) | source list |
| v1.0 | Intelligence (agent-fed Gmail/Calendar/meetings into `intelligence_items`) | connector auth |
| v1.1 | Claude Usage panel (local usage reader) | usage-data source |

## Open decisions (operator input)

1. Obsidian vault path (the command center should read/write the vault).
2. Integration priority order after the local core.
3. Claude-usage data source (ccusage / `~/.claude` logs / skip).
4. Agent-deploy mechanism (prompt file in project + manual run, vs. direct shell-out).

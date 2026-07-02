# Horizon OS — Content & Wealth Engine Architecture

register: architecture

The contract for turning one real build-log artifact into premium, faceless distribution for two
engines, with native agents and connected tools doing the work, and the autonomous loop running the
free lanes on their own. Manual gates protect cost and credibility.

## 1. Purpose

Horizon OS is the operator's control surface. The content engine makes it a **wealth engine**: it
manufactures distribution without the founder becoming a talking head, and it does so by wiring
Claude Code, Codex, and MCP tools *into* the engine (no external API keys for the agents — they run
on the operator's own subscription auth, "like openclaw/hermes, managed by me").

## 2. Two engines, never crossed channels

| Engine | Audience | Channels | Voice | Proof |
| --- | --- | --- | --- | --- |
| **Antharmaya Labs** | developers | X, Reddit, HN, DEV.to, GitHub | developer-proof, evidence-heavy, faceless | the code + the docs |
| **PhotoSelect** | Indian wedding/event studios | Instagram, WhatsApp, FB groups, YouTube | premium, outcome-heavy, faceless | a delivered gallery + a clock ("Shot Sunday. Delivered Monday.") |

`content_briefs.engine` carries this; every lane prompt and the connector-action surfaces respect it.

## 3. The integration hub (`/connectors`)

Three kinds in one `connectors` registry table:

- **Local agents** (native executors, no external API key): `claude-code` (`claude -p`), `codex`
  (`codex exec`), `jules` (REST, `JULES_API_KEY`). Health-checked via the local CLI / `julesAvailable()`.
- **MCP servers** (OAuth HTTP, tokens under `.horizon/mcp/`): `huggingface` (FLUX stills),
  `higgsfield` (cinematic video), `google-calendar` / `gmail` / `google-drive`.
- **Skills**: the engine's own prompt library, surfaced as the lanes that drive the agents.

Sessions revive from stored tokens on API boot (`reconnectStored`), so the autonomous loop can call
connected tools after a restart without a manual re-connect.

## 4. Native executor model

`scripts/executors/*` — a registry with `dispatch/poll/reconcile` and a capability
`{mode, planGated, repoWrite}`. `mode: "local"` covers Claude Code + Codex, spawned through
`_run.mjs` (prompt over stdin, hard timeout, graceful `cli_not_found`/`timeout`). Model split:
**Claude Fable / Claude Code** runs reasoning lanes (research, narrative, asset-spec, editorial);
**Codex** runs implementation/mechanical glue.

## 5. The pipeline

`Research → (Brief) → Asset plan → Generate → Assemble → QA → Publish`, with `content_briefs.status`
walking `draft → researched → asset_planned → packaged → review → published`.

- **research** — Claude Code reads the repo + artifact, returns a fact-checked JSON dossier (claims
  classified `verified | unverified | likely_marketing | not_buildable`, honest hooks, `do_not_build`,
  channel recommendations). Separates signal from theater.
- **asset plan / generate** — `asset-spec` prompt → planned `content_assets`; generation fires the
  connected MCP tool (`POST /api/content/assets/:id/generate` → `callTool(connector, tool, input)`),
  HuggingFace FLUX for stills, Higgsfield for video. **Spends provider credits → manual.**
- **assemble** — `editorial` prompt → a `content_packages` row (blog, X thread, LinkedIn, IG caption,
  reel script, alt text, CTA, checklist), grounded only in the dossier.
- **publish** — manual only; sets status + a `pipeline_runs` audit row; **no auto-posting, ever.**

## 6. Autonomous loop (runs on its own)

`scripts/horizon-loop.mjs` cycle: sweep → generate → enrich → ready → reconcile → wiki → **content**.
The content stage (`scripts/content-loop.mjs`, `runContentStage`) advances **opt-in** briefs
(`automate = 1`) through the **free, reversible** lanes only — research → editorial package — bounded
by `auto_max_status` (default `packaged`). It never spends credits and never publishes. Quota-safe:
one cheap Claude Code health gate per cycle, one lane per brief per cycle, never throws.

Triggers: the watch loop (`npm run horizon:watch`), or on demand `POST /api/loop/content`. Opt a
brief in with `POST /api/content/briefs/:id/automate {automate:true}`.

## 7. Connected tools in the right places

`src/data/connectorActions.js` maps each connected tool onto the surface where it belongs:
content (HF/Higgsfield/Drive), signals (Gmail/Drive/Calendar), command (Jules/Drive/Gmail). The
`ConnectorActionStrip` renders them; the pipeline calls them server-side via the MCP client.

## 8. Data model (migrations v4–v6)

`connectors`, `content_briefs` (+ `automate`, `auto_max_status`, `auto_last_run_at`),
`content_assets`, `content_packages`, `pipeline_runs`. Migration discipline: append-only, never edit
a shipped migration; v5 reclassified Jules from a bogus MCP URL to a native agent; v6 added the
automation flags.

## 9. Guardrails / non-goals

No scheduler. No auto-publish. No auto repo-dispatch (Jules stays operator-triggered + plan-gated).
No founder face. No TRIBE v2 dependency (story angle only). No external API key for Claude Code/Codex.
Provider keys server-side only (`scripts/env.mjs`); never shipped to the browser.

## 10. Build lane split

**Claude lane (engine internals):** migrations, executor adapters, prompt library
(`prompts/*.md` + `content-prompts.mjs`), the autonomous loop, MCP reconnect. **Codex lane
(surface + forward/mechanical):** `src/lib/*`, `src/routes/{Connectors,Content}.jsx`, the connector
proxy + forward content endpoints, connector-action UI, tests. Handoffs live in `docs/agent-tasks/`.

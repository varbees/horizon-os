# Horizon OS Command Center

A local-first, agentic command center for your whole workspace: point it at a folder of repos and it becomes a control plane where you **deploy, watch, stop, and grade an AI agent workforce** across every project. Built by Antharmaya Labs; MIT-licensed.

**[github.com/varbees/horizon-os](https://github.com/varbees/horizon-os)**

Reference deployment: the Antharmaya foundry (PhotoSelect as the primary revenue engine, varbees open-core as the fast-cash lane, Obsidian as execution memory) — but the app runs over **any** workspace.

## Load your workspace (open source)

Nothing is hardwired to one machine. Set your workspace root and Horizon sweeps it into the Hub, and the doc reader + file-open follow the same root.

- In-app: **Workspace** (System nav) → paste an absolute path (or `~/…`) → **Load & sweep**.
- Or config: `.horizon/sources.json` `roots[]`, or the `HORIZON_PROJECT_SWEEP_ROOTS` env var.

Path access is confined server-side to your workspace (plus Horizon's own repo) — nothing outside it is readable or openable.

### Control the agent workforce
- **Deploy** any card (Inbox / Capital / Docs / Hub / Signals / Content) to a chosen agent + model — Claude Code, Codex, Jules, or an API provider (DeepSeek/Gemini/NIM) — via the action deployer.
- **Agents** screen: live telemetry of every run (state, derived spec, cost) with a streaming **live console** (watch output, stop). Local runners execute on your own CLI auth — no keys leave the machine.
- Bring your own models under **Connectors** → keys are stored in a git-ignored local `.env`.

The seed data under `src/data/` is the reference (Antharmaya) portfolio — replace it, or just load your own workspace and let the sweep populate the Hub.

## Run

```bash
npm install
npm run db:init
npm run projects:sweep
npm run dev:full
```

`npm run dev:full` starts the local SQLite API on `127.0.0.1:8791` and the Vite app on `127.0.0.1:5177`.
`npm run projects:sweep` builds the local project index at `/home/driftr/Desktop/bolting/_horizon_project_index`.

Frontend only:

```bash
npm run dev
```

Database setup/check:

```bash
npm run db:init
npm run projects:sweep
npm run projects:sweep:watch
```

Compound wiki memory:

```bash
npm run wiki:sync
npm run wiki:status
npm run wiki:search -- money action memory
npm run wiki:ingest -- /absolute/path/to/source.md
npm run wiki:coverage
npm run wiki:capture -- "What changed?" "Answer worth filing into the wiki."
npm run wiki:lint
npm run wiki:contradiction -- c-1234567890 resolved "Resolution note."
```

## Build

```bash
npm run build
```

## Main Screens

- `/` - control tower and daily anchors + **AI Job Plan "today" tracker**: current day, tasks with checkboxes, streak counter
- `/command` - command center: operator hero, live status, and the deployable Action Queue. Deploys carry **graph-as-context** (Graphify knowledge graph injected into every agent dispatch) + **_cofounder profile** for goal-aligned execution
- `/calendar` - recurring Foundry Week calendar matrix
- `/projects` - portfolio hub for `~/Desktop/bolting/*` with project sweep, categorization, and impact radius
- `/journey` - Obsidian-grade trek ledger with GPS, elevation, and branching alleys/valleys
- `/capital` - Capital & Runway OS: targets, cash ledger, offer pipeline, and weekly income math
- `/inbox` - Resource & Content Inbox: link capture, content backlog, and the social skills catalog
- `/signals` - News & Signals: local RSS feed with category counts, filters, and prunable sources
- `/connectors` - MCP Connectors: connect to MCP servers with browser OAuth, list and call tools
- `/vault` - **Obsidian vault bridge** connected to `~/Desktop/bolting/`: two-way sync (read/write), codebase brain detection (Graphify outputs), compound wiki memory with search/ingest/capture/lint, `.canvas` file support, "Open in Obsidian" launcher
- `/map` - fluid command graph (React Flow: animated revenue path, minimap, dagre auto-layout, click-to-center) + AI Job Plan routine rail with DeepSeek daily brief
- `/documents` - **workspace-wide doc reader**: folder-grouped sidebar, full-screen markdown rendering, "God Nodes" panel (most-depended-on files via Graphify), file reveal in system explorer

## Canonical Docs

- `docs/horizon-workspace-alpha.md` — v1–v5 slice roadmap (command graph → agent console → steering → codebase atlas → onboarding)
- `docs/horizon-production-contract.md` — production-grade gap audit + release ladder (v0.9 → v1.0)
- `docs/horizon-build-plan.md` (master vertical-slice execution contract)
- `docs/context-architecture.md` — graph-as-context, opensrc dependency graphs, _cofounder profile injection
- `docs/command-center-plan.md` (10x command center: reel teardown + slice plan)
- `docs/revenue-engine-reset.md` (money-first operating model and agent roles)
- `docs/project-sweep-os.md` (local project inventory and hourly sweep loop)
- `docs/agent-api-research-notes.md` (Jules, Gemini, ADK, and Claude hook notes)
- `PRODUCT.md` / `DESIGN.md` (impeccable design context)
- `docs/source-inputs/income_plan.md`
- `docs/source-inputs/twelve_month_plan.md`
- `docs/capital-runway-os.md`
- `docs/resource-content-inbox.md`
- `docs/infrastructure.md`
- `docs/horizon-operating-plan.md`
- `docs/portfolio-command-map.md`
- `docs/hskg-launch-brief.md`
- `docs/component-forge-offer.md`
- `docs/calendar-connector-architecture.md`
- `docs/horizon-design-tokens.md`
- `docs/local-command-base.md`
- `docs/vertical-ai-course.md`
- `docs/plantsage-progress-ledger.md`
- `docs/founder-playbook-research.md`
- `docs/horizon-version-roadmap.md`
- `docs/journey-log-system.md`
- `docs/capital-goals-2027.md`
- `docs/horizon-compound-wiki.md`
- `docs/horizon-living-memory-backlog.md`

## Calendar

Import `public/horizon-calendar.ics` into Google Calendar to create the first recurring Foundry Week blocks.

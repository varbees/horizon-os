# Horizon OS Command Center

Local revenue command center for the Antharmaya foundry: PhotoSelect as the primary revenue engine, varbees open-core products as the fast-cash lane, Horizon/Obsidian as the execution memory, and body/attention/spec as the backbone.

## Run

```bash
npm install
npm run db:init
npm run projects:sweep
npm run dev:full
```

`npm run dev:full` starts the local SQLite API on `127.0.0.1:8787` and the Vite app on `127.0.0.1:5177`.
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
```

## Build

```bash
npm run build
```

## Main Screens

- `/` - control tower and daily anchors
- `/command` - command center: operator hero, live status, and the deployable Action Queue
- `/calendar` - recurring Foundry Week calendar matrix
- `/projects` - portfolio hub for `~/Desktop/bolting/*`
- `/journey` - Obsidian-grade trek ledger with GPS, elevation, and branching alleys/valleys
- `/capital` - Capital & Runway OS: targets, cash ledger, offer pipeline, and weekly income math
- `/inbox` - Resource & Content Inbox: link capture, content backlog, and the social skills catalog
- `/signals` - News & Signals: local RSS feed with category counts, filters, and prunable sources
- `/connectors` - MCP Connectors: connect to MCP servers with browser OAuth, list and call tools
- `/vault` - Obsidian vault bridge plus compound wiki memory: snapshots, schema, hot cache, graph pages, and wiki search
- `/map` - node-editor command graph backed by local SQLite API
- `/documents` - docs and connector artifacts

## Canonical Docs

- `docs/horizon-build-plan.md` (master vertical-slice execution contract)
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

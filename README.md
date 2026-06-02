# Horizon OS Command Center

Local command center for the Antharmaya foundry plan: service engine, current PhotoSelect + PlantSage work, HSKG as a closed proof, and the body/attention/spec backbone.

## Run

```bash
npm install
npm run dev:full
```

`npm run dev:full` starts the local SQLite API on `127.0.0.1:8787` and the Vite app on `127.0.0.1:5177`.

Frontend only:

```bash
npm run dev
```

Database setup/check:

```bash
npm run db:init
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
- `/map` - node-editor command graph backed by local SQLite API
- `/documents` - docs and connector artifacts
- `/hskg` - closure note for the parked `hskg.vercel.app` proof

## Canonical Docs

- `docs/horizon-build-plan.md` (master vertical-slice execution contract)
- `docs/command-center-plan.md` (10x command center: reel teardown + slice plan)
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

## Calendar

Import `public/horizon-calendar.ics` into Google Calendar to create the first recurring Foundry Week blocks.

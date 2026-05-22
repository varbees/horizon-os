# Horizon OS Command Center

Local command center for the Antharmaya foundry plan: service engine, PhotoSelect, HSKG, Component Forge, and the body/attention/spec backbone.

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
- `/calendar` - recurring Foundry Week calendar matrix
- `/projects` - portfolio hub for `~/Desktop/bolting/*`
- `/map` - node-editor command graph backed by local SQLite API
- `/documents` - docs and connector artifacts
- `/hskg` - launch brief for `hskg.vercel.app`

## Canonical Docs

- `docs/horizon-operating-plan.md`
- `docs/portfolio-command-map.md`
- `docs/hskg-launch-brief.md`
- `docs/component-forge-offer.md`
- `docs/calendar-connector-architecture.md`
- `docs/local-command-base.md`
- `docs/vertical-ai-course.md`

## Calendar

Import `public/horizon-calendar.ics` into Google Calendar to create the first recurring Foundry Week blocks.

# Local Command Base

## Purpose

Horizon OS needs a durable local brain, not only React state. The first local command base is a SQLite sidecar API that stores mission context, graph nodes, graph edges, calendar events, tasks, decisions, vector placeholders, and command logs.

## Why Sidecar SQLite

- Browser UI stays fast at `localhost:5177`.
- SQLite file stays private under `.horizon/horizon.sqlite`.
- Vite proxies `/api` to `127.0.0.1:8787`.
- No extra npm dependency is required for the first version because Node 22 includes experimental `node:sqlite`.

## Commands

```bash
npm run db:init
npm run api
npm run dev:full
```

## Schema

See `db/schema.sql`.

Main tables:

- `contexts`
- `graph_nodes`
- `graph_edges`
- `calendar_events`
- `tasks`
- `decisions`
- `vectors`
- `context_fts`
- `command_log`

## API

- `GET /api/health`
- `GET /api/command-base`
- `PATCH /api/nodes/:id`
- `POST /api/tasks`
- `POST /api/context`
- `GET /api/search?q=photoselect`

## Vector Path

The current schema includes a portable `vectors` table so the command base can store embedding metadata immediately. Next step is loading `sqlite-vec` or another SQLite vector extension so similarity search happens inside the same local file instead of through a separate vector server.

The app also creates `context_fts` now, using SQLite FTS5 for immediate local search. Real vector search should use `db/sqlite-vec-next.sql` after `sqlite-vec` is installed and loaded.

## Next

- Add `sqlite-vec` extension loading and KNN search tables.
- Add task creation from selected calendar/node context.
- Add command logs for accepted agent actions.
- Keep write actions confirmation-gated.

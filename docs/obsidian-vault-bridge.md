# Obsidian Vault Bridge

The `/vault` screen makes Horizon and your Obsidian vault one source of truth. Horizon mirrors its
state into the vault as Markdown and can read any vault note back.

The bridge now has two layers:

- `Horizon/` snapshots: direct mirrors of command center, capital, journey, and saved signals.
- Compound wiki: `.raw/`, `wiki/`, `WIKI.md`, `AGENTS.md`, index, hot cache, log, pages, links, chunks, and graph health.

## Vault location

`scripts/vault.mjs` resolves the vault in this order:

1. `HORIZON_VAULT_PATH` env var, if set.
2. `vault/horizon/` inside the repo (the vault you created in Obsidian).
3. `vault/` inside the repo.

The vault is gitignored, so your notes and the generated snapshots are never committed.

## What sync writes

`POST /api/vault/sync` reads the live SQLite tables and writes Markdown into a `Horizon/` folder inside
the vault (your own notes stay untouched):

- `Horizon/Command Center.md` - operator status + the action queue as a checklist.
- `Horizon/Capital.md` - runway, capital targets table, offer pipeline.
- `Horizon/Journey.md` - the trek ledger with coordinates and branch legs indented.
- `Horizon/Signals - Saved.md` - your saved signals as links.

Each note carries YAML frontmatter (`title`, `source: horizon-os`, `synced`, `tags: horizon/...`) so
Obsidian can group and query them.

The same sync also compiles the compound wiki:

- `WIKI.md` - vault schema and maintenance rules for any LLM.
- `AGENTS.md` - agent instructions for editing the vault.
- `.raw/horizon-intelligence/*.md` - immutable reference-source notes.
- `wiki/hot.md` - current context before any agent acts.
- `wiki/index.md` - content map for generated pages.
- `wiki/log.md` - chronological wiki maintenance log.
- `wiki/domains/*` - live money lanes, action memory, dispatch memory, and work-event ledger.
- `wiki/entities/*` and `wiki/concepts/*` - graph nodes for projects, tools, and memory architecture.

## API

- `GET /api/vault` - vault path, existence, note count, recent notes.
- `POST /api/vault/sync` - regenerate the Horizon snapshots and compound wiki.
- `GET /api/vault/note?path=` - read a note (path confined to the vault).
- `POST /api/vault/note` - write a note (path confined to the vault).
- `GET /api/wiki` - compound wiki status, latest sync, graph health, and retrieval ladder.
- `POST /api/wiki/sync` - compile the compound wiki without regenerating the `Horizon/` snapshots.
- `GET /api/wiki/search?q=` - search generated wiki pages.
- `POST /api/wiki/ingest` - compile a local source file into `.raw/horizon-ingest/` and `wiki/sources/`.
- `POST /api/wiki/coverage` - run the curated high-signal source coverage pack and write `wiki/meta/Source Coverage Report.md`.
- `POST /api/wiki/capture` - file a useful question and answer under `wiki/questions/`.
- `POST /api/wiki/lint` - write `wiki/meta/Wiki Repair Plan.md` and return machine-readable repair actions.

Path traversal is blocked: every path resolves inside the vault root or is rejected.

## Using it

1. Open `/vault`, click **Sync to Obsidian**.
2. Open the vault in Obsidian; the `Horizon/` folder holds snapshots and `wiki/` holds generated synthesis.
3. Browse any vault note from the Horizon UI; click a note to read it.
4. Search the compound wiki from `/vault` to inspect what Horizon remembers.
5. Paste a local Markdown/text source path into **Ingest source** when you want Horizon to compile a new piece of evidence.
6. Click **Run Coverage** when you want Horizon to refresh the curated high-signal source pack.
7. Use **Capture answer** to save a useful answer back into `wiki/questions/` with related memory links.
8. Click **Lint Wiki** to generate the current repair plan for broken links, orphans, source/entity gaps, and contradictions.

A scheduled auto-sync and writing edits back from Horizon into arbitrary notes are natural follow-ups.
The autonomous loop already refreshes the compound wiki after each cycle.

## Exit gate

- `npm run build` passes.
- With `npm run dev:full` running, Sync writes the `Horizon/` snapshots plus the `wiki/` graph and they open in Obsidian.

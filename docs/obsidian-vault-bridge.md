# Obsidian Vault Bridge

The `/vault` screen makes Horizon and your Obsidian vault one source of truth. Horizon mirrors its
state into the vault as Markdown and can read any vault note back.

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

## API

- `GET /api/vault` - vault path, existence, note count, recent notes.
- `POST /api/vault/sync` - regenerate the Horizon snapshots.
- `GET /api/vault/note?path=` - read a note (path confined to the vault).
- `POST /api/vault/note` - write a note (path confined to the vault).

Path traversal is blocked: every path resolves inside the vault root or is rejected.

## Using it

1. Open `/vault`, click **Sync to Obsidian**.
2. Open the vault in Obsidian; the `Horizon/` folder now holds the snapshots, refreshed on each sync.
3. Browse any vault note from the Horizon UI; click a note to read it.

A scheduled auto-sync and writing edits back from Horizon into arbitrary notes are natural follow-ups.

## Exit gate

- `npm run build` passes.
- With `npm run dev:full` running, Sync writes the `Horizon/` snapshots and they open in Obsidian.

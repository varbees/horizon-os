# Horizon Compound Wiki

Horizon now has a local-first compounding memory layer modeled on the LLM Wiki pattern:

- `.raw/` holds immutable source material.
- `wiki/` holds generated synthesis owned by agents.
- `WIKI.md` and `AGENTS.md` tell any LLM how to maintain the vault.
- SQLite tracks sources, pages, links, chunks, and sync runs.

This is not a second dashboard. It is the memory substrate behind Horizon's action loop. The goal is that Codex, Claude, Gemini, Jules handoffs, or any local agent can read the same durable context before acting.

Deploy and Jules dispatch now call the same preflight builder before generating a runnable action spec. The spec remains redacted by `redactForSpec()` after the memory packet is appended.

## What Was Borrowed

From Karpathy's LLM Wiki pattern:

- Raw sources are separate from generated synthesis.
- The wiki is updated incrementally instead of rediscovered from scratch per question.
- Good answers and contradictions should be filed back into the wiki.

From `~/Desktop/bolting/_external/claude-obsidian`:

- Vault contract: `.raw/`, `wiki/`, `WIKI.md`, `wiki/index.md`, `wiki/log.md`, `wiki/hot.md`.
- Workflows: ingest, query, lint.
- Obsidian-first conventions: wikilinks, short pages, graph visibility.
- Future retrieval direction: markdown chunks, BM25, optional semantic rerank, lock discipline.

From `~/Desktop/bolting/_external/turbovec`:

- Future local vector adapter candidate.
- Stable IDs via `IdMapIndex` fit `wiki_chunks.id`.
- The current slice does not import turbovec into the Node daemon; it uses contextual `wiki_chunks` plus BM25-lite scoring and keeps vector search behind a future adapter.

From `~/Desktop/bolting/_external/ccode/claude-code-main`:

- The missed pattern is not the terminal UI; it is context introspection before tool loops.
- Horizon now has a context-budget estimator for preflight packets, similar in spirit to ccode's `/context` command: show category/token pressure before sending work to an agent.
- The command/tool boundary reinforces that intelligence belongs in scripts/modules first, with UI consuming read-only summaries.

From `~/Desktop/bolting/_external/openclaw/openclaw`:

- The missed patterns are doctor checks, queue discipline, retry/failover policy, session pruning, and durable memory flushes before compaction.
- Horizon has now adopted the first slice: `horizonDoctor(db)` and `/api/doctor` report loop, wiki, retrieval, source registry, dispatch outbox, and self-WIP health.
- Queue/retry/failover should be added only if real external dispatch collisions or provider failures appear.

From `~/Desktop/bolting/_external/threedotslabs/wild-workouts-go-ddd-example`:

- Keep business/domain logic separate from transport and UI.
- Horizon's intelligence modules should stay in scripts with pure/read-only contracts where possible; React should render them, not own them.

## Runtime Behavior

`scripts/wiki.mjs` owns the compound wiki:

- `syncHorizonWiki(db)` writes schema, raw source notes, generated pages, index, hot cache, log, and dashboard.
- `ingestWikiSource(db, { sourcePath })` copies a local source into `.raw/horizon-ingest/`, creates a linked `wiki/sources/*` synthesis page, updates `wiki/index.md`, `wiki/hot.md`, `wiki/log.md`, and records a manifest entry so unchanged sources are skipped.
- `runWikiSourceCoverage(db)` ingests or skips the curated high-signal source list and writes `wiki/meta/Source Coverage Report.md`.
- `captureWikiAnswer(db, { question, answer, links })` saves useful answers under `wiki/questions/` and updates index, hot cache, log, and chunks.
- `runWikiLint(db)` writes `wiki/meta/Wiki Repair Plan.md` and returns a machine-readable repair plan.
- `updateContradictionStatus(db, { id, status, note })` marks contradiction rows open, resolved, or superseded without deleting evidence.
- `queryWiki(db, { question, mode, captureGap })` builds quick, standard, or deep context packets and can persist insufficient-memory gaps to `wiki/meta/gaps.md`.
- `buildPreflightContext(db, action)` and `formatPreflightContext(packet)` attach wiki hot/index/search hits, action row, dispatch history, and trust state to deployed specs.
- `summarizeContextBudget(packet)` estimates preflight context size by category and records top contributors/recommendations before dispatch.
- `horizonDoctor(db)` returns a read-only operator health contract for loop, wiki graph, retrieval, source registry, outbox, and Horizon-self WIP.
- `wikiStatus(db)` reports source/page/chunk counts, latest sync, graph health, and retrieval ladder state.
- `searchWiki(db, query)` searches contextual `wiki_chunks` with BM25-lite scoring and returns note paths that can be opened in Horizon.
- `lintWiki(db)` reports missing wikilinks, missing files, orphans, source/entity gaps, unresolved contradictions, frontmatter gaps, empty sections, and repair actions.

The autonomous loop calls `syncHorizonWiki(db)` after sweep, generate, enrich, readiness, and dispatch reconciliation. That means every loop cycle compiles live state into the vault.

## Generated Pages

The base sync writes:

- `WIKI.md`
- `AGENTS.md`
- `.raw/horizon-intelligence/*.md`
- `wiki/overview.md`
- `wiki/hot.md`
- `wiki/index.md`
- `wiki/log.md`
- `wiki/meta/dashboard.md`
- `wiki/meta/Living Memory Backlog.md`
- `wiki/sources/*`
- `wiki/concepts/*`
- `wiki/entities/*`
- `wiki/domains/*`

The live operating pages are:

- `wiki/domains/Money Lanes.md`
- `wiki/domains/Action Memory.md`
- `wiki/domains/Dispatch Memory.md`
- `wiki/domains/Work Event Ledger.md`
- `wiki/domains/Outcome Learning.md`
- `wiki/entities/PhotoSelect.md`
- `wiki/entities/rateguard.md`

These pages intentionally serve the money OS: action quality, buyer evidence, dispatch state, outcomes, and project-lane decisions.

## API

- `GET /api/wiki` returns wiki status and graph health.
- `POST /api/wiki/sync` compiles the wiki immediately.
- `GET /api/wiki/search?q=...` searches generated wiki pages.
- `POST /api/wiki/query` builds a quick, standard, or deep query packet and can capture explicit gaps.
- `POST /api/wiki/ingest` compiles a local source file into raw evidence plus generated wiki synthesis.
- `POST /api/wiki/coverage` runs the curated source coverage pack.
- `POST /api/wiki/capture` files a question and answer back into `wiki/questions/`.
- `POST /api/wiki/lint` writes the current repair plan and returns machine-readable fixes.
- `GET /api/doctor` returns the read-only Horizon doctor summary.
- `POST /api/context-budget` estimates a supplied preflight/context packet.
- `POST /api/vault/sync` now writes both the old `Horizon/` snapshots and the compound wiki.

## CLI

```bash
npm run horizon:doctor
npm run context:budget < packet.json
npm run wiki:status
npm run wiki:sync
npm run wiki:search -- turbovec local vector
npm run wiki:query -- --mode=deep --capture-gap "What does Horizon know about this?"
npm run wiki:ingest -- /absolute/path/to/source.md
npm run wiki:coverage
npm run wiki:capture -- "What should Horizon remember?" "The answer to preserve."
npm run wiki:lint
npm run wiki:contradiction -- c-1234567890 resolved "Resolution note"
```

## Readiness Bar

This slice is ready when:

- Migrations create the wiki tables idempotently.
- Sync creates the schema, raw-source, hot-cache, index, log, source, concept, entity, and domain pages.
- Ingest copies a local file into `.raw/horizon-ingest/`, creates a source page with inferred wikilinks, logs the run, skips unchanged sources, and surfaces contradiction markers.
- Coverage ingests or skips registered high-signal sources and writes `wiki/meta/Source Coverage Report.md`.
- Query capture writes useful answers under `wiki/questions/` with related memory links and searchable chunks.
- Lint writes `wiki/meta/Wiki Repair Plan.md` and returns machine-readable repair actions.
- Deploy/Jules specs include the memory preflight packet after redaction.
- Sync writes `wiki/domains/Outcome Learning.md` from closed actions, outcomes, and work events.
- Contradictions carry stable IDs and status values: open, resolved, or superseded.
- Retrieval uses contextual chunk prefixes and BM25-lite scoring before any vector adapter.
- Preflight specs include context budget state, top contributors, and a concrete trimming recommendation.
- Doctor returns loop/wiki/retrieval/source/outbox/self-WIP health from one read-only contract.
- Lint flags frontmatter gaps and empty sections.
- Query modes build quick/standard/deep packets and persist explicit gaps when Horizon lacks enough durable memory.
- Search retrieves the generated pages.
- The loop compiles wiki state automatically.
- Obsidian can render the graph from wikilinks.

Future slices should add source ingestion from selected project docs, richer contradiction tracking, and a turbovec adapter only after the generated wiki/chunk volume justifies semantic retrieval.

The canonical task list for those slices is `docs/horizon-living-memory-backlog.md`, mirrored into the generated wiki as `wiki/meta/Living Memory Backlog.md`.

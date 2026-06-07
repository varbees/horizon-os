# Horizon Living Memory Backlog

This is the remaining task list for the Horizon OS living-memory conversation.

The goal is not a prettier notes dashboard. The goal is a local agent memory architecture where Horizon compiles sources, decisions, actions, dispatches, outcomes, and useful answers into a persistent wiki that makes the next agent run smarter.

## Shipped

1. **Compound wiki base**
   - SQLite tables: `wiki_sources`, `wiki_pages`, `wiki_links`, `wiki_chunks`, `wiki_runs`.
   - Vault layers: `.raw/`, `wiki/`, `WIKI.md`, `AGENTS.md`, hot cache, index, log.
   - API/CLI/search/status.
   - Loop sync after sweep/generate/enrich/reconcile.

2. **Deterministic source ingest**
   - Local source file -> `.raw/horizon-ingest/`.
   - Generated `wiki/sources/*` synthesis page.
   - Manifest skip for unchanged files.
   - Inferred wikilinks.
   - Contradiction marker extraction without false positives from normal prose.

3. **Source Coverage Pack**
   - Add a curated ingest manifest for Horizon's high-signal source files.
   - First sources: `COMMAND_CENTER.md`, `docs/horizon-v2-build-plan.md`, `docs/portfolio-monetization-map.md`, `docs/photoselect-go-live.md`, `docs/revenue-engine-reset.md`, and the key RateGuard/PhotoSelect launch docs.
   - `npm run wiki:coverage` ingests or skips all registered sources and writes `wiki/meta/Source Coverage Report.md`.

4. **Query-To-Page Capture**
   - Add `captureWikiAnswer(db, { question, answer, links })`.
   - Write durable pages under `wiki/questions/`.
   - Update index, hot cache, log, and chunks.
   - `npm run wiki:capture` and `/api/wiki/capture` file useful answers back into durable wiki memory.

5. **Wiki Lint And Repair Plan**
   - Extend `lintWiki(db)` from health counts into actionable repair suggestions.
   - Check missing links, orphan pages, stale generated pages, contradiction pages without resolution, and source pages without entity links.
   - `npm run wiki:lint` and `/api/wiki/lint` return machine-readable repair actions and write `wiki/meta/Wiki Repair Plan.md`.

6. **Agent Preflight Context Pack**
   - Before deploy/Jules dispatch, build a context packet from `wiki/hot.md`, `wiki/index.md`, search hits, action row, dispatch history, and trust state.
   - Apply existing redaction before any external handoff.
   - Deploy and Jules specs now include the relevant memory links and source paths after redaction.

7. **Outcome Learning Loop**
   - Convert action completion, dispatch reconciliation, buyer signal, and money outcomes into wiki updates.
   - Improve `Action Memory`, `Dispatch Memory`, and project entity pages from outcomes rather than just queue state.
   - Sync now writes `wiki/domains/Outcome Learning.md` from closed actions, outcomes, and work events.

8. **Contradiction Resolution Workflow**
   - Keep contradiction markers as evidence, but add status: open, resolved, superseded.
   - Link each contradiction to the pages it affects.
   - `npm run wiki:contradiction` updates stable contradiction IDs without deleting the raw source trail.

9. **Retrieval Ladder Upgrade**
   - Improve chunk search before adding vectors: contextual prefixes, BM25-style scoring, and source filters.
   - Add the turbovec adapter only after chunk volume and query failures justify semantic search.
   - `wiki_chunks` now carry page/kind/summary prefixes and `searchWiki()` uses BM25-lite chunk scoring before any vector adapter.

10. **Operator Health And Context Budget**
   - Borrowed the missed ccode/OpenClaw pattern: show context pressure before an agent run, and expose a doctor contract for operator health.
   - Added `scripts/context-budget.mjs` for pure preflight size estimates.
   - Added `scripts/doctor.mjs`, `npm run horizon:doctor`, and `GET /api/doctor` for loop/wiki/source/outbox checks.
   - Preflight packets now include an estimated context budget section before deploy/Jules handoff.
   - Wiki lint now catches frontmatter/schema gaps and empty sections, not only graph/link defects.

11. **Wiki Query Modes And Gap Capture**
   - Borrowed the `claude-obsidian` quick/standard/deep query pattern.
   - Added `queryWiki(db, { question, mode, captureGap })`.
   - Added `POST /api/wiki/query` and `npm run wiki:query`.
   - Added Vault controls to build a query packet and optionally capture gaps.
   - Unknowns are now written to `wiki/meta/gaps.md` as explicit memory-health work instead of being silently answered from weak context.

12. **Log Folding And Memory Compaction**
   - Borrowed the `claude-obsidian` fold idea: old logs become deterministic extractive fold pages instead of bloating `wiki/log.md`.
   - Added `runWikiFold(db, { keepEntries, batchSize, dryRun })`.
   - Added `POST /api/wiki/fold`, `npm run wiki:fold`, and a Vault “Fold Log” control.
   - Fold pages live under `wiki/folds/`, preserve copied log entries, and are indexed/searchable.
   - Dry-run previews the fold path/count without writing files.

13. **Doctor UI Strip**
   - Surfaced `/api/doctor` in the Command Center as a read-only System doctor region.
   - Shows loop status, wiki root/graph/retrieval, source registry, dispatch outbox, and Horizon self-WIP from the backend contract.
   - Keeps repair guidance display-only; mutations stay in explicit loop/wiki commands.

14. **Dispatch Queue Policy**
   - Added a pure dispatch policy gate before Jules sessions are created.
   - Blocks unreconciled collisions for the same action, same project, or same lane/agent.
   - Keeps the existing outbox/idempotency guard, but prevents avoidable overlapping external write sessions before they start.

## Build Next

The base living-memory backbone is complete enough to use daily. Next work should be driven by observed retrieval failures, dispatch failures, or buyer/outcome evidence rather than speculative memory features.

1. **Turbovec adapter**
   - Add only after BM25-lite misses concrete queries.
   - Preserve stable IDs with `wiki_chunks.id`; use SQL/BM25 candidate allowlists for local semantic rerank.

## Refuse For Now

- Remote vector database.
- Auto-dispatching repo writes without operator review.
- Dashboard-only features that do not improve memory, action quality, or money decisions.
- Ingesting every file in `~/Desktop/bolting` blindly.

## Operating Rule

Every memory feature must answer at least one of these:

- Does the next agent need less chat history?
- Does Horizon make a better next-money decision?
- Does dispatch become safer or more verifiable?
- Does a useful answer become durable instead of disappearing?
- Does the agent know when its context packet is too large before it spends a run?

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

## Build Next

The base living-memory backbone is complete enough to use daily. Next work should be driven by observed retrieval failures, dispatch failures, or buyer/outcome evidence rather than speculative memory features.

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

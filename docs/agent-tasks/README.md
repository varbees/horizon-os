# Agent task lane map (Claude built ⇄ Codex builds)

This folder holds the staff-engineer prompts for the **Codex lane** of the content-engine slice.
Run each with `codex exec` (gpt-5.5 xhigh on the ChatGPT plan — do **not** pass `-m gpt-5.5-codex`).
Paste one task file per session; each is self-contained and ends with acceptance criteria.

## Lane boundary — read before touching code

The **Claude lane is already shipped and verified** (migration applies, API curls green, frontend
builds, Claude Code health = ready). **Do not rebuild these** — build forward on top of them:

| Shipped (do not rewrite) | File |
| --- | --- |
| Migration v4 `content_engine` (connectors + content_* + pipeline_runs) | `scripts/migrate.mjs`, `db/schema.sql` |
| Local executor adapters + `local` registry mode | `scripts/executors/{registry,index,claude-code,codex,_run}.mjs` |
| Connector registry API + health | `GET /api/connectors`, `POST /api/connectors/:id/health` |
| Content brief + research-lane API | `GET/POST /api/content/briefs`, `GET/PATCH /api/content/briefs/:id`, `POST /api/content/briefs/:id/run` |
| Engine prompt library + loader | `prompts/*.md`, `scripts/content-prompts.mjs` |
| Connectors hub UI + Content route | `src/routes/Connectors.jsx`, `src/routes/Content.jsx`, `src/lib/{connectorsApi,contentApi}.js` |

If a change requires editing one of these, **extend via a new function/endpoint** rather than
replacing it, and keep the existing request/response shapes stable (the UI depends on them).

## Codex lane (these tasks)

- **X1** `codex-x1-harden-executors.md` — async job tracking, `--mcp-config`/`--max-turns`/timeouts, `pipeline_runs` reconcile.
- **X2** `codex-x2-content-orchestrator.md` — asset-plan + generate lanes; fire HuggingFace FLUX + Higgsfield via the MCP client; write `content_assets`; the assemble (editorial) lane; the forward API endpoints (`/assets`, `/package`, `/publish`).
- **X3** `codex-x3-asset-providers.md` — NIM image + Gemini image/video behind a uniform `generateAsset()` interface.
- **X4** `codex-x4-e2e-tests.md` — Playwright coverage for `/connectors` and `/content` plus unit tests for the new modules.

Suggested order: X1 → X2 → X3 → X4 (X2 depends on X1's job model; X4 covers all).

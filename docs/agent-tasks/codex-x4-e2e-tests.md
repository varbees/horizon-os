# X4 — Tests for the content-engine slice

Run with `codex exec`. You are a senior engineer adding the test coverage that locks the slice.
Use the repo's existing harness (Playwright config at `playwright.config.js`, specs in `tests/`).

## Read first
- `playwright.config.js`, the existing `tests/horizon.spec.js`, and `package.json` (`npm run test:e2e`).
- The API surface under test: `/api/connectors`, `/api/connectors/:id/health`, `/api/content/prompts`, `/api/content/briefs` (+ `:id`, `:id/run`, and the X2 forward endpoints).
- The UI under test: `/connectors` (Local Agents + MCP + Skills) and `/content` (brief → research → assemble → publish).

## Build
1. **Unit / module tests** (Node test runner, mirroring `scripts/llm-providers.test.mjs`):
   - `scripts/content-prompts.mjs`: frontmatter parse, `renderTemplate` var substitution, `briefVars`, `renderLanePrompt` for each lane.
   - `scripts/executors/_run.mjs`: `runCommand` resolves on a fast command, reports `cli_not_found` for a missing binary, and `timeout` for a sleeper past `timeoutMs`.
   - Migration v4: open a temp DB (`HORIZON_DB_PATH`), assert the 5 tables exist and connectors seed to 8 rows.
2. **API tests**: boot the API on an alt port + temp DB; assert `GET /api/connectors` returns the 8 seeds, `POST /api/connectors/claude-code/health` returns a state, create→get→patch a brief round-trips, and `POST .../run` returns either `mode:"claude-code"` or `mode:"handoff"` (both valid).
3. **Playwright e2e**: `/connectors` renders the three sections and a health check flips a local-agent chip; `/content` creates a brief, runs research (stub or real), and marks it published — assert persistence on reload.

## Constraints
- Tests must pass with **no external credentials** (Claude Code/Codex may be absent in CI): assert the graceful `handoff`/`unavailable` paths, not that a real model ran.
- Use temp DBs and alt ports; never touch `.horizon/horizon.sqlite`.
- Keep tests deterministic; no network calls to HF/Higgsfield/Gemini in CI (mock or skip-if-unconnected).

## Acceptance criteria
- `npm run test:e2e` green; module tests green via `node --test`.
- A failing assertion clearly localizes to one module/endpoint.
- Note what shipped, paths, and the next action.

# X1 — Harden the local executor adapters

Run with `codex exec`. You are a senior Node engineer hardening Horizon OS's native agent
executors. Baseline adapters already work (synchronous spawn + JSON capture + health probe);
your job is to make them production-grade without breaking the registry contract or the content
research lane that already depends on `runClaudeCode`.

## Read first (official docs, do not design on memory)
- Claude Code headless: https://code.claude.com/docs/en/headless — `claude -p`, `--output-format json|stream-json`, `--max-turns`, `--mcp-config`, `--allowed-tools`, permission flags.
- Codex CLI non-interactive: https://developers.openai.com/codex/cli — `codex exec`, config, MCP.
- Existing code you extend: `scripts/executors/_run.mjs`, `claude-code.mjs`, `codex.mjs`, `registry.mjs`, `reconcile.mjs`, and the `agent_dispatches`/`pipeline_runs` tables (`scripts/migrate.mjs`).

## Constraints
- Keep the registry contract intact: `{ name, capability:{mode:'local',planGated,repoWrite}, dispatch, poll, reconcile }`. `mode:'local'` is already allowed.
- Keep `runClaudeCode(prompt, opts)` and `runCodex(prompt, opts)` exported with their current return shape (`{ ok, result, json, raw, durationMs, error }`) — the content API calls them directly.
- No secrets in code; the CLIs use the operator's own subscription auth. Never add an API key.

## Build
1. **Async job model.** Replace the fire-and-forget in-memory map with a durable job record in `pipeline_runs` (or a new `executor_jobs` table via a v5 migration — additive only). `dispatch` returns an `externalId`; `poll` reads status; `reconcile` finalizes and emits a `work_events` row. The HTTP layer must never block on a long run.
2. **Passthrough flags.** Thread `maxTurns`, `mcpConfig` (path to a generated MCP config so lanes can reach HuggingFace/Higgsfield), `allowedTools`, and `cwd` from caller to CLI. Generate the MCP config from the connected servers in `.horizon/mcp/` when a lane needs assets.
3. **Timeouts + cancellation.** Hard wall-clock timeout already exists; add a cancel path (`kill` by job id) and surface `timedOut` distinctly from `cli_not_found`.
4. **stream-json.** Parse `--output-format stream-json` for progress; persist the final `result`.
5. **Codex parity.** Mirror the above for `codex exec`; verify prompt-over-stdin works on the ChatGPT-plan account and add sandbox/approval flags as documented.

## Acceptance criteria
- `node --input-type=module -e "import {list} from './scripts/executors/index.mjs'; console.log(list().map(a=>a.name))"` still prints all four executors.
- A long research run no longer blocks other API requests (dispatch returns immediately; UI polls).
- `runClaudeCode`/`runCodex` keep their current signature and return shape (existing callers unchanged).
- Graceful, distinct handling for: CLI not installed, unauthenticated, timeout, non-zero exit.
- Note what shipped, paths, and the next action.

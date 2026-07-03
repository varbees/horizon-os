# Horizon OS — Context Architecture (graph-as-context + cofounder profile)

Decisions from the cross-model research pass (ChatGPT + Perplexity + Gemini, 2026-07-03),
now implemented. This is the structural-RAG core that makes Horizon worthwhile for anyone:
agents deploy **grounded** — they query the code graph and know the operator's goals —
instead of starting cold and burning tokens re-reading files.

## 1. Graph-as-context (never graph-as-prompt)

**Rule:** never inject raw `graph.json` (1000+ nodes) into a prompt — it defeats the point
of building the graph. Query it and inject a budgeted block.

- `scripts/graph-context.mjs` runs `graphify query "<q>" --budget 600 --graph <path>` as a
  child process and returns a <1k-token structural block.
- **Gotcha (implemented):** sanitize punctuation before querying — Graphify's tokenizer
  splits on whitespace, so a trailing `?` fails to match the normalized label.
- **Gotcha (implemented):** pass `--graph` explicitly — older CLIs hardcode
  `graphify-out/graph.json` and ignore `GRAPHIFY_OUT`.
- Cheap `graphSummary()` (god nodes / health) is parsed straight from `graph.json` — no CLI,
  no LLM. Powers the Codebase Atlas.
- Injected at **deploy time**: the runnable spec = durable memory + operator profile +
  project graph context. Verified embedded in `.horizon/queue/<id>.md`.

Per-project graphs exist for: horizon-os, photoselect, rateguard, antharmaya-labs, opensrc,
_cofounder, and the workspace root. Build more with `graphify .` inside a repo.

## 2. opensrc → dependency graphs (next step, documented)

`opensrc` (v0.7.2, installed + cloned to `_external/opensrc`) makes dependency source local:

```
opensrc fetch zod              # pre-warm
rg "parse" $(opensrc path zod) # resolve to ~/.opensrc/repos/<host>/<owner>/<repo>/<version>/
```

To give agents a searchable index of dependencies, graphify the resolved paths as **namespaced**
roots (`dep://` vs `repo://`) so traversals stay clean. Pattern (not yet automated here):
read `~/.opensrc/sources.json`, `graphify update <local_path> --graph <merged>` per dep, then
`graphify cluster-only`. **Gotchas:** `opensrc path` uses lockfile version detection (run
`npm install` first, or it falls back to `latest`); in monorepos pass `--cwd <pkg>`; on a
metadata decode failure, fetch a sibling package from the same monorepo.

## 3. Cofounder onboarding (persistent profile)

Two-tier per the research: explicit human-authored config **separate** from auto-learned memory.

- `scripts/agent-profile.mjs` ↔ `.horizon/agent-profile.json`: mission, users, success, stack,
  constraints, working rules, current goals.
- The `Onboarding` route asks the 5 stages after a sweep (what you're building → rules → stack →
  constraints → current work), grounded by the Codebase Atlas.
- `profileContextBlock()` is injected into every deploy → continuity, not a cold assistant.
- **Rule:** flush answers to disk immediately; never rely on them surviving in live context.

## 4. Vercel AI SDK — decided against (for now)

Horizon already calls Claude Code / Codex CLIs + DeepSeek/Gemini APIs and streams via
hand-rolled SSE (`run-manager.mjs` + `LiveConsole`). Adopting the AI SDK's provider
abstraction would create a **second** model-calling convention for no architectural gain.
Keep SSE. Revisit only if a "chat with your codebase" panel needs `useChat`'s message-state —
and even then, wire the graph query layer outside the SDK.

## Anti-patterns (do not do)
- Do not paste `graph.json` into a system prompt.
- Do not let agents freely re-read the whole repo — graph query is the default, file reads the exception.
- Do not merge dependency graphs into the app namespace without `dep://` prefixing.
- Do not build a parallel vector index — the graph is the index for code-centric work.

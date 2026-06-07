# Executable Action Queue (autoresearch run)

Horizon's Action Queue is no longer a list of suggestions — each item is a **runnable agent task**
that can be enriched by an in-app Gemini worker and deployed as a self-contained spec into the target
project, then mirrored into Obsidian as durable memory. This is the "controllable command center that
deploys actions into projects" the operator asked for.

## What an action now carries

Beyond title/summary/prompt, each `action_queue` row has executable fields (added non-destructively by
`ensureActionQueueColumns` in `scripts/horizon-db.mjs`):

- `cwd` — the working directory the agent runs in.
- `goal` — the single concrete outcome.
- `constraints` — newline-separated guardrails.
- `done_criteria` — newline-separated, individually verifiable checks.
- `tools` — files/commands/resources to use.
- `spec_path` — where the deployed runnable spec was written.
- `enriched` — whether the Gemini worker has filled the spec.

## The flow

1. **Generate / capture** — actions arrive from the sweep/revenue generator or manual capture.
2. **Enrich** (`PATCH /api/action-queue/:id/enrich`) — the in-app Gemini worker (`scripts/gemini.mjs`,
   server-side, key from `.env`, never in the browser) turns a rough action into goal + constraints +
   done-criteria + a tightened prompt. The drawer's "Enrich with Gemini" button triggers it.
3. **Edit** — the drawer shows the spec; fields persist via `PATCH /api/action-queue/:id`.
4. **Deploy** (`PATCH /api/action-queue/:id/deploy`) — `scripts/action-spec.mjs` writes a self-contained
   runnable Markdown spec (context, goal, constraints, done checklist, tools, prompt, report format) to
   `.horizon/queue/<id>.md` and mirrors it into the Obsidian vault at `Horizon/Actions/<id>.md`.
   Before writing, Horizon syncs the compound wiki and appends a redacted memory preflight packet:
   `wiki/hot.md`, `wiki/index.md`, relevant search hits, the action row, dispatch history, and trust state.
5. **Run** — execute the spec in the project with the named agent (`claude` / `codex` / Jules).

## Metric

`node scripts/autoresearch-capcount.mjs` prints the number of wired executable capabilities (currently
16/16). `--verbose` lists each check. This was the mechanical metric for the bounded autoresearch run;
`npm run build` was the guard. Iteration log: `.horizon/autoresearch-log.tsv`.

## Keep in mind (Gemini / Jules / ADK)

- Gemini calls are **server-side only**; the free-tier key lives in `.env` and is loaded via
  `scripts/env.mjs`. A `429` from the endpoint means the integration is correct but quota is exhausted —
  it clears on reset. Restrict the key to the Generative Language API in the console.
- Model is configurable via `GEMINI_MODEL` (default `gemini-2.0-flash`).
- The operating loop must not depend on remote model availability: enrichment is optional polish; the
  rule-based generator and manual edits keep the queue usable offline.
- **Jules** (async repo work) and **ADK** (multi-step workers) are the next layer: a deployed action is
  exactly the clear, self-contained spec Jules wants. Send only enriched, reviewed actions to Jules.

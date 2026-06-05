# Horizon OS v2 — Orchestrated Build Plan

Synthesis of ~10 independent deep-research runs (Perplexity ×2, Grok, Google 3.1 Pro, Claude deep
research, ChatGPT ×2, Qwen, Consensus, Asta). This is the authoritative build spec. Where tools
disagreed, the resolution and reason are stated. Written 2026-06-05.

## The verdict in one line

**Do a contract pass, not a rewrite.** Freeze four durable contracts around the system that already
works, then ship the one keystone everyone agreed on: a **config-driven source registry** that replaces
the hardcoded `~/Desktop/bolting/*` root and promotes PhotoSelect + rateguard to weighted, first-class
sources. Everything money/memory/analytics is **interface-now, gated-later**.

## Convergence (what ~all tools independently agreed on)

1. **Keystone first build = config-driven source registry.** Every single tool named this the highest-
   leverage move. It turns a folder-watcher into a money-OS.
2. **Freeze 4 contracts:** canonical data model · action lifecycle · source-ingestion interface · agent-
   dispatch contract.
3. **Additive-only DB evolution.** `schema_migrations` + `PRAGMA user_version`, numbered SQL, never
   destructive `ALTER`, backup before migrate. Keep `action_queue` as the spine; add around it. (This
   formalizes the repo's existing `ensureActionQueueColumns` additive pattern in `scripts/horizon-db.mjs`.)
4. **Action lifecycle:** `capture → enrich → plan-gate → dispatch → verify → record`. Plan-gate (human)
   is the anti-excessive-agency checkpoint; "verify" never trusts an agent's own "done."
5. **Jules is the one real programmatic executor → outbox + reconciliation.** Jules v1alpha has 9 states,
   **no webhooks** (poll `GetSession`), result at `outputs[].pullRequest.url`, concurrent + 24h caps,
   alpha/unstable → wrap behind one adapter (`scripts/jules.mjs`).
6. **Money + memory = interface now, data later, trigger-gated.** No dashboards for ₹0 revenue / ~0
   audience. Create empty `outcomes`/`identities` shells; build no UI on them.
7. **Observability proportionate to one operator:** heartbeats + run history + structured logs + a trust
   strip. No Prometheus/Grafana. Boot self-check (`user_version` == latest migration). Failure isolation
   per source/dispatch; graceful degradation (already the loop's ethos).
8. **Security:** secrets server-side only (already correct), `127.0.0.1` bind, `.env` perms, **log/spec
   redaction**, never import an agent framework/marketplace into the secrets-holding daemon (read-and-
   audit only — cited: LangChain CVE-2025-68664, Shai-Hulud npm worm, CVE-2026-34070). Gate webhook HMAC
   verification + OS keychain until a paid integration exists.
9. **Anti-procrastination as DATA, not willpower:** WIP limit of **1** "Horizon-improvement" action;
   aging-WIP tripwire; log Horizon-self work as `work_events`; if monthly self-work > ~4h after June 12,
   the Command base surfaces it as stolen product time. Plus a dispatch-ratio tripwire.
10. **UI: three views only** — Command base (single ranked "next money move" + WIP gauge + trust strip),
    Per-project (git detail + actions + dispatches), Works-with-me loop (plan-gate / feedback queue).
11. **Owned core, no imported runtime.** Source adapters + executor adapters are local audited modules
    behind fixed interfaces; behavior is config-driven.

## Disagreements resolved (orchestrator calls)

| Topic | Split | Resolution & why |
|---|---|---|
| Config format | YAML (Perplexity) vs JSON (most) | **JSON** — Node-native, no YAML dep in a secrets-holding daemon. `.horizon/sources.json`. |
| DB driver | switch to `better-sqlite3` (Google/ChatGPT) | **Keep `node:sqlite`** — repo already uses it; native dep + rebuild friction not justified. Gate `better-sqlite3` unless concurrency/perf actually bites. |
| WAL sync mode | `FULL` (compass) vs `NORMAL` (Google) | **WAL + `synchronous=FULL`** — this is a system-of-record; crash durability > micro-perf. |
| Agent sandbox | Docker/Firecracker/MCP-everything (Google) | **Defer.** Jules runs in its own ephemeral cloud VM (isolation is external); Claude/Codex are operator-driven. Host Docker solves a problem the current executors don't have. Now: credential scoping + spec scrubbing. |
| Cloudflare deploy polling | build now (Google) | **Interface now, adapter later.** Real CF infra exists, but build the source-adapter seam now; add the CF adapter when a deploy-status decision actually matters. |
| Event sourcing | full (some) vs hybrid (compass) | **Hybrid** — mutable `projects`/`actions` + append-only `work_events`. Full ES is overkill for one operator. |
| MCP as dispatch protocol | universal (Google) | **Gate.** Don't rebuild Jules dispatch on MCP. MCP stays a read-only, human-gated client. |

## The four frozen contracts (the durable core)

**1. Canonical data model** (additive-only; new migration `migrations/001_v2_core.sql`):
- `project_sources(id, type, config_json, lane, weight, enabled, last_ingested_at, ...)` — the registry.
- `work_events(id, project_id, kind, payload_json, occurred_at, recorded_at)` — append-only spine.
- `agent_dispatches(id, action_id, agent, external_id, external_state, result_url, idempotency_key,
  dispatched_at, last_polled_at, reconciled_at, attempts, last_error)` — the outbox.
- extend `action_queue` (already has `cwd/goal/constraints/done_criteria/tools/spec_path/enriched/
  jules_session_id`): add `state, lane, priority_score, dispatch_target, idempotency_key UNIQUE,
  dispatched_at, verified_at, origin_event_id, outcome_code`.
- **empty shells**: `outcomes(...)`, `identities(...)` — created, never populated yet.
- `schema_migrations(version, name, applied_at)` + `PRAGMA user_version` in lockstep.

**2. Action lifecycle**: `capture → enrich → plan-gate → dispatch → verify → record`, backfilled from the
existing `status` column; each transition writes a `work_event`.

**3. Source-ingestion interface** (local adapters): `discover() → repoPaths[]`,
`describe(repo) → {branch, dirty, ahead/behind, lastCommit, commitCount, githubUrl}`, `classify(repo)`.
`fs-glob` is the only adapter built now; `github-api`/`cloudflare`/`stripe` slot in behind it later.

**4. Agent-dispatch contract** (Jules, concrete): write `agent_dispatches` row + `idempotency_key`
**before** `createSession({requirePlanApproval:true})`; persist `sessions/{id}`; one reconcile pass per
loop polls open dispatches, maps the 9 states, captures the PR URL into `result_url`, writes a
`work_event`, closes/flags the action. All behind `scripts/jules.mjs`.

## Build-now — the ~20–25h slice (one focused week, additive to existing code)

Front-loaded so partial completion still ships a general money-OS. Grounded in real files.

1. **Migration runner + frozen core schema** (~5h). `scripts/migrate.mjs` reads `user_version`, applies
   numbered `migrations/*.sql` in a transaction, backs up `.horizon/horizon.sqlite` first; set `WAL` +
   `synchronous=FULL`; boot self-check. Migration `001` creates the tables above. *Touches:*
   `scripts/horizon-db.mjs`, new `scripts/migrate.mjs`, new `migrations/001_v2_core.sql`.
2. **Config-driven source registry + fs-glob adapter** (~6h) — **the keystone**. Loader for
   `.horizon/sources.json`; refactor `scripts/project-sweep.mjs` to iterate sources (default entry =
   current bolting root, so nothing breaks); weight `01-revenue/photoselect` (lane revenue-engine,
   weight 100) and `02-fast-cash/rateguard` (lane fast-cash, weight 80) — both already swept, they just
   need weighting; persist `projects` rows with lane/priority. *Touches:* `scripts/project-sweep.mjs`,
   `scripts/horizon-loop.mjs`, `src/data/portfolio.js`/`src/routes/Projects.jsx` (display).
3. **Jules durable dispatch + reconciliation** (~6h). Extend `/api/action-queue/:id/jules` to write an
   `agent_dispatches` row (idempotency first); add one reconcile pass inside the 60-min cycle that polls
   open dispatches and maps state → captures PR URL → writes `work_event`. *Touches:* `scripts/jules.mjs`,
   `scripts/horizon-api.mjs`, `scripts/horizon-loop.mjs`.
4. **WIP tripwire + "next move" card + redaction + trust strip** (~5h). `state` drives a single ranked
   "next money move" card (by project priority); WIP gauge + aging-WIP tripwire on Horizon-self actions;
   `redactForSpec()`/`redactForLog()` on deploy/dispatch/log paths; trust strip (loop age, last cycle,
   open dispatches, quota). *Touches:* `scripts/action-spec.mjs`, `src/routes/CommandCenter.jsx`,
   `src/routes/Overview.jsx`.

## Gate-later (trigger → first slice)

| Deferred | Unlock trigger | First slice |
|---|---|---|
| Revenue/runway read-view | First real payment (≥1 `outcomes` row) | Read `outcomes`; show MRR + runway number, no charts |
| Stripe/Razorpay webhook verify | First live payment integration | HMAC-SHA256 raw-body verify + 5-min tolerance + constant-time compare |
| OS keychain secret migration | Holding any payment/webhook secret | Move payment secrets `.env` → keychain/libsecret |
| Cloudflare / GitHub source adapter | A remote signal actually drives a weekly decision | Daily deploy/traffic sample → `work_events`, behind the source interface |
| Indexed/learned memory | `work_events` volume makes manual recall slow | Embed `work_events`+vault; semantic search endpoint |
| Parallel / multi-agent dispatch | Jules saturating its concurrent-task cap | Parallel dispatch respecting tier caps |
| Host Docker sandbox | A non-Jules executor runs code on the host | Non-root container + worktree mount |

## Tripwires (encoded as data, checked by the loop)

- **WIP=1 on Horizon-self actions**; a 2nd opened while PhotoSelect/rateguard actions wait → Command base blocks.
- **Maintenance budget:** monthly Horizon-self `work_events` > ~4h after 2026-06-12 → surfaced as stolen product time.
- **Dispatch ratio:** <20% of `deployable` actions dispatched/closed in 7 days → stop adding generation features.
- **Schema health:** boot fails loudly if `user_version` ≠ latest migration.
- **No imported deps into the daemon:** any dependency is read-and-reimplemented, not `npm install`ed.
- **Reconciliation stall:** open `agent_dispatches` with stale `last_polled_at` → flag on the trust strip.
- **Secret spill:** redaction matches any `.env` key name in a spec/log → fail the deploy step.

## The single highest-leverage thing to build first

The **config-driven source registry** (build-now item 2), with the migration runner (item 1) only
because the registry's new fields need a safe place to live. It promotes PhotoSelect and rateguard into
first-class weighted sources and turns Horizon from a folder-watcher into a money-OS — completable inside
the one-week budget, and even partial completion ships the core win.

## Open inputs needed before building item 2

- Confirm **rateguard** is the SDK to weight (it's at `~/Desktop/bolting/02-fast-cash/rateguard`).
- Any **project roots outside `~/Desktop/bolting`** to add as sources now (else default to bolting only).

import "./env.mjs";

// Horizon OS — the autonomous operating loop.
//
// This is the single orchestrator that turns Horizon's separate capabilities into
// one owned, always-on agent loop ("openclaw/hermes, but managed by me"). One cycle:
//
//   1. sweep      scan ~/Desktop/bolting/* for new commits / dirty repos
//   2. generate   turn signals into revenue actions (rule-based, always works)
//   3. enrich     Gemini turns rough actions into runnable specs (quota-safe; optional)
//   4. ready      count enriched actions awaiting the operator's reviewed dispatch
//
// Design rules (match COMMAND_CENTER guardrails):
//   - Never throws: each stage is isolated so a single failure never stops the loop.
//   - Never blocks on remote models: enrichment is optional polish; the loop runs
//     fine with no Gemini key or an exhausted quota (429 -> stoppedForQuota).
//   - Does NOT auto-dispatch to Jules. Jules changes real repos, so dispatch stays
//     operator-triggered and plan-gated. The loop only reports what is *ready*.
//
// Heartbeat: latest cycle -> .horizon/loop-status.json; one row per cycle -> .horizon/loop-log.tsv.

import { writeFileSync, appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { openHorizonDb } from "./horizon-db.mjs";
import { runProjectSweep } from "./project-sweep.mjs";
import { generateRevenueActions } from "./revenue-actions.mjs";
import { autoEnrich } from "./auto-enrich.mjs";
import { geminiAvailable } from "./gemini.mjs";
import { reconcileDispatches } from "./reconcile.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HORIZON_DIR = resolve(root, ".horizon");
const STATUS_PATH = resolve(HORIZON_DIR, "loop-status.json");
const LOG_PATH = resolve(HORIZON_DIR, "loop-log.tsv");

const msg = (e) => String(e?.message ?? e).slice(0, 200);

function writeHeartbeat(cycle) {
  if (!existsSync(HORIZON_DIR)) mkdirSync(HORIZON_DIR, { recursive: true });
  writeFileSync(STATUS_PATH, JSON.stringify(cycle, null, 2));
  if (!existsSync(LOG_PATH)) {
    appendFileSync(LOG_PATH, "started_at\tprojects\tdirty\tgenerated\tenriched\tready\tok\tnotes\n");
  }
  const s = cycle.stages;
  const row = [
    cycle.startedAt,
    s.sweep?.projects ?? "",
    s.sweep?.dirtyRepos ?? "",
    s.generate?.actions ?? "",
    s.enrich?.enriched ?? (s.enrich?.skipped ? "skip" : ""),
    s.ready?.enrichedActions ?? "",
    cycle.ok ? "ok" : "ERR",
    cycle.errors.join("; "),
  ].join("\t");
  appendFileSync(LOG_PATH, row + "\n");
}

// One full cycle. Returns a structured report; never throws.
export async function runCycle({ db: providedDb, enrichLimit } = {}) {
  const db = providedDb ?? openHorizonDb();
  const cycle = { startedAt: new Date().toISOString(), stages: {}, errors: [], ok: false };

  // 1. sweep
  try {
    const snap = runProjectSweep(db);
    cycle.stages.sweep = { projects: snap.summary.projects, dirtyRepos: snap.summary.dirty_repos };
  } catch (e) {
    cycle.errors.push("sweep: " + msg(e));
  }

  // 2. generate (reuse the sweep we just ran)
  try {
    const gen = generateRevenueActions(db, { sweep: false });
    cycle.stages.generate = { actions: gen.generated?.length ?? 0 };
  } catch (e) {
    cycle.errors.push("generate: " + msg(e));
  }

  // 3. enrich (quota-safe, optional)
  if (geminiAvailable()) {
    try {
      const enr = await autoEnrich({ db, limit: enrichLimit });
      cycle.stages.enrich = {
        candidates: enr.candidates,
        enriched: enr.enriched,
        stoppedForQuota: enr.stoppedForQuota,
      };
    } catch (e) {
      cycle.errors.push("enrich: " + msg(e));
    }
  } else {
    cycle.stages.enrich = { skipped: "gemini_key_missing" };
  }

  // 4. readiness — enriched actions awaiting the operator's reviewed Jules dispatch
  try {
    const ready = db
      .prepare("SELECT COUNT(*) AS n FROM action_queue WHERE enriched = 1 AND status != 'dismissed'")
      .get();
    cycle.stages.ready = { enrichedActions: ready?.n ?? 0 };
  } catch (e) {
    cycle.errors.push("ready: " + msg(e));
  }

  // 5. reconcile open Jules dispatches (no webhooks → poll once per cycle)
  try {
    const rec = await reconcileDispatches(db);
    cycle.stages.reconcile = rec.skipped
      ? { skipped: rec.skipped }
      : { polled: rec.polled, reconciled: rec.reconciled };
  } catch (e) {
    cycle.errors.push("reconcile: " + msg(e));
  }

  cycle.finishedAt = new Date().toISOString();
  cycle.ok = cycle.errors.length === 0;
  writeHeartbeat(cycle);
  if (!providedDb) db.close();
  return cycle;
}

// Latest heartbeat for the API / dashboard.
export function loopStatus() {
  if (!existsSync(STATUS_PATH)) return { ok: false, reason: "never_run" };
  try {
    return JSON.parse(readFileSync(STATUS_PATH, "utf8"));
  } catch {
    return { ok: false, reason: "unreadable_status" };
  }
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  const db = openHorizonDb();
  const run = async () => {
    const cycle = await runCycle({ db });
    const s = cycle.stages;
    const line = [
      `sweep:${s.sweep?.projects ?? "-"}p/${s.sweep?.dirtyRepos ?? "-"}dirty`,
      `generate:${s.generate?.actions ?? "-"}`,
      `enrich:${s.enrich?.skipped ? "skip" : `${s.enrich?.enriched ?? 0}${s.enrich?.stoppedForQuota ? "(quota)" : ""}`}`,
      `ready:${s.ready?.enrichedActions ?? "-"}`,
      `reconcile:${s.reconcile?.skipped ? "skip" : `${s.reconcile?.reconciled ?? 0}/${s.reconcile?.polled ?? 0}`}`,
      cycle.ok ? "OK" : `ERR(${cycle.errors.length})`,
    ].join("  ");
    console.log(`[${cycle.startedAt}] ${line}`);
    if (cycle.errors.length) for (const err of cycle.errors) console.error("  ! " + err);
  };
  await run();
  if (process.argv.includes("--watch")) {
    const minutes = Math.max(5, Number(process.env.HORIZON_LOOP_INTERVAL_MINUTES ?? 60));
    console.log(`horizon loop watching every ${minutes} minutes (Ctrl-C to stop)`);
    setInterval(run, minutes * 60_000);
  } else {
    db.close();
    process.exit(0);
  }
}

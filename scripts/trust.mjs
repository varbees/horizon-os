import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const statusPath = resolve(root, ".horizon", "loop-status.json");

function readLoopStatus() {
  if (!existsSync(statusPath)) return { ok: false, reason: "never_run" };
  try {
    return JSON.parse(readFileSync(statusPath, "utf8"));
  } catch {
    return { ok: false, reason: "unreadable_status" };
  }
}

function count(db, sql) {
  try {
    return db.prepare(sql).get()?.n ?? 0;
  } catch {
    return 0;
  }
}

function lastCycleAt(status) {
  return status.finishedAt || status.startedAt || "";
}

function loopAgeMinutes(timestamp) {
  const ms = Date.parse(timestamp);
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.round((Date.now() - ms) / 60_000));
}

function quotaState(status) {
  const enrich = status?.stages?.enrich;
  if (!enrich) return "unknown";
  if (enrich.stoppedForQuota === true) return "quota";
  if (enrich.stoppedForQuota === false) return "ok";
  if (enrich.skipped) return `skipped:${enrich.skipped}`;
  return "unknown";
}

export function trustSummary(db) {
  const loop = readLoopStatus();
  const cycleAt = lastCycleAt(loop);

  return {
    loopOk: Boolean(loop.ok),
    loopAgeMinutes: loopAgeMinutes(cycleAt),
    lastCycleAt: cycleAt,
    openDispatches: count(db, "SELECT COUNT(*) AS n FROM agent_dispatches WHERE reconciled_at = ''"),
    quotaState: quotaState(loop),
    horizonSelfWip: count(
      db,
      "SELECT COUNT(*) AS n FROM action_queue WHERE project_id LIKE '%horizon%' AND state NOT IN ('closed', 'aborted')",
    ),
    ...(loop.reason ? { reason: loop.reason } : {}),
  };
}

import "./env.mjs";

// Jules has no webhooks → Horizon discovers completion by polling open dispatches once per
// loop cycle (the outbox/reconciliation pattern). Each open agent_dispatches row is polled;
// terminal states (completed/failed) close the row, mirror state onto the action, and write a
// work_event. Never trusts an agent's "done" blindly — the operator still verifies business
// correctness (the action moves to `completed`, not `closed`).

import { getSession, julesAvailable } from "./jules.mjs";
import { mapJulesState, pullRequestUrl } from "./executors/jules.mjs";

const TERMINAL = new Set(["completed", "failed"]);

export function recordWorkEvent(db, { projectId = "", kind, payload = {}, occurredAt = "" } = {}) {
  db.prepare(
    `INSERT INTO work_events (project_id, kind, payload_json, occurred_at, recorded_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
  ).run(projectId, kind, JSON.stringify(payload), occurredAt || new Date().toISOString());
}

// Map a reconciled external state to the action's lifecycle state.
function actionStateFor(state) {
  if (state === "completed") return "completed"; // operator still verifies -> 'verified'/'closed'
  if (state === "failed") return "failed";
  if (state === "blocked") return "blocked";
  return "dispatched"; // queued/planning/in_progress/paused/awaiting_plan
}

export async function reconcileDispatches(db, { limit = 10 } = {}) {
  if (!julesAvailable()) return { ok: true, polled: 0, reconciled: 0, skipped: "jules_key_missing" };
  const open = db
    .prepare(
      `SELECT * FROM agent_dispatches
       WHERE agent = 'jules' AND reconciled_at = '' AND external_id != ''
       ORDER BY dispatched_at LIMIT ?`,
    )
    .all(limit);
  let reconciled = 0;
  const errors = [];

  for (const d of open) {
    try {
      const session = await getSession(d.external_id);
      const state = mapJulesState(session.state);
      const resultUrl = pullRequestUrl(session);
      const terminal = TERMINAL.has(state);

      db.prepare(
        `UPDATE agent_dispatches
         SET external_state = ?, result_url = ?, last_polled_at = datetime('now'),
             reconciled_at = CASE WHEN ? = 1 THEN datetime('now') ELSE reconciled_at END,
             attempts = attempts + 1
         WHERE id = ?`,
      ).run(state, resultUrl, terminal ? 1 : 0, d.id);

      db.prepare(
        `UPDATE action_queue SET state = ?, jules_session_id = ?, updated_at = datetime('now') WHERE id = ?`,
      ).run(actionStateFor(state), d.external_id, d.action_id);

      recordWorkEvent(db, {
        kind: "reconcile",
        payload: { actionId: d.action_id, agent: "jules", state, resultUrl },
      });
      if (terminal) reconciled += 1;
    } catch (error) {
      const msg = String(error.message ?? error).slice(0, 200);
      db.prepare(
        `UPDATE agent_dispatches SET last_polled_at = datetime('now'), attempts = attempts + 1, last_error = ? WHERE id = ?`,
      ).run(msg, d.id);
      errors.push(msg.slice(0, 120));
    }
  }
  return { ok: errors.length === 0, polled: open.length, reconciled, errors };
}

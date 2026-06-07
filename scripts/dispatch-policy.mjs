function same(a, b) {
  return String(a ?? "").trim() && String(a ?? "").trim() === String(b ?? "").trim();
}

function conflict(reason, row) {
  return {
    ok: false,
    reason,
    conflict: {
      dispatchId: row.id,
      actionId: row.action_id,
      sessionId: row.external_id ?? "",
      projectId: row.project_id ?? "",
      lane: row.lane ?? "",
      title: row.title ?? "",
      state: row.external_state ?? "",
    },
  };
}

export function openDispatchesForAgent(db, agent = "jules") {
  return db.prepare(`
    SELECT d.id, d.action_id, d.agent, d.external_id, d.external_state, d.dispatched_at,
           a.project_id, a.lane, a.title
    FROM agent_dispatches d
    LEFT JOIN action_queue a ON a.id = d.action_id
    WHERE d.agent = ? AND d.reconciled_at = ''
    ORDER BY d.dispatched_at ASC, d.id ASC
  `).all(agent);
}

export function evaluateDispatchPolicy(db, action, { agent = "jules" } = {}) {
  if (!action?.id) throw new TypeError("dispatch policy requires action.id");
  const open = openDispatchesForAgent(db, agent);

  const sameAction = open.find((row) => row.action_id === action.id);
  if (sameAction) return conflict("already_dispatched", sameAction);

  const sameProject = open.find((row) => same(row.project_id, action.project_id));
  if (sameProject) return conflict("project_busy", sameProject);

  const sameLane = open.find((row) => same(row.lane, action.lane));
  if (sameLane) return conflict("lane_busy", sameLane);

  return { ok: true, reason: "ready", openDispatches: open.length };
}

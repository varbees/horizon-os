import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("dispatch policy blocks same action, project, and lane collisions", async () => {
  const dir = mkdtempSync(join(tmpdir(), "horizon-dispatch-policy-"));
  process.env.HORIZON_DB_PATH = join(dir, "horizon.sqlite");

  const nonce = Date.now();
  const { openHorizonDb } = await import(`../scripts/horizon-db.mjs?dispatchPolicy=${nonce}`);
  const { evaluateDispatchPolicy } = await import(`../scripts/dispatch-policy.mjs?dispatchPolicy=${nonce}`);

  const db = openHorizonDb();
  try {
    db.prepare(`
      INSERT INTO action_queue (id, title, summary, source, project_id, project_path, agent, prompt, status, impact, sort_order, lane)
      VALUES (?, ?, '', 'test', ?, '', 'jules', '', 'queued', 'high', 0, ?)
    `).run("a1", "First action", "photoselect", "revenue-engine");
    db.prepare(`
      INSERT INTO action_queue (id, title, summary, source, project_id, project_path, agent, prompt, status, impact, sort_order, lane)
      VALUES (?, ?, '', 'test', ?, '', 'jules', '', 'queued', 'high', 0, ?)
    `).run("a2", "Same project", "photoselect", "revenue-engine");
    db.prepare(`
      INSERT INTO action_queue (id, title, summary, source, project_id, project_path, agent, prompt, status, impact, sort_order, lane)
      VALUES (?, ?, '', 'test', ?, '', 'jules', '', 'queued', 'high', 0, ?)
    `).run("a3", "Same lane", "rateguard", "revenue-engine");
    db.prepare(`
      INSERT INTO action_queue (id, title, summary, source, project_id, project_path, agent, prompt, status, impact, sort_order, lane)
      VALUES (?, ?, '', 'test', ?, '', 'jules', '', 'queued', 'high', 0, ?)
    `).run("a4", "Different lane", "secureclaw", "fast-cash");

    db.prepare(`
      INSERT INTO agent_dispatches (action_id, agent, external_id, external_state, dispatched_at, idempotency_key)
      VALUES ('a1', 'jules', 'session-1', 'in_progress', datetime('now'), 'jules:a1:1')
    `).run();

    assert.equal(evaluateDispatchPolicy(db, { id: "a1", project_id: "photoselect", lane: "revenue-engine" }, { agent: "jules" }).reason, "already_dispatched");
    assert.equal(evaluateDispatchPolicy(db, { id: "a2", project_id: "photoselect", lane: "revenue-engine" }, { agent: "jules" }).reason, "project_busy");
    assert.equal(evaluateDispatchPolicy(db, { id: "a3", project_id: "rateguard", lane: "revenue-engine" }, { agent: "jules" }).reason, "lane_busy");
    assert.equal(evaluateDispatchPolicy(db, { id: "a4", project_id: "secureclaw", lane: "fast-cash" }, { agent: "jules" }).ok, true);
  } finally {
    db.close();
  }
});

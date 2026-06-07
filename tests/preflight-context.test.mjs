import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("preflight context attaches wiki, dispatch, trust, and is redacted in specs", async () => {
  const dir = mkdtempSync(join(tmpdir(), "horizon-preflight-"));
  process.env.HORIZON_DB_PATH = join(dir, "horizon.sqlite");
  process.env.HORIZON_VAULT_PATH = join(dir, "vault");

  const nonce = Date.now();
  const { openHorizonDb } = await import(`../scripts/horizon-db.mjs?preflight=${nonce}`);
  const { syncHorizonWiki } = await import(`../scripts/wiki.mjs?preflight=${nonce}`);
  const { buildPreflightContext, formatPreflightContext } = await import(`../scripts/preflight-context.mjs?preflight=${nonce}`);
  const { buildRunnableSpec } = await import(`../scripts/action-spec.mjs?preflight=${nonce}`);

  const db = openHorizonDb();
  try {
    syncHorizonWiki(db);
    const action = {
      id: "preflight-action",
      title: "Ship PhotoSelect payment proof",
      project_id: "photoselect",
      lane: "revenue-engine",
      state: "deployable",
      status: "queued",
      summary: "PhotoSelect buyer evidence and payment proof need a deployable slice.",
      goal: "Ship the payment proof path.",
      done_criteria: "Build verified; browser smoke passes.",
      prompt: "Use the PhotoSelect docs.",
      project_path: "/tmp/photoselect",
    };
    db.prepare(`
      INSERT INTO agent_dispatches (action_id, agent, external_id, external_state, dispatched_at, idempotency_key)
      VALUES (?, 'jules', 'session-1', 'in_progress', '2026-06-07T00:00:00Z', 'jules:preflight-action:1')
    `).run(action.id);

    const packet = buildPreflightContext(db, action);
    const markdown = formatPreflightContext(packet);
    assert.match(markdown, /Horizon memory preflight/);
    assert.match(markdown, /wiki\/hot\.md/);
    assert.match(markdown, /wiki\/index\.md/);
    assert.match(markdown, /PhotoSelect/);
    assert.match(markdown, /session-1/);
    assert.match(markdown, /loopOk/);

    const spec = buildRunnableSpec(action, {
      stamp: "2026-06-07T00:00:00.000Z",
      memoryContext: `${markdown}\nBearer abcdefghijklmnop`,
    });
    assert.match(spec, /Horizon memory preflight/);
    assert.match(spec, /«REDACTED:BEARER_TOKEN»/);
    assert.doesNotMatch(spec, /abcdefghijklmnop/);
  } finally {
    db.close();
  }
});

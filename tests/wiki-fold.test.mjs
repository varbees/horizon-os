import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

function fixtureLog() {
  const entries = Array.from({ length: 6 }, (_, index) => {
    const n = index + 1;
    return [
      `## [2026-06-0${n}] query | Entry ${n}`,
      `- Summary: durable event ${n}`,
      `- Detail: fold fixture ${n}`,
      "",
    ].join("\n");
  }).join("\n");
  return [
    "---",
    "type: meta",
    "title: \"Wiki Log\"",
    "updated: 2026-06-07T00:00:00.000Z",
    "tags: [horizon, log]",
    "status: active",
    "---",
    "",
    "# Wiki Log",
    "",
    entries,
  ].join("\n");
}

test("wiki log fold previews, commits deterministic fold pages, and is idempotent", async () => {
  const dir = mkdtempSync(join(tmpdir(), "horizon-wiki-fold-"));
  process.env.HORIZON_DB_PATH = join(dir, "horizon.sqlite");
  process.env.HORIZON_VAULT_PATH = join(dir, "vault");

  const nonce = Date.now();
  const { openHorizonDb } = await import(`../scripts/horizon-db.mjs?fold=${nonce}`);
  const { runWikiFold, syncHorizonWiki } = await import(`../scripts/wiki.mjs?fold=${nonce}`);

  const db = openHorizonDb();
  try {
    syncHorizonWiki(db);
    writeFileSync(join(process.env.HORIZON_VAULT_PATH, "wiki/log.md"), fixtureLog(), "utf8");

    const preview = runWikiFold(db, { keepEntries: 2, batchSize: 4, dryRun: true });
    assert.equal(preview.dryRun, true);
    assert.equal(preview.foldedEntries, 4);
    assert.equal(preview.files.length, 0);
    assert.ok(preview.foldPath.startsWith("wiki/folds/log-fold-"));
    assert.equal(existsSync(join(process.env.HORIZON_VAULT_PATH, preview.foldPath)), false);

    const committed = runWikiFold(db, { keepEntries: 2, batchSize: 4 });
    assert.equal(committed.dryRun, false);
    assert.equal(committed.foldedEntries, 4);
    assert.ok(committed.files.includes(committed.foldPath));
    assert.ok(existsSync(join(process.env.HORIZON_VAULT_PATH, committed.foldPath)));

    const fold = readFileSync(join(process.env.HORIZON_VAULT_PATH, committed.foldPath), "utf8");
    assert.match(fold, /# Log Fold/);
    assert.match(fold, /Entry 3/);
    assert.match(fold, /Entry 6/);
    assert.doesNotMatch(fold, /Entry 1/);

    const log = readFileSync(join(process.env.HORIZON_VAULT_PATH, "wiki/log.md"), "utf8");
    assert.match(log, /Entry 1/);
    assert.match(log, /Entry 2/);
    assert.doesNotMatch(log, /Entry 3/);
    assert.match(log, new RegExp(committed.foldTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

    const latestRun = db.prepare("SELECT kind, summary FROM wiki_runs ORDER BY created_at DESC LIMIT 1").get();
    assert.equal(latestRun.kind, "log-fold");
    assert.match(latestRun.summary, /Folded 4 wiki log entries/);

    const second = runWikiFold(db, { keepEntries: 2, batchSize: 4 });
    assert.equal(second.foldedEntries, 0);
    assert.equal(second.files.length, 0);
  } finally {
    db.close();
  }
});

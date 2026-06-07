import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("horizonDoctor reports trust, wiki health, source registry, and checks", async () => {
  const dir = mkdtempSync(join(tmpdir(), "horizon-doctor-"));
  process.env.HORIZON_DB_PATH = join(dir, "horizon.sqlite");
  process.env.HORIZON_VAULT_PATH = join(dir, "vault");
  process.env.HORIZON_SOURCES = join(dir, "sources.json");

  const nonce = Date.now();
  const { openHorizonDb } = await import(`../scripts/horizon-db.mjs?doctor=${nonce}`);
  const { syncHorizonWiki } = await import(`../scripts/wiki.mjs?doctor=${nonce}`);
  const { horizonDoctor } = await import(`../scripts/doctor.mjs?doctor=${nonce}`);

  const db = openHorizonDb();
  try {
    syncHorizonWiki(db);
    const result = horizonDoctor(db, { staleLoopMinutes: 0 });

    assert.ok(["ok", "warn", "fail"].includes(result.status));
    assert.ok(result.checkedAt);
    assert.equal(result.trust.openDispatches, 0);
    assert.ok(result.wiki.wikiPageCount > 0);
    assert.ok(result.sources.roots.length >= 1);
    assert.ok(result.checks.some((check) => check.id === "wiki.graph"));
    assert.ok(result.checks.some((check) => check.id === "source.registry"));
    assert.ok(result.summary.includes("Horizon doctor"));
  } finally {
    db.close();
  }
});

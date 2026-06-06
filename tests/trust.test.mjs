import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("trustSummary returns the expected shape against an empty temp DB", async () => {
  const dir = mkdtempSync(join(tmpdir(), "horizon-trust-"));
  process.env.HORIZON_DB_PATH = join(dir, "horizon.sqlite");
  const { openHorizonDb } = await import(`../scripts/horizon-db.mjs?trust=${Date.now()}`);
  const { trustSummary } = await import("../scripts/trust.mjs");
  const db = openHorizonDb();

  const summary = trustSummary(db);

  assert.equal(typeof summary.loopOk, "boolean");
  assert.equal(typeof summary.loopAgeMinutes, "number");
  assert.ok("lastCycleAt" in summary);
  assert.equal(summary.openDispatches, 0);
  assert.ok("quotaState" in summary);
  assert.equal(typeof summary.horizonSelfWip, "number");
  assert.ok(summary.horizonSelfWip >= 0);

  db.close();
});

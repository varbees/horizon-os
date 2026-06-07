import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("retrieval eval reports pass/fail cases and gates vector adapter need", async () => {
  const dir = mkdtempSync(join(tmpdir(), "horizon-retrieval-eval-"));
  process.env.HORIZON_DB_PATH = join(dir, "horizon.sqlite");
  process.env.HORIZON_VAULT_PATH = join(dir, "vault");

  const nonce = Date.now();
  const { openHorizonDb } = await import(`../scripts/horizon-db.mjs?retrievalEval=${nonce}`);
  const { syncHorizonWiki } = await import(`../scripts/wiki.mjs?retrievalEval=${nonce}`);
  const { evaluateWikiRetrieval } = await import(`../scripts/retrieval-eval.mjs?retrievalEval=${nonce}`);

  const db = openHorizonDb();
  try {
    syncHorizonWiki(db);
    const result = evaluateWikiRetrieval(db, [
      { id: "known", query: "Karpathy LLM wiki pattern", expectedPaths: ["wiki/concepts/LLM Wiki Pattern.md"] },
      { id: "miss", query: "synthetic impossible topic", expectedPaths: ["wiki/nowhere/Missing.md"] },
    ], { limit: 5 });

    assert.equal(result.total, 2);
    assert.equal(result.passed, 1);
    assert.equal(result.failed, 1);
    assert.equal(result.needsVectorAdapter, true);
    assert.equal(result.cases.find((row) => row.id === "known").pass, true);
    assert.equal(result.cases.find((row) => row.id === "miss").pass, false);
  } finally {
    db.close();
  }
});

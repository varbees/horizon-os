import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("compound wiki sync writes vault files, tracks pages, and supports search", async () => {
  const dir = mkdtempSync(join(tmpdir(), "horizon-wiki-"));
  process.env.HORIZON_DB_PATH = join(dir, "horizon.sqlite");
  process.env.HORIZON_VAULT_PATH = join(dir, "vault");

  const nonce = Date.now();
  const { openHorizonDb } = await import(`../scripts/horizon-db.mjs?wiki=${nonce}`);
  const { searchWiki, syncHorizonWiki, wikiStatus } = await import(`../scripts/wiki.mjs?wiki=${nonce}`);

  const db = openHorizonDb();
  try {
    const result = syncHorizonWiki(db);
    assert.equal(result.sources, 3);
    assert.ok(result.files.includes("WIKI.md"));
    assert.ok(result.files.includes("AGENTS.md"));
    assert.ok(result.files.includes("wiki/index.md"));
    assert.ok(result.files.includes("wiki/hot.md"));
    assert.ok(result.files.includes(".raw/horizon-intelligence/turbovec.md"));

    for (const path of ["WIKI.md", "AGENTS.md", "wiki/index.md", "wiki/hot.md", "wiki/log.md"]) {
      assert.ok(existsSync(join(process.env.HORIZON_VAULT_PATH, path)), `expected ${path}`);
    }

    const schema = readFileSync(join(process.env.HORIZON_VAULT_PATH, "WIKI.md"), "utf8");
    assert.match(schema, /immutable raw sources/i);
    assert.match(schema, /turbovec/i);

    const status = wikiStatus(db);
    assert.equal(status.rawSourceCount, 3);
    assert.ok(status.wikiPageCount >= 11);
    assert.ok(status.chunkCount >= status.wikiPageCount);
    assert.equal(status.retrieval.current, "hot-index-markdown-fts");
    assert.equal(status.retrieval.vectorCandidate, "turbovec");

    const results = searchWiki(db, "turbovec local vector", { limit: 5 });
    assert.ok(results.length > 0);
    assert.ok(results.some((row) => /turbovec/i.test(`${row.title} ${row.path} ${row.snippet}`)));
  } finally {
    db.close();
  }
});

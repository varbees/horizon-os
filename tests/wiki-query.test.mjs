import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("wiki query modes build packets and capture explicit gaps", async () => {
  const dir = mkdtempSync(join(tmpdir(), "horizon-wiki-query-"));
  process.env.HORIZON_DB_PATH = join(dir, "horizon.sqlite");
  process.env.HORIZON_VAULT_PATH = join(dir, "vault");

  const nonce = Date.now();
  const { openHorizonDb } = await import(`../scripts/horizon-db.mjs?query=${nonce}`);
  const { queryWiki, syncHorizonWiki } = await import(`../scripts/wiki.mjs?query=${nonce}`);

  const db = openHorizonDb();
  try {
    syncHorizonWiki(db);

    const quick = queryWiki(db, { question: "What is current Horizon context?", mode: "quick" });
    assert.equal(quick.mode, "quick");
    assert.deepEqual(quick.requiredPages.map((page) => page.path), ["wiki/hot.md", "wiki/index.md"]);
    assert.equal(quick.searchResults.length, 0);
    assert.match(quick.contextMarkdown, /Quick query packet/i);

    const standard = queryWiki(db, { question: "PhotoSelect payment proof revenue engine", mode: "standard" });
    assert.equal(standard.mode, "standard");
    assert.ok(standard.searchResults.length > 0);
    assert.ok(standard.searchResults.some((row) => row.path === "wiki/entities/PhotoSelect.md"));
    assert.deepEqual(standard.gaps, []);

    const deepGap = queryWiki(db, {
      question: "Which buyer proof exists for quantum yak socks in Horizon?",
      mode: "deep",
      captureGap: true,
    });
    assert.equal(deepGap.mode, "deep");
    assert.ok(deepGap.gaps.some((gap) => gap.kind === "insufficient-memory"));
    assert.ok(deepGap.files.includes("wiki/meta/gaps.md"));
    assert.ok(existsSync(join(process.env.HORIZON_VAULT_PATH, "wiki/meta/gaps.md")));

    const gapsPage = readFileSync(join(process.env.HORIZON_VAULT_PATH, "wiki/meta/gaps.md"), "utf8");
    assert.match(gapsPage, /quantum yak socks/);
    assert.match(gapsPage, /insufficient-memory/);

    const latestRun = db.prepare("SELECT kind, summary FROM wiki_runs ORDER BY created_at DESC LIMIT 1").get();
    assert.equal(latestRun.kind, "query-gap");
    assert.match(latestRun.summary, /quantum yak socks/);
  } finally {
    db.close();
  }
});

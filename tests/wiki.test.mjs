import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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
    assert.ok(result.files.includes("wiki/meta/Living Memory Backlog.md"));
    assert.ok(result.files.includes(".raw/horizon-intelligence/turbovec.md"));

    for (const path of ["WIKI.md", "AGENTS.md", "wiki/index.md", "wiki/hot.md", "wiki/log.md", "wiki/meta/Living Memory Backlog.md"]) {
      assert.ok(existsSync(join(process.env.HORIZON_VAULT_PATH, path)), `expected ${path}`);
    }

    const schema = readFileSync(join(process.env.HORIZON_VAULT_PATH, "WIKI.md"), "utf8");
    assert.match(schema, /immutable raw sources/i);
    assert.match(schema, /turbovec/i);

    const backlog = readFileSync(join(process.env.HORIZON_VAULT_PATH, "wiki/meta/Living Memory Backlog.md"), "utf8");
    assert.match(backlog, /Source Coverage Pack/);
    assert.match(backlog, /Query-To-Page Capture/);
    assert.match(backlog, /Agent Preflight Context Pack/);

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

test("source ingest compiles a file into raw evidence, wikilinks, log, and searchable synthesis", async () => {
  const dir = mkdtempSync(join(tmpdir(), "horizon-wiki-ingest-"));
  process.env.HORIZON_DB_PATH = join(dir, "horizon.sqlite");
  process.env.HORIZON_VAULT_PATH = join(dir, "vault");

  const sourcePath = join(dir, "studio-buyer-signal.md");
  writeFileSync(
    sourcePath,
    [
      "# Studio Buyer Signal Memo",
      "",
      "PhotoSelect has buyer evidence from a studio asking for payment proof and guest gallery delivery.",
      "",
      "Contradiction: an older note said there was no studio demand yet.",
      "",
      "## Next",
      "",
      "- Deploy the payment proof path.",
      "- Preserve rateguard as the fast-cash lane, not a distraction.",
      "",
    ].join("\n"),
    "utf8",
  );

  const nonce = Date.now();
  const { openHorizonDb } = await import(`../scripts/horizon-db.mjs?ingest=${nonce}`);
  const { ingestWikiSource, searchWiki, syncHorizonWiki } = await import(`../scripts/wiki.mjs?ingest=${nonce}`);

  const db = openHorizonDb();
  try {
    syncHorizonWiki(db);
    const result = ingestWikiSource(db, { sourcePath });

    assert.equal(result.skipped, false);
    assert.equal(result.title, "Studio Buyer Signal Memo");
    assert.ok(result.files.includes("wiki/sources/Studio Buyer Signal Memo.md"));
    assert.ok(result.files.includes("wiki/meta/contradictions.md"));
    assert.ok(result.rawPath.startsWith(".raw/horizon-ingest/"));

    const raw = readFileSync(join(process.env.HORIZON_VAULT_PATH, result.rawPath), "utf8");
    assert.match(raw, /PhotoSelect has buyer evidence/);

    const page = readFileSync(join(process.env.HORIZON_VAULT_PATH, "wiki/sources/Studio Buyer Signal Memo.md"), "utf8");
    assert.match(page, /\[\[PhotoSelect\]\]/);
    assert.match(page, /\[\[rateguard\]\]/);
    assert.match(page, /> \[!contradiction\]/);

    const contradictions = readFileSync(join(process.env.HORIZON_VAULT_PATH, "wiki/meta/contradictions.md"), "utf8");
    assert.match(contradictions, /older note said there was no studio demand yet/);

    const log = readFileSync(join(process.env.HORIZON_VAULT_PATH, "wiki/log.md"), "utf8");
    assert.match(log, /ingest \| Studio Buyer Signal Memo/);

    const results = searchWiki(db, "studio buyer payment proof", { limit: 5 });
    assert.ok(results.some((row) => row.path === "wiki/sources/Studio Buyer Signal Memo.md"));

    const cleanSourcePath = join(dir, "clean-followup.md");
    writeFileSync(cleanSourcePath, "# Clean Followup\n\nPhotoSelect payment proof remains the next evidence step.\n", "utf8");
    ingestWikiSource(db, { sourcePath: cleanSourcePath });
    const rebuiltContradictions = readFileSync(join(process.env.HORIZON_VAULT_PATH, "wiki/meta/contradictions.md"), "utf8");
    assert.match(rebuiltContradictions, /older note said there was no studio demand yet/);
    assert.doesNotMatch(rebuiltContradictions, /\[\[Studio Buyer Signal Memo\]\]: > \[!contradiction\]/);

    const skipped = ingestWikiSource(db, { sourcePath });
    assert.equal(skipped.skipped, true);
  } finally {
    db.close();
  }
});

test("source coverage ingests a curated source list and writes a coverage report", async () => {
  const dir = mkdtempSync(join(tmpdir(), "horizon-wiki-coverage-"));
  process.env.HORIZON_DB_PATH = join(dir, "horizon.sqlite");
  process.env.HORIZON_VAULT_PATH = join(dir, "vault");

  const first = join(dir, "coverage-one.md");
  const second = join(dir, "coverage-two.md");
  const missing = join(dir, "missing.md");
  writeFileSync(first, "# Coverage One\n\nPhotoSelect payment proof and buyer evidence should be remembered.\n", "utf8");
  writeFileSync(second, "# Coverage Two\n\nrateguard launch notes and hosted dashboard gating should be remembered.\n", "utf8");

  const nonce = Date.now();
  const { openHorizonDb } = await import(`../scripts/horizon-db.mjs?coverage=${nonce}`);
  const { runWikiSourceCoverage, searchWiki, syncHorizonWiki } = await import(`../scripts/wiki.mjs?coverage=${nonce}`);

  const db = openHorizonDb();
  try {
    syncHorizonWiki(db);
    const sources = [
      { id: "coverage-one", path: first, title: "Coverage One", tags: ["coverage-test"] },
      { id: "coverage-two", path: second, title: "Coverage Two", tags: ["coverage-test"] },
      { id: "coverage-missing", path: missing, title: "Coverage Missing", tags: ["coverage-test"] },
    ];
    const result = runWikiSourceCoverage(db, { sources });

    assert.equal(result.total, 3);
    assert.equal(result.available, 2);
    assert.equal(result.missing, 1);
    assert.equal(result.ingested, 2);
    assert.equal(result.skipped, 0);
    assert.ok(result.files.includes("wiki/meta/Source Coverage Report.md"));

    const report = readFileSync(join(process.env.HORIZON_VAULT_PATH, "wiki/meta/Source Coverage Report.md"), "utf8");
    assert.match(report, /Coverage One/);
    assert.match(report, /Coverage Two/);
    assert.match(report, /Coverage Missing/);
    assert.match(report, /missing/);

    const hits = searchWiki(db, "hosted dashboard gating", { limit: 5 });
    assert.ok(hits.some((row) => row.path === "wiki/sources/Coverage Two.md"));

    const rerun = runWikiSourceCoverage(db, { sources });
    assert.equal(rerun.ingested, 0);
    assert.equal(rerun.skipped, 2);
  } finally {
    db.close();
  }
});

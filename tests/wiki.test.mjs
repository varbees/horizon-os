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
    assert.equal(status.retrieval.current, "hot-index-chunk-bm25-lite");
    assert.equal(status.retrieval.vectorCandidate, "turbovec");

    const chunk = db.prepare("SELECT body FROM wiki_chunks WHERE page_path = 'wiki/entities/PhotoSelect.md' LIMIT 1").get();
    assert.match(chunk.body, /page: PhotoSelect/);
    assert.match(chunk.body, /kind: entity/);

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

test("query capture writes a durable question page and indexes it for search", async () => {
  const dir = mkdtempSync(join(tmpdir(), "horizon-wiki-capture-"));
  process.env.HORIZON_DB_PATH = join(dir, "horizon.sqlite");
  process.env.HORIZON_VAULT_PATH = join(dir, "vault");

  const nonce = Date.now();
  const { openHorizonDb } = await import(`../scripts/horizon-db.mjs?capture=${nonce}`);
  const { captureWikiAnswer, searchWiki, syncHorizonWiki } = await import(`../scripts/wiki.mjs?capture=${nonce}`);

  const db = openHorizonDb();
  try {
    syncHorizonWiki(db);
    const result = captureWikiAnswer(db, {
      question: "What should Horizon remember about PhotoSelect payment proof?",
      answer: "PhotoSelect payment proof is the next revenue-engine evidence step. Keep rateguard separate as the fast-cash lane.",
      title: "PhotoSelect Payment Proof Memory",
      links: [{ path: "wiki/entities/PhotoSelect.md", title: "PhotoSelect" }],
    });

    assert.equal(result.title, "PhotoSelect Payment Proof Memory");
    assert.equal(result.path, "wiki/questions/PhotoSelect Payment Proof Memory.md");
    assert.ok(result.files.includes("wiki/questions/PhotoSelect Payment Proof Memory.md"));
    assert.ok(result.files.includes("wiki/index.md"));
    assert.ok(result.files.includes("wiki/hot.md"));
    assert.ok(result.files.includes("wiki/log.md"));

    const page = readFileSync(join(process.env.HORIZON_VAULT_PATH, result.path), "utf8");
    assert.match(page, /PhotoSelect payment proof is the next revenue-engine evidence step/);
    assert.match(page, /\[\[PhotoSelect\]\]/);

    const hits = searchWiki(db, "payment proof revenue engine evidence", { limit: 5 });
    assert.ok(hits.some((row) => row.path === result.path));

    const log = readFileSync(join(process.env.HORIZON_VAULT_PATH, "wiki/log.md"), "utf8");
    assert.match(log, /query \| PhotoSelect Payment Proof Memory/);

    const latestRun = db.prepare("SELECT kind, summary FROM wiki_runs ORDER BY created_at DESC LIMIT 1").get();
    assert.equal(latestRun.kind, "query-capture");
    assert.match(latestRun.summary, /PhotoSelect Payment Proof Memory/);
  } finally {
    db.close();
  }
});

test("wiki lint writes a repair plan with machine-readable fixes", async () => {
  const dir = mkdtempSync(join(tmpdir(), "horizon-wiki-lint-"));
  process.env.HORIZON_DB_PATH = join(dir, "horizon.sqlite");
  process.env.HORIZON_VAULT_PATH = join(dir, "vault");

  const nonce = Date.now();
  const { openHorizonDb } = await import(`../scripts/horizon-db.mjs?lint=${nonce}`);
  const { captureWikiAnswer, runWikiLint, syncHorizonWiki } = await import(`../scripts/wiki.mjs?lint=${nonce}`);

  const db = openHorizonDb();
  try {
    syncHorizonWiki(db);
    captureWikiAnswer(db, {
      question: "Which missing page should lint detect?",
      answer: "This answer intentionally references [[Unmade Memory Node]] so lint can produce a repair.",
      title: "Lint Broken Link Fixture",
    });
    writeFileSync(
      join(process.env.HORIZON_VAULT_PATH, "wiki/questions/Lint Broken Link Fixture.md"),
      [
        "---",
        "type: question",
        "title: \"Lint Broken Link Fixture\"",
        "tags: [horizon-query]",
        "---",
        "",
        "# Lint Broken Link Fixture",
        "",
        "## Empty Evidence",
        "",
        "## Answer",
        "",
        "This answer intentionally references [[Unmade Memory Node]] so lint can produce a repair.",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = runWikiLint(db);
    assert.ok(result.files.includes("wiki/meta/Wiki Repair Plan.md"));
    assert.ok(result.repairs.some((repair) => repair.type === "missing-link" && repair.target === "Unmade Memory Node"));
    assert.ok(result.missingLinks.some((link) => link.to === "Unmade Memory Node"));
    assert.ok(result.frontmatterGaps.some((gap) => gap.path === "wiki/questions/Lint Broken Link Fixture.md" && gap.missing.includes("updated")));
    assert.ok(result.emptySections.some((section) => section.path === "wiki/questions/Lint Broken Link Fixture.md" && section.heading === "Empty Evidence"));

    const report = readFileSync(join(process.env.HORIZON_VAULT_PATH, "wiki/meta/Wiki Repair Plan.md"), "utf8");
    assert.match(report, /Unmade Memory Node/);
    assert.match(report, /missing-link/);
    assert.match(report, /frontmatter-gap/);
    assert.match(report, /empty-section/);

    const latestRun = db.prepare("SELECT kind, summary FROM wiki_runs ORDER BY created_at DESC LIMIT 1").get();
    assert.equal(latestRun.kind, "lint");
    assert.match(latestRun.summary, /Wiki lint:/);
  } finally {
    db.close();
  }
});

test("outcome learning compiles closed actions, outcomes, and work events", async () => {
  const dir = mkdtempSync(join(tmpdir(), "horizon-wiki-outcomes-"));
  process.env.HORIZON_DB_PATH = join(dir, "horizon.sqlite");
  process.env.HORIZON_VAULT_PATH = join(dir, "vault");

  const nonce = Date.now();
  const { openHorizonDb } = await import(`../scripts/horizon-db.mjs?outcomes=${nonce}`);
  const { searchWiki, syncHorizonWiki } = await import(`../scripts/wiki.mjs?outcomes=${nonce}`);

  const db = openHorizonDb();
  try {
    db.prepare(`
      INSERT INTO action_queue (
        id, title, summary, project_id, agent, status, state, lane,
        priority_score, verified_at, outcome_code, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "closed-payment-proof",
      "Verify payment proof",
      "Studio payment proof shipped and browser smoke passed.",
      "photoselect",
      "codex",
      "done",
      "closed",
      "revenue-engine",
      90,
      "2026-06-07T00:00:00Z",
      "proof-shipped",
      "2026-06-07T00:00:00Z",
    );
    db.prepare(`
      INSERT INTO outcomes (project_id, kind, amount_cents, currency, source, occurred_at)
      VALUES ('photoselect', 'proof', 10000, 'INR', 'payment-proof', '2026-06-07T00:00:00Z')
    `).run();
    db.prepare(`
      INSERT INTO work_events (project_id, kind, payload_json, occurred_at)
      VALUES ('photoselect', 'dispatch_reconciled', ?, '2026-06-07T00:00:00Z')
    `).run(JSON.stringify({ summary: "Dispatch produced a reviewable proof PR." }));

    const result = syncHorizonWiki(db);
    assert.ok(result.files.includes("wiki/domains/Outcome Learning.md"));

    const page = readFileSync(join(process.env.HORIZON_VAULT_PATH, "wiki/domains/Outcome Learning.md"), "utf8");
    assert.match(page, /Verify payment proof/);
    assert.match(page, /proof-shipped/);
    assert.match(page, /10000 INR/);
    assert.match(page, /Dispatch produced a reviewable proof PR/);

    const hits = searchWiki(db, "proof-shipped reviewable proof PR", { limit: 5 });
    assert.ok(hits.some((row) => row.path === "wiki/domains/Outcome Learning.md"));
  } finally {
    db.close();
  }
});

test("contradictions carry stable resolution status", async () => {
  const dir = mkdtempSync(join(tmpdir(), "horizon-wiki-contradictions-"));
  process.env.HORIZON_DB_PATH = join(dir, "horizon.sqlite");
  process.env.HORIZON_VAULT_PATH = join(dir, "vault");

  const sourcePath = join(dir, "contradiction-source.md");
  writeFileSync(
    sourcePath,
    [
      "# Contradiction Source",
      "",
      "Contradiction: older plan says PhotoSelect has no buyer proof, but current evidence says payment proof exists.",
      "",
    ].join("\n"),
    "utf8",
  );

  const nonce = Date.now();
  const { openHorizonDb } = await import(`../scripts/horizon-db.mjs?contradiction=${nonce}`);
  const { ingestWikiSource, syncHorizonWiki, updateContradictionStatus } = await import(`../scripts/wiki.mjs?contradiction=${nonce}`);

  const db = openHorizonDb();
  try {
    syncHorizonWiki(db);
    ingestWikiSource(db, { sourcePath });
    const pagePath = join(process.env.HORIZON_VAULT_PATH, "wiki/meta/contradictions.md");
    const page = readFileSync(pagePath, "utf8");
    const id = page.match(/\|\s+(c-[a-f0-9]+)\s+\|\s+open\s+\|/)?.[1];
    assert.ok(id, "expected stable contradiction id");

    const result = updateContradictionStatus(db, { id, status: "resolved", note: "Payment proof evidence superseded the older claim." });
    assert.equal(result.status, "resolved");
    assert.ok(result.files.includes(".vault-meta/contradictions.json"));
    assert.ok(result.files.includes("wiki/meta/contradictions.md"));

    const updated = readFileSync(pagePath, "utf8");
    assert.match(updated, new RegExp(`\\| ${id} \\| resolved \\|`));
    assert.match(updated, /Payment proof evidence superseded the older claim/);

    const statusFile = readFileSync(join(process.env.HORIZON_VAULT_PATH, ".vault-meta/contradictions.json"), "utf8");
    assert.match(statusFile, /"status": "resolved"/);
  } finally {
    db.close();
  }
});

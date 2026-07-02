import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";

const originalDbPath = process.env.HORIZON_DB_PATH;

afterEach(() => {
  if (originalDbPath === undefined) delete process.env.HORIZON_DB_PATH;
  else process.env.HORIZON_DB_PATH = originalDbPath;
});

test("ingestAgents is idempotent and keeps stable catalog IDs", async () => {
  const dir = mkdtempSync(join(tmpdir(), "horizon-agent-ingest-"));
  process.env.HORIZON_DB_PATH = join(dir, "horizon.sqlite");
  const readmePath = join(dir, "README.md");
  writeFileSync(
    readmePath,
    [
      "# Awesome LLM Apps",
      "",
      "### RAG Apps",
      "* [🔎 RAG Search Agent](rag-agent)",
      "* [Agency Team Builder](https://github.com/example/team-builder)",
      "",
      "### Coding Agents",
      "* [Code Review Agent](./code-review)",
      "* [🎙️ Voice Dictation Agent](https://github.com/example/voice) <sub>↗ external</sub>",
      "",
    ].join("\n"),
  );

  const { openHorizonDb } = await import(`../scripts/horizon-db.mjs?test=${Date.now()}-${Math.random()}`);
  const db = openHorizonDb();
  const { ingestAgents } = await import(`../scripts/ingest-agents.mjs?test=${Date.now()}-${Math.random()}`);
  db.prepare("INSERT INTO agent_catalog (id, name, category, revenue_model, github_url) VALUES (?, ?, ?, ?, ?)")
    .run("stale-random-id", "Old Duplicate", "Old", "Old", "https://example.com/old");

  const first = ingestAgents({ db, readmePath });
  const second = ingestAgents({ db, readmePath });

  assert.equal(first.scanned, 4);
  assert.equal(second.scanned, 4);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM agent_catalog").get().count, 4);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM agent_catalog WHERE id = 'stale-random-id'").get().count, 0);

  const rag = db.prepare("SELECT id, name, category, revenue_model, github_url FROM agent_catalog WHERE name = ?").get("RAG Search Agent");
  assert.equal(rag.id, "rag-apps-rag-search-agent");
  assert.equal(rag.category, "RAG Apps");
  assert.match(rag.revenue_model, /RAG-as-a-Service/);
  assert.equal(rag.github_url, "https://github.com/Shubhamsaboo/awesome-llm-apps/tree/main/rag-agent");

  const code = db.prepare("SELECT id, github_url FROM agent_catalog WHERE name = ?").get("Code Review Agent");
  assert.equal(code.id, "coding-agents-code-review-agent");
  assert.equal(code.github_url, "https://github.com/Shubhamsaboo/awesome-llm-apps/tree/main/code-review");

  const voice = db.prepare("SELECT id, description FROM agent_catalog WHERE name = ?").get("Voice Dictation Agent");
  assert.equal(voice.id, "coding-agents-voice-dictation-agent");
  assert.equal(voice.description, "");
  db.close();
});

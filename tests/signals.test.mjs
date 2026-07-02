import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("signal source seed is tuned to founder revenue and market execution", async () => {
  const { retiredSignalSourceIds, signalCategories, signalSourceSeed } = await import("../src/data/horizon.js");
  const categories = new Set(signalCategories);
  const sources = new Map(signalSourceSeed.map((source) => [source.id, source]));

  for (const category of [
    "Founder Operators",
    "GTM & Sales",
    "India Market",
    "Photo & Creator Market",
    "Agentic Engineering",
    "AI Tool Releases",
  ]) {
    assert.ok(categories.has(category), `missing category ${category}`);
  }

  for (const id of [
    "yc-blog",
    "saastr",
    "plausible",
    "yourstory",
    "officechai-startups",
    "petapixel",
    "openai",
    "cloudflare",
  ]) {
    assert.ok(sources.has(id), `missing source ${id}`);
  }

  assert.ok(signalSourceSeed.length <= 24, "default refresh should stay bounded");
  assert.equal(sources.has("verge"), false, "generic tech firehoses should not be default sources");
  assert.equal([...sources.values()].some((source) => source.kind === "reddit"), false, "Reddit feeds 429 too often for default refresh");
  assert.deepEqual(
    retiredSignalSourceIds,
    [
      "techcrunch-ai",
      "verge",
      "r-localllama",
      "r-claudeai",
      "r-machinelearning",
      "yt-twominutepapers",
      "yt-aiexplained",
    ],
  );
});

test("db seed retires old noisy default signal sources without deleting rows", async () => {
  const dir = mkdtempSync(join(tmpdir(), "horizon-signals-"));
  process.env.HORIZON_DB_PATH = join(dir, "horizon.sqlite");
  const { openHorizonDb } = await import(`../scripts/horizon-db.mjs?test=${Date.now()}-${Math.random()}`);

  let db = openHorizonDb();
  db.prepare("INSERT OR REPLACE INTO signal_sources (id, name, url, category, kind, active) VALUES ('verge', 'The Verge', 'https://www.theverge.com/rss/index.xml', 'AI News Hubs', 'rss', 1)").run();
  db.close();

  db = openHorizonDb();
  const retired = db.prepare("SELECT active FROM signal_sources WHERE id = 'verge'").get();
  assert.equal(retired.active, 0);
  db.close();
});

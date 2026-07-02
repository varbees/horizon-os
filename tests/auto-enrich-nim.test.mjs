import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";

const originalFetch = globalThis.fetch;
const originalEnv = {
  HORIZON_DB_PATH: process.env.HORIZON_DB_PATH,
  HORIZON_ENRICH_DELAY_MS: process.env.HORIZON_ENRICH_DELAY_MS,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  NVIDIA_NIM_API_KEY: process.env.NVIDIA_NIM_API_KEY,
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function restoreEnvKey(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

test("autoEnrich can use NIM when Gemini is unavailable", async () => {
  const dir = mkdtempSync(join(tmpdir(), "horizon-nim-enrich-"));
  process.env.HORIZON_DB_PATH = join(dir, "horizon.sqlite");
  process.env.HORIZON_ENRICH_DELAY_MS = "0";
  process.env.GEMINI_API_KEY = "";
  process.env.NVIDIA_NIM_API_KEY = "nim-test-key";

  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                goal: "Ship a concrete Horizon OS test slice",
                constraints: "No secrets\nNo network writes",
                done_criteria: "Node test passes\nRow is enriched",
                tools: "node --test tests/auto-enrich-nim.test.mjs",
                prompt: "Implement the fallback and verify it.",
              }),
            },
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  const { openHorizonDb } = await import(`../scripts/horizon-db.mjs?test=${Date.now()}-${Math.random()}`);
  const db = openHorizonDb();
  db.prepare(`
    INSERT INTO action_queue (id, title, summary, source, project_id, project_path, status, sort_order, enriched, goal)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "nim-fallback-action",
    "NIM fallback action",
    "Exercise the secondary model path",
    "test",
    "horizon-os",
    "/tmp/horizon-os",
    "suggested",
    -999,
    0,
    "",
  );

  const { autoEnrich } = await import(`../scripts/auto-enrich.mjs?test=${Date.now()}-${Math.random()}`);
  const result = await autoEnrich({ db, limit: 1 });

  assert.equal(result.ok, true);
  assert.equal(result.enriched, 1);
  assert.equal(result.providerCounts.gemini, 0);
  assert.equal(result.providerCounts.nim, 1);
  assert.equal(calls.length, 1);

  const row = db.prepare("SELECT goal, constraints, done_criteria, tools, prompt, cwd, enriched FROM action_queue WHERE id = ?").get("nim-fallback-action");
  assert.equal(row.enriched, 1);
  assert.equal(row.goal, "Ship a concrete Horizon OS test slice");
  assert.match(row.constraints, /No secrets/);
  assert.match(row.done_criteria, /Node test passes/);
  assert.match(row.tools, /node --test/);
  assert.equal(row.prompt, "Implement the fallback and verify it.");
  assert.equal(row.cwd, "/tmp/horizon-os");
  db.close();
});

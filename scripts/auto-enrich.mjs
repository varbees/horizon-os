import "./env.mjs";

// Auto-enrich un-enriched actions with the Gemini worker. Runs after a sweep /
// revenue-action generation so new actions arrive as runnable specs. Quota-safe:
// stops cleanly on rate limits and never blocks the operating loop.

import { openHorizonDb } from "./horizon-db.mjs";
import { enrichAction, geminiAvailable } from "./gemini.mjs";

const LIMIT = Number(process.env.HORIZON_ENRICH_LIMIT ?? process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 6);
const DELAY_MS = Number(process.env.HORIZON_ENRICH_DELAY_MS ?? 1200);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function autoEnrich({ limit = LIMIT, db: providedDb } = {}) {
  if (!geminiAvailable()) return { ok: false, reason: "gemini_key_missing", enriched: 0 };
  const db = providedDb ?? openHorizonDb();
  const rows = db
    .prepare("SELECT * FROM action_queue WHERE enriched = 0 AND (goal IS NULL OR goal = '') AND status != 'dismissed' ORDER BY sort_order, created_at LIMIT ?")
    .all(limit);
  let enriched = 0;
  let stoppedForQuota = false;
  const errors = [];
  for (const action of rows) {
    try {
      const f = await enrichAction(action);
      db.prepare(
        `UPDATE action_queue SET goal = ?, constraints = ?, done_criteria = ?, tools = ?, prompt = ?,
           cwd = COALESCE(NULLIF(cwd,''), ?), enriched = 1, updated_at = datetime('now') WHERE id = ?`,
      ).run(f.goal, f.constraints, f.done_criteria, f.tools, f.prompt || action.prompt, action.project_path || "", action.id);
      enriched += 1;
    } catch (error) {
      const msg = String(error.message ?? error);
      if (/429|quota|rate/i.test(msg)) {
        stoppedForQuota = true;
        break;
      }
      errors.push({ id: action.id, error: msg.slice(0, 120) });
    }
    await sleep(DELAY_MS);
  }
  if (!providedDb) db.close();
  return { ok: true, candidates: rows.length, enriched, stoppedForQuota, errors };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  autoEnrich().then((r) => {
    console.log(JSON.stringify(r, null, 2));
    process.exit(0);
  });
}

import "./env.mjs";

// Auto-enrich un-enriched actions with the configured model workers. Runs after a
// sweep / revenue-action generation so new actions arrive as runnable specs.
// Quota-safe: Gemini failures can fall through to NIM, and the loop never blocks.

import { openHorizonDb } from "./horizon-db.mjs";
import {
  enrichActionWithAvailableProvider as enrichWithProvider,
  llmAvailable as providersAvailable,
  providerCountsSeed,
} from "./llm-providers.mjs";
import { redactForLog } from "./redact.mjs";

const LIMIT = Number(process.env.HORIZON_ENRICH_LIMIT ?? process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 6);
const DELAY_MS = Number(process.env.HORIZON_ENRICH_DELAY_MS ?? 1200);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const quotaPattern = /429|quota|rate|resource exhausted/i;

function cleanError(error) {
  return redactForLog(String(error?.message ?? error));
}

export function llmAvailable() {
  return providersAvailable();
}

export async function enrichActionWithAvailableProvider(action, selection = {}) {
  return enrichWithProvider(action, selection);
}

export async function autoEnrich({ limit = LIMIT, db: providedDb, delayMs = DELAY_MS, provider, model, composeContext } = {}) {
  const providerCounts = providerCountsSeed();
  if (!llmAvailable()) return { ok: false, reason: "no_llm_keys", enriched: 0, providerCounts };
  const db = providedDb ?? openHorizonDb();
  const rows = db
    .prepare("SELECT * FROM action_queue WHERE enriched = 0 AND (goal IS NULL OR goal = '') AND status != 'dismissed' ORDER BY sort_order, created_at LIMIT ?")
    .all(limit);
  let enriched = 0;
  let stoppedForQuota = false;
  const errors = [];
  for (const action of rows) {
    try {
      if (composeContext) {
        try { action._groundingContext = await composeContext(action); } catch { /* grounding optional */ }
      }
      const { fields: f, provider: usedProvider } = await enrichActionWithAvailableProvider(action, { provider, model });
      db.prepare(
        `UPDATE action_queue SET goal = ?, constraints = ?, done_criteria = ?, tools = ?, prompt = ?,
           cwd = COALESCE(NULLIF(cwd,''), ?), enriched = 1, updated_at = datetime('now') WHERE id = ?`,
      ).run(f.goal, f.constraints, f.done_criteria, f.tools, f.prompt || action.prompt, action.project_path || "", action.id);
      providerCounts[usedProvider] = (providerCounts[usedProvider] ?? 0) + 1;
      enriched += 1;
    } catch (error) {
      const msg = cleanError(error);
      if (error?.stoppedForQuota || quotaPattern.test(msg)) {
        stoppedForQuota = true;
        break;
      }
      errors.push({ id: action.id, error: msg.slice(0, 120) });
    }
    if (delayMs > 0) await sleep(delayMs);
  }
  if (!providedDb) db.close();
  return { ok: true, candidates: rows.length, enriched, stoppedForQuota, providerCounts, errors };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  autoEnrich().then((r) => {
    console.log(JSON.stringify(r, null, 2));
    process.exit(0);
  });
}

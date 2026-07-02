import { randomUUID } from "node:crypto";
import { renderLanePrompt } from "./content-prompts.mjs";
import { runClaudeCode, claudeCodeHealth } from "./executors/claude-code.mjs";

// Horizon OS — the autonomous content stage of the operating loop.
//
// Turns opted-in content briefs into reviewable drafts on their own, using the native Claude Code
// executor. It only advances the FREE, reversible lanes (research -> editorial package) and stops
// at the manual gates by design:
//   - asset generation spends HuggingFace/Higgsfield credits -> stays operator-triggered
//   - publish is always human (no auto-posting)
//
// Discipline (matches the loop + content-engine guardrails):
//   - Opt-in only: a brief auto-advances only when `automate = 1`.
//   - One lane per brief per cycle, capped by `limit`, so quota is spent deliberately.
//   - Never throws: a single brief failing never stops the loop; a Claude Code failure becomes a
//     no-op (the brief keeps its status and is retried next cycle, or the operator runs it by hand).
//   - Bounded by `auto_max_status`: the loop will not take a brief past that lane.

const STATUS_ORDER = ["draft", "researched", "asset_planned", "packaged", "review", "published"];
function statusRank(status) {
  const i = STATUS_ORDER.indexOf(status);
  return i === -1 ? 0 : i;
}

// The next free lane to run for a brief, or null if it is at/over its ceiling or on a manual gate.
function nextLane(brief) {
  const ceiling = statusRank(brief.auto_max_status || "packaged");
  if (statusRank(brief.status) >= ceiling) return null;
  if (brief.status === "draft") return "research";
  if (brief.status === "researched") return "assemble"; // editorial package (free, no credits)
  return null; // asset_planned/packaged onward => manual (credits / publish)
}

function writeRun(db, briefId, lane, status, payload) {
  db.prepare(
    "INSERT INTO pipeline_runs (id, brief_id, lane, executor, status, input_json, output_json, finished_at) VALUES (?, ?, ?, 'claude-code', ?, '{}', ?, datetime('now'))",
  ).run(randomUUID(), briefId, lane, status, JSON.stringify(payload ?? {}));
}

function asJsonArray(value) {
  return Array.isArray(value) ? JSON.stringify(value) : value ?? "[]";
}

// Persist an editorial-lane JSON result into content_packages (upsert one row per brief).
function writeEditorialPackage(db, briefId, pkg) {
  const existing = db.prepare("SELECT id FROM content_packages WHERE brief_id = ? ORDER BY updated_at DESC LIMIT 1").get(briefId);
  const id = existing?.id ?? randomUUID();
  db.prepare(`INSERT INTO content_packages
    (id, brief_id, blog, x_thread_json, linkedin, instagram_caption, reel_script_json, alt_text, cta_json, checklist_json, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'qa_ready')
    ON CONFLICT(id) DO UPDATE SET
      blog = excluded.blog, x_thread_json = excluded.x_thread_json, linkedin = excluded.linkedin,
      instagram_caption = excluded.instagram_caption, reel_script_json = excluded.reel_script_json,
      alt_text = excluded.alt_text, cta_json = excluded.cta_json, checklist_json = excluded.checklist_json,
      status = excluded.status, updated_at = datetime('now')`).run(
    id,
    briefId,
    pkg.blog ?? "",
    asJsonArray(pkg.x_thread ?? pkg.x_thread_json),
    pkg.linkedin ?? "",
    pkg.instagram_caption ?? "",
    asJsonArray(pkg.reel_script ?? pkg.reel_script_json),
    pkg.alt_text ?? "",
    asJsonArray(pkg.cta ?? pkg.cta_json),
    asJsonArray(pkg.checklist ?? pkg.checklist_json),
  );
  return id;
}

// Advance one brief by exactly one free lane. Returns { lane, ok, reason }. Never throws.
export async function advanceBrief(db, brief, { timeoutMs = 180000, cwd } = {}) {
  const lane = nextLane(brief);
  if (!lane) return { id: brief.id, lane: null, ok: false, reason: "no_free_lane" };

  const rendered = renderLanePrompt(lane, brief);
  if (!rendered) return { id: brief.id, lane, ok: false, reason: "no_prompt" };

  db.prepare("UPDATE content_briefs SET auto_last_run_at = datetime('now') WHERE id = ?").run(brief.id);

  let out;
  try {
    out = await runClaudeCode(rendered.rendered, { maxTurns: 16, timeoutMs, cwd });
  } catch (error) {
    out = { ok: false, error: String(error?.message ?? error) };
  }

  if (!out.ok) {
    writeRun(db, brief.id, lane, "handoff", { reason: out.error });
    return { id: brief.id, lane, ok: false, reason: out.error };
  }

  if (lane === "research") {
    const research = out.json ?? { summary: out.result };
    db.prepare("UPDATE content_briefs SET research_json = ?, status = 'researched', updated_at = datetime('now') WHERE id = ?")
      .run(JSON.stringify(research), brief.id);
    writeRun(db, brief.id, lane, "completed", { durationMs: out.durationMs, hasJson: Boolean(out.json) });
    return { id: brief.id, lane, ok: true, status: "researched" };
  }

  // assemble (editorial package)
  const pkg = out.json ?? null;
  if (!pkg || typeof pkg !== "object") {
    writeRun(db, brief.id, lane, "handoff", { reason: "editorial_not_json" });
    return { id: brief.id, lane, ok: false, reason: "editorial_not_json" };
  }
  writeEditorialPackage(db, brief.id, pkg);
  db.prepare("UPDATE content_briefs SET status = 'packaged', updated_at = datetime('now') WHERE id = ?").run(brief.id);
  writeRun(db, brief.id, lane, "completed", { durationMs: out.durationMs });
  return { id: brief.id, lane, ok: true, status: "packaged" };
}

// The loop stage. Quota-safe, opt-in, bounded. Returns a structured report; never throws.
export async function runContentStage(db, { limit = 2, cwd } = {}) {
  let candidates;
  try {
    candidates = db
      .prepare("SELECT * FROM content_briefs WHERE automate = 1 AND status IN ('draft','researched') ORDER BY updated_at ASC LIMIT ?")
      .all(limit);
  } catch (error) {
    return { skipped: "query_failed", error: String(error?.message ?? error) };
  }
  if (candidates.length === 0) return { skipped: "no_automated_briefs", advanced: [] };

  // One cheap health gate per cycle so we never burn a full lane run when the CLI is absent.
  const health = await claudeCodeHealth().catch(() => ({ ok: false }));
  if (!health.ok) return { skipped: "claude_code_unavailable", advanced: [] };

  const advanced = [];
  for (const brief of candidates) {
    const result = await advanceBrief(db, brief, { cwd });
    advanced.push(result);
  }
  return { candidates: candidates.length, advanced };
}

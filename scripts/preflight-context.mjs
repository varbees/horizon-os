import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { summarizeContextBudget } from "./context-budget.mjs";
import { trustSummary } from "./trust.mjs";
import { vaultRoot } from "./vault.mjs";
import { searchWiki } from "./wiki.mjs";

function safeAll(db, sql, ...params) {
  try {
    return db.prepare(sql).all(...params);
  } catch {
    return [];
  }
}

function cleanText(value, max = 360) {
  return String(value ?? "")
    .replace(/^---[\s\S]*?---\s*/m, "")
    .replace(/[#>*_`|[\]()]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function readVaultPage(relPath, title) {
  const abs = resolve(vaultRoot(), relPath);
  if (!existsSync(abs)) return { path: relPath, title, exists: false, snippet: "" };
  return {
    path: relPath,
    title,
    exists: true,
    snippet: cleanText(readFileSync(abs, "utf8"), 500),
  };
}

function actionQuery(action) {
  return [
    action.title,
    action.project_id,
    action.lane,
    action.state,
    action.status,
    action.goal,
    action.summary,
    action.prompt,
  ].filter(Boolean).join(" ");
}

function actionSummary(action) {
  return {
    id: action.id,
    title: action.title,
    project: action.project_id || "",
    lane: action.lane || "",
    state: action.state || action.status || "",
    priority: action.priority_score ?? "",
    cwd: action.cwd || action.project_path || "",
  };
}

function dispatchHistory(db, action) {
  return safeAll(
    db,
    `SELECT id, agent, external_id, external_state, result_url, dispatched_at, last_polled_at, reconciled_at, last_error
     FROM agent_dispatches
     WHERE action_id = ?
     ORDER BY dispatched_at DESC, id DESC
     LIMIT 5`,
    action.id,
  );
}

function uniqueResults(results) {
  const seen = new Set(["wiki/hot.md", "wiki/index.md"]);
  const out = [];
  for (const result of results) {
    if (!result.path || seen.has(result.path)) continue;
    seen.add(result.path);
    out.push({
      path: result.path,
      title: result.title,
      kind: result.kind,
      summary: cleanText(result.summary || result.snippet, 260),
      score: result.score,
    });
  }
  return out;
}

export function buildPreflightContext(db, action, { limit = 6 } = {}) {
  const query = actionQuery(action);
  const packet = {
    generatedAt: new Date().toISOString(),
    query,
    action: actionSummary(action),
    hot: readVaultPage("wiki/hot.md", "Hot Cache"),
    index: readVaultPage("wiki/index.md", "Wiki Index"),
    searchResults: uniqueResults(searchWiki(db, query, { limit })),
    dispatchHistory: dispatchHistory(db, action),
    trust: trustSummary(db),
  };
  packet.contextBudget = summarizeContextBudget(packet);
  return packet;
}

export function formatPreflightContext(packet) {
  const searchRows = packet.searchResults.length
    ? packet.searchResults.map((row) => `- [[${row.title}]] (\`${row.path}\`, ${row.kind}) - ${row.summary || "Relevant wiki page."}`)
    : ["- No generated wiki pages matched this action query."];
  const dispatchRows = packet.dispatchHistory.length
    ? packet.dispatchHistory.map((row) => `- ${row.agent || "agent"} ${row.external_state || "unknown"} dispatched=${row.dispatched_at || "unknown"} reconciled=${row.reconciled_at || "open"} ${row.result_url || row.external_id || ""}`.trim())
    : ["- No previous dispatches recorded for this action."];
  return [
    "## Horizon memory preflight",
    "",
    "Read this packet before acting. It is generated from local Horizon wiki, dispatch, and trust state.",
    "",
    "### Action row",
    `- id: ${packet.action.id}`,
    `- project: ${packet.action.project || "(unset)"}`,
    `- lane/state: ${packet.action.lane || "(unset)"} / ${packet.action.state || "(unset)"}`,
    `- cwd: ${packet.action.cwd || "(set working directory)"}`,
    "",
    "### Required local memory",
    `- Hot cache: \`${packet.hot.path}\`${packet.hot.exists ? ` - ${packet.hot.snippet}` : " - missing; run wiki sync."}`,
    `- Index: \`${packet.index.path}\`${packet.index.exists ? ` - ${packet.index.snippet}` : " - missing; run wiki sync."}`,
    "",
    "### Relevant wiki pages",
    ...searchRows,
    "",
    "### Dispatch history",
    ...dispatchRows,
    "",
    "### Trust state",
    `- loopOk: ${packet.trust.loopOk}`,
    `- loopAgeMinutes: ${packet.trust.loopAgeMinutes}`,
    `- openDispatches: ${packet.trust.openDispatches}`,
    `- quotaState: ${packet.trust.quotaState}`,
    `- horizonSelfWip: ${packet.trust.horizonSelfWip}`,
    "",
    "### Context budget",
    `- state: ${packet.contextBudget?.state ?? "unknown"}`,
    `- estimated tokens: ${packet.contextBudget?.totalTokens ?? 0}/${packet.contextBudget?.maxTokens ?? 0} (${packet.contextBudget?.percentage ?? 0}%)`,
    `- top contributors: ${(packet.contextBudget?.topContributors ?? []).map((row) => `${row.name}:${row.tokens}`).join(", ") || "none"}`,
    `- recommendation: ${(packet.contextBudget?.recommendations ?? ["Context packet is within the configured budget."])[0]}`,
    "",
  ].join("\n");
}

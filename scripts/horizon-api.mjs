import "./env.mjs";

import { createServer } from "node:http";
import { randomUUID, createHash, timingSafeEqual } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openHorizonDb } from "./horizon-db.mjs";
import { runProjectSweep, latestProjectSweep } from "./project-sweep.mjs";
import { generateRevenueActions } from "./revenue-actions.mjs";
import { fetchFeed } from "./rss.mjs";
import { getUsageSummary } from "./usage.mjs";
import { mcpServerSeed } from "../src/data/horizon.js";
import { portfolioProjects } from "../src/data/portfolio.js";
import { frontmatter, listNotes, readNote, vaultInfo, writeNote } from "./vault.mjs";
import { callTool, connectServer, connectionState, disconnectServer, finishAuth, listTools, reconnectStored } from "./mcp-client.mjs";
import { buildRunnableSpec } from "./action-spec.mjs";
import { buildPreflightContext, formatPreflightContext } from "./preflight-context.mjs";
import { summarizeContextBudget } from "./context-budget.mjs";
import { autoEnrich, enrichActionWithAvailableProvider, llmAvailable } from "./auto-enrich.mjs";
import { generateWithAvailableProvider, listAiModelCatalog } from "./llm-providers.mjs";
import { redactForLog } from "./redact.mjs";
import { managedEnvStatus, upsertManagedEnv } from "./env-store.mjs";
import { runCycle as runHorizonCycle, loopStatus } from "./horizon-loop.mjs";
import { gitDetail } from "./git-detail.mjs";
import { horizonDoctor } from "./doctor.mjs";
import { evaluateDispatchPolicy } from "./dispatch-policy.mjs";
import { trustSummary } from "./trust.mjs";
import { rankActions } from "./ranking.mjs";
import { loadSources, priorityFor } from "./sources.mjs";
import { captureWikiAnswer, ingestWikiSource, queryWiki, runWikiFold, runWikiLint, runWikiSourceCoverage, searchWiki, syncHorizonWiki, wikiStatus } from "./wiki.mjs";
import {
  createSession as julesCreateSession,
  getSession as julesGetSession,
  julesAvailable,
  listActivities as julesListActivities,
  listSources as julesListSources,
} from "./jules.mjs";
import { runClaudeCode, claudeCodeHealth } from "./executors/claude-code.mjs";
import { codexHealth } from "./executors/codex.mjs";
import { startRun, stopRun, subscribe, unsubscribe, getRun, listRuns } from "./executors/run-manager.mjs";
import { getJobPlan, patchDay as patchJobPlanDay, setStartDate as setJobPlanStart } from "./job-plan.mjs";
import { graphContextBlock, graphSummary, graphQuery, graphAffected } from "./graph-context.mjs";
import { readProfile, writeProfile, profileContextBlock, profileConfigured } from "./agent-profile.mjs";
import { listDeps, indexDep, opensrcHome } from "./deps.mjs";
import { listPrompts, renderLanePrompt } from "./content-prompts.mjs";
import { runContentStage, advanceBrief } from "./content-loop.mjs";

function mcpServerById(id) {
  try {
    const row = db.prepare("SELECT * FROM connectors WHERE id = ?").get(id);
    if (row?.kind === "mcp") return row;
  } catch {
    /* db is initialized after this function is defined */
  }
  return mcpServerSeed.find((s) => s.id === id) ?? null;
}

const inrFmt = (n) => `INR ${Number(n ?? 0).toLocaleString("en-IN")}`;

function syncVaultSnapshots() {
  const stamp = new Date().toISOString();
  const written = [];
  const put = (relPath, body) => written.push(writeNote(relPath, body).path);

  // Command Center
  const actions = all("SELECT * FROM action_queue WHERE status != 'dismissed' ORDER BY status, sort_order");
  const inQueue = actions.filter((a) => a.status === "suggested" || a.status === "queued").length;
  const cmd = [
    frontmatter({ title: "Command Center", source: "horizon-os", synced: stamp, tags: "horizon/command" }),
    "# Command Center\n",
    `Operator status: **${inQueue} suggestions in queue**, ${actions.filter((a) => a.status === "deployed").length} deployed.\n`,
    "## Action queue\n",
    ...actions.map((a) => {
      const p = portfolioProjects.find(p => p.id === a.project_id);
      const projLink = p ? `[[${p.name}]]` : a.project_id;
      return `- [${a.status === "done" ? "x" : " "}] **${a.title}** (${a.agent} → ${projLink}) — ${a.summary}`;
    }),
    "",
  ].join("\n");
  put("Horizon/Command Center.md", cmd);

  // Capital
  const runway = db.prepare("SELECT * FROM runway_state WHERE id = 'current'").get() ?? {};
  const targets = all("SELECT * FROM capital_targets ORDER BY sort_order");
  const pipeline = all("SELECT * FROM offer_pipeline ORDER BY sort_order");
  const capital = [
    frontmatter({ title: "Capital", source: "horizon-os", synced: stamp, tags: "horizon/capital" }),
    "# Capital & Runway\n",
    `- Cash: ${inrFmt(runway.current_cash_inr)} · Burn: ${inrFmt(runway.monthly_burn_inr)}/mo · MRR: ${inrFmt(runway.mrr_inr)}`,
    `- Milestone: ${runway.milestone_date ?? "2027-02-15"}\n`,
    "## Targets\n",
    "| Target | Amount | Saved | Deadline |",
    "| --- | --- | --- | --- |",
    ...targets.map((t) => `| ${t.label} | ${inrFmt(t.target_inr)} | ${inrFmt(t.saved_inr)} | ${t.deadline} |`),
    "\n## Offer pipeline\n",
    ...pipeline.map((p) => `- **${p.buyer}** — ${p.offer} (${p.stage}, ${inrFmt(p.value_inr)})`),
    "",
  ].join("\n");
  put("Horizon/Capital.md", capital);

  // Journey
  const entries = all("SELECT * FROM journey_entries ORDER BY date DESC, sort_order");
  const journey = [
    frontmatter({ title: "Journey", source: "horizon-os", synced: stamp, tags: "horizon/journey" }),
    "# Journey Trek Ledger\n",
    ...entries.map((e) => {
      const geo = e.latitude != null ? ` \`${e.latitude},${e.longitude}\` @ ${e.altitude_m}m` : "";
      const indent = e.parent_id ? "  " : "";
      return `${indent}- **[${e.segment}] ${e.title}** (${e.date}, ${e.anchor})${geo}\n${indent}  - ${e.lesson}\n${indent}  - Next: ${e.next_action}`;
    }),
    "",
  ].join("\n");
  put("Horizon/Journey.md", journey);

  // Saved signals
  const saved = all("SELECT * FROM signals WHERE status = 'saved' ORDER BY coalesce(published_at, fetched_at) DESC LIMIT 1000");
  const sig = [
    frontmatter({ title: "Signals - Saved", source: "horizon-os", synced: stamp, tags: "horizon/signals" }),
    "# Saved Signals\n",
    ...(saved.length ? saved.map((s) => `- [${s.source_name}] [${s.title}](${s.url}) — ${s.category}`) : ["_No saved signals yet._"]),
    "",
  ].join("\n");
  put("Horizon/Signals - Saved.md", sig);

  // Agents (Connectors)
  try {
    const agents = all("SELECT * FROM connectors WHERE kind = 'mcp' ORDER BY sort_order");
    const agentsMd = [
      frontmatter({ title: "Agents & Tools", source: "horizon-os", synced: stamp, tags: "horizon/agents" }),
      "# Agents & Tools\n",
      ...agents.map(a => `- **[[${a.id}]]**: ${a.name} (${a.url || a.command})`),
      ...mcpServerSeed.map(s => `- **[[${s.id}]]**: ${s.name} (Seeded)`),
      "",
    ].join("\n");
    put("Horizon/Agents.md", agentsMd);
  } catch(e) {}

  // Decisions
  try {
    const decisions = all("SELECT * FROM decisions ORDER BY created_at DESC");
    const descMd = [
      frontmatter({ title: "Decisions", source: "horizon-os", synced: stamp, tags: "horizon/decisions" }),
      "# Decisions Archive\n",
      ...decisions.map(d => `### ${d.title}\n${d.body}\n`),
      "",
    ].join("\n");
    put("Horizon/Decisions.md", descMd);
  } catch(e) {}

  // Content Pipeline
  try {
    const briefs = all("SELECT * FROM content_briefs ORDER BY updated_at DESC");
    const contentMd = [
      frontmatter({ title: "Content Pipeline", source: "horizon-os", synced: stamp, tags: "horizon/content" }),
      "# Content Pipeline\n",
      ...briefs.map(c => `- **${c.status.toUpperCase()}**: ${c.title} — Engine: [[${c.engine}]]`),
      "",
    ].join("\n");
    put("Horizon/Content Pipeline.md", contentMd);
  } catch(e) {}

  // Projects
  portfolioProjects.forEach(p => {
    const projMd = [
      frontmatter({ title: p.name, source: "horizon-os", synced: stamp, tags: `horizon/project, horizon/lane/${p.lane.replace(/\s+/g, '')}` }),
      `# ${p.name}\n`,
      `**Status:** ${p.status} · **Verdict:** ${p.verdict} · **Score:** ${p.score}\n`,
      `## Strategy\n`,
      `- **Role:** ${p.role}`,
      `- **Evidence:** ${p.evidence}`,
      `- **Monetization:** ${p.monetization}`,
      `- **First Move:** ${p.firstMove}`,
      `- **Next:** ${p.next}`,
      `- **Reopen When:** ${p.reopenWhen}`,
      "",
      `## Ecosystem`,
      `- [[Tasks]]`,
      `- [[Calendar]]`,
      `- [[Decisions]]`,
      `- [[Content Pipeline]]`,
      "",
    ].join("\n");
    put(`Horizon/Projects/${p.name}.md`, projMd);
  });

  // Calendar Events
  try {
    const events = all("SELECT * FROM calendar_events ORDER BY start_at DESC LIMIT 200");
    const cal = [
      frontmatter({ title: "Calendar", source: "horizon-os", synced: stamp, tags: "horizon/calendar" }),
      "# Calendar Events\n",
      ...events.map(e => {
        const link = e.lane ? `[[${portfolioProjects.find(p => p.id === e.lane)?.name || e.lane}]]` : "";
        return `- **${e.title}** (${e.time_label}) ${link ? `— ${link}` : ""}\n  - ${e.output_contract || 'No output contract'}`;
      }),
      "",
    ].join("\n");
    put("Horizon/Calendar.md", cal);
  } catch(e) {}

  // Tasks
  try {
    const taskRows = all("SELECT * FROM tasks ORDER BY status, due_at");
    const tasksMd = [
      frontmatter({ title: "Tasks", source: "horizon-os", synced: stamp, tags: "horizon/tasks" }),
      "# Tasks\n",
      ...taskRows.map(t => {
        const projLink = t.project_id ? `[[${portfolioProjects.find(p => p.id === t.project_id)?.name || t.project_id}]]` : "";
        return `- [${t.status === 'done' ? 'x' : ' '}] **${t.title}** ${projLink ? `(${projLink})` : ""}`;
      }),
      "",
    ].join("\n");
    put("Horizon/Tasks.md", tasksMd);
  } catch(e) {}

  return { synced: stamp, files: written };
}

const port = Number(process.env.HORIZON_API_PORT ?? 8787);
const db = openHorizonDb();
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// The bolting workspace root (parent of this repo). Doc-reader + reveal paths are
// confined to this subtree so the API can never read or open arbitrary files.
const workspaceRoot = resolve(repoRoot, "..");
const queueDir = resolve(repoRoot, ".horizon", "queue");

// The active workspace root — settings-backed so anyone can point Horizon at their
// own repo folder (the open-source "load any workspace" story). Falls back to the
// folder this repo lives in. A path is allowed if it is inside the workspace OR
// inside this app's own repo (so the app's runbooks stay readable either way).
function workspaceRootFor(db) {
  try {
    const row = db.prepare("SELECT value FROM app_settings WHERE key = 'workspace.root'").get();
    if (row?.value) {
      const raw = row.value.startsWith("~/") ? resolve(process.env.HOME || "", row.value.slice(2)) : row.value;
      return resolve(raw);
    }
  } catch {
    /* settings unavailable — use default */
  }
  return workspaceRoot;
}

function pathAllowed(abs, db) {
  return abs.startsWith(workspaceRootFor(db)) || abs.startsWith(repoRoot);
}

// ---- HTTP Basic Auth (for exposing over Tailscale). Enabled only when both
// HORIZON_AUTH_USER and HORIZON_AUTH_PASS_SHA256 are set in the git-ignored .env.
// The password is never stored in plaintext — we compare SHA-256 hashes.
const AUTH_USER = process.env.HORIZON_AUTH_USER || "";
const AUTH_HASH = (process.env.HORIZON_AUTH_PASS_SHA256 || "").toLowerCase();
const AUTH_ON = !!(AUTH_USER && AUTH_HASH);

function sha256Hex(s) {
  return createHash("sha256").update(String(s), "utf8").digest("hex");
}
function safeEqHex(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
function checkAuth(req) {
  if (!AUTH_ON) return true;
  const m = /^Basic\s+(.+)$/i.exec(req.headers.authorization || "");
  if (!m) return false;
  let decoded = "";
  try {
    decoded = Buffer.from(m[1], "base64").toString("utf8");
  } catch {
    return false;
  }
  const i = decoded.indexOf(":");
  if (i < 0) return false;
  const user = decoded.slice(0, i);
  const pass = decoded.slice(i + 1);
  return user === AUTH_USER && safeEqHex(sha256Hex(pass), AUTH_HASH);
}

// ---- Serve the built SPA (dist/) so the whole app + API live on one origin
// behind the auth gate — clean for `tailscale serve` (no dev-server websockets).
const distDir = resolve(repoRoot, "dist");
const MIME = {
  html: "text/html; charset=utf-8", js: "text/javascript", mjs: "text/javascript",
  css: "text/css", json: "application/json", svg: "image/svg+xml", png: "image/png",
  jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", ico: "image/x-icon",
  webmanifest: "application/manifest+json", woff2: "font/woff2", woff: "font/woff",
  txt: "text/plain", map: "application/json", ics: "text/calendar",
};
function serveStatic(res, pathname) {
  if (!existsSync(distDir)) return false;
  let rel = decodeURIComponent(pathname).replace(/^\/+/, "");
  if (!rel) rel = "index.html";
  let filePath = resolve(distDir, rel);
  // traversal guard + SPA fallback
  if (!filePath.startsWith(distDir) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = resolve(distDir, "index.html");
  }
  if (!existsSync(filePath)) return false;
  const ext = filePath.split(".").pop().toLowerCase();
  res.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Cache-Control": ext === "html" ? "no-cache" : "public, max-age=3600",
  });
  res.end(readFileSync(filePath));
  return true;
}

function json(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "http://127.0.0.1:5177",
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function all(sql, ...params) {
  return db.prepare(sql).all(...params);
}

function actionRows() {
  return all("SELECT * FROM action_queue ORDER BY status, sort_order, created_at");
}

function calendarEventPayload(body) {
  const title = String(body.title ?? "").trim() || "Untitled block";
  const lane = String(body.lane ?? body.calendar_id ?? "Manual").trim() || "Manual";
  const startAt = body.start_at ?? null;
  const endAt = body.end_at ?? null;
  return {
    title,
    lane,
    time_label: body.time_label ?? (startAt && endAt ? `${startAt} - ${endAt}` : "Unscheduled"),
    start_at: startAt,
    end_at: endAt,
    all_day: Number(body.all_day ?? 0),
    calendar_id: body.calendar_id ?? lane.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    description: body.description ?? "",
    location: body.location ?? "",
    people_json: Array.isArray(body.people) ? JSON.stringify(body.people) : body.people_json ?? "[]",
    rrule: body.rrule ?? "",
    exdate_json: Array.isArray(body.exdate) ? JSON.stringify(body.exdate) : body.exdate_json ?? "[]",
    color: body.color ?? "#2558d8",
    status: body.status ?? "confirmed",
    recurrence_rule: body.recurrence_rule ?? (body.rrule ? `RRULE:${body.rrule}` : ""),
    output_contract: body.output_contract ?? body.output ?? "",
    provider: body.provider ?? "local",
    provider_event_id: body.provider_event_id ?? null,
    sync_state: body.sync_state ?? "local",
  };
}

function taskPayload(body) {
  return {
    node_id: body.node_id ?? null,
    event_id: body.event_id ?? null,
    project_id: body.project_id ?? "",
    phase_id: body.phase_id ?? "",
    lane: body.lane ?? "General",
    title: String(body.title ?? "").trim() || "Untitled task",
    status: body.status ?? "open",
    priority: body.priority ?? "normal",
    revenue_impact: Number(body.revenue_impact ?? 0),
    due_at: body.due_at ?? null,
    evidence: body.evidence ?? "",
    sort_order: Number(body.sort_order ?? 0),
  };
}

function journeyPayload(body) {
  return {
    parent_id: body.parent_id ?? body.parentId ?? null,
    date: body.date ?? new Date().toISOString().slice(0, 10),
    tz: body.tz ?? "Asia/Kolkata",
    type: body.type ?? "Field Scout",
    anchor: body.anchor ?? "Spec",
    segment: body.segment ?? "ridge",
    title: String(body.title ?? "").trim() || "Untitled leg",
    location: body.location ?? "",
    latitude: body.latitude ?? null,
    longitude: body.longitude ?? null,
    altitude_m: body.altitude_m ?? body.altitudeMeters ?? null,
    accuracy_m: body.accuracy_m ?? body.accuracyMeters ?? null,
    elevation_gain_m: body.elevation_gain_m ?? body.elevationGainMeters ?? null,
    terrain: body.terrain ?? "",
    difficulty: body.difficulty ?? "",
    evidence: body.evidence ?? "",
    lesson: body.lesson ?? "",
    next_action: body.next_action ?? body.next ?? "",
    tags_json: Array.isArray(body.tags) ? JSON.stringify(body.tags) : body.tags_json ?? "[]",
    sort_order: Number(body.sort_order ?? body.sortOrder ?? 0),
  };
}

const strategyFields = [
  ["tam_sam_som", "Market sizing"],
  ["beachhead_market", "Beachhead"],
  ["moats", "Moats"],
  ["market_strategy", "Ocean strategy"],
  ["business_model", "Business model"],
];

function cleanLongText(value) {
  return String(value ?? "").trim().slice(0, 12_000);
}

function strategyPayload(body) {
  const payload = {
    project_id: String(body.project_id ?? body.projectId ?? "").trim(),
  };
  for (const [field] of strategyFields) payload[field] = cleanLongText(body[field]);
  return payload;
}

function strategyCompleteness(strategy) {
  const missing = strategyFields
    .filter(([field]) => !String(strategy?.[field] ?? "").trim())
    .map(([, label]) => label);
  const total = strategyFields.length;
  const completed = total - missing.length;
  return {
    completed,
    total,
    score: total ? Math.round((completed / total) * 100) : 0,
    missing,
  };
}

function decorateStrategy(strategy) {
  if (!strategy) return null;
  return { ...strategy, completeness: strategyCompleteness(strategy) };
}

function countBy(rows, field) {
  const counts = new Map();
  for (const row of rows) {
    const value = String(row[field] ?? "").trim() || "Uncategorized";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function forgeStats(agents) {
  return {
    total: agents.length,
    categories: countBy(agents, "category"),
    revenueModels: countBy(agents, "revenue_model"),
  };
}

function getCommandBase() {
  return {
    nodes: all("SELECT * FROM graph_nodes ORDER BY kind, label"),
    edges: all("SELECT * FROM graph_edges ORDER BY created_at"),
    events: all("SELECT * FROM calendar_events ORDER BY coalesce(start_at, time_label), title"),
    tasks: all("SELECT * FROM tasks ORDER BY sort_order, due_at, created_at DESC LIMIT 100"),
    contexts: all("SELECT id, kind, title, source, status, updated_at FROM contexts ORDER BY updated_at DESC LIMIT 50"),
    decisions: all("SELECT * FROM decisions ORDER BY created_at DESC LIMIT 25"),
  };
}

function toFtsQuery(input) {
  const cleaned = String(input ?? "")
    .replace(/[^a-zA-Z0-9_ -]/g, " ")
    .trim();
  if (!cleaned) return "";
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `${term}*`)
    .join(" OR ");
}

function jsonArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value ?? "[]");
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function compactText(value, limit = 12_000) {
  return String(value ?? "").trim().slice(0, limit);
}

function briefPathId(pathname, suffix = "") {
  const prefix = "/api/content/briefs/";
  if (!pathname.startsWith(prefix)) return "";
  const raw = pathname.slice(prefix.length, suffix ? -suffix.length : undefined);
  return decodeURIComponent(raw.replace(/\/$/, ""));
}

function connectorRows() {
  return all("SELECT * FROM connectors ORDER BY sort_order, name").map((row) => (
    row.kind === "mcp" ? { ...row, state: connectionState(row.id) } : row
  ));
}

function getConnector(id) {
  return db.prepare("SELECT * FROM connectors WHERE id = ?").get(id) ?? null;
}

function getBrief(id) {
  return db.prepare("SELECT * FROM content_briefs WHERE id = ?").get(id) ?? null;
}

function briefDetails(id) {
  const brief = getBrief(id);
  if (!brief) return null;
  return {
    brief,
    runs: all("SELECT * FROM pipeline_runs WHERE brief_id = ? ORDER BY started_at DESC", id),
    assets: all("SELECT * FROM content_assets WHERE brief_id = ? ORDER BY created_at", id),
    package: db.prepare("SELECT * FROM content_packages WHERE brief_id = ? ORDER BY updated_at DESC LIMIT 1").get(id) ?? null,
  };
}

function defaultAssetPrompt(brief) {
  const engine = brief.engine === "photoselect" ? "PhotoSelect" : "Antharmaya Labs";
  return [
    `${engine} faceless premium content asset.`,
    brief.hook ? `Hook: ${brief.hook}.` : "",
    brief.source_artifact ? `Source artifact: ${brief.source_artifact}.` : "",
    "Light, restrained, evidence-led, no founder face, no fake science visuals.",
  ].filter(Boolean).join(" ");
}

function packageForBrief(brief, assets = []) {
  const channels = jsonArray(brief.channels_json);
  const isPhotoSelect = brief.engine === "photoselect";
  const hook = compactText(brief.hook) || (isPhotoSelect ? "Shot Sunday. Delivered Monday." : "The work is the face.");
  const audience = compactText(brief.audience) || (isPhotoSelect ? "Indian wedding studio owners" : "technical founders");
  const assetLines = assets.length
    ? assets.map((asset) => `${asset.provider} ${asset.kind}: ${asset.prompt}`).join("\n")
    : "No generated assets attached yet. Use a product screenshot or delivery-flow screen recording.";

  return {
    blog: [
      `# ${brief.title}`,
      "",
      hook,
      "",
      `Audience: ${audience}.`,
      "",
      "Proof source:",
      brief.source_artifact || "Add a build log, product screenshot, or shipped workflow before publishing.",
      "",
      "Asset plan:",
      assetLines,
    ].join("\n"),
    x_thread_json: JSON.stringify([
      hook,
      brief.source_artifact || "A shipped workflow beats a generic announcement.",
      isPhotoSelect
        ? "Show the delivery flow, the payment gate, and the unlock moment."
        : "Show the command surface, the repo diff, and the operating principle.",
      "Manual publish only after checking facts, screenshots, links, and alt text.",
    ]),
    linkedin: `${hook}\n\nBuilt from: ${brief.source_artifact || "a real Horizon OS artifact"}\n\nManual publish after proof review.`,
    instagram_caption: isPhotoSelect
      ? `${hook}\n\nA faceless reel: upload, WhatsApp link, client selection, payment unlock.\n\nFor studios tired of Drive links and payment chasing.`
      : `${hook}\n\nA command-center build note from Antharmaya Labs.\n\nNo face, no hype, just the system getting sharper.`,
    reel_script_json: JSON.stringify([
      { frame: 1, text: hook, visual: isPhotoSelect ? "studio delivery dashboard" : "Horizon OS command screen" },
      { frame: 2, text: "The old workflow", visual: isPhotoSelect ? "Drive and WhatsApp chaos" : "scattered agent chats" },
      { frame: 3, text: "The new proof", visual: brief.source_artifact || "real shipped artifact" },
      { frame: 4, text: "Manual publish only", visual: "checklist and final caption" },
    ]),
    alt_text: `${brief.title}: ${hook}`,
    cta_json: JSON.stringify(isPhotoSelect
      ? ["DM for founding-studio setup", "Join the early-access list", "Send one delivery pain point"]
      : ["Read the build note", "Inspect the repo pattern", "Follow the Horizon OS rung"]),
    checklist_json: JSON.stringify([
      "Facts match the source artifact",
      "No founder face required",
      "No invented metrics or fake science",
      "Visual text stays inside safe zones",
      "Manual publish link captured after posting",
    ]),
  };
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") return json(res, 204, {});
    const url = new URL(req.url, `http://${req.headers.host}`);

    // Gate everything behind Basic Auth when enabled (Tailscale exposure).
    if (!checkAuth(req)) {
      res.writeHead(401, {
        "WWW-Authenticate": 'Basic realm="Horizon OS", charset="UTF-8"',
        "Content-Type": "text/plain",
      });
      return res.end("Authentication required");
    }

    if (req.method === "GET" && url.pathname === "/api/health") {
      return json(res, 200, { ok: true, service: "horizon-api" });
    }

    if (req.method === "GET" && url.pathname === "/api/command-base") {
      return json(res, 200, getCommandBase());
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/skills/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/skills/", ""));
      const row = db.prepare("SELECT * FROM connectors WHERE id = ? AND kind = 'skill'").get(id);
      if (!row) return json(res, 404, { error: "skill_not_found" });
      const skillPath = resolve(repoRoot, row.command);
      if (!skillPath.startsWith(resolve(repoRoot, "skills"))) return json(res, 400, { error: "skill_path_invalid" });
      try {
        const { readFileSync } = await import("node:fs");
        const content = readFileSync(skillPath, "utf8").slice(0, 24_000);
        return json(res, 200, { ok: true, id: row.id, name: row.name, category: row.category, content });
      } catch (error) {
        return json(res, 500, { error: "skill_read_failed", detail: redactForLog(String(error?.message ?? error)) });
      }
    }

    if (req.method === "GET" && url.pathname === "/api/provider-keys") {
      return json(res, 200, { ok: true, keys: managedEnvStatus() });
    }

    if (req.method === "PATCH" && url.pathname === "/api/provider-keys") {
      const body = await readJson(req);
      const result = upsertManagedEnv(body);
      return json(res, 200, { ok: true, ...result, keys: managedEnvStatus() });
    }

    if (req.method === "GET" && url.pathname === "/api/settings") {
      const rows = all("SELECT key, value FROM app_settings");
      return json(res, 200, { ok: true, settings: Object.fromEntries(rows.map((row) => [row.key, row.value])) });
    }

    if (req.method === "PATCH" && url.pathname === "/api/settings") {
      const body = await readJson(req);
      const entries = Object.entries(body ?? {}).filter(([key]) => /^[a-z0-9_.:-]{1,64}$/i.test(key));
      const upsert = db.prepare(
        "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')",
      );
      for (const [key, value] of entries) upsert.run(key, String(value ?? "").slice(0, 2000));
      const rows = all("SELECT key, value FROM app_settings");
      return json(res, 200, { ok: true, settings: Object.fromEntries(rows.map((row) => [row.key, row.value])) });
    }

    if (req.method === "POST" && url.pathname === "/api/playground/generate") {
      const body = await readJson(req);
      const prompt = String(body.prompt ?? "").trim().slice(0, 8000);
      if (!prompt) return json(res, 400, { error: "prompt_required" });
      const stored = Object.fromEntries(all("SELECT key, value FROM app_settings").map((row) => [row.key, row.value]));
      const provider = String(body.provider ?? stored["llm.provider"] ?? "").trim() || undefined;
      const model = String(body.model ?? stored["llm.model"] ?? "").trim() || undefined;
      let system = String(body.system ?? "").trim().slice(0, 6000);

      if (body.useContext) {
        const runway = db.prepare("SELECT * FROM runway_state WHERE id = 'current'").get() ?? {};
        const openTasks = all("SELECT title, node_id, priority FROM tasks WHERE status != 'done' ORDER BY priority = 'high' DESC, created_at DESC LIMIT 10");
        const planStart = new Date("2026-06-29T00:00:00+05:30");
        const jobPlanDay = Math.floor((Date.now() - planStart.getTime()) / 86_400_000) + 1;
        const context = [
          "Operator context (Horizon OS, live from SQLite):",
          `- AI job plan: Day ${jobPlanDay} of 30 (phase: ${jobPlanDay <= 15 ? "learn+build" : jobPlanDay <= 30 ? "apply+build" : "sustain"}).`,
          `- Capital: cash INR ${runway.current_cash_inr ?? "?"}, burn INR ${runway.monthly_burn_inr ?? "?"}/mo, MRR INR ${runway.mrr_inr ?? "?"}. Milestone ${runway.milestone_date ?? "2027-02-15"}.`,
          openTasks.length ? `- Open tasks:\n${openTasks.map((t) => `  - [${t.priority}] ${t.title} (${t.node_id ?? "unassigned"})`).join("\n")}` : "- No open tasks.",
          "Ground every idea in this context. Ideas must serve: landing the job, PhotoSelect revenue, consulting cash, or wellbeing that sustains the other three.",
        ].join("\n");
        system = system ? `${system}\n\n${context}` : context;
      }

      try {
        const result = await generateWithAvailableProvider(prompt, {
          ...(system ? { system } : {}),
          ...(provider ? { provider } : {}),
          ...(model ? { model } : {}),
          timeoutMs: 60_000,
        });
        return json(res, 200, { ok: true, ...result });
      } catch (error) {
        return json(res, 502, { error: "generate_failed", detail: redactForLog(String(error?.message ?? error)) });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/routine/brief") {
      const body = await readJson(req);
      const day = Number(body.day) || 0;
      const phase = String(body.phase ?? "").slice(0, 120);
      const date = String(body.date ?? "").slice(0, 16);
      const blocks = Array.isArray(body.blocks) ? body.blocks.slice(0, 20) : [];
      const doneList = blocks.filter((b) => b?.done).map((b) => `${b.start} ${b.title}`);
      const pendingList = blocks.filter((b) => !b?.done).map((b) => `${b.start} ${b.title}`);
      const openTasks = all(
        "SELECT title, priority FROM tasks WHERE node_id = 'job-engine' AND status != 'done' ORDER BY created_at DESC LIMIT 8",
      );
      const prompt = [
        `Today is ${date}, Day ${day} of the 30-day AI job plan (phase: ${phase}).`,
        doneList.length ? `Blocks already done today:\n${doneList.map((t) => `- ${t}`).join("\n")}` : "No blocks completed yet today.",
        `Blocks remaining:\n${pendingList.map((t) => `- ${t}`).join("\n")}`,
        openTasks.length ? `Open job-engine tasks:\n${openTasks.map((t) => `- [${t.priority}] ${t.title}`).join("\n")}` : "",
        "Write a short operator brief (max 120 words): 1) the single highest-leverage focus for the rest of today, 2) one specific risk of drift to refuse, 3) one line of grounded encouragement. Plain text, no markdown headers.",
      ]
        .filter(Boolean)
        .join("\n\n");
      try {
        const result = await generateWithAvailableProvider(prompt, {
          system:
            "You are the operator brief inside Horizon OS, the founder's local command center. He is on a 30-day sprint to land a 20LPA+ AI/agentic engineering or technical PM role while keeping PhotoSelect and a consulting lane warm. Be direct, concrete, and brief. The daily 45-minute unassisted practice block is non-negotiable and must never be suggested as skippable.",
          timeoutMs: 45_000,
        });
        return json(res, 200, result);
      } catch (error) {
        return json(res, 502, { error: "brief_failed", detail: redactForLog(String(error?.message ?? error)) });
      }
    }

    if (req.method === "GET" && url.pathname === "/api/projects") {
      return json(res, 200, {
        projects: portfolioProjects,
        sweep: latestProjectSweep(db),
      });
    }

    if (req.method === "POST" && url.pathname === "/api/projects/sweep") {
      const sweep = runProjectSweep(db);
      return json(res, 200, sweep);
    }

    if (req.method === "POST" && url.pathname === "/api/revenue-actions/generate") {
      const body = await readJson(req);
      const result = generateRevenueActions(db, { sweep: body.sweep !== false });
      return json(res, 200, {
        ...result,
        actions: actionRows(),
      });
    }

    if (req.method === "GET" && url.pathname === "/api/calendar/export.ics") {
      const events = all("SELECT * FROM calendar_events ORDER BY start_at");
      const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      let ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Horizon OS//Calendar Export//EN\r\nCALSCALE:GREGORIAN\r\n";
      for (const ev of events) {
        if (!ev.start_at) continue;
        ics += "BEGIN:VEVENT\r\n";
        ics += `UID:${ev.id}@horizon-os\r\n`;
        ics += `DTSTAMP:${dtstamp}\r\n`;
        if (ev.all_day) {
           const dStart = ev.start_at.split('T')[0].replace(/-/g, '');
           ics += `DTSTART;VALUE=DATE:${dStart}\r\n`;
           if (ev.end_at) {
              const dEnd = ev.end_at.split('T')[0].replace(/-/g, '');
              ics += `DTEND;VALUE=DATE:${dEnd}\r\n`;
           }
        } else {
           const dtStart = ev.start_at.includes('T') ? ev.start_at.replace(/[-:]/g, '').substring(0, 15) + 'Z' : '';
           const dtEnd = ev.end_at && ev.end_at.includes('T') ? ev.end_at.replace(/[-:]/g, '').substring(0, 15) + 'Z' : '';
           if (dtStart) ics += `DTSTART:${dtStart}\r\n`;
           if (dtEnd) ics += `DTEND:${dtEnd}\r\n`;
        }
        ics += `SUMMARY:${ev.title}\r\n`;
        if (ev.description) ics += `DESCRIPTION:${ev.description.replace(/\\n/g, '\\\\n')}\r\n`;
        if (ev.rrule) ics += `RRULE:${ev.rrule}\r\n`;
        ics += "END:VEVENT\r\n";
      }
      ics += "END:VCALENDAR\r\n";
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="horizon-calendar.ics"');
      res.end(ics);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/calendar/events") {
      return json(res, 200, {
        events: all("SELECT * FROM calendar_events ORDER BY coalesce(start_at, time_label), title"),
      });
    }

    if (req.method === "POST" && url.pathname === "/api/calendar/events") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      const event = calendarEventPayload(body);
      db.prepare(`
        INSERT INTO calendar_events (
          id, title, lane, time_label, start_at, end_at, all_day, calendar_id,
          description, location, people_json, rrule, exdate_json, color, status,
          recurrence_rule, output_contract, provider, provider_event_id, sync_state
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        event.title,
        event.lane,
        event.time_label,
        event.start_at,
        event.end_at,
        event.all_day,
        event.calendar_id,
        event.description,
        event.location,
        event.people_json,
        event.rrule,
        event.exdate_json,
        event.color,
        event.status,
        event.recurrence_rule,
        event.output_contract,
        event.provider,
        event.provider_event_id,
        event.sync_state,
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/calendar/events/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/calendar/events/", ""));
      const existing = db.prepare("SELECT * FROM calendar_events WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "calendar_event_not_found" });
      const event = calendarEventPayload({ ...existing, ...(await readJson(req)) });
      db.prepare(`
        UPDATE calendar_events
        SET title = ?, lane = ?, time_label = ?, start_at = ?, end_at = ?, all_day = ?,
            calendar_id = ?, description = ?, location = ?, people_json = ?, rrule = ?,
            exdate_json = ?, color = ?, status = ?, recurrence_rule = ?, output_contract = ?,
            provider = ?, provider_event_id = ?, sync_state = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        event.title,
        event.lane,
        event.time_label,
        event.start_at,
        event.end_at,
        event.all_day,
        event.calendar_id,
        event.description,
        event.location,
        event.people_json,
        event.rrule,
        event.exdate_json,
        event.color,
        event.status,
        event.recurrence_rule,
        event.output_contract,
        event.provider,
        event.provider_event_id,
        event.sync_state,
        id,
      );
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/calendar/events/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/calendar/events/", ""));
      db.prepare("DELETE FROM calendar_events WHERE id = ?").run(id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "GET" && url.pathname === "/api/forge") {
      const agents = all("SELECT * FROM agent_catalog ORDER BY category, name");
      return json(res, 200, {
        agents,
        stats: forgeStats(agents),
      });
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/strategy/")) {
      const projectId = decodeURIComponent(url.pathname.replace("/api/strategy/", "")).trim();
      if (!projectId) return json(res, 400, { ok: false, error: "project_id_required" });
      const strategy = db.prepare("SELECT * FROM startup_strategies WHERE project_id = ?").get(projectId) || null;
      return json(res, 200, { strategy: decorateStrategy(strategy) });
    }

    if (req.method === "POST" && url.pathname === "/api/strategy") {
      const body = strategyPayload(await readJson(req));
      if (!body.project_id) return json(res, 400, { ok: false, error: "project_id_required" });
      db.prepare(`
        INSERT INTO startup_strategies (project_id, tam_sam_som, beachhead_market, moats, market_strategy, business_model, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(project_id) DO UPDATE SET
          tam_sam_som = excluded.tam_sam_som,
          beachhead_market = excluded.beachhead_market,
          moats = excluded.moats,
          market_strategy = excluded.market_strategy,
          business_model = excluded.business_model,
          updated_at = datetime('now')
      `).run(
        body.project_id,
        body.tam_sam_som,
        body.beachhead_market,
        body.moats,
        body.market_strategy,
        body.business_model,
      );
      const strategy = db.prepare("SELECT * FROM startup_strategies WHERE project_id = ?").get(body.project_id);
      return json(res, 200, { ok: true, strategy: decorateStrategy(strategy) });
    }

    if (req.method === "GET" && url.pathname === "/api/journey") {
      return json(res, 200, {
        entries: all("SELECT * FROM journey_entries ORDER BY date DESC, sort_order, created_at"),
      });
    }

    if (req.method === "POST" && url.pathname === "/api/journey") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      const entry = journeyPayload(body);
      db.prepare(`
        INSERT INTO journey_entries (
          id, parent_id, date, tz, type, anchor, segment, title, location,
          latitude, longitude, altitude_m, accuracy_m, elevation_gain_m,
          terrain, difficulty, evidence, lesson, next_action, tags_json, sort_order
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, entry.parent_id, entry.date, entry.tz, entry.type, entry.anchor,
        entry.segment, entry.title, entry.location, entry.latitude, entry.longitude,
        entry.altitude_m, entry.accuracy_m, entry.elevation_gain_m, entry.terrain,
        entry.difficulty, entry.evidence, entry.lesson, entry.next_action,
        entry.tags_json, entry.sort_order,
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/journey/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/journey/", ""));
      const existing = db.prepare("SELECT * FROM journey_entries WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "journey_entry_not_found" });
      const entry = journeyPayload({ ...existing, ...(await readJson(req)) });
      db.prepare(`
        UPDATE journey_entries
        SET parent_id = ?, date = ?, tz = ?, type = ?, anchor = ?, segment = ?, title = ?,
            location = ?, latitude = ?, longitude = ?, altitude_m = ?, accuracy_m = ?,
            elevation_gain_m = ?, terrain = ?, difficulty = ?, evidence = ?, lesson = ?,
            next_action = ?, tags_json = ?, sort_order = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        entry.parent_id, entry.date, entry.tz, entry.type, entry.anchor, entry.segment,
        entry.title, entry.location, entry.latitude, entry.longitude, entry.altitude_m,
        entry.accuracy_m, entry.elevation_gain_m, entry.terrain, entry.difficulty,
        entry.evidence, entry.lesson, entry.next_action, entry.tags_json, entry.sort_order,
        id,
      );
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/journey/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/journey/", ""));
      db.prepare("DELETE FROM journey_entries WHERE id = ?").run(id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "GET" && url.pathname === "/api/capital") {
      return json(res, 200, {
        targets: all("SELECT * FROM capital_targets ORDER BY sort_order, label"),
        ledger: all("SELECT * FROM cash_ledger ORDER BY date DESC, created_at DESC LIMIT 200"),
        pipeline: all("SELECT * FROM offer_pipeline ORDER BY sort_order, updated_at DESC"),
        runway: db.prepare("SELECT * FROM runway_state WHERE id = 'current'").get() ?? null,
      });
    }

    if (req.method === "PATCH" && url.pathname === "/api/capital/runway") {
      const body = await readJson(req);
      const existing = db.prepare("SELECT * FROM runway_state WHERE id = 'current'").get() ?? {};
      const next = {
        current_cash_inr: Number(body.current_cash_inr ?? body.currentCashInr ?? existing.current_cash_inr ?? 0),
        monthly_burn_inr: Number(body.monthly_burn_inr ?? body.monthlyBurnInr ?? existing.monthly_burn_inr ?? 0),
        mrr_inr: Number(body.mrr_inr ?? body.mrrInr ?? existing.mrr_inr ?? 0),
        weekly_outbound_target: Number(body.weekly_outbound_target ?? existing.weekly_outbound_target ?? 25),
        weekly_conversation_target: Number(body.weekly_conversation_target ?? existing.weekly_conversation_target ?? 3),
        weekly_offer_target: Number(body.weekly_offer_target ?? existing.weekly_offer_target ?? 1),
        milestone_date: body.milestone_date ?? existing.milestone_date ?? "2027-02-15",
      };
      db.prepare(`
        INSERT INTO runway_state (id, current_cash_inr, monthly_burn_inr, mrr_inr,
          weekly_outbound_target, weekly_conversation_target, weekly_offer_target, milestone_date, updated_at)
        VALUES ('current', ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          current_cash_inr = excluded.current_cash_inr,
          monthly_burn_inr = excluded.monthly_burn_inr,
          mrr_inr = excluded.mrr_inr,
          weekly_outbound_target = excluded.weekly_outbound_target,
          weekly_conversation_target = excluded.weekly_conversation_target,
          weekly_offer_target = excluded.weekly_offer_target,
          milestone_date = excluded.milestone_date,
          updated_at = datetime('now')
      `).run(
        next.current_cash_inr, next.monthly_burn_inr, next.mrr_inr,
        next.weekly_outbound_target, next.weekly_conversation_target,
        next.weekly_offer_target, next.milestone_date,
      );
      return json(res, 200, { ok: true });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/capital/targets/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/capital/targets/", ""));
      const existing = db.prepare("SELECT * FROM capital_targets WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "target_not_found" });
      const body = await readJson(req);
      db.prepare("UPDATE capital_targets SET saved_inr = ?, next_action = ?, updated_at = datetime('now') WHERE id = ?").run(
        Number(body.saved_inr ?? body.savedInr ?? existing.saved_inr),
        body.next_action ?? body.next ?? existing.next_action,
        id,
      );
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "POST" && url.pathname === "/api/capital/ledger") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      db.prepare(`
        INSERT INTO cash_ledger (id, date, direction, amount_inr, category, note, source)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        body.date ?? new Date().toISOString().slice(0, 10),
        body.direction === "out" ? "out" : "in",
        Number(body.amount_inr ?? body.amountInr ?? 0),
        body.category ?? "general",
        body.note ?? "",
        body.source ?? "manual",
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/capital/ledger/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/capital/ledger/", ""));
      db.prepare("DELETE FROM cash_ledger WHERE id = ?").run(id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "POST" && url.pathname === "/api/capital/pipeline") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      db.prepare(`
        INSERT INTO offer_pipeline (id, buyer, offer, stage, value_inr, recurring, next_action, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        body.buyer ?? "",
        body.offer ?? "",
        body.stage ?? "prospect",
        Number(body.value_inr ?? body.valueInr ?? 0),
        Number(body.recurring ?? 0),
        body.next_action ?? body.next ?? "",
        Number(body.sort_order ?? body.sortOrder ?? 0),
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/capital/pipeline/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/capital/pipeline/", ""));
      const existing = db.prepare("SELECT * FROM offer_pipeline WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "offer_not_found" });
      const body = await readJson(req);
      db.prepare(`
        UPDATE offer_pipeline SET buyer = ?, offer = ?, stage = ?, value_inr = ?, recurring = ?,
          next_action = ?, sort_order = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        body.buyer ?? existing.buyer,
        body.offer ?? existing.offer,
        body.stage ?? existing.stage,
        Number(body.value_inr ?? body.valueInr ?? existing.value_inr),
        Number(body.recurring ?? existing.recurring),
        body.next_action ?? body.next ?? existing.next_action,
        Number(body.sort_order ?? existing.sort_order),
        id,
      );
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/capital/pipeline/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/capital/pipeline/", ""));
      db.prepare("DELETE FROM offer_pipeline WHERE id = ?").run(id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "GET" && url.pathname === "/api/vault") {
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const limit = Number(url.searchParams.get("limit") ?? 80);
      const search = (url.searchParams.get("search") ?? "").toLowerCase();
      const folder = url.searchParams.get("folder") ?? "";

      let notes = listNotes();
      
      if (folder) notes = notes.filter(n => n.path.startsWith(folder));
      if (search) notes = notes.filter(n => n.name.toLowerCase().includes(search) || n.path.toLowerCase().includes(search));
      
      const total = notes.length;
      notes = notes.slice(offset, offset + limit);
      
      return json(res, 200, { ...vaultInfo(), notes, total, offset, limit, wiki: wikiStatus(db) });
    }

    if (req.method === "GET" && url.pathname === "/api/vault/note") {
      const path = url.searchParams.get("path");
      try {
        const note = readNote(path);
        if (path.endsWith(".html") || note.content.trim().startsWith("<!doctype html")) {
          res.writeHead(200, { "content-type": "text/html" });
          return res.end(note.content);
        }
        return json(res, 200, { ok: true, ...note });
      } catch (error) {
        return json(res, 400, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/vault/sync") {
      try {
        const snapshots = syncVaultSnapshots();
        const wiki = syncHorizonWiki(db);
        return json(res, 200, {
          ok: true,
          synced: snapshots.synced,
          files: [...snapshots.files, ...wiki.files],
          snapshots,
          wiki,
        });
      } catch (error) {
        return json(res, 500, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "GET" && url.pathname === "/api/wiki") {
      try {
        return json(res, 200, { ok: true, wiki: wikiStatus(db) });
      } catch (error) {
        return json(res, 500, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "GET" && url.pathname === "/api/doctor") {
      try {
        return json(res, 200, { ok: true, doctor: horizonDoctor(db) });
      } catch (error) {
        return json(res, 500, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "GET" && url.pathname === "/api/ai-models") {
      try {
        return json(res, 200, { ok: true, ...(await listAiModelCatalog()) });
      } catch (error) {
        return json(res, 500, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/context-budget") {
      try {
        const body = await readJson(req);
        return json(res, 200, { ok: true, budget: summarizeContextBudget(body.packet ?? body, body.options ?? {}) });
      } catch (error) {
        return json(res, 400, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/wiki/sync") {
      try {
        const result = syncHorizonWiki(db);
        return json(res, 200, { ok: true, ...result, wiki: wikiStatus(db) });
      } catch (error) {
        return json(res, 500, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "GET" && url.pathname === "/api/wiki/search") {
      try {
        const query = url.searchParams.get("q") ?? "";
        const limit = Number(url.searchParams.get("limit") ?? 10);
        return json(res, 200, { ok: true, query, results: searchWiki(db, query, { limit }) });
      } catch (error) {
        return json(res, 500, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/wiki/query") {
      try {
        const body = await readJson(req);
        const result = queryWiki(db, {
          question: body.question ?? body.query,
          mode: body.mode,
          captureGap: Boolean(body.captureGap),
        });
        return json(res, 200, { ok: true, ...result, wiki: wikiStatus(db) });
      } catch (error) {
        return json(res, 400, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/wiki/fold") {
      try {
        const body = await readJson(req);
        const result = runWikiFold(db, {
          keepEntries: body.keepEntries ?? body.keep,
          batchSize: body.batchSize ?? body.batch,
          dryRun: Boolean(body.dryRun),
        });
        return json(res, 200, { ok: true, ...result, wiki: wikiStatus(db) });
      } catch (error) {
        return json(res, 400, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/wiki/ingest") {
      try {
        const body = await readJson(req);
        const result = ingestWikiSource(db, {
          sourcePath: body.sourcePath ?? body.path,
          title: body.title,
          kind: body.kind,
          tags: Array.isArray(body.tags) ? body.tags : [],
          force: Boolean(body.force),
        });
        return json(res, 200, { ok: true, ...result, wiki: wikiStatus(db) });
      } catch (error) {
        return json(res, 400, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/wiki/coverage") {
      try {
        const body = await readJson(req);
        const result = runWikiSourceCoverage(db, { force: Boolean(body.force) });
        return json(res, 200, { ok: true, ...result, wiki: wikiStatus(db) });
      } catch (error) {
        return json(res, 500, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/wiki/capture") {
      try {
        const body = await readJson(req);
        const result = captureWikiAnswer(db, {
          question: body.question,
          answer: body.answer,
          title: body.title,
          links: Array.isArray(body.links) ? body.links : [],
          tags: Array.isArray(body.tags) ? body.tags : [],
        });
        return json(res, 200, { ok: true, ...result, wiki: wikiStatus(db) });
      } catch (error) {
        return json(res, 400, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/wiki/lint") {
      try {
        const result = runWikiLint(db);
        return json(res, 200, { ok: true, ...result, wiki: wikiStatus(db) });
      } catch (error) {
        return json(res, 500, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/vault/note") {
      const body = await readJson(req);
      try {
        const result = writeNote(body.path, body.content ?? "");
        return json(res, 201, { ok: true, ...result });
      } catch (error) {
        return json(res, 400, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "GET" && url.pathname === "/api/mcp") {
      return json(res, 200, {
        servers: connectorRows().filter((row) => row.kind === "mcp"),
      });
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/mcp/") && url.pathname.endsWith("/connect")) {
      const id = decodeURIComponent(url.pathname.replace("/api/mcp/", "").replace("/connect", ""));
      const server = mcpServerById(id);
      if (!server) return json(res, 404, { ok: false, error: "server_not_found" });
      try {
        const result = await connectServer(id, server.url);
        return json(res, 200, { ok: true, ...result });
      } catch (error) {
        return json(res, 502, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/mcp/") && url.pathname.endsWith("/callback")) {
      const id = decodeURIComponent(url.pathname.replace("/api/mcp/", "").replace("/callback", ""));
      const code = url.searchParams.get("code");
      const html = (msg, ok) =>
        `<!doctype html><meta charset="utf-8"><body style="font-family:ui-sans-serif;background:#fbfff9;color:#17201a;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><h2>${ok ? "Connected" : "Auth failed"}</h2><p>${msg}</p><p style="color:#708078">You can close this tab.</p></div><script>setTimeout(()=>window.close(),1500)</script></body>`;
      if (!code) {
        res.writeHead(400, { "content-type": "text/html" });
        return res.end(html("No authorization code returned.", false));
      }
      try {
        await finishAuth(id, code);
        res.writeHead(200, { "content-type": "text/html" });
        return res.end(html(`${id} is connected to Horizon.`, true));
      } catch (error) {
        res.writeHead(502, { "content-type": "text/html" });
        return res.end(html(String(error.message ?? error), false));
      }
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/mcp/") && url.pathname.endsWith("/tools")) {
      const id = decodeURIComponent(url.pathname.replace("/api/mcp/", "").replace("/tools", ""));
      try {
        const tools = await listTools(id);
        return json(res, 200, { ok: true, tools: tools.map((t) => ({ name: t.name, description: t.description })) });
      } catch (error) {
        return json(res, 409, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/mcp/") && url.pathname.endsWith("/call")) {
      const id = decodeURIComponent(url.pathname.replace("/api/mcp/", "").replace("/call", ""));
      const body = await readJson(req);
      try {
        const result = await callTool(id, body.name, body.arguments ?? {});
        return json(res, 200, { ok: true, result });
      } catch (error) {
        return json(res, 409, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/mcp/") && url.pathname.endsWith("/disconnect")) {
      const id = decodeURIComponent(url.pathname.replace("/api/mcp/", "").replace("/disconnect", ""));
      disconnectServer(id);
      return json(res, 200, { ok: true });
    }

    if (req.method === "GET" && url.pathname === "/api/usage") {
      const force = url.searchParams.get("refresh") === "1";
      const summary = await getUsageSummary({ force });
      return json(res, 200, summary);
    }

    if (req.method === "GET" && url.pathname === "/api/signals") {
      return json(res, 200, {
        sources: all("SELECT * FROM signal_sources ORDER BY sort_order, name"),
        signals: all("SELECT * FROM signals WHERE status != 'dismissed' ORDER BY coalesce(published_at, fetched_at) DESC LIMIT 300"),
      });
    }

    if (req.method === "POST" && url.pathname === "/api/signals/refresh") {
      const sources = all("SELECT * FROM signal_sources WHERE active = 1 ORDER BY sort_order");
      const insert = db.prepare(`
        INSERT INTO signals (id, source_id, source_name, category, kind, title, url, summary, thumbnail, published_at, status, fetched_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          summary = excluded.summary,
          thumbnail = excluded.thumbnail,
          published_at = excluded.published_at,
          fetched_at = datetime('now')
      `);
      let inserted = 0;
      const errors = [];
      await Promise.all(
        sources.map(async (source) => {
          try {
            const items = await fetchFeed(source);
            for (const item of items.slice(0, 40)) {
              const before = db.prepare("SELECT 1 FROM signals WHERE id = ?").get(item.id);
              insert.run(
                item.id,
                source.id,
                source.name,
                source.category,
                source.kind,
                item.title,
                item.url,
                item.summary,
                item.thumbnail,
                item.published_at,
              );
              if (!before) inserted += 1;
            }
          } catch (error) {
            errors.push({ source: source.id, error: String(error.message ?? error) });
          }
        }),
      );
      // remove the placeholder seed once real signals exist
      db.prepare("DELETE FROM signals WHERE id = 'seed-1' AND (SELECT count(*) FROM signals WHERE id != 'seed-1') > 0").run();
      return json(res, 200, { ok: true, sources: sources.length, inserted, errors });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/signals/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/signals/", ""));
      const existing = db.prepare("SELECT * FROM signals WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "signal_not_found" });
      const body = await readJson(req);
      db.prepare("UPDATE signals SET status = ? WHERE id = ?").run(body.status ?? existing.status, id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "POST" && url.pathname === "/api/signal-sources") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      db.prepare(`
        INSERT INTO signal_sources (id, name, url, category, kind, active, sort_order)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `).run(
        id,
        String(body.name ?? "").trim() || "Untitled source",
        String(body.url ?? "").trim(),
        body.category ?? "AI News Hubs",
        body.kind ?? "rss",
        Number(body.sort_order ?? body.sortOrder ?? 99),
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/signal-sources/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/signal-sources/", ""));
      db.prepare("DELETE FROM signal_sources WHERE id = ?").run(id);
      db.prepare("DELETE FROM signals WHERE source_id = ?").run(id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "GET" && url.pathname === "/api/action-queue") {
      return json(res, 200, {
        actions: actionRows(),
      });
    }

    if (req.method === "POST" && url.pathname === "/api/action-queue") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      db.prepare(`
        INSERT INTO action_queue (id, title, summary, source, project_id, project_path, agent, prompt, status, impact, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        String(body.title ?? "").trim() || "Untitled action",
        body.summary ?? "",
        body.source ?? "manual",
        body.project_id ?? body.projectId ?? "",
        body.project_path ?? body.projectPath ?? "",
        body.agent ?? "claude",
        body.prompt ?? "",
        body.status ?? "suggested",
        body.impact ?? "normal",
        Number(body.sort_order ?? body.sortOrder ?? 0),
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "GET" && url.pathname === "/api/loop/status") {
      return json(res, 200, loopStatus());
    }

    if (req.method === "GET" && url.pathname === "/api/trust") {
      try {
        const trust = trustSummary(db);
        // Inherit money weight + lane from the source registry by project slug (tolerant match),
        // so ranking reflects the operator's money priorities, not just lifecycle state.
        const { priorities } = loadSources();
        const actions = db.prepare("SELECT * FROM action_queue WHERE status != 'dismissed'").all().map((a) => {
          const pr = priorityFor(priorities, a.project_id);
          return { ...a, priority_score: a.priority_score || pr?.weight || 0, lane: a.lane || pr?.lane || "" };
        });
        const nextMoves = rankActions(actions).slice(0, 5).map((a) => ({
          id: a.id, title: a.title, project_id: a.project_id, lane: a.lane,
          state: a.state, priority_score: a.priority_score, enriched: a.enriched,
        }));
        return json(res, 200, { ok: true, trust, nextMoves });
      } catch (error) {
        return json(res, 500, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "GET" && url.pathname === "/api/projects/git") {
      const path = url.searchParams.get("path") ?? "";
      // Only inspect paths under the operator's bolting workspace or this repo.
      if (!/bolting|horizon-dashboard-preview/.test(path)) {
        return json(res, 400, { ok: false, error: "path_not_allowed" });
      }
      try {
        return json(res, 200, gitDetail(path));
      } catch (error) {
        return json(res, 500, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/loop/run") {
      const body = await readJson(req);
      try {
        const cycle = await runHorizonCycle({ db, enrichLimit: Number(body.enrichLimit) || undefined });
        return json(res, 200, cycle);
      } catch (error) {
        return json(res, 502, { ok: false, error: String(error.message ?? error) });
      }
    }

    // Run only the autonomous content stage (advance opted-in briefs through the free draft lanes).
    // Lighter than a full loop cycle; the operator can trigger a content pass on demand.
    if (req.method === "POST" && url.pathname === "/api/loop/content") {
      const body = await readJson(req);
      try {
        const result = await runContentStage(db, { limit: Number(body.limit) || undefined, cwd: repoRoot });
        return json(res, 200, { ok: true, ...result });
      } catch (error) {
        return json(res, 502, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/action-queue/enrich-all") {
      const body = await readJson(req);
      try {
        const result = await autoEnrich({
          db,
          limit: Number(body.limit) || undefined,
          provider: body.provider,
          model: body.model,
        });
        return json(res, 200, result);
      } catch (error) {
        return json(res, 502, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "GET" && url.pathname === "/api/jules/sources") {
      if (!julesAvailable()) return json(res, 503, { ok: false, error: "jules_key_missing" });
      try {
        return json(res, 200, { ok: true, sources: await julesListSources() });
      } catch (error) {
        return json(res, 502, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/jules/sessions/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/jules/sessions/", ""));
      try {
        const [session, activities] = await Promise.all([julesGetSession(id), julesListActivities(id).catch(() => [])]);
        return json(res, 200, { ok: true, session, activities });
      } catch (error) {
        return json(res, 502, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/action-queue/") && url.pathname.endsWith("/jules")) {
      const id = decodeURIComponent(url.pathname.replace("/api/action-queue/", "").replace("/jules", ""));
      const action = db.prepare("SELECT * FROM action_queue WHERE id = ?").get(id);
      if (!action) return json(res, 404, { ok: false, error: "action_not_found" });
      if (!julesAvailable()) return json(res, 503, { ok: false, error: "jules_key_missing" });
      const body = await readJson(req);
      if (!body.source) {
        // help the caller pick a connected repo
        try {
          return json(res, 409, { ok: false, error: "source_required", sources: await julesListSources() });
        } catch (error) {
          return json(res, 409, { ok: false, error: "source_required", sourcesError: String(error.message ?? error) });
        }
      }
      const policy = evaluateDispatchPolicy(db, action, { agent: "jules" });
      if (!policy.ok) {
        return json(res, 409, {
          ok: false,
          error: policy.reason,
          policy,
          dispatchId: policy.conflict?.dispatchId,
          sessionId: policy.conflict?.sessionId,
        });
      }
      // Outbox row written BEFORE the call (idempotency key persisted first).
      const priorCount = db.prepare("SELECT COUNT(*) AS n FROM agent_dispatches WHERE action_id = ?").get(action.id).n;
      const idempotencyKey = `jules:${id}:${priorCount + 1}`;
      const dispatchRow = db
        .prepare("INSERT INTO agent_dispatches (action_id, agent, idempotency_key, external_state, dispatched_at) VALUES (?, 'jules', ?, 'dispatching', datetime('now'))")
        .run(action.id, idempotencyKey);
      const dispatchId = dispatchRow.lastInsertRowid;
      try {
        syncHorizonWiki(db);
        const memoryContext = formatPreflightContext(buildPreflightContext(db, action));
        const prompt = buildRunnableSpec(action, { memoryContext });
        const session = await julesCreateSession({
          prompt,
          source: body.source,
          startingBranch: body.branch ?? body.startingBranch ?? "main",
          title: action.title,
          requirePlanApproval: body.requirePlanApproval !== false,
          automationMode: body.automationMode,
        });
        const sessionId = session.id ?? session.name ?? "";
        db.prepare("UPDATE agent_dispatches SET external_id = ?, external_state = 'in_progress', last_polled_at = datetime('now') WHERE id = ?").run(sessionId, dispatchId);
        db.prepare("UPDATE action_queue SET jules_session_id = ?, dispatch_target = 'jules', state = 'dispatched', dispatched_at = datetime('now'), idempotency_key = ?, status = 'deployed', updated_at = datetime('now') WHERE id = ?").run(sessionId, idempotencyKey, id);
        db.prepare("INSERT INTO command_log (id, actor, action, target, payload_json) VALUES (?, ?, ?, ?, ?)").run(
          randomUUID(),
          "horizon",
          "jules_dispatch",
          action.project_id || action.id,
          JSON.stringify({ id, sessionId }),
        );
        return json(res, 200, { ok: true, id, sessionId, dispatchId, session });
      } catch (error) {
        const errMsg = String(error.message ?? error);
        db.prepare("UPDATE agent_dispatches SET external_state = 'failed', reconciled_at = datetime('now'), last_error = ? WHERE id = ?").run(errMsg.slice(0, 200), dispatchId);
        return json(res, 502, { ok: false, error: errMsg });
      }
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/action-queue/") && url.pathname.endsWith("/enrich")) {
      const id = decodeURIComponent(url.pathname.replace("/api/action-queue/", "").replace("/enrich", ""));
      const action = db.prepare("SELECT * FROM action_queue WHERE id = ?").get(id);
      if (!action) return json(res, 404, { ok: false, error: "action_not_found" });
      if (!llmAvailable()) return json(res, 503, { ok: false, error: "llm_key_missing" });
      const body = await readJson(req);
      try {
        const { fields, provider, model } = await enrichActionWithAvailableProvider(action, {
          provider: body.provider,
          model: body.model,
        });
        db.prepare(`
          UPDATE action_queue SET goal = ?, constraints = ?, done_criteria = ?, tools = ?, prompt = ?,
            cwd = COALESCE(NULLIF(cwd,''), ?), enriched = 1, updated_at = datetime('now')
          WHERE id = ?
        `).run(
          fields.goal,
          fields.constraints,
          fields.done_criteria,
          fields.tools,
          fields.prompt || action.prompt,
          action.project_path || "",
          id,
        );
        return json(res, 200, { ok: true, id, provider, model, ...fields });
      } catch (error) {
        return json(res, 502, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/action-queue/") && url.pathname.endsWith("/deploy")) {
      const id = decodeURIComponent(url.pathname.replace("/api/action-queue/", "").replace("/deploy", ""));
      const action = db.prepare("SELECT * FROM action_queue WHERE id = ?").get(id);
      if (!action) return json(res, 404, { ok: false, error: "action_not_found" });
      mkdirSync(queueDir, { recursive: true });
      const stamp = new Date().toISOString();
      const filename = `${id}.md`;
      const filePath = resolve(queueDir, filename);
      syncHorizonWiki(db);
      // Compose the agent's context: durable memory + operator profile (cofounder
      // continuity) + a budgeted codebase-graph block scoped to this project, so the
      // agent queries the graph and knows the goals instead of starting cold.
      const baseContext = formatPreflightContext(buildPreflightContext(db, action));
      const profileBlock = profileContextBlock();
      const graphBlock = graphContextBlock(action.project_path, action.title, 600);
      const memoryContext = [baseContext, profileBlock, graphBlock].filter(Boolean).join("\n\n");
      const contents = buildRunnableSpec(action, { stamp, memoryContext });
      writeFileSync(filePath, contents, "utf8");
      // mirror into the Obsidian vault as durable memory (control surface -> memory)
      let vaultPath = "";
      try {
        const note = frontmatter({ title: action.title, source: "horizon-action", project: action.project_id, agent: action.agent, status: "deployed", deployed: stamp, tags: "horizon/action" }) + contents;
        vaultPath = writeNote(`Horizon/Actions/${id}.md`, note).path;
      } catch {
        /* vault optional; deploy still succeeds */
      }
      db.prepare("UPDATE action_queue SET status = 'deployed', deployed_path = ?, spec_path = ?, updated_at = datetime('now') WHERE id = ?").run(filePath, filePath, id);
      db.prepare("INSERT INTO command_log (id, actor, action, target, payload_json) VALUES (?, ?, ?, ?, ?)").run(
        randomUUID(),
        "horizon",
        "action_deploy",
        action.project_id || action.id,
        JSON.stringify({ id, agent: action.agent, path: filePath }),
      );
      return json(res, 200, { ok: true, id, path: filePath, vaultPath });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/action-queue/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/action-queue/", ""));
      const existing = db.prepare("SELECT * FROM action_queue WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "action_not_found" });
      const body = await readJson(req);
      db.prepare(`
        UPDATE action_queue SET title = ?, summary = ?, project_id = ?, project_path = ?, agent = ?,
          prompt = ?, status = ?, impact = ?, sort_order = ?, cwd = ?, goal = ?, constraints = ?,
          done_criteria = ?, tools = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        body.title ?? existing.title,
        body.summary ?? existing.summary,
        body.project_id ?? body.projectId ?? existing.project_id,
        body.project_path ?? body.projectPath ?? existing.project_path,
        body.agent ?? existing.agent,
        body.prompt ?? existing.prompt,
        body.status ?? existing.status,
        body.impact ?? existing.impact,
        Number(body.sort_order ?? existing.sort_order),
        body.cwd ?? existing.cwd,
        body.goal ?? existing.goal,
        body.constraints ?? existing.constraints,
        body.done_criteria ?? body.doneCriteria ?? existing.done_criteria,
        body.tools ?? existing.tools,
        id,
      );
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/action-queue/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/action-queue/", ""));
      db.prepare("DELETE FROM action_queue WHERE id = ?").run(id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "GET" && url.pathname === "/api/inbox") {
      return json(res, 200, {
        resources: all("SELECT * FROM resources ORDER BY sort_order, created_at DESC"),
        posts: all("SELECT * FROM social_posts ORDER BY sort_order, created_at DESC"),
        skills: all("SELECT * FROM social_skills ORDER BY sort_order"),
      });
    }

    if (req.method === "POST" && url.pathname === "/api/resources") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      db.prepare(`
        INSERT INTO resources (id, title, source, kind, project_id, status, note, next_action, tags_json, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        String(body.title ?? "").trim() || "Untitled resource",
        body.source ?? "",
        body.kind ?? "link",
        body.project_id ?? body.projectId ?? "",
        body.status ?? "inbox",
        body.note ?? "",
        body.next_action ?? body.next ?? "",
        Array.isArray(body.tags) ? JSON.stringify(body.tags) : body.tags_json ?? "[]",
        Number(body.sort_order ?? body.sortOrder ?? 0),
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/resources/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/resources/", ""));
      const existing = db.prepare("SELECT * FROM resources WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "resource_not_found" });
      const body = await readJson(req);
      db.prepare(`
        UPDATE resources SET title = ?, source = ?, kind = ?, project_id = ?, status = ?,
          note = ?, next_action = ?, tags_json = ?, sort_order = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        body.title ?? existing.title,
        body.source ?? existing.source,
        body.kind ?? existing.kind,
        body.project_id ?? body.projectId ?? existing.project_id,
        body.status ?? existing.status,
        body.note ?? existing.note,
        body.next_action ?? body.next ?? existing.next_action,
        Array.isArray(body.tags) ? JSON.stringify(body.tags) : body.tags_json ?? existing.tags_json,
        Number(body.sort_order ?? existing.sort_order),
        id,
      );
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/resources/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/resources/", ""));
      db.prepare("DELETE FROM resources WHERE id = ?").run(id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "POST" && url.pathname === "/api/social-posts") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      db.prepare(`
        INSERT INTO social_posts (id, platform, format, hook, body, status, skill_id, project_id, scheduled_for, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        body.platform ?? "linkedin",
        body.format ?? "post",
        body.hook ?? "",
        body.body ?? "",
        body.status ?? "idea",
        body.skill_id ?? body.skillId ?? "",
        body.project_id ?? body.projectId ?? "",
        body.scheduled_for ?? null,
        Number(body.sort_order ?? body.sortOrder ?? 0),
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/social-posts/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/social-posts/", ""));
      const existing = db.prepare("SELECT * FROM social_posts WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "post_not_found" });
      const body = await readJson(req);
      db.prepare(`
        UPDATE social_posts SET platform = ?, format = ?, hook = ?, body = ?, status = ?,
          skill_id = ?, project_id = ?, scheduled_for = ?, sort_order = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        body.platform ?? existing.platform,
        body.format ?? existing.format,
        body.hook ?? existing.hook,
        body.body ?? existing.body,
        body.status ?? existing.status,
        body.skill_id ?? body.skillId ?? existing.skill_id,
        body.project_id ?? body.projectId ?? existing.project_id,
        body.scheduled_for ?? existing.scheduled_for,
        Number(body.sort_order ?? existing.sort_order),
        id,
      );
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/social-posts/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/social-posts/", ""));
      db.prepare("DELETE FROM social_posts WHERE id = ?").run(id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "GET" && url.pathname === "/api/tasks") {
      return json(res, 200, {
        tasks: all("SELECT * FROM tasks ORDER BY status, sort_order, due_at, created_at DESC"),
      });
    }

    if (req.method === "GET" && url.pathname === "/api/search") {
      const query = toFtsQuery(url.searchParams.get("q"));
      if (!query) return json(res, 200, { results: [] });
      const results = db
        .prepare(
          `SELECT id, kind, title, source, snippet(context_fts, 3, '[', ']', '...', 16) AS snippet
           FROM context_fts
           WHERE context_fts MATCH ?
           LIMIT 20`,
        )
        .all(query);
      return json(res, 200, { results });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/nodes/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/nodes/", ""));
      const body = await readJson(req);
      db.prepare("UPDATE graph_nodes SET x = ?, y = ?, updated_at = datetime('now') WHERE id = ?").run(Number(body.x), Number(body.y), id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "POST" && url.pathname === "/api/tasks") {
      const body = await readJson(req);
      const id = randomUUID();
      const task = taskPayload(body);
      db.prepare(`
        INSERT INTO tasks (
          id, node_id, event_id, project_id, phase_id, lane, title, status,
          priority, revenue_impact, due_at, evidence, sort_order
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        task.node_id,
        task.event_id,
        task.project_id,
        task.phase_id,
        task.lane,
        task.title,
        task.status,
        task.priority,
        task.revenue_impact,
        task.due_at,
        task.evidence,
        task.sort_order,
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/tasks/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/tasks/", ""));
      const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "task_not_found" });
      const task = taskPayload({ ...existing, ...(await readJson(req)) });
      db.prepare(`
        UPDATE tasks
        SET node_id = ?, event_id = ?, project_id = ?, phase_id = ?, lane = ?, title = ?,
            status = ?, priority = ?, revenue_impact = ?, due_at = ?, evidence = ?,
            sort_order = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        task.node_id,
        task.event_id,
        task.project_id,
        task.phase_id,
        task.lane,
        task.title,
        task.status,
        task.priority,
        task.revenue_impact,
        task.due_at,
        task.evidence,
        task.sort_order,
        id,
      );
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/tasks/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/tasks/", ""));
      db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "POST" && url.pathname === "/api/context") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      db.prepare(`
        INSERT INTO contexts (id, kind, title, body, source)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          kind = excluded.kind,
          title = excluded.title,
          body = excluded.body,
          source = excluded.source,
          updated_at = datetime('now')
      `).run(id, body.kind ?? "note", body.title ?? "Untitled context", body.body ?? "", body.source ?? "api");
      db.prepare("DELETE FROM context_fts WHERE id = ?").run(id);
      db.prepare("INSERT INTO context_fts (id, kind, title, body, source) VALUES (?, ?, ?, ?, ?)").run(
        id,
        body.kind ?? "note",
        body.title ?? "Untitled context",
        body.body ?? "",
        body.source ?? "api",
      );
      return json(res, 201, { ok: true, id });
    }

    // --- Connector registry (the integration hub: local agents + MCP + skills) ---
    if (req.method === "GET" && url.pathname === "/api/connectors") {
      return json(res, 200, { connectors: connectorRows() });
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/connectors/") && url.pathname.endsWith("/health")) {
      const id = decodeURIComponent(url.pathname.replace("/api/connectors/", "").replace("/health", ""));
      const row = db.prepare("SELECT * FROM connectors WHERE id = ?").get(id);
      if (!row) return json(res, 404, { ok: false, error: "connector_not_found" });
      let state = row.state;
      let version = row.version;
      let health = {};
      if (row.kind === "local_agent") {
        let probe;
        if (id === "codex") probe = await codexHealth();
        else if (id === "jules") probe = { ok: julesAvailable(), version: julesAvailable() ? "REST API (JULES_API_KEY)" : "", error: julesAvailable() ? "" : "jules_key_missing" };
        else probe = await claudeCodeHealth();
        state = probe.ok ? "ready" : "unavailable";
        version = probe.version || "";
        health = probe;
      } else if (row.kind === "mcp") {
        state = connectionState(id);
        health = { state };
      }
      db.prepare("UPDATE connectors SET state = ?, version = ?, last_health_at = datetime('now'), health_json = ?, updated_at = datetime('now') WHERE id = ?")
        .run(state, version, JSON.stringify(health), id);
      return json(res, 200, { ok: true, id, state, version, health });
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/connectors/") && url.pathname.endsWith("/connect")) {
      const id = decodeURIComponent(url.pathname.replace("/api/connectors/", "").replace("/connect", ""));
      const row = getConnector(id);
      if (!row) return json(res, 404, { ok: false, error: "connector_not_found" });
      if (row.kind !== "mcp") return json(res, 400, { ok: false, error: "connector_not_mcp" });
      try {
        const result = await connectServer(id, row.url);
        db.prepare("UPDATE connectors SET state = ?, updated_at = datetime('now') WHERE id = ?")
          .run(result.connected ? "connected" : "authorizing", id);
        return json(res, 200, { ok: true, ...result });
      } catch (error) {
        db.prepare("UPDATE connectors SET state = 'unavailable', health_json = ?, updated_at = datetime('now') WHERE id = ?")
          .run(JSON.stringify({ ok: false, error: String(error.message ?? error) }), id);
        return json(res, 502, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/connectors/") && url.pathname.endsWith("/tools")) {
      const id = decodeURIComponent(url.pathname.replace("/api/connectors/", "").replace("/tools", ""));
      const row = getConnector(id);
      if (!row) return json(res, 404, { ok: false, error: "connector_not_found" });
      if (row.kind !== "mcp") return json(res, 400, { ok: false, error: "connector_not_mcp" });
      try {
        const tools = await listTools(id);
        return json(res, 200, { ok: true, tools: tools.map((t) => ({ name: t.name, description: t.description })) });
      } catch (error) {
        return json(res, 409, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/connectors/") && url.pathname.endsWith("/call")) {
      const id = decodeURIComponent(url.pathname.replace("/api/connectors/", "").replace("/call", ""));
      const row = getConnector(id);
      if (!row) return json(res, 404, { ok: false, error: "connector_not_found" });
      if (row.kind !== "mcp") return json(res, 400, { ok: false, error: "connector_not_mcp" });
      const body = await readJson(req);
      try {
        const result = await callTool(id, body.name, body.arguments ?? {});
        return json(res, 200, { ok: true, result });
      } catch (error) {
        return json(res, 409, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/connectors/") && url.pathname.endsWith("/disconnect")) {
      const id = decodeURIComponent(url.pathname.replace("/api/connectors/", "").replace("/disconnect", ""));
      const row = getConnector(id);
      if (!row) return json(res, 404, { ok: false, error: "connector_not_found" });
      if (row.kind !== "mcp") return json(res, 400, { ok: false, error: "connector_not_mcp" });
      disconnectServer(id);
      db.prepare("UPDATE connectors SET state = 'disconnected', updated_at = datetime('now') WHERE id = ?").run(id);
      return json(res, 200, { ok: true });
    }

    // --- Content engine: the prompt library + brief pipeline ---
    if (req.method === "GET" && url.pathname === "/api/content/prompts") {
      return json(res, 200, { prompts: listPrompts() });
    }

    if (req.method === "GET" && url.pathname === "/api/content/briefs") {
      return json(res, 200, { briefs: all("SELECT * FROM content_briefs ORDER BY updated_at DESC") });
    }

    if (req.method === "POST" && url.pathname === "/api/content/briefs") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      db.prepare(`INSERT INTO content_briefs
        (id, title, engine, source_artifact, hook, audience, channels_json, series, tone, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        id,
        String(body.title ?? "").trim() || "Untitled brief",
        body.engine ?? "antharmaya_labs",
        body.source_artifact ?? body.sourceArtifact ?? "",
        body.hook ?? "",
        body.audience ?? "",
        JSON.stringify(Array.isArray(body.channels) ? body.channels : []),
        body.series ?? "",
        body.tone ?? "",
        body.status ?? "draft",
        body.notes ?? "",
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/content/briefs/") && url.pathname.endsWith("/run")) {
      const id = decodeURIComponent(url.pathname.replace("/api/content/briefs/", "").replace("/run", ""));
      const brief = db.prepare("SELECT * FROM content_briefs WHERE id = ?").get(id);
      if (!brief) return json(res, 404, { ok: false, error: "brief_not_found" });
      const body = await readJson(req);
      const lane = body.lane ?? "research";
      const rendered = renderLanePrompt(lane, brief);
      if (!rendered) return json(res, 400, { ok: false, error: "unknown_lane" });

      const runId = randomUUID();
      const executorPref = body.executor ?? "claude-code";
      db.prepare("INSERT INTO pipeline_runs (id, brief_id, lane, executor, status, input_json) VALUES (?, ?, ?, ?, 'running', ?)")
        .run(runId, id, lane, executorPref, JSON.stringify({ prompt_id: rendered.id }));

      // Try native Claude Code (operator subscription auth). On any failure (CLI absent,
      // unauthenticated, timeout), fall back to a handoff spec the operator/agent can run.
      let out = { ok: false, error: "skipped" };
      if (executorPref !== "handoff") {
        out = await runClaudeCode(rendered.rendered, { maxTurns: 16, timeoutMs: 180000, cwd: repoRoot });
      }

      if (out.ok) {
        const research = out.json ?? { summary: out.result };
        db.prepare("UPDATE pipeline_runs SET status = 'completed', output_json = ?, finished_at = datetime('now') WHERE id = ?")
          .run(JSON.stringify({ durationMs: out.durationMs, hasJson: Boolean(out.json) }), runId);
        if (lane === "research") {
          db.prepare("UPDATE content_briefs SET research_json = ?, status = 'researched', updated_at = datetime('now') WHERE id = ?")
            .run(JSON.stringify(research), id);
        }
        return json(res, 200, { ok: true, mode: "claude-code", runId, lane, research, durationMs: out.durationMs });
      }

      mkdirSync(queueDir, { recursive: true });
      const specPath = resolve(queueDir, `content-${id}-${lane}.md`);
      writeFileSync(specPath, rendered.rendered, "utf8");
      db.prepare("UPDATE pipeline_runs SET status = 'handoff', executor = 'handoff', output_json = ?, error = ?, finished_at = datetime('now') WHERE id = ?")
        .run(JSON.stringify({ specPath }), String(out.error ?? ""), runId);
      return json(res, 200, { ok: true, mode: "handoff", runId, lane, specPath, reason: out.error });
    }

    // Advance a brief by one native lane (Claude Code research OR editorial package), persisting
    // the result. Same logic the autonomous loop uses, so a manual click and a loop cycle produce
    // identical, autonomous-quality drafts. Runs synchronously (a few minutes for a real lane).
    if (req.method === "POST" && url.pathname.startsWith("/api/content/briefs/") && url.pathname.endsWith("/advance")) {
      const id = briefPathId(url.pathname, "/advance");
      const brief = db.prepare("SELECT * FROM content_briefs WHERE id = ?").get(id);
      if (!brief) return json(res, 404, { ok: false, error: "brief_not_found" });
      const result = await advanceBrief(db, brief, { cwd: repoRoot });
      return json(res, 200, { ok: result.ok, result, details: briefDetails(id) });
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/content/briefs/") && url.pathname.endsWith("/assets")) {
      const id = briefPathId(url.pathname, "/assets");
      const brief = getBrief(id);
      if (!brief) return json(res, 404, { ok: false, error: "brief_not_found" });
      const body = await readJson(req);
      const assetId = body.id ?? randomUUID();
      const provider = body.provider ?? "huggingface";
      const kind = body.kind ?? "still";
      const prompt = compactText(body.prompt) || defaultAssetPrompt(brief);
      const manifest = {
        source: "horizon-content-engine",
        connector: body.connector ?? provider,
        toolName: body.toolName ?? "",
        usage: body.usage ?? "",
      };
      db.prepare(`INSERT INTO content_assets
        (id, brief_id, kind, provider, prompt, negative_prompt, aspect_ratio, status, manifest_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        assetId,
        id,
        kind,
        provider,
        prompt,
        compactText(body.negative_prompt ?? body.negativePrompt, 4000),
        body.aspect_ratio ?? body.aspectRatio ?? (kind === "video" ? "9:16" : "1:1"),
        body.status ?? "planned",
        JSON.stringify(manifest),
      );
      db.prepare("UPDATE content_briefs SET status = CASE WHEN status = 'draft' THEN 'asset_planned' ELSE status END, updated_at = datetime('now') WHERE id = ?").run(id);
      return json(res, 201, { ok: true, asset: db.prepare("SELECT * FROM content_assets WHERE id = ?").get(assetId), details: briefDetails(id) });
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/content/assets/") && url.pathname.endsWith("/generate")) {
      const assetId = decodeURIComponent(url.pathname.replace("/api/content/assets/", "").replace("/generate", ""));
      const asset = db.prepare("SELECT * FROM content_assets WHERE id = ?").get(assetId);
      if (!asset) return json(res, 404, { ok: false, error: "asset_not_found" });
      const body = await readJson(req);
      const connectorId = body.connector ?? asset.provider;
      const toolName = compactText(body.toolName, 180);
      if (!toolName) return json(res, 400, { ok: false, error: "tool_name_required" });
      const input = {
        prompt: asset.prompt,
        negative_prompt: asset.negative_prompt,
        aspect_ratio: asset.aspect_ratio,
        ...(body.arguments ?? {}),
      };
      const runId = randomUUID();
      db.prepare("INSERT INTO pipeline_runs (id, brief_id, lane, executor, status, input_json) VALUES (?, ?, 'generate_asset', ?, 'running', ?)")
        .run(runId, asset.brief_id, connectorId, JSON.stringify({ assetId, connectorId, toolName, arguments: input }));
      try {
        const result = await callTool(connectorId, toolName, input);
        db.prepare(`UPDATE content_assets
          SET status = 'generated', external_id = ?, result_url = ?, manifest_json = ?, updated_at = datetime('now')
          WHERE id = ?`).run(
          compactText(result?.id ?? result?.content?.[0]?.id, 500),
          compactText(result?.url ?? result?.content?.[0]?.url, 1000),
          JSON.stringify({ connectorId, toolName, result }),
          assetId,
        );
        db.prepare("UPDATE pipeline_runs SET status = 'completed', output_json = ?, finished_at = datetime('now') WHERE id = ?")
          .run(JSON.stringify({ assetId }), runId);
        return json(res, 200, { ok: true, runId, asset: db.prepare("SELECT * FROM content_assets WHERE id = ?").get(assetId) });
      } catch (error) {
        db.prepare("UPDATE content_assets SET status = 'planned', updated_at = datetime('now') WHERE id = ?").run(assetId);
        db.prepare("UPDATE pipeline_runs SET status = 'handoff', output_json = ?, error = ?, finished_at = datetime('now') WHERE id = ?")
          .run(JSON.stringify({ assetId, connectorId, toolName, arguments: input }), String(error.message ?? error), runId);
        return json(res, 409, { ok: false, runId, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/content/briefs/") && url.pathname.endsWith("/package")) {
      const id = briefPathId(url.pathname, "/package");
      const brief = getBrief(id);
      if (!brief) return json(res, 404, { ok: false, error: "brief_not_found" });
      const body = await readJson(req);
      const assets = all("SELECT * FROM content_assets WHERE brief_id = ? ORDER BY created_at", id);
      const generated = { ...packageForBrief(brief, assets), ...body };
      const packageId = body.id ?? db.prepare("SELECT id FROM content_packages WHERE brief_id = ? ORDER BY updated_at DESC LIMIT 1").get(id)?.id ?? randomUUID();
      db.prepare(`INSERT INTO content_packages
        (id, brief_id, blog, x_thread_json, linkedin, instagram_caption, reel_script_json, alt_text, cta_json, checklist_json, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          blog = excluded.blog,
          x_thread_json = excluded.x_thread_json,
          linkedin = excluded.linkedin,
          instagram_caption = excluded.instagram_caption,
          reel_script_json = excluded.reel_script_json,
          alt_text = excluded.alt_text,
          cta_json = excluded.cta_json,
          checklist_json = excluded.checklist_json,
          status = excluded.status,
          updated_at = datetime('now')`).run(
        packageId,
        id,
        generated.blog ?? "",
        Array.isArray(generated.x_thread_json) ? JSON.stringify(generated.x_thread_json) : generated.x_thread_json ?? "[]",
        generated.linkedin ?? "",
        generated.instagram_caption ?? "",
        Array.isArray(generated.reel_script_json) ? JSON.stringify(generated.reel_script_json) : generated.reel_script_json ?? "[]",
        generated.alt_text ?? "",
        Array.isArray(generated.cta_json) ? JSON.stringify(generated.cta_json) : generated.cta_json ?? "[]",
        Array.isArray(generated.checklist_json) ? JSON.stringify(generated.checklist_json) : generated.checklist_json ?? "[]",
        generated.status ?? "qa_ready",
      );
      db.prepare("UPDATE content_briefs SET status = 'packaged', updated_at = datetime('now') WHERE id = ?").run(id);
      return json(res, 200, { ok: true, package: db.prepare("SELECT * FROM content_packages WHERE id = ?").get(packageId), details: briefDetails(id) });
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/content/briefs/") && url.pathname.endsWith("/publish")) {
      const id = briefPathId(url.pathname, "/publish");
      const brief = getBrief(id);
      if (!brief) return json(res, 404, { ok: false, error: "brief_not_found" });
      const pkg = db.prepare("SELECT * FROM content_packages WHERE brief_id = ? ORDER BY updated_at DESC LIMIT 1").get(id);
      if (!pkg) return json(res, 409, { ok: false, error: "package_required" });
      const body = await readJson(req);
      const manifest = {
        publishedAt: new Date().toISOString(),
        url: body.url ?? "",
        notes: body.notes ?? "",
        manual: true,
      };
      db.prepare("UPDATE content_packages SET status = 'published', checklist_json = ?, updated_at = datetime('now') WHERE id = ?")
        .run(JSON.stringify([...jsonArray(pkg.checklist_json), `published manually ${manifest.url || manifest.publishedAt}`]), pkg.id);
      db.prepare("UPDATE content_briefs SET status = 'published', notes = ?, updated_at = datetime('now') WHERE id = ?")
        .run([brief.notes, `Published manually: ${manifest.url || manifest.publishedAt}`].filter(Boolean).join("\n"), id);
      db.prepare("INSERT INTO pipeline_runs (id, brief_id, lane, executor, status, input_json, output_json, finished_at) VALUES (?, ?, 'publish', 'manual', 'completed', ?, ?, datetime('now'))")
        .run(randomUUID(), id, JSON.stringify(body), JSON.stringify(manifest));
      return json(res, 200, { ok: true, published: manifest, details: briefDetails(id) });
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/content/briefs/") && url.pathname.endsWith("/action")) {
      const id = briefPathId(url.pathname, "/action");
      const brief = getBrief(id);
      if (!brief) return json(res, 404, { ok: false, error: "brief_not_found" });
      const body = await readJson(req);
      const actionId = body.id ?? `content-${id}-${Date.now()}`;
      db.prepare(`
        INSERT INTO action_queue (id, title, summary, source, project_id, project_path, agent, prompt, status, impact, sort_order, lane)
        VALUES (?, ?, ?, 'content-engine', ?, ?, ?, ?, 'queued', ?, ?, 'distribution')
      `).run(
        actionId,
        body.title ?? `Publish ${brief.title}`,
        body.summary ?? `Manual publish package for ${brief.engine}.`,
        brief.engine === "photoselect" ? "photoselect" : "antharmaya-labs",
        body.project_path ?? body.projectPath ?? "",
        body.agent ?? "claude",
        body.prompt ?? `Review and manually publish the content package for ${brief.title}.`,
        body.impact ?? "distribution",
        Number(body.sort_order ?? body.sortOrder ?? 0),
      );
      return json(res, 201, { ok: true, id: actionId });
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/content/briefs/") && url.pathname.endsWith("/automate")) {
      const id = briefPathId(url.pathname, "/automate");
      const brief = db.prepare("SELECT * FROM content_briefs WHERE id = ?").get(id);
      if (!brief) return json(res, 404, { ok: false, error: "brief_not_found" });
      const body = await readJson(req);
      const automate = body.automate === false ? 0 : 1;
      const autoMax = body.auto_max_status ?? brief.auto_max_status ?? "packaged";
      db.prepare("UPDATE content_briefs SET automate = ?, auto_max_status = ?, updated_at = datetime('now') WHERE id = ?")
        .run(automate, autoMax, id);
      return json(res, 200, { ok: true, id, automate: Boolean(automate), auto_max_status: autoMax });
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/content/briefs/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/content/briefs/", ""));
      const details = briefDetails(id);
      if (!details) return json(res, 404, { ok: false, error: "brief_not_found" });
      return json(res, 200, details);
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/content/briefs/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/content/briefs/", ""));
      const existing = db.prepare("SELECT * FROM content_briefs WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "brief_not_found" });
      const body = await readJson(req);
      db.prepare(`UPDATE content_briefs SET
          title = ?, engine = ?, source_artifact = ?, hook = ?, audience = ?,
          channels_json = ?, series = ?, tone = ?, status = ?, notes = ?, updated_at = datetime('now')
        WHERE id = ?`).run(
        body.title ?? existing.title,
        body.engine ?? existing.engine,
        body.source_artifact ?? existing.source_artifact,
        body.hook ?? existing.hook,
        body.audience ?? existing.audience,
        Array.isArray(body.channels) ? JSON.stringify(body.channels) : existing.channels_json,
        body.series ?? existing.series,
        body.tone ?? existing.tone,
        body.status ?? existing.status,
        body.notes ?? existing.notes,
        id,
      );
      return json(res, 200, { ok: true, id });
    }

    // ---------------------------------------------------------------- cofounder profile
    if (req.method === "GET" && url.pathname === "/api/agent-profile") {
      return json(res, 200, { ok: true, profile: readProfile(), configured: profileConfigured() });
    }
    if ((req.method === "PUT" || req.method === "POST") && url.pathname === "/api/agent-profile") {
      const body = await readJson(req);
      const profile = writeProfile(body.profile ?? body ?? {});
      return json(res, 200, { ok: true, profile, configured: profileConfigured() });
    }

    // ---------------------------------------------------------------- codebase graph
    // graph paths may live in the workspace/repo OR the opensrc dependency cache
    const graphAllowed = (abs) => pathAllowed(abs, db) || abs.startsWith(opensrcHome());
    if (req.method === "GET" && url.pathname === "/api/graph/summary") {
      const abs = resolve(url.searchParams.get("path") || repoRoot);
      if (!graphAllowed(abs)) return json(res, 400, { ok: false, error: "path_not_allowed" });
      return json(res, 200, { ok: true, ...graphSummary(abs) });
    }
    if (req.method === "GET" && url.pathname === "/api/graph/query") {
      const abs = resolve(url.searchParams.get("path") || repoRoot);
      if (!graphAllowed(abs)) return json(res, 400, { ok: false, error: "path_not_allowed" });
      const context = graphQuery(abs, url.searchParams.get("q") || "", Number(url.searchParams.get("budget")) || 600);
      return json(res, 200, { ok: true, available: !!context, context: context || "" });
    }
    if (req.method === "GET" && url.pathname === "/api/graph/affected") {
      const abs = resolve(url.searchParams.get("path") || repoRoot);
      if (!graphAllowed(abs)) return json(res, 400, { ok: false, error: "path_not_allowed" });
      const affected = graphAffected(abs, url.searchParams.get("node") || "", Number(url.searchParams.get("depth")) || 2);
      return json(res, 200, { ok: true, available: !!affected, affected: affected || "" });
    }
    if (req.method === "GET" && url.pathname === "/api/deps") {
      return json(res, 200, { ok: true, ...listDeps() });
    }
    if (req.method === "POST" && url.pathname === "/api/deps/index") {
      const body = await readJson(req);
      if (!body.name) return json(res, 400, { ok: false, error: "name_required" });
      return json(res, 200, indexDep(String(body.name)));
    }

    // ---------------------------------------------------------------- AI job plan
    if (req.method === "GET" && url.pathname === "/api/job-plan") {
      try {
        return json(res, 200, { ok: true, ...getJobPlan() });
      } catch (error) {
        return json(res, 500, { ok: false, error: String(error.message ?? error) });
      }
    }
    if (req.method === "PATCH" && url.pathname === "/api/job-plan/state") {
      const body = await readJson(req);
      if (body.day == null) return json(res, 400, { ok: false, error: "day_required" });
      patchJobPlanDay(body.day, body.patch ?? {});
      return json(res, 200, { ok: true, ...getJobPlan() });
    }
    if (req.method === "PATCH" && url.pathname === "/api/job-plan/start") {
      const body = await readJson(req);
      if (!body.startDate) return json(res, 400, { ok: false, error: "startDate_required" });
      setJobPlanStart(String(body.startDate));
      return json(res, 200, { ok: true, ...getJobPlan() });
    }

    // ---------------------------------------------------------------- workspace loader
    // Point Horizon at any folder of repos. Persists to settings + sources.json and
    // sweeps it immediately — the open-source "load your own workspace" story.
    if (req.method === "GET" && url.pathname === "/api/workspace") {
      const { existsSync, statSync } = await import("node:fs");
      const root = workspaceRootFor(db);
      const configured = !!db.prepare("SELECT value FROM app_settings WHERE key = 'workspace.root'").get()?.value;
      let exists = false;
      try { exists = existsSync(root) && statSync(root).isDirectory(); } catch { /* noop */ }
      return json(res, 200, { ok: true, root, default: workspaceRoot, configured, exists });
    }

    if (req.method === "POST" && url.pathname === "/api/workspace") {
      const body = await readJson(req);
      const { existsSync, statSync, readFileSync, writeFileSync } = await import("node:fs");
      let root = String(body.root ?? "").trim();
      if (!root) return json(res, 400, { ok: false, error: "path_required" });
      if (root.startsWith("~/")) root = resolve(process.env.HOME || "", root.slice(2));
      root = resolve(root);
      if (!existsSync(root) || !statSync(root).isDirectory()) {
        return json(res, 400, { ok: false, error: "not_a_directory" });
      }
      db.prepare(
        "INSERT INTO app_settings (key, value) VALUES ('workspace.root', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')",
      ).run(root);
      // mirror into sources.json so a fresh start also scans it
      try {
        const sp = resolve(repoRoot, ".horizon", "sources.json");
        const cfg = existsSync(sp) ? JSON.parse(readFileSync(sp, "utf8")) : { roots: [], priorities: {} };
        const roots = (cfg.roots ?? []).filter((r) => r.id !== "workspace");
        roots.unshift({ id: "workspace", type: "fs-glob", path: root, lane: "experiment", weight: 10, enabled: true });
        cfg.roots = roots;
        writeFileSync(sp, `${JSON.stringify(cfg, null, 2)}\n`);
      } catch {
        /* sources.json optional */
      }
      let sweep = null;
      try {
        sweep = runProjectSweep(db, { roots: [root] });
      } catch (error) {
        sweep = { ok: false, error: String(error.message ?? error) };
      }
      return json(res, 200, { ok: true, root, sweep });
    }

    // -------------------------------------------------------------- live runs (Phase 3)
    // Start a streaming run of an action's spec, stream it over SSE, stop it. The
    // "demo" runner streams a harmless synthetic log so the console is verifiable
    // without spawning a real repo-writing agent; claude/codex are opt-in.
    if (req.method === "POST" && url.pathname.startsWith("/api/action-queue/") && url.pathname.endsWith("/run")) {
      const id = decodeURIComponent(url.pathname.replace("/api/action-queue/", "").replace("/run", ""));
      const action = db.prepare("SELECT * FROM action_queue WHERE id = ?").get(id);
      if (!action) return json(res, 404, { ok: false, error: "action_not_found" });
      const body = await readJson(req);
      const requested = body.runner;
      const runner = ["claude", "codex", "demo"].includes(requested)
        ? requested
        : action.agent === "codex" ? "codex" : action.agent === "claude" ? "claude" : "demo";
      // confine cwd to the workspace
      let cwd = action.cwd || action.project_path || repoRoot;
      try {
        const r = resolve(cwd);
        cwd = pathAllowed(r, db) ? r : repoRoot;
      } catch {
        cwd = repoRoot;
      }
      const input = action.prompt || action.goal || action.title || "";
      let spec;
      if (runner === "claude") {
        spec = { command: process.env.HORIZON_CLAUDE_CMD ?? "claude", args: ["-p", "--output-format", "stream-json", "--verbose"], input, cwd };
      } else if (runner === "codex") {
        spec = { command: process.env.HORIZON_CODEX_CMD ?? "codex", args: ["exec"], input, cwd };
      } else {
        const safe = String(action.title || "run").replace(/["`$\\\n]/g, " ").slice(0, 80);
        spec = { command: "bash", args: ["-lc", `for i in $(seq 1 6); do echo "[demo] ${safe} — step $i/6"; sleep 0.5; done; echo "[demo] complete — this was a safe synthetic run"`], input: "", cwd };
      }
      const run = startRun({ actionId: id, agent: runner, title: action.title, ...spec });
      return json(res, 201, { ok: true, run });
    }

    if (req.method === "GET" && url.pathname === "/api/runs") {
      return json(res, 200, { ok: true, runs: listRuns() });
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/runs/") && url.pathname.endsWith("/stream")) {
      const runId = decodeURIComponent(url.pathname.replace("/api/runs/", "").replace("/stream", ""));
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      res.write(": open\n\n");
      const ok = subscribe(runId, res);
      if (!ok) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: "run_not_found" })}\n\n`);
        res.end();
        return;
      }
      req.on("close", () => unsubscribe(runId, res));
      return;
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/runs/") && url.pathname.endsWith("/stop")) {
      const runId = decodeURIComponent(url.pathname.replace("/api/runs/", "").replace("/stop", ""));
      return json(res, 200, stopRun(runId));
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/runs/")) {
      const runId = decodeURIComponent(url.pathname.replace("/api/runs/", ""));
      const run = getRun(runId);
      if (!run) return json(res, 404, { ok: false, error: "run_not_found" });
      return json(res, 200, { ok: true, run });
    }

    // ---------------------------------------------------------------- docs reader
    // List real markdown docs from the repo (docs/, root *.md, public/documents/),
    // read one by absolute path, and reveal a path in the OS file manager. Every
    // path is resolved and confined to the bolting workspace before use.
    if (req.method === "GET" && url.pathname === "/api/docs") {
      try {
        const { readdirSync, statSync, readFileSync } = await import("node:fs");
        const wsRoot = workspaceRootFor(db);
        // Generated / vendored / heavy trees we never want in the reader. `brains/`
        // alone is ~11.7k Graphify wiki files — pure noise for a hand-authored doc browser.
        const EXCLUDE = new Set([
          "node_modules", ".git", "_external", "dist", ".next", ".horizon", "graphify-out",
          "brains", "vault", ".obsidian", ".trash", "target", "build", "__pycache__",
          ".venv", "coverage", "playwright-report", "test-results", ".cache", ".idea", ".vscode",
        ]);
        const pinFor = (rel) => {
          if (rel === "_cofounder/AI-JOB-PLAN-2026.md") return "🎯 AI Job Plan";
          if (/(^|\/)COMMAND_CENTER\.md$/.test(rel)) return "⚡ Command Center";
          if (rel === "horizon-os/docs/horizon-workspace-alpha.md") return "🧭 Vision";
          if (rel === "horizon-os/docs/horizon-production-contract.md") return "📐 Production contract";
          if (/^_cofounder\/.*(week|standup|sprint|today|plan).*\.md$/i.test(rel)) return "📋 This Week";
          return null;
        };
        const groupFor = (rel) => {
          const segs = rel.split("/");
          if (segs.length === 1) return "workspace root";
          if (/^\d\d-/.test(segs[0])) return `${segs[0]}/${segs[1]}`; // 01-revenue/photoselect
          return segs[0];
        };
        const out = [];
        let scanned = 0;
        const CAP = 2000;
        const walk = (dir, depth) => {
          if (out.length >= CAP) return;
          let entries = [];
          try {
            entries = readdirSync(dir, { withFileTypes: true });
          } catch {
            return;
          }
          for (const ent of entries) {
            if (out.length >= CAP) return;
            if (ent.name.startsWith(".") || EXCLUDE.has(ent.name)) continue;
            const abs = resolve(dir, ent.name);
            if (ent.isDirectory()) {
              if (depth > 0) walk(abs, depth - 1);
            } else if (/\.mdx?$/.test(ent.name)) {
              scanned += 1;
              const rel = abs.startsWith(`${wsRoot}/`) ? abs.slice(wsRoot.length + 1) : abs;
              let size = 0;
              let mtime = null;
              try {
                const st = statSync(abs);
                size = st.size;
                mtime = st.mtime.toISOString();
              } catch {
                /* skip */
              }
              let title = ent.name.replace(/\.mdx?$/, "");
              try {
                const m = /^\s*#\s+(.+)$/m.exec(readFileSync(abs, "utf8").slice(0, 1500));
                if (m) title = m[1].trim();
              } catch {
                /* keep filename */
              }
              const pinLabel = pinFor(rel);
              out.push({ path: abs, rel, title, group: groupFor(rel), size, mtime, pinned: !!pinLabel, pinLabel });
            }
          }
        };
        walk(wsRoot, 7);
        out.sort((a, b) => (a.group || "").localeCompare(b.group || "") || (a.title || "").localeCompare(b.title || ""));
        return json(res, 200, { ok: true, docs: out, root: wsRoot, scanned });
      } catch (error) {
        return json(res, 500, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "GET" && url.pathname === "/api/docs/read") {
      const raw = url.searchParams.get("path") ?? "";
      const abs = resolve(raw);
      if (!pathAllowed(abs, db) || !/\.mdx?$/.test(abs)) {
        return json(res, 400, { ok: false, error: "path_not_allowed" });
      }
      try {
        const { readFileSync } = await import("node:fs");
        const content = readFileSync(abs, "utf8").slice(0, 500_000);
        const m = /^\s*#\s+(.+)$/m.exec(content.slice(0, 2000));
        return json(res, 200, { ok: true, path: abs, rel: abs.replace(`${repoRoot}/`, ""), title: m ? m[1].trim() : abs.split("/").pop(), content });
      } catch (error) {
        return json(res, 404, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/reveal") {
      const raw = url.searchParams.get("path") ?? (await readJson(req)).path ?? "";
      const abs = resolve(String(raw));
      if (!pathAllowed(abs, db)) {
        return json(res, 400, { ok: false, error: "path_not_allowed" });
      }
      try {
        const { existsSync, statSync } = await import("node:fs");
        if (!existsSync(abs)) return json(res, 404, { ok: false, error: "path_not_found" });
        const target = statSync(abs).isDirectory() ? abs : dirname(abs);
        const { spawn } = await import("node:child_process");
        const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer" : "xdg-open";
        const child = spawn(opener, [target], { detached: true, stdio: "ignore" });
        child.on("error", () => {});
        child.unref();
        return json(res, 200, { ok: true, path: abs, opened: target });
      } catch (error) {
        return json(res, 500, { ok: false, error: String(error.message ?? error) });
      }
    }

    // Non-API GET → serve the built SPA (so one origin serves app + API behind auth).
    if (req.method === "GET" && !url.pathname.startsWith("/api")) {
      if (serveStatic(res, url.pathname)) return;
    }

    return json(res, 404, { ok: false, error: "not_found" });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`horizon-api listening on http://127.0.0.1:${port}`);
  // Revive MCP sessions from stored tokens so connected tools (HF/Higgsfield/Google) and the
  // autonomous content loop can call them after a restart without a manual re-connect.
  try {
    const mcpServers = all("SELECT id, url FROM connectors WHERE kind = 'mcp' AND url != ''");
    reconnectStored(mcpServers)
      .then((results) => {
        const live = results.filter((r) => r.connected).map((r) => r.id);
        if (live.length) console.log(`mcp reconnected from stored tokens: ${live.join(", ")}`);
      })
      .catch(() => {});
  } catch {
    /* best-effort */
  }
});

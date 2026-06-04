import "./env.mjs";

import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openHorizonDb } from "./horizon-db.mjs";
import { latestProjectSweep, runProjectSweep } from "./project-sweep.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const todayKey = () => new Date().toISOString().slice(0, 10).replaceAll("-", "");

function parseJson(raw, fallback) {
  try {
    return JSON.parse(raw || "");
  } catch {
    return fallback;
  }
}

function projectBy(sweep, predicate, fallback = {}) {
  return sweep.projects.find(predicate) ?? fallback;
}

function topDirtyRepos(sweep, limit = 6) {
  return sweep.projects
    .filter((project) => project.git_dirty_count > 0 && project.category !== "archive")
    .sort((a, b) => b.git_dirty_count - a.git_dirty_count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

function topIdeaAssets(sweep, limit = 6) {
  return sweep.projects
    .filter((project) => project.category === "docs-and-ideas")
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit);
}

function listProjects(projects) {
  if (!projects.length) return "- No current items found.";
  return projects
    .map((project) => {
      const dirty = project.git_dirty_count ? ` (${project.git_dirty_count} dirty files)` : "";
      return `- ${project.name}${dirty}: ${project.path}`;
    })
    .join("\n");
}

function listIdeas(projects) {
  if (!projects.length) return "- No idea assets found.";
  return projects.map((project) => `- ${project.name}: ${project.path}`).join("\n");
}

function action(id, fields) {
  return {
    id: `rev-${todayKey()}-${id}`,
    source: "revenue-engine",
    status: "suggested",
    impact: "high",
    agent: "codex",
    sort_order: 20,
    ...fields,
  };
}

export function generateRevenueActions(db = openHorizonDb(), options = {}) {
  const sweep = options.sweep === false ? latestProjectSweep(db) : runProjectSweep(db);
  const currentSweep = sweep.run ? sweep : latestProjectSweep(db);

  const photoSelect = projectBy(
    currentSweep,
    // Match the live engine by path/id; tolerant of the bolting folder layout so a
    // category rename (e.g. active-money -> 01-revenue) never strands the generator.
    (project) => /photoselect/i.test(project.project_id) && !/desktop-photoselect/i.test(project.path ?? "") && /bolting/.test(project.path ?? ""),
    { project_id: "photoselect", name: "PhotoSelect", path: "/home/driftr/Desktop/bolting/01-revenue/photoselect" },
  );
  const horizon = projectBy(
    currentSweep,
    (project) => project.project_id === "horizon-os" || /horizon-dashboard-preview/i.test(project.path),
    { project_id: "horizon-os", name: "Horizon OS", path: repoRoot },
  );
  const dirtyRepos = topDirtyRepos(currentSweep);
  const ideaAssets = topIdeaAssets(currentSweep);
  const dirtyContext = listProjects(dirtyRepos);
  const ideaContext = listIdeas(ideaAssets);
  const cycle = new Date().toISOString().slice(0, 10);

  const actions = [
    action("photoselect-paid-proof", {
      title: "Create today's PhotoSelect paid-proof artifact",
      summary:
        "Convert the flagship product into one no-call buyer signal today: pricing/CTA, useful studio artifact, or async pilot proof.",
      project_id: "photoselect",
      project_path: photoSelect.path,
      sort_order: 10,
      prompt: [
        "You are working inside PhotoSelect. Goal: create one artifact that can produce paid signal without calls, face, or paid ads.",
        "",
        "Context:",
        `- Cycle: ${cycle}`,
        "- Buyer: Indian wedding/event studios.",
        "- Constraint: no sales calls, no paid marketing, no face required.",
        "- Win condition: a studio owner can understand the value, click/DM/join/pay asynchronously.",
        "",
        "Do exactly this:",
        "1. Inspect the current landing/onboarding/pricing surfaces.",
        "2. Pick the smallest paid-proof artifact: paid waitlist CTA, pricing copy, studio workflow one-pager, demo script, or useful public tool.",
        "3. Implement or draft it in the right repo-native place.",
        "4. Leave a short runbook with the exact post/DM/reddit copy needed to test it.",
        "",
        "Done criteria:",
        "- One public or shareable artifact exists.",
        "- One copy block is ready to post.",
        "- One measurable buyer signal is defined.",
      ].join("\n"),
    }),
    action("varbees-sku-spec", {
      title: "Lock one varbees fast-cash SKU",
      summary:
        "Turn existing Horizon infrastructure into one sellable developer product with free core, paid gate, price, and 7-day scope.",
      project_id: "horizon-os",
      project_path: horizon.path,
      sort_order: 20,
      prompt: [
        "You are working inside Horizon OS. Goal: choose one varbees open-core fast-cash SKU from existing code, not a new idea.",
        "",
        "Candidate assets already built:",
        "- SQLite action queue and deployable prompts.",
        "- Obsidian vault sync.",
        "- RSS signals and usage telemetry.",
        "- Project sweep and symlink index.",
        "- Bright command-center UI.",
        "",
        "Produce:",
        "1. Buyer profile.",
        "2. Pain and urgency.",
        "3. Free open-source core.",
        "4. Paid gate.",
        "5. Price.",
        "6. 7-day MVP scope.",
        "7. README outline and launch post.",
        "",
        "Reject anything that needs calls, paid ads, or more than 7 days before proof.",
      ].join("\n"),
    }),
    action("repo-triage", {
      title: "Triage dirty repos by money relevance",
      summary:
        "Dirty work is only useful if it advances PhotoSelect, varbees, or a bounded proof. Convert scattered diffs into one execution queue.",
      project_id: "horizon-os",
      project_path: horizon.path,
      sort_order: 30,
      prompt: [
        "Use this project sweep context to triage dirty repos. Do not clean everything.",
        "",
        "Dirty repo context:",
        dirtyContext,
        "",
        "Produce a 3-column triage:",
        "1. Commit now because it supports money/proof.",
        "2. Park because it is useful but not current.",
        "3. Ignore/archive because it distracts.",
        "",
        "For each commit-now item, provide the exact next command or agent prompt. Keep PhotoSelect and varbees above everything else.",
      ].join("\n"),
    }),
    action("idea-mining", {
      title: "Mine downloaded research into three cash offers",
      summary:
        "Extract buyer, pain, price, and first artifact from the strongest downloaded research docs instead of letting them sit as inspiration.",
      project_id: "horizon-os",
      project_path: horizon.path,
      agent: "gemini",
      sort_order: 40,
      prompt: [
        "Use these research and idea assets as raw material. Extract only cash-flow options that match the current no-call, faceless, technical-founder constraint.",
        "",
        "Idea assets:",
        ideaContext,
        "",
        "Output exactly three offers:",
        "- Offer name.",
        "- Buyer.",
        "- Pain.",
        "- Price.",
        "- First artifact to ship in 48 hours.",
        "- Why it can be sold without calls.",
        "",
        "Then pick one. Do not create more strategy than can be acted on today.",
      ].join("\n"),
    }),
    action("distribution-queue", {
      title: "Generate today's faceless distribution queue",
      summary:
        "Create one original post, ten high-value replies, and one Reddit/IndieHackers post tied to PhotoSelect or varbees.",
      project_id: "horizon-os",
      project_path: horizon.path,
      agent: "claude",
      sort_order: 50,
      prompt: [
        "Create today's faceless distribution queue. The aim is buyer signal, not vanity.",
        "",
        "Rules:",
        "- No face.",
        "- No paid ads.",
        "- No sales calls.",
        "- Make it useful enough that a buyer or builder would save it.",
        "",
        "Output:",
        "1. One X/LinkedIn original post for PhotoSelect or varbees.",
        "2. Ten reply prompts to use under relevant larger accounts or community posts.",
        "3. One Reddit/IndieHackers post framed as a useful build note, not a pitch.",
        "4. One metric to record in Horizon tonight.",
      ].join("\n"),
    }),
  ];

  db.prepare("UPDATE action_queue SET status = 'dismissed', updated_at = datetime('now') WHERE source = 'revenue-engine' AND status IN ('suggested', 'queued') AND created_at < datetime('now', '-7 days')").run();
  const keepIds = actions.map((item) => item.id);
  db.prepare(`
    UPDATE action_queue
    SET status = 'dismissed', updated_at = datetime('now')
    WHERE source = 'revenue-engine'
      AND status IN ('suggested', 'queued')
      AND id NOT IN (${keepIds.map(() => "?").join(", ")})
  `).run(...keepIds);

  const upsert = db.prepare(`
    INSERT INTO action_queue (id, title, summary, source, project_id, project_path, agent, prompt, status, impact, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      summary = excluded.summary,
      source = excluded.source,
      project_id = excluded.project_id,
      project_path = excluded.project_path,
      agent = excluded.agent,
      prompt = excluded.prompt,
      status = CASE
        WHEN action_queue.status IN ('deployed', 'done') THEN action_queue.status
        ELSE excluded.status
      END,
      impact = excluded.impact,
      sort_order = excluded.sort_order,
      updated_at = datetime('now')
  `);

  actions.forEach((item) => {
    upsert.run(
      item.id,
      item.title,
      item.summary,
      item.source,
      item.project_id,
      item.project_path,
      item.agent,
      item.prompt,
      item.status,
      item.impact,
      item.sort_order,
    );
  });

  db.prepare("INSERT INTO command_log (id, actor, action, target, payload_json) VALUES (?, ?, ?, ?, ?)").run(
    randomUUID(),
    "horizon",
    "revenue_actions_generate",
    "action_queue",
    JSON.stringify({
      generated: actions.map((item) => item.id),
      sweepRunId: currentSweep.run?.id ?? null,
      dirtyRepos: dirtyRepos.length,
      ideaAssets: ideaAssets.length,
    }),
  );

  return {
    ok: true,
    generated: actions,
    sweep: currentSweep,
  };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  const db = openHorizonDb();
  const result = generateRevenueActions(db, { sweep: !process.argv.includes("--no-sweep") });
  console.log(`generated ${result.generated.length} revenue actions`);
}

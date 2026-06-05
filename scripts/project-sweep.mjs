import "./env.mjs";

import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { openHorizonDb } from "./horizon-db.mjs";
import { loadSources, priorityFor, syncSourcesToDb } from "./sources.mjs";
import { portfolioProjects } from "../src/data/portfolio.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const home = homedir();
const desktop = resolve(home, "Desktop");
// Roots come from the config-driven source registry (.horizon/sources.json), not hardcode.
// Env HORIZON_PROJECT_SWEEP_ROOTS still appends ad-hoc roots for power users.
const sourcesConfig = loadSources();
const scanRoots = [
  ...new Set(
    String(process.env.HORIZON_PROJECT_SWEEP_ROOTS ?? "")
      .split(":")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => resolve(part.startsWith("~/") ? join(home, part.slice(2)) : part))
      .concat(sourcesConfig.roots.map((source) => source.absPath))
      .filter(existsSync),
  ),
];
const boltingRoot = resolve(desktop, "bolting");
const indexRoot = resolve(process.env.HORIZON_PROJECT_INDEX ?? join(boltingRoot, "_horizon_project_index"));
const outputMd = resolve(repoRoot, ".horizon", "project-sweep.md");

const categories = ["active-money", "strategic-proof", "resurrect-candidates", "archive", "docs-and-ideas", "unknown-review"];
const excludedNames = new Set([
  ".git",
  ".next",
  ".venv",
  ".vite",
  "__pycache__",
  "_horizon_project_index",
  "build",
  "ccode",
  "dist",
  "node_modules",
  "openclaw",
  "target",
  "threedotslabs",
]);
const externalPattern = /(?:^|[-_])(openclaw|claude-code|claude_code|claudecli|anthropic[-_]?quickstarts|wild-workouts)(?:[-_]|$)/i;
const markers = [
  "package.json",
  "go.mod",
  "pyproject.toml",
  "requirements.txt",
  "Cargo.toml",
  "pubspec.yaml",
  "wrangler.toml",
  "next.config.js",
  "vite.config.js",
  "Dockerfile",
  "README.md",
];
const ideaExtensions = new Set([".md", ".pdf", ".html", ".htm", ".zip"]);
const ideaWords = /(wealth|income|plan|blueprint|playbook|plantsage|photoselect|horizon|antharmaya|social|skills|saas|cash|financial|dialysis|codex|jules|agent|outskill)/i;

const knownCategory = new Map([
  ["photoselect", "active-money"],
  ["varbees-fast-cash", "active-money"],
  ["horizon-os", "active-money"],
  ["billing-copilot-invoai", "active-money"],
  ["sept-wework-liquilogic", "active-money"],
  ["hskg", "archive"],
  ["dialysis-saathi", "archive"],
  ["dialysissaathi", "archive"],
  ["desktop-photoselect", "archive"],
  ["plantsage", "strategic-proof"],
  ["ff-planter", "strategic-proof"],
  ["agent-linux-control", "strategic-proof"],
  ["rateguard", "active-money"],
  ["antharmaya-labs", "strategic-proof"],
  ["layers-ai-studio", "resurrect-candidates"],
  ["widgetforge", "resurrect-candidates"],
  ["vault-wealth", "strategic-proof"],
  ["anthar-vault", "strategic-proof"],
]);

function expandPath(raw) {
  if (!raw || raw.startsWith("github.com/") || raw.startsWith("http")) return null;
  return resolve(raw.startsWith("~/") ? join(home, raw.slice(2)) : raw);
}

function splitPaths(raw) {
  return String(raw ?? "")
    .split(/\s+\+\s+/)
    .map((part) => expandPath(part.trim()))
    .filter((path) => path && existsSync(path));
}

function safeName(input, ext = "") {
  const stem = String(input)
    .replace(ext, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return `${stem || "item"}${ext}`;
}

function runGit(dir, args) {
  try {
    return execFileSync("git", ["-C", dir, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    }).trim();
  } catch {
    return "";
  }
}

function gitSummary(path, kind) {
  const dir = kind === "file" ? dirname(path) : path;
  const top = runGit(dir, ["rev-parse", "--show-toplevel"]);
  if (!top) return {};
  const status = runGit(top, ["status", "--short"]);
  const last = runGit(top, ["log", "-1", "--pretty=format:%h|%ad|%s", "--date=short"]);
  const [hash = "", date = "", subject = ""] = last.split("|");
  return {
    is_git: 1,
    branch: runGit(top, ["branch", "--show-current"]) || "(detached)",
    dirty_count: status ? status.split(/\r?\n/).filter(Boolean).length : 0,
    dirty: status ? 1 : 0,
    last_commit: [hash, subject].filter(Boolean).join(" "),
    last_commit_at: date,
    commit_count: Number(runGit(top, ["rev-list", "--count", "HEAD"]) || 0),
    status_short: status,
  };
}

function categoryFromNumberedPath(path) {
  const normalized = String(path ?? "").replaceAll("\\", "/");
  if (normalized.includes("/01-revenue/")) return "active-money";
  if (normalized.includes("/02-fast-cash/rateguard")) return "active-money";
  if (normalized.includes("/02-fast-cash/")) return "resurrect-candidates";
  if (normalized.includes("/03-strategic/")) return "strategic-proof";
  if (normalized.includes("/04-clients/")) return "archive";
  if (normalized.includes("/05-salvage/")) return "archive";
  if (normalized.includes("/06-reference/")) return "archive";
  if (normalized.includes("/07-archive/")) return "archive";
  return "";
}

function hasMarker(dir) {
  if (existsSync(join(dir, ".git"))) return true;
  return markers.some((marker) => existsSync(join(dir, marker)));
}

function packageStack(dir) {
  try {
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    if (deps.next) return "Next.js";
    if (deps.vite) return "Vite";
    if (deps.react) return "React";
    return "Node";
  } catch {
    return "Node";
  }
}

function stackClues(path, kind) {
  if (kind === "file") return [extname(path).replace(".", "").toUpperCase()].filter(Boolean);
  const clues = [];
  const has = (file) => existsSync(join(path, file));
  if (has("package.json")) clues.push(packageStack(path));
  if (has("go.mod")) clues.push("Go");
  if (has("pyproject.toml") || has("requirements.txt")) clues.push("Python");
  if (has("Cargo.toml")) clues.push("Rust");
  if (has("pubspec.yaml")) clues.push("Flutter/Dart");
  if (has("wrangler.toml")) clues.push("Cloudflare");
  if (has("Dockerfile") || has("docker-compose.yml")) clues.push("Docker");
  return [...new Set(clues)];
}

function categoryFor(candidate) {
  if (candidate.category) return candidate.category;
  if (candidate.lane === "Focus Now") return "active-money";
  if (candidate.lane === "Strategic Asset") return "strategic-proof";
  if (candidate.lane === "Resurrect") return "resurrect-candidates";
  if (candidate.lane === "Archive" || candidate.lane === "Park") return "archive";
  if (["Client Sites", "Content", "Merge", "Research", "Training"].includes(candidate.lane)) return "archive";
  if (candidate.kind === "file") return "docs-and-ideas";
  if (knownCategory.has(candidate.id)) return knownCategory.get(candidate.id);
  const numberedCategory = categoryFromNumberedPath(candidate.path);
  if (numberedCategory) return numberedCategory;
  return "unknown-review";
}

function addCandidate(map, candidate) {
  if (!candidate.path || !existsSync(candidate.path)) return;
  if (externalPattern.test(candidate.path)) return;
  const kind = statSync(candidate.path).isDirectory() ? "directory" : "file";
  const real = kind === "directory" ? realpathSync(candidate.path) : resolve(candidate.path);
  const prior = map.get(real);
  if (prior?.source === "portfolio" || prior?.source === "runtime") return;
  if (prior && candidate.source === "scan") return;
  map.set(real, { kind, ...candidate, path: real });
}

function scanDirectories(root, map) {
  if (!existsSync(root)) return;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (excludedNames.has(entry.name) || externalPattern.test(entry.name)) continue;
    const first = join(root, entry.name);
    if (hasMarker(first)) {
      addCandidate(map, {
        id: safeName(entry.name),
        name: entry.name,
        path: first,
        lane: "Unknown",
        status: "Discovered",
        next_action: "Classify or ignore from Horizon.",
        relevance: "Discovered by local project sweep.",
        source: "scan",
      });
      continue;
    }
    if (root.includes("Downloads")) continue;
    let nested = [];
    try {
      nested = readdirSync(first, { withFileTypes: true }).slice(0, 80);
    } catch {
      nested = [];
    }
    for (const child of nested) {
      if (!child.isDirectory()) continue;
      if (excludedNames.has(child.name) || externalPattern.test(child.name)) continue;
      const second = join(first, child.name);
      if (hasMarker(second)) {
        addCandidate(map, {
          id: safeName(`${entry.name}-${child.name}`),
          name: `${entry.name}/${child.name}`,
          path: second,
          lane: "Unknown",
          status: "Discovered",
          next_action: "Classify or ignore from Horizon.",
          relevance: "Nested project discovered by local project sweep.",
          source: "scan",
        });
      }
    }
  }
}

function scanIdeaFiles(root, map) {
  if (!existsSync(root)) return;
  for (const entry of readdirSync(root, { withFileTypes: true }).slice(0, 500)) {
    if (!entry.isFile()) continue;
    const ext = extname(entry.name).toLowerCase();
    if (!ideaExtensions.has(ext) || !ideaWords.test(entry.name)) continue;
    const path = join(root, entry.name);
    addCandidate(map, {
      id: safeName(entry.name, ext),
      name: entry.name,
      path,
      lane: "Research",
      status: "Idea asset",
      category: "docs-and-ideas",
      relevance: "High-signal idea or research asset for cash-flow and product direction.",
      next_action: "Extract one buyer, one offer, or one reusable playbook if it supports PhotoSelect or varbees.",
      source: "idea-file",
    });
  }
}

function linkCandidate(project) {
  const categoryDir = join(indexRoot, project.category);
  mkdirSync(categoryDir, { recursive: true });
  const ext = project.kind === "file" ? extname(project.path) : "";
  const name = safeName(project.project_id || project.name || basename(project.path), ext);
  const linkPath = join(categoryDir, name);
  try {
    if (existsSync(linkPath)) {
      const info = lstatSync(linkPath);
      if (!info.isSymbolicLink()) return { path: linkPath, error: "index path exists and is not a symlink" };
      rmSync(linkPath);
    }
    symlinkSync(project.path, linkPath);
    return { path: linkPath, error: "" };
  } catch (error) {
    return { path: linkPath, error: String(error.message ?? error) };
  }
}

function cleanIndex() {
  mkdirSync(indexRoot, { recursive: true });
  for (const category of categories) {
    const categoryDir = join(indexRoot, category);
    mkdirSync(categoryDir, { recursive: true });
    for (const entry of readdirSync(categoryDir, { withFileTypes: true })) {
      const entryPath = join(categoryDir, entry.name);
      if (lstatSync(entryPath).isSymbolicLink()) rmSync(entryPath);
    }
  }
}

function markdown(snapshot) {
  const lines = [
    "# Horizon Project Index",
    "",
    `Generated: ${snapshot.run.finished_at}`,
    `Index root: \`${snapshot.run.index_root}\``,
    "",
    "Non-destructive symlink index. Original repos/files stay where they are.",
    "",
    "## Summary",
    "",
    `- Projects/docs indexed: ${snapshot.summary.projects}`,
    `- Git repos: ${snapshot.summary.git_repos}`,
    `- Dirty repos: ${snapshot.summary.dirty_repos}`,
    "",
  ];

  for (const category of categories) {
    const rows = snapshot.projects.filter((project) => project.category === category);
    if (!rows.length) continue;
    lines.push(`## ${category}`, "");
    for (const project of rows) {
      const dirty = project.git_dirty_count ? ` · ${project.git_dirty_count} dirty` : "";
      const stack = project.stack.length ? ` · ${project.stack.join(", ")}` : "";
      lines.push(`- **${project.name}**${dirty}${stack}`);
      lines.push(`  - Source: \`${project.path}\``);
      lines.push(`  - Link: \`${project.index_link}\``);
      lines.push(`  - Next: ${project.next_action}`);
    }
    lines.push("");
  }

  const dirty = snapshot.projects.filter((project) => project.git_dirty_count > 0);
  lines.push("## Dirty Repo Queue", "");
  if (!dirty.length) {
    lines.push("_No dirty indexed repos._", "");
  } else {
    dirty.slice(0, 20).forEach((project) => {
      lines.push(`- **${project.name}**: ${project.git_dirty_count} dirty files on \`${project.git_branch || "unknown"}\` — ${project.next_action}`);
    });
    lines.push("");
  }
  lines.push("## Rule", "");
  lines.push("Daily work starts with PhotoSelect revenue proof and the varbees fast-cash SKU. Everything else is proof, archive, or later leverage until buyer signal appears.");
  lines.push("");
  return lines.join("\n");
}

function buildCandidates() {
  const map = new Map();
  for (const project of portfolioProjects) {
    splitPaths(project.path).forEach((path, index) => {
      addCandidate(map, {
        id: splitPaths(project.path).length > 1 ? safeName(`${project.id}-${basename(path)}`) : project.id,
        name: splitPaths(project.path).length > 1 ? `${project.name} / ${basename(path)}` : project.name,
        path,
        lane: project.lane,
        status: project.status,
        relevance: project.role,
        next_action: project.next,
        source: "portfolio",
      });
    });
  }

  addCandidate(map, {
    id: "horizon-os",
    name: "Horizon OS",
    path: repoRoot,
    lane: "Focus Now",
    status: "Revenue command base",
    relevance: "Local-first operating layer for money actions, sweeps, vault sync, signals, and agent prompts.",
    next_action: "Only build features that make PhotoSelect or varbees easier to execute this week.",
    source: "runtime",
  });

  addCandidate(map, {
    id: "plantsage-field-assets",
    name: "PlantSage Field Assets",
    path: resolve(desktop, "plantsagefieldwork_and_assets"),
    lane: "Strategic Asset",
    status: "Field media asset pack",
    category: "strategic-proof",
    relevance: "PlantSage fieldwork photos and videos; useful for proof, place packs, and visual documentation.",
    next_action: "Reference only unless building a PlantSage place-pack or proof page.",
    source: "known-asset",
  });

  scanRoots.forEach((root) => {
    scanDirectories(root, map);
    scanIdeaFiles(root, map);
  });
  return [...map.values()];
}

export function latestProjectSweep(db) {
  const run = db
    .prepare("SELECT * FROM project_sweep_runs WHERE status = 'ok' ORDER BY finished_at DESC LIMIT 1")
    .get();
  if (!run) return { run: null, summary: { projects: 0, git_repos: 0, dirty_repos: 0 }, projects: [] };
  const rows = db
    .prepare("SELECT * FROM project_sweep_projects WHERE run_id = ? ORDER BY category, name")
    .all(run.id);
  const projects = rows.map((row) => ({
    ...row,
    is_git: Boolean(row.is_git),
    git_dirty: Boolean(row.git_dirty),
    stack: JSON.parse(row.stack_json || "[]"),
    signals: JSON.parse(row.signals_json || "{}"),
  }));
  return {
    run: {
      ...run,
      root_paths: JSON.parse(run.root_paths_json || "[]"),
      summary: JSON.parse(run.summary_json || "{}"),
    },
    summary: JSON.parse(run.summary_json || "{}"),
    projects,
  };
}

export function runProjectSweep(db = openHorizonDb()) {
  const runId = randomUUID();
  const started = new Date().toISOString();
  cleanIndex();

  syncSourcesToDb(db, sourcesConfig.roots); // mirror declared roots into the registry table

  db.prepare(`
    INSERT INTO project_sweep_runs (id, root_paths_json, index_root, status, started_at)
    VALUES (?, ?, ?, 'running', ?)
  `).run(runId, JSON.stringify(scanRoots), indexRoot, started);

  try {
    const projects = buildCandidates()
      .map((candidate) => {
        const category = categoryFor(candidate);
        const stack = stackClues(candidate.path, candidate.kind);
        const git = gitSummary(candidate.path, candidate.kind);
        // Per-project money weighting from the source registry (config-driven).
        const prio = priorityFor(sourcesConfig.priorities, candidate.id);
        const project = {
          run_id: runId,
          project_id: candidate.id,
          name: candidate.name,
          path: candidate.path,
          kind: candidate.kind,
          source: candidate.source,
          category,
          lane: prio?.lane || candidate.lane || "Unknown",
          status: candidate.status ?? "",
          relevance: candidate.relevance ?? "",
          next_action: candidate.next_action ?? "",
          stack,
          signals: {
            relative_path: relative(home, candidate.path),
            index_error: "",
            dirty_status: git.status_short ?? "",
            weight: prio?.weight ?? 0,
            lane_source: prio ? "config" : "default",
          },
          is_git: git.is_git ?? 0,
          git_branch: git.branch ?? "",
          git_dirty: git.dirty ?? 0,
          git_dirty_count: git.dirty_count ?? 0,
          last_commit: git.last_commit ?? "",
          last_commit_at: git.last_commit_at ?? "",
          commit_count: git.commit_count ?? 0,
        };
        const link = linkCandidate(project);
        project.index_link = link.path;
        project.signals.index_error = link.error;
        return project;
      })
      .sort((a, b) => {
        const categoryDelta = categories.indexOf(a.category) - categories.indexOf(b.category);
        return categoryDelta || a.name.localeCompare(b.name);
      });

    const insert = db.prepare(`
      INSERT INTO project_sweep_projects (
        id, run_id, project_id, name, path, kind, source, category, lane, status, relevance,
        next_action, index_link, is_git, git_branch, git_dirty, git_dirty_count, last_commit,
        last_commit_at, commit_count, stack_json, signals_json, last_seen_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    projects.forEach((project, index) => {
      insert.run(
        `${runId}:${index}`,
        runId,
        project.project_id,
        project.name,
        project.path,
        project.kind,
        project.source,
        project.category,
        project.lane,
        project.status,
        project.relevance,
        project.next_action,
        project.index_link,
        project.is_git,
        project.git_branch,
        project.git_dirty,
        project.git_dirty_count,
        project.last_commit,
        project.last_commit_at,
        project.commit_count,
        JSON.stringify(project.stack),
        JSON.stringify(project.signals),
      );
    });

    const summary = {
      projects: projects.length,
      git_repos: projects.filter((project) => project.is_git).length,
      dirty_repos: projects.filter((project) => project.git_dirty_count > 0).length,
      docs_and_ideas: projects.filter((project) => project.category === "docs-and-ideas").length,
    };
    const finished = new Date().toISOString();
    db.prepare(`
      UPDATE project_sweep_runs
      SET status = 'ok', finished_at = ?, summary_json = ?
      WHERE id = ?
    `).run(finished, JSON.stringify(summary), runId);

    const snapshot = {
      ok: true,
      run: { id: runId, started_at: started, finished_at: finished, index_root: indexRoot, root_paths: scanRoots },
      summary,
      projects,
    };
    mkdirSync(dirname(outputMd), { recursive: true });
    const md = markdown(snapshot);
    writeFileSync(outputMd, md, "utf8");
    writeFileSync(join(indexRoot, "PROJECTS.md"), md, "utf8");
    return snapshot;
  } catch (error) {
    db.prepare(`
      UPDATE project_sweep_runs
      SET status = 'error', finished_at = ?, error_json = ?
      WHERE id = ?
    `).run(new Date().toISOString(), JSON.stringify({ message: String(error.message ?? error) }), runId);
    throw error;
  }
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  const db = openHorizonDb();
  const run = () => {
    const snapshot = runProjectSweep(db);
    console.log(`indexed ${snapshot.summary.projects} items (${snapshot.summary.dirty_repos} dirty repos)`);
    console.log(`index: ${snapshot.run.index_root}`);
  };
  run();
  if (process.argv.includes("--watch")) {
    const minutes = Math.max(5, Number(process.env.HORIZON_PROJECT_SWEEP_INTERVAL_MINUTES ?? 60));
    console.log(`watching every ${minutes} minutes`);
    setInterval(run, minutes * 60_000);
  }
}

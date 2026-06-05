import "./env.mjs";

// Config-driven source registry — the v2 keystone. Replaces the hardcoded sweep root with
// `.horizon/sources.json`: declared ingestion roots + per-project money weighting. Adding a
// root or re-weighting a project is config, never code. New source TYPES (github-api,
// cloudflare, stripe) slot in behind the same shape later — for now only fs-glob exists.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const home = homedir();
const SOURCES_PATH = process.env.HORIZON_SOURCES ?? resolve(repoRoot, ".horizon", "sources.json");

const expand = (p) => (p && p.startsWith("~") ? home + p.slice(1) : p);

// Default: bolting is the only ingestion root (operator's call — it's a goldmine of
// components). The revenue engine + fast-cash SDK are promoted to the top by weight.
const DEFAULT_SOURCES = {
  roots: [
    { id: "bolting", type: "fs-glob", path: "~/Desktop/bolting", lane: "experiment", weight: 10, enabled: true },
  ],
  priorities: {
    photoselect: { lane: "revenue-engine", weight: 100 },
    rateguard: { lane: "fast-cash", weight: 80 },
  },
};

function normalize(cfg) {
  const roots = (cfg.roots ?? [])
    .map((r) => {
      const path = expand(r.path ?? r.root ?? "");
      return {
        id: r.id ?? r.path ?? path,
        type: r.type ?? "fs-glob",
        path,
        absPath: path ? resolve(path) : "",
        lane: r.lane ?? "",
        weight: Number(r.weight ?? 0),
        enabled: r.enabled !== false,
      };
    })
    .filter((r) => r.absPath && r.enabled);
  return { roots, priorities: cfg.priorities ?? {}, path: SOURCES_PATH };
}

export function loadSources() {
  if (!existsSync(SOURCES_PATH)) {
    mkdirSync(dirname(SOURCES_PATH), { recursive: true });
    writeFileSync(SOURCES_PATH, `${JSON.stringify(DEFAULT_SOURCES, null, 2)}\n`);
    return normalize(DEFAULT_SOURCES);
  }
  try {
    return normalize(JSON.parse(readFileSync(SOURCES_PATH, "utf8")));
  } catch {
    return normalize(DEFAULT_SOURCES);
  }
}

// Per-project money weighting by project_id / slug. Tolerant of prefixed ids the sweep emits
// (e.g. "01-revenue-photoselect" still matches the "photoselect" priority).
export function priorityFor(priorities, projectId) {
  if (!projectId || !priorities) return null;
  if (priorities[projectId]) return priorities[projectId];
  for (const [slug, val] of Object.entries(priorities)) {
    if (new RegExp(`(^|[-/_])${slug}($|[-/_])`, "i").test(projectId)) return val;
  }
  return null;
}

// Mirror the declared roots into the project_sources registry table (config -> DB sync).
export function syncSourcesToDb(db, roots) {
  const upsert = db.prepare(`
    INSERT INTO project_sources (id, type, root, config_json, lane, weight, enabled, last_ingested_at, updated_at)
    VALUES (?, ?, ?, '{}', ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      type = excluded.type, root = excluded.root, lane = excluded.lane,
      weight = excluded.weight, enabled = excluded.enabled,
      last_ingested_at = datetime('now'), updated_at = datetime('now')
  `);
  for (const r of roots) upsert.run(r.id, r.type, r.absPath, r.lane, r.weight, r.enabled ? 1 : 0);
}

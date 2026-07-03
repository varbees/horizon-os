import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

// Graph-as-context (the pattern every research source converged on): never inject
// raw graph.json. Instead query the Graphify graph with `graphify query --budget`
// and hand the agent a compact, token-bounded structural block. Also a cheap
// god-nodes summary parsed straight from graph.json (no CLI, no LLM).
//
// Warnings baked in from the research:
//  - sanitize punctuation (Graphify's query tokenizer splits on whitespace and a
//    trailing "?" fails to match the normalized label)
//  - pass --graph explicitly (older CLIs hardcode graphify-out/graph.json)

const GRAPHIFY = process.env.HORIZON_GRAPHIFY_CMD || "graphify";

export function graphPathFor(projectPath) {
  if (!projectPath) return null;
  const p = resolve(projectPath, "graphify-out", "graph.json");
  return existsSync(p) ? p : null;
}

function sanitize(q) {
  return String(q || "").replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
}

// Run a budgeted graph query. Returns compact text, or null if no graph / CLI missing.
export function graphQuery(projectPath, question, budget = 600) {
  const graph = graphPathFor(projectPath);
  if (!graph) return null;
  const q = sanitize(question);
  if (!q) return null;
  try {
    const out = spawnSync(GRAPHIFY, ["query", q, "--budget", String(budget), "--graph", graph], {
      cwd: projectPath,
      encoding: "utf8",
      timeout: 20000,
      env: { ...process.env, GRAPHIFY_OUT: resolve(projectPath, "graphify-out") },
    });
    if (out.error || out.status !== 0) return null;
    return (out.stdout || "").trim() || null;
  } catch {
    return null;
  }
}

// A compact system-context block for prompt injection. Empty string when no graph.
export function graphContextBlock(projectPath, question, budget = 600) {
  const body = graphQuery(projectPath, question, budget);
  if (!body) return "";
  return [
    "## Codebase graph context (query the graph before reading files)",
    "```",
    body,
    "```",
    "Traverse these edges first; open source files only if the graph is insufficient.",
  ].join("\n");
}

// Impact radius — "what breaks if I change X". Reverse-traverses the graph from a
// node to the things that depend on it. Returns compact text, or null.
export function graphAffected(projectPath, node, depth = 2) {
  const graph = graphPathFor(projectPath);
  if (!graph) return null;
  const n = String(node || "").replace(/[^\w\s().-]/g, " ").trim().slice(0, 120);
  if (!n) return null;
  try {
    const out = spawnSync(GRAPHIFY, ["affected", n, "--depth", String(depth), "--graph", graph], {
      cwd: projectPath,
      encoding: "utf8",
      timeout: 20000,
      env: { ...process.env, GRAPHIFY_OUT: resolve(projectPath, "graphify-out") },
    });
    if (out.error || out.status !== 0) return null;
    return (out.stdout || "").trim() || null;
  } catch {
    return null;
  }
}

// Cheap god-nodes + health summary straight from graph.json — powers the atlas panel.
export function graphSummary(projectPath) {
  const graph = graphPathFor(projectPath);
  if (!graph) return { available: false };
  let g;
  try {
    g = JSON.parse(readFileSync(graph, "utf8"));
  } catch {
    return { available: false };
  }
  const nodes = g.nodes || [];
  const edges = g.edges || g.links || [];
  const deg = new Map();
  const idOf = (v) => (v && typeof v === "object" ? v.id ?? v.name : v);
  for (const e of edges) {
    const s = idOf(e.source);
    const t = idOf(e.target);
    deg.set(s, (deg.get(s) || 0) + 1);
    deg.set(t, (deg.get(t) || 0) + 1);
  }
  const label = new Map(nodes.map((n) => [n.id, n.label || n.name || n.id]));
  const src = new Map(nodes.map((n) => [n.id, n.src || n.file || ""]));
  const communities = new Set(nodes.map((n) => n.community).filter((c) => c != null));
  const godNodes = [...deg.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([id, degree]) => ({ id, label: label.get(id) || id, src: src.get(id) || "", degree }));
  return {
    available: true,
    graph,
    nodes: nodes.length,
    edges: edges.length,
    communities: communities.size,
    godNodes,
  };
}

import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync, spawn } from "node:child_process";

// opensrc + Graphify: pull a dependency's real source locally and turn it into a
// queryable graph, so agents develop against the actual dependency code instead
// of guessing from docs/types. Combines the two tools per the research: opensrc
// resolves + version-locks + clones; Graphify indexes; deploys can query it.

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OPENSRC_HOME = process.env.OPENSRC_HOME || resolve(process.env.HOME || "", ".opensrc");
const OPENSRC = process.env.HORIZON_OPENSRC_CMD || "opensrc";
const GRAPHIFY = process.env.HORIZON_GRAPHIFY_CMD || "graphify";

export function opensrcHome() {
  return OPENSRC_HOME;
}

function readSources() {
  const p = resolve(OPENSRC_HOME, "sources.json");
  if (!existsSync(p)) return { packages: [] };
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return { packages: [] };
  }
}

function absOf(pkg) {
  return resolve(OPENSRC_HOME, pkg.path);
}
function hasGraph(abs) {
  return !!abs && existsSync(resolve(abs, "graphify-out", "graph.json"));
}
// Prefer the library's source dir — that's the implementation an agent cares about.
function graphTarget(abs) {
  for (const sub of ["src", "source", "lib"]) {
    const c = resolve(abs, sub);
    if (existsSync(c)) return c;
  }
  return abs;
}

export function listDeps() {
  const sources = readSources();
  const packages = (sources.packages || []).map((p) => {
    const abs = absOf(p);
    const target = graphTarget(abs);
    return {
      name: p.name,
      version: p.version,
      registry: p.registry || "npm",
      path: abs,
      graphTarget: target,
      hasGraph: hasGraph(target) || hasGraph(abs),
    };
  });
  let projectDeps = [];
  try {
    const pj = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
    projectDeps = Object.keys({ ...(pj.dependencies || {}), ...(pj.devDependencies || {}) });
  } catch {
    /* no package.json */
  }
  const fetched = new Set(packages.map((p) => p.name));
  return { packages, projectDeps, unfetched: projectDeps.filter((n) => !fetched.has(n)) };
}

// Resolve (fetching on miss) + build a graph for one dependency. Graphify runs in
// the background (deepseek backend handles any docs); the client polls listDeps().
export function indexDep(name) {
  if (!/^[@a-z0-9._/-]+$/i.test(String(name || ""))) return { ok: false, error: "bad_name" };
  const pathRes = spawnSync(OPENSRC, ["path", name], { cwd: repoRoot, encoding: "utf8", timeout: 150000 });
  let abs = (pathRes.stdout || "").trim();
  if (!abs || !existsSync(abs)) {
    const f = spawnSync(OPENSRC, ["fetch", name], { cwd: repoRoot, encoding: "utf8", timeout: 150000 });
    if (f.status !== 0) return { ok: false, error: (f.stderr || f.error?.message || "fetch failed").toString().slice(0, 300) };
    abs = (spawnSync(OPENSRC, ["path", name], { cwd: repoRoot, encoding: "utf8", timeout: 30000 }).stdout || "").trim();
  }
  if (!abs || !existsSync(abs)) return { ok: false, error: "unresolved_path" };
  const target = graphTarget(abs);
  try {
    const child = spawn(GRAPHIFY, [target, "--backend", "deepseek"], { cwd: target, detached: true, stdio: "ignore", env: process.env });
    child.on("error", () => {});
    child.unref();
  } catch (e) {
    return { ok: false, error: String(e?.message ?? e) };
  }
  return { ok: true, started: true, name, path: abs, target };
}

import { buildPreflightContext, formatPreflightContext } from "./preflight-context.mjs";
import { profileContextBlock } from "./agent-profile.mjs";
import { graphContextBlock } from "./graph-context.mjs";
import { internetContextBlock } from "./internet.mjs";
import { listDeps } from "./deps.mjs";

// The single grounding an agent gets before it runs, shared by the API (interactive
// deploy/enrich) and the background loop (sweep→generate→enrich) so every path that
// produces a spec starts from the same context: durable memory + operator profile +
// graded lessons + a budgeted codebase graph (+ fresh web results for live deploys).

export function recentLessonsBlock(db) {
  try {
    const rows = db
      .prepare("SELECT grade, title, note FROM agent_grades WHERE COALESCE(note,'') != '' ORDER BY graded_at DESC LIMIT 6")
      .all();
    if (!rows.length) return "";
    return ["## Lessons from graded runs (apply these; don't repeat mistakes)", ...rows.map((r) => `- [${r.grade}] ${r.title}: ${r.note}`)].join("\n");
  } catch {
    return "";
  }
}

// When a task mentions a dependency we've fetched + graphed (opensrc + Graphify),
// inject that library's own internals so the agent reasons against real code, not
// docs. Gated on name-match, so it costs nothing for tasks that don't touch a dep.
function depsGraphBlock(action) {
  try {
    const graphed = (listDeps().packages || []).filter((p) => p.hasGraph);
    if (!graphed.length) return "";
    const hay = `${action.title || ""} ${action.summary || ""} ${action.prompt || ""}`.toLowerCase();
    const relevant = graphed.filter((p) => hay.includes(String(p.name).toLowerCase())).slice(0, 2);
    const blocks = [];
    for (const dep of relevant) {
      const q = graphContextBlock(dep.graphTarget, action.title, 300);
      if (q) blocks.push(`### Dependency: ${dep.name}@${dep.version}\n${q}`);
    }
    return blocks.length ? ["## Dependency internals (query these for library behavior; don't guess)", ...blocks].join("\n\n") : "";
  } catch {
    return "";
  }
}

export async function composeAgentContext(db, action, { internet = false } = {}) {
  const base = formatPreflightContext(buildPreflightContext(db, action));
  const profile = profileContextBlock();
  const lessons = recentLessonsBlock(db);
  const graph = graphContextBlock(action.project_path, action.title, 600);
  const deps = depsGraphBlock(action);
  let net = "";
  if (internet) {
    try {
      net = await internetContextBlock(action.title, 400);
    } catch {
      net = "";
    }
  }
  return [base, profile, lessons, graph, deps, net].filter(Boolean).join("\n\n");
}

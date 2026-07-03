import { useEffect, useState } from "react";
import { Network, GitBranch, AlertCircle, Loader2 } from "lucide-react";
import Panel from "./Panel.jsx";
import { SkeletonText } from "./ui/Skeleton.jsx";
import { fetchGraphSummary, fetchAffected, buildGraph } from "../lib/agentProfileApi.js";

// Codebase atlas — the "god nodes" (most-depended-on files) parsed from a project's
// Graphify graph.json. Shows what everything hangs off, so onboarding + deploys are
// grounded in the real structure, not a guess.

export default function CodebaseAtlas({ path, compact = false }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [openNode, setOpenNode] = useState(null); // { id, loading, text }
  const [building, setBuilding] = useState(false);

  async function build() {
    if (!path) return;
    setBuilding(true);
    try {
      await buildGraph(path);
    } catch {
      /* surfaced below */
    }
  }

  useEffect(() => {
    let active = true;
    setSummary(null);
    setError("");
    setOpenNode(null);
    fetchGraphSummary(path)
      .then((s) => active && setSummary(s))
      .catch((e) => active && setError(e.message));
    return () => { active = false; };
  }, [path]);

  async function showImpact(n) {
    if (openNode?.id === n.id) { setOpenNode(null); return; }
    setOpenNode({ id: n.id, loading: true, text: "" });
    try {
      const r = await fetchAffected(summary.graph ? path : path, n.label, 2);
      setOpenNode({ id: n.id, loading: false, text: r.available ? r.affected : "No dependents found." });
    } catch (e) {
      setOpenNode({ id: n.id, loading: false, text: e.message });
    }
  }

  if (summary === null && !error) return <Panel className="p-4"><SkeletonText lines={compact ? 4 : 6} /></Panel>;

  if (error || !summary?.available) {
    return (
      <Panel className="p-4">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-brass"><Network className="h-3.5 w-3.5" /> Codebase atlas</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-paper/54">
          <AlertCircle className="h-3.5 w-3.5" /> No graph for this repo yet.
        </p>
        {path ? (
          <button
            type="button"
            onClick={build}
            disabled={building}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[11px] font-black text-onPrimary transition hover:brightness-110 disabled:opacity-50"
          >
            {building ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Network className="h-3.5 w-3.5" />}
            {building ? "Building graph… (refresh in ~1 min)" : "Build graph"}
          </button>
        ) : null}
      </Panel>
    );
  }

  const max = summary.godNodes?.[0]?.degree || 1;

  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-brass"><Network className="h-3.5 w-3.5" /> Codebase atlas · god nodes</p>
        <span className="font-mono text-[10px] text-paper/44">{summary.nodes} nodes · {summary.edges} edges · {summary.communities} communities</span>
      </div>
      <div className="mt-3 space-y-1">
        {(summary.godNodes || []).slice(0, compact ? 6 : 10).map((n) => (
          <div key={n.id}>
            <button type="button" onClick={() => showImpact(n)} className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left transition hover:bg-surfaceContainer" title={`${n.src || n.label} — click for impact radius`}>
              <GitBranch className="h-3 w-3 shrink-0 text-primary/70" aria-hidden="true" />
              <span className="w-40 shrink-0 truncate text-[13px] font-black text-paper">{n.label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surfaceVariant">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((n.degree / max) * 100)}%` }} />
              </div>
              <span className="w-8 shrink-0 text-right font-mono text-[10px] text-paper/48">{n.degree}</span>
            </button>
            {openNode?.id === n.id ? (
              <div className="ml-5 mt-1 rounded-md border border-outlineVariant bg-surfaceVariant p-2 font-mono text-[10px] leading-4 text-paper/64">
                {openNode.loading ? <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> impact radius…</span> : <pre className="max-h-32 overflow-auto whitespace-pre-wrap">{openNode.text}</pre>}
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-paper/46">Highest-connected files — click one for its impact radius (what breaks if you change it).</p>
    </Panel>
  );
}

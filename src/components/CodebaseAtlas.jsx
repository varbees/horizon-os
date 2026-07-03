import { useEffect, useState } from "react";
import { Network, GitBranch, AlertCircle } from "lucide-react";
import Panel from "./Panel.jsx";
import { SkeletonText } from "./ui/Skeleton.jsx";
import { fetchGraphSummary } from "../lib/agentProfileApi.js";

// Codebase atlas — the "god nodes" (most-depended-on files) parsed from a project's
// Graphify graph.json. Shows what everything hangs off, so onboarding + deploys are
// grounded in the real structure, not a guess.

export default function CodebaseAtlas({ path, compact = false }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setSummary(null);
    setError("");
    fetchGraphSummary(path)
      .then((s) => active && setSummary(s))
      .catch((e) => active && setError(e.message));
    return () => { active = false; };
  }, [path]);

  if (summary === null && !error) return <Panel className="p-4"><SkeletonText lines={compact ? 4 : 6} /></Panel>;

  if (error || !summary?.available) {
    return (
      <Panel className="p-4">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-brass"><Network className="h-3.5 w-3.5" /> Codebase atlas</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-paper/54">
          <AlertCircle className="h-3.5 w-3.5" /> No graph for this repo yet. Run <code className="mx-1 rounded bg-surfaceVariant px-1">graphify .</code> in it.
        </p>
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
      <div className="mt-3 space-y-1.5">
        {(summary.godNodes || []).slice(0, compact ? 6 : 10).map((n) => (
          <div key={n.id} className="flex items-center gap-2">
            <GitBranch className="h-3 w-3 shrink-0 text-primary/70" aria-hidden="true" />
            <span className="w-40 shrink-0 truncate text-[13px] font-black text-paper" title={n.src || n.label}>{n.label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surfaceVariant">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((n.degree / max) * 100)}%` }} />
            </div>
            <span className="w-8 shrink-0 text-right font-mono text-[10px] text-paper/48">{n.degree}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-paper/46">Highest-connected files — change these carefully; everything depends on them.</p>
    </Panel>
  );
}

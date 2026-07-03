import { useEffect, useState } from "react";
import { Package, Loader2, Check, Plus, Network } from "lucide-react";
import Panel from "./Panel.jsx";
import { SkeletonText } from "./ui/Skeleton.jsx";
import { fetchDeps, indexDependency } from "../lib/agentProfileApi.js";
import { useUiStore } from "../store/uiStore.js";

// Dependencies as graphs — pull a dependency's real source (opensrc) and index it
// (Graphify) so agents can query the library's internals, not guess from docs.

export default function DependenciesPanel() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState("");
  const [draft, setDraft] = useState("");

  async function load() {
    try { setData(await fetchDeps()); } catch { setData({ packages: [], unfetched: [] }); }
  }
  useEffect(() => { load(); }, []);

  async function index(name) {
    if (!name) return;
    setBusy(name);
    try {
      const r = await indexDependency(name);
      if (r.ok) pushToast({ tone: "success", title: "Indexing", message: `${name} → graph building in background` });
      else pushToast({ tone: "error", title: "Index failed", message: r.error || "unknown" });
      setTimeout(load, 4000);
    } catch (e) {
      pushToast({ tone: "error", title: "Index failed", message: e.message });
    } finally {
      setBusy("");
      setDraft("");
    }
  }

  if (!data) return <Panel className="p-4"><SkeletonText lines={5} /></Panel>;

  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-brass"><Package className="h-3.5 w-3.5" /> Dependencies as graphs</p>
        <span className="font-mono text-[10px] text-paper/44">{data.packages?.length || 0} fetched · {data.projectDeps?.length || 0} in project</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && index(draft.trim())} placeholder="package name (e.g. react-markdown)" className="min-w-0 flex-1 rounded-md border border-outlineVariant bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-primary" />
        <button type="button" onClick={() => index(draft.trim())} disabled={!draft.trim() || busy === draft.trim()} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-black text-onPrimary disabled:opacity-50">
          {busy === draft.trim() ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Pull & graph
        </button>
      </div>

      {data.packages?.length ? (
        <div className="mt-3 space-y-1.5">
          {data.packages.map((p) => (
            <div key={p.name} className="flex items-center gap-2 rounded-md border border-outlineVariant bg-surfaceVariant px-3 py-1.5">
              <span className="min-w-0 flex-1 truncate text-sm font-black text-paper">{p.name} <span className="font-mono text-[10px] text-paper/44">@{p.version}</span></span>
              {p.hasGraph ? (
                <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-signal"><Network className="h-3 w-3" /> graphed</span>
              ) : (
                <button type="button" onClick={() => index(p.name)} disabled={busy === p.name} className="inline-flex items-center gap-1 rounded-md border border-outlineVariant bg-surface px-2 py-0.5 text-[10px] font-black text-paper/64 hover:text-paper disabled:opacity-50">
                  {busy === p.name ? <Loader2 className="h-3 w-3 animate-spin" /> : <Network className="h-3 w-3" />} graph
                </button>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {data.unfetched?.length ? (
        <div className="mt-3">
          <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-paper/44">Project deps not pulled yet — click to pull + graph</p>
          <div className="flex flex-wrap gap-1.5">
            {data.unfetched.slice(0, 12).map((n) => (
              <button key={n} type="button" onClick={() => index(n)} disabled={busy === n} className="inline-flex items-center gap-1 rounded-full border border-outlineVariant bg-surfaceVariant px-2.5 py-1 text-xs font-bold text-paper/64 hover:border-primary/40 hover:text-paper disabled:opacity-50">
                {busy === n ? <Loader2 className="h-3 w-3 animate-spin" /> : null}{n}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

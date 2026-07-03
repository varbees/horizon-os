import { useState } from "react";
import { Search, Loader2, ExternalLink, Rocket, Globe } from "lucide-react";
import Panel from "./Panel.jsx";
import { webSearch } from "../lib/researchApi.js";
import { useUiStore } from "../store/uiStore.js";

// Surfaces the internet capability (backend /api/web/search) the agents shipped but
// never gave a UI. Search the live web, open a result, or hand it to an agent —
// the same web results also inject into live deploys.

export default function WebSearchPanel() {
  const openInspector = useUiStore((s) => s.openInspector);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  async function run(e) {
    e?.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setError("");
    try {
      const data = await webSearch(q.trim(), 8);
      if (data.ok === false) setError(data.error || "search unavailable");
      setResults(data.results ?? []);
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="p-4">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass">Research the web</p>
      </div>
      <form onSubmit={run} className="mt-2 flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-outlineVariant bg-surface px-2.5 py-1.5">
          <Search className="h-4 w-4 shrink-0 text-paper/40" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search live — AI news, docs, competitors…" className="min-w-0 flex-1 bg-transparent text-sm text-paper outline-none placeholder:text-paper/36" />
        </div>
        <button type="submit" disabled={busy || !q.trim()} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-black text-onPrimary transition hover:brightness-110 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
        </button>
      </form>

      {error ? <p className="mt-2 text-xs text-rust">{error === "Failed to fetch" ? "Start the API (npm run dev:full) to search." : error}</p> : null}

      {results?.length ? (
        <div className="mt-3 space-y-2">
          {results.map((r, i) => (
            <div key={i} className="rounded-md border border-outlineVariant bg-surfaceVariant p-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 text-sm font-black text-paper">{r.title || r.url}</p>
                <div className="flex shrink-0 items-center gap-1">
                  {r.url ? <a href={r.url} target="_blank" rel="noreferrer noopener" className="grid h-6 w-6 place-items-center rounded border border-outlineVariant text-paper/50 hover:text-primary" aria-label="Open"><ExternalLink className="h-3.5 w-3.5" /></a> : null}
                  <button
                    type="button"
                    onClick={() => openInspector({ type: "web result", title: r.title || r.url, subtitle: r.url, source: r.url, body: r.snippet || "", suggestedActions: ["research"] })}
                    className="grid h-6 w-6 place-items-center rounded border border-outlineVariant text-paper/50 hover:text-primary"
                    aria-label="Deploy an agent on this"
                  >
                    <Rocket className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {r.snippet ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-paper/56">{r.snippet}</p> : null}
              {r.url ? <p className="mt-0.5 truncate font-mono text-[10px] text-paper/40">{r.url}</p> : null}
            </div>
          ))}
        </div>
      ) : results && !error ? (
        <p className="mt-2 text-xs text-paper/48">No results.</p>
      ) : null}
    </Panel>
  );
}

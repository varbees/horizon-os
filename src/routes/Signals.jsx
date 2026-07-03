import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  LayoutGrid,
  List as ListIcon,
  Plus,
  RefreshCw,
  Rocket,
  Rss,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import Panel from "../components/Panel.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import ConnectorActionStrip from "../components/ConnectorActionStrip.jsx";
import WebSearchPanel from "../components/WebSearchPanel.jsx";
import SegmentedControl from "../components/ui/SegmentedControl.jsx";
import { useUiStore } from "../store/uiStore.js";
import {
  addSignalSource,
  deleteSignalSource,
  fetchSignals,
  refreshSignals,
  setSignalStatus,
} from "../lib/signalsApi.js";
import { signalCategories, signalSeed, signalSourceSeed } from "../data/horizon.js";

const VIEWS = ["grid", "list", "saved"];
const RANGES = [
  { id: "24h", label: "24H", ms: 24 * 3600 * 1000 },
  { id: "week", label: "Week", ms: 7 * 24 * 3600 * 1000 },
  { id: "all", label: "All", ms: Infinity },
];

const seedState = {
  sources: signalSourceSeed.map((s) => ({ id: s.id, name: s.name, url: s.url, category: s.category, kind: s.kind, active: 1 })),
  signals: signalSeed.map((s) => ({
    id: s.id,
    source_name: s.sourceName,
    category: s.category,
    kind: s.kind,
    title: s.title,
    url: s.url,
    summary: s.summary,
    thumbnail: s.thumbnail,
    published_at: s.publishedAt,
    status: "new",
  })),
};

function signalToEntity(s) {
  return {
    type: "signal",
    id: s.id,
    title: s.title,
    subtitle: s.source_name,
    source: s.url,
    body: s.summary,
    tags: [s.category, s.kind].filter(Boolean),
    meta: [
      { label: "Source", value: s.source_name },
      { label: "Category", value: s.category },
    ],
    suggestedActions: ["summarize"],
  };
}

function relativeTime(value) {
  if (!value) return "";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 0)}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function Signals() {
  const [data, setData] = useState(seedState);
  const [source, setSource] = useState("seed");
  const [view, setView] = useState("grid");
  const [range, setRange] = useState("all");
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [showSources, setShowSources] = useState(false);

  function load() {
    return fetchSignals()
      .then((live) => {
        if (!live) return;
        setData({ sources: live.sources ?? [], signals: live.signals ?? [] });
        setSource("live");
      })
      .catch(() => {});
  }

  useEffect(() => {
    load();
  }, []);

  async function doRefresh() {
    if (source !== "live") {
      setLastRefresh({ error: "Start npm run dev:full to fetch live feeds." });
      return;
    }
    setRefreshing(true);
    try {
      const result = await refreshSignals();
      await load();
      setLastRefresh({ inserted: result.inserted, sources: result.sources, errors: result.errors?.length ?? 0 });
    } catch {
      setLastRefresh({ error: "Refresh failed." });
    } finally {
      setRefreshing(false);
    }
  }

  function mark(id, status) {
    setData((prev) => ({ ...prev, signals: prev.signals.map((s) => (s.id === id ? { ...s, status } : s)) }));
    if (source === "live") setSignalStatus(id, status).catch(() => {});
  }

  const counts = useMemo(() => {
    const map = { All: 0 };
    for (const c of signalCategories) map[c] = 0;
    for (const s of data.signals) {
      if (s.status === "dismissed") continue;
      map.All += 1;
      map[s.category] = (map[s.category] ?? 0) + 1;
    }
    return map;
  }, [data.signals]);

  const visible = useMemo(() => {
    const rangeMs = RANGES.find((r) => r.id === range)?.ms ?? Infinity;
    const q = query.trim().toLowerCase();
    return data.signals.filter((s) => {
      if (s.status === "dismissed") return false;
      if (view === "saved" && s.status !== "saved") return false;
      if (category !== "All" && s.category !== category) return false;
      if (rangeMs !== Infinity && s.published_at) {
        if (Date.now() - new Date(s.published_at).getTime() > rangeMs) return false;
      }
      if (q && !`${s.title} ${s.summary} ${s.source_name}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data.signals, view, range, category, query]);

  async function submitSource(payload) {
    const local = { id: `local-${Date.now()}`, active: 1, ...payload };
    setData((prev) => ({ ...prev, sources: [...prev.sources, local] }));
    if (source === "live") addSignalSource(payload).catch(() => {});
  }

  function removeSource(id) {
    setData((prev) => ({ ...prev, sources: prev.sources.filter((s) => s.id !== id) }));
    if (source === "live") deleteSignalSource(id).catch(() => {});
  }

  return (
    <div>
      <SectionHeader
        eyebrow="News & Signals v1.0"
        title="Your founder intelligence feed."
        copy="A local RSS command surface for founder execution, GTM, India market timing, creator-market proof, and AI tool releases. It is curated to create action fuel, not passive reading."
        action={
          <button
            type="button"
            onClick={doRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-black text-onPrimary transition hover:bg-primary/90 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            {refreshing ? "Fetching..." : "Refresh"}
          </button>
        }
      />

      <section className="mb-4">
        <ConnectorActionStrip surface="signals" />
      </section>

      <section className="mb-4">
        <WebSearchPanel />
      </section>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {["All", ...signalCategories].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold transition",
                category === c ? "border-primary bg-primary text-onPrimary" : "border-outlineVariant bg-surfaceVariant text-paper/60 hover:text-paper",
              ].join(" ")}
            >
              {c}
              <span className={`font-mono text-[10px] ${category === c ? "text-onPrimary/70" : "text-paper/40"}`}>{counts[c] ?? 0}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowSources((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md border border-outlineVariant bg-surfaceVariant px-3 py-1.5 text-sm font-bold text-paper/70 hover:text-paper"
        >
          <Settings2 className="h-4 w-4" aria-hidden="true" /> Sources ({data.sources.length})
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SegmentedControl
            label="Signal view"
            options={VIEWS.map((v) => ({ id: v, label: v === "grid" ? "Grid" : v === "list" ? "List" : "Saved" }))}
            value={view}
            onChange={setView}
          />
          <SegmentedControl
            label="Signal date range"
            options={RANGES.map((r) => ({ id: r.id, label: r.label }))}
            value={range}
            onChange={setRange}
          />
        </div>
        <input
          type="search"
          placeholder="Search signals..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-[12rem] flex-1 rounded-md border border-outlineVariant bg-white/70 px-3 py-1.5 text-sm text-paper outline-none sm:max-w-xs"
        />
      </div>

      {lastRefresh ? (
        <p className="mb-4 font-mono text-xs text-paper/56">
          {lastRefresh.error
            ? lastRefresh.error
            : `Pulled ${lastRefresh.sources} sources · ${lastRefresh.inserted} new${lastRefresh.errors ? ` · ${lastRefresh.errors} source errors` : ""}.`}
        </p>
      ) : null}

      {showSources ? (
        <Panel className="mb-4 p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Feed sources</p>
          <SourceForm onAdd={submitSource} />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {data.sources.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 rounded-md border border-outlineVariant bg-surfaceVariant px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-paper">{s.name}</p>
                  <p className="truncate font-mono text-[10px] text-paper/42">{s.category} · {s.url}</p>
                </div>
                <button type="button" onClick={() => removeSource(s.id)} aria-label="Remove source" className="shrink-0 rounded-md border border-outlineVariant p-1.5 text-paper/40 hover:text-rust">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {visible.length === 0 ? (
        <Panel className="p-10 text-center">
          <Rss className="mx-auto h-8 w-8 text-paper/40" aria-hidden="true" />
          <p className="mt-3 text-sm font-bold text-paper/64">No signals here yet.</p>
          <p className="mt-1 text-sm text-paper/48">{source === "live" ? "Hit Refresh to pull your feeds." : "Start npm run dev:full, then Refresh."}</p>
        </Panel>
      ) : view === "list" || view === "saved" ? (
        <div className="space-y-2">
          {visible.map((s) => (
            <SignalRow key={s.id} signal={s} onSave={() => mark(s.id, s.status === "saved" ? "new" : "saved")} onDismiss={() => mark(s.id, "dismissed")} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((s) => (
            <SignalCard key={s.id} signal={s} onSave={() => mark(s.id, s.status === "saved" ? "new" : "saved")} onDismiss={() => mark(s.id, "dismissed")} />
          ))}
        </div>
      )}
    </div>
  );
}

function SignalCard({ signal, onSave, onDismiss }) {
  const openInspector = useUiStore((s) => s.openInspector);
  return (
    <article className="flex flex-col overflow-hidden rounded-[var(--hz-radius-md)] border border-outlineVariant bg-surface">
      {signal.thumbnail ? (
        <a href={signal.url || undefined} target="_blank" rel="noreferrer" className="block aspect-video overflow-hidden bg-surfaceVariant">
          <img src={signal.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
        </a>
      ) : null}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-primary">{signal.source_name}</span>
          <span className="shrink-0 font-mono text-[10px] text-paper/42">{relativeTime(signal.published_at)}</span>
        </div>
        <a href={signal.url || undefined} target="_blank" rel="noreferrer" className="mt-1.5 text-sm font-black leading-5 text-paper hover:text-primary">
          {signal.title}
        </a>
        {signal.summary ? <p className="mt-2 line-clamp-3 text-xs leading-5 text-paper/56">{signal.summary}</p> : null}
        <div className="mt-3 flex items-center gap-2 border-t border-outlineVariant pt-3">
          <span className="rounded-md bg-surfaceVariant px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-paper/46">{signal.category}</span>
          <div className="ml-auto flex items-center gap-1">
            <IconBtn onClick={() => openInspector(signalToEntity(signal))} label="Deploy an agent"><Rocket className="h-4 w-4" aria-hidden="true" /></IconBtn>
            <IconBtn onClick={onSave} active={signal.status === "saved"} label="Save">
              {signal.status === "saved" ? <BookmarkCheck className="h-4 w-4" aria-hidden="true" /> : <Bookmark className="h-4 w-4" aria-hidden="true" />}
            </IconBtn>
            {signal.url ? (
              <a href={signal.url} target="_blank" rel="noreferrer" className="rounded-md border border-outlineVariant p-1.5 text-paper/50 hover:text-primary" aria-label="Open">
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : null}
            <IconBtn onClick={onDismiss} label="Dismiss"><X className="h-4 w-4" aria-hidden="true" /></IconBtn>
          </div>
        </div>
      </div>
    </article>
  );
}

function SignalRow({ signal, onSave, onDismiss }) {
  const openInspector = useUiStore((s) => s.openInspector);
  return (
    <article className="flex items-center gap-3 rounded-md border border-outlineVariant bg-surface p-3">
      {signal.thumbnail ? (
        <img src={signal.thumbnail} alt="" loading="lazy" className="h-12 w-20 shrink-0 rounded object-cover" />
      ) : (
        <span className="grid h-12 w-20 shrink-0 place-items-center rounded bg-surfaceVariant"><Rss className="h-4 w-4 text-paper/40" aria-hidden="true" /></span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-primary">{signal.source_name}</span>
          <span className="font-mono text-[10px] text-paper/42">{relativeTime(signal.published_at)}</span>
        </div>
        <a href={signal.url || undefined} target="_blank" rel="noreferrer" className="block truncate text-sm font-black text-paper hover:text-primary">{signal.title}</a>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <IconBtn onClick={() => openInspector(signalToEntity(signal))} label="Deploy an agent"><Rocket className="h-4 w-4" aria-hidden="true" /></IconBtn>
        <IconBtn onClick={onSave} active={signal.status === "saved"} label="Save">
          {signal.status === "saved" ? <BookmarkCheck className="h-4 w-4" aria-hidden="true" /> : <Bookmark className="h-4 w-4" aria-hidden="true" />}
        </IconBtn>
        <IconBtn onClick={onDismiss} label="Dismiss"><X className="h-4 w-4" aria-hidden="true" /></IconBtn>
      </div>
    </article>
  );
}

function IconBtn({ onClick, active, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`rounded-md border p-1.5 transition ${active ? "border-signal/40 bg-signal/12 text-signal" : "border-outlineVariant text-paper/50 hover:text-paper"}`}
    >
      {children}
    </button>
  );
}

function SourceForm({ onAdd }) {
  const [name, setName] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [category, setCategory] = useState(signalCategories[0]);

  function submit(e) {
    e.preventDefault();
    if (!name.trim() || !feedUrl.trim()) return;
    onAdd({ name: name.trim(), url: feedUrl.trim(), category, kind: "rss" });
    setName("");
    setFeedUrl("");
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-wrap items-center gap-2">
      <input type="text" placeholder="Source name" value={name} onChange={(e) => setName(e.target.value)} className="min-w-0 flex-1 rounded-md border border-outlineVariant bg-white/70 px-2 py-1.5 text-sm text-paper outline-none" />
      <input type="url" placeholder="Feed URL" value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} className="min-w-0 flex-[2] rounded-md border border-outlineVariant bg-white/70 px-2 py-1.5 font-mono text-xs text-paper outline-none" />
      <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-md border border-outlineVariant bg-white/70 px-2 py-1.5 text-sm text-paper outline-none">
        {signalCategories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <button type="submit" className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-black text-onPrimary"><Plus className="h-4 w-4" aria-hidden="true" /> Add</button>
    </form>
  );
}

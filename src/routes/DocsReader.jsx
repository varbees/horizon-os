import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText, FolderOpen, Copy, Check, Search, List, Rocket, RefreshCw, AlertCircle,
  ChevronRight, ChevronDown, ArrowUp, Folder, Pin,
} from "lucide-react";
import MarkdownView, { extractToc } from "../components/MarkdownView.jsx";
import { SkeletonText } from "../components/ui/Skeleton.jsx";
import { fetchDocs, readDoc, revealPath } from "../lib/docsApi.js";
import { useUiStore } from "../store/uiStore.js";

// Full-screen, workspace-wide markdown reader. The sidebar groups every hand-authored
// .md across ~/Desktop/bolting by project folder (generated brains/ excluded), pins the
// key operating docs on top, and the reader fills the screen with a comfortable column.

const COLLAPSE_KEY = "horizon.docs.collapsed.v2";

function loadCollapsed() {
  try { return new Set(JSON.parse(localStorage.getItem(COLLAPSE_KEY) || "[]")); } catch { return new Set(); }
}

export default function DocsReader() {
  const pushToast = useUiStore((s) => s.pushToast);
  const openInspector = useUiStore((s) => s.openInspector);
  const [docs, setDocs] = useState(null);
  const [root, setRoot] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(null);
  const [doc, setDoc] = useState(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(loadCollapsed);
  const [showTop, setShowTop] = useState(false);
  const contentRef = useRef(null);

  async function load() {
    setError("");
    try {
      const data = await fetchDocs();
      setDocs(data.docs ?? []);
      setRoot(data.root ?? "");
      if (!active) {
        const pin = (data.docs ?? []).find((d) => d.pinned) || (data.docs ?? [])[0];
        if (pin) select(pin);
      }
    } catch (e) {
      setError(e.message);
      setDocs([]);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function select(entry) {
    setActive(entry);
    setLoadingDoc(true);
    setDoc(null);
    contentRef.current?.scrollTo({ top: 0 });
    try {
      setDoc(await readDoc(entry.path));
    } catch (e) {
      setDoc({ content: `# Could not read\n\n\`${e.message}\``, title: entry.title, rel: entry.rel });
    } finally {
      setLoadingDoc(false);
    }
  }

  const filtered = useMemo(
    () => (docs ?? []).filter((d) => !query || `${d.title} ${d.rel}`.toLowerCase().includes(query.toLowerCase())),
    [docs, query],
  );
  const pinned = useMemo(() => filtered.filter((d) => d.pinned), [filtered]);
  const groups = useMemo(() => {
    const map = new Map();
    for (const d of filtered) {
      if (!map.has(d.group)) map.set(d.group, []);
      map.get(d.group).push(d);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  function toggleGroup(g) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g); else next.add(g);
      try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...next])); } catch { /* noop */ }
      return next;
    });
  }

  const toc = useMemo(() => extractToc(doc?.content), [doc?.content]);
  function jumpTo(id) {
    contentRef.current?.querySelector(`#${CSS.escape(id)}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function reveal() {
    if (!active) return;
    try { await revealPath(active.path); pushToast({ tone: "success", title: "Opened in file explorer", message: active.rel }); }
    catch (e) { pushToast({ tone: "error", title: "Could not open", message: e.message }); copyPath(); }
  }
  function copyPath() {
    if (!active) return;
    navigator.clipboard?.writeText(active.path).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); });
  }
  function deployOnDoc() {
    if (!active || !doc) return;
    openInspector({ type: "doc", title: doc.title || active.title, subtitle: active.rel, source: active.path, body: doc.content?.slice(0, 8000), tags: [active.group], suggestedActions: ["summarize"] });
  }

  const total = docs?.length ?? 0;

  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-[30rem] flex-col">
      {/* compact header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-brass">Docs · Workspace reader</p>
          <h1 className="font-display text-2xl font-bold text-paper">Every runbook, folder by folder.</h1>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper/40">{total} docs · {root}</p>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[18rem_minmax(0,1fr)] 2xl:grid-cols-[19rem_minmax(0,1fr)_15rem]">
        {/* sidebar */}
        <aside className="glass hz-scroll flex min-h-0 flex-col overflow-hidden rounded-[var(--hz-radius-md)]">
          <div className="border-b border-outlineVariant p-2.5">
            <div className="flex items-center gap-2 rounded-md border border-outlineVariant bg-surface px-2.5 py-1.5">
              <Search className="h-4 w-4 shrink-0 text-paper/40" aria-hidden="true" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter all docs…" className="min-w-0 flex-1 bg-transparent text-sm text-paper outline-none placeholder:text-paper/36" />
              <button type="button" onClick={load} title="Refresh" className="text-paper/40 hover:text-paper"><RefreshCw className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          <div className="hz-scroll min-h-0 flex-1 overflow-y-auto p-2">
            {docs === null ? (
              <div className="p-2"><SkeletonText lines={10} /></div>
            ) : docs.length === 0 ? (
              <p className="p-2 text-xs leading-5 text-paper/54">{error ? `API offline (${error}). Run npm run dev:full.` : "No docs found."}</p>
            ) : (
              <>
                {pinned.length ? (
                  <div className="mb-3">
                    <p className="flex items-center gap-1.5 px-1 pb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-primary"><Pin className="h-3 w-3" /> Pinned</p>
                    <div className="grid gap-0.5">
                      {pinned.map((d) => (
                        <FileRow key={d.path} d={d} active={active?.path === d.path} onSelect={() => select(d)} pinned />
                      ))}
                    </div>
                  </div>
                ) : null}

                {groups.map(([g, items]) => {
                  const isCollapsed = collapsed.has(g) && !query;
                  return (
                    <div key={g} className="mb-1">
                      <button type="button" onClick={() => toggleGroup(g)} className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left transition hover:bg-surfaceContainer">
                        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-paper/40" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-paper/40" />}
                        <Folder className="h-3.5 w-3.5 shrink-0 text-brass" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-paper/62">{g}</span>
                        <span className="shrink-0 font-mono text-[10px] text-paper/36">{items.length}</span>
                      </button>
                      {!isCollapsed ? (
                        <div className="grid gap-0.5 pl-3">
                          {items.map((d) => (
                            <FileRow key={d.path} d={d} active={active?.path === d.path} onSelect={() => select(d)} />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </aside>

        {/* reader */}
        <article className="glass relative flex min-h-0 flex-col overflow-hidden rounded-[var(--hz-radius-md)]">
          {active ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outlineVariant px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <p className="truncate font-mono text-[11px] text-paper/44" title={active.path}>{active.rel}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={reveal} className="inline-flex items-center gap-1 rounded-md border border-outlineVariant bg-surface px-2.5 py-1.5 text-[11px] font-black text-paper/70 hover:border-outline hover:text-paper"><FolderOpen className="h-3.5 w-3.5" /> Explorer</button>
                <button type="button" onClick={copyPath} className="inline-flex items-center gap-1 rounded-md border border-outlineVariant bg-surface px-2.5 py-1.5 text-[11px] font-black text-paper/70 hover:border-outline hover:text-paper">{copied ? <Check className="h-3.5 w-3.5 text-signal" /> : <Copy className="h-3.5 w-3.5" />} Path</button>
                <button type="button" onClick={deployOnDoc} className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-black text-onPrimary hover:brightness-110"><Rocket className="h-3.5 w-3.5" /> Deploy</button>
              </div>
            </div>
          ) : null}

          <div ref={contentRef} onScroll={(e) => setShowTop(e.currentTarget.scrollTop > 400)} className="hz-scroll min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 lg:px-10">
            <div className="mx-auto w-full max-w-[62rem]">
              {loadingDoc ? (
                <SkeletonText lines={16} />
              ) : doc ? (
                <MarkdownView>{doc.content}</MarkdownView>
              ) : docs?.length === 0 && error ? (
                <div className="flex items-center gap-2 text-sm text-paper/56"><AlertCircle className="h-4 w-4" /> Start the local API (npm run dev:full) to read docs.</div>
              ) : (
                <p className="text-sm text-paper/54">Select a document.</p>
              )}
            </div>
          </div>

          {showTop ? (
            <button type="button" onClick={() => contentRef.current?.scrollTo({ top: 0, behavior: "smooth" })} className="absolute bottom-4 right-4 grid h-9 w-9 place-items-center rounded-full border border-outlineVariant bg-surface text-paper/64 shadow-lift hover:text-paper" aria-label="Back to top"><ArrowUp className="h-4 w-4" /></button>
          ) : null}
        </article>

        {/* TOC */}
        {toc.length ? (
          <aside className="glass hz-scroll hidden min-h-0 flex-col overflow-y-auto rounded-[var(--hz-radius-md)] p-4 2xl:flex">
            <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-brass"><List className="h-3.5 w-3.5" /> On this page</p>
            <nav className="space-y-0.5 border-l border-outlineVariant pl-3">
              {toc.map((h, i) => (
                <button key={`${h.id}-${i}`} type="button" onClick={() => jumpTo(h.id)} className="block w-full truncate text-left text-xs text-paper/54 transition hover:text-primary" style={{ paddingLeft: `${(h.depth - 1) * 0.6}rem` }} title={h.text}>{h.text}</button>
              ))}
            </nav>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function FileRow({ d, active, onSelect, pinned }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={d.rel}
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-bold transition ${
        active ? "bg-primaryContainer text-onPrimaryContainer" : "text-paper/64 hover:bg-surfaceContainer hover:text-paper"
      }`}
    >
      {pinned ? <span className="shrink-0 text-sm leading-none">{d.pinLabel?.split(" ")[0]}</span> : <FileText className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />}
      <span className="min-w-0 flex-1 truncate">{pinned ? d.pinLabel.replace(/^\S+\s/, "") : d.title}</span>
    </button>
  );
}

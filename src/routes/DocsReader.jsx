import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, FolderOpen, Copy, Check, Search, List, Rocket, RefreshCw, AlertCircle } from "lucide-react";
import SectionHeader from "../components/SectionHeader.jsx";
import MarkdownView, { extractToc } from "../components/MarkdownView.jsx";
import { SkeletonText } from "../components/ui/Skeleton.jsx";
import { fetchDocs, readDoc, revealPath } from "../lib/docsApi.js";
import { useUiStore } from "../store/uiStore.js";

// A file-backed markdown reader — lists the repo's real .md files, renders them
// with a table of contents + anchors, opens the source in the OS file explorer,
// and can hand any doc to an agent. Replaces the old static "docs to build" cards.

export default function DocsReader() {
  const pushToast = useUiStore((s) => s.pushToast);
  const openInspector = useUiStore((s) => s.openInspector);
  const [docs, setDocs] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(null); // { path, title }
  const [doc, setDoc] = useState(null); // { content, title, rel }
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef(null);

  async function load() {
    setError("");
    try {
      const data = await fetchDocs();
      setDocs(data.docs ?? []);
      if (!active && data.docs?.length) select(data.docs[0]);
    } catch (e) {
      setError(e.message);
      setDocs([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function select(entry) {
    setActive(entry);
    setLoadingDoc(true);
    setDoc(null);
    try {
      const data = await readDoc(entry.path);
      setDoc(data);
    } catch (e) {
      setDoc({ content: `# Could not read\n\n\`${e.message}\`` , title: entry.title, rel: entry.rel });
    } finally {
      setLoadingDoc(false);
    }
  }

  const grouped = useMemo(() => {
    const list = (docs ?? []).filter((d) =>
      !query ? true : `${d.title} ${d.rel}`.toLowerCase().includes(query.toLowerCase()),
    );
    const map = new Map();
    for (const d of list) {
      if (!map.has(d.group)) map.set(d.group, []);
      map.get(d.group).push(d);
    }
    return [...map.entries()];
  }, [docs, query]);

  const toc = useMemo(() => extractToc(doc?.content), [doc?.content]);

  function jumpTo(id) {
    const el = contentRef.current?.querySelector(`#${CSS.escape(id)}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function reveal() {
    if (!active) return;
    try {
      await revealPath(active.path);
      pushToast({ tone: "success", title: "Opened in file explorer", message: active.rel });
    } catch (e) {
      pushToast({ tone: "error", title: "Could not open", message: e.message });
      copyPath();
    }
  }

  function copyPath() {
    if (!active) return;
    navigator.clipboard?.writeText(active.path).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  }

  function deployOnDoc() {
    if (!active || !doc) return;
    openInspector({
      type: "doc",
      title: doc.title || active.title,
      subtitle: active.rel,
      source: active.path,
      body: doc.content?.slice(0, 8000),
      tags: [active.group],
      suggestedActions: ["summarize"],
    });
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Docs · Markdown reader"
        title="Read, open, and act on every runbook."
        copy="Real files from the repo — not a static list. Open the source in your file explorer, jump by heading, and hand any doc to an agent."
      />

      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_14rem]">
        {/* file list */}
        <aside className="glass hz-scroll max-h-[calc(100vh-13rem)] overflow-y-auto rounded-[var(--hz-radius-md)] p-3 lg:sticky lg:top-20">
          <div className="mb-2 flex items-center gap-2 rounded-md border border-outlineVariant bg-surface px-2.5 py-1.5">
            <Search className="h-4 w-4 shrink-0 text-paper/40" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter docs…"
              className="min-w-0 flex-1 bg-transparent text-sm text-paper outline-none placeholder:text-paper/36"
            />
            <button type="button" onClick={load} title="Refresh" className="text-paper/40 hover:text-paper">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
          {docs === null ? (
            <div className="p-2"><SkeletonText lines={8} /></div>
          ) : docs.length === 0 ? (
            <p className="p-2 text-xs leading-5 text-paper/54">
              {error ? `API offline (${error}). Run npm run dev:full to index docs.` : "No markdown docs found."}
            </p>
          ) : (
            grouped.map(([group, items]) => (
              <div key={group} className="mb-3">
                <p className="px-1 pb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-brass">{group}</p>
                <div className="grid gap-0.5">
                  {items.map((d) => (
                    <button
                      key={d.path}
                      type="button"
                      onClick={() => select(d)}
                      title={d.rel}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-bold transition ${
                        active?.path === d.path ? "bg-primaryContainer text-onPrimaryContainer" : "text-paper/64 hover:bg-surfaceContainer hover:text-paper"
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{d.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </aside>

        {/* reader */}
        <article className="glass min-w-0 rounded-[var(--hz-radius-md)] p-5 sm:p-7">
          {active ? (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-outlineVariant pb-4">
              <div className="min-w-0">
                <p className="truncate font-mono text-[11px] text-paper/44" title={active.path}>{active.rel}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={reveal} className="inline-flex items-center gap-1 rounded-md border border-outlineVariant bg-surface px-2.5 py-1.5 text-[11px] font-black text-paper/70 hover:border-outline hover:text-paper">
                  <FolderOpen className="h-3.5 w-3.5" /> Open in explorer
                </button>
                <button type="button" onClick={copyPath} className="inline-flex items-center gap-1 rounded-md border border-outlineVariant bg-surface px-2.5 py-1.5 text-[11px] font-black text-paper/70 hover:border-outline hover:text-paper">
                  {copied ? <Check className="h-3.5 w-3.5 text-signal" /> : <Copy className="h-3.5 w-3.5" />} Copy path
                </button>
                <button type="button" onClick={deployOnDoc} className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-black text-onPrimary hover:brightness-110">
                  <Rocket className="h-3.5 w-3.5" /> Deploy agent
                </button>
              </div>
            </div>
          ) : null}

          <div ref={contentRef}>
            {loadingDoc ? (
              <SkeletonText lines={14} />
            ) : doc ? (
              <MarkdownView>{doc.content}</MarkdownView>
            ) : docs?.length === 0 && error ? (
              <div className="flex items-center gap-2 text-sm text-paper/56">
                <AlertCircle className="h-4 w-4" /> Start the local API (npm run dev:full) to read docs.
              </div>
            ) : (
              <p className="text-sm text-paper/54">Select a document.</p>
            )}
          </div>
        </article>

        {/* table of contents */}
        {toc.length ? (
          <aside className="hidden xl:block">
            <div className="sticky top-20">
              <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-brass">
                <List className="h-3.5 w-3.5" /> On this page
              </p>
              <nav className="hz-scroll max-h-[calc(100vh-14rem)] space-y-0.5 overflow-y-auto border-l border-outlineVariant pl-3">
                {toc.map((h, i) => (
                  <button
                    key={`${h.id}-${i}`}
                    type="button"
                    onClick={() => jumpTo(h.id)}
                    className="block w-full truncate text-left text-xs text-paper/54 transition hover:text-primary"
                    style={{ paddingLeft: `${(h.depth - 1) * 0.6}rem` }}
                    title={h.text}
                  >
                    {h.text}
                  </button>
                ))}
              </nav>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

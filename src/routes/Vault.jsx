import { useEffect, useState } from "react";
import { Brain, Database, FileText, FolderGit2, Loader2, RefreshCw, Save, Search, Wrench, X, GitGraph, ExternalLink } from "lucide-react";
import Panel from "../components/Panel.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import { captureWikiAnswer, fetchVault, foldWikiLog, ingestWikiSource, queryWiki, readVaultNote, runWikiCoverage, runWikiLint, searchWiki, syncVault, syncWiki } from "../lib/vaultApi.js";

function relativeTime(ms) {
  if (!ms) return "";
  const diff = Date.now() - ms;
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 0)}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function Vault() {
  const [info, setInfo] = useState(null);
  const [live, setLive] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [wikiSyncing, setWikiSyncing] = useState(false);
  const [wikiSearching, setWikiSearching] = useState(false);
  const [wikiIngesting, setWikiIngesting] = useState(false);
  const [wikiCovering, setWikiCovering] = useState(false);
  const [wikiCapturing, setWikiCapturing] = useState(false);
  const [wikiLinting, setWikiLinting] = useState(false);
  const [wikiQuerying, setWikiQuerying] = useState(false);
  const [wikiFolding, setWikiFolding] = useState(false);
  const [wikiQuery, setWikiQuery] = useState("money action memory");
  const [wikiQueryMode, setWikiQueryMode] = useState("standard");
  const [captureGaps, setCaptureGaps] = useState(false);
  const [queryPacket, setQueryPacket] = useState(null);
  const [captureTitle, setCaptureTitle] = useState("");
  const [captureAnswer, setCaptureAnswer] = useState("");
  const [ingestPath, setIngestPath] = useState("");
  const [wikiResults, setWikiResults] = useState([]);
  const [note, setNote] = useState(null);
  const [msg, setMsg] = useState(null);
  const [noteOffset, setNoteOffset] = useState(0);
  const [noteSearch, setNoteSearch] = useState("");

  function load(offset = noteOffset, search = noteSearch) {
    return fetchVault({ offset, search })
      .then((data) => {
        setInfo(data);
        setLive(true);
      })
      .catch(() => setLive(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function doSync() {
    if (!live) {
      setMsg("Start npm run dev:full to sync the vault.");
      return;
    }
    setSyncing(true);
    try {
      const res = await syncVault();
      setMsg(`Synced ${res.files.length} notes into the vault.`);
      if (res.wiki) setWikiResults([]);
      await load();
    } catch {
      setMsg("Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  async function doWikiSync() {
    if (!live) {
      setMsg("Start npm run dev:full to sync the compound wiki.");
      return;
    }
    setWikiSyncing(true);
    try {
      const res = await syncWiki();
      setMsg(`Synced ${res.files.length} compound wiki files.`);
      setWikiResults([]);
      await load();
    } catch {
      setMsg("Compound wiki sync failed.");
    } finally {
      setWikiSyncing(false);
    }
  }

  async function doWikiSearch(event) {
    event?.preventDefault();
    if (!wikiQuery.trim()) return;
    if (!live) {
      setMsg("Start npm run dev:full to search the compound wiki.");
      return;
    }
    setWikiSearching(true);
    try {
      const res = await searchWiki(wikiQuery, 8);
      setWikiResults(res.results ?? []);
      setQueryPacket(null);
      if (!res.results?.length) setMsg("No wiki matches yet.");
    } catch {
      setMsg("Compound wiki search failed.");
    } finally {
      setWikiSearching(false);
    }
  }

  async function doWikiQuery(event) {
    event?.preventDefault();
    if (!wikiQuery.trim()) return;
    if (!live) {
      setMsg("Start npm run dev:full to build a wiki query packet.");
      return;
    }
    setWikiQuerying(true);
    try {
      const res = await queryWiki({ question: wikiQuery.trim(), mode: wikiQueryMode, captureGap: captureGaps });
      setQueryPacket(res);
      setWikiResults(res.searchResults ?? []);
      if (res.gaps?.length) setMsg(captureGaps ? "Gap captured into wiki/meta/gaps.md." : "Gap detected; enable capture to file it.");
      else setMsg(`${res.mode} query packet built.`);
      await load();
    } catch {
      setMsg("Wiki query packet failed.");
    } finally {
      setWikiQuerying(false);
    }
  }

  async function doWikiIngest(event) {
    event.preventDefault();
    if (!ingestPath.trim()) return;
    if (!live) {
      setMsg("Start npm run dev:full to ingest a source.");
      return;
    }
    setWikiIngesting(true);
    try {
      const res = await ingestWikiSource(ingestPath.trim());
      setMsg(res.skipped ? `Already ingested: ${res.title}.` : `Ingested ${res.title} into the compound wiki.`);
      setWikiQuery(res.title || wikiQuery);
      setIngestPath("");
      await load();
    } catch {
      setMsg("Source ingest failed.");
    } finally {
      setWikiIngesting(false);
    }
  }

  async function doWikiCoverage() {
    if (!live) {
      setMsg("Start npm run dev:full to run source coverage.");
      return;
    }
    setWikiCovering(true);
    try {
      const res = await runWikiCoverage();
      setMsg(`Coverage: ${res.available}/${res.total} available, ${res.ingested} ingested, ${res.skipped} skipped, ${res.missing} missing.`);
      setWikiQuery("Source Coverage Report");
      await load();
    } catch {
      setMsg("Source coverage failed.");
    } finally {
      setWikiCovering(false);
    }
  }

  async function doWikiCapture(event) {
    event.preventDefault();
    if (!wikiQuery.trim() || !captureAnswer.trim()) return;
    if (!live) {
      setMsg("Start npm run dev:full to capture a wiki answer.");
      return;
    }
    setWikiCapturing(true);
    try {
      const res = await captureWikiAnswer({
        question: wikiQuery.trim(),
        answer: captureAnswer.trim(),
        title: captureTitle.trim() || undefined,
        links: wikiResults.slice(0, 6).map((result) => ({ path: result.path, title: result.title })),
      });
      setMsg(`Captured answer: ${res.title}.`);
      setCaptureTitle("");
      setCaptureAnswer("");
      setWikiResults([{ path: res.path, title: res.title, kind: "question", summary: res.question, snippet: "Captured into durable wiki memory." }]);
      await load();
    } catch {
      setMsg("Wiki answer capture failed.");
    } finally {
      setWikiCapturing(false);
    }
  }

  async function doWikiLint() {
    if (!live) {
      setMsg("Start npm run dev:full to lint the compound wiki.");
      return;
    }
    setWikiLinting(true);
    try {
      const res = await runWikiLint();
      setMsg(`Lint: ${res.repairs.length} repairs, ${res.missingLinks.length} missing links, ${res.orphanPages.length} orphans.`);
      setWikiQuery("Wiki Repair Plan");
      await load();
    } catch {
      setMsg("Wiki lint failed.");
    } finally {
      setWikiLinting(false);
    }
  }

  async function doWikiFold() {
    if (!live) {
      setMsg("Start npm run dev:full to fold the wiki log.");
      return;
    }
    setWikiFolding(true);
    try {
      const res = await foldWikiLog({ keepEntries: 20, batchSize: 40 });
      setMsg(res.foldedEntries ? `Folded ${res.foldedEntries} log entries into ${res.foldPath}.` : "Wiki log is already compact.");
      await load();
    } catch {
      setMsg("Wiki log fold failed.");
    } finally {
      setWikiFolding(false);
    }
  }

  async function openNote(path) {
    try {
      const res = await readVaultNote(path);
      setNote({ path, content: res.content });
    } catch {
      setMsg("Could not read note.");
    }
  }

  const wiki = info?.wiki;

  return (
    <div>
      <SectionHeader
        eyebrow="Obsidian Vault bridge"
        title="Horizon as your single source of truth."
        copy="Mirror the command center, capital, journey, and saved signals into your Obsidian vault as Markdown, and browse any vault note from here. Edit in Obsidian or Horizon; the vault holds the canonical copy."
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.open('obsidian://open?vault=bolting', '_blank')}
              className="inline-flex items-center gap-2 rounded-md border border-outlineVariant bg-surfaceContainer px-4 py-2 text-sm font-black text-paper transition hover:border-outline"
            >
              <ExternalLink className="h-4 w-4" /> Open in Obsidian
            </button>
            <button
              type="button"
              onClick={doSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-black text-onPrimary transition hover:bg-primary/90 disabled:opacity-60"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
              {syncing ? "Syncing..." : "Sync to Obsidian"}
            </button>
          </div>
        }
      />

      <section className="mb-4 grid gap-4 xl:grid-cols-3">
        {Object.entries(info?.brains || {}).map(([brainName, count]) => (
          <Panel key={brainName} className="p-4">
            <Brain className="h-5 w-5 text-primary" />
            <p className="mt-2 font-bold text-paper">{brainName} Brain</p>
            <p className="font-mono text-xs text-paper/46">{count.toLocaleString()} nodes</p>
          </Panel>
        ))}
      </section>

      {msg ? <p className="mb-4 font-mono text-xs text-paper/56">{msg}</p> : null}

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <FolderGit2 className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="font-display text-2xl font-bold">Vault</h2>
          </div>
          {info?.exists ? (
            <>
              <p className="mt-3 break-words font-mono text-xs text-paper/56">{info.path}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-md border border-outlineVariant bg-surfaceVariant p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/46">Notes</p>
                  <p className="mt-1 text-2xl font-black text-paper">{info.noteCount}</p>
                </div>
                <div className="rounded-md border border-outlineVariant bg-surfaceVariant p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/46">Status</p>
                  <p className="mt-1 text-sm font-black text-signal">{live ? "Connected" : "Offline"}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-paper/56">
                Sync writes into a <span className="font-mono text-xs">Horizon/</span> folder inside the vault, so your own notes stay untouched.
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm leading-6 text-paper/56">
              {live ? "Vault folder not found. Create one in Obsidian at vault/horizon, or set HORIZON_VAULT_PATH." : "Start npm run dev:full to read the vault."}
            </p>
          )}
        </Panel>

        <Panel className="p-5 flex flex-col h-[34rem]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-brass" aria-hidden="true" />
              <h2 className="font-display text-2xl font-bold">Notes</h2>
            </div>
            <input
              type="text"
              placeholder="Search notes..."
              value={noteSearch}
              onChange={(e) => {
                setNoteSearch(e.target.value);
                setNoteOffset(0);
                load(0, e.target.value);
              }}
              className="rounded-md border border-outlineVariant bg-surface px-3 py-1.5 text-sm font-bold text-paper outline-none transition placeholder:text-paper/32 focus:border-primary"
            />
          </div>
          <div className="mt-4 flex-1 space-y-1.5 overflow-y-auto min-h-0 pr-1">
            {info?.notes?.length ? (
              info.notes.map((n) => (
                <button
                  key={n.path}
                  type="button"
                  onClick={() => openNote(n.path)}
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-outlineVariant bg-surfaceVariant px-3 py-2 text-left hover:border-outline"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {n.path.endsWith(".canvas") ? (
                      <GitGraph className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    ) : (
                      <FileText className="h-4 w-4 shrink-0 text-brass" aria-hidden="true" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-paper">{n.name}</p>
                      <p className="truncate font-mono text-[10px] text-paper/42">{n.path}</p>
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-paper/42">{relativeTime(n.mtime)}</span>
                </button>
              ))
            ) : (
              <p className="text-sm text-paper/48">No notes yet. Sync to create the first ones.</p>
            )}
          </div>
          {info?.total > (info?.limit || 80) && (
            <div className="mt-4 flex items-center justify-between shrink-0 border-t border-outlineVariant pt-4">
              <p className="font-mono text-[10px] text-paper/56">
                Showing {info.offset + 1}-{Math.min(info.offset + info.limit, info.total)} of {info.total}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={info.offset === 0}
                  onClick={() => {
                    const newOff = Math.max(0, info.offset - info.limit);
                    setNoteOffset(newOff);
                    load(newOff, noteSearch);
                  }}
                  className="rounded border border-outlineVariant px-2 py-1 text-xs text-paper disabled:opacity-30"
                >
                  Prev
                </button>
                <button
                  disabled={info.offset + info.limit >= info.total}
                  onClick={() => {
                    const newOff = info.offset + info.limit;
                    setNoteOffset(newOff);
                    load(newOff, noteSearch);
                  }}
                  className="rounded border border-outlineVariant px-2 py-1 text-xs text-paper disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Panel>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" aria-hidden="true" />
                <h2 className="font-display text-2xl font-bold">Compound Wiki</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-paper/62">
                Raw sources, generated synthesis, hot cache, page graph, and chunks for the next retrieval layer.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={doWikiSync}
                disabled={wikiSyncing}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-outlineVariant bg-surfaceContainer px-3 py-2 text-sm font-black text-paper transition hover:border-outline disabled:opacity-60"
              >
                {wikiSyncing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
                {wikiSyncing ? "Syncing..." : "Sync Wiki"}
              </button>
              <button
                type="button"
                onClick={doWikiCoverage}
                disabled={wikiCovering}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-outlineVariant bg-surfaceContainer px-3 py-2 text-sm font-black text-paper transition hover:border-outline disabled:opacity-60"
              >
                {wikiCovering ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Database className="h-4 w-4" aria-hidden="true" />}
                {wikiCovering ? "Checking..." : "Run Coverage"}
              </button>
              <button
                type="button"
                onClick={doWikiLint}
                disabled={wikiLinting}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-outlineVariant bg-surfaceContainer px-3 py-2 text-sm font-black text-paper transition hover:border-outline disabled:opacity-60"
              >
                {wikiLinting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Wrench className="h-4 w-4" aria-hidden="true" />}
                {wikiLinting ? "Linting..." : "Lint Wiki"}
              </button>
              <button
                type="button"
                onClick={doWikiFold}
                disabled={wikiFolding}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-outlineVariant bg-surfaceContainer px-3 py-2 text-sm font-black text-paper transition hover:border-outline disabled:opacity-60"
              >
                {wikiFolding ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
                {wikiFolding ? "Folding..." : "Fold Log"}
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-md border border-outlineVariant bg-surfaceVariant p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/46">Sources</p>
              <p className="mt-1 text-2xl font-black text-paper">{wiki?.rawSourceCount ?? 0}</p>
            </div>
            <div className="rounded-md border border-outlineVariant bg-surfaceVariant p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/46">Pages</p>
              <p className="mt-1 text-2xl font-black text-paper">{wiki?.wikiPageCount ?? 0}</p>
            </div>
            <div className="rounded-md border border-outlineVariant bg-surfaceVariant p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/46">Chunks</p>
              <p className="mt-1 text-2xl font-black text-paper">{wiki?.chunkCount ?? 0}</p>
            </div>
          </div>

          <div className="mt-4 rounded-md border border-outlineVariant bg-surfaceContainer p-4">
            <div className="flex items-start gap-3">
              <Database className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">Retrieval ladder</p>
                <p className="mt-2 break-words text-sm font-bold text-paper">
                  {wiki?.retrieval?.current ?? "hot-index-markdown-fts"}
                  <span className="text-paper/42"> / </span>
                  {wiki?.retrieval?.vectorCandidate ?? "turbovec"} {wiki?.retrieval?.vectorState ? `(${wiki.retrieval.vectorState})` : ""}
                </p>
                <p className="mt-2 break-words font-mono text-[10px] text-paper/46">
                  Schema: {wiki?.schemaPath ?? "WIKI.md"} · Hot: {wiki?.hotPath ?? "wiki/hot.md"} · Index: {wiki?.indexPath ?? "wiki/index.md"}
                </p>
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-signal" aria-hidden="true" />
            <h2 className="font-display text-2xl font-bold">Wiki Search</h2>
          </div>
          <form onSubmit={doWikiSearch} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={wikiQuery}
              onChange={(event) => setWikiQuery(event.target.value)}
              className="min-w-0 flex-1 rounded-md border border-outlineVariant bg-surface px-3 py-2 text-sm font-bold text-paper outline-none transition placeholder:text-paper/32 focus:border-primary"
              placeholder="Search Horizon memory..."
            />
            <button
              type="submit"
              disabled={wikiSearching}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-black text-onPrimary transition hover:bg-primary/90 disabled:opacity-60"
            >
              {wikiSearching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
              Search
            </button>
          </form>

          <form onSubmit={doWikiQuery} className="mt-3 rounded-md border border-outlineVariant bg-surfaceContainer p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={wikiQueryMode}
                onChange={(event) => setWikiQueryMode(event.target.value)}
                className="rounded-md border border-outlineVariant bg-surface px-3 py-2 text-sm font-bold text-paper outline-none focus:border-primary"
              >
                <option value="quick">Quick</option>
                <option value="standard">Standard</option>
                <option value="deep">Deep</option>
              </select>
              <label className="flex items-center gap-2 rounded-md border border-outlineVariant bg-surface px-3 py-2 text-xs font-bold text-paper/70">
                <input type="checkbox" checked={captureGaps} onChange={(event) => setCaptureGaps(event.target.checked)} />
                Capture gaps
              </label>
              <button
                type="submit"
                disabled={wikiQuerying || !wikiQuery.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-outlineVariant bg-surface px-4 py-2 text-sm font-black text-paper transition hover:border-outline disabled:opacity-50"
              >
                {wikiQuerying ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Brain className="h-4 w-4" aria-hidden="true" />}
                {wikiQuerying ? "Building..." : "Build Packet"}
              </button>
            </div>
            {queryPacket ? (
              <div className="mt-3 rounded-md border border-outlineVariant bg-surface p-3">
                <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/46">
                  <span>{queryPacket.mode} packet</span>
                  <span>{queryPacket.searchResults?.length ?? 0} pages</span>
                  <span>{queryPacket.gaps?.length ?? 0} gaps</span>
                </div>
                <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-paper/62">{queryPacket.contextMarkdown}</pre>
              </div>
            ) : null}
          </form>

          <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto">
            {wikiResults.length ? (
              wikiResults.map((result) => (
                <button
                  key={result.path}
                  type="button"
                  onClick={() => openNote(result.path)}
                  className="block w-full rounded-md border border-outlineVariant bg-surfaceVariant p-3 text-left transition hover:border-outline"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-paper">{result.title}</p>
                      <p className="truncate font-mono text-[10px] text-paper/42">{result.path}</p>
                    </div>
                    <span className="rounded-full border border-outlineVariant bg-surface px-2 py-1 font-mono text-[10px] text-paper/42">
                      {result.kind}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-5 text-paper/62">{result.snippet || result.summary}</p>
                </button>
              ))
            ) : (
              <p className="text-sm text-paper/48">Sync the wiki, then search for project memory, external references, actions, and retrieval decisions.</p>
            )}
          </div>

          <form onSubmit={doWikiIngest} className="mt-5 rounded-md border border-outlineVariant bg-surfaceContainer p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">Ingest source</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={ingestPath}
                onChange={(event) => setIngestPath(event.target.value)}
                className="min-w-0 flex-1 rounded-md border border-outlineVariant bg-surface px-3 py-2 font-mono text-xs text-paper outline-none transition placeholder:text-paper/32 focus:border-primary"
                placeholder="/absolute/path/to/source.md"
              />
              <button
                type="submit"
                disabled={wikiIngesting || !ingestPath.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-outlineVariant bg-surface px-4 py-2 text-sm font-black text-paper transition hover:border-outline disabled:opacity-50"
              >
                {wikiIngesting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
                Ingest
              </button>
            </div>
          </form>

          <form onSubmit={doWikiCapture} className="mt-3 rounded-md border border-outlineVariant bg-surfaceContainer p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">Capture answer</p>
            <div className="mt-3 grid gap-2">
              <input
                value={captureTitle}
                onChange={(event) => setCaptureTitle(event.target.value)}
                className="rounded-md border border-outlineVariant bg-surface px-3 py-2 text-sm font-bold text-paper outline-none transition placeholder:text-paper/32 focus:border-primary"
                placeholder="Optional page title"
              />
              <textarea
                value={captureAnswer}
                onChange={(event) => setCaptureAnswer(event.target.value)}
                rows={5}
                className="min-h-28 resize-y rounded-md border border-outlineVariant bg-surface px-3 py-2 text-sm leading-6 text-paper outline-none transition placeholder:text-paper/32 focus:border-primary"
                placeholder="Write the answer worth remembering..."
              />
              <button
                type="submit"
                disabled={wikiCapturing || !wikiQuery.trim() || !captureAnswer.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-black text-onPrimary transition hover:bg-primary/90 disabled:opacity-50"
              >
                {wikiCapturing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                {wikiCapturing ? "Capturing..." : "File Answer"}
              </button>
            </div>
          </form>
        </Panel>
      </section>

      {note ? (
        <div className="fixed inset-0 z-[70] flex justify-end bg-paper/20 backdrop-blur-sm" onClick={() => setNote(null)}>
          <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-outlineVariant bg-surface p-6 shadow-lift" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <h2 className="break-words font-mono text-sm font-black text-paper">{note.path}</h2>
              <button type="button" onClick={() => setNote(null)} aria-label="Close" className="rounded-md border border-outlineVariant p-1.5 text-paper/50 hover:text-paper">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <pre className="mt-4 whitespace-pre-wrap font-mono text-xs leading-5 text-paper/78">{note.content}</pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}

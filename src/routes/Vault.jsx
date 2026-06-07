import { useEffect, useState } from "react";
import { Brain, Database, FileText, FolderGit2, Loader2, RefreshCw, Search, X } from "lucide-react";
import Panel from "../components/Panel.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import { fetchVault, ingestWikiSource, readVaultNote, runWikiCoverage, searchWiki, syncVault, syncWiki } from "../lib/vaultApi.js";

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
  const [wikiQuery, setWikiQuery] = useState("money action memory");
  const [ingestPath, setIngestPath] = useState("");
  const [wikiResults, setWikiResults] = useState([]);
  const [note, setNote] = useState(null);
  const [msg, setMsg] = useState(null);

  function load() {
    return fetchVault()
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
      if (!res.results?.length) setMsg("No wiki matches yet.");
    } catch {
      setMsg("Compound wiki search failed.");
    } finally {
      setWikiSearching(false);
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
          <button
            type="button"
            onClick={doSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-black text-onPrimary transition hover:bg-primary/90 disabled:opacity-60"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
            {syncing ? "Syncing..." : "Sync to Obsidian"}
          </button>
        }
      />

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

        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-brass" aria-hidden="true" />
            <h2 className="font-display text-2xl font-bold">Notes</h2>
          </div>
          <div className="mt-4 max-h-[28rem] space-y-1.5 overflow-y-auto">
            {info?.notes?.length ? (
              info.notes.map((n) => (
                <button
                  key={n.path}
                  type="button"
                  onClick={() => openNote(n.path)}
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-outlineVariant bg-surfaceVariant px-3 py-2 text-left hover:border-outline"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-paper">{n.name}</p>
                    <p className="truncate font-mono text-[10px] text-paper/42">{n.path}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-paper/42">{relativeTime(n.mtime)}</span>
                </button>
              ))
            ) : (
              <p className="text-sm text-paper/48">No notes yet. Sync to create the first ones.</p>
            )}
          </div>
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

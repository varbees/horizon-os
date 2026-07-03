import { useEffect, useState } from "react";
import { FolderGit2, Loader2, Check, AlertTriangle, HardDriveDownload } from "lucide-react";
import SectionHeader from "../components/SectionHeader.jsx";
import Panel from "../components/Panel.jsx";
import { fetchWorkspace, setWorkspace } from "../lib/workspaceApi.js";
import { useUiStore } from "../store/uiStore.js";

// The workspace loader — point Horizon at any folder of repos. This is the
// open-source "bring your own workspace" surface: set a root, sweep it, and the
// Hub / doc reader / file-open all follow it.

export default function Workspace() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [info, setInfo] = useState(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const data = await fetchWorkspace();
      setInfo(data);
      setDraft(data.root || "");
    } catch (e) {
      setError(e.message);
      setInfo({ ok: false });
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      const data = await setWorkspace(draft.trim());
      const counts = data.sweep?.summary || data.sweep?.counts || null;
      const total = data.sweep?.summary?.total ?? (data.sweep?.projects?.length ?? null);
      setResult({ ok: true, root: data.root, total, counts });
      pushToast({ tone: "success", title: "Workspace loaded", message: `Sweeping ${data.root}` });
      load();
    } catch (e) {
      setResult({ ok: false, error: e.message });
      pushToast({ tone: "error", title: "Could not load workspace", message: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <SectionHeader
        eyebrow="Workspace · Open source"
        title="Load your workspace."
        copy="Point Horizon at any folder of repositories. It sweeps them into the Hub, and the doc reader + file-open follow the same root. This is what makes Horizon OS an app anyone can run over their own projects."
      />

      <Panel className="p-6">
        <div className="flex items-center gap-3 border-b border-outlineVariant pb-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--hz-radius-sm)] border border-outlineVariant bg-surfaceVariant">
            <FolderGit2 className="h-5 w-5 text-primary" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/46">Current workspace</p>
            {info ? (
              <p className="truncate font-mono text-sm font-black text-paper" title={info.root}>{info.root || "—"}</p>
            ) : (
              <p className="text-sm text-paper/50">Loading…</p>
            )}
            {info ? (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-paper/52">
                {info.exists ? <Check className="h-3.5 w-3.5 text-signal" /> : <AlertTriangle className="h-3.5 w-3.5 text-rust" />}
                {info.configured ? "custom root" : "default (this repo's parent)"} · {info.exists ? "folder exists" : "not found"}
              </p>
            ) : null}
          </div>
        </div>

        <form onSubmit={submit} className="mt-4">
          <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/46" htmlFor="ws-root">
            Workspace folder (absolute path, or ~/…)
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              id="ws-root"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="/home/you/code  or  ~/projects"
              className="min-w-0 flex-1 rounded-md border border-outlineVariant bg-surface px-3 py-2.5 font-mono text-sm text-paper outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-black text-onPrimary transition hover:brightness-110 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardDriveDownload className="h-4 w-4" />}
              Load &amp; sweep
            </button>
          </div>
        </form>

        {error ? (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-rust">
            <AlertTriangle className="h-4 w-4" /> {error === "Failed to fetch" ? "Start the local API (npm run dev:full) to load a workspace." : error}
          </p>
        ) : null}

        {result?.ok ? (
          <div className="mt-4 rounded-md border border-signal/30 bg-signal/8 p-4">
            <p className="flex items-center gap-2 text-sm font-black text-signal">
              <Check className="h-4 w-4" /> Swept {result.root}
            </p>
            {result.total != null ? <p className="mt-1 text-sm text-paper/68">{result.total} projects indexed. Open the Hub to see them.</p> : <p className="mt-1 text-sm text-paper/68">Sweep complete. Open the Hub to see indexed projects.</p>}
          </div>
        ) : result?.error ? (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-rust"><AlertTriangle className="h-4 w-4" /> {result.error}</p>
        ) : null}

        <p className="mt-5 border-t border-outlineVariant pt-4 text-xs leading-6 text-paper/50">
          The path is confined server-side: the doc reader and file-open only reach inside this workspace (plus Horizon's own repo). Nothing outside it is readable.
        </p>
      </Panel>
    </div>
  );
}

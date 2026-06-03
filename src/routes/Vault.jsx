import { useEffect, useState } from "react";
import { FileText, FolderGit2, Loader2, RefreshCw, X } from "lucide-react";
import Panel from "../components/Panel.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import { fetchVault, readVaultNote, syncVault } from "../lib/vaultApi.js";

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
      await load();
    } catch {
      setMsg("Sync failed.");
    } finally {
      setSyncing(false);
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

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
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

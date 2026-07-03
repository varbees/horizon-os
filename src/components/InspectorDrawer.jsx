import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { X, ExternalLink, FolderOpen, Copy, Check, Link2 } from "lucide-react";
import { useUiStore } from "../store/uiStore.js";
import AgentDeployer from "./AgentDeployer.jsx";
import MarkdownView from "./MarkdownView.jsx";

// The right-hand Inspector. One drawer for the whole app — every screen opens it
// with a normalized entity, and it renders detail + the Action Deployer + a real
// "open the source" affordance (link for URLs, OS file explorer for local paths).

function isPath(source) {
  return source && !/^https?:/.test(source) && (source.startsWith("/") || source.startsWith("~") || source.includes("/"));
}

export default function InspectorDrawer() {
  const { open, entity } = useUiStore((s) => s.inspector);
  const close = useUiStore((s) => s.closeInspector);
  const pushToast = useUiStore((s) => s.pushToast);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") close();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  async function reveal(path) {
    try {
      const res = await fetch(`/api/reveal?path=${encodeURIComponent(path)}`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `status ${res.status}`);
      pushToast({ tone: "success", title: "Opened in file explorer", message: path });
    } catch (error) {
      pushToast({ tone: "error", title: "Could not open", message: `${error.message}. Path copied instead.` });
      copy(path);
    }
  }

  function copy(text) {
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      },
      () => {},
    );
  }

  return (
    <AnimatePresence>
      {open && entity ? (
        <>
          <motion.div
            className="fixed inset-0 z-[70] bg-paper/20 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            aria-hidden="true"
          />
          <motion.aside
            className="hz-scroll fixed right-0 top-0 z-[71] flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-outlineVariant bg-surface shadow-[0_0_60px_rgba(37,88,216,0.18)]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            role="dialog"
            aria-label="Inspector"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-outlineVariant bg-surface/92 px-5 py-4 backdrop-blur-xl">
              <div className="min-w-0">
                {entity.type ? (
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass">{entity.type}</span>
                ) : null}
                <h2 className="mt-1 break-words font-display text-xl font-bold leading-tight text-paper">{entity.title}</h2>
                {entity.subtitle ? <p className="mt-1 text-sm leading-6 text-paper/60">{entity.subtitle}</p> : null}
              </div>
              <button
                type="button"
                onClick={close}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-outlineVariant text-paper/56 transition hover:border-outline hover:text-paper"
                aria-label="Close inspector"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 px-5 py-4">
              {entity.source ? (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-outlineVariant bg-surfaceVariant p-2.5">
                  <Link2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-paper/64" title={entity.source}>{entity.source}</span>
                  {isPath(entity.source) ? (
                    <button type="button" onClick={() => reveal(entity.source)} className="inline-flex items-center gap-1 rounded-md border border-outlineVariant bg-surface px-2 py-1 text-[11px] font-black text-paper/70 hover:border-outline hover:text-paper">
                      <FolderOpen className="h-3.5 w-3.5" /> Open
                    </button>
                  ) : (
                    <a href={entity.source} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 rounded-md border border-outlineVariant bg-surface px-2 py-1 text-[11px] font-black text-paper/70 hover:border-outline hover:text-paper">
                      <ExternalLink className="h-3.5 w-3.5" /> Open
                    </a>
                  )}
                  <button type="button" onClick={() => copy(entity.source)} className="grid h-7 w-7 place-items-center rounded-md border border-outlineVariant bg-surface text-paper/56 hover:text-paper" aria-label="Copy source">
                    {copied ? <Check className="h-3.5 w-3.5 text-signal" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ) : null}

              {Array.isArray(entity.meta) && entity.meta.length ? (
                <dl className="grid grid-cols-2 gap-2">
                  {entity.meta.map((m) => (
                    <div key={m.label} className="rounded-md border border-outlineVariant bg-surfaceVariant p-2.5">
                      <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-paper/44">{m.label}</dt>
                      <dd className="mt-0.5 truncate text-sm font-black text-paper" title={String(m.value)}>{m.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {Array.isArray(entity.tags) && entity.tags.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {entity.tags.map((t) => (
                    <span key={t} className="rounded-full border border-outlineVariant bg-surfaceVariant px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-paper/56">{t}</span>
                  ))}
                </div>
              ) : null}

              {entity.body ? (
                <div className="rounded-md border border-outlineVariant bg-surface p-4">
                  <MarkdownView>{entity.body}</MarkdownView>
                </div>
              ) : null}

              <AgentDeployer entity={entity} variant="full" defaultAction={entity.suggestedActions?.[0]} />
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

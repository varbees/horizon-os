import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Square, Loader2, CheckCircle2, AlertTriangle, Terminal } from "lucide-react";
import { stopLiveRun } from "../lib/runsApi.js";

// The live agent console. Opens an SSE stream to a run and renders its output
// line-by-line, terminal-style, with a real Stop control. This is the "watch it
// think / stop it" surface — backed by the run-manager, not a mock.

const STATUS = {
  running: { icon: Loader2, spin: true, tone: "text-primary", label: "running" },
  completed: { icon: CheckCircle2, tone: "text-signal", label: "completed" },
  stopped: { icon: Square, tone: "text-brass", label: "stopped" },
  failed: { icon: AlertTriangle, tone: "text-rust", label: "failed" },
};

export default function LiveConsole({ run, onClose }) {
  const [chunks, setChunks] = useState([]);
  const [status, setStatus] = useState(run?.status ?? "running");
  const [stopping, setStopping] = useState(false);
  const bodyRef = useRef(null);
  const esRef = useRef(null);

  useEffect(() => {
    if (!run?.id) return undefined;
    setChunks([]);
    setStatus(run.status ?? "running");
    const es = new EventSource(`/api/runs/${encodeURIComponent(run.id)}/stream`);
    esRef.current = es;
    es.addEventListener("init", (e) => {
      try { setStatus(JSON.parse(e.data).status); } catch { /* noop */ }
    });
    es.addEventListener("chunk", (e) => {
      try {
        const c = JSON.parse(e.data);
        setChunks((prev) => [...prev.slice(-800), c]);
      } catch { /* noop */ }
    });
    es.addEventListener("end", (e) => {
      try { setStatus(JSON.parse(e.data).status); } catch { setStatus("completed"); }
      es.close();
    });
    es.addEventListener("error", () => {
      // network close or run gone — stop listening, keep whatever we have
      es.close();
    });
    return () => es.close();
  }, [run?.id, run?.status]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [chunks]);

  async function stop() {
    setStopping(true);
    try {
      await stopLiveRun(run.id);
    } finally {
      setStopping(false);
    }
  }

  if (!run) return null;
  const s = STATUS[status] ?? STATUS.running;
  const StatusIcon = s.icon;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[92] bg-paper/30 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-hidden="true" />
      <motion.div
        className="fixed left-1/2 top-1/2 z-[93] flex h-[min(80vh,42rem)] w-[min(94vw,52rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--hz-radius-lg)] border border-outlineVariant bg-surface shadow-[0_30px_90px_rgba(37,88,216,0.28)]"
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        role="dialog"
        aria-label="Live agent console"
      >
        <div className="flex items-center justify-between gap-3 border-b border-outlineVariant px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Terminal className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate text-sm font-black text-paper">{run.title}</span>
            <span className="shrink-0 rounded-full border border-outlineVariant bg-surfaceVariant px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.12em] text-paper/56">{run.agent}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] ${s.tone}`}>
              <StatusIcon className={`h-3.5 w-3.5 ${s.spin ? "animate-spin" : ""}`} aria-hidden="true" /> {s.label}
            </span>
            {status === "running" ? (
              <button type="button" onClick={stop} disabled={stopping} className="inline-flex items-center gap-1 rounded-md border border-rust/40 bg-rust/10 px-2.5 py-1 text-[11px] font-black text-rust hover:brightness-105 disabled:opacity-50">
                {stopping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />} Stop
              </button>
            ) : null}
            <button type="button" onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md border border-outlineVariant text-paper/56 hover:text-paper" aria-label="Close console">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div ref={bodyRef} className="hz-scroll flex-1 overflow-y-auto bg-[#0f1a15] px-4 py-3 font-mono text-[12.5px] leading-relaxed">
          {chunks.length === 0 ? (
            <p className="text-[#6f8479]">Waiting for output…</p>
          ) : (
            chunks.map((c, i) => (
              <div
                key={i}
                className={
                  c.stream === "stderr" ? "whitespace-pre-wrap text-[#ffb3a1]" : c.stream === "system" ? "whitespace-pre-wrap text-[#7fd8b4]" : "whitespace-pre-wrap text-[#e7f1e8]"
                }
              >
                {c.text}
              </div>
            ))
          )}
        </div>
        <div className="border-t border-outlineVariant px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/40">
          {run.agent === "demo" ? "safe synthetic run — no real agent spawned" : `live ${run.agent} process · writes may hit the repo`}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bot,
  CheckCircle2,
  CircleDot,
  Cpu,
  FolderOpen,
  Loader2,
  RefreshCw,
  Rocket,
  Zap,
} from "lucide-react";
import SectionHeader from "../components/SectionHeader.jsx";
import Panel from "../components/Panel.jsx";
import { SkeletonGrid } from "../components/ui/Skeleton.jsx";
import { fetchActionQueue, deployAction, updateAction } from "../lib/actionQueueApi.js";
import { revealPath } from "../lib/docsApi.js";
import { gradeRun, fetchLessons } from "../lib/agentProfileApi.js";
import { startLiveRun } from "../lib/runsApi.js";
import LiveConsole from "../components/LiveConsole.jsx";
import { useUiStore } from "../store/uiStore.js";

// Agent telemetry — control, track, evaluate the workforce across every screen.
// Every deploy from any card lands here as a run with real state, the derived
// spec, and cost. Live-polls the queue + usage so in-flight work updates itself.

const STATUS_TONE = {
  deployed: "border-primary/40 bg-primary/10 text-primary",
  dispatched: "border-primary/40 bg-primary/10 text-primary",
  suggested: "border-brass/35 bg-brass/12 text-brass",
  done: "border-signal/40 bg-signal/12 text-signal",
  verified: "border-signal/40 bg-signal/12 text-signal",
  dismissed: "border-outlineVariant bg-white/50 text-paper/44",
};

function rel(value) {
  if (!value) return "";
  const then = new Date(value.replace(" ", "T") + (value.includes("Z") ? "" : "Z")).getTime();
  if (Number.isNaN(then)) return value;
  const diff = Date.now() - then;
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function AgentsTelemetry() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [actions, setActions] = useState(null);
  const [models, setModels] = useState(null);
  const [usage, setUsage] = useState(null);
  const [busy, setBusy] = useState("");
  const [offline, setOffline] = useState(false);
  const [activeRun, setActiveRun] = useState(null);
  const [lessons, setLessons] = useState({ counts: { good: 0, partial: 0, bad: 0 } });

  async function grade(actionId, g, note) {
    try {
      await gradeRun(actionId, g, note);
      pushToast({ tone: "success", title: `Graded ${g}`, message: note ? "Lesson saved — future runs will see it." : "Recorded." });
      fetchLessons().then(setLessons).catch(() => {});
    } catch (e) {
      pushToast({ tone: "error", title: "Grade failed", message: e.message });
    }
  }

  async function runLive(actionId, runner, title) {
    setBusy(`${actionId}:run`);
    try {
      const run = await startLiveRun(actionId, runner);
      setActiveRun({ ...run, title: run.title || title });
    } catch (e) {
      pushToast({ tone: "error", title: "Could not start run", message: e.message });
    } finally {
      setBusy("");
    }
  }

  const load = useCallback(async () => {
    try {
      const q = await fetchActionQueue();
      setActions(q.actions ?? []);
      setOffline(false);
    } catch {
      setActions([]);
      setOffline(true);
    }
    fetch("/api/ai-models").then((r) => r.json()).then(setModels).catch(() => {});
    fetch("/api/usage").then((r) => r.json()).then(setUsage).catch(() => setUsage({ available: false }));
    fetchLessons().then(setLessons).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000); // live poll
    return () => clearInterval(t);
  }, [load]);

  const runs = useMemo(() => {
    const list = (actions ?? []).filter((a) => a.enriched || ["deployed", "dispatched", "done", "verified"].includes(a.status));
    return list.sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
  }, [actions]);

  const providers = models?.providers ?? [];
  const online = providers.filter((p) => p.available).length;
  const deployedCount = runs.filter((r) => ["deployed", "dispatched"].includes(r.status)).length;

  async function redeploy(id) {
    setBusy(`${id}:deploy`);
    try {
      await deployAction(id);
      pushToast({ tone: "success", title: "Re-deployed", message: "Fresh runnable spec written." });
      load();
    } catch (e) {
      pushToast({ tone: "error", title: "Re-deploy failed", message: e.message });
    } finally {
      setBusy("");
    }
  }

  async function stop(id) {
    setBusy(`${id}:stop`);
    try {
      await updateAction(id, { status: "dismissed" });
      pushToast({ tone: "info", title: "Run stopped", message: "Marked dismissed; it will not be picked up." });
      load();
    } catch (e) {
      pushToast({ tone: "error", title: "Could not stop", message: e.message });
    } finally {
      setBusy("");
    }
  }

  async function openSpec(path) {
    try {
      await revealPath(path);
      pushToast({ tone: "success", title: "Opened spec", message: path });
    } catch (e) {
      pushToast({ tone: "error", title: "Could not open", message: e.message });
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Agent control · Telemetry"
        title="Watch, steer, and grade the workforce."
        copy="Every deploy from any screen lands here as a run — with its agent, state, derived spec, and cost. Live-updated so you can see what is moving and stop what should not be."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Cpu} tone="text-primary" label="Providers online" value={models ? `${online}/${providers.length}` : "…"} sub="keyed + reachable" />
        <Stat icon={Rocket} tone="text-signal" label="Active runs" value={`${deployedCount}`} sub={`${runs.length} total tracked`} />
        <Stat icon={Zap} tone="text-brass" label="Claude today" value={usage?.available ? `${(usage.today?.tokens ?? 0).toLocaleString()} tok` : "—"} sub={usage?.available ? `$${Number(usage.today?.cost ?? 0).toFixed(2)}` : "ccusage n/a"} />
        <Stat icon={Activity} tone="text-primary" label="This week" value={usage?.available ? `$${Number(usage.week?.totalCost ?? 0).toFixed(2)}` : "—"} sub="Claude spend" />
      </section>

      {providers.length ? (
        <Panel className="mt-4 p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">Provider health</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-md border border-outlineVariant bg-surfaceVariant px-3 py-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${p.available ? "bg-signal" : p.configured ? "bg-brass" : "bg-outlineVariant"}`} />
                <span className="truncate text-sm font-black text-paper">{p.label}</span>
                <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-paper/44">{p.models?.length ?? 0} models</span>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-2xl font-bold text-paper">Runs</h2>
            {lessons.counts && (lessons.counts.good + lessons.counts.partial + lessons.counts.bad) > 0 ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper/44">
                lessons: <span className="text-signal">{lessons.counts.good}✓</span> · <span className="text-brass">{lessons.counts.partial}~</span> · <span className="text-rust">{lessons.counts.bad}✗</span>
              </span>
            ) : null}
          </div>
          <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-md border border-outlineVariant bg-surface px-3 py-1.5 text-xs font-black text-paper/64 hover:text-paper">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        {actions === null ? (
          <SkeletonGrid count={4} cols="lg:grid-cols-2" />
        ) : runs.length === 0 ? (
          <Panel className="p-8 text-center">
            <Bot className="mx-auto h-8 w-8 text-paper/30" aria-hidden="true" />
            <p className="mt-2 text-sm font-bold text-paper/60">No agent runs yet.</p>
            <p className="mt-1 text-xs text-paper/44">
              {offline ? "Start the API (npm run dev:full) to track runs." : "Deploy an agent from any card — Inbox, Capital, Docs, Hub — and it shows here."}
            </p>
          </Panel>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {runs.map((r) => (
              <RunCard key={r.id} run={r} busy={busy} onRedeploy={() => redeploy(r.id)} onStop={() => stop(r.id)} onOpenSpec={openSpec} onRunLive={(runner) => runLive(r.id, runner, r.title)} onGrade={(g, note) => grade(r.id, g, note)} />
            ))}
          </div>
        )}
      </section>

      {activeRun ? <LiveConsole run={activeRun} onClose={() => { setActiveRun(null); load(); }} /> : null}
    </div>
  );
}

function RunCard({ run, busy, onRedeploy, onStop, onOpenSpec, onRunLive, onGrade }) {
  const [showSpec, setShowSpec] = useState(false);
  const [runner, setRunner] = useState("demo");
  const [gradeNote, setGradeNote] = useState("");
  const [graded, setGraded] = useState(run.outcome_code || "");
  const specPath = run.spec_path || run.deployed_path;
  const active = ["deployed", "dispatched"].includes(run.status);
  const GRADE_TONE = { good: "border-signal/40 bg-signal/10 text-signal", partial: "border-brass/40 bg-brass/10 text-brass", bad: "border-rust/40 bg-rust/10 text-rust" };
  function submitGrade(g) {
    onGrade(g, gradeNote.trim());
    setGraded(g);
    setGradeNote("");
  }
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-secondaryContainer px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.12em] text-signal">
              <Bot className="h-3 w-3" /> {run.agent || "claude"}
            </span>
            <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.12em] ${STATUS_TONE[run.status] ?? STATUS_TONE.suggested}`}>
              {active ? <CircleDot className="mr-1 inline h-3 w-3 animate-pulse" /> : null}{run.status}
            </span>
            {run.enriched ? <span className="rounded-full border border-signal/30 bg-signal/8 px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.12em] text-signal">enriched</span> : null}
          </div>
          <h3 className="mt-2 text-sm font-black leading-snug text-paper">{run.title}</h3>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/40">
            {run.project_id ? `${run.project_id} · ` : ""}{rel(run.updated_at)}
          </p>
        </div>
      </div>

      {run.goal ? (
        <div className="mt-3">
          <button type="button" onClick={() => setShowSpec((v) => !v)} className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary hover:underline">
            {showSpec ? "hide spec" : "view derived spec"}
          </button>
          {showSpec ? (
            <div className="mt-2 space-y-2 rounded-md border border-outlineVariant bg-surfaceVariant p-3 text-xs leading-5 text-paper/70">
              <SpecField label="Goal" value={run.goal} />
              <SpecField label="Done when" value={run.done_criteria} />
              <SpecField label="Constraints" value={run.constraints} />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-outlineVariant pt-3">
        <div className="inline-flex items-center overflow-hidden rounded-md border border-primary/30">
          <select
            value={runner}
            onChange={(e) => setRunner(e.target.value)}
            aria-label="Live runner"
            title={runner === "demo" ? "Safe synthetic run — no real agent" : "Runs the real local CLI (may write the repo)"}
            className="appearance-none bg-primary/8 py-1 pl-2 pr-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-primary outline-none"
          >
            <option value="demo">demo</option>
            <option value="claude">claude</option>
            <option value="codex">codex</option>
          </select>
          <button
            type="button"
            onClick={() => onRunLive(runner)}
            disabled={busy === `${run.id}:run`}
            className="inline-flex items-center gap-1 bg-primary px-2 py-1 text-[11px] font-black text-onPrimary hover:brightness-110 disabled:opacity-50"
          >
            {busy === `${run.id}:run` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />} Run live
          </button>
        </div>
        {specPath ? (
          <button type="button" onClick={() => onOpenSpec(specPath)} className="inline-flex items-center gap-1 rounded-md border border-outlineVariant bg-surface px-2 py-1 text-[11px] font-black text-paper/64 hover:text-paper">
            <FolderOpen className="h-3.5 w-3.5" /> Open spec
          </button>
        ) : null}
        <button type="button" onClick={onRedeploy} disabled={busy === `${run.id}:deploy`} className="inline-flex items-center gap-1 rounded-md border border-outlineVariant bg-surface px-2 py-1 text-[11px] font-black text-paper/64 hover:text-paper disabled:opacity-50">
          {busy === `${run.id}:deploy` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Re-deploy
        </button>
        {active ? (
          <button type="button" onClick={onStop} disabled={busy === `${run.id}:stop`} className="inline-flex items-center gap-1 rounded-md border border-rust/30 bg-rust/8 px-2 py-1 text-[11px] font-black text-rust hover:brightness-105 disabled:opacity-50">
            Stop
          </button>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-paper/40">Grade</span>
        <input
          value={gradeNote}
          onChange={(e) => setGradeNote(e.target.value)}
          placeholder="what to learn (becomes a lesson for future runs)"
          className="min-w-0 flex-1 rounded-md border border-outlineVariant bg-surface px-2 py-1 text-[11px] text-paper outline-none placeholder:text-paper/36"
        />
        {["good", "partial", "bad"].map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => submitGrade(g)}
            className={`rounded-md border px-2 py-1 font-mono text-[10px] font-black uppercase tracking-[0.1em] transition ${graded === g ? GRADE_TONE[g] : "border-outlineVariant text-paper/50 hover:text-paper"}`}
          >
            {g}
          </button>
        ))}
        {graded ? <CheckCircle2 className="h-3.5 w-3.5 text-signal" aria-label="graded" /> : null}
      </div>
    </Panel>
  );
}

function SpecField({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-paper/44">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-paper/74">{value}</p>
    </div>
  );
}

function Stat({ icon: Icon, tone, label, value, sub }) {
  return (
    <Panel className="flex items-center gap-4 p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--hz-radius-sm)] border border-outlineVariant bg-surfaceVariant">
        <Icon className={`h-5 w-5 ${tone}`} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/46">{label}</p>
        <p className="text-xl font-black text-paper">{value}</p>
        <p className="truncate text-xs text-paper/52">{sub}</p>
      </div>
    </Panel>
  );
}

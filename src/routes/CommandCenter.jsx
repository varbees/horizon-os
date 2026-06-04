import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock,
  Cpu,
  RefreshCw,
  Rocket,
  Send,
  Terminal,
  Waypoints,
  X,
} from "lucide-react";
import Panel from "../components/Panel.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import UsagePanel from "../components/UsagePanel.jsx";
import { deployAction, dispatchToJules, enrichActionWithGemini, fetchActionQueue, fetchJulesSources, fetchLoopStatus, generateRevenueActions, runLoopCycle, updateAction } from "../lib/actionQueueApi.js";
import { actionQueueSeed, projects, socialSkillCatalog } from "../data/horizon.js";

const STATUS_FLOW = {
  suggested: "queued",
  queued: "deployed",
  deployed: "done",
  done: "done",
  dismissed: "suggested",
};

const statusTone = {
  suggested: "border-brass/35 bg-brass/12 text-brass",
  queued: "border-primary/30 bg-primary/10 text-primary",
  deployed: "border-secondaryContainer bg-signal/12 text-signal",
  done: "border-outlineVariant bg-white/60 text-paper/46",
  dismissed: "border-outlineVariant bg-white/60 text-paper/40",
};

const agentTone = {
  claude: "text-primary",
  codex: "text-signal",
};

const seedActions = actionQueueSeed.map((a) => ({
  id: a.id,
  title: a.title,
  summary: a.summary,
  source: a.source,
  project_id: a.projectId,
  project_path: a.projectPath,
  agent: a.agent,
  prompt: a.prompt,
  status: "suggested",
  impact: a.impact,
  deployed_path: "",
}));

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function CommandCenter() {
  const [actions, setActions] = useState(seedActions);
  const [source, setSource] = useState("seed");
  const [open, setOpen] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generatorStatus, setGeneratorStatus] = useState("");
  const [loop, setLoop] = useState(null);
  const [loopBusy, setLoopBusy] = useState(false);
  const now = useClock();

  useEffect(() => {
    let active = true;
    fetchActionQueue()
      .then((data) => {
        if (!active || !Array.isArray(data.actions) || data.actions.length === 0) return;
        setActions(data.actions);
        setSource("live");
      })
      .catch(() => {});
    fetchLoopStatus()
      .then((data) => active && setLoop(data))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const activeEngagements = useMemo(
    () => projects.filter((p) => p.now).length,
    [],
  );
  const inQueue = actions.filter((a) => a.status === "suggested" || a.status === "queued").length;
  const deployed = actions.filter((a) => a.status === "deployed").length;
  const done = actions.filter((a) => a.status === "done").length;
  const readyForJules = actions.filter((a) => a.enriched && a.status !== "dismissed" && a.status !== "done").length;

  async function runLoop() {
    setLoopBusy(true);
    try {
      const cycle = await runLoopCycle({});
      setLoop(cycle);
      const data = await fetchActionQueue();
      if (Array.isArray(data.actions) && data.actions.length) {
        setActions(data.actions);
        setSource("live");
      }
    } catch {
      /* loop endpoint offline — leave last heartbeat in place */
    } finally {
      setLoopBusy(false);
    }
  }

  function advance(action) {
    const next = STATUS_FLOW[action.status] ?? "queued";
    setActions((prev) => prev.map((a) => (a.id === action.id ? { ...a, status: next } : a)));
    if (source === "live") updateAction(action.id, { status: next }).catch(() => {});
  }

  function dismiss(action) {
    setActions((prev) => prev.map((a) => (a.id === action.id ? { ...a, status: "dismissed" } : a)));
    if (source === "live") updateAction(action.id, { status: "dismissed" }).catch(() => {});
  }

  async function deploy(action) {
    let path = `${action.project_path}/.horizon/queue/${action.id}.md`;
    if (source === "live") {
      try {
        const res = await deployAction(action.id);
        path = res.path ?? path;
      } catch {
        /* keep optimistic path */
      }
    }
    setActions((prev) => prev.map((a) => (a.id === action.id ? { ...a, status: "deployed", deployed_path: path } : a)));
    setOpen((cur) => (cur && cur.id === action.id ? { ...cur, status: "deployed", deployed_path: path } : cur));
  }

  async function enrich(action) {
    if (source !== "live") throw new Error("Start npm run dev:full to enrich with Gemini.");
    const fields = await enrichActionWithGemini(action.id);
    const merge = (a) => ({ ...a, goal: fields.goal, constraints: fields.constraints, done_criteria: fields.done_criteria, tools: fields.tools, prompt: fields.prompt ?? a.prompt, enriched: 1 });
    setActions((prev) => prev.map((a) => (a.id === action.id ? merge(a) : a)));
    setOpen((cur) => (cur && cur.id === action.id ? merge(cur) : cur));
  }

  async function generateFromSweep() {
    setGenerating(true);
    setGeneratorStatus("Sweeping projects and generating money actions...");
    try {
      const result = await generateRevenueActions({ sweep: true });
      if (Array.isArray(result.actions)) setActions(result.actions);
      setSource("live");
      setGeneratorStatus(
        `Generated ${result.generated?.length ?? 0} actions from ${result.sweep?.summary?.projects ?? 0} indexed items.`,
      );
    } catch (error) {
      setGeneratorStatus(error instanceof Error ? error.message : "Revenue action generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  const clock = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const day = now.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

  return (
    <div>
      <SectionHeader
        eyebrow="Revenue command center"
        title="Turn signals into money actions."
        copy="The operator surface for paid proof: deploy a Claude, Codex, Gemini, or Jules-ready task into the right project with buyer, offer, constraints, and done criteria."
      />

      <section className="overflow-hidden rounded-[var(--hz-radius-lg)] border border-outlineVariant bg-gradient-to-br from-primaryContainer/70 via-surfaceVariant to-secondaryContainer/50 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-primary">antharmaya / revenue engine</p>
            <h2 className="mt-1 font-display text-4xl font-black tracking-tight text-paper">money moves</h2>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs uppercase tracking-[0.18em] text-paper/60">
              <StatusBead value={socialSkillCatalog.length} label="skills armed" />
              <span aria-hidden="true">·</span>
              <StatusBead value={activeEngagements} label="active money lanes" />
              <span aria-hidden="true">·</span>
              <StatusBead value={inQueue} label="suggestions in queue" />
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-3xl font-black tabular-nums text-paper">{clock}</p>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/52">{day}</p>
          </div>
        </div>
      </section>

      <LaneBanner />

      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Scorecard icon={CircleDot} tone="text-brass" value={inQueue} label="In queue" sub="suggested + queued" />
        <Scorecard icon={Rocket} tone="text-signal" value={deployed} label="Deployed" sub="prompt written to project" />
        <Scorecard icon={Send} tone="text-rust" value={readyForJules} label="Ready for Jules" sub="enriched, awaiting dispatch" />
        <Scorecard icon={CheckCircle2} tone="text-primary" value={done} label="Done" sub="closed this cycle" />
      </section>

      <section className="mt-4">
        <LoopStrip loop={loop} busy={loopBusy} onRun={runLoop} now={now} />
      </section>

      <section className="mt-5">
        <UsagePanel />
      </section>

      <section className="mt-5">
        <Panel className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Deployable actions</p>
              <h2 className="mt-2 font-display text-2xl font-bold">Only tasks that move money, proof, or distribution</h2>
              {generatorStatus ? <p className="mt-1 text-sm font-bold text-paper/58">{generatorStatus}</p> : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={generateFromSweep}
                disabled={generating}
                className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primaryContainer px-3 py-1.5 text-sm font-black text-onPrimaryContainer transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-55"
              >
                <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} aria-hidden="true" />
                Generate from sweep
              </button>
              <span className="rounded-full border border-outlineVariant bg-surfaceVariant px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-paper/52">
                {source === "live" ? "live · 127.0.0.1:8787" : "seed"}
              </span>
            </div>
          </div>

          <div className="mt-5 divide-y divide-outlineVariant/70">
            {actions
              .filter((a) => a.status !== "dismissed")
              .map((action) => (
                <div key={action.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <button type="button" onClick={() => setOpen(action)} className="min-w-0 flex-1 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.14em] ${statusTone[action.status]}`}>
                        {action.status}
                      </span>
                      {action.impact === "high" ? (
                        <span className="rounded-full border border-rust/30 bg-rust/10 px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-rust">high</span>
                      ) : null}
                      {action.enriched ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-signal/30 bg-signal/10 px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-signal">
                          <Send className="h-3 w-3" aria-hidden="true" /> jules-ready
                        </span>
                      ) : null}
                      <span className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] ${agentTone[action.agent] ?? "text-paper/50"}`}>
                        <Cpu className="h-3 w-3" aria-hidden="true" /> {action.agent}
                      </span>
                      <span className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-paper/42">{action.project_id}</span>
                    </div>
                    <h3 className="mt-1.5 text-base font-black text-paper">{action.title}</h3>
                    <p className="text-sm leading-6 text-paper/58">{action.summary}</p>
                  </button>

                  <div className="flex shrink-0 items-center gap-2">
                    {action.status === "suggested" || action.status === "queued" ? (
                      <button
                        type="button"
                        onClick={() => deploy(action)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-black text-onPrimary transition hover:bg-primary/90"
                      >
                        <Rocket className="h-4 w-4" aria-hidden="true" /> Deploy
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => advance(action)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-outlineVariant bg-surfaceVariant px-3 py-1.5 text-sm font-black text-paper transition hover:border-outline"
                      >
                        {action.status === "deployed" ? "Mark done" : "Next"}
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                    <button type="button" onClick={() => dismiss(action)} aria-label="Dismiss" className="rounded-md border border-outlineVariant p-1.5 text-paper/40 transition hover:text-rust">
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </Panel>
      </section>

      {open ? <ActionDrawer action={open} onClose={() => setOpen(null)} onDeploy={() => deploy(open)} onEnrich={() => enrich(open)} /> : null}
    </div>
  );
}

function StatusBead({ value, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-black text-paper">{value}</span>
      {label}
    </span>
  );
}

const LANES = [
  {
    tag: "engine",
    tone: "border-signal/30 bg-signal/[0.07]",
    dot: "bg-signal",
    name: "PhotoSelect",
    model: "B2B SaaS · flat studio price, zero commission",
    move: "Unblock live creds → first paying studio → first 5",
  },
  {
    tag: "fast-cash",
    tone: "border-brass/30 bg-brass/[0.07]",
    dot: "bg-brass",
    name: "rateguard (varbees)",
    move: "Open-source the core → paid hosted dashboard → first $",
    model: "Open-core · free SDK, paid hosted tier",
  },
];

function LaneBanner() {
  return (
    <section className="mt-5" aria-label="The two money lanes">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Two lanes only</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/40">refuse a third until one pays</p>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {LANES.map((lane) => (
          <div key={lane.name} className={`rounded-[var(--hz-radius-lg)] border ${lane.tone} p-4`}>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${lane.dot}`} aria-hidden="true" />
              <span className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-paper/60">{lane.tag}</span>
            </div>
            <h3 className="mt-2 font-display text-2xl font-black text-paper">{lane.name}</h3>
            <p className="mt-1 text-sm text-paper/56">{lane.model}</p>
            <p className="mt-3 flex items-start gap-1.5 border-t border-outlineVariant/70 pt-3 text-sm font-bold text-paper/72">
              <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-paper/40" aria-hidden="true" />
              {lane.move}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function LoopStrip({ loop, busy, onRun, now }) {
  const s = loop?.stages ?? {};
  const ranAt = loop?.startedAt ? new Date(loop.startedAt) : null;
  const neverRun = !loop || loop.reason === "never_run" || !ranAt;
  const agoMin = ranAt ? Math.max(0, Math.round((now - ranAt) / 60000)) : null;
  const enrich = s.enrich ?? {};
  const enrichLabel = enrich.skipped
    ? "skipped (no key)"
    : `${enrich.enriched ?? 0} enriched${enrich.stoppedForQuota ? " · quota hit" : ""}`;
  const cells = neverRun
    ? []
    : [
        { k: "Swept", v: `${s.sweep?.projects ?? "—"}`, sub: `${s.sweep?.dirtyRepos ?? 0} dirty` },
        { k: "Generated", v: `${s.generate?.actions ?? "—"}`, sub: "money actions" },
        { k: "Enriched", v: `${enrich.enriched ?? 0}`, sub: enrichLabel },
        { k: "Ready", v: `${s.ready?.enrichedActions ?? "—"}`, sub: "for dispatch" },
      ];

  return (
    <Panel className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.26em] text-brass">
            <Waypoints className="h-3.5 w-3.5" aria-hidden="true" /> Operating loop
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-paper">
            {neverRun ? "Loop has not run yet" : "sweep → generate → enrich → ready"}
          </h2>
          <p className="mt-1 text-sm text-paper/56">
            {neverRun
              ? "Run npm run horizon:watch for the autonomous loop, or trigger one cycle now."
              : (
                <>
                  Last cycle {agoMin === 0 ? "just now" : `${agoMin} min ago`}
                  <span className={`ml-2 font-mono text-[11px] font-black uppercase tracking-[0.14em] ${loop.ok ? "text-signal" : "text-rust"}`}>
                    {loop.ok ? "ok" : `${loop.errors?.length ?? 0} err`}
                  </span>
                </>
              )}
          </p>
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={busy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-primary/30 bg-primaryContainer px-3 py-1.5 text-sm font-black text-onPrimaryContainer transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-55"
        >
          <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} aria-hidden="true" />
          {busy ? "Running cycle…" : "Run loop now"}
        </button>
      </div>
      {cells.length ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cells.map((c) => (
            <div key={c.k} className="rounded-[var(--hz-radius-sm)] border border-outlineVariant bg-surfaceVariant p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/46">{c.k}</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-paper">{c.v}</p>
              <p className="truncate text-xs text-paper/52">{c.sub}</p>
            </div>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}

function Scorecard({ icon: Icon, tone, value, label, sub }) {
  return (
    <Panel className="flex items-center gap-4 p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--hz-radius-sm)] border border-outlineVariant bg-surfaceVariant">
        <Icon className={`h-5 w-5 ${tone}`} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-black tabular-nums text-paper">{value}</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/46">{label}</p>
        <p className="truncate text-xs text-paper/52">{sub}</p>
      </div>
    </Panel>
  );
}

function ActionDrawer({ action, onClose, onDeploy, onEnrich }) {
  const [enriching, setEnriching] = useState(false);
  const [err, setErr] = useState(null);
  const runnable = Boolean((action.goal || action.summary) && (action.cwd || action.project_path));

  async function handleEnrich() {
    setEnriching(true);
    setErr(null);
    try {
      await onEnrich();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setEnriching(false);
    }
  }

  const [jules, setJules] = useState({ open: false, sources: [], source: "", branch: "main", busy: false, result: null, error: null });

  async function openJules() {
    setJules((j) => ({ ...j, open: true, busy: true, error: null }));
    try {
      const sources = await fetchJulesSources();
      setJules((j) => ({ ...j, sources, source: sources[0]?.name ?? "", branch: sources[0]?.githubRepo?.defaultBranch?.displayName ?? "main", busy: false }));
    } catch (e) {
      setJules((j) => ({ ...j, busy: false, error: String(e.message || e) }));
    }
  }

  async function sendToJules() {
    setJules((j) => ({ ...j, busy: true, error: null }));
    try {
      const res = await dispatchToJules(action.id, { source: jules.source, branch: jules.branch });
      setJules((j) => ({ ...j, busy: false, result: res }));
    } catch (e) {
      setJules((j) => ({ ...j, busy: false, error: String(e.message || e) }));
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-paper/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg overflow-y-auto border-l border-outlineVariant bg-surface p-6 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-brass">{action.source} · {action.project_id}</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-paper">{action.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md border border-outlineVariant p-1.5 text-paper/50 hover:text-paper">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-6 text-paper/64">{action.summary}</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Meta icon={Cpu} label="Agent" value={action.agent} />
          <Meta icon={Clock} label={runnable ? "Runnable" : "Status"} value={runnable ? "ready to deploy" : action.status} />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/46">Executable spec</p>
          <button
            type="button"
            onClick={handleEnrich}
            disabled={enriching}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-black text-primary transition hover:bg-primary/15 disabled:opacity-60"
          >
            <Cpu className="h-3.5 w-3.5" aria-hidden="true" /> {enriching ? "Enriching…" : action.enriched ? "Re-enrich" : "Enrich with Gemini"}
          </button>
        </div>
        {err ? <p className="mt-1 text-xs text-rust">{err}</p> : null}

        {action.goal ? <SpecBlock label="Goal" text={action.goal} /> : null}
        {action.constraints ? <SpecBlock label="Constraints" text={action.constraints} /> : null}
        {action.done_criteria ? <SpecBlock label="Definition of done" text={action.done_criteria} check /> : null}
        {action.tools ? <SpecBlock label="Tools" text={action.tools} /> : null}

        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/46">Target path</p>
        <p className="mt-1 break-words font-mono text-xs text-paper/64">{action.cwd || action.project_path}</p>

        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/46">Prompt</p>
        <pre className="mt-1 whitespace-pre-wrap rounded-md border border-outlineVariant bg-surfaceVariant p-3 font-mono text-xs leading-5 text-paper/78">{action.prompt}</pre>

        {action.deployed_path ? (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-signal/30 bg-signal/10 p-3">
            <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-paper">Prompt deployed</p>
              <p className="break-words font-mono text-xs text-paper/60">{action.deployed_path}</p>
              <p className="mt-1 text-xs text-paper/56">Run it in the project with <span className="font-mono">{action.agent}</span>.</p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onDeploy}
            className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-black text-onPrimary transition hover:bg-primary/90"
          >
            <Rocket className="h-4 w-4" aria-hidden="true" /> Deploy prompt to project
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        <div className="mt-5 border-t border-outlineVariant pt-4">
          {jules.result ? (
            <div className="flex items-start gap-2 rounded-md border border-signal/30 bg-signal/10 p-3">
              <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-paper">Jules session created</p>
                <p className="break-words font-mono text-xs text-paper/60">{jules.result.sessionId || "(id pending)"}</p>
                <p className="mt-1 text-xs text-paper/56">Review the plan in jules.google.com; it requires your approval before changes.</p>
              </div>
            </div>
          ) : !jules.open ? (
            <button
              type="button"
              onClick={openJules}
              className="inline-flex items-center gap-1.5 rounded-md border border-outlineVariant bg-surfaceVariant px-3 py-1.5 text-sm font-black text-paper transition hover:border-outline"
            >
              <Cpu className="h-4 w-4 text-brass" aria-hidden="true" /> Send to Jules (async repo agent)
            </button>
          ) : (
            <div className="rounded-md border border-outlineVariant bg-surfaceVariant p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/46">Dispatch to a connected repo</p>
              {jules.busy && !jules.sources.length ? (
                <p className="mt-2 text-sm text-paper/56">Loading sources…</p>
              ) : (
                <>
                  <select
                    value={jules.source}
                    onChange={(e) => setJules((j) => ({ ...j, source: e.target.value }))}
                    className="mt-2 w-full rounded-md border border-outlineVariant bg-white/70 px-2 py-1.5 text-sm text-paper outline-none"
                  >
                    {jules.sources.length === 0 ? <option value="">No connected repos — connect one in the Jules app</option> : null}
                    {jules.sources.map((s) => (
                      <option key={s.name} value={s.name}>{s.githubRepo ? `${s.githubRepo.owner}/${s.githubRepo.repo}` : s.name}</option>
                    ))}
                  </select>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      value={jules.branch}
                      onChange={(e) => setJules((j) => ({ ...j, branch: e.target.value }))}
                      placeholder="branch"
                      className="w-28 rounded-md border border-outlineVariant bg-white/70 px-2 py-1.5 font-mono text-xs text-paper outline-none"
                    />
                    <button
                      type="button"
                      onClick={sendToJules}
                      disabled={jules.busy || !jules.source}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-black text-onPrimary disabled:opacity-60"
                    >
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" /> {jules.busy ? "Dispatching…" : "Dispatch (plan-gated)"}
                    </button>
                  </div>
                </>
              )}
              {jules.error ? <p className="mt-2 text-xs text-rust">{jules.error}</p> : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SpecBlock({ label, text, check = false }) {
  const items = String(text).split(/\r?\n/).map((l) => l.replace(/^[-*\d.\s[\]x]+/i, "").trim()).filter(Boolean);
  return (
    <div className="mt-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/46">{label}</p>
      {items.length > 1 ? (
        <ul className="mt-1 space-y-1">
          {items.map((it, i) => (
            <li key={i} className="flex gap-2 text-sm leading-6 text-paper/74">
              <span className="mt-0.5 text-paper/40">{check ? "☐" : "•"}</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm leading-6 text-paper/74">{text}</p>
      )}
    </div>
  );
}

function Meta({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md border border-outlineVariant bg-surfaceVariant p-3">
      <p className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/46">
        <Icon className="h-3 w-3" aria-hidden="true" /> {label}
      </p>
      <p className="mt-1 text-sm font-black text-paper">{value}</p>
    </div>
  );
}

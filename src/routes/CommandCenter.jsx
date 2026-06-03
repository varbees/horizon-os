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
  Terminal,
  X,
} from "lucide-react";
import Panel from "../components/Panel.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import UsagePanel from "../components/UsagePanel.jsx";
import { deployAction, fetchActionQueue, generateRevenueActions, updateAction } from "../lib/actionQueueApi.js";
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

      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        <Scorecard icon={CircleDot} tone="text-brass" value={inQueue} label="In queue" sub="suggested + queued" />
        <Scorecard icon={Rocket} tone="text-signal" value={deployed} label="Deployed" sub="prompt written to project" />
        <Scorecard icon={CheckCircle2} tone="text-primary" value={done} label="Done" sub="closed this cycle" />
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

      {open ? <ActionDrawer action={open} onClose={() => setOpen(null)} onDeploy={() => deploy(open)} /> : null}
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

function ActionDrawer({ action, onClose, onDeploy }) {
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
          <Meta icon={Clock} label="Status" value={action.status} />
        </div>

        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/46">Target path</p>
        <p className="mt-1 break-words font-mono text-xs text-paper/64">{action.project_path}</p>

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
      </div>
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

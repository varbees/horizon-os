import { useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle2, CircleDashed, Clock3, Plus, RefreshCw, Target, TimerReset } from "lucide-react";
import { actionTasks, phaseGates } from "../data/horizon.js";
import { createCommandTask, fetchCommandTasks, updateCommandTask } from "../lib/commandBase.js";
import Panel from "./Panel.jsx";
import PrimaryButton from "./PrimaryButton.jsx";

const statuses = [
  { id: "open", label: "Open", icon: CircleDashed, tone: "text-paper/58" },
  { id: "doing", label: "Doing", icon: Clock3, tone: "text-primary" },
  { id: "blocked", label: "Blocked", icon: Ban, tone: "text-coral" },
  { id: "done", label: "Done", icon: CheckCircle2, tone: "text-signal" },
];

function seedTask(task) {
  return {
    id: task.id,
    node_id: task.nodeId ?? null,
    event_id: task.eventId ?? null,
    project_id: task.projectId ?? "",
    phase_id: task.phaseId ?? "",
    lane: task.lane ?? "General",
    title: task.title,
    status: task.status ?? "open",
    priority: task.priority ?? "normal",
    revenue_impact: Number(task.revenueImpact ?? 0),
    due_at: task.dueAt ?? null,
    evidence: task.evidence ?? "",
    sort_order: Number(task.sortOrder ?? 0),
  };
}

const fallbackTasks = actionTasks.map(seedTask);
const CURRENT_PHASE_ID = "weeks-1-4";
const todayIso = () => new Date().toISOString().slice(0, 10);

function compareTasks(a, b) {
  if (a.status === "done" && b.status !== "done") return 1;
  if (a.status !== "done" && b.status === "done") return -1;
  return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) || String(a.due_at ?? "").localeCompare(String(b.due_at ?? ""));
}

export default function ActionBoard() {
  const [tasks, setTasks] = useState(fallbackTasks);
  const [activePhase, setActivePhase] = useState(CURRENT_PHASE_ID);
  const [activeLane, setActiveLane] = useState("All");
  const [syncStatus, setSyncStatus] = useState("loading tasks");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftLane, setDraftLane] = useState("Revenue floor");
  const [draftDue, setDraftDue] = useState(todayIso);

  const loadTasks = async () => {
    setSyncStatus("loading tasks");
    try {
      const data = await fetchCommandTasks();
      setTasks((data.tasks?.length ? data.tasks : fallbackTasks).sort(compareTasks));
      setSyncStatus("SQLite task board live");
    } catch {
      setTasks(fallbackTasks);
      setSyncStatus("API offline; showing seeded plan");
    }
  };

  useEffect(() => {
    void loadTasks();
  }, []);

  const lanes = useMemo(() => ["All", ...new Set(tasks.map((task) => task.lane || "General"))], [tasks]);
  const filteredTasks = useMemo(
    () =>
      tasks
        .filter((task) => activePhase === "all" || task.phase_id === activePhase)
        .filter((task) => activeLane === "All" || task.lane === activeLane)
        .sort(compareTasks),
    [activeLane, activePhase, tasks],
  );
  const statusCounts = useMemo(
    () =>
      statuses.reduce((acc, status) => {
        acc[status.id] = tasks.filter((task) => task.status === status.id).length;
        return acc;
      }, {}),
    [tasks],
  );
  const doneCount = statusCounts.done ?? 0;
  const progress = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const revenueQueue = tasks.filter((task) => Number(task.revenue_impact) === 1 && task.status !== "done").length;

  const patchTask = async (id, patch) => {
    const existing = tasks.find((task) => task.id === id);
    if (!existing) return;
    const nextTask = { ...existing, ...patch };
    setTasks((current) => current.map((task) => (task.id === id ? nextTask : task)).sort(compareTasks));
    try {
      await updateCommandTask(id, patch);
      setSyncStatus("task updated");
    } catch {
      setSyncStatus("task changed locally only");
    }
  };

  const createTask = async () => {
    const title = draftTitle.trim();
    if (!title) return;
    const task = {
      title,
      lane: draftLane,
      phase_id: activePhase === "all" ? "weeks-1-4" : activePhase,
      project_id: draftLane === "Revenue floor" ? "photoselect-revenue" : "horizon-os",
      priority: draftLane === "Revenue floor" ? "high" : "normal",
      revenue_impact: draftLane === "Revenue floor" ? 1 : 0,
      due_at: draftDue,
      evidence: "",
      sort_order: Date.now(),
      status: "open",
    };
    try {
      await createCommandTask(task);
      setDraftTitle("");
      await loadTasks();
      setSyncStatus("new action created");
    } catch {
      setSyncStatus("could not create task; API offline");
    }
  };

  return (
    <section className="mt-5" aria-label="Action control board">
      <Panel className="overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[0.74fr_1.26fr]">
          <div className="border-b border-outlineVariant bg-primaryContainer/45 p-5 xl:border-b-0 xl:border-r">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Action control board</p>
                <h2 className="mt-2 font-display text-3xl font-bold text-paper">Make the plan move</h2>
              </div>
              <button
                type="button"
                onClick={() => void loadTasks()}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-outlineVariant bg-surface text-paper/58 transition hover:border-outline hover:text-paper"
                aria-label="Refresh action board"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <MetricPill label="Done" value={`${doneCount}/${tasks.length}`} helper={`${progress}% cleared`} />
              <MetricPill label="Revenue queue" value={revenueQueue} helper="cash-linked" />
              <MetricPill label="This phase" value={filteredTasks.length} helper="visible actions" />
              <MetricPill label="Sync" value={syncStatus.includes("live") ? "Live" : "Local"} helper={syncStatus} />
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full border border-outlineVariant bg-surface">
              <div className="h-full rounded-full bg-signal transition-all" style={{ width: `${progress}%` }} />
            </div>

            <div className="mt-6 space-y-2" aria-label="Phase filters">
              <button
                type="button"
                onClick={() => setActivePhase("all")}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm font-black transition ${
                  activePhase === "all" ? "border-primary bg-surface text-primary" : "border-outlineVariant bg-surface/64 text-paper/62 hover:text-paper"
                }`}
              >
                Entire 24-month map
              </button>
              {phaseGates.map((phase) => {
                const phaseTasks = tasks.filter((task) => task.phase_id === phase.id);
                const phaseDone = phaseTasks.filter((task) => task.status === "done").length;
                return (
                  <button
                    key={phase.id}
                    type="button"
                    onClick={() => setActivePhase(phase.id)}
                    className={`w-full rounded-md border p-3 text-left transition ${
                      activePhase === phase.id ? "border-primary bg-surface text-paper shadow-rule" : "border-outlineVariant bg-surface/64 text-paper/62 hover:text-paper"
                    }`}
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brass">{phase.label}</span>
                    <span className="mt-1 flex items-center justify-between gap-3">
                      <span className="text-sm font-black">{phase.title}</span>
                      <span className="font-mono text-[10px] text-paper/42">
                        {phaseDone}/{phaseTasks.length}
                      </span>
                    </span>
                    <span className="mt-2 block text-xs leading-5 text-paper/52">{phase.control}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Today controls tomorrow</p>
                <h2 className="mt-2 text-2xl font-black text-paper">{filteredTasks.length} controllable actions</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {statuses.map((status) => {
                  const Icon = status.icon;
                  return (
                    <span key={status.id} className={`inline-flex items-center gap-1.5 rounded-full border border-outlineVariant bg-surface px-3 py-1.5 text-xs font-black ${status.tone}`}>
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {status.label}: {statusCounts[status.id] ?? 0}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2" aria-label="Lane filters">
              {lanes.map((lane) => (
                <button
                  key={lane}
                  type="button"
                  onClick={() => setActiveLane(lane)}
                  className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                    activeLane === lane ? "bg-secondaryContainer text-paper" : "border border-outlineVariant bg-surface text-paper/58 hover:text-paper"
                  }`}
                >
                  {lane}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-3">
              {filteredTasks.map((task) => (
                <TaskRow key={task.id} task={task} onPatch={patchTask} />
              ))}
            </div>

            <div className="mt-5 rounded-md border border-outlineVariant bg-surfaceVariant p-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" aria-hidden="true" />
                <p className="text-sm font-black text-paper">Create next physical action</p>
              </div>
              <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_9rem_8rem_auto]">
                <input
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  placeholder="Example: send 5 follow-ups to studios with workflow notes"
                  className="rounded-md border border-outlineVariant bg-surface px-3 py-2 text-sm font-bold text-paper outline-none focus:border-primary"
                />
                <select
                  value={draftLane}
                  onChange={(event) => setDraftLane(event.target.value)}
                  className="rounded-md border border-outlineVariant bg-surface px-3 py-2 text-sm font-bold text-paper outline-none focus:border-primary"
                >
                  {lanes.filter((lane) => lane !== "All").map((lane) => (
                    <option key={lane} value={lane}>
                      {lane}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={draftDue}
                  onChange={(event) => setDraftDue(event.target.value)}
                  className="rounded-md border border-outlineVariant bg-surface px-3 py-2 text-sm font-bold text-paper outline-none focus:border-primary"
                />
                <PrimaryButton onClick={createTask}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      </Panel>
    </section>
  );
}

function MetricPill({ label, value, helper }) {
  return (
    <div className="rounded-md border border-outlineVariant bg-surface p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/42">{label}</p>
      <p className="mt-1 text-2xl font-black text-paper">{value}</p>
      <p className="mt-1 truncate text-xs font-bold text-paper/48">{helper}</p>
    </div>
  );
}

function TaskRow({ task, onPatch }) {
  const [evidence, setEvidence] = useState(task.evidence ?? "");

  useEffect(() => {
    setEvidence(task.evidence ?? "");
  }, [task.evidence]);

  const currentStatus = statuses.find((status) => status.id === task.status) ?? statuses[0];
  const CurrentIcon = currentStatus.icon;

  return (
    <article className="rounded-md border border-outlineVariant bg-surface p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full border border-outlineVariant bg-surfaceVariant px-2.5 py-1 text-[11px] font-black ${currentStatus.tone}`}>
              <CurrentIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {currentStatus.label}
            </span>
            <span className="rounded-full border border-outlineVariant bg-surfaceVariant px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/46">
              {task.lane}
            </span>
            <span className="rounded-full border border-outlineVariant bg-surfaceVariant px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/46">
              {task.due_at || "no due date"}
            </span>
            {Number(task.revenue_impact) === 1 && (
              <span className="rounded-full border border-signal/30 bg-signal/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-signal">
                revenue
              </span>
            )}
          </div>
          <h3 className="mt-3 text-base font-black leading-6 text-paper">{task.title}</h3>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-paper/38">
            {task.project_id || "horizon"} / {task.priority}
          </p>
        </div>

        <div className="grid grid-cols-4 gap-1 self-start">
          {statuses.map((status) => {
            const Icon = status.icon;
            return (
              <button
                key={status.id}
                type="button"
                onClick={() => onPatch(task.id, { status: status.id })}
                className={`grid h-9 w-9 place-items-center rounded-md border transition ${
                  task.status === status.id ? "border-primary bg-primaryContainer text-primary" : "border-outlineVariant bg-surfaceVariant text-paper/42 hover:text-paper"
                }`}
                aria-label={`Mark task ${status.label}`}
                title={status.label}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>

      <label className="mt-3 block">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/38">Evidence / control note</span>
        <textarea
          value={evidence}
          onChange={(event) => setEvidence(event.target.value)}
          onBlur={() => {
            if (evidence !== (task.evidence ?? "")) onPatch(task.id, { evidence });
          }}
          className="mt-2 min-h-16 w-full resize-none rounded-md border border-outlineVariant bg-surfaceContainer px-3 py-2 text-sm leading-6 text-paper/72 outline-none focus:border-primary"
        />
      </label>

      {task.status === "blocked" && (
        <div className="mt-3 flex gap-2 rounded-md border border-coral/25 bg-coral/10 p-3 text-sm leading-6 text-paper/64">
          <TimerReset className="mt-1 h-4 w-4 shrink-0 text-coral" aria-hidden="true" />
          Blocked means name the missing input, move it to the next review, or cut the task. No silent limbo.
        </div>
      )}
    </article>
  );
}

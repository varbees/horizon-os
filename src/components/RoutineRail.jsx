import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Rocket, Sparkles } from "lucide-react";
import { createCommandTask } from "../lib/commandBase.js";
import {
  currentBlockId,
  jobPlanDayNumber,
  jobPlanPhase,
  routineBlocksFor,
  routineKindColor,
} from "../data/routine.js";

function istDateKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

function loadDone(dateKey) {
  try {
    const raw = localStorage.getItem(`horizon-routine-${dateKey}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function RoutineRail() {
  const [now, setNow] = useState(() => new Date());
  const dateKey = istDateKey(now);
  const [done, setDone] = useState(() => loadDone(istDateKey()));
  const [deployStatus, setDeployStatus] = useState("");
  const [brief, setBrief] = useState(null);
  const [briefState, setBriefState] = useState("idle");

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setDone(loadDone(dateKey));
  }, [dateKey]);

  const dayNumber = jobPlanDayNumber(now);
  const phase = jobPlanPhase(dayNumber);
  const blocks = useMemo(() => routineBlocksFor(dayNumber), [dayNumber]);
  const activeId = currentBlockId(blocks, now);
  const doneCount = blocks.filter((block) => done[block.id]).length;

  const toggle = useCallback(
    (id) => {
      setDone((prev) => {
        const next = { ...prev, [id]: !prev[id] };
        try {
          localStorage.setItem(`horizon-routine-${dateKey}`, JSON.stringify(next));
        } catch {
          // localStorage full/unavailable — in-memory state still works for the session
        }
        return next;
      });
    },
    [dateKey],
  );

  const deployBlock = useCallback(
    async (block) => {
      setDeployStatus(`deploying ${block.id}…`);
      try {
        await createCommandTask({
          node_id: "job-engine",
          title: `Day ${dayNumber} · ${block.start} ${block.title}`,
          priority: block.kind === "practice" ? "high" : "normal",
          revenue_impact: block.kind === "revenue" || block.kind === "apply" ? 1 : 0,
        });
        setDeployStatus(`deployed: ${block.title}`);
      } catch {
        setDeployStatus("API offline — task not saved");
      }
    },
    [dayNumber],
  );

  const requestBrief = useCallback(async () => {
    setBriefState("loading");
    try {
      const response = await fetch("/api/routine/brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          day: dayNumber,
          phase: phase.label,
          date: dateKey,
          blocks: blocks.map((block) => ({ ...block, done: Boolean(done[block.id]) })),
        }),
      });
      if (!response.ok) throw new Error(`brief failed: ${response.status}`);
      const data = await response.json();
      setBrief(data);
      setBriefState("done");
    } catch {
      setBriefState("error");
    }
  }, [dayNumber, phase.label, dateKey, blocks, done]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="rounded-lg border border-outlineVariant bg-surface p-3 shadow-rule">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass">Job plan · today</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper/44">{dateKey}</p>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <h3 className="font-display text-xl font-bold text-paper">Day {dayNumber}</h3>
          <p className="text-xs font-bold text-paper/56">
            {doneCount}/{blocks.length} blocks
          </p>
        </div>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-primary">{phase.label}</p>
        <button
          type="button"
          onClick={requestBrief}
          disabled={briefState === "loading"}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-primary/25 bg-primaryContainer px-3 py-2 text-xs font-black text-onPrimaryContainer transition hover:border-primary/50 disabled:opacity-60"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {briefState === "loading" ? "DeepSeek is thinking…" : "Daily brief (DeepSeek)"}
        </button>
        {briefState === "error" ? (
          <p className="mt-2 text-[11px] font-bold text-rust">Brief unavailable — API offline or provider error.</p>
        ) : null}
        {brief?.text ? (
          <div className="mt-2 max-h-44 overflow-y-auto rounded-md border border-outlineVariant bg-surfaceVariant p-2.5 text-xs leading-5 text-paper/78 whitespace-pre-wrap">
            {brief.text}
            {brief.provider ? (
              <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-paper/40">
                {brief.provider} · {brief.model}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-outlineVariant bg-surface shadow-rule">
        <ul className="divide-y divide-outlineVariant/70">
          {blocks.map((block) => {
            const isActive = block.id === activeId;
            const isDone = Boolean(done[block.id]);
            return (
              <li
                key={block.id}
                className={`px-3 py-2.5 transition-colors ${isActive ? "bg-secondaryContainer/60" : ""}`}
              >
                <div className="flex items-start gap-2.5">
                  <button
                    type="button"
                    onClick={() => toggle(block.id)}
                    className="mt-0.5 shrink-0 text-paper/40 transition hover:text-signal"
                    aria-label={isDone ? `Mark ${block.title} not done` : `Mark ${block.title} done`}
                  >
                    {isDone ? <CheckCircle2 className="h-5 w-5 text-signal" /> : <Circle className="h-5 w-5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: routineKindColor[block.kind] }}
                        aria-hidden="true"
                      />
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper/48">
                        {block.start}–{block.end}
                        {isActive ? <span className="ml-2 font-black text-signal">now</span> : null}
                      </p>
                    </div>
                    <p className={`mt-0.5 text-[13px] font-bold leading-5 ${isDone ? "text-paper/38 line-through" : "text-paper"}`}>
                      {block.title}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-4 text-paper/52">{block.detail}</p>
                  </div>
                  {block.deployable ? (
                    <button
                      type="button"
                      onClick={() => deployBlock(block)}
                      className="mt-0.5 shrink-0 rounded-md border border-outlineVariant p-1.5 text-paper/44 transition hover:border-outline hover:text-primary"
                      aria-label={`Deploy ${block.title} as a task`}
                      title="Deploy as task"
                    >
                      <Rocket className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {deployStatus ? (
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper/48">{deployStatus}</p>
      ) : null}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Target, CheckCircle2, Circle, Flame, BookOpen, AlertTriangle } from "lucide-react";
import Panel from "./Panel.jsx";
import { SkeletonText } from "./ui/Skeleton.jsx";
import { fetchJobPlan, patchJobPlanState } from "../lib/jobPlanApi.js";

// "Today" from the AI Job Plan — which day of the 30-day curriculum, today's
// focus + build, the daily non-negotiable, and a check-off clock that persists.
// Answers "what exactly should I work on right now."

export default function JobPlanToday() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");

  async function load() {
    setError("");
    try {
      setPlan(await fetchJobPlan());
    } catch (e) {
      setError(e.message);
      setPlan({ available: false });
    }
  }
  useEffect(() => { load(); }, []);

  async function toggle(key) {
    if (!plan?.available) return;
    const current = !!plan.state?.[key];
    setSaving(key);
    // optimistic
    setPlan((p) => ({ ...p, state: { ...p.state, [key]: !current } }));
    try {
      const next = await patchJobPlanState(plan.currentDay, { [key]: !current });
      setPlan(next);
    } catch {
      setPlan((p) => ({ ...p, state: { ...p.state, [key]: current } })); // revert
    } finally {
      setSaving("");
    }
  }

  if (plan === null) {
    return <Panel className="p-5"><SkeletonText lines={5} /></Panel>;
  }

  if (!plan.available) {
    return (
      <Panel className="p-5">
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-brass"><Target className="h-4 w-4" /> AI job plan</p>
        <p className="mt-2 text-sm text-paper/60">
          {error ? "Start the API (npm run dev:full) to load your plan." : "No plan found — expected at _cofounder/AI-JOB-PLAN-2026.md."}
        </p>
      </Panel>
    );
  }

  const done = plan.clock.filter((c) => c.key && plan.state?.[c.key]).length;
  const totalKeys = plan.clock.filter((c) => c.key).length;

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-brass"><Target className="h-4 w-4" /> AI job plan · today</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-paper">Day {plan.currentDay} of {plan.totalDays}</h2>
          <p className="mt-0.5 text-xs font-bold uppercase tracking-[0.1em] text-paper/50">{plan.phase}{plan.beyond ? ` · +${plan.beyond}d past plan` : ""}</p>
        </div>
        <div className="flex items-center gap-3">
          {plan.streak > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-rust/30 bg-rust/8 px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-[0.12em] text-rust"><Flame className="h-3.5 w-3.5" /> {plan.streak}d streak</span>
          ) : null}
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-paper/44">{done}/{totalKeys} today</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-outlineVariant bg-surfaceVariant p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-paper/44">Focus</p>
          <p className="mt-1 text-sm font-bold leading-6 text-paper">{plan.today.focus || "—"}</p>
        </div>
        <div className="rounded-md border border-primary/25 bg-primary/[0.06] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary">Build / ship today</p>
          <p className="mt-1 text-sm font-bold leading-6 text-paper">{plan.today.build || "—"}</p>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-md border border-brass/30 bg-brass/8 p-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brass" aria-hidden="true" />
        <p className="text-xs font-bold leading-5 text-paper/76"><span className="text-brass">Non-negotiable:</span> {plan.nonNegotiable}</p>
      </div>

      <div className="mt-4">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/44">Daily clock — check off as you go</p>
        <div className="grid gap-1">
          {plan.clock.map((c, i) => {
            const checkable = !!c.key;
            const checked = checkable && !!plan.state?.[c.key];
            return (
              <button
                key={i}
                type="button"
                disabled={!checkable || saving === c.key}
                onClick={() => checkable && toggle(c.key)}
                className={`flex items-center gap-3 rounded-md px-2.5 py-2 text-left transition ${
                  checkable ? "hover:bg-surfaceContainer" : "opacity-60"
                }`}
              >
                {checkable ? (
                  checked ? <CheckCircle2 className="h-4 w-4 shrink-0 text-signal" /> : <Circle className="h-4 w-4 shrink-0 text-paper/30" />
                ) : (
                  <span className="h-4 w-4 shrink-0" />
                )}
                <span className="shrink-0 font-mono text-[11px] text-paper/44">{c.time}</span>
                <span className={`min-w-0 flex-1 truncate text-sm ${checked ? "text-paper/45 line-through" : "font-bold text-paper/78"}`}>{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button type="button" onClick={() => navigate("/documents")} className="mt-4 inline-flex items-center gap-1.5 text-sm font-black text-primary hover:underline">
        <BookOpen className="h-4 w-4" /> Open the full plan
      </button>
    </Panel>
  );
}

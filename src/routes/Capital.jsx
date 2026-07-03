import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Circle,
  Gauge,
  IndianRupee,
  Lightbulb,
  Plus,
  Repeat,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import Panel from "../components/Panel.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import AgentDeployer from "../components/AgentDeployer.jsx";
import { useUiStore } from "../store/uiStore.js";
import {
  addLedgerEntry,
  fetchCapital,
  updateCapitalTarget,
  updatePipelineStage,
  updateRunway,
} from "../lib/capitalApi.js";
import { computeCapitalMath } from "../lib/capitalMath.js";
import {
  capitalTargets,
  cashLedgerSeed,
  offerPipelineSeed,
  runwayStateSeed,
  weeklyEngineTargets,
} from "../data/horizon.js";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const compactInr = (value) => (value >= 100000 ? `₹${(value / 100000).toFixed(2)}L` : inr.format(value));

const STAGES = [
  { id: "prospect", label: "Prospect" },
  { id: "conversation", label: "Conversation" },
  { id: "proposal", label: "Proposal" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
];

const seedState = {
  targets: capitalTargets.map((t) => ({
    id: t.id,
    label: t.label,
    target_inr: t.targetInr,
    saved_inr: t.savedInr,
    deadline: t.deadline,
    purpose: t.purpose,
    next_action: t.next,
  })),
  ledger: cashLedgerSeed.map((r) => ({
    id: r.id,
    date: r.date,
    direction: r.direction,
    amount_inr: r.amountInr,
    category: r.category,
    note: r.note,
  })),
  pipeline: offerPipelineSeed.map((p) => ({
    id: p.id,
    buyer: p.buyer,
    offer: p.offer,
    stage: p.stage,
    value_inr: p.valueInr,
    recurring: p.recurring,
    next_action: p.next,
  })),
  runway: {
    id: "current",
    current_cash_inr: runwayStateSeed.currentCashInr,
    monthly_burn_inr: runwayStateSeed.monthlyBurnInr,
    mrr_inr: runwayStateSeed.mrrInr,
    weekly_outbound_target: runwayStateSeed.weeklyOutboundTarget,
    weekly_conversation_target: runwayStateSeed.weeklyConversationTarget,
    weekly_offer_target: runwayStateSeed.weeklyOfferTarget,
    milestone_date: runwayStateSeed.milestoneDate,
  },
};

function runwayLabel(months) {
  if (months === null) return "set burn";
  if (months === Infinity) return "MRR covers burn";
  return `${months.toFixed(1)} mo`;
}

function pipelineToEntity(p) {
  return {
    type: "pipeline deal",
    id: p.id,
    title: p.buyer,
    subtitle: p.offer,
    project_id: "",
    body: [p.offer, p.next_action ? `**Next action:** ${p.next_action}` : ""].filter(Boolean).join("\n\n"),
    tags: [p.stage, Number(p.recurring) > 0 ? "recurring" : "one-time"].filter(Boolean),
    meta: [
      { label: "Value", value: compactInr(Number(p.value_inr)) },
      { label: "Stage", value: p.stage },
    ],
    impact: "revenue",
    suggestedActions: ["outreach"],
  };
}

// The financial-analyst read: what a CFO would actually say about these numbers.
function financialRead(math) {
  const points = [];
  let tone = "signal";
  let headline = "On the line for February 2027.";

  if (math.needsBurn) {
    tone = "brass";
    headline = "Set your burn — runway is still a guess.";
    points.push("Enter monthly burn below so runway months become real, not assumed.");
  } else if (math.runwayMonthsNet !== Infinity && math.runwayMonthsNet < 3) {
    tone = "rust";
    headline = `Runway under 3 months (${math.runwayMonthsNet.toFixed(1)} mo). Sign income now.`;
    points.push("This is the number that ends the plan. Prioritise the nearest-to-cash pipeline deal today.");
  } else if (math.runwayMonthsNet !== Infinity && math.runwayMonthsNet < 6) {
    tone = "brass";
    headline = `${math.runwayMonthsNet.toFixed(1)} months of runway — comfortable, not safe.`;
  } else if (math.runwayMonthsNet === Infinity) {
    headline = "MRR covers burn — every signed rupee now compounds toward the target.";
  }

  const shortfall = Math.round(math.requiredWeekly - math.weekIn);
  if (shortfall > 0) {
    if (tone === "signal") tone = "brass";
    points.push(`Behind this week by ${compactInr(shortfall)}. That is the gap between logged income and the ${compactInr(Math.round(math.requiredWeekly))}/wk pace.`);
  } else if (math.requiredWeekly > 0) {
    points.push(`This week's income already clears the ${compactInr(Math.round(math.requiredWeekly))}/wk pace. Bank it and push the next deal.`);
  }

  if (math.pipelineWeighted < math.gap) {
    points.push(`Weighted pipeline (${compactInr(Math.round(math.pipelineWeighted))}) is below the gap (${compactInr(math.gap)}). Add or advance offers to cover it.`);
  }

  return { tone, headline, points };
}

const READ_TONE = {
  signal: { border: "border-signal/40", bg: "bg-signal/8", text: "text-signal", chip: "on track" },
  brass: { border: "border-brass/40", bg: "bg-brass/10", text: "text-brass", chip: "watch" },
  rust: { border: "border-rust/45", bg: "bg-rust/10", text: "text-rust", chip: "act now" },
};

export default function Capital() {
  const [data, setData] = useState(seedState);
  const [source, setSource] = useState("seed");
  const openInspector = useUiStore((s) => s.openInspector);
  const [onboardDismissed, setOnboardDismissed] = useState(() => {
    try { return localStorage.getItem("horizon.capital.onboardDone") === "1"; } catch { return false; }
  });

  useEffect(() => {
    let active = true;
    fetchCapital()
      .then((live) => {
        if (!active || !live?.runway) return;
        setData({
          targets: live.targets ?? [],
          ledger: live.ledger ?? [],
          pipeline: live.pipeline ?? [],
          runway: live.runway,
        });
        setSource("live");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const math = useMemo(() => computeCapitalMath(data), [data]);
  const read = useMemo(() => financialRead(math), [math]);
  const onboardSteps = useMemo(
    () => [
      { id: "burn", label: "Set your monthly burn", done: math.burn > 0 },
      { id: "cash", label: "Enter current cash", done: math.cash > 0 },
      { id: "income", label: "Log your first income", done: data.ledger.some((r) => r.direction === "in" && Number(r.amount_inr) > 0) },
      { id: "pipeline", label: "Add a buyer to the pipeline", done: data.pipeline.length > 0 },
      { id: "target", label: "Fund a February 2027 target", done: data.targets.some((t) => Number(t.saved_inr) > 0) },
    ],
    [math, data],
  );
  const onboardComplete = onboardSteps.every((s) => s.done);

  function dismissOnboard() {
    setOnboardDismissed(true);
    try { localStorage.setItem("horizon.capital.onboardDone", "1"); } catch { /* ignore */ }
  }

  function patchRunway(field, value) {
    setData((prev) => ({ ...prev, runway: { ...prev.runway, [field]: value } }));
    if (source === "live") updateRunway({ [field]: value }).catch(() => {});
  }

  function patchTargetSaved(id, value) {
    setData((prev) => ({
      ...prev,
      targets: prev.targets.map((t) => (t.id === id ? { ...t, saved_inr: value } : t)),
    }));
    if (source === "live") updateCapitalTarget(id, { saved_inr: value }).catch(() => {});
  }

  function patchStage(id, stage) {
    setData((prev) => ({
      ...prev,
      pipeline: prev.pipeline.map((p) => (p.id === id ? { ...p, stage } : p)),
    }));
    if (source === "live") updatePipelineStage(id, { stage }).catch(() => {});
  }

  function addEntry(entry) {
    const local = { id: `local-${Date.now()}`, ...entry };
    setData((prev) => ({ ...prev, ledger: [local, ...prev.ledger] }));
    if (source === "live") addLedgerEntry(entry).catch(() => {});
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Capital & Runway OS v0.5"
        title="Turn the February 2027 target into weekly math."
        copy="The first operating number is not a SaaS dream. It is signed service income. This screen tracks the gap, the runway, the offer pipeline, and the exact amount that must be earned this week and this month."
      />

      {!onboardComplete && !onboardDismissed ? (
        <OnboardingChecklist steps={onboardSteps} source={source} onDismiss={dismissOnboard} />
      ) : null}

      <AdvisoryCard read={read} math={math} />

      <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Banknote} tone="text-signal" label="Current cash" value={compactInr(math.cash)} sub={`MRR ${compactInr(math.mrr)} / mo`} />
        <Metric icon={Gauge} tone="text-rust" label="Net runway" value={runwayLabel(math.runwayMonthsNet)} sub={`burn ${compactInr(math.burn)} / mo`} />
        <Metric icon={Target} tone="text-primary" label="Gap to Feb 2027" value={compactInr(math.gap)} sub={`${math.progressPct}% of ${compactInr(math.totalTarget)} logged`} />
        <Metric icon={TrendingUp} tone="text-brass" label="Open pipeline" value={compactInr(math.pipelineOpen)} sub={`weighted ${compactInr(Math.round(math.pipelineWeighted))}`} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Weekly math</p>
              <h2 className="mt-2 font-display text-2xl font-bold">What must be earned</h2>
            </div>
            <CalendarClock className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MathTile label="Required / month" value={compactInr(Math.round(math.requiredMonthly))} hint={`over ${math.monthsRemaining.toFixed(1)} months left`} />
            <MathTile label="Required / week" value={compactInr(Math.round(math.requiredWeekly))} hint="signed income, not hours" />
            <MathTile label="Cash in (this week)" value={compactInr(math.weekIn)} hint={`out ${compactInr(math.weekOut)}`} tone="text-signal" />
            <MathTile label="Net this week" value={compactInr(math.weekNet)} hint={`lifetime net ${compactInr(math.totalIn - math.totalOut)}`} tone={math.weekNet >= 0 ? "text-signal" : "text-rust"} />
          </div>

          <div className="mt-5 border-t border-outlineVariant pt-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/46">Runway knobs (editable)</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <KnobInput label="Current cash" value={math.cash} onCommit={(v) => patchRunway("current_cash_inr", v)} />
              <KnobInput label="Monthly burn" value={math.burn} onCommit={(v) => patchRunway("monthly_burn_inr", v)} />
              <KnobInput label="MRR" value={math.mrr} onCommit={(v) => patchRunway("mrr_inr", v)} />
            </div>
          </div>

          <div className="mt-5 border-t border-outlineVariant pt-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/46">Income-engine cadence</p>
            <div className="mt-3 space-y-2">
              {weeklyEngineTargets.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 rounded-md border border-outlineVariant bg-surfaceVariant px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-paper">{t.label}</p>
                    <p className="truncate text-xs text-paper/52">{t.note}</p>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-black text-signal">{t.target} {t.unit}/wk</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Capital targets</p>
              <h2 className="mt-2 font-display text-2xl font-bold">February 2027 milestones</h2>
            </div>
            <IndianRupee className="h-7 w-7 text-signal" aria-hidden="true" />
          </div>
          <div className="mt-5 space-y-3">
            {data.targets.map((t) => {
              const target = Number(t.target_inr);
              const saved = Number(t.saved_inr);
              const pct = target > 0 ? Math.round((saved / target) * 100) : 0;
              return (
                <article key={t.id} className="rounded-md border border-outlineVariant bg-surfaceVariant p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-black text-paper">{t.label}</h3>
                      <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.2em] text-paper/42">{t.deadline}</p>
                    </div>
                    <p className="font-mono text-sm font-black text-signal">{compactInr(target)}</p>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-paper/46">Saved</span>
                    <KnobInput compact value={saved} onCommit={(v) => patchTargetSaved(t.id, v)} />
                    <span className="font-mono text-[11px] text-paper/46">{pct}%</span>
                  </div>
                </article>
              );
            })}
          </div>
        </Panel>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Offer pipeline</p>
              <h2 className="mt-2 font-display text-2xl font-bold">Service income funnel</h2>
            </div>
            <TrendingUp className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-5 space-y-3">
            {data.pipeline.map((p) => (
              <article
                key={p.id}
                onClick={() => openInspector(pipelineToEntity(p))}
                className="group cursor-pointer rounded-md border border-outlineVariant bg-surfaceVariant p-4 transition hover:border-primary/40 hover:bg-surface"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-paper group-hover:text-primary">{p.buyer}</h3>
                    <p className="text-sm leading-5 text-paper/60">{p.offer}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {Number(p.recurring) > 0 ? <Repeat className="h-4 w-4 text-brass" aria-hidden="true" title="recurring" /> : null}
                    <span className="font-mono text-sm font-black text-signal">{compactInr(Number(p.value_inr))}</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {STAGES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); patchStage(p.id, s.id); }}
                      className={[
                        "rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.14em] transition",
                        p.stage === s.id
                          ? "border-primary bg-primary text-onPrimary"
                          : "border-outlineVariant bg-white/60 text-paper/50 hover:text-paper",
                      ].join(" ")}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                {p.next_action ? <p className="mt-3 text-sm font-bold leading-6 text-paper/72">{p.next_action}</p> : null}
                <div className="mt-3 flex justify-end border-t border-outlineVariant/70 pt-3">
                  <AgentDeployer entity={pipelineToEntity(p)} variant="compact" defaultAgent="deepseek" defaultAction="outreach" />
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Cash ledger</p>
              <h2 className="mt-2 font-display text-2xl font-bold">Money in / out</h2>
            </div>
            <Banknote className="h-7 w-7 text-signal" aria-hidden="true" />
          </div>
          <LedgerForm onAdd={addEntry} />
          <div className="mt-4 space-y-2">
            {data.ledger.slice(0, 8).map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 rounded-md border border-outlineVariant bg-surfaceVariant px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  {row.direction === "in" ? (
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-signal" aria-hidden="true" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 shrink-0 text-rust" aria-hidden="true" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-paper">{row.note || row.category}</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper/42">{row.date} / {row.category}</p>
                  </div>
                </div>
                <span className={`shrink-0 font-mono text-sm font-black ${row.direction === "in" ? "text-signal" : "text-rust"}`}>
                  {row.direction === "in" ? "+" : "-"}{compactInr(Number(row.amount_inr))}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function AdvisoryCard({ read, math }) {
  const t = READ_TONE[read.tone] ?? READ_TONE.signal;
  return (
    <div className={`mt-4 rounded-[var(--hz-radius-md)] border ${t.border} ${t.bg} p-5`}>
      <div className="flex items-start gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[var(--hz-radius-sm)] border ${t.border} bg-surface`}>
          <Lightbulb className={`h-5 w-5 ${t.text}`} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/46">Analyst read</p>
            <span className={`rounded-full border ${t.border} px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.14em] ${t.text}`}>{t.chip}</span>
          </div>
          <h3 className="mt-1 font-display text-lg font-bold leading-snug text-paper">{read.headline}</h3>
          {read.points.length ? (
            <ul className="mt-2 space-y-1.5">
              {read.points.map((p, i) => (
                <li key={i} className="flex gap-2 text-sm leading-6 text-paper/72">
                  <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${t.text.replace("text-", "bg-")}`} />
                  <span className="min-w-0">{p}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/40">
            {math.monthsRemaining.toFixed(1)} months to Feb 2027 · {compactInr(math.gap)} gap · {math.progressPct}% funded
          </p>
        </div>
      </div>
    </div>
  );
}

function OnboardingChecklist({ steps, source, onDismiss }) {
  const done = steps.filter((s) => s.done).length;
  const pct = Math.round((done / steps.length) * 100);
  return (
    <div className="mb-4 rounded-[var(--hz-radius-md)] border border-primary/30 bg-primaryContainer/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass">Set up your money base</p>
          <h3 className="mt-1 font-display text-lg font-bold text-paper">{done}/{steps.length} — get Capital reading the truth</h3>
        </div>
        <button type="button" onClick={onDismiss} className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-outlineVariant text-paper/50 hover:text-paper" aria-label="Dismiss setup">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {steps.map((s) => (
          <div key={s.id} className="flex items-center gap-2 text-sm">
            {s.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-signal" aria-hidden="true" /> : <Circle className="h-4 w-4 shrink-0 text-paper/30" aria-hidden="true" />}
            <span className={s.done ? "text-paper/50 line-through" : "font-bold text-paper/78"}>{s.label}</span>
          </div>
        ))}
      </div>
      {source === "seed" ? (
        <p className="mt-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-paper/44">
          <AlertTriangle className="h-3 w-3" /> Showing seed data — run npm run dev:full to persist your real numbers.
        </p>
      ) : null}
    </div>
  );
}

function Metric({ icon: Icon, tone, label, value, sub }) {
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

function MathTile({ label, value, hint, tone = "text-paper" }) {
  return (
    <div className="rounded-md border border-outlineVariant bg-surfaceVariant p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/46">{label}</p>
      <p className={`mt-1 text-xl font-black ${tone}`}>{value}</p>
      <p className="truncate text-xs text-paper/52">{hint}</p>
    </div>
  );
}

function KnobInput({ value, onCommit, compact = false, label }) {
  const [draft, setDraft] = useState(String(value ?? 0));
  useEffect(() => {
    setDraft(String(value ?? 0));
  }, [value]);
  const commit = () => {
    const n = Math.max(0, Math.round(Number(draft) || 0));
    onCommit(n);
  };
  return (
    <label className={compact ? "inline-flex items-center" : "block"}>
      {label ? <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-paper/46">{label}</span> : null}
      <span className="inline-flex items-center gap-1 rounded-md border border-outlineVariant bg-white/70 px-2 py-1">
        <span className="font-mono text-xs text-paper/46">₹</span>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className={`bg-transparent font-mono text-sm font-black text-paper outline-none ${compact ? "w-24" : "w-full"}`}
        />
      </span>
    </label>
  );
}

function LedgerForm({ onAdd }) {
  const today = new Date().toISOString().slice(0, 10);
  const [direction, setDirection] = useState("in");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  function submit(e) {
    e.preventDefault();
    const amt = Math.max(0, Math.round(Number(amount) || 0));
    if (amt <= 0) return;
    onAdd({ date: today, direction, amount_inr: amt, category: direction === "in" ? "income" : "expense", note: note.trim() });
    setAmount("");
    setNote("");
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-md border border-outlineVariant bg-surfaceVariant p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-md border border-outlineVariant">
          {["in", "out"].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDirection(d)}
              className={[
                "px-3 py-1.5 font-mono text-[11px] font-black uppercase tracking-[0.14em] transition",
                direction === d ? (d === "in" ? "bg-signal text-onPrimary" : "bg-rust text-onPrimary") : "bg-white/60 text-paper/52",
              ].join(" ")}
            >
              {d === "in" ? "In" : "Out"}
            </button>
          ))}
        </div>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-28 rounded-md border border-outlineVariant bg-white/70 px-2 py-1.5 font-mono text-sm font-black text-paper outline-none"
        />
        <input
          type="text"
          placeholder="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-outlineVariant bg-white/70 px-2 py-1.5 text-sm text-paper outline-none"
        />
        <button type="submit" className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-black text-onPrimary">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Log
        </button>
      </div>
    </form>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, Banknote, ShieldCheck, WifiOff, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { anchors, phaseGates, projects } from "../data/horizon.js";
import ActionBoard from "../components/ActionBoard.jsx";
import JobPlanToday from "../components/JobPlanToday.jsx";
import MetricCard from "../components/MetricCard.jsx";
import Panel from "../components/Panel.jsx";
import PrimaryButton from "../components/PrimaryButton.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import { useHorizonStore } from "../store/horizonStore.js";
import { fetchCapital, updateRunway } from "../lib/capitalApi.js";
import { computeCapitalMath } from "../lib/capitalMath.js";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const compactInr = (v) => (Number(v) >= 100000 ? `₹${(Number(v) / 100000).toFixed(2)}L` : inr.format(Number(v) || 0));
const MRR_TARGET_INR = 250000; // income_plan ~$3k/mo offgrid floor

export default function Overview() {
  const { metrics, updateMetric } = useHorizonStore();
  // Canonical finance comes from the same runway_state Capital uses (single source of truth).
  const [capital, setCapital] = useState(null);
  const [source, setSource] = useState("loading");
  const buildNow = projects.filter((project) => project.now);

  useEffect(() => {
    let active = true;
    fetchCapital()
      .then((data) => {
        if (!active || !data?.runway) return;
        setCapital(data);
        setSource("live");
      })
      .catch(() => setSource("offline"));
    return () => {
      active = false;
    };
  }, []);

  const math = useMemo(
    () => (capital ? computeCapitalMath(capital) : null),
    [capital],
  );

  function patchRunway(field, value) {
    const n = Math.max(0, Math.round(Number(value) || 0));
    setCapital((prev) => (prev ? { ...prev, runway: { ...prev.runway, [field]: n } } : prev));
    if (source === "live") updateRunway({ [field]: n }).catch(() => {});
  }

  const cash = math?.cash ?? 0;
  const mrr = math?.mrr ?? 0;
  const burn = math?.burn ?? 0;
  const totalTarget = math?.totalTarget ?? 0;
  const cashProgress = totalTarget > 0 ? (cash / totalTarget) * 100 : 0;
  const mrrProgress = (mrr / MRR_TARGET_INR) * 100;
  const outboundTarget = capital?.runway?.weekly_outbound_target ?? metrics.targetOutboundWeek;
  const outboundProgress = (metrics.outboundThisWeek / outboundTarget) * 100;
  const runwayMonths = burn > 0 ? Math.floor(cash / burn) : null;

  return (
    <div>
      <SectionHeader
        eyebrow="Private command deck"
        title="Build the floor, then build the haven."
        copy="This merges the 12-month inner plan, the income pathway, Antharmaya's foundry identity, and PhotoSelect's proof into a daily operating system. No vague inspiration, just executable structure."
        action={
          <Link to="/projects">
            <PrimaryButton>
              What to build now
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </PrimaryButton>
          </Link>
        }
      />

      {source === "offline" ? (
        <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-brass/40 bg-brass/10 px-3 py-1.5 text-sm font-bold text-paper/74">
          <WifiOff className="h-4 w-4 text-brass" aria-hidden="true" />
          Local API offline at 127.0.0.1:8787 — finance figures unavailable. Start npm run dev:full.
        </div>
      ) : null}

      <section className="mb-4" aria-label="AI job plan today">
        <JobPlanToday />
      </section>

      <section className="grid gap-4 md:grid-cols-3" aria-label="Core metrics">
        <MetricCard
          label="Runway capital"
          value={source === "loading" ? "…" : compactInr(cash)}
          progress={cashProgress}
          helper={
            source === "offline"
              ? "Connect the local API to read cash."
              : `${Math.round(cashProgress)}% of ${compactInr(totalTarget)} target.${runwayMonths != null ? ` ~${runwayMonths} mo at ${compactInr(burn)}/mo.` : " Set burn for runway."}`
          }
          accent="bg-signal"
        >
          <Banknote className="h-8 w-8 text-signal" aria-hidden="true" />
        </MetricCard>
        <MetricCard
          label="Recurring floor"
          value={source === "loading" ? "…" : compactInr(mrr)}
          progress={mrrProgress}
          helper={`${Math.round(mrrProgress)}% of ${compactInr(MRR_TARGET_INR)} offgrid living floor.`}
          accent="bg-brass"
        >
          <Zap className="h-8 w-8 text-brass" aria-hidden="true" />
        </MetricCard>
        <MetricCard
          label="Outbound this week"
          value={`${metrics.outboundThisWeek}/${outboundTarget}`}
          progress={outboundProgress}
          helper="Five specific messages per weekday. This is the anti-drift counter."
          accent="bg-rust"
        >
          <Activity className="h-8 w-8 text-rust" aria-hidden="true" />
        </MetricCard>
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
        <Panel className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Edit live inputs</p>
              <h2 className="mt-2 font-display text-3xl font-bold">Reality knobs</h2>
            </div>
            <ShieldCheck className="h-8 w-8 text-signal" aria-hidden="true" />
          </div>
          <p className="mt-2 text-sm text-paper/52">
            Cash, MRR, and burn write to the same record as <Link to="/capital" className="font-bold text-signal hover:underline">Capital</Link>. One source of truth, in INR.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <NumberField label="Cash (INR)" value={cash} disabled={source !== "live"} onCommit={(v) => patchRunway("current_cash_inr", v)} />
            <NumberField label="Monthly burn (INR)" value={burn} disabled={source !== "live"} onCommit={(v) => patchRunway("monthly_burn_inr", v)} />
            <NumberField label="MRR (INR)" value={mrr} disabled={source !== "live"} onCommit={(v) => patchRunway("mrr_inr", v)} />
            <NumberField label="Weekly outbound target" value={outboundTarget} disabled={source !== "live"} onCommit={(v) => patchRunway("weekly_outbound_target", v)} />
            <NumberField label="Outbound this week" value={metrics.outboundThisWeek} onCommit={(v) => updateMetric("outboundThisWeek", v)} />
            <NumberField label="Sit streak" value={metrics.sitStreak} onCommit={(v) => updateMetric("sitStreak", v)} />
          </div>
        </Panel>

        <Panel className="p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Build now</p>
          <h2 className="mt-2 font-display text-3xl font-bold">Active moves</h2>
          <div className="mt-5 space-y-3">
            {buildNow.map((project) => (
              <Link
                key={project.id}
                to="/projects"
                className="block rounded-md border border-outlineVariant bg-white/[0.035] p-4 transition hover:-translate-y-0.5 hover:border-outline hover:bg-white/[0.06]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/42">{project.horizon}</p>
                    <h3 className="mt-1 text-lg font-extrabold text-paper">{project.name}</h3>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 text-paper/50" aria-hidden="true" />
                </div>
                <p className="mt-2 text-sm leading-6 text-paper/62">{project.fit}</p>
              </Link>
            ))}
          </div>
        </Panel>
      </section>

      <ActionBoard />

      <section className="mt-5 grid gap-4 lg:grid-cols-4" aria-label="Four anchors">
        {anchors.map((anchor) => (
          <Panel key={anchor.id} className="p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">{anchor.label}</p>
            <h2 className="mt-2 text-xl font-black text-paper">{anchor.title}</h2>
            <p className="mt-3 text-sm leading-6 text-paper/64">{anchor.target}</p>
            <p className="mt-4 border-t border-outlineVariant pt-4 font-mono text-xs leading-5 text-paper/46">{anchor.measure}</p>
          </Panel>
        ))}
      </section>

      <section className="mt-5">
        <Panel className="p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Two-year horizon</p>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {phaseGates.map((phase) => (
              <div key={phase.label} className="rounded-md border border-outlineVariant bg-surfaceContainer p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/42">{phase.label}</p>
                <h3 className="mt-2 text-base font-black text-paper">{phase.title}</h3>
                <p className="mt-2 text-sm leading-6 text-paper/58">{phase.target}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function NumberField({ label, value, onCommit, disabled = false }) {
  const [draft, setDraft] = useState(String(value ?? 0));
  useEffect(() => {
    setDraft(String(value ?? 0));
  }, [value]);
  return (
    <label className={`block rounded-md border border-outlineVariant bg-surfaceVariant p-3 ${disabled ? "opacity-55" : ""}`}>
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/42">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => onCommit(draft)}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className="mt-2 w-full rounded-md border border-outlineVariant bg-surface px-3 py-2 text-base font-bold text-paper outline-none transition focus:border-primary disabled:cursor-not-allowed"
      />
    </label>
  );
}

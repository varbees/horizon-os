import { Activity, ArrowRight, DollarSign, ShieldCheck, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { anchors, phaseGates, projects } from "../data/horizon.js";
import ActionBoard from "../components/ActionBoard.jsx";
import MetricCard from "../components/MetricCard.jsx";
import Panel from "../components/Panel.jsx";
import PrimaryButton from "../components/PrimaryButton.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import { useHorizonStore } from "../store/horizonStore.js";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function Overview() {
  const { metrics, updateMetric } = useHorizonStore();
  const cashProgress = (metrics.cashAccumulated / metrics.targetCash) * 100;
  const mrrProgress = (metrics.currentMrr / metrics.targetMrr) * 100;
  const outboundProgress = (metrics.outboundThisWeek / metrics.targetOutboundWeek) * 100;
  const runway = Math.floor(metrics.cashAccumulated / metrics.runwayMonthlyBurn);
  const buildNow = projects.filter((project) => project.now);

  return (
    <div>
      <SectionHeader
        eyebrow="Private command deck"
        title="Build the floor, then build the haven."
        copy="This merges the 12-month inner plan, the income pathway, Antharmaya's foundry identity, and PhotoSelect's proof into a daily operating system. No family framing, no vague inspiration, just executable structure."
        action={
          <Link to="/projects">
            <PrimaryButton>
              What to build now
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </PrimaryButton>
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-3" aria-label="Core metrics">
        <MetricCard
          label="Runway capital"
          value={money.format(metrics.cashAccumulated)}
          progress={cashProgress}
          helper={`${Math.round(cashProgress)}% of ${money.format(metrics.targetCash)} target. Approx ${runway} months at ${money.format(metrics.runwayMonthlyBurn)}/month.`}
          accent="bg-signal"
        >
          <DollarSign className="h-8 w-8 text-signal" aria-hidden="true" />
        </MetricCard>
        <MetricCard
          label="Recurring floor"
          value={money.format(metrics.currentMrr)}
          progress={mrrProgress}
          helper={`${Math.round(mrrProgress)}% of ${money.format(metrics.targetMrr)} offgrid living floor.`}
          accent="bg-brass"
        >
          <Zap className="h-8 w-8 text-brass" aria-hidden="true" />
        </MetricCard>
        <MetricCard
          label="Outbound this week"
          value={`${metrics.outboundThisWeek}/${metrics.targetOutboundWeek}`}
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
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <NumberField label="Cash accumulated" value={metrics.cashAccumulated} onChange={(value) => updateMetric("cashAccumulated", value)} />
            <NumberField label="Target cash" value={metrics.targetCash} onChange={(value) => updateMetric("targetCash", value)} />
            <NumberField label="Current MRR" value={metrics.currentMrr} onChange={(value) => updateMetric("currentMrr", value)} />
            <NumberField label="Target MRR" value={metrics.targetMrr} onChange={(value) => updateMetric("targetMrr", value)} />
            <NumberField label="Outbound this week" value={metrics.outboundThisWeek} onChange={(value) => updateMetric("outboundThisWeek", value)} />
            <NumberField label="Sit streak" value={metrics.sitStreak} onChange={(value) => updateMetric("sitStreak", value)} />
          </div>
        </Panel>

        <Panel className="p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Build now</p>
          <h2 className="mt-2 font-display text-3xl font-bold">First two moves</h2>
          <div className="mt-5 space-y-3">
            {buildNow.map((project) => (
              <Link
                key={project.id}
                to={project.id === "hskg" ? "/hskg" : "/projects"}
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

function NumberField({ label, value, onChange }) {
  return (
    <label className="block rounded-md border border-outlineVariant bg-surfaceVariant p-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/42">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-md border border-outlineVariant bg-surface px-3 py-2 text-base font-bold text-paper outline-none transition focus:border-primary"
      />
    </label>
  );
}

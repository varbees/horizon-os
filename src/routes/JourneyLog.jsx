import {
  ArrowRight,
  BookOpen,
  CalendarCheck2,
  IndianRupee,
  MapPin,
  Route,
  Sparkles,
  Target,
} from "lucide-react";
import { Link } from "react-router-dom";
import Panel from "../components/Panel.jsx";
import PrimaryButton from "../components/PrimaryButton.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import {
  capitalTargets,
  journeyEntries,
  playbookPatterns,
  resourceInboxSeeds,
  versionRoadmap,
} from "../data/horizon.js";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const totalTarget = capitalTargets.reduce((sum, target) => sum + target.targetInr, 0);
const totalSaved = capitalTargets.reduce((sum, target) => sum + target.savedInr, 0);
const totalProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

export default function JourneyLog() {
  return (
    <div>
      <SectionHeader
        eyebrow="Journey ledger v0.4"
        title="Make the two-year climb visible."
        copy="A command log for places, body proof, build proof, capital targets, public artifacts, and the research patterns that should shape Antharmaya without hijacking it."
        action={
          <Link to="/documents">
            <PrimaryButton>
              Read log spec
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </PrimaryButton>
          </Link>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel className="overflow-hidden p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Capital milestone</p>
              <h2 className="mt-2 font-display text-3xl font-bold">February 2027 gap</h2>
              <p className="mt-3 text-sm leading-6 text-paper/62">
                The first hard target is the workstation, support fund, and expenses buffer. Current saved values start at zero until the first cash baseline is entered.
              </p>
            </div>
            <IndianRupee className="h-8 w-8 text-signal" aria-hidden="true" />
          </div>

          <div className="mt-5 rounded-[var(--hz-radius-sm)] border border-outlineVariant bg-secondaryContainer p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/46">Minimum target</p>
                <p className="mt-1 text-3xl font-black text-paper">{inr.format(totalTarget)}</p>
              </div>
              <p className="rounded-full border border-signal/30 bg-signal/12 px-3 py-1 font-mono text-[11px] font-black uppercase tracking-[0.18em] text-signal">
                {totalProgress}% logged
              </p>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/70">
              <div className="h-full rounded-full bg-signal" style={{ width: `${Math.min(totalProgress, 100)}%` }} />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {capitalTargets.map((target) => {
              const progress = target.targetInr > 0 ? Math.round((target.savedInr / target.targetInr) * 100) : 0;
              return (
                <article key={target.id} className="rounded-md border border-outlineVariant bg-surfaceVariant p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-paper">{target.label}</h3>
                      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-paper/42">{target.deadline}</p>
                    </div>
                    <p className="font-mono text-sm font-black text-signal">{inr.format(target.targetInr)}</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-paper/62">{target.purpose}</p>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(progress, 100)}%` }} />
                  </div>
                  <p className="mt-3 flex gap-2 text-sm font-bold leading-6 text-paper/74">
                    <Target className="mt-1 h-4 w-4 shrink-0 text-brass" aria-hidden="true" />
                    {target.next}
                  </p>
                </article>
              );
            })}
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Version ladder</p>
              <h2 className="mt-2 font-display text-3xl font-bold">Vertical slices only</h2>
            </div>
            <Route className="h-8 w-8 text-primary" aria-hidden="true" />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {versionRoadmap.map((item) => (
              <article key={item.version} className="rounded-md border border-outlineVariant bg-surfaceVariant p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-display text-2xl font-bold text-primary">{item.version}</p>
                  <span className="rounded-full border border-outlineVariant bg-white/60 px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-paper/48">
                    {item.status}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-black text-paper">{item.title}</h3>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-paper/42">{item.window}</p>
                <p className="mt-3 text-sm leading-6 text-paper/60">{item.output}</p>
              </article>
            ))}
          </div>
        </Panel>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Logbook</p>
              <h2 className="mt-2 font-display text-3xl font-bold">Evidence entries</h2>
            </div>
            <BookOpen className="h-8 w-8 text-rust" aria-hidden="true" />
          </div>

          <div className="mt-5 space-y-3">
            {journeyEntries.map((entry) => (
              <article key={entry.id} className="rounded-md border border-outlineVariant bg-surfaceVariant p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/42">{entry.date} / {entry.type}</p>
                    <h3 className="mt-1 text-xl font-black text-paper">{entry.title}</h3>
                  </div>
                  <span className="rounded-full border border-rust/30 bg-rust/10 px-3 py-1 text-xs font-black text-rust">{entry.anchor}</span>
                </div>

                {entry.coordinates ? (
                  <div className="mt-4 grid gap-3 rounded-md border border-outlineVariant bg-white/55 p-3 sm:grid-cols-4">
                    <Coordinate label="Latitude" value={entry.coordinates.latitude} />
                    <Coordinate label="Longitude" value={entry.coordinates.longitude} />
                    <Coordinate label="Altitude" value={`${entry.coordinates.altitudeMeters.toFixed(2)}m`} />
                    <Coordinate label="Accuracy" value={`${entry.coordinates.accuracyMeters}m`} />
                  </div>
                ) : null}

                <p className="mt-4 flex gap-2 text-sm leading-6 text-paper/62">
                  <MapPin className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {entry.evidence}
                </p>
                <p className="mt-3 text-sm font-bold leading-6 text-paper/78">{entry.lesson}</p>
                <p className="mt-3 flex gap-2 border-t border-outlineVariant pt-3 text-sm font-bold leading-6 text-signal">
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
                  {entry.next}
                </p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">External patterns</p>
              <h2 className="mt-2 font-display text-3xl font-bold">Research to action</h2>
            </div>
            <Sparkles className="h-8 w-8 text-brass" aria-hidden="true" />
          </div>

          <div className="mt-5 space-y-3">
            {playbookPatterns.map((pattern) => (
              <article key={pattern.id} className="rounded-md border border-outlineVariant bg-surfaceVariant p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/42">{pattern.source}</p>
                <h3 className="mt-2 text-lg font-black text-paper">{pattern.title}</h3>
                <p className="mt-2 text-sm leading-6 text-paper/58">{pattern.pattern}</p>
                <p className="mt-3 border-t border-outlineVariant pt-3 text-sm font-bold leading-6 text-signal">{pattern.horizonUse}</p>
              </article>
            ))}
          </div>
        </Panel>
      </section>

      <section className="mt-5">
        <Panel className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Resource inbox seeds</p>
              <h2 className="mt-2 font-display text-3xl font-bold">Useful assets, parked with intent</h2>
            </div>
            <CalendarCheck2 className="h-8 w-8 text-signal" aria-hidden="true" />
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {resourceInboxSeeds.map((resource) => (
              <article key={resource.id} className="rounded-md border border-outlineVariant bg-surfaceVariant p-4">
                <h3 className="text-lg font-black text-paper">{resource.title}</h3>
                <p className="mt-2 break-words font-mono text-xs leading-5 text-paper/44">{resource.source}</p>
                <p className="mt-3 text-sm leading-6 text-paper/60">{resource.use}</p>
              </article>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function Coordinate({ label, value }) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-paper/40">{label}</p>
      <p className="mt-1 text-sm font-black text-paper">{value}</p>
    </div>
  );
}

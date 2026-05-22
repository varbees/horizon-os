import { ArrowRight, CheckCircle2, Filter, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import Panel from "../components/Panel.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import { orchestrationRules, portfolioLanes, portfolioProjects, weeklyOperatingSystem } from "../data/portfolio.js";

export default function Projects() {
  const [activeLane, setActiveLane] = useState("All");
  const [selectedId, setSelectedId] = useState("photoselect");

  const selectedProject = portfolioProjects.find((project) => project.id === selectedId) ?? portfolioProjects[0];
  const filteredProjects = useMemo(
    () => (activeLane === "All" ? portfolioProjects : portfolioProjects.filter((project) => project.lane === activeLane)),
    [activeLane],
  );
  const focusProjects = portfolioProjects.filter((project) => project.lane === "Focus Now");
  const resurrectProjects = portfolioProjects.filter((project) => project.lane === "Resurrect");

  return (
    <div>
      <SectionHeader
        eyebrow="Portfolio command center"
        title="One hub for every project, not another project."
        copy="This is the orchestration layer over ~/Desktop/bolting. It ranks what earns focus, what can be resurrected, what should be mined for parts, and what must stay archived so the work does not fragment."
      />

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Current command</p>
              <h2 className="mt-2 font-display text-3xl font-bold">Do these first</h2>
            </div>
            <span className="rounded-full border border-signal/40 bg-signal/12 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-signal">
              Max WIP: 2
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {focusProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => setSelectedId(project.id)}
                className="rounded-lg border border-outlineVariant bg-white/[0.04] p-4 text-left transition hover:-translate-y-0.5 hover:border-signal/50 hover:bg-white/[0.07]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper/42">{project.status}</p>
                    <h3 className="mt-1 text-xl font-black text-paper">{project.name}</h3>
                  </div>
                  <Score score={project.score} />
                </div>
                <p className="mt-3 text-sm leading-6 text-paper/62">{project.role}</p>
                <p className="mt-4 flex gap-2 border-t border-outlineVariant pt-3 text-sm font-bold leading-6 text-signal">
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
                  {project.next}
                </p>
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Agent rules</p>
          <h2 className="mt-2 font-display text-3xl font-bold">How I should steer you</h2>
          <ul className="mt-5 space-y-3">
            {orchestrationRules.map((rule) => (
              <li key={rule} className="flex gap-2 text-sm leading-6 text-paper/64">
                <ShieldAlert className="mt-1 h-4 w-4 shrink-0 text-brass" aria-hidden="true" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
        <Panel className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Selected dossier</p>
              <h2 className="mt-2 font-display text-3xl font-bold">{selectedProject.name}</h2>
            </div>
            <Score score={selectedProject.score} large />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[selectedProject.lane, selectedProject.status, selectedProject.leverage, selectedProject.effort].map((tag) => (
              <span key={tag} className="rounded-full border border-outlineVariant bg-white/[0.04] px-3 py-1 text-xs font-bold text-paper/66">
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-5 space-y-4">
            <DossierRow label="Path" value={selectedProject.path} mono />
            <DossierRow label="Market" value={selectedProject.market} />
            <DossierRow label="Role" value={selectedProject.role} />
            <DossierRow label="Evidence" value={selectedProject.evidence} />
            <DossierRow label="Next action" value={selectedProject.next} highlight />
            <DossierRow label="Cadence" value={selectedProject.cadence} />
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Project registry</p>
              <h2 className="mt-2 font-display text-3xl font-bold">{filteredProjects.length} projects visible</h2>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-outlineVariant bg-surfaceContainer px-3 py-2 text-paper/62">
              <Filter className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm font-bold">{activeLane}</span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {[...new Set(["All", ...portfolioLanes.map((lane) => lane.id), "Merge", "Client Sites", "Training", "Research", "Content", "Reference"])].map((lane) => (
              <button
                key={lane}
                type="button"
                onClick={() => setActiveLane(lane)}
                className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                  activeLane === lane ? "bg-primaryContainer text-onPrimaryContainer" : "border border-outlineVariant bg-white/[0.035] text-paper/58 hover:text-paper"
                }`}
              >
                {lane}
              </button>
            ))}
          </div>

          <div className="mt-5 max-h-[38rem] space-y-2 overflow-auto pr-1">
            {filteredProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => setSelectedId(project.id)}
                className={`grid w-full gap-3 rounded-md border p-3 text-left transition sm:grid-cols-[minmax(0,1fr)_5rem] ${
                  selectedProject.id === project.id
                    ? "border-signal/50 bg-signal/10"
                    : "border-outlineVariant bg-white/[0.025] hover:border-outline hover:bg-white/[0.055]"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-black text-paper">{project.name}</h3>
                    <span className="rounded-full border border-outlineVariant px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-paper/42">
                      {project.lane}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-paper/56">{project.next}</p>
                </div>
                <div className="flex items-center justify-start sm:justify-end">
                  <Score score={project.score} />
                </div>
              </button>
            ))}
          </div>
        </Panel>
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Panel className="p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Resurrection shortlist</p>
          <h2 className="mt-2 font-display text-3xl font-bold">Worth revisiting, with constraints</h2>
          <div className="mt-5 space-y-3">
            {resurrectProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => setSelectedId(project.id)}
                className="w-full rounded-md border border-outlineVariant bg-surfaceVariant p-4 text-left transition hover:border-rust/50 hover:bg-rust/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-black text-paper">{project.name}</h3>
                  <Score score={project.score} />
                </div>
                <p className="mt-2 text-sm leading-6 text-paper/58">{project.role}</p>
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Weekly operating system</p>
          <h2 className="mt-2 font-display text-3xl font-bold">How the agent keeps momentum</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {weeklyOperatingSystem.map((day) => (
              <div key={day.day} className="rounded-md border border-outlineVariant bg-surfaceVariant p-4">
                <p className="font-display text-2xl font-bold text-brass">{day.day}</p>
                <h3 className="mt-2 text-base font-black text-paper">{day.theme}</h3>
                <p className="mt-2 text-sm leading-6 text-paper/56">{day.output}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-md border border-signal/30 bg-signal/10 p-4">
            <p className="flex items-center gap-2 text-sm font-black text-signal">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Command center doctrine
            </p>
            <p className="mt-2 text-sm leading-6 text-paper/62">
              PhotoSelect earns the runway. HSKG and Component Forge generate fast public proof. Agent Linux Control and RateGuard become strategic leverage only after the income floor stops being fragile.
            </p>
          </div>
        </Panel>
      </section>
    </div>
  );
}

function Score({ score, large = false }) {
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-full border border-outlineVariant bg-surfaceVariant font-mono font-black text-signal ${
        large ? "h-16 w-16 text-xl" : "h-12 w-12 text-sm"
      }`}
      aria-label={`Viability score ${score}`}
    >
      {score}
    </div>
  );
}

function DossierRow({ label, value, mono = false, highlight = false }) {
  return (
    <div className="rounded-md border border-outlineVariant bg-surfaceVariant p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/42">{label}</p>
      <p
        className={`mt-2 text-sm leading-6 ${highlight ? "font-bold text-signal" : "text-paper/64"} ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

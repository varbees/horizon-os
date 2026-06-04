import { ArrowRight, CheckCircle2, Filter, RefreshCw, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Panel from "../components/Panel.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import {
  monetizationResearchRules,
  orchestrationRules,
  portfolioLanes,
  portfolioProjects,
  portfolioVerdicts,
  weeklyOperatingSystem,
} from "../data/portfolio.js";
import { fetchProjects, runProjectSweep } from "../lib/projectsApi.js";

export default function Projects() {
  const [activeLane, setActiveLane] = useState("All");
  const [selectedId, setSelectedId] = useState("photoselect");
  const [projectData, setProjectData] = useState({ projects: portfolioProjects, sweep: null });
  const [sweeping, setSweeping] = useState(false);
  const [sweepError, setSweepError] = useState("");

  useEffect(() => {
    let active = true;
    fetchProjects()
      .then((data) => {
        if (active) setProjectData({ projects: data.projects?.length ? data.projects : portfolioProjects, sweep: data.sweep ?? null });
      })
      .catch((error) => {
        if (active) setSweepError(String(error.message ?? error));
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSweep() {
    setSweeping(true);
    setSweepError("");
    try {
      const sweep = await runProjectSweep();
      setProjectData((prev) => ({ ...prev, sweep }));
    } catch (error) {
      setSweepError(String(error.message ?? error));
    } finally {
      setSweeping(false);
    }
  }

  const registryProjects = projectData.projects?.length ? projectData.projects : portfolioProjects;
  const sweepProjects = projectData.sweep?.projects ?? [];
  const sweepByProject = useMemo(() => {
    const map = new Map();
    sweepProjects.forEach((project) => {
      if (!map.has(project.project_id)) map.set(project.project_id, project);
    });
    return map;
  }, [sweepProjects]);
  const dirtyProjects = sweepProjects.filter((project) => project.git_dirty_count > 0);

  const selectedProject = registryProjects.find((project) => project.id === selectedId) ?? registryProjects[0];
  const selectedLive = sweepByProject.get(selectedProject.id);
  const filteredProjects = useMemo(
    () => (activeLane === "All" ? registryProjects : registryProjects.filter((project) => project.lane === activeLane)),
    [activeLane, registryProjects],
  );
  const verdictCounts = useMemo(
    () =>
      registryProjects.reduce((counts, project) => {
        const verdict = project.verdict ?? "UNSET";
        counts[verdict] = (counts[verdict] ?? 0) + 1;
        return counts;
      }, {}),
    [registryProjects],
  );
  const codebaseFamiliesAudited = registryProjects.filter((project) => project.id !== "external-references").length;
  const archivedFamiliesAudited = registryProjects.filter((project) => project.path?.includes("/07-archive/")).length;
  const partsProjects = registryProjects.filter((project) => project.verdict === "PARTS").length;
  const focusProjects = registryProjects.filter((project) => project.lane === "Focus Now");
  const resurrectProjects = registryProjects.filter((project) => project.lane === "Resurrect");

  return (
    <div>
      <SectionHeader
        eyebrow="Portfolio command center"
        title="One hub for every project, not another project."
        copy="This is the orchestration layer over ~/Desktop/bolting. It ranks what earns focus, what can be resurrected, what should be mined for parts, and what must stay archived so the work does not fragment."
        action={
          <button
            type="button"
            onClick={handleSweep}
            disabled={sweeping}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-black text-onPrimary transition hover:bg-primary/90 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${sweeping ? "animate-spin" : ""}`} aria-hidden="true" />
            {sweeping ? "Sweeping" : "Sweep projects"}
          </button>
        }
      />

      <section className="mb-5 grid gap-3 lg:grid-cols-[1fr_1.2fr]">
        <Panel className="p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">Live sweep overlay</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Indexed" value={projectData.sweep?.summary?.projects ?? 0} />
            <MiniStat label="Git repos" value={projectData.sweep?.summary?.git_repos ?? 0} />
            <MiniStat label="Dirty" value={projectData.sweep?.summary?.dirty_repos ?? 0} warn={dirtyProjects.length > 0} />
            <MiniStat label="Docs" value={projectData.sweep?.summary?.docs_and_ideas ?? 0} />
          </div>
          <p className="mt-3 break-words font-mono text-xs text-paper/48">
            {projectData.sweep?.run?.index_root ?? "Run a sweep to build ~/Desktop/bolting/_horizon_project_index."}
          </p>
          {sweepError ? <p className="mt-2 text-xs font-bold text-rust">{sweepError}</p> : null}
        </Panel>

        <Panel className="p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">Dirty repo queue</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {dirtyProjects.length ? (
              dirtyProjects.slice(0, 8).map((project) => (
                <button
                  key={`${project.run_id}-${project.project_id}-${project.path}`}
                  type="button"
                  onClick={() => project.project_id && setSelectedId(project.project_id)}
                  className="rounded-full border border-rust/30 bg-rust/10 px-3 py-1 text-xs font-black text-rust"
                >
                  {project.name} · {project.git_dirty_count}
                </button>
              ))
            ) : (
              <span className="text-sm text-paper/54">No dirty indexed repos yet, or no sweep has run.</span>
            )}
          </div>
        </Panel>
      </section>

      <section className="mb-5">
        <Panel className="p-5">
          <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Actual codebases, judged by money path</p>
              <h2 className="mt-2 font-display text-3xl font-bold">Codebase monetization lens</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-paper/62">
                Active lanes are still only PhotoSelect and RateGuard. The rest of ~/Desktop/bolting is ranked as SKU option, parts, client proof, reference, or archive so old code can help without becoming a third lane.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <LensStat label="Actual codebase families audited" value={codebaseFamiliesAudited} />
                <LensStat label="Archived families audited" value={archivedFamiliesAudited} />
                <LensStat label="Reusable parts" value={partsProjects} />
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/42">Verdict mix</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {portfolioVerdicts.map((verdict) => (
                    <VerdictPill key={verdict} verdict={verdict} count={verdictCounts[verdict] ?? 0} />
                  ))}
                </div>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/42">Judging rules</p>
                <ul className="mt-3 space-y-2">
                  {monetizationResearchRules.slice(0, 4).map((rule) => (
                    <li key={rule} className="flex gap-2 text-sm leading-6 text-paper/62">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-signal" aria-hidden="true" />
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Panel>
      </section>

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
            {[selectedProject.verdict, selectedProject.lane, selectedProject.status, selectedProject.leverage, selectedProject.effort]
              .filter(Boolean)
              .map((tag) => (
              <span key={tag} className="rounded-full border border-outlineVariant bg-white/[0.04] px-3 py-1 text-xs font-bold text-paper/66">
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-5 space-y-4">
            <DossierRow label="Path" value={selectedProject.path} mono />
            {selectedLive ? (
              <>
                <DossierRow
                  label="Live git state"
                  value={`${selectedLive.is_git ? selectedLive.git_branch || "git repo" : "not a git repo"} · ${selectedLive.git_dirty_count} dirty files · ${selectedLive.last_commit || "no commit seen"}`}
                  mono
                  highlight={selectedLive.git_dirty_count > 0}
                />
                <DossierRow label="Index link" value={selectedLive.index_link} mono />
              </>
            ) : null}
            {selectedProject.verdict ? <DossierRow label="Money verdict" value={selectedProject.verdict} highlight /> : null}
            <DossierRow label="Market" value={selectedProject.market} />
            <DossierRow label="Role" value={selectedProject.role} />
            <DossierRow label="Evidence" value={selectedProject.evidence} />
            {selectedProject.monetization ? <DossierRow label="Monetization path" value={selectedProject.monetization} /> : null}
            <DossierRow label="Next action" value={selectedProject.next} highlight />
            {selectedProject.firstMove ? <DossierRow label="First move" value={selectedProject.firstMove} /> : null}
            {selectedProject.reopenWhen ? <DossierRow label="Reopen when" value={selectedProject.reopenWhen} /> : null}
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
            {[...new Set(["All", ...portfolioLanes.map((lane) => lane.id)])].map((lane) => (
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
              <ProjectRegistryButton
                key={project.id}
                project={project}
                live={sweepByProject.get(project.id)}
                selected={selectedProject.id === project.id}
                onSelect={() => setSelectedId(project.id)}
              />
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
              PhotoSelect earns recurring runway. RateGuard creates fast-cash developer trust. PlantSage, Norma, Agent Linux Control, SecureClaw, and archive projects stay proof or leverage until they show buyer pull.
            </p>
          </div>
        </Panel>
      </section>
    </div>
  );
}

function MiniStat({ label, value, warn = false }) {
  return (
    <div className={`rounded-md border p-3 ${warn ? "border-rust/30 bg-rust/10" : "border-outlineVariant bg-surfaceVariant"}`}>
      <p className={`text-2xl font-black tabular-nums ${warn ? "text-rust" : "text-paper"}`}>{value}</p>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/46">{label}</p>
    </div>
  );
}

function LensStat({ label, value }) {
  return (
    <div className="rounded-md border border-outlineVariant bg-surfaceVariant p-3">
      <p className="text-2xl font-black tabular-nums text-paper">{value}</p>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/46">{label}</p>
    </div>
  );
}

function VerdictPill({ verdict, count }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.16em] ${
        count
          ? "border-signal/30 bg-signal/10 text-signal"
          : "border-outlineVariant bg-white/[0.025] text-paper/36"
      }`}
    >
      {verdict}: {count}
    </span>
  );
}

function ProjectRegistryButton({ project, live, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`grid w-full gap-3 rounded-md border p-3 text-left transition sm:grid-cols-[minmax(0,1fr)_5rem] ${
        selected ? "border-signal/50 bg-signal/10" : "border-outlineVariant bg-white/[0.025] hover:border-outline hover:bg-white/[0.055]"
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-black text-paper">{project.name}</h3>
          <span className="rounded-full border border-outlineVariant px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-paper/42">
            {project.lane}
          </span>
          {project.verdict ? (
            <span className="rounded-full border border-signal/20 bg-signal/10 px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-signal">
              {project.verdict}
            </span>
          ) : null}
          {live?.git_dirty_count ? (
            <span className="rounded-full border border-rust/30 bg-rust/10 px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-rust">
              {live.git_dirty_count} dirty
            </span>
          ) : null}
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-paper/56">{project.next}</p>
      </div>
      <div className="flex items-center justify-start sm:justify-end">
        <Score score={project.score} />
      </div>
    </button>
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

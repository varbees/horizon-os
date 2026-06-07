import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CircleDot,
  Copy,
  GitBranch,
  Github,
  RefreshCw,
  Rocket,
  Terminal,
} from "lucide-react";
import Panel from "../components/Panel.jsx";
import { portfolioProjects } from "../data/portfolio.js";
import { fetchProjectGit } from "../lib/projectsApi.js";

const verdictTone = {
  ENGINE: "border-signal/40 bg-signal/12 text-signal",
  "ACTIVE SKU": "border-brass/40 bg-brass/12 text-brass",
  "SKU OPTION": "border-primary/30 bg-primary/10 text-primary",
  PARTS: "border-outlineVariant bg-white/[0.05] text-paper/70",
  CLIENT: "border-outlineVariant bg-white/[0.05] text-paper/70",
  PROOF: "border-outlineVariant bg-white/[0.05] text-paper/60",
  DEAD: "border-rust/30 bg-rust/10 text-rust",
  REFERENCE: "border-outlineVariant bg-white/[0.04] text-paper/52",
};

export default function ProjectDetail() {
  const { id } = useParams();
  const project = portfolioProjects.find((p) => p.id === id);
  const [git, setGit] = useState(null);
  const [state, setState] = useState("loading");

  const load = useCallback(() => {
    if (!project?.path) {
      setState("nopath");
      return;
    }
    setState("loading");
    fetchProjectGit(project.path)
      .then((data) => {
        setGit(data);
        setState("live");
      })
      .catch(() => setState("offline"));
  }, [project]);

  useEffect(() => {
    load();
  }, [load]);

  if (!project) {
    return (
      <div>
        <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm font-bold text-signal hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to projects
        </Link>
        <p className="mt-6 text-paper/64">No project with id <code className="font-mono text-paper">{id}</code>.</p>
      </div>
    );
  }

  const tone = verdictTone[project.verdict] ?? "border-outlineVariant bg-white/[0.05] text-paper/64";

  return (
    <div>
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm font-bold text-signal hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to projects
      </Link>

      <header className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {project.verdict ? (
              <span className={`rounded-full border px-3 py-0.5 font-mono text-[11px] font-black uppercase tracking-[0.16em] ${tone}`}>
                {project.verdict}
              </span>
            ) : null}
            {project.lane ? (
              <span className="rounded-full border border-outlineVariant bg-white/[0.04] px-3 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-paper/56">
                {project.lane}
              </span>
            ) : null}
          </div>
          <h1 className="mt-2 font-display text-4xl font-black tracking-tight text-paper">{project.name}</h1>
          <p className="mt-1 break-all font-mono text-xs text-paper/46">{project.path}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {git?.webUrl ? (
            <a
              href={git.webUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-outlineVariant bg-surfaceVariant px-3 py-1.5 text-sm font-black text-paper transition hover:border-outline"
            >
              <Github className="h-4 w-4" aria-hidden="true" /> Open repo
            </a>
          ) : null}
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primaryContainer px-3 py-1.5 text-sm font-black text-onPrimaryContainer transition hover:border-primary"
          >
            <RefreshCw className={`h-4 w-4 ${state === "loading" ? "animate-spin" : ""}`} aria-hidden="true" /> Refresh
          </button>
        </div>
      </header>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Live git status */}
        <Panel className="p-5">
          <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.26em] text-brass">
            <GitBranch className="h-3.5 w-3.5" aria-hidden="true" /> Live git status
          </p>
          {state === "offline" ? (
            <p className="mt-4 text-sm text-paper/56">API offline. Start <code className="font-mono">npm run dev:full</code> to read git status.</p>
          ) : state === "loading" ? (
            <p className="mt-4 text-sm text-paper/56">Reading git…</p>
          ) : !git?.isGit ? (
            <p className="mt-4 text-sm text-paper/56">Not a git repository.</p>
          ) : (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Stat label="Branch" value={git.branch || "—"} />
                <Stat label="Ahead / behind" value={`${git.ahead} / ${git.behind}`} highlight={git.ahead > 0 || git.behind > 0} />
                <Stat label="Dirty files" value={git.dirtyCount} highlight={git.dirtyCount > 0} />
              </div>

              {git.dirtyFiles?.length ? (
                <div className="mt-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/42">Uncommitted changes</p>
                  <ul className="mt-2 max-h-40 space-y-1 overflow-auto pr-1">
                    {git.dirtyFiles.map((f) => (
                      <li key={f.file} className="flex items-center gap-2 font-mono text-xs text-paper/64">
                        <span className="w-6 shrink-0 text-rust">{f.code}</span>
                        <span className="truncate">{f.file}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-4 text-sm font-bold text-signal">Working tree clean.</p>
              )}

              <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/42">Recent commits</p>
              <ul className="mt-2 space-y-2">
                {git.commits?.map((c) => (
                  <li key={c.hash} className="flex items-start gap-2 border-t border-outlineVariant/60 pt-2 text-sm">
                    <code className="shrink-0 font-mono text-xs text-brass">{c.hash}</code>
                    <span className="min-w-0">
                      <span className="block truncate text-paper/76">{c.subject}</span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper/40">{c.when} · {c.author}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>

        {/* Money + controls */}
        <div className="space-y-4">
          <Panel className="p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Money verdict</p>
            <div className="mt-4 space-y-4">
              {project.monetization ? <Field label="Monetization path" value={project.monetization} /> : null}
              {project.firstMove ? <Field label="First move" value={project.firstMove} highlight /> : null}
              {project.next ? <Field label="Next action" value={project.next} /> : null}
              {project.reopenWhen ? <Field label="Reopen when" value={project.reopenWhen} /> : null}
              {project.market ? <Field label="Market" value={project.market} /> : null}
            </div>
          </Panel>

          <Panel className="p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Controls</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(git?.path || project.path)}
                className="inline-flex items-center gap-1.5 rounded-md border border-outlineVariant bg-surfaceVariant px-3 py-1.5 text-sm font-bold text-paper transition hover:border-outline"
              >
                <Copy className="h-4 w-4" aria-hidden="true" /> Copy path
              </button>
              <Link
                to="/command"
                className="inline-flex items-center gap-1.5 rounded-md border border-outlineVariant bg-surfaceVariant px-3 py-1.5 text-sm font-bold text-paper transition hover:border-outline"
              >
                <Rocket className="h-4 w-4" aria-hidden="true" /> Action queue
              </Link>
              {git?.webUrl ? (
                <a
                  href={`${git.webUrl}/commits/${git.branch || ""}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-outlineVariant bg-surfaceVariant px-3 py-1.5 text-sm font-bold text-paper transition hover:border-outline"
                >
                  <CircleDot className="h-4 w-4" aria-hidden="true" /> Commit history
                </a>
              ) : null}
            </div>
            <p className="mt-4 flex items-start gap-2 border-t border-outlineVariant pt-3 text-xs text-paper/48">
              <Terminal className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Status refreshes from the hourly sweep (<code className="font-mono">npm run horizon:watch</code>) or the Refresh button.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight = false }) {
  return (
    <div className="rounded-[var(--hz-radius-sm)] border border-outlineVariant bg-surfaceVariant p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/42">{label}</p>
      <p className={`mt-1 text-xl font-black tabular-nums ${highlight ? "text-brass" : "text-paper"}`}>{value}</p>
    </div>
  );
}

function Field({ label, value, highlight = false }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/42">{label}</p>
      <p className={`mt-1 break-words text-sm leading-6 ${highlight ? "font-bold text-paper/82" : "text-paper/64"}`}>{value}</p>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Layers, Loader2, Map, Save, Shield, Target, TrendingUp } from "lucide-react";
import Panel from "../components/Panel.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import PrimaryButton from "../components/PrimaryButton.jsx";

const emptyStrategy = {
  tam_sam_som: "",
  beachhead_market: "",
  moats: "",
  market_strategy: "",
  business_model: "",
};

const strategyFields = [
  {
    key: "tam_sam_som",
    label: "Market Sizing",
    title: "TAM, SAM, SOM",
    icon: Target,
    placeholder: "TAM: total spend. SAM: reachable segment. SOM: first realistic capture.",
  },
  {
    key: "beachhead_market",
    label: "Beachhead",
    title: "First Must-Have Segment",
    icon: Map,
    placeholder: "A narrow buyer group with urgent pain, reachable channels, and clear willingness to pay.",
  },
  {
    key: "moats",
    label: "Moats",
    title: "Defensibility",
    icon: Shield,
    placeholder: "Switching costs, workflow memory, proprietary data, distribution, trust, or operational edge.",
  },
  {
    key: "market_strategy",
    label: "Ocean",
    title: "Ocean Strategy & Timing",
    icon: AlertCircle,
    placeholder: "Why this market now, what is crowded, and where the non-obvious wedge lives.",
  },
  {
    key: "business_model",
    label: "Model",
    title: "Business Model",
    icon: Layers,
    placeholder: "Vertical SaaS, service-to-SaaS, usage pricing, marketplace, open-core, or productized service.",
  },
];

function localCompleteness(strategy) {
  const missing = strategyFields.filter((field) => !String(strategy[field.key] ?? "").trim()).map((field) => field.label);
  const completed = strategyFields.length - missing.length;
  return {
    completed,
    total: strategyFields.length,
    score: Math.round((completed / strategyFields.length) * 100),
    missing,
  };
}

export default function Strategy() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [strategy, setStrategy] = useState(emptyStrategy);
  const [serverCompleteness, setServerCompleteness] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingStrategy, setLoadingStrategy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const selectedProjectName = useMemo(
    () => projects.find((project) => project.id === selectedProject)?.name ?? selectedProject,
    [projects, selectedProject],
  );
  const completeness = serverCompleteness ?? localCompleteness(strategy);

  useEffect(() => {
    let cancelled = false;
    setLoadingProjects(true);
    fetch("/api/projects")
      .then((res) => {
        if (!res.ok) throw new Error(`projects unavailable: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const staticProjects = (data.projects || []).map((project) => ({ id: project.id, name: project.name }));
        const sweptProjects = (data.sweep?.categories || [])
          .flatMap((category) => category.projects || [])
          .map((project) => ({ id: project.id || project.path, name: project.name || project.path }))
          .filter((project) => project.id && project.name);
        const unique = Array.from(new Map([...staticProjects, ...sweptProjects].map((project) => [project.id, project])).values());
        setProjects(unique);
        if (!selectedProject && unique[0]) setSelectedProject(unique[0].id);
      })
      .catch((error) => !cancelled && setMessage({ type: "error", text: error.message }))
      .finally(() => !cancelled && setLoadingProjects(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    let cancelled = false;
    setLoadingStrategy(true);
    setMessage(null);
    fetch(`/api/strategy/${encodeURIComponent(selectedProject)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`strategy unavailable: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const row = data.strategy;
        setStrategy(row ? {
          tam_sam_som: row.tam_sam_som || "",
          beachhead_market: row.beachhead_market || "",
          moats: row.moats || "",
          market_strategy: row.market_strategy || "",
          business_model: row.business_model || "",
        } : emptyStrategy);
        setServerCompleteness(row?.completeness ?? null);
      })
      .catch((error) => !cancelled && setMessage({ type: "error", text: error.message }))
      .finally(() => !cancelled && setLoadingStrategy(false));
    return () => {
      cancelled = true;
    };
  }, [selectedProject]);

  function updateField(key, value) {
    setStrategy((current) => ({ ...current, [key]: value }));
    setServerCompleteness(null);
  }

  async function handleSave() {
    if (!selectedProject) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: selectedProject, ...strategy }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `save failed: ${res.status}`);
      setServerCompleteness(data.strategy?.completeness ?? null);
      setMessage({ type: "success", text: "Strategy saved." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Incubation"
        title="Startup Incubation Engine"
        copy="A disciplined strategy workbench for turning a project into a buyer, wedge, moat, and monetization thesis before more code gets written."
      />

      <Panel className="p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
          <div className="min-w-0">
            <label className="block text-xs font-extrabold uppercase tracking-[0.24em] text-brass">Project</label>
            <select
              value={selectedProject}
              onChange={(event) => {
                setSelectedProject(event.target.value);
                setServerCompleteness(null);
              }}
              disabled={loadingProjects}
              className="mt-2 w-full rounded-[var(--hz-radius-sm)] border border-outlineVariant bg-surface px-3 py-3 text-sm font-semibold text-paper outline-none transition focus:border-brass"
            >
              {loadingProjects ? <option value="">Loading projects...</option> : null}
              {!loadingProjects && projects.length === 0 ? <option value="">No projects found</option> : null}
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>
          <div className="rounded-[var(--hz-radius-sm)] border border-outlineVariant bg-surfaceVariant p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-paper/50">Strategy completeness</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="text-3xl font-black text-paper">{completeness.score}%</p>
              <p className="text-right text-sm font-bold text-paper/70">{completeness.completed}/{completeness.total} locked</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-outlineVariant/70">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completeness.score}%` }} />
            </div>
          </div>
        </div>
      </Panel>

      {selectedProject ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5 min-w-0">
            {strategyFields.map((field, index) => {
              const Icon = field.icon;
              const filled = Boolean(String(strategy[field.key] ?? "").trim());
              return (
                <Panel key={field.key} className="p-5">
                  <div className="mb-4 flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--hz-radius-sm)] bg-primaryContainer text-onPrimaryContainer">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-black text-paper">{index + 1}. {field.title}</h2>
                        {filled ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-signal/25 bg-signal/10 px-2 py-0.5 text-[11px] font-bold text-signal">
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> captured
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm leading-6 text-paper/58">{field.placeholder}</p>
                    </div>
                  </div>
                  <textarea
                    value={strategy[field.key]}
                    onChange={(event) => updateField(field.key, event.target.value)}
                    disabled={loadingStrategy}
                    className="min-h-28 w-full resize-y rounded-[var(--hz-radius-sm)] border border-outlineVariant bg-surface p-3 text-sm leading-6 text-paper outline-none transition placeholder:text-paper/35 focus:border-brass"
                    placeholder={field.placeholder}
                  />
                </Panel>
              );
            })}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <Panel className="p-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-brass">Current thesis</p>
              <h2 className="mt-3 text-2xl font-black text-paper">{selectedProjectName}</h2>
              <p className="mt-3 text-sm leading-6 text-paper/62">
                Save when the wedge, buyer, moat, and revenue path are explicit enough to generate action cards from the thesis.
              </p>
              {completeness.missing.length ? (
                <div className="mt-4 rounded-[var(--hz-radius-sm)] border border-outlineVariant bg-surfaceVariant p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-paper/45">Missing</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-paper/70">{completeness.missing.join(", ")}</p>
                </div>
              ) : (
                <div className="mt-4 rounded-[var(--hz-radius-sm)] border border-signal/25 bg-signal/10 p-3 text-sm font-bold text-signal">
                  Ready to connect into next-move ranking.
                </div>
              )}
            </Panel>

            <Panel className="p-4">
              {message ? (
                <p className={`mb-3 text-sm font-bold ${message.type === "error" ? "text-rust" : "text-primary"}`}>{message.text}</p>
              ) : null}
              <PrimaryButton onClick={handleSave} disabled={saving || loadingStrategy || !selectedProject} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                {saving ? "Saving" : "Save Strategy"}
              </PrimaryButton>
            </Panel>
          </aside>
        </div>
      ) : (
        <Panel className="p-8 text-center text-paper/62">No project is available for strategy capture.</Panel>
      )}
    </div>
  );
}

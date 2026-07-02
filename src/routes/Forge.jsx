import { useEffect, useMemo, useState } from "react";
import { Code, ExternalLink, Filter, Layers, Loader2, Search, Zap } from "lucide-react";
import Panel from "../components/Panel.jsx";
import SectionHeader from "../components/SectionHeader.jsx";

function uniqueValues(items, key) {
  return [...new Set(items.map((item) => String(item[key] ?? "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function FilterButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[var(--hz-radius-sm)] border px-3 py-2 text-xs font-extrabold transition ${
        active
          ? "border-primary bg-primary text-onPrimary"
          : "border-outlineVariant bg-surfaceVariant text-paper/65 hover:border-brass hover:text-paper"
      }`}
    >
      {children}
    </button>
  );
}

export default function Forge() {
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState({ total: 0, categories: [], revenueModels: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [revenueFilter, setRevenueFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/forge")
      .then((res) => {
        if (!res.ok) throw new Error(`forge catalog unavailable: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setAgents(data.agents || []);
        setStats(data.stats || { total: data.agents?.length ?? 0, categories: [], revenueModels: [] });
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => uniqueValues(agents, "category"), [agents]);
  const revenueModels = useMemo(() => uniqueValues(agents, "revenue_model"), [agents]);
  const filteredAgents = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return agents.filter((agent) => {
      const matchesSearch = !needle || [agent.name, agent.description, agent.category, agent.revenue_model]
        .some((value) => String(value ?? "").toLowerCase().includes(needle));
      const matchesCategory = categoryFilter === "all" || agent.category === categoryFilter;
      const matchesRevenue = revenueFilter === "all" || agent.revenue_model === revenueFilter;
      return matchesSearch && matchesCategory && matchesRevenue;
    });
  }, [agents, categoryFilter, revenueFilter, search]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Agent Forge"
        title="Agent Forge"
        copy="A searchable catalog of agent templates that can become service offers, internal automations, or open-core product seeds."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Panel className="p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-paper/45">Templates</p>
          <p className="mt-2 text-3xl font-black text-paper">{stats.total || agents.length}</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-paper/45">Categories</p>
          <p className="mt-2 text-3xl font-black text-paper">{stats.categories?.length || categories.length}</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-paper/45">Revenue Models</p>
          <p className="mt-2 text-3xl font-black text-paper">{stats.revenueModels?.length || revenueModels.length}</p>
        </Panel>
      </div>

      <Panel className="sticky top-4 z-10 space-y-4 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <Search className="h-5 w-5 shrink-0 text-paper/45" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search by template, category, revenue model, or description"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-paper outline-none placeholder:text-paper/35"
          />
          <div className="hidden shrink-0 rounded-[var(--hz-radius-sm)] bg-surfaceVariant px-3 py-1.5 text-xs font-extrabold text-paper/55 sm:block">
            {filteredAgents.length} shown
          </div>
        </div>

        <div className="flex min-w-0 items-start gap-2 overflow-x-auto pb-1">
          <Filter className="mt-2 h-4 w-4 shrink-0 text-paper/45" aria-hidden="true" />
          <FilterButton active={categoryFilter === "all"} onClick={() => setCategoryFilter("all")}>All Categories</FilterButton>
          {categories.slice(0, 10).map((category) => (
            <FilterButton key={category} active={categoryFilter === category} onClick={() => setCategoryFilter(category)}>
              {category}
            </FilterButton>
          ))}
        </div>

        <div className="flex min-w-0 items-start gap-2 overflow-x-auto pb-1">
          <Zap className="mt-2 h-4 w-4 shrink-0 text-paper/45" aria-hidden="true" />
          <FilterButton active={revenueFilter === "all"} onClick={() => setRevenueFilter("all")}>All Models</FilterButton>
          {revenueModels.map((model) => (
            <FilterButton key={model} active={revenueFilter === model} onClick={() => setRevenueFilter(model)}>
              {model}
            </FilterButton>
          ))}
        </div>
      </Panel>

      {loading ? (
        <Panel className="flex items-center justify-center gap-3 p-10 text-paper/62">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          Loading forge catalog
        </Panel>
      ) : error ? (
        <Panel className="p-8 text-center text-rust">{error}</Panel>
      ) : filteredAgents.length === 0 ? (
        <Panel className="p-8 text-center text-paper/62">
          No matching templates. Clear filters or run <code className="rounded bg-white/10 px-1.5 py-0.5">node scripts/ingest-agents.mjs</code> after updating the source README.
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredAgents.map((agent) => (
            <a key={agent.id} href={agent.github_url} target="_blank" rel="noopener noreferrer" className="block min-w-0 group">
              <Panel className="flex h-full min-w-0 flex-col gap-4 p-5 transition hover:border-primary hover:bg-white/10">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <h2 className="min-w-0 text-base font-black leading-snug text-paper transition group-hover:text-primary">{agent.name}</h2>
                  <ExternalLink className="h-4 w-4 shrink-0 text-paper/35 transition group-hover:text-primary" aria-hidden="true" />
                </div>

                {agent.description ? (
                  <p className="line-clamp-3 text-sm leading-6 text-paper/58">{agent.description}</p>
                ) : (
                  <p className="text-sm leading-6 text-paper/45">Use the source repo as a template, then attach the buyer, offer, and proof asset inside Strategy before building.</p>
                )}

                <div className="mt-auto flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex min-w-0 items-center gap-1.5 rounded-[var(--hz-radius-sm)] bg-secondaryContainer px-2.5 py-1 font-bold text-signal">
                    <Code className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{agent.category || "General"}</span>
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-1.5 rounded-[var(--hz-radius-sm)] bg-tertiaryContainer px-2.5 py-1 font-bold text-brass">
                    <Layers className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{agent.revenue_model || "Unmapped"}</span>
                  </span>
                </div>
              </Panel>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

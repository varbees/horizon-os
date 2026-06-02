import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarCheck2,
  GitBranch,
  IndianRupee,
  Mountain,
  Navigation,
  Route,
  Sparkles,
  Target,
  TriangleAlert,
} from "lucide-react";
import { Link } from "react-router-dom";
import Panel from "../components/Panel.jsx";
import PrimaryButton from "../components/PrimaryButton.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import { fetchJourneyEntries } from "../lib/commandBase.js";
import {
  capitalTargets,
  fieldScoutTemplate,
  journeyEntries as staticJourneyEntries,
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

const segmentStyles = {
  ridge: { label: "Ridge", className: "border-primary/30 bg-primary/10 text-primary" },
  valley: { label: "Valley", className: "border-signal/30 bg-signal/12 text-signal" },
  alley: { label: "Alley", className: "border-brass/35 bg-brass/12 text-brass" },
  saddle: { label: "Saddle", className: "border-rust/30 bg-rust/10 text-rust" },
  summit: { label: "Summit", className: "border-primary/35 bg-primary/14 text-primary" },
  camp: { label: "Camp", className: "border-outlineVariant bg-white/60 text-paper/64" },
};

function safeParse(value) {
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value ?? "[]");
  } catch {
    return [];
  }
}

function normalize(row) {
  return {
    id: row.id,
    parentId: row.parent_id ?? row.parentId ?? null,
    date: row.date,
    type: row.type,
    anchor: row.anchor,
    segment: row.segment ?? "ridge",
    title: row.title,
    location: row.location ?? "",
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    altitudeMeters: row.altitude_m ?? row.altitudeMeters ?? null,
    accuracyMeters: row.accuracy_m ?? row.accuracyMeters ?? null,
    elevationGainMeters: row.elevation_gain_m ?? row.elevationGainMeters ?? null,
    terrain: row.terrain ?? "",
    difficulty: row.difficulty ?? "",
    evidence: row.evidence ?? "",
    lesson: row.lesson ?? "",
    next: row.next_action ?? row.next ?? "",
    tags: safeParse(row.tags ?? row.tags_json),
    sortOrder: row.sort_order ?? row.sortOrder ?? 0,
  };
}

function buildTree(entries) {
  const byParent = new Map();
  for (const entry of entries) {
    const key = entry.parentId ?? "__root__";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(entry);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
  }
  return byParent;
}

export default function JourneyLog() {
  const [entries, setEntries] = useState(() => staticJourneyEntries.map(normalize));
  const [source, setSource] = useState("seed");

  useEffect(() => {
    let active = true;
    fetchJourneyEntries()
      .then((data) => {
        if (!active || !Array.isArray(data.entries) || data.entries.length === 0) return;
        setEntries(data.entries.map(normalize));
        setSource("live");
      })
      .catch(() => {
        /* API offline — static seed already rendered */
      });
    return () => {
      active = false;
    };
  }, []);

  const tree = useMemo(() => buildTree(entries), [entries]);
  const roots = tree.get("__root__") ?? [];

  const elevations = entries.map((e) => e.altitudeMeters).filter((v) => typeof v === "number");
  const branchCount = entries.filter((e) => e.parentId).length;
  const lowest = elevations.length ? Math.min(...elevations) : null;
  const highest = elevations.length ? Math.max(...elevations) : null;
  const relief = lowest != null && highest != null ? highest - lowest : null;

  return (
    <div>
      <SectionHeader
        eyebrow="Journey trek ledger v0.4.1"
        title="Climb the two-year route, leg by leg."
        copy="An Obsidian-grade logbook for places, body proof, build proof, capital, and spec. Every place is a ridge entry; every fork branches into an alley or valley with its own GPS, elevation, terrain, and next move."
        action={
          <Link to="/documents">
            <PrimaryButton>
              Read log spec
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </PrimaryButton>
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <TrekStat icon={Mountain} label="Logged legs" value={`${entries.length}`} sub={`${roots.length} routes / ${branchCount} branches`} tone="text-primary" />
        <TrekStat
          icon={Navigation}
          label="Elevation band"
          value={highest != null ? `${highest.toFixed(0)}m` : "--"}
          sub={lowest != null ? `low ${lowest.toFixed(0)}m / relief ${relief?.toFixed(0)}m` : "no GPS yet"}
          tone="text-signal"
        />
        <TrekStat
          icon={GitBranch}
          label="Data source"
          value={source === "live" ? "Local API" : "Seed"}
          sub={source === "live" ? "127.0.0.1:8787 /api/journey" : "run npm run dev:full for live edits"}
          tone="text-brass"
        />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Trek log</p>
              <h2 className="mt-2 font-display text-3xl font-bold">Routes and branch legs</h2>
            </div>
            <BookOpen className="h-8 w-8 text-rust" aria-hidden="true" />
          </div>

          <div className="mt-5 space-y-4">
            {roots.map((entry) => (
              <TrekNode key={entry.id} entry={entry} tree={tree} depth={0} />
            ))}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Reusable</p>
                <h2 className="mt-2 font-display text-2xl font-bold">Field-scout template</h2>
              </div>
              <Route className="h-7 w-7 text-primary" aria-hidden="true" />
            </div>
            <p className="mt-3 text-sm leading-6 text-paper/60">{fieldScoutTemplate.rule}</p>
            <TemplateRow label="Required" items={fieldScoutTemplate.required} />
            <TemplateRow label="Geo" items={fieldScoutTemplate.geo} />
            <TemplateRow label="Trek" items={fieldScoutTemplate.trek} />
            <TemplateRow label="Segments" items={fieldScoutTemplate.segments} />
            <TemplateRow label="Anchors" items={fieldScoutTemplate.anchors} />
          </Panel>

          <Panel className="overflow-hidden p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Capital milestone</p>
                <h2 className="mt-2 font-display text-2xl font-bold">February 2027 gap</h2>
              </div>
              <IndianRupee className="h-7 w-7 text-signal" aria-hidden="true" />
            </div>
            <div className="mt-4 rounded-[var(--hz-radius-sm)] border border-outlineVariant bg-secondaryContainer p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/46">Minimum target</p>
                  <p className="mt-1 text-2xl font-black text-paper">{inr.format(totalTarget)}</p>
                </div>
                <p className="rounded-full border border-signal/30 bg-signal/12 px-3 py-1 font-mono text-[11px] font-black uppercase tracking-[0.18em] text-signal">
                  {totalProgress}% logged
                </p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/70">
                <div className="h-full rounded-full bg-signal" style={{ width: `${Math.min(totalProgress, 100)}%` }} />
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-paper/60">
              Capital math moves to its own runway screen in v0.5. Track here:{" "}
              <Link to="/capital" className="font-bold text-signal underline-offset-2 hover:underline">
                open Capital OS
              </Link>
              .
            </p>
          </Panel>
        </div>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Panel className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Version ladder</p>
              <h2 className="mt-2 font-display text-2xl font-bold">Vertical slices only</h2>
            </div>
            <Route className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {versionRoadmap.map((item) => (
              <article key={item.version} className="rounded-md border border-outlineVariant bg-surfaceVariant p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-display text-xl font-bold text-primary">{item.version}</p>
                  <span className="rounded-full border border-outlineVariant bg-white/60 px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-paper/48">
                    {item.status}
                  </span>
                </div>
                <h3 className="mt-2 text-base font-black text-paper">{item.title}</h3>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-paper/42">{item.window}</p>
                <p className="mt-3 text-sm leading-6 text-paper/60">{item.output}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">External patterns</p>
              <h2 className="mt-2 font-display text-2xl font-bold">Research to action</h2>
            </div>
            <Sparkles className="h-7 w-7 text-brass" aria-hidden="true" />
          </div>
          <div className="mt-5 space-y-3">
            {playbookPatterns.map((pattern) => (
              <article key={pattern.id} className="rounded-md border border-outlineVariant bg-surfaceVariant p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/42">{pattern.source}</p>
                <h3 className="mt-2 text-base font-black text-paper">{pattern.title}</h3>
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
              <h2 className="mt-2 font-display text-2xl font-bold">Useful assets, parked with intent</h2>
            </div>
            <CalendarCheck2 className="h-7 w-7 text-signal" aria-hidden="true" />
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {resourceInboxSeeds.map((resource) => (
              <article key={resource.id} className="rounded-md border border-outlineVariant bg-surfaceVariant p-4">
                <h3 className="text-base font-black text-paper">{resource.title}</h3>
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

function TrekNode({ entry, tree, depth }) {
  const children = tree.get(entry.id) ?? [];
  const segment = segmentStyles[entry.segment] ?? segmentStyles.ridge;
  const hasGeo = typeof entry.latitude === "number" && typeof entry.longitude === "number";

  return (
    <article className={depth > 0 ? "border-l-2 border-dashed border-outlineVariant pl-4" : ""}>
      <div className="rounded-md border border-outlineVariant bg-surfaceVariant p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.16em] ${segment.className}`}>
                {segment.label}
              </span>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/42">
                {entry.date} / {entry.type}
              </p>
            </div>
            <h3 className="mt-1 truncate text-lg font-black text-paper">{entry.title}</h3>
            {entry.location ? <p className="text-sm text-paper/56">{entry.location}</p> : null}
          </div>
          <span className="shrink-0 rounded-full border border-rust/30 bg-rust/10 px-3 py-1 text-xs font-black text-rust">{entry.anchor}</span>
        </div>

        {hasGeo ? (
          <div className="mt-4 grid gap-3 rounded-md border border-outlineVariant bg-white/55 p-3 sm:grid-cols-5">
            <Coordinate label="Latitude" value={entry.latitude.toFixed(6)} />
            <Coordinate label="Longitude" value={entry.longitude.toFixed(6)} />
            <Coordinate label="Altitude" value={entry.altitudeMeters != null ? `${entry.altitudeMeters.toFixed(1)}m` : "--"} />
            <Coordinate label="Accuracy" value={entry.accuracyMeters != null ? `${entry.accuracyMeters}m` : "--"} />
            <Coordinate
              label="Elev. change"
              value={entry.elevationGainMeters != null ? `${entry.elevationGainMeters > 0 ? "+" : ""}${entry.elevationGainMeters.toFixed(1)}m` : "--"}
            />
          </div>
        ) : null}

        {entry.terrain || entry.difficulty ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-paper/64">
            {entry.difficulty ? (
              <span className="inline-flex items-center gap-1.5 font-bold text-paper/74">
                <TriangleAlert className="h-4 w-4 text-brass" aria-hidden="true" />
                {entry.difficulty}
              </span>
            ) : null}
            {entry.terrain ? <span className="leading-6">{entry.terrain}</span> : null}
          </div>
        ) : null}

        <p className="mt-3 text-sm leading-6 text-paper/62">{entry.evidence}</p>
        <p className="mt-2 text-sm font-bold leading-6 text-paper/78">{entry.lesson}</p>
        <p className="mt-3 flex gap-2 border-t border-outlineVariant pt-3 text-sm font-bold leading-6 text-signal">
          <ArrowRight className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
          {entry.next}
        </p>
        {entry.tags?.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {entry.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-white/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/50">
                #{tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {children.length ? (
        <div className="mt-3 space-y-3">
          {children.map((child) => (
            <TrekNode key={child.id} entry={child} tree={tree} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function TrekStat({ icon: Icon, label, value, sub, tone }) {
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

function TemplateRow({ label, items }) {
  return (
    <div className="mt-3 border-t border-outlineVariant pt-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/42">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span key={item} className="rounded-md border border-outlineVariant bg-surfaceVariant px-2 py-0.5 font-mono text-[11px] text-paper/64">
            {item}
          </span>
        ))}
      </div>
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

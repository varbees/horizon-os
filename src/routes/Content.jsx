import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Clapperboard,
  FileCheck2,
  FlaskConical,
  ImagePlus,
  Loader2,
  Megaphone,
  PackageCheck,
  PenLine,
  Send,
  Sparkles,
} from "lucide-react";
import Panel from "../components/Panel.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import ConnectorActionStrip from "../components/ConnectorActionStrip.jsx";
import AgentDeployer from "../components/AgentDeployer.jsx";
import { useUiStore } from "../store/uiStore.js";
import {
  addContentAsset,
  advanceContentBrief,
  assembleContentPackage,
  createContentBrief,
  fetchContentBrief,
  fetchContentBriefs,
  fetchContentPrompts,
  markContentPublished,
  runContentLane,
  setContentAutomate,
} from "../lib/contentApi.js";
import { contentBriefSeeds } from "../data/horizon.js";

const emptyForm = {
  title: "",
  engine: "photoselect",
  source_artifact: "",
  hook: "",
  audience: "",
  channels: "instagram,whatsapp",
  series: "",
  tone: "",
  notes: "",
};

const engineLabel = {
  photoselect: "PhotoSelect",
  antharmaya_labs: "Antharmaya Labs",
};

const statusTone = {
  draft: "border-brass/35 bg-brass/12 text-brass",
  asset_planned: "border-primary/30 bg-primary/10 text-primary",
  researched: "border-primary/30 bg-primary/10 text-primary",
  packaged: "border-signal/30 bg-signal/12 text-signal",
  published: "border-outlineVariant bg-surfaceVariant text-paper/48",
};

function parseArray(value) {
  try {
    const parsed = JSON.parse(value ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function splitChannels(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function seedDetails(briefs) {
  return Object.fromEntries(briefs.map((brief) => [brief.id, { brief, runs: [], assets: [], package: null }]));
}

export default function Content() {
  const [briefs, setBriefs] = useState(contentBriefSeeds);
  const [details, setDetails] = useState(() => seedDetails(contentBriefSeeds));
  const [prompts, setPrompts] = useState([]);
  const [source, setSource] = useState("seed");
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(null);
  const [note, setNote] = useState(null);

  useEffect(() => {
    let active = true;
    fetchContentBriefs()
      .then((data) => {
        if (!active) return;
        setBriefs(data.briefs ?? []);
        setDetails((prev) => ({ ...prev, ...seedDetails(data.briefs ?? []) }));
        setSource("live");
      })
      .catch(() => setSource("seed"));
    fetchContentPrompts()
      .then((data) => active && setPrompts(data.prompts ?? []))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const open = briefs.filter((brief) => brief.status !== "published").length;
    const published = briefs.filter((brief) => brief.status === "published").length;
    const assets = Object.values(details).reduce((sum, item) => sum + (item.assets?.length ?? 0), 0);
    return { open, published, assets };
  }, [briefs, details]);

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function mergeDetails(id, next) {
    if (!next) return;
    setDetails((prev) => ({ ...prev, [id]: next }));
    if (next.brief) {
      setBriefs((prev) => {
        const exists = prev.some((brief) => brief.id === next.brief.id);
        const merged = exists ? prev.map((brief) => (brief.id === next.brief.id ? next.brief : brief)) : [next.brief, ...prev];
        return merged.sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")));
      });
    }
  }

  async function refreshBrief(id) {
    if (source !== "live") return;
    const next = await fetchContentBrief(id);
    mergeDetails(id, next);
  }

  async function saveBrief(event) {
    event.preventDefault();
    setBusy("save");
    setNote(null);
    const payload = {
      ...form,
      channels: splitChannels(form.channels),
      status: "draft",
    };
    try {
      if (source === "live") {
        const created = await createContentBrief(payload);
        await refreshBrief(created.id);
      } else {
        const local = { ...payload, id: `local-${Date.now()}`, channels_json: JSON.stringify(payload.channels), research_json: "{}", created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        setBriefs((prev) => [local, ...prev]);
        setDetails((prev) => ({ ...prev, [local.id]: { brief: local, runs: [], assets: [], package: null } }));
      }
      setForm(emptyForm);
      setNote("Brief saved.");
    } catch (error) {
      setNote(error.message);
    } finally {
      setBusy(null);
    }
  }

  // Run the next native lane on Claude Code (research -> editorial package) and persist it. Same
  // path the autonomous loop uses, so a click produces the same fact-checked, channel-correct draft.
  async function advance(brief) {
    setBusy(`${brief.id}:advance`);
    setNote("Running the next lane on Claude Code. This takes a couple of minutes...");
    try {
      const result = await advanceContentBrief(brief.id);
      mergeDetails(brief.id, result.details);
      const r = result.result ?? {};
      setNote(r.ok ? `Advanced: ${r.lane} to ${r.status}.` : `No advance: ${r.reason || "nothing left to draft"}.`);
    } catch (error) {
      setNote(error.message);
    } finally {
      setBusy(null);
    }
  }

  // Opt a brief in/out of the autonomous loop. When on, the loop drafts it on its own.
  async function toggleAutomate(brief) {
    setBusy(`${brief.id}:automate`);
    setNote(null);
    try {
      const next = !(brief.automate === 1 || brief.automate === true);
      const result = await setContentAutomate(brief.id, next);
      await refreshBrief(brief.id);
      setNote(result.automate ? "Automated. The loop will draft this brief on its own (research to package)." : "Automation off.");
    } catch (error) {
      setNote(error.message);
    } finally {
      setBusy(null);
    }
  }

  async function planStill(brief) {
    setBusy(`${brief.id}:asset`);
    setNote(null);
    try {
      const result = await addContentAsset(brief.id, {
        kind: "still",
        provider: "huggingface",
        aspect_ratio: brief.engine === "photoselect" ? "9:16" : "16:9",
        prompt: `${brief.title}. ${brief.hook}. Premium faceless product proof, light, restrained, no fake science visuals.`,
      });
      mergeDetails(brief.id, result.details);
      setNote("huggingface still planned");
    } catch (error) {
      setNote(error.message);
    } finally {
      setBusy(null);
    }
  }

  async function assemble(brief) {
    setBusy(`${brief.id}:package`);
    setNote(null);
    try {
      const result = await assembleContentPackage(brief.id);
      mergeDetails(brief.id, result.details);
      setNote("manual publish checklist ready");
    } catch (error) {
      setNote(error.message);
    } finally {
      setBusy(null);
    }
  }

  async function publish(brief) {
    setBusy(`${brief.id}:publish`);
    setNote(null);
    try {
      const result = await markContentPublished(brief.id, {});
      mergeDetails(brief.id, result.details);
      setNote("published manually");
    } catch (error) {
      setNote(error.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Distribution OS v1.0"
        title="Content Engine"
        copy="Research, brief, asset plan, generated media, package, QA, then manual publish. PhotoSelect and Antharmaya Labs keep separate audiences and channels."
      />

      {note ? (
        <div role="status" className="mb-4 flex items-start gap-2 rounded-[var(--hz-radius-md)] border border-primary/30 bg-primary/8 p-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-sm leading-6 text-paper/76">{note}</p>
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-4">
        <Metric icon={Megaphone} label="Open briefs" value={metrics.open} tone="text-brass" />
        <Metric icon={ImagePlus} label="Assets" value={metrics.assets} tone="text-primary" />
        <Metric icon={FileCheck2} label="Packages" value={Object.values(details).filter((item) => item.package).length} tone="text-signal" />
        <Metric icon={Send} label="Published" value={metrics.published} tone="text-paper/56" />
      </section>

      <section className="mt-5">
        <ConnectorActionStrip surface="content" />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">New brief</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-paper">One source artifact, one package</h2>
            </div>
            <PenLine className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <form className="mt-5 grid gap-4" onSubmit={saveBrief}>
            <Field label="Brief title" value={form.title} onChange={(value) => updateForm("title", value)} required />
            <label className="grid gap-1.5 text-sm font-bold text-paper/70" htmlFor="content-engine">
              Engine
              <select
                id="content-engine"
                value={form.engine}
                onChange={(event) => updateForm("engine", event.target.value)}
                className="rounded-md border border-outlineVariant bg-surfaceVariant px-3 py-2 text-sm font-bold text-paper outline-none focus:border-primary"
              >
                <option value="photoselect">PhotoSelect</option>
                <option value="antharmaya_labs">Antharmaya Labs</option>
              </select>
            </label>
            <Field label="Source artifact" value={form.source_artifact} onChange={(value) => updateForm("source_artifact", value)} />
            <Field label="Hook" value={form.hook} onChange={(value) => updateForm("hook", value)} />
            <Field label="Audience" value={form.audience} onChange={(value) => updateForm("audience", value)} />
            <Field label="Channels" value={form.channels} onChange={(value) => updateForm("channels", value)} />
            <Field label="Series" value={form.series} onChange={(value) => updateForm("series", value)} />
            <label className="grid gap-1.5 text-sm font-bold text-paper/70" htmlFor="content-notes">
              Notes
              <textarea
                id="content-notes"
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
                rows={4}
                className="resize-y rounded-md border border-outlineVariant bg-surfaceVariant px-3 py-2 text-sm font-semibold leading-6 text-paper outline-none focus:border-primary"
              />
            </label>
            <button
              type="submit"
              disabled={busy === "save"}
              className="inline-flex w-fit items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-black text-onPrimary transition hover:bg-primary/90 disabled:opacity-60"
            >
              {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PenLine className="h-4 w-4" aria-hidden="true" />}
              Save brief
            </button>
          </form>
        </Panel>

        <div className="space-y-4">
          <Panel className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">Lane prompts</p>
                <h2 className="mt-1 font-display text-2xl font-bold text-paper">Research to publish</h2>
              </div>
              <span className="rounded-[var(--hz-radius-sm)] border border-outlineVariant bg-surfaceVariant px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/52">
                {prompts.length || 5} prompts
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(prompts.length ? prompts : [
                { id: "research", lane: "research" },
                { id: "asset-spec", lane: "asset_plan" },
                { id: "editorial", lane: "editorial" },
                { id: "implementation", lane: "implementation" },
              ]).map((prompt) => (
                <span key={prompt.id} className="rounded-full border border-outlineVariant bg-surfaceVariant px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/58">
                  {prompt.lane || prompt.id}
                </span>
              ))}
            </div>
          </Panel>

          {briefs.length ? briefs.map((brief) => (
            <BriefRow
              key={brief.id}
              brief={brief}
              details={details[brief.id]}
              busy={busy}
              onAdvance={advance}
              onAutomate={toggleAutomate}
              onAsset={planStill}
              onPackage={assemble}
              onPublish={publish}
            />
          )) : (
            <Panel className="p-8 text-center text-paper/58">No briefs yet. Start with one real build log or shipped workflow.</Panel>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, required = false }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <label className="grid gap-1.5 text-sm font-bold text-paper/70" htmlFor={id}>
      {label}
      <input
        id={id}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-outlineVariant bg-surfaceVariant px-3 py-2 text-sm font-semibold text-paper outline-none focus:border-primary"
      />
    </label>
  );
}

function Metric({ icon: Icon, label, value, tone }) {
  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/45">{label}</p>
        <Icon className={`h-5 w-5 ${tone}`} aria-hidden="true" />
      </div>
      <p className="mt-2 text-3xl font-black text-paper">{value}</p>
    </Panel>
  );
}

function parseObject(value) {
  try {
    const parsed = JSON.parse(value ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

const claimTone = {
  verified: "border-signal/30 bg-signal/12 text-signal",
  unverified: "border-brass/35 bg-brass/12 text-brass",
  likely_marketing: "border-rust/30 bg-rust/10 text-rust",
  not_buildable_from_current_stack: "border-rust/30 bg-rust/10 text-rust",
};

function briefToEntity(brief) {
  const channels = parseArray(brief.channels_json);
  return {
    type: "content brief",
    id: brief.id,
    title: brief.title,
    subtitle: brief.hook || brief.source_artifact || "",
    source: brief.source_artifact || "",
    body: brief.hook || "",
    tags: [brief.engine, brief.status, ...channels].filter(Boolean),
    meta: [
      { label: "Engine", value: engineLabel[brief.engine] ?? brief.engine },
      { label: "Status", value: brief.status },
    ],
    suggestedActions: ["draft"],
  };
}

function BriefRow({ brief, details, busy, onAdvance, onAutomate, onAsset, onPackage, onPublish }) {
  const openInspector = useUiStore((s) => s.openInspector);
  const channels = parseArray(brief.channels_json);
  const assets = details?.assets ?? [];
  const pkg = details?.package ?? null;
  const research = parseObject(brief.research_json);
  const hasResearch = Object.keys(research).length > 0;
  const automated = brief.automate === 1 || brief.automate === true;
  const advanceBusy = busy === `${brief.id}:advance`;
  const automateBusy = busy === `${brief.id}:automate`;
  const assetBusy = busy === `${brief.id}:asset`;
  const packageBusy = busy === `${brief.id}:package`;
  const publishBusy = busy === `${brief.id}:publish`;
  const canAdvance = brief.status === "draft" || brief.status === "researched";

  return (
    <Panel as="article" aria-label={brief.title} className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-[var(--hz-radius-sm)] bg-secondaryContainer px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-signal">
              {engineLabel[brief.engine] ?? brief.engine}
            </span>
            <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.14em] ${statusTone[brief.status] ?? statusTone.draft}`}>
              {brief.status}
            </span>
            {automated ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-primary">
                <Bot className="h-3 w-3" aria-hidden="true" /> auto
              </span>
            ) : null}
          </div>
          <button type="button" onClick={() => openInspector(briefToEntity(brief))} className="mt-2 block text-left text-xl font-black leading-tight text-paper transition hover:text-primary">
            {brief.title}
          </button>
          {brief.hook ? <p className="mt-2 text-sm font-bold leading-6 text-paper/72">{brief.hook}</p> : null}
          <p className="mt-1 text-sm leading-6 text-paper/58">{brief.source_artifact || "No source artifact attached yet."}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {channels.map((channel) => (
              <span key={channel} className="rounded-md border border-outlineVariant bg-surfaceVariant px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/48">
                {channel}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <ActionButton icon={Sparkles} busy={advanceBusy} onClick={() => onAdvance(brief)} primary disabled={!canAdvance}>
            {brief.status === "draft" ? "Auto-draft: research" : brief.status === "researched" ? "Auto-draft: package" : "Drafted"}
          </ActionButton>
          <ActionButton icon={Bot} busy={automateBusy} onClick={() => onAutomate(brief)}>{automated ? "Automation on" : "Automate"}</ActionButton>
          <ActionButton icon={ImagePlus} busy={assetBusy} onClick={() => onAsset(brief)}>Plan still</ActionButton>
          <ActionButton icon={PackageCheck} busy={packageBusy} onClick={() => onPackage(brief)}>Template package</ActionButton>
          <ActionButton icon={Send} busy={publishBusy} onClick={() => onPublish(brief)}>Mark published</ActionButton>
          <div className="w-full lg:w-auto lg:border-l lg:border-outlineVariant lg:pl-2">
            <AgentDeployer entity={briefToEntity(brief)} variant="compact" defaultAgent="deepseek" defaultAction="draft" />
          </div>
        </div>
      </div>

      {hasResearch ? (
        <div className="mt-4 border-t border-outlineVariant pt-4">
          <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/44">
            <FlaskConical className="h-3.5 w-3.5 text-signal" aria-hidden="true" /> research dossier
          </p>
          {research.summary ? <p className="mt-2 text-sm leading-6 text-paper/72">{research.summary}</p> : null}
          {Array.isArray(research.honest_hooks) && research.honest_hooks.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {research.honest_hooks.slice(0, 4).map((h, i) => (
                <span key={i} className="rounded-md bg-surfaceVariant px-2 py-1 text-xs font-semibold text-paper/64">{h}</span>
              ))}
            </div>
          ) : null}
          {Array.isArray(research.claims) && research.claims.length ? (
            <div className="mt-2 grid gap-1.5">
              {research.claims.slice(0, 4).map((c, i) => (
                <div key={i} className="flex items-start justify-between gap-2 rounded-md border border-outlineVariant bg-surfaceVariant px-2.5 py-1.5">
                  <span className="text-xs font-bold leading-5 text-paper/74">{c.claim}</span>
                  <span className={`shrink-0 rounded-full border px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.1em] ${claimTone[c.status] ?? "border-outlineVariant text-paper/50"}`}>
                    {String(c.status ?? "").replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          {Array.isArray(research.do_not_build) && research.do_not_build.length ? (
            <div className="mt-2 rounded-md border border-rust/25 bg-rust/8 px-2.5 py-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-rust">do not build / claim</p>
              <ul className="mt-1 grid gap-0.5">
                {research.do_not_build.slice(0, 3).map((d, i) => (
                  <li key={i} className="text-xs leading-5 text-paper/64">{d}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {assets.length ? (
        <div className="mt-4 border-t border-outlineVariant pt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/44">Assets</p>
          <div className="mt-2 grid gap-2">
            {assets.map((asset) => (
              <div key={asset.id} className="rounded-md border border-outlineVariant bg-surfaceVariant px-3 py-2 text-sm text-paper/68">
                <span className="font-bold text-paper">{asset.provider} {asset.kind} {asset.status}</span>
                <span className="ml-2 text-paper/48">{asset.aspect_ratio}</span>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-paper/52">{asset.prompt}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {pkg ? <ContentPackage pkg={pkg} /> : null}
    </Panel>
  );
}

function ContentPackage({ pkg }) {
  const xThread = parseArray(pkg.x_thread_json);
  const reel = parseArray(pkg.reel_script_json);
  const checklist = parseArray(pkg.checklist_json);
  const blocks = [
    pkg.instagram_caption ? { label: "Instagram caption", body: pkg.instagram_caption } : null,
    pkg.blog ? { label: "Blog", body: pkg.blog } : null,
    pkg.linkedin ? { label: "LinkedIn", body: pkg.linkedin } : null,
  ].filter(Boolean);

  return (
    <div className="mt-4 border-t border-outlineVariant pt-4">
      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-signal">
        <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" /> content package
        <span className="text-paper/40">{pkg.status}</span>
      </p>
      <div className="mt-2 grid gap-3 lg:grid-cols-2">
        {blocks.map((b) => (
          <div key={b.label} className="rounded-md border border-outlineVariant bg-surfaceVariant p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-paper/44">{b.label}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-paper/72">{b.body}</p>
          </div>
        ))}
        {xThread.length ? (
          <div className="rounded-md border border-outlineVariant bg-surfaceVariant p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-paper/44">X thread ({xThread.length})</p>
            <ol className="mt-1 grid gap-1.5">
              {xThread.slice(0, 6).map((t, i) => (
                <li key={i} className="text-sm leading-6 text-paper/72">{typeof t === "string" ? t : JSON.stringify(t)}</li>
              ))}
            </ol>
          </div>
        ) : null}
        {reel.length ? (
          <div className="rounded-md border border-outlineVariant bg-surfaceVariant p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-paper/44">Reel script ({reel.length} beats)</p>
            <ol className="mt-1 grid gap-1">
              {reel.slice(0, 8).map((beat, i) => (
                <li key={i} className="text-xs leading-5 text-paper/64">
                  <span className="font-mono text-paper/40">{beat.seconds != null ? `${beat.seconds}s ` : ""}</span>
                  {beat.on_screen_text ?? (typeof beat === "string" ? beat : JSON.stringify(beat))}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
      {checklist.length ? (
        <div className="mt-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-paper/44">Publish checklist</p>
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            {checklist.map((item, i) => (
              <div key={i} className="flex gap-2 rounded-md border border-outlineVariant bg-surfaceVariant px-3 py-1.5 text-xs leading-5 text-paper/62">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal" aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ActionButton({ icon: Icon, busy, onClick, children, primary = false, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-bold transition disabled:opacity-50 ${
        primary
          ? "bg-primary text-onPrimary hover:bg-primary/90"
          : "border border-outlineVariant bg-surfaceVariant text-paper/70 hover:border-primary hover:text-paper"
      }`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Icon className="h-4 w-4" aria-hidden="true" />}
      {children}
    </button>
  );
}

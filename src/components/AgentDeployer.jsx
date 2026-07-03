import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2, Rocket, Check, AlertTriangle } from "lucide-react";
import { AGENTS, ACTIONS, agentById, deployEntity, fetchModelCatalog } from "../lib/agents.js";
import { useUiStore } from "../store/uiStore.js";

// The Universal Action Deployer. Drop it on any card (variant="compact") or in
// the Inspector (variant="full"). Pick an agent, an action, and a model, then
// Deploy — it composes a real action-queue entry and routes it to the executor.

export default function AgentDeployer({ entity, variant = "compact", defaultAgent = "claude-code", defaultAction, onDeployed }) {
  const pushToast = useUiStore((s) => s.pushToast);
  const [agentId, setAgentId] = useState(defaultAgent);
  const [actionId, setActionId] = useState(defaultAction ?? entity?.suggestedActions?.[0] ?? "draft");
  const [model, setModel] = useState("");
  const [catalog, setCatalog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [sourcePick, setSourcePick] = useState(null); // { sources, id } for jules

  const agent = agentById(agentId);

  useEffect(() => {
    let active = true;
    fetchModelCatalog().then((c) => active && setCatalog(c));
    return () => {
      active = false;
    };
  }, []);

  const models = useMemo(() => {
    const provider = catalog?.byId?.[agent.apiAgent];
    return provider?.models ?? [];
  }, [catalog, agent.apiAgent]);

  useEffect(() => {
    // reset model when agent changes; default to provider's configured default
    const provider = catalog?.byId?.[agent.apiAgent];
    setModel(provider?.defaultModel ?? "");
  }, [agentId, catalog, agent.apiAgent]);

  async function run(source) {
    setBusy(true);
    setResult(null);
    try {
      const out = await deployEntity({ entity, agentId, model, actionId, source });
      if (out.needsSource) {
        setSourcePick({ sources: out.sources ?? [], id: out.id });
        setBusy(false);
        return;
      }
      setSourcePick(null);
      setResult(out);
      pushToast({
        tone: out.ok ? "success" : "error",
        title: out.ok ? `${out.agent} — ${out.mode}` : "Deploy failed",
        message: out.detail,
      });
      onDeployed?.(out);
    } catch (error) {
      pushToast({ tone: "error", title: "Deploy failed", message: error.message });
    } finally {
      setBusy(false);
    }
  }

  const selectCls =
    "min-w-0 rounded-md border border-outlineVariant bg-surface px-2 py-1.5 text-xs font-bold text-paper outline-none focus:border-primary";

  if (variant === "full") {
    return (
      <div className="rounded-[var(--hz-radius-md)] border border-outlineVariant bg-surfaceVariant p-4">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-brass">Deploy an agent</p>
          {agent.repoWrite ? (
            <span className="rounded-full border border-rust/30 bg-rust/8 px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.14em] text-rust">writes repo</span>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {AGENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAgentId(a.id)}
              className={`rounded-md border px-3 py-2 text-left text-xs font-black transition ${
                agentId === a.id
                  ? "border-primary/40 bg-primaryContainer text-onPrimaryContainer"
                  : "border-outlineVariant bg-surface text-paper/64 hover:border-outline hover:text-paper"
              }`}
            >
              {a.label}
              <span className="mt-0.5 block font-mono text-[9px] font-medium uppercase tracking-[0.12em] opacity-60">{a.kind}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs leading-5 text-paper/56">{agent.blurb}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper/44">Action</label>
          <select value={actionId} onChange={(e) => setActionId(e.target.value)} className={selectCls}>
            {ACTIONS.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
          {models.length ? (
            <>
              <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper/44">Model</label>
              <select value={model} onChange={(e) => setModel(e.target.value)} className={`${selectCls} flex-1`}>
                {!model ? <option value="">default</option> : null}
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.label ?? m.id}</option>
                ))}
              </select>
            </>
          ) : null}
        </div>

        {sourcePick ? (
          <SourcePicker sources={sourcePick.sources} onPick={(s) => run(s)} onCancel={() => setSourcePick(null)} />
        ) : null}

        <button
          type="button"
          onClick={() => run()}
          disabled={busy}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-sm font-black text-onPrimary transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
          Deploy to {agent.label}
        </button>

        {result ? <ResultLine result={result} /> : null}
      </div>
    );
  }

  // compact — the inline bar on cards
  return (
    <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <div className="relative flex items-center">
        <select
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          aria-label="Agent"
          className="appearance-none rounded-md border border-outlineVariant bg-surface py-1 pl-2 pr-6 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-paper/72 outline-none focus:border-primary"
        >
          {AGENTS.map((a) => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-1.5 h-3 w-3 text-paper/40" aria-hidden="true" />
      </div>
      <div className="relative flex items-center">
        <select
          value={actionId}
          onChange={(e) => setActionId(e.target.value)}
          aria-label="Action"
          className="appearance-none rounded-md border border-outlineVariant bg-surface py-1 pl-2 pr-6 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-paper/72 outline-none focus:border-primary"
        >
          {ACTIONS.map((a) => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-1.5 h-3 w-3 text-paper/40" aria-hidden="true" />
      </div>
      <button
        type="button"
        onClick={() => run()}
        disabled={busy}
        title={`Deploy to ${agent.label}`}
        className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-black text-onPrimary transition hover:brightness-110 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
        Deploy
      </button>
      {result?.ok ? <Check className="h-3.5 w-3.5 text-signal" aria-label="deployed" /> : null}
      {sourcePick ? (
        <div className="basis-full">
          <SourcePicker sources={sourcePick.sources} onPick={(s) => run(s)} onCancel={() => setSourcePick(null)} />
        </div>
      ) : null}
    </div>
  );
}

function SourcePicker({ sources, onPick, onCancel }) {
  const [value, setValue] = useState(sources?.[0]?.name ?? sources?.[0]?.id ?? "");
  if (!sources?.length) {
    return (
      <p className="mt-2 flex items-center gap-1 text-xs text-rust">
        <AlertTriangle className="h-3.5 w-3.5" /> No Jules repos connected. Connect one in the Jules app first.
        <button type="button" onClick={onCancel} className="ml-1 underline">dismiss</button>
      </p>
    );
  }
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-brass/30 bg-brass/8 p-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-brass">Jules repo</span>
      <select value={value} onChange={(e) => setValue(e.target.value)} className="rounded-md border border-outlineVariant bg-surface px-2 py-1 text-xs font-bold text-paper">
        {sources.map((s) => (
          <option key={s.id ?? s.name} value={s.name ?? s.id}>{s.name ?? s.id}</option>
        ))}
      </select>
      <button type="button" onClick={() => onPick(value)} className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-black text-onPrimary">Dispatch</button>
      <button type="button" onClick={onCancel} className="text-[11px] font-bold text-paper/50 underline">cancel</button>
    </div>
  );
}

function ResultLine({ result }) {
  return (
    <div
      className={`mt-2 flex items-start gap-2 rounded-md border p-2 text-xs ${
        result.ok ? "border-signal/30 bg-signal/8 text-signal" : "border-rust/30 bg-rust/8 text-rust"
      }`}
    >
      {result.ok ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
      <span className="min-w-0 break-words font-bold">{result.detail}</span>
    </div>
  );
}

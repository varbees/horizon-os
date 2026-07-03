import { useEffect, useState } from "react";
import { Sparkles, Loader2, Check, Plus, X, Compass } from "lucide-react";
import SectionHeader from "../components/SectionHeader.jsx";
import Panel from "../components/Panel.jsx";
import CodebaseAtlas from "../components/CodebaseAtlas.jsx";
import { fetchAgentProfile, saveAgentProfile } from "../lib/agentProfileApi.js";
import { fetchWorkspace } from "../lib/workspaceApi.js";
import { useUiStore } from "../store/uiStore.js";

// Cofounder onboarding — the questions Horizon asks after a sweep to configure the
// agents to the operator's actual mission, rules, and goals. Persisted to
// .horizon/agent-profile.json and injected into every deploy (continuity, not a
// cold assistant). Grounded by the codebase atlas so it reflects the real repo.

const EMPTY = { mission: "", users: "", success: "", stack: { frontend: "", backend: "", data: "" }, constraints: [], codingRules: [], currentGoals: [] };

export default function Onboarding() {
  const pushToast = useUiStore((s) => s.pushToast);
  const [form, setForm] = useState(EMPTY);
  const [configured, setConfigured] = useState(false);
  const [wsRoot, setWsRoot] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchAgentProfile().then((d) => { setForm({ ...EMPTY, ...d.profile, stack: { ...EMPTY.stack, ...(d.profile?.stack || {}) } }); setConfigured(d.configured); }).catch(() => {}).finally(() => setLoaded(true));
    fetchWorkspace().then((w) => setWsRoot(w.root || "")).catch(() => {});
  }, []);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function setStack(k, v) { setForm((f) => ({ ...f, stack: { ...f.stack, [k]: v } })); }

  async function save() {
    setSaving(true);
    try {
      const d = await saveAgentProfile(form);
      setConfigured(d.configured);
      pushToast({ tone: "success", title: "Profile saved", message: "Injected into every deploy from now on." });
    } catch (e) {
      pushToast({ tone: "error", title: "Save failed", message: e.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <SectionHeader
        eyebrow="Cofounder onboarding"
        title="Tell Horizon what you're building."
        copy="After the sweep, answer these once. Horizon injects your mission, rules, and goals into every agent deploy — so the workforce acts like a cofounder with continuity, not a cold assistant that forgets."
      />

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4">
          <Panel className="p-5">
            <Stage n="1" title="What are you building?" />
            <Field label="Mission" value={form.mission} onChange={(v) => set("mission", v)} placeholder="One line: what this workspace is for" area />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Users" value={form.users} onChange={(v) => set("users", v)} placeholder="Who it's for" />
              <Field label="Success looks like" value={form.success} onChange={(v) => set("success", v)} placeholder="The outcome that matters" />
            </div>
          </Panel>

          <Panel className="p-5">
            <Stage n="2" title="Stack & working rules" />
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Frontend" value={form.stack.frontend} onChange={(v) => setStack("frontend", v)} placeholder="React…" />
              <Field label="Backend" value={form.stack.backend} onChange={(v) => setStack("backend", v)} placeholder="Node…" />
              <Field label="Data" value={form.stack.data} onChange={(v) => setStack("data", v)} placeholder="SQLite…" />
            </div>
            <ListEditor className="mt-4" label="Working rules (agents must follow)" items={form.codingRules} onChange={(v) => set("codingRules", v)} placeholder="e.g. Verify before declaring done" />
          </Panel>

          <Panel className="p-5">
            <Stage n="3" title="Constraints & current goals" />
            <ListEditor label="Constraints (never cross these)" items={form.constraints} onChange={(v) => set("constraints", v)} placeholder="e.g. Light-first UI, no external API keys in browser" />
            <ListEditor className="mt-4" label="Current goals (what matters right now)" items={form.currentGoals} onChange={(v) => set("currentGoals", v)} placeholder="e.g. Ship the payment flow" />
          </Panel>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-paper/50">{configured ? "Profile is active — injected into deploys." : "Not yet saved."}</p>
            <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-black text-onPrimary transition hover:brightness-110 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : configured ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {configured ? "Update profile" : "Save profile"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <Panel className="p-4">
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-brass"><Compass className="h-3.5 w-3.5" /> What we swept</p>
            <p className="mt-1 truncate font-mono text-xs text-paper/56" title={wsRoot}>{wsRoot || "—"}</p>
          </Panel>
          {loaded ? <CodebaseAtlas path={wsRoot || undefined} compact /> : null}
        </div>
      </div>
    </div>
  );
}

function Stage({ n, title }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primaryContainer font-mono text-[11px] font-black text-onPrimaryContainer">{n}</span>
      <h2 className="font-display text-lg font-bold text-paper">{title}</h2>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, area }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-paper/46">{label}</span>
      {area ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2} className="w-full resize-y rounded-md border border-outlineVariant bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-primary" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-md border border-outlineVariant bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-primary" />
      )}
    </label>
  );
}

function ListEditor({ label, items, onChange, placeholder, className = "" }) {
  const [draft, setDraft] = useState("");
  function add() {
    const v = draft.trim();
    if (!v) return;
    onChange([...(items || []), v]);
    setDraft("");
  }
  return (
    <div className={className}>
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-paper/46">{label}</span>
      <div className="flex items-center gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} placeholder={placeholder} className="min-w-0 flex-1 rounded-md border border-outlineVariant bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-primary" />
        <button type="button" onClick={add} className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-outlineVariant text-paper/60 hover:text-paper"><Plus className="h-4 w-4" /></button>
      </div>
      {items?.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((it, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full border border-outlineVariant bg-surfaceVariant px-2.5 py-1 text-xs font-bold text-paper/74">
              {it}
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-paper/40 hover:text-rust"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Copy, Inbox, Loader2, Plus, Sparkles, Wand2 } from "lucide-react";
import Panel from "../components/Panel.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import PrimaryButton from "../components/PrimaryButton.jsx";
import { createCommandTask } from "../lib/commandBase.js";
import { addResource } from "../lib/inboxApi.js";

// Playground: goals-grounded ideation. Pick provider+model, optionally load an
// installed skill as the system prompt, inject live Horizon context (job plan day,
// capital, open tasks), generate, then route the output somewhere real —
// inbox resource or a task on the graph. Nothing here is a demo: every run hits
// the same provider layer the action queue uses.

const HISTORY_KEY = "horizon-playground-history";

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
  } catch {
    return [];
  }
}

export default function Playground() {
  const [searchParams] = useSearchParams();
  const [catalog, setCatalog] = useState(null);
  const [skills, setSkills] = useState([]);
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [skillId, setSkillId] = useState(searchParams.get("skill") ?? "");
  const [system, setSystem] = useState("");
  const [prompt, setPrompt] = useState("");
  const [useContext, setUseContext] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [history, setHistory] = useState(loadHistory);

  useEffect(() => {
    fetch("/api/ai-models")
      .then((r) => r.json())
      .then((data) => {
        setCatalog(data);
        if (data.defaultSelection) {
          setProvider((current) => current || data.defaultSelection.provider);
          setModel((current) => current || data.defaultSelection.model);
        }
      })
      .catch(() => setCatalog({ providers: [] }));
    fetch("/api/connectors")
      .then((r) => r.json())
      .then((data) => setSkills((data.connectors ?? []).filter((c) => c.kind === "skill")))
      .catch(() => setSkills([]));
  }, []);

  useEffect(() => {
    if (!skillId) return;
    fetch(`/api/skills/${encodeURIComponent(skillId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("skill load failed"))))
      .then((data) => {
        setSystem(data.content ?? "");
        setNote(`Skill loaded as system prompt: ${data.name}`);
      })
      .catch(() => setNote("Could not load skill — is the API running?"));
  }, [skillId]);

  const activeProvider = useMemo(
    () => catalog?.providers?.find((entry) => entry.id === provider),
    [catalog, provider],
  );

  const pushHistory = useCallback((entry) => {
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 20);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        // localStorage full — history is a convenience, session state still works
      }
      return next;
    });
  }, []);

  const generate = async () => {
    if (!prompt.trim() || running) return;
    setRunning(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/playground/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          system: system.trim() || undefined,
          provider: provider || undefined,
          model: model || undefined,
          useContext,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || `generate failed: ${res.status}`);
      setResult(data);
      pushHistory({
        at: new Date().toISOString(),
        prompt: prompt.trim().slice(0, 200),
        provider: data.provider,
        model: data.model,
        text: data.text,
      });
    } catch (err) {
      setError(String(err.message ?? err));
    } finally {
      setRunning(false);
    }
  };

  const copyResult = async () => {
    if (!result?.text) return;
    try {
      await navigator.clipboard.writeText(result.text);
      setNote("Copied to clipboard.");
    } catch {
      setNote("Clipboard unavailable — select and copy manually.");
    }
  };

  const saveToInbox = async () => {
    if (!result?.text) return;
    setNote("Saving to inbox…");
    try {
      await addResource({
        id: `playground-${Date.now()}`,
        title: prompt.trim().slice(0, 80) || "Playground idea",
        source: `playground · ${result.provider}/${result.model}`,
        kind: "research",
        projectId: "horizon-os",
        status: "inbox",
        note: result.text.slice(0, 1500),
        next: "Review this playground output and either action it or dismiss it.",
        tags: ["playground", "ideation"],
      });
      setNote("Saved to Inbox as a resource.");
    } catch (err) {
      setNote(`Inbox save failed: ${err.message}`);
    }
  };

  const taskFromIdea = async () => {
    if (!result?.text) return;
    setNote("Creating task…");
    try {
      await createCommandTask({
        node_id: "job-engine",
        title: `Playground: ${prompt.trim().slice(0, 90)}`,
        priority: "normal",
        revenue_impact: 0,
        evidence: result.text.slice(0, 800),
      });
      setNote("Task created on the AI Job Hunt node — visible on the Map.");
    } catch (err) {
      setNote(`Task create failed: ${err.message}`);
    }
  };

  return (
    <div>
      <SectionHeader
        eyebrow="Playground · goals-grounded ideation"
        title="Think out loud, against your real state."
        copy="Every run injects live Horizon context — job plan day, capital, open tasks — so ideas land on your goals, not in a vacuum. Route anything good to the Inbox or straight onto the graph as a task."
      />

      {note ? <p className="mb-3 text-sm font-bold text-primary">{note}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Panel className="p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/44">Provider</span>
                <select
                  value={provider}
                  onChange={(event) => {
                    setProvider(event.target.value);
                    const next = catalog?.providers?.find((entry) => entry.id === event.target.value);
                    setModel(next?.defaultModel || next?.models?.[0]?.id || "");
                  }}
                  className="mt-1 w-full rounded-md border border-outlineVariant bg-surface px-3 py-2 text-sm font-bold text-paper"
                >
                  {(catalog?.providers ?? []).filter((entry) => entry.configured).map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/44">Model</span>
                <select
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  className="mt-1 w-full rounded-md border border-outlineVariant bg-surface px-3 py-2 text-sm font-bold text-paper"
                >
                  {(activeProvider?.models ?? []).map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
                  {model && !(activeProvider?.models ?? []).some((entry) => entry.id === model) ? (
                    <option value={model}>{model}</option>
                  ) : null}
                </select>
              </label>
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/44">Skill (optional)</span>
                <select
                  value={skillId}
                  onChange={(event) => setSkillId(event.target.value)}
                  className="mt-1 w-full rounded-md border border-outlineVariant bg-surface px-3 py-2 text-sm font-bold text-paper"
                >
                  <option value="">none</option>
                  {skills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-end gap-2 pb-1">
                <input
                  type="checkbox"
                  checked={useContext}
                  onChange={(event) => setUseContext(event.target.checked)}
                  className="h-4 w-4 accent-[#2558d8]"
                />
                <span className="text-sm font-bold text-paper/72">Inject live Horizon context</span>
              </label>
            </div>

            <label className="mt-4 block">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/44">System prompt {skillId ? "(from skill — editable)" : "(optional)"}</span>
              <textarea
                value={system}
                onChange={(event) => setSystem(event.target.value)}
                placeholder="Optional framing: who the model is, what a good answer looks like."
                className="mt-1 max-h-48 min-h-16 w-full resize-y rounded-md border border-outlineVariant bg-surface px-3 py-2 text-sm leading-6 text-paper"
              />
            </label>

            <label className="mt-3 block">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/44">Prompt</span>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") generate();
                }}
                placeholder="What are we thinking through? (Ctrl/Cmd+Enter to run)"
                className="mt-1 min-h-28 w-full resize-y rounded-md border border-outlineVariant bg-surface px-3 py-2 text-sm leading-6 text-paper"
              />
            </label>

            <div className="mt-4 flex items-center gap-3">
              <PrimaryButton onClick={generate} disabled={running || !prompt.trim()}>
                {running ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Wand2 className="h-4 w-4" aria-hidden="true" />}
                {running ? "Thinking…" : "Generate"}
              </PrimaryButton>
              {error ? <p className="text-sm font-bold text-rust">{error}</p> : null}
            </div>
          </Panel>

          {result ? (
            <Panel className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/44">
                  {result.provider} · {result.model}
                </p>
                <div className="flex gap-2">
                  <ActionChip icon={Copy} label="Copy" onClick={copyResult} />
                  <ActionChip icon={Inbox} label="Save to Inbox" onClick={saveToInbox} />
                  <ActionChip icon={Plus} label="Task from idea" onClick={taskFromIdea} />
                </div>
              </div>
              <div className="mt-3 whitespace-pre-wrap rounded-md border border-outlineVariant bg-surfaceVariant p-4 text-sm leading-7 text-paper/82">
                {result.text}
              </div>
            </Panel>
          ) : null}
        </div>

        <aside className="min-h-0">
          <Panel className="p-5">
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-brass">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Recent runs
            </p>
            {history.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-paper/54">
                Nothing yet. Runs are kept locally (last 20) so you can pull an idea back without re-spending tokens.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {history.map((entry) => (
                  <li key={entry.at}>
                    <button
                      type="button"
                      onClick={() => {
                        setPrompt(entry.prompt);
                        setResult({ provider: entry.provider, model: entry.model, text: entry.text });
                      }}
                      className="w-full rounded-md border border-outlineVariant bg-surfaceVariant px-3 py-2 text-left transition hover:border-primary/40"
                    >
                      <p className="truncate text-xs font-bold text-paper/78">{entry.prompt}</p>
                      <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-paper/40">
                        {entry.provider}/{entry.model} · {entry.at.slice(5, 16).replace("T", " ")}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function ActionChip({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md border border-outlineVariant bg-surface px-2.5 py-1.5 text-xs font-black text-paper/66 transition hover:border-outline hover:text-paper"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}

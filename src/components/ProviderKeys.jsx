import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, KeyRound, Loader2, Save, Star } from "lucide-react";
import Panel from "./Panel.jsx";

// Providers & Keys: one control surface for every LLM provider — key entry
// (server-side .env, masked tails only), model selection, default provider,
// and Claude usage. Built to absorb future providers without UI changes:
// everything renders from /api/ai-models + /api/provider-keys.

const PROVIDER_KEY_MAP = {
  deepseek: { key: "DEEPSEEK_API_KEY", model: "DEEPSEEK_MODEL" },
  gemini: { key: "GEMINI_API_KEY", model: "GEMINI_MODEL" },
  nim: { key: "NVIDIA_NIM_API_KEY", model: "NVIDIA_NIM_MODEL" },
  openai: { key: "OPENAI_API_KEY", model: "OPENAI_MODEL" },
  anthropic: { key: "ANTHROPIC_API_KEY", model: "ANTHROPIC_MODEL" },
};

export default function ProviderKeys() {
  const [catalog, setCatalog] = useState(null);
  const [keys, setKeys] = useState([]);
  const [settings, setSettings] = useState({});
  const [usage, setUsage] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");

  const keyByName = useMemo(() => Object.fromEntries(keys.map((entry) => [entry.key, entry])), [keys]);

  const load = useCallback(async () => {
    const [modelsRes, keysRes, settingsRes] = await Promise.allSettled([
      fetch("/api/ai-models").then((r) => r.json()),
      fetch("/api/provider-keys").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]);
    if (modelsRes.status === "fulfilled") setCatalog(modelsRes.value);
    if (keysRes.status === "fulfilled") setKeys(keysRes.value.keys ?? []);
    if (settingsRes.status === "fulfilled") setSettings(settingsRes.value.settings ?? {});
    // usage is slow the first time; load it separately so it never blocks the section
    fetch("/api/usage")
      .then((r) => r.json())
      .then(setUsage)
      .catch(() => setUsage({ available: false }));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveKey = async (provider) => {
    const map = PROVIDER_KEY_MAP[provider];
    const value = (drafts[map.key] ?? "").trim();
    if (!value) return;
    setBusy(`${provider}:key`);
    setNote("");
    try {
      const res = await fetch("/api/provider-keys", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [map.key]: value }),
      });
      if (!res.ok) throw new Error(`save failed: ${res.status}`);
      const data = await res.json();
      setKeys(data.keys ?? []);
      setDrafts((prev) => ({ ...prev, [map.key]: "" }));
      setNote(`${provider} key saved to local .env (never leaves this machine). Re-checking models…`);
      const models = await fetch("/api/ai-models").then((r) => r.json());
      setCatalog(models);
    } catch (error) {
      setNote(`${provider}: ${error.message}`);
    } finally {
      setBusy("");
    }
  };

  const saveModel = async (provider, model) => {
    const map = PROVIDER_KEY_MAP[provider];
    if (!map?.model || !model) return;
    setBusy(`${provider}:model`);
    try {
      await fetch("/api/provider-keys", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [map.model]: model }),
      });
      setNote(`${provider} default model set to ${model}.`);
      const models = await fetch("/api/ai-models").then((r) => r.json());
      setCatalog(models);
    } catch (error) {
      setNote(`${provider}: ${error.message}`);
    } finally {
      setBusy("");
    }
  };

  const setDefaultProvider = async (provider, model) => {
    setBusy(`${provider}:default`);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ "llm.provider": provider, "llm.model": model ?? "" }),
      });
      const data = await res.json();
      setSettings(data.settings ?? {});
      setNote(`Default provider: ${provider}${model ? ` (${model})` : ""}. Playground and enrichment fall back to this.`);
    } catch (error) {
      setNote(`default: ${error.message}`);
    } finally {
      setBusy("");
    }
  };

  const providers = catalog?.providers ?? [];

  return (
    <Panel className="p-5">
      <div className="flex flex-col gap-3 border-b border-outlineVariant pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">providers</p>
          <h2 className="mt-1 flex items-center gap-2 font-display text-2xl font-bold text-paper">
            <KeyRound className="h-5 w-5 text-primary" aria-hidden="true" />
            Providers, keys &amp; models
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-paper/58">
            Keys are written to the git-ignored local <code>.env</code> and never returned to the browser — only masked tails. Model
            defaults apply immediately, no restart.
          </p>
        </div>
        {usage ? <UsageChip usage={usage} /> : null}
      </div>

      {note ? <p className="mt-3 text-sm font-bold text-primary">{note}</p> : null}

      <div className="mt-4 divide-y divide-outlineVariant">
        {providers.length === 0 ? (
          <p className="py-3 text-sm text-paper/54">Start the local API to manage providers.</p>
        ) : (
          providers.map((provider) => {
            const map = PROVIDER_KEY_MAP[provider.id];
            const keyEntry = map ? keyByName[map.key] : null;
            const isDefault = settings["llm.provider"] === provider.id;
            return (
              <div key={provider.id} className="grid gap-3 py-4 lg:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        provider.available ? "bg-signal" : provider.configured ? "bg-brass" : "bg-outlineVariant"
                      }`}
                      title={provider.available ? "available" : provider.configured ? "configured, models unreachable" : "no key"}
                    />
                    <h3 className="truncate text-base font-black text-paper">{provider.label}</h3>
                    {isDefault ? (
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.14em] text-primary">
                        default
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-paper/40">
                    {provider.configured ? `key ${keyEntry?.masked || "set"}` : "no key"} · {provider.models?.length ?? 0} models
                  </p>
                </div>

                {map ? (
                  <div className="flex min-w-0 items-center gap-2">
                    <input
                      type="password"
                      autoComplete="off"
                      value={drafts[map.key] ?? ""}
                      onChange={(event) => setDrafts((prev) => ({ ...prev, [map.key]: event.target.value }))}
                      placeholder={provider.configured ? `replace key (${keyEntry?.masked})` : "paste API key"}
                      className="min-w-0 flex-1 rounded-md border border-outlineVariant bg-surface px-3 py-2 font-mono text-xs text-paper placeholder:text-paper/32"
                    />
                    <button
                      type="button"
                      onClick={() => saveKey(provider.id)}
                      disabled={busy === `${provider.id}:key` || !(drafts[map.key] ?? "").trim()}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-outlineVariant text-paper/58 transition hover:border-outline hover:text-paper disabled:opacity-40"
                      aria-label={`Save ${provider.label} key`}
                    >
                      {busy === `${provider.id}:key` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-paper/44">Local CLI auth — no key needed here.</p>
                )}

                {provider.models?.length ? (
                  <select
                    value={provider.defaultModel || ""}
                    onChange={(event) => saveModel(provider.id, event.target.value)}
                    disabled={busy === `${provider.id}:model` || !map?.model}
                    className="w-full rounded-md border border-outlineVariant bg-surface px-3 py-2 text-xs font-bold text-paper"
                    aria-label={`${provider.label} default model`}
                  >
                    {!provider.defaultModel ? <option value="">choose model…</option> : null}
                    {provider.models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                    {provider.defaultModel && !provider.models.some((m) => m.id === provider.defaultModel) ? (
                      <option value={provider.defaultModel}>{provider.defaultModel}</option>
                    ) : null}
                  </select>
                ) : (
                  <p className="text-xs text-paper/38">{provider.configured ? "models unreachable" : "add a key to list models"}</p>
                )}

                <button
                  type="button"
                  onClick={() => setDefaultProvider(provider.id, provider.defaultModel)}
                  disabled={!provider.available || isDefault || busy === `${provider.id}:default`}
                  className={`flex items-center gap-1.5 rounded-md border px-3 py-2 font-mono text-[10px] font-black uppercase tracking-[0.12em] transition disabled:opacity-40 ${
                    isDefault ? "border-primary/40 bg-primaryContainer text-onPrimaryContainer" : "border-outlineVariant text-paper/58 hover:border-outline hover:text-paper"
                  }`}
                >
                  <Star className="h-3.5 w-3.5" aria-hidden="true" />
                  {isDefault ? "Default" : "Make default"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </Panel>
  );
}

function UsageChip({ usage }) {
  if (usage.pending) {
    return (
      <span className="flex items-center gap-2 rounded-full border border-outlineVariant bg-surfaceContainer px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/48">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        usage loading in background
      </span>
    );
  }
  if (!usage.available) {
    return (
      <span className="rounded-full border border-outlineVariant bg-surfaceContainer px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/44">
        ccusage unavailable
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2 rounded-full border border-signal/30 bg-signal/8 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-signal">
      <Activity className="h-3.5 w-3.5" aria-hidden="true" />
      Claude today: {(usage.today?.tokens ?? 0).toLocaleString()} tok · ${Number(usage.today?.cost ?? 0).toFixed(2)} · wk $
      {Number(usage.week?.totalCost ?? 0).toFixed(2)}
    </span>
  );
}

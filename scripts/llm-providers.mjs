import "./env.mjs";

import { DEFAULT_GEMINI_MODEL, geminiAvailable, geminiGenerate, listGeminiModels } from "./gemini.mjs";
import { DEFAULT_NIM_MODEL, listNimModels, nimAvailable, nimGenerate } from "./nim.mjs";
import { enrichActionWithGenerator } from "./gemini.mjs";
import { redactForLog } from "./redact.mjs";

const OPENAI_MODELS_ENDPOINT = process.env.OPENAI_MODELS_ENDPOINT || "https://api.openai.com/v1/models";
const OPENAI_CHAT_ENDPOINT = process.env.OPENAI_CHAT_ENDPOINT || "https://api.openai.com/v1/chat/completions";
const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL ?? "";

const ANTHROPIC_MODELS_ENDPOINT = process.env.ANTHROPIC_MODELS_ENDPOINT || "https://api.anthropic.com/v1/models";
const ANTHROPIC_MESSAGES_ENDPOINT = process.env.ANTHROPIC_MESSAGES_ENDPOINT || "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = process.env.ANTHROPIC_VERSION || "2023-06-01";
const DEFAULT_ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "";

const DEEPSEEK_MODELS_ENDPOINT = process.env.DEEPSEEK_MODELS_ENDPOINT || "https://api.deepseek.com/models";
const DEEPSEEK_CHAT_ENDPOINT = process.env.DEEPSEEK_CHAT_ENDPOINT || "https://api.deepseek.com/chat/completions";
const DEFAULT_DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

const quotaPattern = /429|quota|rate|resource exhausted/i;

function cleanError(error) {
  return redactForLog(String(error?.message ?? error));
}

function compactModels(models) {
  const seen = new Set();
  return models
    .map((model) => ({
      id: String(model.id ?? "").trim(),
      label: String(model.label ?? model.id ?? "").trim(),
      description: String(model.description ?? "").trim(),
      inputTokenLimit: model.inputTokenLimit ?? null,
      outputTokenLimit: model.outputTokenLimit ?? null,
      ownedBy: model.ownedBy ?? model.owned_by ?? "",
    }))
    .filter((model) => {
      if (!model.id || seen.has(model.id)) return false;
      seen.add(model.id);
      return true;
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

async function fetchOpenAiJson(url, key, timeoutMs) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`openai ${res.status}: ${redactForLog(text).slice(0, 240)}`);
  }
  return res.json();
}

async function listOpenAiModels({ timeoutMs = 12_000 } = {}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");
  const data = await fetchOpenAiJson(OPENAI_MODELS_ENDPOINT, key, timeoutMs);
  return (data?.data ?? []).map((model) => ({
    id: model.id,
    label: model.id,
    ownedBy: model.owned_by ?? "",
  }));
}

async function openAiGenerate(prompt, { system, model = DEFAULT_OPENAI_MODEL, timeoutMs = 30_000 } = {}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");
  if (!model) throw new Error("OPENAI_MODEL not set");

  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  const res = await fetch(OPENAI_CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: 1024 }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`openai ${res.status}: ${redactForLog(text).slice(0, 240)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("openai malformed response: missing choices[0].message.content");
  return content.trim();
}

async function listAnthropicModels({ timeoutMs = 12_000 } = {}) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  const url = new URL(ANTHROPIC_MODELS_ENDPOINT);
  url.searchParams.set("limit", "1000");
  const res = await fetch(url, {
    headers: {
      "x-api-key": key,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`anthropic ${res.status}: ${redactForLog(text).slice(0, 240)}`);
  }
  const data = await res.json();
  return (data?.data ?? []).map((model) => ({
    id: model.id,
    label: model.display_name ?? model.id,
    createdAt: model.created_at ?? "",
  }));
}

async function anthropicGenerate(prompt, { system, model = DEFAULT_ANTHROPIC_MODEL, timeoutMs = 30_000 } = {}) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  if (!model) throw new Error("ANTHROPIC_MODEL not set");

  const res = await fetch(ANTHROPIC_MESSAGES_ENDPOINT, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": ANTHROPIC_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      temperature: 0.2,
      ...(system ? { system } : {}),
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`anthropic ${res.status}: ${redactForLog(text).slice(0, 240)}`);
  }
  const data = await res.json();
  return (data?.content ?? [])
    .map((block) => (block?.type === "text" ? block.text ?? "" : ""))
    .join("")
    .trim();
}

async function listDeepSeekModels({ timeoutMs = 12_000 } = {}) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY not set");
  const res = await fetch(DEEPSEEK_MODELS_ENDPOINT, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`deepseek ${res.status}: ${redactForLog(text).slice(0, 240)}`);
  }
  const data = await res.json();
  return (data?.data ?? []).map((model) => ({
    id: model.id,
    label: model.id,
    ownedBy: model.owned_by ?? "deepseek",
  }));
}

async function deepSeekGenerate(prompt, { system, model = DEFAULT_DEEPSEEK_MODEL, timeoutMs = 45_000 } = {}) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY not set");
  if (!model) throw new Error("DEEPSEEK_MODEL not set");

  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  const res = await fetch(DEEPSEEK_CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: 1024 }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`deepseek ${res.status}: ${redactForLog(text).slice(0, 240)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("deepseek malformed response: missing choices[0].message.content");
  return content.trim();
}

const providers = [
  {
    id: "deepseek",
    label: "DeepSeek",
    defaultModel: DEFAULT_DEEPSEEK_MODEL,
    configured: () => Boolean(process.env.DEEPSEEK_API_KEY),
    listModels: listDeepSeekModels,
    generate: deepSeekGenerate,
  },
  {
    id: "gemini",
    label: "Google Gemini",
    defaultModel: DEFAULT_GEMINI_MODEL,
    configured: geminiAvailable,
    listModels: listGeminiModels,
    generate: (prompt, options) => geminiGenerate(prompt, options),
  },
  {
    id: "nim",
    label: "NVIDIA NIM",
    defaultModel: DEFAULT_NIM_MODEL,
    configured: nimAvailable,
    listModels: listNimModels,
    generate: (prompt, options) => nimGenerate(prompt, options),
  },
  {
    id: "openai",
    label: "OpenAI",
    defaultModel: DEFAULT_OPENAI_MODEL,
    configured: () => Boolean(process.env.OPENAI_API_KEY),
    listModels: listOpenAiModels,
    generate: openAiGenerate,
  },
  {
    id: "anthropic",
    label: "Anthropic Claude",
    defaultModel: DEFAULT_ANTHROPIC_MODEL,
    configured: () => Boolean(process.env.ANTHROPIC_API_KEY),
    listModels: listAnthropicModels,
    generate: anthropicGenerate,
  },
];

export function llmProviderDefinitions() {
  return providers.map(({ id, label, defaultModel }) => ({ id, label, defaultModel }));
}

export function providerCountsSeed() {
  return Object.fromEntries(providers.map((provider) => [provider.id, 0]));
}

export function llmAvailable() {
  return providers.some((provider) => provider.configured());
}

function findProvider(id) {
  return providers.find((provider) => provider.id === id);
}

export async function listAiModelCatalog() {
  const catalog = [];
  for (const provider of providers) {
    const configured = provider.configured();
    if (!configured) {
      catalog.push({
        id: provider.id,
        label: provider.label,
        configured: false,
        available: false,
        defaultModel: provider.defaultModel,
        models: [],
      });
      continue;
    }

    try {
      const models = compactModels(await provider.listModels());
      const defaultModel = provider.defaultModel || models[0]?.id || "";
      catalog.push({
        id: provider.id,
        label: provider.label,
        configured: true,
        available: models.length > 0,
        defaultModel,
        models,
      });
    } catch (error) {
      const fallback = provider.defaultModel ? [{ id: provider.defaultModel, label: provider.defaultModel, description: "Configured default" }] : [];
      catalog.push({
        id: provider.id,
        label: provider.label,
        configured: true,
        available: fallback.length > 0,
        defaultModel: provider.defaultModel,
        models: fallback,
        error: cleanError(error),
      });
    }
  }

  const first = catalog.find((provider) => provider.available && provider.defaultModel)
    ?? catalog.find((provider) => provider.available && provider.models.length);

  return {
    providers: catalog,
    defaultSelection: first
      ? {
          provider: first.id,
          model: first.defaultModel || first.models[0]?.id || "",
        }
      : null,
  };
}

export async function generateWithAvailableProvider(prompt, { system, provider: requestedProvider, model: requestedModel, timeoutMs } = {}) {
  const providerErrors = [];
  const candidates = requestedProvider
    ? [findProvider(requestedProvider)].filter(Boolean)
    : providers.filter((entry) => entry.configured());

  if (requestedProvider && candidates.length === 0) {
    throw new Error(`unknown_model_provider:${requestedProvider}`);
  }

  for (const provider of candidates) {
    if (!provider.configured()) {
      providerErrors.push({ provider: provider.id, error: `${provider.id}_key_missing` });
      continue;
    }
    const model = requestedModel || provider.defaultModel;
    try {
      const text = await provider.generate(prompt, { system, model, ...(timeoutMs ? { timeoutMs } : {}) });
      return { provider: provider.id, model, text };
    } catch (error) {
      providerErrors.push({ provider: provider.id, model, error: cleanError(error) });
      if (requestedProvider) break;
    }
  }

  const message = providerErrors.length
    ? providerErrors.map((entry) => `${entry.provider}: ${entry.error}`).join(" | ")
    : "no_llm_keys";
  const error = new Error(message);
  error.providerErrors = providerErrors;
  throw error;
}

export async function enrichActionWithAvailableProvider(action, selection = {}) {
  const providerErrors = [];
  const requestedProvider = String(selection.provider ?? "").trim();
  const requestedModel = String(selection.model ?? "").trim();
  const candidates = requestedProvider
    ? [findProvider(requestedProvider)].filter(Boolean)
    : providers.filter((provider) => provider.configured());

  if (requestedProvider && candidates.length === 0) {
    throw new Error(`unknown_model_provider:${requestedProvider}`);
  }

  for (const provider of candidates) {
    if (!provider.configured()) {
      providerErrors.push({ provider: provider.id, error: `${provider.id}_key_missing` });
      continue;
    }

    const model = requestedModel || provider.defaultModel;
    try {
      const fields = await enrichActionWithGenerator(action, (prompt, options) =>
        provider.generate(prompt, { ...options, model }),
      );
      return { provider: provider.id, model, fields };
    } catch (error) {
      providerErrors.push({ provider: provider.id, model, error: cleanError(error) });
      if (requestedProvider) break;
    }
  }

  const message = providerErrors.length
    ? providerErrors.map((entry) => `${entry.provider}: ${entry.error}`).join(" | ")
    : "no_llm_keys";
  const error = new Error(message);
  error.providerErrors = providerErrors;
  error.stoppedForQuota = providerErrors.some((entry) => quotaPattern.test(entry.error)) && !providers.some((provider) => provider.id !== "gemini" && provider.configured());
  throw error;
}

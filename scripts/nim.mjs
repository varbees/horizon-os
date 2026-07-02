import "./env.mjs";

import { redactForLog } from "./redact.mjs";

export const NIM_ENDPOINT = process.env.NVIDIA_NIM_ENDPOINT || "https://integrate.api.nvidia.com/v1/chat/completions";
export const DEFAULT_NIM_MODEL = process.env.NVIDIA_NIM_MODEL || "meta/llama-3.1-8b-instruct";
export const NIM_MODELS_ENDPOINT = process.env.NVIDIA_NIM_MODELS_ENDPOINT || modelsEndpointFromChatEndpoint(NIM_ENDPOINT);

export function modelsEndpointFromChatEndpoint(endpoint) {
  return String(endpoint).replace(/\/chat\/completions\/?$/, "/models");
}

export function nimAvailable() {
  return Boolean(process.env.NVIDIA_NIM_API_KEY);
}

export async function listNimModels({ timeoutMs = 12_000 } = {}) {
  const key = process.env.NVIDIA_NIM_API_KEY;
  if (!key) throw new Error("NVIDIA_NIM_API_KEY not set");

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(NIM_MODELS_ENDPOINT, {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` },
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`NIM models ${res.status}: ${redactForLog(text).slice(0, 240)}`);
    }
    const data = await res.json();
    return (data?.data ?? [])
      .map((model) => ({
        id: String(model.id ?? "").trim(),
        label: String(model.id ?? "").trim(),
        ownedBy: model.owned_by ?? model.ownedBy ?? "",
      }))
      .filter((model) => model.id);
  } finally {
    clearTimeout(id);
  }
}

export async function nimGenerate(prompt, { system, model = DEFAULT_NIM_MODEL, timeoutMs = 30_000 } = {}) {
  const key = process.env.NVIDIA_NIM_API_KEY;
  if (!key) throw new Error("NVIDIA_NIM_API_KEY not set");

  const messages = [];
  if (system) {
    messages.push({ role: "system", content: system });
  }
  messages.push({ role: "user", content: prompt });

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(NIM_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 1024,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`NIM ${res.status}: ${redactForLog(text).slice(0, 240)}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("NIM malformed response: missing choices[0].message.content");
    }
    return content.trim();
  } finally {
    clearTimeout(id);
  }
}

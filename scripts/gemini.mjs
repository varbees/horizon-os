import "./env.mjs";

// Dependency-free Gemini client (free-tier). Server-side only: the key lives in
// .env and is never sent to the browser. Used by small in-app workers that turn
// rough actions into runnable specs, rank money relevance, and draft offers.

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
const ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

export function geminiAvailable() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function geminiGenerate(prompt, { system, timeoutMs = 30_000 } = {}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
  };
  const res = await fetch(`${ENDPOINT(MODEL)}?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`gemini ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p) => p.text ?? "").join("").trim();
}

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON object in model output");
  return JSON.parse(raw.slice(start, end + 1));
}

// Turn a rough action into a runnable spec. Returns the enrichment fields.
export async function enrichAction(action) {
  const system =
    "You are Horizon OS's action-spec worker for a solo, faceless founder (no sales calls, no ads, low burn). " +
    "Turn a rough action into a precise, runnable agent task. Bias every output toward producing money, proof, or distribution. " +
    "Reply with ONLY a JSON object, no prose.";
  const prompt = [
    "Action title: " + (action.title ?? ""),
    "Summary: " + (action.summary ?? ""),
    "Project: " + (action.project_id ?? "") + " at " + (action.project_path ?? ""),
    "Existing prompt: " + (action.prompt ?? ""),
    "",
    "Return JSON with exactly these string fields:",
    '{ "goal": "one concrete outcome", "constraints": "3-5 newline-separated constraints", ' +
      '"done_criteria": "3-5 newline-separated, individually verifiable done checks", ' +
      '"tools": "newline-separated tools/files/commands to use", ' +
      '"prompt": "a tightened, self-contained agent prompt to achieve the goal" }',
  ].join("\n");

  const text = await geminiGenerate(prompt, { system });
  const obj = extractJson(text);
  return {
    goal: String(obj.goal ?? "").trim(),
    constraints: String(obj.constraints ?? "").trim(),
    done_criteria: String(obj.done_criteria ?? "").trim(),
    tools: String(obj.tools ?? "").trim(),
    prompt: String(obj.prompt ?? action.prompt ?? "").trim(),
  };
}

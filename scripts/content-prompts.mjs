import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

// The engine's own prompt library. Horizon stores versioned, two-audience, grounded-only prompts
// in /prompts, renders {{VARS}} from a content brief, and dispatches them to the right executor
// (Fable/Claude Code for research+narrative+asset-spec+editorial, Codex for implementation). The
// prompts are the engine's IP and the single source of truth that guides the agents — not a chat
// window.

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const promptsDir = resolve(repoRoot, "prompts");

// Minimal frontmatter parser: a leading `---` block of `key: value` lines, then the body.
function parsePrompt(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, template: raw };
  const meta = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { meta, template: match[2] };
}

// Resolve a key to a prompt file by, in order: exact filename, then frontmatter `id`, then
// frontmatter `lane`. This lets callers request a lane ("assemble") and get the prompt whose
// frontmatter declares that lane ("editorial.fable.md", lane: assemble) — not just a filename match.
function fileForId(key) {
  if (!existsSync(promptsDir)) return null;
  const files = readdirSync(promptsDir).filter((f) => f.endsWith(".md"));

  const byName = files.find((f) => f === `${key}.fable.md` || f === `${key}.codex.md` || f.startsWith(`${key}.`));
  if (byName) return join(promptsDir, byName);

  for (const file of files) {
    const { meta } = parsePrompt(readFileSync(join(promptsDir, file), "utf8"));
    if (meta.id === key || meta.lane === key) return join(promptsDir, file);
  }
  return null;
}

export function loadPrompt(id) {
  const file = fileForId(id);
  if (!file) return null;
  const { meta, template } = parsePrompt(readFileSync(file, "utf8"));
  return { id: meta.id || id, meta, template };
}

// Catalog for the Content drawer (metadata only, no template bodies).
export function listPrompts() {
  if (!existsSync(promptsDir)) return [];
  return readdirSync(promptsDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => parsePrompt(readFileSync(join(promptsDir, f), "utf8")).meta)
    .filter((m) => m.id)
    .sort((a, b) => String(a.lane).localeCompare(String(b.lane)));
}

export function renderTemplate(template, vars = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = vars[key];
    if (value === undefined || value === null) return "";
    return typeof value === "string" ? value : JSON.stringify(value);
  });
}

// Map a content_briefs row into the variables every lane prompt expects.
export function briefVars(brief, extra = {}) {
  const channels = safeJsonArray(brief.channels_json);
  return {
    ENGINE: brief.engine ?? "antharmaya_labs",
    TITLE: brief.title ?? "",
    SOURCE_ARTIFACT: brief.source_artifact ?? "",
    HOOK: brief.hook ?? "",
    AUDIENCE: brief.audience ?? "",
    CHANNELS: channels.join(", "),
    SERIES: brief.series ?? "",
    TONE: brief.tone ?? "",
    NOTES: brief.notes ?? "",
    RESEARCH_JSON: brief.research_json ?? "{}",
    ...extra,
  };
}

export function renderLanePrompt(laneId, brief, extra = {}) {
  const prompt = loadPrompt(laneId);
  if (!prompt) return null;
  return { ...prompt, rendered: renderTemplate(prompt.template, briefVars(brief, extra)) };
}

function safeJsonArray(value) {
  try {
    const parsed = JSON.parse(value ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

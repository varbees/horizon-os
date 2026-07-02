// Secure-ish local key store: reads/writes the git-ignored .env file so provider
// keys can be managed from the Connectors UI without ever leaving this machine.
// Values are never logged and never returned to the browser in full (masked tail only).

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");

// Only these env vars may be read (masked) or written from the API. Anything
// else is rejected — the UI cannot become an arbitrary-env editor.
export const MANAGED_ENV_KEYS = [
  "DEEPSEEK_API_KEY",
  "DEEPSEEK_MODEL",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "NVIDIA_NIM_API_KEY",
  "NVIDIA_NIM_MODEL",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_MODEL",
  "JULES_API_KEY",
];

const SECRET_PATTERN = /(KEY|TOKEN|SECRET)$/;

function maskValue(key, value) {
  if (!value) return "";
  if (!SECRET_PATTERN.test(key)) return value; // model names are not secrets
  return value.length > 4 ? `····${value.slice(-4)}` : "····";
}

export function managedEnvStatus() {
  return MANAGED_ENV_KEYS.map((key) => {
    const value = process.env[key] ?? "";
    return { key, configured: Boolean(value), masked: maskValue(key, value), secret: SECRET_PATTERN.test(key) };
  });
}

// Upsert entries into .env preserving existing lines/comments/order.
// Also applies to process.env immediately so no API restart is needed.
export function upsertManagedEnv(entries) {
  const updates = Object.entries(entries ?? {})
    .filter(([key]) => MANAGED_ENV_KEYS.includes(key))
    .map(([key, value]) => [key, String(value ?? "").trim()])
    .filter(([, value]) => value.length > 0 && value.length <= 512 && !/[\n\r]/.test(value));

  if (updates.length === 0) return { updated: [] };

  const lines = existsSync(envPath) ? readFileSync(envPath, "utf8").split("\n") : [];
  const seen = new Set();
  const nextLines = lines.map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=/);
    if (!match) return line;
    const hit = updates.find(([key]) => key === match[1]);
    if (!hit) return line;
    seen.add(hit[0]);
    return `${hit[0]}=${hit[1]}`;
  });
  for (const [key, value] of updates) {
    if (!seen.has(key)) nextLines.push(`${key}=${value}`);
  }
  writeFileSync(envPath, `${nextLines.join("\n").replace(/\n+$/, "")}\n`, { mode: 0o600 });

  for (const [key, value] of updates) process.env[key] = value;
  return { updated: updates.map(([key]) => key) };
}

// Mechanical metric for the "Executable Action Queue" autoresearch run.
// Prints a single integer = number of wired executable capabilities. Higher is better.

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => (existsSync(resolve(root, p)) ? readFileSync(resolve(root, p), "utf8") : "");

const db = read("scripts/horizon-db.mjs");
const api = read("scripts/horizon-api.mjs");
const drawer = read("src/routes/CommandCenter.jsx");
const client = read("src/lib/actionQueueApi.js");

const checks = [
  // executable schema fields
  ["schema:cwd", /ensureActionQueueColumns[\s\S]*?"cwd"/.test(db)],
  ["schema:goal", /ensureActionQueueColumns[\s\S]*?"goal"/.test(db)],
  ["schema:constraints", /ensureActionQueueColumns[\s\S]*?"constraints"/.test(db)],
  ["schema:done_criteria", /ensureActionQueueColumns[\s\S]*?"done_criteria"/.test(db)],
  ["schema:tools", /ensureActionQueueColumns[\s\S]*?"tools"/.test(db)],
  ["schema:spec_path", /ensureActionQueueColumns[\s\S]*?"spec_path"/.test(db)],
  ["schema:enriched", /ensureActionQueueColumns[\s\S]*?"enriched"/.test(db)],
  // runnable spec
  ["module:action-spec", existsSync(resolve(root, "scripts/action-spec.mjs"))],
  ["deploy:uses-spec", /buildRunnableSpec\(/.test(api)],
  // in-app gemini worker
  ["module:gemini", existsSync(resolve(root, "scripts/gemini.mjs"))],
  ["worker:enrichAction", /export async function enrichAction/.test(read("scripts/gemini.mjs"))],
  // api endpoints
  ["api:enrich", /\/enrich"\)/.test(api) || /endsWith\("\/enrich"\)/.test(api)],
  ["api:patch-rich-fields", /goal = \?, constraints = \?, done_criteria = \?/.test(api)],
  // client + ui
  ["client:enrich", /enrichActionWithGemini/.test(client)],
  ["ui:enrich-button", /Enrich with Gemini/.test(drawer)],
  ["ui:spec-blocks", /SpecBlock/.test(drawer)],
];

const passed = checks.filter(([, ok]) => ok);
if (process.argv.includes("--verbose")) {
  for (const [name, ok] of checks) console.error(`${ok ? "✓" : "✗"} ${name}`);
}
console.log(passed.length);

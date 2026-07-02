import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openHorizonDb } from "./horizon-db.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultReadmePath = () =>
  path.resolve(process.env.AWESOME_LLM_APPS_README ?? path.join(repoRoot, "..", "_external", "awesome-llm-apps", "README.md"));
const AWESOME_BASE_URL = "https://github.com/Shubhamsaboo/awesome-llm-apps/tree/main";

function slugify(value) {
  const slug = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "agent";
}

function cleanName(name) {
  return String(name ?? "")
    .replace(/^[^\w]+/u, "")
    .trim();
}

function cleanDescription(description) {
  return String(description ?? "")
    .replace(/<sub[\s\S]*?<\/sub>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function normalizeUrl(url) {
  const raw = String(url ?? "").trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  const cleaned = raw.replace(/^\.?\//, "").replace(/^\/+/, "");
  return `${AWESOME_BASE_URL}/${cleaned}`;
}

function inferRevenueModel(name, category) {
  const text = `${name} ${category}`.toLowerCase();
  if (/\brag\b|retrieval|search|knowledge|pdf|document/.test(text)) return "RAG-as-a-Service / Data Tooling";
  if (/agent team|agency|multi-agent|workflow|automation|enterprise/.test(text)) return "B2B SaaS / Enterprise Automation";
  if (/sales|lead|crm|email|content|marketing|social/.test(text)) return "Consulting / Productized Service";
  if (/code|dev|developer|github|repo|debug/.test(text)) return "Developer Tooling / Open-Core";
  return "Consulting / Productized Service";
}

export function parseAgentReadme(readmeContent) {
  const agents = [];
  let currentCategory = "General";

  for (const line of readmeContent.split("\n")) {
    if (line.startsWith("### ")) {
      currentCategory = line.replace(/^###\s+/, "").trim() || "General";
      continue;
    }

    const match = line.match(/^\*\s+\[(.*?)\]\((.*?)\)(?:\s*(.*))?$/);
    if (!match) continue;

    const name = cleanName(match[1]);
    if (!name) continue;
    const category = currentCategory;
    agents.push({
      id: `${slugify(category)}-${slugify(name)}`,
      name,
      description: cleanDescription(String(match[3] ?? "").replace(/^[-–:]\s*/, "")),
      category,
      revenue_model: inferRevenueModel(name, category),
      github_url: normalizeUrl(match[2]),
    });
  }

  return agents;
}

export function ingestAgents({ db: providedDb, readmePath = defaultReadmePath() } = {}) {
  const db = providedDb ?? openHorizonDb();
  const readmeContent = fs.readFileSync(readmePath, "utf8");
  const agents = parseAgentReadme(readmeContent);
  const categories = new Set();

  const upsert = db.prepare(`
    INSERT INTO agent_catalog (id, name, description, category, revenue_model, github_url)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      category = excluded.category,
      revenue_model = excluded.revenue_model,
      github_url = excluded.github_url
  `);

  for (const agent of agents) {
    categories.add(agent.category);
    upsert.run(agent.id, agent.name, agent.description, agent.category, agent.revenue_model, agent.github_url);
  }

  if (agents.length > 0) {
    const placeholders = agents.map(() => "?").join(", ");
    db.prepare(`DELETE FROM agent_catalog WHERE id NOT IN (${placeholders})`).run(...agents.map((agent) => agent.id));
  }

  if (!providedDb) db.close();
  return { ok: true, readmePath, scanned: agents.length, upserted: agents.length, categories: [...categories].sort() };
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  const result = ingestAgents();
  console.log(`Successfully upserted ${result.upserted} agents from ${result.categories.length} categories into the Agent Forge catalog.`);
}

import "./env.mjs";

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openHorizonDb } from "./horizon-db.mjs";
import { frontmatter, vaultRoot, writeNote } from "./vault.mjs";
import { rankActions } from "./ranking.mjs";
import { trustSummary } from "./trust.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const boltingRoot = resolve(repoRoot, "..", "..", "Desktop", "bolting");
const externalRoot = resolve(boltingRoot, "_external");

const REQUIRED_DIRS = [
  ".raw/horizon-intelligence",
  ".raw/horizon-ingest",
  ".raw/assets",
  ".vault-meta",
  "_attachments",
  "_templates",
  "wiki",
  "wiki/sources",
  "wiki/entities",
  "wiki/concepts",
  "wiki/domains",
  "wiki/comparisons",
  "wiki/questions",
  "wiki/meta",
];

const CORE_SOURCES = [
  {
    id: "karpathy-llm-wiki-pattern",
    title: "Karpathy LLM Wiki Pattern",
    kind: "pattern",
    sourceUrl: "https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f",
    sourcePath: "",
    tags: ["llm-wiki", "compound-memory", "schema"],
    summary:
      "Persistent raw-source plus generated-wiki plus schema pattern. The important move is compiling knowledge into maintained markdown pages instead of rediscovering chunks on every question.",
  },
  {
    id: "claude-obsidian",
    title: "claude-obsidian",
    kind: "reference-implementation",
    sourceUrl: "https://github.com/AgriciDaniel/claude-obsidian",
    sourcePath: resolve(externalRoot, "claude-obsidian"),
    tags: ["obsidian", "agent-skills", "wiki-workflow"],
    summary:
      "Ready-to-use Obsidian vault and agent-skill workflow for wiki ingest, query, lint, hot cache, index, log, locking, and retrieval. Horizon adapts the contract locally instead of importing it as a runtime.",
  },
  {
    id: "turbovec",
    title: "turbovec",
    kind: "retrieval-engine",
    sourceUrl: "https://github.com/RyanCodrai/turbovec",
    sourcePath: resolve(externalRoot, "turbovec"),
    tags: ["vector-search", "local-first", "retrieval"],
    summary:
      "Rust/Python TurboQuant vector index for local compressed semantic search. Horizon keeps BM25/markdown search now and reserves wiki_chunks plus embedding_id for a future turbovec-backed rerank adapter.",
  },
];

const MEMORY_BACKLOG = [
  {
    id: "source-coverage-pack",
    title: "Source Coverage Pack",
    status: "shipped",
    summary: "Curated ingest manifest for Horizon's highest-signal docs and project launch files.",
    done: "One command ingests or skips all registered sources and writes a coverage report.",
  },
  {
    id: "query-to-page-capture",
    title: "Query-To-Page Capture",
    status: "shipped",
    summary: "Save useful answers under wiki/questions so synthesis compounds instead of disappearing into chat.",
    done: "A question and answer can be filed back into memory with index, hot cache, log, and chunks updated.",
  },
  {
    id: "wiki-lint-repair-plan",
    title: "Wiki Lint And Repair Plan",
    status: "shipped",
    summary: "Turn graph health into actionable repairs for missing links, orphans, stale pages, and unresolved contradictions.",
    done: "npm run wiki:lint returns a machine-readable repair plan.",
  },
  {
    id: "agent-preflight-context-pack",
    title: "Agent Preflight Context Pack",
    status: "shipped",
    summary: "Attach relevant hot/index/search/action/dispatch/trust memory to runnable specs before external handoff.",
    done: "Every deploy/Jules spec includes relevant memory links and source paths after redaction.",
  },
  {
    id: "outcome-learning-loop",
    title: "Outcome Learning Loop",
    status: "next",
    summary: "Compile action completion, dispatch reconciliation, buyer signal, and money outcomes into project memory.",
    done: "Closed actions update wiki pages with what worked, failed, or changed.",
  },
  {
    id: "contradiction-resolution-workflow",
    title: "Contradiction Resolution Workflow",
    status: "next",
    summary: "Track contradiction status as open, resolved, or superseded without deleting the raw evidence trail.",
    done: "Contradictions link to affected pages and carry resolution state.",
  },
  {
    id: "retrieval-ladder-upgrade",
    title: "Retrieval Ladder Upgrade",
    status: "later",
    summary: "Improve chunk retrieval with contextual prefixes and BM25-style scoring before a turbovec adapter.",
    done: "Retrieval quality improves measurably without hosted vector infrastructure.",
  },
];

const DEFAULT_COVERAGE_SOURCES = [
  {
    id: "command-center",
    path: "COMMAND_CENTER.md",
    title: "Horizon Command Center Doctrine",
    tags: ["coverage", "horizon", "doctrine"],
  },
  {
    id: "horizon-v2-build-plan",
    path: "docs/horizon-v2-build-plan.md",
    title: "Horizon V2 Build Plan",
    tags: ["coverage", "horizon", "architecture"],
  },
  {
    id: "portfolio-monetization-map",
    path: "docs/portfolio-monetization-map.md",
    title: "Portfolio Monetization Map",
    tags: ["coverage", "portfolio", "money"],
  },
  {
    id: "photoselect-go-live",
    path: "docs/photoselect-go-live.md",
    title: "PhotoSelect Go Live",
    tags: ["coverage", "photoselect", "revenue-engine"],
  },
  {
    id: "revenue-engine-reset",
    path: "docs/revenue-engine-reset.md",
    title: "Revenue Engine Reset",
    tags: ["coverage", "money", "operating-model"],
  },
  {
    id: "living-memory-backlog",
    path: "docs/horizon-living-memory-backlog.md",
    title: "Horizon Living Memory Backlog",
    tags: ["coverage", "horizon", "memory"],
  },
  {
    id: "compound-wiki",
    path: "docs/horizon-compound-wiki.md",
    title: "Horizon Compound Wiki",
    tags: ["coverage", "horizon", "memory"],
  },
  {
    id: "photoselect-roadmap",
    path: "/home/driftr/Desktop/bolting/01-revenue/photoselect/agent_docs/roadmap.md",
    title: "PhotoSelect Roadmap",
    tags: ["coverage", "photoselect", "roadmap"],
  },
  {
    id: "rateguard-sdk-audit",
    path: "/home/driftr/Desktop/bolting/02-fast-cash/rateguard/README.md",
    title: "RateGuard SDK Readme",
    tags: ["coverage", "rateguard", "fast-cash"],
  },
];

function isoNow() {
  return new Date().toISOString();
}

function day() {
  return new Date().toISOString().slice(0, 10);
}

function hashText(text) {
  return createHash("sha256").update(text).digest("hex");
}

function jsonText(value) {
  return JSON.stringify(value ?? [], null, 0);
}

function safeAll(db, sql, ...params) {
  try {
    return db.prepare(sql).all(...params);
  } catch {
    return [];
  }
}

function safeGet(db, sql, ...params) {
  try {
    return db.prepare(sql).get(...params) ?? null;
  } catch {
    return null;
  }
}

function ensureDirs() {
  const root = vaultRoot();
  mkdirSync(root, { recursive: true });
  for (const dir of REQUIRED_DIRS) mkdirSync(resolve(root, dir), { recursive: true });
  return root;
}

function writeVaultFile(relPath, content) {
  return writeNote(relPath, content).path;
}

function pageTitle(path) {
  return path.split("/").pop().replace(/\.md$/i, "");
}

function fileTitle(title) {
  return String(title ?? "Untitled Source")
    .replace(/[\\/:*?"<>|#\[\]\n\r\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 96) || "Untitled Source";
}

function stripFrontmatter(content) {
  return String(content ?? "").replace(/^---[\s\S]*?---\s*/m, "");
}

function titleFromSource(content, sourcePath, explicitTitle) {
  if (explicitTitle?.trim()) return fileTitle(explicitTitle);
  const body = stripFrontmatter(content);
  const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) return fileTitle(heading);
  return fileTitle(basename(sourcePath, extname(sourcePath)).replace(/[-_]+/g, " "));
}

function pathHash(sourcePath) {
  return hashText(resolve(sourcePath)).slice(0, 16);
}

function sourceSummary(content) {
  const body = stripFrontmatter(content)
    .replace(/^#\s+.+$/m, "")
    .trim();
  const paragraph = body
    .split(/\n\n+/)
    .map((part) => part.trim())
    .find((part) => part && !part.startsWith("#") && !part.startsWith("|"));
  return (paragraph ?? "").replace(/\s+/g, " ").slice(0, 300);
}

function sourceHeadings(content) {
  const headings = [];
  const re = /^#{1,3}\s+(.+)$/gm;
  let match;
  while ((match = re.exec(stripFrontmatter(content)))) headings.push(match[1].trim());
  return headings.slice(0, 12);
}

function sourceSignals(content) {
  const lines = stripFrontmatter(content)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines
    .filter((line) =>
      /^(?:[-*]\s+|\d+\.\s+)?(?:next|todo|decision|blocker|risk|contradiction|conflicts?|supersedes|proof|buyer|revenue|action|deploy)\b/i.test(line),
    )
    .slice(0, 12);
}

function sourceContradictions(content) {
  const lines = stripFrontmatter(content)
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-*]\s+/, ""));
  const found = [];
  const clean = (line) => line.trim().replace(/^>\s*/, "").trim();
  for (let index = 0; index < lines.length; index += 1) {
    const line = clean(lines[index]);
    if (!line) continue;
    if (/^\[!contradiction\]/i.test(line)) {
      const next = clean(lines.slice(index + 1).find((candidate) => clean(candidate) && !/^\[!/.test(clean(candidate))) ?? "");
      if (next) found.push(next);
      continue;
    }
    if (/^(?:contradiction\s*:|conflicts?\s+with\b|supersedes\b|older note said\b)/i.test(line)) {
      found.push(line);
    }
  }
  return found.filter((line, index, all) => all.indexOf(line) === index).slice(0, 8);
}

function inferLinks(db, content, title) {
  const hay = `${title}\n${content}`.toLowerCase();
  const pages = safeAll(db, "SELECT title, path, kind FROM wiki_pages ORDER BY length(title) DESC");
  const links = [];
  for (const page of pages) {
    if (!page.title || page.title === title || page.title.length < 3) continue;
    if (hay.includes(page.title.toLowerCase()) && !links.includes(page.title)) links.push(page.title);
  }
  return links.slice(0, 16);
}

function readManifest() {
  const path = resolve(vaultRoot(), ".raw", ".manifest.json");
  if (!existsSync(path)) return { sources: {} };
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (!parsed.sources || typeof parsed.sources !== "object") return { sources: {} };
    return parsed;
  } catch {
    return { sources: {} };
  }
}

function writeManifest(manifest) {
  return writeVaultFile(".raw/.manifest.json", JSON.stringify(manifest, null, 2) + "\n");
}

function extractSummary(content) {
  const paragraph = content
    .split(/\n\n+/)
    .map((part) => part.trim())
    .find((part) => part && !part.startsWith("---") && !part.startsWith("#") && !part.startsWith("|"));
  return (paragraph ?? "").replace(/\s+/g, " ").slice(0, 220);
}

function extractLinks(content) {
  const links = new Set();
  const re = /\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g;
  let match;
  while ((match = re.exec(content))) links.add(match[1].trim());
  return [...links].filter(Boolean).sort();
}

function chunksFor(content, maxChars = 1200) {
  const blocks = content
    .replace(/^---[\s\S]*?---\s*/m, "")
    .split(/\n(?=##? )|\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const chunks = [];
  let current = "";
  for (const block of blocks) {
    if (current && current.length + block.length > maxChars) {
      chunks.push(current);
      current = "";
    }
    current = current ? `${current}\n\n${block}` : block;
  }
  if (current) chunks.push(current);
  return chunks.length ? chunks : [content.slice(0, maxChars)];
}

function upsertSource(db, source, rawPath, rawContent) {
  db.prepare(`
    INSERT INTO wiki_sources (
      id, title, kind, raw_path, source_path, source_url, content_hash,
      status, summary, tags_json, ingested_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      kind = excluded.kind,
      raw_path = excluded.raw_path,
      source_path = excluded.source_path,
      source_url = excluded.source_url,
      content_hash = excluded.content_hash,
      summary = excluded.summary,
      tags_json = excluded.tags_json,
      updated_at = excluded.updated_at
  `).run(
    source.id,
    source.title,
    source.kind,
    rawPath,
    source.sourcePath ?? "",
    source.sourceUrl ?? "",
    hashText(rawContent),
    source.summary,
    jsonText(source.tags),
    isoNow(),
    isoNow(),
  );
}

function indexPage(db, relPath, content, kind = "page", status = "seed", sourceCount = 0) {
  const links = extractLinks(content);
  db.prepare(`
    INSERT INTO wiki_pages (path, title, kind, status, summary, source_count, outbound_links_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(path) DO UPDATE SET
      title = excluded.title,
      kind = excluded.kind,
      status = excluded.status,
      summary = excluded.summary,
      source_count = excluded.source_count,
      outbound_links_json = excluded.outbound_links_json,
      updated_at = excluded.updated_at
  `).run(relPath, pageTitle(relPath), kind, status, extractSummary(content), sourceCount, jsonText(links), isoNow());

  db.prepare("DELETE FROM wiki_links WHERE from_path = ?").run(relPath);
  const insertLink = db.prepare("INSERT OR IGNORE INTO wiki_links (from_path, to_title, to_path, kind) VALUES (?, ?, ?, 'wikilink')");
  for (const link of links) insertLink.run(relPath, link, "");

  db.prepare("DELETE FROM wiki_chunks WHERE page_path = ?").run(relPath);
  const insertChunk = db.prepare(`
    INSERT INTO wiki_chunks (id, page_path, chunk_index, body, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  chunksFor(content).forEach((chunk, index) => {
    insertChunk.run(`wiki:${relPath}:${index}`, relPath, index, chunk, isoNow());
  });

  // Put generated wiki pages into Horizon's existing FTS surface too.
  try {
    db.prepare("DELETE FROM context_fts WHERE id = ?").run(`wiki:${relPath}`);
    db.prepare("INSERT INTO context_fts (id, kind, title, body, source) VALUES (?, ?, ?, ?, ?)").run(
      `wiki:${relPath}`,
      kind,
      pageTitle(relPath),
      content,
      "vault/wiki",
    );
  } catch {
    /* FTS is best-effort for older test DBs. */
  }
}

function writeIndexedPage(db, relPath, content, options = {}) {
  const path = writeVaultFile(relPath, content);
  indexPage(db, path, content, options.kind, options.status, options.sourceCount ?? 0);
  return path;
}

function sourceRawMarkdown(source) {
  return [
    frontmatter({
      type: "raw-source",
      title: JSON.stringify(source.title),
      source_url: source.sourceUrl ? JSON.stringify(source.sourceUrl) : "\"\"",
      source_path: source.sourcePath ? JSON.stringify(source.sourcePath) : "\"\"",
      captured: isoNow(),
      tags: `[${source.tags.map((tag) => `"${tag}"`).join(", ")}]`,
    }),
    `# ${source.title}`,
    "",
    source.summary,
    "",
    "## Why Horizon cares",
    source.id === "karpathy-llm-wiki-pattern"
      ? "This defines the raw source -> generated wiki -> schema loop Horizon needs for durable memory."
      : source.id === "claude-obsidian"
        ? "This gives operational conventions: hot cache, index, log, ingest/query/lint, lock discipline, and Obsidian-first markdown."
        : "This is the likely local vector layer once markdown and FTS are no longer enough.",
    "",
  ].join("\n");
}

function schemaMarkdown() {
  return [
    "# Horizon Wiki Schema",
    "",
    "Horizon maintains a persistent, compounding wiki inside this vault.",
    "",
    "## Layers",
    "",
    "- `.raw/` holds immutable raw sources. Agents may add source files, but never edit an existing raw source.",
    "- `wiki/` is generated synthesis. Agents may create and update these pages.",
    "- `WIKI.md` and `AGENTS.md` are the schema/rules layer. Any LLM can read them before editing.",
    "",
    "## Workflows",
    "",
    "1. Ingest: add a source to `.raw/`, create or update pages under `wiki/`, update `wiki/index.md`, `wiki/hot.md`, and `wiki/log.md`.",
    "2. Query: read `wiki/hot.md`, then `wiki/index.md`, then relevant pages. Good answers should become `wiki/questions/*` pages.",
    "3. Lint: find stale claims, orphan pages, dead wikilinks, missing entities, and contradiction callouts.",
    "",
    "## Horizon-specific rule",
    "",
    "The wiki must serve the money operating system: PhotoSelect, varbees/rateguard, buyer evidence, action quality, dispatch outcomes, and portfolio decisions. Do not turn this into a generic notes garden.",
    "",
    "## Retrieval ladder",
    "",
    "1. Hot cache and index for quick answers.",
    "2. Markdown/FTS search over generated pages.",
    "3. `wiki_chunks` plus local vector adapter when volume justifies it.",
    "4. `turbovec` is the preferred future vector candidate because it is local and supports stable IDs.",
    "",
  ].join("\n");
}

function agentMarkdown() {
  return [
    "# Horizon Vault Agent Instructions",
    "",
    "Read `WIKI.md`, `wiki/hot.md`, and `wiki/index.md` before editing this vault.",
    "",
    "Rules:",
    "",
    "- Preserve `.raw/` files as immutable evidence.",
    "- Prefer wikilinks like `[[Horizon OS]]` over path links.",
    "- Update existing pages before creating duplicates.",
    "- Keep pages atomic and short enough to maintain.",
    "- Record material changes in `wiki/log.md`.",
    "- If a source contradicts older synthesis, add a visible contradiction note instead of silently overwriting context.",
    "- Keep Horizon focused on money/proof/action. Park curiosity that does not improve a decision.",
    "",
  ].join("\n");
}

function currentState(db) {
  const actions = safeAll(db, "SELECT * FROM action_queue WHERE status != 'dismissed'");
  const ranked = rankActions(actions).slice(0, 5);
  const trust = trustSummary(db);
  const sources = safeAll(db, "SELECT * FROM project_sources WHERE enabled = 1 ORDER BY weight DESC, id");
  const dispatches = safeAll(db, "SELECT * FROM agent_dispatches WHERE reconciled_at = '' ORDER BY dispatched_at DESC");
  const outcomes = safeAll(db, "SELECT * FROM outcomes ORDER BY recorded_at DESC LIMIT 20");
  const events = safeAll(db, "SELECT * FROM work_events ORDER BY recorded_at DESC LIMIT 25");
  return { actions, ranked, trust, sources, dispatches, outcomes, events };
}

function overviewMarkdown(db) {
  const state = currentState(db);
  const next = state.ranked[0];
  return [
    frontmatter({
      type: "overview",
      title: "\"Horizon OS Overview\"",
      updated: isoNow(),
      tags: "[horizon, overview, operating-system]",
      status: "active",
    }),
    "# Horizon OS Overview",
    "",
    "Horizon OS is the local-first command base for converting project signals into money actions. The compound wiki is its durable memory layer.",
    "",
    "## Current operating doctrine",
    "",
    "- One revenue engine: [[PhotoSelect]].",
    "- One fast-cash lane: [[rateguard]].",
    "- Horizon improves itself only when it improves action quality, recall, or dispatch safety.",
    "",
    "## Next money move",
    next
      ? `- **${next.title}** (${next.project_id || "unknown project"}) - lane: ${next.lane || "unclassified"}, state: ${next.state || next.status || "captured"}.`
      : "- No ranked money move is currently available.",
    "",
    "## Trust strip",
    "",
    `- Loop ok: ${state.trust.loopOk ? "yes" : "no"}.`,
    `- Loop age: ${state.trust.loopAgeMinutes} minutes.`,
    `- Open dispatches: ${state.trust.openDispatches}.`,
    `- Horizon self WIP: ${state.trust.horizonSelfWip}.`,
    "",
    "## Knowledge backbone",
    "",
    "- [[LLM Wiki Pattern]] supplies the compounding memory model.",
    "- [[claude-obsidian]] supplies vault workflow conventions.",
    "- [[turbovec]] is the future local vector adapter once `wiki_chunks` volume justifies semantic retrieval.",
    "",
  ].join("\n");
}

function hotMarkdown(db) {
  const state = currentState(db);
  const next = state.ranked[0];
  const latestIngest = safeGet(db, "SELECT * FROM wiki_runs WHERE kind = 'ingest' ORDER BY created_at DESC LIMIT 1");
  const latestCapture = safeGet(db, "SELECT * FROM wiki_runs WHERE kind = 'query-capture' ORDER BY created_at DESC LIMIT 1");
  let ingestPayload = null;
  let capturePayload = null;
  if (latestIngest?.payload_json) {
    try {
      ingestPayload = JSON.parse(latestIngest.payload_json);
    } catch {
      ingestPayload = null;
    }
  }
  if (latestCapture?.payload_json) {
    try {
      capturePayload = JSON.parse(latestCapture.payload_json);
    } catch {
      capturePayload = null;
    }
  }
  return [
    frontmatter({
      type: "meta",
      title: "\"Hot Cache\"",
      updated: isoNow(),
      tags: "[horizon, hot-cache]",
      status: "active",
    }),
    "# Recent Context",
    "",
    `## Last Updated`,
    `${day()} - Horizon compound wiki sync.`,
    "",
    "## Key Recent Facts",
    "- Horizon now has a persistent wiki layer: `.raw/`, `wiki/`, schema files, SQLite page/source/link/chunk tracking.",
    "- The wiki is model-agnostic. Claude, Codex, Gemini, Jules handoffs, or any local agent can read the same schema.",
    "- Retrieval starts with hot/index/markdown search and can later route `wiki_chunks` through turbovec.",
    ingestPayload
      ? `- Latest ingest: [[${ingestPayload.title}]] from \`${ingestPayload.rawPath}\`.`
      : "- No operator-ingested source has been compiled yet.",
    capturePayload
      ? `- Latest captured answer: [[${capturePayload.title}]] for "${capturePayload.question}".`
      : "- No operator answer has been captured into `wiki/questions/` yet.",
    "",
    "## Current Next Move",
    next
      ? `- ${next.title} (${next.project_id || "unknown project"}).`
      : "- No next move ranked yet.",
    "",
    "## Open Questions",
    "- Which sources should be ingested first beyond Horizon docs, PhotoSelect go-live docs, and varbees/rateguard launch material?",
    "- When wiki volume is high enough, install/build the turbovec adapter and embed `wiki_chunks`.",
    "",
    "## Living Memory Backlog",
    ...MEMORY_BACKLOG.filter((item) => item.status !== "shipped").slice(0, 4).map((item) => `- [[Living Memory Backlog]]: ${item.title} - ${item.summary}`),
    "",
  ].join("\n");
}

function indexMarkdown(db, pages) {
  const byKind = new Map();
  for (const page of pages) {
    if (!byKind.has(page.kind)) byKind.set(page.kind, []);
    byKind.get(page.kind).push(page);
  }
  const sections = [...byKind.entries()].sort(([a], [b]) => a.localeCompare(b)).flatMap(([kind, rows]) => [
    `## ${kind}`,
    "",
    ...rows
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((page) => `- [[${page.title}]]: ${page.summary || "Generated Horizon wiki page."}`),
    "",
  ]);
  return [
    frontmatter({
      type: "meta",
      title: "\"Wiki Index\"",
      updated: isoNow(),
      tags: "[horizon, index]",
      status: "active",
    }),
    "# Wiki Index",
    "",
    "Content-oriented map of Horizon's generated wiki. Read this before drilling into individual pages.",
    "",
    ...sections,
  ].join("\n");
}

function conceptPages() {
  return [
    {
      path: "wiki/concepts/LLM Wiki Pattern.md",
      kind: "concept",
      content: [
        frontmatter({
          type: "concept",
          title: "\"LLM Wiki Pattern\"",
          updated: isoNow(),
          tags: "[llm-wiki, memory, horizon]",
          status: "seed",
        }),
        "# LLM Wiki Pattern",
        "",
        "The LLM wiki pattern keeps three layers: immutable raw sources, agent-written wiki synthesis, and a schema that tells every LLM how to maintain the system.",
        "",
        "For Horizon, this beats plain RAG because the work compounds. Contradictions, cross-links, project decisions, and buyer evidence are maintained once instead of re-derived every time.",
        "",
        "Related: [[Compound Horizon Memory]], [[Retrieval Ladder]], [[Karpathy LLM Wiki Pattern]].",
        "",
      ].join("\n"),
    },
    {
      path: "wiki/concepts/Compound Horizon Memory.md",
      kind: "concept",
      content: [
        frontmatter({
          type: "concept",
          title: "\"Compound Horizon Memory\"",
          updated: isoNow(),
          tags: "[horizon, memory, obsidian]",
          status: "seed",
        }),
        "# Compound Horizon Memory",
        "",
        "Compound Horizon Memory is the bridge between the action queue and the wiki. Actions, dispatches, outcomes, sources, and operator decisions become pages that can be searched and revised.",
        "",
        "The point is not to remember everything. The point is to preserve the synthesis that improves tomorrow's money decision.",
        "",
        "Related: [[Horizon OS]], [[LLM Wiki Pattern]], [[claude-obsidian]].",
        "",
      ].join("\n"),
    },
    {
      path: "wiki/concepts/Retrieval Ladder.md",
      kind: "concept",
      content: [
        frontmatter({
          type: "concept",
          title: "\"Retrieval Ladder\"",
          updated: isoNow(),
          tags: "[retrieval, turbovec, local-first]",
          status: "seed",
        }),
        "# Retrieval Ladder",
        "",
        "Horizon's retrieval ladder starts simple and earns complexity:",
        "",
        "1. `wiki/hot.md` for current context.",
        "2. `wiki/index.md` for a content map.",
        "3. SQLite FTS and markdown scoring over generated wiki pages.",
        "4. `wiki_chunks` reranked by a local vector adapter.",
        "5. [[turbovec]] as the preferred compressed local vector candidate when scale justifies it.",
        "",
        "Related: [[LLM Wiki Pattern]], [[turbovec]].",
        "",
      ].join("\n"),
    },
    {
      path: "wiki/concepts/Agent Workflow Memory.md",
      kind: "concept",
      content: [
        frontmatter({
          type: "concept",
          title: "\"Agent Workflow Memory\"",
          updated: isoNow(),
          tags: "[agents, workflows, memory]",
          status: "seed",
        }),
        "# Agent Workflow Memory",
        "",
        "Agent Workflow Memory means every local or remote agent reads the same durable operating context before it acts: schema, hot cache, index, relevant pages, and dispatch history.",
        "",
        "This is how Horizon becomes an organism instead of a dashboard. The action queue, external agent outbox, Obsidian graph, and generated wiki all point at the same goals.",
        "",
        "Related: [[Dispatch Memory]], [[Compound Horizon Memory]], [[Retrieval Ladder]].",
        "",
      ].join("\n"),
    },
  ];
}

function entityPages() {
  return [
    {
      path: "wiki/entities/Horizon OS.md",
      kind: "entity",
      content: [
        frontmatter({
          type: "entity",
          title: "\"Horizon OS\"",
          updated: isoNow(),
          tags: "[horizon, local-first, command-base]",
          status: "active",
        }),
        "# Horizon OS",
        "",
        "Horizon OS is the local command base for the Antharmaya foundry. It combines SQLite state, project sweeps, action ranking, agent dispatch, vault sync, and now a compounding wiki.",
        "",
        "The wiki layer makes Horizon less dependent on chat history. Every agent can read the same durable synthesis before acting.",
        "",
        "Related: [[Compound Horizon Memory]], [[LLM Wiki Pattern]], [[Retrieval Ladder]].",
        "",
      ].join("\n"),
    },
    {
      path: "wiki/entities/claude-obsidian.md",
      kind: "entity",
      content: [
        frontmatter({
          type: "entity",
          title: "\"claude-obsidian\"",
          updated: isoNow(),
          tags: "[obsidian, reference-implementation]",
          status: "reference",
        }),
        "# claude-obsidian",
        "",
        "claude-obsidian is the local reference implementation for Obsidian-based LLM wiki workflows. Horizon borrows its schema shape and workflow language, not its runtime.",
        "",
        "Useful borrowed ideas: hot cache, index, log, source manifest, ingest/query/lint workflows, and eventually BM25 plus rerank retrieval.",
        "",
        "Related: [[LLM Wiki Pattern]], [[Compound Horizon Memory]].",
        "",
      ].join("\n"),
    },
    {
      path: "wiki/entities/turbovec.md",
      kind: "entity",
      content: [
        frontmatter({
          type: "entity",
          title: "\"turbovec\"",
          updated: isoNow(),
          tags: "[vector-search, retrieval, local-first]",
          status: "candidate",
        }),
        "# turbovec",
        "",
        "turbovec is a local TurboQuant vector index with stable-ID support through `IdMapIndex`. For Horizon, it is a candidate adapter for reranking `wiki_chunks` without a hosted vector database.",
        "",
        "Do not install it into the secrets-holding daemon by default. Add it behind a separate adapter once wiki volume makes semantic search worth the dependency.",
        "",
        "Related: [[Retrieval Ladder]], [[Compound Horizon Memory]].",
        "",
      ].join("\n"),
    },
  ];
}

function liveEntityPages(db) {
  const actionCount = (slug) =>
    safeGet(db, "SELECT COUNT(*) AS n FROM action_queue WHERE project_id LIKE ? AND status != 'dismissed'", `%${slug}%`)?.n ?? 0;
  const sourceFor = (slug) =>
    safeGet(db, "SELECT * FROM project_sources WHERE id LIKE ? OR root LIKE ? ORDER BY weight DESC LIMIT 1", `%${slug}%`, `%${slug}%`);
  const photoSource = sourceFor("photoselect") ?? {};
  const rateSource = sourceFor("rateguard") ?? sourceFor("varbees") ?? {};
  return [
    {
      path: "wiki/entities/PhotoSelect.md",
      kind: "entity",
      content: [
        frontmatter({
          type: "entity",
          title: "\"PhotoSelect\"",
          updated: isoNow(),
          tags: "[photoselect, revenue-engine, horizon]",
          status: "active",
        }),
        "# PhotoSelect",
        "",
        "PhotoSelect is Horizon's primary revenue engine. The wiki should preserve launch decisions, credential blockers, buyer evidence, studio feedback, pricing decisions, and production verification.",
        "",
        "## Current memory",
        `- Source registry lane: ${photoSource.lane || "unregistered"}.`,
        `- Source registry weight: ${photoSource.weight ?? 0}.`,
        `- Open action count: ${actionCount("photoselect")}.`,
        "",
        "Related: [[Horizon OS]], [[Money Lanes]], [[Action Memory]].",
        "",
      ].join("\n"),
    },
    {
      path: "wiki/entities/rateguard.md",
      kind: "entity",
      content: [
        frontmatter({
          type: "entity",
          title: "\"rateguard\"",
          updated: isoNow(),
          tags: "[rateguard, varbees, fast-cash, horizon]",
          status: "active",
        }),
        "# rateguard",
        "",
        "rateguard is Horizon's fast-cash open-core lane. The wiki should preserve SDK state, buyer signal, public-core decisions, hosted-dashboard gates, and first-dollar evidence.",
        "",
        "## Current memory",
        `- Source registry lane: ${rateSource.lane || "unregistered"}.`,
        `- Source registry weight: ${rateSource.weight ?? 0}.`,
        `- Open action count: ${actionCount("rateguard") + actionCount("varbees")}.`,
        "",
        "Related: [[Horizon OS]], [[Money Lanes]], [[Action Memory]].",
        "",
      ].join("\n"),
    },
  ];
}

function liveOperatingPages(db) {
  const state = currentState(db);
  const sourceRows = state.sources.length
    ? state.sources.map((source) => `| ${source.id} | ${source.lane || "other"} | ${source.weight ?? 0} | ${source.root || ""} |`)
    : ["| none | other | 0 | |"];
  const actionRows = state.ranked.length
    ? state.ranked.map((action, index) => `${index + 1}. **${action.title}** - ${action.project_id || "unknown"} (${action.lane || "unclassified"}, ${action.state || action.status || "captured"}, score ${action.priority_score ?? 0})`)
    : ["No ranked actions available."];
  const dispatchRows = state.dispatches.length
    ? state.dispatches.map((dispatch) => `- ${dispatch.agent || "agent"} ${dispatch.external_state || "unknown"} - action ${dispatch.action_id || "unknown"} (${dispatch.external_id || "no external id"})`)
    : ["- No open dispatches."];
  const eventRows = state.events.length
    ? state.events.map((event) => `- ${event.recorded_at || event.occurred_at || "undated"} - **${event.kind || "event"}** ${event.project_id || ""}`)
    : ["- No work events recorded yet."];
  const outcomeRows = state.outcomes.length
    ? state.outcomes.map((outcome) => `- ${outcome.occurred_at || outcome.recorded_at || "undated"} - **${outcome.kind || "outcome"}** ${outcome.project_id || ""} ${outcome.amount_cents ? `${outcome.amount_cents} ${outcome.currency}` : ""}`)
    : ["- No outcomes recorded yet."];

  return [
    {
      path: "wiki/domains/Money Lanes.md",
      kind: "domain",
      content: [
        frontmatter({
          type: "domain",
          title: "\"Money Lanes\"",
          updated: isoNow(),
          tags: "[horizon, money, lanes]",
          status: "active",
        }),
        "# Money Lanes",
        "",
        "Horizon's wiki exists to improve money decisions, not to collect generic notes.",
        "",
        "## Active rule",
        "- [[PhotoSelect]] is the revenue engine.",
        "- [[rateguard]] is the fast-cash open-core lane.",
        "- A third lane stays blocked until one of these pays or produces buyer evidence strong enough to replace a lane.",
        "",
        "## Source registry",
        "| Source | Lane | Weight | Root |",
        "| --- | --- | ---: | --- |",
        ...sourceRows,
        "",
        "Related: [[Horizon OS]], [[Action Memory]], [[Compound Horizon Memory]].",
        "",
      ].join("\n"),
    },
    {
      path: "wiki/domains/Action Memory.md",
      kind: "domain",
      content: [
        frontmatter({
          type: "domain",
          title: "\"Action Memory\"",
          updated: isoNow(),
          tags: "[horizon, actions, money]",
          status: "active",
        }),
        "# Action Memory",
        "",
        "Action Memory compiles the queue into durable context so each agent starts from the same ranked operating picture.",
        "",
        "## Ranked next moves",
        ...actionRows,
        "",
        "## Trust strip",
        `- Loop ok: ${state.trust.loopOk ? "yes" : "no"}.`,
        `- Loop age: ${state.trust.loopAgeMinutes} minutes.`,
        `- Open dispatches: ${state.trust.openDispatches}.`,
        `- Horizon self WIP: ${state.trust.horizonSelfWip}.`,
        "",
        "Related: [[Money Lanes]], [[Dispatch Memory]], [[Compound Horizon Memory]].",
        "",
      ].join("\n"),
    },
    {
      path: "wiki/domains/Dispatch Memory.md",
      kind: "domain",
      content: [
        frontmatter({
          type: "domain",
          title: "\"Dispatch Memory\"",
          updated: isoNow(),
          tags: "[horizon, agents, dispatch]",
          status: "active",
        }),
        "# Dispatch Memory",
        "",
        "Dispatch Memory keeps external agent work from disappearing into remote sessions. Jules dispatch remains operator-triggered and plan-gated; Horizon records the outbox and reconciliation state.",
        "",
        "## Open dispatches",
        ...dispatchRows,
        "",
        "Related: [[Horizon OS]], [[Action Memory]], [[Agent Workflow Memory]].",
        "",
      ].join("\n"),
    },
    {
      path: "wiki/domains/Work Event Ledger.md",
      kind: "domain",
      content: [
        frontmatter({
          type: "domain",
          title: "\"Work Event Ledger\"",
          updated: isoNow(),
          tags: "[horizon, work-events, outcomes]",
          status: "active",
        }),
        "# Work Event Ledger",
        "",
        "This page compiles recent append-only work events and outcomes into the wiki layer. It is the bridge from SQLite event spine to human-readable memory.",
        "",
        "## Recent work events",
        ...eventRows,
        "",
        "## Recent outcomes",
        ...outcomeRows,
        "",
        "Related: [[Compound Horizon Memory]], [[Action Memory]].",
        "",
      ].join("\n"),
    },
  ];
}

function sourcePages() {
  return CORE_SOURCES.map((source) => ({
    path: `wiki/sources/${source.title}.md`,
    kind: "source",
    source,
    content: [
      frontmatter({
        type: "source",
        title: JSON.stringify(source.title),
        updated: isoNow(),
        source_url: source.sourceUrl ? JSON.stringify(source.sourceUrl) : "\"\"",
        source_path: source.sourcePath ? JSON.stringify(source.sourcePath) : "\"\"",
        tags: `[${source.tags.map((tag) => `"${tag}"`).join(", ")}]`,
        status: "active",
      }),
      `# ${source.title}`,
      "",
      source.summary,
      "",
      "## Horizon integration",
      source.id === "karpathy-llm-wiki-pattern"
        ? "Use as the schema-level design contract for raw sources, generated wiki pages, log, index, and hot cache."
        : source.id === "claude-obsidian"
          ? "Use as a reference for workflows and Obsidian conventions. Reimplement only the narrow parts Horizon needs."
          : "Keep as a future vector adapter. The current implementation creates `wiki_chunks` and searchable markdown first.",
      "",
      "## Links",
      "- [[LLM Wiki Pattern]]",
      "- [[Compound Horizon Memory]]",
      "",
    ].join("\n"),
  }));
}

function dashboardMarkdown(db) {
  const pages = safeGet(db, "SELECT COUNT(*) AS n FROM wiki_pages")?.n ?? 0;
  const sources = safeGet(db, "SELECT COUNT(*) AS n FROM wiki_sources")?.n ?? 0;
  const chunks = safeGet(db, "SELECT COUNT(*) AS n FROM wiki_chunks")?.n ?? 0;
  const health = lintWiki(db);
  return [
    frontmatter({
      type: "meta",
      title: "\"Wiki Dashboard\"",
      updated: isoNow(),
      tags: "[horizon, dashboard]",
      status: "active",
    }),
    "# Wiki Dashboard",
    "",
    `- Sources tracked: ${sources}`,
    `- Pages indexed: ${pages}`,
    `- Chunks ready for future vector adapter: ${chunks}`,
    `- Missing wikilinks: ${health.missingLinks.length}`,
    `- Orphan pages: ${health.orphanPages.length}`,
    `- Repair actions: ${health.repairs.length}`,
    "",
    "## Dataview",
    "",
    "```dataview",
    "TABLE type, status, updated FROM \"wiki\" SORT updated DESC LIMIT 20",
    "```",
    "",
  ].join("\n");
}

function memoryBacklogMarkdown() {
  const rows = MEMORY_BACKLOG.map((item, index) => [
    `## ${index + 1}. ${item.title}`,
    "",
    `- Status: ${item.status}`,
    `- Summary: ${item.summary}`,
    `- Done: ${item.done}`,
    "",
  ].join("\n"));
  return [
    frontmatter({
      type: "meta",
      title: "\"Living Memory Backlog\"",
      updated: isoNow(),
      tags: "[horizon, memory, backlog]",
      status: "active",
    }),
    "# Living Memory Backlog",
    "",
    "Task list for the Horizon OS living-memory conversation. This is the path from the current compound wiki into an agent memory system that improves action quality over time.",
    "",
    "## Already shipped",
    "",
    "- [[Compound Horizon Memory]] base: schema, vault sync, hot cache, index, log, graph, chunks, API, CLI, and loop sync.",
    "- Deterministic source ingest: raw evidence copy, source synthesis page, manifest skip, wikilinks, contradiction marker extraction.",
    "- Source Coverage Pack: curated high-signal docs ingest, coverage report, CLI/API/UI trigger.",
    "- Query-To-Page Capture: useful answers filed under `wiki/questions/` with index, hot cache, log, and chunks updated.",
    "- Wiki Lint And Repair Plan: machine-readable repairs plus `wiki/meta/Wiki Repair Plan.md`.",
    "- Agent Preflight Context Pack: deploy/Jules specs include wiki hot/index/search hits, action row, dispatch history, and trust state after redaction.",
    "",
    ...rows,
    "## Refuse for now",
    "",
    "- Remote vector database.",
    "- Auto-dispatching repo writes without operator review.",
    "- Dashboard-only features that do not improve memory, action quality, or money decisions.",
    "- Blind ingest of every file in `~/Desktop/bolting`.",
    "",
    "Related: [[Compound Horizon Memory]], [[Agent Workflow Memory]], [[Retrieval Ladder]], [[Action Memory]].",
    "",
  ].join("\n");
}

export function lintWiki(db) {
  const root = vaultRoot();
  const pages = safeAll(db, "SELECT path, title, kind, updated_at FROM wiki_pages");
  const links = safeAll(db, "SELECT from_path, to_title FROM wiki_links");
  const titles = new Set(pages.map((page) => page.title));
  const inbound = new Set(links.map((link) => link.to_title));
  const graphTopicTitles = new Set(pages.filter((page) => ["entity", "concept", "domain"].includes(page.kind)).map((page) => page.title));
  const missingLinks = links
    .filter((link) => link.to_title && !titles.has(link.to_title))
    .map((link) => ({ from: link.from_path, to: link.to_title }))
    .slice(0, 20);
  const missingFiles = pages
    .filter((page) => !existsSync(resolve(root, page.path)))
    .map((page) => ({ path: page.path, title: page.title, kind: page.kind }))
    .slice(0, 20);
  const orphanPages = pages
    .filter((page) => !["meta", "overview", "source"].includes(page.kind) && !inbound.has(page.title))
    .map((page) => ({ path: page.path, title: page.title, kind: page.kind }))
    .slice(0, 20);
  const sourcePagesWithoutEntityLinks = pages
    .filter((page) => page.kind === "source" && page.path.startsWith("wiki/sources/"))
    .filter((page) => !links.some((link) => link.from_path === page.path && graphTopicTitles.has(link.to_title)))
    .map((page) => ({ path: page.path, title: page.title }))
    .slice(0, 20);
  const unresolvedContradictions = [];
  const contradictionPath = resolve(root, "wiki", "meta", "contradictions.md");
  if (existsSync(contradictionPath)) {
    const lines = readFileSync(contradictionPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      if (!/^-\s+\[\[.+?\]\]:/.test(line)) continue;
      if (/\b(status|resolved|superseded)\b/i.test(line)) continue;
      unresolvedContradictions.push({ line: line.replace(/^-\s+/, "").trim() });
      if (unresolvedContradictions.length >= 20) break;
    }
  }
  const repairs = [
    ...missingLinks.map((item, index) => ({
      id: `missing-link:${index + 1}`,
      type: "missing-link",
      severity: "high",
      target: item.to,
      from: item.from,
      action: `Create or rename a wiki page for \`${item.to}\`, or remove the stale link from ${item.from}.`,
    })),
    ...missingFiles.map((item, index) => ({
      id: `missing-file:${index + 1}`,
      type: "missing-file",
      severity: "high",
      target: item.path,
      action: `Regenerate ${item.path} or remove the stale wiki_pages row by running wiki sync.`,
    })),
    ...orphanPages.map((item, index) => ({
      id: `orphan-page:${index + 1}`,
      type: "orphan-page",
      severity: "medium",
      target: item.path,
      action: `Add an inbound wikilink to [[${item.title}]] from a relevant domain, entity, or question page.`,
    })),
    ...sourcePagesWithoutEntityLinks.map((item, index) => ({
      id: `source-without-entity:${index + 1}`,
      type: "source-without-entity",
      severity: "medium",
      target: item.path,
      action: `Link ${item.path} to at least one entity, concept, or domain page so source evidence joins the operating graph.`,
    })),
    ...unresolvedContradictions.map((item, index) => ({
      id: `unresolved-contradiction:${index + 1}`,
      type: "unresolved-contradiction",
      severity: "high",
      target: item.line,
      action: "Resolve or supersede this contradiction in the affected entity/domain page while preserving the raw evidence.",
    })),
  ];
  return {
    pages: pages.length,
    links: links.length,
    missingLinks,
    missingFiles,
    orphanPages,
    sourcePagesWithoutEntityLinks,
    unresolvedContradictions,
    repairs,
    ok: missingLinks.length === 0 && missingFiles.length === 0,
    needsAttention: repairs.length > 0,
  };
}

function logEntry(result) {
  return [
    `## [${day()}] sync | Horizon compound wiki`,
    `- Sources tracked: ${result.sources}`,
    `- Pages written: ${result.files.length}`,
    `- Search: markdown + SQLite FTS now; turbovec adapter later.`,
    "",
  ].join("\n");
}

function ingestLogEntry(result) {
  return [
    `## [${day()}] ingest | ${result.title}`,
    `- Source: \`${result.rawPath}\``,
    `- Summary: [[${result.title}]]`,
    `- Pages updated: ${result.files.map((file) => `\`${file}\``).join(", ")}`,
    `- Key insight: ${result.summary || "Source compiled into Horizon memory."}`,
    "",
  ].join("\n");
}

function questionLogEntry(result) {
  return [
    `## [${day()}] query | ${result.title}`,
    `- Question page: \`${result.path}\``,
    `- Related pages: ${result.related.map((page) => `[[${wikiLinkTitle(page.title)}]]`).join(", ") || "none"}`,
    `- Summary: ${result.question}`,
    "",
  ].join("\n");
}

function lintLogEntry(result) {
  return [
    `## [${day()}] lint | Wiki repair plan`,
    `- Repairs: ${result.repairs.length}`,
    `- Missing links: ${result.missingLinks.length}`,
    `- Orphans: ${result.orphanPages.length}`,
    `- Report: \`wiki/meta/Wiki Repair Plan.md\``,
    "",
  ].join("\n");
}

function sourcePageMarkdown({ title, sourcePath, rawPath, contentHash, summary, links, headings, signals, contradictions, tags }) {
  const linkRows = links.length ? links.map((link) => `- [[${link}]]`) : ["- No existing wiki entities mentioned yet."];
  const headingRows = headings.length ? headings.map((heading) => `- ${heading}`) : ["- No headings found."];
  const signalRows = signals.length ? signals.map((signal) => `- ${signal}`) : ["- No explicit action/decision/risk signals found."];
  const contradictionRows = contradictions.length
    ? contradictions.map((line) => `> [!contradiction]\n> ${line}`)
    : ["> [!note]\n> No contradiction marker found in this source."];
  return [
    frontmatter({
      type: "source",
      title: JSON.stringify(title),
      updated: isoNow(),
      source_path: JSON.stringify(sourcePath),
      raw_path: JSON.stringify(rawPath),
      content_hash: JSON.stringify(contentHash),
      tags: `[${tags.map((tag) => `"${tag}"`).join(", ")}]`,
      status: "ingested",
    }),
    `# ${title}`,
    "",
    summary || "No summary paragraph found.",
    "",
    "## Horizon synthesis",
    "",
    "This source has been compiled into Horizon's persistent wiki. Future agents should read this page before reopening the raw file unless they need exact wording.",
    "",
    "## Inferred links",
    "",
    ...linkRows,
    "",
    "## Source structure",
    "",
    ...headingRows,
    "",
    "## Extracted signals",
    "",
    ...signalRows,
    "",
    "## Contradictions",
    "",
    ...contradictionRows,
    "",
    "## Raw evidence",
    "",
    `- Raw copy: \`${rawPath}\``,
    `- Original path: \`${sourcePath}\``,
    "",
  ].join("\n");
}

function contradictionsMarkdown(db, latest = null) {
  const root = vaultRoot();
  const existing = safeAll(db, "SELECT path, title FROM wiki_pages WHERE path LIKE 'wiki/sources/%' ORDER BY updated_at DESC LIMIT 120");
  const latestRows = latest?.contradictions?.length
    ? latest.contradictions.map((line) => `- [[${latest.title}]]: ${line}`)
    : [];
  const sourceRows = existing
    .flatMap((page) => {
      const abs = resolve(root, page.path);
      if (!existsSync(abs)) return [];
      return sourceContradictions(readFileSync(abs, "utf8")).map((line) => `- [[${page.title}]]: ${line}`);
    })
    .filter((row, index, rows) => rows.indexOf(row) === index);
  const rows = [...latestRows, ...sourceRows].filter((row, index, all) => all.indexOf(row) === index);
  return [
    frontmatter({
      type: "meta",
      title: "\"Contradictions\"",
      updated: isoNow(),
      tags: "[horizon, contradictions, memory-health]",
      status: "active",
    }),
    "# Contradictions",
    "",
    "Contradiction markers found during deterministic source ingest. Resolve by updating the relevant entity/domain pages, not by deleting the raw evidence.",
    "",
    ...(rows.length ? rows : ["- No contradiction markers have been ingested yet."]),
    "",
  ].join("\n");
}

function resolveCoveragePath(sourcePath) {
  const raw = String(sourcePath ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("~")) return resolve(process.env.HOME ?? "", raw.slice(2));
  if (raw.startsWith("/")) return raw;
  return resolve(repoRoot, raw);
}

function coverageReportMarkdown(result) {
  const rows = result.items.map((item) => {
    const status = item.status === "missing" ? "missing" : item.skipped ? "skipped" : "ingested";
    return `| ${item.title} | ${status} | ${item.path} | ${item.rawPath || ""} |`;
  });
  return [
    frontmatter({
      type: "meta",
      title: "\"Source Coverage Report\"",
      updated: isoNow(),
      tags: "[horizon, memory, coverage]",
      status: result.missing ? "needs-review" : "active",
    }),
    "# Source Coverage Report",
    "",
    "Curated high-signal source coverage for Horizon's living memory. Missing rows are explicit so the ingest cycle is honest instead of silently incomplete.",
    "",
    `- Total registered: ${result.total}`,
    `- Available: ${result.available}`,
    `- Ingested: ${result.ingested}`,
    `- Skipped unchanged: ${result.skipped}`,
    `- Missing: ${result.missing}`,
    "",
    "| Source | Status | Path | Raw copy |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
    "Related: [[Living Memory Backlog]], [[Compound Horizon Memory]], [[Money Lanes]], [[Action Memory]].",
    "",
  ].join("\n");
}

function wikiLinkTitle(title) {
  return String(title ?? "")
    .replace(/[\[\]\n\r]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function relatedPagesForCapture(db, question, links = []) {
  const pages = safeAll(db, "SELECT path, title, kind, summary FROM wiki_pages");
  const byPath = new Map(pages.map((page) => [page.path, page]));
  const byTitle = new Map(pages.map((page) => [page.title, page]));
  const explicit = [];
  for (const link of links ?? []) {
    const path = typeof link === "string" ? link : link?.path;
    const title = typeof link === "string" ? "" : link?.title;
    const found = (path && byPath.get(path)) || (title && byTitle.get(title));
    if (found) explicit.push(found);
  }
  if (explicit.length) return uniqueBy(explicit, (page) => page.path).slice(0, 8);
  return searchWiki(db, question, { limit: 6 }).map((result) => ({
    path: result.path,
    title: result.title,
    kind: result.kind,
    summary: result.summary,
  }));
}

function questionMarkdown({ title, question, answer, related, inferredLinks, tags }) {
  const relatedRows = related.length
    ? related.map((page) => {
        const linkTitle = wikiLinkTitle(page.title);
        const summary = page.summary ? ` - ${page.summary}` : "";
        return `- [[${linkTitle}]] (\`${page.path}\`)${summary}`;
      })
    : ["- No related wiki pages were found at capture time."];
  const relatedTitles = new Set(related.map((page) => page.title));
  const inferredRows = inferredLinks.filter((link) => !relatedTitles.has(link)).map((link) => `- [[${wikiLinkTitle(link)}]]`);
  const inferredSection = inferredRows.length ? ["## Inferred Links", "", ...inferredRows, ""] : [];
  return [
    frontmatter({
      type: "question",
      title: JSON.stringify(title),
      updated: isoNow(),
      tags: `[${tags.map((tag) => `"${tag}"`).join(", ")}]`,
      status: "active",
    }),
    `# ${title}`,
    "",
    "## Question",
    "",
    `> ${question.replace(/\n+/g, "\n> ")}`,
    "",
    "## Answer",
    "",
    answer,
    "",
    "## Related Memory",
    "",
    ...relatedRows,
    "",
    ...inferredSection,
    "## Maintenance",
    "",
    "- Treat this as compiled synthesis, not raw evidence.",
    "- If a newer source contradicts this answer, preserve the page and add contradiction status instead of deleting it.",
    "",
  ].join("\n");
}

function repairPlanMarkdown(result) {
  const repairRows = result.repairs.length
    ? result.repairs.map((repair) => `| ${repair.severity} | ${repair.type} | ${repair.target} | ${repair.action} |`)
    : ["| none | none | none | No repairs required. |"];
  return [
    frontmatter({
      type: "meta",
      title: "\"Wiki Repair Plan\"",
      updated: isoNow(),
      tags: "[horizon, memory-health, lint]",
      status: result.repairs.length ? "needs-review" : "active",
    }),
    "# Wiki Repair Plan",
    "",
    "Machine-readable lint output is returned by `npm run wiki:lint`; this page is the Obsidian-readable repair queue.",
    "",
    `- Pages: ${result.pages}`,
    `- Links: ${result.links}`,
    `- Repairs: ${result.repairs.length}`,
    `- Missing links: ${result.missingLinks.length}`,
    `- Missing files: ${result.missingFiles.length}`,
    `- Orphan pages: ${result.orphanPages.length}`,
    `- Source pages without entity links: ${result.sourcePagesWithoutEntityLinks.length}`,
    `- Unresolved contradictions: ${result.unresolvedContradictions.length}`,
    "",
    "| Severity | Type | Target | Action |",
    "| --- | --- | --- | --- |",
    ...repairRows,
    "",
    "Related: [[dashboard]], [[Living Memory Backlog]], [[Compound Horizon Memory]].",
    "",
  ].join("\n");
}

function existingLog() {
  const path = resolve(vaultRoot(), "wiki", "log.md");
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8");
}

export function syncHorizonWiki(db) {
  ensureDirs();

  const files = [];
  files.push(writeVaultFile("WIKI.md", schemaMarkdown()));
  files.push(writeVaultFile("AGENTS.md", agentMarkdown()));

  for (const source of CORE_SOURCES) {
    const rawPath = `.raw/horizon-intelligence/${source.id}.md`;
    const raw = sourceRawMarkdown(source);
    files.push(writeVaultFile(rawPath, raw));
    upsertSource(db, source, rawPath, raw);
  }

  const generated = [
    { path: "wiki/overview.md", kind: "overview", content: overviewMarkdown(db), status: "active" },
    { path: "wiki/hot.md", kind: "meta", content: hotMarkdown(db), status: "active" },
    { path: "wiki/meta/Living Memory Backlog.md", kind: "meta", content: memoryBacklogMarkdown(), status: "active" },
    ...sourcePages(),
    ...conceptPages(),
    ...entityPages(),
    ...liveEntityPages(db),
    ...liveOperatingPages(db),
  ];

  for (const page of generated) {
    files.push(writeIndexedPage(db, page.path, page.content, { kind: page.kind, status: page.status ?? "seed", sourceCount: page.source ? 1 : 0 }));
  }

  const pages = safeAll(db, "SELECT * FROM wiki_pages ORDER BY kind, title");
  files.push(writeIndexedPage(db, "wiki/index.md", indexMarkdown(db, pages), { kind: "meta", status: "active" }));
  files.push(writeIndexedPage(db, "wiki/meta/dashboard.md", dashboardMarkdown(db), { kind: "meta", status: "active" }));

  const result = {
    id: randomUUID(),
    sources: CORE_SOURCES.length,
    files,
    syncedAt: isoNow(),
  };

  const log = [
    frontmatter({
      type: "meta",
      title: "\"Wiki Log\"",
      updated: isoNow(),
      tags: "[horizon, log]",
      status: "active",
    }),
    "# Wiki Log",
    "",
    logEntry(result),
    existingLog().replace(/^---[\s\S]*?---\s*# Wiki Log\s*/m, "").trim(),
    "",
  ].filter(Boolean).join("\n");
  files.push(writeIndexedPage(db, "wiki/log.md", log, { kind: "meta", status: "active" }));

  db.prepare("INSERT INTO wiki_runs (id, kind, summary, payload_json, created_at) VALUES (?, 'sync', ?, ?, ?)").run(
    result.id,
    `Synced ${files.length} Horizon wiki files`,
    JSON.stringify(result),
    result.syncedAt,
  );

  return result;
}

export function ingestWikiSource(db, { sourcePath, title, kind = "operator-source", tags = [], force = false } = {}) {
  if (!sourcePath) throw new Error("sourcePath is required");
  ensureDirs();

  const absSourcePath = resolve(sourcePath);
  if (!existsSync(absSourcePath)) throw new Error(`source not found: ${sourcePath}`);
  const content = readFileSync(absSourcePath, "utf8");
  const contentHash = hashText(content);
  const manifest = readManifest();
  const manifestKey = absSourcePath;
  const prior = manifest.sources[manifestKey];
  if (!force && prior?.hash === contentHash) {
    return {
      skipped: true,
      reason: "unchanged",
      title: prior.title,
      rawPath: prior.raw_path,
      files: prior.pages_updated ?? [],
      contentHash,
    };
  }

  const resolvedTitle = titleFromSource(content, absSourcePath, title);
  const safeTitle = fileTitle(resolvedTitle);
  const sourceId = `ingest:${pathHash(absSourcePath)}`;
  const rawPath = `.raw/horizon-ingest/${safeTitle}-${contentHash.slice(0, 8)}.md`;
  const summary = sourceSummary(content);
  const headings = sourceHeadings(content);
  const signals = sourceSignals(content);
  const contradictions = sourceContradictions(content);
  const links = inferLinks(db, content, safeTitle);
  const normalizedTags = [...new Set(["horizon-ingest", ...tags].map((tag) => String(tag).trim()).filter(Boolean))];

  const raw = [
    frontmatter({
      type: "raw-source",
      title: JSON.stringify(safeTitle),
      original_path: JSON.stringify(absSourcePath),
      content_hash: JSON.stringify(contentHash),
      ingested_at: isoNow(),
      tags: `[${normalizedTags.map((tag) => `"${tag}"`).join(", ")}]`,
    }),
    content,
    "",
  ].join("\n");
  writeVaultFile(rawPath, raw);

  const sourcePagePath = `wiki/sources/${safeTitle}.md`;
  const sourcePage = sourcePageMarkdown({
    title: safeTitle,
    sourcePath: absSourcePath,
    rawPath,
    contentHash,
    summary,
    links,
    headings,
    signals,
    contradictions,
    tags: normalizedTags,
  });

  const files = [rawPath];
  files.push(writeIndexedPage(db, sourcePagePath, sourcePage, { kind: "source", status: "ingested", sourceCount: 1 }));

  upsertSource(
    db,
    {
      id: sourceId,
      title: safeTitle,
      kind,
      sourcePath: absSourcePath,
      sourceUrl: "",
      summary,
      tags: normalizedTags,
    },
    rawPath,
    raw,
  );

  const result = {
    id: randomUUID(),
    skipped: false,
    title: safeTitle,
    sourcePath: absSourcePath,
    rawPath,
    files: [],
    summary,
    links,
    headings,
    signals,
    contradictions,
    contentHash,
    ingestedAt: isoNow(),
  };

  files.push(writeIndexedPage(db, "wiki/meta/contradictions.md", contradictionsMarkdown(db, result), { kind: "meta", status: "active" }));

  result.files = files;

  db.prepare("INSERT INTO wiki_runs (id, kind, summary, payload_json, created_at) VALUES (?, 'ingest', ?, ?, ?)").run(
    result.id,
    `Ingested ${safeTitle}`,
    JSON.stringify(result),
    result.ingestedAt,
  );

  const pages = safeAll(db, "SELECT * FROM wiki_pages ORDER BY kind, title");
  result.files.push(writeIndexedPage(db, "wiki/index.md", indexMarkdown(db, pages), { kind: "meta", status: "active" }));
  result.files.push(writeIndexedPage(db, "wiki/hot.md", hotMarkdown(db), { kind: "meta", status: "active" }));

  const log = [
    frontmatter({
      type: "meta",
      title: "\"Wiki Log\"",
      updated: isoNow(),
      tags: "[horizon, log]",
      status: "active",
    }),
    "# Wiki Log",
    "",
    ingestLogEntry(result),
    existingLog().replace(/^---[\s\S]*?---\s*# Wiki Log\s*/m, "").trim(),
    "",
  ].filter(Boolean).join("\n");
  result.files.push(writeIndexedPage(db, "wiki/log.md", log, { kind: "meta", status: "active" }));

  manifest.sources[manifestKey] = {
    hash: contentHash,
    title: safeTitle,
    raw_path: rawPath,
    ingested_at: result.ingestedAt,
    pages_updated: result.files,
  };
  result.files.push(writeManifest(manifest));

  return result;
}

export function runWikiSourceCoverage(db, { sources = DEFAULT_COVERAGE_SOURCES, force = false } = {}) {
  ensureDirs();
  const result = {
    id: randomUUID(),
    total: sources.length,
    available: 0,
    ingested: 0,
    skipped: 0,
    missing: 0,
    items: [],
    files: [],
    ranAt: isoNow(),
  };

  for (const source of sources) {
    const abs = resolveCoveragePath(source.path);
    if (!abs || !existsSync(abs)) {
      result.missing += 1;
      result.items.push({
        id: source.id,
        title: source.title ?? fileTitle(source.path),
        path: abs || source.path,
        status: "missing",
      });
      continue;
    }
    result.available += 1;
    const ingest = ingestWikiSource(db, {
      sourcePath: abs,
      title: source.title,
      kind: "coverage-source",
      tags: ["coverage", ...(source.tags ?? [])],
      force,
    });
    if (ingest.skipped) result.skipped += 1;
    else result.ingested += 1;
    result.files.push(...(ingest.files ?? []));
    result.items.push({
      id: source.id,
      title: ingest.title,
      path: abs,
      status: ingest.skipped ? "skipped" : "ingested",
      skipped: Boolean(ingest.skipped),
      rawPath: ingest.rawPath,
      files: ingest.files ?? [],
    });
  }

  result.files.push(
    writeIndexedPage(db, "wiki/meta/Source Coverage Report.md", coverageReportMarkdown(result), {
      kind: "meta",
      status: result.missing ? "needs-review" : "active",
    }),
  );

  const pages = safeAll(db, "SELECT * FROM wiki_pages ORDER BY kind, title");
  result.files.push(writeIndexedPage(db, "wiki/index.md", indexMarkdown(db, pages), { kind: "meta", status: "active" }));

  db.prepare("INSERT INTO wiki_runs (id, kind, summary, payload_json, created_at) VALUES (?, 'coverage', ?, ?, ?)").run(
    result.id,
    `Coverage: ${result.available}/${result.total} available, ${result.ingested} ingested, ${result.skipped} skipped, ${result.missing} missing`,
    JSON.stringify(result),
    result.ranAt,
  );

  return result;
}

export function captureWikiAnswer(db, { question, answer, title, links = [], tags = [] } = {}) {
  ensureDirs();
  const cleanQuestion = String(question ?? "").trim();
  const cleanAnswer = String(answer ?? "").trim();
  if (!cleanQuestion) throw new Error("question is required");
  if (!cleanAnswer) throw new Error("answer is required");

  const resolvedTitle = fileTitle(title || cleanQuestion);
  const path = `wiki/questions/${resolvedTitle}.md`;
  const related = relatedPagesForCapture(db, cleanQuestion, links);
  const inferredLinks = inferLinks(db, `${cleanQuestion}\n${cleanAnswer}`, resolvedTitle);
  const normalizedTags = [...new Set(["horizon-query", "compiled-answer", ...tags].map((tag) => String(tag).trim()).filter(Boolean))];
  const content = questionMarkdown({
    title: resolvedTitle,
    question: cleanQuestion,
    answer: cleanAnswer,
    related,
    inferredLinks,
    tags: normalizedTags,
  });

  const result = {
    id: randomUUID(),
    title: resolvedTitle,
    question: cleanQuestion,
    path,
    related,
    files: [],
    capturedAt: isoNow(),
  };

  result.files.push(writeIndexedPage(db, path, content, { kind: "question", status: "active", sourceCount: related.length }));

  const pages = safeAll(db, "SELECT * FROM wiki_pages ORDER BY kind, title");
  result.files.push(writeIndexedPage(db, "wiki/index.md", indexMarkdown(db, pages), { kind: "meta", status: "active" }));
  result.files.push(writeIndexedPage(db, "wiki/hot.md", hotMarkdown(db), { kind: "meta", status: "active" }));

  const log = [
    frontmatter({
      type: "meta",
      title: "\"Wiki Log\"",
      updated: isoNow(),
      tags: "[horizon, log]",
      status: "active",
    }),
    "# Wiki Log",
    "",
    questionLogEntry(result),
    existingLog().replace(/^---[\s\S]*?---\s*# Wiki Log\s*/m, "").trim(),
    "",
  ].filter(Boolean).join("\n");
  result.files.push(writeIndexedPage(db, "wiki/log.md", log, { kind: "meta", status: "active" }));

  db.prepare("INSERT INTO wiki_runs (id, kind, summary, payload_json, created_at) VALUES (?, 'query-capture', ?, ?, ?)").run(
    result.id,
    `Captured answer: ${resolvedTitle}`,
    JSON.stringify(result),
    result.capturedAt,
  );

  return result;
}

export function runWikiLint(db) {
  ensureDirs();
  const health = lintWiki(db);
  const result = {
    id: randomUUID(),
    ...health,
    files: [],
    lintedAt: isoNow(),
  };

  result.files.push(writeIndexedPage(db, "wiki/meta/Wiki Repair Plan.md", repairPlanMarkdown(result), {
    kind: "meta",
    status: result.repairs.length ? "needs-review" : "active",
  }));

  const pages = safeAll(db, "SELECT * FROM wiki_pages ORDER BY kind, title");
  result.files.push(writeIndexedPage(db, "wiki/index.md", indexMarkdown(db, pages), { kind: "meta", status: "active" }));

  const log = [
    frontmatter({
      type: "meta",
      title: "\"Wiki Log\"",
      updated: isoNow(),
      tags: "[horizon, log]",
      status: "active",
    }),
    "# Wiki Log",
    "",
    lintLogEntry(result),
    existingLog().replace(/^---[\s\S]*?---\s*# Wiki Log\s*/m, "").trim(),
    "",
  ].filter(Boolean).join("\n");
  result.files.push(writeIndexedPage(db, "wiki/log.md", log, { kind: "meta", status: "active" }));

  db.prepare("INSERT INTO wiki_runs (id, kind, summary, payload_json, created_at) VALUES (?, 'lint', ?, ?, ?)").run(
    result.id,
    `Wiki lint: ${result.repairs.length} repairs`,
    JSON.stringify(result),
    result.lintedAt,
  );

  return result;
}

function walkMarkdown(dir, root, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) walkMarkdown(abs, root, out);
    if (entry.isFile() && extname(entry.name).toLowerCase() === ".md") {
      const st = statSync(abs);
      out.push({ path: relative(root, abs), abs, mtime: st.mtimeMs, size: st.size });
    }
  }
  return out;
}

export function wikiStatus(db) {
  const root = vaultRoot();
  const exists = existsSync(root);
  const pages = safeGet(db, "SELECT COUNT(*) AS n FROM wiki_pages")?.n ?? 0;
  const sources = safeGet(db, "SELECT COUNT(*) AS n FROM wiki_sources")?.n ?? 0;
  const chunks = safeGet(db, "SELECT COUNT(*) AS n FROM wiki_chunks")?.n ?? 0;
  const latestRun = safeGet(db, "SELECT * FROM wiki_runs ORDER BY created_at DESC LIMIT 1");
  const graph = lintWiki(db);
  return {
    root,
    exists,
    schemaPath: "WIKI.md",
    hotPath: "wiki/hot.md",
    indexPath: "wiki/index.md",
    rawSourceCount: sources,
    wikiPageCount: pages,
    chunkCount: chunks,
    latestRun,
    graph,
    retrieval: {
      current: "hot-index-markdown-fts",
      vectorCandidate: "turbovec",
      vectorState: "planned-adapter",
    },
  };
}

function tokens(query) {
  return String(query ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function snippetFor(content, terms) {
  const lower = content.toLowerCase();
  const first = terms.map((term) => lower.indexOf(term)).filter((index) => index >= 0).sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, first - 90);
  return content.slice(start, start + 240).replace(/\s+/g, " ").trim();
}

export function searchWiki(db, query, { limit = 10 } = {}) {
  const terms = tokens(query);
  if (terms.length === 0) return [];
  const root = vaultRoot();
  const pages = walkMarkdown(resolve(root, "wiki"), root);
  const dbPages = new Map(safeAll(db, "SELECT * FROM wiki_pages").map((page) => [page.path, page]));
  const scored = [];
  for (const page of pages) {
    const content = readFileSync(page.abs, "utf8");
    const meta = dbPages.get(page.path);
    const hay = `${meta?.title ?? pageTitle(page.path)} ${meta?.summary ?? ""} ${content}`.toLowerCase();
    let score = 0;
    for (const term of terms) {
      const count = hay.split(term).length - 1;
      if (count > 0) score += count + (meta?.title?.toLowerCase().includes(term) ? 5 : 0);
    }
    if (score > 0) {
      scored.push({
        path: page.path,
        title: meta?.title ?? pageTitle(page.path),
        kind: meta?.kind ?? "page",
        summary: meta?.summary ?? extractSummary(content),
        snippet: snippetFor(content, terms),
        score,
        mtime: page.mtime,
      });
    }
  }
  return scored.sort((a, b) => b.score - a.score || b.mtime - a.mtime).slice(0, limit);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  const db = openHorizonDb();
  try {
    const cmd = process.argv[2] ?? "status";
    if (cmd === "sync") {
      console.log(JSON.stringify(syncHorizonWiki(db), null, 2));
    } else if (cmd === "lint") {
      console.log(JSON.stringify(runWikiLint(db), null, 2));
    } else if (cmd === "coverage") {
      console.log(JSON.stringify(runWikiSourceCoverage(db, { force: process.argv.includes("--force") }), null, 2));
    } else if (cmd === "capture") {
      const question = process.argv[3];
      const answer = process.argv.slice(4).join(" ");
      if (!question || !answer) {
        console.error("usage: node scripts/wiki.mjs capture <question> <answer>");
        process.exitCode = 2;
      } else {
        console.log(JSON.stringify(captureWikiAnswer(db, { question, answer }), null, 2));
      }
    } else if (cmd === "ingest") {
      const sourcePath = process.argv[3];
      if (!sourcePath) {
        console.error("usage: node scripts/wiki.mjs ingest <source-path> [title]");
        process.exitCode = 2;
      } else {
        console.log(JSON.stringify(ingestWikiSource(db, { sourcePath, title: process.argv.slice(4).join(" ") }), null, 2));
      }
    } else if (cmd === "search") {
      console.log(JSON.stringify(searchWiki(db, process.argv.slice(3).join(" ")), null, 2));
    } else {
      console.log(JSON.stringify(wikiStatus(db), null, 2));
    }
  } finally {
    db.close();
  }
}

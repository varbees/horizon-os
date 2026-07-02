// Horizon OS — owned, additive-only migration runner (no framework, no dependency).
//
// Durable-core discipline from the v2 build plan: numbered migrations tracked in a
// schema_migrations table (the source of truth) with PRAGMA user_version as a fast boot
// mirror; each migration runs in a transaction; the DB file is backed up before any pending
// migration applies; every step is individually idempotent (CREATE ... IF NOT EXISTS +
// column-existence guards) so a re-run can never corrupt state. SQLite's restricted ALTER
// makes additive-only not just good practice but a hard constraint — never drop/rename.

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

function columnExists(db, table, name) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === name);
}

function addColumn(db, table, name, definition) {
  if (!columnExists(db, table, name)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  }
}

// Ordered, append-only. Never edit a shipped migration's body destructively; add a new one.
const MIGRATIONS = [
  {
    version: 1,
    name: "v2_core",
    up(db) {
      // --- the configurable source registry (replaces the hardcoded sweep root) ---
      db.exec(`CREATE TABLE IF NOT EXISTS project_sources (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL DEFAULT 'fs-glob',
        root TEXT NOT NULL DEFAULT '',
        config_json TEXT NOT NULL DEFAULT '{}',
        lane TEXT NOT NULL DEFAULT '',
        weight INTEGER NOT NULL DEFAULT 0,
        enabled INTEGER NOT NULL DEFAULT 1,
        last_ingested_at TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`);

      // --- append-only spine of "true current state" ---
      db.exec(`CREATE TABLE IF NOT EXISTS work_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL DEFAULT '',
        kind TEXT NOT NULL DEFAULT '',
        payload_json TEXT NOT NULL DEFAULT '{}',
        occurred_at TEXT NOT NULL DEFAULT '',
        recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_work_events_project ON work_events(project_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_work_events_recorded ON work_events(recorded_at)`);

      // --- the dispatch outbox / external-job mirror (Jules has no webhooks → poll/reconcile) ---
      db.exec(`CREATE TABLE IF NOT EXISTS agent_dispatches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_id TEXT NOT NULL DEFAULT '',
        agent TEXT NOT NULL DEFAULT '',
        external_id TEXT NOT NULL DEFAULT '',
        external_state TEXT NOT NULL DEFAULT '',
        result_url TEXT NOT NULL DEFAULT '',
        idempotency_key TEXT NOT NULL DEFAULT '',
        dispatched_at TEXT NOT NULL DEFAULT '',
        last_polled_at TEXT NOT NULL DEFAULT '',
        reconciled_at TEXT NOT NULL DEFAULT '',
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT NOT NULL DEFAULT ''
      )`);
      db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_dispatch_idem ON agent_dispatches(idempotency_key)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_dispatch_open ON agent_dispatches(reconciled_at)`);

      // --- INTERFACE-ONLY shells (created, never populated until triggers fire) ---
      db.exec(`CREATE TABLE IF NOT EXISTS outcomes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL DEFAULT '',
        kind TEXT NOT NULL DEFAULT '',
        amount_cents INTEGER NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT '',
        source TEXT NOT NULL DEFAULT '',
        occurred_at TEXT NOT NULL DEFAULT '',
        recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`);
      db.exec(`CREATE TABLE IF NOT EXISTS identities (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL DEFAULT '',
        kind TEXT NOT NULL DEFAULT '',
        config_ref TEXT NOT NULL DEFAULT ''
      )`);

      // --- extend the existing action_queue spine (additive) ---
      addColumn(db, "action_queue", "state", "TEXT NOT NULL DEFAULT ''");
      addColumn(db, "action_queue", "lane", "TEXT NOT NULL DEFAULT ''");
      addColumn(db, "action_queue", "priority_score", "INTEGER NOT NULL DEFAULT 0");
      addColumn(db, "action_queue", "dispatch_target", "TEXT NOT NULL DEFAULT ''");
      addColumn(db, "action_queue", "idempotency_key", "TEXT NOT NULL DEFAULT ''");
      addColumn(db, "action_queue", "dispatched_at", "TEXT NOT NULL DEFAULT ''");
      addColumn(db, "action_queue", "verified_at", "TEXT NOT NULL DEFAULT ''");
      addColumn(db, "action_queue", "origin_event_id", "INTEGER");
      addColumn(db, "action_queue", "outcome_code", "TEXT NOT NULL DEFAULT ''");

      // backfill the new lifecycle state from the legacy status (one-time, idempotent)
      db.exec(`UPDATE action_queue SET state = CASE
        WHEN status = 'done' THEN 'closed'
        WHEN status = 'dismissed' THEN 'aborted'
        WHEN status = 'deployed' THEN 'deployable'
        WHEN status = 'queued' THEN 'reviewed'
        WHEN enriched = 1 THEN 'enriched'
        ELSE 'captured' END
      WHERE state = '' OR state IS NULL`);
    },
  },
  {
    version: 2,
    name: "idempotency_unique",
    up(db) {
      // The dispatch double-send guard. PARTIAL unique: enforce uniqueness only for real
      // keys — the '' default on pre-dispatch rows must be exempt or every empty key collides.
      db.exec(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_action_idem ON action_queue(idempotency_key) WHERE idempotency_key != ''`,
      );
    },
  },
  {
    version: 3,
    name: "compound_wiki",
    up(db) {
      // Horizon's compounding memory layer: immutable source registry, generated
      // wiki pages, page graph, chunks for future vector indexing, and sync runs.
      db.exec(`CREATE TABLE IF NOT EXISTS wiki_sources (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        kind TEXT NOT NULL DEFAULT 'source',
        raw_path TEXT NOT NULL DEFAULT '',
        source_path TEXT NOT NULL DEFAULT '',
        source_url TEXT NOT NULL DEFAULT '',
        content_hash TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active',
        summary TEXT NOT NULL DEFAULT '',
        tags_json TEXT NOT NULL DEFAULT '[]',
        ingested_at TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_wiki_sources_kind ON wiki_sources(kind)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_wiki_sources_updated ON wiki_sources(updated_at)`);

      db.exec(`CREATE TABLE IF NOT EXISTS wiki_pages (
        path TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        kind TEXT NOT NULL DEFAULT 'page',
        status TEXT NOT NULL DEFAULT 'seed',
        summary TEXT NOT NULL DEFAULT '',
        source_count INTEGER NOT NULL DEFAULT 0,
        outbound_links_json TEXT NOT NULL DEFAULT '[]',
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_wiki_pages_kind ON wiki_pages(kind)`);

      db.exec(`CREATE TABLE IF NOT EXISTS wiki_links (
        from_path TEXT NOT NULL DEFAULT '',
        to_title TEXT NOT NULL DEFAULT '',
        to_path TEXT NOT NULL DEFAULT '',
        kind TEXT NOT NULL DEFAULT 'wikilink',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (from_path, to_title, kind)
      )`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_wiki_links_to_title ON wiki_links(to_title)`);

      db.exec(`CREATE TABLE IF NOT EXISTS wiki_chunks (
        id TEXT PRIMARY KEY,
        page_path TEXT NOT NULL DEFAULT '',
        chunk_index INTEGER NOT NULL DEFAULT 0,
        body TEXT NOT NULL DEFAULT '',
        embedding_id TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_wiki_chunks_page ON wiki_chunks(page_path)`);

      db.exec(`CREATE TABLE IF NOT EXISTS wiki_runs (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL DEFAULT '',
        summary TEXT NOT NULL DEFAULT '',
        payload_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_wiki_runs_created ON wiki_runs(created_at)`);
    },
  },
  {
    version: 4,
    name: "content_engine",
    up(db) {
      // The wealth-engine content layer: turn one real build-log artifact into premium,
      // faceless distribution for two engines (Antharmaya Labs dev lane / PhotoSelect buyer
      // lane) through a Research -> Brief -> Asset plan -> Generate -> Assemble -> QA -> Publish
      // pipeline. Manual publish only; no scheduler. TRIBE v2 is a story angle, not a dependency.

      // --- unified connector registry: backs the mandatory Connectors hub ---
      // kind: 'local_agent' (Claude Code, Codex via local CLI auth), 'mcp' (OAuth HTTP servers),
      // 'skill' (reserved). No secrets here; local agents use the operator's own subscription auth.
      db.exec(`CREATE TABLE IF NOT EXISTS connectors (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL DEFAULT 'mcp',
        name TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT '',
        provides TEXT NOT NULL DEFAULT '',
        url TEXT NOT NULL DEFAULT '',
        command TEXT NOT NULL DEFAULT '',
        state TEXT NOT NULL DEFAULT 'disconnected',
        version TEXT NOT NULL DEFAULT '',
        last_health_at TEXT NOT NULL DEFAULT '',
        health_json TEXT NOT NULL DEFAULT '{}',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_connectors_kind ON connectors(kind)`);

      const seedConnector = db.prepare(`INSERT OR IGNORE INTO connectors
        (id, kind, name, category, provides, url, command, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      const connectorSeeds = [
        // Local agents (native, no external API — they run on the operator's own CLI auth)
        ["claude-code", "local_agent", "Claude Code", "Agent", "Headless reasoning, research, narrative, and asset specs (claude -p).", "", "claude", 0],
        ["codex", "local_agent", "Codex", "Agent", "Headless implementation and reproducible tooling (codex exec).", "", "codex", 1],
        // MCP servers (OAuth HTTP — plug into the existing mcp-client transport)
        ["jules", "mcp", "Jules", "Agent", "Async repo work and pull requests via MCP.", "https://jules.googleapis.com/mcp", "", 2],
        ["huggingface", "mcp", "Hugging Face", "Assets", "Open-source FLUX image generation and Hub tools via MCP.", "https://huggingface.co/mcp", "", 3],
        ["higgsfield", "mcp", "Higgsfield", "Assets", "Premium cinematic image and video generation (30+ models) via MCP.", "https://mcp.higgsfield.ai/mcp", "", 4],
        ["google-calendar", "mcp", "Google Calendar", "Intelligence", "Upcoming events into the timeline.", "https://calendarmcp.googleapis.com/mcp/v1", "", 5],
        ["gmail", "mcp", "Gmail", "Intelligence", "Recent email highlights.", "https://gmailmcp.googleapis.com/mcp/v1", "", 6],
        ["google-drive", "mcp", "Google Drive", "Files", "Recent documents and search.", "https://drivemcp.googleapis.com/mcp/v1", "", 7],
      ];
      for (const row of connectorSeeds) seedConnector.run(...row);

      // --- content briefs: the fact-checked, two-audience source of truth per piece ---
      // engine: 'antharmaya_labs' | 'photoselect'. status walks the pipeline lanes.
      db.exec(`CREATE TABLE IF NOT EXISTS content_briefs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        engine TEXT NOT NULL DEFAULT 'antharmaya_labs',
        source_artifact TEXT NOT NULL DEFAULT '',
        hook TEXT NOT NULL DEFAULT '',
        audience TEXT NOT NULL DEFAULT '',
        channels_json TEXT NOT NULL DEFAULT '[]',
        series TEXT NOT NULL DEFAULT '',
        tone TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'draft',
        research_json TEXT NOT NULL DEFAULT '{}',
        do_not_build_json TEXT NOT NULL DEFAULT '[]',
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_content_briefs_engine ON content_briefs(engine)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_content_briefs_status ON content_briefs(status)`);

      // --- generated visual assets (HF FLUX stills, Higgsfield video, NIM/Gemini) ---
      db.exec(`CREATE TABLE IF NOT EXISTS content_assets (
        id TEXT PRIMARY KEY,
        brief_id TEXT NOT NULL DEFAULT '',
        kind TEXT NOT NULL DEFAULT 'still',
        provider TEXT NOT NULL DEFAULT 'huggingface',
        prompt TEXT NOT NULL DEFAULT '',
        negative_prompt TEXT NOT NULL DEFAULT '',
        aspect_ratio TEXT NOT NULL DEFAULT '1:1',
        status TEXT NOT NULL DEFAULT 'planned',
        external_id TEXT NOT NULL DEFAULT '',
        result_url TEXT NOT NULL DEFAULT '',
        local_path TEXT NOT NULL DEFAULT '',
        manifest_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_content_assets_brief ON content_assets(brief_id)`);

      // --- assembled editorial package (one row per brief) ---
      db.exec(`CREATE TABLE IF NOT EXISTS content_packages (
        id TEXT PRIMARY KEY,
        brief_id TEXT NOT NULL DEFAULT '',
        blog TEXT NOT NULL DEFAULT '',
        x_thread_json TEXT NOT NULL DEFAULT '[]',
        linkedin TEXT NOT NULL DEFAULT '',
        instagram_caption TEXT NOT NULL DEFAULT '',
        reel_script_json TEXT NOT NULL DEFAULT '[]',
        alt_text TEXT NOT NULL DEFAULT '',
        cta_json TEXT NOT NULL DEFAULT '[]',
        checklist_json TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_content_packages_brief ON content_packages(brief_id)`);

      // --- per-lane run audit (mirrors agent_dispatches shape; the stall tripwire generalizes) ---
      db.exec(`CREATE TABLE IF NOT EXISTS pipeline_runs (
        id TEXT PRIMARY KEY,
        brief_id TEXT NOT NULL DEFAULT '',
        lane TEXT NOT NULL DEFAULT '',
        executor TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'running',
        input_json TEXT NOT NULL DEFAULT '{}',
        output_json TEXT NOT NULL DEFAULT '{}',
        error TEXT NOT NULL DEFAULT '',
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        finished_at TEXT NOT NULL DEFAULT ''
      )`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_pipeline_runs_brief ON pipeline_runs(brief_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON pipeline_runs(status)`);
    },
  },
  {
    version: 5,
    name: "reclassify_jules_agent",
    up(db) {
      // Jules is not a hosted OAuth MCP server — it is a native programmatic executor reached
      // over its REST API (X-Goog-Api-Key, scripts/jules.mjs + julesAdapter), gated on
      // JULES_API_KEY. v4 seeded it as `mcp` with a guessed URL, so the hub's Connect flow POSTed
      // to a dead endpoint ("Error POSTing to endpoint"). Reclassify it as a native agent so it
      // sits beside Claude Code and Codex and is health-checked via julesAvailable(), not OAuth.
      db.prepare(`UPDATE connectors SET
          kind = 'local_agent',
          url = '',
          command = 'jules',
          provides = 'Async repo work and pull requests over the Jules REST API (needs JULES_API_KEY).',
          state = 'disconnected',
          version = '',
          updated_at = datetime('now')
        WHERE id = 'jules'`).run();
    },
  },
  {
    version: 6,
    name: "content_automation",
    up(db) {
      // Opt-in autonomous advancement. The loop only auto-advances briefs the operator flags
      // (automate = 1) so quota is spent deliberately, and it never crosses the manual gates
      // (asset generation spends provider credits; publish is always human). `auto_max_status` is
      // the furthest lane the loop may take a brief to on its own (default 'packaged' = a full
      // reviewable draft, assets + publish left to the operator).
      addColumn(db, "content_briefs", "automate", "INTEGER NOT NULL DEFAULT 0");
      addColumn(db, "content_briefs", "auto_max_status", "TEXT NOT NULL DEFAULT 'packaged'");
      addColumn(db, "content_briefs", "auto_last_run_at", "TEXT NOT NULL DEFAULT ''");
      db.exec("CREATE INDEX IF NOT EXISTS idx_content_briefs_automate ON content_briefs(automate)");
    },
  },
];

const LATEST = MIGRATIONS.reduce((m, x) => Math.max(m, x.version), 0);

// Apply any pending migrations. Idempotent and safe to call on every DB open.
export function runMigrations(db, { dbPath } = {}) {
  // Durability pragmas (must be set outside a transaction). WAL + FULL: this is a
  // system-of-record, so crash durability beats micro-perf.
  try {
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA synchronous = FULL");
  } catch {
    /* pragmas are best-effort */
  }

  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    applied_at TEXT NOT NULL DEFAULT ''
  )`);

  const applied = new Set(db.prepare("SELECT version FROM schema_migrations").all().map((r) => r.version));
  const pending = MIGRATIONS.filter((m) => !applied.has(m.version)).sort((a, b) => a.version - b.version);
  if (pending.length === 0) return { applied: 0, version: LATEST };

  // Back up the live DB once before applying anything structural.
  if (dbPath && existsSync(dbPath)) {
    const backupDir = resolve(dirname(dbPath), "backups");
    mkdirSync(backupDir, { recursive: true });
    copyFileSync(dbPath, resolve(backupDir, `horizon-${Date.now()}-pre-v${pending[0].version}.sqlite`));
  }

  for (const m of pending) {
    db.exec("BEGIN");
    try {
      m.up(db);
      db.prepare("INSERT OR REPLACE INTO schema_migrations(version, name, applied_at) VALUES (?, ?, ?)").run(
        m.version,
        m.name,
        new Date().toISOString(),
      );
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw new Error(`migration ${m.version} (${m.name}) failed: ${error.message ?? error}`);
    }
    // user_version mirror (boot self-check); set after COMMIT to keep the txn DDL-only.
    db.exec(`PRAGMA user_version = ${m.version}`);
  }
  return { applied: pending.length, version: LATEST };
}

export const LATEST_MIGRATION = LATEST;

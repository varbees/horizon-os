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

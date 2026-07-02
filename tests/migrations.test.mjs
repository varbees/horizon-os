import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

function tableNames(db) {
  return new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));
}

function columnNames(db, table) {
  return new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name));
}

test("migrations create the core and compound wiki schema idempotently", async () => {
  const dir = mkdtempSync(join(tmpdir(), "horizon-migrations-"));
  process.env.HORIZON_DB_PATH = join(dir, "horizon.sqlite");

  const { openHorizonDb } = await import(`../scripts/horizon-db.mjs?test=${Date.now()}`);
  const { LATEST_MIGRATION } = await import("../scripts/migrate.mjs");
  const db = openHorizonDb();

  const tables = tableNames(db);
  for (const table of [
    "project_sources",
    "work_events",
    "agent_dispatches",
    "outcomes",
    "identities",
    "schema_migrations",
    "wiki_sources",
    "wiki_pages",
    "wiki_links",
    "wiki_chunks",
    "wiki_runs",
    "startup_strategies",
    "agent_catalog",
  ]) {
    assert.ok(tables.has(table), `expected table ${table}`);
  }

  assert.equal(db.prepare("PRAGMA user_version").get().user_version, LATEST_MIGRATION);

  const actionQueueColumns = columnNames(db, "action_queue");
  for (const column of ["state", "lane", "priority_score", "dispatch_target", "idempotency_key"]) {
    assert.ok(actionQueueColumns.has(column), `expected action_queue.${column}`);
  }

  const agentCatalogColumns = columnNames(db, "agent_catalog");
  for (const column of ["id", "name", "description", "category", "revenue_model", "github_url", "added_at"]) {
    assert.ok(agentCatalogColumns.has(column), `expected agent_catalog.${column}`);
  }

  const indexes = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'index'").all().map((row) => row.name));
  for (const index of ["idx_agent_catalog_category", "idx_agent_catalog_revenue_model", "idx_startup_strategies_updated"]) {
    assert.ok(indexes.has(index), `expected index ${index}`);
  }

  db.close();

  const reopened = openHorizonDb();
  assert.equal(reopened.prepare("PRAGMA user_version").get().user_version, LATEST_MIGRATION);
  reopened.close();
});

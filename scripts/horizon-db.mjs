import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { systemEdges, systemNodes, timeBlocks } from "../src/data/horizon.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = process.env.HORIZON_DB_PATH ?? resolve(root, ".horizon", "horizon.sqlite");
const schemaPath = resolve(root, "db", "schema.sql");

export function openHorizonDb() {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(readFileSync(schemaPath, "utf8"));
  seed(db);
  return db;
}

function seed(db) {
  const insertNode = db.prepare(`
    INSERT INTO graph_nodes (id, label, kind, status, x, y, color, note, next_action, outputs_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      label = excluded.label,
      kind = excluded.kind,
      status = excluded.status,
      color = excluded.color,
      note = excluded.note,
      next_action = excluded.next_action,
      outputs_json = excluded.outputs_json,
      updated_at = datetime('now')
  `);

  for (const node of systemNodes) {
    insertNode.run(
      node.id,
      node.label,
      node.kind,
      node.status,
      node.x,
      node.y,
      node.color,
      node.note,
      node.next,
      JSON.stringify(node.outputs ?? []),
    );
  }

  const insertEdge = db.prepare(`
    INSERT OR IGNORE INTO graph_edges (id, from_node_id, to_node_id, label)
    VALUES (?, ?, ?, ?)
  `);

  for (const edge of systemEdges) {
    insertEdge.run(`${edge.from}->${edge.to}`, edge.from, edge.to, edge.label);
  }

  const insertEvent = db.prepare(`
    INSERT INTO calendar_events (id, title, lane, time_label, recurrence_rule, output_contract)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      lane = excluded.lane,
      time_label = excluded.time_label,
      recurrence_rule = excluded.recurrence_rule,
      output_contract = excluded.output_contract,
      updated_at = datetime('now')
  `);

  for (const block of timeBlocks) {
    insertEvent.run(block.id, block.title, block.lane, block.time, block.calendar, block.output);
  }

  const insertContext = db.prepare(`
    INSERT OR IGNORE INTO contexts (id, kind, title, body, source)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertContext.run(
    "foundry-objective",
    "mission",
    "Antharmaya foundry objective",
    "Service floor first, PhotoSelect flagship, Horizon OS command base, safe-haven backbone.",
    "seed",
  );

  for (const node of systemNodes) {
    insertContext.run(
      `node-${node.id}`,
      "graph_node",
      node.label,
      `${node.note}\nNext: ${node.next}\nOutputs: ${(node.outputs ?? []).join(", ")}`,
      "seed",
    );
  }

  db.exec("DELETE FROM context_fts");
  db.exec(`
    INSERT INTO context_fts (id, kind, title, body, source)
    SELECT id, kind, title, body, source FROM contexts
  `);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const db = openHorizonDb();
  const nodeCount = db.prepare("SELECT count(*) AS count FROM graph_nodes").get().count;
  const eventCount = db.prepare("SELECT count(*) AS count FROM calendar_events").get().count;
  console.log(JSON.stringify({ ok: true, dbPath, nodeCount, eventCount }, null, 2));
  db.close();
}

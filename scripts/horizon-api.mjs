import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { openHorizonDb } from "./horizon-db.mjs";

const port = Number(process.env.HORIZON_API_PORT ?? 8787);
const db = openHorizonDb();

function json(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "http://127.0.0.1:5177",
    "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function all(sql, ...params) {
  return db.prepare(sql).all(...params);
}

function getCommandBase() {
  return {
    nodes: all("SELECT * FROM graph_nodes ORDER BY kind, label"),
    edges: all("SELECT * FROM graph_edges ORDER BY created_at"),
    events: all("SELECT * FROM calendar_events ORDER BY time_label"),
    tasks: all("SELECT * FROM tasks ORDER BY created_at DESC LIMIT 50"),
    contexts: all("SELECT id, kind, title, source, status, updated_at FROM contexts ORDER BY updated_at DESC LIMIT 50"),
    decisions: all("SELECT * FROM decisions ORDER BY created_at DESC LIMIT 25"),
  };
}

function toFtsQuery(input) {
  const cleaned = String(input ?? "")
    .replace(/[^a-zA-Z0-9_ -]/g, " ")
    .trim();
  if (!cleaned) return "";
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `${term}*`)
    .join(" OR ");
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") return json(res, 204, {});
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      return json(res, 200, { ok: true, service: "horizon-api" });
    }

    if (req.method === "GET" && url.pathname === "/api/command-base") {
      return json(res, 200, getCommandBase());
    }

    if (req.method === "GET" && url.pathname === "/api/search") {
      const query = toFtsQuery(url.searchParams.get("q"));
      if (!query) return json(res, 200, { results: [] });
      const results = db
        .prepare(
          `SELECT id, kind, title, source, snippet(context_fts, 3, '[', ']', '...', 16) AS snippet
           FROM context_fts
           WHERE context_fts MATCH ?
           LIMIT 20`,
        )
        .all(query);
      return json(res, 200, { results });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/nodes/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/nodes/", ""));
      const body = await readJson(req);
      db.prepare("UPDATE graph_nodes SET x = ?, y = ?, updated_at = datetime('now') WHERE id = ?").run(Number(body.x), Number(body.y), id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "POST" && url.pathname === "/api/tasks") {
      const body = await readJson(req);
      const id = randomUUID();
      db.prepare(`
        INSERT INTO tasks (id, node_id, event_id, title, priority, revenue_impact, due_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        body.node_id ?? null,
        body.event_id ?? null,
        body.title ?? "Untitled task",
        body.priority ?? "normal",
        Number(body.revenue_impact ?? 0),
        body.due_at ?? null,
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "POST" && url.pathname === "/api/context") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      db.prepare(`
        INSERT INTO contexts (id, kind, title, body, source)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          kind = excluded.kind,
          title = excluded.title,
          body = excluded.body,
          source = excluded.source,
          updated_at = datetime('now')
      `).run(id, body.kind ?? "note", body.title ?? "Untitled context", body.body ?? "", body.source ?? "api");
      db.prepare("DELETE FROM context_fts WHERE id = ?").run(id);
      db.prepare("INSERT INTO context_fts (id, kind, title, body, source) VALUES (?, ?, ?, ?, ?)").run(
        id,
        body.kind ?? "note",
        body.title ?? "Untitled context",
        body.body ?? "",
        body.source ?? "api",
      );
      return json(res, 201, { ok: true, id });
    }

    return json(res, 404, { ok: false, error: "not_found" });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`horizon-api listening on http://127.0.0.1:${port}`);
});

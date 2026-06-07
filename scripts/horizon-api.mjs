import "./env.mjs";

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openHorizonDb } from "./horizon-db.mjs";
import { runProjectSweep, latestProjectSweep } from "./project-sweep.mjs";
import { generateRevenueActions } from "./revenue-actions.mjs";
import { fetchFeed } from "./rss.mjs";
import { getUsageSummary } from "./usage.mjs";
import { mcpServerSeed } from "../src/data/horizon.js";
import { portfolioProjects } from "../src/data/portfolio.js";
import { frontmatter, listNotes, readNote, vaultInfo, writeNote } from "./vault.mjs";
import { callTool, connectServer, connectionState, disconnectServer, finishAuth, listTools } from "./mcp-client.mjs";
import { buildRunnableSpec } from "./action-spec.mjs";
import { enrichAction, geminiAvailable } from "./gemini.mjs";
import { autoEnrich } from "./auto-enrich.mjs";
import { runCycle as runHorizonCycle, loopStatus } from "./horizon-loop.mjs";
import { gitDetail } from "./git-detail.mjs";
import { trustSummary } from "./trust.mjs";
import { rankActions } from "./ranking.mjs";
import { loadSources, priorityFor } from "./sources.mjs";
import { ingestWikiSource, runWikiSourceCoverage, searchWiki, syncHorizonWiki, wikiStatus } from "./wiki.mjs";
import {
  createSession as julesCreateSession,
  getSession as julesGetSession,
  julesAvailable,
  listActivities as julesListActivities,
  listSources as julesListSources,
} from "./jules.mjs";

function mcpServerById(id) {
  return mcpServerSeed.find((s) => s.id === id) ?? null;
}

const inrFmt = (n) => `INR ${Number(n ?? 0).toLocaleString("en-IN")}`;

function syncVaultSnapshots() {
  const stamp = new Date().toISOString();
  const written = [];
  const put = (relPath, body) => written.push(writeNote(relPath, body).path);

  // Command Center
  const actions = all("SELECT * FROM action_queue WHERE status != 'dismissed' ORDER BY status, sort_order");
  const inQueue = actions.filter((a) => a.status === "suggested" || a.status === "queued").length;
  const cmd = [
    frontmatter({ title: "Command Center", source: "horizon-os", synced: stamp, tags: "horizon/command" }),
    "# Command Center\n",
    `Operator status: **${inQueue} suggestions in queue**, ${actions.filter((a) => a.status === "deployed").length} deployed.\n`,
    "## Action queue\n",
    ...actions.map((a) => `- [${a.status === "done" ? "x" : " "}] **${a.title}** (${a.agent} → ${a.project_id}) — ${a.summary}`),
    "",
  ].join("\n");
  put("Horizon/Command Center.md", cmd);

  // Capital
  const runway = db.prepare("SELECT * FROM runway_state WHERE id = 'current'").get() ?? {};
  const targets = all("SELECT * FROM capital_targets ORDER BY sort_order");
  const pipeline = all("SELECT * FROM offer_pipeline ORDER BY sort_order");
  const capital = [
    frontmatter({ title: "Capital", source: "horizon-os", synced: stamp, tags: "horizon/capital" }),
    "# Capital & Runway\n",
    `- Cash: ${inrFmt(runway.current_cash_inr)} · Burn: ${inrFmt(runway.monthly_burn_inr)}/mo · MRR: ${inrFmt(runway.mrr_inr)}`,
    `- Milestone: ${runway.milestone_date ?? "2027-02-15"}\n`,
    "## Targets\n",
    "| Target | Amount | Saved | Deadline |",
    "| --- | --- | --- | --- |",
    ...targets.map((t) => `| ${t.label} | ${inrFmt(t.target_inr)} | ${inrFmt(t.saved_inr)} | ${t.deadline} |`),
    "\n## Offer pipeline\n",
    ...pipeline.map((p) => `- **${p.buyer}** — ${p.offer} (${p.stage}, ${inrFmt(p.value_inr)})`),
    "",
  ].join("\n");
  put("Horizon/Capital.md", capital);

  // Journey
  const entries = all("SELECT * FROM journey_entries ORDER BY date DESC, sort_order");
  const journey = [
    frontmatter({ title: "Journey", source: "horizon-os", synced: stamp, tags: "horizon/journey" }),
    "# Journey Trek Ledger\n",
    ...entries.map((e) => {
      const geo = e.latitude != null ? ` \`${e.latitude},${e.longitude}\` @ ${e.altitude_m}m` : "";
      const indent = e.parent_id ? "  " : "";
      return `${indent}- **[${e.segment}] ${e.title}** (${e.date}, ${e.anchor})${geo}\n${indent}  - ${e.lesson}\n${indent}  - Next: ${e.next_action}`;
    }),
    "",
  ].join("\n");
  put("Horizon/Journey.md", journey);

  // Saved signals
  const saved = all("SELECT * FROM signals WHERE status = 'saved' ORDER BY coalesce(published_at, fetched_at) DESC LIMIT 100");
  const sig = [
    frontmatter({ title: "Signals - Saved", source: "horizon-os", synced: stamp, tags: "horizon/signals" }),
    "# Saved Signals\n",
    ...(saved.length ? saved.map((s) => `- [${s.source_name}] [${s.title}](${s.url}) — ${s.category}`) : ["_No saved signals yet._"]),
    "",
  ].join("\n");
  put("Horizon/Signals - Saved.md", sig);

  return { synced: stamp, files: written };
}

const port = Number(process.env.HORIZON_API_PORT ?? 8787);
const db = openHorizonDb();
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const queueDir = resolve(repoRoot, ".horizon", "queue");

function json(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "http://127.0.0.1:5177",
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
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

function actionRows() {
  return all("SELECT * FROM action_queue ORDER BY status, sort_order, created_at");
}

function calendarEventPayload(body) {
  const title = String(body.title ?? "").trim() || "Untitled block";
  const lane = String(body.lane ?? body.calendar_id ?? "Manual").trim() || "Manual";
  const startAt = body.start_at ?? null;
  const endAt = body.end_at ?? null;
  return {
    title,
    lane,
    time_label: body.time_label ?? (startAt && endAt ? `${startAt} - ${endAt}` : "Unscheduled"),
    start_at: startAt,
    end_at: endAt,
    all_day: Number(body.all_day ?? 0),
    calendar_id: body.calendar_id ?? lane.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    description: body.description ?? "",
    location: body.location ?? "",
    people_json: Array.isArray(body.people) ? JSON.stringify(body.people) : body.people_json ?? "[]",
    rrule: body.rrule ?? "",
    exdate_json: Array.isArray(body.exdate) ? JSON.stringify(body.exdate) : body.exdate_json ?? "[]",
    color: body.color ?? "#2558d8",
    status: body.status ?? "confirmed",
    recurrence_rule: body.recurrence_rule ?? (body.rrule ? `RRULE:${body.rrule}` : ""),
    output_contract: body.output_contract ?? body.output ?? "",
    provider: body.provider ?? "local",
    provider_event_id: body.provider_event_id ?? null,
    sync_state: body.sync_state ?? "local",
  };
}

function taskPayload(body) {
  return {
    node_id: body.node_id ?? null,
    event_id: body.event_id ?? null,
    project_id: body.project_id ?? "",
    phase_id: body.phase_id ?? "",
    lane: body.lane ?? "General",
    title: String(body.title ?? "").trim() || "Untitled task",
    status: body.status ?? "open",
    priority: body.priority ?? "normal",
    revenue_impact: Number(body.revenue_impact ?? 0),
    due_at: body.due_at ?? null,
    evidence: body.evidence ?? "",
    sort_order: Number(body.sort_order ?? 0),
  };
}

function journeyPayload(body) {
  return {
    parent_id: body.parent_id ?? body.parentId ?? null,
    date: body.date ?? new Date().toISOString().slice(0, 10),
    tz: body.tz ?? "Asia/Kolkata",
    type: body.type ?? "Field Scout",
    anchor: body.anchor ?? "Spec",
    segment: body.segment ?? "ridge",
    title: String(body.title ?? "").trim() || "Untitled leg",
    location: body.location ?? "",
    latitude: body.latitude ?? null,
    longitude: body.longitude ?? null,
    altitude_m: body.altitude_m ?? body.altitudeMeters ?? null,
    accuracy_m: body.accuracy_m ?? body.accuracyMeters ?? null,
    elevation_gain_m: body.elevation_gain_m ?? body.elevationGainMeters ?? null,
    terrain: body.terrain ?? "",
    difficulty: body.difficulty ?? "",
    evidence: body.evidence ?? "",
    lesson: body.lesson ?? "",
    next_action: body.next_action ?? body.next ?? "",
    tags_json: Array.isArray(body.tags) ? JSON.stringify(body.tags) : body.tags_json ?? "[]",
    sort_order: Number(body.sort_order ?? body.sortOrder ?? 0),
  };
}

function getCommandBase() {
  return {
    nodes: all("SELECT * FROM graph_nodes ORDER BY kind, label"),
    edges: all("SELECT * FROM graph_edges ORDER BY created_at"),
    events: all("SELECT * FROM calendar_events ORDER BY coalesce(start_at, time_label), title"),
    tasks: all("SELECT * FROM tasks ORDER BY sort_order, due_at, created_at DESC LIMIT 100"),
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

    if (req.method === "GET" && url.pathname === "/api/projects") {
      return json(res, 200, {
        projects: portfolioProjects,
        sweep: latestProjectSweep(db),
      });
    }

    if (req.method === "POST" && url.pathname === "/api/projects/sweep") {
      const sweep = runProjectSweep(db);
      return json(res, 200, sweep);
    }

    if (req.method === "POST" && url.pathname === "/api/revenue-actions/generate") {
      const body = await readJson(req);
      const result = generateRevenueActions(db, { sweep: body.sweep !== false });
      return json(res, 200, {
        ...result,
        actions: actionRows(),
      });
    }

    if (req.method === "GET" && url.pathname === "/api/calendar/events") {
      return json(res, 200, {
        events: all("SELECT * FROM calendar_events ORDER BY coalesce(start_at, time_label), title"),
      });
    }

    if (req.method === "POST" && url.pathname === "/api/calendar/events") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      const event = calendarEventPayload(body);
      db.prepare(`
        INSERT INTO calendar_events (
          id, title, lane, time_label, start_at, end_at, all_day, calendar_id,
          description, location, people_json, rrule, exdate_json, color, status,
          recurrence_rule, output_contract, provider, provider_event_id, sync_state
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        event.title,
        event.lane,
        event.time_label,
        event.start_at,
        event.end_at,
        event.all_day,
        event.calendar_id,
        event.description,
        event.location,
        event.people_json,
        event.rrule,
        event.exdate_json,
        event.color,
        event.status,
        event.recurrence_rule,
        event.output_contract,
        event.provider,
        event.provider_event_id,
        event.sync_state,
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/calendar/events/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/calendar/events/", ""));
      const existing = db.prepare("SELECT * FROM calendar_events WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "calendar_event_not_found" });
      const event = calendarEventPayload({ ...existing, ...(await readJson(req)) });
      db.prepare(`
        UPDATE calendar_events
        SET title = ?, lane = ?, time_label = ?, start_at = ?, end_at = ?, all_day = ?,
            calendar_id = ?, description = ?, location = ?, people_json = ?, rrule = ?,
            exdate_json = ?, color = ?, status = ?, recurrence_rule = ?, output_contract = ?,
            provider = ?, provider_event_id = ?, sync_state = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        event.title,
        event.lane,
        event.time_label,
        event.start_at,
        event.end_at,
        event.all_day,
        event.calendar_id,
        event.description,
        event.location,
        event.people_json,
        event.rrule,
        event.exdate_json,
        event.color,
        event.status,
        event.recurrence_rule,
        event.output_contract,
        event.provider,
        event.provider_event_id,
        event.sync_state,
        id,
      );
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/calendar/events/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/calendar/events/", ""));
      db.prepare("DELETE FROM calendar_events WHERE id = ?").run(id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "GET" && url.pathname === "/api/journey") {
      return json(res, 200, {
        entries: all("SELECT * FROM journey_entries ORDER BY date DESC, sort_order, created_at"),
      });
    }

    if (req.method === "POST" && url.pathname === "/api/journey") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      const entry = journeyPayload(body);
      db.prepare(`
        INSERT INTO journey_entries (
          id, parent_id, date, tz, type, anchor, segment, title, location,
          latitude, longitude, altitude_m, accuracy_m, elevation_gain_m,
          terrain, difficulty, evidence, lesson, next_action, tags_json, sort_order
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, entry.parent_id, entry.date, entry.tz, entry.type, entry.anchor,
        entry.segment, entry.title, entry.location, entry.latitude, entry.longitude,
        entry.altitude_m, entry.accuracy_m, entry.elevation_gain_m, entry.terrain,
        entry.difficulty, entry.evidence, entry.lesson, entry.next_action,
        entry.tags_json, entry.sort_order,
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/journey/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/journey/", ""));
      const existing = db.prepare("SELECT * FROM journey_entries WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "journey_entry_not_found" });
      const entry = journeyPayload({ ...existing, ...(await readJson(req)) });
      db.prepare(`
        UPDATE journey_entries
        SET parent_id = ?, date = ?, tz = ?, type = ?, anchor = ?, segment = ?, title = ?,
            location = ?, latitude = ?, longitude = ?, altitude_m = ?, accuracy_m = ?,
            elevation_gain_m = ?, terrain = ?, difficulty = ?, evidence = ?, lesson = ?,
            next_action = ?, tags_json = ?, sort_order = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        entry.parent_id, entry.date, entry.tz, entry.type, entry.anchor, entry.segment,
        entry.title, entry.location, entry.latitude, entry.longitude, entry.altitude_m,
        entry.accuracy_m, entry.elevation_gain_m, entry.terrain, entry.difficulty,
        entry.evidence, entry.lesson, entry.next_action, entry.tags_json, entry.sort_order,
        id,
      );
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/journey/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/journey/", ""));
      db.prepare("DELETE FROM journey_entries WHERE id = ?").run(id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "GET" && url.pathname === "/api/capital") {
      return json(res, 200, {
        targets: all("SELECT * FROM capital_targets ORDER BY sort_order, label"),
        ledger: all("SELECT * FROM cash_ledger ORDER BY date DESC, created_at DESC LIMIT 200"),
        pipeline: all("SELECT * FROM offer_pipeline ORDER BY sort_order, updated_at DESC"),
        runway: db.prepare("SELECT * FROM runway_state WHERE id = 'current'").get() ?? null,
      });
    }

    if (req.method === "PATCH" && url.pathname === "/api/capital/runway") {
      const body = await readJson(req);
      const existing = db.prepare("SELECT * FROM runway_state WHERE id = 'current'").get() ?? {};
      const next = {
        current_cash_inr: Number(body.current_cash_inr ?? body.currentCashInr ?? existing.current_cash_inr ?? 0),
        monthly_burn_inr: Number(body.monthly_burn_inr ?? body.monthlyBurnInr ?? existing.monthly_burn_inr ?? 0),
        mrr_inr: Number(body.mrr_inr ?? body.mrrInr ?? existing.mrr_inr ?? 0),
        weekly_outbound_target: Number(body.weekly_outbound_target ?? existing.weekly_outbound_target ?? 25),
        weekly_conversation_target: Number(body.weekly_conversation_target ?? existing.weekly_conversation_target ?? 3),
        weekly_offer_target: Number(body.weekly_offer_target ?? existing.weekly_offer_target ?? 1),
        milestone_date: body.milestone_date ?? existing.milestone_date ?? "2027-02-15",
      };
      db.prepare(`
        INSERT INTO runway_state (id, current_cash_inr, monthly_burn_inr, mrr_inr,
          weekly_outbound_target, weekly_conversation_target, weekly_offer_target, milestone_date, updated_at)
        VALUES ('current', ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          current_cash_inr = excluded.current_cash_inr,
          monthly_burn_inr = excluded.monthly_burn_inr,
          mrr_inr = excluded.mrr_inr,
          weekly_outbound_target = excluded.weekly_outbound_target,
          weekly_conversation_target = excluded.weekly_conversation_target,
          weekly_offer_target = excluded.weekly_offer_target,
          milestone_date = excluded.milestone_date,
          updated_at = datetime('now')
      `).run(
        next.current_cash_inr, next.monthly_burn_inr, next.mrr_inr,
        next.weekly_outbound_target, next.weekly_conversation_target,
        next.weekly_offer_target, next.milestone_date,
      );
      return json(res, 200, { ok: true });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/capital/targets/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/capital/targets/", ""));
      const existing = db.prepare("SELECT * FROM capital_targets WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "target_not_found" });
      const body = await readJson(req);
      db.prepare("UPDATE capital_targets SET saved_inr = ?, next_action = ?, updated_at = datetime('now') WHERE id = ?").run(
        Number(body.saved_inr ?? body.savedInr ?? existing.saved_inr),
        body.next_action ?? body.next ?? existing.next_action,
        id,
      );
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "POST" && url.pathname === "/api/capital/ledger") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      db.prepare(`
        INSERT INTO cash_ledger (id, date, direction, amount_inr, category, note, source)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        body.date ?? new Date().toISOString().slice(0, 10),
        body.direction === "out" ? "out" : "in",
        Number(body.amount_inr ?? body.amountInr ?? 0),
        body.category ?? "general",
        body.note ?? "",
        body.source ?? "manual",
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/capital/ledger/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/capital/ledger/", ""));
      db.prepare("DELETE FROM cash_ledger WHERE id = ?").run(id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "POST" && url.pathname === "/api/capital/pipeline") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      db.prepare(`
        INSERT INTO offer_pipeline (id, buyer, offer, stage, value_inr, recurring, next_action, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        body.buyer ?? "",
        body.offer ?? "",
        body.stage ?? "prospect",
        Number(body.value_inr ?? body.valueInr ?? 0),
        Number(body.recurring ?? 0),
        body.next_action ?? body.next ?? "",
        Number(body.sort_order ?? body.sortOrder ?? 0),
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/capital/pipeline/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/capital/pipeline/", ""));
      const existing = db.prepare("SELECT * FROM offer_pipeline WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "offer_not_found" });
      const body = await readJson(req);
      db.prepare(`
        UPDATE offer_pipeline SET buyer = ?, offer = ?, stage = ?, value_inr = ?, recurring = ?,
          next_action = ?, sort_order = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        body.buyer ?? existing.buyer,
        body.offer ?? existing.offer,
        body.stage ?? existing.stage,
        Number(body.value_inr ?? body.valueInr ?? existing.value_inr),
        Number(body.recurring ?? existing.recurring),
        body.next_action ?? body.next ?? existing.next_action,
        Number(body.sort_order ?? existing.sort_order),
        id,
      );
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/capital/pipeline/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/capital/pipeline/", ""));
      db.prepare("DELETE FROM offer_pipeline WHERE id = ?").run(id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "GET" && url.pathname === "/api/vault") {
      return json(res, 200, { ...vaultInfo(), notes: listNotes().slice(0, 80), wiki: wikiStatus(db) });
    }

    if (req.method === "GET" && url.pathname === "/api/vault/note") {
      const path = url.searchParams.get("path");
      try {
        return json(res, 200, { ok: true, ...readNote(path) });
      } catch (error) {
        return json(res, 400, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/vault/sync") {
      try {
        const snapshots = syncVaultSnapshots();
        const wiki = syncHorizonWiki(db);
        return json(res, 200, {
          ok: true,
          synced: snapshots.synced,
          files: [...snapshots.files, ...wiki.files],
          snapshots,
          wiki,
        });
      } catch (error) {
        return json(res, 500, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "GET" && url.pathname === "/api/wiki") {
      try {
        return json(res, 200, { ok: true, wiki: wikiStatus(db) });
      } catch (error) {
        return json(res, 500, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/wiki/sync") {
      try {
        const result = syncHorizonWiki(db);
        return json(res, 200, { ok: true, ...result, wiki: wikiStatus(db) });
      } catch (error) {
        return json(res, 500, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "GET" && url.pathname === "/api/wiki/search") {
      try {
        const query = url.searchParams.get("q") ?? "";
        const limit = Number(url.searchParams.get("limit") ?? 10);
        return json(res, 200, { ok: true, query, results: searchWiki(db, query, { limit }) });
      } catch (error) {
        return json(res, 500, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/wiki/ingest") {
      try {
        const body = await readJson(req);
        const result = ingestWikiSource(db, {
          sourcePath: body.sourcePath ?? body.path,
          title: body.title,
          kind: body.kind,
          tags: Array.isArray(body.tags) ? body.tags : [],
          force: Boolean(body.force),
        });
        return json(res, 200, { ok: true, ...result, wiki: wikiStatus(db) });
      } catch (error) {
        return json(res, 400, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/wiki/coverage") {
      try {
        const body = await readJson(req);
        const result = runWikiSourceCoverage(db, { force: Boolean(body.force) });
        return json(res, 200, { ok: true, ...result, wiki: wikiStatus(db) });
      } catch (error) {
        return json(res, 500, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/vault/note") {
      const body = await readJson(req);
      try {
        const result = writeNote(body.path, body.content ?? "");
        return json(res, 201, { ok: true, ...result });
      } catch (error) {
        return json(res, 400, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "GET" && url.pathname === "/api/mcp") {
      return json(res, 200, {
        servers: mcpServerSeed.map((s) => ({ ...s, state: connectionState(s.id) })),
      });
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/mcp/") && url.pathname.endsWith("/connect")) {
      const id = decodeURIComponent(url.pathname.replace("/api/mcp/", "").replace("/connect", ""));
      const server = mcpServerById(id);
      if (!server) return json(res, 404, { ok: false, error: "server_not_found" });
      try {
        const result = await connectServer(id, server.url);
        return json(res, 200, { ok: true, ...result });
      } catch (error) {
        return json(res, 502, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/mcp/") && url.pathname.endsWith("/callback")) {
      const id = decodeURIComponent(url.pathname.replace("/api/mcp/", "").replace("/callback", ""));
      const code = url.searchParams.get("code");
      const html = (msg, ok) =>
        `<!doctype html><meta charset="utf-8"><body style="font-family:ui-sans-serif;background:#fbfff9;color:#17201a;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><h2>${ok ? "Connected" : "Auth failed"}</h2><p>${msg}</p><p style="color:#708078">You can close this tab.</p></div><script>setTimeout(()=>window.close(),1500)</script></body>`;
      if (!code) {
        res.writeHead(400, { "content-type": "text/html" });
        return res.end(html("No authorization code returned.", false));
      }
      try {
        await finishAuth(id, code);
        res.writeHead(200, { "content-type": "text/html" });
        return res.end(html(`${id} is connected to Horizon.`, true));
      } catch (error) {
        res.writeHead(502, { "content-type": "text/html" });
        return res.end(html(String(error.message ?? error), false));
      }
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/mcp/") && url.pathname.endsWith("/tools")) {
      const id = decodeURIComponent(url.pathname.replace("/api/mcp/", "").replace("/tools", ""));
      try {
        const tools = await listTools(id);
        return json(res, 200, { ok: true, tools: tools.map((t) => ({ name: t.name, description: t.description })) });
      } catch (error) {
        return json(res, 409, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/mcp/") && url.pathname.endsWith("/call")) {
      const id = decodeURIComponent(url.pathname.replace("/api/mcp/", "").replace("/call", ""));
      const body = await readJson(req);
      try {
        const result = await callTool(id, body.name, body.arguments ?? {});
        return json(res, 200, { ok: true, result });
      } catch (error) {
        return json(res, 409, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/mcp/") && url.pathname.endsWith("/disconnect")) {
      const id = decodeURIComponent(url.pathname.replace("/api/mcp/", "").replace("/disconnect", ""));
      disconnectServer(id);
      return json(res, 200, { ok: true });
    }

    if (req.method === "GET" && url.pathname === "/api/usage") {
      const force = url.searchParams.get("refresh") === "1";
      const summary = await getUsageSummary({ force });
      return json(res, 200, summary);
    }

    if (req.method === "GET" && url.pathname === "/api/signals") {
      return json(res, 200, {
        sources: all("SELECT * FROM signal_sources ORDER BY sort_order, name"),
        signals: all("SELECT * FROM signals WHERE status != 'dismissed' ORDER BY coalesce(published_at, fetched_at) DESC LIMIT 300"),
      });
    }

    if (req.method === "POST" && url.pathname === "/api/signals/refresh") {
      const sources = all("SELECT * FROM signal_sources WHERE active = 1 ORDER BY sort_order");
      const insert = db.prepare(`
        INSERT INTO signals (id, source_id, source_name, category, kind, title, url, summary, thumbnail, published_at, status, fetched_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          summary = excluded.summary,
          thumbnail = excluded.thumbnail,
          published_at = excluded.published_at,
          fetched_at = datetime('now')
      `);
      let inserted = 0;
      const errors = [];
      await Promise.all(
        sources.map(async (source) => {
          try {
            const items = await fetchFeed(source);
            for (const item of items.slice(0, 40)) {
              const before = db.prepare("SELECT 1 FROM signals WHERE id = ?").get(item.id);
              insert.run(
                item.id,
                source.id,
                source.name,
                source.category,
                source.kind,
                item.title,
                item.url,
                item.summary,
                item.thumbnail,
                item.published_at,
              );
              if (!before) inserted += 1;
            }
          } catch (error) {
            errors.push({ source: source.id, error: String(error.message ?? error) });
          }
        }),
      );
      // remove the placeholder seed once real signals exist
      db.prepare("DELETE FROM signals WHERE id = 'seed-1' AND (SELECT count(*) FROM signals WHERE id != 'seed-1') > 0").run();
      return json(res, 200, { ok: true, sources: sources.length, inserted, errors });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/signals/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/signals/", ""));
      const existing = db.prepare("SELECT * FROM signals WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "signal_not_found" });
      const body = await readJson(req);
      db.prepare("UPDATE signals SET status = ? WHERE id = ?").run(body.status ?? existing.status, id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "POST" && url.pathname === "/api/signal-sources") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      db.prepare(`
        INSERT INTO signal_sources (id, name, url, category, kind, active, sort_order)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `).run(
        id,
        String(body.name ?? "").trim() || "Untitled source",
        String(body.url ?? "").trim(),
        body.category ?? "AI News Hubs",
        body.kind ?? "rss",
        Number(body.sort_order ?? body.sortOrder ?? 99),
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/signal-sources/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/signal-sources/", ""));
      db.prepare("DELETE FROM signal_sources WHERE id = ?").run(id);
      db.prepare("DELETE FROM signals WHERE source_id = ?").run(id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "GET" && url.pathname === "/api/action-queue") {
      return json(res, 200, {
        actions: actionRows(),
      });
    }

    if (req.method === "POST" && url.pathname === "/api/action-queue") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      db.prepare(`
        INSERT INTO action_queue (id, title, summary, source, project_id, project_path, agent, prompt, status, impact, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        String(body.title ?? "").trim() || "Untitled action",
        body.summary ?? "",
        body.source ?? "manual",
        body.project_id ?? body.projectId ?? "",
        body.project_path ?? body.projectPath ?? "",
        body.agent ?? "claude",
        body.prompt ?? "",
        body.status ?? "suggested",
        body.impact ?? "normal",
        Number(body.sort_order ?? body.sortOrder ?? 0),
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "GET" && url.pathname === "/api/loop/status") {
      return json(res, 200, loopStatus());
    }

    if (req.method === "GET" && url.pathname === "/api/trust") {
      try {
        const trust = trustSummary(db);
        // Inherit money weight + lane from the source registry by project slug (tolerant match),
        // so ranking reflects the operator's money priorities, not just lifecycle state.
        const { priorities } = loadSources();
        const actions = db.prepare("SELECT * FROM action_queue WHERE status != 'dismissed'").all().map((a) => {
          const pr = priorityFor(priorities, a.project_id);
          return { ...a, priority_score: a.priority_score || pr?.weight || 0, lane: a.lane || pr?.lane || "" };
        });
        const nextMoves = rankActions(actions).slice(0, 5).map((a) => ({
          id: a.id, title: a.title, project_id: a.project_id, lane: a.lane,
          state: a.state, priority_score: a.priority_score, enriched: a.enriched,
        }));
        return json(res, 200, { ok: true, trust, nextMoves });
      } catch (error) {
        return json(res, 500, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "GET" && url.pathname === "/api/projects/git") {
      const path = url.searchParams.get("path") ?? "";
      // Only inspect paths under the operator's bolting workspace or this repo.
      if (!/bolting|horizon-dashboard-preview/.test(path)) {
        return json(res, 400, { ok: false, error: "path_not_allowed" });
      }
      try {
        return json(res, 200, gitDetail(path));
      } catch (error) {
        return json(res, 500, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/loop/run") {
      const body = await readJson(req);
      try {
        const cycle = await runHorizonCycle({ db, enrichLimit: Number(body.enrichLimit) || undefined });
        return json(res, 200, cycle);
      } catch (error) {
        return json(res, 502, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/action-queue/enrich-all") {
      const body = await readJson(req);
      try {
        const result = await autoEnrich({ db, limit: Number(body.limit) || undefined });
        return json(res, 200, result);
      } catch (error) {
        return json(res, 502, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "GET" && url.pathname === "/api/jules/sources") {
      if (!julesAvailable()) return json(res, 503, { ok: false, error: "jules_key_missing" });
      try {
        return json(res, 200, { ok: true, sources: await julesListSources() });
      } catch (error) {
        return json(res, 502, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/jules/sessions/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/jules/sessions/", ""));
      try {
        const [session, activities] = await Promise.all([julesGetSession(id), julesListActivities(id).catch(() => [])]);
        return json(res, 200, { ok: true, session, activities });
      } catch (error) {
        return json(res, 502, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/action-queue/") && url.pathname.endsWith("/jules")) {
      const id = decodeURIComponent(url.pathname.replace("/api/action-queue/", "").replace("/jules", ""));
      const action = db.prepare("SELECT * FROM action_queue WHERE id = ?").get(id);
      if (!action) return json(res, 404, { ok: false, error: "action_not_found" });
      if (!julesAvailable()) return json(res, 503, { ok: false, error: "jules_key_missing" });
      const body = await readJson(req);
      if (!body.source) {
        // help the caller pick a connected repo
        try {
          return json(res, 409, { ok: false, error: "source_required", sources: await julesListSources() });
        } catch (error) {
          return json(res, 409, { ok: false, error: "source_required", sourcesError: String(error.message ?? error) });
        }
      }
      // Double-dispatch guard: one open Jules dispatch per action at a time.
      const openDispatch = db
        .prepare("SELECT id, external_id FROM agent_dispatches WHERE action_id = ? AND agent = 'jules' AND reconciled_at = ''")
        .get(action.id);
      if (openDispatch) {
        return json(res, 409, { ok: false, error: "already_dispatched", dispatchId: openDispatch.id, sessionId: openDispatch.external_id });
      }
      // Outbox row written BEFORE the call (idempotency key persisted first).
      const priorCount = db.prepare("SELECT COUNT(*) AS n FROM agent_dispatches WHERE action_id = ?").get(action.id).n;
      const idempotencyKey = `jules:${id}:${priorCount + 1}`;
      const dispatchRow = db
        .prepare("INSERT INTO agent_dispatches (action_id, agent, idempotency_key, external_state, dispatched_at) VALUES (?, 'jules', ?, 'dispatching', datetime('now'))")
        .run(action.id, idempotencyKey);
      const dispatchId = dispatchRow.lastInsertRowid;
      try {
        const prompt = buildRunnableSpec(action);
        const session = await julesCreateSession({
          prompt,
          source: body.source,
          startingBranch: body.branch ?? body.startingBranch ?? "main",
          title: action.title,
          requirePlanApproval: body.requirePlanApproval !== false,
          automationMode: body.automationMode,
        });
        const sessionId = session.id ?? session.name ?? "";
        db.prepare("UPDATE agent_dispatches SET external_id = ?, external_state = 'in_progress', last_polled_at = datetime('now') WHERE id = ?").run(sessionId, dispatchId);
        db.prepare("UPDATE action_queue SET jules_session_id = ?, dispatch_target = 'jules', state = 'dispatched', dispatched_at = datetime('now'), idempotency_key = ?, status = 'deployed', updated_at = datetime('now') WHERE id = ?").run(sessionId, idempotencyKey, id);
        db.prepare("INSERT INTO command_log (id, actor, action, target, payload_json) VALUES (?, ?, ?, ?, ?)").run(
          randomUUID(),
          "horizon",
          "jules_dispatch",
          action.project_id || action.id,
          JSON.stringify({ id, sessionId }),
        );
        return json(res, 200, { ok: true, id, sessionId, dispatchId, session });
      } catch (error) {
        const errMsg = String(error.message ?? error);
        db.prepare("UPDATE agent_dispatches SET external_state = 'failed', reconciled_at = datetime('now'), last_error = ? WHERE id = ?").run(errMsg.slice(0, 200), dispatchId);
        return json(res, 502, { ok: false, error: errMsg });
      }
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/action-queue/") && url.pathname.endsWith("/enrich")) {
      const id = decodeURIComponent(url.pathname.replace("/api/action-queue/", "").replace("/enrich", ""));
      const action = db.prepare("SELECT * FROM action_queue WHERE id = ?").get(id);
      if (!action) return json(res, 404, { ok: false, error: "action_not_found" });
      if (!geminiAvailable()) return json(res, 503, { ok: false, error: "gemini_key_missing" });
      try {
        const fields = await enrichAction(action);
        db.prepare(`
          UPDATE action_queue SET goal = ?, constraints = ?, done_criteria = ?, tools = ?, prompt = ?,
            cwd = COALESCE(NULLIF(cwd,''), ?), enriched = 1, updated_at = datetime('now')
          WHERE id = ?
        `).run(
          fields.goal,
          fields.constraints,
          fields.done_criteria,
          fields.tools,
          fields.prompt || action.prompt,
          action.project_path || "",
          id,
        );
        return json(res, 200, { ok: true, id, ...fields });
      } catch (error) {
        return json(res, 502, { ok: false, error: String(error.message ?? error) });
      }
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/action-queue/") && url.pathname.endsWith("/deploy")) {
      const id = decodeURIComponent(url.pathname.replace("/api/action-queue/", "").replace("/deploy", ""));
      const action = db.prepare("SELECT * FROM action_queue WHERE id = ?").get(id);
      if (!action) return json(res, 404, { ok: false, error: "action_not_found" });
      mkdirSync(queueDir, { recursive: true });
      const stamp = new Date().toISOString();
      const filename = `${id}.md`;
      const filePath = resolve(queueDir, filename);
      const contents = buildRunnableSpec(action, { stamp });
      writeFileSync(filePath, contents, "utf8");
      // mirror into the Obsidian vault as durable memory (control surface -> memory)
      let vaultPath = "";
      try {
        const note = frontmatter({ title: action.title, source: "horizon-action", project: action.project_id, agent: action.agent, status: "deployed", deployed: stamp, tags: "horizon/action" }) + contents;
        vaultPath = writeNote(`Horizon/Actions/${id}.md`, note).path;
      } catch {
        /* vault optional; deploy still succeeds */
      }
      db.prepare("UPDATE action_queue SET status = 'deployed', deployed_path = ?, spec_path = ?, updated_at = datetime('now') WHERE id = ?").run(filePath, filePath, id);
      db.prepare("INSERT INTO command_log (id, actor, action, target, payload_json) VALUES (?, ?, ?, ?, ?)").run(
        randomUUID(),
        "horizon",
        "action_deploy",
        action.project_id || action.id,
        JSON.stringify({ id, agent: action.agent, path: filePath }),
      );
      return json(res, 200, { ok: true, id, path: filePath, vaultPath });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/action-queue/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/action-queue/", ""));
      const existing = db.prepare("SELECT * FROM action_queue WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "action_not_found" });
      const body = await readJson(req);
      db.prepare(`
        UPDATE action_queue SET title = ?, summary = ?, project_id = ?, project_path = ?, agent = ?,
          prompt = ?, status = ?, impact = ?, sort_order = ?, cwd = ?, goal = ?, constraints = ?,
          done_criteria = ?, tools = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        body.title ?? existing.title,
        body.summary ?? existing.summary,
        body.project_id ?? body.projectId ?? existing.project_id,
        body.project_path ?? body.projectPath ?? existing.project_path,
        body.agent ?? existing.agent,
        body.prompt ?? existing.prompt,
        body.status ?? existing.status,
        body.impact ?? existing.impact,
        Number(body.sort_order ?? existing.sort_order),
        body.cwd ?? existing.cwd,
        body.goal ?? existing.goal,
        body.constraints ?? existing.constraints,
        body.done_criteria ?? body.doneCriteria ?? existing.done_criteria,
        body.tools ?? existing.tools,
        id,
      );
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/action-queue/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/action-queue/", ""));
      db.prepare("DELETE FROM action_queue WHERE id = ?").run(id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "GET" && url.pathname === "/api/inbox") {
      return json(res, 200, {
        resources: all("SELECT * FROM resources ORDER BY sort_order, created_at DESC"),
        posts: all("SELECT * FROM social_posts ORDER BY sort_order, created_at DESC"),
        skills: all("SELECT * FROM social_skills ORDER BY sort_order"),
      });
    }

    if (req.method === "POST" && url.pathname === "/api/resources") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      db.prepare(`
        INSERT INTO resources (id, title, source, kind, project_id, status, note, next_action, tags_json, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        String(body.title ?? "").trim() || "Untitled resource",
        body.source ?? "",
        body.kind ?? "link",
        body.project_id ?? body.projectId ?? "",
        body.status ?? "inbox",
        body.note ?? "",
        body.next_action ?? body.next ?? "",
        Array.isArray(body.tags) ? JSON.stringify(body.tags) : body.tags_json ?? "[]",
        Number(body.sort_order ?? body.sortOrder ?? 0),
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/resources/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/resources/", ""));
      const existing = db.prepare("SELECT * FROM resources WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "resource_not_found" });
      const body = await readJson(req);
      db.prepare(`
        UPDATE resources SET title = ?, source = ?, kind = ?, project_id = ?, status = ?,
          note = ?, next_action = ?, tags_json = ?, sort_order = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        body.title ?? existing.title,
        body.source ?? existing.source,
        body.kind ?? existing.kind,
        body.project_id ?? body.projectId ?? existing.project_id,
        body.status ?? existing.status,
        body.note ?? existing.note,
        body.next_action ?? body.next ?? existing.next_action,
        Array.isArray(body.tags) ? JSON.stringify(body.tags) : body.tags_json ?? existing.tags_json,
        Number(body.sort_order ?? existing.sort_order),
        id,
      );
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/resources/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/resources/", ""));
      db.prepare("DELETE FROM resources WHERE id = ?").run(id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "POST" && url.pathname === "/api/social-posts") {
      const body = await readJson(req);
      const id = body.id ?? randomUUID();
      db.prepare(`
        INSERT INTO social_posts (id, platform, format, hook, body, status, skill_id, project_id, scheduled_for, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        body.platform ?? "linkedin",
        body.format ?? "post",
        body.hook ?? "",
        body.body ?? "",
        body.status ?? "idea",
        body.skill_id ?? body.skillId ?? "",
        body.project_id ?? body.projectId ?? "",
        body.scheduled_for ?? null,
        Number(body.sort_order ?? body.sortOrder ?? 0),
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/social-posts/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/social-posts/", ""));
      const existing = db.prepare("SELECT * FROM social_posts WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "post_not_found" });
      const body = await readJson(req);
      db.prepare(`
        UPDATE social_posts SET platform = ?, format = ?, hook = ?, body = ?, status = ?,
          skill_id = ?, project_id = ?, scheduled_for = ?, sort_order = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        body.platform ?? existing.platform,
        body.format ?? existing.format,
        body.hook ?? existing.hook,
        body.body ?? existing.body,
        body.status ?? existing.status,
        body.skill_id ?? body.skillId ?? existing.skill_id,
        body.project_id ?? body.projectId ?? existing.project_id,
        body.scheduled_for ?? existing.scheduled_for,
        Number(body.sort_order ?? existing.sort_order),
        id,
      );
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/social-posts/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/social-posts/", ""));
      db.prepare("DELETE FROM social_posts WHERE id = ?").run(id);
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "GET" && url.pathname === "/api/tasks") {
      return json(res, 200, {
        tasks: all("SELECT * FROM tasks ORDER BY status, sort_order, due_at, created_at DESC"),
      });
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
      const task = taskPayload(body);
      db.prepare(`
        INSERT INTO tasks (
          id, node_id, event_id, project_id, phase_id, lane, title, status,
          priority, revenue_impact, due_at, evidence, sort_order
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        task.node_id,
        task.event_id,
        task.project_id,
        task.phase_id,
        task.lane,
        task.title,
        task.status,
        task.priority,
        task.revenue_impact,
        task.due_at,
        task.evidence,
        task.sort_order,
      );
      return json(res, 201, { ok: true, id });
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/tasks/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/tasks/", ""));
      const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
      if (!existing) return json(res, 404, { ok: false, error: "task_not_found" });
      const task = taskPayload({ ...existing, ...(await readJson(req)) });
      db.prepare(`
        UPDATE tasks
        SET node_id = ?, event_id = ?, project_id = ?, phase_id = ?, lane = ?, title = ?,
            status = ?, priority = ?, revenue_impact = ?, due_at = ?, evidence = ?,
            sort_order = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        task.node_id,
        task.event_id,
        task.project_id,
        task.phase_id,
        task.lane,
        task.title,
        task.status,
        task.priority,
        task.revenue_impact,
        task.due_at,
        task.evidence,
        task.sort_order,
        id,
      );
      return json(res, 200, { ok: true, id });
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/tasks/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/tasks/", ""));
      db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
      return json(res, 200, { ok: true, id });
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

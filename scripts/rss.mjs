// Tolerant RSS/Atom parser with no external dependencies. Good enough to cache
// feed items into the signals table; not a spec-complete XML parser.

import { createHash } from "node:crypto";

function stripCdata(value) {
  return String(value ?? "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'", nbsp: " " };

function decodeEntities(value) {
  return String(value ?? "")
    .replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, code) => {
      if (code in ENTITIES) return ENTITIES[code];
      if (code[0] === "#") {
        const num = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(num) ? String.fromCodePoint(num) : match;
      }
      return match;
    });
}

function stripTags(value) {
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function clean(value) {
  // strip real tags, decode entities (which can reveal encoded tags/comments),
  // then strip again so things like &lt;table&gt; or <!-- SC_OFF --> never render.
  let v = stripCdata(value);
  v = stripTags(v);
  v = decodeEntities(v);
  v = stripTags(v);
  return v.replace(/\s+/g, " ").trim();
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1] : "";
}

function attr(block, regex, group = 1) {
  const m = block.match(regex);
  return m ? m[group] : "";
}

function extractLink(block) {
  // RSS: <link>url</link>
  const rss = tag(block, "link");
  if (rss && /^https?:/i.test(clean(rss))) return clean(rss);
  // Atom: <link href="..." rel="alternate"/> (prefer alternate, else first href)
  const alternate = attr(block, /<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i);
  if (alternate) return decodeEntities(alternate);
  const anyHref = attr(block, /<link[^>]*href=["']([^"']+)["']/i);
  if (anyHref) return decodeEntities(anyHref);
  const guid = clean(tag(block, "guid"));
  return /^https?:/i.test(guid) ? guid : "";
}

function extractThumbnail(block) {
  return (
    decodeEntities(attr(block, /<media:thumbnail[^>]*url=["']([^"']+)["']/i)) ||
    decodeEntities(attr(block, /<media:content[^>]*url=["']([^"']+)["'][^>]*medium=["']image["']/i)) ||
    decodeEntities(attr(block, /<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image[^"']*["']/i)) ||
    ""
  );
}

function extractDate(block) {
  const raw =
    clean(tag(block, "pubDate")) ||
    clean(tag(block, "published")) ||
    clean(tag(block, "updated")) ||
    clean(tag(block, "dc:date"));
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function parseFeed(xml, source = {}) {
  const text = String(xml ?? "");
  const isAtom = /<feed[\s>]/i.test(text) && /<entry[\s>]/i.test(text);
  const itemRegex = isAtom ? /<entry[\s\S]*?<\/entry>/gi : /<item[\s\S]*?<\/item>/gi;
  const blocks = text.match(itemRegex) ?? [];
  const items = [];
  for (const block of blocks) {
    const title = clean(tag(block, "title"));
    const url = extractLink(block);
    if (!title && !url) continue;
    const summaryRaw = tag(block, "description") || tag(block, "summary") || tag(block, "content");
    const summary = clean(summaryRaw).slice(0, 280);
    const id = createHash("sha1").update(url || `${source.id ?? ""}:${title}`).digest("hex").slice(0, 24);
    items.push({
      id,
      source_id: source.id ?? null,
      source_name: source.name ?? "",
      category: source.category ?? "",
      kind: source.kind ?? "rss",
      title,
      url,
      summary,
      thumbnail: extractThumbnail(block),
      published_at: extractDate(block),
    });
  }
  return items;
}

export async function fetchFeed(source, { timeoutMs = 9000 } = {}) {
  const res = await fetch(source.url, {
    headers: { "user-agent": "horizon-os/0.9 (+local command center)", accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  return parseFeed(xml, source);
}

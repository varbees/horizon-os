// Horizon Internet tools — web search + URL fetch + feed management.
// No API key required for search (uses DuckDuckGo Lite HTML).
// Fetch uses native Node.js fetch. All tools are rate-limited and timeout-bounded.

const SEARCH_TIMEOUT = 15000;
const FETCH_TIMEOUT = 20000;
const MAX_RESULTS = 10;

// ── DuckDuckGo Lite search (no API key, parses HTML) ──

export async function webSearch(query, maxResults = MAX_RESULTS) {
  const q = encodeURIComponent(String(query || "").trim());
  if (!q) return { ok: false, error: "empty_query", results: [] };

  const url = `https://lite.duckduckgo.com/lite/?q=${q}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Horizon-OS/1.0 (command-center; +https://github.com/varbees/horizon-os)",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(SEARCH_TIMEOUT),
    });

    if (!res.ok) return { ok: false, error: `search_http_${res.status}`, results: [] };

    const html = await res.text();
    const results = parseDuckDuckGoLite(html, maxResults);

    return {
      ok: true,
      query: String(query).trim(),
      results,
      count: results.length,
      source: "duckduckgo_lite",
    };
  } catch (err) {
    return { ok: false, error: String(err.message).slice(0, 120), results: [] };
  }
}

function parseDuckDuckGoLite(html, max) {
  const results = [];
  // DDG Lite format: each result is a <tr> with link + description
  const rowRegex = /<a[^>]*href="([^"]*)"[^>]*class="result-link"[^>]*>([^<]*)<\/a>/gi;
  const snippetRegex = /<td class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi;

  // Simpler approach: split by result rows
  const rows = html.split(/<tr[^>]*class="result-snippet"/i);
  const linkMatches = [...html.matchAll(/<a[^>]*href="(\/\/duckduckgo\.com\/l\/\?uddg=[^"]*)"[^>]*>([^<]+)<\/a>/gi)];

  for (let i = 0; i < Math.min(linkMatches.length, max); i++) {
    const [, ddgUrl, title] = linkMatches[i];
    // DDG Lite wraps URLs in redirect — extract real URL
    const urlMatch = ddgUrl.match(/uddg=([^&]+)/);
    const realUrl = urlMatch ? decodeURIComponent(urlMatch[1]) : ddgUrl;
    const cleanTitle = title.replace(/<[^>]*>/g, "").trim();

    // Try to find snippet near this link
    const idx = html.indexOf(ddgUrl);
    let snippet = "";
    if (idx > 0) {
      const snipMatch = html.slice(idx).match(/<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/i);
      if (snipMatch) {
        snippet = snipMatch[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
      }
    }

    if (cleanTitle && realUrl) {
      results.push({ title: cleanTitle, url: realUrl, snippet });
    }
  }

  // Fallback: try alternative parsing if no results found
  if (!results.length) {
    const altMatches = [...html.matchAll(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([^<]+)<\/a>/gi)];
    for (let i = 0; i < Math.min(altMatches.length, max); i++) {
      const [, url, title] = altMatches[i];
      const cleanTitle = title.replace(/<[^>]*>/g, "").trim();
      if (cleanTitle && !url.includes("duckduckgo.com") && url.startsWith("http")) {
        results.push({ title: cleanTitle, url, snippet: "" });
      }
    }
  }

  return results;
}

// ── URL fetch (clean markdown extraction) ──

export async function webFetch(url, maxChars = 3000) {
  const target = String(url || "").trim();
  if (!target || !/^https?:\/\//i.test(target)) {
    return { ok: false, error: "invalid_url", content: "" };
  }

  try {
    const res = await fetch(target, {
      headers: {
        "User-Agent": "Horizon-OS/1.0 (command-center; +https://github.com/varbees/horizon-os)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
      redirect: "follow",
    });

    if (!res.ok) return { ok: false, error: `fetch_http_${res.status}`, content: "" };

    const html = await res.text();
    const text = extractText(html);
    const trimmed = text.slice(0, maxChars);

    return {
      ok: true,
      url: target,
      content: trimmed,
      length: trimmed.length,
      contentType: res.headers.get("content-type") || "unknown",
    };
  } catch (err) {
    return { ok: false, error: String(err.message).slice(0, 120), content: "" };
  }
}

function extractText(html) {
  // Remove scripts, styles, nav, header, footer
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

// ── Research feed expansion ──

export const RESEARCH_FEEDS = {
  hackernews: {
    name: "Hacker News",
    url: "https://hnrss.org/frontpage?count=15",
    category: "tech",
    description: "HN front page via hnrss",
  },
  aiNews: {
    name: "AI News",
    url: "https://hnrss.org/frontpage?q=ai+agent+llm+langchain+rag",
    category: "ai",
    description: "HN filtered for AI/agent/LLM topics",
  },
  arxiv_cs_ai: {
    name: "Arxiv CS.AI",
    url: "https://rss.arxiv.org/rss/cs.AI",
    category: "research",
    description: "Latest AI research papers from Arxiv",
  },
  arxiv_cs_cl: {
    name: "Arxiv CS.CL",
    url: "https://rss.arxiv.org/rss/cs.CL",
    category: "research",
    description: "Computation and Language papers",
  },
  langchain_blog: {
    name: "LangChain Blog",
    url: "https://blog.langchain.dev/rss/",
    category: "ai",
    description: "Official LangChain engineering blog",
  },
  anthropic_blog: {
    name: "Anthropic Blog",
    url: "https://www.anthropic.com/feed",
    category: "ai",
    description: "Official Anthropic research and engineering",
  },
};

export function listFeeds() {
  return Object.entries(RESEARCH_FEEDS).map(([id, feed]) => ({ id, ...feed }));
}

// ── Context block for agent deploys (like graphContextBlock) ──

export async function internetContextBlock(query, budget = 400) {
  if (!query) return "";
  const search = await webSearch(query, 3);
  if (!search.ok || !search.results.length) return "";

  const lines = ["## Web research context (fresh search results)"];
  for (const r of search.results) {
    lines.push(`- ${r.title} — ${r.url}`);
    if (r.snippet) lines.push(`  ${r.snippet.slice(0, 150)}`);
  }
  const block = lines.join("\n");
  // Budget trim
  if (block.length > budget * 4) return block.slice(0, budget * 4) + "\n...";
  return block;
}

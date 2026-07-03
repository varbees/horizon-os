export async function webSearch(q, limit = 8) {
  const res = await fetch(`/api/web/search?q=${encodeURIComponent(q)}&limit=${limit}`);
  const data = await res.json().catch(() => ({ ok: false, results: [] }));
  return data;
}

export async function webFetch(url, maxChars = 3000) {
  const res = await fetch("/api/fetch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url, maxChars }),
  });
  const data = await res.json().catch(() => ({ ok: false }));
  return data;
}

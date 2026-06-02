import { useEffect, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";
import Panel from "./Panel.jsx";
import { fetchUsage } from "../lib/usageApi.js";

function compact(n) {
  const v = Number(n ?? 0);
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return `${v}`;
}
const usd = (n) => `$${Number(n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const MODEL_COLORS = ["bg-primary", "bg-signal", "bg-brass", "bg-rust", "bg-outline"];

export default function UsagePanel() {
  const [usage, setUsage] = useState(null);
  const [state, setState] = useState("loading");

  function load(refresh) {
    setState(refresh ? "refreshing" : "loading");
    fetchUsage({ refresh })
      .then((data) => {
        setUsage(data);
        setState(data.available ? "ready" : "unavailable");
      })
      .catch(() => setState("offline"));
  }

  useEffect(() => {
    load(false);
  }, []);

  const maxBar = usage?.last7?.reduce((m, d) => Math.max(m, d.tokens), 0) || 1;

  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="font-display text-2xl font-bold">Claude usage</h2>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={state === "refreshing" || state === "loading"}
          className="inline-flex items-center gap-1.5 rounded-md border border-outlineVariant bg-surfaceVariant px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-paper/60 transition hover:text-paper disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${state === "refreshing" || state === "loading" ? "animate-spin" : ""}`} aria-hidden="true" />
          {usage?.days ? `${usage.days}d` : "ccusage"}
        </button>
      </div>

      {state === "loading" ? (
        <p className="mt-4 text-sm text-paper/52">Reading ~/.claude usage...</p>
      ) : !usage?.available ? (
        <p className="mt-4 text-sm leading-6 text-paper/56">
          Usage unavailable. With the local API running, this reads <span className="font-mono text-xs">npx ccusage</span> over your{" "}
          <span className="font-mono text-xs">~/.claude</span> logs. {state === "offline" ? "Start npm run dev:full." : ""}
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Figure label="Today" value={compact(usage.today?.tokens)} sub={usd(usage.today?.cost)} />
            <Figure label="This week" value={compact(usage.week?.totalTokens)} sub={usd(usage.week?.totalCost)} />
            <Figure label="Cache hit" value={`${Math.round((usage.today?.cacheHit ?? 0) * 100)}%`} sub={`wk ${Math.round((usage.week?.cacheHit ?? 0) * 100)}%`} tone="text-signal" />
            <Figure label="Lifetime cost" value={usd(usage.total?.totalCost)} sub={`${compact(usage.total?.totalTokens)} tok`} tone="text-brass" />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/46">Last 7 days</p>
              <div className="mt-3 flex h-24 items-end gap-1.5">
                {usage.last7.map((d) => (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1" title={`${d.date}: ${compact(d.tokens)} tok`}>
                    <div className="flex w-full flex-1 items-end">
                      <div className="w-full rounded-t bg-primary/70" style={{ height: `${Math.max((d.tokens / maxBar) * 100, 3)}%` }} />
                    </div>
                    <span className="font-mono text-[9px] text-paper/40">{d.date.slice(8)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/46">Model mix (7d)</p>
              <div className="mt-3 space-y-2">
                {usage.modelMix.filter((m) => m.pct > 0).map((m, i) => (
                  <div key={m.model}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-bold text-paper/74">{m.model.replace(/^\[.*?\]\s*/, "")}</span>
                      <span className="shrink-0 font-mono text-paper/52">{m.pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/70">
                      <div className={`h-full rounded-full ${MODEL_COLORS[i % MODEL_COLORS.length]}`} style={{ width: `${m.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </Panel>
  );
}

function Figure({ label, value, sub, tone = "text-paper" }) {
  return (
    <div className="rounded-md border border-outlineVariant bg-surfaceVariant p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/46">{label}</p>
      <p className={`mt-1 text-xl font-black tabular-nums ${tone}`}>{value}</p>
      <p className="truncate font-mono text-[11px] text-paper/48">{sub}</p>
    </div>
  );
}

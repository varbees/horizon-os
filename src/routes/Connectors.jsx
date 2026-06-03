import { useEffect, useRef, useState } from "react";
import { Cable, CheckCircle2, ChevronRight, Loader2, Plug, PlugZap, Power, Unplug } from "lucide-react";
import Panel from "../components/Panel.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import { connectMcp, disconnectMcp, fetchMcp, mcpCall, mcpTools } from "../lib/mcpApi.js";
import { mcpServerSeed } from "../data/horizon.js";

const stateTone = {
  connected: "border-signal/40 bg-signal/12 text-signal",
  authorized: "border-primary/30 bg-primary/10 text-primary",
  disconnected: "border-outlineVariant bg-white/60 text-paper/46",
};

const seedServers = mcpServerSeed.map((s) => ({ ...s, state: "disconnected" }));

export default function Connectors() {
  const [servers, setServers] = useState(seedServers);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(null);
  const [tools, setTools] = useState({});
  const [result, setResult] = useState(null);
  const [note, setNote] = useState(null);
  const pollRef = useRef(null);

  function load() {
    return fetchMcp()
      .then((data) => {
        if (Array.isArray(data.servers)) {
          setServers(data.servers);
          setLive(true);
        }
      })
      .catch(() => setLive(false));
  }

  useEffect(() => {
    load();
    return () => clearInterval(pollRef.current);
  }, []);

  async function connect(server) {
    if (!live) {
      setNote("Start npm run dev:full to connect MCP servers.");
      return;
    }
    setBusy(server.id);
    setNote(null);
    try {
      const res = await connectMcp(server.id);
      if (res.authUrl) {
        window.open(res.authUrl, "horizon-mcp-auth", "width=560,height=720");
        setNote(`Opened the ${server.name} consent window. Finish sign-in, then this card flips to Connected.`);
        // poll for connection completion
        clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
          await load();
        }, 2500);
      } else if (res.connected) {
        await load();
        setNote(`${server.name} connected.`);
      } else {
        setNote(res.error ? `${server.name}: ${res.error}` : `${server.name}: could not start auth.`);
      }
    } catch {
      setNote(`${server.name}: connection error.`);
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(server) {
    setBusy(server.id);
    try {
      await disconnectMcp(server.id);
      await load();
      setTools((t) => ({ ...t, [server.id]: undefined }));
    } finally {
      setBusy(null);
    }
  }

  async function loadTools(server) {
    setBusy(server.id);
    setResult(null);
    try {
      const res = await mcpTools(server.id);
      if (res.ok) setTools((t) => ({ ...t, [server.id]: res.tools }));
      else setNote(`${server.name}: ${res.error}`);
    } finally {
      setBusy(null);
    }
  }

  async function callTool(server, tool) {
    setBusy(`${server.id}:${tool.name}`);
    setResult(null);
    try {
      const res = await mcpCall(server.id, tool.name, {});
      setResult({ server: server.name, tool: tool.name, payload: res });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow="MCP Connectors v1.0"
        title="Authenticate tools from the dashboard."
        copy="Horizon connects directly to HTTP MCP servers and runs the OAuth consent in your browser. Once connected, it can list and call the server's tools to feed the command center."
      />

      {note ? (
        <div className="mb-4 flex items-start gap-2 rounded-[var(--hz-radius-md)] border border-primary/30 bg-primary/8 p-3">
          <PlugZap className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-sm leading-6 text-paper/76">{note}</p>
        </div>
      ) : null}

      {!live ? (
        <p className="mb-4 font-mono text-xs text-paper/52">Offline preview. Start npm run dev:full for live connect.</p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        {servers.map((server) => {
          const serverTools = tools[server.id];
          const connected = server.state === "connected";
          return (
            <Panel key={server.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-10 w-10 place-items-center rounded-[var(--hz-radius-sm)] border border-outlineVariant bg-surfaceVariant">
                    <Cable className="h-5 w-5 text-primary" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-base font-black text-paper">{server.name}</h3>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper/42">{server.category}</p>
                  </div>
                </div>
                <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.14em] ${stateTone[server.state] ?? stateTone.disconnected}`}>
                  {server.state}
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-paper/60">{server.provides}</p>
              <p className="mt-1 break-words font-mono text-[10px] text-paper/38">{server.url}</p>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-outlineVariant pt-4">
                {connected ? (
                  <>
                    <button type="button" onClick={() => loadTools(server)} disabled={busy === server.id} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-black text-onPrimary disabled:opacity-60">
                      {busy === server.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plug className="h-4 w-4" aria-hidden="true" />}
                      List tools
                    </button>
                    <button type="button" onClick={() => disconnect(server)} className="inline-flex items-center gap-1.5 rounded-md border border-outlineVariant px-3 py-1.5 text-sm font-bold text-paper/64 hover:text-rust">
                      <Unplug className="h-4 w-4" aria-hidden="true" /> Disconnect
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => connect(server)} disabled={busy === server.id} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-black text-onPrimary disabled:opacity-60">
                    {busy === server.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Power className="h-4 w-4" aria-hidden="true" />}
                    Connect
                  </button>
                )}
              </div>

              {serverTools?.length ? (
                <div className="mt-3 space-y-1.5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/46">{serverTools.length} tools</p>
                  {serverTools.slice(0, 6).map((tool) => (
                    <button
                      key={tool.name}
                      type="button"
                      onClick={() => callTool(server, tool)}
                      disabled={busy === `${server.id}:${tool.name}`}
                      className="flex w-full items-center justify-between gap-2 rounded-md border border-outlineVariant bg-surfaceVariant px-2.5 py-1.5 text-left text-sm font-bold text-paper/74 hover:border-outline"
                    >
                      <span className="truncate font-mono text-xs">{tool.name}</span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-paper/40" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              ) : null}
            </Panel>
          );
        })}
      </section>

      {result ? (
        <section className="mt-5">
          <Panel className="p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-signal" aria-hidden="true" />
              <h2 className="font-display text-xl font-bold">{result.tool} <span className="text-paper/46">· {result.server}</span></h2>
            </div>
            <pre className="mt-3 max-h-[28rem] overflow-auto rounded-md border border-outlineVariant bg-surfaceVariant p-3 font-mono text-xs leading-5 text-paper/78">
              {JSON.stringify(result.payload, null, 2)}
            </pre>
          </Panel>
        </section>
      ) : null}
    </div>
  );
}

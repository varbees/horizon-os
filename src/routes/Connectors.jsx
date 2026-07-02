import { useEffect, useMemo, useRef, useState } from "react";
import {
  Cable,
  CheckCircle2,
  ChevronRight,
  Code2,
  Loader2,
  Plug,
  PlugZap,
  Power,
  Search,
  Sparkles,
  Terminal,
  Unplug,
} from "lucide-react";
import Panel from "../components/Panel.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import Button from "../components/ui/Button.jsx";
import {
  checkConnectorHealth,
  connectConnector,
  connectorCall,
  connectorTools,
  disconnectConnector,
  fetchConnectors,
} from "../lib/mcpApi.js";
import { connectorSeed } from "../data/horizon.js";

const stateTone = {
  ready: "border-signal/40 bg-signal/12 text-signal",
  connected: "border-signal/40 bg-signal/12 text-signal",
  authorized: "border-primary/30 bg-primary/10 text-primary",
  authorizing: "border-brass/35 bg-brass/12 text-brass",
  unavailable: "border-rust/35 bg-rust/10 text-rust",
  disconnected: "border-outlineVariant bg-surfaceVariant text-paper/48",
  unknown: "border-outlineVariant bg-surfaceVariant text-paper/48",
};

const groupMeta = {
  local_agent: {
    title: "Local Agents",
    copy: "Claude Code and Codex run through local CLI auth. Horizon does not need Anthropic or OpenAI API keys for these executors.",
    icon: Terminal,
  },
  mcp: {
    title: "MCP Connectors",
    copy: "HTTP MCP servers connect through the local API and browser OAuth. Tokens stay under .horizon/mcp.",
    icon: Cable,
  },
  skill: {
    title: "Skills",
    copy: "Reserved lane for installed prompt and workflow packs that should become callable from the command center.",
    icon: Sparkles,
  },
};

function byKind(connectors, kind) {
  return connectors.filter((connector) => connector.kind === kind);
}

export default function Connectors() {
  const [connectors, setConnectors] = useState(connectorSeed);
  const [source, setSource] = useState("seed");
  const [busy, setBusy] = useState(null);
  const [tools, setTools] = useState({});
  const [toolQuery, setToolQuery] = useState("");
  const [result, setResult] = useState(null);
  const [note, setNote] = useState(null);
  const pollRef = useRef(null);

  const groups = useMemo(() => [
    ["local_agent", byKind(connectors, "local_agent")],
    ["mcp", byKind(connectors, "mcp")],
    ["skill", byKind(connectors, "skill")],
  ], [connectors]);

  function mergeConnector(id, patch) {
    setConnectors((prev) => prev.map((connector) => (connector.id === id ? { ...connector, ...patch } : connector)));
  }

  function load() {
    return fetchConnectors()
      .then((data) => {
        if (Array.isArray(data.connectors)) {
          setConnectors(data.connectors);
          setSource("live");
        }
      })
      .catch(() => setSource("seed"));
  }

  useEffect(() => {
    load();
    return () => clearInterval(pollRef.current);
  }, []);

  async function health(connector) {
    setBusy(`${connector.id}:health`);
    setNote(null);
    try {
      const res = await checkConnectorHealth(connector.id);
      mergeConnector(connector.id, { state: res.state, version: res.version, last_health_at: new Date().toISOString() });
      setNote(`${connector.id} is ${res.state}${res.version ? ` (${res.version})` : ""}.`);
    } catch (error) {
      mergeConnector(connector.id, { state: "unavailable" });
      setNote(`${connector.id} is unavailable: ${error.message}`);
    } finally {
      setBusy(null);
    }
  }

  async function connect(connector) {
    if (source !== "live") {
      setNote("Start npm run dev:full to connect MCP servers.");
      return;
    }
    setBusy(`${connector.id}:connect`);
    setNote(null);
    try {
      const res = await connectConnector(connector.id);
      if (res.authUrl) {
        window.open(res.authUrl, "horizon-mcp-auth", "width=560,height=720");
        setNote(`Opened ${connector.name} consent. Finish sign-in, then refresh tools.`);
        clearInterval(pollRef.current);
        pollRef.current = setInterval(load, 2500);
      } else if (res.connected) {
        mergeConnector(connector.id, { state: "connected" });
        setNote(`${connector.name} connected.`);
      }
      await load();
    } catch (error) {
      setNote(`${connector.name}: ${error.message}`);
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(connector) {
    setBusy(`${connector.id}:disconnect`);
    try {
      await disconnectConnector(connector.id);
      await load();
      setTools((prev) => ({ ...prev, [connector.id]: undefined }));
      setNote(`${connector.name} disconnected.`);
    } catch (error) {
      setNote(`${connector.name}: ${error.message}`);
    } finally {
      setBusy(null);
    }
  }

  async function loadTools(connector) {
    setBusy(`${connector.id}:tools`);
    setResult(null);
    try {
      const res = await connectorTools(connector.id);
      setTools((prev) => ({ ...prev, [connector.id]: res.tools ?? [] }));
      setNote(`${connector.name}: ${(res.tools ?? []).length} tools listed.`);
    } catch (error) {
      setNote(`${connector.name}: ${error.message}`);
    } finally {
      setBusy(null);
    }
  }

  async function callTool(connector, tool) {
    setBusy(`${connector.id}:${tool.name}`);
    setResult(null);
    try {
      const res = await connectorCall(connector.id, tool.name, {});
      setResult({ connector: connector.name, tool: tool.name, payload: res });
    } catch (error) {
      setResult({ connector: connector.name, tool: tool.name, payload: { ok: false, error: error.message } });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Connectors v1.0"
        title="Integration hub for agents, MCP, and skills."
        copy="The control surface for native Claude Code, Codex, MCP providers, and future skills. Local agent auth stays in the CLI; provider credentials stay server-side."
      />

      {note ? (
        <div className="mb-4 flex items-start gap-2 rounded-[var(--hz-radius-md)] border border-primary/30 bg-primary/8 p-3">
          <PlugZap className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-sm leading-6 text-paper/76">{note}</p>
        </div>
      ) : null}

      {source !== "live" ? (
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-paper/52">Offline preview. Start npm run dev:full for health checks and OAuth.</p>
      ) : null}

      {Object.values(tools).some((list) => list?.length) ? (
        <div className="mb-4 flex min-w-0 items-center gap-2 rounded-[var(--hz-radius-md)] border border-outlineVariant bg-surfaceVariant px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-paper/44" aria-hidden="true" />
          <input
            type="search"
            value={toolQuery}
            onChange={(event) => setToolQuery(event.target.value)}
            placeholder="Filter listed tools..."
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-paper outline-none placeholder:text-paper/36"
          />
        </div>
      ) : null}

      <div className="space-y-5">
        {groups.map(([kind, rows]) => {
          const meta = groupMeta[kind];
          const Icon = meta.icon;
          return (
            <Panel key={kind} className="p-5">
              <div className="flex flex-col gap-3 border-b border-outlineVariant pb-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">{kind.replace("_", " ")}</p>
                  <h2 className="mt-1 flex items-center gap-2 font-display text-2xl font-bold text-paper">
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    {meta.title}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-paper/58">{meta.copy}</p>
                </div>
                <span className="w-fit rounded-[var(--hz-radius-sm)] border border-outlineVariant bg-surfaceVariant px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/52">
                  {rows.length} configured
                </span>
              </div>

              {rows.length ? (
                <div className="divide-y divide-outlineVariant">
                  {rows.map((connector) => (
                    <ConnectorRow
                      key={connector.id}
                      connector={connector}
                      busy={busy}
                      tools={tools[connector.id] ?? []}
                      toolQuery={toolQuery}
                      onHealth={health}
                      onConnect={connect}
                      onDisconnect={disconnect}
                      onTools={loadTools}
                      onCall={callTool}
                    />
                  ))}
                </div>
              ) : (
                <p className="pt-4 text-sm leading-6 text-paper/54">No entries in this lane yet.</p>
              )}
            </Panel>
          );
        })}
      </div>

      {result ? (
        <section className="mt-5">
          <Panel className="p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-signal" aria-hidden="true" />
              <h2 className="font-display text-xl font-bold">{result.tool} <span className="text-paper/46">on {result.connector}</span></h2>
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

function ConnectorRow({ connector, busy, tools, toolQuery, onHealth, onConnect, onDisconnect, onTools, onCall }) {
  const isMcp = connector.kind === "mcp";
  const connected = connector.state === "connected";
  const healthBusy = busy === `${connector.id}:health`;
  const connectBusy = busy === `${connector.id}:connect`;
  const toolsBusy = busy === `${connector.id}:tools`;
  const filteredTools = tools.filter((tool) => {
    const q = toolQuery.trim().toLowerCase();
    if (!q) return true;
    return `${tool.name} ${tool.description ?? ""}`.toLowerCase().includes(q);
  });

  return (
    <article aria-label={connector.name} className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-black text-paper">{connector.name}</h3>
          <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-black uppercase tracking-[0.14em] ${stateTone[connector.state] ?? stateTone.unknown}`}>
            {connector.state || "unknown"}
          </span>
          {connector.version ? <span className="font-mono text-[10px] text-paper/42">{connector.version}</span> : null}
        </div>
        <p className="mt-1 text-sm leading-6 text-paper/60">{connector.provides}</p>
        <p className="mt-1 break-words font-mono text-[10px] text-paper/38">{connector.url || connector.command}</p>

        {tools.length ? (
          <div className="mt-3">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/44">
              {filteredTools.length === tools.length ? `${tools.length} tools loaded` : `${filteredTools.length} of ${tools.length} tools shown`}
            </p>
            <div className="grid max-h-[28rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
              {filteredTools.map((tool) => (
                <button
                  key={tool.name}
                  type="button"
                  onClick={() => onCall(connector, tool)}
                  disabled={busy === `${connector.id}:${tool.name}`}
                  className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-outlineVariant bg-surfaceVariant px-2.5 py-1.5 text-left text-sm font-bold text-paper/74 transition hover:border-primary hover:bg-primary/8"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-xs">{tool.name}</span>
                    {tool.description ? <span className="mt-0.5 block truncate text-[11px] font-medium text-paper/42">{tool.description}</span> : null}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-paper/40" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <Button
          type="button"
          onClick={() => onHealth(connector)}
          disabled={healthBusy}
          icon={healthBusy ? Loader2 : Code2}
          className={healthBusy ? "[&>svg]:animate-spin" : ""}
        >
          Check {connector.name} health
        </Button>
        {isMcp && connected ? (
          <>
            <Button
              type="button"
              aria-label={`List ${connector.name} tools`}
              onClick={() => onTools(connector)}
              disabled={toolsBusy}
              icon={toolsBusy ? Loader2 : Plug}
              variant="primary"
              className={toolsBusy ? "[&>svg]:animate-spin" : ""}
            >
              List tools
            </Button>
            <Button
              type="button"
              onClick={() => onDisconnect(connector)}
              icon={Unplug}
            >
              Disconnect
            </Button>
          </>
        ) : isMcp ? (
          <Button
            type="button"
            onClick={() => onConnect(connector)}
            disabled={connectBusy}
            icon={connectBusy ? Loader2 : Power}
            variant="primary"
            className={connectBusy ? "[&>svg]:animate-spin" : ""}
          >
            Connect
          </Button>
        ) : null}
      </div>
    </article>
  );
}

import { Link } from "react-router-dom";
import { Cable, CircleDot } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Panel from "./Panel.jsx";
import Button from "./ui/Button.jsx";
import { fetchConnectors } from "../lib/mcpApi.js";
import { connectorSeed } from "../data/horizon.js";
import { connectorActionSurfaces } from "../data/connectorActions.js";

const statusTone = {
  ready: "text-signal",
  connected: "text-signal",
  authorized: "text-primary",
  authorizing: "text-brass",
  unavailable: "text-rust",
  disconnected: "text-paper/42",
  unknown: "text-paper/42",
};

export default function ConnectorActionStrip({ surface }) {
  const config = connectorActionSurfaces[surface];
  const [connectors, setConnectors] = useState(connectorSeed);

  useEffect(() => {
    let active = true;
    fetchConnectors()
      .then((data) => {
        if (active && Array.isArray(data.connectors)) setConnectors(data.connectors);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const connectorById = useMemo(() => new Map(connectors.map((connector) => [connector.id, connector])), [connectors]);
  if (!config) return null;

  return (
    <Panel className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">{config.eyebrow}</p>
          <h2 className="mt-1 flex items-center gap-2 font-display text-2xl font-bold text-paper">
            <Cable className="h-5 w-5 text-primary" aria-hidden="true" />
            {config.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-paper/58">{config.copy}</p>
        </div>
        <Button as={Link} to="/connectors" variant="primary" className="w-fit">
          Open hub
        </Button>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {config.actions.map((action) => {
          const connector = connectorById.get(action.connectorId);
          const state = connector?.state ?? "unknown";
          return (
            <Link
              key={`${action.connectorId}:${action.tool}`}
              to="/connectors"
              className="group min-w-0 rounded-md border border-outlineVariant bg-surfaceVariant px-3 py-2 transition hover:border-primary hover:bg-primary/8"
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <span className="truncate text-sm font-black text-paper">{action.label}</span>
                <span className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] ${statusTone[state] ?? statusTone.unknown}`}>
                  <CircleDot className="h-3 w-3" aria-hidden="true" />
                  {state}
                </span>
              </div>
              <p className="mt-1 truncate font-mono text-[10px] text-paper/44">{action.connector} · {action.tool}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-paper/54">{action.detail}</p>
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}

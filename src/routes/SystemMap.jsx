import { useEffect, useMemo, useState } from "react";
import { Database, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import Panel from "../components/Panel.jsx";
import ProjectCanvas from "../components/ProjectCanvas.jsx";
import PrimaryButton from "../components/PrimaryButton.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import { systemNodes } from "../data/horizon.js";
import { createCommandTask, fetchCommandBase } from "../lib/commandBase.js";
import { useHorizonStore } from "../store/horizonStore.js";

const byId = Object.fromEntries(systemNodes.map((node) => [node.id, node]));

export default function SystemMap() {
  const selectedNodeId = useHorizonStore((state) => state.selectedNodeId);
  const selectedNode = byId[selectedNodeId] ?? byId.calendar;
  const [commandBase, setCommandBase] = useState(null);
  const [status, setStatus] = useState("loading");
  const [taskStatus, setTaskStatus] = useState("");

  const counts = useMemo(() => {
    if (!commandBase) return { nodes: 0, edges: 0, events: 0, tasks: 0, contexts: 0 };
    return {
      nodes: commandBase.nodes?.length ?? 0,
      edges: commandBase.edges?.length ?? 0,
      events: commandBase.events?.length ?? 0,
      tasks: commandBase.tasks?.length ?? 0,
      contexts: commandBase.contexts?.length ?? 0,
    };
  }, [commandBase]);

  const load = async () => {
    setStatus("loading");
    try {
      const data = await fetchCommandBase();
      setCommandBase(data);
      setStatus("connected");
    } catch (error) {
      setStatus("offline");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const addNextTask = async () => {
    setTaskStatus("saving");
    try {
      await createCommandTask({
        node_id: selectedNode.id,
        title: selectedNode.next,
        priority: selectedNode.kind === "Revenue" || selectedNode.id === "photoselect" ? "high" : "normal",
        revenue_impact: selectedNode.kind === "Revenue" || selectedNode.id === "photoselect" ? 1 : 0,
      });
      setTaskStatus("saved");
      await load();
    } catch (error) {
      setTaskStatus("api offline");
    }
  };

  return (
    <div>
      <SectionHeader
        eyebrow="Nodify-style command graph"
        title="Manage the foundry like a node editor."
        copy="The map is now a local command graph: draggable nodes, typed edges, selected-node actions, SQLite persistence, and a revenue path that stays visible."
        action={
          <PrimaryButton onClick={addNextTask}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Task from node
          </PrimaryButton>
        }
      />

      <div className="mb-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr_0.9fr]">
        <Panel className="p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md border border-signal/30 bg-signal/12 text-signal">
              <Database className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">SQLite command base</p>
              <h2 className="mt-1 text-xl font-black text-paper">{status === "connected" ? "Connected" : status === "offline" ? "API offline" : "Checking"}</h2>
              <p className="mt-2 text-sm leading-6 text-paper/58">
                Local file: `.horizon/horizon.sqlite`. Frontend talks through `/api` on this localhost app.
              </p>
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">Graph inventory</p>
          <div className="mt-3 grid grid-cols-5 gap-2 text-center">
            {[
              ["Nodes", counts.nodes],
              ["Edges", counts.edges],
              ["Events", counts.events],
              ["Tasks", counts.tasks],
              ["Ctx", counts.contexts],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-outlineVariant bg-surfaceVariant p-2">
                <p className="text-lg font-black text-paper">{value}</p>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-paper/38">{label}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">Persistence</p>
              <h2 className="mt-1 text-xl font-black text-paper">Node drags save</h2>
              <p className="mt-2 text-sm leading-6 text-paper/58">
                Drag a node. Position is patched into SQLite when the API is online.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className="grid h-10 w-10 place-items-center rounded-md border border-outlineVariant text-paper/58 transition hover:border-outline hover:text-paper"
              aria-label="Refresh command base"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs font-bold text-signal">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {taskStatus ? `Task status: ${taskStatus}` : "Writes stay local first."}
          </p>
        </Panel>
      </div>

      <ProjectCanvas />
    </div>
  );
}

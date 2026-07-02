import { useCallback, useEffect, useMemo, useState } from "react";
import { Database, Plus, RefreshCw, Sparkles } from "lucide-react";
import PrimaryButton from "../components/PrimaryButton.jsx";
import CommandGraph from "../components/CommandGraph.jsx";
import RoutineRail from "../components/RoutineRail.jsx";
import { systemNodes } from "../data/horizon.js";
import { createCommandTask, fetchCommandBase } from "../lib/commandBase.js";
import { useHorizonStore } from "../store/horizonStore.js";

const byId = Object.fromEntries(systemNodes.map((node) => [node.id, node]));

export default function SystemMap() {
  const selectedNodeId = useHorizonStore((state) => state.selectedNodeId);
  const selectedNode = byId[selectedNodeId] ?? byId["job-engine"] ?? systemNodes[0];
  const [commandBase, setCommandBase] = useState(null);
  const [apiStatus, setApiStatus] = useState("loading");
  const [taskStatus, setTaskStatus] = useState("");
  const [persistStatus, setPersistStatus] = useState("");
  const [enriching, setEnriching] = useState(false);
  const [enrichNote, setEnrichNote] = useState("");

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

  const nodeTasks = useMemo(() => {
    if (!commandBase?.tasks) return [];
    return commandBase.tasks
      .filter((task) => task.node_id === selectedNode.id && task.status !== "done")
      .slice(0, 6);
  }, [commandBase, selectedNode.id]);

  const load = useCallback(async () => {
    setApiStatus("loading");
    try {
      const data = await fetchCommandBase();
      setCommandBase(data);
      setApiStatus("connected");
    } catch {
      setApiStatus("offline");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
    } catch {
      setTaskStatus("api offline");
    }
  };

  const enrichNext = async () => {
    setEnriching(true);
    setEnrichNote("");
    try {
      const response = await fetch("/api/routine/brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          day: 0,
          phase: `node focus: ${selectedNode.label}`,
          date: new Date().toISOString().slice(0, 10),
          blocks: [
            {
              start: "now",
              title: `${selectedNode.label}: ${selectedNode.next}`,
              done: false,
            },
          ],
        }),
      });
      if (!response.ok) throw new Error(`enrich failed: ${response.status}`);
      const data = await response.json();
      setEnrichNote(data.text ?? "");
    } catch {
      setEnrichNote("Enrichment unavailable — API offline or provider error.");
    } finally {
      setEnriching(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-7.5rem)] min-h-[540px] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">Command graph · fluid canvas</p>
          <h1 className="font-display text-2xl font-bold text-paper">Run the foundry like a node editor.</h1>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-2 rounded-full border border-outlineVariant bg-surfaceContainer px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] ${
              apiStatus === "connected" ? "text-signal" : apiStatus === "offline" ? "text-rust" : "text-paper/48"
            }`}
          >
            <Database className="h-3.5 w-3.5" aria-hidden="true" />
            {apiStatus === "connected" ? "SQLite connected" : apiStatus === "offline" ? "API offline" : "Checking"}
            <span className="text-paper/40">
              · {counts.nodes}n {counts.edges}e {counts.tasks}t
            </span>
          </span>
          <button
            type="button"
            onClick={() => void load()}
            className="grid h-9 w-9 place-items-center rounded-md border border-outlineVariant text-paper/58 transition hover:border-outline hover:text-paper"
            aria-label="Refresh command base"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
        <aside className="order-2 flex min-h-0 flex-col gap-3 overflow-y-auto xl:order-1">
          <div className="rounded-lg border border-outlineVariant bg-surface p-3.5 shadow-rule">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedNode.color }} aria-hidden="true" />
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
                {selectedNode.kind} · {selectedNode.status}
              </p>
            </div>
            <h2 className="mt-1.5 font-display text-xl font-bold text-paper">{selectedNode.label}</h2>
            <p className="mt-2 text-[13px] leading-5 text-paper/62">{selectedNode.note}</p>
            <div className="mt-3 rounded-md border border-outlineVariant bg-surfaceVariant p-2.5">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-paper/44">Next move</p>
              <p className="mt-1 text-[13px] font-bold leading-5 text-paper">{selectedNode.next}</p>
            </div>
            {selectedNode.outputs?.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {selectedNode.outputs.map((output) => (
                  <span key={output} className="rounded border border-outlineVariant bg-surfaceContainer px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-paper/56">
                    {output}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-4 grid gap-2">
              <PrimaryButton onClick={addNextTask}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Task from node
              </PrimaryButton>
              <button
                type="button"
                onClick={enrichNext}
                disabled={enriching}
                className="flex items-center justify-center gap-2 rounded-md border border-outlineVariant bg-surfaceContainer px-3 py-2 text-xs font-black text-paper/72 transition hover:border-outline hover:text-paper disabled:opacity-60"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {enriching ? "DeepSeek is thinking…" : "Sharpen next move (DeepSeek)"}
              </button>
              {taskStatus ? (
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper/48">Task: {taskStatus}</p>
              ) : null}
            </div>
            {enrichNote ? (
              <div className="mt-3 max-h-40 overflow-y-auto rounded-md border border-outlineVariant bg-surfaceVariant p-2.5 text-xs leading-5 text-paper/78 whitespace-pre-wrap">
                {enrichNote}
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-outlineVariant bg-surface p-3.5 shadow-rule">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">Open tasks on this node</p>
            {nodeTasks.length ? (
              <ul className="mt-2 grid gap-1.5">
                {nodeTasks.map((task) => (
                  <li key={task.id} className="rounded-md border border-outlineVariant bg-surfaceVariant px-2.5 py-2 text-[12px] font-bold leading-4 text-paper/78">
                    {task.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-paper/44">
                {apiStatus === "connected" ? "No open tasks. Deploy one from the node or the routine rail." : "Start the local API to see tasks."}
              </p>
            )}
          </div>
        </aside>

        <div className="relative order-1 min-h-[420px] overflow-hidden rounded-lg border border-outlineVariant bg-surface shadow-rule xl:order-2">
          <CommandGraph onPersistStatus={setPersistStatus} />
          {persistStatus ? (
            <p className="absolute bottom-2 right-3 z-10 rounded bg-surface/90 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-paper/48 backdrop-blur">
              layout: {persistStatus}
            </p>
          ) : null}
        </div>

        <aside className="order-3 min-h-0">
          <RoutineRail />
        </aside>
      </div>
    </div>
  );
}

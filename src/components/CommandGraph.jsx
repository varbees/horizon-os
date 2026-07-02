import { useCallback, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import { Crosshair, LayoutGrid, RotateCcw, Rows3 } from "lucide-react";
import "@xyflow/react/dist/style.css";
import { systemEdges, systemNodes } from "../data/horizon.js";
import { persistNodePosition } from "../lib/commandBase.js";
import { useHorizonStore } from "../store/horizonStore.js";

const NODE_WIDTH = 188;
const NODE_HEIGHT = 84;
const revenueSet = new Set(["job-engine", "income-engine", "photoselect", "studio-ai-ops", "antharmaya-agents", "oss-signal", "safe-haven", "capital-targets"]);

function HorizonNode({ data, selected }) {
  return (
    <div
      className={`rounded-lg border bg-surface px-3 py-2 shadow-rule transition-shadow ${
        selected ? "border-primary shadow-lg" : "border-outlineVariant"
      }`}
      style={{ width: NODE_WIDTH, minHeight: NODE_HEIGHT, borderLeftWidth: 4, borderLeftColor: data.color }}
    >
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-none !bg-outlineVariant" />
      <Handle type="target" position={Position.Left} id="left" className="!h-2 !w-2 !border-none !bg-outlineVariant" />
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-brass">{data.kind}</p>
      <p className="mt-0.5 truncate text-sm font-black text-paper">{data.label}</p>
      <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-paper/48">{data.status}</p>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-none !bg-outlineVariant" />
      <Handle type="source" position={Position.Right} id="right" className="!h-2 !w-2 !border-none !bg-outlineVariant" />
    </div>
  );
}

const nodeTypes = { horizon: HorizonNode };

function dagreLayout(nodes, edges, direction) {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: direction, nodesep: 48, ranksep: 72 });
  nodes.forEach((node) => graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((edge) => graph.setEdge(edge.source, edge.target));
  dagre.layout(graph);
  return nodes.map((node) => {
    const pos = graph.node(node.id);
    return { ...node, position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 } };
  });
}

function GraphInner({ onPersistStatus }) {
  const selectedNodeId = useHorizonStore((state) => state.selectedNodeId);
  const selectNode = useHorizonStore((state) => state.selectNode);
  const moveNode = useHorizonStore((state) => state.moveNode);
  const resetNodePositions = useHorizonStore((state) => state.resetNodePositions);
  const nodePositions = useHorizonStore((state) => state.nodePositions);
  const { setCenter, fitView } = useReactFlow();
  const [layoutTick, setLayoutTick] = useState(0);
  const persistTimer = useRef(null);

  const nodes = useMemo(
    () =>
      systemNodes.map((node) => ({
        id: node.id,
        type: "horizon",
        position: nodePositions[node.id] ?? { x: node.x, y: node.y },
        selected: node.id === selectedNodeId,
        data: { label: node.label, kind: node.kind, status: node.status, color: node.color },
      })),
    // layoutTick forces rebuild after auto-layout writes new store positions
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodePositions, selectedNodeId, layoutTick],
  );

  const edges = useMemo(
    () =>
      systemEdges.map((edge, index) => {
        const onRevenuePath = revenueSet.has(edge.from) && revenueSet.has(edge.to);
        return {
          id: `${edge.from}->${edge.to}-${index}`,
          source: edge.from,
          target: edge.to,
          label: edge.label,
          type: "smoothstep",
          animated: onRevenuePath,
          style: onRevenuePath
            ? { stroke: "#087861", strokeWidth: 2 }
            : { stroke: "#dbe5dc", strokeWidth: 1.5 },
          labelStyle: { fontSize: 9, fontFamily: "IBM Plex Mono, monospace", textTransform: "uppercase", letterSpacing: "0.08em", fill: onRevenuePath ? "#087861" : "#8a948b" },
          labelBgStyle: { fill: "#fbfff9", fillOpacity: 0.9 },
        };
      }),
    [],
  );

  const persist = useCallback(
    (id, x, y) => {
      moveNode(id, x, y);
      persistNodePosition(id, Math.round(x), Math.round(y))
        .then(() => onPersistStatus("saved"))
        .catch(() => onPersistStatus("local only — API offline"));
    },
    [moveNode, onPersistStatus],
  );

  const onNodeDragStop = useCallback(
    (_event, node) => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(() => persist(node.id, node.position.x, node.position.y), 120);
    },
    [persist],
  );

  const onNodeClick = useCallback(
    (_event, node) => {
      selectNode(node.id);
      setCenter(node.position.x + NODE_WIDTH / 2, node.position.y + NODE_HEIGHT / 2, { zoom: 1.15, duration: 500 });
    },
    [selectNode, setCenter],
  );

  const applyLayout = useCallback(
    (direction) => {
      const laidOut = dagreLayout(nodes, edges, direction);
      laidOut.forEach((node) => persist(node.id, node.position.x, node.position.y));
      setLayoutTick((tick) => tick + 1);
      requestAnimationFrame(() => fitView({ padding: 0.15, duration: 550 }));
    },
    [nodes, edges, persist, fitView],
  );

  const focusRevenue = useCallback(() => {
    const target = nodePositions["job-engine"] ?? nodePositions["photoselect"];
    if (target) setCenter(target.x + NODE_WIDTH / 2, target.y + NODE_HEIGHT / 2, { zoom: 1.1, duration: 550 });
  }, [nodePositions, setCenter]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeDragStop={onNodeDragStop}
      onNodeClick={onNodeClick}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.3}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      className="rounded-lg"
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} color="#dbe5dc" />
      <MiniMap
        pannable
        zoomable
        nodeColor={(node) => node.data?.color ?? "#dbe5dc"}
        maskColor="rgba(238, 247, 239, 0.72)"
        style={{ backgroundColor: "#fbfff9" }}
      />
      <Controls showInteractive={false} position="bottom-left" />
      <div className="absolute right-3 top-3 z-10 flex gap-1.5">
        <GraphButton icon={Crosshair} label="Focus revenue" onClick={focusRevenue} />
        <GraphButton icon={Rows3} label="Layout →" onClick={() => applyLayout("LR")} />
        <GraphButton icon={LayoutGrid} label="Layout ↓" onClick={() => applyLayout("TB")} />
        <GraphButton
          icon={RotateCcw}
          label="Reset"
          onClick={() => {
            resetNodePositions();
            setLayoutTick((tick) => tick + 1);
            requestAnimationFrame(() => fitView({ padding: 0.15, duration: 550 }));
          }}
        />
      </div>
    </ReactFlow>
  );
}

function GraphButton({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md border border-outlineVariant bg-surface/92 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-paper/64 shadow-rule backdrop-blur transition hover:border-outline hover:text-paper"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}

export default function CommandGraph({ onPersistStatus = () => {} }) {
  return (
    <ReactFlowProvider>
      <GraphInner onPersistStatus={onPersistStatus} />
    </ReactFlowProvider>
  );
}

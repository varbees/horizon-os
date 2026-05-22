import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  Crosshair,
  Gem,
  Minus,
  Plus,
  RotateCcw,
  Target,
  Zap,
} from "lucide-react";
import { Arrow, Circle, Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import { systemEdges, systemNodes } from "../data/horizon.js";
import { persistNodePosition } from "../lib/commandBase.js";
import { useHorizonStore } from "../store/horizonStore.js";
import Panel from "./Panel.jsx";

const byId = Object.fromEntries(systemNodes.map((node) => [node.id, node]));
const nodeWidth = 164;
const nodeHeight = 92;
const canvasWidth = 1080;
const canvasHeight = 720;
const revenuePath = ["income-engine", "photoselect", "studio-ai-ops", "antharmaya-agents", "oss-signal", "safe-haven"];

function getPosition(positions, node) {
  return positions[node.id] ?? { x: node.x, y: node.y };
}

function getEdgePoints(from, to) {
  const horizontal = Math.abs(to.x - from.x) > Math.abs(to.y - from.y);
  if (horizontal) {
    const fromPort = from.x < to.x ? from.x + nodeWidth / 2 : from.x - nodeWidth / 2;
    const toPort = from.x < to.x ? to.x - nodeWidth / 2 : to.x + nodeWidth / 2;
    const midX = fromPort + (toPort - fromPort) / 2;
    return [fromPort, from.y, midX, from.y, midX, to.y, toPort, to.y];
  }
  const fromPort = from.y < to.y ? from.y + nodeHeight / 2 : from.y - nodeHeight / 2;
  const toPort = from.y < to.y ? to.y - nodeHeight / 2 : to.y + nodeHeight / 2;
  const midY = fromPort + (toPort - fromPort) / 2;
  return [from.x, fromPort, from.x, midY, to.x, midY, to.x, toPort];
}

export default function ProjectCanvas() {
  const { nodePositions, moveNode, selectedNodeId, selectNode, resetNodePositions } = useHorizonStore();
  const [zoom, setZoom] = useState(0.82);
  const [pan, setPan] = useState({ x: 16, y: 18 });
  const selected = byId[selectedNodeId] ?? byId.calendar;
  const revenueNodes = revenuePath.map((id) => byId[id]).filter(Boolean);

  const positionedNodes = useMemo(
    () => systemNodes.map((node) => ({ ...node, position: getPosition(nodePositions, node) })),
    [nodePositions],
  );

  const zoomBy = (delta) => setZoom((value) => Math.min(1.3, Math.max(0.55, Number((value + delta).toFixed(2)))));

  const resetView = () => {
    setZoom(0.82);
    setPan({ x: 16, y: 18 });
  };

  const resetAll = () => {
    resetNodePositions();
    resetView();
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_23rem]">
      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-outlineVariant p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">Node editor</p>
            <h2 className="mt-1 text-2xl font-black text-paper">Revenue Command Graph</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ToolbarButton label="Zoom out" onClick={() => zoomBy(-0.08)}>
              <Minus className="h-4 w-4" aria-hidden="true" />
            </ToolbarButton>
            <span className="rounded-md border border-outlineVariant bg-surfaceVariant px-3 py-2 font-mono text-xs text-paper/56">
              {Math.round(zoom * 100)}%
            </span>
            <ToolbarButton label="Zoom in" onClick={() => zoomBy(0.08)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton label="Reset view" onClick={resetView}>
              <Crosshair className="h-4 w-4" aria-hidden="true" />
            </ToolbarButton>
            <ToolbarButton label="Reset graph" onClick={resetAll}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </ToolbarButton>
          </div>
        </div>

        <div className="relative min-h-[35rem] overflow-hidden bg-surfaceContainer rule-grid">
          <Stage
            width={canvasWidth}
            height={canvasHeight}
            x={pan.x}
            y={pan.y}
            scaleX={zoom}
            scaleY={zoom}
            draggable
            onDragEnd={(event) => setPan({ x: event.target.x(), y: event.target.y() })}
            onWheel={(event) => {
              event.evt.preventDefault();
              zoomBy(event.evt.deltaY > 0 ? -0.05 : 0.05);
            }}
            className="touch-action-none"
            aria-label="Nodify-style interactive command graph"
          >
            <Layer>
              {Array.from({ length: 18 }, (_, index) => (
                <Line
                  key={`v-${index}`}
                  points={[index * 72, 0, index * 72, canvasHeight]}
                  stroke="rgba(37,88,216,0.07)"
                  strokeWidth={1}
                />
              ))}
              {Array.from({ length: 12 }, (_, index) => (
                <Line
                  key={`h-${index}`}
                  points={[0, index * 72, canvasWidth, index * 72]}
                  stroke="rgba(37,88,216,0.07)"
                  strokeWidth={1}
                />
              ))}

              {systemEdges.map((edge) => {
                const fromNode = byId[edge.from];
                const toNode = byId[edge.to];
                if (!fromNode || !toNode) return null;
                const from = getPosition(nodePositions, fromNode);
                const to = getPosition(nodePositions, toNode);
                const active = selectedNodeId === edge.from || selectedNodeId === edge.to;
                const points = getEdgePoints(from, to);
                return (
                  <Group key={`${edge.from}-${edge.to}`}>
                    <Arrow
                      points={points}
                      stroke={active ? "rgba(37,88,216,0.82)" : "rgba(112,128,120,0.38)"}
                      fill={active ? "rgba(37,88,216,0.82)" : "rgba(112,128,120,0.38)"}
                      strokeWidth={active ? 3 : 2}
                      pointerLength={8}
                      pointerWidth={8}
                      lineCap="round"
                      lineJoin="round"
                    />
                    <Text
                      x={(points[points.length - 4] + points[points.length - 2]) / 2 - 34}
                      y={(points[points.length - 3] + points[points.length - 1]) / 2 - 18}
                      width={68}
                      align="center"
                      text={edge.label}
                      fill={active ? "#2558d8" : "rgba(55,66,59,0.58)"}
                      fontSize={10}
                      fontStyle="bold"
                      fontFamily="IBM Plex Mono"
                    />
                  </Group>
                );
              })}

              {positionedNodes.map((node) => {
                const active = selectedNodeId === node.id;
                return (
                  <Group
                    key={node.id}
                    x={node.position.x - nodeWidth / 2}
                    y={node.position.y - nodeHeight / 2}
                    draggable
                    onDragStart={() => selectNode(node.id)}
                    onDragMove={(event) => moveNode(node.id, event.target.x() + nodeWidth / 2, event.target.y() + nodeHeight / 2)}
                    onDragEnd={(event) => {
                      const x = event.target.x() + nodeWidth / 2;
                      const y = event.target.y() + nodeHeight / 2;
                      moveNode(node.id, x, y);
                      void persistNodePosition(node.id, x, y).catch(() => {});
                    }}
                    onClick={() => selectNode(node.id)}
                    onTap={() => selectNode(node.id)}
                  >
                    <Rect
                      width={nodeWidth}
                      height={nodeHeight}
                      cornerRadius={8}
                      fill={active ? "#ffffff" : "#fbfff9"}
                      stroke={node.color}
                      strokeWidth={active ? 3 : 1.5}
                      shadowColor={node.color}
                      shadowBlur={active ? 20 : 8}
                      shadowOpacity={active ? 0.42 : 0.16}
                    />
                    <Rect width={nodeWidth} height={6} cornerRadius={8} fill={node.color} opacity={0.92} />
                    <Circle x={0} y={nodeHeight / 2} radius={5} fill="#ffffff" stroke={node.color} strokeWidth={2} />
                    <Circle x={nodeWidth} y={nodeHeight / 2} radius={5} fill="#ffffff" stroke={node.color} strokeWidth={2} />
                    <Text
                      x={12}
                      y={16}
                      width={nodeWidth - 24}
                      text={node.label}
                      fill="#17201a"
                      fontSize={16}
                      fontStyle="bold"
                      fontFamily="Manrope"
                    />
                    <Text
                      x={12}
                      y={42}
                      width={nodeWidth - 24}
                      text={node.kind}
                      fill="rgba(55,66,59,0.70)"
                      fontSize={10}
                      fontFamily="IBM Plex Mono"
                    />
                    <Rect x={12} y={62} width={nodeWidth - 24} height={18} cornerRadius={4} fill={node.color} opacity={0.18} />
                    <Text
                      x={16}
                      y={66}
                      width={nodeWidth - 32}
                      text={node.status}
                      fill={node.color}
                      fontSize={10}
                      fontStyle="bold"
                      fontFamily="IBM Plex Mono"
                    />
                  </Group>
                );
              })}
            </Layer>
          </Stage>

          <div className="pointer-events-none absolute bottom-4 left-4 rounded-md border border-outlineVariant bg-ink/82 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/46 backdrop-blur">
            Drag canvas to pan. Wheel to zoom. Drag nodes to rewire thinking.
          </div>
        </div>
      </Panel>

      <aside className="space-y-4" aria-label="System map node controls">
        <Panel className="p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Selected node</p>
          <div className="mt-3 flex items-start gap-3">
            <span className="mt-2 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: selected.color }} />
            <div>
              <h2 className="font-display text-3xl font-bold text-paper">{selected.label}</h2>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-paper/42">
                {selected.kind} / {selected.status}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-paper/64">{selected.note}</p>
          <div className="mt-4 rounded-md border border-outlineVariant bg-surfaceVariant p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/38">Next move</p>
            <p className="mt-2 text-sm font-bold leading-6 text-paper/78">{selected.next}</p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {selected.outputs.map((output) => (
              <div key={output} className="rounded-md border border-outlineVariant bg-white/[0.035] p-2 text-center text-[11px] font-bold text-paper/58">
                {output}
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Node palette</p>
          <div className="mt-4 grid gap-2">
            {systemNodes.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => selectNode(node.id)}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm font-bold transition ${
                  selectedNodeId === node.id
                    ? "border-primary bg-primaryContainer text-onPrimaryContainer"
                    : "border-outlineVariant bg-white/[0.03] text-paper/68 hover:border-outline hover:text-paper"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: node.color }} />
                  <span className="truncate">{node.label}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-signal" aria-hidden="true" />
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">Revenue path</p>
          </div>
          <div className="mt-4 space-y-2">
            {revenueNodes.map((node, index) => (
              <button
                key={node.id}
                type="button"
                onClick={() => selectNode(node.id)}
                className="flex w-full items-center gap-3 rounded-md border border-outlineVariant bg-surfaceVariant p-3 text-left transition hover:border-outline"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-black text-onPrimary">{index + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-paper">{node.label}</span>
                  <span className="block truncate text-xs text-paper/46">{node.status}</span>
                </span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-brass">Caveman next steps</p>
          <div className="mt-4 space-y-3 text-sm font-bold leading-6 text-paper/68">
            <p>Sell PhotoSelect. Then studio AI ops.</p>
            <p>Extract OSS only from real command-center work.</p>
            <p>Calendar block must create artifact.</p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <MiniStat icon={Target} label="Revenue" value="Now" />
            <MiniStat icon={Bot} label="Agent" value="Next" />
            <MiniStat icon={Gem} label="OSS" value="Weekly" />
          </div>
        </Panel>
      </aside>
    </div>
  );
}

function ToolbarButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-outlineVariant bg-surfaceVariant text-paper/58 transition hover:border-outline hover:text-paper"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md border border-outlineVariant bg-surfaceVariant p-2 text-center">
      <Icon className="mx-auto h-4 w-4 text-signal" aria-hidden="true" />
      <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-paper/38">{label}</p>
      <p className="mt-1 text-xs font-black text-paper">{value}</p>
    </div>
  );
}

import { ArrowRight } from "lucide-react";
import { Circle, Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import { systemEdges, systemNodes } from "../data/horizon.js";
import { useHorizonStore } from "../store/horizonStore.js";

const byId = Object.fromEntries(systemNodes.map((node) => [node.id, node]));

export default function ProjectCanvas() {
  const { nodePositions, moveNode, selectedNodeId, selectNode } = useHorizonStore();
  const selected = byId[selectedNodeId] ?? byId.engine;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-h-[440px] overflow-hidden rounded-lg border border-white/10 bg-black/25 rule-grid shadow-lift">
        <Stage width={920} height={520} className="touch-action-none max-w-full" aria-label="Interactive system map canvas">
          <Layer>
            {systemEdges.map(([from, to]) => {
              const start = nodePositions[from];
              const end = nodePositions[to];
              return (
                <Line
                  key={`${from}-${to}`}
                  points={[start.x, start.y, end.x, end.y]}
                  stroke="rgba(245,239,228,0.22)"
                  strokeWidth={2}
                  dash={[8, 8]}
                  lineCap="round"
                />
              );
            })}
            {systemNodes.map((node) => {
              const pos = nodePositions[node.id] ?? { x: node.x, y: node.y };
              const active = selectedNodeId === node.id;
              return (
                <Group
                  key={node.id}
                  x={pos.x}
                  y={pos.y}
                  draggable
                  onDragMove={(event) => moveNode(node.id, event.target.x(), event.target.y())}
                  onClick={() => selectNode(node.id)}
                  onTap={() => selectNode(node.id)}
                >
                  <Circle
                    radius={active ? 52 : 46}
                    fill="rgba(11,15,18,0.92)"
                    stroke={node.color}
                    strokeWidth={active ? 4 : 2}
                    shadowColor={node.color}
                    shadowBlur={active ? 20 : 6}
                    shadowOpacity={active ? 0.52 : 0.2}
                  />
                  <Rect x={-36} y={-11} width={72} height={22} cornerRadius={4} fill={node.color} opacity={active ? 1 : 0.88} />
                  <Text
                    x={-34}
                    y={-7}
                    width={68}
                    align="center"
                    text={node.label}
                    fill="#0b0f12"
                    fontSize={10}
                    fontStyle="bold"
                    fontFamily="Manrope"
                  />
                </Group>
              );
            })}
          </Layer>
        </Stage>
      </div>

      <aside className="glass rounded-lg p-5" aria-label="System map node controls">
        <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-brass">Selected node</p>
        <h2 className="mt-2 font-display text-3xl font-bold text-paper">{selected.label}</h2>
        <p className="mt-3 text-sm leading-6 text-paper/64">{selected.note}</p>
        <div className="mt-5 space-y-2">
          {systemNodes.map((node) => (
            <button
              key={node.id}
              type="button"
              onClick={() => selectNode(node.id)}
              className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm font-bold transition ${
                selectedNodeId === node.id
                  ? "border-paper bg-paper text-ink"
                  : "border-white/10 bg-white/[0.03] text-paper/68 hover:border-white/24 hover:text-paper"
              }`}
            >
              {node.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ))}
        </div>
        <p className="mt-5 text-xs leading-5 text-paper/46">
          Drag nodes on desktop or tap a node on touch screens. The button list keeps the map accessible when the canvas is not ideal.
        </p>
      </aside>
    </div>
  );
}

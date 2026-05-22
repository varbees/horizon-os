import { create } from "zustand";
import { persist } from "zustand/middleware";
import { metrics as defaultMetrics, systemNodes } from "../data/horizon.js";

export const useHorizonStore = create(
  persist(
    (set) => ({
      metrics: defaultMetrics,
      completedBlocks: {},
      selectedNodeId: "engine",
      nodePositions: Object.fromEntries(systemNodes.map((node) => [node.id, { x: node.x, y: node.y }])),
      updateMetric: (key, value) =>
        set((state) => ({
          metrics: {
            ...state.metrics,
            [key]: Number.isNaN(Number(value)) ? state.metrics[key] : Number(value),
          },
        })),
      toggleBlock: (id) =>
        set((state) => ({
          completedBlocks: {
            ...state.completedBlocks,
            [id]: !state.completedBlocks[id],
          },
        })),
      selectNode: (id) => set({ selectedNodeId: id }),
      moveNode: (id, x, y) =>
        set((state) => ({
          nodePositions: {
            ...state.nodePositions,
            [id]: { x, y },
          },
        })),
    }),
    {
      name: "horizon-os-state",
      version: 1,
    },
  ),
);

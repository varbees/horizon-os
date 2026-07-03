import { create } from "zustand";

// Global control-surface state for the Horizon shell:
// - navMinimized: sidebar collapsed to an icon rail (persisted)
// - command: the ⌘K palette
// - inspector: the right-hand Inspector / Action drawer (holds one "entity")
// - toasts: transient status after a deploy or action
//
// An "entity" is the universal thing the Inspector + Action Deployer act on.
// Every screen normalizes its cards into this shape, so one drawer + one
// deployer serve the whole app:
//   { type, id, title, subtitle, source, project_id, projectPath,
//     meta: [{label,value}], body, tags: [], suggestedActions: [] }

const NAV_KEY = "horizon.navMinimized";

function readNav() {
  try {
    return localStorage.getItem(NAV_KEY) === "1";
  } catch {
    return false;
  }
}

let toastSeq = 0;

export const useUiStore = create((set, get) => ({
  navMinimized: readNav(),
  setNavMinimized(value) {
    const next = typeof value === "function" ? value(get().navMinimized) : value;
    try {
      localStorage.setItem(NAV_KEY, next ? "1" : "0");
    } catch {
      /* private mode / no storage — fine */
    }
    set({ navMinimized: next });
  },
  toggleNav() {
    get().setNavMinimized((v) => !v);
  },

  commandOpen: false,
  setCommandOpen: (open) => set({ commandOpen: open }),
  toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),

  inspector: { open: false, entity: null },
  openInspector: (entity) => set({ inspector: { open: true, entity } }),
  closeInspector: () => set((s) => ({ inspector: { ...s.inspector, open: false } })),

  toasts: [],
  pushToast(toast) {
    const id = `t-${++toastSeq}`;
    const entry = { id, tone: "info", ttl: 4200, ...toast };
    set((s) => ({ toasts: [...s.toasts, entry] }));
    if (entry.ttl) setTimeout(() => get().dismissToast(id), entry.ttl);
    return id;
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

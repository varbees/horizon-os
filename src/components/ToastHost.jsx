import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { useUiStore } from "../store/uiStore.js";

const toneStyle = {
  success: { border: "border-signal/40", bg: "bg-signal/10", icon: CheckCircle2, color: "text-signal" },
  error: { border: "border-rust/40", bg: "bg-rust/10", icon: AlertTriangle, color: "text-rust" },
  info: { border: "border-primary/40", bg: "bg-primary/8", icon: Info, color: "text-primary" },
};

export default function ToastHost() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none fixed bottom-24 right-4 z-[90] flex w-full max-w-sm flex-col gap-2 lg:bottom-6">
      <AnimatePresence>
        {toasts.map((t) => {
          const style = toneStyle[t.tone] ?? toneStyle.info;
          const Icon = style.icon;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className={`pointer-events-auto flex items-start gap-3 rounded-[var(--hz-radius-md)] border ${style.border} ${style.bg} bg-surface/95 p-3.5 shadow-lift backdrop-blur-xl`}
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.color}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                {t.title ? <p className="text-sm font-black text-paper">{t.title}</p> : null}
                {t.message ? <p className="mt-0.5 break-words text-xs leading-5 text-paper/62">{t.message}</p> : null}
              </div>
              <button type="button" onClick={() => dismiss(t.id)} className="shrink-0 text-paper/40 hover:text-paper" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

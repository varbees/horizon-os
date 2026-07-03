import { Command } from "cmdk";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PanelLeftClose, Search, KeyRound, FileText, Rocket } from "lucide-react";
import { useUiStore } from "../store/uiStore.js";
import { NAV_GROUPS } from "../lib/nav.js";

// ⌘K / Ctrl-K command palette. Jump to any screen or fire a quick action from
// anywhere — the Linear/Notion muscle memory that makes the app feel fast.

export default function CommandPalette() {
  const open = useUiStore((s) => s.commandOpen);
  const setOpen = useUiStore((s) => s.setCommandOpen);
  const toggleNav = useUiStore((s) => s.toggleNav);
  const navigate = useNavigate();

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useUiStore.getState().commandOpen);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  function go(to) {
    navigate(to);
    setOpen(false);
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      className="fixed inset-0 z-[95]"
    >
      <div className="fixed inset-0 bg-paper/25 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden="true" />
      <div className="fixed left-1/2 top-[14vh] z-[96] w-[min(92vw,40rem)] -translate-x-1/2 overflow-hidden rounded-[var(--hz-radius-lg)] border border-outlineVariant bg-surface shadow-[0_30px_90px_rgba(37,88,216,0.22)]">
        <div className="flex items-center gap-2 border-b border-outlineVariant px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-paper/40" aria-hidden="true" />
          <Command.Input autoFocus placeholder="Jump to a screen or run a command…" />
          <kbd className="rounded border border-outlineVariant bg-surfaceVariant px-1.5 py-0.5 font-mono text-[10px] text-paper/44">esc</kbd>
        </div>
        <Command.List className="hz-scroll max-h-[52vh] overflow-y-auto p-2">
          <Command.Empty>No matches.</Command.Empty>

          {NAV_GROUPS.map((group) => (
            <Command.Group key={group.label} heading={group.label}>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Command.Item key={item.to} value={`${item.label} ${item.detail} ${item.keywords}`} onSelect={() => go(item.to)}>
                    <Icon aria-hidden="true" />
                    <span className="flex-1">{item.label}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-paper/38">{item.detail}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>
          ))}

          <Command.Group heading="Actions">
            <Command.Item value="deploy action center queue agents" onSelect={() => go("/command")}>
              <Rocket aria-hidden="true" /> <span className="flex-1">Deploy an action</span>
            </Command.Item>
            <Command.Item value="providers keys models api" onSelect={() => go("/connectors")}>
              <KeyRound aria-hidden="true" /> <span className="flex-1">Providers, keys & models</span>
            </Command.Item>
            <Command.Item value="docs markdown reader runbooks" onSelect={() => go("/documents")}>
              <FileText aria-hidden="true" /> <span className="flex-1">Open the doc reader</span>
            </Command.Item>
            <Command.Item value="toggle collapse sidebar minimize nav" onSelect={() => { toggleNav(); setOpen(false); }}>
              <PanelLeftClose aria-hidden="true" /> <span className="flex-1">Toggle sidebar</span>
            </Command.Item>
          </Command.Group>
        </Command.List>
      </div>
    </Command.Dialog>
  );
}

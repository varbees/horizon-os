import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  CalendarDays,
  BookOpen,
  FileText,
  Gauge,
  Cable,
  FolderGit2,
  GitBranch,
  Inbox,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Rocket,
  Rss,
  Terminal,
  Wallet,
} from "lucide-react";

const navGroups = [
  {
    label: "Command base",
    items: [
      { to: "/", label: "Command", icon: LayoutDashboard, detail: "Daily anchors" },
      { to: "/command", label: "Center", icon: Terminal, detail: "Action queue" },
      { to: "/calendar", label: "Calendar", icon: CalendarDays, detail: "Foundry week" },
      { to: "/projects", label: "Hub", icon: Gauge, detail: "Repo lanes" },
      { to: "/journey", label: "Journey", icon: BookOpen, detail: "Trek ledger" },
    ],
  },
  {
    label: "Operating lanes",
    items: [
      { to: "/capital", label: "Capital", icon: Wallet, detail: "Runway math" },
      { to: "/inbox", label: "Inbox", icon: Inbox, detail: "Content intake" },
      { to: "/signals", label: "Signals", icon: Rss, detail: "News feed" },
      { to: "/connectors", label: "Connectors", icon: Cable, detail: "MCP + auth" },
      { to: "/vault", label: "Vault", icon: FolderGit2, detail: "Obsidian sync" },
      { to: "/map", label: "Map", icon: GitBranch, detail: "System graph" },
      { to: "/documents", label: "Docs", icon: FileText, detail: "Runbooks" },
      { to: "/hskg", label: "HSKG", icon: Rocket, detail: "Closure note" },
    ],
  },
];

const navItems = navGroups.flatMap((group) => group.items);

const mobileNavItems = [
  { to: "/", label: "Command", icon: LayoutDashboard },
  { to: "/command", label: "Center", icon: Terminal },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/projects", label: "Hub", icon: Gauge },
  { to: "/journey", label: "Journey", icon: BookOpen },
  { to: "/capital", label: "Capital", icon: Wallet },
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/signals", label: "Signals", icon: Rss },
  { to: "/connectors", label: "Connectors", icon: Cable },
  { to: "/vault", label: "Vault", icon: FolderGit2 },
  { to: "/map", label: "Map", icon: GitBranch },
  { to: "/documents", label: "Docs", icon: FileText },
  { to: "/hskg", label: "HSKG", icon: Rocket },
];

export default function Shell({ children }) {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const activeItem =
    navItems.find((item) => (item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to))) ??
    navItems[0];
  const ActiveIcon = activeItem.icon;

  return (
    <div className="grain min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-onPrimary"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-50 border-b border-outlineVariant/80 bg-surface/88 backdrop-blur-xl">
        <div className="flex h-16 w-full items-center justify-between gap-3 px-3 sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarCollapsed((value) => !value)}
              className="hidden h-10 w-10 shrink-0 place-items-center rounded-[var(--hz-radius-sm)] border border-outlineVariant bg-surfaceContainer text-paper/64 transition hover:border-outline hover:text-paper lg:grid"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!sidebarCollapsed}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" aria-hidden="true" /> : <PanelLeftClose className="h-5 w-5" aria-hidden="true" />}
            </button>

            <NavLink to="/" className="group flex min-w-0 items-center gap-3" aria-label="Horizon OS home">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--hz-radius-sm)] border border-primary/20 bg-primary text-sm font-black text-onPrimary shadow-rule transition-transform group-hover:scale-105">
                H
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block truncate font-display text-xl font-bold leading-none tracking-tight">
                  Horizon OS
                </span>
                <span className="block truncate font-mono text-[10px] uppercase tracking-[0.28em] text-paper/56">
                  24 month command deck
                </span>
              </span>
            </NavLink>

            <div className="hidden min-w-0 items-center gap-2 rounded-full border border-outlineVariant bg-surfaceContainer px-3 py-2 lg:flex">
              <ActiveIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate text-sm font-black text-paper">{activeItem.label}</span>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-paper/40 xl:inline">
                {activeItem.detail}
              </span>
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-outlineVariant bg-surfaceContainer px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/62 md:flex">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Local first
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-outlineVariant bg-secondaryContainer px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/70 sm:flex">
              <span className="h-2 w-2 rounded-full bg-signal shadow-[0_0_18px_rgba(31,191,143,0.8)]" />
              Full-time build mode
            </div>
          </div>
        </div>
      </header>

      <div
        className="grid min-h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-[var(--horizon-sidebar-width)_minmax(0,1fr)]"
        style={{ "--horizon-sidebar-width": sidebarCollapsed ? "4.75rem" : "16rem" }}
      >
        <aside
          className={`sticky top-16 hidden h-[calc(100vh-4rem)] min-h-0 flex-col overflow-y-auto border-r border-outlineVariant/80 bg-surface/64 py-4 backdrop-blur-xl transition-[padding] lg:flex ${
            sidebarCollapsed ? "px-2" : "px-3"
          }`}
        >
          <nav className="grid gap-5" aria-label="Desktop primary">
            {navGroups.map((group) => (
              <div key={group.label} className="grid gap-2">
                <p
                  className={`px-2 font-mono text-[10px] uppercase tracking-[0.22em] text-brass ${
                    sidebarCollapsed ? "sr-only" : ""
                  }`}
                >
                  {group.label}
                </p>
                <div className="grid gap-1">
                  {group.items.map((item) => (
                    <DesktopSidebarItem key={item.to} item={item} collapsed={sidebarCollapsed} />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <main id="main" className="min-w-0 px-3 py-4 sm:px-5 lg:px-5 lg:py-5 2xl:px-6">
          <motion.div
            key={location.pathname}
            className="w-full max-w-none"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-outlineVariant bg-surface/94 px-2 pb-2 pt-2 backdrop-blur-xl lg:hidden"
        aria-label="Mobile primary"
      >
        <div className="mx-auto grid max-w-2xl grid-cols-[repeat(13,minmax(0,1fr))] gap-1">
          {mobileNavItems.map((item) => (
            <MobileNavItem key={item.to} item={item} />
          ))}
        </div>
      </nav>
      <div className="h-20 lg:hidden" />
    </div>
  );
}

function DesktopSidebarItem({ item, collapsed }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        [
          "relative flex min-w-0 items-center rounded-[var(--hz-radius-sm)] border px-3 py-2.5 text-sm font-black transition",
          collapsed ? "justify-center gap-0" : "gap-3",
          isActive
            ? "border-primary/20 bg-primaryContainer text-onPrimaryContainer shadow-rule"
            : "border-transparent text-paper/62 hover:border-outlineVariant hover:bg-surfaceContainer hover:text-paper",
        ].join(" ")
      }
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className={`${collapsed ? "sr-only" : "min-w-0"}`}>
        <span className="block truncate">{item.label}</span>
        <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-[0.14em] opacity-55">{item.detail}</span>
      </span>
    </NavLink>
  );
}

function MobileNavItem({ item }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        [
          "flex min-w-0 flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-[10px] font-bold",
          isActive ? "bg-primaryContainer text-onPrimaryContainer" : "text-paper/56",
        ].join(" ")
      }
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="max-w-full truncate">{item.label}</span>
    </NavLink>
  );
}
